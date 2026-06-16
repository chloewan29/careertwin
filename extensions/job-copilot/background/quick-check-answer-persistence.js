(function initCareerTwinQuickCheckAnswerPersistence() {
  const QuickCheckSubmitTrace = globalThis.CareerTwinQuickCheckSubmitTrace || {};

  function normalizeCalibrationAnswerEntries(entries) {
    if (QuickCheckSubmitTrace && typeof QuickCheckSubmitTrace.normalizeCalibrationAnswerEntries === "function") {
      return QuickCheckSubmitTrace.normalizeCalibrationAnswerEntries(entries);
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
    const normalizedExisting = normalizeCalibrationAnswerEntries(existingAnswers);
    const normalizedNext = normalizeCalibrationAnswerEntries([nextEntry]);
    if (normalizedNext.length === 0) return normalizedExisting;
    const byQuestionId = new Map(normalizedExisting.map((item) => [item.questionId, item.answer]));
    for (const item of normalizedNext) {
      byQuestionId.set(item.questionId, item.answer);
    }
    return Array.from(byQuestionId.entries()).map(([questionId, answer]) => ({ questionId, answer }));
  }

  function mergeCalibrationAnswersIntoNormalizedData(normalizedData, answerEntries) {
    const normalizedAnswers = normalizeCalibrationAnswerEntries(answerEntries);
    if (!normalizedData || typeof normalizedData !== "object" || normalizedAnswers.length === 0) {
      return normalizedData;
    }
    const jobAnalysis = normalizedData.job_analysis && typeof normalizedData.job_analysis === "object"
      ? normalizedData.job_analysis
      : null;
    const calibration = jobAnalysis && jobAnalysis.calibration && typeof jobAnalysis.calibration === "object"
      ? jobAnalysis.calibration
      : null;
    if (!jobAnalysis || !calibration) return normalizedData;

    const mergedAnswers = normalizedAnswers.reduce(
      (acc, entry) => upsertCalibrationAnswer(acc, entry),
      normalizeCalibrationAnswerEntries(calibration.answers),
    );
    const answerMap = new Map(mergedAnswers.map((item) => [item.questionId, item.answer]));
    const nextQuestions = Array.isArray(calibration.questions)
      ? calibration.questions.map((item) => {
        if (!item || typeof item !== "object") return item;
        const questionId = typeof item.question_id === "string"
          ? item.question_id.trim()
          : (typeof item.questionId === "string" ? item.questionId.trim() : "");
        const mergedAnswer = answerMap.get(questionId);
        if (!questionId || (mergedAnswer !== "yes" && mergedAnswer !== "no")) return item;
        if (item.answer === mergedAnswer) return item;
        return {
          ...item,
          answer: mergedAnswer,
        };
      })
      : calibration.questions;
    const currentAnsweredCount = Number.isFinite(Number(calibration.answered_count))
      ? Math.max(0, Math.round(Number(calibration.answered_count)))
      : 0;
    const nextAnsweredCount = Math.max(currentAnsweredCount, mergedAnswers.length);
    const currentTotalQuestions = Number.isFinite(Number(calibration.total_questions))
      ? Math.max(0, Math.round(Number(calibration.total_questions)))
      : null;
    const nextTotalQuestions = currentTotalQuestions !== null
      ? Math.max(currentTotalQuestions, Array.isArray(nextQuestions) ? nextQuestions.length : 0)
      : (Array.isArray(nextQuestions) ? nextQuestions.length : null);

    return {
      ...normalizedData,
      job_analysis: {
        ...jobAnalysis,
        calibration: {
          ...calibration,
          answers: mergedAnswers.map((item) => ({
            question_id: item.questionId,
            answer: item.answer,
          })),
          questions: nextQuestions,
          answered_count: nextAnsweredCount,
          total_questions: nextTotalQuestions !== null ? nextTotalQuestions : calibration.total_questions,
        },
      },
    };
  }

  function mergeCalibrationAnswersIntoAnalyzeResultData(resultData, answerEntries, normalizeAnalyzeData) {
    if (typeof normalizeAnalyzeData !== "function") return resultData;
    return mergeCalibrationAnswersIntoNormalizedData(
      normalizeAnalyzeData(resultData),
      answerEntries,
    );
  }

  function resolveCalibrationAnswerUpdate(existingAnswers, options) {
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

  globalThis.CareerTwinQuickCheckAnswerPersistence = {
    normalizeCalibrationAnswerEntries,
    upsertCalibrationAnswer,
    mergeCalibrationAnswersIntoNormalizedData,
    mergeCalibrationAnswersIntoAnalyzeResultData,
    resolveCalibrationAnswerUpdate,
  };
})();
