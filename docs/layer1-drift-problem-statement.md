# Layer 1 Drift Problem Statement

## Core Problem
The current main issue is not general verification coverage.
The current main issue is drift between:
- raw Layer 1 LLM output
- parsed contract
- consumed / authoritative contract used downstream

## Observed Pattern
In a number of cases, the raw Layer 1 output contains more role-specific or semantically correct detail,
but that detail becomes weakened, generalized, or drifted by the time it reaches the contract / verdict layer.

## Current Scope
This investigation is focused on:
- raw output -> parsed contract
- parsed contract -> consumed / authoritative contract
- fidelity loss, semantic compression, and drift in Layer 1 contract formation / transport

## Out of Scope
This is not primarily about:
- full-system verification
- renderer wording polish
- broad downstream UX issues
- general daily verify design

Current diagnostic rule:
For each drift case, first determine where the drift first appears:
- raw Layer 1 output
- parsed contract
- consumed / authoritative contract

Do not label a case as "model problem" unless the raw output is already wrong.