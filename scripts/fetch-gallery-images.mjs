/**
 * Sync project carousel from Facebook posts.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GALLERY_DIR = path.join(__dirname, "../assets/images/gallery");
const LEGACY_DIR = path.join(__dirname, "../assets/images");
const MANIFEST = path.join(__dirname, "../data/gallery.json");

const PAGE_ID = "61590368201826";
const PAGE_URL = `https://www.facebook.com/profile.php?id=${PAGE_ID}`;
const PHOTO_PAGES = [
  `${PAGE_URL}&sk=photos`,
  `${PAGE_URL}/photos`,
];
const MAX_IMAGES = 20;
const MIN_BYTES = 50000;
const SCROLL_PAUSE_MS = 320;
const RECENCY_MONTHS = Math.max(
  1,
  Number(process.env.GALLERY_RECENCY_MONTHS || 3)
);
const FB_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "";
const SLIDE_ALT = "Inspired Interiors remodeling project";

function getCutoffDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - RECENCY_MONTHS);
  return d;
}

function isRecent(iso) {
  if (!iso) return false;
  return new Date(iso) >= getCutoffDate();
}

function loadPreviousGallery() {
  if (!fs.existsSync(MANIFEST)) {
    return { slides: [], imageMeta: new Map() };
  }
  try {
    const data = JSON.parse(fs.readFileSync(MANIFEST, "utf8"));
    const imageMeta = new Map();
    for (const slide of data.slides || []) {
      if (!slide.imageId) continue;
      imageMeta.set(slide.imageId, {
        addedAt: slide.addedAt,
        lastSeenAt: slide.lastSeenAt || slide.addedAt,
        file: slide.file,
        source: slide.source,
      });
    }
    return { slides: data.slides || [], imageMeta };
  } catch {
    return { slides: [], imageMeta: new Map() };
  }
}

async function getChromium() {
  if (process.env.CI) {
    return (await import("playwright")).chromium;
  }
  return (await import("playwright-core")).chromium;
}

async function launchBrowser(chromium) {
  const opts = {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  };
  if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
    opts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
  } else if (!process.env.CI) {
    opts.executablePath =
      process.env.CHROME_PATH || "/usr/local/bin/google-chrome";
  }
  return chromium.launch(opts);
}

function toJpeg(filePath) {
  try {
    execSync(
      `python3 -c "from PIL import Image; im=Image.open('${filePath}'); im.convert('RGB').save('${filePath}', quality=88)"`
    );
  } catch {
    /* keep original */
  }
}

function imageDimensions(filePath) {
  try {
    const out = execSync(
      `python3 -c "from PIL import Image; im=Image.open('${filePath}'); print(im.size[0], im.size[1])"`,
      { encoding: "utf8" }
    ).trim();
    const [w, h] = out.split(/\s+/).map(Number);
    return { w, h };
  } catch {
    return null;
  }
}

async function scrollPage(page, times = 30) {
  for (let i = 0; i < times; i++) {
    await page.evaluate(() => window.scrollBy(0, 2200));
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }
}

function addUrl(urlMap, id, url, source, postedAt) {
  if (!id) return;
  const prev = urlMap.get(id);
  const next = {
    url,
    source,
    postedAt: postedAt || prev?.postedAt || null,
  };
  if (!prev || prev.url.length < url.length) {
    urlMap.set(id, next);
  }
}

function extractGraphImages(attachments) {
  const urls = [];
  if (!attachments?.data) return urls;
  for (const att of attachments.data) {
    if (att.media_type === "photo" && att.media?.image?.src) {
      urls.push(att.media.image.src);
    }
    if (att.subattachments?.data) {
      for (const sub of att.subattachments.data) {
        if (sub.media?.image?.src) urls.push(sub.media.image.src);
      }
    }
  }
  return urls;
}

async function fetchGraphApiImages(urlMap, cutoff) {
  if (!FB_TOKEN) {
    console.log("Graph API: skipped (set FACEBOOK_PAGE_ACCESS_TOKEN for dated posts)");
    return 0;
  }

  const since = Math.floor(cutoff.getTime() / 1000);
  let nextUrl = `https://graph.facebook.com/v21.0/${PAGE_ID}/posts?fields=created_time,attachments{media_type,media,subattachments}&limit=50&since=${since}&access_token=${encodeURIComponent(FB_TOKEN)}`;
  let posts = 0;

  while (nextUrl) {
    const res = await fetch(nextUrl);
    const data = await res.json();
    if (data.error) {
      console.warn("Graph API error:", data.error.message);
      break;
    }
    for (const post of data.data || []) {
      const postedAt = post.created_time;
      if (!isRecent(postedAt)) continue;
      posts++;
      let img = 0;
      for (const src of extractGraphImages(post.attachments)) {
        img++;
        const id =
          (src.match(/(\d{10,}_\d+)/) || [])[1] || `graph-${posts}-${img}`;
        addUrl(urlMap, id, src, "facebook-graph", postedAt);
      }
    }
    nextUrl = data.paging?.next || null;
  }

  console.log(`Graph API: ${posts} recent posts scanned`);
  return posts;
}

async function harvestUrlsFromPage(page, pageUrl, source, urlMap, scrolls = 32, postedAt = null) {
  try {
    await page.goto(pageUrl, { waitUntil: "networkidle", timeout: 90000 });
    await scrollPage(page, scrolls);

    const found = await page.evaluate(() => {
      const clean = (u) =>
        u.replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\\//g, "/");
      const urls = new Set();
      const html = document.documentElement.innerHTML;
      for (const m of html.matchAll(/https:\/\/scontent[^\s"'\\]+/g)) {
        urls.add(clean(m[0]));
      }
      for (const img of document.querySelectorAll("img[src*='scontent']")) {
        if (img.src) urls.add(clean(img.src));
      }
      return [...urls].filter((u) => u.includes("t39.30808"));
    });

    for (const url of found) {
      const id = (url.match(/(\d{10,}_\d+)/) || [])[1];
      addUrl(urlMap, id, url, source, postedAt);
    }
    console.log(`  harvest ${source}:`, found.length, "urls,", urlMap.size, "unique");
  } catch (e) {
    console.warn("  harvest failed:", pageUrl, e.message);
  }
}

async function collectRecentPostTargets(page, cutoff) {
  await page.goto(PAGE_URL, { waitUntil: "networkidle", timeout: 90000 });

  const cutoffYear = cutoff.getFullYear();
  const targets = new Map();
  const maxScrolls = 28;

  for (let i = 0; i < maxScrolls; i++) {
    const batch = await page.evaluate(({ cutoffYear, pageId }) => {
      const items = [];
      let sawOld = false;
      const text = document.body?.innerText || "";
      if (/\b(20\d{2})\b/.test(text)) {
        const years = [...text.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
        if (years.some((y) => y < cutoffYear)) sawOld = true;
      }
      for (const a of document.querySelectorAll(
        'a[href*="/posts/"], a[href*="pfbid"], a[href*="story_fbid"]'
      )) {
        const href = a.href.split("?")[0];
        if (!href.includes("facebook.com")) continue;
        if (!href.includes(pageId) && !href.includes("/posts/") && !href.includes("pfbid")) continue;
        let postedAt = null;
        const article = a.closest('[role="article"]') || a.parentElement;
        const timeEl = article?.querySelector("time[datetime]");
        if (timeEl?.getAttribute("datetime")) {
          postedAt = timeEl.getAttribute("datetime");
        }
        items.push({ href, postedAt });
      }
      return { items, sawOld };
    }, { cutoffYear, pageId: PAGE_ID });

    for (const { href, postedAt } of batch.items) {
      if (postedAt && !isRecent(postedAt)) continue;
      targets.set(href, postedAt);
    }

    if (batch.sawOld && i > 6) {
      console.log("Timeline: stopped scroll at older content");
      break;
    }

    await page.evaluate(() => window.scrollBy(0, 2400));
    await page.waitForTimeout(SCROLL_PAUSE_MS);
  }

  return [...targets.entries()].map(([href, postedAt]) => ({ href, postedAt }));
}

async function downloadUrlBatch(page, entries) {
  return page.evaluate(
    async ({ items, minBytes }) => {
      const out = [];
      for (const { id, url } of items) {
        try {
          const r = await fetch(url);
          if (!r.ok) continue;
          const ab = await r.arrayBuffer();
          if (ab.byteLength < minBytes) continue;
          out.push({ id, bytes: Array.from(new Uint8Array(ab)), size: ab.byteLength });
        } catch {
          /* skip */
        }
      }
      return out;
    },
    { items: entries, minBytes: MIN_BYTES }
  );
}

async function downloadGraphUrls(urlMap, byId) {
  const entries = [...urlMap.entries()].filter(([, m]) => m.source === "facebook-graph");
  for (const [id, meta] of entries) {
    try {
      const res = await fetch(meta.url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < MIN_BYTES) continue;
      byId.set(id, {
        id,
        bytes: [...buf],
        source: meta.source,
        postedAt: meta.postedAt,
      });
    } catch {
      /* skip */
    }
  }
  console.log("Graph CDN downloads:", byId.size);
}

async function fetchAllImages(page, urlMap) {
  const byId = new Map();
  const ids = [...urlMap.keys()].filter(
    (id) => urlMap.get(id).source !== "facebook-graph"
  );
  const BATCH = 12;

  for (let i = 0; i < ids.length; i += BATCH) {
    const batch = ids.slice(i, i + BATCH).map((id) => ({
      id,
      url: urlMap.get(id).url,
    }));
    const got = await downloadUrlBatch(page, batch);
    for (const item of got) {
      const meta = urlMap.get(item.id);
      const prev = byId.get(item.id);
      if (!prev || prev.bytes.length < item.bytes.length) {
        byId.set(item.id, {
          id: item.id,
          bytes: item.bytes,
          source: meta?.source || "facebook",
          postedAt: meta?.postedAt || null,
        });
      }
    }
  }
  return byId;
}

async function fetchFacebookCover(page) {
  await page.goto(PAGE_URL, { waitUntil: "networkidle", timeout: 90000 });
  const result = await page.evaluate(async () => {
    const clean = (u) =>
      u.replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\\//g, "/");
    const html = document.documentElement.innerHTML;
    const candidates = [...html.matchAll(/https:\/\/scontent[^"\\]+/g)].map((m) => clean(m[0]));
    for (const src of candidates) {
      if (!src.includes("t39.30808")) continue;
      try {
        const r = await fetch(src);
        if (!r.ok) continue;
        const ab = await r.arrayBuffer();
        if (ab.byteLength < 12000) continue;
        return {
          bytes: Array.from(new Uint8Array(ab)),
          id: (src.match(/(\d{10,}_\d+)/) || [])[1],
        };
      } catch {
        /* next */
      }
    }
    return null;
  });

  if (!result?.bytes) return false;
  fs.writeFileSync(
    path.join(LEGACY_DIR, "facebook-cover.jpg"),
    Buffer.from(result.bytes)
  );
  toJpeg(path.join(LEGACY_DIR, "facebook-cover.jpg"));
  fs.copyFileSync(
    path.join(LEGACY_DIR, "facebook-cover.jpg"),
    path.join(LEGACY_DIR, "hero.jpg")
  );
  console.log("Updated hero.jpg from Facebook cover");
  return true;
}

function scanManualSlides(byId, cutoff) {
  if (!fs.existsSync(GALLERY_DIR)) return;
  for (const name of fs.readdirSync(GALLERY_DIR).sort()) {
    if (!/\.(jpe?g|png|webp)$/i.test(name) || /^slide-\d+\./i.test(name)) continue;
    const full = path.join(GALLERY_DIR, name);
    const mtime = fs.statSync(full).mtime;
    if (mtime < cutoff) continue;
    const buf = fs.readFileSync(full);
    if (buf.length < MIN_BYTES) continue;
    const id = `manual-${name}`;
    byId.set(id, {
      id,
      bytes: [...buf],
      source: "manual",
      postedAt: mtime.toISOString(),
    });
  }
}

function retainRecentPreviousSlides(byId, prev, cutoff) {
  const root = path.join(__dirname, "..");
  for (const slide of prev.slides) {
    if (!slide.imageId || byId.has(slide.imageId)) continue;
    if (!isRecent(slide.addedAt)) continue;
    const filePath = path.join(root, slide.file);
    if (!fs.existsSync(filePath)) continue;
    const buf = fs.readFileSync(filePath);
    byId.set(slide.imageId, {
      id: slide.imageId,
      bytes: [...buf],
      source: slide.source || "facebook",
      postedAt: slide.postedAt || slide.addedAt,
      addedAt: slide.addedAt,
      lastSeenAt: slide.lastSeenAt,
    });
  }
}

function applyImageMeta(byId, prevMeta) {
  const now = new Date().toISOString();
  for (const item of byId.values()) {
    const prev = prevMeta.get(item.id);
    item.addedAt =
      item.addedAt ||
      (isRecent(item.postedAt) ? item.postedAt : null) ||
      prev?.addedAt ||
      now;
    item.lastSeenAt = now;
  }
}

function sortForCarousel(items) {
  return items.sort((a, b) => {
    const ta = new Date(a.addedAt || 0).getTime();
    const tb = new Date(b.addedAt || 0).getTime();
    if (tb !== ta) return tb - ta;
    return b.bytes.length - a.bytes.length;
  });
}

async function downloadProfileIcons(page) {
  await page.goto(PAGE_URL, { waitUntil: "networkidle", timeout: 90000 });

  const profileUrl = await page.evaluate(() => {
    const clean = (u) =>
      u.replace(/\\u0026/g, "&").replace(/&amp;/g, "&").replace(/\\\//g, "/");
    const html = document.documentElement.innerHTML;
    const matches = [...html.matchAll(/https:\/\/scontent[^"'\\]+714955430_10234511125908376[^"'\\]+/g)].map(
      (m) => clean(m[0])
    );
    const ranked = matches.sort((a, b) => {
      const score = (u) =>
        u.includes("s960x960") ? 960 : u.includes("s200x200") ? 200 : u.includes("s320x320") ? 320 : 0;
      return score(b) - score(a);
    });
    return ranked[0] || null;
  });

  if (!profileUrl) {
    console.warn("Could not find profile photo on Facebook page");
    return;
  }

  for (const [file, transform] of [
    ["logo.jpg", (u) => u.replace(/ctp=s\d+x\d+/, "ctp=s960x960")],
    ["favicon.jpg", (u) => u.replace(/ctp=s\d+x\d+/, "ctp=s200x200")],
    ["apple-touch-icon.jpg", (u) => u.replace(/ctp=s\d+x\d+/, "ctp=s192x192")],
  ]) {
    try {
      const res = await fetch(transform(profileUrl));
      if (!res.ok) throw new Error(String(res.status));
      fs.writeFileSync(path.join(LEGACY_DIR, file), Buffer.from(await res.arrayBuffer()));
      console.log("Updated", file, "from Facebook profile photo");
    } catch (e) {
      console.warn("Profile icon", file, e.message);
    }
  }
}

async function main() {
  const cutoff = getCutoffDate();
  const prev = loadPreviousGallery();
  const urlMap = new Map();

  console.log(
    `Recency window: last ${RECENCY_MONTHS} months (since ${cutoff.toISOString().slice(0, 10)})`
  );

  fs.mkdirSync(GALLERY_DIR, { recursive: true });

  await fetchGraphApiImages(urlMap, cutoff);

  const chromium = await getChromium();
  const browser = await launchBrowser(chromium);
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await downloadProfileIcons(page);

  await fetchFacebookCover(page);

  const postTargets = await collectRecentPostTargets(page, cutoff);
  console.log("Recent post targets:", postTargets.length);
  for (const { href, postedAt } of postTargets) {
    await harvestUrlsFromPage(page, href, "facebook-post", urlMap, 4, postedAt);
  }

  for (const photoPage of PHOTO_PAGES) {
    await harvestUrlsFromPage(page, photoPage, "facebook-photos", urlMap, 24);
  }

  console.log("Unique images to download:", urlMap.size);

  let byId = await fetchAllImages(page, urlMap);
  await downloadGraphUrls(urlMap, byId);
  await browser.close();

  scanManualSlides(byId, cutoff);
  retainRecentPreviousSlides(byId, prev, cutoff);
  applyImageMeta(byId, prev.imageMeta);

  let candidates = sortForCarousel(
    [...byId.values()].filter((item) => isRecent(item.addedAt))
  );
  console.log("Slides in recency window:", candidates.length);

  for (const f of fs.readdirSync(GALLERY_DIR)) {
    if (/^slide-\d+\.jpg$/i.test(f)) fs.unlinkSync(path.join(GALLERY_DIR, f));
  }

  const slides = [];
  let n = 0;
  for (const item of candidates) {
    if (n >= MAX_IMAGES) break;
    n++;
    const file = `slide-${String(n).padStart(2, "0")}.jpg`;
    const dest = path.join(GALLERY_DIR, file);
    fs.writeFileSync(dest, Buffer.from(item.bytes));
    toJpeg(dest);
    slides.push({
      imageId: item.id,
      file: `assets/images/gallery/${file}`,
      alt: SLIDE_ALT,
      source: item.source || "facebook",
      addedAt: item.addedAt,
      lastSeenAt: item.lastSeenAt,
      postedAt: item.postedAt || null,
    });
  }

  const payload = {
    sources: { facebook: PAGE_URL },
    recency: {
      months: RECENCY_MONTHS,
      cutoff: cutoff.toISOString(),
      graphApi: Boolean(FB_TOKEN),
    },
    fetchedAt: new Date().toISOString(),
    slideCount: slides.length,
    slides,
  };

  fs.writeFileSync(MANIFEST, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${slides.length} slides → ${MANIFEST}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
