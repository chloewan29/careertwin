(function initGenericParser() {
  // Owns generic fallback extraction for job-like pages.
  const registry = globalThis.CareerTwinParserRegistry;
  const parsers = globalThis.CareerTwinPlatformParsers = globalThis.CareerTwinPlatformParsers || {};

  function normalizeText(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function scoreBlock(text) {
    const normalized = normalizeText(text);
    if (!normalized) return 0;
    const words = normalized.split(/\s+/).length;
    const hasBullet = /\n\s*[-*�]/.test(normalized);
    const hasRequirementWords = /\b(requirements?|responsibilit(?:y|ies)|qualifications?|experience|skills?)\b/i.test(normalized);
    return words + (hasBullet ? 35 : 0) + (hasRequirementWords ? 45 : 0);
  }

  function pruneBoilerplate(text) {
    const lines = normalizeText(text).split(/\n+/);
    const pruned = lines.filter((line) => {
      const value = line.trim();
      if (!value) return false;
      if (/^(privacy|cookies?|terms|equal opportunity|about us|sign in|apply now)$/i.test(value)) return false;
      return true;
    });
    return pruned.join("\n");
  }

  const parser = function parseGenericJobPage() {
    const title = normalizeText(
      (document.querySelector("h1") && document.querySelector("h1").textContent) ||
      (document.querySelector("title") && document.querySelector("title").textContent) ||
      "",
    );

    const candidateSelectors = [
      "main",
      "article",
      "[role='main']",
      ".job-description",
      ".description",
      ".posting-description",
      "#job-description",
      "#content",
    ];

    let bestText = "";
    let bestSelector = "";
    for (const selector of candidateSelectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        const text = pruneBoilerplate(node.textContent || "");
        if (scoreBlock(text) > scoreBlock(bestText)) {
          bestText = text;
          bestSelector = selector;
        }
      }
    }

    return {
      platform: "generic",
      job_title: title,
      company_name: "",
      location: "",
      job_description_text: bestText,
      source_metadata: {
        extraction_method: "fallback_text",
        detected_selectors: bestSelector ? [bestSelector] : [],
      },
    };
  };

  if (registry) {
    registry.register("generic", parser);
  } else {
    parsers.generic = parser;
  }
})();
