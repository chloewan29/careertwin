(function initCareerTwinUiContract() {
  // UI contract helpers for state checks and lightweight guards.
  const SidepanelStates = {
    IDLE: "idle",
    UNSUPPORTED_PAGE: "unsupported_page",
    EXTRACTING: "extracting",
    ANALYZING: "analyzing",
    READY: "ready",
    SPARSE_READY: "sparse_ready",
    ERROR: "error",
    AUTH_REQUIRED: "auth_required",
  };

  function isSparseQuality(jobAnalysis) {
    const quality = jobAnalysis && jobAnalysis.job_profile_quality;
    return quality === "sparse" || quality === "empty";
  }

  globalThis.CareerTwinUiContract = {
    SidepanelStates,
    isSparseQuality,
  };
})();
