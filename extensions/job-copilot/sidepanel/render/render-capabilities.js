(function initSidepanelRenderCapabilities() {
  // Owns "why this role fits you" section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderCapabilities(viewModel) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.whyFit ? viewModel.whyFit : {};
    const rows = asArray(section.items)
      .map((item) => `
        <li>
          <p class="ctsp-item-label">${esc(item.label)}</p>
          <p class="ctsp-item-detail">${esc(item.explanation)}</p>
        </li>
      `)
      .join("");

    if (!rows) {
      return `
        <section class="ctsp-card">
          <h2>${esc(section.sectionTitle || "Why this role fits you")}</h2>
          <p class="ctsp-empty">No clear role-fit strengths were detected from current signals.</p>
        </section>
      `;
    }

    return `
      <section class="ctsp-card">
        <h2>${esc(section.sectionTitle || "Why this role fits you")}</h2>
        <ul class="ctsp-compact-list">${rows}</ul>
      </section>
    `;
  }

  globalThis.CareerTwinRenderCapabilities = {
    renderCapabilities,
  };
})();
