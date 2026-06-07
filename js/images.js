(function () {
  document.querySelectorAll("img[data-fallback]").forEach((img) => {
    img.addEventListener("error", () => {
      const fallback = img.getAttribute("data-fallback");
      if (fallback && img.src !== fallback) {
        img.src = fallback;
      }
    });
  });

  const heroMedia = document.querySelector(".hero-media");
  if (!heroMedia) return;

  const fallback = heroMedia.getAttribute("data-hero-fallback");
  if (!fallback) return;

  const test = new Image();
  const photo = getComputedStyle(heroMedia).getPropertyValue("--hero-photo");
  const match = photo.match(/url\(["']?([^"')]+)["']?\)/);
  if (!match) return;

  test.onerror = () => {
    heroMedia.style.setProperty("--hero-photo", `url('${fallback}')`);
  };
  test.src = match[1].replace(/&amp;/g, "&");
})();
