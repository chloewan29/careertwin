(function initSidepanelRenderUnlock() {
  // Owns "What This Role Adds" career-asset rendering.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function renderUnlock(viewModel) {
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.unlock && typeof viewModel.unlock === "object"
      ? viewModel.unlock
      : null;
    if (!section) return "";

    const type = toText(section.type);
    const title = toText(section.title);
    const summaryLine = toText(section.summaryLine);
    const detailLines = Array.isArray(section.detailLines)
      ? section.detailLines
        .map((item) => toText(item))
        .filter(Boolean)
        .slice(0, 2)
      : [];
    const bodyLines = Array.isArray(section.bodyLines)
      ? section.bodyLines
        .map((item) => toText(item))
        .filter(Boolean)
        .slice(0, 2)
      : [];
    const fallbackBody = toText(section.body);
    const nextStep = toText(section.next_step);

    if (!type || !title) return "";
    if (!summaryLine && bodyLines.length === 0 && !fallbackBody) return "";

    const previewLine = summaryLine || bodyLines[0] || fallbackBody;
    const detailSource = detailLines.length > 0
      ? detailLines
      : bodyLines.filter((line) => line !== previewLine);
    const resolvedDetailLines = detailSource.length > 0
      ? detailSource
      : (fallbackBody && fallbackBody !== previewLine ? [fallbackBody] : []);
    const bodyMarkup = resolvedDetailLines
      .map((line) => `<p class="ctsp-note ctsp-note-wrap">${esc(line)}</p>`)
      .join("");
    const nextStepMarkup = nextStep
      ? `<p class="ctsp-note ctsp-note-wrap">${esc(nextStep)}</p>`
      : "";

    return `
      <section class="ctsp-card ctsp-unlock" data-ctsp-unlock-type="${esc(type)}">
        <h2>${esc(title)}</h2>
        <details class="ctsp-expandable-note ctsp-unlock-preview">
          <summary>
            <span class="ctsp-unlock-preview-line">${esc(previewLine)}</span>
            <span class="ctsp-expandable-toggle">View details</span>
          </summary>
          ${bodyMarkup}
          ${nextStepMarkup}
        </details>
      </section>
    `;
  }

  globalThis.CareerTwinRenderUnlock = {
    renderUnlock,
  };
})();
