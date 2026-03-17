(function initSidepanelRenderPositioning() {
  // Owns "how to position yourself" section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderPositioning(viewModel) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.positioning ? viewModel.positioning : {};
    const rows = asArray(section.items)
      .map((item) => `<li><p class="ctsp-item-detail">${esc(item)}</p></li>`)
      .join("");

    if (!rows) {
      return "";
    }

    return `
      <section class="ctsp-card">
        <h2>${esc(section.sectionTitle || "How to position yourself")}</h2>
        <ul class="ctsp-compact-list">${rows}</ul>
      </section>
    `;
  }

  globalThis.CareerTwinRenderPositioning = {
    renderPositioning,
  };
})();
