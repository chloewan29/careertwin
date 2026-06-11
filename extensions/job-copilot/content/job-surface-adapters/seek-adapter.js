(function initCareerTwinSeekSurfaceAdapter() {
  // Owns SEEK-specific detection/readiness/extraction behind the shared adapter contract.
  const adapterRegistry = globalThis.CareerTwinJobSurfaceAdapterRegistry;
  const MIN_READY_DESCRIPTION_CHARS = 120;
  const MIN_DESCRIPTION_CHARS = 80;

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][seek-adapter] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][seek-adapter] ${label}`);
    }
  }

  function wait(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  function normalizePath(pathname) {
    return (pathname || "").toLowerCase().replace(/\/+$/, "");
  }

  function normalizeWhitespace(text) {
    return String(text || "")
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

  function cleanDescriptionText(text) {
    const lines = normalizeWhitespace(text)
      .split(/\n+/)
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean);
    const noisePatterns = [
      /^report this job$/i,
      /^save$/i,
      /^share$/i,
      /^apply now$/i,
      /^sign in to apply$/i,
      /^show less$/i,
      /^show more$/i,
      /^see more$/i,
      /^read more$/i,
      /^back$/i,
    ];

    const seen = new Set();
    const cleaned = lines.filter((line) => {
      if (line.length < 2) return false;
      if (noisePatterns.some((pattern) => pattern.test(line))) return false;
      const lowered = line.toLowerCase();
      if (seen.has(lowered)) return false;
      seen.add(lowered);
      return true;
    });

    return cleaned.join("\n").slice(0, 24000).trim();
  }

  function stripHtmlToText(html) {
    if (!html || typeof html !== "string") return "";
    return cleanDescriptionText(
      html
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/p>/gi, "\n")
        .replace(/<li[^>]*>/gi, "\n- ")
        .replace(/<\/li>/gi, "\n")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&quot;/gi, "\"")
        .replace(/&#39;/gi, "'"),
    );
  }

  function normalizeUrl(urlLike) {
    try {
      const parsed = new URL(urlLike || location.href);
      parsed.hash = "";
      const dropKeys = [
        "tracking",
        "token",
        "t",
        "type",
        "ref",
        "origin",
        "jobId",
      ];
      dropKeys.forEach((key) => parsed.searchParams.delete(key));
      return parsed.toString().replace(/\/+$/, "");
    } catch {
      return String(urlLike || location.href || "").trim();
    }
  }

  function normalizeJobId(value) {
    const text = String(value || "").trim();
    if (!/^\d+$/.test(text)) return "";
    return text;
  }

  function parseSeekExternalJobId(value) {
    const input = String(value || "").trim();
    if (!input) return "";

    const pathMatch = input.match(/\/job\/(\d+)/i);
    if (pathMatch && pathMatch[1]) return normalizeJobId(pathMatch[1]);

    const queryMatch = input.match(/[?&#](?:jobid|job_id|currentjobid|current_job_id)=(\d+)/i);
    if (queryMatch && queryMatch[1]) return normalizeJobId(queryMatch[1]);

    try {
      const parsed = new URL(input, location.href);
      const byParam = normalizeJobId(
        parsed.searchParams.get("jobId")
        || parsed.searchParams.get("jobid")
        || parsed.searchParams.get("currentJobId")
        || parsed.searchParams.get("currentjobid")
        || parsed.searchParams.get("job_id")
        || parsed.searchParams.get("current_job_id"),
      );
      if (byParam) return byParam;
    } catch {
      // Ignore URL parsing failures and keep regex-only result.
    }

    return "";
  }

  function uniqueNodes(nodes) {
    const out = [];
    const seen = new Set();
    nodes.forEach((node) => {
      if (!node || (node.nodeType !== 1 && node.nodeType !== 9)) return;
      if (seen.has(node)) return;
      seen.add(node);
      out.push(node);
    });
    return out;
  }

  function listDetailSurfaceRoots() {
    const directRoots = uniqueNodes([
      document.querySelector("[data-automation='jobAdDetails']"),
      document.querySelector("[data-automation='jobDescription']"),
      document.querySelector("[data-automation='job-details']"),
      document.querySelector("[data-automation='job-detail-title']"),
    ]);

    if (directRoots.length === 0) {
      return {
        roots: [],
        hasDetailContainer: false,
      };
    }

    const expandedRoots = uniqueNodes([
      ...directRoots,
      ...directRoots.map((node) => node.closest("section, article, div, main")),
      document.querySelector("main"),
    ]);

    return {
      roots: expandedRoots,
      hasDetailContainer: true,
    };
  }

  function findJobIdFromNode(node) {
    if (!node || typeof node.querySelectorAll !== "function") return "";

    if (typeof node.getAttribute === "function") {
      const directHref = node.getAttribute("href") || "";
      const directId = parseSeekExternalJobId(directHref);
      if (directId) return directId;
    }

    const links = Array.from(node.querySelectorAll("a[href*='/job/'], a[href*='jobId='], a[href*='jobid=']"));
    for (const link of links) {
      const href = (link.getAttribute && link.getAttribute("href")) || link.href || "";
      const id = parseSeekExternalJobId(href);
      if (id) return id;
    }
    return "";
  }

  function resolveActivePreviewSelection() {
    const selectedNode = document.querySelector(
      "article[aria-selected='true'], li[aria-selected='true'], [data-selected='true']",
    );
    if (!selectedNode) {
      return { selectedNode: null, hasSelectedPreview: false, selectedPreviewJobId: "" };
    }
    return {
      selectedNode,
      hasSelectedPreview: true,
      selectedPreviewJobId: findJobIdFromNode(selectedNode),
    };
  }

  function resolveSeekSurface() {
    const path = normalizePath(location.pathname);
    const isDetailUrl = /^\/job\/\d+/.test(path);
    const detailRoots = listDetailSurfaceRoots();
    const previewSelection = resolveActivePreviewSelection();

    let surfaceMode = "unknown";
    if (isDetailUrl) {
      surfaceMode = "detail_page";
    } else if (detailRoots.hasDetailContainer || previewSelection.hasSelectedPreview) {
      surfaceMode = "in_page_preview";
    }

    return {
      roots: detailRoots.roots,
      hasDetailContainer: detailRoots.hasDetailContainer,
      hasSelectedPreview: previewSelection.hasSelectedPreview,
      selectedPreviewJobId: previewSelection.selectedPreviewJobId,
      surfaceMode,
    };
  }

  function parseSeekReduxDataFromServerStateScript() {
    const script = document.querySelector("script[data-automation='server-state']");
    const scriptText = script && script.textContent ? script.textContent : "";
    if (!scriptText) return null;

    const startToken = "window.SEEK_REDUX_DATA =";
    const endToken = "window.SEEK_APP_CONFIG =";
    const start = scriptText.indexOf(startToken);
    if (start < 0) return null;
    const end = scriptText.indexOf(endToken, start);
    if (end < 0) return null;

    const rawJson = scriptText
      .slice(start + startToken.length, end)
      .trim()
      .replace(/;\s*$/, "")
      .trim();
    if (!rawJson) return null;

    try {
      return JSON.parse(rawJson);
    } catch {
      return null;
    }
  }

  function readSeekReduxJobFallback() {
    const reduxDataFromPage = globalThis
      && globalThis.SEEK_REDUX_DATA
      && typeof globalThis.SEEK_REDUX_DATA === "object"
      ? globalThis.SEEK_REDUX_DATA
      : null;
    const reduxData = reduxDataFromPage || parseSeekReduxDataFromServerStateScript();
    const reduxJob = reduxData
      && reduxData.jobdetails
      && reduxData.jobdetails.result
      && reduxData.jobdetails.result.job
      ? reduxData.jobdetails.result.job
      : null;
    if (!reduxJob || typeof reduxJob !== "object") return null;

    const title = normalizeWhitespace(reduxJob.title || "");
    const company = normalizeWhitespace(
      (reduxJob.advertiser && (reduxJob.advertiser.description || reduxJob.advertiser.name))
      || "",
    );
    const location = normalizeWhitespace(
      (reduxJob.location && (reduxJob.location.label || reduxJob.location.description))
      || "",
    );
    const description = stripHtmlToText(reduxJob.content || "");
    const externalJobId = normalizeJobId(reduxJob.id || "");
    const workType = normalizeWhitespace(
      (reduxJob.workTypes && reduxJob.workTypes.label) || "",
    );
    const salary = normalizeWhitespace(
      (reduxJob.salary && reduxJob.salary.label) || reduxJob.jobSalary || "",
    );
    const listedAt = normalizeWhitespace(reduxJob.listedAt || reduxJob.jobPostedTime || "");

    return {
      title,
      company,
      location,
      description,
      externalJobId: externalJobId || null,
      employmentType: workType || null,
      salary: salary || null,
      postedAt: listedAt || null,
    };
  }

  function toSearchRoots(roots, options) {
    const fallbackToDocument = Boolean(options && options.fallbackToDocument);
    if (Array.isArray(roots) && roots.length > 0) return roots;
    if (fallbackToDocument) return [document];
    return [];
  }

  function firstTextFromSelectors(selectors, roots, options) {
    const searchRoots = toSearchRoots(roots, {
      fallbackToDocument: Boolean(options && options.fallbackToDocument),
    });
    for (const root of searchRoots) {
      if (!root || typeof root.querySelector !== "function") continue;
      for (const selector of selectors) {
        const node = root.querySelector(selector);
        const text = normalizeWhitespace(node && node.textContent ? node.textContent : "");
        if (text) {
          return { text, selector, node };
        }
      }
    }
    return { text: "", selector: null, node: null };
  }

  function gatherTextBlocks(selectors, roots, label) {
    const out = [];
    const searchRoots = toSearchRoots(roots, { fallbackToDocument: false });
    const seen = new Set();
    for (const root of searchRoots) {
      if (!root || typeof root.querySelectorAll !== "function") continue;
      for (const selector of selectors) {
        const nodes = Array.from(root.querySelectorAll(selector));
        for (const node of nodes) {
          const text = cleanDescriptionText(node && node.textContent ? node.textContent : "");
          if (text.length < MIN_DESCRIPTION_CHARS) continue;
          if (seen.has(text)) continue;
          seen.add(text);
          out.push({
            text,
            selector,
            score: text.length + (selector.includes("jobAdDetails") ? 140 : 0),
            method: label,
          });
        }
      }
    }
    return out;
  }

  function gatherSemanticDescriptionBlocks(roots) {
    const out = [];
    const headingPattern = /(about the role|about you|responsibilities|requirements|what you[' ]?ll do|skills|qualifications)/i;
    const searchRoots = toSearchRoots(roots, { fallbackToDocument: false });
    const seen = new Set();

    for (const root of searchRoots) {
      if (!root || typeof root.querySelectorAll !== "function") continue;
      const headings = Array.from(root.querySelectorAll("h2, h3, h4, strong, [role='heading']"))
        .filter((node) => headingPattern.test(normalizeWhitespace(node.textContent || "")));

      for (const heading of headings) {
        const container = heading.closest("section, article, div") || heading.parentElement;
        if (!container) continue;
        const text = cleanDescriptionText(container.textContent || "");
        if (text.length < MIN_DESCRIPTION_CHARS) continue;
        if (seen.has(text)) continue;
        seen.add(text);
        out.push({
          text,
          selector: "semantic_heading_scan",
          score: text.length + 100,
          method: "semantic_heading_scan",
        });
      }
    }

    return out;
  }

  function pickBestDescriptionCandidate(candidates) {
    let best = null;
    for (const candidate of candidates) {
      if (!candidate || !candidate.text) continue;
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
    return best;
  }

  function findDetailRootJobId(roots) {
    const searchRoots = toSearchRoots(roots, { fallbackToDocument: false });
    for (const root of searchRoots) {
      const id = findJobIdFromNode(root);
      if (id) return id;
    }
    return "";
  }

  function resolveSeekExternalJobId(params) {
    const surface = params && params.surface ? params.surface : null;
    const normalizedUrl = params && params.normalizedUrl ? params.normalizedUrl : normalizeUrl(location.href);

    const fromSelectedPreview = surface ? normalizeJobId(surface.selectedPreviewJobId) : "";
    if (fromSelectedPreview) return fromSelectedPreview;

    const fromDetailRoots = surface ? normalizeJobId(findDetailRootJobId(surface.roots)) : "";
    if (fromDetailRoots) return fromDetailRoots;

    const fromLocationUrl = normalizeJobId(parseSeekExternalJobId(location.href));
    if (fromLocationUrl) return fromLocationUrl;

    const fromNormalizedUrl = normalizeJobId(parseSeekExternalJobId(normalizedUrl));
    if (fromNormalizedUrl) return fromNormalizedUrl;

    return "";
  }

  function toCanonicalSeekUrl(externalJobId, fallbackUrl) {
    const normalizedId = normalizeJobId(externalJobId);
    if (normalizedId) {
      try {
        const parsed = new URL(fallbackUrl || location.href);
        const host = parsed.hostname.toLowerCase();
        const supportedHost = host === "www.seek.com.au" || host === "www.seek.co.nz" || host === "www.seek.com" || host === "au.seek.com";
        return `https://${supportedHost ? host : "www.seek.com.au"}/job/${normalizedId}`;
      } catch {
        return `https://www.seek.com.au/job/${normalizedId}`;
      }
    }
    return normalizeUrl(fallbackUrl || location.href);
  }

  function computeSeekPreviewStableKey(job) {
    const previewHash = hashText([
      normalizeUrl(job && job.url ? job.url : location.href),
      normalizeString(job && job.title),
      normalizeString(job && job.company),
      String(job && job.description ? job.description : "").slice(0, 1200),
    ].join("|"));
    return `seek|preview:${previewHash}`;
  }

  function findDescriptionExpandControl(roots) {
    const searchRoots = toSearchRoots(roots, { fallbackToDocument: false });
    for (const root of searchRoots) {
      if (!root || typeof root.querySelectorAll !== "function") continue;
      const controls = Array.from(root.querySelectorAll("button, a, div[role='button'], span[role='button']"));
      for (const control of controls) {
        const text = normalizeWhitespace(control.textContent || "").toLowerCase();
        const ariaLabel = normalizeWhitespace(control.getAttribute ? control.getAttribute("aria-label") || "" : "").toLowerCase();
        const joined = `${text} ${ariaLabel}`;
        const isExpandControl = joined.includes("show more")
          || joined.includes("see more")
          || joined.includes("read more")
          || joined.includes("more details");
        if (!isExpandControl) continue;
        if (joined.includes("show less")) continue;
        return control;
      }
    }
    return null;
  }

  async function maybeExpandDescription(roots) {
    const control = findDescriptionExpandControl(roots);
    if (!control || typeof control.click !== "function") {
      return {
        clicked: false,
      };
    }
    try {
      control.click();
      await wait(140);
      return {
        clicked: true,
      };
    } catch {
      return {
        clicked: false,
      };
    }
  }

  function readSeekSnapshot() {
    const surface = resolveSeekSurface();
    const allowDocumentFallback = surface.surfaceMode === "detail_page" || surface.hasDetailContainer;
    const scopedRoots = toSearchRoots(surface.roots, { fallbackToDocument: false });
    const roots = allowDocumentFallback
      ? uniqueNodes([...scopedRoots, document])
      : scopedRoots;

    const textSearchOptions = { fallbackToDocument: allowDocumentFallback };
    const title = firstTextFromSelectors([
      "[data-automation='job-detail-title']",
      "[data-automation='jobTitle']",
      "h1[data-automation]",
      "h1",
    ], roots, textSearchOptions);
    const company = firstTextFromSelectors([
      "[data-automation='advertiser-name']",
      "a[data-automation='company-link']",
      "[data-automation='company-link']",
      "[data-automation='jobCompany']",
    ], roots, textSearchOptions);
    const location = firstTextFromSelectors([
      "[data-automation='job-detail-location']",
      "[data-automation='jobLocation']",
      "[data-automation='job-detail-work-type']",
    ], roots, textSearchOptions);
    const employmentType = firstTextFromSelectors([
      "[data-automation='job-detail-work-type']",
      "[data-automation='workType']",
    ], roots, textSearchOptions);
    const salary = firstTextFromSelectors([
      "[data-automation='job-detail-salary']",
      "[data-automation='jobSalary']",
      "[data-automation='salary']",
    ], roots, textSearchOptions);
    const postedAt = firstTextFromSelectors([
      "[data-automation='job-detail-date']",
      "[data-automation='jobListingDate']",
      "[data-automation='listingDate']",
    ], roots, textSearchOptions);

    const primaryDescription = gatherTextBlocks([
      "[data-automation='jobAdDetails']",
      "[data-automation='jobDescription']",
    ], roots, "structured_primary");

    const fallbackSelectors = surface.surfaceMode === "detail_page"
      ? [
        "[data-automation='job-details']",
        "[data-automation='jobDescriptionSection']",
        "main article",
        "main section",
        "article",
      ]
      : [
        "[data-automation='job-details']",
        "[data-automation='jobDescriptionSection']",
      ];

    const fallbackDescription = gatherTextBlocks([
      ...fallbackSelectors,
    ], roots, "structured_fallback");
    const semanticDescription = gatherSemanticDescriptionBlocks(roots);
    const bestDescription = pickBestDescriptionCandidate([
      ...primaryDescription,
      ...fallbackDescription,
      ...semanticDescription,
    ]);
    const reduxFallback = readSeekReduxJobFallback();
    const fallbackDescriptionCandidate = reduxFallback && reduxFallback.description.length >= MIN_DESCRIPTION_CHARS
      ? {
        text: reduxFallback.description,
        selector: "window.SEEK_REDUX_DATA.jobdetails.result.job.content",
        score: reduxFallback.description.length + 120,
        method: "seek_redux_fallback",
      }
      : null;
    const finalDescriptionCandidate = pickBestDescriptionCandidate([
      bestDescription,
      fallbackDescriptionCandidate,
    ]);
    const titleText = title.text || (reduxFallback ? reduxFallback.title : "");
    const companyText = company.text || (reduxFallback ? reduxFallback.company : "");
    const locationText = location.text || (reduxFallback ? reduxFallback.location : "");
    const employmentTypeText = employmentType.text || (reduxFallback ? reduxFallback.employmentType : "");
    const salaryText = salary.text || (reduxFallback ? reduxFallback.salary : "");
    const postedAtText = postedAt.text || (reduxFallback ? reduxFallback.postedAt : "");

    const normalizedUrl = normalizeUrl(location.href);
    const externalJobId = resolveSeekExternalJobId({ surface, normalizedUrl })
      || (reduxFallback ? reduxFallback.externalJobId || "" : "");
    const canonicalUrl = toCanonicalSeekUrl(externalJobId, normalizedUrl);
    const previewStableKey = computeSeekPreviewStableKey({
      url: canonicalUrl,
      title: titleText || "",
      company: companyText || null,
      description: finalDescriptionCandidate ? finalDescriptionCandidate.text : "",
    });
    const usedReduxFallback = Boolean(
      reduxFallback
      && (
        (!title.text && titleText)
        || (!company.text && companyText)
        || !bestDescription
      ),
    );
    const metadata = {
      extraction_method: finalDescriptionCandidate ? finalDescriptionCandidate.method : "structured_primary",
      detected_selectors: [
        title.selector,
        company.selector,
        location.selector,
        employmentType.selector,
        salary.selector,
        postedAt.selector,
        finalDescriptionCandidate ? finalDescriptionCandidate.selector : null,
        usedReduxFallback ? "window.SEEK_REDUX_DATA.jobdetails.result.job" : null,
      ].filter(Boolean),
      external_job_id: externalJobId || null,
      preview_not_ready: Boolean(titleText) && (!finalDescriptionCandidate || finalDescriptionCandidate.text.length < MIN_READY_DESCRIPTION_CHARS),
      current_job_id: externalJobId || null,
      seek_surface: surface.surfaceMode,
      has_detail_container: surface.hasDetailContainer,
      has_selected_preview: surface.hasSelectedPreview,
      source_url: location.href,
      stable_job_key: externalJobId ? `seek|id:${externalJobId}` : previewStableKey,
      redux_fallback_used: usedReduxFallback,
    };

    return {
      normalizedJob: {
        source: "seek",
        externalJobId: externalJobId || null,
        url: canonicalUrl,
        title: titleText || "",
        company: companyText || null,
        location: locationText || null,
        description: finalDescriptionCandidate ? finalDescriptionCandidate.text : "",
        employmentType: employmentTypeText || null,
        salary: salaryText || null,
        postedAt: postedAtText || null,
        sourceMetadata: metadata,
      },
      metadata,
      surface,
      roots,
      descriptionLength: finalDescriptionCandidate ? finalDescriptionCandidate.text.length : 0,
      hasExpandControl: Boolean(findDescriptionExpandControl(roots)),
    };
  }

  const seekAdapter = {
    source: "seek",

    matchesUrl(urlLike) {
      try {
        const url = new URL(urlLike);
        const host = url.hostname.toLowerCase();
        return host === "www.seek.com.au" || host === "www.seek.co.nz" || host === "www.seek.com" || host === "au.seek.com";
      } catch {
        return false;
      }
    },

    isPageSupported() {
      const snapshot = readSeekSnapshot();
      const hasSurfaceMarker = snapshot.surface
        && (
          snapshot.surface.surfaceMode === "detail_page"
          || snapshot.surface.surfaceMode === "in_page_preview"
          || snapshot.surface.hasDetailContainer
          || snapshot.surface.hasSelectedPreview
        );
      const hasJobIdentitySignal = Boolean(snapshot.normalizedJob.externalJobId) || snapshot.descriptionLength >= MIN_DESCRIPTION_CHARS;
      const supported = Boolean(hasSurfaceMarker && hasJobIdentitySignal);
      debugLog("support_check", {
        href: location.href,
        surface_mode: snapshot.surface ? snapshot.surface.surfaceMode : "unknown",
        has_detail_container: Boolean(snapshot.surface && snapshot.surface.hasDetailContainer),
        has_selected_preview: Boolean(snapshot.surface && snapshot.surface.hasSelectedPreview),
        external_job_id: snapshot.normalizedJob.externalJobId || null,
        description_length: snapshot.descriptionLength,
        extraction_method: snapshot.metadata ? snapshot.metadata.extraction_method : null,
        redux_fallback_used: Boolean(snapshot.metadata && snapshot.metadata.redux_fallback_used),
        supported,
      });
      return supported;
    },

    isReady() {
      const snapshot = readSeekSnapshot();
      const titleReady = Boolean(snapshot.normalizedJob.title);
      const descriptionReady = snapshot.descriptionLength >= MIN_READY_DESCRIPTION_CHARS;
      return titleReady && descriptionReady;
    },

    async extractJob() {
      let snapshot = readSeekSnapshot();
      if (snapshot.descriptionLength < MIN_READY_DESCRIPTION_CHARS && snapshot.hasExpandControl) {
        const expanded = await maybeExpandDescription(snapshot.roots);
        if (expanded.clicked) {
          snapshot = readSeekSnapshot();
          snapshot.normalizedJob.sourceMetadata = {
            ...(snapshot.normalizedJob.sourceMetadata || {}),
            more_expand_clicked_by_flow: true,
          };
        }
      }
      return snapshot.normalizedJob;
    },

    getStableJobKey(job) {
      const externalJobId = String(job && job.externalJobId ? job.externalJobId : "").trim();
      if (externalJobId) return `seek|id:${externalJobId}`;
      return computeSeekPreviewStableKey(job);
    },
  };

  if (adapterRegistry && typeof adapterRegistry.register === "function") {
    adapterRegistry.register(seekAdapter);
  }
})();
