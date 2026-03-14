# CHANGELOG_FOR_FOUNDER

## How to use
- This file tracks significant repository changes in plain English for founder-level visibility.
- Every substantial task should append one new entry.
- Each entry must clearly state whether behavior, schema, contracts, or concept names changed.

## Entry template
Date:
Task:
Why it was done:
Files changed:
System layer(s) touched:
Behavior changed? yes/no
Schema changed? yes/no
Contract changed? yes/no
Concept names changed? yes/no
User-visible impact:
Founder summary:
Risks / follow-up:

## Pre-filled recent entries

Date: Recent (exact date should be verified in git history)
Task: Job Copilot end-to-end extension-first flow became runnable in current architecture
Why it was done: Make real job-browsing support usable across understanding, matching, and copilot guidance
Files changed: `lib/career-engine/job-copilot/*`, `app/api/job-copilot/extension/*`, `extensions/job-copilot/*` (multiple files)
System layer(s) touched: Job Intelligence Engine, Matching Engine, Copilot Layer
Behavior changed? yes
Schema changed? no (not explicitly recorded in currently available founder docs)
Contract changed? yes (extension/job-copilot outputs and runtime contracts evolved)
Concept names changed? no
User-visible impact: Job Copilot extension path is positioned as the main runtime path
Founder summary: Job Copilot is now wired as a practical end-to-end flow, but legacy paths still exist
Risks / follow-up: Confirm exact commit/date and contract delta details from git history if needed for audits

Date: Recent (exact date should be verified in git history)
Task: Matcher differentiation pass
Why it was done: Improve quality and explainability of role-fit judgments beyond generic keyword matching
Files changed: `lib/career-engine/matching/*`, related capability and copilot integration modules (multiple files)
System layer(s) touched: Capability Engine, Job Intelligence Engine, Matching Engine, Copilot Layer
Behavior changed? yes
Schema changed? no (not explicitly recorded in currently available founder docs)
Contract changed? yes (matcher outputs/contracts now include differentiated capability-based semantics)
Concept names changed? no
User-visible impact: Match analysis became more differentiated and evidence-aware
Founder summary: Matching moved toward capability-and-evidence reasoning, with legacy matcher paths still present for compatibility
Risks / follow-up: Continue monitoring alignment/quality audits and legacy matcher usage

Date: 2026-03-14
Task: Founder-readable system and schema inventory docs created
Why it was done: Establish shared understanding of current architecture, data model, and drift risks
Files changed: `docs/system_map.md`, `docs/schema_inventory.md`, `docs/canonical_schema.md`
System layer(s) touched: All layers (documentation only)
Behavior changed? no
Schema changed? no
Contract changed? no
Concept names changed? no
User-visible impact: None directly; improves internal control and debugging speed
Founder summary: Canonical layer map, schema inventory, and core concept definitions now exist in one place
Risks / follow-up: Keep these docs updated whenever schema/contracts/runtime semantics change

Date: 2026-03-14
Task: Schema source-of-truth and legacy-vs-canonical annotation cleanup
Why it was done: Reduce schema drift risk and clarify compatibility-only paths after inventory review
Files changed: `supabase/SCHEMA_SOURCE_OF_TRUTH.md`, `supabase/migration.sql`, `supabase/migationcodex.sql`, `app/api/match-job/route.ts`, `app/api/career-patterns/route.ts`, `lib/career-engine/memory/career-graph-loader.ts`, `app/api/parse-resume/route.ts`, `types/index.ts`
System layer(s) touched: Career Memory Engine, Capability Engine, Matching Engine, Copilot Layer (clarification only)
Behavior changed? no
Schema changed? no
Contract changed? no
Concept names changed? no
User-visible impact: None intended
Founder summary: Canonical vs legacy decisions are now explicitly marked in code and schema artifacts
Risks / follow-up: Legacy endpoints and dual semantics still exist; later cleanup can retire them with explicit approval

Date: 2026-03-14
Task: Job Copilot and CareerTwin product principle note created
Why it was done: Prevent drift into generic AI job-tool behavior and lock product intent
Files changed: `docs/founder_notes/job_copilot_product_principle.md`
System layer(s) touched: All layers (product-direction note)
Behavior changed? no
Schema changed? no
Contract changed? no
Concept names changed? no
User-visible impact: None directly; improves implementation direction consistency
Founder summary: Product intent is now explicit: strengths-first, human-centric, career-memory-led
Risks / follow-up: Add this note to onboarding and planning checklists for all future feature work

Date: 2026-03-14
Task: Root execution constitution (`AGENTS.md`) created
Why it was done: Enforce change control, canonical boundaries, and anti-drift rules for future AI coding
Files changed: `AGENTS.md`
System layer(s) touched: All layers (governance)
Behavior changed? no
Schema changed? no
Contract changed? no
Concept names changed? no
User-visible impact: None directly
Founder summary: Future coding work now has explicit operational constraints and reporting requirements
Risks / follow-up: Ensure future tasks actually append founder changelog entries consistently
