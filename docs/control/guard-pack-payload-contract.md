# Guard-Pack Payload Contract

## 1. Document role
This document defines the canonical payload-construction contract for Layer 1 guard-pack replay inputs.
It is a control contract for audit and admission decisions, not a product-logic design spec.

## 2. Why this doc exists now
Current Layer 1 residual burn-down is blocked by contradictory evidence:
- frozen replay for blocker case 3224 appears stable
- live guard-pack owner-isolation behavior still diverges

That means replay stability alone is insufficient for repair admission decisions.

## 3. Current motivating blocker
- owner line: `4362`
- blocker line: `3224`
- first drift point: `layer1_thin_guard_contract_control`
- blocker summary: live guard-pack divergence vs frozen replay evidence
- admission consequence: no new 4362 repair admission before payload-construction parity is proven

## 4. Scope
In scope:
- payload construction for Layer 1 owner-isolation and guard-pack audit runners
- parity checks between live and frozen runner paths
- hashable canonicalization inputs for reproducible audit evidence

Out of scope:
- matcher/JD/CV/renderer product logic
- Layer 2-4 changes
- schema or contract redesign outside replay payload construction

## 5. Producers
Producers must build the same canonical payload shape in both paths:
- live owner-isolation guard-pack runner
- frozen replay guard-pack runner

## 6. Consumers
Consumers of this contract are:
- Layer 1 audit artifacts
- repair-admission review decisions
- HOLD/REPAIR gating for 4362 and 3224 interaction

## 7. Canonical field set
Each canonical payload must include, at minimum:
- case identity: `case_id`, run label, replay mode
- role-reading source payload used for the run
- thin-guard input fields used for pre-trigger and fired-path decisions
- derived pre-trigger features that feed gating
- overlap/containment features used for 3224 exclusion checks
- winner/candidate representation used by the fired path
- explicit null/default markers for missing optional fields

No path may silently add/drop/relabel fields without contract update.

## 8. Pre-trigger feature derivation requirements
- derive pre-trigger features from identical upstream source fields in both live and frozen paths
- apply identical ordering, fallback, and defaulting rules
- record derivation diagnostics so a reviewer can trace each feature back to source inputs
- treat missing-source handling as contract behavior, not local runner convenience logic

## 9. Normalization requirements
Before hash and comparison:
- normalize string casing and whitespace deterministically
- normalize arrays with deterministic ordering rules
- normalize object key ordering for serialization
- normalize null/undefined/empty handling into one explicit representation
- normalize numeric formatting and boolean encoding consistently

## 10. Payload hash basis
Both paths must compute a payload hash from the same normalized material:
- canonical field set only
- deterministic serialization format
- stable key order
- no runtime-only metadata (timestamps, transient IDs)

Hash equality is required but not sufficient; semantic field parity must also be checked.

## 11. Parity criteria between live and frozen paths
Parity is proven only when all are true for the same case/run contract:
- canonical payload field set is identical
- normalized values match field-by-field
- payload hash matches
- derived pre-trigger and containment features match
- any intentional differences are explicitly declared and approved in control docs

Frozen replay stability without these parity checks does not justify repair admission.

## 12. Forbidden drift examples
- live runner uses a field that frozen path omits
- frozen path injects defaults not present in live path
- array order differs and changes overlap/containment interpretation
- one path computes shorthand-trigger or overlap features from a different source key
- one path serializes null/missing values differently and changes gating behavior

## 13. Required outputs for the canonicalization audit pass
The audit pass must emit artifacts that include:
- canonical payload dump for live path
- canonical payload dump for frozen path
- field-by-field parity diff report
- payload hashes for both paths and equality verdict
- explicit statement of proven parity vs remaining divergence
- admission implication statement: 4362 repair remains blocked unless parity is proven

Required judgment framing:
- frozen replay stability alone is diagnostic-only evidence
- live/frozen parity must be proven at payload construction level
- no new 4362 repair admission before that proof is complete
