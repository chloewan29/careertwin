import type { ParsedResume } from "../parsing/resume-parser";

export interface MatchedEvidence {
    skill: string;
    evidence: string[];    // resume lines that demonstrate this skill
}

export interface MissingEvidence {
    skill: string;
    reason: string;        // why no evidence was found
}

export interface EvidenceMap {
    matched_evidence: MatchedEvidence[];
    missing_evidence: MissingEvidence[];
}

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Collect all meaningful lines from a parsed resume
function collectResumeLines(resume: ParsedResume): string[] {
    const lines: string[] = [];

    if (resume.summary) lines.push(resume.summary);

    // Skills section as one line per skill
    for (const sk of resume.skills) lines.push(sk);

    // Education
    for (const ed of resume.education) lines.push(ed);

    return lines;
}

// Extract lines from raw resume text that contain a skill mention
function findEvidenceLines(skill: string, rawLines: string[]): string[] {
    const pattern = new RegExp(`\\b${escapeRe(skill)}\\b`, "i");
    return rawLines
        .filter(l => pattern.test(l))
        .map(l => l.trim())
        .filter(l => l.length > 10 && l.length < 300)
        .slice(0, 3);             // cap at 3 evidence lines per skill
}

export function mapEvidence(
    resume: ParsedResume,
    rawResumeText: string,
    matchedSkills: string[],
    missingSkills: string[]
): EvidenceMap {
    // All meaningful lines from raw text (not just parsed fields)
    const rawLines = rawResumeText
        .split("\n")
        .map(l => l.trim())
        .filter(l => l.length > 10);

    const allLines = [...new Set([...collectResumeLines(resume), ...rawLines])];

    // --- Matched evidence ---
    const matched_evidence: MatchedEvidence[] = [];
    for (const skill of matchedSkills) {
        const evidence = findEvidenceLines(skill, allLines);
        matched_evidence.push({
            skill,
            evidence: evidence.length > 0
                ? evidence
                : [`${skill} listed in profile skills.`],
        });
    }

    // --- Missing evidence ---
    const missing_evidence: MissingEvidence[] = [];
    for (const skill of missingSkills) {
        // Check if the skill appears anywhere in the raw text at all
        const anyMention = new RegExp(`\\b${escapeRe(skill)}\\b`, "i").test(rawResumeText);
        missing_evidence.push({
            skill,
            reason: anyMention
                ? `"${skill}" is mentioned in your resume but not prominently — consider highlighting it more explicitly.`
                : `No evidence of "${skill}" found in your resume. Build or document experience with this skill.`,
        });
    }

    return { matched_evidence, missing_evidence };
}
