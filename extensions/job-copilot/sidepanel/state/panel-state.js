(function initSidepanelPanelState() {
  // Owns panel state constants and response->state mapping.
  const UiContract = globalThis.CareerTwinUiContract || {};
  const SidepanelStates = UiContract.SidepanelStates || {
    IDLE: "idle",
    READY: "ready",
    ERROR: "error",
  };

  function toStateFromResponse(response) {
    if (!response) return SidepanelStates.ERROR;
    if (response.state === "sparse_ready") return "sparse_ready";
    if (response.state === "ready") return SidepanelStates.READY;
    if (response.state === "unsupported_page") return "unsupported_page";
    if (response.state === "auth_required") return "auth_required";
    if (response.state === "error") return SidepanelStates.ERROR;
    return SidepanelStates.READY;
  }

  globalThis.CareerTwinPanelState = {
    SidepanelStates,
    toStateFromResponse,
  };
})();
