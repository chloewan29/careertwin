# CareerTwin Job Copilot Extension

## Runtime module ownership

- `manifest.json`: extension entry wiring
- `background/index.js`: background message router entrypoint
- `background/analysis-service.js`: extraction + analysis orchestration
- `background/api-client.js`: backend HTTP calls only
- `background/cache.js`: in-memory cache only
- `background/download-service.js`: tailored resume download flow only
- `content/index.js`: content entrypoint and orchestration
- `content/detect-job-page.js`: job-page detection only
- `content/extract-job-page.js`: normalized payload extraction only
- `content/job-surface-adapters/adapter-registry.js`: adapter registration and URL routing
- `content/job-surface-adapters/linkedin-adapter.js`: LinkedIn job surface adapter
- `content/job-surface-adapters/seek-adapter.js`: SEEK job surface adapter
- `content/parser-registry.js`: parser selection and registration
- `content/platform-parsers/*`: platform-specific extraction selectors
- `sidepanel/sidepanel.html`: sidepanel document entrypoint
- `sidepanel/sidepanel-live.js`: sidepanel runtime controller
- `sidepanel/render/*`: presentation-only render helpers
- `sidepanel/state/*`: panel state mapping and actions
- `shared/messages.js`: message constants shared across modules
- `shared/constants.js`: shared constants
- `shared/job-payload.js`: payload signatures/keys helpers
- `shared/ui-contract.js`: sidepanel state contract helpers
- `shared/utils.js`: generic utility helpers

## Current runtime flow

LinkedIn/Seek detail page -> job-surface adapter registry -> `content/index.js` extraction request handling -> `background/index.js` analysis routing -> `sidepanel/sidepanel-live.js` render delegation.

## LinkedIn JD extraction audit mode

This mode adds deterministic extraction-completeness telemetry for LinkedIn only. It does not change normal analysis behavior.

### Enable audit mode

Use either:

- URL query param on LinkedIn: `?ctAuditJd=1` (or `&ctAuditJd=1`)
- DevTools console (content page): `localStorage.setItem("careertwin:linkedin_jd_audit", "1")`

Disable with:

- Remove query param, or
- `localStorage.removeItem("careertwin:linkedin_jd_audit")`

### Where audit output appears

- Content-script console: `[CareerTwin][jd-audit][content]`  
- Background service-worker console: `[CareerTwin][jd-audit][background]`  
- In-memory buffers for copy/export:
  - Content page: `window.__CAREERTWIN_LINKEDIN_JD_AUDIT__`
  - Background worker: `globalThis.__CAREERTWIN_LINKEDIN_JD_AUDIT_BG__`

### Core audit payload fields

- `timestamp`
- `page_type` (`jobs_view` or `search_results_preview`)
- `linkedin_job_id`
- `current_url`
- `loading_when_extraction_started`
- `more_expand_detected`
- `more_expand_clicked_by_flow`
- `raw_extracted_jd_length`
- `normalized_extracted_jd_length`
- `extracted_text_first_300`
- `extracted_text_last_300`
- `responsibilities_like_content`
- `requirements_or_qualifications_like_content`
- `preferred_or_bonus_like_content`
- `benefits_or_about_company_like_content`
- `extraction_source` (strategy path, selector path, fallback tier, method)
- `extraction_quality` (`empty`, `short_preview`, `partial`, `likely_full`)
- `downstream_bridge` (when available: `requirement_cluster_count`, `capability_cluster_count`, `matcher_job_profile_quality`)
