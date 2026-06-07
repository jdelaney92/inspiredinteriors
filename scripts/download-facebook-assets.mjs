/**
 * Download Facebook profile photo, gallery, hero, and about backdrop.
 * Profile photo must come from the page CDN — Graph API returns a generic placeholder.
 */
import fs from "fs";
import https from "https";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const IMAGES = path.join(ROOT, "assets/images");
const GALLERY = path.join(IMAGES, "gallery");
const MANIFEST = path.join(ROOT, "data/gallery.json");
const PAGE_ID = "61590368201826";
const REFERER = `https://www.facebook.com/profile.php?id=${PAGE_ID}`;

const PROFILE_URL =
  "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-1/714955430_10234511125908376_2269680893453310887_n.jpg?stp=dst-jpg_tt6&cstp=mx1024x1536&ctp=s960x960&_nc_cat=107&ccb=1-7&_nc_sid=3ab345&_nc_ohc=zplMjpsWBD8Q7kNvwHatYQY&_nc_oc=Adr0G4lMEKVH98dgSvuGn39m5OtsUSK1ISOOYKMldTS_KZcRQKZvy3fAMlX8zjmH79r97O5_LOVAhWKcNcyCILB5&_nc_zt=24&_nc_ht=scontent-atl3-3.xx&_nc_gid=3yyyOvI99KyCSCx3msZeVA&_nc_ss=78289&oh=00_Af-H0s9lwKs2IroPUvBqJr3JyEaic--UDgoKFqRHGu5FYA&oe=6A2B56DB";

const PROFILE_SMALL_URL =
  "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-1/714955430_10234511125908376_2269680893453310887_n.jpg?stp=c0.0.1024.1024a_dst-jpg_tt6&cstp=mx1024x1024&ctp=s200x200&_nc_cat=107&ccb=1-7&_nc_sid=f907e8&_nc_ohc=zplMjpsWBD8Q7kNvwHatYQY&_nc_oc=Adr0G4lMEKVH98dgSvuGn39m5OtsUSK1ISOOYKMldTS_KZcRQKZvy3fAMlX8zjmH79r97O5_LOVAhWKcNcyCILB5&_nc_zt=24&_nc_ht=scontent-atl3-3.xx&_nc_gid=9hOY0i9Bbn6w6O_ZW316NA&_nc_ss=78289&oh=00_Af-Q2oRl9gvgLvWUM8WCJ1zF-K6CXEUWPg_juA2bCD8IWw&oe=6A2B56DB";

const COVER_URL =
  "https://scontent-atl3-1.xx.fbcdn.net/v/t39.30808-6/715354233_10234511178029679_763236164011356947_n.jpg?stp=dst-jpg_tt6&cstp=mx1206x2622&ctp=s960x960&_nc_cat=103&ccb=1-7&_nc_sid=cc71e4&_nc_ohc=-fdxsbYldLMQ7kNvwHQkxrc&_nc_oc=AdrYs90BcwFzuPQrBk8x2_iCi73-Hlu9XBoOVKM33dbUpjKre6RHyxUIBBuGqsPxwwkv8JnGI9Nur79g-QtEFFfp&_nc_zt=23&_nc_ht=scontent-atl3-1.xx&_nc_gid=ag2CA1J44mEKPQm4CR85Ew&_nc_ss=78289&oh=00_Af_fDuGnG8hkKi-O5pbVbkpDVHiNOS7EpW97P07gHVTK0w&oe=6A2B62C4";

/** Sharp landscape project photo for the about section (not the portrait cover). */
const ABOUT_BACKDROP_URL =
  "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/715550518_122103596295345606_629401038702969745_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s590x590&_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_ohc=BtEC_-KjHIwQ7kNvwEDw_GB&_nc_oc=AdpyQJgqglPjk86Q2UFs-ZjyTIOBRT6BW_oWs1x6XengmFPSYYgExhPY_RsVHeQIAXx1H8Yp5A2YZmKeSyI4YUDV&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=dOdbp-O38OhifdRB9iiebQ&_nc_ss=78289&oh=00_Af8TIdJhIyPlbanZG3IiWKH5iT-J2456R-pfMUEBRNZSyQ&oe=6A2B7CB3";

const GALLERY_ITEMS = [
  {
    id: "715550518_122103596295345606",
    url: "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/715550518_122103596295345606_629401038702969745_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s590x590&_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_ohc=BtEC_-KjHIwQ7kNvwEDw_GB&_nc_oc=AdpyQJgqglPjk86Q2UFs-ZjyTIOBRT6BW_oWs1x6XengmFPSYYgExhPY_RsVHeQIAXx1H8Yp5A2YZmKeSyI4YUDV&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=dOdbp-O38OhifdRB9iiebQ&_nc_ss=78289&oh=00_Af8TIdJhIyPlbanZG3IiWKH5iT-J2456R-pfMUEBRNZSyQ&oe=6A2B7CB3",
  },
  {
    id: "710799563_122103596745345606",
    url: "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/710799563_122103596745345606_5272292348935230083_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s590x590&_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_ohc=gZzkqXvRUTYQ7kNvwH_tENC&_nc_oc=Adq9TmaUY3E71eh1EdYbUUsPyFiHcbqlePhPYU8yo-7PVsGzPaMN64HzwggrSmgphTpbyoPD4C1DeKmeesiH7jlK&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=dOdbp-O38OhifdRB9iiebQ&_nc_ss=78289&oh=00_Af93yAF3lTY1ZNScJRIQ1isLjOftgAZSZoFgqovWwreUyA&oe=6A2B73CC",
  },
  {
    id: "710827507_122103596937345606",
    url: "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/710827507_122103596937345606_8511907398274848661_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s590x590&_nc_cat=108&ccb=1-7&_nc_sid=833d8c&_nc_ohc=_83EUseVvqQQ7kNvwE2H5G9&_nc_oc=AdrYoDjjID-svg4p6E-GDji0gKG8uLfFxbvRiwYi7wWduYpAX8liKAaRE1buLYLnI-pQshw5Vwy_voaa-LWddkCx&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=dOdbp-O38OhifdRB9iiebQ&_nc_ss=78289&oh=00_Af-y8VQysovb2Urj1jzCAJfOBT-jHT69GaCPtY1tgxmOKA&oe=6A2B5F28",
  },
  {
    id: "714989929_122103596949345606",
    url: "https://scontent-atl3-1.xx.fbcdn.net/v/t39.30808-6/714989929_122103596949345606_2221614140571035727_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s590x590&_nc_cat=106&ccb=1-7&_nc_sid=833d8c&_nc_ohc=rP_rloU0-DwQ7kNvwHmx0xX&_nc_oc=AdqDnLmDhQWXOiYOeaxG0Cf8yunm99Rmk1ShKBkk5guFVIXAwLAtd85n0-2G4o0eKfMVX-5m7pOSLK1b8WA9MZQh&_nc_zt=23&_nc_ht=scontent-atl3-1.xx&_nc_gid=dOdbp-O38OhifdRB9iiebQ&_nc_ss=78289&oh=00_Af8kKd618FHjmaxXcVkTHVPGZjq5j2CIEIzZu8df_meYQA&oe=6A2B78FA",
  },
  {
    id: "717297686_122103596925345606",
    url: "https://scontent-atl3-2.xx.fbcdn.net/v/t39.30808-6/717297686_122103596925345606_1263386006806556527_n.jpg?stp=cp6_dst-jpg_tt6&cstp=mx1536x2048&ctp=s590x590&_nc_cat=101&ccb=1-7&_nc_sid=833d8c&_nc_ohc=OJm7unUbmDEQ7kNvwGqr6jk&_nc_oc=AdrffzqrlFG6E8iBlJFVkrywnE5ivA7zU0ApuRkK6rIJjmzr3Uoi73x2R8wpIvNSDFF2Rjijl9cb5dgzd_p8z5DT&_nc_zt=23&_nc_ht=scontent-atl3-2.xx&_nc_gid=dOdbp-O38OhifdRB9iiebQ&_nc_ss=78289&oh=00_Af9QH0k8sdX-XwsJAXTykrrTMiQIpWensp7FglpRntCA8Q&oe=6A2B7CBF",
  },
  {
    id: "710827404_122103596973345606",
    url: "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/710827404_122103596973345606_6416764929301375117_n.jpg?stp=c0.169.1536.1536a_cp6_dst-jpg_tt6&cstp=mx1536x1536&ctp=s160x160&_nc_cat=100&ccb=1-7&_nc_sid=8a6525&_nc_ohc=PJUVJFIqEBkQ7kNvwGZFvsx&_nc_oc=AdqTyr05VJFFn4jvyiTJJ312P88K1SvsYSRgIpV02nQO5W1hKFUPP9UOnoLGmJ7jZpzCcf0K36fQzd-ZKtcmwktQ&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=JYHydxdd9kxv-HxIl620SQ&_nc_ss=78289&oh=00_Af8XqDpx0o2NoNbISNYN37mqQU-wM3WTeb1NcOM5Sj8PzA&oe=6A2B768B",
  },
  {
    id: "718063519_122103596961345606",
    url: "https://scontent-atl3-2.xx.fbcdn.net/v/t39.30808-6/718063519_122103596961345606_4974561856406053142_n.jpg?stp=c0.169.1536.1536a_cp6_dst-jpg_tt6&cstp=mx1536x1536&ctp=s160x160&_nc_cat=104&ccb=1-7&_nc_sid=8a6525&_nc_ohc=9AECh7_0_z4Q7kNvwHuX67G&_nc_oc=AdpdodWm8EdP2_btDj3-MJ1p8gvZwYh2CMY-CoNYXKIw7vpyWn8Dpr1Aqa-rBF0dvdRiyzhUr8in6-OTCHPrl-et&_nc_zt=23&_nc_ht=scontent-atl3-2.xx&_nc_gid=JYHydxdd9kxv-HxIl620SQ&_nc_ss=78289&oh=00_Af-uNeOZD4eH5d33cmJPLk8e7gvHF6lHUyfzrcteXMpXfA&oe=6A2B4D5A",
  },
  {
    id: "710827509_122103596889345606",
    url: "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/710827509_122103596889345606_868733139966009412_n.jpg?stp=c0.169.1536.1536a_cp6_dst-jpg_tt6&cstp=mx1536x1536&ctp=s160x160&_nc_cat=107&ccb=1-7&_nc_sid=8a6525&_nc_ohc=1NnDsxeiX3MQ7kNvwFWgesN&_nc_oc=Adqylt2RGS5jOdb0zkZYeZnka1ssYXCy09POs-E5W8mJCXfFnIgKCWiBAPU9rQFoWKWjnTqb9_RzAhG9Y70nYGVp&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=JYHydxdd9kxv-HxIl620SQ&_nc_ss=78289&oh=00_Af8MTS5Oj65AuvwrsrrlNqxUzSZBC2obuE-M0vS5NNqJug&oe=6A2B718B",
  },
  {
    id: "717810778_122103596841345606",
    url: "https://scontent-atl3-2.xx.fbcdn.net/v/t39.30808-6/717810778_122103596841345606_9144327758658933687_n.jpg?stp=c0.169.1536.1536a_cp6_dst-jpg_tt6&cstp=mx1536x1536&ctp=s160x160&_nc_cat=102&ccb=1-7&_nc_sid=8a6525&_nc_ohc=W_32PFBo8LIQ7kNvwGr9Zdz&_nc_oc=AdocLsMnYbzvp56nMPP_L4cAZ2vecYrvv-9LxC4vhrKcXSW1ADFER5K5dCFNU5Tv1egYBBW7O9sLg2ZZndC8gnMj&_nc_zt=23&_nc_ht=scontent-atl3-2.xx&_nc_gid=JYHydxdd9kxv-HxIl620SQ&_nc_ss=78289&oh=00_Af9BqPUHTLz5WSSbNq_amw0ABhIzhBLaPBw_npPjU2Ctsw&oe=6A2B62CD",
  },
  {
    id: "710781972_122103596823345606",
    url: "https://scontent-atl3-2.xx.fbcdn.net/v/t39.30808-6/710781972_122103596823345606_2195048127582794916_n.jpg?stp=c0.169.1536.1536a_cp6_dst-jpg_tt6&cstp=mx1536x1536&ctp=s160x160&_nc_cat=105&ccb=1-7&_nc_sid=8a6525&_nc_ohc=vVbfsa-3Jq0Q7kNvwFPFINi&_nc_oc=Adq_gsQA3z8w2JPnbmQdV_3qxPlEkWDkVub8gf9lTYRruK-fA138Pgv3lTzvOFNfqcx0l6WFEbJWZwvYG88eRHK3&_nc_zt=23&_nc_ht=scontent-atl3-2.xx&_nc_gid=JYHydxdd9kxv-HxIl620SQ&_nc_ss=78289&oh=00_Af9jIpq2AVOuU-OYtfNUK_xTh4SYFP5K75l-q_HpUa3Dtg&oe=6A2B7643",
  },
  {
    id: "715397264_122103596811345606",
    url: "https://scontent-atl3-3.xx.fbcdn.net/v/t39.30808-6/715397264_122103596811345606_8573692988961829228_n.jpg?stp=c0.169.1536.1536a_cp6_dst-jpg_tt6&cstp=mx1536x1536&ctp=s160x160&_nc_cat=100&ccb=1-7&_nc_sid=8a6525&_nc_ohc=HkQ0cIWrtSIQ7kNvwHlMpbo&_nc_oc=AdoorZi2JgjwRB5-vUO_IjR56JpSa94a5EG5pXigqLR6kVT-pibvHfKj3lrB1-wgs64TJo9thLOlBi62_IYmBUMK&_nc_zt=23&_nc_ht=scontent-atl3-3.xx&_nc_gid=JYHydxdd9kxv-HxIl620SQ&_nc_ss=78289&oh=00_Af8O7AK2myp94D1UREdaQnjDcaTJ4f7beW_qkR1vmpIkLQ&oe=6A2B57D0",
  },
];

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
            fs.writeFileSync(dest, Buffer.concat(chunks));
            resolve(dest);
          });
        }
      )
      .on("error", reject);
  });
}

async function downloadProfileIcons() {
  await download(PROFILE_URL, path.join(IMAGES, "logo.jpg"));
  console.log("Saved logo.jpg (Facebook profile photo)");
  await download(PROFILE_SMALL_URL, path.join(IMAGES, "favicon.jpg"));
  console.log("Saved favicon.jpg");
  fs.copyFileSync(path.join(IMAGES, "logo.jpg"), path.join(IMAGES, "apple-touch-icon.jpg"));
  console.log("Saved apple-touch-icon.jpg");
}

async function main() {
  fs.mkdirSync(GALLERY, { recursive: true });

  await downloadProfileIcons();

  console.log("Downloading hero cover…");
  await download(COVER_URL, path.join(IMAGES, "hero.jpg"));

  console.log("Downloading about backdrop…");
  await download(ABOUT_BACKDROP_URL, path.join(IMAGES, "about-backdrop.jpg"));

  const slides = [];
  let n = 0;
  for (const item of GALLERY_ITEMS) {
    n += 1;
    const file = `slide-${String(n).padStart(2, "0")}.jpg`;
    const dest = path.join(GALLERY, file);
    try {
      await download(item.url, dest);
      console.log("Saved", file, fs.statSync(dest).size, "bytes");
      slides.push({
        imageId: item.id,
        file: `assets/images/gallery/${file}`,
        alt: "Inspired Interiors remodeling project",
        source: "facebook",
        addedAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn("Skipped", file, e.message);
    }
  }

  const payload = {
    sources: { facebook: `https://www.facebook.com/profile.php?id=${PAGE_ID}` },
    profilePhoto: PROFILE_URL,
    recency: { months: 3, graphApi: false },
    fetchedAt: new Date().toISOString(),
    slideCount: slides.length,
    slides,
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(payload, null, 2) + "\n");
  console.log(`Wrote ${slides.length} slides to gallery.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
