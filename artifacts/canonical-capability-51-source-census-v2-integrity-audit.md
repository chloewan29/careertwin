# CareerTwin Census V2 - Integrity Reconciliation Audit

## 1. Input Hashes
- **Policy**: `0B938868E754D41AD22211FCE08C36C655893EDDB05EBF08AA343C25A85A4572` (MATCH)
- **Census V1**: `A98C4F31CF1A57FB2941D8A9901A92310239BD3D5B10764C3F40D64A6E13592C` (MATCH)
- **Census V2**: `1F3FD2D4BA508B9B34668077D04C73E4EEE298BA9F8C17E2C7AD13970DB68944` (MATCH)

## 2. Recomputed Census Totals
- **Canonical Capability Count**: 51
- **Recomputed Sufficiency**: STRONG: 8 | MODERATE: 10 | WEAK: 0 | INSUFFICIENT: 33
- **Recomputed Routing**: AUTO: 18 | TARGETED: 0 | ENRICHMENT: 33 | CONFLICT: 0
- **Semantic Drift**: 51 CONSISTENT
- **Compiler Completeness**: 51 COMPLETE
- **Rich Archetype Usage Total**: 26
- **Seeded Usage Total**: 72
- **Private Collision Total**: 25
- **V2 Summary Consistency**: PASS (All recomputed values match the V2 summary fields exactly).

## 3. Relationship Accounting
- **Generic Role Archetype Count**: 4 (Yielding 26 relationships)
- **Seeded Profile Count**: 18 (Yielding 72 relationships)
- **Total Relationships**: 98
- **Canonical Relationships**: 73
- **Private Relationships**: 25
- **Accounting Validation**: PASS (26 + 72 = 98; 73 + 25 = 98)

## 4. Corrected V1 → V2 Comparison
The previously reported V1 → V2 comparison incorrectly stated V1 had 0 STRONG, 0 MODERATE, 0 AUTO, and 51 TARGETED_REVIEW.

**Corrected V1 Actual Distribution**:
- STRONG: 8
- MODERATE: 7
- WEAK: 36
- INSUFFICIENT: 0
- AUTO: 6
- TARGETED: 43
- ENRICHMENT: 0
- CONFLICT: 2
- RICH_ARCHETYPE: 0

**Corrected V2 Distribution**:
- STRONG: 8
- MODERATE: 10
- WEAK: 0
- INSUFFICIENT: 33
- AUTO: 18
- TARGETED: 0
- ENRICHMENT: 33
- CONFLICT: 0
- RICH_ARCHETYPE: 26

**Corrected Deltas (V2 - V1)**:
- STRONG: 0
- MODERATE: +3
- WEAK: -36
- INSUFFICIENT: +33
- AUTO: +12
- TARGETED: -43
- ENRICHMENT: +33
- CONFLICT: -2
- RICH_ARCHETYPE: +26

**Previous Comparison Error**: YES (REPORTING_COMPARISON_ERROR)

## 5. AUTO-Route Verification
The 18 capabilities routed to AUTO_GENERATION_CANDIDATE were independently verified. All 18 successfully possess either STRONG or MODERATE sufficiency supported by rich traces, COMPLETE compiler traces, and no material semantic drift.
- **AUTO candidates supported**: 18/18
- **AUTO candidates requiring adjustment**: None

## 6. Insufficient-Route Verification
Of the 33 capabilities marked INSUFFICIENT, all 33 contain only boilerplate expectedEvidence (e.g. "A specific owned outcome demonstrating [label]"), no rich archetype usages, and zero mapping or signal clues.
- **TRUE_SOURCE_GAP Count**: 33
- **SOURCE_COLLECTION_GAP Count**: 0

## 7. WEAK/INSUFFICIENT Boundary Conclusion
The current V2 classification produced 0 WEAK and 33 INSUFFICIENT capabilities.
Inspection confirms that exactly 0 capabilities possessed only 1 rich signal (the heuristic floor for WEAK), meaning the distribution naturally polarised into capabilities with sufficient context (MODERATE/STRONG) and capabilities with exclusively boilerplate (INSUFFICIENT).
- **Conclusion**: ZERO_WEAK_DISTRIBUTION_SUPPORTED

## 8. Private-ID Classification Audit
The previous report classified all 25 private/noncanonical IDs as `LIKELY_DISTINCT` merely because they mapped to specific seeded roles. However, because all 25 originate from seeded profiles (with purely boilerplate expectedEvidence), they lack any defining semantic action or object.
- **Private-ID Classification**: INSUFFICIENT_EVIDENCE
- **Reason**: Source packets contain only boilerplate expected evidence without defining actions or objects, making it impossible to confidently resolve overlaps versus distinct concepts.

## 9. Ontology-Gap Audit
Because all 25 private IDs are classified as INSUFFICIENT_EVIDENCE, no reliable conclusions can be drawn regarding missing canonical concepts.
- **Candidates**: INSUFFICIENT_EVIDENCE

## 10. Final Integrity Decision
The V2 census core source-coverage metrics are historically reliable. The V1 reporting error was isolated to comparison output, not compiler failure. The 33 source gaps are genuine and require enrichment.

- **V2 core metrics reliable**: YES
- **18/51 AUTO population reliable**: YES
- **33 source gaps**: ALL_GENUINE
- **Private-ID analysis reliable**: NO (Corrected in this audit to INSUFFICIENT_EVIDENCE)
- **Ready for scalable source-enrichment planning**: YES
