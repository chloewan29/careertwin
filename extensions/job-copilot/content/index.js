(function initCareerTwinContentEntry() {
  // Content entrypoint: tracks current visible job preview and responds to extraction requests.
  if (window.top !== window.self) return;
  if (window.__careertwin_content_entry_loaded__) return;
  window.__careertwin_content_entry_loaded__ = true;

  const Messages = globalThis.CareerTwinMessages || {};
  const extractJobPagePayload = globalThis.CareerTwinExtractJobPagePayload;

  if (!Messages.CONTENT_CONTEXT_UPDATED || !Messages.CONTENT_EXTRACT_REQUEST || !extractJobPagePayload) {
    return;
  }

  const DEBOUNCE_MS = 350;
  const URL_CHECK_INTERVAL_MS = 1000;
  const SIGNATURE_HEARTBEAT_MS = 1500;
  const VIEW_RETRY_DELAYS_MS = [0, 160, 360, 700];
  const PREVIEW_RETRY_DELAYS_MS = [0, 80, 180, 320];
  const MORE_CLICK_RETRY_DELAYS_MS = [0, 90, 190, 320];
  const RETRYABLE_FAILURE_REASONS = new Set([
    "preview_not_ready_yet",
    "linkedin_description_incomplete",
    "job_description_too_short",
    "job_description_collapsed",
    "missing_job_description",
    "parser_selector_miss",
  ]);
  const CONTEXT_INVALIDATED_REASON = "extension_context_invalidated";
  const MAX_INVALIDATION_LOGS = 2;
  const MIN_PARTIAL_JD_CHARS = 40;
  const SNAPSHOT_STABLE_REQUIRED = 2;

  let debounceTimer = null;
  let lastContextSignature = "";
  let lastKnownUrl = location.href;
  let contextUpdateVersion = 0;
  let urlCheckIntervalId = null;
  let heartbeatIntervalId = null;
  let mutationObserver = null;
  let clickHandler = null;
  let extensionInvalidated = false;
  let invalidationLogs = 0;
  let lastMoreClickAt = 0;
  let lastMoreBaselineSignature = "";
  let lastMoreBaselineJdLength = 0;
  let lastDescriptionContainerSignature = "";
  let lastKnownJdLength = 0;
  let lastMoreClickedJobId = "";

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][content] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][content] ${label}`);
    }
  }

  function finalizeExtractionForReturn(extraction, retryAttempts) {
    return {
      ...extraction,
      retry_attempts: retryAttempts,
    };
  }

  function isContextInvalidationMessage(message) {
    const text = String(message || "").toLowerCase();
    return text.includes("extension context invalidated")
      || text.includes("context invalidated")
      || text.includes("receiving end does not exist")
      || text.includes("message port closed");
  }

  function isRuntimeAvailable() {
    try {
      return Boolean(chrome && chrome.runtime && chrome.runtime.id);
    } catch {
      return false;
    }
  }

  function buildContextInvalidatedResult(reason) {
    return {
      ok: false,
      state: "context_invalidated",
      reason: reason || CONTEXT_INVALIDATED_REASON,
      platform: "unknown",
      summary: null,
      signature: `context_invalidated|${location.href}`,
    };
  }

  function stopActivity(reason) {
    if (extensionInvalidated) return;
    extensionInvalidated = true;
    contextUpdateVersion += 1;

    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (urlCheckIntervalId) {
      clearInterval(urlCheckIntervalId);
      urlCheckIntervalId = null;
    }
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      heartbeatIntervalId = null;
    }
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    if (clickHandler) {
      document.removeEventListener("click", clickHandler, true);
      clickHandler = null;
    }

    if (invalidationLogs < MAX_INVALIDATION_LOGS) {
      invalidationLogs += 1;
      debugLog("extension_context_invalidated", { reason: reason || CONTEXT_INVALIDATED_REASON });
    }
  }

  function maybeInvalidateFromError(message) {
    if (!isContextInvalidationMessage(message)) return false;
    stopActivity(message || CONTEXT_INVALIDATED_REASON);
    return true;
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  async function safeExtract(reasonLabel) {
    if (extensionInvalidated) {
      return buildContextInvalidatedResult(CONTEXT_INVALIDATED_REASON);
    }

    try {
      return await extractJobPagePayload();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || "extract_exception");
      if (maybeInvalidateFromError(message)) {
        return buildContextInvalidatedResult(message);
      }
      debugLog("extract_exception", { reasonLabel, message });
      return {
        ok: false,
        state: "extracting_failed",
        reason: "extract_exception",
        platform: "unknown",
      };
    }
  }

  if (!isRuntimeAvailable()) {
    stopActivity(CONTEXT_INVALIDATED_REASON);
    return;
  }

  function isLinkedInExtraction(extraction) {
    if (extraction && extraction.payload && extraction.payload.platform) {
      return extraction.payload.platform === "linkedin";
    }
    return extraction && extraction.platform === "linkedin";
  }

  function isLinkedInSearchPreviewExtraction(extraction) {
    if (!isLinkedInExtraction(extraction)) return false;
    const metadata = extraction && extraction.payload && extraction.payload.source_metadata
      ? extraction.payload.source_metadata
      : null;
    return Boolean(metadata && metadata.linkedin_surface === "search_results_preview");
  }

  function buildSnapshotFromExtraction(extraction) {
    const payload = extraction && extraction.payload ? extraction.payload : null;
    const summary = extraction && extraction.summary ? extraction.summary : null;

    const title = payload && payload.job_title ? payload.job_title : (summary && summary.title ? summary.title : "");
    const company = payload && payload.company_name ? payload.company_name : (summary && summary.company ? summary.company : "");
    const description = payload && payload.job_description_text ? payload.job_description_text : "";
    const jdLength = description.length > 0
      ? description.length
      : (summary && typeof summary.jd_length === "number" ? summary.jd_length : 0);
    const signature = extraction && extraction.signature ? extraction.signature : "";

    return {
      title,
      company,
      jdLength,
      signature,
      key: `${title}|${company}|${jdLength}|${signature}`,
    };
  }

  function parseLinkedInJobId(value) {
    const input = String(value || "");
    if (!input) return "";
    const currentJobIdMatch = input.match(/[?&#]currentJobId=(\d+)/i);
    if (currentJobIdMatch && currentJobIdMatch[1]) return currentJobIdMatch[1];
    const viewPathMatch = input.match(/\/jobs\/view\/(\d+)/i);
    if (viewPathMatch && viewPathMatch[1]) return viewPathMatch[1];
    return "";
  }

  function isRecentMoreInteraction() {
    return lastMoreClickAt > 0 && Date.now() - lastMoreClickAt < 4500;
  }

  function resolveRetryDelaysForExtraction(extraction) {
    if (isRecentMoreInteraction()) return MORE_CLICK_RETRY_DELAYS_MS;
    if (isLinkedInSearchPreviewExtraction(extraction)) return PREVIEW_RETRY_DELAYS_MS;
    return VIEW_RETRY_DELAYS_MS;
  }

  function canPromoteSparseExtraction(extraction) {
    if (!extraction || extraction.ok || !extraction.payload) return false;
    if (!isLinkedInSearchPreviewExtraction(extraction)) return false;
    if (extraction.state !== "extracting_failed") return false;

    const payload = extraction.payload;
    const sourceMetadata = payload.source_metadata || {};
    if (
      sourceMetadata.preview_not_ready
      || sourceMetadata.jd_collapsed_likely
      || sourceMetadata.description_incomplete
      || extraction.reason === "linkedin_description_incomplete"
    ) return false;
    const jdLength = (payload.job_description_text || "").length;
    return Boolean(payload.job_title) && Boolean(payload.company_name) && jdLength >= MIN_PARTIAL_JD_CHARS;
  }

  function promoteToSparseExtraction(extraction, retryAttempts, reasonLabel) {
    const payload = extraction.payload || {};
    debugLog("sparse_promoted", {
      reasonLabel,
      retryAttempts,
      signature: extraction.signature || null,
      jd_length: (payload.job_description_text || "").length,
    });

    return {
      ok: true,
      state: "ready",
      payload: {
        ...payload,
        source_metadata: {
          ...(payload.source_metadata || {}),
          extraction_signal: "sparse",
          sparse_reason: extraction.reason || "preview_partial_payload",
        },
      },
      summary: extraction.summary || null,
      signature: extraction.signature || null,
      retry_attempts: retryAttempts,
    };
  }

  function shouldRetryExtraction(extraction) {
    if (!extraction || extraction.ok) return false;
    const platform = extraction && extraction.payload && extraction.payload.platform
      ? extraction.payload.platform
      : extraction.platform;
    if (platform !== "linkedin" && platform !== "seek") return false;
    if (!extraction.reason) return false;
    return RETRYABLE_FAILURE_REASONS.has(extraction.reason);
  }

  async function resolveExtractionWithRetry(reasonLabel) {
    let latest = null;
    let retryAttempts = 0;
    let bestSparseCandidate = null;
    let lastSnapshotKey = "";
    let stableSnapshotCount = 0;
    let retryDelays = VIEW_RETRY_DELAYS_MS;

    for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
      if (extensionInvalidated) {
        return buildContextInvalidatedResult(CONTEXT_INVALIDATED_REASON);
      }

      const delay = retryDelays[attempt];
      if (delay > 0) {
        await wait(delay);
      }

      if (extensionInvalidated) {
        return buildContextInvalidatedResult(CONTEXT_INVALIDATED_REASON);
      }

      latest = await safeExtract(reasonLabel);
      if (latest.state === "context_invalidated") {
        return latest;
      }

      const snapshot = buildSnapshotFromExtraction(latest);
      const effectiveRetryDelays = resolveRetryDelaysForExtraction(latest);
      if (effectiveRetryDelays !== retryDelays) {
        retryDelays = effectiveRetryDelays;
        debugLog("retry_schedule_selected", {
          reasonLabel,
          schedule: retryDelays,
          preview: isLinkedInSearchPreviewExtraction(latest),
          more_recent: isRecentMoreInteraction(),
        });
      }
      if (snapshot.key && snapshot.key === lastSnapshotKey) {
        stableSnapshotCount += 1;
      } else {
        stableSnapshotCount = snapshot.key ? 1 : 0;
        lastSnapshotKey = snapshot.key;
      }

      if (isLinkedInSearchPreviewExtraction(latest) && stableSnapshotCount >= SNAPSHOT_STABLE_REQUIRED) {
        debugLog("snapshot_stable", {
          reasonLabel,
          attempt,
          stableSnapshotCount,
          title: snapshot.title || "",
          company: snapshot.company || "",
          jd_length: snapshot.jdLength,
          signature: snapshot.signature || null,
        });
      }

      if (latest.ok) {
        lastKnownJdLength = snapshot.jdLength;
        if (attempt > 0) {
          debugLog("retry_success", { reasonLabel, attempt, signature: latest.signature || null });
        }
        return finalizeExtractionForReturn(latest, retryAttempts, reasonLabel);
      }

      if (canPromoteSparseExtraction(latest)) {
        const latestJdLength = (latest.payload.job_description_text || "").length;
        lastKnownJdLength = latestJdLength;
        const existingBestLength = bestSparseCandidate && bestSparseCandidate.payload
          ? (bestSparseCandidate.payload.job_description_text || "").length
          : 0;
        if (!bestSparseCandidate || latestJdLength > existingBestLength) {
          bestSparseCandidate = latest;
        }
      }

      if (
        isRecentMoreInteraction()
        && snapshot.jdLength >= (lastMoreBaselineJdLength + 80)
        && snapshot.jdLength >= MIN_PARTIAL_JD_CHARS
      ) {
        debugLog("more_expand_fast_finalize", {
          reasonLabel,
          attempt,
          baseline_jd_length: lastMoreBaselineJdLength,
          next_jd_length: snapshot.jdLength,
        });
        if (latest.ok) {
          return finalizeExtractionForReturn(latest, retryAttempts, "more_expand_gain");
        }
        if (canPromoteSparseExtraction(latest)) {
          return finalizeExtractionForReturn(
            promoteToSparseExtraction(latest, retryAttempts, "more_expand_gain"),
            retryAttempts,
            "more_expand_gain",
          );
        }
      }

      if (!shouldRetryExtraction(latest) || attempt === retryDelays.length - 1) {
        if (canPromoteSparseExtraction(latest)) {
          return finalizeExtractionForReturn(
            promoteToSparseExtraction(latest, retryAttempts, "retry_exhausted_current"),
            retryAttempts,
            "retry_exhausted_current",
          );
        }
        if (bestSparseCandidate) {
          return finalizeExtractionForReturn(
            promoteToSparseExtraction(bestSparseCandidate, retryAttempts, "retry_exhausted_best"),
            retryAttempts,
            "retry_exhausted_best",
          );
        }
        return finalizeExtractionForReturn(latest, retryAttempts, "retry_exhausted");
      }

      if (
        canPromoteSparseExtraction(latest)
        && isLinkedInSearchPreviewExtraction(latest)
        && stableSnapshotCount >= SNAPSHOT_STABLE_REQUIRED
      ) {
        return finalizeExtractionForReturn(
          promoteToSparseExtraction(latest, retryAttempts, "snapshot_stable"),
          retryAttempts,
          "snapshot_stable",
        );
      }

      retryAttempts = attempt + 1;
      debugLog("retry_pending", {
        reasonLabel,
        attempt: retryAttempts,
        extraction_reason: latest.reason,
        state: latest.state,
        jd_length: snapshot.jdLength,
      });
    }

    return finalizeExtractionForReturn((latest || await safeExtract(reasonLabel)), retryAttempts, "retry_fallthrough");
  }

  function buildContextFromExtraction(extraction) {
    if (extraction && extraction.ok) {
      return {
        state: "ready",
        platform: extraction.payload.platform,
        current_job_id: extraction.payload.source_metadata
          ? extraction.payload.source_metadata.current_job_id || null
          : null,
        summary: extraction.summary,
      };
    }

    return {
      state: extraction ? extraction.state : "error",
      platform: extraction && extraction.platform ? extraction.platform : "unknown",
      reason: extraction ? extraction.reason : "unknown",
      current_job_id: extraction && extraction.payload && extraction.payload.source_metadata
        ? extraction.payload.source_metadata.current_job_id || null
        : null,
      summary: extraction && extraction.summary ? extraction.summary : null,
    };
  }

  async function safeSendMessage(message) {
    if (extensionInvalidated) {
      return { ok: false, invalidated: true, error: CONTEXT_INVALIDATED_REASON, response: null };
    }

    if (!isRuntimeAvailable()) {
      stopActivity(CONTEXT_INVALIDATED_REASON);
      return { ok: false, invalidated: true, error: CONTEXT_INVALIDATED_REASON, response: null };
    }

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(message, (response) => {
          const runtimeError = chrome.runtime.lastError;
          if (runtimeError) {
            const errorMessage = runtimeError.message || "runtime_send_failed";
            if (maybeInvalidateFromError(errorMessage)) {
              resolve({ ok: false, invalidated: true, error: errorMessage, response: null });
              return;
            }
            resolve({ ok: false, invalidated: false, error: errorMessage, response: null });
            return;
          }

          resolve({ ok: true, invalidated: false, error: null, response: response || null });
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error || "runtime_send_threw");
        if (maybeInvalidateFromError(errorMessage)) {
          resolve({ ok: false, invalidated: true, error: errorMessage, response: null });
          return;
        }
        resolve({ ok: false, invalidated: false, error: errorMessage, response: null });
      }
    });
  }

  async function postContextUpdate(force) {
    if (extensionInvalidated) return;
    const updateVersion = ++contextUpdateVersion;
    const extraction = await resolveExtractionWithRetry("context_update");

    if (extensionInvalidated || updateVersion !== contextUpdateVersion) {
      return;
    }

    if (!extraction || extraction.state === "context_invalidated") {
      stopActivity((extraction && extraction.reason) || CONTEXT_INVALIDATED_REASON);
      return;
    }

    const context = buildContextFromExtraction(extraction);
    const currentJobId = context.current_job_id || parseLinkedInJobId(location.href) || "";
    const signature = extraction.signature || `${context.state}|${context.platform}|${location.href}`;
    const descriptionContainerSignature = extraction
      && extraction.payload
      && extraction.payload.source_metadata
      && extraction.payload.source_metadata.description_container_signature
      ? extraction.payload.source_metadata.description_container_signature
      : "";
    const currentJdLength = extraction
      && extraction.payload
      && typeof extraction.payload.job_description_text === "string"
      ? extraction.payload.job_description_text.length
      : 0;

    if (
      lastMoreClickAt > 0
      && Date.now() - lastMoreClickAt < 5000
      && lastMoreBaselineSignature
      && signature !== lastMoreBaselineSignature
    ) {
      debugLog("expanded_subtree_changed", {
        previous_signature: lastMoreBaselineSignature,
        next_signature: signature,
        previous_container_signature: lastDescriptionContainerSignature || null,
        next_container_signature: descriptionContainerSignature || null,
      });
      lastMoreClickAt = 0;
      lastMoreBaselineSignature = "";
      lastMoreBaselineJdLength = 0;
    }

    if (!force && signature === lastContextSignature) {
      return;
    }

    if (currentJobId && lastMoreClickedJobId && currentJobId !== lastMoreClickedJobId) {
      lastMoreClickedJobId = "";
    }

    lastContextSignature = signature;
    if (currentJdLength > 0) {
      lastKnownJdLength = currentJdLength;
    }
    if (descriptionContainerSignature) {
      lastDescriptionContainerSignature = descriptionContainerSignature;
    }
    debugLog("context_update", {
      state: context.state,
      platform: context.platform,
      reason: context.reason || null,
      current_job_id: currentJobId || null,
      signature,
    });

    const sendResult = await safeSendMessage({
      type: Messages.CONTENT_CONTEXT_UPDATED,
      payload: {
        context,
        signature,
        url: location.href,
        extraction: extraction.ok ? extraction.payload : (extraction.payload || null),
      },
    });

    if (!sendResult.ok && !sendResult.invalidated) {
      debugLog("context_update_send_failed", { error: sendResult.error || "unknown_send_error" });
    }
  }

  function scheduleContextUpdate(force) {
    if (extensionInvalidated) return;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      if (extensionInvalidated) return;
      void postContextUpdate(Boolean(force));
    }, DEBOUNCE_MS);
  }

  function isLikelyLinkedInJobSwitchInteraction(target) {
    if (!target || typeof target.closest !== "function") return false;
    return Boolean(
      target.closest("a[href*='/jobs/view/']")
      || target.closest("li.jobs-search-results__list-item")
      || target.closest("li.jobs-search-results-list__list-item"),
    );
  }

  function isLikelyLinkedInAboutMoreInteraction(target) {
    if (!target || typeof target.closest !== "function") return false;

    const control = target.closest("button, a, span, div[role='button']");
    if (!control) return false;

    const text = String(control.textContent || "").toLowerCase();
    const ariaLabel = String(control.getAttribute ? control.getAttribute("aria-label") || "" : "").toLowerCase();
    const className = String(control.className || "").toLowerCase();

    const isMoreControl = text.includes("more")
      || text.includes("see more")
      || text.includes("read more")
      || ariaLabel.includes("more")
      || className.includes("show-more")
      || className.includes("show-more-less")
      || className.includes("read-more");

    if (!isMoreControl) return false;

    return Boolean(control.closest(
      ".jobs-description, .jobs-description__container, .jobs-search__job-details--container, .jobs-search-two-pane__details, .job-view-layout, .scaffold-layout__detail, .jobs-details, main",
    ));
  }

  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (extensionInvalidated) {
        sendResponse(buildContextInvalidatedResult(CONTEXT_INVALIDATED_REASON));
        return false;
      }

      if (!message || !message.type) return undefined;

      if (message.type === Messages.CONTENT_EXTRACT_REQUEST) {
        (async () => {
          const extraction = await resolveExtractionWithRetry("background_request");
          if (!extraction || extraction.state === "context_invalidated") {
            sendResponse(buildContextInvalidatedResult((extraction && extraction.reason) || CONTEXT_INVALIDATED_REASON));
            return;
          }
          sendResponse({
            ok: extraction.ok,
            state: extraction.state,
            reason: extraction.reason || null,
            platform: extraction.payload ? extraction.payload.platform : extraction.platform,
            payload: extraction.ok ? extraction.payload : null,
            summary: extraction.summary || null,
            signature: extraction.signature || null,
            retry_attempts: typeof extraction.retry_attempts === "number" ? extraction.retry_attempts : 0,
          });
        })();

        return true;
      }

      return undefined;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || "runtime_listener_registration_failed");
    maybeInvalidateFromError(message);
  }

  if (extensionInvalidated) {
    return;
  }

  mutationObserver = new MutationObserver(() => {
    if (extensionInvalidated) return;
    scheduleContextUpdate(false);
  });

  mutationObserver.observe(document.documentElement || document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: false,
  });

  clickHandler = (event) => {
    if (extensionInvalidated) return;
    const target = event.target;

    if (isLikelyLinkedInJobSwitchInteraction(target)) {
      scheduleContextUpdate(true);
      return;
    }

    if (isLikelyLinkedInAboutMoreInteraction(target)) {
      lastMoreClickAt = Date.now();
      lastMoreBaselineSignature = lastContextSignature;
      lastMoreBaselineJdLength = lastKnownJdLength;
      lastMoreClickedJobId = parseLinkedInJobId(location.href) || lastMoreClickedJobId;
      debugLog("more_click_detected", {
        baseline_signature: lastMoreBaselineSignature || null,
        baseline_jd_length: lastMoreBaselineJdLength,
        current_job_id: lastMoreClickedJobId || null,
      });
      scheduleContextUpdate(true);
      setTimeout(() => scheduleContextUpdate(true), 180);
      setTimeout(() => scheduleContextUpdate(true), 600);
      setTimeout(() => scheduleContextUpdate(true), 1200);
    }
  };
  document.addEventListener("click", clickHandler, true);

  urlCheckIntervalId = setInterval(async () => {
    if (extensionInvalidated) return;

    if (location.href !== lastKnownUrl) {
      lastKnownUrl = location.href;
      lastContextSignature = "";
      lastMoreClickedJobId = "";
      scheduleContextUpdate(true);
      return;
    }

    const extraction = await safeExtract("url_check");
    if (!extraction || extraction.state === "context_invalidated") {
      stopActivity((extraction && extraction.reason) || CONTEXT_INVALIDATED_REASON);
      return;
    }

    const quickSignature = extraction.signature || "";
    if (quickSignature && quickSignature !== lastContextSignature) {
      scheduleContextUpdate(true);
    }
  }, URL_CHECK_INTERVAL_MS);

  heartbeatIntervalId = setInterval(async () => {
    if (extensionInvalidated) return;

    const extraction = await safeExtract("signature_heartbeat");
    if (!extraction || extraction.state === "context_invalidated") {
      stopActivity((extraction && extraction.reason) || CONTEXT_INVALIDATED_REASON);
      return;
    }

    const heartbeatSignature = extraction.signature || "";
    if (heartbeatSignature && heartbeatSignature !== lastContextSignature) {
      scheduleContextUpdate(true);
    }
  }, SIGNATURE_HEARTBEAT_MS);

  scheduleContextUpdate(true);
})();
