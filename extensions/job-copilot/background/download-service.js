(function initCareerTwinDownloadService() {
  // Owns download endpoint call and browser download trigger.
  const ApiClient = globalThis.CareerTwinApiClient;
  const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const DOCX_MIN_BYTE_LENGTH = 512;

  function decodeBase64ToBytes(base64) {
    if (typeof base64 !== "string" || !base64.trim()) {
      return { ok: false, reason: "missing_docx_payload" };
    }
    const normalized = base64.replace(/\s+/g, "");
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 !== 0) {
      return { ok: false, reason: "invalid_base64_docx_payload" };
    }
    try {
      if (typeof atob === "function") {
        const binary = atob(normalized);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return { ok: true, bytes };
      }
      if (typeof Buffer !== "undefined") {
        const buffer = Buffer.from(normalized, "base64");
        return { ok: true, bytes: new Uint8Array(buffer) };
      }
    } catch (_error) {
    }
    return { ok: false, reason: "invalid_base64_docx_payload" };
  }

  function buildDocxIntegrityDiagnostics(data) {
    const mimeType = data && typeof data.mime_type === "string" ? data.mime_type : null;
    const fileName = data && typeof data.file_name === "string" ? data.file_name : null;
    const decoded = decodeBase64ToBytes(data && data.file_base64);
    const bytes = decoded.ok ? decoded.bytes : null;
    const magicBytes = bytes && bytes.length >= 2
      ? String.fromCharCode(bytes[0], bytes[1])
      : null;
    const diagnostics = {
      docx_payload_integrity_checked: true,
      docx_payload_integrity_passed: false,
      docx_payload_integrity_failure_reason: null,
      docx_payload_decoded_byte_length: bytes ? bytes.length : 0,
      docx_payload_magic_bytes: magicBytes,
      docx_payload_mime_type: mimeType,
      docx_payload_filename: fileName,
      docx_download_blocked_before_save: false,
      docx_downloader_false_success_prevented: false,
    };

    if (!decoded.ok) {
      diagnostics.docx_payload_integrity_failure_reason = decoded.reason;
      diagnostics.docx_download_blocked_before_save = true;
      diagnostics.docx_downloader_false_success_prevented = true;
      return diagnostics;
    }
    if (bytes.length < DOCX_MIN_BYTE_LENGTH) {
      diagnostics.docx_payload_integrity_failure_reason = "decoded_docx_too_small";
      diagnostics.docx_download_blocked_before_save = true;
      diagnostics.docx_downloader_false_success_prevented = true;
      return diagnostics;
    }
    if (magicBytes !== "PK") {
      diagnostics.docx_payload_integrity_failure_reason = "docx_magic_bytes_missing";
      diagnostics.docx_download_blocked_before_save = true;
      diagnostics.docx_downloader_false_success_prevented = true;
      return diagnostics;
    }
    if (mimeType !== DOCX_MIME_TYPE) {
      diagnostics.docx_payload_integrity_failure_reason = "docx_mime_type_mismatch";
      diagnostics.docx_download_blocked_before_save = true;
      diagnostics.docx_downloader_false_success_prevented = true;
      return diagnostics;
    }
    if (typeof fileName !== "string" || !/\.docx$/i.test(fileName.trim())) {
      diagnostics.docx_payload_integrity_failure_reason = "docx_filename_extension_mismatch";
      diagnostics.docx_download_blocked_before_save = true;
      diagnostics.docx_downloader_false_success_prevented = true;
      return diagnostics;
    }

    diagnostics.docx_payload_integrity_passed = true;
    return diagnostics;
  }

  async function triggerDownload(params) {
    const { fileName, mimeType, text, base64 } = params;
    const url = mimeType === DOCX_MIME_TYPE
      ? `data:${mimeType};base64,${base64 || ""}`
      : `data:text/plain;charset=utf-8,${encodeURIComponent(text || "")}`;
    return new Promise((resolve, reject) => {
      chrome.downloads.download(
        {
          filename: fileName,
          url,
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

    const hasDocxPayload = typeof result.data.file_base64 === "string" && result.data.file_base64.trim().length > 0;
    const hasDocxFileName = typeof result.data.file_name === "string" && /\.docx$/i.test(result.data.file_name.trim());
    const shouldHandleDocx = result.data.export_format === "docx"
      || result.data.mime_type === DOCX_MIME_TYPE
      || hasDocxPayload
      || hasDocxFileName;

    if (shouldHandleDocx) {
      const diagnostics = buildDocxIntegrityDiagnostics(result.data);
      if (!diagnostics.docx_payload_integrity_passed) {
        return {
          ok: false,
          error: `DOCX payload integrity check failed (${diagnostics.docx_payload_integrity_failure_reason}).`,
          code: diagnostics.docx_payload_integrity_failure_reason,
          diagnostics,
        };
      }
      await triggerDownload({
        fileName: result.data.file_name,
        mimeType: result.data.mime_type,
        base64: result.data.file_base64,
      });
    } else {
      await triggerDownload({
        fileName: result.data.file_name || "tailored-resume.txt",
        mimeType: result.data.mime_type || "text/plain",
        text: result.data.resume_text || "",
      });
    }
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
