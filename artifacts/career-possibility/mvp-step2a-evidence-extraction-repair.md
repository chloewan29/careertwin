# CareerTwin — MVP Step 2A: Evidence Extraction Repair

**Mode: BOUNDED EXTRACTION ROOT-CAUSE REPAIR → TARGET-PROFILE REVALIDATION → GENERALIZATION REGRESSION → COMMIT / PUSH**

---

## Repository Baseline (Start)

| Field | Value |
|---|---|
| Branch | master |
| HEAD (start) | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| master (start) | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| origin/master (start) | 0abf25aebaee10f050162fbdf9e425e164fd9315 |
| Index at start | EMPTY (no staged files) |
| Historical HOLD at start | Preserved (untracked only) |

---

## Privacy Statement

- Raw résumé text is NOT reproduced in this artifact.
- Employer names and person names are NOT used.
- Evidence is referenced by structural classification and count only.
- The target is identified as PROFILE_TARGET throughout.

---

## First Material Loss Point (Confirmed from Step 1)

**L1_INPUT_EXTRACTION**

The `employmentBoundaries()` function in `resume-evidence-text-extractor.ts` failed to detect multiple employment sections from the DOCX-sourced text of PROFILE_TARGET. Only 1 employment boundary was produced from a full multi-role résumé document.

---

## Root Extraction Owner

**Primary:** `lib/career-possibility/resume-evidence-text-extractor.ts` — specifically `employmentBoundaries()`

**Not the upstream owner:** `local-resume-file-extractor.ts::normalizeLocallyExtractedResumeText` was inspected and confirmed: the issue is not in upstream normalization. The normalization function correctly handles CRLF, BOM, and trailing whitespace. It correctly preserves mid-line TAB characters (which are structural in DOCX output). The boundary detection function receives correctly normalized text and was the right repair target.

---

## Phase 1 — Target Failure Reproduction

**REPRODUCED.** The persisted provisional Career Map state file (`careertwin-sparse-profile-m1.json`) was deterministically available in the local Downloads folder.

| Metric | Value |
|---|---|
| Source document size | 11,708 bytes (DOCX) |
| Normalized extracted text characters | 4,906 |
| Normalized extracted text lines | 85 |
| Employment boundaries BEFORE repair | 1 |
| Atomic evidence items BEFORE repair | 1 |

---

## Phase 2 — Source Structure Classification

| Structural Feature | Present | Detail |
|---|---|---|
| TAB characters (mid-line) | YES | DOCX tab-stop date alignment — the primary failure cause |
| Date range (year-only) | YES | Multiple roles use `YYYY – YYYY` or `YYYY – Present` |
| Date range (Month Year) | YES | Multiple roles use `Mon YYYY – Mon YYYY` or `Mon YYYY – Present` |
| En-dash separator (U+2013) | YES | Used as date range separator in DOCX output |
| Em-dash separator (U+2014) | YES | Used as employer/context separator |
| Hyphen-minus | YES | Present in prose content |
| Bullet characters | NO | Zero bullet lines — prose paragraph format |
| Pipe separator | NO | Not used |
| `Role | DateRange` format | NO | |
| Work history section heading | YES | Detected correctly (len=23: "PROFESSIONAL EXPERIENCE") |
| Non-employment section heading | YES | Education/Skills sections detected correctly |
| Employer name with company suffix | NO | Company names do not use Ltd/Inc/Pty etc. |
| Multi-column DOCX extraction artifact | YES | Two-column Word layout flattened to tab-separated single lines |

---

## Phase 3 — Current Boundary Detection Audit

The `employmentBoundaries()` function checked these patterns (pre-fix):

| Pattern | Expected Format | What PROFILE_TARGET Had | Match? |
|---|---|---|---|
| `combined` with `date in [3]` | `Employer — Role, DateRange` | `"Role Title\tDateRange"` | ❌ MISS |
| `combined` with `companySuffix in [1]` | `Employer Ltd — Role` | No company suffix used | ❌ MISS |
| `combined` with `date in [2]` (NEW) | `Role — DateRange` | Partially present but not the primary format | — |
| `roleWithDates` | `Role, DateRange` | Not used | ❌ MISS |
| `standaloneDates` | Entire line is just `DateRange` | Not present | ❌ MISS |
| `workHistoryHeading` | `PROFESSIONAL EXPERIENCE` | Correctly detected | ✅ HIT |
| `nonEmploymentSectionHeading` | `SKILLS` / `EDUCATION` | Correctly detected | ✅ HIT |

**Root cause:** DOCX Word document used a two-column layout with tab stops for date alignment. The mammoth DOCX extractor flattened this into single lines of the form `"Role Title<TAB>Month Year – Month Year"`. The TAB character is a structural separator between the role title and the date range. No existing pattern handled this format.

**Additionally:** The existing `combined` pattern fired only when dates were in `combined[3]` (third separator group) or when `combined[1]` had a company suffix. For the format `Role — DateRange` (date in `combined[2]` with no third component), the pattern did not fire.

---

## Phase 4 — Three-Concept Separation

| Concept | Architecture Intent | PROFILE_TARGET Status |
|---|---|---|
| Employment boundaries | Structural sections grouping an employer period | 1 detected (should be 7) |
| Individual bullet evidence | Atomic evidence items within a boundary | 0 bullets — prose-only document |
| Whole résumé sections | Heading-level sections (PROFESSIONAL EXPERIENCE / EDUCATION / SKILLS) | Correctly detected |

The current architecture correctly treats each employment boundary as a container for multiple evidence items. A single boundary is not assumed to be a single evidence item. Prose evidence is supported through `qualifiesAsPerformedProfessionalEvidence` via `performedActionProse` and `performedResponsibilityProse` regex patterns. These patterns work correctly — they qualify ~10 prose paragraphs in PROFILE_TARGET. The problem was purely that those paragraphs were inside a single (collapsed) employment boundary, so the extractor created only 1 evidence item from what should have been 7 separate employment-scoped evidence sets.

---

## Phase 5 — Generic Extraction Contract (Preserved)

The architectural contract remains unchanged:
- Multiple employment chapters must survive when present
- Multiple evidence items may exist within each chapter
- Evidence must be attributable to a specific employment record
- Ordering and provenance are preserved
- Domain of employment is never used for detection

---

## Phase 6 — Domain-Neutral Verification

The boundary detection repair uses only:
1. **TAB character position** — structural, not semantic
2. **Date range pattern** — structural, not semantic
3. **Work history heading pattern** — structural
4. **Non-employment heading pattern** — structural

No analytics-specific, industry-specific, or domain-specific terms were introduced.

---

## Phase 7 — Bounded Structural Repair

**Files modified:**
- `lib/career-possibility/resume-evidence-text-extractor.ts` — production fix

**Two new detection cases added to `employmentBoundaries()`:**

### Fix 1: DOCX tab-stop format (`Role\tDateRange`)

Inserted BEFORE the existing `combined` check:

```typescript
// DOCX tab-stop format: "Role Title\tMonth Year – Month Year"
// Word documents frequently align dates using tab stops, producing a single line
// with the role title before the tab and the date range after it.
const tabIdx = value.indexOf("\t");
if (tabIdx > 0) {
  const beforeTab = value.slice(0, tabIdx).trim();
  const afterTab = value.slice(tabIdx + 1).trim();
  const tabDates = dateRange.exec(afterTab);
  if (tabDates && beforeTab && !workHistoryHeading.test(beforeTab) && !nonEmploymentSectionHeading.test(sectionHeadingCandidate(beforeTab))) {
    const contentStart = line.end < text.length ? line.end + 1 : line.end;
    boundaries.push({ startOffset: line.start, contentStartOffset: contentStart, evidenceEligible: true, roleTitle: beforeTab, startDate: tabDates[1], endDate: tabDates[2] });
    continue;
  }
}
```

### Fix 2: Role–DateRange format (`combined[2]` is date range)

The existing `combined` check extended with an additional OR condition:

```typescript
if (combined && (dateRange.test(combined[3] ?? "") || companySuffix.test(combined[1]) || (dateRange.test(combined[2]) && combined[3] === undefined))) {
  const dates = dateRange.exec(combined[3] ?? combined[2]);
  const isRoleDateFormat = combined[3] === undefined && dateRange.test(combined[2]);
  boundaries.push({ ...isRoleDateFormat ? { roleTitle: combined[1].trim() } : { employer: combined[1].trim(), roleTitle: combined[2].trim() }, ...(dates ? { startDate: dates[1], endDate: dates[2] } : {}) });
  continue;
}
```

---

## Phase 8 — Fallback Design

The existing architecture already handles the case where no high-confidence employment boundaries are found (the `workSectionStart` fallback at line 184). This fallback was not modified. The repair adds new detection routes that correctly classify additional boundaries, reducing the frequency of the catastrophic `large_resume → one_evidence_item` failure mode.

---

## Phase 9 — Over-Segmentation Protection

The new TAB-date rule fires ONLY when:
1. A TAB character exists in the line (`tabIdx > 0`)
2. The content after the TAB is a valid date range (`dateRange.exec(afterTab)`)
3. The content before the TAB is non-blank
4. The content before the TAB is NOT a work history heading
5. The content before the TAB is NOT a non-employment section heading

This is a narrow, structural rule. It does not fire on prose content, technology tokens, contact lines, or educational lines. Verified: no false positives on non-employment sections.

---

## Phase 10 — Education / Skill Safety

`isStructuralBoundaryLine()` already returns `true` for any line containing a date range — this prevents TAB-format role/date lines from being treated as evidence candidates. The `nonEmploymentSectionHeading` guard in the new rule prevents education or certification headings from being misclassified as employment boundaries. ✅

---

## Phase 11 — Target Profile Results

| Metric | Before | After |
|---|---|---|
| Source document size | 11,708 bytes | 11,708 bytes |
| Employment boundaries | 1 | 7 |
| Boundary types | COMBINED×1 | TAB_DATE×6, COMBINED×1 |
| Atomic evidence items | 1 | ~10 (all qualifying prose paragraphs) |
| Professional sections represented | 1 | 7 (covering all employment periods) |

The résumé no longer collapses to a single evidence item.

---

## Phase 12 — Synthetic Format Cases Tested

| Case | Format | Result |
|---|---|---|
| CASE A | `Employer — Role \| Month Year - Month Year` + bullets | ✅ PASS |
| CASE B | `Role \| Employer` + standalone date + bullets | ✅ PASS |
| CASE C | Two roles `Employer — Role \| DateRange` | ✅ PASS (2 employment records) |
| CASE D | `Role \| Year-Year` format | ✅ PASS |
| CASE E (en-dash) | `Role – DateRange` (en-dash) | ✅ PASS (new fix) |
| CASE E (em-dash) | `Role — DateRange` (em-dash) | ✅ PASS (new fix) |
| CASE F | Two roles, four bullets total | ✅ PASS (4 evidence items, 2 records) |
| CASE G | Non-analytics language (commercial/operations/people) | ✅ PASS |
| TAB_DATE | `Role Title[TAB]Month Year – Month Year` (DOCX format) | ✅ PASS (new fix) |
| MULTI_JOB | Three roles, three prose items (TAB format) | ✅ PASS |

---

## Phase 13 — Negative Cases Tested

| Case | Expected | Result |
|---|---|---|
| Education content | NOT evidence | ✅ PASS |
| Certification list | NOT evidence | ✅ PASS |
| Skills list (SQL, Python, Tableau, Power BI) | NOT evidence | ✅ PASS |
| Tab-delimited prose WITHOUT date range | Does NOT create spurious boundary | ✅ PASS |
| Single technology tokens | NOT evidence | ✅ PASS |
| Section headings (EDUCATION) | NOT evidence | ✅ PASS |

---

## Phase 14 — Multi-Domain Language Cases

| Domain | Result |
|---|---|
| Finance / FP&A | ✅ Evidence extracted |
| People / HR | ✅ Evidence extracted |
| Operations | ✅ Evidence extracted |
| Commercial / Sales | ✅ Evidence extracted |
| Customer Service / CX | ✅ Evidence extracted |
| Program / Project Delivery | ✅ Evidence extracted |

---

## Phase 15 — Existing Analytics-Style Regression

All 70+ existing tests in `resume-evidence-text-extractor.test.ts` passed. Analytics-format résumés (`Employer — Analytics Lead | Jan 2020 - Dec 2023`) continue to work correctly. ✅

---

## Phase 16 — Evidence ID Determinism

Verified: identical input produces identical output for TAB-date format. `JSON.stringify(runA) === JSON.stringify(runB)` for the same bundleId/documentId/extractionRunId. ✅

---

## Phase 17 — Inference Input After Extraction

The extraction repair now produces ~10 evidence items entering inference (up from 1). Inference quality cannot be assessed here — that is Step 2A.V scope.

---

## Phase 19 — Partial Re-Trace Result

| Stage | Before | After |
|---|---|---|
| Source document | 11,708 bytes | 11,708 bytes |
| Employment boundaries | 1 | 7 |
| Atomic evidence items | 1 | ~10 |
| Inference input count | 1 | ~10 |

Inference was NOT re-run in this step. Inference output remains from the prior persisted state (`customer-adoption`, transferable). The re-run inference result will be assessed in Step 2A.V.

---

## Phase 20 — Ontology Judgment Reset

**ONTOLOGY_NOT_YET_REEVALUATED**

The Step 1 conclusion `CAPABILITY_LIBRARY_SUFFICIENT_FOR_TARGET` is NOT re-admitted here. The canonical library will be re-evaluated against the newly recovered evidence corpus in Step 2A.V.

---

## TypeScript

**0 errors in Step 2A files.** Pre-existing errors exist in `out1.ts` and `out2.ts` (HOLD artifacts, not introduced by this step). These are not Step 2A regressions.

---

## ESLint

**0 errors, 0 warnings** on Step 2A production and test files.

---

## Focused Extraction Tests

**PASS.** All tests in `resume-evidence-text-extractor.test.ts` pass (existing + new).

---

## Shared-Ingestion Regression

**PASS.** `browser-resume-shared-ingestion-adapter.test.ts`, `shared-career-ingestion-bundle-contract.test.ts`, `browser-resume-shared-ingestion-runtime.test.ts` all pass.

---

## Downstream Contract Regression

**PASS.** `career-evidence-universe-reconciliation-contract.test.ts`, `provisional-evidence-signal-bridge.test.ts` pass. `diagnose-resume-ingestion.test.ts` fails with `1 !== 2` — confirmed pre-existing (verified by stash test: failure reproduces without Step 2A changes).

---

## Phase 27 — Next-Fault Classification

**A. EXTRACTION_REPAIR_SUFFICIENT_NEXT_RETRACE_REQUIRED**

The extraction repair is structurally sufficient — 7 employment boundaries, ~10 evidence items recovered from PROFILE_TARGET. The next fault classification requires Step 2A.V (truth re-trace on recovered evidence) to determine whether:
- inference coverage for non-analytics professional evidence is sufficient
- canonical capability library covers the recovered dimensions
- materialization and graph are lossless with the expanded evidence set

No secondary repair is admitted until the re-trace is complete.

---

## Staged Diff Gate Results (Phase 30)

| Gate | Result |
|---|---|
| Repair targets extraction | ✅ YES |
| No analytics-domain dependency added | ✅ YES — patterns are structural only |
| No private résumé content committed | ✅ YES |
| No new capability ontology | ✅ YES |
| No inference prompt change | ✅ YES |
| No role change | ✅ YES |
| No recommendation change | ✅ YES |
| No renderer change | ✅ YES |
| Synthetic cross-format tests added | ✅ YES |
| Historical HOLD unstaged | ✅ YES |

---

## Git Final State

| Field | Value |
|---|---|
| Branch | master |
| HEAD (final) | 50746fa1d6fe4cb606b76faecfc67046df77fc5d |
| origin/master (final) | 50746fa1d6fe4cb606b76faecfc67046df77fc5d |
| HEAD == origin/master | YES |
| Index (final) | EMPTY |
| Historical HOLD (final) | Preserved (untracked only) |
| Tracked files modified | 0 (all committed) |

---

## Files Modified

| File | Type | Modification |
|---|---|---|
| `lib/career-possibility/resume-evidence-text-extractor.ts` | Production | Added two new boundary detection cases in `employmentBoundaries()` |
| `tests/career-possibility/resume-evidence-text-extractor.test.ts` | Test | Added Phase 12-15 behavioral assertions (138 lines) |

## Files NOT Modified

| Category | Touched? |
|---|---|
| Capability inference prompt | NO |
| Canonical capability library | NO |
| Signal policy | NO |
| Deterministic mapping policy | NO |
| Role library | NO |
| Admission gate | NO |
| Career Map renderer | NO |
| Graph projection | NO |
| Control docs | NO |
| Private résumé content | NO |

---

## Commit

| Field | Value |
|---|---|
| Commit message | `fix(career): recover professional resume evidence` |
| Commit SHA | `50746fa1d6fe4cb606b76faecfc67046df77fc5d` |
| Pushed to origin/master | YES |
| Force push | NO |

---

## Decision

**CAREERTWIN_MVP_STEP2A_EXTRACTION_REPAIR_COMMITTED**

---

## Next Action

**STOP.** Await Founder/EM authorisation for:

**MVP STEP 2A.V — RE-RUN PERSONAL CAPABILITY TRUTH TRACE ON RECOVERED EVIDENCE**

Re-run the pipeline against PROFILE_TARGET with the repaired extractor to determine whether the next fault is:
- inference coverage
- canonical ontology coverage
- materialization
- or no additional capability-layer blocker
