(function initSeekParser() {
  // Owns Seek DOM extraction selectors and payload shaping.
  const registry = globalThis.CareerTwinParserRegistry;
  const parsers = globalThis.CareerTwinPlatformParsers = globalThis.CareerTwinPlatformParsers || {};

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = (node && node.textContent ? node.textContent : "").trim();
      if (text) return { text, selector };
    }
    return { text: "", selector: null };
  }

  function mergeText(selectors) {
    const chunks = [];
    const usedSelectors = [];
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      if (nodes.length === 0) continue;
      usedSelectors.push(selector);
      for (const node of nodes) {
        const text = (node.textContent || "").trim();
        if (text && !chunks.includes(text)) chunks.push(text);
      }
    }
    return {
      text: chunks.join("\n\n").trim(),
      selectors: usedSelectors,
    };
  }

  const parser = function parseSeekJobPage() {
    const title = textFromSelectors([
      "[data-automation='job-detail-title']",
      "h1",
    ]);
    const company = textFromSelectors([
      "[data-automation='advertiser-name']",
      "a[data-automation='company-link']",
    ]);
    const location = textFromSelectors([
      "[data-automation='job-detail-location']",
      "[data-automation='job-detail-work-type']",
    ]);
    const description = mergeText([
      "[data-automation='jobAdDetails']",
      "[data-automation='jobDescription']",
      "[data-automation='job-details']",
    ]);

    return {
      platform: "seek",
      job_title: title.text || "",
      company_name: company.text || "",
      location: location.text || "",
      job_description_text: description.text || "",
      source_metadata: {
        extraction_method: "structured_dom",
        detected_selectors: [
          title.selector,
          company.selector,
          location.selector,
          ...description.selectors,
        ].filter(Boolean),
      },
    };
  };

  if (registry) {
    registry.register("seek", parser);
  } else {
    parsers.seek = parser;
  }
})();
