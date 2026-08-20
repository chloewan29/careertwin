# NON_CANONICAL

## CAREER MAP MVP TASK 4 PROVIDER RUNTIME COMPLETION DIAGNOSTIC

**READ-ONLY**  
**NO PRODUCTION WRITE**

## Decision

`MVP_TASK4_PROVIDER_TIMEOUT_BOUNDARY_REQUIRED`

Primary diagnostic classification: `PROVIDER_TIMEOUT_BOUNDARY_MISSING`.

The current production request can remain pending at the external Google SDK call because CareerTwin applies no authoritative timeout to that promise. The first writable owner is the server-side Gemini provider wrapper.

## Architecture Decision Lock

Architecture decisions preserved: **YES**.

- Atomic professional evidence and the canonical capability library remain the semantic authorities.
- The LLM remains a provider-neutral structured inference producer, not a truth or persistence owner.
- Provider output must pass Task 2B deterministic validation before it can enter personal state.
- Provider failure admits zero structured mappings; the existing deterministic channel and materializer path remain available under the established Task 2C fail-closed contract.
- Existing Career Map state and materializer remain the only personal-state authorities.
- No new fallback architecture, semantic rule, ontology, state owner, or visual rule is introduced by this diagnostic.

Repository truth does not conflict with the recorded architecture. No new architecture decision is required.

## MVP Task Ledger

- Task 1: `CLOSED`
- Task 2: `CLOSED`; not reopened
- Task 3: `CLOSED`; not reopened
- Task 4: `BLOCKED / DIAGNOSTIC ACTIVE`
- Current task: `TASK 4 PROVIDER RUNTIME COMPLETION DIAGNOSTIC`
- Next task: `BOUNDED_PROVIDER_RUNTIME_REPAIR`

## Execution Boundary

- Branch: `master`
- HEAD: `f03d1f7d01cbc76ea57410074ab83e6ea0558eb7`
- origin/master: `f03d1f7d01cbc76ea57410074ab83e6ea0558eb7`
- Starting index: empty
- Starting HOLD: 101 pre-existing entries
- Previous provider request local execution context cleared: **YES**
- Live provider calls during this diagnostic: **0**

The prior repo-local Next.js process tree that owned the outstanding request was stopped without killing unrelated processes. A clean local development server was then started, and only a same-origin `GET /career-map` readiness check was made. No inference endpoint or provider was called.

## Failed Task 4 Runtime Facts

- The prior run passed its privacy gate with 14 eligible performed-work evidence records and zero invalid metadata-only eligible records.
- Exactly one semantic provider request reached `/api/career-map/capability-inference` and remained open for several minutes.
- No new local v2 Career Map state was written.
- Closing the initiating browser tab did not terminate the server-side request.
- No retry was issued, preventing concurrent provider calls.
- The old server-side execution remained live until its local development-server process was stopped.

No CV text, evidence text, prompt, provider response, or credential is recorded here.

## Exact Request-Chain Trace

1. `components/career-possibility/RootCvUploadWorkspace.tsx`
   - `selected()` awaits `buildProvisionalCareerMapFromFile(...)`.
   - It writes local state only after a successful build, using `writeLocalCareerMapState(...)`.
2. `lib/career-possibility/build-provisional-career-map-from-text.ts`
   - `buildProvisionalCareerMapFromText()` awaits `input.structuredInferenceProducer.produce(...)`.
   - A rejected producer call is caught and converted to `structuredValidation = null`; deterministic mapping and materialization may then continue.
3. `lib/career-possibility/career-capability-structured-inference-api-producer.ts`
   - `createCareerCapabilityStructuredInferenceApiProducer()` awaits same-origin `fetch("/api/career-map/capability-inference", ...)`.
   - It supplies no timeout and no `AbortSignal`; non-OK responses reject through an application error, and successful responses are awaited as JSON.
4. `app/api/career-map/capability-inference/route.ts`
   - `createCareerCapabilityInferencePostHandler()` parses and validates the request, then directly awaits `producer.produce(inferenceRequest)`.
   - It supplies no route timeout, `AbortController`, or `request.signal` propagation.
   - Provider rejection is caught and returned as HTTP 503. A permanently pending provider promise never reaches this catch or a route response.
5. `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`
   - Exported owner: `geminiCareerCapabilityStructuredInferenceProducer`.
   - It creates `new GoogleGenAI({ apiKey })` and directly awaits:
     `ai.models.generateContent({ model: CAREER_CAPABILITY_STRUCTURED_INFERENCE_MODEL, contents: buildPrompt(request), config: { ... } })`.
   - No `httpOptions.timeout`, `abortSignal`, surrounding timer, `Promise.race`, retry, or `finally` cleanup exists.
6. Installed `@google/genai` `1.44.0`
   - Its request client creates an abort controller only when an HTTP timeout or abort signal is supplied.
   - Its request client retries only when `clientOptions.httpOptions.retryOptions` is supplied.
   - The CareerTwin provider supplies neither, so the invoked SDK request has no CareerTwin-applied bounded completion and no automatic retry.
7. After provider settlement
   - The provider reads response text and parses JSON synchronously.
   - The route invokes Task 2B validation synchronously and returns JSON.
   - The client parses JSON; the builder validates/adapts, runs finite evidence/mapping loops and local cryptographic hashes, and invokes the existing materializer.
   - The upload workspace performs the only local state write after the build succeeds.

## Request Completion Matrix

| Boundary | Owner | Start condition | Completion condition | Timeout | Abort signal | Can remain pending? | Error propagation |
|---|---|---|---|---|---|---|---|
| Client fetch | `createCareerCapabilityStructuredInferenceApiProducer()` | Eligible structured inference begins | Same-origin response and JSON settle, or fetch rejects | NO | NO | YES | Non-OK/parse/fetch error rejects producer; builder catches it |
| API route | `createCareerCapabilityInferencePostHandler()` | Valid POST body parsed | Provider settles, validation completes, response returned | NO | NO | YES | Provider rejection becomes 503; pending promise is not caught |
| Provider wrapper | `geminiCareerCapabilityStructuredInferenceProducer.produce()` | Route calls producer | SDK settles, response text exists, JSON parses | NO | NO | YES | Rejection/parse error bubbles to route catch |
| Google SDK call | `ai.models.generateContent()` | Provider invokes model request | SDK fulfills or rejects | NO (not configured) | NO (not supplied) | YES | Settlement propagates to provider; non-settlement propagates nothing |
| Post-provider validation | Task 2B validator and structured adapter | Provider has fulfilled and parsed | Finite synchronous validation plus finite local adaptation completes | NO | NO | NO | Invalid response becomes 502 at route or zero structured mappings in builder |
| Materializer | `materializeProvisionalCareerMap()` | Final mapping set contains an admissible mapping | Finite validation/hash/state construction completes | NO | NO | NO | Controlled failure result reaches upload workspace |
| Local state write | `writeLocalCareerMapState()` | Successful materialized state exists | Validated atomic local-storage write succeeds or returns failure | NO | NO | NO | Failure is rendered; previous state is preserved |

## First Pending Boundary

Classification: `GOOGLE_SDK_PENDING`.

The deepest and first leaf promise capable of explaining the observation is the direct `generateContent()` await. The provider wrapper, API route, client fetch, build, and upload UI then remain pending transitively. No evidence shows that the provider call settled and a later boundary hung.

## Timeout Ownership

Classification: `NO_PROVIDER_TIMEOUT`.

- Client timeout: `NONE`
- API route timeout: `NONE`
- Provider-wrapper timeout: `NONE`
- Google SDK call bounded: `NO` for the committed invocation
- Authoritative provider completion timeout currently exists: `NO`
- Provider request can remain indefinitely pending: `YES` from CareerTwin's control perspective

The installed SDK exposes optional timeout support, but optional capability is not an applied production boundary. No current owner interrupts or settles the provider promise after a defined duration.

## Abort Ownership

Classification: `NO_PROVIDER_ABORT`.

- Browser/client `AbortSignal`: `NO`
- API `Request.signal` propagated: `NO`
- Server-side provider `AbortController`: `NO`
- Google SDK abort support used by CareerTwin: `NO`

Client-disconnect classification: `SERVER_PROVIDER_CONTINUES`.

The committed chain contains no signal transport from browser fetch to API request to provider invocation. Closing the tab may end the browser's interest in the response, but it cannot guarantee cancellation of server-side provider work. This matches the failed-run process evidence.

Timeout and cancellation remain separate concerns: a bounded timeout must settle the CareerTwin request even if remote cancellation is imperfect.

## Automatic Retry Behavior

- Automatic provider/route retry: `NO`
- Existing retry policy: `NONE`
- Could an internal retry make one browser request appear hung for many minutes? `NO` for this configured invocation

The SDK's retry path is conditional on explicitly supplied retry options. CareerTwin supplies none. No route, provider-wrapper, client-producer, or builder retry loop was found.

## Post-Provider Hang Exclusion

Classification: `POST_PROVIDER_HANG_NOT_FOUND`.

No unbounded loop, unresolved manually created promise, recursive retry loop, second external dependency, or deadlock-like sequencing was found after provider settlement. Post-provider work consists of bounded validation, finite collection traversal, local cryptographic hashing, deterministic merge/materialization, and one local state write.

## Existing Runtime and Logging Evidence

Existing logs distinguish provider start/completion: `NO`.

The available server output records ordinary Next.js startup, compilation, and completed HTTP request metadata. The inspected route/provider code has no permanent lifecycle logging for route entry, provider start, provider completion, provider rejection, validator start, or route completion. The failed-run open connection and live process established that the request had reached the endpoint and had not completed, but existing logs cannot independently identify each internal lifecycle transition.

## Diagnostic Judgment

Observed:

- The production call directly awaits the Google SDK promise.
- No client, route, provider, or configured SDK timeout bounds that await.
- No provider abort signal is supplied or propagated.
- The previous request stayed alive after browser closure and until the local server execution was cleared.
- No concrete post-provider hang or automatic retry exists in the committed chain.

Inferred:

- The SDK request can keep the provider wrapper, route, client fetch, builder, and upload workflow pending without success, failure, or persistence.

Still unproven:

- Why the external request did not settle on that particular run (provider service, transport, SDK, or environment cause).
- Whether remote provider cancellation will be fully enforceable in every runtime after a future timeout repair.
- Any semantic inference-quality defect. None is established.

Production inference robustness defect established: **YES**.  
Production inference semantic-quality defect established: **NO**.

## First Writable Owner and Smallest Future Repair Boundary

First writable owner: `geminiCareerCapabilityStructuredInferenceProducer` in `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`.

Smallest future production repair boundary:

- `lib/career-possibility/career-capability-structured-inference-gemini-provider.ts`

Focused verification should extend the existing production integration coverage in:

- `tests/career-possibility/career-capability-structured-production-integration.test.ts`

The future property is: provider invocation settles normally or reaches one explicit bounded timeout; timeout becomes a controlled rejection; the existing route returns controlled failure; the builder reuses Task 2C provider-failure semantics and continues with zero structured mappings where the deterministic/materializer contract allows. No inference, validation, mapping, state, graph, or renderer change is required.

Existing Task 2C provider-failure semantics reusable: **YES** (`FAIL_CLOSED_DETERMINISTIC_CHANNEL_SURVIVES`).

## Exact Next Task

Recommended next task: `BOUNDED_PROVIDER_RUNTIME_REPAIR`.

Exact next action: implement and locally verify one explicit provider-wrapper completion timeout, using the installed SDK's supported request timeout/abort mechanism where appropriate, and prove that timeout rejection reaches the existing route and Task 2C fail-closed path without changing inference semantics.

Task 4 materialization must not be retried until that bounded repair is admitted.

## Out-of-Scope Confirmation

- Live provider calls: 0
- Production files modified: 0
- Tests modified: 0
- Control documents modified: 0
- Package files modified: 0
- Provider/model/prompt modified: NO
- Inference/validator/mapping/merge/materializer/state semantics modified: NO
- Career Map graph/renderer/visual repair modified or started: NO
- Task 4 visual validation started: NO
- Triangulation resumed: NO
- Staging/commit/push: NONE

