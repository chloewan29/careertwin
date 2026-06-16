(function initCareerTwinQuickCheckSubmitTrace() {
  function isoNow() {
    return new Date().toISOString();
  }

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function hasText(value) {
    return toText(value).length > 0;
  }

  function toNumberOrNull(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }

  function normalizeCalibrationAnswerEntries(entries) {
    if (entries instanceof Map) {
      return Array.from(entries.entries())
        .map(([questionId, answer]) => ({
          questionId: toText(questionId),
          answer: answer === "yes" || answer === "no" ? answer : null,
        }))
        .filter((entry) => entry.questionId && entry.answer);
    }
    if (!Array.isArray(entries)) return [];
    const byQuestionId = new Map();
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const questionId = toText(entry.questionId || entry.question_id);
      const answer = entry.answer === "yes" || entry.answer === "no" ? entry.answer : null;
      if (!questionId || !answer) continue;
      byQuestionId.set(questionId, answer);
    }
    return Array.from(byQuestionId.entries()).map(([questionId, answer]) => ({ questionId, answer }));
  }

  function stagedAnswersSnapshot(stagedAnswers, questionIds) {
    const normalizedEntries = normalizeCalibrationAnswerEntries(stagedAnswers);
    const normalizedIds = Array.isArray(questionIds)
      ? questionIds.map((item) => toText(item)).filter(Boolean)
      : [];
    const answerMap = new Map(normalizedEntries.map((item) => [item.questionId, item.answer]));
    const ids = normalizedIds.length > 0
      ? normalizedIds
      : Array.from(answerMap.keys());
    return ids.reduce((acc, id) => {
      acc[id] = answerMap.has(id) ? answerMap.get(id) : null;
      return acc;
    }, {});
  }

  function safeTraceIdentity(source) {
    const root = source && typeof source === "object" ? source : {};
    const data = root.data && typeof root.data === "object" ? root.data : {};
    const jobFromRoot = root.job && typeof root.job === "object" ? root.job : null;
    const jobFromData = data.job && typeof data.job === "object" ? data.job : null;
    const job = jobFromRoot || jobFromData;

    const pickNumber = (...values) => {
      for (const value of values) {
        const parsed = toNumberOrNull(value);
        if (parsed !== null) return parsed;
      }
      return null;
    };

    const pickText = (...values) => {
      for (const value of values) {
        const parsed = toText(value);
        if (parsed) return parsed;
      }
      return "";
    };

    const jobSnapshotId = pickNumber(
      job && (job.jobSnapshotId ?? job.job_snapshot_id),
      data.jobSnapshotId ?? data.job_snapshot_id,
      root.jobSnapshotId ?? root.job_snapshot_id,
    );
    const interactionId = pickNumber(
      job && (job.interactionId ?? job.interaction_id),
      data.interactionId ?? data.interaction_id,
      root.interactionId ?? root.interaction_id,
    );
    const jobId = pickText(
      job && (job.jobId ?? job.job_id),
      data.jobId ?? data.job_id,
      root.jobId ?? root.job_id,
      root.currentJobId ?? root.current_job_id,
    );
    const jobMatchId = pickText(
      job && (job.jobMatchId ?? job.job_match_id),
      data.jobMatchId ?? data.job_match_id,
      root.jobMatchId ?? root.job_match_id,
    );

    return {
      job_snapshot_id: jobSnapshotId,
      interaction_id: interactionId,
      job_id: jobId || null,
      job_match_id: jobMatchId || null,
      job_present: Boolean(job),
      identity_present: Boolean(jobSnapshotId !== null || interactionId !== null || jobId || jobMatchId),
      identity_source: jobFromRoot
        ? "job"
        : (jobFromData ? "data.job" : "fallback_or_missing"),
      available_fallback_ids: {
        data_job_snapshot_id: toNumberOrNull(data.jobSnapshotId ?? data.job_snapshot_id),
        data_interaction_id: toNumberOrNull(data.interactionId ?? data.interaction_id),
        data_job_id: toText(data.jobId ?? data.job_id) || null,
        data_job_match_id: toText(data.jobMatchId ?? data.job_match_id) || null,
        root_job_snapshot_id: toNumberOrNull(root.jobSnapshotId ?? root.job_snapshot_id),
        root_interaction_id: toNumberOrNull(root.interactionId ?? root.interaction_id),
        root_job_id: toText(root.jobId ?? root.job_id) || null,
        root_job_match_id: toText(root.jobMatchId ?? root.job_match_id) || null,
      },
    };
  }

  function ensureQuickcheckRequestId(value, prefix) {
    const normalized = toText(value);
    if (normalized) return normalized;
    return `${toText(prefix) || "qcs"}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  }

  function resolvePairId(params) {
    const explicitPairId = toText(params && (params.pairId || params.requirementCluster));
    if (explicitPairId) return explicitPairId;
    const items = params && params.viewModel && params.viewModel.quickChecks && Array.isArray(params.viewModel.quickChecks.items)
      ? params.viewModel.quickChecks.items
      : [];
    const firstItem = items[0] && typeof items[0] === "object" ? items[0] : null;
    const requirementCluster = toText(firstItem && (firstItem.requirementCluster || firstItem.requirement_cluster || firstItem.groupKey));
    if (requirementCluster) return requirementCluster;
    const firstQuestionId = toText(firstItem && (firstItem.id || firstItem.question_id || firstItem.questionId));
    return firstQuestionId ? firstQuestionId.replace(/_q[12]$/i, "") : null;
  }

  function collectSubmitTraceContext(params) {
    const baseContext = params && params.context && typeof params.context === "object" ? params.context : {};
    const identity = safeTraceIdentity({
      jobSnapshotId: baseContext.jobSnapshotId,
      interactionId: baseContext.interactionId,
      jobId: baseContext.jobId,
      jobMatchId: baseContext.jobMatchId,
      job: params && params.job && typeof params.job === "object" ? params.job : null,
      data: params && params.data && typeof params.data === "object" ? params.data : null,
    });
    const questionIds = Array.isArray(params && params.questionIds)
      ? params.questionIds.map((item) => toText(item)).filter(Boolean)
      : [];
    const viewModel = params && params.viewModel && typeof params.viewModel === "object" ? params.viewModel : null;
    const ctaState = toText(
      viewModel
      && viewModel.matchHeader
      && viewModel.matchHeader.panelJudgmentContract
      && (
        viewModel.matchHeader.panelJudgmentContract.recommendation_cta_state
        || viewModel.matchHeader.panelJudgmentContract.recommended_action
      ),
    );
    const runtimeState = toText(viewModel && viewModel.quickChecks && viewModel.quickChecks.runtimeState);
    const items = viewModel && viewModel.quickChecks && Array.isArray(viewModel.quickChecks.items)
      ? viewModel.quickChecks.items
      : [];
    return {
      tabId: toNumberOrNull(baseContext.tabId),
      job_snapshot_id: identity.job_snapshot_id,
      interaction_id: identity.interaction_id,
      job_id: identity.job_id,
      job_match_id: identity.job_match_id,
      job_present: identity.job_present,
      identity_present: identity.identity_present,
      identity_source: identity.identity_source,
      available_fallback_ids: identity.available_fallback_ids,
      pair_id: resolvePairId(params),
      question_ids: questionIds.length > 0
        ? questionIds
        : items.map((item) => toText(item && item.id)).filter(Boolean),
      answers: params && params.stagedAnswers ? stagedAnswersSnapshot(params.stagedAnswers, questionIds) : null,
      cta_state: hasText(ctaState) ? ctaState : null,
      quickchecks_runtime_state: hasText(runtimeState) ? runtimeState : null,
    };
  }

  function normalizeCalibrationSubmitPayload(payload) {
    const root = payload && typeof payload === "object" ? payload : {};
    const submitPayload = { ...root };
    const memoryTriggerKey = ["memoryCapture", "Trigger"].join("");
    delete submitPayload[memoryTriggerKey];
    const calibrationRequestId = toText(root.calibrationRequestId) || `qc-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const quickcheckRequestId = ensureQuickcheckRequestId(root.quickcheckRequestId || calibrationRequestId, "qcs");
    const calibrationAnswers = normalizeCalibrationAnswerEntries(root.calibrationAnswers).map((item) => ({
      questionId: item.questionId,
      answer: item.answer,
    }));
    return {
      ...submitPayload,
      calibrationRequestId,
      quickcheckRequestId,
      calibrationRequestTimestamp: toText(root.calibrationRequestTimestamp) || isoNow(),
      calibrationAnswers,
    };
  }

  function buildSubmitTraceMeta(payload) {
    const normalizedPayload = normalizeCalibrationSubmitPayload(payload);
    const traceIdentity = safeTraceIdentity(normalizedPayload);
    const answerEntries = normalizeCalibrationAnswerEntries(normalizedPayload.calibrationAnswers);
    return {
      requestId: typeof normalizedPayload.requestId === "number" ? normalizedPayload.requestId : null,
      calibrationRequestId: normalizedPayload.calibrationRequestId || null,
      quickcheckRequestId: normalizedPayload.quickcheckRequestId || null,
      timestamp: isoNow(),
      job_snapshot_id: traceIdentity.job_snapshot_id,
      interaction_id: traceIdentity.interaction_id,
      job_id: traceIdentity.job_id
        || (typeof normalizedPayload.currentJobId === "string" ? normalizedPayload.currentJobId.trim() || null : null),
      job_match_id: traceIdentity.job_match_id,
      job_present: traceIdentity.job_present,
      identity_present: traceIdentity.identity_present,
      identity_source: traceIdentity.identity_source,
      available_fallback_ids: traceIdentity.available_fallback_ids,
      tabId: toNumberOrNull(normalizedPayload.tabId),
      pairId: toText(normalizedPayload.pairId) || null,
      questionIds: answerEntries.map((item) => item.questionId),
      answers: answerEntries.reduce((acc, item) => {
        acc[item.questionId] = item.answer;
        return acc;
      }, {}),
    };
  }

  function buildClickTracePayload(params) {
    const clickSequence = Number.isFinite(Number(params && params.clickSequence))
      ? Math.max(1, Math.round(Number(params.clickSequence)))
      : 1;
    const clickStage = clickSequence === 1 ? "first_click_received" : (clickSequence === 2 ? "second_click_received" : "answer_click_received");
    const quickcheckRequestId = ensureQuickcheckRequestId(params && params.quickcheckRequestId, "qcs");
    const traceContext = collectSubmitTraceContext(params);
    return {
      clickStage,
      quickcheckRequestId,
      traceContext,
      payload: {
        quickcheck_request_id: quickcheckRequestId || null,
        ...traceContext,
        question_id: toText(params && params.questionId) || null,
        answer: params && (params.answer === "yes" || params.answer === "no") ? params.answer : null,
        click_sequence: clickSequence,
        submit_in_flight: Boolean(params && params.submitInFlight),
        button_disabled: Boolean(params && params.buttonDisabled),
        one_click_one_submit_guard: Boolean(params && params.buttonDisabled)
          ? "button_disabled"
          : (Boolean(params && params.submitInFlight) ? "submit_in_flight" : "ready"),
      },
    };
  }

  globalThis.CareerTwinQuickCheckSubmitTrace = {
    isoNow,
    toText,
    hasText,
    toNumberOrNull,
    normalizeCalibrationAnswerEntries,
    stagedAnswersSnapshot,
    safeTraceIdentity,
    ensureQuickcheckRequestId,
    collectSubmitTraceContext,
    normalizeCalibrationSubmitPayload,
    buildSubmitTraceMeta,
    buildClickTracePayload,
  };
})();
