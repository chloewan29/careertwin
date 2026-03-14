(function initSidepanelLive() {
  // Sidepanel controller: continuously requests current-tab analysis and re-renders when visible job changes.
  const root = document.getElementById("app") || document.body;
  const Loading = globalThis.CareerTwinRenderLoading || {};
  const ErrorRenderer = globalThis.CareerTwinRenderError || {};
  const RootRenderer = globalThis.CareerTwinRenderRoot || {};
  const MatchViewModel = globalThis.CareerTwinRenderMatchViewModel || {};
  const MatchSummary = globalThis.CareerTwinRenderMatchSummary || {};
  const Capabilities = globalThis.CareerTwinRenderCapabilities || {};
  const Gaps = globalThis.CareerTwinRenderGaps || {};
  const TailoredCv = globalThis.CareerTwinRenderTailoredCv || {};
  const PanelState = globalThis.CareerTwinPanelState || {};
  const PanelActions = globalThis.CareerTwinPanelActions || {};
  const Messages = globalThis.CareerTwinMessages || {};

  const REFRESH_INTERVAL_MS = 2500;
  const LOADING_DELAY_MS = 450;
  const ACTIVE_TAB_RETRY_DELAY_MS = 150;

  let inFlight = false;
  let pollHandle = null;
  let disposed = false;
  let lastRenderSignature = "";
  let lastRenderState = "";
  let requestCounter = 0;
  let latestDispatchedRequestId = 0;
  let pendingRefresh = false;

  function renderError(message) {
    root.innerHTML = ErrorRenderer.renderError
      ? ErrorRenderer.renderError(message)
      : `<p>${message}</p>`;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function queryActiveTabOnce() {
    try {
      const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      return tabs && tabs[0] ? tabs[0] : null;
    } catch {
      return null;
    }
  }

  async function resolveActiveTabWithRetry() {
    let tab = await queryActiveTabOnce();
    if (tab && typeof tab.id === "number") {
      return tab;
    }

    await wait(ACTIVE_TAB_RETRY_DELAY_MS);
    tab = await queryActiveTabOnce();
    if (tab && typeof tab.id === "number") {
      return tab;
    }

    try {
      const currentWindowTabs = await chrome.tabs.query({ active: true, currentWindow: true });
      tab = currentWindowTabs && currentWindowTabs[0] ? currentWindowTabs[0] : null;
      if (tab && typeof tab.id === "number") {
        return tab;
      }
    } catch {
      // no-op
    }

    return null;
  }

  async function handleApplyTailoredCvClick(button, feedback, resumePayload) {
    const originalLabel = button.textContent || "Apply with Tailored CV";
    button.disabled = true;
    button.textContent = "Preparing Tailored CV...";
    if (feedback) feedback.textContent = "";

    const result = await PanelActions.requestResumeDownload(resumePayload);
    if (result && result.ok) {
      button.textContent = "Tailored CV Downloaded";
      if (feedback) feedback.textContent = "Your tailored CV download has started.";
      setTimeout(() => {
        if (!button.isConnected) return;
        button.textContent = originalLabel;
        button.disabled = false;
      }, 1600);
      return;
    }

    const errorMessage = result && result.error
      ? result.error
      : "Unable to generate a tailored CV right now.";
    if (feedback) feedback.textContent = errorMessage;
    button.textContent = originalLabel;
    button.disabled = false;
  }

  function bindApplyTailoredCvAction(viewModel) {
    const cta = viewModel && viewModel.applyCta ? viewModel.applyCta : null;
    const button = root.querySelector('[data-ctsp-action="apply-tailored-cv"]');
    const feedback = root.querySelector('[data-ctsp-action="apply-feedback"]');
    if (!button) return;

    if (!cta || !cta.enabled || !cta.resumePayload || typeof PanelActions.requestResumeDownload !== "function") {
      button.disabled = true;
      return;
    }

    button.addEventListener("click", () => {
      if (button.disabled) return;
      handleApplyTailoredCvClick(button, feedback, cta.resumePayload).catch(() => {
        if (feedback) feedback.textContent = "Unable to generate a tailored CV right now.";
        button.disabled = false;
      });
    });
  }

  function renderReady(data) {
    const viewModel = MatchViewModel.toMatchPanelViewModel
      ? MatchViewModel.toMatchPanelViewModel(data || {})
      : null;

    const content = [
      MatchSummary.renderMatchSummary ? MatchSummary.renderMatchSummary(viewModel) : "",
      Capabilities.renderCapabilities ? Capabilities.renderCapabilities(viewModel) : "",
      Gaps.renderGaps ? Gaps.renderGaps(viewModel) : "",
      TailoredCv.renderTailoredCv ? TailoredCv.renderTailoredCv(viewModel) : "",
    ].join("\n");

    root.innerHTML = RootRenderer.renderRoot ? RootRenderer.renderRoot(content) : content;
    bindApplyTailoredCvAction(viewModel);
  }

  function buildResponseSignature(response, state) {
    const contextSignature = response && response.context && response.context.signature
      ? String(response.context.signature)
      : "";

    if (contextSignature) {
      return `${state}|${contextSignature}`;
    }

    const analysis = response && response.data ? response.data.job_analysis : null;
    if (!analysis) {
      return `${state}|none`;
    }

    return [
      state,
      analysis.match_score,
      analysis.fit_level,
      analysis.score_confidence,
      analysis.interpretation_note,
      (analysis.top_matched_capabilities || []).length,
      (analysis.key_gaps || []).length,
      (analysis.ats_risks || []).length,
    ].join("|");
  }

  function applyResponse(response, isInitial) {
    if (!response) {
      if (isInitial || lastRenderState !== "error") {
        renderError("No response received from background.");
      }
      lastRenderState = "error";
      return;
    }

    const state = PanelState.toStateFromResponse
      ? PanelState.toStateFromResponse(response)
      : (response.state || "ready");

    const responseSignature = buildResponseSignature(response, state);
    const hasChanged = isInitial || responseSignature !== lastRenderSignature || state !== lastRenderState;

    if (!hasChanged) {
      return;
    }

    lastRenderSignature = responseSignature;
    lastRenderState = state;
    console.debug("[CareerTwin][sidepanel] state_selected", state);

    if (state === "unsupported_page") {
      renderError("This page is not currently supported.");
      return;
    }

    if (state === "auth_required") {
      renderError("Profile ID missing. Configure it in extension settings.");
      return;
    }

    if (state === "error") {
      renderError(response.error || "We couldn't read this page right now.");
      return;
    }

    const analysis = response.data ? response.data.job_analysis : null;
    if (!analysis) {
      renderError("No job analysis found.");
      return;
    }

    renderReady(response.data || {});
  }

  async function refresh(isInitial) {
    if (disposed) return;
    if (inFlight) {
      pendingRefresh = true;
      return;
    }
    inFlight = true;
    const requestId = ++requestCounter;
    latestDispatchedRequestId = requestId;

    let loadingTimer = null;
    if (isInitial && !lastRenderState) {
      root.innerHTML = Loading.renderLoading ? Loading.renderLoading() : "<p>Requesting analysis...</p>";
    } else if (!lastRenderState) {
      loadingTimer = setTimeout(() => {
        if (!disposed && inFlight) {
          root.innerHTML = Loading.renderLoading ? Loading.renderLoading() : "<p>Refreshing analysis...</p>";
        }
      }, LOADING_DELAY_MS);
    }

    try {
      const activeTab = await resolveActiveTabWithRetry();
      const activeTabId = activeTab && typeof activeTab.id === "number"
        ? activeTab.id
        : null;

      if (activeTabId !== null) {
        console.debug("[CareerTwin][sidepanel] active tab detected", activeTabId);
      } else {
        console.debug("[CareerTwin][sidepanel] active tab detection retry exhausted; using background fallback");
      }

      console.debug("[CareerTwin][sidepanel] sending analysis request");
      console.debug("[CareerTwin][sidepanel] message type used", Messages.SIDEPANEL_REQUEST_ANALYSIS || "unknown");
      console.debug(`[CareerTwin][sidepanel][req=${requestId}] request dispatch`, { tabId: activeTabId });
      const response = await PanelActions.requestAnalysis(activeTabId, requestId);
      const responseRequestId = response && typeof response.requestId === "number"
        ? response.requestId
        : requestId;
      console.debug("[CareerTwin][sidepanel] got analysis response", {
        ok: response ? response.ok : null,
        state: response ? response.state : null,
        requestId: responseRequestId,
      });
      if (loadingTimer) clearTimeout(loadingTimer);
      if (responseRequestId < latestDispatchedRequestId) {
        console.debug("[CareerTwin][sidepanel] stale response ignored", {
          responseRequestId,
          latestDispatchedRequestId,
        });
        return;
      }
      applyResponse(response, isInitial);
    } catch (error) {
      if (loadingTimer) clearTimeout(loadingTimer);
      renderError(error instanceof Error ? error.message : "Failed to load analysis.");
      lastRenderState = "error";
      lastRenderSignature = "error";
    } finally {
      inFlight = false;
      if (!disposed && pendingRefresh) {
        pendingRefresh = false;
        setTimeout(() => {
          if (!disposed) {
            refresh(false);
          }
        }, 0);
      }
    }
  }

  function startPolling() {
    refresh(true);
    pollHandle = setInterval(() => {
      refresh(false);
    }, REFRESH_INTERVAL_MS);
  }

  function dispose() {
    disposed = true;
    if (pollHandle) {
      clearInterval(pollHandle);
      pollHandle = null;
    }
  }

  window.addEventListener("unload", dispose);
  startPolling();
})();
