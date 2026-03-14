(function initCareerTwinSharedUtils() {
  // Shared utility helpers used across sidepanel and runtime modules.
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  globalThis.CareerTwinSharedUtils = {
    escapeHtml,
    asArray,
  };
})();
