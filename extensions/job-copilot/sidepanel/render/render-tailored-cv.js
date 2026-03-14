(function initSidepanelRenderTailoredCv() {
  // Owns final apply CTA section rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderTailoredCv(viewModel) {
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.applyCta ? viewModel.applyCta : {};
    const message = section.message || "Use a tailored CV to apply with role-specific evidence.";
    const disabledReason = section.enabled
      ? ""
      : (section.disabledReason || "Tailored CV is unavailable for this role right now.");
    const disabledAttr = section.enabled ? "" : "disabled";

    return `
      <section class="ctsp-card">
        <h2>${esc(section.title || "Apply with Tailored CV")}</h2>
        <p class="ctsp-note">${esc(message)}</p>
        <button
          type="button"
          class="ctsp-download-btn"
          data-ctsp-action="apply-tailored-cv"
          ${disabledAttr}
        >
          ${esc(section.buttonLabel || "Apply with Tailored CV")}
        </button>
        <p class="ctsp-cta-feedback" data-ctsp-action="apply-feedback">
          ${esc(disabledReason)}
        </p>
      </section>
    `;
  }

  globalThis.CareerTwinRenderTailoredCv = {
    renderTailoredCv,
  };
})();
