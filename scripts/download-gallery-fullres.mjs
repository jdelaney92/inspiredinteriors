/**
 * Download full-resolution gallery images from Facebook photo viewer URLs.
 */
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GALLERY = path.join(ROOT, "assets/images/gallery");
const MANIFEST = path.join(ROOT, "data/gallery.json");
const SOURCES = path.join(ROOT, "data/gallery-fullres-sources.json");
const REFERER = "https://www.facebook.com/profile.php?id=61590368201826";
const MAX_SLIDES = 20;
const MIN_BYTES = 50000;

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith("https") ? https : http;
    lib
      .get(
        url,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            Referer: REFERER,
          },
        },
        (res) => {
          if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
            download(res.headers.location, dest).then(resolve).catch(reject);
            return;
          }
          if (res.statusCode !== 200) {
            reject(new Error(`HTTP ${res.statusCode}`));
            return;
          }
          const chunks = [];
          res.on("data", (c) => chunks.push(c));
          res.on("end", () => {
            const buf = Buffer.concat(chunks);
            fs.writeFileSync(dest, buf);
            resolve(buf.length);
          });
        }
      )
      .on("error", reject);
  });
}

async function main() {
  const items = JSON.parse(fs.readFileSync(SOURCES, "utf8")).slice(0, MAX_SLIDES);
  fs.mkdirSync(GALLERY, { recursive: true });

  for (const f of fs.readdirSync(GALLERY)) {
    if (/^slide-\d+\.jpg$/i.test(f)) fs.unlinkSync(path.join(GALLERY, f));
  }

  const slides = [];
  let n = 0;
  for (const item of items) {
    n += 1;
    const file = `slide-${String(n).padStart(2, "0")}.jpg`;
    const dest = path.join(GALLERY, file);
    try {
      const size = await download(item.url, dest);
      if (size < MIN_BYTES) {
        console.warn("Skipped (too small)", file, size);
        fs.unlinkSync(dest);
        n -= 1;
        continue;
      }
      console.log("Saved", file, size, "bytes");
      slides.push({
        imageId: item.id,
        file: `assets/images/gallery/${file}`,
        alt: "Inspired Interiors remodeling project",
        source: "facebook-photo-viewer",
        width: 1536,
        addedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Failed", file, e.message);
      n -= 1;
    }
  }

  const payload = {
    sources: { facebook: REFERER, quality: "photo-viewer-full" },
    fetchedAt: new Date().toISOString(),
    slideCount: slides.length,
    slides,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Gallery updated with ${slides.length} full-resolution slides`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
