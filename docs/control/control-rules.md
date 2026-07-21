# Control Rules

## Operating Mode

For every cycle:

1. Read all control files
2. Select highest-priority task
3. Execute task
4. Run verification
5. Fix if needed
6. Update state + queue
7. Continue automatically if possible

---

## Task Selection Rules

- Prioritize upstream correctness over polish
- Do not optimize CV wording before evidence is stable
- Prefer job-specific precision
- Prefer minimum safe refactor

---

## Verification Rules

- No verification -> task incomplete
- Fail -> must fix
- Mixed -> must record clearly

---

## Progression Rules

- After success -> continue next P0 task
- Do NOT stop after one task unless:
  - blocked
  - ambiguity
  - environment limit

---

## Dual Optimization Rule

- Do NOT sacrifice user experience
- Do NOT break memory foundation

Prefer:
- better CV quality + stronger memory usage

If conflict:
- Phase 1 -> prioritize CV quality
- but must not block memory future

---

## Regression Rules

- Do not break working behavior
- Report contract/output changes

---

## Escalation Rules

Only ask human if:
- ambiguity
- missing data
- cannot verify

---

## Completion Rules

A task is complete only if:
- success criteria met
- verification passed
- exit condition met
- state updated

---

## Output Format

- Task
- Changes
- Verification
- Result
- Exit condition
- Risks
- State updates
- Next task