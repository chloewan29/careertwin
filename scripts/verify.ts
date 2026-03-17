import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

type VerifyStepName =
    | "compile"
    | "typescript_debt_audit"
    | "tests"
    | "jd_extraction"
    | "matcher"
    | "extension_lifecycle";

type VerifyStepResult = {
    name: VerifyStepName;
    status: "passed" | "failed" | "skipped";
    started_at: string;
    finished_at: string;
    duration_ms: number;
    artifact_path: string | null;
    error: string | null;
};

type VerifySummary = {
    status: "passed" | "failed";
    overall_verification_state: "passed" | "failed";
    first_failing_step: VerifyStepName | null;
    core_path_ts_debt_count: number | null;
    matcher_regression_status: "passed" | "failed" | "unknown";
    extension_lifecycle_regression_status: "passed" | "failed" | "unknown";
    recommended_next_action: string;
    started_at: string;
    finished_at: string;
    duration_ms: number;
    steps: VerifyStepResult[];
};

type TypecheckDebtSummaryArtifact = {
    full_repo_typecheck_passed: boolean;
    total_error_count: number;
    category_counts: {
        core_careertwin_path: number;
        legacy_or_debt_path: number;
    };
};

type MatcherRegressionDiffArtifact = {
    pass: boolean;
};

type ExtensionLifecycleSummaryArtifact = {
    failed_tests: number;
};

const ARTIFACTS_DIR = path.join(process.cwd(), "artifacts");
const VERIFY_SUMMARY_PATH = path.join(ARTIFACTS_DIR, "verify-summary.json");

function writeJson(filePath: string, data: unknown): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function readJson<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
    } catch {
        return null;
    }
}

function nowIso(): string {
    return new Date().toISOString();
}

function elapsedMs(start: number): number {
    return Math.round(performance.now() - start);
}

function compileStep(artifactPath: string): void {
    const command = process.platform === "win32"
        ? (process.env.ComSpec ?? "cmd.exe")
        : "npx";
    const args = process.platform === "win32"
        ? ["/d", "/s", "/c", "npx tsc -p tsconfig.verify.json --pretty false"]
        : ["tsc", "-p", "tsconfig.verify.json", "--pretty", "false"];

    const result = spawnSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
    });

    const compileArtifact = {
        command: `${command} ${args.join(" ")}`,
        exit_code: result.status ?? -1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
    };
    writeJson(artifactPath, compileArtifact);

    if (result.status !== 0) {
        const message = (result.stderr && result.stderr.trim())
            || (result.stdout && result.stdout.trim())
            || "Unknown compile failure";
        throw new Error(message);
    }
}

function runTsxScriptStep(scriptPath: string, scriptArgs: string[], artifactPath: string): void {
    const isWindows = process.platform === "win32";
    const quotedArgs = scriptArgs.map((arg) => {
        if (!arg.includes(" ")) return arg;
        return `"${arg.replace(/"/g, "\\\"")}"`;
    }).join(" ");

    const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npx";
    const args = isWindows
        ? ["/d", "/s", "/c", `npx tsx ${scriptPath} ${quotedArgs}`.trim()]
        : ["tsx", scriptPath, ...scriptArgs];

    const result = spawnSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
    });

    writeJson(artifactPath, {
        command: `${isWindows ? "cmd /c" : command} ${args.join(" ")}`,
        exit_code: result.status ?? -1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
    });

    if (result.status !== 0) {
        const message = (result.stderr && result.stderr.trim())
            || (result.stdout && result.stdout.trim())
            || `Step command failed for ${scriptPath}`;
        throw new Error(message);
    }
}

function buildRecommendedNextAction(params: {
    status: "passed" | "failed";
    firstFailingStep: VerifyStepName | null;
    coreDebtCount: number | null;
    matcherStatus: "passed" | "failed" | "unknown";
    extensionStatus: "passed" | "failed" | "unknown";
    typecheckDebtArtifact: TypecheckDebtSummaryArtifact | null;
}): string {
    if (params.firstFailingStep) {
        return `Fix first failing step '${params.firstFailingStep}' and rerun npm run verify.`;
    }
    if ((params.coreDebtCount ?? 0) > 0) {
        return `Reduce remaining core-path TypeScript debt (${params.coreDebtCount}) and rerun npm run verify.`;
    }
    if (params.matcherStatus === "failed") {
        return "Investigate matcher regression failure and rerun npm run verify without changing matcher baseline.";
    }
    if (params.extensionStatus === "failed") {
        return "Investigate extension lifecycle terminal-state regression and rerun npm run verify.";
    }
    if (params.typecheckDebtArtifact && !params.typecheckDebtArtifact.full_repo_typecheck_passed) {
        return `Core path is clean; legacy/debt TypeScript errors remain (${params.typecheckDebtArtifact.category_counts.legacy_or_debt_path}). Prioritize smallest legacy cleanup batch.`;
    }
    if (params.status === "passed") {
        return "No immediate action. Keep matcher baseline unchanged and rerun npm run verify after each meaningful change.";
    }
    return "Investigate verification failure and rerun npm run verify.";
}

function finalizeSummary(input: {
    status: "passed" | "failed";
    startedAt: string;
    finishedAt: string;
    durationMs: number;
    steps: VerifyStepResult[];
    typecheckDebtSummaryPath: string;
    matcherDiffPath: string;
    extensionSummaryPath: string;
}): VerifySummary {
    const firstFailingStep = input.steps.find((step) => step.status === "failed")?.name ?? null;
    const typecheckDebtArtifact = readJson<TypecheckDebtSummaryArtifact>(input.typecheckDebtSummaryPath);
    const matcherDiffArtifact = readJson<MatcherRegressionDiffArtifact>(input.matcherDiffPath);
    const extensionSummaryArtifact = readJson<ExtensionLifecycleSummaryArtifact>(input.extensionSummaryPath);

    const matcherRegressionStatus: "passed" | "failed" | "unknown" = matcherDiffArtifact
        ? (matcherDiffArtifact.pass ? "passed" : "failed")
        : "unknown";
    const extensionLifecycleRegressionStatus: "passed" | "failed" | "unknown" = extensionSummaryArtifact
        ? (extensionSummaryArtifact.failed_tests === 0 ? "passed" : "failed")
        : "unknown";
    const coreDebtCount = typecheckDebtArtifact?.category_counts.core_careertwin_path ?? null;

    return {
        status: input.status,
        overall_verification_state: input.status,
        first_failing_step: firstFailingStep,
        core_path_ts_debt_count: coreDebtCount,
        matcher_regression_status: matcherRegressionStatus,
        extension_lifecycle_regression_status: extensionLifecycleRegressionStatus,
        recommended_next_action: buildRecommendedNextAction({
            status: input.status,
            firstFailingStep,
            coreDebtCount,
            matcherStatus: matcherRegressionStatus,
            extensionStatus: extensionLifecycleRegressionStatus,
            typecheckDebtArtifact,
        }),
        started_at: input.startedAt,
        finished_at: input.finishedAt,
        duration_ms: input.durationMs,
        steps: input.steps,
    };
}

async function runStep(
    name: VerifyStepName,
    action: () => Promise<unknown> | unknown,
    artifactPath: string | null,
): Promise<VerifyStepResult> {
    const startedAt = nowIso();
    const started = performance.now();
    try {
        await action();
        return {
            name,
            status: "passed",
            started_at: startedAt,
            finished_at: nowIso(),
            duration_ms: elapsedMs(started),
            artifact_path: artifactPath,
            error: null,
        };
    } catch (error) {
        return {
            name,
            status: "failed",
            started_at: startedAt,
            finished_at: nowIso(),
            duration_ms: elapsedMs(started),
            artifact_path: artifactPath,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}

async function runVerify(): Promise<VerifySummary> {
    fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
    const verifyStart = performance.now();
    const summaryStart = nowIso();
    const steps: VerifyStepResult[] = [];

    const compileArtifactPath = path.join(ARTIFACTS_DIR, "compile-summary.json");
    const typecheckDebtSummaryPath = path.join(ARTIFACTS_DIR, "typescript-debt-summary.json");
    const typecheckDebtDetailsPath = path.join(ARTIFACTS_DIR, "typescript-debt-details.json");
    const typecheckDebtTrendPath = path.join(ARTIFACTS_DIR, "typescript-debt-delta.json");
    const typecheckDebtStepPath = path.join(ARTIFACTS_DIR, "typescript-debt-step.json");
    const jdSummaryPath = path.join(ARTIFACTS_DIR, "jd-extraction-summary.json");
    const jdDetailsPath = path.join(ARTIFACTS_DIR, "jd-extraction-details.json");
    const jdStepPath = path.join(ARTIFACTS_DIR, "jd-extraction-step.json");
    const testsStepPath = path.join(ARTIFACTS_DIR, "tests-step.json");
    const matcherSummaryPath = path.join(ARTIFACTS_DIR, "matcher-summary.json");
    const matcherDetailsPath = path.join(ARTIFACTS_DIR, "matcher-details.json");
    const matcherDiffPath = path.join(ARTIFACTS_DIR, "matcher-regression-diff.json");
    const matcherStepPath = path.join(ARTIFACTS_DIR, "matcher-step.json");
    const extensionSummaryPath = path.join(ARTIFACTS_DIR, "extension-lifecycle-summary.json");
    const extensionDetailsPath = path.join(ARTIFACTS_DIR, "extension-lifecycle-details.json");
    const extensionStepPath = path.join(ARTIFACTS_DIR, "extension-lifecycle-step.json");

    const compileResult = await runStep(
        "compile",
        () => compileStep(compileArtifactPath),
        compileArtifactPath,
    );
    steps.push(compileResult);
    if (compileResult.status === "failed") {
        return finalizeSummary({
            status: "failed",
            startedAt: summaryStart,
            finishedAt: nowIso(),
            durationMs: elapsedMs(verifyStart),
            steps,
            typecheckDebtSummaryPath,
            matcherDiffPath,
            extensionSummaryPath,
        });
    }

    const typecheckDebtResult = await runStep(
        "typescript_debt_audit",
        () => runTsxScriptStep(
            "scripts/verify-typecheck-debt.ts",
            ["--summaryOut", typecheckDebtSummaryPath, "--detailsOut", typecheckDebtDetailsPath, "--trendOut", typecheckDebtTrendPath],
            typecheckDebtStepPath,
        ),
        typecheckDebtStepPath,
    );
    steps.push(typecheckDebtResult);
    if (typecheckDebtResult.status === "failed") {
        return finalizeSummary({
            status: "failed",
            startedAt: summaryStart,
            finishedAt: nowIso(),
            durationMs: elapsedMs(verifyStart),
            steps,
            typecheckDebtSummaryPath,
            matcherDiffPath,
            extensionSummaryPath,
        });
    }

    const testsResult = await runStep(
        "tests",
        () => runTsxScriptStep(
            "tests/test-matching-fixtures.ts",
            [],
            testsStepPath,
        ),
        testsStepPath,
    );
    steps.push(testsResult);
    if (testsResult.status === "failed") {
        return finalizeSummary({
            status: "failed",
            startedAt: summaryStart,
            finishedAt: nowIso(),
            durationMs: elapsedMs(verifyStart),
            steps,
            typecheckDebtSummaryPath,
            matcherDiffPath,
            extensionSummaryPath,
        });
    }

    const jdResult = await runStep(
        "jd_extraction",
        () => runTsxScriptStep(
            "scripts/verify-jd-extraction.ts",
            ["--summaryOut", jdSummaryPath, "--detailsOut", jdDetailsPath],
            jdStepPath,
        ),
        jdStepPath,
    );
    steps.push(jdResult);
    if (jdResult.status === "failed") {
        return finalizeSummary({
            status: "failed",
            startedAt: summaryStart,
            finishedAt: nowIso(),
            durationMs: elapsedMs(verifyStart),
            steps,
            typecheckDebtSummaryPath,
            matcherDiffPath,
            extensionSummaryPath,
        });
    }

    const matcherResult = await runStep(
        "matcher",
        () => runTsxScriptStep(
            "scripts/verify-matcher.ts",
            ["--summaryOut", matcherSummaryPath, "--detailsOut", matcherDetailsPath, "--diffOut", matcherDiffPath],
            matcherStepPath,
        ),
        matcherStepPath,
    );
    steps.push(matcherResult);
    if (matcherResult.status === "failed") {
        return finalizeSummary({
            status: "failed",
            startedAt: summaryStart,
            finishedAt: nowIso(),
            durationMs: elapsedMs(verifyStart),
            steps,
            typecheckDebtSummaryPath,
            matcherDiffPath,
            extensionSummaryPath,
        });
    }

    const extensionResult = await runStep(
        "extension_lifecycle",
        () => runTsxScriptStep(
            "scripts/verify-extension-lifecycle.ts",
            ["--summaryOut", extensionSummaryPath, "--detailsOut", extensionDetailsPath],
            extensionStepPath,
        ),
        extensionStepPath,
    );
    steps.push(extensionResult);

    return finalizeSummary({
        status: extensionResult.status === "failed" ? "failed" : "passed",
        startedAt: summaryStart,
        finishedAt: nowIso(),
        durationMs: elapsedMs(verifyStart),
        steps,
        typecheckDebtSummaryPath,
        matcherDiffPath,
        extensionSummaryPath,
    });
}

async function run(): Promise<void> {
    const summary = await runVerify();
    writeJson(VERIFY_SUMMARY_PATH, summary);
    console.log(JSON.stringify(summary, null, 2));
    if (summary.status === "failed") {
        process.exit(1);
    }
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

    if (isMainModule) {
        run().catch((error) => {
            const summary: VerifySummary = {
                status: "failed",
                overall_verification_state: "failed",
                first_failing_step: null,
                core_path_ts_debt_count: null,
                matcher_regression_status: "unknown",
                extension_lifecycle_regression_status: "unknown",
                recommended_next_action: "Investigate verify runner failure and rerun npm run verify.",
                started_at: nowIso(),
                finished_at: nowIso(),
                duration_ms: 0,
                steps: [],
            };
        writeJson(VERIFY_SUMMARY_PATH, summary);
        console.error("[verify] Failed", error);
        process.exit(1);
    });
}
