(function initCareerTwinLinkedInSurfaceAdapter() {
  // Owns LinkedIn-specific adapter behavior while reusing existing parser extraction logic.
  const adapterRegistry = globalThis.CareerTwinJobSurfaceAdapterRegistry;
  const parserRegistry = globalThis.CareerTwinParserRegistry;
  const platformParsers = globalThis.CareerTwinPlatformParsers || {};

  function normalizePath(pathname) {
    return (pathname || "").toLowerCase().replace(/\/+$/, "");
  }

  function normalizeWhitespace(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function normalizeString(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function hashText(text) {
    const input = String(text || "").slice(0, 1200);
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function parseLinkedInJobId(value) {
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

  function tryDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }

  function safeParseUrl(value) {
    try {
      return new URL(value);
    } catch {
      return null;
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
    return relative || url;
  }

  function classifyLinkedInRouteFromUrl(url) {
    const effectiveUrl = resolveLinkedInEffectiveUrl(url) || url;
    const path = normalizePath(effectiveUrl.pathname);
    const currentJobId = parseLinkedInJobId(`${effectiveUrl.pathname}${effectiveUrl.search}${effectiveUrl.hash}`);
    const isCollectionsSurface = path.startsWith("/jobs/collections");
    const isGenericJobsSurface = path === "/jobs" || path.startsWith("/jobs/");
    const isSearchSurface = path.startsWith("/jobs/search") || path.startsWith("/jobs/search-results");
    const isJobsView = /^\/jobs\/view\/\d+/.test(path);
    const redirectedFromLogin = normalizePath(url.pathname) === "/login" && effectiveUrl.href !== url.href;
    const canonicalJobUrl = currentJobId ? `https://www.linkedin.com/jobs/view/${currentJobId}/` : null;

    if (isJobsView) {
      return { supported: true, routeKind: "jobs_view", currentJobId: currentJobId || null, canonicalJobUrl, isCollectionsSurface: false, redirectedFromLogin };
    }
    if (isCollectionsSurface && currentJobId) {
      return { supported: true, routeKind: "jobs_collections_current_job", currentJobId, canonicalJobUrl, isCollectionsSurface: true, redirectedFromLogin };
    }
    if (isCollectionsSurface) {
      return { supported: true, routeKind: "jobs_collections_no_current_job", currentJobId: null, canonicalJobUrl: null, isCollectionsSurface: true, redirectedFromLogin };
    }
    if (isSearchSurface && currentJobId) {
      return { supported: true, routeKind: "jobs_search_current_job", currentJobId, canonicalJobUrl, isCollectionsSurface: false, redirectedFromLogin };
    }
    if (isGenericJobsSurface && currentJobId) {
      return { supported: true, routeKind: "jobs_shell_current_job", currentJobId, canonicalJobUrl, isCollectionsSurface: false, redirectedFromLogin };
    }
    return { supported: false, routeKind: "unsupported", currentJobId: null, canonicalJobUrl: null, isCollectionsSurface: false, redirectedFromLogin };
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

    const titleText = normalizeWhitespace(titleNode && titleNode.textContent ? titleNode.textContent : "");
    const descriptionText = normalizeWhitespace(descriptionNode && descriptionNode.textContent ? descriptionNode.textContent : "");
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

  function getLinkedInParser() {
    if (parserRegistry && typeof parserRegistry.get === "function") {
      return parserRegistry.get("linkedin");
    }
    return platformParsers.linkedin || null;
  }

  function safeParseLinkedIn() {
    const parser = getLinkedInParser();
    if (typeof parser !== "function") return null;
    try {
      return parser();
    } catch {
      return null;
    }
  }

  function toLinkedInCanonicalUrl(externalJobId, fallbackUrl) {
    if (externalJobId) return `https://www.linkedin.com/jobs/view/${externalJobId}`;
    return fallbackUrl || location.href;
  }

  const linkedinAdapter = {
    source: "linkedin",

    matchesUrl(urlLike) {
      try {
        const url = new URL(urlLike);
        return url.hostname.toLowerCase() === "www.linkedin.com";
      } catch {
        return false;
      }
    },

    isPageSupported() {
      try {
        const url = new URL(location.href);
        const route = classifyLinkedInRouteFromUrl(url);
        if (route.supported) return true;
        return hasLinkedInPreviewSurface();
      } catch {
        return false;
      }
    },

    isReady() {
      const extracted = safeParseLinkedIn();
      if (!extracted) return false;
      const metadata = extracted.source_metadata || {};
      const hasTitle = Boolean(normalizeWhitespace(extracted.job_title || ""));
      const descriptionLength = normalizeWhitespace(extracted.job_description_text || "").length;
      if (!hasTitle) return false;
      if (metadata.preview_not_ready && descriptionLength < 950) return false;
      if (metadata.jd_collapsed_likely && descriptionLength < 950) return false;
      return descriptionLength >= 40;
    },

    async extractJob() {
      const currentUrl = safeParseUrl(location.href);
      const route = currentUrl ? classifyLinkedInRouteFromUrl(currentUrl) : null;
      if (route && route.redirectedFromLogin && route.currentJobId) {
        return {
          source: "linkedin",
          externalJobId: route.currentJobId,
          url: route.canonicalJobUrl || toLinkedInCanonicalUrl(route.currentJobId, location.href),
          title: "",
          company: null,
          location: null,
          description: "",
          employmentType: null,
          salary: null,
          postedAt: null,
          sourceMetadata: {
            linkedin_route_kind: route.routeKind,
            linkedin_surface: "search_results_preview",
            page_type: "search_results_preview",
            current_job_id: route.currentJobId,
            current_job_id_present: true,
            canonical_job_url: route.canonicalJobUrl || null,
            collections_panel_dom_ready: false,
            preview_not_ready: true,
            loading_reason: "linkedin_login_redirect_pending",
          },
        };
      }

      const extracted = safeParseLinkedIn();
      if (!extracted) return null;

      const sourceMetadata = extracted.source_metadata && typeof extracted.source_metadata === "object"
        ? extracted.source_metadata
        : {};
      const externalJobId = String(
        sourceMetadata.current_job_id
        || parseLinkedInJobId(extracted.url)
        || parseLinkedInJobId(location.href)
        || "",
      ).trim() || null;
      const normalizedUrl = toLinkedInCanonicalUrl(externalJobId, extracted.url || location.href);
      const routeKind = route && route.routeKind ? route.routeKind : (
        sourceMetadata.linkedin_route_kind
        || sourceMetadata.page_type
        || "unsupported"
      );

      return {
        source: "linkedin",
        externalJobId,
        url: normalizedUrl,
        title: normalizeWhitespace(extracted.job_title || ""),
        company: normalizeWhitespace(extracted.company_name || "") || null,
        location: normalizeWhitespace(extracted.location || "") || null,
        description: normalizeWhitespace(extracted.job_description_text || ""),
        employmentType: null,
        salary: null,
        postedAt: null,
        sourceMetadata: {
          ...sourceMetadata,
          linkedin_route_kind: routeKind,
          current_job_id_present: Boolean(externalJobId),
          canonical_job_url: externalJobId ? `https://www.linkedin.com/jobs/view/${externalJobId}/` : normalizedUrl,
          collections_panel_dom_ready: route && route.isCollectionsSurface ? hasLinkedInPreviewSurface() : null,
          external_job_id: externalJobId,
        },
      };
    },

    getStableJobKey(job) {
      const sourceMetadata = job && job.sourceMetadata && typeof job.sourceMetadata === "object"
        ? job.sourceMetadata
        : {};
      const currentJobId = String(sourceMetadata.current_job_id || job.externalJobId || "").trim();
      const previewSignature = String(sourceMetadata.preview_signature || "");
      return [
        "rc_visibility_v1_20260319",
        normalizeString(job.url),
        normalizeString(currentJobId),
        normalizeString(job.title),
        normalizeString(job.company),
        hashText(job.description),
        hashText(previewSignature),
      ].join("|");
    },
  };

  if (adapterRegistry && typeof adapterRegistry.register === "function") {
    adapterRegistry.register(linkedinAdapter);
  }
})();
