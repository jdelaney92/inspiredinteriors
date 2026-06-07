(function () {
  const navToggle = document.querySelector(".nav-toggle");
  const siteNav = document.querySelector(".site-nav");
  const yearEl = document.getElementById("year");

  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  if (!navToggle || !siteNav) return;

  const navLinks = siteNav.querySelectorAll("a[href^='#']");

  function closeNav() {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open menu");
    siteNav.classList.remove("is-open");
  }

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Open menu" : "Close menu");
    siteNav.classList.toggle("is-open", !isOpen);
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", closeNav);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeNav();
  });
})();
