(function initSidepanelRenderRoot() {
  // Owns shared layout frame for all sidepanel render states.
  function renderRoot(content) {
    return `
      <main class="ctsp-root">
        <header class="ctsp-header">
          <h1>Job Copilot</h1>
          <p>CareerTwin role fit</p>
        </header>
        ${content}
      </main>
    `;
  }

  globalThis.CareerTwinRenderRoot = {
    renderRoot,
  };
})();
