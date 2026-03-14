(function initSidepanelRenderError() {
  // Owns user-friendly error and fallback state rendering.
  const RenderRoot = globalThis.CareerTwinRenderRoot || {};
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderError(message) {
    const safeMessage = Utils.escapeHtml ? Utils.escapeHtml(message) : String(message || "");
    const html = `
      <section class="ctsp-card">
        <h2>We couldn't complete this analysis</h2>
        <p class="ctsp-note">${safeMessage}</p>
      </section>
    `;
    return RenderRoot.renderRoot ? RenderRoot.renderRoot(html) : html;
  }

  globalThis.CareerTwinRenderError = {
    renderError,
  };
})();
