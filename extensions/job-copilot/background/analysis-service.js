(function initCareerTwinAnalysisService() {
  // Owns extraction request, cache lookup, and analysis response shaping.
  const Messages = globalThis.CareerTwinMessages || {};
  const Cache = globalThis.CareerTwinBackgroundCache;
  const ApiClient = globalThis.CareerTwinApiClient;
  const Constants = globalThis.CareerTwinConstants || {};
  const PayloadHelpers = globalThis.CareerTwinJobPayload || {};
  const UiContract = globalThis.CareerTwinUiContract || {};

  const CACHE_MAX_AGE_MS = Constants.CACHE_MAX_AGE_MS || 15 * 60 * 1000;
  const ACTIVE_TAB_RETRY_DELAY_MS = 150;
  const EXTRACTION_TIMEOUT_MS = 7000;
  const inFlightAnalysisByKey = new Map();

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][background] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][background] ${label}`);
    }
  }

  function traceRequest(requestId, message, details) {
    if (typeof requestId !== "number") return;
    if (typeof details === "undefined") {
      console.debug(`[CareerTwin][analysis][req=${requestId}] ${message}`);
      return;
    }
    console.debug(`[CareerTwin][analysis][req=${requestId}] ${message}`, details);
  }

  function finalizeResponse(requestId, response, requestStartedAt) {
    const state = response && response.state ? response.state : "error";
    if (typeof requestStartedAt === "number") {
      traceRequest(requestId, `total_duration_ms ${Math.max(0, Date.now() - requestStartedAt)}`);
    }
    traceRequest(requestId, `final_state ${state}`);
    traceRequest(requestId, `final state ${state}`);
    if (!response || typeof response !== "object") return response;
    if (typeof requestId !== "number") return response;
    if (Object.prototype.hasOwnProperty.call(response, "requestId")) return response;
    return {
      ...response,
      requestId,
    };
  }

  function normalizeJobAnalysis(rawJobAnalysis) {
    if (!rawJobAnalysis) return null;

    const normalizeCapabilityList = (value) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((entry) => {
          if (typeof entry === "string") {
            return { capability: entry };
          }
          if (entry && typeof entry.capability === "string") {
            return entry;
          }
          return null;
        })
        .filter(Boolean);
    };

    const normalizeGapList = (value) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((entry) => {
          if (typeof entry === "string") {
            return { capability: entry };
          }
          if (entry && typeof entry.capability === "string") {
            return entry;
          }
          return null;
        })
        .filter(Boolean);
    };

    const normalizeAtsRisks = (value) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((entry) => {
          if (typeof entry === "string") {
            return { type: "title_mismatch", level: "medium", message: entry };
          }
          if (entry && typeof entry.message === "string") {
            return entry;
          }
          return null;
        })
        .filter(Boolean);
    };

    const normalizeMatchExplanation = (value) => {
      if (!value || typeof value !== "object") return null;
      const normalizeItems = (items, limit) => {
        if (!Array.isArray(items)) return [];
        return items
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const title = typeof item.title === "string" ? item.title.trim() : "";
            const explanation = typeof item.explanation === "string" ? item.explanation.trim() : "";
            if (!title || !explanation) return null;
            return { title, explanation };
          })
          .filter(Boolean)
          .slice(0, limit);
      };

      const verdictLabel = typeof value.verdict_label === "string" ? value.verdict_label.trim() : "";
      const summary = typeof value.summary === "string" ? value.summary.trim() : "";
      const score = typeof value.score === "number"
        ? value.score
        : (typeof value.score === "string" ? Number(value.score) : NaN);
      if (!verdictLabel || !summary || Number.isNaN(score)) {
        return null;
      }
      return {
        verdict_label: verdictLabel,
        score: Math.round(score),
        summary,
        strengths: normalizeItems(value.strengths, 3),
        risks: normalizeItems(value.risks, 2),
      };
    };

    return {
      match_score: rawJobAnalysis.match_score,
      fit_level: rawJobAnalysis.fit_level || rawJobAnalysis.match_level || null,
      score_confidence: rawJobAnalysis.score_confidence || rawJobAnalysis.confidence || null,
      interpretation_note: rawJobAnalysis.interpretation_note || rawJobAnalysis.summary || "",
      top_matched_capabilities: normalizeCapabilityList(rawJobAnalysis.top_matched_capabilities),
      key_gaps: normalizeGapList(rawJobAnalysis.key_gaps),
      ats_risks: normalizeAtsRisks(rawJobAnalysis.ats_risks),
      tailoring_decision: rawJobAnalysis.tailoring_decision || null,
      job_profile_quality: rawJobAnalysis.job_profile_quality || "usable",
      evidence_highlights: Array.isArray(rawJobAnalysis.evidence_highlights)
        ? rawJobAnalysis.evidence_highlights
        : [],
      system_notices: Array.isArray(rawJobAnalysis.system_notices)
        ? rawJobAnalysis.system_notices
        : [],
      match_explanation: normalizeMatchExplanation(rawJobAnalysis.match_explanation),
    };
  }

  function normalizeAnalyzeData(rawData) {
    const responseNode = rawData && rawData.response ? rawData.response : null;
    const jobAnalysisSource = (rawData && rawData.job_analysis)
      || (responseNode && responseNode.job_analysis)
      || null;
    const tailoredResume = (rawData && rawData.tailored_resume)
      || (responseNode && responseNode.tailored_resume)
      || null;
    const job = rawData && rawData.job ? rawData.job : null;
    const verdict = responseNode && typeof responseNode.verdict === "string"
      ? responseNode.verdict
      : null;
    const matchScore = responseNode && typeof responseNode.matchScore === "number"
      ? responseNode.matchScore
      : null;

    return {
      job_analysis: normalizeJobAnalysis(jobAnalysisSource),
      tailored_resume: tailoredResume || undefined,
      job: job || undefined,
      verdict: verdict || undefined,
      matchScore: typeof matchScore === "number" ? matchScore : undefined,
    };
  }

  function deriveDownstreamBridge(rawData, normalizedData) {
    const responseNode = rawData && rawData.response ? rawData.response : rawData;
    const explainability = responseNode && responseNode.scoreExplainability
      ? responseNode.scoreExplainability
      : null;
    return {
      requirement_cluster_count: explainability && typeof explainability.totalJobCapabilityCount === "number"
        ? explainability.totalJobCapabilityCount
        : null,
      capability_cluster_count: explainability && typeof explainability.matchedCapabilityCount === "number"
        ? explainability.matchedCapabilityCount
        : null,
      matcher_job_profile_quality: normalizedData
        && normalizedData.job_analysis
        && typeof normalizedData.job_analysis.job_profile_quality === "string"
        ? normalizedData.job_analysis.job_profile_quality
        : (explainability && typeof explainability.jobProfileQuality === "string" ? explainability.jobProfileQuality : null),
    };
  }

  function emitLinkedInExtractionAudit() {
    // JD audit is temporarily disabled in runtime analysis flow for extension stability.
  }

  function toNormalizedResultState(normalizedData) {
    if (!normalizedData || !normalizedData.job_analysis) {
      return "error";
    }
    const isSparse = UiContract.isSparseQuality
      ? UiContract.isSparseQuality(normalizedData.job_analysis)
      : false;
    return isSparse ? "sparse_ready" : "ready";
  }

  function isSparseExtraction(extraction) {
    if (!extraction || !extraction.ok || !extraction.payload) return false;
    const metadata = extraction.payload.source_metadata || {};
    if (metadata.extraction_signal === "sparse") return true;

    const minJdChars = Constants.MIN_JD_CHARS || 120;
    const jdLength = (extraction.payload.job_description_text || "").length;
    return jdLength > 0 && jdLength < minJdChars;
  }

  function toFinalState(normalizedData, extraction) {
    const dataState = toNormalizedResultState(normalizedData);
    if (dataState !== "ready") return dataState;
    return isSparseExtraction(extraction) ? "sparse_ready" : "ready";
  }

  function mapExtractionFailureMessage(reason) {
    switch (reason) {
      case "missing_job_title":
        return "We couldn't detect the job title yet.";
      case "missing_company_name":
        return "We couldn't detect the company name yet.";
      case "missing_job_description":
        return "We couldn't find the job description in this preview.";
      case "job_description_too_short":
        return "The visible job description is too short right now. Open About the job > more, then retry.";
      case "parser_selector_miss":
        return "We couldn't locate the job description section on this page layout.";
      case "preview_not_ready_yet":
        return "This job preview is still loading. Please wait a moment and try again.";
      default:
        return "We couldn't fully read this job description.";
    }
  }

  function isContextInvalidationMessage(message) {
    const text = String(message || "").toLowerCase();
    return text.includes("extension context invalidated")
      || text.includes("context invalidated")
      || text.includes("receiving end does not exist")
      || text.includes("message port closed");
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function getTabById(tabId) {
    if (typeof tabId !== "number") return null;
    try {
      const tab = await chrome.tabs.get(tabId);
      return tab && typeof tab.id === "number" ? tab : null;
    } catch {
      return null;
    }
  }

  async function getActiveTab() {
    let tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0]) {
      return tabs[0];
    }

    await wait(ACTIVE_TAB_RETRY_DELAY_MS);
    tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (tabs && tabs[0]) {
      return tabs[0];
    }

    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    return tabs && tabs[0] ? tabs[0] : null;
  }

  async function requestExtractionFromTab(tabId) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          state: "error",
          reason: "content_extract_timeout",
        });
      }, EXTRACTION_TIMEOUT_MS);

      try {
        chrome.tabs.sendMessage(tabId, { type: Messages.CONTENT_EXTRACT_REQUEST }, (response) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutHandle);
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message || "content_script_unavailable";
            if (isContextInvalidationMessage(errorMessage)) {
              resolve({
                ok: false,
                state: "context_invalidated",
                reason: errorMessage,
              });
              return;
            }
            resolve({
              ok: false,
              state: "error",
              reason: errorMessage,
            });
            return;
          }
          resolve(response || { ok: false, state: "error", reason: "no_content_response" });
        });
      } catch (error) {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutHandle);
        const errorMessage = error instanceof Error ? error.message : String(error || "tabs_send_message_failed");
        resolve({
          ok: false,
          state: isContextInvalidationMessage(errorMessage) ? "context_invalidated" : "error",
          reason: errorMessage,
        });
      }
    });
  }

  async function analyzeWithDedupedInFlight(analysisKey, payload, tabId, requestId) {
    const existing = inFlightAnalysisByKey.get(analysisKey);
    if (existing) {
      debugLog("await_inflight_analysis", { analysisKey, tabId });
      traceRequest(requestId, "stale request cancelled / deduped", { analysisKey });
      return existing;
    }

    const request = (async () => {
      debugLog("backend_request_sent", {
        tabId,
        platform: payload.platform,
        title: payload.job_title,
        jd_length: (payload.job_description_text || "").length,
      });
      return ApiClient.analyzeJobPayload(payload);
    })();

    inFlightAnalysisByKey.set(analysisKey, request);
    try {
      return await request;
    } finally {
      if (inFlightAnalysisByKey.get(analysisKey) === request) {
        inFlightAnalysisByKey.delete(analysisKey);
      }
    }
  }

  async function handleSidepanelAnalysisRequest(options) {
    Cache.prune(CACHE_MAX_AGE_MS);
    const requestId = options && typeof options.requestId === "number"
      ? options.requestId
      : null;
    const requestStartedAt = options && typeof options.requestStartedAt === "number"
      ? options.requestStartedAt
      : Date.now();
    const rerunDepth = options && typeof options.rerunDepth === "number"
      ? options.rerunDepth
      : 0;
    const requestedTabId = options && typeof options.tabId === "number" ? options.tabId : null;
    const tab = await getTabById(requestedTabId) || await getActiveTab();
    if (!tab || typeof tab.id !== "number") {
      return finalizeResponse(requestId, { ok: false, state: "error", error: "No active tab found." }, requestStartedAt);
    }

    traceRequest(requestId, "extraction_start");
    const extractionStartedAt = Date.now();
    const extraction = await requestExtractionFromTab(tab.id);
    traceRequest(requestId, "extraction_end");
    traceRequest(requestId, `extraction_duration_ms ${Math.max(0, Date.now() - extractionStartedAt)}`);
    traceRequest(requestId, `request start [sig=${extraction && extraction.signature ? extraction.signature : "none"}]`);
    const retryAttempts = extraction && typeof extraction.retry_attempts === "number"
      ? extraction.retry_attempts
      : 0;
    for (let retryIndex = 1; retryIndex <= retryAttempts; retryIndex += 1) {
      traceRequest(requestId, `retry ${retryIndex}`);
    }
    debugLog("extraction_result", {
      tabId: tab.id,
      state: extraction.state,
      reason: extraction.reason || null,
      summary: extraction.summary || null,
    });

    if (!extraction.ok) {
      emitLinkedInExtractionAudit({
        extraction,
        downstreamBridge: deriveDownstreamBridge(null, null),
        analysisState: extraction.state || "error",
        cachedResult: false,
        requestId,
        tabId: tab.id,
      });
      Cache.clearAnalysisForTab(tab.id);
      if (extraction.reason === "preview_not_ready_yet") {
        traceRequest(requestId, "preview_not_ready_yet");
      }
      if (extraction.state === "unsupported_page") {
        return finalizeResponse(requestId, { ok: true, state: "unsupported_page", context: extraction }, requestStartedAt);
      }
      if (extraction.state === "context_invalidated") {
        return finalizeResponse(requestId, {
          ok: true,
          state: "error",
          error: "Extension was reloaded. Please refresh the page.",
          code: "context_invalidated",
          context: extraction,
        }, requestStartedAt);
      }
      if (extraction.state === "extracting_failed") {
        return finalizeResponse(requestId, {
          ok: true,
          state: "error",
          error: mapExtractionFailureMessage(extraction.reason),
          code: extraction.reason || "extracting_failed",
          context: extraction,
        }, requestStartedAt);
      }
      return finalizeResponse(requestId, {
        ok: true,
        state: "error",
        error: "We couldn't read this page right now.",
        context: extraction,
      }, requestStartedAt);
    }

    const payload = extraction.payload;
    const analysisKey = PayloadHelpers.buildAnalysisKey
      ? PayloadHelpers.buildAnalysisKey(payload)
      : `${payload.url}|${payload.job_title}|${payload.company_name}`;
    const previousTabKey = Cache.getTabAnalysisKey(tab.id);
    if (previousTabKey && previousTabKey !== analysisKey) {
      debugLog("tab_job_changed", {
        tabId: tab.id,
        previousTabKey,
        nextAnalysisKey: analysisKey,
      });
      Cache.deleteAnalysis(previousTabKey);
    }

    const cached = Cache.getAnalysis(analysisKey);
    if (cached && cached.response) {
      const normalizedCachedData = normalizeAnalyzeData(cached.response);
      const cachedState = toFinalState(normalizedCachedData, extraction);
      const cachedBridge = deriveDownstreamBridge(cached.response, normalizedCachedData);
      emitLinkedInExtractionAudit({
        extraction,
        downstreamBridge: cachedBridge,
        analysisState: cachedState,
        cachedResult: true,
        requestId,
        tabId: tab.id,
      });
      Cache.setTabAnalysisKey(tab.id, analysisKey);
      debugLog("cache_hit", { analysisKey, tabId: tab.id });
      return finalizeResponse(requestId, {
        ok: true,
        state: cachedState,
        data: normalizedCachedData,
        context: extraction,
        cached: true,
      }, requestStartedAt);
    }

    traceRequest(requestId, "backend_request_start");
    const backendStartedAt = Date.now();
    traceRequest(requestId, "backend request start");
    const analyzeResult = await analyzeWithDedupedInFlight(analysisKey, payload, tab.id, requestId);
    traceRequest(requestId, "backend_request_end");
    traceRequest(requestId, `backend_duration_ms ${Math.max(0, Date.now() - backendStartedAt)}`);
    if (analyzeResult.ok) {
      traceRequest(requestId, `backend request finish ${analyzeResult.status || 200}`);
    } else {
      traceRequest(requestId, `backend request finish ${analyzeResult.status || analyzeResult.code || "error"}`);
    }
    if (!analyzeResult.ok) {
      emitLinkedInExtractionAudit({
        extraction,
        downstreamBridge: deriveDownstreamBridge(null, null),
        analysisState: "error",
        cachedResult: false,
        requestId,
        tabId: tab.id,
      });
      return finalizeResponse(requestId, {
        ok: true,
        state: analyzeResult.code === "missing_profile_id" ? "auth_required" : "error",
        error: analyzeResult.error || "Analysis failed.",
        code: analyzeResult.code || "analyze_failed",
        context: extraction,
      }, requestStartedAt);
    }

    const latestExtraction = await requestExtractionFromTab(tab.id);
    if (latestExtraction.ok) {
      const latestPayload = latestExtraction.payload;
      const latestAnalysisKey = PayloadHelpers.buildAnalysisKey
        ? PayloadHelpers.buildAnalysisKey(latestPayload)
        : `${latestPayload.url}|${latestPayload.job_title}|${latestPayload.company_name}`;

      if (latestAnalysisKey !== analysisKey && rerunDepth < 1) {
        debugLog("job_changed_during_analysis", {
          tabId: tab.id,
          analyzedKey: analysisKey,
          latestKey: latestAnalysisKey,
          rerunDepth,
        });
        traceRequest(requestId, "stale request cancelled / deduped", {
          analyzedKey: analysisKey,
          latestKey: latestAnalysisKey,
        });
        return handleSidepanelAnalysisRequest({
          ...options,
          tabId: tab.id,
          rerunDepth: rerunDepth + 1,
          requestStartedAt,
        });
      }
    }

    const normalizedData = normalizeAnalyzeData(analyzeResult.data);
    const jobAnalysis = normalizedData.job_analysis;
    const state = toFinalState(normalizedData, extraction);
    const downstreamBridge = deriveDownstreamBridge(analyzeResult.data, normalizedData);
    emitLinkedInExtractionAudit({
      extraction,
      downstreamBridge,
      analysisState: state,
      cachedResult: false,
      requestId,
      tabId: tab.id,
    });
    debugLog("response_normalized", {
      has_job_analysis: Boolean(jobAnalysis),
      has_tailored_resume: Boolean(normalizedData.tailored_resume),
      state,
    });

    Cache.setContextForTab(tab.id, {
      state: extraction.state,
      platform: payload.platform,
      summary: extraction.summary || null,
      signature: extraction.signature || null,
      extraction,
    });
    Cache.setAnalysis(analysisKey, {
      state,
      response: normalizedData,
      payload,
      tabId: tab.id,
    });
    Cache.setTabAnalysisKey(tab.id, analysisKey);

    debugLog("analysis_ready", {
      state,
      tabId: tab.id,
      platform: payload.platform,
      match_score: jobAnalysis ? jobAnalysis.match_score : null,
    });

    return finalizeResponse(requestId, {
      ok: true,
      state,
      error: state === "error" ? "No job analysis returned from backend." : undefined,
      data: normalizedData,
      context: extraction,
      cached: false,
    }, requestStartedAt);
  }

  globalThis.CareerTwinAnalysisService = {
    handleSidepanelAnalysisRequest,
  };
})();
