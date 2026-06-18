(function initCareerTwinApiClient() {
  // Owns backend HTTP communication for analyze and tailored resume download.
  const Constants = globalThis.CareerTwinConstants || {};
  const DEFAULT_API_BASE_URL = Constants.DEFAULT_API_BASE_URL || "http://localhost:3000";
  const DEFAULT_PROFILE_ID = Constants.DEFAULT_PROFILE_ID || "";
  const DEFAULT_TOP_EVIDENCE_LIMIT = Constants.DEFAULT_TOP_EVIDENCE_LIMIT || 4;
  const DEFAULT_HTTP_TIMEOUT_MS = 30000;
  const ANALYZE_HTTP_TIMEOUT_MS = Constants.ANALYZE_API_TIMEOUT_MS || (95 * 1000);
  function isoNow() {
    return new Date().toISOString();
  }

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

  function isLocalBackendUrl(urlValue) {
    try {
      const parsed = new URL(String(urlValue || ""));
      const host = String(parsed.hostname || "").toLowerCase();
      return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]";
    } catch {
      return false;
    }
  }

  function isLikelyFetchNetworkFailure(error) {
    const message = String(error && error.message ? error.message : error || "").toLowerCase();
    if (!message) return false;
    return message.includes("failed to fetch")
      || message.includes("err_connection_refused")
      || message.includes("err_failed")
      || message.includes("networkerror")
      || message.includes("load failed");
  }

  async function sendJson(url, payload, timeoutMs) {
    const resolvedTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0
      ? timeoutMs
      : DEFAULT_HTTP_TIMEOUT_MS;
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timeoutHandle = controller
      ? setTimeout(() => controller.abort(), resolvedTimeoutMs)
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
      // Canonical analyze route first; keep legacy run route as compatibility fallback.
      `${apiBaseUrl}/api/job-copilot/extension/analyze`,
      `${apiBaseUrl}/api/job-copilot/extension/run`,
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

  async function recalculateJobPayload(params) {
    const payload = params && params.payload ? params.payload : null;
    const calibrationAnswers = params && Array.isArray(params.calibrationAnswers)
      ? params.calibrationAnswers
      : [];
    if (!payload) {
      return {
        ok: false,
        error: "Missing job payload for recalibration.",
        code: "missing_recalibration_payload",
      };
    }

    const settings = await getSettings();
    const profileId = settings.profileId ? String(settings.profileId).trim() : "";
    const apiBaseUrlResult = normalizeApiBaseUrl(settings.apiBaseUrl || DEFAULT_API_BASE_URL);
    const apiBaseUrl = apiBaseUrlResult.baseUrl;
    if (apiBaseUrlResult.usedFallback) {
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
    debugLog("recalibrate_request", {
      profileId,
      sourcePlatform: backendSource,
      jobTitle: payload.job_title,
      company: payload.company_name || null,
      calibrationAnswerCount: calibrationAnswers.length,
      calibrationQuestionIds: calibrationAnswers.map((item) => item.questionId || item.question_id).filter(Boolean),
    });
    let response;
    try {
      response = await sendJson(`${apiBaseUrl}/api/job-copilot/extension/recalibrate`, {
        profileId,
        extractedJob: {
          sourcePlatform: backendSource,
          jobUrl: payload.url,
          jobTitle: payload.job_title,
          company: payload.company_name || null,
          location: payload.location || null,
          jobDescription: payload.job_description_text,
        },
      calibrationAnswers,
      topEvidenceLimit: DEFAULT_TOP_EVIDENCE_LIMIT,
      });
    } catch (error) {
      const timeout = error && (error.name === "AbortError" || error.message === "The operation was aborted.");
      debugLog("recalibrate_network_error", {
        timeout: Boolean(timeout),
        message: error instanceof Error ? error.message : String(error || "recalibration_failed"),
      });
      return {
        ok: false,
        error: timeout ? "Calibration update timed out." : "Calibration update failed.",
        code: timeout ? "recalibration_timeout" : "recalibration_failed",
        status: 0,
      };
    }

    const data = await safeReadJson(response);
    if (!response.ok) {
      debugLog("recalibrate_response_error", {
        status: response.status,
        code: data && data.code ? data.code : "recalibration_failed",
      });
      return {
        ok: false,
        error: data && data.error ? data.error : "Calibration update failed.",
        code: data && data.code ? data.code : "recalibration_failed",
        status: response.status,
      };
    }

    debugLog("recalibrate_response_ok", {
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

  async function saveQuickCheckMemoryPayload(params) {
    const payload = params && params.payload ? params.payload : null;
    const memoryCapturePrompt = params && params.memoryCapturePrompt
      ? params.memoryCapturePrompt
      : null;
    if (!payload || !memoryCapturePrompt) {
      return {
        ok: false,
        error: "Missing memory capture payload.",
        code: "missing_memory_capture_payload",
      };
    }

    const settings = await getSettings();
    const profileId = settings.profileId ? String(settings.profileId).trim() : "";
    const apiBaseUrlResult = normalizeApiBaseUrl(settings.apiBaseUrl || DEFAULT_API_BASE_URL);
    const apiBaseUrl = apiBaseUrlResult.baseUrl;
    if (apiBaseUrlResult.usedFallback) {
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
    let response;
    try {
      response = await sendJson(`${apiBaseUrl}/api/job-copilot/extension/save-quick-check-memory`, {
        profileId,
        extractedJob: {
          sourcePlatform: backendSource,
          jobUrl: payload.url,
          jobTitle: payload.job_title,
          company: payload.company_name || null,
          location: payload.location || null,
          jobDescription: payload.job_description_text,
        },
        memoryCapturePrompt,
      });
    } catch (error) {
      const timeout = error && (error.name === "AbortError" || error.message === "The operation was aborted.");
      return {
        ok: false,
        error: timeout ? "Saving to memory timed out." : "Saving to memory failed.",
        code: timeout ? "save_memory_timeout" : "save_memory_failed",
        status: 0,
      };
    }

    const data = await safeReadJson(response);
    if (!response.ok) {
      return {
        ok: false,
        error: data && data.error ? data.error : "Saving to memory failed.",
        code: data && data.code ? data.code : "save_memory_failed",
        status: response.status,
      };
    }

    return { ok: true, data, status: response.status };
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
        export_format: payload.export_format,
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
        calibrationAnswers: payload.calibrationAnswers,
        confirmedStrengthAreas: payload.confirmedStrengthAreas,
        positioningHints: payload.positioningHints,
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
    recalculateJobPayload,
    saveQuickCheckMemoryPayload,
    downloadResume,
  };
})();
