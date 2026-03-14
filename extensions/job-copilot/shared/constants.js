(function initCareerTwinConstants() {
  // Shared runtime constants used by extension modules.
  globalThis.CareerTwinConstants = {
    DEFAULT_API_BASE_URL: "http://localhost:3000",
    // Real existing profile from Supabase `profiles` table for local dev bootstrap.
    DEFAULT_PROFILE_ID: "8ec2c318-dbd0-42e2-acc7-10a103284b53",
    DEFAULT_TOP_EVIDENCE_LIMIT: 4,
    CACHE_MAX_AGE_MS: 15 * 60 * 1000,
    MIN_JD_CHARS: 120,
    // Runtime safety switch: keep JD audit fully disabled in extension execution paths.
    LINKEDIN_JD_AUDIT_ENABLED: false,
    LINKEDIN_JD_AUDIT_DEFAULT_ENABLED: false,
    LINKEDIN_JD_AUDIT_QUERY_PARAM: "ctAuditJd",
    LINKEDIN_JD_AUDIT_STORAGE_KEY: "careertwin:linkedin_jd_audit",
    LINKEDIN_JD_AUDIT_MAX_RECORDS: 80,
  };
})();
