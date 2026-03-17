(function initCareerTwinBackgroundCache() {
  // Owns in-memory cache for extraction context and analysis results per tab/key.
  const byAnalysisKey = new Map();
  const byTabId = new Map();
  const tabAnalysisKey = new Map();
  const calibrationByAnalysisKey = new Map();

  function now() {
    return Date.now();
  }

  function setContextForTab(tabId, contextPayload) {
    if (typeof tabId !== "number") return;
    byTabId.set(tabId, {
      ...contextPayload,
      updated_at: now(),
    });
  }

  function getContextForTab(tabId) {
    if (typeof tabId !== "number") return null;
    return byTabId.get(tabId) || null;
  }

  function setAnalysis(analysisKey, value) {
    byAnalysisKey.set(analysisKey, {
      ...value,
      cached_at: now(),
    });
  }

  function getAnalysis(analysisKey) {
    return byAnalysisKey.get(analysisKey) || null;
  }

  function deleteAnalysis(analysisKey) {
    if (!analysisKey) return;
    byAnalysisKey.delete(analysisKey);
    calibrationByAnalysisKey.delete(analysisKey);
  }

  function setTabAnalysisKey(tabId, analysisKey) {
    if (typeof tabId !== "number") return;
    if (!analysisKey) {
      tabAnalysisKey.delete(tabId);
      return;
    }
    tabAnalysisKey.set(tabId, {
      analysisKey,
      updated_at: now(),
    });
  }

  function getTabAnalysisKey(tabId) {
    if (typeof tabId !== "number") return null;
    const value = tabAnalysisKey.get(tabId);
    return value ? value.analysisKey : null;
  }

  function clearAnalysisForTab(tabId) {
    if (typeof tabId !== "number") return;
    const key = getTabAnalysisKey(tabId);
    if (key) {
      byAnalysisKey.delete(key);
      calibrationByAnalysisKey.delete(key);
    }
    tabAnalysisKey.delete(tabId);
  }

  function setCalibrationAnswers(analysisKey, answers) {
    if (!analysisKey) return;
    calibrationByAnalysisKey.set(analysisKey, {
      answers: Array.isArray(answers) ? answers : [],
      updated_at: now(),
    });
  }

  function getCalibrationAnswers(analysisKey) {
    if (!analysisKey) return [];
    const value = calibrationByAnalysisKey.get(analysisKey);
    if (!value || !Array.isArray(value.answers)) return [];
    return value.answers;
  }

  function prune(maxAgeMs) {
    const cutoff = now() - maxAgeMs;

    for (const [key, value] of byAnalysisKey.entries()) {
      if ((value.cached_at || 0) < cutoff) byAnalysisKey.delete(key);
    }

    for (const [key, value] of calibrationByAnalysisKey.entries()) {
      if ((value.updated_at || 0) < cutoff) calibrationByAnalysisKey.delete(key);
    }

    for (const [key, value] of byTabId.entries()) {
      if ((value.updated_at || 0) < cutoff) {
        byTabId.delete(key);
        tabAnalysisKey.delete(key);
      }
    }

    for (const [key, value] of tabAnalysisKey.entries()) {
      if ((value.updated_at || 0) < cutoff) {
        tabAnalysisKey.delete(key);
      }
    }
  }

  globalThis.CareerTwinBackgroundCache = {
    setContextForTab,
    getContextForTab,
    setAnalysis,
    getAnalysis,
    deleteAnalysis,
    setCalibrationAnswers,
    getCalibrationAnswers,
    setTabAnalysisKey,
    getTabAnalysisKey,
    clearAnalysisForTab,
    prune,
  };
})();
