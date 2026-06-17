(function initCareerTwinBackgroundCache() {
  // Owns in-memory cache for extraction context and analysis results per tab/key.
  const byAnalysisKey = new Map();
  const byTabId = new Map();
  const tabAnalysisKey = new Map();
  const calibrationByAnalysisKey = new Map();
  const proofConfirmationByRoleKey = new Map();

  function now() {
    return Date.now();
  }

  function proofCacheTrace(stage, details) {
    try {
      console.debug("[CareerTwin][proof-cache-trace]", {
        stage,
        timestamp: new Date().toISOString(),
        ...(details && typeof details === "object" ? details : {}),
      });
    } catch {
      // no-op
    }
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

  function clearRoleScopedProofConfirmationsForTab(tabId) {
    if (typeof tabId !== "number") return;
    const tabPrefix = `tab:${tabId}|`;
    for (const roleKey of proofConfirmationByRoleKey.keys()) {
      if (typeof roleKey === "string" && roleKey.startsWith(tabPrefix)) {
        proofConfirmationByRoleKey.delete(roleKey);
      }
    }
  }

  function clearAnalysisForTab(tabId, options) {
    if (typeof tabId !== "number") return;
    const clearRoleProof = Boolean(options && options.clearRoleProof === true);
    const reason = options && typeof options.reason === "string"
      ? options.reason
      : "unspecified";
    const tabPrefix = `tab:${tabId}|`;
    const roleKeysBefore = Array.from(proofConfirmationByRoleKey.keys())
      .filter((roleKey) => typeof roleKey === "string" && roleKey.startsWith(tabPrefix));
    const key = getTabAnalysisKey(tabId);
    if (key) {
      byAnalysisKey.delete(key);
      calibrationByAnalysisKey.delete(key);
    }
    if (clearRoleProof) {
      clearRoleScopedProofConfirmationsForTab(tabId);
    }
    const roleKeysAfter = Array.from(proofConfirmationByRoleKey.keys())
      .filter((roleKey) => typeof roleKey === "string" && roleKey.startsWith(tabPrefix));
    proofCacheTrace("clearAnalysisForTab", {
      tabId,
      reason,
      clearRoleProof,
      role_confirmation_count_before: roleKeysBefore.length,
      role_confirmation_count_after: roleKeysAfter.length,
      preserved_keys: roleKeysAfter,
      cleared_keys: clearRoleProof ? roleKeysBefore.filter((item) => !roleKeysAfter.includes(item)) : [],
    });
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

  function setRoleScopedProofConfirmation(roleKey, value) {
    if (!roleKey || !value || typeof value !== "object") return;
    proofConfirmationByRoleKey.set(roleKey, {
      ...value,
      updated_at: now(),
    });
  }

  function getRoleScopedProofConfirmation(roleKey) {
    if (!roleKey) return null;
    return proofConfirmationByRoleKey.get(roleKey) || null;
  }

  function prune(maxAgeMs) {
    const cutoff = now() - maxAgeMs;

    for (const [key, value] of byAnalysisKey.entries()) {
      if ((value.cached_at || 0) < cutoff) byAnalysisKey.delete(key);
    }

    for (const [key, value] of calibrationByAnalysisKey.entries()) {
      if ((value.updated_at || 0) < cutoff) calibrationByAnalysisKey.delete(key);
    }

    for (const [key, value] of proofConfirmationByRoleKey.entries()) {
      if ((value.updated_at || 0) < cutoff) proofConfirmationByRoleKey.delete(key);
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
    setRoleScopedProofConfirmation,
    getRoleScopedProofConfirmation,
    clearRoleScopedProofConfirmationsForTab,
    setTabAnalysisKey,
    getTabAnalysisKey,
    clearAnalysisForTab,
    prune,
  };
})();
