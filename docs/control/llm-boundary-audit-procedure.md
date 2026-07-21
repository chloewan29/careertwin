# LLM Boundary Audit Procedure

## Document role
Reusable control procedure for narrowing LLM-boundary drift when fixed-input runs still diverge.
This is audit-only operating guidance.
Use it with the active line plan and `docs/verification/audit-output-schema.md`.

## When to use this procedure
Use when all are true:
- current MODE is `AUDIT` or `HOLD`
- fixed-input claim is uncertain or newly challenged
- fresh cold starts show cross-run divergence
- repair admission is blocked by boundary ownership ambiguity

Do not use this procedure as a repair guide.
It is for narrowing and attribution only.

## Standard narrowing step-chain

### 1) Prove or disprove fixed-input constancy
- When to use: first pass in any suspected boundary drift case.
- Question answered: is input truly invariant across compared runs?
- Evidence to produce: fixed-input hash, input assembly snapshot, session/process ids.
- Wrong conclusion to avoid: treating "same case id" as proof that effective input is fixed.

### 2) Compare live vs frozen/replay parity (when both paths exist)
- When to use: live and replay both participate in current diagnosis.
- Question answered: is drift already present before replay, or introduced by runner boundary mismatch?
- Evidence to produce: paired live/frozen artifacts under same case and comparison frame.
- Wrong conclusion to avoid: replay stability as proof of live-path stability.

### 3) Run canonical payload diff when parity is unclear
- When to use: parity disagreement exists but field ownership is still vague.
- Question answered: which canonical trigger-relevant fields diverge first?
- Evidence to produce: shared field set, shared normalization basis, shared hash basis, field verdict table.
- Wrong conclusion to avoid: comparing noncanonical/debug fields and calling it causal drift.

### 4) Isolate live instability when live path still drifts
- When to use: live repeated invocation still varies under fixed input.
- Question answered: earliest live stage where drift first appears.
- Evidence to produce: repeated live runs with stage-wise snapshots and stability flags.
- Wrong conclusion to avoid: assuming trigger stability means upstream generation stability.

### 5) Attribute variance source (cold-start vs warmed lock)
- When to use: cross-process variance is observed.
- Question answered: does cold-start choose clusters while warmed runs lock cluster choice?
- Evidence to produce: cold vs warmed comparison across sessions with cluster counts.
- Wrong conclusion to avoid: describing behavior as random when it is cluster-shaped.

### 6) Capture provenance chain
- When to use: variance exists but first visible chain stage is still broad.
- Question answered: where does first difference appear from conclusion to gate outcome?
- Evidence to produce: raw conclusion subset, role statement subset, pretrigger subset, trigger/gate outcome.
- Wrong conclusion to avoid: only comparing end hashes without semantic provenance fields.

### 7) Capture provider-vs-parser boundary
- When to use: first visible difference is at/near conclusion, and provider ownership is unclear.
- Question answered: is first split already in raw provider response or first introduced by parsing?
- Evidence to produce: raw provider response/text hash, parser input hash, parsed conclusion subset.
- Wrong conclusion to avoid: claiming parser causality when provider surface was not observed.

### 8) Isolate provider-side variance structure
- When to use: provider is first visible split owner.
- Question answered: is provider variance single-source or multi-source?
- Evidence to produce: provider request/response bundle by cold-start session with cluster labels.
- Wrong conclusion to avoid: collapsing all provider variance into one generic bucket.

### 9) Separate request-family variance vs within-family raw-generation variance
- When to use: provider-side variance is confirmed.
- Question answered: do clusters map to request-shape families, within-family generation variance, or both?
- Evidence to produce: request-body family hashes, per-family cluster mapping, response signatures.
- Wrong conclusion to avoid: inferring request constancy from partial metadata only.

### 10) Determine earliest supported boundary owner
- When to use: first visible stage is known and causal attribution is being assessed.
- Question answered: which boundary owner is best supported by current evidence?
- Evidence to produce: explicit `first visible difference stage`, `first differing field`, `earliest supported boundary owner`.
- Wrong conclusion to avoid: equating first visible stage with proven causal ownership when evidence is mixed.

### 11) Decide writable-fault readiness posture
- When to use: after boundary ownership narrowing.
- Question answered: still audit-only, or near repair-candidate state?
- Evidence to produce: first writable fault status, unresolved uncertainties, repair-block posture.
- Wrong conclusion to avoid: reopening repair while ownership is mixed or unstable.

## Future Similar Case Checklist
- Is effective input actually fixed across compared runs?
- Is drift cluster-shaped or random-looking?
- Do warmed runs lock to cold-start-selected cluster?
- Is first visible split in provider response, parser boundary, or downstream capture?
- Are downstream differences inherited or newly introduced?
- Is variance single-source or mixed (request family + within-family generation)?
- Is blocker better named as `provider_generation_variance`, `authoritative_parsing_variance`, `projection_retention_gap`, or `trigger_interpretation_variance`?
- Is repair still correctly blocked pending stable writable surface?

## Variance tree (compact)
Use this decision tree language instead of "it drifted":

1. input fixed?
2. request-family split?
3. raw provider split within family?
4. parser-introduced split?
5. projection/capture split?
6. trigger split?
7. gate split?

For each branch, classify whether later differences are inherited vs newly introduced.

## Repair-readiness caution
- First visible difference is not automatically first causal boundary.
- Sharper attribution is not automatically repair readiness.
- Mixed provider-side variance remains audit-only until writable surface is stable.
- Keep `4362` repair blocked while blocker `3224` ownership remains mixed or unproven.

## Output alignment note
When this procedure is used, emit results with `docs/verification/audit-output-schema.md` boundary fields:
- `First visible difference stage`
- `First differing field`
- `Earliest supported boundary owner`
- `Cluster identity` and `Cluster count`
- `Are later differences inherited or newly introduced?`
