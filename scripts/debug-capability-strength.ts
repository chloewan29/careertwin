import fs from "node:fs";
import path from "node:path";
import { CAPABILITY_STRENGTH_WEIGHTS, getCapabilityStrengthProfile } from "@/lib/career-engine/capability/capability-strength";

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

    const topSignalsValue = Number.parseInt(readArg("--topSignals") ?? "5", 10);
    return {
        careerId: readArg("--careerId"),
        topSignals: Number.isFinite(topSignalsValue) ? Math.max(1, Math.min(10, topSignalsValue)) : 5,
    };
}

async function run(): Promise<void> {
    loadEnvLocal();
    const { careerId, topSignals } = parseArgs();
    if (!careerId) {
        throw new Error("Usage: tsx scripts/debug-capability-strength.ts --careerId <id> [--topSignals <n>]");
    }

    const ranked = await getCapabilityStrengthProfile(careerId, { topSignalsLimit: topSignals });
    console.log(JSON.stringify({
        career_id: careerId,
        model: "capability_strength_v1",
        weights: CAPABILITY_STRENGTH_WEIGHTS,
        ranked_capabilities: ranked,
    }, null, 2));
}

run().catch((error) => {
    console.error("[debug-capability-strength] Failed", error);
    process.exit(1);
});
