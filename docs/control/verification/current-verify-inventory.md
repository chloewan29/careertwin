# Current Verify Inventory

Document role: **inventory/reference** for verify-related commands and scripts.
This doc is not the default daily operating policy.
For current operating policy, use `AGENTS.md` and `docs/verify-strategy.md`.

| Verify Item | Current Usage | Target Level / Role | Notes |
|---|---|---|---|
| `npm run verify` (`scripts/verify.ts`) | Canonical full-pipeline verification entrypoint; runs first-failure loop and writes `artifacts/verify-summary.json` plus step artifacts. | Level 3 = Full Baseline Verify | Includes compile, TS debt, fixture test, JD extraction, matcher, tailored CV replay quality, extension lifecycle. Not default for routine iteration. |
| `scripts/verify-typecheck-debt.ts` | Executed inside `npm run verify` as `typescript_debt_audit`. | Level 2 = Layer Verify | Full `tsc --noEmit` debt audit with core vs legacy categorization; writes summary/details/delta artifacts. |
| `tests/test-matching-fixtures.ts` | Default Level 1 entry via `npm run verify:daily`; also executed inside `npm run verify` as `tests`. | Level 1 = Local Verify | Deterministic fixture assertions for legacy matcher/scoring path. |
| `scripts/verify-jd-extraction.ts` | Executed inside `npm run verify` as `jd_extraction`. | Level 2 = Layer Verify | Uses `scripts/fixtures/verify-jd-extraction.fixture.json`; writes JD extraction summary/details artifacts. |
| `scripts/verify-matcher.ts` | Executed inside `npm run verify` as `matcher`. | Level 2 = Layer Verify | Uses `scripts/fixtures/human-alignment-benchmark.seed.json` and `scripts/fixtures/verify-matcher-baseline.json`; writes summary/details/regression diff. |
| `scripts/run-tailored-cv-bullet-rewrite-audit.ts` (`--mode replay --enforce` in verify) | Executed inside `npm run verify` as tailored CV quality gate. | Level 2 = Layer Verify | Default verify path writes `artifacts/tailored-cv-bullet-rewrite-audit-v1.verify.json`. |
| `scripts/verify-extension-lifecycle.ts` | Executed inside `npm run verify` as `extension_lifecycle`. | Level 2 = Layer Verify | VM harness for extension sidepanel terminal-state behavior; writes summary/details artifacts. |
| `npm run verify:domain-ontology` (`scripts/verify-domain-ontology.ts`) | Available npm command; not in `npm run verify` chain. | Level 1 = Local Verify | Config integrity checks for domain ontology map/skeleton consistency. |
| `npm run verify:role-frame-regression` (`scripts/verify-role-frame-regression.ts`) | Available npm command; not in `npm run verify` chain. | Level 2 = Layer Verify | Role-context arbitration smoke check against `scripts/fixtures/role-frame-regression.seed.json`; outputs `artifacts/role-frame-regression-smoke.json`. |
| `supabase/tests/canonical_database_contract.sql` | Manual catalog contract run after B0 -> R0 -> atomic -> transactional publication in an isolated Supabase database. | Level 2 = Database Layer Verify | Compares the complete application-owned schema, including two public application functions and eight triggers. Function structure, ownership, attributes, configuration and ACLs remain exact. Only the guarded, literal-free `set_updated_at()` body admits whitespace and unquoted-token case differences; its guard rejects string literals, quoted identifiers, comments and nested dollar-quoted content. The publication RPC body remains case-sensitive after whitespace normalization, including string literals, JSON keys, statuses, fates and error codes. Missing, additional, duplicate or semantically changed functions remain rejected through per-function multiplicity-sensitive comparison. Constraint-owned identifier normalization remains structure-preserving; standalone index identifiers remain exact. Does not connect to production by itself. |
| `supabase/tests/transactional_career_memory_publication.sql` | Manual disposable-database suite after the four-migration chain. | Level 2 = Database Layer Verify | Verifies publish/replay, malformed and stale rejection, twelve transactional rollback phases, previous-graph preservation, same-career serialization, conflicting revisions, different-career parallelism, RPC role access, and complete cleanup of test rows/helpers/triggers/extensions. |

## PostgREST OpenAPI metadata verification (PowerShell)

Use this repository-independent procedure for a metadata-only GET of the configured
PostgREST OpenAPI endpoint. Keep `$openApiUri` and `$requestHeaders` in memory, do
not print or persist their values, and never send a request to the RPC route itself.
PowerShell may expose `Invoke-WebRequest.Content` as either `System.Byte[]` or an
already decoded string. Inspect the runtime type and strictly decode bytes as UTF-8
before JSON parsing. Never use `$response.Content.ToString()` as a decoding method.

```powershell
$response = Invoke-WebRequest `
    -UseBasicParsing `
    -Method Get `
    -Uri $openApiUri `
    -Headers $requestHeaders `
    -ErrorAction Stop

$mediaType = ([string]$response.Headers['Content-Type'] -split ';', 2)[0].Trim()
if ($mediaType -cne 'application/openapi+json') {
    throw "Unexpected OpenAPI media type: $mediaType"
}

$content = $response.Content
if ($content -is [byte[]]) {
    $utf8 = New-Object System.Text.UTF8Encoding -ArgumentList $false, $true
    $jsonText = $utf8.GetString([byte[]]$content)
}
elseif ($content -is [string]) {
    $jsonText = [string]$content
}
else {
    $contentType = if ($null -eq $content) { '<null>' } else { $content.GetType().FullName }
    throw "Unexpected OpenAPI response content type: $contentType"
}

$openApi = ConvertFrom-Json -InputObject $jsonText -ErrorAction Stop
if ($null -eq $openApi.paths) {
    throw 'OpenAPI document does not contain paths'
}

$pathNames = @($openApi.paths.PSObject.Properties.Name)
$rpcPath = '/rpc/publish_atomic_career_memory'
$rpcRouteCount = @($pathNames | Where-Object { $_ -ceq $rpcPath }).Count
if ($rpcRouteCount -ne 1) {
    throw "Expected exactly one publication RPC route; found $rpcRouteCount"
}

$rpcRoute = $openApi.paths.PSObject.Properties[$rpcPath].Value
if ($null -eq $rpcRoute.post) {
    throw 'Publication RPC does not advertise POST'
}

$bodyParameters = @($rpcRoute.post.parameters | Where-Object { $_.in -ceq 'body' })
if ($bodyParameters.Count -ne 1) {
    throw "Expected exactly one RPC body parameter; found $($bodyParameters.Count)"
}

$payloadSchema = $bodyParameters[0].schema
if ($null -ne $payloadSchema.'$ref') {
    $definitionPrefix = '#/definitions/'
    if (-not ([string]$payloadSchema.'$ref').StartsWith($definitionPrefix)) {
        throw 'Unexpected RPC payload schema reference'
    }
    $definitionName = ([string]$payloadSchema.'$ref').Substring($definitionPrefix.Length)
    $definitionProperty = $openApi.definitions.PSObject.Properties[$definitionName]
    if ($null -eq $definitionProperty) {
        throw 'Referenced RPC payload definition is missing'
    }
    $payloadSchema = $definitionProperty.Value
}

if ($null -eq $payloadSchema.properties) {
    throw 'RPC payload schema does not contain properties'
}

$argumentNames = @($payloadSchema.properties.PSObject.Properties.Name)
if ($argumentNames.Count -ne 1 -or $argumentNames[0] -cne 'p_payload') {
    throw "Unexpected RPC argument metadata: $($argumentNames -join ',')"
}

$payloadProperty = $payloadSchema.properties.PSObject.Properties['p_payload'].Value
if ([string]$payloadProperty.format -cne 'jsonb') {
    throw "Expected p_payload JSONB metadata; found '$($payloadProperty.format)'"
}

$requiredArguments = @($payloadSchema.required)
if ($requiredArguments.Count -ne 1 -or $requiredArguments[0] -cne 'p_payload') {
    throw "Unexpected required RPC arguments: $($requiredArguments -join ',')"
}
```

This check fails closed on invalid UTF-8, invalid JSON, missing `paths`, absent or
case-drifted route names, duplicate route metadata, missing `POST`, and unexpected
payload metadata. Database catalog checks remain authoritative for function
signature, overload count, ownership, attributes and ACLs; OpenAPI metadata
complements those checks and does not replace them. The production discovery
false negative recorded in August 2026 came from treating a byte array as decoded
text. Strict UTF-8 decoding exposed the complete document: 20 relation routes and
exactly one publication RPC route.

Identifier differences remain diagnosable through catalog inventory even where they are not equality keys. This normalization does not permit missing, additional, duplicate, or structurally changed constraints or indexes: the comparison remains bidirectional and multiplicity-aware. Any constraint or constraint-owned index name that later becomes application-authoritative requires an explicit contract update rather than implicit normalization.

`MAINTAIN` is intentionally part of the exact table and default-table ACL expectations because it is present in the currently supported PostgreSQL/Supabase privilege catalog captured and verified by the canonical baseline. This privilege is PostgreSQL privilege-model/version-sensitive. An engine upgrade or intentional privilege-model change must not be handled by silently adding, removing, or weakening an expected ACL row; it requires an explicit schema-contract update, regenerated catalog expectations, local drift probes, review, and production-equivalence verification.
| `scripts/human-alignment-benchmark.ts` (`npm run debug:human-alignment-benchmark`) | Manual benchmark command; not part of verify chain. | Level 3 = Full Baseline Verify | Uses `scripts/fixtures/human-alignment-benchmark.seed.json`; compares baseline v1/before v2/improved v2 metrics. |
| `scripts/artifact-residue/tmp-run-career-verdict-fidelity-audit-20.ts` | Manual/ad hoc 20-case Layer 1 fidelity replay helper (not npm command). | Level 3 = Full Baseline Verify | Produces `artifacts/layer1-career-verdict-fidelity-audit-20case.2026-04-01.json`. |
| Layer-1 audit scripts (`scripts/run-layer1-role-reading-audit.ts`, `run-layer1-primary-ownership-integrity-audit.ts`, `run-jd-role-structure-overlay-audit.ts`, `run-broad-dominance-audit.ts`, `run-true-broad-vs-fallback-audit.ts`, `run-qc-role-subject-collapse-audit.ts`) | Manual/ad hoc audits; not in canonical verify chain. | Level 2 = Layer Verify | These scripts default to writing `artifacts/*` JSON/MD outputs for Layer 1 diagnostics/comparisons. |
| Benchmark/audit aggregators (`scripts/run-match-alignment-audit.ts`, `run-job-signal-quality-audit.ts`, `run-capability-differentiation-audit.ts`, `run-mvp-audits.ts`) | Manual/ad hoc benchmark runs; not in canonical verify chain. | Level 3 = Full Baseline Verify | Build benchmark summaries/details from human-alignment fixture and related audits. |
| Summarize helpers (`scripts/artifact-residue/tmp-summarize-pre-center-scaffold-repro.js` and similar `scripts/artifact-residue/tmp-summarize-*.js`) | Manual/ad hoc summarization of prior audit artifacts. | Level 2 = Layer Verify | Usage frequency is Unknown; used to compute before/after deltas and regression counts from existing artifact files. |
| `docs/control/verification/verification-loop.md` | Detailed mechanics/reference for the full baseline verify pipeline. | Mechanics reference (Level 3) | Documents command order, coverage, fixtures, and artifact outputs. |
| `docs/verify-strategy.md` | Current strategy policy doc defining Level 1/2/3 intent and escalation. | Policy source (all levels) | Primary verification strategy source for default operating behavior. |

