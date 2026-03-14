type EvidenceSignalInitiativeType =
    | "strategy"
    | "transformation"
    | "analytics"
    | "automation"
    | "consulting"
    | "delivery"
    | "optimization"
    | "market_analysis"
    | "capability_uplift";
type EvidenceSignalScopeLevel = "task" | "project" | "team" | "function" | "enterprise" | "market";
type EvidenceSignalOwnershipLevel = "contributor" | "driver" | "owner" | "lead";
type EvidenceSignalStakeholderScope = "internal" | "cross_functional" | "executive" | "external";

export type EvidenceSignalRecord = {
    career_id: string;
    evidence_piece_id: string;
    action: string | null;
    domain: string | null;
    initiative_type: EvidenceSignalInitiativeType | null;
    scope_level: EvidenceSignalScopeLevel | null;
    ownership_level: EvidenceSignalOwnershipLevel | null;
    stakeholder_scope: EvidenceSignalStakeholderScope[];
    tool_signals: string[];
    capability_hints: string[];
    team_signal: string | null;
    impact_signal: string | null;
    confidence_score: number | null;
};

export type EvidencePieceForSignalExtraction = {
    id: string;
    career_id: string;
    raw_text: string;
};

const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z0-9])/;
const CLAUSE_SPLIT_RE = /\s*(?:;|\.|\band\b(?=\s+[A-Z][a-z])|\bwhile\b|\bwhich\b)\s*/i;
const ACTION_SPLIT_RE = /\s+(?=(?:Led|Built|Presented|Conducted|Generated|Owned|Established|Drove|Developed|Implemented|Created|Delivered|Launched|Managed|Improved|Reduced|Increased|Pioneered|Identified|Secured|Influenced|Negotiated)\b)/g;

const ACTION_CATALOG: Array<{ normalized: string; pattern: RegExp }> = [
    { normalized: "led", pattern: /\b(led|lead)\b/i },
    { normalized: "built", pattern: /\b(built|build)\b/i },
    { normalized: "developed", pattern: /\b(developed|develop)\b/i },
    { normalized: "deployed", pattern: /\b(deployed|deploy)\b/i },
    { normalized: "presented", pattern: /\b(presented|present)\b/i },
    { normalized: "identified", pattern: /\b(identified|identify)\b/i },
    { normalized: "implemented", pattern: /\b(implemented|implement)\b/i },
    { normalized: "created", pattern: /\b(created|create)\b/i },
    { normalized: "delivered", pattern: /\b(delivered|deliver)\b/i },
    { normalized: "managed", pattern: /\b(managed|manage)\b/i },
    { normalized: "optimized", pattern: /\b(optimized|optimised|optimize|optimise)\b/i },
    { normalized: "reduced", pattern: /\b(reduced|reduce)\b/i },
    { normalized: "increased", pattern: /\b(increased|increase)\b/i },
    { normalized: "drove", pattern: /\b(drove|drive)\b/i },
    { normalized: "pioneered", pattern: /\b(pioneered|pioneer)\b/i },
    { normalized: "secured approval", pattern: /\b(secured approval|gained approval|won approval)\b/i },
    { normalized: "influenced", pattern: /\b(influenced|influence)\b/i },
    { normalized: "negotiated", pattern: /\b(negotiated|negotiate)\b/i },
];

const TOOL_PATTERNS: Array<{ tool: string; pattern: RegExp }> = [
    { tool: "sql", pattern: /\bsql\b/i },
    { tool: "python", pattern: /\bpython\b/i },
    { tool: "r", pattern: /\b(?:using|in|with)\s+r\b|\br language\b|\br\/shiny\b|\btidyverse\b/i },
    { tool: "javascript", pattern: /\bjavascript\b/i },
    { tool: "power bi", pattern: /\bpower\s*bi\b/i },
    { tool: "tableau", pattern: /\btableau\b/i },
    { tool: "bigquery", pattern: /\bbigquery\b/i },
    { tool: "excel", pattern: /\bexcel\b/i },
    { tool: "snowflake", pattern: /\bsnowflake\b/i },
    { tool: "dbt", pattern: /\bdbt\b/i },
    { tool: "google analytics", pattern: /\bgoogle analytics\b|\bga4\b/i },
    { tool: "looker", pattern: /\blooker\b/i },
    { tool: "airflow", pattern: /\bairflow\b/i },
    { tool: "aws", pattern: /\baws\b/i },
    { tool: "azure", pattern: /\bazure\b/i },
    { tool: "gcp", pattern: /\bgcp\b|\bgoogle cloud\b/i },
];

const CAPABILITY_HINT_PATTERNS: Array<{ hint: string; pattern: RegExp }> = [
    { hint: "People Leadership", pattern: /\b(mentored|coached|managed a team|team leadership|team of \d+)\b/i },
    { hint: "Program Leadership", pattern: /\b(program(?:me)?|cross-functional delivery|multi-workstream)\b/i },
    { hint: "Enterprise Transformation", pattern: /\b(enterprise transformation|operating model transformation|enterprise-wide transformation)\b/i },
    { hint: "Stakeholder Strategy", pattern: /\b(executive stakeholders?|stakeholder alignment|influenced stakeholders?|secured approval)\b/i },
    { hint: "Commercial Analytics", pattern: /\b(commercial analytics|pricing|margin|revenue analysis|profitability)\b/i },
    { hint: "BI / Data Platform Transformation", pattern: /\b(data platform transformation|bi transformation|reporting platform modernization)\b/i },
    { hint: "Strategic Planning", pattern: /\b(strategy roadmap|strategic planning|annual planning)\b/i },
    { hint: "Change Management", pattern: /\b(change rollout|change management|adoption strategy)\b/i },
];

function normalizeWhitespace(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function splitEvidenceIntoSignalCandidates(rawText: string): string[] {
    const normalized = normalizeWhitespace(rawText);
    if (!normalized) return [];

    const sentences = normalized
        .split(SENTENCE_SPLIT_RE)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);
    const sentenceLike = sentences.length > 0 ? sentences : [normalized];

    const candidates = sentenceLike
        .flatMap((sentence) => sentence.split(CLAUSE_SPLIT_RE))
        .flatMap((clause) => clause.split(ACTION_SPLIT_RE))
        .map((part) => part.trim())
        .filter((part) => part.length >= 12);

    return Array.from(new Set(candidates));
}

function detectAction(text: string): string | null {
    for (const entry of ACTION_CATALOG) {
        if (entry.pattern.test(text)) return entry.normalized;
    }
    return null;
}

function detectDomain(text: string): string | null {
    if (/\b(analytics|analysis|analyze|analysed|analysed|bi|business intelligence|reporting|insights?)\b/i.test(text)) return "analytics";
    if (/\b(strategy|strategic|roadmap|planning|prioritization)\b/i.test(text)) return "strategy";
    if (/\b(operations?|process|workflow|delivery)\b/i.test(text)) return "operations";
    if (/\b(finance|commercial|pricing|margin|revenue)\b/i.test(text)) return "commercial";
    if (/\b(market|customer segment|competitor|demand|forecast)\b/i.test(text)) return "market";
    if (/\b(platform|engineering|infrastructure|automation)\b/i.test(text)) return "engineering";
    if (/\b(client|consulting|advisory|partner)\b/i.test(text)) return "consulting";
    return null;
}

function detectInitiativeType(text: string): EvidenceSignalInitiativeType | null {
    if (/\b(transformation|operating model|modernization|modernisation)\b/i.test(text)) return "transformation";
    if (/\b(strategy|strategic|roadmap|planning)\b/i.test(text)) return "strategy";
    if (/\b(analytics|insight|reporting|bi)\b/i.test(text)) return "analytics";
    if (/\b(automation|automated|pipeline|workflow automation)\b/i.test(text)) return "automation";
    if (/\b(consulting|advisory|client engagement)\b/i.test(text)) return "consulting";
    if (/\b(delivery|rollout|implementation)\b/i.test(text)) return "delivery";
    if (/\b(optimi[sz]ed|improved|efficiency|cycle time)\b/i.test(text)) return "optimization";
    if (/\b(market analysis|market sizing|competitive analysis|demand analysis)\b/i.test(text)) return "market_analysis";
    if (/\b(capability framework|standards|enablement|uplift)\b/i.test(text)) return "capability_uplift";
    return null;
}

function detectScopeLevel(text: string): EvidenceSignalScopeLevel | null {
    if (/\b(market|customers?|segments?|industry)\b/i.test(text)) return "market";
    if (/\b(enterprise-wide|company-wide|organization-wide)\b/i.test(text)) return "enterprise";
    if (/\b(function|department|business unit|portfolio)\b/i.test(text)) return "function";
    if (/\b(team|squad|cross-functional)\b/i.test(text)) return "team";
    if (/\b(program|project|initiative|roadmap|implementation)\b/i.test(text)) return "project";
    if (detectAction(text)) return "task";
    return null;
}

function detectOwnershipLevel(text: string): EvidenceSignalOwnershipLevel | null {
    if (/\b(accountable for|owned|owner|head of|responsible for)\b/i.test(text)) return "owner";
    if (/\b(led|managed|leadership|oversight|pioneered)\b/i.test(text)) return "lead";
    if (/\b(drove|spearheaded|secured approval|influenced|negotiated|championed)\b/i.test(text)) return "driver";
    if (detectAction(text)) return "contributor";
    return null;
}

function detectStakeholderScope(text: string): EvidenceSignalStakeholderScope[] {
    const scopes: EvidenceSignalStakeholderScope[] = [];
    if (/\b(executive|c-suite|senior leadership|board|vp)\b/i.test(text)) scopes.push("executive");
    if (/\b(cross-functional|multiple teams|business units|partners?)\b/i.test(text)) scopes.push("cross_functional");
    if (/\b(customer|client|vendor|agency|external)\b/i.test(text)) scopes.push("external");
    if (scopes.length === 0) scopes.push("internal");
    return Array.from(new Set(scopes));
}

function detectTools(text: string): string[] {
    const found = TOOL_PATTERNS
        .filter((entry) => entry.pattern.test(text))
        .map((entry) => entry.tool);
    return Array.from(new Set(found));
}

function detectCapabilityHints(text: string): string[] {
    return CAPABILITY_HINT_PATTERNS
        .filter((item) => item.pattern.test(text))
        .map((item) => item.hint);
}

function detectTeamSignal(text: string): string | null {
    const teamSize = text.match(/\bteam of (\d+)\b/i);
    if (teamSize?.[1]) return `team_of_${teamSize[1]}`;
    if (/\bcross-functional\b/i.test(text)) return "cross_functional_team";
    if (/\bteam\b/i.test(text)) return "team_mentioned";
    return null;
}

function detectImpactSignal(text: string): string | null {
    if (/\b(revenue|profit|margin|pricing)\b/i.test(text)) return "revenue";
    if (/\b(cost|savings?|efficiency|reduced|reduce)\b/i.test(text)) return "cost";
    if (/\b(operational|cycle time|automation|process)\b/i.test(text)) return "operational";
    if (/\b(strategy|strategic|roadmap|transformation)\b/i.test(text)) return "strategic";
    const metric = text.match(/\b(\$?\d+(?:\.\d+)?\s*(?:m|k|million|billion|%))\b/i);
    return metric?.[1]?.toLowerCase() ?? null;
}

function scoreConfidence(signal: Omit<EvidenceSignalRecord, "career_id" | "evidence_piece_id">): number {
    let points = 0;
    if (signal.action) points += 1;
    if (signal.domain) points += 1;
    if (signal.initiative_type) points += 1;
    if (signal.scope_level) points += 1;
    if (signal.ownership_level && signal.ownership_level !== "contributor") points += 1;
    if (signal.stakeholder_scope.some((scope) => scope !== "internal")) points += 1;
    if (signal.tool_signals.length > 0) points += 1;
    if (signal.capability_hints.length > 0) points += 1;
    if (signal.impact_signal) points += 1;

    const confidence = 0.2 + (points * 0.075);
    return Number(Math.max(0.2, Math.min(0.95, confidence)).toFixed(4));
}

export function extractEvidenceSignalsFromPiece(piece: EvidencePieceForSignalExtraction): EvidenceSignalRecord[] {
    const candidates = splitEvidenceIntoSignalCandidates(piece.raw_text);
    if (candidates.length === 0) return [];

    return candidates.map((candidate) => {
        const base = {
            action: detectAction(candidate),
            domain: detectDomain(candidate),
            initiative_type: detectInitiativeType(candidate),
            scope_level: detectScopeLevel(candidate),
            ownership_level: detectOwnershipLevel(candidate),
            stakeholder_scope: detectStakeholderScope(candidate),
            tool_signals: detectTools(candidate),
            capability_hints: detectCapabilityHints(candidate),
            team_signal: detectTeamSignal(candidate),
            impact_signal: detectImpactSignal(candidate),
            confidence_score: null as number | null,
        };

        return {
            career_id: piece.career_id,
            evidence_piece_id: piece.id,
            ...base,
            confidence_score: scoreConfidence(base),
        };
    });
}

export function extractEvidenceSignalsFromPieces(pieces: EvidencePieceForSignalExtraction[]): EvidenceSignalRecord[] {
    return pieces.flatMap((piece) => extractEvidenceSignalsFromPiece(piece));
}
