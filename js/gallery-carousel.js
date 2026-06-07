(function () {
  const track = document.getElementById("carousel-track");
  const dotsRoot = document.getElementById("carousel-dots");
  const statusEl = document.getElementById("gallery-status");
  const carousel = document.getElementById("project-carousel");
  if (!track || !carousel) return;

  const FB_URL = "https://www.facebook.com/profile.php?id=61590368201826";
  const prevBtn = carousel.querySelector(".carousel-btn--prev");
  const nextBtn = carousel.querySelector(".carousel-btn--next");

  let slides = [];
  let index = 0;
  let timer = null;
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatFetchedAt(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "";
    }
  }

  function goTo(i) {
    if (!slides.length) return;
    index = ((i % slides.length) + slides.length) % slides.length;
    track.style.transform = `translateX(-${index * 100}%)`;
    dotsRoot.querySelectorAll(".carousel-dot").forEach((dot, di) => {
      dot.classList.toggle("is-active", di === index);
      dot.setAttribute("aria-selected", di === index ? "true" : "false");
    });
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  function startAutoplay() {
    stopAutoplay();
    if (prefersReduced || slides.length < 2) return;
    timer = window.setInterval(next, 5500);
  }

  function stopAutoplay() {
    if (timer) window.clearInterval(timer);
    timer = null;
  }

  const MAX_SLIDES = 20;

  function buildCarousel(data) {
    slides = (data?.slides || []).slice(0, MAX_SLIDES);
    if (statusEl && data?.fetchedAt) {
      const count = data.slideCount ?? slides.length;
      const months = data.recency?.months;
      const windowLabel = months ? `last ${months} months` : "Facebook";
      statusEl.textContent = `Photos updated ${formatFetchedAt(data.fetchedAt)} · ${count} from ${windowLabel}`;
    }

    if (!slides.length) {
      track.innerHTML = `<li class="carousel-slide"><p class="carousel-empty">Photos coming soon. Follow us on <a href="${FB_URL}" target="_blank" rel="noopener noreferrer">Facebook</a>.</p></li>`;
      return;
    }

    track.innerHTML = slides
      .map(
        (s, i) => `<li class="carousel-slide" id="carousel-slide-${i}">
        <img src="${escapeHtml(s.file)}" alt="${escapeHtml(s.alt || "Inspired Interiors remodeling project")}" loading="${i === 0 ? "eager" : "lazy"}" width="960" height="720" />
      </li>`
      )
      .join("");

    dotsRoot.innerHTML = slides
      .map(
        (_, i) =>
          `<button type="button" class="carousel-dot${i === 0 ? " is-active" : ""}" aria-label="Show photo ${i + 1}" aria-selected="${i === 0 ? "true" : "false"}" data-index="${i}"></button>`
      )
      .join("");

    dotsRoot.querySelectorAll(".carousel-dot").forEach((dot) => {
      dot.addEventListener("click", () => {
        goTo(Number(dot.dataset.index));
        startAutoplay();
      });
    });

    goTo(0);
    startAutoplay();
  }

  prevBtn?.addEventListener("click", () => {
    prev();
    startAutoplay();
  });
  nextBtn?.addEventListener("click", () => {
    next();
    startAutoplay();
  });

  carousel.addEventListener("mouseenter", stopAutoplay);
  carousel.addEventListener("mouseleave", startAutoplay);
  carousel.addEventListener("focusin", stopAutoplay);
  carousel.addEventListener("focusout", startAutoplay);

  document.addEventListener("keydown", (e) => {
    if (!carousel.contains(document.activeElement) && document.activeElement !== document.body) {
      const gallery = document.getElementById("gallery");
      if (!gallery?.contains(document.activeElement)) return;
    }
    if (e.key === "ArrowLeft") {
      prev();
      startAutoplay();
    }
    if (e.key === "ArrowRight") {
      next();
      startAutoplay();
    }
  });

  fetch("data/gallery.json", { cache: "no-cache" })
    .then((r) => {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    })
    .then(buildCarousel)
    .catch(() => {
      if (statusEl) statusEl.textContent = "";
      track.innerHTML = `<li class="carousel-slide"><p class="carousel-empty">Could not load photos. <a href="${FB_URL}" target="_blank" rel="noopener noreferrer">View on Facebook</a></p></li>`;
    });
})();
