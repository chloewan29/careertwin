export interface CapabilityInferenceInput {
    resumeText?: string;
    experiences?: string[];
    projects?: string[];
    achievements?: string[];
    summary?: string | null;
}

const CAPABILITY_PATTERNS: Record<string, string[]> = {
    "Program Leadership": [
        "program leadership",
        "program lead",
        "led program",
        "programme leadership",
    ],
    "Enterprise Transformation": [
        "enterprise transformation",
        "transformation program",
        "operating model transformation",
        "business transformation",
    ],
    "Stakeholder Strategy": [
        "stakeholder strategy",
        "stakeholder alignment strategy",
        "stakeholder management strategy",
        "executive stakeholder strategy",
    ],
    "Commercial Analytics": [
        "commercial analytics",
        "commercial analysis",
        "commercial insights",
        "analytics strategy",
    ],
};

function normalizeText(parts: Array<string | null | undefined>): string {
    return parts
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
}

export function inferCapabilities(input: CapabilityInferenceInput): string[] {
    const corpus = normalizeText([
        input.resumeText,
        input.summary ?? "",
        ...(input.experiences ?? []),
        ...(input.projects ?? []),
        ...(input.achievements ?? []),
    ]);

    if (!corpus.trim()) return [];

    const inferred = Object.entries(CAPABILITY_PATTERNS)
        .filter(([, patterns]) => patterns.some(pattern => corpus.includes(pattern)))
        .map(([capability]) => capability);

    return Array.from(new Set(inferred));
}
