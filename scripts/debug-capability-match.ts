import fs from "node:fs";
import path from "node:path";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";

const SAMPLE_JOB_DESCRIPTION = `Senior Manager, Analytics Strategy and Automation
We are seeking a senior analytics leader to drive analytics strategy, automation, and commercial growth insights.
You will lead a cross-functional analytics team, partner with product, finance, marketing, and operations leaders, and present business cases to executive stakeholders.
Required: proven experience building strategic roadmaps, market and opportunity assessment, commercial analytics, and translating analysis into revenue outcomes.
Required: experience implementing analytics automation using SQL/Python and BI tools (Power BI, Tableau, or similar).
Preferred: experience in enterprise BI/data platform transformation and enablement programs to improve adoption and capability uplift.
You will own delivery of transformation initiatives, optimize operational performance, and ensure measurable business impact.`;

function loadEnvLocal(): void {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function parseArgs(): { careerId: string | null; topSignals: number } {
    const args = process.argv.slice(2);
    const readArg = (name: string): string | null => {
        const idx = args.indexOf(name);
        if (idx === -1) return null;
        return args[idx + 1] ?? null;
    };
    const topSignalsValue = Number.parseInt(readArg("--topSignals") ?? "3", 10);
    return {
        careerId: readArg("--careerId"),
        topSignals: Number.isFinite(topSignalsValue) ? Math.max(1, Math.min(8, topSignalsValue)) : 3,
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    const { careerId, topSignals } = parseArgs();
    if (!careerId) {
        throw new Error("Usage: tsx scripts/debug-capability-match.ts --careerId <id> [--topSignals <n>]");
    }

    const result = await getCapabilityMatchV1({
        careerId,
        jobDescription: SAMPLE_JOB_DESCRIPTION,
        topSignalsLimit: topSignals,
    });

    console.log(JSON.stringify({
        job_description: SAMPLE_JOB_DESCRIPTION,
        ...result,
    }, null, 2));
}

run().catch((error) => {
    console.error("[debug-capability-match] Failed", error);
    process.exit(1);
});

