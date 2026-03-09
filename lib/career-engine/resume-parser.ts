export interface ParsedResume {
    full_name: string | null;
    current_title: string | null;
    years_experience: number | null;
    industry: string | null;
    skills: string[];
    companies: string[];
    education: string[];
    summary: string | null;
    experience_entries: Array<{
        title: string | null;
        company: string | null;
        date_range: string | null;
        confidence: {
            title: number;
            company: number;
            date: number;
            overall: number;
        };
    }>;
    contact: {
        email: string | null;
        phone: string | null;
        linkedin: string | null;
        address: string | null;
    };
    parse_quality: "high" | "medium" | "low";
    missing_fields: string[];
}

const SECTION_HEADERS: Record<string, string> = {
    skills: "skills",
    "core skills": "skills",
    "technical skills": "skills",
    "key skills": "skills",
    "core competencies": "skills",
    "technical proficiencies": "skills",
    experience: "experience",
    "work experience": "experience",
    "professional experience": "experience",
    "employment history": "experience",
    education: "education",
    "educational background": "education",
    "academic background": "education",
    summary: "summary",
    profile: "summary",
    "professional summary": "summary",
    certifications: "other",
    projects: "other",
};

// Lines that are sub-labels within experience — skip as data
const EXPERIENCE_LABEL_RE = /^(roles?\s+and\s+responsibilities|accomplishments?|key\s+achievements?|responsibilities|achievements?|duties|overview|summary)\s*:?\s*$/i;

// Broad subsection headings often found inside experience/skills blocks
const SUBSECTION_HEADING_RE = /^(additional\s+achievements|technical\s+proficiencies|programming\s+&\s+data|roles?\s*&\s*responsibilities|key\s+projects?)\s*:?\s*$/i;

// Month names that should never be treated as company names
const MONTH_RE = /^(january|february|march|april|may|june|july|august|september|october|november|december)$/i;

// Patterns that disqualify a line from being a company name
const NOT_COMPANY_RE = /^(present|current|ongoing|•|to date|references|available|upon request)/i;

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?1[.-s]?)?\(?\d{3}\)?[.-\s]?\d{3}[.-\s]?\d{4}/;
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i;
const ADDRESS_RE = /\d{1,5}\s\w+(?:\s\w+){1,4},\s+\w{2}\s+\d{5}/;
const YEAR_RE = /\b(19[5-9]\d|20[0-3]\d)\b/g;

// Matches trailing location suffix e.g. ", Sydney" or ", Sydney, NSW"
const LOCATION_SUFFIX_RE = /,\s+[A-Z][a-zA-Z\s]+(,\s+[A-Z][a-zA-Z\s]+)?$/;

// Matches date ranges in education lines e.g. "2010 – 2014" or "(2015)"
const DATE_RANGE_RE = /\(?\b\d{4}\b\s*[-–—]\s*\b\d{4}\b\)?|\(?\b\d{4}\b\)?/g;
const DEGREE_OR_INST_RE = /\b(?:bachelor|master|phd|b\.\s*s|b\.\s*a|m\.\s*s|m\.\s*a|bs|ba|ms|ma|degree|diploma|university|college|institute|school|academy|polytechnic)\b/i;

function escapeRe(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Split merged PascalCase/camelCase skill strings
function splitMergedSkills(raw: string): string[] {
    const byDelim = raw.split(/[,|•·\\/\t]+/);
    const results: string[] = [];
    for (const chunk of byDelim) {
        const trimmed = chunk.trim();
        if (!trimmed) continue;

        // Split if we detect camelCase merging (lowercase/digit immediately followed by Uppercase)
        if (/[a-z0-9][A-Z]/.test(trimmed)) {
            // Split at uppercase letters preceded by a lowercase letter or digit
            const parts = trimmed.split(/(?<=[a-z0-9])(?=[A-Z])/).map(s => s.trim()).filter(s => s.length > 1);
            results.push(...parts);
        } else {
            results.push(trimmed);
        }
    }
    return results;
}

function isContactLine(line: string): boolean {
    return EMAIL_RE.test(line) || PHONE_RE.test(line) || LINKEDIN_RE.test(line) || /^https?:\/\//i.test(line);
}

function hasYear(line: string): boolean {
    return /\b(19|20)\d{2}\b/.test(line);
}

// Truncate text to first N sentences
function firstSentences(text: string, n: number): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return sentences.slice(0, n).join(" ").trim();
}

export function parseResumeText(rawText: string): ParsedResume {
    const result: ParsedResume = {
        full_name: null,
        current_title: null,
        years_experience: null,
        industry: null,
        skills: [],
        companies: [],
        education: [],
        summary: null,
        experience_entries: [],
        contact: { email: null, phone: null, linkedin: null, address: null },
        parse_quality: "low",
        missing_fields: [],
    };

    if (!rawText || rawText.trim().length === 0) {
        result.missing_fields = ["full_name", "current_title", "years_experience", "skills", "summary"];
        return result;
    }

    const lines = rawText.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    // --- Contact ---
    const emailM = rawText.match(EMAIL_RE);
    if (emailM) result.contact.email = emailM[0];
    const phoneM = rawText.match(PHONE_RE);
    if (phoneM) result.contact.phone = phoneM[0];
    const liM = rawText.match(LINKEDIN_RE);
    if (liM) result.contact.linkedin = liM[0];
    const addrM = rawText.match(ADDRESS_RE);
    if (addrM) result.contact.address = addrM[0];

    // --- Section splitting ---
    type SectionName = "header" | "summary" | "skills" | "experience" | "education" | "other";
    const sections: Record<SectionName, string[]> = {
        header: [], summary: [], skills: [], experience: [], education: [], other: []
    };
    let currentSection: SectionName = "header";

    for (const line of lines) {
        const lower = line.toLowerCase().replace(/[:\-–]/g, "").trim(); // Fixed double escaping from script
        const mapped = SECTION_HEADERS[lower];
        if (mapped) {
            currentSection = mapped as SectionName;
            continue;
        }
        sections[currentSection].push(line);
    }

    const hasSections = sections.summary.length > 0 || sections.skills.length > 0
        || sections.experience.length > 0 || sections.education.length > 0;

    console.log("--- DEBUG: Extracted Raw Sections (First 300 chars) ---");
    console.log("Header:\n", sections.header.join("\n").substring(0, 300));
    console.log("Skills:\n", sections.skills.join("\n").substring(0, 300));
    console.log("Professional Experience:\n", sections.experience.join("\n").substring(0, 300));
    console.log("Education:\n", sections.education.join("\n").substring(0, 300));
    console.log("-------------------------------------------------------");

    // --- full_name ---
    for (const line of sections.header.slice(0, 5)) {
        if (!isContactLine(line) && line.length > 1 && line.length < 60) {
            result.full_name = line;
            break;
        }
    }
    if (!result.full_name && lines.length > 0) {
        const first = lines[0];
        if (!isContactLine(first) && first.length < 60) result.full_name = first;
    }

    // --- Summary ---
    // Deferred to after experience parsing to use first role responsibilities.

    // --- Skills ---
    if (sections.skills.length > 0) {
        const rawSkills: string[] = [];
        for (const line of sections.skills) {
            rawSkills.push(...splitMergedSkills(line));
        }
        result.skills = [...new Set(rawSkills.map(s => s.trim()).filter(s => s.length > 1 && s.length < 50))];
    }

    // --- Experience ---
    const experienceYears: number[] = [];
    let firstRoleTitle: string | null = null;
    let firstRoleDescText = "";

    const TITLE_KEYWORD_RE = /\b(engineer|developer|manager|director|lead|analyst|designer|architect|scientist|consultant|officer|head of|\bvp\b|vice president|specialist|coordinator|executive|intern|strategist|planner|advisor|associate|producer|editor|writer|owner|product\s+owner)\b/i;

    // 1. Chunk experience into entries using Date Anchor logic
    // A strict regex for a tenure duration line (e.g. "Jan 2020 - Present", "2018 to 2020")
    const DATE_RANGE_ANCHOR_RE = /\b(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*)?(?:19|20)\d{2}\s*(?:[-–—]|\bto\b)\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*)?(?:(?:19|20)\d{2}|present|current|now|ongoing|to\s+date)\b/i;

    // A line is considered a date anchor if it looks like a tenure duration line
    const isDateAnchorLine = (l: string) => {
        if (/^[-•·*]/.test(l)) return false; // Bullets are not date anchors
        const wordCount = l.split(/\s+/).length;
        if (wordCount > 15) return false; // Too long for a metadata anchor

        // A true work experience entry anchor should strictly contain a date range
        return DATE_RANGE_ANCHOR_RE.test(l);
    };

    const dateLineIndices: number[] = [];
    for (let i = 0; i < sections.experience.length; i++) {
        if (isDateAnchorLine(sections.experience[i])) {
            dateLineIndices.push(i);
        }
    }

    const entries: string[][] = [];
    if (dateLineIndices.length === 0) {
        // Fallback if no dates exist at all: keep everything as one entry
        if (sections.experience.length > 0) entries.push(sections.experience);
    } else {
        const entryStarts: number[] = [];
        for (let i = 0; i < dateLineIndices.length; i++) {
            let startIdx = dateLineIndices[i];
            const limit = i === 0 ? 0 : dateLineIndices[i - 1] + 1;

            // Walk back to find the logical start of the entry
            let linesWalked = 0;
            while (startIdx > limit) {
                const prevLine = sections.experience[startIdx - 1];
                const isBullet = /^[-•·*]/.test(prevLine);
                const wordCount = prevLine.split(/\s+/).length;
                const isLongResp = wordCount > 20 && !hasYear(prevLine);
                const isSentence = prevLine.endsWith('.') && wordCount > 2;

                // Stop at previous responsibilities
                if (isBullet || isLongResp || isSentence) {
                    break;
                }

                // Restrict the local block: title and company candidates must be close to the date
                if (linesWalked >= 3) {
                    break;
                }

                startIdx--;
                linesWalked++;
            }

            // To ensure we NEVER drop data (like summaries or skipped companies), 
            // the start of the first entry must be the absolute top.
            if (i === 0) {
                startIdx = 0;
            }
            entryStarts.push(startIdx);
        }

        // Slice up the sections without gaps
        for (let i = 0; i < entryStarts.length; i++) {
            const start = entryStarts[i];
            const end = i < entryStarts.length - 1 ? entryStarts[i + 1] : sections.experience.length;
            entries.push(sections.experience.slice(start, end));
        }
    }

    console.log(`--- DEBUG: Parsed ${entries.length} experience entries ---`);

    // Process Entries
    for (const entry of entries) {
        if (entry.length === 0) continue;

        let rawTitleLine: string | null = null;
        let rawCompanyLine: string | null = null;
        let rawDateLine: string | null = null;

        let normalizedTitle: string | null = null;
        let normalizedCompany: string | null = null;
        let normalizedDateRange: string | null = null;

        let titleConf = 0.0;
        let companyConf = 0.0;
        let dateConf = 0.0;

        const descriptionLines: string[] = [];

        // 1. Identify the raw date line
        let anchorLineIdx = entry.findIndex(l => DATE_RANGE_ANCHOR_RE.test(l));
        let anchorPrefix: string | null = null;

        if (anchorLineIdx !== -1) {
            const rawVal = entry[anchorLineIdx];
            const match = rawVal.match(DATE_RANGE_ANCHOR_RE);
            if (match && match.index !== undefined && match.index > 5) {
                anchorPrefix = rawVal.substring(0, match.index).trim();
                rawDateLine = rawVal.substring(match.index).trim();
            } else {
                rawDateLine = rawVal;
            }
            dateConf = 0.9;
            normalizedDateRange = rawDateLine
                .replace(/\s*([-–—]|\bto\b)\s*/i, " - ")
                .replace(/\b(present|current|now|ongoing|to\s+date)\b/i, "Present")
                .replace(/\s{2,}/g, " ")
                .trim();
        } else {
            // Fallback: looking for any year or "Present"
            anchorLineIdx = entry.findIndex(l => hasYear(l) || /\b(present|current|now|ongoing|to\s+date)\b/i.test(l));
            if (anchorLineIdx !== -1) {
                const rawVal = entry[anchorLineIdx];
                const dateMatch = rawVal.match(/\b((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*)?(?:19|20)\d{2}|present|current)\b/i);
                if (dateMatch && dateMatch.index !== undefined && dateMatch.index > 5) {
                    anchorPrefix = rawVal.substring(0, dateMatch.index).trim();
                    rawDateLine = rawVal.substring(dateMatch.index).trim();
                } else {
                    rawDateLine = rawVal;
                }
                dateConf = 0.5;
                normalizedDateRange = rawDateLine.replace(/\b(present|current|now|ongoing|to\s+date)\b/i, "Present");
            } else {
                anchorLineIdx = 0; // Fallback to top if totally missing dates
            }
        }

        // Extract years for global stats from everything
        for (const line of entry) {
            const yearMatches = line.match(YEAR_RE);
            if (yearMatches) {
                yearMatches.forEach(y => {
                    const yr = parseInt(y, 10);
                    if (yr > 1950 && yr <= new Date().getFullYear() + 1) experienceYears.push(yr);
                });
            }
        }

        // 2. Collect all non-empty lines strictly above the raw date line
        const preDateLines: { text: string; origIdx: number }[] = [];
        for (let i = 0; i < anchorLineIdx; i++) {
            const raw = entry[i].trim();
            if (raw.length > 0) {
                preDateLines.push({ text: raw, origIdx: i });
            }
        }

        // Inject any prefix that shared the date line (like "Company, Location May 2022")
        if (anchorPrefix && anchorPrefix.length > 2) {
            preDateLines.push({ text: anchorPrefix, origIdx: anchorLineIdx });
        }

        // 3. Classify those lines into likely title, company, location, noise
        let bestTitleIdx = -1;
        let bestTitleScore = 0;
        let bestCompanyIdx = -1;
        let bestCompanyScore = 0;

        const LOCATION_RE = /^(sydney|melbourne|brisbane|perth|adelaide|nsw|vic|qld|wa|sa|act|tas|nt|australia|uk|usa|ny|london|[,\s])+$/i;

        // "title and company candidates must be resolved only within the local block around each date anchor"
        // Evaluate backwards to prioritize lines closest to the date
        const localBlockStart = Math.max(0, preDateLines.length - 4);

        for (let i = preDateLines.length - 1; i >= localBlockStart; i--) {
            const cand = preDateLines[i].text;
            const wordCount = cand.split(/\s+/).length;

            const looksLikeRole = TITLE_KEYWORD_RE.test(cand);
            // Explicitly do not discard valid job titles as headings or locations
            const isHeading = !looksLikeRole && (SUBSECTION_HEADING_RE.test(cand) || EXPERIENCE_LABEL_RE.test(cand) || cand.endsWith(":"));
            const isLocation = !looksLikeRole && LOCATION_RE.test(cand);

            // Don't treat purely numbers as something useful
            const candHasYear = hasYear(cand) && cand !== rawDateLine;
            const knownCompany = /\b(optus|amobee|microsoft|sparro|dnc consulting|google|amazon|meta|apple|netflix|salesforce)\b/i.test(cand);
            const startsProperCase = /^[A-Z0-9]/.test(cand);

            // Skip pure noise or dates
            if (isHeading || candHasYear || wordCount > 15) continue;

            // Simple Title candidate
            if (looksLikeRole && bestTitleIdx === -1) {
                bestTitleIdx = i;
                bestTitleScore = 10;
            } else if (!isHeading && !isLocation && bestCompanyIdx === -1) {
                // Simple Company candidate (closest non-heading/location that isn't the title)
                if (bestTitleIdx === i) continue;
                bestCompanyIdx = i;
                bestCompanyScore = 10;
            }
        }

        // Fallback: If we still need a company, grab any other available line that doesn't have a year
        if (bestCompanyIdx === -1) {
            for (let i = preDateLines.length - 1; i >= localBlockStart; i--) {
                if (i !== bestTitleIdx && !hasYear(preDateLines[i].text) && !LOCATION_RE.test(preDateLines[i].text)) {
                    bestCompanyIdx = i;
                    bestCompanyScore = 5;
                    break;
                }
            }
        }

        // Disambiguate if title and company won the exact same line
        if (bestTitleIdx !== -1 && bestCompanyIdx === bestTitleIdx) {
            const cand = preDateLines[bestTitleIdx].text;
            if (TITLE_KEYWORD_RE.test(cand)) {
                bestCompanyIdx = -1;
            } else {
                bestTitleIdx = -1;
            }
        }

        // --- DEBUG LOG FOR FIRST ENTRY ---
        if (entries.indexOf(entry) === 0) {
            console.log("--- DEBUG: Entry [1] Candidate Classification ---");
            console.log("Raw Date Line:", rawDateLine || "(none)");
            for (let i = 0; i < preDateLines.length; i++) {
                const cand = preDateLines[i].text;
                let cls = "unknown";
                const hasRoleWord = TITLE_KEYWORD_RE.test(cand);

                if (!hasRoleWord && (SUBSECTION_HEADING_RE.test(cand) || EXPERIENCE_LABEL_RE.test(cand) || cand.endsWith(":"))) {
                    cls = "heading";
                } else if (!hasRoleWord && LOCATION_RE.test(cand)) {
                    cls = "location";
                } else if (bestTitleIdx === i && bestCompanyIdx === i) {
                    cls = "title / company";
                } else if (bestTitleIdx === i) {
                    cls = "title";
                } else if (bestCompanyIdx === i) {
                    cls = "company";
                } else if (hasYear(cand) && cand !== rawDateLine) {
                    cls = "noise"; // generic date noise
                }
                console.log(`  Line: "${cand}" -> ${cls}`);
            }
            console.log("-------------------------------------------------");
        }

        // 4 & 5. Set raw and normalized values from selected candidates
        if (bestTitleIdx !== -1 && !normalizedTitle) {
            rawTitleLine = preDateLines[bestTitleIdx].text;
            let cleaned = rawTitleLine.replace(LOCATION_SUFFIX_RE, "");
            normalizedTitle = cleaned;
            titleConf = bestTitleScore > 5 ? 0.9 : 0.6;
        }

        if (bestCompanyIdx !== -1 && !normalizedCompany) {
            rawCompanyLine = preDateLines[bestCompanyIdx].text;
            let cleaned = rawCompanyLine.replace(LOCATION_SUFFIX_RE, "");
            normalizedCompany = cleaned;
            companyConf = bestCompanyScore > 5 ? 0.9 : 0.6;
        }

        // TERTARY FALLBACK: Search lines just above anchor if totally missing (handles top edge-cases)
        if (!rawTitleLine && !rawCompanyLine && rawDateLine) {
            for (let i = Math.max(0, anchorLineIdx - 3); i < anchorLineIdx; i++) {
                const lineCandidate = entry[i].trim();
                if (lineCandidate.length > 0 && !hasYear(lineCandidate)) {
                    if (!rawTitleLine && TITLE_KEYWORD_RE.test(lineCandidate)) {
                        rawTitleLine = lineCandidate;
                        // Provide raw value for consistency
                        normalizedTitle = lineCandidate.replace(LOCATION_SUFFIX_RE, "");
                        titleConf = 0.4; // very low confidence because it failed normal proximity scanning
                    } else if (!rawCompanyLine && !LOCATION_RE.test(lineCandidate) && !SUBSECTION_HEADING_RE.test(lineCandidate)) {
                        rawCompanyLine = lineCandidate;
                        normalizedCompany = lineCandidate.replace(LOCATION_SUFFIX_RE, "");
                        companyConf = 0.4;
                    }
                }
            }
        }

        // Re-construct the description component
        const descStart = Math.max(bestTitleIdx, bestCompanyIdx, anchorLineIdx) + 1;
        for (let i = descStart; i < entry.length; i++) {
            const l = entry[i];
            if (!hasYear(l) && !SUBSECTION_HEADING_RE.test(l)) {
                descriptionLines.push(l);
            }
        }
        const descText = descriptionLines.join(" ").trim();

        // 6. Only accept the parsed entry if we found at least one concrete piece of identifying metadata
        if (normalizedTitle || normalizedCompany || rawDateLine) {
            const tLen = normalizedTitle ? normalizedTitle.split(/\s+/).length : 0;
            // Additional guard: reject crazy long semantic blocks that erroneously got tagged
            if (tLen < 15 && (!normalizedTitle || !MONTH_RE.test(normalizedTitle))) {
                const totalConf = ((titleConf || 0) + (companyConf || 0) + (dateConf || 0)) / 3;
                result.experience_entries.push({
                    title: normalizedTitle,
                    company: normalizedCompany,
                    date_range: normalizedDateRange || rawDateLine,
                    confidence: {
                        title: titleConf,
                        company: companyConf,
                        date: dateConf,
                        overall: parseFloat(totalConf.toFixed(2))
                    }
                });

                // Tally the very first valid job role detected for total summary mapping
                if (!firstRoleTitle && normalizedTitle && totalConf > 0.5) {
                    firstRoleTitle = normalizedTitle;
                    firstRoleDescText = descText;
                }

                // Track total recognized company names for aggregate profiles
                if (!result.companies.includes(normalizedCompany!) && normalizedCompany) {
                    // Prevent crazy sentences sneaking in
                    if (normalizedCompany.split(/\s+/).length < 10) {
                        result.companies.push(normalizedCompany);
                    }
                }
            }
        }
    }

    if (experienceYears.length > 0) {
        const minYear = Math.min(...experienceYears);
        const maxYear = Math.max(...experienceYears);
        if (maxYear >= minYear) {
            result.years_experience = maxYear - minYear;
        }
    }

    if (!result.current_title && firstRoleTitle) {
        result.current_title = firstRoleTitle;
    }

    // --- Summary Generation (From latest role responsibilities) ---
    if (!result.summary && firstRoleDescText) {
        const cleanLines = firstRoleDescText
            .split(/(?:[.!?]|\n|-|•)\s*/)
            .map(s => s.trim())
            .filter(s => {
                if (s.length < 15) return false;
                if (isContactLine(s)) return false;
                if (SUBSECTION_HEADING_RE.test(s) || EXPERIENCE_LABEL_RE.test(s)) return false;
                if (DEGREE_OR_INST_RE.test(s)) return false;
                return true;
            });

        if (cleanLines.length > 0) {
            result.summary = cleanLines.slice(0, 2).join(". ") + ".";
        }
    }

    // --- Education ---
    let eduLines = sections.education;
    if (eduLines.length === 0) {
        const eduIndex = lines.findIndex(l => /education/i.test(l));
        if (eduIndex !== -1) {
            for (let i = eduIndex + 1; i < lines.length; i++) {
                const l = lines[i];
                const lower = l.toLowerCase().replace(/[:\\-–]/g, "").trim();
                if (SECTION_HEADERS[lower] || /^(technical skills|technical proficiencies|professional experience|experience)/i.test(lower)) {
                    break;
                }
                eduLines.push(l);
            }
        }
    }

    for (const line of eduLines) {
        // stop education parsing before technical skills / technical proficiencies sections
        if (/^technical\s+(skills|proficiencies)/i.test(line)) {
            break;
        }

        // Extract complete degree and institution lines
        if (DEGREE_OR_INST_RE.test(line)) {
            const e = line.replace(DATE_RANGE_RE, "").replace(/\\s{2,}/g, " ").trim();
            // De-duplicate matching blocks
            if (e && e.length > 2 && !result.education.includes(e)) {
                result.education.push(e);
            }
        }
    }

    // --- Industry: Infer from the most recent 3 roles to avoid early-career skew ---
    const knownIndustries = [
        "Software", "SaaS", "FinTech", "HealthTech", "E-commerce", "Finance", "Healthcare",
        "Manufacturing", "Retail", "Legal", "Media", "Gaming", "Cybersecurity", "Marketing",
        "Advertising", "Real Estate", "Construction", "Logistics", "Telecommunications"
    ];

    // Build a text block strictly from the top 3 experience entries
    const recentExpText = entries.slice(0, 3).map(e => e.join(" ")).join(" ");

    // Only infer from this constrained text block
    const matched = knownIndustries.filter(ind => new RegExp(`\b${escapeRe(ind)}\b`, "i").test(recentExpText));

    // If we have mixed signals (multiple different industries detected in recent roles), 
    // it's safer to return null than guess incorrectly.
    result.industry = matched.length === 1 ? matched[0] : null;

    // --- Confidence / Validation Checks ---
    if (result.current_title) {
        // If title is too long or looks like an accomplishment sentence, reject it
        if (result.current_title.length > 60 || /^(led|leading|created|designed|assisted|managed|developed|drove)\b/i.test(result.current_title)) {
            result.current_title = null;
        }
    }

    if (result.companies.length > 0) {
        // If average company length is suspiciously high or has too many words, it's probably responsibilities
        const avgWords = result.companies.reduce((sum, c) => sum + c.split(/\s+/).length, 0) / result.companies.length;
        if (avgWords > 4 || result.companies.some(c => c.length > 50)) {
            result.companies = [];
        }
    }

    if (result.years_experience !== null) {
        // Reject implausible high values, or zeroes if there's clearly a significant experience section
        if (result.years_experience > 50 || (result.years_experience === 0 && sections.experience.length > 5)) {
            result.years_experience = null;
        }
    }

    // --- parse_quality and missing_fields ---
    const missing: string[] = [];
    if (!result.full_name) missing.push("full_name");
    if (!result.current_title) missing.push("current_title");
    if (result.years_experience === null) missing.push("years_experience");
    if (result.skills.length === 0) missing.push("skills");
    if (!result.summary) missing.push("summary");
    if (result.education.length === 0) missing.push("education");
    result.missing_fields = missing;

    const coreFields = ["full_name", "current_title", "skills", "summary"];
    const missingCore = coreFields.filter(f => missing.includes(f)).length;
    const unreliable = !result.industry || result.companies.length === 0;

    if (missingCore === 0 && !unreliable) {
        result.parse_quality = "high";
    } else if (missingCore <= 1 || !unreliable) {
        result.parse_quality = "medium";
    } else {
        result.parse_quality = "low";
    }

    return result;
}
