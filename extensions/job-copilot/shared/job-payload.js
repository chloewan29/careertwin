(function initCareerTwinJobPayloadHelpers() {
  // Shared payload normalization helpers for content extraction and background caching.
  const ANALYSIS_KEY_VERSION = "rc_visibility_v1_20260319";

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

  function normalizeUrlForKey(urlLike) {
    try {
      const parsed = new URL(String(urlLike || ""));
      parsed.hash = "";
      const dropKeys = ["tracking", "token", "type", "ref", "origin"];
      dropKeys.forEach((key) => parsed.searchParams.delete(key));
      return parsed.toString().replace(/\/+$/, "");
    } catch {
      return String(urlLike || "").trim();
    }
  }

  function extractCurrentJobId(payload) {
    return payload
      && payload.source_metadata
      && typeof payload.source_metadata.current_job_id === "string"
      ? payload.source_metadata.current_job_id
      : "";
  }

  function extractExternalJobId(payload) {
    if (
      payload
      && payload.source_metadata
      && typeof payload.source_metadata.external_job_id === "string"
      && payload.source_metadata.external_job_id.trim()
    ) {
      return payload.source_metadata.external_job_id.trim();
    }
    return extractCurrentJobId(payload);
  }

  function extractAdapterStableJobKey(payload) {
    if (
      payload
      && payload.source_metadata
      && typeof payload.source_metadata.stable_job_key === "string"
      && payload.source_metadata.stable_job_key.trim()
    ) {
      return payload.source_metadata.stable_job_key.trim();
    }
    return "";
  }

  function buildSeekStableJobKey(payload) {
    const adapterStableJobKey = extractAdapterStableJobKey(payload);
    if (adapterStableJobKey && adapterStableJobKey.startsWith("seek|")) {
      return adapterStableJobKey;
    }

    const externalJobId = extractExternalJobId(payload);
    if (externalJobId) return `seek|id:${externalJobId}`;

    const normalizedUrl = normalizeUrlForKey(payload && payload.url);
    const previewHash = hashText([
      normalizedUrl,
      normalizeString(payload && payload.job_title),
      normalizeString(payload && payload.company_name),
      String(payload && payload.job_description_text || "").slice(0, 1200),
    ].join("|"));
    if (previewHash !== "0") return `seek|preview:${previewHash}`;
    return `seek|url:${normalizedUrl}`;
  }

  function buildLinkedInStableJobKey(payload) {
    const currentJobId = extractCurrentJobId(payload);
    const previewSignature = payload
      && payload.source_metadata
      && typeof payload.source_metadata.preview_signature === "string"
      ? payload.source_metadata.preview_signature
      : "";
    return [
      ANALYSIS_KEY_VERSION,
      normalizeString(payload && payload.url),
      normalizeString(currentJobId),
      normalizeString(payload && payload.job_title),
      normalizeString(payload && payload.company_name),
      hashText(payload && payload.job_description_text),
      hashText(previewSignature),
    ].join("|");
  }

  function buildAnalysisKey(payload) {
    const source = String(payload && payload.platform || "").toLowerCase();
    if (source === "seek") {
      return `${ANALYSIS_KEY_VERSION}|${buildSeekStableJobKey(payload)}`;
    }
    if (source === "linkedin") {
      return buildLinkedInStableJobKey(payload);
    }
    return [
      ANALYSIS_KEY_VERSION,
      normalizeString(payload && payload.url),
      normalizeString(payload && payload.job_title),
      normalizeString(payload && payload.company_name),
      hashText(payload && payload.job_description_text),
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
    const source = String(payload && payload.platform || "").toLowerCase();
    const descriptionHash = hashText(payload && payload.job_description_text);
    if (source === "seek") {
      return [
        ANALYSIS_KEY_VERSION,
        buildSeekStableJobKey(payload),
        descriptionHash,
      ].join("|");
    }
    if (source === "linkedin") {
      const currentJobId = extractCurrentJobId(payload);
      const previewSignature = payload
        && payload.source_metadata
        && typeof payload.source_metadata.preview_signature === "string"
        ? payload.source_metadata.preview_signature
        : "";

      return [
        ANALYSIS_KEY_VERSION,
        payload.url || "",
        payload.platform || "",
        currentJobId,
        (payload.job_title || "").toLowerCase(),
        (payload.company_name || "").toLowerCase(),
        descriptionHash,
        hashText(previewSignature),
      ].join("|");
    }
    return [
      ANALYSIS_KEY_VERSION,
      payload.url || "",
      payload.platform || "",
      (payload.job_title || "").toLowerCase(),
      descriptionHash,
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
