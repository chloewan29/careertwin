(function initDetectJobPage() {
  // Owns platform detection and supported job-page heuristics.
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
    const path = normalizePath(url.pathname);
    const jobId = parseLinkedInJobIdFromString(`${url.pathname}${url.search}${url.hash}`);

    if (/^\/jobs\/view\/\d+/.test(path)) {
      return { is_job_page: true, platform: "linkedin", reason: "linkedin_job_detail", current_job_id: jobId || null };
    }

    const isSearchSurface = path.startsWith("/jobs/search") || path.startsWith("/jobs/search-results");
    if (!isSearchSurface) {
      return { is_job_page: false, platform: "linkedin", reason: "linkedin_not_job_surface" };
    }

    if (jobId || hasLinkedInPreviewSurface()) {
      return {
        is_job_page: true,
        platform: "linkedin",
        reason: jobId ? "linkedin_search_current_job" : "linkedin_search_preview",
        current_job_id: jobId || null,
      };
    }

    return { is_job_page: false, platform: "linkedin", reason: "linkedin_search_no_preview" };
  }

  function detectJobPage(urlLike) {
    try {
      const url = new URL(urlLike);
      const hostname = url.hostname.toLowerCase();
      const path = normalizePath(url.pathname);

      if (hostname === "www.linkedin.com") {
        return detectLinkedInPage(url);
      }

      if (hostname === "www.seek.com.au" && /^\/job\/\d+/.test(path)) {
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
