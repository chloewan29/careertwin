(function initDetectJobPage() {
  // Owns platform detection and supported job-page heuristics.
  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][detect] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][detect] ${label}`);
    }
  }

  function normalizePath(pathname) {
    return (pathname || "").toLowerCase().replace(/\/+$/, "");
  }

  function parseLinkedInJobIdFromString(value) {
    const input = String(value || "");
    if (!input) return "";

    const currentJobIdMatch = input.match(/[?&#]currentJobId=(\d+)/i);
    if (currentJobIdMatch && currentJobIdMatch[1]) return currentJobIdMatch[1];

    const jobIdMatch = input.match(/[?&#]jobId=(\d+)/i);
    if (jobIdMatch && jobIdMatch[1]) return jobIdMatch[1];

    const viewPathMatch = input.match(/\/jobs\/view\/(\d+)/i);
    if (viewPathMatch && viewPathMatch[1]) return viewPathMatch[1];

    return "";
  }

  function safeParseUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
    }
  }

  function tryDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function resolveLinkedInEffectiveUrl(url) {
    if (!url) return null;
    const path = normalizePath(url.pathname);
    if (path !== "/login") return url;

    const redirectParam = url.searchParams.get("session_redirect") || "";
    if (!redirectParam) return url;

    const decoded = tryDecode(redirectParam);
    const absolute = safeParseUrl(decoded);
    if (absolute) return absolute;

    const relative = safeParseUrl(`${url.origin}${decoded.startsWith("/") ? decoded : `/${decoded}`}`);
    if (relative) return relative;

    return url;
  }

  function classifyLinkedInRoute(url) {
    const effectiveUrl = resolveLinkedInEffectiveUrl(url) || url;
    const path = normalizePath(effectiveUrl.pathname);
    const currentJobId = parseLinkedInJobIdFromString(`${effectiveUrl.pathname}${effectiveUrl.search}${effectiveUrl.hash}`);
    const isCollectionsSurface = path.startsWith("/jobs/collections");
    const isGenericJobsSurface = path === "/jobs" || path.startsWith("/jobs/");
    const isSearchSurface = path.startsWith("/jobs/search") || path.startsWith("/jobs/search-results");
    const isJobsView = /^\/jobs\/view\/\d+/.test(path);
    const redirectedFromLogin = normalizePath(url.pathname) === "/login" && effectiveUrl.href !== url.href;
    const canonicalJobUrl = currentJobId ? `https://www.linkedin.com/jobs/view/${currentJobId}/` : null;

    if (isJobsView) {
      return {
        supported: true,
        routeKind: "jobs_view",
        currentJobId: currentJobId || null,
        canonicalJobUrl,
        isCollectionsSurface: false,
        redirectedFromLogin,
      };
    }

    if (isCollectionsSurface && currentJobId) {
      return {
        supported: true,
        routeKind: "jobs_collections_current_job",
        currentJobId,
        canonicalJobUrl,
        isCollectionsSurface: true,
        redirectedFromLogin,
      };
    }

    if (isCollectionsSurface) {
      return {
        supported: true,
        routeKind: "jobs_collections_no_current_job",
        currentJobId: null,
        canonicalJobUrl: null,
        isCollectionsSurface: true,
        redirectedFromLogin,
      };
    }

    if (isSearchSurface && currentJobId) {
      return {
        supported: true,
        routeKind: "jobs_search_current_job",
        currentJobId,
        canonicalJobUrl,
        isCollectionsSurface: false,
        redirectedFromLogin,
      };
    }

    if (isGenericJobsSurface && currentJobId) {
      return {
        supported: true,
        routeKind: "jobs_shell_current_job",
        currentJobId,
        canonicalJobUrl,
        isCollectionsSurface: false,
        redirectedFromLogin,
      };
    }

    return {
      supported: false,
      routeKind: "unsupported",
      currentJobId: null,
      canonicalJobUrl: null,
      isCollectionsSurface: false,
      redirectedFromLogin,
    };
  }

  function isLinkedInCollectionsOrJobsShell(url) {
    const route = classifyLinkedInRoute(url);
    const isSupportedJobsShell = route.supported && route.routeKind !== "unsupported";
    return {
      isSupportedJobsShell,
      isCollectionsSurface: route.isCollectionsSurface,
      jobId: route.currentJobId || "",
      routeKind: route.routeKind,
      canonicalJobUrl: route.canonicalJobUrl,
      redirectedFromLogin: route.redirectedFromLogin,
    };
  }

  function parseSeekJobIdFromString(value) {
    const input = String(value || "");
    if (!input) return "";
    const match = input.match(/\/job\/(\d+)/i);
    if (match && match[1]) return match[1];
    const queryMatch = input.match(/[?&#](?:jobid|job_id|currentjobid|current_job_id)=(\d+)/i);
    return queryMatch && queryMatch[1] ? queryMatch[1] : "";
  }

  function hasLinkedInPreviewSurface() {
    const previewRoot = document.querySelector(
      ".jobs-search__job-details--container, .jobs-search-two-pane__details, .scaffold-layout__detail, .job-view-layout, main",
    );
    if (!previewRoot) return false;

    const titleNode = previewRoot.querySelector(
      ".job-details-jobs-unified-top-card__job-title, .jobs-unified-top-card__job-title, h1.t-24, h1",
    );
    const descriptionNode = previewRoot.querySelector(
      ".jobs-description-content__text, .show-more-less-html__markup, .jobs-description, [data-test-job-description]",
    );

    const titleText = titleNode && titleNode.textContent ? titleNode.textContent.trim() : "";
    const descriptionText = descriptionNode && descriptionNode.textContent ? descriptionNode.textContent.trim() : "";
    const hasAboutRoot = Boolean(previewRoot.querySelector(
      ".jobs-description, .jobs-description__container, .jobs-description-content, [data-test-job-description]",
    ));

    const likelyMoreControl = Array.from(previewRoot.querySelectorAll("button, a, span, div[role='button']"))
      .slice(0, 40)
      .some((node) => {
        const text = String(node.textContent || "").toLowerCase();
        const ariaLabel = String(node.getAttribute ? node.getAttribute("aria-label") || "" : "").toLowerCase();
        const className = String(node.className || "").toLowerCase();
        return text.includes("more")
          || text.includes("see more")
          || ariaLabel.includes("more")
          || className.includes("show-more");
      });

    return Boolean(titleText) && (
      descriptionText.length >= 60
      || (hasAboutRoot && descriptionText.length >= 30)
      || (hasAboutRoot && likelyMoreControl)
    );
  }

  function detectLinkedInPage(url) {
    const route = classifyLinkedInRoute(url);
    const effectiveUrl = resolveLinkedInEffectiveUrl(url) || url;
    const path = normalizePath(effectiveUrl.pathname);
    const jobId = route.currentJobId || "";
    const isGenericJobsSurface = path === "/jobs" || path.startsWith("/jobs/");

    if (/^\/jobs\/view\/\d+/.test(path)) {
      return {
        is_job_page: true,
        platform: "linkedin",
        reason: "linkedin_job_detail",
        current_job_id: jobId || null,
        linkedin_route_kind: route.routeKind,
        current_job_id_present: Boolean(jobId),
        canonical_job_url: route.canonicalJobUrl,
      };
    }

    const isSearchSurface = path.startsWith("/jobs/search") || path.startsWith("/jobs/search-results");
    const isCollectionsSurface = path.startsWith("/jobs/collections");
    if (!isSearchSurface && !isCollectionsSurface && !(isGenericJobsSurface && jobId)) {
      return { is_job_page: false, platform: "linkedin", reason: "linkedin_not_job_surface" };
    }

    if (jobId || hasLinkedInPreviewSurface() || isCollectionsSurface) {
      const collectionsPanelDomReady = isCollectionsSurface ? hasLinkedInPreviewSurface() : null;
      const loadingReason = isCollectionsSurface && !jobId ? "collections_waiting_for_current_job_id" : null;
      return {
        is_job_page: true,
        platform: "linkedin",
        reason: jobId
          ? (
            isCollectionsSurface
              ? "linkedin_collections_current_job"
              : (isGenericJobsSurface ? "linkedin_jobs_current_job" : "linkedin_search_current_job")
          )
          : (isCollectionsSurface ? "linkedin_collections_loading_or_preview" : "linkedin_search_preview"),
        current_job_id: jobId || null,
        linkedin_route_kind: route.routeKind,
        current_job_id_present: Boolean(jobId),
        canonical_job_url: route.canonicalJobUrl,
        collections_panel_dom_ready: collectionsPanelDomReady,
        loading_reason: loadingReason,
      };
    }

    return {
      is_job_page: false,
      platform: "linkedin",
      reason: isCollectionsSurface ? "linkedin_collections_no_preview" : "linkedin_search_no_preview",
      linkedin_route_kind: route.routeKind,
      current_job_id_present: false,
      canonical_job_url: route.canonicalJobUrl,
      collections_panel_dom_ready: isCollectionsSurface ? false : null,
      unsupported_reason: isCollectionsSurface ? "collections_no_current_job_or_preview" : "search_no_current_job_or_preview",
    };
  }

  function detectWithSurfaceAdapter(urlLike) {
    const adapterRegistry = globalThis.CareerTwinJobSurfaceAdapterRegistry;
    if (!adapterRegistry || typeof adapterRegistry.findByUrl !== "function") return null;

    const adapter = adapterRegistry.findByUrl(urlLike);
    if (!adapter) return null;

    const source = adapter.source || "unknown";
    let supported = false;
    try {
      supported = Boolean(adapter.isPageSupported());
    } catch (error) {
      debugLog("adapter_support_check_error", {
        source,
        url: String(urlLike || ""),
        error: error instanceof Error ? error.message : String(error || "unknown_error"),
      });
      supported = false;
    }

    let currentJobId = null;
    try {
      if (source === "linkedin") {
        currentJobId = parseLinkedInJobIdFromString(location.href) || null;
      } else if (source === "seek") {
        currentJobId = parseSeekJobIdFromString(location.href) || null;
      }
    } catch {
      currentJobId = null;
    }

    if (!supported && source === "linkedin") {
      try {
        const url = new URL(urlLike);
        const linkedInRoute = isLinkedInCollectionsOrJobsShell(url);
        if (linkedInRoute.isSupportedJobsShell && (linkedInRoute.jobId || hasLinkedInPreviewSurface() || linkedInRoute.isCollectionsSurface)) {
          supported = true;
        }
      } catch {
        // Keep adapter-supported=false if URL parsing fails.
      }
    }

    if (supported) {
      return {
        is_job_page: true,
        platform: source,
        reason: `${source}_adapter_supported`,
        current_job_id: currentJobId,
        adapter_source: source,
        linkedin_route_kind: source === "linkedin" ? linkedInRouteKindFromUrl(urlLike) : null,
        current_job_id_present: Boolean(currentJobId),
        canonical_job_url: source === "linkedin" && currentJobId ? `https://www.linkedin.com/jobs/view/${currentJobId}/` : null,
        collections_panel_dom_ready: source === "linkedin"
          ? (linkedInRouteIsCollections(urlLike) ? hasLinkedInPreviewSurface() : null)
          : null,
      };
    }

    return {
      is_job_page: false,
      platform: source,
      reason: `${source}_adapter_not_supported`,
      current_job_id: currentJobId,
      adapter_source: source,
      linkedin_route_kind: source === "linkedin" ? linkedInRouteKindFromUrl(urlLike) : null,
      current_job_id_present: Boolean(currentJobId),
      canonical_job_url: source === "linkedin" && currentJobId ? `https://www.linkedin.com/jobs/view/${currentJobId}/` : null,
      collections_panel_dom_ready: source === "linkedin"
        ? (linkedInRouteIsCollections(urlLike) ? hasLinkedInPreviewSurface() : null)
        : null,
      unsupported_reason: source === "linkedin" ? "linkedin_adapter_not_supported" : `${source}_adapter_not_supported`,
    };
  }

  function linkedInRouteKindFromUrl(urlLike) {
    try {
      const url = new URL(urlLike);
      return classifyLinkedInRoute(url).routeKind;
    } catch {
      return "unsupported";
    }
  }

  function linkedInRouteIsCollections(urlLike) {
    try {
      const url = new URL(urlLike);
      return classifyLinkedInRoute(url).isCollectionsSurface;
    } catch {
      return false;
    }
  }

  function detectJobPage(urlLike) {
    try {
      const url = new URL(urlLike);
      const hostname = url.hostname.toLowerCase();
      const path = normalizePath(url.pathname);

      const adapterDetection = detectWithSurfaceAdapter(urlLike);
      if (adapterDetection) return adapterDetection;

      if (hostname === "www.linkedin.com") {
        return detectLinkedInPage(url);
      }

      if ((hostname === "www.seek.com.au" || hostname === "www.seek.co.nz" || hostname === "www.seek.com" || hostname === "au.seek.com") && /^\/job\/\d+/.test(path)) {
        return { is_job_page: true, platform: "seek", reason: "seek_job_detail" };
      }

      if (hostname.endsWith(".greenhouse.io") && /(\/jobs\/|\/embed\/job_app)/.test(path)) {
        return { is_job_page: true, platform: "greenhouse", reason: "greenhouse_job_detail" };
      }

      if (hostname === "boards.greenhouse.io" && /\/jobs\/\d+/.test(path)) {
        return { is_job_page: true, platform: "greenhouse", reason: "greenhouse_board_job_detail" };
      }

      if (hostname === "jobs.lever.co" && path.split("/").filter(Boolean).length >= 2) {
        return { is_job_page: true, platform: "lever", reason: "lever_job_detail" };
      }

      if (/\b(job|careers?)\b/.test(path) && document.querySelector("h1")) {
        return { is_job_page: true, platform: "generic", reason: "generic_job_like_page" };
      }

      return { is_job_page: false, platform: "unknown", reason: "not_supported" };
    } catch {
      return { is_job_page: false, platform: "unknown", reason: "invalid_url" };
    }
  }

  globalThis.CareerTwinDetectJobPage = detectJobPage;
})();
