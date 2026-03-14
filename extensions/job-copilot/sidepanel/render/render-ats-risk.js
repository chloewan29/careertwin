(function initSidepanelRenderAtsRisk() {
  // Owns ATS risk section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderAtsRisk(analysis) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const rows = asArray(analysis.ats_risks)
      .map((item) => `<li>${esc(item.message)}</li>`)
      .join("");

    return `
      <h3>ATS risk</h3>
      <ul>${rows}</ul>
    `;
  }

  globalThis.CareerTwinRenderAtsRisk = {
    renderAtsRisk,
  };
})();
