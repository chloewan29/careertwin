# CareerTwin Post-MVP Task A.1 — Real-CV Unified Graph Layout Repair

Status: **NON_CANONICAL VALIDATION ARTIFACT**  
Privacy classification of validation input: `RAW_PERSONAL_CAREER_MAP_STATE`  
Raw state copied into repository: **NO**

## Decision and boundaries

- Decision: `POST_MVP_TASK_A1_REAL_CV_LAYOUT_REPAIRED`
- Product judgment: `REAL_CV_UNIFIED_MAP_VISUALLY_READY`
- Founder 10-second result: **A**
- Career Map MVP: **CLOSED / MVP VALIDATED**
- Historical Post-MVP Task A: **CLOSED**
- Current corrective task: **POST-MVP TASK A.1 — REAL-CV UNIFIED GRAPH LAYOUT REPAIR**
- Architecture preserved: **YES**
- Projection semantic defect: **NO**
- Renderer presentation defect: **YES**
- Primary geometry fault: `MIXED_COORDINATE_SYSTEMS`
- First writable owner: `components/career-possibility/CareerMapNeuralGraph.tsx`
- Semantic owners changed: **NONE**
- Shared canonical identity preserved: **YES**
- Role-only non-ownership preserved: **YES**
- Evidence semantics preserved: **YES**

## Git preflight

- Branch: `master`
- Starting HEAD: `7af071c57832938eecfa8972f58cdda7f074d9f0`
- Starting origin/master: `7af071c57832938eecfa8972f58cdda7f074d9f0`
- Starting index: **EMPTY**
- Pre-existing HOLD: **PRESERVED**

## State admission and exact replay

- Source file found: **YES**
- File bytes: `36869`
- SHA256: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- Schema version: `2.0.0`
- Existing state validator: **PASS / STATE_ADMISSIBLE**
- Exact localStorage read-back SHA: `0A9043BA497E7C1F3B05E74F14937B6E9C309F0F1B0DC59BCCB134B8EB5E9C8D`
- Exact-state rehydration: **CONFIRMED** at all three viewports
- Evidence count: `13`
- Personal capability count: `11`
- Mapping count: `23`
- Direct mappings: `23`
- Transferable mappings: `0`
- Duplicate evidence/capability pairs: `0`
- Capabilities without evidence: `0`
- `POST /api/career-map/capability-inference`: `0`
- Gemini requests: `0`
- CV uploads: `0`

## Projection truth

- Correct projected personal families: **YES** (`7`)
- Ranked projected roles: **YES** (`4`)
- Canonical capability identity preserved: **YES** (`11` unique personal capability IDs)
- Renderer-side reranking: **NONE**
- Role-only requirements remain layout/context proxies: **YES**

Roles, in authoritative projection order:

| proximityRank | Role ID | Label |
|---:|---|---|
| 0 | `analytics-manager` | Analytics Manager |
| 1 | `marketing-analytics-lead` | Marketing Analytics Lead |
| 2 | `customer-insights-lead` | Customer Insights Lead |
| 3 | `data-product-manager` | Data Product Manager |

## Before diagnosis — 1440×1000

- YOU center: `(449.00, 700.00)`
- Responsive SVG edge origin: `(646.62, 640.00)`
- Edge-origin-to-YOU delta: `206.53 px`
- Ghost center: **PRESENT**
- Initial visible canonical capabilities: `0 / 11`
- Two-layer classification: `PROGRESSIVE_BUT_TOO_HIDDEN`
- Roles projected/rendered: `4 / 4`
- Role issues: Analytics Manager materially overlapped Operations & Delivery; two role nodes were clipped below the desktop canvas; the graph left most of the right side unused.

Before families:

| Family ID | Center | Child count | Initially visible | After interaction |
|---|---:|---:|---:|---:|
| `governance-risk` | `(377.00, 480.25)` | 1 | 0 | 1 |
| `customer-market` | `(521.63, 549.89)` | 1 | 0 | 1 |
| `operations-delivery` | `(557.36, 698.41)` | 2 | 0 | 2 |
| `learning-development` | `(457.27, 823.92)` | 1 | 0 | 1 |
| `analytics-insight` | `(296.72, 831.92)` | 4 | 0 | 4 |
| `leadership` | `(196.63, 706.41)` | 1 | 0 | 1 |
| `data-technology` | `(232.36, 549.89)` | 1 | 0 | 1 |

Before role centers:

| Role ID | Center |
|---|---:|
| `analytics-manager` | `(627.00, 674.00)` |
| `marketing-analytics-lead` | `(471.05, 407.58)` |
| `customer-insights-lead` | `(274.39, 955.91)` |
| `data-product-manager` | `(563.41, 940.22)` |

Before capability centers after each owning-family interaction:

| Capability ID | Center |
|---|---:|
| `analytics-governance` | `(377.00, 411.25)` |
| `audience-insight` | `(576.36, 507.25)` |
| `cross-functional-delivery` | `(626.03, 685.88)` |
| `process-improvement` | `(613.36, 749.39)` |
| `education-delivery` | `(487.63, 895.98)` |
| `forecasting` | `(309.22, 901.80)` |
| `insight-synthesis` | `(280.13, 900.92)` |
| `marketing-effectiveness` | `(253.91, 880.30)` |
| `measurement-design` | `(235.08, 866.09)` |
| `people-leadership` | `(128.39, 722.98)` |
| `tooling-enablement` | `(177.63, 507.25)` |

Exact fault: SVG edges were positioned in a responsive `1000×680` viewBox with `xMidYMid meet`, while HTML nodes used unscaled CSS-pixel `left/top` coordinates (plus duplicate Tailwind/inline translation on card nodes). The visible YOU node therefore did not occupy the SVG graph origin. This is `MIXED_COORDINATE_SYSTEMS`, not a projection defect.

## Bounded repair

Production file modified:

- `components/career-possibility/CareerMapNeuralGraph.tsx`

Focused test modified:

- `tests/career-possibility/career-map-neural-graph.test.ts`

Presentation-only changes:

- mapped all HTML node positions into the same percentage-based viewBox domain as SVG edges;
- removed duplicate CSS translations from positioned cards;
- made YOU the real edge and visual origin;
- kept all canonical personal capabilities visible in an evenly spaced outer personal ring, grouped in family order and connected to presentation-only family nodes;
- moved the four upstream-ranked roles to a separate, rank-monotonic outer arc without reranking;
- added an explicit mobile YOU anchor and surfaced each family’s canonical capability labels before interaction.

## After geometry — 1440×1000

- YOU center: `(575.80, 670.00)`
- Responsive SVG edge origin: `(575.80, 670.00)`
- Edge-origin-to-YOU delta: `0.00 px`
- Ghost center: **ABSENT**
- Two-layer classification: `CLEAR_TWO_LAYER`
- Initial visible canonical capabilities: `11 / 11`
- Family interaction child counts remain: `1, 1, 2, 1, 4, 1, 1`

After families:

| Family ID | Center | Distance from YOU |
|---|---:|---:|
| `governance-risk` | `(575.80, 505.00)` | `165.00` |
| `customer-market` | `(752.14, 567.11)` | `204.16` |
| `operations-delivery` | `(795.69, 706.70)` | `222.93` |
| `learning-development` | `(673.66, 818.66)` | `177.98` |
| `analytics-insight` | `(477.92, 818.66)` | `177.99` |
| `leadership` | `(355.89, 706.70)` | `222.95` |
| `data-technology` | `(399.45, 567.11)` | `204.17` |

After canonical capabilities:

| Capability ID | Center | Distance from YOU |
|---|---:|---:|
| `analytics-governance` | `(575.80, 410.00)` | `260.00` |
| `audience-insight` | `(767.95, 451.27)` | `291.14` |
| `cross-functional-delivery` | `(899.09, 561.98)` | `340.86` |
| `process-improvement` | `(927.59, 707.00)` | `353.73` |
| `education-delivery` | `(844.41, 840.25)` | `318.02` |
| `forecasting` | `(675.92, 919.45)` | `268.79` |
| `insight-synthesis` | `(475.66, 919.45)` | `268.80` |
| `marketing-effectiveness` | `(307.19, 840.25)` | `318.02` |
| `measurement-design` | `(223.98, 707.00)` | `353.76` |
| `people-leadership` | `(252.48, 561.98)` | `340.89` |
| `tooling-enablement` | `(383.64, 451.27)` | `291.15` |

After roles:

| proximityRank | Role ID | Center | Distance from YOU |
|---:|---|---:|---:|
| 0 | `analytics-manager` | `(1057.31, 441.25)` | `533.08` |
| 1 | `marketing-analytics-lead` | `(1177.50, 576.44)` | `608.93` |
| 2 | `customer-insights-lead` | `(1227.06, 728.48)` | `653.88` |
| 3 | `data-product-manager` | `(1185.55, 917.25)` | `657.97` |

After role counts:

- Projected: `4`
- Rendered: `4`
- Inside desktop canvas at 1440×1000: `4`
- Inside desktop canvas at 1280×800: `4`
- Unobstructed: `4`
- Mobile reachable: `4`
- Role-family overlaps: `0`
- Role-capability overlaps: `0`
- Role-YOU overlaps: `0`
- Role-role overlaps: `0`
- Family-family overlaps: `0`
- Capability-capability overlaps: `0`

## Viewport and product acceptance

| Viewport | Result | Notes |
|---|---|---|
| 1440×1000 | PASS | Full network is balanced; all four roles are in canvas and unobstructed. |
| 1280×800 | PASS | All nodes remain in canvas and collision-free; lower canvas remains reachable by normal page scroll. |
| 390×844 | PASS | YOU, family-to-capability hierarchy, and all four role controls are reachable in the stacked mobile flow. |

- Canvas balance: **PASS / materially improved**
- Node collision: **PASS / none measured**
- Label collision: **PASS / none observed**
- Edge readability: **PASS**
- Founder 10-second test: **A**
- Remaining material defect: **NONE**

## Screenshot evidence

Before captures were normalized to the requested viewport pixel dimensions from the exact-state replay captures by cropping only below the viewport and restoring the browser scrollbar gutter; no graph content or semantic state was added.

| State | Path | SHA256 |
|---|---|---|
| Before 1440×1000 | `artifacts/career-possibility/post-mvp-task-a1-real-state-layout/before/desktop-1440x1000.png` | `854FBCAAD859CCE3194B177307D252344DEA6B19DE1FC89578DDF27A917E2CE7` |
| Before 1280×800 | `artifacts/career-possibility/post-mvp-task-a1-real-state-layout/before/desktop-1280x800.png` | `E540C7CA65558EDD1C19886870C7D647F38A79D8605F28C07293CFDE824A9B9F` |
| Before 390×844 | `artifacts/career-possibility/post-mvp-task-a1-real-state-layout/before/mobile-390x844.png` | `AD36A59C0BD778FA2DF9F068402D4E82C68B5B2215699DAC4C078F3930F091DD` |
| After 1440×1000 | `artifacts/career-possibility/post-mvp-task-a1-real-state-layout/after/desktop-1440x1000.png` | `964B79880DAF53D8F8030541DEAAF0ADE6D1E4F2D3BD3D82295B5CC26819112E` |
| After 1280×800 | `artifacts/career-possibility/post-mvp-task-a1-real-state-layout/after/desktop-1280x800.png` | `C3F4609EC4684383625E856A846FA7476D60A23FF382D86DB2E7EC7C14D4C37D` |
| After 390×844 | `artifacts/career-possibility/post-mvp-task-a1-real-state-layout/after/mobile-390x844.png` | `5AC7C3B057A7CA0020AB4FAC029650DDC64EADD6A5D5E504330F560597C8036B` |

## Verification

- Focused Task A.1 renderer regression: **PASS**
- Unified Career Map surface regression: **PASS**
- Active multi-role renderer regression: **PASS**
- Existing graph projection regression: **PASS**
- Ranked graph projection regression: **PASS**
- `npx tsc --noEmit`: **PASS**
- Targeted ESLint: **PASS**
- `npm run build`: **PASS**
- Verification confidence: **fully verified**

No control closure is performed in this turn.
