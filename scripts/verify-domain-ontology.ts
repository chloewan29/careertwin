import {
    DOMAIN_ONTOLOGY_SKELETON,
    SPECIALIZATION_SIGNAL_MAP,
    type DomainFamily,
    type DomainSpecialization,
    type SpecializationSignalConfig,
} from "@/lib/career-engine/job-copilot/domain-ontology-config";

const PURE_TOOL_TOKENS = new Set([
    "sql",
    "python",
    "tableau",
    "power bi",
    "looker",
    "excel",
]);

const DOMAIN_CONCEPT_PHRASES_IN_TOOLS = [
    "marketing strategy",
    "campaign analytics",
    "product management",
    "financial planning",
    "commercial finance",
    "people analytics",
    "clinical operations",
    "legal operations",
    "supply chain",
    "sales operations",
];

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function validateNonEmptyArray(
    errors: string[],
    specialization: string,
    fieldName: "canonical_signals" | "anti_signals" | "common_tools",
    values: string[],
): void {
    if (values.length === 0) {
        errors.push(`${specialization}: ${fieldName} must be non-empty.`);
        return;
    }
    const hasOnlyEmpty = values.every((value) => normalizeText(value).length === 0);
    if (hasOnlyEmpty) {
        errors.push(`${specialization}: ${fieldName} contains only empty values.`);
    }
}

function validateSignalMapEntry(
    errors: string[],
    specialization: string,
    config: SpecializationSignalConfig,
    expectedFamily: DomainFamily,
): void {
    if (config.family !== expectedFamily) {
        errors.push(`${specialization}: declared family '${config.family}' does not match skeleton family '${expectedFamily}'.`);
    }
    validateNonEmptyArray(errors, specialization, "canonical_signals", config.canonical_signals);
    validateNonEmptyArray(errors, specialization, "anti_signals", config.anti_signals);
    validateNonEmptyArray(errors, specialization, "common_tools", config.common_tools);

    for (const canonical of config.canonical_signals) {
        const normalized = normalizeText(canonical);
        if (PURE_TOOL_TOKENS.has(normalized)) {
            errors.push(`${specialization}: canonical_signals contains tool-only token '${canonical}'.`);
        }
    }

    for (const tool of config.common_tools) {
        const normalized = normalizeText(tool);
        if (!normalized) {
            errors.push(`${specialization}: common_tools contains an empty entry.`);
            continue;
        }
        if (DOMAIN_CONCEPT_PHRASES_IN_TOOLS.some((phrase) => normalized.includes(phrase))) {
            errors.push(`${specialization}: common_tools contains domain concept '${tool}' (should stay tooling-oriented).`);
        }
    }
}

function main(): void {
    const errors: string[] = [];
    const specializationToFamily = new Map<DomainSpecialization, DomainFamily>();
    const duplicateWithinFamily: string[] = [];
    const duplicateAcrossFamilies: string[] = [];
    let skeletonSpecializationCount = 0;

    for (const [family, entry] of Object.entries(DOMAIN_ONTOLOGY_SKELETON) as Array<[DomainFamily, (typeof DOMAIN_ONTOLOGY_SKELETON)[DomainFamily]]>) {
        const seenInFamily = new Set<DomainSpecialization>();
        for (const specialization of entry.specializations) {
            skeletonSpecializationCount += 1;
            if (seenInFamily.has(specialization)) {
                duplicateWithinFamily.push(`${family}:${specialization}`);
            }
            seenInFamily.add(specialization);

            const existingFamily = specializationToFamily.get(specialization);
            if (existingFamily && existingFamily !== family) {
                duplicateAcrossFamilies.push(`${specialization}:${existingFamily}->${family}`);
            } else if (!existingFamily) {
                specializationToFamily.set(specialization, family);
            }
        }
    }

    if (duplicateWithinFamily.length > 0) {
        errors.push(`Duplicate specializations within family: ${duplicateWithinFamily.join(", ")}`);
    }
    if (duplicateAcrossFamilies.length > 0) {
        errors.push(`Specializations assigned to multiple families: ${duplicateAcrossFamilies.join(", ")}`);
    }

    let mapEntryCount = 0;
    for (const [specialization, config] of Object.entries(SPECIALIZATION_SIGNAL_MAP)) {
        mapEntryCount += 1;
        const specializationKey = specialization as DomainSpecialization;
        const family = specializationToFamily.get(specializationKey);
        if (!family) {
            errors.push(`${specialization}: not found in DOMAIN_ONTOLOGY_SKELETON.`);
            continue;
        }
        validateSignalMapEntry(errors, specialization, config, family);
    }

    if (errors.length > 0) {
        // eslint-disable-next-line no-console
        console.error("[verify-domain-ontology] FAILED");
        for (const error of errors) {
            // eslint-disable-next-line no-console
            console.error(`- ${error}`);
        }
        process.exitCode = 1;
        return;
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify({
        status: "passed",
        families: Object.keys(DOMAIN_ONTOLOGY_SKELETON).length,
        skeleton_specializations_total: skeletonSpecializationCount,
        unique_skeleton_specializations: specializationToFamily.size,
        specialization_signal_map_entries: mapEntryCount,
    }, null, 2));
}

main();
