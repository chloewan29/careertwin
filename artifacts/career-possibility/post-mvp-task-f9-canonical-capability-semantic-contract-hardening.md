# Post-MVP Task F.9 — Canonical Capability Semantic Contract Hardening

## Decision

Product/semantic judgment: `TASK_F9_CANONICAL_SEMANTIC_CONTRACTS_READY`.

The existing canonical authority now defines compact, evidence-grounded semantics for all 51 admitted capability identities. This changes canonical meaning, not the inference architecture. No provider was called or modified by F.9.

## Source authority and immutable inputs

- Canonical owner: `lib/career-possibility/canonical-capability-library.ts`
- F.8 audit: 51 capabilities, 12 families, 0 strong/partial existing contracts, 22 label-only identities, 29 ambiguous identities, 51/51 missing decision boundaries, and 51 proposed contracts.
- F.8 artifact SHA256 verified: `3119CA7111A5D56F6774BA34AFA4EF17B6B88B28C017E501A7C258B704F0A9C4`.
- Ratified benchmark: `structured-inference-coverage-benchmark/2.1.0`.
- Benchmark SHA256 verified: `B4BC948CABB7D37C032CF3080056C804872B7F523315FB1B36A4EC76F083A55A`.
- Benchmark and F.8 artifact remained read-only.

## F.8.1 semantic rule and boundaries

The implementation uses performed professional behaviour and observable responsibility/outcome as evidence. It excludes likelihood inferred from context, title, employer, qualification, target role, or seniority.

- Analytics Governance: workspace/tool enablement alone is insufficient without standards, controls, definitions, quality, access, or decision rules.
- Commercial Partnerships: collaboration or a joint institutional programme alone is insufficient without material commercial purpose/value.
- Service Performance: transformation, process, or programme work alone is insufficient without responsibility for, measurement of, or improvement to service outcomes.

All three boundaries are explicit and deterministically tested.

## Canonical inventory

Before and after inventories are identical except for semantic fields and the content version.

- Capabilities: 51 before; 51 after.
- Families: 12 before; 12 after.
- Content version: `1.2.0` before; `1.3.0` after. This is the smallest minor content increment for materially enriched canonical meaning with unchanged schema and identities.
- Identity fields before: `id`, `label`, `family`.
- Semantic fields after: `definition`, `positiveEvidence`, `notSufficient`, `distinctions`.
- IDs, labels, ordering, and family memberships: unchanged.

Identity inventory by family:

- Analytics & Insight: forecasting, insight-synthesis, marketing-effectiveness, measurement-design, research-design, scenario-modelling, variance-analysis.
- Commercial: account-growth, commercial-negotiation, commercial-partnerships, consultative-selling, pipeline-management.
- Communication & Collaboration: education-partnerships.
- Customer & Market: audience-insight, customer-adoption, customer-segmentation.
- Data & Technology: legal-technology, tooling-enablement.
- Governance & Risk: analytics-governance, architecture-governance, investment-governance, operating-control, policy-governance, regulatory-compliance, risk-controls.
- Leadership: business-ownership, commercial-leadership, people-leadership.
- Learning & Development: education-delivery.
- Operations & Delivery: cross-functional-delivery, dependency-management, ecosystem-operations, operating-rhythm, process-improvement, service-performance.
- People & Organisation: employee-relations, hr-systems, organisation-design, people-process, talent-planning, workforce-advisory.
- Product: product-insights, product-cadence, roadmap-governance.
- Strategy & Transformation: benefits-realisation, change-leadership, market-strategy, operating-model, operating-strategy, partner-strategy, strategic-analysis.

## Contract coverage and integrity

- Definitions: 51/51.
- Positive-evidence criteria: 51/51, each with 2–4 concise behaviour/responsibility/outcome tests.
- Not-sufficient criteria: 51/51, each with 2–4 contextual-overreach protections.
- Capabilities with at least one neighbour distinction: 51/51.
- Total directed distinction relationships: 104.
- Unknown references: 0.
- Self references: 0.
- Duplicate neighbour references within a contract: 0.
- Duplicate capability IDs, missing identities, or added identities: 0.
- Placeholder language: 0.

The authority validator now rejects absent or malformed contracts and invalid distinction references. A pure deterministic serializer exposes the compact semantic context for later evaluation; it is not wired to the provider.

## Duplicate and ambiguity audit

The three F.8 duplicate-risk pairs are distinct under explicit decision boundaries:

- Operating Control / Risk and Controls: routine operational stability versus controls treating defined risks.
- Product Operating Cadence / Operating Rhythm: product discovery/outcome/learning cycle versus domain-general management cadence.
- Commercial Partnerships / Partner Strategy: operating material joint commercial value versus choosing partner roles, value logic, and portfolio direction.

All 12 F.8 cross-family ambiguity groups have explicit boundaries and are classified `RESOLVED_BY_CONTRACT`. No material unresolved semantic duplicate or cross-family ambiguity remains. Education Partnerships, Legal Technology, and Tooling Enablement remain in their existing families; their definitions clarify the identity without taxonomy movement.

## Benchmark and role readback

- Required expectations consistent: 42/42.
- Allowed-optional expectations consistent: 26/26.
- Forbidden expectations consistent: 89/89.
- Benchmark semantic conflicts: 0.
- All 51 capabilities are used by at least one current role profile; unused: 0.
- Material role semantic conflicts: 0.
- Maximum assessments per evidence remains 3.
- Structured-inference provider, inference validator/output schema, materializer, and graph projection were not modified by F.9.

## Compactness and runtime feasibility

- Serialized semantic context: 45,294 characters.
- Approximate tokens (characters / 4): 11,324.
- Prior identity-only canonical context: 4,458 characters.
- Relative size: 10.16x prior context; increase of 40,836 characters (916%).
- Average serialized contract: 887 characters.
- Minimum serialized contract: 799 characters.
- Maximum serialized contract: 1,109 characters.
- Classification: `FEASIBLE_WITH_MATERIAL_CONTEXT_INCREASE`.

The increase is material and above the F.8 estimate, but the full context remains feasible for the controlled F.10 experiment. No semantic boundary was removed to reduce size.

## Verification

Passed focused checks:

- canonical semantic-contract integrity
- canonical capability library and content-version transitions
- canonical definition adapter
- canonical family membership
- role/canonical registry reconciliation
- structured-inference benchmark deterministic contract

Passed broader regressions:

- canonical personal capability inference
- structured capability mapping
- Career Map graph projection
- ranked Career Map graph projection

Engineering gates passed:

- `npx tsc --noEmit`
- targeted ESLint over the exact F.9 production/test files
- `npm run build`

An existing generic-role UI source-literal assertion remains red because the intentionally dirty `app/career-map/page.tsx` no longer contains the asserted literal. The semantic validation and role reconciliation portions pass, the route is outside F.9, and F.9 did not modify or stage it.

## Scope and future lock

No Gemini/provider benchmark, Founder holdout, prompt experiment, decomposition experiment, or partitioning experiment ran. F.10 should first compare the simplest single-stage, full-evidence-batch, full-canonical-set architecture with these compact contracts as the only new semantic variable. Control memory update remains a separate F.9 closure task.
