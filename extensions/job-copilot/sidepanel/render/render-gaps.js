(function initSidepanelRenderGaps() {
  // Owns "potential risks" section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderGaps(viewModel) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.potentialRisks ? viewModel.potentialRisks : {};
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
          <h2>${esc(section.sectionTitle || "Potential risks")}</h2>
          <p class="ctsp-empty">No major risks are currently flagged from the available match signals.</p>
        </section>
      `;
    }

    return `
      <section class="ctsp-card">
        <h2>${esc(section.sectionTitle || "Potential risks")}</h2>
        <ul class="ctsp-compact-list">${rows}</ul>
      </section>
    `;
  }

  globalThis.CareerTwinRenderGaps = {
    renderGaps,
  };
})();
