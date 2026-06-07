(function () {
  const gridEl = document.getElementById("services-grid");
  if (!gridEl) return;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(cards) {
    gridEl.setAttribute("aria-busy", "false");

    if (!cards.length) {
      gridEl.innerHTML = '<li class="service-card"><p>Services listed soon.</p></li>';
      return;
    }

    gridEl.innerHTML = cards
      .map((card) => {
        const title = escapeHtml(card.title);
        const body = escapeHtml(card.body);
        return `<li class="service-card">
          <h3>${title}</h3>
          <p>${body}</p>
        </li>`;
      })
      .join("");
  }

  async function loadServices() {
    gridEl.setAttribute("aria-busy", "true");
    try {
      const response = await fetch("data/services.json", { cache: "no-cache" });
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      const cards = Array.isArray(data?.cards) ? data.cards : [];
      render(cards);
    } catch {
      gridEl.setAttribute("aria-busy", "false");
      gridEl.innerHTML =
        '<li class="service-card"><p>Could not load services right now.</p></li>';
    }
  }

  loadServices();
})();
