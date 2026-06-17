(function initSidepanelPanelActions() {
  // Owns sidepanel actions for requesting analysis and tailored CV download.
  const Messages = globalThis.CareerTwinMessages || {};
  const REQUEST_TIMEOUT_MS = 30000;

  async function requestAnalysis(tabId, requestId) {
    const payload = {};
    if (typeof tabId === "number") payload.tabId = tabId;
    if (typeof requestId === "number") payload.requestId = requestId;
    const hasPayload = Object.keys(payload).length > 0;

    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          state: "error",
          error: "Analysis request timed out. Please retry.",
          code: "sidepanel_request_timeout",
        });
      }, REQUEST_TIMEOUT_MS);

      try {
        chrome.runtime.sendMessage(
          hasPayload
            ? { type: Messages.SIDEPANEL_REQUEST_ANALYSIS, payload }
            : { type: Messages.SIDEPANEL_REQUEST_ANALYSIS },
          (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutHandle);
          if (chrome.runtime.lastError) {
            resolve({
              ok: false,
              state: "error",
              error: chrome.runtime.lastError.message || "Runtime error",
            });
            return;
          }
            resolve(response || {
              ok: false,
              state: "error",
              error: "No response received from background.",
            });
          },
        );
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({
          ok: false,
          state: "error",
          error: error instanceof Error ? error.message : "Runtime send failed",
        });
      }
    });
  }

  async function requestResumeDownload(payload) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          state: "error",
          error: "Tailored CV request timed out. Please retry.",
          code: "sidepanel_download_timeout",
        });
      }, REQUEST_TIMEOUT_MS);

      try {
        chrome.runtime.sendMessage(
          { type: Messages.SIDEPANEL_DOWNLOAD_RESUME, payload: payload || {} },
          (response) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutHandle);
            if (chrome.runtime.lastError) {
              resolve({
                ok: false,
                state: "error",
                error: chrome.runtime.lastError.message || "Runtime error",
              });
              return;
            }
            resolve(response || {
              ok: false,
              state: "error",
              error: "No response received from background.",
            });
          },
        );
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({
          ok: false,
          state: "error",
          error: error instanceof Error ? error.message : "Runtime send failed",
        });
      }
    });
  }

  async function requestCalibrationUpdate(payload) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          state: "error",
          error: "Calibration update timed out. Please retry.",
          code: "sidepanel_calibration_timeout",
        });
      }, REQUEST_TIMEOUT_MS);

      try {
        chrome.runtime.sendMessage(
          { type: Messages.SIDEPANEL_SUBMIT_CALIBRATION, payload: payload || {} },
          (response) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutHandle);
            if (chrome.runtime.lastError) {
              resolve({
                ok: false,
                state: "error",
                error: chrome.runtime.lastError.message || "Runtime error",
              });
              return;
            }
            resolve(response || {
              ok: false,
              state: "error",
              error: "No response received from background.",
            });
          },
        );
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({
          ok: false,
          state: "error",
          error: error instanceof Error ? error.message : "Runtime send failed",
        });
      }
    });
  }

  async function requestQuickCheckMemorySave(payload) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          state: "error",
          error: "Save to memory timed out. Please retry.",
          code: "sidepanel_save_memory_timeout",
        });
      }, REQUEST_TIMEOUT_MS);

      try {
        chrome.runtime.sendMessage(
          { type: Messages.SIDEPANEL_SAVE_QUICK_CHECK_MEMORY, payload: payload || {} },
          (response) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeoutHandle);
            if (chrome.runtime.lastError) {
              resolve({
                ok: false,
                state: "error",
                error: chrome.runtime.lastError.message || "Runtime error",
              });
              return;
            }
            resolve(response || {
              ok: false,
              state: "error",
              error: "No response received from background.",
            });
          },
        );
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        resolve({
          ok: false,
          state: "error",
          error: error instanceof Error ? error.message : "Runtime send failed",
        });
      }
    });
  }

  globalThis.CareerTwinPanelActions = {
    requestAnalysis,
    requestResumeDownload,
    requestCalibrationUpdate,
    requestQuickCheckMemorySave,
  };
})();
