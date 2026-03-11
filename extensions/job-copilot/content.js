(function () {
  if (window.top !== window.self) return;

  const PANEL_ROOT_ID = "careertwin-job-copilot-root";
  const PANEL_STYLE_ID = "careertwin-job-copilot-style";
  const PANEL_WIDTH = 340;
  const DEBOUNCE_MS = 800;

  let panelRoot = null;
  let lastJobSignature = "";
  let inFlight = false;
  let debounceTimer = null;
  let latestAnalysis = null;

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(response);
      });
    });
  }

  function textFromSelectors(selectors) {
    for (const selector of selectors) {
      const node = document.querySelector(selector);
      const text = node && node.innerText ? node.innerText.trim() : "";
      if (text) return text;
    }
    return "";
  }

  function mergeTextFromSelectors(selectors) {
    const chunks = [];
    for (const selector of selectors) {
      const nodes = Array.from(document.querySelectorAll(selector));
      for (const node of nodes) {
        const text = node.innerText ? node.innerText.trim() : "";
        if (text && !chunks.includes(text)) chunks.push(text);
      }
    }
    return chunks.join("\n\n").trim();
  }

  function normalizeWhitespace(text) {
    return (text || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .replace(/[ \t]{2,}/g, " ")
      .trim();
  }

  function isLinkedInJobDetailPage() {
    return location.hostname === "www.linkedin.com" && /^\/jobs\/view\/\d+/.test(location.pathname);
  }

  function isSeekJobDetailPage() {
    return location.hostname === "www.seek.com.au" && /\/job\/\d+/.test(location.pathname);
  }

  function detectSupportedPage() {
    if (isLinkedInJobDetailPage()) return "linkedin";
    if (isSeekJobDetailPage()) return "seek";
    return null;
  }

  function extractLinkedInJob() {
    const title = textFromSelectors([
      "h1.t-24",
      "h1.job-details-jobs-unified-top-card__job-title",
      "h1.top-card-layout__title",
    ]);
    const company = textFromSelectors([
      ".job-details-jobs-unified-top-card__company-name a",
      ".job-details-jobs-unified-top-card__company-name",
      "a.topcard__org-name-link",
    ]);
    const locationText = textFromSelectors([
      ".job-details-jobs-unified-top-card__bullet",
      ".topcard__flavor--bullet",
    ]);
    const description = mergeTextFromSelectors([
      ".jobs-description__container .jobs-description-content__text",
      ".jobs-box__html-content",
      ".show-more-less-html__markup",
    ]);

    return {
      sourcePlatform: "linkedin",
      jobUrl: location.href,
      jobTitle: normalizeWhitespace(title),
      company: normalizeWhitespace(company),
      location: normalizeWhitespace(locationText),
      jobDescription: normalizeWhitespace(description),
    };
  }

  function extractSeekJob() {
    const title = textFromSelectors([
      "[data-automation='job-detail-title']",
      "h1",
    ]);
    const company = textFromSelectors([
      "[data-automation='advertiser-name']",
      "a[data-automation='company-link']",
    ]);
    const locationText = textFromSelectors([
      "[data-automation='job-detail-location']",
      "[data-automation='job-detail-work-type']",
    ]);
    const description = mergeTextFromSelectors([
      "[data-automation='jobAdDetails']",
      "[data-automation='jobDescription']",
    ]);

    return {
      sourcePlatform: "seek",
      jobUrl: location.href,
      jobTitle: normalizeWhitespace(title),
      company: normalizeWhitespace(company),
      location: normalizeWhitespace(locationText),
      jobDescription: normalizeWhitespace(description),
    };
  }

  function extractJobDetails(source) {
    if (source === "linkedin") return extractLinkedInJob();
    if (source === "seek") return extractSeekJob();
    return null;
  }

  function shouldAnalyze(job) {
    if (!job) return { ok: false, reason: "This page is not supported yet" };
    if (!job.jobTitle) return { ok: false, reason: "We couldn't read this job clearly" };
    if (!job.jobDescription || job.jobDescription.length < 120) {
      return { ok: false, reason: "We couldn't read this job clearly" };
    }
    return { ok: true };
  }

  function ensurePanelRoot() {
    if (panelRoot && document.body.contains(panelRoot)) return panelRoot;

    panelRoot = document.getElementById(PANEL_ROOT_ID);
    if (!panelRoot) {
      panelRoot = document.createElement("div");
      panelRoot.id = PANEL_ROOT_ID;
      panelRoot.className = "ctjc-root";
      document.body.appendChild(panelRoot);
    }

    if (!document.getElementById(PANEL_STYLE_ID)) {
      const link = document.createElement("link");
      link.id = PANEL_STYLE_ID;
      link.rel = "stylesheet";
      link.href = chrome.runtime.getURL("panel.css");
      document.head.appendChild(link);
    }

    if (!document.body.dataset.ctjcPadApplied) {
      const currentPadding = parseInt(getComputedStyle(document.body).paddingRight || "0", 10);
      document.body.style.paddingRight = `${currentPadding + PANEL_WIDTH}px`;
      document.body.dataset.ctjcPadApplied = "1";
    }

    return panelRoot;
  }

  function teardownPanel() {
    if (panelRoot && panelRoot.parentNode) {
      panelRoot.parentNode.removeChild(panelRoot);
    }
    panelRoot = null;
    const styleEl = document.getElementById(PANEL_STYLE_ID);
    if (styleEl && styleEl.parentNode) {
      styleEl.parentNode.removeChild(styleEl);
    }
    if (document.body.dataset.ctjcPadApplied) {
      const currentPadding = parseInt(getComputedStyle(document.body).paddingRight || "0", 10);
      document.body.style.paddingRight = `${Math.max(0, currentPadding - PANEL_WIDTH)}px`;
      delete document.body.dataset.ctjcPadApplied;
    }
  }

  function renderShell(innerHtml) {
    const root = ensurePanelRoot();
    root.innerHTML = `
      <aside class="ctjc-panel">
        <header class="ctjc-header">
          <div class="ctjc-brand">CareerTwin</div>
          <div class="ctjc-title">Job Copilot</div>
        </header>
        <div class="ctjc-content">
          ${innerHtml}
        </div>
      </aside>
    `;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderList(items, emptyText, className) {
    if (!items || items.length === 0) {
      return `<li class="${className}-empty">${escapeHtml(emptyText)}</li>`;
    }
    return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderEvidenceItems(items) {
    const normalized = Array.isArray(items) ? items.slice(0, 4) : [];
    if (normalized.length === 0) {
      return `<li class="ctjc-list-empty">No evidence available yet.</li>`;
    }
    return normalized
      .map((item) => `<li><span class="ctjc-chip">Evidence</span>${escapeHtml(item.label)}</li>`)
      .join("");
  }

  function renderLoading() {
    renderShell(`
      <div class="ctjc-loading">
        <div class="ctjc-spinner"></div>
        <p>Analyzing your fit...</p>
      </div>
    `);
  }

  function renderInfo(message) {
    renderShell(`
      <div class="ctjc-info">
        <p>${escapeHtml(message)}</p>
      </div>
    `);
  }

  function renderError(message, retryable) {
    renderShell(`
      <div class="ctjc-error">
        <p>${escapeHtml(message)}</p>
        <p class="ctjc-error-hint">Please try again.</p>
        ${retryable ? `<button id="ctjc-retry-btn" class="ctjc-button">Retry</button>` : ""}
      </div>
    `);
    if (retryable) {
      const button = document.getElementById("ctjc-retry-btn");
      if (button) {
        button.addEventListener("click", () => analyzeCurrentPage(true));
      }
    }
  }

  function verdictSentence(verdict) {
    if (verdict === "strong_fit") return "You are a strong fit for this role";
    if (verdict === "possible_fit") return "You could be a fit for this role";
    if (verdict === "stretch") return "This role may be a stretch";
    return "This role is likely not a strong fit";
  }

  function showToast(message) {
    const root = ensurePanelRoot();
    const toast = document.createElement("div");
    toast.className = "ctjc-toast";
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => {
      toast.classList.add("ctjc-toast-visible");
    }, 20);
    setTimeout(() => {
      toast.classList.remove("ctjc-toast-visible");
      setTimeout(() => toast.remove(), 220);
    }, 1700);
  }

  function renderResult(payload, job) {
    latestAnalysis = { payload, job };
    const copilot = payload.response;
    const verdictClass = `ctjc-verdict-${copilot.verdict}`;
    const isLowFit = Number(copilot.matchScore) < 50;
    const canDownload = Boolean(copilot.resume && copilot.resume.ready);

    renderShell(`
      <section class="ctjc-section">
        <div class="ctjc-verdict-row">
          <span class="ctjc-verdict ${verdictClass}">${escapeHtml(copilot.verdictText || verdictSentence(copilot.verdict))}</span>
          <span class="ctjc-score">${escapeHtml(`${copilot.matchScore}%`)}</span>
        </div>
      </section>

      ${isLowFit ? "" : `
        <section class="ctjc-section">
          <h3>Why you match</h3>
          <ul class="ctjc-list">${renderList(copilot.matchedCapabilities.slice(0, 4), "No aligned capabilities yet.", "ctjc-list")}</ul>
        </section>
      `}

      <section class="ctjc-section">
        <h3>Key gaps</h3>
        <ul class="ctjc-list">${renderList(copilot.keyGaps, "No major gaps detected.", "ctjc-list")}</ul>
      </section>

      ${isLowFit ? "" : `
        <section class="ctjc-section">
          <h3>Top evidence used</h3>
          <ul class="ctjc-list">${renderEvidenceItems(copilot.topEvidence)}</ul>
        </section>

        ${copilot.resume && copilot.resume.ready ? `
          <section class="ctjc-section ctjc-resume-section">
            <h3>Tailored resume ready</h3>
            <button id="ctjc-download-btn" class="ctjc-button">
              Download Resume
            </button>
          </section>
        ` : ""}
      `}

      ${copilot.diagnostics && copilot.diagnostics.weakJobSignals ? `
        <section class="ctjc-section">
          <p>This role description is limited, so confidence is lower.</p>
        </section>
      ` : ""}
    `);

    const downloadBtn = document.getElementById("ctjc-download-btn");
    if (downloadBtn && canDownload) {
      downloadBtn.addEventListener("click", handleDownloadClick);
    }
  }

  async function handleDownloadClick() {
    if (!latestAnalysis) return;
    const btn = document.getElementById("ctjc-download-btn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Preparing resume...";
    }

    try {
      const response = await sendMessage({
        type: "JOB_COPILOT_DOWNLOAD_RESUME",
        payload: {
          jobId: latestAnalysis.payload.job.jobId,
          jobSnapshotId: latestAnalysis.payload.job.jobSnapshotId,
          sourcePlatform: latestAnalysis.job.sourcePlatform,
          jobTitle: latestAnalysis.job.jobTitle,
          company: latestAnalysis.job.company,
          location: latestAnalysis.job.location,
          jobUrl: latestAnalysis.job.jobUrl,
          jobDescriptionSnapshot: latestAnalysis.job.jobDescription,
          matchScore: latestAnalysis.payload.response.matchScore,
          verdict: latestAnalysis.payload.response.verdict,
          selectedEvidenceIds: Array.isArray(latestAnalysis.payload.job.selectedEvidenceIds)
            ? latestAnalysis.payload.job.selectedEvidenceIds
            : [],
        },
      });

      if (!response || !response.ok) {
        throw new Error((response && response.error) || "Failed to download tailored resume.");
      }

      showToast("Saved to pipeline");
      renderResult(latestAnalysis.payload, latestAnalysis.job);
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Failed to download resume.", false);
      setTimeout(() => {
        if (latestAnalysis) renderResult(latestAnalysis.payload, latestAnalysis.job);
      }, 2000);
    }
  }

  function signatureForJob(job) {
    return `${job.sourcePlatform}|${job.jobUrl}|${job.jobTitle}|${job.company}|${job.jobDescription.slice(0, 180)}`;
  }

  async function analyzeCurrentPage(force) {
    const source = detectSupportedPage();
    if (!source) {
      teardownPanel();
      return;
    }

    const job = extractJobDetails(source);
    const readiness = shouldAnalyze(job);
    if (!readiness.ok) {
      renderInfo(readiness.reason);
      return;
    }

    const signature = signatureForJob(job);
    if (!force && signature === lastJobSignature) return;
    if (inFlight) return;

    inFlight = true;
    renderLoading();

    try {
      const response = await sendMessage({
        type: "JOB_COPILOT_ANALYZE",
        payload: job,
      });

      if (!response || !response.ok) {
        const errorCode = response && response.code ? String(response.code) : "";
        if (errorCode === "missing_profile_id") {
          renderInfo("Set your Profile ID in extension settings.");
        } else {
          renderError((response && response.error) || "Something went wrong while analyzing this role", true);
        }
        return;
      }

      lastJobSignature = signature;
      renderResult(response.data, job);
    } catch (error) {
      renderError(error instanceof Error ? error.message : "Something went wrong while analyzing this role", true);
    } finally {
      inFlight = false;
    }
  }

  function scheduleAnalyze() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => analyzeCurrentPage(false), DEBOUNCE_MS);
  }

  function bootstrap() {
    const source = detectSupportedPage();
    if (!source) {
      teardownPanel();
      return;
    }
    renderInfo("Opening Job Copilot...");
    scheduleAnalyze();

    const observer = new MutationObserver(() => {
      scheduleAnalyze();
    });
    observer.observe(document.documentElement || document.body, {
      subtree: true,
      childList: true,
      attributes: false,
    });

    let previousUrl = location.href;
    setInterval(() => {
      if (location.href !== previousUrl) {
        previousUrl = location.href;
        lastJobSignature = "";
        latestAnalysis = null;
        const nextSource = detectSupportedPage();
        if (nextSource) {
          renderInfo("New job detected. Reviewing...");
          scheduleAnalyze();
        } else {
          teardownPanel();
        }
      }
    }, 1200);
  }

  bootstrap();
})();
