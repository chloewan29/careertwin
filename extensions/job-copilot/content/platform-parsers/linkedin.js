(function initLinkedInParser() {
  // Owns LinkedIn DOM extraction selectors and payload shaping with layout-tolerant strategies.
  const registry = globalThis.CareerTwinParserRegistry;
  const parsers = globalThis.CareerTwinPlatformParsers = globalThis.CareerTwinPlatformParsers || {};

  const DESCRIPTION_MIN_CHARS = 40;
  const STRATEGY_LOG_LIMIT = 18;
  const MAX_AUTO_EXPAND_CLICKS = 2;
  const AUTO_EXPAND_COOLDOWN_MS = 7000;
  const JD_COLLAPSED_LIKELY_MAX_CHARS = 950;
  const PREVIEW_NOT_READY_MAX_CHARS = 950;
  const Constants = globalThis.CareerTwinConstants || {};
  const JD_AUDIT_RUNTIME_ENABLED = Boolean(Constants.LINKEDIN_JD_AUDIT_ENABLED);
  const autoExpandClickMemory = new Map();
  const JD_AUDIT_THRESHOLDS = {
    EMPTY_MAX_CHARS: 39,
    SHORT_PREVIEW_MAX_CHARS: 420,
    PARTIAL_MAX_CHARS: 1399,
    LIKELY_FULL_MIN_CHARS: 1400,
    LIKELY_FULL_MIN_SECTION_HITS: 2,
  };
  const NOISE_CLASS_HINTS = [
    "jobs-search-results",
    "jobs-similar",
    "jobs-recommendation",
    "people-also-viewed",
    "company-card",
    "job-card",
    "global-nav",
    "artdeco",
    "ad-feedback",
  ];
  const NOISE_TEXT_HINTS = [
    "people also viewed",
    "similar jobs",
    "recommended jobs",
    "set alert",
    "follow",
    "report this job",
    "easy apply",
    "save job",
  ];
  const RESPONSIBILITIES_PATTERNS = [
    /\bresponsibilit(y|ies)\b/i,
    /\bwhat you('ll| will) do\b/i,
    /\byou will\b/i,
    /\bday[- ]to[- ]day\b/i,
  ];
  const REQUIREMENTS_PATTERNS = [
    /\brequirements?\b/i,
    /\bqualifications?\b/i,
    /\bmust[- ]have\b/i,
    /\brequired\b/i,
    /\bskills?\b/i,
    /\bexperience\b/i,
  ];
  const PREFERRED_PATTERNS = [
    /\bpreferred\b/i,
    /\bnice to have\b/i,
    /\bgood to have\b/i,
    /\bbonus\b/i,
    /\bdesirable\b/i,
    /\bplus\b/i,
  ];
  const BENEFITS_PATTERNS = [
    /\bbenefits?\b/i,
    /\bperks?\b/i,
    /\bwhat we offer\b/i,
    /\babout (the )?company\b/i,
    /\babout us\b/i,
    /\bwhy join\b/i,
  ];

  function isLinkedInJdAuditEnabled() {
    return JD_AUDIT_RUNTIME_ENABLED;
  }

  function debugLog(label, value) {
    try {
      const summary = typeof value === "string" ? value : JSON.stringify(value);
      console.debug(`[CareerTwin][linkedin-parser] ${label}`, summary);
    } catch {
      console.debug(`[CareerTwin][linkedin-parser] ${label}`);
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

  function hashText(text) {
    const input = String(text || "").slice(0, 1200);
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
      hash = ((hash << 5) - hash) + input.charCodeAt(i);
      hash |= 0;
    }
    return String(hash);
  }

  function isVisible(node) {
    if (!node) return false;
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden") return false;
    const rect = node.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
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

  function pageTypeFromPath() {
    const path = String(location.pathname || "").toLowerCase();
    if (/^\/jobs\/view\/\d+/.test(path)) return "job_view";
    if (path.startsWith("/jobs/search") || path.startsWith("/jobs/search-results")) {
      return "search_results_preview";
    }
    return "unknown";
  }

  function hasNoiseClassHint(value) {
    const input = String(value || "").toLowerCase();
    return NOISE_CLASS_HINTS.some((hint) => input.includes(hint));
  }

  function hasNoiseTextHint(value) {
    const input = String(value || "").toLowerCase();
    return NOISE_TEXT_HINTS.some((hint) => input.includes(hint));
  }

  function cleanDescriptionText(text) {
    const normalized = normalizeWhitespace(text || "");
    if (!normalized) return "";

    const seen = new Set();
    const lines = normalized
      .split(/\n+/)
      .map((line) => normalizeWhitespace(line))
      .filter(Boolean)
      .filter((line) => {
        const lowered = line.toLowerCase();
        if (lowered.length <= 2) return false;
        if (hasNoiseTextHint(lowered)) return false;
        if (/^(show|see|read)\s+more$/i.test(line)) return false;
        if (/^show less$/i.test(line)) return false;
        if (/^(apply|save|share)$/i.test(line)) return false;
        if (seen.has(lowered)) return false;
        seen.add(lowered);
        return true;
      });

    return lines.join("\n").trim();
  }

  function toAuditPageType(pageType) {
    if (pageType === "job_view") return "jobs_view";
    if (pageType === "search_results_preview") return "search_results_preview";
    return "unknown";
  }

  function firstChars(text, size) {
    return String(text || "").slice(0, size);
  }

  function lastChars(text, size) {
    const input = String(text || "");
    if (!input) return "";
    return input.length <= size ? input : input.slice(input.length - size);
  }

  function previewSnippet(text, maxChars = 200) {
    return normalizeWhitespace(String(text || "").replace(/\n+/g, " ")).slice(0, maxChars);
  }

  function matchesAnyPattern(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
  }

  function detectSectionFlags(normalizedDescriptionText) {
    const sample = String(normalizedDescriptionText || "");
    return {
      responsibilities_like: matchesAnyPattern(sample, RESPONSIBILITIES_PATTERNS),
      requirements_like: matchesAnyPattern(sample, REQUIREMENTS_PATTERNS),
      preferred_like: matchesAnyPattern(sample, PREFERRED_PATTERNS),
      benefits_or_about_like: matchesAnyPattern(sample, BENEFITS_PATTERNS),
    };
  }

  function classifyExtractionQuality(params) {
    const normalizedLength = params.normalizedLength;
    const sectionHitCount = params.sectionHitCount;

    if (normalizedLength <= JD_AUDIT_THRESHOLDS.EMPTY_MAX_CHARS) return "empty";
    if (
      normalizedLength <= JD_AUDIT_THRESHOLDS.SHORT_PREVIEW_MAX_CHARS
      && sectionHitCount <= 1
    ) {
      return "short_preview";
    }
    if (
      normalizedLength <= JD_AUDIT_THRESHOLDS.PARTIAL_MAX_CHARS
      || sectionHitCount < JD_AUDIT_THRESHOLDS.LIKELY_FULL_MIN_SECTION_HITS
    ) {
      return "partial";
    }
    if (
      normalizedLength >= JD_AUDIT_THRESHOLDS.LIKELY_FULL_MIN_CHARS
      && sectionHitCount >= JD_AUDIT_THRESHOLDS.LIKELY_FULL_MIN_SECTION_HITS
    ) {
      return "likely_full";
    }
    return "partial";
  }

  function buildLinkedInJdAuditRecord(params) {
    const sections = detectSectionFlags(params.normalizedDescriptionText);
    const sectionHitCount = Object.values(sections).filter(Boolean).length;
    const normalizedLength = params.normalizedDescriptionText.length;
    const extractionQuality = classifyExtractionQuality({
      normalizedLength,
      sectionHitCount,
    });

    return {
      timestamp: new Date().toISOString(),
      page_type: toAuditPageType(params.pageType),
      linkedin_job_id: params.currentJobId || null,
      current_url: String(location.href || ""),
      loading_when_extraction_started: Boolean(params.loadingAtStart),
      more_expand_detected: Boolean(params.expandControls && params.expandControls.present),
      more_expand_clicked_by_flow: Boolean(params.moreExpandClickedByFlow),
      raw_extracted_jd_length: params.rawDescriptionText.length,
      normalized_extracted_jd_length: normalizedLength,
      extracted_text_first_300: firstChars(params.normalizedDescriptionText, 300),
      extracted_text_last_300: lastChars(params.normalizedDescriptionText, 300),
      responsibilities_like_content: sections.responsibilities_like,
      requirements_or_qualifications_like_content: sections.requirements_like,
      preferred_or_bonus_like_content: sections.preferred_like,
      benefits_or_about_company_like_content: sections.benefits_or_about_like,
      section_flags: sections,
      extraction_source: {
        strategy_path: Array.isArray(params.strategyAttempts)
          ? params.strategyAttempts.map((entry) => entry.strategy).filter(Boolean)
          : [],
        strategy_used: params.descriptionStrategy || null,
        selector_path: Array.isArray(params.detectedSelectors) ? params.detectedSelectors : [],
        fallback_tier_used: params.extractionMethod === "fallback_text",
        extraction_method: params.extractionMethod || "unknown",
      },
      extraction_quality: extractionQuality,
      threshold_profile: {
        ...JD_AUDIT_THRESHOLDS,
      },
      downstream_bridge: {
        requirement_cluster_count: null,
        capability_cluster_count: null,
        matcher_job_profile_quality: null,
      },
      audit_mode_enabled: isLinkedInJdAuditEnabled(),
    };
  }

  function nodeSignature(node) {
    if (!node) return "";
    const tag = String(node.tagName || "").toLowerCase();
    const id = node.id ? `#${node.id}` : "";
    const className = String(node.className || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4)
      .join(".");
    const textHash = hashText((node.textContent || "").slice(0, 200));
    return `${tag}${id}${className ? `.${className}` : ""}|${textHash}`;
  }

  function scorePanelRoot(node) {
    if (!node || !isVisible(node)) return -1;
    const className = String(node.className || "");
    const text = normalizeWhitespace(node.textContent || "");
    const hasTitle = Boolean(node.querySelector("h1.job-details-jobs-unified-top-card__job-title, h1.jobs-unified-top-card__job-title, h1.t-24, h1"));
    const hasDescriptionRegion = Boolean(node.querySelector(".jobs-description, .jobs-description__container, .jobs-description-content, [data-test-job-description], .show-more-less-html__markup"));

    let score = Math.min(text.length, 6000);
    if (hasTitle) score += 800;
    if (hasDescriptionRegion) score += 700;
    if (hasNoiseClassHint(className)) score -= 900;
    return score;
  }

  function pickPanelRoot(pageType) {
    const selectors = pageType === "search_results_preview"
      ? [
        ".jobs-search__job-details--container",
        ".jobs-search-two-pane__details",
        ".scaffold-layout__detail",
        ".job-view-layout",
        "main",
      ]
      : [
        ".job-view-layout",
        ".jobs-details",
        ".scaffold-layout__detail",
        ".scaffold-layout__main",
        "main",
      ];

    let best = null;
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        const score = scorePanelRoot(node);
        if (score < 0) continue;
        if (!best || score > best.score) {
          best = { node, selector, score };
        }
      }
    }

    if (best) {
      return {
        node: best.node,
        selector: best.selector,
        found: true,
      };
    }

    const fallback = document.querySelector("main");
    return {
      node: fallback || document,
      selector: fallback ? "main" : null,
      found: Boolean(fallback),
    };
  }

  function queryText(selectors, roots) {
    const searchRoots = [...roots, document].filter(Boolean);
    for (const root of searchRoots) {
      for (const selector of selectors) {
        const node = root.querySelector(selector);
        const text = normalizeWhitespace(node && node.textContent ? node.textContent : "");
        if (text) {
          return { text, selector };
        }
      }
    }
    return { text: "", selector: null };
  }

  function detectExpandControls(root) {
    if (!root) return { present: false, expanded: null, controls: [] };
    const controls = Array.from(root.querySelectorAll("button, a, span, div[role='button']")).slice(0, 120);

    let present = false;
    let expanded = null;
    const detectedControls = [];
    for (const control of controls) {
      const text = normalizeWhitespace(control.textContent || "").toLowerCase();
      const ariaLabel = normalizeWhitespace(control.getAttribute ? control.getAttribute("aria-label") || "" : "").toLowerCase();
      const className = String(control.className || "").toLowerCase();
      const isMoreControl = text.includes("more")
        || text.includes("see more")
        || text.includes("read more")
        || ariaLabel.includes("more")
        || className.includes("show-more")
        || className.includes("show-more-less");

      if (!isMoreControl) continue;
      present = true;

      const ariaExpanded = control.getAttribute ? control.getAttribute("aria-expanded") : null;
      const inDescriptionRegion = Boolean(control.closest(
        ".jobs-description, .jobs-description__container, .jobs-description-content, .show-more-less-html, [data-test-job-description], .jobs-search__job-details--container, .jobs-search-two-pane__details, .job-view-layout, .jobs-details",
      ));
      const controlSignature = `${nodeSignature(control)}|${hashText(`${text}|${ariaLabel}|${className}`)}`;
      if (ariaExpanded === "true" || text.includes("show less")) {
        expanded = true;
      } else if ((ariaExpanded === "false" || text.includes("show more") || text.includes("read more")) && expanded !== true) {
        expanded = false;
      }
      detectedControls.push({
        control,
        text,
        ariaLabel,
        ariaExpanded,
        inDescriptionRegion,
        signature: controlSignature,
      });
    }

    return { present, expanded, controls: detectedControls };
  }

  function safeClickExpandControl(control) {
    if (!control || typeof control.click !== "function") return false;
    try {
      control.click();
      return true;
    } catch {
      return false;
    }
  }

  function maybeAutoExpandDescription(params) {
    const pageType = params.pageType;
    const currentJobId = params.currentJobId || "";
    const expandControls = params.expandControls;
    if (!expandControls || !expandControls.present || !Array.isArray(expandControls.controls)) {
      return { clicked: false, clickCount: 0, attempted: 0 };
    }

    const now = Date.now();
    const candidates = expandControls.controls.filter((entry) => {
      if (!entry || !entry.control || !entry.inDescriptionRegion) return false;
      if (!isVisible(entry.control)) return false;
      if (entry.ariaExpanded === "true") return false;

      const text = `${entry.text || ""} ${entry.ariaLabel || ""}`.toLowerCase();
      if (!(text.includes("show more") || text.includes("see more") || text.includes("read more") || text.includes("more"))) {
        return false;
      }

      const memoryKey = `${pageType}|${currentJobId}|${entry.signature}`;
      const lastClickedAt = autoExpandClickMemory.get(memoryKey) || 0;
      if (now - lastClickedAt < AUTO_EXPAND_COOLDOWN_MS) return false;

      entry.memoryKey = memoryKey;
      return true;
    });

    let clickCount = 0;
    for (const candidate of candidates) {
      if (clickCount >= MAX_AUTO_EXPAND_CLICKS) break;
      if (!safeClickExpandControl(candidate.control)) continue;
      clickCount += 1;
      if (candidate.memoryKey) {
        autoExpandClickMemory.set(candidate.memoryKey, now);
      }
    }

    return {
      clicked: clickCount > 0,
      clickCount,
      attempted: Math.min(MAX_AUTO_EXPAND_CLICKS, candidates.length),
    };
  }

  function findCurrentJobId() {
    const fromUrl = parseLinkedInJobIdFromString(`${location.pathname}${location.search}${location.hash}`);
    if (fromUrl) return fromUrl;

    const activeLinkSelectors = [
      "li.jobs-search-results__list-item--active a[href*='/jobs/view/']",
      "li.jobs-search-results-list__list-item--active a[href*='/jobs/view/']",
      "li[aria-current='true'] a[href*='/jobs/view/']",
      "a[aria-current='true'][href*='/jobs/view/']",
      "a.job-card-list__title--link[href*='/jobs/view/']",
      "a[href*='/jobs/view/'][aria-current='page']",
    ];

    for (const selector of activeLinkSelectors) {
      const node = document.querySelector(selector);
      const href = node && node.getAttribute ? node.getAttribute("href") : "";
      const parsed = parseLinkedInJobIdFromString(href);
      if (parsed) return parsed;
    }

    return "";
  }

  function pushAttempt(attempts, entry) {
    if (attempts.length >= STRATEGY_LOG_LIMIT) return;
    attempts.push(entry);
  }

  function pickBestTextCandidate(candidates) {
    let best = null;
    for (const candidate of candidates) {
      if (!candidate) continue;
      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
    return best;
  }

  function strategyStructured(panelRoot, pageType, attempts) {
    const aboutRootSelectors = pageType === "search_results_preview"
      ? [
        ".jobs-description",
        ".jobs-description__container",
        ".jobs-description-content",
        "[data-test-job-description]",
      ]
      : [
        ".jobs-description",
        ".jobs-description__container",
        ".jobs-description-content",
        ".jobs-box--fadein",
        "[data-test-job-description]",
        ".jobs-details",
      ];

    const bodySelectors = [
      ".jobs-description__container .jobs-description-content__text",
      ".jobs-description-content__text",
      ".jobs-description-content",
      ".jobs-description__content",
      ".show-more-less-html__markup",
      ".jobs-box__html-content",
      "[data-test-job-description]",
      "article",
    ];

    debugLog("description_strategy_attempt", { strategy: "structured" });
    const rootCandidates = [];
    for (const selector of aboutRootSelectors) {
      rootCandidates.push(...Array.from(panelRoot.querySelectorAll(selector)));
    }
    if (!rootCandidates.length) rootCandidates.push(panelRoot);

    const candidates = [];
    for (const root of rootCandidates) {
      if (!root || !isVisible(root)) continue;
      for (const selector of bodySelectors) {
        const nodes = Array.from(root.querySelectorAll(selector));
        for (const node of nodes) {
          if (!node || !isVisible(node)) continue;
          const rawText = normalizeWhitespace(node.textContent || "");
          const text = cleanDescriptionText(rawText);
          if (text.length < DESCRIPTION_MIN_CHARS) continue;
          const score = text.length + Math.min(text.split(/\n+/).length, 20) * 30;
          candidates.push({
            rawText,
            text,
            score,
            selectors: [selector],
            container: node,
            strategy: "structured",
          });
        }
      }
    }

    const best = pickBestTextCandidate(candidates);
    if (best) {
      debugLog("description_strategy_success", {
        strategy: "structured",
        description_length: best.text.length,
      });
      pushAttempt(attempts, { strategy: "structured", success: true, length: best.text.length });
      return best;
    }

    debugLog("description_strategy_failed", { strategy: "structured" });
    pushAttempt(attempts, { strategy: "structured", success: false, length: 0 });
    return null;
  }

  function strategyExpanded(panelRoot, attempts) {
    const selectors = [
      ".jobs-description-content__text--stretch",
      ".show-more-less-html__markup",
      ".jobs-description__content",
      ".jobs-description__container .jobs-box__html-content",
      ".jobs-details__main-content .jobs-box__html-content",
      "[class*='description'] [class*='markup']",
      "[class*='show-more']",
    ];

    debugLog("description_strategy_attempt", { strategy: "expanded_alternate" });
    const candidates = [];
    for (const selector of selectors) {
      const nodes = Array.from(panelRoot.querySelectorAll(selector));
      for (const node of nodes) {
        if (!node || !isVisible(node)) continue;
        const rawText = normalizeWhitespace(node.textContent || "");
        const text = cleanDescriptionText(rawText);
        if (text.length < DESCRIPTION_MIN_CHARS) continue;
        const score = text.length + 100;
        candidates.push({
          rawText,
          text,
          score,
          selectors: [selector],
          container: node,
          strategy: "expanded_alternate",
        });
      }
    }

    const best = pickBestTextCandidate(candidates);
    if (best) {
      debugLog("description_strategy_success", {
        strategy: "expanded_alternate",
        description_length: best.text.length,
      });
      pushAttempt(attempts, { strategy: "expanded_alternate", success: true, length: best.text.length });
      return best;
    }

    debugLog("description_strategy_failed", { strategy: "expanded_alternate" });
    pushAttempt(attempts, { strategy: "expanded_alternate", success: false, length: 0 });
    return null;
  }

  function strategySemantic(panelRoot, attempts) {
    const headingPattern = /(about the job|job details|description|responsibilities|what you'll do|about this role)/i;
    debugLog("description_strategy_attempt", { strategy: "semantic_section_scan" });

    const headingNodes = Array.from(panelRoot.querySelectorAll("h2, h3, h4, [role='heading'], strong, span"))
      .filter((node) => {
        const text = normalizeWhitespace(node.textContent || "");
        return headingPattern.test(text);
      });

    const candidates = [];
    for (const heading of headingNodes) {
      const container = heading.closest("section, article, div") || heading.parentElement;
      if (!container || !isVisible(container)) continue;

      const blockRawText = normalizeWhitespace(container.textContent || "");
      const blockText = cleanDescriptionText(blockRawText);
      if (blockText.length >= DESCRIPTION_MIN_CHARS) {
        candidates.push({
          rawText: blockRawText,
          text: blockText,
          score: blockText.length + 140,
          selectors: ["semantic_section_scan"],
          container,
          strategy: "semantic_section_scan",
        });
      }

      if (container.nextElementSibling && isVisible(container.nextElementSibling)) {
        const siblingRawText = normalizeWhitespace(container.nextElementSibling.textContent || "");
        const siblingText = cleanDescriptionText(siblingRawText);
        if (siblingText.length >= DESCRIPTION_MIN_CHARS) {
          candidates.push({
            rawText: siblingRawText,
            text: siblingText,
            score: siblingText.length + 120,
            selectors: ["semantic_section_sibling"],
            container: container.nextElementSibling,
            strategy: "semantic_section_scan",
          });
        }
      }
    }

    const best = pickBestTextCandidate(candidates);
    if (best) {
      debugLog("description_strategy_success", {
        strategy: "semantic_section_scan",
        description_length: best.text.length,
      });
      pushAttempt(attempts, { strategy: "semantic_section_scan", success: true, length: best.text.length });
      return best;
    }

    debugLog("description_strategy_failed", { strategy: "semantic_section_scan" });
    pushAttempt(attempts, { strategy: "semantic_section_scan", success: false, length: 0 });
    return null;
  }

  function strategyVisibleFallback(panelRoot, attempts) {
    debugLog("description_strategy_attempt", { strategy: "visible_block_fallback" });
    const candidates = [];
    const blocks = Array.from(panelRoot.querySelectorAll("section, article, div")).slice(0, 160);

    for (const block of blocks) {
      if (!block || !isVisible(block)) continue;
      if (hasNoiseClassHint(String(block.className || "")) || hasNoiseClassHint(String(block.id || ""))) continue;

      const rawText = normalizeWhitespace(block.textContent || "");
      const text = cleanDescriptionText(rawText);
      if (text.length < DESCRIPTION_MIN_CHARS) continue;

      const paragraphCount = text.split(/\n+/).length;
      const sentenceCount = (text.match(/[.!?]/g) || []).length;
      let score = text.length + Math.min(paragraphCount, 20) * 35 + Math.min(sentenceCount, 30) * 12;
      if (hasNoiseTextHint(text)) score -= 800;

      candidates.push({
        rawText,
        text,
        score,
        selectors: ["visible_block_fallback"],
        container: block,
        strategy: "visible_block_fallback",
      });
    }

    const best = pickBestTextCandidate(candidates);
    if (best) {
      debugLog("description_strategy_success", {
        strategy: "visible_block_fallback",
        description_length: best.text.length,
      });
      pushAttempt(attempts, { strategy: "visible_block_fallback", success: true, length: best.text.length });
      return best;
    }

    const rootText = cleanDescriptionText(panelRoot.textContent || "");
    if (rootText.length >= DESCRIPTION_MIN_CHARS && !hasNoiseTextHint(rootText)) {
      debugLog("description_strategy_success", {
        strategy: "visible_block_fallback_root",
        description_length: rootText.length,
      });
      pushAttempt(attempts, { strategy: "visible_block_fallback_root", success: true, length: rootText.length });
      return {
        rawText: normalizeWhitespace(panelRoot.textContent || ""),
        text: rootText,
        score: rootText.length,
        selectors: ["visible_block_fallback_root"],
        container: panelRoot,
        strategy: "visible_block_fallback",
      };
    }

    debugLog("description_strategy_failed", { strategy: "visible_block_fallback" });
    pushAttempt(attempts, { strategy: "visible_block_fallback", success: false, length: 0 });
    return null;
  }

  function resolveDescription(panelRoot, pageType) {
    const attempts = [];
    const strategies = [
      () => strategyStructured(panelRoot, pageType, attempts),
      () => strategyExpanded(panelRoot, attempts),
      () => strategySemantic(panelRoot, attempts),
      () => strategyVisibleFallback(panelRoot, attempts),
    ];

    for (const run of strategies) {
      const result = run();
      if (result && result.text) {
        return {
          rawText: result.rawText || "",
          text: result.text,
          strategy: result.strategy,
          selectors: result.selectors || [],
          containerSignature: nodeSignature(result.container),
          attempts,
        };
      }
    }

    return {
      rawText: "",
      text: "",
      strategy: null,
      selectors: [],
      containerSignature: "",
      attempts,
    };
  }

  function buildPreviewSignature(params) {
    const descriptionPrefix = (params.description || "").slice(0, 600).toLowerCase();
    return [
      params.currentJobId || "",
      (params.title || "").toLowerCase(),
      (params.company || "").toLowerCase(),
      descriptionPrefix,
    ].join("|");
  }

  const parser = function parseLinkedInJobPage() {
    const pageType = pageTypeFromPath();
    debugLog("page_type_detected", { page_type_detected: pageType, path: location.pathname });

    const panelRootResult = pickPanelRoot(pageType);
    const panelRoot = panelRootResult.node || document;
    const currentJobId = findCurrentJobId();
    debugLog("panel_root_found", {
      page_type: pageType,
      panelRootFound: panelRootResult.found,
      selector: panelRootResult.selector || null,
      current_job_id: currentJobId || null,
    });

    const title = queryText([
      "h1.job-details-jobs-unified-top-card__job-title",
      "h1.jobs-unified-top-card__job-title",
      ".job-details-jobs-unified-top-card__job-title",
      ".jobs-unified-top-card__job-title",
      "h1.t-24",
      "h1",
    ], [panelRoot]);

    const company = queryText([
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      ".jobs-unified-top-card__company-name a",
      ".jobs-unified-top-card__company-name",
      "a[href*='/company/']",
    ], [panelRoot]);

    const locationField = queryText([
      ".job-details-jobs-unified-top-card__primary-description-container",
      ".jobs-unified-top-card__primary-description-without-tagline",
      ".jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet",
    ], [panelRoot]);

    const loadingAtExtractionStart = Boolean(
      panelRoot.querySelector("[aria-busy='true'], .artdeco-loader, .jobs-search-two-pane__loading"),
    );
    const expandControlsBeforeExtraction = detectExpandControls(panelRoot);
    const autoExpandAttempt = maybeAutoExpandDescription({
      pageType,
      currentJobId,
      expandControls: expandControlsBeforeExtraction,
    });
    const expandControls = autoExpandAttempt.clicked
      ? detectExpandControls(panelRoot)
      : expandControlsBeforeExtraction;
    const descriptionResult = resolveDescription(panelRoot, pageType);
    const rawDescriptionText = normalizeWhitespace(descriptionResult.rawText || descriptionResult.text || "");
    const descriptionText = cleanDescriptionText(descriptionResult.text || rawDescriptionText);
    debugLog("description_length", {
      page_type: pageType,
      description_strategy: descriptionResult.strategy || "none",
      descriptionLength: descriptionText.length,
    });

    const canonicalJobUrl = currentJobId
      ? `https://www.linkedin.com/jobs/view/${currentJobId}`
      : location.href;

    const titleFromDoc = normalizeWhitespace(document.title.replace(/\s*\|\s*LinkedIn.*$/i, ""));
    const resolvedTitle = title.text || titleFromDoc;
    const resolvedCompany = company.text
      || normalizeWhitespace((document.querySelector("a[href*='/company/']") || {}).textContent || "");
    const resolvedLocation = locationField.text
      || normalizeWhitespace((document.querySelector(".topcard__flavor--bullet") || {}).textContent || "");

    const hasLoadingIndicators = Boolean(
      panelRoot.querySelector("[aria-busy='true'], .artdeco-loader, .jobs-search-two-pane__loading"),
    );
    const parserSelectorMiss = descriptionText.length === 0;

    const previewCompletenessRisk = hasLoadingIndicators
      || !panelRootResult.found
      || parserSelectorMiss
      || autoExpandAttempt.clicked;
    const previewNotReady = pageType === "search_results_preview"
      && Boolean(resolvedTitle)
      && previewCompletenessRisk
      && descriptionText.length < PREVIEW_NOT_READY_MAX_CHARS;

    const jdCollapsedLikely = expandControls.present
      && expandControls.expanded === false
      && descriptionText.length < JD_COLLAPSED_LIKELY_MAX_CHARS;

    const previewSignature = buildPreviewSignature({
      currentJobId,
      title: resolvedTitle,
      company: resolvedCompany,
      description: descriptionText,
    });

    const fieldSelectors = [title.selector, company.selector, locationField.selector].filter(Boolean);
    const descriptionSelectors = descriptionResult.selectors || [];
    const parserSelectors = [
      ...fieldSelectors,
      ...descriptionSelectors,
      panelRootResult.selector,
    ].filter(Boolean);

    const extractionMethod = descriptionResult.strategy === "visible_block_fallback"
      ? "fallback_text"
      : (descriptionResult.strategy ? "structured_dom" : "fallback_text");
    const jdAuditRecord = isLinkedInJdAuditEnabled()
      ? buildLinkedInJdAuditRecord({
        pageType,
        currentJobId,
        loadingAtStart: loadingAtExtractionStart,
        expandControls,
        moreExpandClickedByFlow: autoExpandAttempt.clicked,
        rawDescriptionText,
        normalizedDescriptionText: descriptionText,
        strategyAttempts: descriptionResult.attempts || [],
        descriptionStrategy: descriptionResult.strategy || null,
        detectedSelectors: parserSelectors,
        extractionMethod,
      })
      : null;

    debugLog("final_extraction_state", {
      page_type: pageType,
      panel_root_found: panelRootResult.found,
      description_strategy: descriptionResult.strategy || "none",
      description_length: descriptionText.length,
      preview_not_ready: previewNotReady,
      more_expand_clicked_by_flow: autoExpandAttempt.clicked,
      more_expand_click_count: autoExpandAttempt.clickCount,
      parser_selector_miss: parserSelectorMiss,
    });
    jdExtractionLog("linkedin_parser", {
      flow: "linkedin_parser_live",
      page_type: pageType,
      raw_jd_length: rawDescriptionText.length,
      normalized_jd_length: descriptionText.length,
      see_more_clicked: autoExpandAttempt.clicked,
      preview_not_ready_triggered: previewNotReady,
      job_description_collapsed_detected: jdCollapsedLikely,
      ready_for_analysis_candidate: !previewNotReady && !jdCollapsedLikely && descriptionText.length >= DESCRIPTION_MIN_CHARS,
      jd_preview_200: previewSnippet(descriptionText, 200),
    });
    if (jdAuditRecord && jdAuditRecord.audit_mode_enabled) {
      debugLog("jd_extraction_audit", jdAuditRecord);
    }

    return {
      platform: "linkedin",
      url: canonicalJobUrl,
      job_title: resolvedTitle,
      company_name: resolvedCompany,
      location: resolvedLocation,
      job_description_text: descriptionText,
      source_metadata: {
        extraction_method: extractionMethod,
        linkedin_surface: pageType === "search_results_preview" ? "search_results_preview" : "job_view",
        page_type: pageType,
        panel_root_found: panelRootResult.found,
        panel_root_selector: panelRootResult.selector || null,
        current_job_id: currentJobId || null,
        preview_signature: previewSignature,
        description_strategy: descriptionResult.strategy || null,
        description_strategy_attempts: descriptionResult.attempts || [],
        description_container_signature: descriptionResult.containerSignature || "",
        description_length: descriptionText.length,
        raw_description_length: rawDescriptionText.length,
        loading_when_extraction_started: loadingAtExtractionStart,
        parser_selector_miss: parserSelectorMiss,
        preview_not_ready: previewNotReady,
        jd_collapsed_likely: jdCollapsedLikely,
        expand_control_present: expandControls.present,
        expand_control_expanded: expandControls.expanded,
        more_expand_detected: expandControls.present,
        more_expand_clicked_by_flow: autoExpandAttempt.clicked,
        more_expand_click_count: autoExpandAttempt.clickCount,
        detected_selectors: parserSelectors,
        ...(jdAuditRecord ? { jd_extraction_audit: jdAuditRecord } : {}),
      },
    };
  };

  if (registry) {
    registry.register("linkedin", parser);
  } else {
    parsers.linkedin = parser;
  }
})();
