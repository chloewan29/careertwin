import { loadEnvConfig } from "@next/env";
import { getTopCapabilitiesForCareer } from "@/lib/career-engine/capability/capability-graph";
import { getRoleFit } from "@/lib/career-engine/matching/role-fit-service";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import { getCareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

const TARGET_ROLES = ["Program Manager", "Data Product Manager"] as const;
loadEnvConfig(process.cwd());

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

function assertArray(name: string, value: unknown): asserts value is unknown[] {
    assert(Array.isArray(value), `Expected ${name} to be an array.`);
}

async function resolveProfileId(inputProfileId?: string): Promise<string> {
    const trimmed = inputProfileId?.trim();
    if (trimmed) return trimmed;

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

    if (error) {
        throw new Error(`Failed to auto-resolve profileId from profiles: ${error.message}`);
    }

    const profileId = data?.[0]?.id;
    if (!profileId || typeof profileId !== "string") {
        throw new Error("No profile found. Provide a profileId: npm run test:career-foundation -- <profileId>");
    }

    return profileId;
}

async function main(): Promise<void> {
    const profileId = await resolveProfileId(process.argv[2]);
    console.log(`\nCareer Foundation Smoke Test`);
    console.log(`profileId: ${profileId}\n`);

    const careerGraph = await loadCareerGraph(profileId);
    assert(careerGraph && typeof careerGraph === "object", "Career graph load returned invalid data.");
    assert(careerGraph.career, "Expected an existing career for this profile, but no career was found.");

    assertArray("experiences", careerGraph.experiences);
    assertArray("evidencePieces", careerGraph.evidencePieces);
    assertArray("capabilities", careerGraph.capabilities);
    assertArray("capabilityEvidenceLinks", careerGraph.capabilityEvidenceLinks);

    const counts = {
        experiences: careerGraph.experiences.length,
        evidencePieces: careerGraph.evidencePieces.length,
        capabilities: careerGraph.capabilities.length,
        capabilityEvidenceLinks: careerGraph.capabilityEvidenceLinks.length,
    };

    console.log(`Career graph counts:`);
    console.log(`- experiences: ${counts.experiences}`);
    console.log(`- evidencePieces: ${counts.evidencePieces}`);
    console.log(`- capabilities: ${counts.capabilities}`);
    console.log(`- capabilityEvidenceLinks: ${counts.capabilityEvidenceLinks}\n`);

    assert(counts.experiences > 0, "Unexpected empty experiences: expected at least 1 experience.");
    assert(counts.evidencePieces > 0, "Unexpected empty evidencePieces: expected at least 1 evidence piece.");
    assert(counts.capabilities > 0, "Unexpected empty capabilities: expected at least 1 capability.");
    assert(
        counts.capabilityEvidenceLinks > 0,
        "Unexpected empty capabilityEvidenceLinks: expected at least 1 capability-evidence link.",
    );

    const topCapabilities = getTopCapabilitiesForCareer(careerGraph, 5);
    assertArray("topCapabilities", topCapabilities);
    assert(topCapabilities.length > 0, "Top capabilities returned empty unexpectedly.");

    console.log(`Top capabilities (up to 5):`);
    for (const item of topCapabilities) {
        console.log(`- ${item.capability.name} (evidence: ${item.evidenceCount})`);
    }
    console.log("");

    const roleFits = TARGET_ROLES.map((role) => getRoleFit(careerGraph, role));
    assert(roleFits.length === TARGET_ROLES.length, "Role fit output length mismatch.");
    for (const roleFit of roleFits) {
        assert(Number.isFinite(roleFit.fitScore), `Invalid fitScore for role "${roleFit.targetRole}".`);
        assertArray(`matchedCapabilities(${roleFit.targetRole})`, roleFit.matchedCapabilities);
        assertArray(`missingCapabilities(${roleFit.targetRole})`, roleFit.missingCapabilities);
        assertArray(`supportingEvidence(${roleFit.targetRole})`, roleFit.supportingEvidence);
    }

    console.log(`Role fit results:`);
    for (const roleFit of roleFits) {
        console.log(`- ${roleFit.targetRole}: score=${roleFit.fitScore}, matched=${roleFit.matchedCapabilities.length}, missing=${roleFit.missingCapabilities.length}, evidence=${roleFit.supportingEvidence.length}`);
    }
    console.log("");

    const careerSignals = getCareerSignals(careerGraph, [...TARGET_ROLES]);
    assertArray("careerSignals.topCapabilities", careerSignals.topCapabilities);
    assertArray("careerSignals.bestFitRoles", careerSignals.bestFitRoles);
    assertArray("careerSignals.keyGaps", careerSignals.keyGaps);
    assertArray("careerSignals.evidenceHighlights", careerSignals.evidenceHighlights);

    assert(careerSignals.topCapabilities.length > 0, "Career signals topCapabilities unexpectedly empty.");
    assert(careerSignals.bestFitRoles.length > 0, "Career signals bestFitRoles unexpectedly empty.");
    assert(careerSignals.evidenceHighlights.length > 0, "Career signals evidenceHighlights unexpectedly empty.");

    console.log(`Career signals summary:`);
    console.log(`- bestFitRoles: ${careerSignals.bestFitRoles.map((x) => `${x.targetRole} (${x.fitScore})`).join(", ")}`);
    console.log(`- keyGaps: ${careerSignals.keyGaps.length > 0 ? careerSignals.keyGaps.join(", ") : "(none)"}`);
    console.log(`- evidenceHighlights: ${careerSignals.evidenceHighlights.length}`);
    console.log("\nSmoke test passed.");
}

main().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nSmoke test failed: ${message}`);
    process.exit(1);
});
