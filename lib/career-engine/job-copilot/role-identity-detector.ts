import type { JobSignalsFromRawJd } from "@/lib/career-engine/job-copilot/backend/job-signals-from-raw-jd";
import type { CapabilityMatchV2Result } from "@/lib/career-engine/matching/capability-match-v2";
import type { DomainAnchor } from "@/lib/career-engine/job-copilot/domain-family-config";
import { computeDomainAnchorRelevance, detectDomainAnchor } from "@/lib/career-engine/job-copilot/domain-family-detector";

export type RoleType =
    | "product"
    | "delivery_leadership"
    | "consulting"
    | "analytics_leadership"
    | "innovation_strategy"
    | "domain_expert"
    | "program_management"
    | "engineering";

export type DeliveryScope = "enterprise" | "multi_team" | "hands_on" | "unknown";

export type RoleIdentity = {
    primaryRoleType: RoleType;
    secondaryRoleTypes: RoleType[];
    domainContext?: string;
    domainAnchor: DomainAnchor;
    deliveryScope?: DeliveryScope;
    confidence: number;
    signalSummary: string[];
};

type RoleSignalPattern = {
    title: RegExp[];
    body: RegExp[];
};

const ROLE_SIGNAL_PATTERNS: Record<RoleType, RoleSignalPattern> = {
    product: {
        title: [/\bproduct (manager|owner|lead|director|head)\b/i],
        body: [/\bproduct strategy\b/i, /\broadmap\b/i, /\bfeature\b/i, /\buser journey\b/i, /\bexperimentation\b/i],
    },
    delivery_leadership: {
        title: [/\b(delivery director|head of delivery|transformation lead|implementation lead)\b/i],
        body: [/\bdelivery\b/i, /\bportfolio\b/i, /\bprogram governance\b/i, /\boperating model\b/i, /\btransformation\b/i],
    },
    consulting: {
        title: [/\bconsultant\b/i, /\badvis(or|ory)\b/i, /\bprincipal consultant\b/i],
        body: [/\bclient\b/i, /\bengagement\b/i, /\badvisory\b/i, /\bworkshop\b/i, /\bstakeholder alignment\b/i],
    },
    analytics_leadership: {
        title: [/\b(analytics manager|head of analytics|insights lead|commercial analytics)\b/i],
        body: [/\banalytics\b/i, /\binsight\b/i, /\bmeasurement\b/i, /\breporting\b/i, /\bdecision support\b/i],
    },
    innovation_strategy: {
        title: [/\b(strategy lead|innovation lead|strategy manager)\b/i],
        body: [/\binnovation\b/i, /\bstrategy\b/i, /\bnew capability\b/i, /\broadmap\b/i, /\bgrowth initiative\b/i],
    },
    domain_expert: {
        title: [/\b(subject matter expert|domain specialist|legal counsel|clinical)\b/i],
        body: [/\blegal\b/i, /\bcompliance\b/i, /\bregulatory\b/i, /\bdomain expertise\b/i, /\bindustry expertise\b/i],
    },
    program_management: {
        title: [/\bprogram manager\b/i, /\bproject manager\b/i, /\bpm\b/i],
        body: [/\bprogram\b/i, /\bproject\b/i, /\bmilestone\b/i, /\brisk management\b/i, /\bgovernance\b/i],
    },
    engineering: {
        title: [/\b(engineer|architect|developer|engineering manager)\b/i],
        body: [/\bsystem design\b/i, /\bplatform\b/i, /\bsoftware\b/i, /\bcode\b/i, /\btechnical leadership\b/i],
    },
};

function clamp(value: number, min = 0, max = 1): number {
    return Math.max(min, Math.min(max, value));
}

function normalizeText(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9\s]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function countMatches(patterns: RegExp[], text: string): number {
    let matched = 0;
    for (const pattern of patterns) {
        if (pattern.test(text)) matched += 1;
    }
    return matched;
}

function buildCorpora(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): {
    titleCorpus: string;
    bodyCorpus: string;
    clusterCorpus: string;
} {
    const titleCorpus = normalizeText([
        params.jobTitle,
        params.parsedSignals.target_title ?? "",
        params.parsedSignals.role_family ?? "",
    ].join(" "));
    const bodyCorpus = normalizeText([
        ...params.parsedSignals.required_skills,
        ...params.parsedSignals.preferred_skills,
        ...params.parsedSignals.responsibilities,
        ...params.parsedSignals.domains,
        ...params.parsedSignals.keywords,
    ].join(" "));
    const clusterCorpus = normalizeText(
        params.matchResult
            ? params.matchResult.audit.requirement_clusters
                .slice(0, 12)
                .map((cluster) => [cluster.display_name, ...cluster.methods, ...cluster.domain_modifiers].join(" "))
                .join(" ")
            : "",
    );
    return {
        titleCorpus,
        bodyCorpus,
        clusterCorpus,
    };
}

function scoreRoleTypes(corpora: {
    titleCorpus: string;
    bodyCorpus: string;
    clusterCorpus: string;
}): Array<{ roleType: RoleType; score: number; signalSummary: string[] }> {
    const scored: Array<{ roleType: RoleType; score: number; signalSummary: string[] }> = [];
    const roleTypes = Object.keys(ROLE_SIGNAL_PATTERNS) as RoleType[];
    for (const roleType of roleTypes) {
        const pattern = ROLE_SIGNAL_PATTERNS[roleType];
        const titleHits = countMatches(pattern.title, corpora.titleCorpus);
        const bodyHits = countMatches(pattern.body, corpora.bodyCorpus);
        const clusterHits = countMatches(pattern.body, corpora.clusterCorpus);
        const score = Number(((titleHits * 2.2) + (bodyHits * 1.1) + (clusterHits * 1.4)).toFixed(4));
        const summary: string[] = [];
        if (titleHits > 0) summary.push(`title_hits:${titleHits}`);
        if (bodyHits > 0) summary.push(`body_hits:${bodyHits}`);
        if (clusterHits > 0) summary.push(`cluster_hits:${clusterHits}`);
        scored.push({ roleType, score, signalSummary: summary });
    }
    return scored.sort((left, right) => right.score - left.score);
}

function toDomainContext(domainAnchor: DomainAnchor): string | undefined {
    if (!domainAnchor.domainFamily) return undefined;
    if (domainAnchor.domainFamily === "domain_specialist") {
        const vertical = domainAnchor.specializationHints.find((hint) => hint === "legal" || hint === "healthcare" || hint === "finance" || hint === "supply_chain");
        return vertical ?? "domain_specialist";
    }
    if (domainAnchor.domainFamily === "data") return "data_ai";
    return domainAnchor.domainFamily;
}

function detectDeliveryScope(corpora: {
    titleCorpus: string;
    bodyCorpus: string;
}): DeliveryScope {
    const joined = `${corpora.titleCorpus} ${corpora.bodyCorpus}`;
    if (/\b(global|enterprise wide|enterprise-wide|organization wide|org-wide)\b/i.test(joined)) {
        return "enterprise";
    }
    if (/\b(cross functional|cross-functional|across teams|multiple teams|portfolio)\b/i.test(joined)) {
        return "multi_team";
    }
    if (/\b(hands on|hands-on|individual contributor|ic role)\b/i.test(joined)) {
        return "hands_on";
    }
    return "unknown";
}

export function detectRoleIdentity(params: {
    jobTitle: string;
    parsedSignals: JobSignalsFromRawJd;
    matchResult?: CapabilityMatchV2Result;
}): RoleIdentity {
    const corpora = buildCorpora(params);
    const roleScores = scoreRoleTypes(corpora);
    const domainAnchor = detectDomainAnchor({
        jobTitle: params.jobTitle,
        parsedSignals: params.parsedSignals,
        matchResult: params.matchResult,
    });
    const primary = roleScores[0];
    const secondary = roleScores
        .slice(1)
        .filter((item) => item.score >= Math.max(1.2, primary.score * 0.55))
        .slice(0, 2)
        .map((item) => item.roleType);
    const secondScore = roleScores[1]?.score ?? 0;
    const confidence = Number(clamp(
        0.35
        + Math.min(0.45, primary.score * 0.09)
        + Math.min(0.18, Math.max(0, primary.score - secondScore) * 0.08),
        0.25,
        0.96,
    ).toFixed(4));
    return {
        primaryRoleType: primary.roleType,
        secondaryRoleTypes: secondary,
        domainContext: toDomainContext(domainAnchor),
        domainAnchor,
        deliveryScope: detectDeliveryScope(corpora),
        confidence,
        signalSummary: primary.signalSummary,
    };
}

export function computeRoleIdentityRelevance(input: {
    text: string;
    roleIdentity: RoleIdentity;
}): number {
    const normalized = normalizeText(input.text);
    if (!normalized) return 0;

    const rolePattern = ROLE_SIGNAL_PATTERNS[input.roleIdentity.primaryRoleType];
    const primaryHits = countMatches([...rolePattern.title, ...rolePattern.body], normalized);
    const secondaryHits = input.roleIdentity.secondaryRoleTypes.reduce((sum, roleType) => {
        const pattern = ROLE_SIGNAL_PATTERNS[roleType];
        return sum + countMatches([...pattern.title, ...pattern.body], normalized);
    }, 0);
    const domainHit = computeDomainAnchorRelevance({
        text: normalized,
        domainAnchor: input.roleIdentity.domainAnchor,
    });
    return Number(clamp((primaryHits * 0.42) + (secondaryHits * 0.24) + (domainHit * 0.32), 0, 1).toFixed(4));
}

export function toRoleIdentityLabel(roleType: RoleType): string {
    if (roleType === "delivery_leadership") return "delivery leadership";
    if (roleType === "analytics_leadership") return "analytics leadership";
    if (roleType === "innovation_strategy") return "innovation strategy";
    if (roleType === "program_management") return "program management";
    if (roleType === "domain_expert") return "domain expertise";
    return roleType.replace(/_/g, " ");
}
