(function initSidepanelRenderNotices() {
  // Owns runtime release-control and system notices rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function renderReleaseGateNotices(releaseGate, esc) {
    if (!releaseGate || typeof releaseGate !== "object") return "";
    const advisoryTitle = toText(releaseGate.advisory && releaseGate.advisory.title) || "Advisory posture enforced";
    const advisoryBody = toText(releaseGate.advisory && releaseGate.advisory.body);
    const residualDisclosure = releaseGate.residualDisclosure && typeof releaseGate.residualDisclosure === "object"
      ? releaseGate.residualDisclosure
      : {};
    const residualSummary = toText(residualDisclosure.summary);
    const residualItems = Array.isArray(residualDisclosure.items)
      ? residualDisclosure.items
      : [];
    const downgrade = releaseGate.downgrade && typeof releaseGate.downgrade === "object"
      ? releaseGate.downgrade
      : {};
    const triggered = Array.isArray(downgrade.triggers)
      ? downgrade.triggers.filter((item) => item && item.triggered).map((item) => toText(item.reason) || toText(item.key)).filter(Boolean)
      : [];

    const residualRows = residualItems.length > 0
      ? residualItems.map((item) => {
        const caseId = toText(item && item.caseId);
        const family = toText(item && item.family);
        const posture = toText(item && item.posture).replace(/_/g, " ");
        const signal = item && item.signalDetected ? "signal detected" : "clear";
        return `<li>Case ${esc(caseId)}: ${esc(family)} (${esc(posture || "watch")}, ${esc(signal)})</li>`;
      }).join("")
      : "<li>No residual watch items configured.</li>";

    const downgradeMarkup = downgrade.shouldDowngrade
      ? `<div class="ctsp-notice ctsp-notice-critical"><span class="ctsp-notice-level">downgraded</span><p>${esc(triggered[0] || "Runtime control trigger active. CTA is held to confirm-first.")}</p></div>`
      : `<div class="ctsp-notice ctsp-notice-info"><span class="ctsp-notice-level">downgrade watch</span><p>No downgrade trigger active in this runtime render.</p></div>`;

    return `
      <div class="ctsp-notice-stack" data-ctsp-release-control="true">
        <div class="ctsp-notice ctsp-notice-warning">
          <span class="ctsp-notice-level">${esc(toText(releaseGate.posture).replace(/_/g, " ") || "advisory posture")}</span>
          <p><strong>${esc(advisoryTitle)}</strong></p>
          ${advisoryBody ? `<p>${esc(advisoryBody)}</p>` : ""}
        </div>
        <div class="ctsp-notice ctsp-notice-info">
          <span class="ctsp-notice-level">${esc(toText(residualDisclosure.title) || "residual disclosure")}</span>
          ${residualSummary ? `<p>${esc(residualSummary)}</p>` : ""}
          <ul>${residualRows}</ul>
        </div>
        ${downgradeMarkup}
      </div>
    `;
  }

  function renderSystemNotices(analysis, esc, asArray) {
    const notices = asArray(analysis.system_notices);
    if (!notices.length) return "";

    const rows = notices
      .map((notice) => `<li>${esc(notice.message || notice.code || "Notice")}</li>`)
      .join("");

    return `
      <div class="ctsp-notice ctsp-notice-warning" data-ctsp-system-notices="true">
        <span class="ctsp-notice-level">system notices</span>
        <ul>${rows}</ul>
      </div>
    `;
  }

  function renderNotices(params) {
    const asArray = Utils.asArray || ((value) => (Array.isArray(value) ? value : []));
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const payload = params && typeof params === "object" ? params : {};
    const analysis = payload.analysis && typeof payload.analysis === "object" ? payload.analysis : {};
    const releaseGate = payload.releaseGate && typeof payload.releaseGate === "object"
      ? payload.releaseGate
      : null;
    const hasSystemNotices = asArray(analysis.system_notices).length > 0;
    if (!releaseGate && !hasSystemNotices) return "";

    const releaseMarkup = renderReleaseGateNotices(releaseGate, esc);
    const systemMarkup = renderSystemNotices(analysis, esc, asArray);
    const downgrade = releaseGate && releaseGate.downgrade && typeof releaseGate.downgrade === "object"
      ? releaseGate.downgrade
      : null;
    const hasCriticalTrigger = Boolean(downgrade && downgrade.shouldDowngrade);
    const summaryLabel = hasCriticalTrigger
      ? "Runtime/internal controls (attention needed)"
      : "Runtime/internal controls";
    const openAttr = hasCriticalTrigger ? " open" : "";
    return `
      <details class="ctsp-card ctsp-runtime-controls"${openAttr}>
        <summary>${esc(summaryLabel)}</summary>
        ${releaseMarkup}
        ${systemMarkup}
      </details>
    `;
  }

  globalThis.CareerTwinRenderNotices = {
    renderNotices,
  };
})();
