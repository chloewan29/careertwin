function normalizeKey(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

type ConsistencyInput = {
    displayName?: string | null;
    canonicalName?: string | null;
    sourceRequirementId?: string | null;
};

function includesAny(value: string, terms: string[]): boolean {
    return terms.some((term) => value.includes(term));
}

export function getClusterConsistencyKey(input: string | ConsistencyInput): string {
    const raw = typeof input === "string"
        ? input
        : (
            input.displayName
            ?? input.canonicalName
            ?? input.sourceRequirementId
            ?? ""
        );
    const normalized = normalizeKey(raw);
    if (!normalized) return "unknown";

    if (includesAny(normalized, [
        "marketing science",
        "marketing measurement",
        "media measurement",
        "campaign analytics",
        "attribution",
        "incrementality",
        "mmm",
    ])) {
        return "marketing_measurement";
    }

    if (includesAny(normalized, [
        "commercial analytics",
        "commercial insight",
        "revenue analytics",
        "pricing analytics",
        "growth analytics",
    ])) {
        return "commercial_analytics";
    }

    if (includesAny(normalized, [
        "product analytics",
        "product measurement",
        "feature adoption",
        "activation",
        "retention",
        "experimentation",
        "ab test",
        "a b test",
    ])) {
        return "product_analytics";
    }

    if (includesAny(normalized, [
        "data platform",
        "data warehouse",
        "pipeline",
        "etl",
        "semantic layer",
        "bi reporting",
        "dashboard",
    ])) {
        return "data_platform_reporting";
    }

    if (includesAny(normalized, [
        "stakeholder",
        "cross functional",
        "cross functional alignment",
        "executive alignment",
        "collaboration",
    ])) {
        return "cross_functional_alignment";
    }

    if (includesAny(normalized, [
        "program governance",
        "program delivery",
        "portfolio delivery",
        "transformation delivery",
    ])) {
        return "program_delivery";
    }

    const tokens = normalized.split(" ").filter(Boolean).slice(0, 3);
    return tokens.join("_");
}

export function normalizeConsistencyText(value: string): string {
    return normalizeKey(value).replace(/\s+/g, "_");
}
