import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { pathToFileURL } from "node:url";

type VerifyExtensionLifecycleArgs = {
    summaryOut?: string | null;
    detailsOut?: string | null;
};

type TimerEntry = {
    delay: number;
    callback: () => void;
    cleared: boolean;
};

type Harness = {
    panelState: {
        toStateFromResponse: (response: unknown) => string;
    };
    panelActions: {
        requestAnalysis: (tabId?: number, requestId?: number) => Promise<{
            ok?: boolean;
            state?: string;
            error?: string;
            code?: string;
            requestId?: number;
        }>;
        requestResumeDownload: (payload?: Record<string, unknown>) => Promise<{
            ok?: boolean;
            state?: string;
            error?: string;
            code?: string;
        }>;
    };
    runtime: {
        lastError: { message: string } | null;
        sendMessage: (message: unknown, callback: (response?: unknown) => void) => void;
    };
    runTimersByDelay: (delay: number) => void;
};

export type ExtensionLifecycleSummary = {
    step_name: "extension_lifecycle";
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    terminal_state_breakdown: Record<string, number>;
    static_checks: {
        stale_response_guard_present: boolean;
        pending_refresh_guard_present: boolean;
        explicit_terminal_state_branches_present: boolean;
        preview_not_ready_terminalized: boolean;
        bounded_retry_schedule_present: boolean;
        collapsed_extraction_retry_present: boolean;
    };
    timeout_codes: {
        analysis_timeout_code: string;
        download_timeout_code: string;
    };
    longest_state_trace_length: number;
    founder_readable_terminalized_case_rate: number;
    thresholds: {
        required_pass_rate: number;
    };
};

type ExtensionLifecycleTestResult = {
    case_id: string;
    pass: boolean;
    reason: string;
    expected_terminal_states: string[];
    state_transition_trace: string[];
    state_path: string;
    broken_state_path: string | null;
    terminal_state: string;
    timeout_context: {
        timeout_ms: number | null;
        timed_out: boolean;
    };
    snapshot?: Record<string, unknown>;
};

type ContextualError = Error & {
    context?: {
        state_transition_trace?: string[];
        terminal_state?: string;
        expected_terminal_states?: string[];
        timeout_ms?: number | null;
        timed_out?: boolean;
        snapshot?: Record<string, unknown>;
    };
};

function parseArgs(): VerifyExtensionLifecycleArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        summaryOut: readArg("--summaryOut"),
        detailsOut: readArg("--detailsOut"),
    };
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function loadScript(context: vm.Context, relativePath: string): void {
    const absolute = path.join(process.cwd(), relativePath);
    const source = fs.readFileSync(absolute, "utf8");
    vm.runInContext(source, context, { filename: relativePath });
}

function createHarness(): Harness {
    let timerId = 0;
    const timers = new Map<number, TimerEntry>();

    const runtime = {
        lastError: null as { message: string } | null,
        sendMessage: (_message: unknown, _callback: (response?: unknown) => void): void => {
            // default no-op; overridden in each test.
        },
    };

    const contextObject: Record<string, unknown> = {
        console,
        chrome: { runtime },
        setTimeout: (callback: () => void, delay?: number): number => {
            timerId += 1;
            timers.set(timerId, {
                delay: typeof delay === "number" ? delay : 0,
                callback,
                cleared: false,
            });
            return timerId;
        },
        clearTimeout: (id: number): void => {
            const entry = timers.get(id);
            if (entry) entry.cleared = true;
        },
    };
    contextObject.globalThis = contextObject;

    const context = vm.createContext(contextObject);
    loadScript(context, "extensions/job-copilot/shared/messages.js");
    loadScript(context, "extensions/job-copilot/shared/ui-contract.js");
    loadScript(context, "extensions/job-copilot/sidepanel/state/panel-state.js");
    loadScript(context, "extensions/job-copilot/sidepanel/state/panel-actions.js");

    const panelState = (contextObject.CareerTwinPanelState ?? null) as Harness["panelState"] | null;
    const panelActions = (contextObject.CareerTwinPanelActions ?? null) as Harness["panelActions"] | null;

    if (!panelState || typeof panelState.toStateFromResponse !== "function") {
        throw new Error("Failed to initialize CareerTwinPanelState in extension lifecycle harness.");
    }
    if (
        !panelActions
        || typeof panelActions.requestAnalysis !== "function"
        || typeof panelActions.requestResumeDownload !== "function"
    ) {
        throw new Error("Failed to initialize CareerTwinPanelActions in extension lifecycle harness.");
    }

    return {
        panelState,
        panelActions,
        runtime,
        runTimersByDelay: (delay: number): void => {
            const candidates = Array.from(timers.entries())
                .filter(([, entry]) => !entry.cleared && entry.delay === delay)
                .map(([id]) => id);
            for (const id of candidates) {
                const entry = timers.get(id);
                if (!entry || entry.cleared) continue;
                entry.cleared = true;
                entry.callback();
            }
        },
    };
}

function failWithContext(
    message: string,
    context: NonNullable<ContextualError["context"]>,
): never {
    const error = new Error(message) as ContextualError;
    error.context = context;
    throw error;
}

function assertStateMapping(panelState: Harness["panelState"]): {
    state_transition_trace: string[];
    terminal_state: string;
    snapshot: Record<string, unknown>;
} {
    const trace = ["mapping:start"];
    const ready = panelState.toStateFromResponse({ state: "ready" });
    const sparseReady = panelState.toStateFromResponse({ state: "sparse_ready" });
    const unsupportedPage = panelState.toStateFromResponse({ state: "unsupported_page" });
    const authRequired = panelState.toStateFromResponse({ state: "auth_required" });
    const errorState = panelState.toStateFromResponse({ state: "error" });
    const nullState = panelState.toStateFromResponse(null);

    if (ready !== "ready") failWithContext("state mapping failed for ready", { state_transition_trace: [...trace, `ready:${ready}`], terminal_state: ready, timeout_ms: null, timed_out: false });
    if (sparseReady !== "sparse_ready") failWithContext("state mapping failed for sparse_ready", { state_transition_trace: [...trace, `sparse_ready:${sparseReady}`], terminal_state: sparseReady, timeout_ms: null, timed_out: false });
    if (unsupportedPage !== "unsupported_page") failWithContext("state mapping failed for unsupported_page", { state_transition_trace: [...trace, `unsupported_page:${unsupportedPage}`], terminal_state: unsupportedPage, timeout_ms: null, timed_out: false });
    if (authRequired !== "auth_required") failWithContext("state mapping failed for auth_required", { state_transition_trace: [...trace, `auth_required:${authRequired}`], terminal_state: authRequired, timeout_ms: null, timed_out: false });
    if (errorState !== "error") failWithContext("state mapping failed for error", { state_transition_trace: [...trace, `error:${errorState}`], terminal_state: errorState, timeout_ms: null, timed_out: false });
    if (nullState !== "error") failWithContext("state mapping failed for null response", { state_transition_trace: [...trace, `null:${nullState}`], terminal_state: nullState, timeout_ms: null, timed_out: false });

    trace.push("mapping:terminal:ok");
    return {
        state_transition_trace: trace,
        terminal_state: "ok",
        snapshot: {
            ready,
            sparse_ready: sparseReady,
            unsupported_page: unsupportedPage,
            auth_required: authRequired,
            error: errorState,
            null_response: nullState,
        },
    };
}

async function assertAnalysisSuccess(): Promise<{
    state_transition_trace: string[];
    terminal_state: string;
    snapshot: Record<string, unknown>;
}> {
    const trace = ["analysis:request_dispatched"];
    const harness = createHarness();
    harness.runtime.sendMessage = (_message, callback) => {
        trace.push("analysis:response_received");
        callback({ ok: true, state: "ready", requestId: 7 });
    };

    const response = await harness.panelActions.requestAnalysis(123, 7);
    if (response.ok !== true) {
        failWithContext("analysis success check failed: expected ok=true", {
            state_transition_trace: [...trace, `analysis:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            timeout_ms: null,
            timed_out: false,
            snapshot: response as Record<string, unknown>,
        });
    }
    if (response.state !== "ready") {
        failWithContext("analysis success check failed: expected ready state", {
            state_transition_trace: [...trace, `analysis:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            timeout_ms: null,
            timed_out: false,
            snapshot: response as Record<string, unknown>,
        });
    }
    trace.push("analysis:terminal:ready");
    return {
        state_transition_trace: trace,
        terminal_state: "ready",
        snapshot: response as Record<string, unknown>,
    };
}

async function assertAnalysisRuntimeError(): Promise<{
    state_transition_trace: string[];
    terminal_state: string;
    snapshot: Record<string, unknown>;
}> {
    const trace = ["analysis:request_dispatched"];
    const harness = createHarness();
    harness.runtime.sendMessage = (_message, callback) => {
        trace.push("analysis:runtime_error");
        harness.runtime.lastError = { message: "runtime exploded" };
        callback(undefined);
        harness.runtime.lastError = null;
    };

    const response = await harness.panelActions.requestAnalysis(123, 8);
    if (response.ok !== false || response.state !== "error") {
        failWithContext("analysis runtime error check failed: expected terminal error", {
            state_transition_trace: [...trace, `analysis:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            timeout_ms: null,
            timed_out: false,
            snapshot: response as Record<string, unknown>,
        });
    }
    if (!(typeof response.error === "string" && response.error.includes("runtime exploded"))) {
        failWithContext("analysis runtime error check failed: expected runtime message", {
            state_transition_trace: [...trace, "analysis:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
            snapshot: response as Record<string, unknown>,
        });
    }
    trace.push("analysis:terminal:error");
    return {
        state_transition_trace: trace,
        terminal_state: "error",
        snapshot: response as Record<string, unknown>,
    };
}

async function assertAnalysisNoResponsePayloadError(): Promise<{
    state_transition_trace: string[];
    terminal_state: string;
    expected_terminal_states: string[];
    snapshot: Record<string, unknown>;
}> {
    const trace = ["analysis:request_dispatched"];
    const harness = createHarness();
    harness.runtime.sendMessage = (_message, callback) => {
        trace.push("analysis:response_missing_payload");
        callback(undefined);
    };

    const response = await harness.panelActions.requestAnalysis(123, 10);
    if (response.ok !== false || response.state !== "error") {
        failWithContext("analysis missing payload check failed: expected terminal error", {
            state_transition_trace: [...trace, `analysis:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            expected_terminal_states: ["error"],
            timeout_ms: null,
            timed_out: false,
            snapshot: response as Record<string, unknown>,
        });
    }
    if (!(typeof response.error === "string" && response.error.includes("No response received"))) {
        failWithContext("analysis missing payload check failed: expected no response message", {
            state_transition_trace: [...trace, "analysis:terminal:error"],
            terminal_state: "error",
            expected_terminal_states: ["error"],
            timeout_ms: null,
            timed_out: false,
            snapshot: response as Record<string, unknown>,
        });
    }
    trace.push("analysis:terminal:error");
    return {
        state_transition_trace: trace,
        terminal_state: "error",
        expected_terminal_states: ["error"],
        snapshot: response as Record<string, unknown>,
    };
}

async function assertAnalysisTimeout(): Promise<{
    timeout_code: string;
    state_transition_trace: string[];
    terminal_state: string;
    timeout_ms: number;
    snapshot: Record<string, unknown>;
}> {
    const trace = ["analysis:request_dispatched"];
    const harness = createHarness();
    harness.runtime.sendMessage = () => {
        // intentionally no callback to force timeout path.
        trace.push("analysis:awaiting_background_response");
    };

    const pending = harness.panelActions.requestAnalysis(123, 9);
    trace.push("analysis:timeout_elapsed");
    harness.runTimersByDelay(30000);
    const response = await pending;

    if (response.ok !== false || response.state !== "error" || response.code !== "sidepanel_request_timeout") {
        failWithContext("analysis timeout check failed", {
            state_transition_trace: [...trace, `analysis:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            timeout_ms: 30000,
            timed_out: true,
            snapshot: response as Record<string, unknown>,
        });
    }
    trace.push("analysis:terminal:error");
    return {
        timeout_code: response.code ?? "",
        state_transition_trace: trace,
        terminal_state: "error",
        timeout_ms: 30000,
        snapshot: response as Record<string, unknown>,
    };
}

async function assertAnalysisLateResponseIgnoredAfterTimeout(): Promise<{
    state_transition_trace: string[];
    terminal_state: string;
    expected_terminal_states: string[];
    timeout_ms: number;
    snapshot: Record<string, unknown>;
}> {
    const trace = ["analysis:request_dispatched"];
    const harness = createHarness();
    let capturedCallback: ((response?: unknown) => void) | null = null;
    harness.runtime.sendMessage = (_message, callback) => {
        trace.push("analysis:awaiting_background_response");
        capturedCallback = callback;
    };

    const pending = harness.panelActions.requestAnalysis(123, 11);
    trace.push("analysis:timeout_elapsed");
    harness.runTimersByDelay(30000);
    const response = await pending;
    if (response.ok !== false || response.state !== "error" || response.code !== "sidepanel_request_timeout") {
        failWithContext("analysis late response check failed: expected timeout terminal error", {
            state_transition_trace: [...trace, `analysis:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            expected_terminal_states: ["error"],
            timeout_ms: 30000,
            timed_out: true,
            snapshot: response as Record<string, unknown>,
        });
    }

    if (!capturedCallback) {
        failWithContext("analysis late response check failed: callback missing", {
            state_transition_trace: [...trace, "analysis:terminal:error"],
            terminal_state: "error",
            expected_terminal_states: ["error"],
            timeout_ms: 30000,
            timed_out: true,
            snapshot: response as Record<string, unknown>,
        });
    } else {
        const callback = capturedCallback as (response?: unknown) => void;
        callback({ ok: true, state: "ready", requestId: 11 });
    }
    trace.push("analysis:late_response_ignored");
    trace.push("analysis:terminal:error");

    return {
        state_transition_trace: trace,
        terminal_state: "error",
        expected_terminal_states: ["error"],
        timeout_ms: 30000,
        snapshot: {
            timeout_response: response,
            late_response: { ok: true, state: "ready", requestId: 11 },
        },
    };
}

async function assertResumeDownloadTimeout(): Promise<{
    timeout_code: string;
    state_transition_trace: string[];
    terminal_state: string;
    timeout_ms: number;
    snapshot: Record<string, unknown>;
}> {
    const trace = ["download:request_dispatched"];
    const harness = createHarness();
    harness.runtime.sendMessage = () => {
        // intentionally no callback to force timeout path.
        trace.push("download:awaiting_background_response");
    };

    const pending = harness.panelActions.requestResumeDownload({ interactionId: 4 });
    trace.push("download:timeout_elapsed");
    harness.runTimersByDelay(30000);
    const response = await pending;

    if (response.ok !== false || response.state !== "error" || response.code !== "sidepanel_download_timeout") {
        failWithContext("resume timeout check failed", {
            state_transition_trace: [...trace, `download:terminal:${response.state ?? "unknown"}`],
            terminal_state: String(response.state ?? "unknown"),
            timeout_ms: 30000,
            timed_out: true,
            snapshot: response as Record<string, unknown>,
        });
    }
    trace.push("download:terminal:error");
    return {
        timeout_code: response.code ?? "",
        state_transition_trace: trace,
        terminal_state: "error",
        timeout_ms: 30000,
        snapshot: response as Record<string, unknown>,
    };
}

function assertTransientAnalysisStateTerminalized(): {
    state_transition_trace: string[];
    terminal_state: string;
    expected_terminal_states: string[];
    snapshot: Record<string, unknown>;
} {
    const trace = ["state_mapping:transient_state_start"];
    const harness = createHarness();
    const mapped = harness.panelState.toStateFromResponse({ state: "requesting_analysis" });
    const terminalStates = ["ready", "sparse_ready", "error", "unsupported_page", "auth_required"];
    if (!terminalStates.includes(mapped)) {
        failWithContext("transient requesting_analysis state was not terminalized", {
            state_transition_trace: [...trace, `state_mapping:transient_mapped:${mapped}`],
            terminal_state: mapped,
            expected_terminal_states: terminalStates,
            timeout_ms: null,
            timed_out: false,
            snapshot: { mapped_state: mapped },
        });
    }
    trace.push(`state_mapping:transient_mapped:${mapped}`);
    trace.push(`state_mapping:terminal:${mapped}`);
    return {
        state_transition_trace: trace,
        terminal_state: mapped,
        expected_terminal_states: terminalStates,
        snapshot: {
            input_state: "requesting_analysis",
            mapped_state: mapped,
        },
    };
}

function runStaticLifecycleGuardsCheck(): ExtensionLifecycleSummary["static_checks"] {
    const liveSource = fs.readFileSync(
        path.join(process.cwd(), "extensions/job-copilot/sidepanel/sidepanel-live.js"),
        "utf8",
    );
    const analysisServiceSource = fs.readFileSync(
        path.join(process.cwd(), "extensions/job-copilot/background/analysis-service.js"),
        "utf8",
    );
    const contentSource = fs.readFileSync(
        path.join(process.cwd(), "extensions/job-copilot/content/index.js"),
        "utf8",
    );

    const staleGuard = liveSource.includes("responseRequestId < latestDispatchedRequestId");
    const pendingRefreshGuard = liveSource.includes("pendingRefresh") && liveSource.includes("if (inFlight)");
    const terminalBranches = liveSource.includes("state === \"unsupported_page\"")
        && liveSource.includes("state === \"auth_required\"")
        && liveSource.includes("state === \"error\"");
    const previewNotReadyTerminalized = analysisServiceSource.includes("preview_not_ready_yet")
        && analysisServiceSource.includes("state: \"error\"")
        && analysisServiceSource.includes("mapExtractionFailureMessage(extraction.reason)");
    const boundedRetrySchedule = contentSource.includes("const VIEW_RETRY_DELAYS_MS = [")
        && contentSource.includes("for (let attempt = 0; attempt < retryDelays.length; attempt += 1)");
    const collapsedExtractionRetryPresent = contentSource.includes("\"job_description_collapsed\"")
        && contentSource.includes("sourceMetadata.jd_collapsed_likely");

    if (!staleGuard) {
        failWithContext("sidepanel-live missing stale response guard", {
            state_transition_trace: ["static:sidepanel_live_checked", "static:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
        });
    }
    if (!pendingRefreshGuard) {
        failWithContext("sidepanel-live missing pending refresh in-flight guard", {
            state_transition_trace: ["static:sidepanel_live_checked", "static:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
        });
    }
    if (!terminalBranches) {
        failWithContext("sidepanel-live missing explicit terminal state branches", {
            state_transition_trace: ["static:sidepanel_live_checked", "static:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
        });
    }
    if (!previewNotReadyTerminalized) {
        failWithContext("preview_not_ready_yet is not clearly terminalized to error", {
            state_transition_trace: ["static:analysis_service_checked", "static:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
        });
    }
    if (!boundedRetrySchedule) {
        failWithContext("content extraction retry schedule is not clearly bounded", {
            state_transition_trace: ["static:content_retry_schedule_checked", "static:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
        });
    }
    if (!collapsedExtractionRetryPresent) {
        failWithContext("collapsed job description retry guard is missing", {
            state_transition_trace: ["static:content_collapsed_retry_checked", "static:terminal:error"],
            terminal_state: "error",
            timeout_ms: null,
            timed_out: false,
        });
    }

    return {
        stale_response_guard_present: staleGuard,
        pending_refresh_guard_present: pendingRefreshGuard,
        explicit_terminal_state_branches_present: terminalBranches,
        preview_not_ready_terminalized: previewNotReadyTerminalized,
        bounded_retry_schedule_present: boundedRetrySchedule,
        collapsed_extraction_retry_present: collapsedExtractionRetryPresent,
    };
}

export async function runExtensionLifecycleVerification(
    args: VerifyExtensionLifecycleArgs = {},
): Promise<ExtensionLifecycleSummary> {
    const results: ExtensionLifecycleTestResult[] = [];
    const runCase = async (
        caseId: string,
        runner: () => Promise<{
            state_transition_trace: string[];
            terminal_state: string;
            expected_terminal_states?: string[];
            timeout_ms?: number | null;
            snapshot?: Record<string, unknown>;
        } | void> | {
            state_transition_trace: string[];
            terminal_state: string;
            expected_terminal_states?: string[];
            timeout_ms?: number | null;
            snapshot?: Record<string, unknown>;
        } | void,
    ): Promise<void> => {
        try {
            const output = await runner();
            results.push({
                case_id: caseId,
                pass: true,
                reason: "ok",
                expected_terminal_states: output?.expected_terminal_states ?? [output?.terminal_state ?? "ok"],
                state_transition_trace: output?.state_transition_trace ?? [`${caseId}:executed`],
                state_path: (output?.state_transition_trace ?? [`${caseId}:executed`]).join(" -> "),
                broken_state_path: null,
                terminal_state: output?.terminal_state ?? "ok",
                timeout_context: {
                    timeout_ms: output?.timeout_ms ?? null,
                    timed_out: Boolean(typeof output?.timeout_ms === "number"),
                },
                snapshot: output?.snapshot ?? {},
            });
        } catch (error) {
            const contextualError = error as ContextualError;
            results.push({
                case_id: caseId,
                pass: false,
                reason: error instanceof Error ? error.message : String(error),
                expected_terminal_states: contextualError.context?.expected_terminal_states ?? [],
                state_transition_trace: contextualError.context?.state_transition_trace ?? [`${caseId}:failed_without_trace`],
                state_path: (contextualError.context?.state_transition_trace ?? [`${caseId}:failed_without_trace`]).join(" -> "),
                broken_state_path: (contextualError.context?.state_transition_trace ?? [`${caseId}:failed_without_trace`]).join(" -> "),
                terminal_state: contextualError.context?.terminal_state ?? "unknown",
                timeout_context: {
                    timeout_ms: contextualError.context?.timeout_ms ?? null,
                    timed_out: contextualError.context?.timed_out ?? false,
                },
                snapshot: contextualError.context?.snapshot ?? {},
            });
            throw error;
        }
    };

    await runCase("state_mapping", () => {
        const harness = createHarness();
        return assertStateMapping(harness.panelState);
    });

    await runCase("analysis_success", () => assertAnalysisSuccess());
    await runCase("analysis_runtime_error", () => assertAnalysisRuntimeError());
    await runCase("analysis_missing_payload_terminal", () => assertAnalysisNoResponsePayloadError());
    await runCase("analysis_late_response_after_timeout", () => assertAnalysisLateResponseIgnoredAfterTimeout());
    await runCase("transient_requesting_analysis_terminalized", () => assertTransientAnalysisStateTerminalized());

    let analysisTimeoutCode = "";
    await runCase("analysis_timeout_terminal", async () => {
        const timeoutResult = await assertAnalysisTimeout();
        analysisTimeoutCode = timeoutResult.timeout_code;
        return {
            state_transition_trace: timeoutResult.state_transition_trace,
            terminal_state: timeoutResult.terminal_state,
            timeout_ms: timeoutResult.timeout_ms,
            snapshot: {
                timeout_code: timeoutResult.timeout_code,
                response: timeoutResult.snapshot,
            },
        };
    });

    let downloadTimeoutCode = "";
    await runCase("resume_download_timeout_terminal", async () => {
        const timeoutResult = await assertResumeDownloadTimeout();
        downloadTimeoutCode = timeoutResult.timeout_code;
        return {
            state_transition_trace: timeoutResult.state_transition_trace,
            terminal_state: timeoutResult.terminal_state,
            timeout_ms: timeoutResult.timeout_ms,
            snapshot: {
                timeout_code: timeoutResult.timeout_code,
                response: timeoutResult.snapshot,
            },
        };
    });

    let staticChecks: ExtensionLifecycleSummary["static_checks"] | null = null;
    await runCase("static_lifecycle_guards", () => {
        staticChecks = runStaticLifecycleGuardsCheck();
        return {
            state_transition_trace: [
                "static:sidepanel_live_checked",
                "static:analysis_service_checked",
                "static:content_retry_schedule_checked",
                "static:terminal:ok",
            ],
            terminal_state: "ok",
            snapshot: staticChecks,
        };
    });

    const passed = results.filter((result) => result.pass).length;
    const failed = results.length - passed;
    const totalTests = results.length;
    const terminalStateBreakdown = results.reduce<Record<string, number>>((acc, result) => {
        const key = result.terminal_state;
        acc[key] = (acc[key] ?? 0) + 1;
        return acc;
    }, {});
    const summary: ExtensionLifecycleSummary = {
        step_name: "extension_lifecycle",
        total_tests: totalTests,
        passed_tests: passed,
        failed_tests: failed,
        terminal_state_breakdown: terminalStateBreakdown,
        static_checks: staticChecks ?? {
            stale_response_guard_present: false,
            pending_refresh_guard_present: false,
            explicit_terminal_state_branches_present: false,
            preview_not_ready_terminalized: false,
            bounded_retry_schedule_present: false,
            collapsed_extraction_retry_present: false,
        },
        timeout_codes: {
            analysis_timeout_code: analysisTimeoutCode,
            download_timeout_code: downloadTimeoutCode,
        },
        longest_state_trace_length: results.reduce((max, result) => Math.max(max, result.state_transition_trace.length), 0),
        founder_readable_terminalized_case_rate: Number((passed / Math.max(1, totalTests)).toFixed(4)),
        thresholds: {
            required_pass_rate: 1,
        },
    };

    if (args.summaryOut) writeJson(args.summaryOut, summary);
    if (args.detailsOut) writeJson(args.detailsOut, {
        step_name: "extension_lifecycle",
        founder_readability: {
            pass_rate: Number((passed / Math.max(1, totalTests)).toFixed(4)),
            first_failed_case: results.find((result) => !result.pass)?.case_id ?? null,
            broken_state_path: results.find((result) => !result.pass)?.broken_state_path ?? null,
            recommended_next_action: results.some((result) => !result.pass)
                ? "Inspect first_failed_case broken_state_path, fix that terminal-state bug, rerun npm run verify."
                : "All lifecycle fixtures reached terminal states within bounded paths.",
        },
        results,
        final_observed_state_chains: results.map((result) => ({
            case_id: result.case_id,
            state_transition_trace: result.state_transition_trace,
            state_path: result.state_path,
            expected_terminal_states: result.expected_terminal_states,
            terminal_state: result.terminal_state,
            timeout_context: result.timeout_context,
        })),
    });

    const passRate = summary.passed_tests / Math.max(1, summary.total_tests);
    if (passRate < summary.thresholds.required_pass_rate) {
        throw new Error(`Extension lifecycle verification failed: pass_rate=${passRate}.`);
    }

    return summary;
}

async function run(): Promise<void> {
    const args = parseArgs();
    const summary = await runExtensionLifecycleVerification(args);
    console.log(JSON.stringify(summary, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[verify-extension-lifecycle] Failed", error);
        process.exit(1);
    });
}
