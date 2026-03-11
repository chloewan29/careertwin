# CareerTwin Job Copilot Extension MVP

## Runtime files

- `manifest.json`
- `background.js`
- `content.js`
- `panel.css`
- `popup.html`
- `popup.js`

## Requested focused extension modules

- `extension/job-page-detector.ts`
- `extension/job-detail-extractor.ts`
- `extension/job-copilot-client.ts`
- `extension/job-copilot-panel.tsx`

## Requested focused backend modules

- `lib/career-engine/job-copilot/backend/job-copilot-types.ts`
- `lib/career-engine/job-copilot/backend/job-signals-from-raw-jd.ts`
- `lib/career-engine/job-copilot/backend/job-copilot-output-builder.ts`
- `lib/career-engine/job-copilot/backend/job-copilot-service.ts`
- `lib/career-engine/job-copilot/backend/pipeline-write-integration.ts`

## API routes

- `POST /api/job-copilot/extension/analyze`
- `POST /api/job-copilot/extension/download-resume`

## Reuse of existing CareerTwin architecture

- Career memory entrypoint: `loadCareerGraph(profileId)`
- Capability intelligence: `capability-graph.ts` (`getCapabilitySummary`)
- Role fit intelligence: `role-fit-service.ts` (`getRoleFit`)
- Career signals: `career-signals-service.ts` (`getCareerSignals`)
- Resume generation and selected evidence reuse: `generateResumeCopilot` (debug output for top evidence + preview)

