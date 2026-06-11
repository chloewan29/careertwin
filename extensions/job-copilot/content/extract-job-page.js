(function initExtractJobPage() {
  // Owns normalized JobPagePayload extraction and extraction outcome states.
  const Constants = globalThis.CareerTwinConstants || {};
  const PayloadHelpers = globalThis.CareerTwinJobPayload || {};
  const MIN_JD_CHARS = Constants.MIN_JD_CHARS || 120;
  const MIN_SPARSE_JD_CHARS = 40;
  const PREVIEW_NOT_READY_MAX_CHARS = 950;

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][extract] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][extract] ${label}`);
    }
  }

  function jdExtractionLog(label, value) {
    try {
      console.debug(`[CareerTwin][jd-extraction] ${label}`, value);
    } catch {
      console.debug(`[CareerTwin][jd-extraction] ${label}`);
    }
  }

  function normalizeWhitespace(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function cleanField(text) {
    return normalizeWhitespace(text || "").slice(0, 500);
  }

  function cleanDescription(text) {
    const cleaned = normalizeWhitespace(text || "");
    return cleaned.slice(0, 24000);
  }

  function previewSnippet(text, maxChars = 200) {
    return normalizeWhitespace(String(text || "").replace(/\n+/g, " ")).slice(0, maxChars);
  }

  function logLinkedInExtractionDecision(params) {
    const payload = params.payload;
    if (!payload || payload.platform !== "linkedin") return;
    const sourceMetadata = payload.source_metadata || {};
    const reason = params.reason || null;
    const rawLength = typeof sourceMetadata.raw_description_length === "number"
      ? sourceMetadata.raw_description_length
      : (payload.job_description_text || "").length;

    jdExtractionLog("extract_decision", {
      flow: "extract_job_page_payload",
      page_type: sourceMetadata.page_type || sourceMetadata.linkedin_surface || "unknown",
      raw_jd_length: rawLength,
      normalized_jd_length: (payload.job_description_text || "").length,
      extraction_quality: sourceMetadata.description_quality || null,
      description_incomplete: Boolean(sourceMetadata.description_incomplete),
      see_more_clicked: Boolean(sourceMetadata.more_expand_clicked_by_flow),
      preview_not_ready_triggered: reason === "preview_not_ready_yet" || Boolean(sourceMetadata.preview_not_ready),
      job_description_collapsed_detected: reason === "job_description_collapsed" || Boolean(sourceMetadata.jd_collapsed_likely),
      ready_for_analysis: Boolean(params.readyForAnalysis),
      extraction_reason: reason,
      jd_preview_200: previewSnippet(payload.job_description_text, 200),
    });
  }

  function summarize(payload) {
    if (PayloadHelpers.summarizePayload) {
      return PayloadHelpers.summarizePayload(payload);
    }
    return {
      platform: payload.platform,
      url: payload.url,
      title: payload.job_title || "",
      company: payload.company_name || "",
      location: payload.location || "",
      jd_length: (payload.job_description_text || "").length,
      extraction_method: payload.source_metadata ? payload.source_metadata.extraction_method : "unknown",
    };
  }

  function signature(payload) {
    if (PayloadHelpers.signatureFromPayload) {
      return PayloadHelpers.signatureFromPayload(payload);
    }
    const descriptionPrefix = (payload.job_description_text || "").slice(0, 500).toLowerCase();
    return [
      payload.url || "",
      payload.platform || "",
      (payload.job_title || "").toLowerCase(),
      (payload.company_name || "").toLowerCase(),
      descriptionPrefix,
    ].join("|");
  }

  function isLinkedInPreview(payload) {
    return payload.platform === "linkedin"
      && payload.source_metadata
      && payload.source_metadata.linkedin_surface === "search_results_preview";
  }

  function deriveFailureReason(payload) {
    const sourceMetadata = payload.source_metadata || {};
    const jdLength = (payload.job_description_text || "").length;
    const hasTitle = Boolean(payload.job_title);
    const hasCompany = Boolean(payload.company_name);
    const linkedInPreview = isLinkedInPreview(payload);
    const requiresCompany = payload.platform === "linkedin";
    const jdCollapsedLikely = Boolean(sourceMetadata.jd_collapsed_likely);
    const previewNotReady = Boolean(sourceMetadata.preview_not_ready);
    const linkedInRouteKind = String(sourceMetadata.linkedin_route_kind || "");

    if (payload.platform === "linkedin" && sourceMetadata.loading_reason === "linkedin_login_redirect_pending") {
      return "preview_not_ready_yet";
    }

    if (payload.platform === "linkedin" && linkedInRouteKind === "jobs_collections_no_current_job") {
      return "preview_not_ready_yet";
    }

    if (linkedInPreview && previewNotReady) {
      return "preview_not_ready_yet";
    }

    if (!hasTitle) {
      return "missing_job_title";
    }

    if (requiresCompany && !hasCompany) {
      return "missing_company_name";
    }

    if (!payload.job_description_text) {
      if (previewNotReady) return "preview_not_ready_yet";
      if (jdCollapsedLikely) return "job_description_collapsed";
      if (sourceMetadata.parser_selector_miss) return "parser_selector_miss";
      return "missing_job_description";
    }

    if (jdCollapsedLikely) {
      return "job_description_collapsed";
    }

    if (payload.platform === "linkedin" && sourceMetadata.description_incomplete) {
      return "linkedin_description_incomplete";
    }

    if (previewNotReady && jdLength < PREVIEW_NOT_READY_MAX_CHARS) {
      return "preview_not_ready_yet";
    }

    if (jdLength < MIN_JD_CHARS) {
      if (linkedInPreview && previewNotReady) {
        return "preview_not_ready_yet";
      }
      if (jdLength >= MIN_SPARSE_JD_CHARS) {
        return "sparse_job_description";
      }
      return "job_description_too_short";
    }

    return "unknown_extract_failure";
  }

  function buildPayloadFromExtracted(extracted, fallbackPlatform) {
    return {
      url: typeof extracted.url === "string" && extracted.url.trim().length > 0 ? extracted.url.trim() : location.href,
      platform: extracted.platform || fallbackPlatform,
      job_title: cleanField(extracted.job_title),
      company_name: cleanField(extracted.company_name),
      location: cleanField(extracted.location),
      job_description_text: cleanDescription(extracted.job_description_text),
      source_metadata: {
        extraction_method: "fallback_text",
        detected_selectors: [],
        ...(extracted.source_metadata || {}),
      },
    };
  }

  function buildPayloadFromNormalizedJob(params) {
    const normalized = params.normalizedJob;
    const stableJobKey = params.stableJobKey;
    const adapterReady = params.adapterReady;
    const sourceMetadata = normalized && normalized.sourceMetadata && typeof normalized.sourceMetadata === "object"
      ? normalized.sourceMetadata
      : {};
    const externalJobId = typeof normalized.externalJobId === "string"
      ? normalized.externalJobId.trim() || null
      : null;

    return {
      url: typeof normalized.url === "string" && normalized.url.trim().length > 0 ? normalized.url.trim() : location.href,
      platform: normalized.source || "unknown",
      job_title: cleanField(normalized.title),
      company_name: cleanField(normalized.company || ""),
      location: cleanField(normalized.location || ""),
      job_description_text: cleanDescription(normalized.description),
      source_metadata: {
        extraction_method: "surface_adapter",
        detected_selectors: [],
        ...sourceMetadata,
        adapter_source: normalized.source || "unknown",
        stable_job_key: stableJobKey || null,
        external_job_id: externalJobId || (sourceMetadata.external_job_id || null),
        current_job_id: sourceMetadata.current_job_id
          || (normalized.source === "seek" || normalized.source === "linkedin" ? externalJobId : null),
        employment_type: typeof normalized.employmentType === "string" ? normalized.employmentType : null,
        salary: typeof normalized.salary === "string" ? normalized.salary : null,
        posted_at: typeof normalized.postedAt === "string" ? normalized.postedAt : null,
        adapter_ready: adapterReady,
      },
    };
  }

  function getAdapterFromDetection(detection) {
    const adapterRegistry = globalThis.CareerTwinJobSurfaceAdapterRegistry;
    if (!adapterRegistry || typeof adapterRegistry.getBySource !== "function") return null;
    const source = detection && detection.adapter_source ? detection.adapter_source : detection.platform;
    if (!source || source === "unknown") return null;
    return adapterRegistry.getBySource(source);
  }

  function buildFailureResult(payload, reason) {
    debugLog("extract_failure", {
      reason,
      title_length: (payload.job_title || "").length,
      company: payload.company_name || "",
      location: payload.location || "",
      jd_length: (payload.job_description_text || "").length,
      selectors_used: payload.source_metadata && payload.source_metadata.detected_selectors
        ? payload.source_metadata.detected_selectors
        : [],
      jd_collapsed_likely: payload.source_metadata ? Boolean(payload.source_metadata.jd_collapsed_likely) : false,
      description_incomplete: payload.source_metadata ? Boolean(payload.source_metadata.description_incomplete) : false,
      description_quality: payload.source_metadata ? payload.source_metadata.description_quality || null : null,
      more_expand_clicked_by_flow: payload.source_metadata ? Boolean(payload.source_metadata.more_expand_clicked_by_flow) : false,
      expand_control_present: payload.source_metadata ? Boolean(payload.source_metadata.expand_control_present) : false,
      expand_control_expanded: payload.source_metadata
        ? payload.source_metadata.expand_control_expanded
        : null,
    });
    logLinkedInExtractionDecision({
      payload,
      reason,
      readyForAnalysis: false,
    });

    return {
      ok: false,
      state: "extracting_failed",
      reason,
      platform: payload.platform,
      payload,
      summary: summarize(payload),
      signature: signature(payload),
    };
  }

  async function extractJobPagePayload() {
    const detector = globalThis.CareerTwinDetectJobPage;
    const registry = globalThis.CareerTwinParserRegistry;
    const parsers = registry ? registry.getAll() : (globalThis.CareerTwinPlatformParsers || {});

    const detection = detector
      ? detector(location.href)
      : { is_job_page: false, platform: "unknown", reason: "detector_missing" };

    if (!detection.is_job_page) {
      return {
        ok: false,
        state: "unsupported_page",
        reason: detection.reason,
        platform: detection.platform,
        route_kind: detection.linkedin_route_kind || "unsupported",
        current_job_id: detection.current_job_id || null,
        current_job_id_present: Boolean(detection.current_job_id_present),
        canonical_job_url: detection.canonical_job_url || null,
        collections_panel_dom_ready: typeof detection.collections_panel_dom_ready === "boolean"
          ? detection.collections_panel_dom_ready
          : null,
        unsupported_reason: detection.unsupported_reason || detection.reason || "not_supported",
      };
    }

    const adapter = getAdapterFromDetection(detection);
    let payload = null;

    if (adapter) {
      let adapterReady = true;
      try {
        adapterReady = Boolean(adapter.isReady());
      } catch {
        adapterReady = true;
      }

      let normalizedJob = null;
      try {
        normalizedJob = await adapter.extractJob();
      } catch {
        normalizedJob = null;
      }

      if (!normalizedJob) {
        return {
          ok: false,
          state: "extracting_failed",
          reason: "parser_selector_miss",
          platform: detection.platform,
        };
      }

      let stableJobKey = null;
      try {
        stableJobKey = adapter.getStableJobKey(normalizedJob);
      } catch {
        stableJobKey = null;
      }

      payload = buildPayloadFromNormalizedJob({
        normalizedJob,
        stableJobKey,
        adapterReady,
      });
      if (!adapterReady && payload.job_description_text.length < PREVIEW_NOT_READY_MAX_CHARS) {
        payload.source_metadata = {
          ...(payload.source_metadata || {}),
          preview_not_ready: true,
        };
      }
    } else {
      const parser = (registry && registry.get(detection.platform)) || parsers[detection.platform] || parsers.generic;
      if (!parser) {
        return {
          ok: false,
          state: "extracting_failed",
          reason: "parser_selector_miss",
          platform: detection.platform,
        };
      }

      const extracted = parser();
      payload = buildPayloadFromExtracted(extracted, detection.platform);
    }

    debugLog("extract_summary", {
      platform: payload.platform,
      title_length: payload.job_title.length,
      company: payload.company_name,
      location: payload.location,
      jd_length: payload.job_description_text.length,
      selectors_used: payload.source_metadata.detected_selectors || [],
      jd_collapsed_likely: Boolean(payload.source_metadata.jd_collapsed_likely),
      description_incomplete: Boolean(payload.source_metadata.description_incomplete),
      description_quality: payload.source_metadata.description_quality || null,
      section_hit_count: typeof payload.source_metadata.description_section_hit_count === "number"
        ? payload.source_metadata.description_section_hit_count
        : null,
      expand_control_present: Boolean(payload.source_metadata.expand_control_present),
      expand_control_expanded: payload.source_metadata.expand_control_expanded,
    });

    const reason = deriveFailureReason(payload);
    if (reason !== "unknown_extract_failure") {
      if (reason === "sparse_job_description") {
        logLinkedInExtractionDecision({
          payload,
          reason,
          readyForAnalysis: true,
        });
        return {
          ok: true,
          state: "ready",
          payload: {
            ...payload,
            source_metadata: {
              ...(payload.source_metadata || {}),
              extraction_signal: "sparse",
              sparse_reason: reason,
            },
          },
          summary: summarize(payload),
          signature: signature(payload),
        };
      }

      if (reason === "missing_job_title" || reason === "missing_job_description" || reason === "parser_selector_miss" || reason === "preview_not_ready_yet" || reason === "job_description_too_short" || reason === "job_description_collapsed" || reason === "linkedin_description_incomplete") {
        return buildFailureResult(payload, reason);
      }

      if (reason === "missing_company_name") {
        return buildFailureResult(payload, reason);
      }
    }

    logLinkedInExtractionDecision({
      payload,
      reason: null,
      readyForAnalysis: true,
    });
    return {
      ok: true,
      state: "ready",
      payload,
      summary: summarize(payload),
      signature: signature(payload),
    };
  }

  globalThis.CareerTwinExtractJobPagePayload = extractJobPagePayload;
})();
