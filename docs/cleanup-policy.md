# Cleanup Policy

## Core Rule
Cleanup is not verification.

## Ordering
1. validate the functional fix first
2. accept or reject the fix based on validation
3. only then run a narrow cleanup pass if needed

## Scope Guardrails
- cleanup should stay adjacent to the accepted fix
- do not turn a narrow fix into a broad cleanup refactor
- do not mix unrelated cleanup into active incident repair
