(function initSidepanelRenderCareerInsight() {
  // Owns "career insight" section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderCareerInsight(viewModel) {
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.careerInsight ? viewModel.careerInsight : {};
    const text = typeof section.text === "string" ? section.text : "";

    if (!text) return "";
    return `
      <section class="ctsp-card">
        <h2>${esc(section.sectionTitle || "Career Insight")}</h2>
        <p class="ctsp-note">${esc(text)}</p>
      </section>
    `;
  }

  globalThis.CareerTwinRenderCareerInsight = {
    renderCareerInsight,
  };
})();
