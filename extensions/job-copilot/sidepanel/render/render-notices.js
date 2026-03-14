(function initSidepanelRenderNotices() {
  // Owns system notices section rendering (hidden when empty to preserve current UI).
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function renderNotices(analysis) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const notices = asArray(analysis.system_notices);
    if (!notices.length) return "";

    const rows = notices
      .map((notice) => `<li>${esc(notice.message || notice.code || "Notice")}</li>`)
      .join("");

    return `
      <h3>System notices</h3>
      <ul>${rows}</ul>
    `;
  }

  globalThis.CareerTwinRenderNotices = {
    renderNotices,
  };
})();
