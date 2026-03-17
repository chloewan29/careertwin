(function initSidepanelRenderQuickChecks() {
  // Owns calibration yes/no section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderQuickChecks(viewModel) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.quickChecks ? viewModel.quickChecks : {};
    const rows = asArray(section.items)
      .map((item) => {
        const yesActive = item.answer === "yes" ? "ctsp-cal-answer-active" : "";
        const noActive = item.answer === "no" ? "ctsp-cal-answer-active" : "";
        return `
          <li>
            <p class="ctsp-item-label">${esc(item.question)}</p>
            <div class="ctsp-cal-actions">
              <button
                type="button"
                class="ctsp-cal-btn ${yesActive}"
                data-ctsp-action="calibration-answer"
                data-question-id="${esc(item.id)}"
                data-answer="yes"
              >Yes</button>
              <button
                type="button"
                class="ctsp-cal-btn ${noActive}"
                data-ctsp-action="calibration-answer"
                data-question-id="${esc(item.id)}"
                data-answer="no"
              >No</button>
            </div>
          </li>
        `;
      })
      .join("");

    if (!rows) {
      return "";
    }

    const statusText = typeof section.statusText === "string"
      ? section.statusText
      : "";
    return `
      <section class="ctsp-card">
        <h2>${esc(section.sectionTitle || "A few quick checks")}</h2>
        <ul class="ctsp-compact-list">${rows}</ul>
        <p class="ctsp-cta-feedback" data-ctsp-action="calibration-feedback">${esc(statusText)}</p>
      </section>
    `;
  }

  globalThis.CareerTwinRenderQuickChecks = {
    renderQuickChecks,
  };
})();
