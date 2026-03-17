(function initSidepanelRenderMatchSummary() {
  // Owns match header section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderMatchSummary(viewModel) {
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const header = viewModel && viewModel.matchHeader ? viewModel.matchHeader : {};
    const fitScore = viewModel && viewModel.jobFitScore ? viewModel.jobFitScore : null;
    const scoreValue = typeof header.score === "number" ? `${header.score} / 100` : "-- / 100";
    const fitScoreBlock = fitScore
      ? `
        <div class="ctsp-note" style="margin-top:8px;">
          <strong>${esc(fitScore.bucket)} · ${esc(`${fitScore.totalScore} / 100`)}</strong><br/>
          Specialization ${esc(typeof fitScore.specializationFit === "number" ? fitScore.specializationFit : "--")}/40 ·
          Capability ${esc(typeof fitScore.capabilityMatch === "number" ? fitScore.capabilityMatch : "--")}/40 ·
          Evidence ${esc(typeof fitScore.evidenceStrength === "number" ? fitScore.evidenceStrength : "--")}/20
        </div>
      `
      : "";

    return `
      <section class="ctsp-card">
        <h2>${esc(header.sectionTitle || "Apply Recommendation")}</h2>
        <div class="ctsp-match-line">
          <span class="ctsp-match-verdict">${esc(header.verdictLabel || "Consider")}</span>
          <span class="ctsp-match-score">${esc(scoreValue)}</span>
        </div>
        ${fitScoreBlock}
        <p class="ctsp-note">${esc(header.summary || "")}</p>
      </section>
    `;
  }

  globalThis.CareerTwinRenderMatchSummary = {
    renderMatchSummary,
  };
})();
