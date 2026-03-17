import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

type VerifyTypecheckDebtArgs = {
    summaryOut?: string | null;
    detailsOut?: string | null;
    trendOut?: string | null;
};

type TypecheckDiagnostic = {
    file: string;
    line: number;
    column: number;
    code: string;
    message: string;
    category: "core_careertwin_path" | "legacy_or_debt_path";
};

type TypecheckDebtSummary = {
    step_name: "typescript_debt_audit";
    full_repo_typecheck_passed: boolean;
    command: string;
    total_error_count: number;
    category_counts: {
        core_careertwin_path: number;
        legacy_or_debt_path: number;
    };
    top_error_codes: Array<{
        code: string;
        count: number;
    }>;
    top_files: Array<{
        file: string;
        count: number;
        category: "core_careertwin_path" | "legacy_or_debt_path";
    }>;
    recommended_smallest_safe_cleanup_order: string[];
};

function parseArgs(): VerifyTypecheckDebtArgs {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    return {
        summaryOut: readArg("--summaryOut"),
        detailsOut: readArg("--detailsOut"),
        trendOut: readArg("--trendOut"),
    };
}

function readJson<T>(filePath: string): T | null {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    if (!fs.existsSync(absolute)) return null;
    try {
        return JSON.parse(fs.readFileSync(absolute, "utf8")) as T;
    } catch {
        return null;
    }
}

function writeJson(filePath: string, data: unknown): void {
    const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, "/");
}

function categorizeFile(filePath: string): "core_careertwin_path" | "legacy_or_debt_path" {
    const normalized = normalizePath(filePath);

    const corePatterns = [
        /^lib\/career-engine\/(memory|capability|evidence|matching|job-copilot|parsing|copilot)\//,
        /^extensions\/job-copilot\//,
        /^app\/api\/(job-copilot|parse-resume|resume\/generate|job-actions|match-history|job-detail)\//,
    ];

    if (corePatterns.some((pattern) => pattern.test(normalized))) {
        return "core_careertwin_path";
    }

    return "legacy_or_debt_path";
}

function parseDiagnostics(tscOutput: string): TypecheckDiagnostic[] {
    const diagnostics: TypecheckDiagnostic[] = [];
    const lines = tscOutput.split(/\r?\n/);
    const matcher = /^(.+)\((\d+),(\d+)\): error (TS\d+): (.+)$/;

    for (const line of lines) {
        const match = line.match(matcher);
        if (!match) continue;
        const file = normalizePath(match[1].trim());
        diagnostics.push({
            file,
            line: Number.parseInt(match[2], 10),
            column: Number.parseInt(match[3], 10),
            code: match[4],
            message: match[5].trim(),
            category: categorizeFile(file),
        });
    }

    return diagnostics;
}

function runFullTypecheck(): {
    command: string;
    exitCode: number;
    stdout: string;
    stderr: string;
} {
    const isWindows = process.platform === "win32";
    const command = isWindows ? (process.env.ComSpec ?? "cmd.exe") : "npx";
    const args = isWindows
        ? ["/d", "/s", "/c", "npx tsc --noEmit --pretty false"]
        : ["tsc", "--noEmit", "--pretty", "false"];

    const result = spawnSync(command, args, {
        cwd: process.cwd(),
        encoding: "utf8",
        stdio: "pipe",
        maxBuffer: 20 * 1024 * 1024,
    });

    return {
        command: `${isWindows ? "cmd /c" : command} ${args.join(" ")}`,
        exitCode: result.status ?? -1,
        stdout: result.stdout ?? "",
        stderr: result.stderr ?? "",
    };
}

function countBy<T extends string>(values: T[]): Record<T, number> {
    const result = {} as Record<T, number>;
    for (const value of values) {
        result[value] = (result[value] ?? 0) + 1;
    }
    return result;
}

function topEntries(input: Record<string, number>, limit: number): Array<{ key: string; count: number }> {
    return Object.entries(input)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([key, count]) => ({ key, count }));
}

function buildCleanupOrder(diagnostics: TypecheckDiagnostic[]): string[] {
    const coreCount = diagnostics.filter((item) => item.category === "core_careertwin_path").length;
    const debtCount = diagnostics.filter((item) => item.category === "legacy_or_debt_path").length;

    const suggestions: string[] = [];
    if (coreCount > 0) {
        suggestions.push("1) Fix core `lib/career-engine/matching/*` and `lib/career-engine/job-understanding/*` type predicate/nullability errors first, because these touch canonical matcher runtime confidence.");
        suggestions.push("2) Fix core API contract/type-cast errors in `app/api/parse-resume/*` and extension client typing issues (`extensions/job-copilot/extension/*`) as a narrow second pass.");
    }
    if (debtCount > 0) {
        suggestions.push("3) Quarantine or repair legacy/debt TypeScript paths (legacy tests, debug scripts, strategy modules) with minimal-scope changes, without touching canonical runtime behavior.");
    }
    if (suggestions.length === 0) {
        suggestions.push("No TypeScript debt detected in current run.");
    }
    return suggestions;
}

export async function runTypecheckDebtAudit(args: VerifyTypecheckDebtArgs = {}): Promise<{
    summary: TypecheckDebtSummary;
    details: {
        diagnostics: TypecheckDiagnostic[];
        command_result: {
            command: string;
            exit_code: number;
            stdout: string;
            stderr: string;
        };
    };
}> {
    const previousSummary = args.summaryOut
        ? readJson<TypecheckDebtSummary>(args.summaryOut)
        : null;
    const commandResult = runFullTypecheck();
    const combinedOutput = [commandResult.stdout, commandResult.stderr].filter(Boolean).join("\n");
    const diagnostics = parseDiagnostics(combinedOutput);

    const categoryCounts = countBy(diagnostics.map((item) => item.category));
    const codeCounts = countBy(diagnostics.map((item) => item.code));
    const fileCounts = countBy(diagnostics.map((item) => item.file));

    const topFiles = topEntries(fileCounts, 12).map((entry) => {
        const sample = diagnostics.find((item) => item.file === entry.key);
        return {
            file: entry.key,
            count: entry.count,
            category: sample?.category ?? "legacy_or_debt_path",
        };
    });

    const summary: TypecheckDebtSummary = {
        step_name: "typescript_debt_audit",
        full_repo_typecheck_passed: commandResult.exitCode === 0,
        command: commandResult.command,
        total_error_count: diagnostics.length,
        category_counts: {
            core_careertwin_path: categoryCounts.core_careertwin_path ?? 0,
            legacy_or_debt_path: categoryCounts.legacy_or_debt_path ?? 0,
        },
        top_error_codes: topEntries(codeCounts, 12).map((entry) => ({
            code: entry.key,
            count: entry.count,
        })),
        top_files: topFiles,
        recommended_smallest_safe_cleanup_order: buildCleanupOrder(diagnostics),
    };

    const details = {
        diagnostics,
        command_result: {
            command: commandResult.command,
            exit_code: commandResult.exitCode,
            stdout: commandResult.stdout,
            stderr: commandResult.stderr,
        },
    };

    if (args.summaryOut) writeJson(args.summaryOut, summary);
    if (args.detailsOut) writeJson(args.detailsOut, details);
    if (args.trendOut) {
        const beforeCore = previousSummary?.category_counts.core_careertwin_path ?? null;
        const beforeLegacy = previousSummary?.category_counts.legacy_or_debt_path ?? null;
        const beforeTotal = previousSummary?.total_error_count ?? null;
        const afterCore = summary.category_counts.core_careertwin_path;
        const afterLegacy = summary.category_counts.legacy_or_debt_path;
        const afterTotal = summary.total_error_count;
        writeJson(args.trendOut, {
            step_name: "typescript_debt_delta",
            before: {
                core_careertwin_path: beforeCore,
                legacy_or_debt_path: beforeLegacy,
                total_error_count: beforeTotal,
            },
            after: {
                core_careertwin_path: afterCore,
                legacy_or_debt_path: afterLegacy,
                total_error_count: afterTotal,
            },
            delta: {
                core_careertwin_path: beforeCore === null ? null : afterCore - beforeCore,
                legacy_or_debt_path: beforeLegacy === null ? null : afterLegacy - beforeLegacy,
                total_error_count: beforeTotal === null ? null : afterTotal - beforeTotal,
            },
            legacy_or_debt_status: beforeLegacy === null
                ? "unknown_no_previous_baseline"
                : afterLegacy === beforeLegacy
                    ? "unchanged"
                    : afterLegacy > beforeLegacy
                        ? "increased"
                        : "decreased",
        });
    }

    return { summary, details };
}

async function run(): Promise<void> {
    const args = parseArgs();
    const result = await runTypecheckDebtAudit(args);
    console.log(JSON.stringify({
        step_name: result.summary.step_name,
        full_repo_typecheck_passed: result.summary.full_repo_typecheck_passed,
        total_error_count: result.summary.total_error_count,
        category_counts: result.summary.category_counts,
        summary_out: args.summaryOut,
        details_out: args.detailsOut,
        trend_out: args.trendOut,
    }, null, 2));
}

const isMainModule = process.argv[1]
    ? import.meta.url === pathToFileURL(process.argv[1]).href
    : false;

if (isMainModule) {
    run().catch((error) => {
        console.error("[verify-typecheck-debt] Failed", error);
        process.exit(1);
    });
}
