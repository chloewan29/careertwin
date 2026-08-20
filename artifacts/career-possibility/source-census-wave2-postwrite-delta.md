# CareerTwin Wave 2 Postwrite Delta

> [!WARNING]
> NON_CANONICAL  
> MEASUREMENT ONLY

## Measurement identity

- Mode: `CAREER_MAP_MVP / DIAGNOSTIC_INFRASTRUCTURE / POST_ENRICHMENT_TEST_CONTRACT_DECOUPLING / WAVE_2_MEASUREMENT_RESUME`
- Measured at: `2026-08-11T04:35:11.632Z`
- Baseline HEAD: `32f0f254acd001b9f6fa9d9a9a8b1ed594a8a8b9`
- Compiler: `canonical-capability-source-census-compiler/1.0.0`
- Current role source SHA256: `4C7E75D0DF6F554BBF287295F30CAE18029C4D5853E8A5859FDA25B200391810`
- Final admission artifact SHA256: `B3FDDEBDCD07978D8EFC3FA2EEF526219FF193B23D17589EF0EBEEA055900B65`
- Scanner scope: `STRUCTURAL_PREFLIGHT_ONLY`
- Semantic similarity/drift: `NOT_EVALUATED`

## Architecture experiment assessment

`WAVE2_ENRICHMENT_ARCHITECTURE_VALIDATED`

All six admitted relationship-specific evidence writes were recognized as non-boilerplate sources. Each target moved one policy step from `INSUFFICIENT` to `WEAK` and from `ONTOLOGY_ENRICHMENT_REQUIRED` to `TARGETED_REVIEW_CANDIDATE`. Non-target capability state, the existing AUTO and TARGETED populations, and role topology remained stable. No ontology, semantic-policy, compiler, or scanner implementation patch was required.

## Aggregate census

### Source sufficiency

| State | Pre-write | Post-write | Delta |
|---|---:|---:|---:|
| STRONG | 8 | 8 | 0 |
| MODERATE | 10 | 10 | 0 |
| WEAK | 10 | 16 | +6 |
| INSUFFICIENT | 23 | 17 | -6 |

### Generation routing

| Route | Pre-write | Post-write | Delta |
|---|---:|---:|---:|
| AUTO | 18 | 18 | 0 |
| TARGETED | 10 | 16 | +6 |
| ENRICHMENT | 23 | 17 | -6 |
| CONFLICT | 0 | 0 | 0 |

## Six-target movement

| Capability | Baseline sufficiency | Post-write sufficiency | Baseline route | Post-write route | Baseline non-boilerplate | Post-write non-boilerplate | Seeded-exclusive usage | Mapping clues | Evidence-signal clues | Movement reason |
|---|---|---|---|---|---:|---:|---:|---:|---:|---|
| forecasting | INSUFFICIENT | WEAK | ONTOLOGY_ENRICHMENT_REQUIRED | TARGETED_REVIEW_CANDIDATE | 0 | 1 | 1 | 0 | 0 | One seeded relationship changed from boilerplate to admitted observable evidence, increasing the classifier score from 0 to 1. |
| variance-analysis | INSUFFICIENT | WEAK | ONTOLOGY_ENRICHMENT_REQUIRED | TARGETED_REVIEW_CANDIDATE | 0 | 1 | 1 | 0 | 0 | One seeded relationship changed from boilerplate to admitted observable evidence, increasing the classifier score from 0 to 1. |
| dependency-management | INSUFFICIENT | WEAK | ONTOLOGY_ENRICHMENT_REQUIRED | TARGETED_REVIEW_CANDIDATE | 0 | 1 | 1 | 0 | 0 | One seeded relationship changed from boilerplate to admitted observable evidence, increasing the classifier score from 0 to 1. |
| risk-controls | INSUFFICIENT | WEAK | ONTOLOGY_ENRICHMENT_REQUIRED | TARGETED_REVIEW_CANDIDATE | 0 | 1 | 1 | 0 | 0 | One seeded relationship changed from boilerplate to admitted observable evidence, increasing the classifier score from 0 to 1. |
| education-delivery | INSUFFICIENT | WEAK | ONTOLOGY_ENRICHMENT_REQUIRED | TARGETED_REVIEW_CANDIDATE | 0 | 1 | 1 | 0 | 0 | One seeded relationship changed from boilerplate to admitted observable evidence, increasing the classifier score from 0 to 1. |
| education-partnerships | INSUFFICIENT | WEAK | ONTOLOGY_ENRICHMENT_REQUIRED | TARGETED_REVIEW_CANDIDATE | 0 | 1 | 1 | 0 | 0 | One seeded relationship changed from boilerplate to admitted observable evidence, increasing the classifier score from 0 to 1. |

Movement counts:

- `INSUFFICIENT_TO_WEAK: 6`
- `INSUFFICIENT_TO_MODERATE: 0`
- `INSUFFICIENT_TO_STRONG: 0`
- `NO_MOVEMENT: 0`
- `ROUTE_TO_TARGETED_REVIEW: 6`
- `ROUTE_TO_AUTO: 0`
- `ROUTE_TO_CONFLICT: 0`

## Non-boilerplate source delta

- Six-target baseline total: 0
- Six-target post-write total: 6
- Delta: +6

## Non-target stability

The 45 non-target canonical capabilities have no source-state change across:

- `sourceSufficiency`
- `generationRoute`
- `richArchetypeUsageCount`
- `seededUsageCount`
- `nonBoilerplateExpectedEvidenceCount`
- `mappingClueCount`
- `evidenceSignalClueCount`

`NON_TARGET_SOURCE_STATE_CHANGED_COUNT: 0`

Exact non-target changes: `NONE`.

## Regression checks

- `EXISTING_AUTO_REGRESSION_COUNT: 0`
- `PREEXISTING_TARGETED_REGRESSION_COUNT: 0`

The 18 pre-existing AUTO capabilities remain AUTO. The 10 pre-Wave2 WEAK/TARGETED capabilities remain WEAK/TARGETED.

## Structural preflight

The scanner remained `STRUCTURAL_PREFLIGHT_ONLY`. Among all six Wave 2 targets:

- explicit structural conflict signals: 0
- routing contradiction signals: 0
- invalid-family signals: 0
- duplicate-ID signals: 0
- canonical-label duplicate signals: 0

Each target received `NO_CONFLICT_SIGNAL`. This is not semantic conflict clearance.

## Role topology

| Measure | Current | Delta |
|---|---:|---:|
| Generic Role Archetypes | 4 | 0 |
| Aggregate role-profile surface | 22 | 0 |
| Generic mirrors | 4 | 0 |
| Seeded-exclusive role profiles | 18 | 0 |
| Generic relationships | 26 | 0 |
| Seeded-exclusive relationships | 72 | 0 |
| Total relationships | 98 | 0 |
| Canonical relationships | 73 | 0 |
| Private relationships | 25 | 0 |

## Stale-test-contract incident

The initial measurement stopped because the current-source scanner test fixed `EVIDENCE_INSUFFICIENCY_HOLD` at the pre-Wave2 value 23. Audit also found live-source compiler assertions that equated current repository semantics and topology with frozen Wave 1 values.

Historical V2 and Wave 1 fixture replay remains unchanged. Current-source tests now verify dynamic canonical-universe collection, topology/source partition reconciliation, current classifier consistency, aggregate partition coverage, and scanner agreement with the current compiler output. No fixed replacement value of 17 and no Wave-specific test logic was introduced.
