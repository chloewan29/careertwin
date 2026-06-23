import {
    compactToBulletLength,
    normalizeWhitespace,
    REWRITER_HELPER_MAX_BULLET_CHAR_LENGTH,
    REWRITER_HELPER_MAX_BULLET_WORD_COUNT,
    sentenceCase,
} from "./resume-rewriter-helpers";

export const MAX_BULLET_CHAR_LENGTH = REWRITER_HELPER_MAX_BULLET_CHAR_LENGTH;
export const MAX_BULLET_WORD_COUNT = REWRITER_HELPER_MAX_BULLET_WORD_COUNT;

type BulletRewriteContext = {
    targetJobCapabilities?: string[];
    matchedCandidateCapabilities?: string[];
    supportingSignalActions?: string[];
    highlightPriorities?: string[];
};

function stripLeadingLabel(value: string): string {
    const withoutBulletMarkers = value.replace(/^[\u2022\-*]+\s*/, "");

    // Remove explicit section headers commonly carried into parsed evidence lines.
    const explicitPrefixes = [
        /^commercial\s*(?:&|and)\s*revenue\s*impact\s*[:\-]\s*/i,
        /^roles?\s*(?:&|and)\s*responsibilities?\s*[:\-]\s*/i,
        /^highlights?\s*[:\-]\s*/i,
        /^accomplishments?\s*[:\-]\s*/i,
        /^achievements?\s*[:\-]\s*/i,
        /^responsibilities?\s*[:\-]\s*/i,
        /^summary\s*[:\-]\s*/i,
    ];

    let cleaned = withoutBulletMarkers;
    for (const pattern of explicitPrefixes) {
        cleaned = cleaned.replace(pattern, "");
    }

    return cleaned.trim();
}

function splitCandidateSegments(value: string): string[] {
    const byLine = value
        .split(/\r?\n+/)
        .map((segment) => segment.trim())
        .filter(Boolean);

    const sentenceSegments = byLine
        .flatMap((segment) => segment.split(/(?<=[.!?])\s+/))
        .map((segment) => segment.trim())
        .filter(Boolean);

    return sentenceSegments.length > 0 ? sentenceSegments : byLine;
}

function selectBestSegment(segments: string[], context?: BulletRewriteContext): string {
    if (segments.length === 0) return "";
    if (!context) return segments[0];
    const priorityTokens = [
        ...(context.targetJobCapabilities ?? []),
        ...(context.matchedCandidateCapabilities ?? []),
        ...(context.supportingSignalActions ?? []),
        ...(context.highlightPriorities ?? []),
    ]
        .flatMap((value) => value.toLowerCase().split(/\s+/))
        .map((value) => value.trim())
        .filter((value) => value.length >= 3);

    if (priorityTokens.length === 0) return segments[0];
    let best = segments[0];
    let bestScore = -1;
    for (const segment of segments) {
        const lowered = segment.toLowerCase();
        const score = priorityTokens.reduce((sum, token) => sum + Number(lowered.includes(token)), 0);
        if (score > bestScore) {
            best = segment;
            bestScore = score;
        }
    }
    return best;
}

function enforceActionLedPhrasing(value: string): string {
    const replacements: Array<{ pattern: RegExp; replacement: string }> = [
        { pattern: /^responsible for\s+/i, replacement: "Managed " },
        { pattern: /^in charge of\s+/i, replacement: "Managed " },
        { pattern: /^tasked with\s+/i, replacement: "Delivered " },
        { pattern: /^worked on\s+/i, replacement: "Contributed to " },
        { pattern: /^involved in\s+/i, replacement: "Contributed to " },
        { pattern: /^role(?:s)?\s+(?:included|include|involved)\s+/i, replacement: "Delivered " },
        { pattern: /^focus(?:ed)? on\s+/i, replacement: "Focused on " },
        { pattern: /^support(?:ed|ing)?\s+/i, replacement: "Supported " },
    ];

    let rewritten = value.trim();
    for (const replacement of replacements) {
        if (replacement.pattern.test(rewritten)) {
            rewritten = rewritten.replace(replacement.pattern, replacement.replacement);
            break;
        }
    }

    // Remove note-like lead-ins that weaken resume bullet readability.
    rewritten = rewritten.replace(/^(note|details?)\s*[:\-]\s*/i, "");
    rewritten = rewritten.replace(/\s+\(.*?note.*?\)\s*$/i, "");

    return rewritten.trim();
}

export function isParagraphLikeEvidence(rawBullet: string): boolean {
    const text = normalizeWhitespace(rawBullet);
    if (!text) return false;
    const sentenceCount = text.split(/(?<=[.!?])\s+/).filter(Boolean).length;
    return text.length > 260 || sentenceCount >= 3;
}

export type BulletRewriteResult = {
    rewrittenBullet: string;
    originalLength: number;
    rewrittenLength: number;
    wasCompacted: boolean;
    sourceWasParagraphLike: boolean;
};

export function conservativeRewriteBullet(rawBullet: string): string {
    return rewriteBulletWithCompaction(rawBullet).rewrittenBullet;
}

export function rewriteBulletWithCompaction(rawBullet: string, context?: BulletRewriteContext): BulletRewriteResult {
    const originalNormalized = normalizeWhitespace(rawBullet);
    const sourceWasParagraphLike = isParagraphLikeEvidence(originalNormalized);
    const originalLength = originalNormalized.length;

    if (!originalNormalized) {
        return {
            rewrittenBullet: "",
            originalLength,
            rewrittenLength: 0,
            wasCompacted: false,
            sourceWasParagraphLike,
        };
    }

    const labelStripped = stripLeadingLabel(originalNormalized);
    const segments = splitCandidateSegments(labelStripped);
    const primary = normalizeWhitespace(selectBestSegment(segments, context) || labelStripped);
    const secondary = normalizeWhitespace(segments[1] ?? "");

    let candidate = primary;
    if (secondary) {
        const merged = `${primary} ${secondary}`.trim();
        if (merged.length <= MAX_BULLET_CHAR_LENGTH && merged.split(" ").length <= MAX_BULLET_WORD_COUNT) {
            candidate = merged;
        }
    }

    let trimmed = compactToBulletLength(candidate);
    if (!trimmed) {
        trimmed = compactToBulletLength(labelStripped);
    }

    const actionLed = enforceActionLedPhrasing(trimmed);
    const bounded = compactToBulletLength(actionLed);
    const rewrittenBullet = sentenceCase(bounded);
    const rewrittenLength = rewrittenBullet.length;
    const wasCompacted = rewrittenLength < originalLength
        || sourceWasParagraphLike
        || rewrittenLength > MAX_BULLET_CHAR_LENGTH
        || rewrittenBullet.split(" ").filter(Boolean).length > MAX_BULLET_WORD_COUNT;

    return {
        rewrittenBullet,
        originalLength,
        rewrittenLength,
        wasCompacted,
        sourceWasParagraphLike,
    };
}
