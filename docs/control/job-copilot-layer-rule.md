# Job Copilot Layer Rule

## Purpose

This document defines the operating contract for diagnosing and fixing Job Copilot issues by layer.

The goal is to stop surface-level patching and keep fixes inside the layer where the real failure lives.

## Core Rule

- Diagnose the failing layer before code changes.
- Do not cross-layer patch.
- Fix the highest-priority failing layer first.
- Only move to downstream cleanup after the upstream layer is correct and verified.

## Layer 1: JD Role Reading

### Purpose

Read the job description correctly:
- identify the true job subject
- identify supporting lines
- preserve subject hierarchy
- keep main role separate from supporting context, bridge themes, and mode

### Inputs

- raw JD text
- job title
- company context
- extracted requirement clusters
- JD role-structure interpretation inputs/diagnostics

### Outputs

- true role subject
- primary role family direction
- supporting subject lines
- subject hierarchy used downstream by owner selection and proof selection

### NGO / pass criteria

- the main role is not replaced by a supporting line
- governance / strategy / standards / risk / commercial subject can remain primary even when reporting, enablement, or insights are present
- mixed roles keep the right subject hierarchy instead of collapsing into a safe generic label

### Failure symptoms

- all sections drift together in the same wrong direction
- top-line subject is wrong
- a supporting line is promoted to the main role
- governance / standards / methodology / risk-led role collapses into reporting / insights / KPI leadership

### Bugs that belong here

- wrong family/subject interpretation from the JD
- supporting signals becoming the main role
- transformation, reporting, or analytics being treated as subject when they are only context or mode

## Layer 2: Owner Selection

### Purpose

Choose the final owner once the JD subject is already roughly correct.

### Inputs

- selected JD-fit set
- owner candidates
- fit-governed ranking
- native vs bridge classification
- overlay/native diagnostics used for owner arbitration

### Outputs

- final selected owner
- authoritative owner context used for downstream subject framing

### NGO / pass criteria

- the selected owner matches the already-correct JD subject direction
- bridge/supporting clusters do not steal ownership from stronger role-native candidates
- replacement-owner selection remains role-faithful when a blocked candidate is removed

### Failure symptoms

- JD direction is roughly correct, but the chosen owner is wrong
- a bridge-like candidate wins after a better native candidate already exists
- a mixed role falls to the wrong replacement owner after the top candidate is blocked

### Bugs that belong here

- owner arbitration bugs
- native/bridge eligibility mistakes
- replacement-owner ranking mistakes

## Layer 3: Role-Native Proof Selection

### Purpose

Select proof, evidence ordering, risk family, and action family that actually prove the resolved role-native subject.

### Inputs

- authoritative resolved subject / owner context
- selected evidence / representative anchors
- proof-family context
- why-you / risk / recommendation assembly helpers

### Outputs

- strongest proof family
- supporting evidence order
- biggest risk family
- confirm-one-key-fact family
- recommended action family

### NGO / pass criteria

- strongest proof proves the same family the verdict claims
- supporting bullets rank subject-aligned evidence first
- transferable analytics/support proof is fallback, not default
- biggest risk stays in the same family context as the role subject

### Failure symptoms

- verdict says one family but strongest proof sounds like another
- supporting bullets reinforce a different family
- biggest risk or confirm-one-key-fact drifts into adjacent capability language

### Bugs that belong here

- wrong strongest-proof family
- wrong evidence ordering
- wrong risk/action family despite a correct role subject

## Layer 4: Rendering

### Purpose

Express the already-selected subject, owner, and proof consistently in the UI/output.

### Inputs

- authoritative selection contract
- proof selection outputs
- renderer/view-model formatting helpers

### Outputs

- displayed Career Verdict
- displayed Why You
- displayed Biggest Risk
- displayed supporting bullets / evidence references

### NGO / pass criteria

- displayed sections are internally consistent
- renderer does not contradict already-correct upstream logic
- formatting does not introduce a different family or subject

### Failure symptoms

- logic is mostly right, but the displayed sections conflict
- wording drift appears only in presentation assembly
- the panel shows inconsistent labels despite aligned upstream debug state

### Bugs that belong here

- renderer-only inconsistency
- formatting/template mismatch
- display ordering bug when underlying proof ordering is already correct

## Diagnosis Rule

Before changing code, state:
1. failing layer
2. reason for diagnosis
3. out-of-scope layers
4. allowed files
5. replay validation cases

## Example: QA Performance & Standards

### Expected diagnosis

- primary failure: Layer 1
- secondary failure: Layer 3
- not primarily Layer 2
- not primarily Layer 4

### Why

- the JD role itself was being read too much as reporting / insights / KPI leadership
- governance / standards / methodology / risk-led subject matter was present, but supporting reporting signals were promoted too far
- once the top-line subject drifted, downstream proof also drifted
- owner selection was not the primary problem because the root issue started before final owner choice
- rendering was not the primary problem because the wrong family was already present in upstream logic

### Correct handling

- fix Layer 1 first so governance / standards / methodology remains the main role subject
- then, if needed, clean up Layer 3 proof-family alignment
- do not patch wording alone

## Pass/Fail Heuristic

- If all sections drift together, suspect Layer 1 first.
- If the subject looks roughly right but the chosen owner is wrong, suspect Layer 2.
- If verdict is right but proof/risk family is wrong, suspect Layer 3.
- If logic is right in debug state but display is inconsistent, suspect Layer 4.
