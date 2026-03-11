import type { ParsedResume } from "../parsing/resume-parser";

export type EvidencePiece = {
    id: string;
    company: string | null;
    role: string | null;
    date_range: string | null;
    raw_text: string;
    source: "highlight" | "description_fallback";
    summary?: string | null;
    action?: string | null;
    impact?: string | null;
    stakeholders?: string[] | null;
    tools_methods?: string[] | null;
    business_context?: string | null;
    inferred_scale?: Record<string, unknown> | null;
    inferred_scope?: Record<string, unknown> | null;
    confidence?: number | null;
    missing_fields?: string[] | null;
};

const SECTION_LABEL_RE = /^(?:accomplishments?|responsibilities|highlights?|roles?\s*(?:and|&)\s*responsibilities|key\s+achievements?)\s*:\s*/i;
const GENERIC_SECTION_HEADER_RE = /^([A-Z][A-Za-z0-9&/()' -]{2,80}(?:-level(?:\s*\([^)]*\))?)?)\s*:\s*/;
const BULLET_PREFIX_RE = /^(?:[-*\u2022\u00b7]\s+|\d+[\)\].:-]\s+)/;
const SENTENCE_SPLIT_RE = /(?<=[.!?])\s+(?=[A-Z0-9])/;
const ACTION_VERB_SPLIT_RE = /\s+(?=(?:Led|Built|Presented|Conducted|Generated|Owned|Established|Drove|Developed|Implemented|Created|Delivered|Launched)\b)/g;
const TARGET_MAX_CHARS = 280;
const MIN_MEANINGFUL_CHARS = 20;

function sanitizeIdPart(value: string | null | undefined): string {
    return (value ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function normalizeChunk(text: string): string {
    return text
        .replace(/\s+/g, " ")
        .replace(SECTION_LABEL_RE, "")
        .replace(GENERIC_SECTION_HEADER_RE, "")
        .replace(BULLET_PREFIX_RE, "")
        .trim();
}

function splitToSentenceSizedChunks(text: string): string[] {
    const hardWrap = (chunk: string): string[] => {
        const parts: string[] = [];
        let remaining = chunk.trim();
        while (remaining.length > TARGET_MAX_CHARS) {
            let cut = remaining.lastIndexOf(" ", TARGET_MAX_CHARS);
            if (cut < 80) cut = TARGET_MAX_CHARS;
            parts.push(remaining.slice(0, cut).trim());
            remaining = remaining.slice(cut).trim();
        }
        if (remaining.length > 0) parts.push(remaining);
        return parts;
    };

    const normalized = text.replace(/\s+/g, " ").trim();
    if (!normalized) return [];
    if (normalized.length <= TARGET_MAX_CHARS) return [normalized];

    const sentenceParts = normalized
        .split(SENTENCE_SPLIT_RE)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    if (sentenceParts.length <= 1) {
        const commaParts = normalized
            .split(/[,;]\s+|\s+\band\b\s+/i)
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
        const coarse = commaParts.length > 1 ? commaParts : [normalized];
        return coarse.flatMap((part) => hardWrap(part));
    }

    const chunks: string[] = [];
    let current = "";
    for (const sentence of sentenceParts) {
        const next = current ? `${current} ${sentence}` : sentence;
        if (next.length <= TARGET_MAX_CHARS) {
            current = next;
            continue;
        }
        if (current) chunks.push(current);
        current = sentence;
    }
    if (current) chunks.push(current);
    return chunks.flatMap((part) => hardWrap(part));
}

function isLikelySectionHeader(segment: string): boolean {
    const candidate = segment.trim();
    if (!candidate.endsWith(":")) return false;

    const withoutColon = candidate.slice(0, -1).trim();
    if (!withoutColon || withoutColon.length > 80 || /[.!?]/.test(withoutColon)) return false;

    const words = withoutColon.split(/\s+/);
    if (words.length > 10) return false;

    if (/\b(level|insights|reporting|roadmap|ownership|innovation|capability|responsibilities|highlights|accomplishments?)\b/i.test(withoutColon)) {
        return true;
    }

    return words.every((word) =>
        /^[A-Z]/.test(word)
        || /^(?:and|of|for|to|the|&|\/|-level)$/i.test(word),
    );
}

function insertSectionBreaks(text: string): string {
    return text
        .replace(/\r/g, "")
        .replace(/([^\n])\s+([A-Z][A-Za-z0-9&/()' -]{2,80}(?:-level(?:\s*\([^)]*\))?)?\s*:)/g, "$1\n$2")
        .replace(/\n{3,}/g, "\n\n");
}

function splitBySectionHeaders(text: string): string[] {
    const withBreaks = insertSectionBreaks(text);
    const lines = withBreaks
        .split(/\n+/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

    const sections: string[] = [];
    let current = "";

    for (const line of lines) {
        if (isLikelySectionHeader(line)) {
            if (current.trim().length > 0) sections.push(current.trim());
            current = line;
            continue;
        }
        current = current ? `${current} ${line}` : line;
    }

    if (current.trim().length > 0) sections.push(current.trim());
    return sections.length > 0 ? sections : [text];
}

function splitByActionVerbTransitions(text: string): string[] {
    const parts = text
        .split(ACTION_VERB_SPLIT_RE)
        .map((part) => part.trim())
        .filter((part) => part.length > 0);

    if (parts.length <= 1) return [text.trim()];

    const merged: string[] = [];
    for (const part of parts) {
        if (part.length < MIN_MEANINGFUL_CHARS && merged.length > 0) {
            merged[merged.length - 1] = `${merged[merged.length - 1]} ${part}`.trim();
            continue;
        }
        merged.push(part);
    }

    return merged;
}

function isHeaderOnlyFragment(text: string): boolean {
    const candidate = text.trim();
    return /^[A-Z][A-Za-z0-9&/()' -]{2,80}(?:-level(?:\s*\([^)]*\))?)?\s*:\s*$/.test(candidate);
}

function hasMeaningfulContent(text: string): boolean {
    const alnumCount = (text.match(/[A-Za-z0-9]/g) ?? []).length;
    return alnumCount >= 3;
}

export function splitDescriptionIntoEvidencePieces(description: string): string[] {
    const text = description.replace(/\r/g, "").trim();
    if (!text) return [];

    const initialSegments = splitBySectionHeaders(text);

    const splitSegments: string[] = [];
    for (const segment of initialSegments) {
        const subSegments = segment
            .split(/(?=\s*[-*\u2022\u00b7]\s+)|(?=\s*\d+[\)\].:-]\s+)/g)
            .map((part) => part.trim())
            .filter((part) => part.length > 0);
        if (subSegments.length > 0) splitSegments.push(...subSegments);
    }

    const normalizedPieces = splitSegments.flatMap((segment) => {
        const cleaned = normalizeChunk(segment);
        if (!cleaned) return [];

        const inlineSections = cleaned
            .split(/(?=\b[A-Z][A-Za-z0-9&/()' -]{2,80}(?:-level(?:\s*\([^)]*\))?)?\s*:)/g)
            .map((part) => normalizeChunk(part))
            .filter((part) => part.length > 0 && !isHeaderOnlyFragment(part));

        if (inlineSections.length === 0) return [];

        const sentenceSegments = inlineSections
            .flatMap((part) => part.split(SENTENCE_SPLIT_RE))
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

        const baseSegments = sentenceSegments.length > 0 ? sentenceSegments : inlineSections;
        return baseSegments.flatMap((part) => splitByActionVerbTransitions(part));
    });

    const sentenceSizedPieces = normalizedPieces.flatMap((segment) => splitToSentenceSizedChunks(segment));

    const meaningful: string[] = [];
    for (const segment of sentenceSizedPieces) {
        const trimmed = segment.trim();
        if (!trimmed) continue;
        if (!hasMeaningfulContent(trimmed)) continue;
        if (trimmed.length >= MIN_MEANINGFUL_CHARS) {
            meaningful.push(trimmed);
            continue;
        }
        if (meaningful.length > 0) {
            meaningful[meaningful.length - 1] = `${meaningful[meaningful.length - 1]} ${trimmed}`.trim();
        } else {
            meaningful.push(trimmed);
        }
    }

    if (meaningful.length > 0) return meaningful;

    const fallback = normalizeChunk(text);
    return fallback ? [fallback] : [];
}

export function buildEvidencePieces(parsedResume: ParsedResume): EvidencePiece[] {
    const pieces: EvidencePiece[] = [];
    const entries = parsedResume.experience_entries ?? [];

    for (let i = 0; i < entries.length; i += 1) {
        const entry = entries[i];
        const company = entry.company ?? null;
        const role = entry.title ?? null;
        const date_range = entry.date_range ?? null;
        const highlights = (entry.highlights ?? [])
            .map((h) => h.trim())
            .filter((h) => h.length > 0);

        const base = [
            sanitizeIdPart(company),
            sanitizeIdPart(role),
            sanitizeIdPart(date_range),
            `${i}`,
        ]
            .filter(Boolean)
            .join("-");

        if (highlights.length > 0) {
            for (let j = 0; j < highlights.length; j += 1) {
                pieces.push({
                    id: `${base}-h${j}`,
                    company,
                    role,
                    date_range,
                    raw_text: highlights[j],
                    source: "highlight",
                });
            }
            continue;
        }

        const description = (entry.description ?? "").trim();
        if (!description) continue;

        const fallbackPieces = splitDescriptionIntoEvidencePieces(description);
        for (let j = 0; j < fallbackPieces.length; j += 1) {
            pieces.push({
                id: `${base}-d${j}`,
                company,
                role,
                date_range,
                raw_text: fallbackPieces[j],
                source: "description_fallback",
            });
        }
    }

    return pieces;
}
