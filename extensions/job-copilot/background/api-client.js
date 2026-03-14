(function initCareerTwinApiClient() {
  // Owns backend HTTP communication for analyze and tailored resume download.
  const Constants = globalThis.CareerTwinConstants || {};
  const DEFAULT_API_BASE_URL = Constants.DEFAULT_API_BASE_URL || "http://localhost:3000";
  const DEFAULT_PROFILE_ID = Constants.DEFAULT_PROFILE_ID || "";
  const DEFAULT_TOP_EVIDENCE_LIMIT = Constants.DEFAULT_TOP_EVIDENCE_LIMIT || 4;
  const HTTP_TIMEOUT_MS = 30000;

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][api-client] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][api-client] ${label}`);
    }
  }

  async function getSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          apiBaseUrl: DEFAULT_API_BASE_URL,
          profileId: DEFAULT_PROFILE_ID,
        },
        (items) => resolve(items),
      );
    });
  }

  function normalizeApiBaseUrl(rawValue) {
    const raw = String(rawValue || "").trim();
    const fallback = String(DEFAULT_API_BASE_URL || "http://localhost:3000").replace(/\/+$/, "");

    if (!raw) {
      return { baseUrl: fallback, usedFallback: true, reason: "missing" };
    }

    try {
      const parsed = new URL(raw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return { baseUrl: fallback, usedFallback: true, reason: "unsupported_protocol" };
      }
      return { baseUrl: raw.replace(/\/+$/, ""), usedFallback: false, reason: null };
    } catch {
      return { baseUrl: fallback, usedFallback: true, reason: "invalid_url" };
    }
  }

  function maybeRepairStoredApiBaseUrl(normalized) {
    if (!normalized || !normalized.usedFallback) return;
    try {
      chrome.storage.sync.set({ apiBaseUrl: normalized.baseUrl }, () => {
        if (chrome.runtime.lastError) return;
        debugLog("api_base_url_repaired", {
          value: normalized.baseUrl,
          reason: normalized.reason,
        });
      });
    } catch {
      // no-op
    }
  }

  async function sendJson(url, payload) {
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutHandle = controller
      ? setTimeout(() => controller.abort(), HTTP_TIMEOUT_MS)
      : null;

    try {
      return await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller ? controller.signal : undefined,
      });
    } finally {
      if (timeoutHandle) clearTimeout(timeoutHandle);
    }
  }

  async function safeReadJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  function mapPlatformForBackend(platform) {
    // Current backend contract accepts linkedin|seek only.
    if (platform === "seek") return "seek";
    return "linkedin";
  }

  async function analyzeJobPayload(payload) {
    const settings = await getSettings();
    const profileId = settings.profileId ? String(settings.profileId).trim() : "";
    const apiBaseUrlResult = normalizeApiBaseUrl(settings.apiBaseUrl || DEFAULT_API_BASE_URL);
    const apiBaseUrl = apiBaseUrlResult.baseUrl;
    if (apiBaseUrlResult.usedFallback) {
      debugLog("invalid_api_base_url", {
        received: settings.apiBaseUrl || null,
        fallback: apiBaseUrl,
        reason: apiBaseUrlResult.reason,
      });
      maybeRepairStoredApiBaseUrl(apiBaseUrlResult);
    }

    if (!profileId) {
      return {
        ok: false,
        error: "Profile ID missing. Configure it in extension settings.",
        code: "missing_profile_id",
      };
    }

    const backendSource = mapPlatformForBackend(payload.platform);
    debugLog("analyze_request", {
      profileId,
      sourcePlatform: backendSource,
      jobTitle: payload.job_title,
      company: payload.company_name || null,
      jd_length: (payload.job_description_text || "").length,
    });
    const requestPayload = {
      profileId,
      extractedJob: {
        sourcePlatform: backendSource,
        jobUrl: payload.url,
        jobTitle: payload.job_title,
        company: payload.company_name || null,
        location: payload.location || null,
        jobDescription: payload.job_description_text,
      },
      topEvidenceLimit: DEFAULT_TOP_EVIDENCE_LIMIT,
    };
    const endpointCandidates = [
      `${apiBaseUrl}/api/job-copilot/extension/run`,
      `${apiBaseUrl}/api/job-copilot/extension/analyze`,
    ];

    let lastFailure = null;
    for (let index = 0; index < endpointCandidates.length; index += 1) {
      const endpoint = endpointCandidates[index];
      let response;
      try {
        response = await sendJson(endpoint, requestPayload);
      } catch (error) {
        const timeout = error && (error.name === "AbortError" || error.message === "The operation was aborted.");
        const message = error instanceof Error ? error.message : String(error || "fetch_failed");
        debugLog("analyze_network_error", {
          endpoint,
          timeout: Boolean(timeout),
          message,
        });
        lastFailure = {
          ok: false,
          error: timeout ? "Analysis request timed out." : `Analyze request failed (${message}).`,
          code: timeout ? "analyze_timeout" : "analyze_failed",
          status: 0,
        };
        break;
      }

      const data = await safeReadJson(response);
      if (response.ok) {
        debugLog("analyze_response_ok", {
          endpoint,
          status: response.status,
          hasJobAnalysis: Boolean(
            data
            && (
              (data.response && data.response.job_analysis)
              || data.job_analysis
            ),
          ),
        });
        return { ok: true, data, status: response.status };
      }

      const code = data && data.code ? data.code : "analyze_failed";
      const errorMessage = data && data.error ? data.error : `Analyze request failed (HTTP ${response.status}).`;
      debugLog("analyze_response_error", {
        endpoint,
        status: response.status,
        code,
        hasJson: Boolean(data),
      });

      const shouldFallbackToAnalyze = index === 0
        && (response.status === 404 || (response.status >= 500 && !data));
      if (shouldFallbackToAnalyze) {
        continue;
      }

      return {
        ok: false,
        error: errorMessage,
        code,
        status: response.status,
      };
    }

    return lastFailure || {
      ok: false,
      error: "Analyze request failed.",
      code: "analyze_failed",
      status: 0,
    };
  }

  async function downloadResume(payload) {
    const settings = await getSettings();
    const profileId = settings.profileId ? String(settings.profileId).trim() : "";
    const apiBaseUrl = String(settings.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

    if (!profileId) {
      return {
        ok: false,
        error: "Profile ID missing. Configure it in extension settings.",
        code: "missing_profile_id",
      };
    }

    let response;
    try {
      response = await sendJson(`${apiBaseUrl}/api/job-copilot/extension/download-resume`, {
        profileId,
        jobId: payload.jobId,
        jobSnapshotId: payload.jobSnapshotId,
        sourcePlatform: payload.sourcePlatform,
        jobTitle: payload.jobTitle,
        company: payload.company,
        location: payload.location,
        jobUrl: payload.jobUrl,
        jobDescriptionSnapshot: payload.jobDescriptionSnapshot,
        matchScore: payload.matchScore,
        verdict: payload.verdict,
        selectedEvidenceIds: payload.selectedEvidenceIds,
      });
    } catch (error) {
      const timeout = error && (error.name === "AbortError" || error.message === "The operation was aborted.");
      return {
        ok: false,
        error: timeout ? "Resume generation timed out." : "Resume download request failed.",
        code: timeout ? "download_timeout" : "download_failed",
        status: 0,
      };
    }

    const data = await safeReadJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: data && data.error ? data.error : "Resume download request failed.",
        code: data && data.code ? data.code : "download_failed",
        status: response.status,
      };
    }
    return { ok: true, data, status: response.status };
  }

  globalThis.CareerTwinApiClient = {
    analyzeJobPayload,
    downloadResume,
  };
})();
