# Memory Index

Status
- Active
- Control-memory routing index
- Use this to decide what to read before work

Purpose
This file tells Codex which memory/control documents exist, what each one is for, and what minimum read path to use for different task types.

## 1. Default startup rule
For a normal new window, do not read the whole repository by default.

Use this minimum read path first:
1. `docs/control/current-active-brief.md`
2. `docs/control/current-system-memory.md`
3. `docs/control/policy-registry.md`

Only read additional documents when task scope requires it.

## 2. Core control-memory surfaces

### A. `docs/control/current-active-brief.md`
Use for:
- low-token startup
- current active line
- current parked lines
- current North Star
- current execution defaults
- immediate “what is going on now?”

Read this:
- first
- always for substantial new-window work

### B. `docs/control/current-system-memory.md`
Use for:
- accepted current architecture truth
- current EM / harness operating truth
- current Job Copilot / CareerTwin remembered state
- major design and operating-state updates

Read this:
- after `current-active-brief.md`
- always before substantial audit / repair / architecture / policy work

### C. `docs/control/policy-registry.md`
Use for:
- authoritative policy lookup
- precedence and enforcement
- terminology boundary
- memory-sync enforcement
- North Star policy linkage

Read this:
- after `current-system-memory.md`
- when policy interpretation or enforcement matters

### D. `docs/control/em-operating-system.md`
Use for:
- execution runbook
- active operating instructions
- repair / audit / continuation behavior
- pre-work gate and closure rules

Read this:
- when executing substantial loop work
- when task is repair / audit / admission / regroup / line judgment

### E. `docs/verification/audit-output-schema.md`
Use for:
- audit output contracts
- Job Copilot Buy-side North Star Rubric
- verification output structure

Read this:
- when running substantial audits
- when evaluating North Star surfaces
- when generating new audit artifacts

### F. `docs/lines/...`
Use for:
- line-local truth
- active branch state
- parked/kept/reverted line history

Read this:
- only when the task is on that specific line

### G. `docs/backlog/job-copilot-current-backlog.md`
Use for:
- current backlog / future candidate lines
- post-regroup planning context

Read this:
- when deciding next active line
- when memory sync explicitly targets it

## 3. Task-based read routing

### Normal substantial audit / repair work
Minimum:
1. `current-active-brief.md`
2. `current-system-memory.md`
3. `policy-registry.md`
4. `docs/control/em-operating-system.md`

Add:
- relevant line-plan doc
- relevant audit schema doc
only if needed

### New line opening / regroup / branch split / park / keep judgment
Minimum:
1. `current-active-brief.md`
2. `current-system-memory.md`
3. `policy-registry.md`
4. `docs/control/em-operating-system.md`

Add:
- relevant line-plan
- relevant backlog doc
only if needed

### Architecture / policy change
Minimum:
1. `current-active-brief.md`
2. `current-system-memory.md`
3. `policy-registry.md`
4. `docs/control/em-operating-system.md`

Add:
- architecture-specific control docs only if needed

### Lightweight bounded local continuation
Minimum:
1. `current-active-brief.md`
2. relevant local line doc if needed

Do not automatically read the full memory set unless scope expands.

## 4. Memory sync rule
If loop output says:
- `memory_sync_required: yes`

Then update:
- `docs/control/current-system-memory.md`
and any listed targets
before considering the loop fully closed.

If the change affects:
- current active line
- parked/kept status
- next active line
- startup defaults
- current North Star state

Then also update:
- `docs/control/current-active-brief.md`

## 5. Current default assumptions
- EM is default governance.
- Covered scopes use real subagent dispatch by default.
- Bounded local loops default to `npm run verify:daily`.
- Unified Quick Checks contract line is parked as split-defects.
- Current recommended next active line is:
  - `JOB-COPILOT-NS-QUICK-CHECKS-LINKAGE`

## 6. Anti-drift rule
Do not assume older summaries, artifacts, or file names override current control-memory truth.
When conflict exists, prefer:
1. `policy-registry.md`
2. `current-system-memory.md`
3. `current-active-brief.md`
4. line-local docs
5. older artifacts / summaries

## 7. Maintenance rule
Keep this file short.
This is an index, not a narrative memory file.

Update this file only when:
- a new control-memory surface is added
- default read order changes
- task-based routing changes
- core precedence changes
