# CareerTwin System Map

This is the current founder-readable system map after matcher differentiation work.

## Main system layers

| Layer | What it does (plain English) | Main files/modules |
| --- | --- | --- |
| Career Memory Engine | Turns resume/history input into structured, traceable career memory. It is the system of record for what the user has actually done. | `app/api/parse-resume/route.ts`, `lib/career-engine/evidence/evidence-pieces.ts`, `lib/career-engine/evidence/structured-evidence.ts`, `lib/career-engine/memory/career-graph-loader.ts` |
| Capability Engine | Infers capabilities from evidence, links each capability back to supporting evidence signals, and computes capability strength. | `lib/career-engine/evidence/evidence-signals.ts`, `lib/career-engine/capability/capability-inference.ts`, `lib/career-engine/capability/capability-strength.ts`, `lib/career-engine/capability/capability-graph.ts` |
| Job Intelligence Engine | Parses raw job descriptions into structured job signals and job capability/requirement profiles. | `lib/career-engine/parsing/jd-parser.ts`, `lib/career-engine/job-copilot/backend/job-signals-from-raw-jd.ts`, `lib/career-engine/matching/job-capability-extractor.ts`, `lib/career-engine/matching/job-understanding.ts` |
| Matching Engine | Compares candidate capability evidence against job requirements and produces fit scores, gaps, and explainability. | `lib/career-engine/matching/capability-match-v2.ts`, `lib/career-engine/matching/capability-match-v1.ts`, `lib/career-engine/matching/match-explainability-service.ts`, `lib/career-engine/matching/role-matcher.ts` (legacy path) |
| Copilot Layer | Converts match outputs into user-facing guidance: extension job analysis, top evidence, pipeline actions, and tailored resume output. | `lib/career-engine/job-copilot/backend/job-copilot-service.ts`, `lib/career-engine/copilot/resume-copilot/resume-copilot-service.ts`, `app/api/job-copilot/extension/analyze/route.ts`, `app/api/job-copilot/extension/download-resume/route.ts`, `app/api/match-history/route.ts` |

## Simple data flow

```
Resume / history input
  -> EvidencePiece
  -> Capability
  -> JobRequirement
  -> MatchResult / Copilot output
```

More concrete runtime path:

```
evidence_pieces
  -> evidence_signals
  -> capabilities (+ capability_signal_links)
  -> job_signals + job requirement extraction
  -> job_matches + user_job_interactions
  -> resume/job copilot output
```

## Notes on current shape

- The extension-first path (`job_snapshots` + `user_job_interactions`) is now the main Job Copilot runtime path.
- Legacy endpoints still exist (`/api/match-job`, `/api/job-copilot`, `/api/job-search`) for backward compatibility and debugging.
- The repository currently contains both new canonical matcher modules and older matcher/recommendation modules.

## Career Map Presentation Governance

CAREER MAP PRESENTATION ARCHITECTURE: LOCKED

AUTHORITATIVE DOCUMENT:
`docs/architecture/career-map-presentation-architecture.md`
