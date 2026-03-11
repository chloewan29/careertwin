const DEFAULT_API_BASE_URL = "http://localhost:3000";
const DEFAULT_TOP_EVIDENCE_LIMIT = 4;

function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(
      {
        apiBaseUrl: DEFAULT_API_BASE_URL,
        profileId: "",
      },
      (items) => resolve(items),
    );
  });
}

function sendJson(url, payload) {
  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

function toDataUrl(text) {
  return `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`;
}

function triggerDownload(fileName, text) {
  return new Promise((resolve, reject) => {
    chrome.downloads.download(
      {
        filename: fileName,
        url: toDataUrl(text),
        saveAs: false,
        conflictAction: "uniquify",
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(downloadId);
      },
    );
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  (async () => {
    try {
      const settings = await getSettings();
      const profileId = settings.profileId ? String(settings.profileId).trim() : "";
      const apiBaseUrl = String(settings.apiBaseUrl || DEFAULT_API_BASE_URL).replace(/\/+$/, "");

      if (!profileId) {
        sendResponse({
          ok: false,
          error: "Profile ID missing. Configure it in extension settings.",
          code: "missing_profile_id",
        });
        return;
      }

      if (message.type === "JOB_COPILOT_ANALYZE") {
        const response = await sendJson(
          `${apiBaseUrl}/api/job-copilot/extension/run`,
          {
            profileId,
            extractedJob: {
              sourcePlatform: message.payload.sourcePlatform,
              jobUrl: message.payload.jobUrl,
              jobTitle: message.payload.jobTitle,
              company: message.payload.company,
              location: message.payload.location,
              jobDescription: message.payload.jobDescription,
            },
            topEvidenceLimit: DEFAULT_TOP_EVIDENCE_LIMIT,
          },
        );
        const data = await response.json();
        if (!response.ok) {
          sendResponse({
            ok: false,
            error: data?.error || "Analyze request failed.",
            code: data?.code || "analyze_failed",
          });
          return;
        }
        sendResponse({ ok: true, data });
        return;
      }

      if (message.type === "JOB_COPILOT_DOWNLOAD_RESUME") {
        const response = await sendJson(
          `${apiBaseUrl}/api/job-copilot/extension/download-resume`,
          {
            profileId,
            jobId: message.payload.jobId,
            jobSnapshotId: message.payload.jobSnapshotId,
            sourcePlatform: message.payload.sourcePlatform,
            jobTitle: message.payload.jobTitle,
            company: message.payload.company,
            location: message.payload.location,
            jobUrl: message.payload.jobUrl,
            jobDescriptionSnapshot: message.payload.jobDescriptionSnapshot,
            matchScore: message.payload.matchScore,
            verdict: message.payload.verdict,
            selectedEvidenceIds: message.payload.selectedEvidenceIds,
          },
        );
        const data = await response.json();
        if (!response.ok) {
          sendResponse({
            ok: false,
            error: data?.error || "Resume download request failed.",
            code: data?.code || "download_failed",
          });
          return;
        }

        await triggerDownload(data.file_name || "tailored-resume.txt", data.resume_text || "");
        sendResponse({
          ok: true,
          data: {
            applied_recorded: Boolean(data.applied_recorded),
            match_score: data.match_score,
          },
        });
      }
    } catch (error) {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown extension error",
        code: "runtime_error",
      });
    }
  })();

  return true;
});
