Status
- secondary-authority
- policy index and precedence map

Default Read
- targeted

When To Read
- when policy precedence, startup-load rules, stop conditions, continuation authority, or conflict resolution must be checked

Do Not Use For
- default full startup read
- current next-action routing
- accepted system-truth storage
- line-local operational detail

# CareerTwin Policy Registry

Document role: authoritative registry of cross-line development policies used by the CareerTwin EM operating system.

This file is not the architecture document for any single line.
It is the policy index and precedence map for reusable development rules.

Use this registry to answer:
- what policies currently exist
- what each policy controls
- where each policy applies
- when each policy is triggered
- what files hold the detailed implementation guidance
- which policy takes precedence when multiple policies are relevant

---

## 1. How to use this registry

This registry is the global index for reusable loop-control and founder-safe execution policies.
Use it with `docs/control/current-system-memory.md` as the default current-system memory snapshot.

Each policy entry should define:
- policy name
- intent
- scope
- trigger
- stop condition if relevant
- detailed source file(s)
- precedence notes

This file should stay short enough to be readable.
Do not duplicate the full text of every rule here.
Store the full rule text in:
- `AGENTS.md`
- `docs/control/em-operating-system.md`
- line-specific docs
- skill files
- agent instructions

This registry should point to those detailed sources.

## Default lookup rule

Do not read this file in full by default during light-mode startup.

Use this registry only for targeted lookup when one of these is true:
- policy conflict or contradiction is detected
- task type requires a specific policy check
- continuation authority is unclear
- founder-boundary vs local-loop autonomy must be resolved
- startup-load profile, stop-condition, or one-main-next-action policy must be confirmed

In normal light-mode startup:
- read `docs/control/current-active-brief.md` first
- then read `docs/control/current-system-memory.md`
- then consult only the specific policy entries needed for the current task

---

## 2. Policy precedence model

When multiple policies apply, use this general precedence order:

1. safety / founder-safe stop conditions
2. active-baseline and revert rules
3. repair admission and allowed-scope rules
4. line-specific architecture boundaries
5. measurement cadence rules
6. owner-priority and regroup rules
7. convenience / automation continuation rules

Interpretation:
- never let automation convenience override repair safety
- never let cadence override revert when a broader gate has already failed
- never let owner-priority override line architecture boundaries
- never let execution continuation override a true stop condition

If a conflict still remains unresolved:
- remain in AUDIT or HOLD
- state the conflict explicitly
- do not improvise a hybrid rule

---

## 3. Core global policies

### Policy: Current-system-memory sync enforcement rule
- intent: make major accepted design/architecture/operating-truth updates durable by requiring sync into one default current-truth memory surface
- scope: all lines
- trigger:
  - startup/resume and substantial new-window work
  - any major accepted truth change in architecture, ownership/contract truth, active line structure, North Star/rubric direction, EM/harness policy, terminology boundary, or freeze/baseline/phase-close status
- required behavior:
  - treat `docs/control/current-system-memory.md` as default current-truth sync surface
  - run pre-work freshness check before substantial audit/repair/architecture/policy work
  - if stale, update current-system-memory first or in the same patch
  - require major-judgment accountability fields: `memory_sync_required` and `memory_sync_targets`
  - if major truth changed but memory sync did not land, loop is not fully closed
- detailed source:
  - `docs/control/current-system-memory.md`
  - `docs/control/em-operating-system.md`
- precedence: high control-memory discipline; subordinate to safety/repair-gate/stop-condition policies and subordinate to active line plan for active-stage state

### Policy: Startup context-load profile rule
- intent: reduce token cost while preserving governance by defaulting to a compressed startup read path, then expanding only when required
- scope: all lines
- trigger:
  - substantial new-window startup
  - branch-local continuation in AUDIT mode
- required behavior:
  - start from `docs/control/current-active-brief.md`
  - then read `docs/control/current-system-memory.md`
  - use targeted sections from `docs/control/em-operating-system.md` and targeted policy entries from `docs/control/policy-registry.md`
  - read active line plan latest entries before broad historical docs
  - avoid full control-stack load unless expansion trigger is active
- expansion triggers:
  - mode change to REPAIR/MEASURE
  - cross-line routing or founder-boundary judgment
  - baseline admission/freeze/phase-close decisions
  - policy conflict or unstable writable-fault triage requiring broader context
- detailed source:
  - `docs/control/em-operating-system.md`
  - `docs/control/current-system-memory.md`
- precedence: below safety/repair-gate/stop-condition policies; above convenience-only continuation shortcuts

### Policy: Founder-safe execution rule
- intent: keep work narrow, diagnosable, recoverable, and low-regret
- scope: all lines
- trigger: any substantial diagnosis / repair / measurement loop
- detailed source:
  - `AGENTS.md`
  - `docs/control/em-operating-system.md`
  - `careertwin-founder-operating-rules`
- precedence: highest practical operating policy after hard safety stops

### Policy: Task-type discipline
- intent: require explicit classification of diagnosis / fix / cleanup / verification / architecture review
- scope: all lines
- trigger: before meaningful work
- detailed source:
  - `docs/control/em-operating-system.md`
  - `careertwin-founder-operating-rules`
- precedence: high; must be resolved before repair admission

### Policy: Truth-path terminology boundary rule
- intent: prevent architecture drift by separating truth layer, consumer/output path, and implementation-local file naming in audits/plans/summaries
- scope: all lines, especially Job Copilot proof-chain/tailored-output work
- trigger: when writing diagnosis, control-doc updates, EM/planner/auditor summaries, or architecture-boundary statements
- required boundary language:
  - Career Memory / Evidence = truth layer
  - CV = bootstrap evidence source (not truth layer)
  - tailored resume behavior = tailored CV consumer path / evidence-to-tailored-CV output path / tailored output composition path
  - `resume-*` files = implementation surfaces only (not architecture names)
  - do not use `CV line`, `resume line`, or `resume rewrite layer` as architecture terms unless explicitly marked as legacy context
- required classification step before issue description:
  - classify as exactly one:
    - `truth / memory layer issue`
    - `consumer / output-path issue`
    - `implementation-local issue`
  - implementation-local naming must not redefine the architectural bucket
- detailed source:
  - `docs/lines/cv/line-plan.md`
  - `docs/system_map.md`
  - `docs/canonical_schema.md`
- precedence: high for wording/ownership correctness; does not change repair-gate or validation-gate decisions

### Policy: Buy-side decision North Star rule
- intent: keep Career Verdict, Why You, Biggest Risk, Quick Checks, and CTA aligned to one shared buy-side decision thesis
- scope: Job Copilot decision-quality work affecting verdict/risk/recommendation/CTA surfaces
- trigger: substantial diagnosis, repair admission, repair design, or validation that touches these surfaces or their cross-surface consistency
- required quality assertions:
  - represent one thesis chain: what buyer is buying, candidate credibility, key hesitation, smallest uncertainty-reducing question, best next credibility action
  - treat cross-surface inconsistency as a defect
  - keep confidence and claim strength calibrated to evidence
  - prioritize highest-value buy-point first; keep secondary buy-points secondary
  - avoid generic capability-collage wording when it weakens buy-side purchase relevance
- execution boundary:
  - this policy defines outcome quality, not execution freedom
  - it does not bypass layer diagnosis, first drift/first writable fault isolation, repair admission gates, proportional verification, or founder boundary rules
- detailed source:
  - `docs/control/em-operating-system.md`
  - `docs/verification/audit-output-schema.md` (Job Copilot Buy-side North Star Rubric)
  - `docs/product/why-you-buying-case-checklist.md`
  - `docs/product/careertwin-product-principles.md`
- precedence: high for output-quality direction; subordinate to safety, repair-gate, and stop-condition policies

### Policy: Section synthesis family-safety invariant
- intent: ensure user-facing section synthesis remains case-local and family-safe across roles; prevent cross-role residue patching loops
- scope: Job Copilot user-facing section synthesis and section-copy precedence paths
- applies to sections:
  - Career Verdict
  - For you
  - Why You thesis
  - Biggest Risk
  - Quick Checks
  - CTA
  - What This Role Adds
- trigger: whenever section text is synthesized in Layer 4, or adjacent feeders inject section-copy inputs consumed by Layer 4
- invariant:
  - no phrase may appear in a user-facing section unless supported by the current case's own source signals
- prohibitions:
  - cross-role phrase leakage
  - source-family mismatch
  - stale template carryover
  - section text unsupported by current-case signals
- boundary:
  - this does not hard-lock the full evidence pool to one role family
  - evidence selection may remain broad; the invariant applies to surface phrasing and section-level synthesis
- operational rule:
  - if a candidate phrase fails family-safety against current-case anchors, drop it or replace it with a neutral case-local fallback
- owner level:
  - section synthesis / precedence path (Layer 4)
  - directly adjacent synthesis feeders only when they inject section-copy inputs
- detailed source:
  - `docs/control/em-operating-system.md`
  - `docs/control/current-system-memory.md`
- precedence: high for user-facing synthesis integrity; subordinate to safety/repair-gate/stop-condition policies

### Policy: JD-line vs proof-chain routing adapter rule
- intent: require explicit line routing before diagnosis/repair so JD-line tasks use JD-line semantics and proof-chain tasks use proof-chain semantics
- scope: Job Copilot line work where both JD-line and proof-chain surfaces exist (`Why you`, panel proof quality, CV proof emphasis, proof admission/ordering/render)
- trigger: before substantial diagnosis, repair admission, or mode transition
- detailed source:
  - `docs/control/em-operating-system.md`
  - `docs/control/job-copilot-layer-rule.md`
  - `docs/control/lines/cv/job-copilot-cvline-architecture.md`
  - `docs/control/job-copilot-proof-chain-audit.md`
  - `docs/control/lines/cv/job-copilot-cvline-decision-template.md`
- precedence: high; line-routing must be resolved before first-drift and first-writable-fault diagnosis
- naming clarification: current `cvline` filenames are bootstrap shorthand for the active proof-chain control surface

### Policy: One-main-next-action rule
- intent: force exactly one judgment label and one main next action
- scope: all lines
- trigger: every substantial loop decision
- detailed source:
  - `docs/control/em-operating-system.md`
  - `AGENTS.md`
  - `em.toml`
- precedence: high; prevents branching chaos

### Policy: Main-next-question discipline rule
- intent: force exactly one highest-information next audit question before selecting the next step
- scope: all lines
- trigger: substantial audit outputs, especially mixed-truth or blocked-repair states
- detailed source:
  - `docs/verification/audit-output-schema.md`
  - active line plan
- precedence: high; prevents vague "continue audit" loops

### Policy: Audit output schema rule
- intent: keep substantial audit/admission outputs founder-readable and structurally consistent
- scope: all lines
- trigger: substantial audit, measurement, or admission-review outputs
- detailed source:
  - `docs/control/em-operating-system.md`
  - `docs/verification/audit-output-schema.md`
- precedence: high; supports judgment and next-action consistency

### Policy: LLM boundary observability rule
- intent: make provider-vs-parser boundary ownership explicit before repair discussion when cold-start variance is present
- scope: LLM-led lines (especially Layer 1 boundary audits)
- trigger: fixed-input drift, cluster splits, or mixed provider/parser attribution
- detailed source:
  - `docs/control/llm-boundary-audit-procedure.md`
  - `docs/verification/audit-output-schema.md`
  - `.codex/skills/job-copilot-provider-boundary-audit/SKILL.md`
  - active line plan
- precedence: high for audit routing under boundary ambiguity; does not override repair-gate safety

### Policy: Layered instability audit default rule
- intent: enforce layered narrowing before repair for instability/drift/weird-gate/recurring-family cases
- scope: all lines that show unstable outputs or ambiguous boundary ownership
- trigger: instability symptoms where ownership is not yet stable enough for repair admission
- required minimum sequence:
  - prove whether input is fixed
  - determine whether drift is random or cluster-shaped
  - distinguish cold-start split from warmed lock
  - identify first visible difference
  - identify earliest supported owner
  - distinguish inherited vs newly introduced downstream differences
  - if family-fixed still splits, switch to semantic delta attribution
  - make explicit ROI judgment before continuing deep audit
- mode decision requirement: end each substantial instability audit by choosing exactly one mode:
  - `freeze/park`
  - `continue audit`
  - `candidate control-surface exploration`
- detailed source:
  - `.codex/skills/layered-instability-audit/SKILL.md`
  - `docs/verification/instability-audit-template.md`
- precedence: high for instability routing; does not override repair-gate safety

### Policy: Blocker/outcome routing rule
- intent: classify blocker and outcome class, then route to a default next-step type with explicit override-only-by-justification
- scope: all lines (taxonomy values may remain line-local)
- trigger: substantial audit outputs that declare blocker state and next action
- detailed source:
  - `docs/verification/audit-output-schema.md`
  - `.codex/skills/job-copilot-outcome-routing/SKILL.md`
  - active line plan routing reference
- taxonomy note: when boundary evidence is available, prefer refined blocker classes such as `provider_generation_variance`, `authoritative_parsing_variance`, `projection_retention_gap`, and `trigger_interpretation_variance`
- precedence: high; keeps mode/action consistency and preserves repair blocking under mixed truth

---

## 4. Diagnosis and repair policies

### Policy: First drift point rule
- intent: identify the earliest meaningful drift before proposing fixes
- scope: all lines, adapted locally
- trigger: any substantial mismatch / residual / drift case
- detailed source:
  - `docs/control/em-operating-system.md`
  - line-specific harness or audit skill
- precedence: required before meaningful repair discussion

### Policy: First writable fault rule
- intent: identify the earliest safe writable control surface
- scope: all lines
- trigger: before repair admission
- detailed source:
  - `docs/control/em-operating-system.md`
  - line-specific repair gate
  - line-specific harness
- precedence: required before code change

### Policy: Proof-chain audit bootstrap rule
- intent: apply the same audit-loop and decision-gate discipline used in JD line to proof-chain work (`Why you`, panel proof quality, CV emphasis, and future eligible evidence sources), using the current bootstrap layer model
- scope: Job Copilot proof-chain line (current bootstrap docs use `cvline` naming)
- trigger: substantial output-quality issues involving proof genericity, admission, ordering, or render clarity
- detailed source:
  - `docs/control/lines/cv/job-copilot-cvline-architecture.md`
  - `docs/control/job-copilot-proof-chain-audit.md`
  - `docs/control/lines/cv/job-copilot-cvline-decision-template.md`
- precedence: line-local architecture/audit rule under global founder-safe execution and repair-gate rules

### Policy: Repair admission rule
- intent: block code changes until repair is safely admissible
- scope: all lines
- trigger: before implementation
- detailed source:
  - `docs/control/em-operating-system.md`
  - `AGENTS.md`
  - repair-gate skill(s)
  - `em.toml`
- precedence: higher than execution continuation

### Policy: Allowed-files rule
- intent: constrain implementation to narrow file scope
- scope: all lines
- trigger: admitted repair
- detailed source:
  - `docs/control/em-operating-system.md`
  - repair-gate skill(s)
  - `AGENTS.md`
- precedence: must be satisfied before worker execution

### Policy: Admission/action consistency rule
- intent: prevent contradictory outputs such as Ã¢â‚¬Å“repair allowed = yesÃ¢â‚¬Â with an audit-only next action
- scope: all lines
- trigger: repair-gate outputs and stage transitions
- detailed source:
  - repair-gate skill(s)
  - `em.toml`
  - `docs/control/em-operating-system.md`
- precedence: high; resolves mode/action mismatch

---

## 5. Stage-transition policies

### Policy: AUDIT to REPAIR transition rule
- intent: ensure that once repair becomes admissible, the loop transitions out of AUDIT
- scope: all lines
- trigger: after successful writable-fault stabilization
- detailed source:
  - `docs/control/em-operating-system.md`
  - line-specific repair gate
  - `em.toml`
- precedence: stage consistency rule

### Policy: REPAIR to MEASURE transition rule
- intent: ensure that after admitted repair and successful local validation, the loop moves to MEASURE instead of lingering in REPAIR
- scope: all lines
- trigger: local validation complete and interpretable
- detailed source:
  - `docs/control/em-operating-system.md`
  - repair-gate skill(s)
- precedence: stage consistency rule

### Policy: Failed broader-gate revert rule
- intent: require rollback after failed broader measurement
- scope: all lines
- trigger: broader gate regression
- detailed source:
  - `docs/control/em-operating-system.md`
  - `AGENTS.md`
- precedence: higher than cadence and convenience

### Policy: Post-revert regroup rule
- intent: require regroup/reset when failed-patch evidence may contaminate next owner choice
- scope: all lines
- trigger: after revert if owner map may be unstable
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
  - line audit skill
- precedence: higher than immediate next repair

---

## 6. Baseline and evidence policies

### Policy: Active baseline authority rule
- intent: distinguish active baseline from recent but rejected diagnostic artifacts
- scope: all lines
- trigger: any comparison, owner selection, or baseline admission decision
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
  - `AGENTS.md`
- precedence: very high; diagnostic-only artifacts must not silently become active truth

### Policy: Diagnostic-only artifact rule
- intent: preserve failed-run artifacts as evidence without letting them control the current code truth
- scope: all lines
- trigger: after rejected patches or failed gates
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
- precedence: paired with baseline authority rule

### Policy: Local keepable vs global keep rule
- intent: prevent local validation from being mistaken for baseline admission
- scope: all lines
- trigger: after local validation and before broader gate judgment
- detailed source:
  - `docs/control/em-operating-system.md`
  - `AGENTS.md`
  - `em.toml`
- precedence: very high; one of the core trust rules

---

## 7. Measurement policies

### Policy: Proportional validation rule
- intent: match validation size to repair size and blast radius
- scope: all lines
- trigger: before local validation or broader measurement
- detailed source:
  - `docs/control/em-operating-system.md`
  - `AGENTS.md`
  - line verify strategy
- precedence: general validation rule

### Policy: Measurement cadence rule
- intent: avoid running the heaviest broader gate after every repair by default
- scope: all lines, but each line should define its own cadence details
- trigger: transition into MEASURE
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
  - line verify strategy
- precedence: applies unless an earlier-measure exception is proven

### Policy: Early-measure exception rule
- intent: allow broader measurement before cadence says it is normally due
- scope: all lines
- trigger: shared-path blast radius, mixed local truth, explicit founder instruction, or explicit admission checkpoint
- detailed source:
  - `docs/control/em-operating-system.md`
  - line verify strategy
  - line plan
- precedence: overrides normal cadence only when explicitly proven

### Policy: Measurement continuation rule
- intent: if a justified broader gate is due and runnable, execute it instead of stopping after naming it
- scope: all lines
- trigger: current MODE = MEASURE and step is executable
- detailed source:
  - `docs/control/em-operating-system.md`
- precedence: lower than true stop conditions and cadence qualification

---

## 8. Owner-selection and regroup policies

### Policy: Owner-priority rule
- intent: auto-resolve next owner when multiple candidates exist and a clear winner can be chosen safely
- scope: all lines with multi-owner residual sets
- trigger: post-regroup or post-owner-isolation ranking
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
- precedence: lower than safety and baseline rules, higher than founder checkpoint by default

### Policy: Founder checkpoint rule
- intent: reserve founder review for materially unresolved choices, not routine tie-breaking
- scope: all lines
- trigger: only when explicit policy says the tie is still unresolved
- detailed source:
  - `docs/control/em-operating-system.md`
- precedence: should be rare and justified

### Policy: Regroup/reset rule
- intent: refresh owner map after failed repairs, contaminated branches, or unstable ranking
- scope: all lines
- trigger: after revert or unresolved multi-owner ambiguity
- detailed source:
  - line audit skill
  - line plan
  - `docs/control/em-operating-system.md`
- precedence: before new owner admission when trust is degraded

---

## 9. Re-entry and separation policies

### Policy: Re-entry after rejected line rule
- intent: block casual re-entry into a mechanism family after a recent rejection
- scope: all lines
- trigger: any re-entry near a rejected patch line
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
- precedence: high; overrides normal fresh-repair assumptions

### Policy: Boundary-contract-before-patch rule
- intent: require separation design before further patching when target and guards cannot yet be safely distinguished
- scope: all lines
- trigger: repeated local failures or re-entry instability
- detailed source:
  - `docs/control/em-operating-system.md`
  - line-specific payload/contract control docs (for current Layer 1 blocker: `docs/control/guard-pack-payload-contract.md`)
  - line audit/harness skill
  - line plan
- precedence: high; blocks patch tuning when separation is unproven

### Policy: Separation-proof rule
- intent: a target should not be admitted unless the proposed boundary can admit the target and exclude the chosen guards under the same contract
- scope: all lines using target-vs-guard admission logic
- trigger: boundary-contract simulation or re-entry validation
- detailed source:
  - line-specific prompts / audit steps
  - line plan
  - `docs/control/em-operating-system.md`
- precedence: high for re-entry and separation-dependent cases

---

## 10. Automation and infrastructure policies

### Policy: Execution continuation rule
- intent: do not stop after naming the next action if it is immediately executable
- scope: all lines
- trigger: executable audit, repair, validation, or measurement step
- detailed source:
  - `docs/control/em-operating-system.md`
  - `em.toml`
- precedence: lower than stop conditions and repair admission

### Policy: Audit infrastructure continuation rule
- intent: allow creation of the smallest safe audit-only runner when that is the only blocker to continuing AUDIT
- scope: all lines
- trigger: missing audit runner blocks diagnosis
- detailed source:
  - `docs/control/em-operating-system.md`
- precedence: lower than safety rules; audit-only scope only

### Policy: Worker delegation rule
- intent: separate implementation execution from loop control
- scope: all lines
- trigger: admitted repair or admitted narrow execution step
- detailed source:
  - `docs/control/em-operating-system.md`
  - agent files in `.codex/agents/`
- precedence: operational; used after admission, not before

### Policy: Subagent dispatch default rule
- intent: require real subagent routing by default for covered audit/control workflows rather than role-styled single-agent synthesis
- scope: all lines
- trigger: substantial diagnosis, verification, repair-admission review, line-structure or branch judgment, and repair-validation steps
- detailed source:
  - `docs/control/em-operating-system.md`
  - `.codex/agents/em.toml`
- precedence: operational; below safety, stop-condition, and repair-admission policies, above convenience-only execution shortcuts
- enforcement notes:
  - role-style output sections do not count as dispatched execution
  - direct execution is allowed only for `out_of_scope`, `no_matching_subagent`, or `policy_permitted_direct`
  - direct execution must record bypass reason category and short detail
  - substantial outputs should include execution-mode observability and dispatched-role listing when applicable

### Policy: Subagent context minimization rule
- intent: preserve dispatch quality while avoiding unnecessary context fanout cost
- scope: covered dispatch workflows in all lines
- trigger: when EM routes work to subagents
- required behavior:
  - pass compact, task-local context packets by default
  - include only task contract, in-scope anchors, minimal artifacts, and explicit out-of-scope boundaries
  - avoid broadcasting full control/history stacks to every subagent unless heavy expansion is triggered
- detailed source:
  - `docs/control/em-operating-system.md`
  - `.codex/agents/em.toml`
- precedence: operational efficiency rule; subordinate to safety/repair-gate/founder-boundary policies

### Policy: Plan-update rule
- intent: keep line plans current enough that the loop can resume safely
- scope: all lines
- trigger: after every meaningful loop stage
- detailed source:
  - `docs/control/em-operating-system.md`
  - line plan
- precedence: operational; must follow each meaningful stage

---

## 11. True stop-condition policies

### Policy: True stop condition rule
- intent: define when the loop may legitimately stop instead of continuing execution
- scope: all lines
- trigger: after any stage decision
- detailed source:
  - `docs/control/em-operating-system.md`
  - `em.toml`
- precedence: highest operational stop rule

### Recognized true stop conditions
- required artifacts are missing and cannot be safely generated
- first drift point or first writable fault is still unstable
- repair admission is not satisfied
- repo state is inconsistent
- approval is required
- a founder checkpoint is explicitly justified by policy
- a line-specific rule blocks further automatic progression

---

## 12. Where line-specific detail belongs

This registry only records global policy names and routing.

The following belong elsewhere:

### Line architecture
Store in:
- `docs/lines/<line>/line-architecture.md`

Current bootstrap exception for active Job Copilot proof-chain work (files still named `cvline`):
- `docs/control/lines/cv/job-copilot-cvline-architecture.md`

### Line validation cadence and guard packs
Store in:
- `docs/lines/<line>/line-verify-strategy.md`

### Active baseline, residuals, rejected lines, current stage
Store in:
- `docs/lines/<line>/line-plan.md`
or equivalent plan file

### Line-local payload construction contracts
Store in:
- `docs/control/*.md` (for example `docs/control/guard-pack-payload-contract.md`)
and link from the active line plan when currently operative

### Detailed skill behavior
Store in:
- `.codex/skills/<skill-name>/SKILL.md`

### Agent behavior
Store in:
- `.codex/agents/*.toml`

---

## 13. Maintenance rules for this registry

Update this file when:
- a new reusable policy is introduced
- policy precedence changes
- a formerly local rule is promoted to cross-line use
- a policy is retired or superseded

Do not update this file for:
- one-off tactical prompts
- line-local heuristics that are not yet reusable
- temporary branch-specific experiments

When adding a new policy, include:
- intent
- scope
- trigger
- source file(s)
- precedence note

---

## 14. Final principle

CareerTwin gets more scalable when:
- line-specific architecture stays local
- reusable operating rules become explicit global policy
- failed repairs produce policy improvements
- future lines do not need to rediscover the same loop discipline by hand

This registry exists so the operating system becomes a reusable asset,
not just a collection of remembered conversations.
