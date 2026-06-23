export const REWRITER_HELPER_MAX_BULLET_CHAR_LENGTH = 240;
export const REWRITER_HELPER_MAX_BULLET_WORD_COUNT = 40;

type BulletLengthOptions = {
    maxChars?: number;
    maxWords?: number;
};

export function normalizeWhitespace(value: string): string {
    return value
        .replace(/\s+/g, " ")
        .trim();
}

export function normalizeText(value: string): string {
    return normalizeWhitespace(value).toLowerCase();
}

export function toCueTokens(value: string): string[] {
    return normalizeText(value)
        .split(" ")
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);
}

export function cueTokenMatchCount(text: string, cueTokens: string[]): number {
    if (!text || cueTokens.length === 0) return 0;
    const tokenSet = new Set(toCueTokens(text));
    let overlap = 0;
    for (const token of cueTokens) {
        if (tokenSet.has(token)) overlap += 1;
    }
    return overlap;
}

export function sanitizePotentialJdLeak(value: string): string {
    if (!value) return "";
    let cleaned = normalizeWhitespace(value);
    if (!cleaned) return "";
    const hardCutTokens = [
        "about the job",
        "job requisition id",
        "job description",
        "description:",
        "posted on",
    ];
    for (const token of hardCutTokens) {
        const index = cleaned.toLowerCase().indexOf(token);
        if (index > 0) {
            cleaned = cleaned.slice(0, index).trim();
        }
    }
    return cleaned
        .replace(/^(about the job|job description|description:)\s*/i, "")
        .trim();
}

function trimToLimits(value: string, options: BulletLengthOptions = {}): string {
    const maxChars = options.maxChars ?? REWRITER_HELPER_MAX_BULLET_CHAR_LENGTH;
    const maxWords = options.maxWords ?? REWRITER_HELPER_MAX_BULLET_WORD_COUNT;
    const words = value.split(" ").filter(Boolean);
    let limitedWords = words.slice(0, maxWords).join(" ");
    if (limitedWords.length > maxChars) {
        limitedWords = limitedWords.slice(0, maxChars);
        const lastSpace = limitedWords.lastIndexOf(" ");
        if (lastSpace > 0) limitedWords = limitedWords.slice(0, lastSpace);
    }
    let cleaned = limitedWords.replace(/[.;:,]+$/, "").trim();
    cleaned = cleaned.replace(/\b(through|by|using|including|via|with|across|for|to|in|on|into|from)\s*$/i, "").trim();
    return cleaned;
}

export function sentenceCase(value: string): string {
    if (!value) return value;
    const normalized = value.charAt(0).toUpperCase() + value.slice(1);
    return normalized.endsWith(".") ? normalized : `${normalized}.`;
}

export function compactToBulletLength(value: string, options: BulletLengthOptions = {}): string {
    const maxChars = options.maxChars ?? REWRITER_HELPER_MAX_BULLET_CHAR_LENGTH;
    const maxWords = options.maxWords ?? REWRITER_HELPER_MAX_BULLET_WORD_COUNT;
    const normalized = normalizeWhitespace(value);
    if (!normalized) return "";

    const withinWordLimit = normalized.split(" ").filter(Boolean).length <= maxWords;
    if (normalized.length <= maxChars && withinWordLimit) {
        return normalized.replace(/[.;:,]+$/, "").trim();
    }

    return trimToLimits(normalized, { maxChars, maxWords });
}
