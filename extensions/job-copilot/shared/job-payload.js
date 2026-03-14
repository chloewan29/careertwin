(function initCareerTwinJobPayloadHelpers() {
  // Shared payload normalization helpers for content extraction and background caching.
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

  function extractCurrentJobId(payload) {
    return payload
      && payload.source_metadata
      && typeof payload.source_metadata.current_job_id === "string"
      ? payload.source_metadata.current_job_id
      : "";
  }

  function buildAnalysisKey(payload) {
    const currentJobId = extractCurrentJobId(payload);
    const previewSignature = payload
      && payload.source_metadata
      && typeof payload.source_metadata.preview_signature === "string"
      ? payload.source_metadata.preview_signature
      : "";

    return [
      normalizeString(payload && payload.url),
      normalizeString(currentJobId),
      normalizeString(payload && payload.job_title),
      normalizeString(payload && payload.company_name),
      hashText(payload && payload.job_description_text),
      hashText(previewSignature),
    ].join("|");
  }

  function summarizePayload(payload) {
    return {
      platform: payload.platform,
      url: payload.url,
      title: payload.job_title || "",
      company: payload.company_name || "",
      location: payload.location || "",
      current_job_id: extractCurrentJobId(payload) || "",
      jd_length: (payload.job_description_text || "").length,
      extraction_method: payload.source_metadata ? payload.source_metadata.extraction_method : "unknown",
    };
  }

  function signatureFromPayload(payload) {
    const currentJobId = extractCurrentJobId(payload);
    const descriptionHash = hashText(payload && payload.job_description_text);
    const previewSignature = payload
      && payload.source_metadata
      && typeof payload.source_metadata.preview_signature === "string"
      ? payload.source_metadata.preview_signature
      : "";

    return [
      payload.url || "",
      payload.platform || "",
      currentJobId,
      (payload.job_title || "").toLowerCase(),
      (payload.company_name || "").toLowerCase(),
      descriptionHash,
      hashText(previewSignature),
    ].join("|");
  }

  globalThis.CareerTwinJobPayload = {
    normalizeString,
    hashText,
    buildAnalysisKey,
    summarizePayload,
    signatureFromPayload,
  };
})();
