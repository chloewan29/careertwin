(function initCareerTwinDownloadService() {
  // Owns download endpoint call and browser download trigger.
  const ApiClient = globalThis.CareerTwinApiClient;

  async function triggerDownload(fileName, text) {
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          filename: fileName,
          url: `data:text/plain;charset=utf-8,${encodeURIComponent(text)}`,
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

  async function handleResumeDownload(payload) {
    const result = await ApiClient.downloadResume(payload || {});
    if (!result.ok) {
      return result;
    }

    await triggerDownload(result.data.file_name || "tailored-resume.txt", result.data.resume_text || "");
    return {
      ok: true,
      data: {
        applied_recorded: Boolean(result.data.applied_recorded),
        match_score: result.data.match_score,
      },
    };
  }

  globalThis.CareerTwinDownloadService = {
    handleResumeDownload,
  };
})();
