# CV Line Architecture

Document role: local architecture definition for the CareerTwin CV / Resume line.

This file defines:
- what the CV line is responsible for
- where semantic ownership sits
- how downstream shaping should behave
- what the main failure surfaces are

This is not a global operating-system file.
Global loop discipline belongs to:
- `docs/control/em-operating-system.md`
- `docs/control/policy-registry.md`

---

## 1. Line mission

The CV line exists to convert trusted CareerTwin role understanding plus candidate evidence into a role-aligned, evidence-grounded CV positioning output.

The CV line must:
- preserve the intended role direction
- preserve evidence truth
- sharpen positioning
- improve relevance and hiring readability
- avoid unsupported inflation

The CV line must not:
- invent candidate capability
- replace trusted upstream role meaning with a different role
- overstate ownership not supported by evidence
- turn weak adjacent proof into strong native proof
- optimize for eloquence over truth

---

## 2. High-level architecture

The CV line should be treated as a staged transformation pipeline:

1. Role Positioning Input
2. Evidence Selection and Evidence Weighting
3. CV Positioning Control
4. CV Writing / Rendering

This is the local 4-layer architecture for CV work.

---

## 3. Layer definitions

## Layer 1 - Role Positioning Input

This layer owns the upstream role direction that CV should follow.

Inputs may include:
- authoritative role verdict from Job Copilot
- role family
- role statement
- subject type
- role shape
- primary positioning direction
- key must-prove requirements
- risk / gap posture if available
- post-quick-check clarified proof context
- unlock-informed positioning implication (if surfaced upstream)

These are inherited inputs from upstream judgment and clarification paths.
They are not CV-line-generated semantics.

This layer is the semantic source of truth for CV positioning.

It owns:
- what role the CV is trying to position for
- what kind of proof matters most
- what must not be overclaimed
- the basic direction of emphasis

It must not:
- be replaced later by generic wording preferences
- be silently overridden by downstream bullet-writing logic
- be re-authored by a renderer or template

Typical failure surfaces:
- wrong role direction enters CV
- role direction is too generic
- role direction weakens during transport into CV line
- downstream CV logic ignores trusted upstream role shape

---

## Layer 2 - Evidence Selection and Evidence Weighting

This layer owns the candidate-side evidence chosen to support the CV.

It should answer:
- which evidence is most relevant for this role
- which evidence is strong native proof
- which evidence is supporting only
- which evidence should be deprioritized
- which evidence would be misleading if overused

It owns:
- evidence ranking
- evidence sufficiency by requirement
- selection of strongest proof themes
- exclusion of weak or misleading proof

It must:
- stay evidence-grounded
- prefer role-relevant proof over generic strongest-in-profile proof
- preserve proof-family purity where required
- keep broad leadership broad when the target role is broad
- keep specialist proof specific when the target role is specific

It must not:
- let adjacent evidence replace the intended role subject
- over-index on broadly impressive but role-misaligned achievements
- treat unsupported transferable hints as equivalent to proof

Typical failure surfaces:
- wrong evidence selected
- adjacent proof promoted to primary
- native evidence underweighted
- misleading evidence overused
- overly broad profile residue dilutes target positioning

---

## Layer 3 - CV Positioning Control

This layer owns the translation from role direction + selected evidence into CV strategy.

It should define:
- headline direction
- summary emphasis
- bullet emphasis
- claim strength policy
- what to foreground
- what to soften
- how to handle gaps
- what not to imply

This is the control layer for CV shaping.

It owns:
- positioning thesis
- narrative stance
- emphasis policy
- gap handling policy
- honesty / restraint rules

It must:
- treat unlock-informed positioning implication as inherited context only, not as a second interpretation layer
- preserve the same subject line as upstream role positioning
- preserve evidence truth
- shape emphasis without changing semantic ownership
- stop downstream writing from becoming generic or inflated

It must not:
- create a second role center
- re-decide the target role
- switch from native positioning to adjacent positioning because wording sounds better
- turn support evidence into native claim language

Typical failure surfaces:
- CV headline drifts from role target
- summary becomes generic
- bullets overclaim
- risk handling disappears
- output sounds polished but semantically wrong

---

## Layer 4 - CV Writing / Rendering

This layer owns the actual CV wording and presentation.

It may:
- phrase
- compress
- reorder for readability
- shape bullets
- improve readability and recruiter usability

It must:
- remain consumer-only relative to Layers 1-3
- keep the same role direction
- keep the same evidence truth
- preserve claim-strength policy
- preserve gap-handling policy

It must not:
- invent new claims
- rewrite the role target
- change evidence priority
- upgrade tentative positioning into strong native claim
- smooth away important limitations

Typical failure surfaces:
- elegant but inflated wording
- generic summary drift
- bullet-level exaggeration
- loss of useful specificity
- repeated generic phrases instead of real positioning

---

## 4. Core invariants

These invariants should hold across the CV line:

### Invariant 1 - Same target role direction
Headline, summary, emphasis, and bullets must all speak from the same target role direction.

### Invariant 2 - Evidence truth preserved
No unsupported claim should appear in the CV.

### Invariant 3 - Positioning may sharpen, not re-author
CV control may sharpen the case, but must not replace the target role or proof family.

### Invariant 4 - Claim strength must be controlled
Weak support cannot be phrased like strong native proof.

### Invariant 5 - Gap handling must be explicit
If there is a meaningful gap, the CV line must not silently erase it through overclaiming.

### Invariant 6 - Rendering is consumer-only
Final writing must not take semantic ownership back from earlier layers.

---

## 5. Common failure patterns

Common CV-line failure patterns may include:

1. upstream role direction is correct, but evidence selection is wrong
2. evidence selection is acceptable, but positioning control becomes generic
3. positioning control is acceptable, but final writing inflates claims
4. broad leadership targets collapse into generic analytics wording
5. specialist targets get diluted by broad transferable residue
6. native proof is replaced by adjacent proof because it sounds smoother
7. gap-sensitive roles are written as if no gap exists
8. CV ignores post-quick-check clarified proof and over-relies on weaker pre-check interpretation

---

## 6. Drift diagnosis order

For substantial CV issues, try to identify drift in this order:

1. Role Positioning Input
2. Evidence Selection and Weighting
3. CV Positioning Control
4. CV Writing / Rendering

Do not blame rendering first if the role direction or evidence stack is already wrong.
Do not reopen upstream role direction if the real issue is only final wording inflation.

---

## 7. Current architectural principle

The CV line is not a free-writing system.
It is an evidence-grounded positioning system.

That means:
- role meaning must be inherited, not reinvented
- evidence must drive claims
- positioning control must constrain writing
- rendering must not regain semantic ownership

---

## 8. Local operating reminder

Before any CV repair or audit:
- identify failing layer
- identify first drift point
- identify first writable fault
- decide whether the problem is:
  - role-input
  - evidence-selection
  - positioning-control
  - rendering-only

Do not jump straight to "rewrite the CV."
