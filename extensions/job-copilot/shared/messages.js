(function initCareerTwinMessages() {
  // Single source of truth for extension message types.
  const Messages = {
    CONTENT_CONTEXT_UPDATED: "CTJC_CONTENT_CONTEXT_UPDATED",
    CONTENT_EXTRACT_REQUEST: "CTJC_CONTENT_EXTRACT_REQUEST",
    SIDEPANEL_REQUEST_ANALYSIS: "CTJC_SIDEPANEL_REQUEST_ANALYSIS",
    SIDEPANEL_DOWNLOAD_RESUME: "CTJC_SIDEPANEL_DOWNLOAD_RESUME",
  };

  globalThis.CareerTwinMessages = Messages;
})();
