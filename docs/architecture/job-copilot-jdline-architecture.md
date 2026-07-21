# Job Copilot JD Line Architecture
## Current baseline: LLM-led role reading + thin guard contract control

## 1. Purpose

This document defines the current architecture of the CareerTwin Job Copilot JD line.

It is a local architecture document for the Job Copilot JD line only.
It is not the architecture of the entire CareerTwin product.

This document exists to prevent regression into older, more distributed, heuristic-heavy patterns where multiple layers silently shared semantic ownership.

The current baseline is:

**LLM-led role reading -> thin guard contract control -> authoritative contract transport -> grounded downstream consumption**

The key architectural principle is:

**role meaning is generated upstream, guarded narrowly, transported faithfully, and consumed downstream without being re-authored.**

---

## 2. Why this architecture exists

Historically, JD-line instability did not come only from the initial reading step.
A major source of drift came from semantic ownership being spread across too many downstream paths.

Typical failure modes included:
- a useful upstream role center becoming generic downstream
- a primary subject being replaced by adjacent proof
- renderer/output files re-deriving headline subject, gap, or CTA framing
- recommendation or quick-check paths drifting away from the same primary semantic line
- consumed contract becoming weaker than the upstream role reading

The current architecture exists to solve that problem by restoring a single semantic lead and narrowing the responsibilities of everything downstream.

---

## 3. The current 4-layer model

The JD line still uses a 4-layer model, but it must be interpreted correctly.

This is **not** a 4-layer collaborative meaning-generation stack.

It is a 4-layer architecture with:
- semantic ownership led upstream
- thin guard control
- transport fidelity
- grounded downstream consumption

### Layer 1 - LLM-led Role Reading + Thin Guard Contract Control

Layer 1 is the semantic source of truth.

It owns:
- reading the JD
- proposing the role center
- proposing the primary subject
- determining role shape
- forming the upstream verdict direction
- contract-level admissibility control

This layer combines two subfunctions:

#### 3.1.1 LLM-led role reading core

This is where JD meaning is primarily generated.

The role-reading core is responsible for:
- interpreting the JD as a role, not just as keyword fragments
- proposing the primary role line
- preserving useful specificity
- generating the upstream semantic center that the rest of the chain should follow

The core architectural truth is:
**the LLM-led role-reading core is the semantic lead.**

#### 3.1.2 Thin guard contract control

The thin guard exists to control admissibility and protect contract safety.

It is intentionally narrow.

It may:
- classify subject type
- decide whether a proposal may author primary
- block invalid primary authorship
- route to supporting-only where appropriate
- perform narrow native-only recovery

It uses the current baseline control structure:
- 4-channel classifier: native / posture / broad_native / unknown
- 3-state gate: allow_primary / supporting_only / blocked
- narrow native-only recovery

It must not:
- become a second semantic engine
- broadly regenerate the role center
- reopen the JD from scratch in heuristic form
- expand into a large arbitration system that competes with the LLM-led reading core

The thin guard is a **control layer**, not a new meaning-generation layer.

### Layer 2 - Authoritative Contract Transport

Layer 2 is the fidelity layer.

It owns:
- preserving the authoritative contract after Layer 1
- ensuring that the real downstream payload remains faithful to the Layer 1 result
- preventing contract weakening during transport
- preventing fallback takeover
- preventing partial/truncated handoff from becoming the de facto source of truth

This layer exists because parsed or generated contract and consumed contract are not automatically the same thing.

Typical Layer 2 failures include:
- rich upstream contract becoming weak downstream
- authoritative payload not being preserved
- fallback/legacy paths silently taking ownership
- recommendation/output paths consuming weaker side payloads instead of the intended contract

Layer 2 must preserve, not reinterpret.

### Layer 3 - Proof and Output Grounding

Layer 3 grounds downstream output behavior in the authoritative contract.

It owns:
- selecting supporting proof in a way aligned to the authoritative subject
- maintaining proof-family alignment
- supporting risk, quick-check, and recommendation grounding without semantic takeover

Layer 3 may:
- choose the strongest supporting evidence line
- shape proof presentation
- support output framing

Layer 3 must not:
- replace the authoritative subject with an adjacent or stronger-looking proof family
- mutate the role shape
- treat bridge/supporting lines as if they were the primary semantic line
- reopen role meaning that should already be fixed upstream

The correct rule is:
**proof supports subject; proof does not replace subject.**

### Layer 4 - Consumer Rendering and Presentation

Layer 4 is consumer-only.

It owns:
- final phrasing
- contract assembly
- display shaping
- view-model mapping
- presentation logic

It may:
- phrase differently
- simplify where safe
- adapt the same meaning to different UI surfaces
- assemble thin post-quick-check synthesis surfaces, as long as semantic ownership is not reopened

It must not:
- reselect the primary subject
- derive a second role center
- reinterpret primary gap
- reinterpret entry angle
- reinterpret CTA framing
- flatten meaningful specificity without reason

The renderer is not a backup semantic engine.

---

## 4. Architectural invariants

The following invariants define whether the JD line is behaving correctly.

### 4.1 Upstream semantic lead must hold

The semantic source of truth must remain upstream.
Downstream paths must not regain hidden semantic ownership.

### 4.2 Thin guard must remain thin

Guard logic may control admissibility and protect contract integrity.
It must not grow into a broad heuristic decision engine.

### 4.3 Transport must preserve authoritative meaning

The consumed authoritative contract must not be materially weaker than the intended upstream contract without an explicit, justified reason.

### 4.4 Proof must align to subject

Downstream proof lines must support the authoritative subject rather than replace it.

### 4.5 Consumer outputs must share one semantic line

Panel verdict, why-you framing, risk framing, quick checks, recommendation, and downstream positioning/CV emphasis must all stay aligned to the same authoritative subject line.

### 4.6 Useful specificity must survive

If upstream role reading captures meaningful role-specific detail, downstream wording should preserve it unless simplification is clearly justified.

---

## 5. What this architecture is not

To avoid architectural drift, be explicit about what this system is not.

It is not:
- a whole-product CareerTwin architecture
- a Resume/CV line architecture
- an Interview line architecture
- a broad multi-owner semantic system
- a large heuristic arbitration framework
- a renderer-led meaning repair system

If a future product line develops its own mature structure, it should get its own architecture document and skill.
Do not project the JD line architecture onto the whole product.

---

## 6. How to diagnose issues in this architecture

When a JD-line issue appears, diagnose by locating the first drift point.

Recommended order:
1. LLM-led role reading
2. thin-guard admissibility / contract shaping
3. authoritative contract transport
4. proof/output grounding
5. consumer rendering / wording

Do not jump to final wording first.
Do not assume the model misread the JD without checking contract transport and downstream consumption.
Do not reopen upstream if the first drift point is clearly downstream.

The minimal diagnostic framing should be:
- failing layer
- why this is the failing layer
- first drift point
- what is out of scope

---

## 7. Current main regression risks

The main risks in the current architecture are:

### 7.1 Guard expansion risk
Thin guard grows into a second semantic engine.

### 7.2 Transport weakening risk
Parsed or intended authoritative contract becomes weaker in actual downstream consumption.

### 7.3 Proof substitution risk
Supporting or adjacent proof begins replacing the primary subject.

### 7.4 Renderer takeover risk
Consumer rendering logic begins re-authoring role meaning.

### 7.5 Fidelity-collapse risk
Upstream meaning is technically preserved, but useful specificity gets flattened into generic wording.

---

## 8. Design rule for future changes

Future changes to the JD line should follow these rules:

1. Preserve LLM-led upstream semantic ownership.
2. Keep the guard thin.
3. Keep transport faithful.
4. Keep proof/output grounded.
5. Keep rendering consumer-only.
6. Prefer the smallest safe structural correction.
7. Do not reopen downstream boundaries unless there is clear evidence of downstream violation.
8. Do not use architecture language to justify broad churn.

---

## 9. Summary

The current Job Copilot JD line should be understood as:

**LLM-led role reading with thin guard contract control, followed by faithful contract transport and grounded downstream consumption.**

This architecture still has 4 layers, but those 4 layers do not share semantic ownership equally.

The intended ownership model is:

- Layer 1 generates and guards the authoritative semantic line
- Layer 2 preserves it
- Layer 3 grounds outputs in it
- Layer 4 presents it

The core anti-drift principle is simple:

**downstream may support and express the authoritative line, but it must not redefine it.**
