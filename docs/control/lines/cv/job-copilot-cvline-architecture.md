Status
- secondary-authority
- cv-line execution architecture

Default Read
- targeted

When To Read
- when the active line is CV / Why You / proof-chain related
- when failing layer diagnosis is required for CV-line work
- before bounded repair admission on CV-line owner problems

Do Not Use For
- default startup read outside CV-line work
- current next-action routing
- accepted system-truth storage
- prose template generation by itself

# Job Copilot CV-line Architecture (Bootstrap)

## Purpose

Define a lightweight execution architecture for CV / `Why you` / proof-chain work.

This reuses the proven CareerTwin execution skeleton:
- founder-safe scope discipline
- mode and gate discipline
- artifact-first audit loop
- first drift point and first writable fault logic
- single-main-next-action decisions

This document does **not** reuse JD-line-specific role-reading contract semantics.

## Scope

In scope:
- CV output quality
- `Why you` proof quality
- proof genericity vs buying proof
- evidence family compatibility
- proof admission
- leading/ordering emphasis
- render wording quality

Out of scope:
- Layer 1 JD ownership/root-cause reopening
- interview continuation architecture
- broad repo cleanup/refactor

## Core Rule

- Diagnose failing layer before code changes.
- Fix the earliest supported failing layer first.
- Do not patch render wording when proof admission or compatibility is still wrong.
- Keep changes narrow and validation proportional.

## Primary Execution Layering Authority

- For substantial CV / `Why you` / proof-chain execution diagnosis, use Layer A/B/C/D/E in this document as the primary execution model.
- `cv-layer-rule.md` remains a simplified high-level overview for orientation and explanation.
- Substantial diagnosis, first drift isolation, first writable fault isolation, and repair admission should run against A/B/C/D/E first.

## Layer A - Evidence Generation Layer

### Owns
- raw evidence unit quality before family checks or admission
- whether evidence units are concrete, role-usable, and non-malformed

### Does Not Own
- family compatibility policy
- admission thresholds
- ordering/leading decisions
- final wording

### Typical Failure
- evidence units are generic, malformed, duplicated, or too abstract to serve as buying proof

### Move Rule
Stop blaming Layer A when evidence units are concrete and usable, but wrong proof still leads because of admission or ordering rules.

## Layer B - Evidence Family / Compatibility Layer

### Owns
- family tagging and compatibility between evidence families and resolved role subject family
- compatibility constraints (what can support vs what can lead)

### Does Not Own
- raw evidence generation quality
- final proof admission decisions
- final render copy

### Typical Failure
- shared/default analytics families are treated as equally compatible lead proof for non-analytics subjects

### Move Rule
Stop blaming Layer B when compatibility is correct, but bad proof still appears because admission or ordering ignores compatibility output.

## Layer C - Proof Admission Layer

### Owns
- which evidence enters the `Why you` / CV proof set
- admission thresholds and exclusions for weak/generic proof

### Does Not Own
- raw evidence generation
- family assignment logic itself
- final lead ordering among admitted items
- render wording templates

### Typical Failure
- generic/shared stems are admitted into lead-eligible slots despite stronger subject-aligned proof being available

### Move Rule
Stop blaming Layer C when admission set is sound, but lead emphasis is still wrong due to ordering.

## Layer D - Leading / Emphasis / Ordering Layer

### Owns
- what leads vs what is supporting among admitted proof
- top-bullet/line ordering and emphasis

### Does Not Own
- upstream evidence generation quality
- family compatibility definition
- admission gate policy
- wording style and sentence templates

### Typical Failure
- admitted proof is valid, but shared/default proof leads and role-defining proof is subordinated

### Move Rule
Stop blaming Layer D when ordering is correct and remaining issue is low-conviction or taxonomy-heavy wording.

## Layer E - Render / Wording Layer

### Owns
- final phrasing clarity, brevity, and buying-case readability
- display shaping for consumer readability

### Does Not Own
- evidence generation
- family compatibility
- proof admission
- leading-proof selection decisions

### Typical Failure
- output reads like generic AI explanation instead of concise buying-case reasoning, despite correct proof selection

### Move Rule
Stop blaming Layer E when wording changes cannot fix weak proof content without changing upstream admission/compatibility behavior.

## Diagnosis Rule (Before Any Fix)

State:
1. current task type
2. failing layer
3. reason for diagnosis
4. out-of-scope layers
5. allowed files
6. replay validation sample

## Fast Heuristic

- If evidence itself is weak/generic before selection: suspect Layer A.
- If non-compatible families are treated as lead-compatible: suspect Layer B.
- If wrong proof enters lead-eligible set: suspect Layer C.
- If right proof is admitted but loses lead: suspect Layer D.
- If proof is right but sentence quality is poor: suspect Layer E.
