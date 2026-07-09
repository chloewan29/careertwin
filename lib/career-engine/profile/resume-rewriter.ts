import type { ParsedResume } from "../parsing/resume-parser";
import type { ParsedJobDescription } from "../parsing/jd-parser";
import type { GapReport } from "../scoring/gap-prioritizer";
import { buildEvidencePieces, type EvidencePiece } from "../evidence/evidence-pieces";

export interface RewrittenRole {
    company: string;
    original_bullets: string[];
    rewritten_bullets: string[];
    role_description: string;
}

export interface TailoredResumeDocument {
    header: {
        full_name: string | null;
        current_title: string | null;
        contact: {
            email: string | null;
            phone: string | null;
            linkedin: string | null;
            address: string | null;
        };
    };
    summary: string | null;
    experience: Array<{
        company: string | null;
        title: string | null;
        date_range: string | null;
        dates: string | null;
        original_bullets: string[];
        rewritten_bullets: string[];
        bullets: string[];
    }>;
    education: string[];
    skills: string[];
}

export interface ResumeRewriteResult {
    roles: RewrittenRole[];
    summary_suggestion: string;
    resume_document: TailoredResumeDocument;
}

const TEMPLATE_LANGUAGE_RE = /\b(delivered measurable outcomes|key contributions? included|as part of the team)\b/i;
const PLACEHOLDER_RE = /\[(?:quantify|example)\s*:[^\]]*\]|\[[a-z][a-z\s_-]{1,40}:[^\]]*\]/gi;
const SECTION_LABEL_RE = /^(roles?\s+and\s+responsibilities|responsibilities|accomplishments?|key\s+achievements?|achievements?|duties|overview|summary)\s*:?\s*$/i;
const SECTION_LABEL_PREFIX_RE = /^(roles?\s+and\s+responsibilities|responsibilities|accomplishments?|key\s+achievements?|achievements?|duties|overview|summary)\s*:\s*/i;
const INSTRUCTIONAL_RE = /\b(quantify achievements?|add metric|add specific achievement|example|placeholder|insert metric|improve this bullet)\b/i;
const STOPWORDS = new Set(["the", "and", "for", "with", "from", "into", "across", "that", "this", "your", "you", "our", "their", "was", "were", "are", "is", "of", "to", "in", "on", "by", "as", "at", "or", "an", "a"]);
const DOMAIN_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
    { label: "analytics", pattern: /\b(analytics|insight|bi|dashboard|reporting)\b/i },
    { label: "data platform", pattern: /\b(data platform|data warehouse|bigquery|snowflake|etl|pipeline)\b/i },
    { label: "transformation", pattern: /\b(transformation|change|operating model|modernization)\b/i },
    { label: "strategy", pattern: /\b(strategy|strategic planning|roadmap|planning)\b/i },
    { label: "program delivery", pattern: /\b(program|portfolio|delivery|governance)\b/i },
    { label: "commercial", pattern: /\b(commercial|revenue|growth|margin|profit)\b/i },
];

type JdSignals = {
    targetTitleTokens: Set<string>;
    roleFamilyTokens: Set<string>;
    requiredSkillTokens: Set<string>;
    preferredSkillTokens: Set<string>;
    responsibilityTokens: Set<string>;
    domainTokens: Set<string>;
    keywordTokens: Set<string>;
};

type ScoredEvidencePiece = {
    piece: EvidencePiece;
    idx: number;
    score: number;
    group: string;
    sanitizedRawText: string;
};

function sanitizeLine(text: string): string {
    return text
        .replace(/^[-*]\s*/, "")
        .replace(SECTION_LABEL_PREFIX_RE, "")
        .replace(PLACEHOLDER_RE, "")
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .trim();
}

function tokenize(text: string): string[] {
    return sanitizeLine(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

function rewriteBulletConservatively(raw: string): string {
    let line = sanitizeLine(raw);
    if (line.length < 10) return "";
    if (SECTION_LABEL_RE.test(line)) return "";
    if (INSTRUCTIONAL_RE.test(line)) return "";

    // Strict conservative rewrite: formatting and punctuation only.
    line = line
        .replace(/\s{2,}/g, " ")
        .replace(/\s+([,.;:!?])/g, "$1")
        .replace(/\bled and develop\b/gi, "led and developed")
        .replace(/\bmanaged and develop\b/gi, "managed and developed")
        .replace(/\bacumen-enabling\b/gi, "acumen, enabling")
        .replace(/\s*—\s*/g, " — ")
        .trim();
    if (line.length > 0) {
        line = line.charAt(0).toUpperCase() + line.slice(1);
    }

    if (!line) return "";
    if (TEMPLATE_LANGUAGE_RE.test(line)) return "";
    if (INSTRUCTIONAL_RE.test(line)) return "";
    if (!/[.!?]$/.test(line)) line += ".";
    return line;
}

function buildTokenSet(input: string[]): Set<string> {
    const tokens = new Set<string>();
    for (const text of input) {
        for (const token of tokenize(text)) tokens.add(token);
    }
    return tokens;
}

function inferDomainTokens(jd: ParsedJobDescription): Set<string> {
    const domains = new Set<string>();
    const corpus = [
        jd.raw_text,
        jd.target_title ?? "",
        jd.normalized_title?.function ?? "",
        jd.normalized_title?.function ?? "",
    ].join(" ");

    for (const domain of DOMAIN_SIGNAL_PATTERNS) {
        if (domain.pattern.test(corpus)) {
            for (const token of tokenize(domain.label)) domains.add(token);
        }
    }

    return domains;
}

function extractJdSignals(jd: ParsedJobDescription): JdSignals {
    const targetTitleTokens = buildTokenSet([jd.target_title ?? ""]);
    const expectedSeniority = jd.seniority_level ?? jd.normalized_title?.level ?? "";
    const roleFamilyTokens = buildTokenSet([
        jd.normalized_title?.function ?? "",
        jd.normalized_title?.function ?? "",
        expectedSeniority,
    ]);
    const requiredSkillTokens = buildTokenSet(jd.required_skills.map((s) => s.normalized));
    const preferredSkillTokens = buildTokenSet(jd.preferred_skills.map((s) => s.normalized));
    const responsibilityTokens = buildTokenSet(jd.responsibilities ?? []);
    const domainTokens = inferDomainTokens(jd);
    const keywordTokens = buildTokenSet([jd.raw_text]);

    return {
        targetTitleTokens,
        roleFamilyTokens,
        requiredSkillTokens,
        preferredSkillTokens,
        responsibilityTokens,
        domainTokens,
        keywordTokens,
    };
}

function overlapCount(tokens: string[], signals: Set<string>): number {
    let count = 0;
    for (const token of tokens) {
        if (signals.has(token)) count += 1;
    }
    return count;
}

function scoreBulletRelevance(bullet: string, signals: JdSignals): number {
    const bulletTokens = tokenize(bullet);
    const keywordOverlap = overlapCount(bulletTokens, signals.keywordTokens);
    const requiredSkillOverlap = overlapCount(bulletTokens, signals.requiredSkillTokens);
    const preferredSkillOverlap = overlapCount(bulletTokens, signals.preferredSkillTokens);
    const responsibilityOverlap = overlapCount(bulletTokens, signals.responsibilityTokens);
    const roleFamilyOverlap = overlapCount(bulletTokens, signals.roleFamilyTokens) + overlapCount(bulletTokens, signals.targetTitleTokens);
    const domainOverlap = overlapCount(bulletTokens, signals.domainTokens);

    return (
        keywordOverlap * 1 +
        requiredSkillOverlap * 4 +
        preferredSkillOverlap * 2 +
        responsibilityOverlap * 3 +
        roleFamilyOverlap * 2 +
        domainOverlap * 2
    );
}

function scoreEvidencePiecesGlobally(evidencePieces: EvidencePiece[], signals: JdSignals): ScoredEvidencePiece[] {
    return evidencePieces
        .map((piece, idx) => {
            const sanitizedRawText = sanitizeLine(piece.raw_text);
            return {
                piece,
                idx,
                score: scoreBulletRelevance(sanitizedRawText, signals),
                group: groupKey(piece.company, piece.role, piece.date_range),
                sanitizedRawText,
            };
        })
        .filter((item) => item.sanitizedRawText.length > 0)
        .sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
}

function selectEvidencePiecesWithPerGroupCap(
    scoredEvidencePieces: ScoredEvidencePiece[],
    perGroupCap: number
): ScoredEvidencePiece[] {
    const selected: ScoredEvidencePiece[] = [];
    const countsByGroup = new Map<string, number>();

    for (const item of scoredEvidencePieces) {
        if (item.score <= 0) continue;
        const existingCount = countsByGroup.get(item.group) ?? 0;
        if (existingCount >= perGroupCap) continue;
        selected.push(item);
        countsByGroup.set(item.group, existingCount + 1);
    }

    if (selected.length > 0) return selected;

    // Fallback to avoid empty tailoring when JD signals are sparse.
    for (const item of scoredEvidencePieces) {
        const existingCount = countsByGroup.get(item.group) ?? 0;
        if (existingCount >= perGroupCap) continue;
        selected.push(item);
        countsByGroup.set(item.group, existingCount + 1);
    }

    return selected;
}

function groupKey(company: string | null | undefined, role: string | null | undefined, dateRange: string | null | undefined): string {
    return `${company ?? ""}||${role ?? ""}||${dateRange ?? ""}`;
}

function buildTailoredSummaryFromExperience(
    resume: ParsedResume,
    jd: ParsedJobDescription
): string {
    const yearsText = resume.years_experience != null ? `${resume.years_experience}+ years` : "several years";
    const targetTitle = sanitizeLine(jd.target_title ?? "") || sanitizeLine(jd.normalized_title?.function ?? "");
    const profilePositioning = sanitizeLine(resume.current_title ?? "") || "Professional";

    const jdCorpus = [
        jd.raw_text ?? "",
        jd.target_title ?? "",
        jd.normalized_title?.function ?? "",
        jd.normalized_title?.function ?? "",
        ...(jd.responsibilities ?? []),
    ].join(" ").toLowerCase();

    let coreCapability = "high-priority role outcomes";
    if (/\b(program|transformation|roadmap|governance|delivery)\b/.test(jdCorpus)) {
        coreCapability = "cross-functional program delivery";
    } else if (/\b(stakeholder|strategy|strategic|planning)\b/.test(jdCorpus)) {
        coreCapability = "stakeholder and strategy execution";
    } else if (/\b(analytics|insight|bi|data)\b/.test(jdCorpus)) {
        coreCapability = "analytics and insight delivery";
    } else if ((jd.responsibilities ?? []).length > 0) {
        coreCapability = sanitizeLine(jd.responsibilities[0]).toLowerCase();
    }

    const domainLabels = DOMAIN_SIGNAL_PATTERNS
        .filter((domain) => domain.pattern.test(jdCorpus))
        .map((domain) => domain.label);
    const domainExpertise = domainLabels.length > 0
        ? domainLabels.slice(0, 2).join(" and ")
        : "the business domain";

    const impactOrientation = "delivering measurable business impact.";
    const targetDirection = targetTitle ? ` Targeting ${targetTitle} opportunities.` : "";
    const summary = `${profilePositioning} with ${yearsText} experience driving ${coreCapability} across ${domainExpertise}, ${impactOrientation}${targetDirection}`;
    return sanitizeLine(summary);
}

function cleanEducationLine(line: string): string {
    return line.replace(/\s{2,}/g, " ").trim();
}

function normalizeForTrace(text: string): string {
    return sanitizeLine(text)
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isTraceableToSource(finalBullet: string, sourceBullets: string[]): boolean {
    const finalNorm = normalizeForTrace(finalBullet);
    if (!finalNorm) return false;

    return sourceBullets.some((source) => {
        const sourceNorm = normalizeForTrace(source);
        if (!sourceNorm) return false;
        if (sourceNorm === finalNorm) return true;
        if (sourceNorm.includes(finalNorm) || finalNorm.includes(sourceNorm)) return true;

        const finalTokens = new Set(finalNorm.split(" ").filter(Boolean));
        const sourceTokens = new Set(sourceNorm.split(" ").filter(Boolean));
        if (finalTokens.size === 0 || sourceTokens.size === 0) return false;

        let overlap = 0;
        for (const token of finalTokens) {
            if (sourceTokens.has(token)) overlap += 1;
        }

        return overlap / finalTokens.size >= 0.8;
    });
}

function validateTailoredDocument(document: TailoredResumeDocument): TailoredResumeDocument {
    const cleanedExperience = document.experience.map((entry) => {
        const seen = new Set<string>();
        const rewritten_bullets: string[] = [];
        const original_bullets = entry.original_bullets
            .map((line) => sanitizeLine(line))
            .filter((line) => line.length > 0 && !SECTION_LABEL_RE.test(line) && !INSTRUCTIONAL_RE.test(line));

        for (const rawBullet of entry.rewritten_bullets) {
            const bullet = sanitizeLine(rawBullet);
            if (!bullet) continue;
            if (TEMPLATE_LANGUAGE_RE.test(bullet)) continue;
            if (PLACEHOLDER_RE.test(bullet)) continue;
            if (SECTION_LABEL_RE.test(bullet)) continue;
            if (INSTRUCTIONAL_RE.test(bullet)) continue;
            if (!isTraceableToSource(bullet, original_bullets)) continue;

            const dedupeKey = bullet.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
            if (!dedupeKey || seen.has(dedupeKey)) continue;
            seen.add(dedupeKey);
            rewritten_bullets.push(/[.!?]$/.test(bullet) ? bullet : `${bullet}.`);
        }

        const bullets = (rewritten_bullets.length > 0 ? rewritten_bullets : original_bullets);
        return {
            ...entry,
            original_bullets,
            rewritten_bullets,
            bullets,
            dates: entry.date_range,
        };
    });

    return {
        ...document,
        summary: sanitizeLine(document.summary ?? "") || null,
        experience: cleanedExperience,
        education: (document.education ?? []).map((line) => cleanEducationLine(line)).filter((line) => line.length > 0),
        skills: Array.from(
            new Set(
                (document.skills ?? [])
                    .map((skill) => sanitizeLine(skill))
                    .filter((skill) => skill.length > 0)
            )
        ),
    };
}

export function rewriteResume(
    resume: ParsedResume,
    jd: ParsedJobDescription,
    _gaps: GapReport
): ResumeRewriteResult {
    void _gaps;

    const jdSignals = extractJdSignals(jd);
    const experienceEntries = resume.experience_entries ?? [];
    const evidencePieces = buildEvidencePieces(resume);
    const scoredEvidencePieces = scoreEvidencePiecesGlobally(evidencePieces, jdSignals);
    const selectedEvidencePieces = selectEvidencePiecesWithPerGroupCap(scoredEvidencePieces, 3);
    const selectedBulletsByGroup = new Map<string, string[]>();

    for (const selected of selectedEvidencePieces) {
        const bullets = selectedBulletsByGroup.get(selected.group) ?? [];
        bullets.push(selected.sanitizedRawText);
        selectedBulletsByGroup.set(selected.group, bullets);
    }

    const tailoredExperience = experienceEntries.map((entry) => {
        const key = groupKey(entry.company, entry.title, entry.date_range);
        const selected_bullets = selectedBulletsByGroup.get(key) ?? [];
        const rewritten_bullets = selected_bullets
            .map((bullet) => rewriteBulletConservatively(bullet))
            .filter((line) => line.length > 0);

        return {
            company: entry.company,
            title: entry.title,
            date_range: entry.date_range,
            original_bullets: selected_bullets,
            rewritten_bullets,
            bullets: rewritten_bullets,
            dates: entry.date_range,
        };
    });

    const validated = validateTailoredDocument({
        header: {
            full_name: resume.full_name,
            current_title: resume.current_title,
            contact: resume.contact,
        },
        summary: null,
        experience: tailoredExperience,
        education: resume.education ?? [],
        skills: resume.skills ?? [],
    });

    const resumeDocument: TailoredResumeDocument = {
        ...validated,
        summary: buildTailoredSummaryFromExperience(resume, jd),
    };

    const roles: RewrittenRole[] = resumeDocument.experience.map((entry) => ({
        company: entry.company ?? "Experience",
        original_bullets: entry.original_bullets,
        rewritten_bullets: entry.rewritten_bullets,
        role_description: [entry.title, entry.date_range].filter(Boolean).join(" | "),
    }));

    return {
        roles,
        summary_suggestion: resumeDocument.summary ?? "",
        resume_document: resumeDocument,
    };
}
