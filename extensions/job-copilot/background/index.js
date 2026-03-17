console.log("[CareerTwin][background] worker loaded");
importScripts(
  "../shared/messages.js",
  "../shared/constants.js",
  "../shared/job-payload.js",
  "../shared/ui-contract.js",
  "./cache.js",
  "./api-client.js",
  "./analysis-service.js",
  "./download-service.js",
);

(function initCareerTwinBackgroundWorker() {
  // Background entrypoint routing extension messages to owned services.
  const Messages = globalThis.CareerTwinMessages || {};
  const Cache = globalThis.CareerTwinBackgroundCache;
  const AnalysisService = globalThis.CareerTwinAnalysisService;
  const DownloadService = globalThis.CareerTwinDownloadService;
  const Constants = globalThis.CareerTwinConstants || {};
  const ANALYSIS_E2E_TIMEOUT_MS = 35000;
  let sidepanelRequestCounter = 0;

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][background] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][background] ${label}`);
    }
  }

  async function bootstrapExtensionSettings() {
    const defaultApiBaseUrl = Constants.DEFAULT_API_BASE_URL || "http://localhost:3000";
    const defaultProfileId = Constants.DEFAULT_PROFILE_ID || "";
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          apiBaseUrl: defaultApiBaseUrl,
          profileId: "",
        },
        (items) => {
          const updates = {};
          if (!items.apiBaseUrl && defaultApiBaseUrl) updates.apiBaseUrl = defaultApiBaseUrl;
          if (!items.profileId && defaultProfileId) updates.profileId = defaultProfileId;

          if (Object.keys(updates).length === 0) {
            resolve();
            return;
          }

          chrome.storage.sync.set(updates, () => {
            if (chrome.runtime.lastError) {
              debugLog("settings_bootstrap_failed", chrome.runtime.lastError.message || "unknown");
              resolve();
              return;
            }
            debugLog("settings_bootstrapped", {
              applied: Object.keys(updates),
              profileIdSeeded: Boolean(updates.profileId),
            });
            resolve();
          });
        },
      );
    });
  }

  async function withTimeout(promise, timeoutMs, onTimeout) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve(onTimeout());
      }, timeoutMs);

      Promise.resolve(promise)
        .then((value) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutHandle);
          resolve(value);
        })
        .catch((error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutHandle);
          resolve({
            ok: false,
            state: "error",
            error: error instanceof Error ? error.message : "analysis_failed",
          });
        });
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    debugLog("ANY message received", {
      type: message && message.type ? message.type : null,
      tabId: sender && sender.tab ? sender.tab.id : null,
    });
    if (!message || !message.type) return;

    (async () => {
      try {
        if (message.type === Messages.CONTENT_CONTEXT_UPDATED) {
          if (sender && sender.tab && typeof sender.tab.id === "number") {
            const existing = Cache.getContextForTab(sender.tab.id);
            const incoming = message.payload || {};
            const existingSignature = existing && typeof existing.signature === "string" ? existing.signature : "";
            const nextSignature = typeof incoming.signature === "string" ? incoming.signature : "";

            if (existingSignature && nextSignature && existingSignature !== nextSignature) {
              Cache.clearAnalysisForTab(sender.tab.id);
              debugLog("tab_context_signature_changed", {
                tabId: sender.tab.id,
                existingSignature,
                nextSignature,
              });
            }

            Cache.setContextForTab(sender.tab.id, incoming);
          }
          sendResponse({ ok: true });
          return;
        }

        if (message.type === Messages.SIDEPANEL_REQUEST_ANALYSIS) {
          const requestId = message && message.payload && typeof message.payload.requestId === "number"
            ? message.payload.requestId
            : ++sidepanelRequestCounter;
          console.debug(`[CareerTwin][analysis][req=${requestId}] request start [sig=pending]`);
          debugLog("SIDEPANEL_REQUEST_ANALYSIS received", {
            tabId: sender && sender.tab ? sender.tab.id : null,
            requestedTabId: message && message.payload ? message.payload.tabId : null,
            requestId,
          });
          const result = await withTimeout(
            AnalysisService.handleSidepanelAnalysisRequest({
              ...(message.payload || {}),
              requestId,
              requestStartedAt: Date.now(),
            }),
            ANALYSIS_E2E_TIMEOUT_MS,
            () => {
              console.debug(`[CareerTwin][analysis][req=${requestId}] timeout reached`);
              debugLog("timeout reached", { requestId });
              return {
                ok: false,
                state: "error",
                error: "Analysis timed out.",
                code: "analysis_timeout",
                requestId,
              };
            },
          );
          debugLog("analysis_request_finalized", {
            requestId,
            finalState: result && result.state ? result.state : "error",
          });
          if (result && result.code === "analysis_timeout") {
            console.debug(`[CareerTwin][analysis][req=${requestId}] final state error`);
          }
          sendResponse(result);
          return;
        }

        if (message.type === Messages.SIDEPANEL_DOWNLOAD_RESUME) {
          const result = await DownloadService.handleResumeDownload(message.payload || {});
          sendResponse(result);
          return;
        }

        if (message.type === Messages.SIDEPANEL_SUBMIT_CALIBRATION) {
          const requestId = message && message.payload && typeof message.payload.requestId === "number"
            ? message.payload.requestId
            : ++sidepanelRequestCounter;
          debugLog("SIDEPANEL_SUBMIT_CALIBRATION received", {
            requestId,
            tabId: sender && sender.tab ? sender.tab.id : null,
            questionId: message && message.payload ? message.payload.questionId : null,
            answer: message && message.payload ? message.payload.answer : null,
            requestedTabId: message && message.payload ? message.payload.tabId : null,
          });
          const result = await withTimeout(
            AnalysisService.handleSidepanelCalibrationRequest({
              ...(message.payload || {}),
              requestId,
              requestStartedAt: Date.now(),
            }),
            ANALYSIS_E2E_TIMEOUT_MS,
            () => ({
              ok: false,
              state: "error",
              error: "Calibration update timed out.",
              code: "calibration_timeout",
              requestId,
            }),
          );
          sendResponse(result);
          return;
        }
      } catch (error) {
        sendResponse({
          ok: false,
          state: "error",
          error: error instanceof Error ? error.message : "runtime_error",
        });
      }
    })();

    return true;
  });

  chrome.action.onClicked.addListener(async (tab) => {
    try {
      await chrome.sidePanel.setOptions({
        tabId: tab.id,
        path: "sidepanel/sidepanel.html",
        enabled: true,
      });
      await chrome.sidePanel.open({ tabId: tab.id });
    } catch (error) {
      debugLog("sidepanel_open_failed", error instanceof Error ? error.message : "unknown_error");
    }
  });

  chrome.runtime.onInstalled.addListener(() => {
    bootstrapExtensionSettings().catch(() => undefined);
  });

  bootstrapExtensionSettings().catch(() => undefined);
})();
