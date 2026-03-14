(function initSidepanelRenderMatchSummary() {
  // Owns match header section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderMatchSummary(viewModel) {
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const header = viewModel && viewModel.matchHeader ? viewModel.matchHeader : {};
    const scoreValue = typeof header.score === "number" ? header.score : "--";

    return `
      <section class="ctsp-card">
        <h2>${esc(header.sectionTitle || "Match header")}</h2>
        <div class="ctsp-match-line">
          <span class="ctsp-match-verdict">${esc(header.verdictLabel || "Match")}</span>
          <span class="ctsp-match-score">(${esc(scoreValue)})</span>
        </div>
        <p class="ctsp-note">${esc(header.summary || "")}</p>
      </section>
    `;
  }

  globalThis.CareerTwinRenderMatchSummary = {
    renderMatchSummary,
  };
})();
