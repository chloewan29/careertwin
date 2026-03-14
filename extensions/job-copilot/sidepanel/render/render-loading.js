(function initSidepanelRenderLoading() {
  // Owns loading-state content rendering.
  const RenderRoot = globalThis.CareerTwinRenderRoot || {};

  function renderLoading() {
    const html = `
      <section class="ctsp-card">
        <h2>Preparing role fit</h2>
        <div class="ctsp-skeleton-row"></div>
        <div class="ctsp-skeleton-row ctsp-skeleton-row-short"></div>
        <p class="ctsp-note">Reading the job details and matching against your evidence-backed career memory.</p>
      </section>
    `;
    return RenderRoot.renderRoot ? RenderRoot.renderRoot(html) : html;
  }

  globalThis.CareerTwinRenderLoading = {
    renderLoading,
  };
})();
