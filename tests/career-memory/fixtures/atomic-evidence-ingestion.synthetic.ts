import {
    ATOMIC_EVIDENCE_CONTRACT_VERSION,
    buildAtomicEvidenceSourceUnit,
    sha256,
    type AtomicEvidenceProviderResponse,
    type AtomicEvidenceRole,
} from "../../../lib/career-engine/evidence/atomic-evidence-ingestion";

export const SYNTHETIC_SOURCE_REVISION_SHA256 = sha256("privacy-safe synthetic six-role resume revision");

export const SYNTHETIC_ATOMIC_ROLES: AtomicEvidenceRole[] = Array.from({ length: 6 }, (_, index) => ({
    roleRef: `ROLE_${String(index + 1).padStart(2, "0")}`,
    company: `Synthetic Organization ${index + 1}`,
    title: `Synthetic Professional Role ${index + 1}`,
    dateRange: `Synthetic Period ${index + 1}`,
    sortOrder: index,
}));

const unitSentences = [
    ["Within regional operations, led a service rollout that reduced handoff delays."],
    ["For executive reporting, designed a governed dashboard that replaced manual consolidation."],
    ["During a partner transition, directed an interface migration that preserved all validated records."],
    [
        "For an internal workflow, authored a data design that clarified system behavior.",
        "For operational safety, delivered a control platform that standardized incident handling.",
    ],
    [
        "For digital billing, documented integration requirements that enabled reliable API testing.",
        "Within service operations, governed incident lifecycles that improved resolution consistency.",
    ],
    ["Across distribution operations, led a platform migration that maintained uninterrupted fulfilment."],
    ["During a continuity event, established secure remote operations that maintained team delivery."],
    [
        "For retail logistics, delivered a label integration that improved partner data exchange.",
        "Across branch locations, managed a network rollout that increased connection reliability.",
        "Within enterprise operations, supported core planning modules that stabilized daily processing.",
    ],
    [
        "Within a production support team, resolved application incidents that restored critical workflows.",
        "For service enablement, authored support guidance that reduced repeated requests by 18%.",
    ],
    ["Within front-office operations, performed root-cause analysis that reduced recurring incidents."],
    [
        "For a process program, analyzed operating workflows that produced validated cost savings.",
        "During system adoption, led user training that improved operational readiness.",
        "Within daily integration support, diagnosed message failures that restored data flow.",
    ],
    ["For a commercial application, owned delivery from scope through release and customer launch."],
    ["Within a mobile product, engineered tracking logic that enabled performance analysis."],
    ["Across product delivery, applied structured analysis practices that supported post-launch growth."],
] as const;

const roleForUnit = [1, 1, 1, 1, 1, 2, 2, 2, 3, 4, 5, 6, 6, 6] as const;

export const SYNTHETIC_ATOMIC_SOURCE_UNITS = unitSentences.map((sentences, index) => buildAtomicEvidenceSourceUnit({
    sourceUnitRef: `SOURCE_${String(index + 1).padStart(3, "0")}`,
    roleRef: `ROLE_${String(roleForUnit[index]).padStart(2, "0")}`,
    sourceUnitOrdinal: index,
    sourceText: sentences.join(" "),
}));

function actionFor(sentence: string): string {
    const match = sentence.match(/,\s+(.+?)\s+that\s+/);
    return match?.[1] ?? sentence;
}

function contextFor(sentence: string): string {
    return sentence.split(",")[0];
}

function outcomeFor(sentence: string): string | null {
    const match = sentence.match(/\bthat\s+(.+?)[.]?$/);
    return match?.[1]?.replace(/\.$/, "") ?? null;
}

export const SYNTHETIC_ATOMIC_PROVIDER_RESPONSE: AtomicEvidenceProviderResponse = {
    contractVersion: ATOMIC_EVIDENCE_CONTRACT_VERSION,
    provider: "synthetic-provider",
    model: "deterministic-fixture",
    providerVersion: "synthetic-atomic-provider/1.0.0",
    units: SYNTHETIC_ATOMIC_SOURCE_UNITS.map((unit, index) => {
        const sentences = unitSentences[index];
        return {
            roleRef: unit.roleRef,
            sourceUnitRef: unit.sourceUnitRef,
            fate: "ATOMIC_EVIDENCE_CREATED" as const,
            evidence: sentences.map((sentence) => {
                const sourceSpanStart = unit.sourceText.indexOf(sentence);
                const metric = sentence.match(/\b\d+(?:\.\d+)?%\b/)?.[0];
                return {
                    roleRef: unit.roleRef,
                    sourceUnitRef: unit.sourceUnitRef,
                    sourceQuote: sentence,
                    sourceSpanStart,
                    sourceSpanEnd: sourceSpanStart + sentence.length,
                    atomicStatement: sentence,
                    context: contextFor(sentence),
                    action: actionFor(sentence),
                    outcome: outcomeFor(sentence),
                    sourceSupportedMetrics: metric ? [metric] : [],
                    extractionConfidence: 0.98,
                };
            }),
        };
    }),
};
