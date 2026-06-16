(function initCareerTwinAnalysisService() {
  // Owns extraction request, cache lookup, and analysis response shaping.
  const Messages = globalThis.CareerTwinMessages || {};
  const Cache = globalThis.CareerTwinBackgroundCache;
  const ApiClient = globalThis.CareerTwinApiClient;
  const Constants = globalThis.CareerTwinConstants || {};
  const PayloadHelpers = globalThis.CareerTwinJobPayload || {};
  const QuickCheckAnswerPersistence = globalThis.CareerTwinQuickCheckAnswerPersistence || {};
  const UiContract = globalThis.CareerTwinUiContract || {};

  const CACHE_MAX_AGE_MS = Constants.CACHE_MAX_AGE_MS || 15 * 60 * 1000;
  const ACTIVE_TAB_RETRY_DELAY_MS = 150;
  const EXTRACTION_TIMEOUT_MS = 7000;
  const EXTRACTION_RECEIVER_RETRY_BACKOFF_MS = [200, 650, 1200];
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

  function getPayloadCurrentJobId(payload) {
    return payload
      && payload.source_metadata
      && typeof payload.source_metadata.current_job_id === "string"
      ? payload.source_metadata.current_job_id
      : "";
  }

  function withAnalysisContext(params) {
    const extraction = params && params.extraction && typeof params.extraction === "object"
      ? params.extraction
      : {};
    return {
      ...extraction,
      tab_id: typeof params.tabId === "number" ? params.tabId : null,
      analysis_key: typeof params.analysisKey === "string" ? params.analysisKey : null,
      current_job_id: getPayloadCurrentJobId(params.payload) || null,
    };
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
    const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
    const normalizeStringList = (value, limit) => {
      if (!Array.isArray(value)) return [];
      return value
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter((entry, index, all) => entry && all.indexOf(entry) === index)
        .slice(0, limit);
    };

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

    const normalizeApplyRecommendation = (value) => {
      if (!value || typeof value !== "object") return null;
      const scoreRaw = typeof value.score === "number" ? value.score : Number(value.score);
      const band = normalizeText(value.band);
      if (!Number.isFinite(scoreRaw)) return null;
      if (band !== "strong" && band !== "consider" && band !== "weak") return null;
      return {
        score: Math.max(0, Math.min(100, Math.round(scoreRaw))),
        band,
      };
    };

    const normalizeCalibration = (value) => {
      if (!value || typeof value !== "object") return null;
      const normalizeAnswer = (answerValue) => (answerValue === "yes" || answerValue === "no" ? answerValue : null);
      const questions = Array.isArray(value.questions)
        ? value.questions
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const id = normalizeText(entry.id);
            const question = normalizeText(entry.question);
            const targetArea = normalizeText(entry.target_area);
            const importance = normalizeText(entry.importance);
            if (!id || !question || !targetArea) return null;
            return {
              id,
              question,
              target_area: targetArea,
              importance: importance || "important",
              answer: normalizeAnswer(entry.answer),
            };
          })
          .filter(Boolean)
          .slice(0, 3)
        : [];
      const answers = Array.isArray(value.answers)
        ? value.answers
          .map((entry) => {
            if (!entry || typeof entry !== "object") return null;
            const questionId = normalizeText(entry.question_id);
            const answer = normalizeAnswer(entry.answer);
            if (!questionId || !answer) return null;
            return { question_id: questionId, answer };
          })
          .filter(Boolean)
        : [];
      return {
        required: Boolean(value.required),
        questions,
        answers,
        answered_count: typeof value.answered_count === "number" ? value.answered_count : answers.length,
        total_questions: typeof value.total_questions === "number" ? value.total_questions : questions.length,
        recalibrated: Boolean(value.recalibrated),
        score_delta: typeof value.score_delta === "number" ? value.score_delta : 0,
        confirmed_strength_areas: normalizeStringList(value.confirmed_strength_areas, 4),
        confirmed_risk_areas: normalizeStringList(value.confirmed_risk_areas, 4),
      };
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
      apply_recommendation: normalizeApplyRecommendation(rawJobAnalysis.apply_recommendation),
      career_insight: normalizeText(rawJobAnalysis.career_insight || rawJobAnalysis.careerInsight),
      why_fit: normalizeStringList(rawJobAnalysis.why_fit || rawJobAnalysis.whyFit, 4),
      potential_risks: normalizeStringList(rawJobAnalysis.potential_risks || rawJobAnalysis.risks, 4),
      positioning_hints: normalizeStringList(rawJobAnalysis.positioning_hints || rawJobAnalysis.positioningHints, 4),
      calibration: normalizeCalibration(rawJobAnalysis.calibration),
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
    const applyRecommendation = (responseNode && responseNode.applyRecommendation)
      || (rawData && rawData.applyRecommendation)
      || null;
    const calibrationQuestions = (responseNode && Array.isArray(responseNode.calibrationQuestions) && responseNode.calibrationQuestions)
      || (rawData && Array.isArray(rawData.calibrationQuestions) && rawData.calibrationQuestions)
      || [];
    const calibrationState = (responseNode && responseNode.calibrationState)
      || (rawData && rawData.calibrationState)
      || null;
    const careerInsight = (responseNode && typeof responseNode.careerInsight === "string" && responseNode.careerInsight)
      || (rawData && typeof rawData.careerInsight === "string" && rawData.careerInsight)
      || "";
    const whyFit = (responseNode && Array.isArray(responseNode.whyFit) && responseNode.whyFit)
      || (rawData && Array.isArray(rawData.whyFit) && rawData.whyFit)
      || [];
    const risks = (responseNode && Array.isArray(responseNode.risks) && responseNode.risks)
      || (rawData && Array.isArray(rawData.risks) && rawData.risks)
      || [];
    const positioningHints = (responseNode && Array.isArray(responseNode.positioningHints) && responseNode.positioningHints)
      || (rawData && Array.isArray(rawData.positioningHints) && rawData.positioningHints)
      || [];

    return {
      job_analysis: normalizeJobAnalysis(jobAnalysisSource),
      tailored_resume: tailoredResume || undefined,
      job: job || undefined,
      verdict: verdict || undefined,
      matchScore: typeof matchScore === "number" ? matchScore : undefined,
      applyRecommendation: applyRecommendation || undefined,
      careerInsight: careerInsight || undefined,
      whyFit: whyFit.length > 0 ? whyFit : undefined,
      risks: risks.length > 0 ? risks : undefined,
      positioningHints: positioningHints.length > 0 ? positioningHints : undefined,
      calibrationQuestions: calibrationQuestions.length > 0 ? calibrationQuestions : undefined,
      calibrationState: calibrationState || undefined,
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
      case "job_description_collapsed":
        return "The job description looks collapsed. Expand About the job and retry.";
      case "linkedin_description_incomplete":
        return "We only captured a preview snippet of this LinkedIn job. Open the full description (About the job > more) and retry.";
      case "parser_selector_miss":
        return "We couldn't locate the job description section on this page layout.";
      case "preview_not_ready_yet":
        return "This job preview is still loading. Please wait a moment and try again.";
      default:
        return "We couldn't fully read this job description.";
    }
  }

  function mapAnalyzeFailureMessage(analyzeResult) {
    const code = analyzeResult && typeof analyzeResult.code === "string"
      ? analyzeResult.code
      : "";
    if (code === "backend_unreachable") {
      return "CareerTwin local server is not reachable. Start the dev server and retry.";
    }
    return analyzeResult && typeof analyzeResult.error === "string" && analyzeResult.error.trim()
      ? analyzeResult.error.trim()
      : "Analysis failed.";
  }

  function isContextInvalidationMessage(message) {
    const text = String(message || "").toLowerCase();
    return text.includes("extension context invalidated")
      || text.includes("context invalidated")
      || text.includes("receiving end does not exist")
      || text.includes("message port closed");
  }

  function isTransientReceiverUnavailableMessage(message) {
    const text = String(message || "").toLowerCase();
    return text.includes("receiving end does not exist")
      || text.includes("could not establish connection")
      || text.includes("message port closed before a response was received");
  }

  function isSupportedReceiverRetryUrl(tabUrl) {
    const urlText = typeof tabUrl === "string" ? tabUrl.trim() : "";
    if (!urlText) return false;
    try {
      const parsed = new URL(urlText);
      const host = parsed.hostname.toLowerCase();
      if (host === "www.linkedin.com" || host === "linkedin.com") return true;
      return host === "www.seek.com.au"
        || host === "www.seek.co.nz"
        || host === "www.seek.com"
        || host === "au.seek.com";
    } catch {
      return false;
    }
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

  async function requestExtractionAttempt(tabId, attemptNumber) {
    return new Promise((resolve) => {
      let settled = false;
      const timeoutHandle = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          ok: false,
          state: "error",
          reason: "content_extract_timeout",
          requestExtractionFromTab_attempt: attemptNumber,
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
                requestExtractionFromTab_attempt: attemptNumber,
              });
              return;
            }
            resolve({
              ok: false,
              state: "error",
              reason: errorMessage,
              requestExtractionFromTab_attempt: attemptNumber,
            });
            return;
          }
          resolve(response || {
            ok: false,
            state: "error",
            reason: "no_content_response",
            requestExtractionFromTab_attempt: attemptNumber,
          });
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
          requestExtractionFromTab_attempt: attemptNumber,
        });
      }
    });
  }

  function withReceiverRetryDiagnostics(result, diagnostics) {
    const source = result && typeof result === "object"
      ? result
      : { ok: false, state: "error", reason: "invalid_extraction_result" };
    const attempts = Number.isFinite(diagnostics && diagnostics.attempts)
      ? diagnostics.attempts
      : 1;
    const firstError = diagnostics && typeof diagnostics.firstError === "string"
      ? diagnostics.firstError
      : null;
    const finalError = diagnostics && typeof diagnostics.finalError === "string"
      ? diagnostics.finalError
      : (typeof source.reason === "string" ? source.reason : null);
    const startedAt = Number.isFinite(diagnostics && diagnostics.startedAt)
      ? diagnostics.startedAt
      : Date.now();
    const elapsedMs = Math.max(0, Date.now() - startedAt);
    return {
      ...source,
      extraction_receiver_ready: source.ok === true,
      receiver_retry_attempts: Math.max(0, attempts - 1),
      receiver_retry_recovered: source.ok === true && attempts > 1,
      receiver_retry_first_error: firstError,
      receiver_retry_final_error: source.ok === true ? null : finalError,
      receiver_retry_total_ms: elapsedMs,
      requestExtractionFromTab_attempt: attempts,
      retry_attempts: Math.max(0, attempts - 1),
    };
  }

  async function requestExtractionFromTab(tabId) {
    const startedAt = Date.now();
    let firstError = null;
    let attempts = 0;

    for (let attemptIndex = 0; attemptIndex <= EXTRACTION_RECEIVER_RETRY_BACKOFF_MS.length; attemptIndex += 1) {
      if (attemptIndex > 0) {
        const backoffMs = EXTRACTION_RECEIVER_RETRY_BACKOFF_MS[attemptIndex - 1] || 0;
        if (backoffMs > 0) {
          await wait(backoffMs);
        }
        const latestTab = await getTabById(tabId);
        if (!latestTab || typeof latestTab.id !== "number") {
          return withReceiverRetryDiagnostics({
            ok: false,
            state: "error",
            reason: "tab_not_found_before_retry",
          }, {
            attempts,
            firstError,
            finalError: "tab_not_found_before_retry",
            startedAt,
          });
        }
        if (!isSupportedReceiverRetryUrl(latestTab.url)) {
          return withReceiverRetryDiagnostics({
            ok: false,
            state: "unsupported_page",
            reason: "unsupported_tab_url_before_retry",
            url: latestTab.url || null,
          }, {
            attempts,
            firstError,
            finalError: "unsupported_tab_url_before_retry",
            startedAt,
          });
        }
      }

      attempts = attemptIndex + 1;
      const attemptResult = await requestExtractionAttempt(tabId, attempts);
      if (attemptResult && attemptResult.ok) {
        return withReceiverRetryDiagnostics(attemptResult, {
          attempts,
          firstError,
          startedAt,
        });
      }

      const errorMessage = attemptResult && typeof attemptResult.reason === "string"
        ? attemptResult.reason
        : "";
      if (!firstError && errorMessage) {
        firstError = errorMessage;
      }

      const transientReceiverUnavailable = isTransientReceiverUnavailableMessage(errorMessage);
      const canRetry = transientReceiverUnavailable && attemptIndex < EXTRACTION_RECEIVER_RETRY_BACKOFF_MS.length;
      if (!canRetry) {
        return withReceiverRetryDiagnostics(attemptResult, {
          attempts,
          firstError,
          finalError: errorMessage || null,
          startedAt,
        });
      }
    }

    return withReceiverRetryDiagnostics({
      ok: false,
      state: "error",
      reason: "receiver_retry_exhausted",
    }, {
      attempts,
      firstError,
      finalError: "receiver_retry_exhausted",
      startedAt,
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

  function normalizeCalibrationAnswerEntries(entries) {
    if (QuickCheckAnswerPersistence && typeof QuickCheckAnswerPersistence.normalizeCalibrationAnswerEntries === "function") {
      return QuickCheckAnswerPersistence.normalizeCalibrationAnswerEntries(entries);
    }
    if (!Array.isArray(entries)) return [];
    const byQuestionId = new Map();
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const questionId = typeof entry.questionId === "string"
        ? entry.questionId.trim()
        : (typeof entry.question_id === "string" ? entry.question_id.trim() : "");
      const answer = entry.answer === "yes" || entry.answer === "no" ? entry.answer : null;
      if (!questionId || !answer) continue;
      byQuestionId.set(questionId, answer);
    }
    return Array.from(byQuestionId.entries()).map(([questionId, answer]) => ({ questionId, answer }));
  }

  function upsertCalibrationAnswer(existingAnswers, nextEntry) {
    if (QuickCheckAnswerPersistence && typeof QuickCheckAnswerPersistence.upsertCalibrationAnswer === "function") {
      return QuickCheckAnswerPersistence.upsertCalibrationAnswer(existingAnswers, nextEntry);
    }
    const normalizedExisting = normalizeCalibrationAnswerEntries(existingAnswers);
    const normalizedNext = normalizeCalibrationAnswerEntries([nextEntry]);
    if (normalizedNext.length === 0) return normalizedExisting;
    const byQuestionId = new Map(normalizedExisting.map((item) => [item.questionId, item.answer]));
    for (const item of normalizedNext) {
      byQuestionId.set(item.questionId, item.answer);
    }
    return Array.from(byQuestionId.entries()).map(([questionId, answer]) => ({ questionId, answer }));
  }

  function mergeCalibrationAnswersIntoAnalyzeResultData(resultData, answerEntries) {
    if (QuickCheckAnswerPersistence && typeof QuickCheckAnswerPersistence.mergeCalibrationAnswersIntoAnalyzeResultData === "function") {
      return QuickCheckAnswerPersistence.mergeCalibrationAnswersIntoAnalyzeResultData(
        resultData,
        answerEntries,
        normalizeAnalyzeData,
      );
    }
    return normalizeAnalyzeData(resultData);
  }

  function resolveCalibrationAnswerUpdate(existingAnswers, options) {
    if (QuickCheckAnswerPersistence && typeof QuickCheckAnswerPersistence.resolveCalibrationAnswerUpdate === "function") {
      return QuickCheckAnswerPersistence.resolveCalibrationAnswerUpdate(existingAnswers, options);
    }
    const stagedAnswers = normalizeCalibrationAnswerEntries(options && options.stagedAnswers);
    const questionId = typeof (options && options.questionId) === "string" ? options.questionId.trim() : "";
    const answer = options && (options.answer === "yes" || options.answer === "no") ? options.answer : null;
    const nextAnswers = stagedAnswers.length > 0
      ? stagedAnswers.reduce((acc, entry) => upsertCalibrationAnswer(acc, entry), existingAnswers)
      : upsertCalibrationAnswer(existingAnswers, { questionId, answer });
    const triggerAnswer = questionId && answer
      ? { questionId, answer }
      : (stagedAnswers[stagedAnswers.length - 1] || null);
    return {
      stagedAnswers,
      nextAnswers,
      triggerAnswer,
      triggerQuestionId: triggerAnswer && triggerAnswer.questionId ? triggerAnswer.questionId : "",
      triggerAnswerValue: triggerAnswer && triggerAnswer.answer ? triggerAnswer.answer : null,
    };
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
      const cachedCalibrationAnswers = Cache.getCalibrationAnswers(analysisKey);
      const normalizedCachedData = mergeCalibrationAnswersIntoAnalyzeResultData(
        cached.response,
        cachedCalibrationAnswers,
      );
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
        context: withAnalysisContext({
          extraction,
          tabId: tab.id,
          analysisKey,
          payload,
        }),
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
        error: mapAnalyzeFailureMessage(analyzeResult),
        code: analyzeResult.code || "analyze_failed",
        diagnostics: analyzeResult && analyzeResult.diagnostics && typeof analyzeResult.diagnostics === "object"
          ? analyzeResult.diagnostics
          : null,
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

    const cachedCalibrationAnswers = Cache.getCalibrationAnswers(analysisKey);
    const normalizedData = mergeCalibrationAnswersIntoAnalyzeResultData(
      analyzeResult.data,
      cachedCalibrationAnswers,
    );
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
      context: withAnalysisContext({
        extraction,
        tabId: tab.id,
        analysisKey,
        payload,
      }),
      cached: false,
    }, requestStartedAt);
  }

  async function handleSidepanelCalibrationRequest(options) {
    Cache.prune(CACHE_MAX_AGE_MS);
    const requestId = options && typeof options.requestId === "number"
      ? options.requestId
      : null;
    const requestStartedAt = options && typeof options.requestStartedAt === "number"
      ? options.requestStartedAt
      : Date.now();
    const requestedTabId = options && typeof options.tabId === "number" ? options.tabId : null;
    const tab = await getTabById(requestedTabId) || await getActiveTab();
    if (!tab || typeof tab.id !== "number") {
      return finalizeResponse(requestId, { ok: false, state: "error", error: "No active tab found." }, requestStartedAt);
    }

    const questionId = options && typeof options.questionId === "string" ? options.questionId.trim() : "";
    const answer = options && (options.answer === "yes" || options.answer === "no") ? options.answer : null;
    const expectedAnalysisKey = options && typeof options.analysisKey === "string"
      ? options.analysisKey.trim()
      : "";
    const expectedCurrentJobId = options && typeof options.currentJobId === "string"
      ? options.currentJobId.trim()
      : "";
    const analysisKey = Cache.getTabAnalysisKey(tab.id);
    if (!analysisKey) {
      return finalizeResponse(requestId, {
        ok: false,
        state: "error",
        error: "Run analysis before calibration.",
        code: "analysis_missing",
      }, requestStartedAt);
    }
    if (expectedAnalysisKey && expectedAnalysisKey !== analysisKey) {
      traceRequest(requestId, "calibration_context_mismatch", {
        tabId: tab.id,
        expectedAnalysisKey,
        actualAnalysisKey: analysisKey,
      });
      return finalizeResponse(requestId, {
        ok: false,
        state: "error",
        error: "Job context changed. Please wait for panel refresh and retry.",
        code: "stale_analysis_context",
      }, requestStartedAt);
    }

    const cached = Cache.getAnalysis(analysisKey);
    if (!cached || !cached.payload) {
      return finalizeResponse(requestId, {
        ok: false,
        state: "error",
        error: "Run analysis before calibration.",
        code: "analysis_missing",
      }, requestStartedAt);
    }
    const cachedCurrentJobId = getPayloadCurrentJobId(cached.payload);
    if (expectedCurrentJobId && cachedCurrentJobId && expectedCurrentJobId !== cachedCurrentJobId) {
      traceRequest(requestId, "calibration_job_id_mismatch", {
        tabId: tab.id,
        expectedCurrentJobId,
        cachedCurrentJobId,
      });
      return finalizeResponse(requestId, {
        ok: false,
        state: "error",
        error: "Job changed before calibration was applied. Please retry.",
        code: "stale_job_context",
      }, requestStartedAt);
    }

    const existingAnswers = normalizeCalibrationAnswerEntries(Cache.getCalibrationAnswers(analysisKey));
    const answerUpdate = resolveCalibrationAnswerUpdate(existingAnswers, {
      stagedAnswers: options && options.calibrationAnswers,
      questionId,
      answer,
    });
    const stagedAnswers = Array.isArray(answerUpdate && answerUpdate.stagedAnswers)
      ? answerUpdate.stagedAnswers
      : [];
    if (stagedAnswers.length === 0 && (!questionId || !answer)) {
      return finalizeResponse(requestId, {
        ok: false,
        state: "error",
        error: "Calibration answer is invalid.",
        code: "invalid_calibration_answer",
      }, requestStartedAt);
    }
    const triggerQuestionId = answerUpdate && answerUpdate.triggerQuestionId
      ? answerUpdate.triggerQuestionId
      : questionId;
    const triggerAnswerValue = answerUpdate && answerUpdate.triggerAnswerValue
      ? answerUpdate.triggerAnswerValue
      : answer;
    const existingAnswer = existingAnswers.find((entry) => entry && entry.questionId === triggerQuestionId);
    const nextAnswers = Array.isArray(answerUpdate && answerUpdate.nextAnswers)
      ? answerUpdate.nextAnswers
      : existingAnswers;
    Cache.setCalibrationAnswers(analysisKey, nextAnswers);
    traceRequest(requestId, "calibration_request_start", {
      tabId: tab.id,
      analysisKey,
      currentJobId: cachedCurrentJobId || null,
      questionId: triggerQuestionId || null,
      answer: triggerAnswerValue,
      answerCount: nextAnswers.length,
      replacedExistingAnswer: Boolean(existingAnswer),
      answerChanged: !existingAnswer || existingAnswer.answer !== triggerAnswerValue,
      stagedAnswerCount: stagedAnswers.length,
    });
    traceRequest(requestId, "calibration_request_sent", {
      tabId: tab.id,
      analysisKey,
      questionId: triggerQuestionId || null,
      answer: triggerAnswerValue,
    });

    const recalibrationResult = await ApiClient.recalculateJobPayload({
      payload: cached.payload,
      calibrationAnswers: nextAnswers,
    });
    traceRequest(requestId, "calibration_response_received", {
      ok: Boolean(recalibrationResult && recalibrationResult.ok),
      status: recalibrationResult && recalibrationResult.status ? recalibrationResult.status : null,
      code: recalibrationResult && recalibrationResult.code ? recalibrationResult.code : null,
    });
    if (!recalibrationResult.ok) {
      return finalizeResponse(requestId, {
        ok: true,
        state: recalibrationResult.code === "missing_profile_id" ? "auth_required" : "error",
        error: recalibrationResult.error || "Calibration update failed.",
        code: recalibrationResult.code || "recalibration_failed",
      }, requestStartedAt);
    }

    const normalizedData = mergeCalibrationAnswersIntoAnalyzeResultData(
      recalibrationResult.data,
      nextAnswers,
    );
    const currentContext = Cache.getContextForTab(tab.id);
    const extraction = currentContext && currentContext.extraction
      ? currentContext.extraction
      : { ok: true, payload: cached.payload };
    const state = toFinalState(normalizedData, extraction);

    const responseAnswers = normalizedData
      && normalizedData.job_analysis
      && normalizedData.job_analysis.calibration
      && Array.isArray(normalizedData.job_analysis.calibration.answers)
      ? normalizeCalibrationAnswerEntries(normalizedData.job_analysis.calibration.answers)
      : nextAnswers;
    Cache.setCalibrationAnswers(analysisKey, responseAnswers);
    Cache.setAnalysis(analysisKey, {
      state,
      response: normalizedData,
      payload: cached.payload,
      tabId: tab.id,
    });
    Cache.setTabAnalysisKey(tab.id, analysisKey);

    return finalizeResponse(requestId, {
      ok: true,
      state,
      data: normalizedData,
      context: withAnalysisContext({
        extraction,
        tabId: tab.id,
        analysisKey,
        payload: cached.payload,
      }),
      cached: false,
    }, requestStartedAt);
  }

  globalThis.CareerTwinAnalysisService = {
    handleSidepanelAnalysisRequest,
    handleSidepanelCalibrationRequest,
  };
})();
