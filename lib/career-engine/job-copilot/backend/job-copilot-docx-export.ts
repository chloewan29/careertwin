import mammoth from "mammoth";
import {
    Document,
    Packer,
    Paragraph,
    TextRun,
    UnderlineType,
    convertInchesToTwip,
} from "docx";
import type { JobCopilotDownloadDiagnostics } from "./job-copilot-types";

export const DOCX_EXPORT_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const SECTION_HEADINGS = [
    "PROFESSIONAL SUMMARY",
    "CORE SKILLS",
    "PROFESSIONAL EXPERIENCE",
    "EDUCATION",
] as const;

type ParsedResumeText = {
    headerLines: string[];
    summaryLines: string[];
    coreSkillsLines: string[];
    experiences: Array<{
        header: string;
        bullets: string[];
    }>;
    educationLines: string[];
    sectionOrder: string[];
};

type DocxExportDeps = {
    packToBuffer?: (document: Document) => Promise<Buffer>;
    extractRawText?: (params: { buffer: Buffer }) => Promise<{ value: string }>;
};

export class TailoredResumeDocxExportError extends Error {
    readonly diagnostics: JobCopilotDownloadDiagnostics;

    constructor(message: string, diagnostics: JobCopilotDownloadDiagnostics) {
        super(message);
        this.name = "TailoredResumeDocxExportError";
        this.diagnostics = diagnostics;
    }
}

function normalizeMultilineText(value: string): string {
    return value
        .replace(/\r\n/g, "\n")
        .replace(/\u00A0/g, " ")
        .replace(/Ã¢â‚¬Â¢|â€¢|•/g, " | ")
        .replace(/Ã¢â‚¬â€œ|â€“|–/g, "-")
        .replace(/Ã¢â‚¬â€|â€”|—/g, "-")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function normalizeInlineText(value: string): string {
    return normalizeMultilineText(value)
        .replace(/\s*\|\s*/g, " | ")
        .replace(/[ \t]{2,}/g, " ")
        .trim();
}

function isSectionHeading(line: string): boolean {
    return SECTION_HEADINGS.includes(line as (typeof SECTION_HEADINGS)[number]);
}

function isExperienceHeaderLine(line: string): boolean {
    return line.split("|").map((part) => part.trim()).filter(Boolean).length >= 3;
}

function parseResumeText(text: string, source: "txt" | "docx"): ParsedResumeText {
    const normalized = normalizeMultilineText(text);
    const lines = normalized.split("\n").map((line) => line.trim());
    const sectionStartIndex = lines.findIndex((line) => isSectionHeading(line));
    const headerLines = (sectionStartIndex < 0 ? lines : lines.slice(0, sectionStartIndex)).filter(Boolean);
    const parsed: ParsedResumeText = {
        headerLines,
        summaryLines: [],
        coreSkillsLines: [],
        experiences: [],
        educationLines: [],
        sectionOrder: [],
    };

    let currentSection: "summary" | "core_skills" | "experience" | "education" | null = null;
    let currentExperience: ParsedResumeText["experiences"][number] | null = null;

    const pushExperience = () => {
        if (!currentExperience) return;
        parsed.experiences.push(currentExperience);
        currentExperience = null;
    };

    for (let index = Math.max(sectionStartIndex, 0); index < lines.length; index += 1) {
        const line = lines[index];
        if (!line) continue;
        if (isSectionHeading(line)) {
            pushExperience();
            if (line === "PROFESSIONAL SUMMARY") currentSection = "summary";
            if (line === "CORE SKILLS") currentSection = "core_skills";
            if (line === "PROFESSIONAL EXPERIENCE") currentSection = "experience";
            if (line === "EDUCATION") currentSection = "education";
            parsed.sectionOrder.push(line);
            continue;
        }

        if (currentSection === "summary") {
            parsed.summaryLines.push(normalizeInlineText(line));
            continue;
        }
        if (currentSection === "core_skills") {
            parsed.coreSkillsLines.push(normalizeInlineText(line));
            continue;
        }
        if (currentSection === "education") {
            parsed.educationLines.push(normalizeInlineText(line));
            continue;
        }
        if (currentSection !== "experience") continue;

        if (isExperienceHeaderLine(line)) {
            pushExperience();
            currentExperience = {
                header: normalizeInlineText(line),
                bullets: [],
            };
            continue;
        }

        if (!currentExperience) continue;
        const bulletText = source === "txt" && line.startsWith("- ")
            ? line.slice(2).trim()
            : line;
        currentExperience.bullets.push(normalizeInlineText(bulletText));
    }

    pushExperience();
    return parsed;
}

function buildDefaultDiagnostics(params: {
    requested: boolean;
    fileName: string | null;
    safeToDownload: boolean;
    parsedSource: ParsedResumeText;
}): JobCopilotDownloadDiagnostics {
    return {
        docx_export_requested: params.requested,
        docx_export_enabled: true,
        docx_export_generated: false,
        docx_export_failed: false,
        docx_export_failure_reason: null,
        docx_export_mime_type: params.requested ? DOCX_EXPORT_MIME_TYPE : null,
        docx_export_file_name: params.fileName,
        docx_export_source_safe_to_download: params.safeToDownload,
        docx_export_source_section_count: params.parsedSource.sectionOrder.length,
        docx_export_source_role_count: params.parsedSource.experiences.length,
        docx_content_equivalence_checked: false,
        docx_content_equivalence_passed: false,
        docx_content_equivalence_failures: [],
        docx_text_extraction_method: null,
        txt_export_unchanged: true,
    };
}

function buildDocxDocument(source: ParsedResumeText): Document {
    const paragraphs: Paragraph[] = [];
    const [fullName, currentTitle, contactLine, ...extraHeaderLines] = source.headerLines;

    if (fullName) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: fullName, bold: true, size: 28 })],
            spacing: { after: 80 },
        }));
    }
    if (currentTitle) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: currentTitle, bold: true, size: 20 })],
            spacing: { after: 60 },
        }));
    }
    if (contactLine) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: contactLine, size: 18 })],
            spacing: { after: 120 },
        }));
    }
    for (const extraHeaderLine of extraHeaderLines) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: extraHeaderLine, size: 18 })],
            spacing: { after: 60 },
        }));
    }

    const pushSectionHeading = (text: string) => {
        paragraphs.push(new Paragraph({
            children: [
                new TextRun({
                    text,
                    bold: true,
                    allCaps: true,
                    size: 18,
                    underline: { type: UnderlineType.SINGLE },
                }),
            ],
            spacing: { before: 140, after: 80 },
        }));
    };

    if (source.summaryLines.length > 0) {
        pushSectionHeading("PROFESSIONAL SUMMARY");
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: source.summaryLines.join(" "), size: 20 })],
            spacing: { after: 100 },
        }));
    }

    if (source.coreSkillsLines.length > 0) {
        pushSectionHeading("CORE SKILLS");
        paragraphs.push(new Paragraph({
            children: [
                new TextRun({
                    text: source.coreSkillsLines.join(" ").replace(/\s*\|\s*/g, "  •  "),
                    size: 18,
                }),
            ],
            spacing: { after: 100 },
        }));
    }

    pushSectionHeading("PROFESSIONAL EXPERIENCE");
    for (const experience of source.experiences) {
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: experience.header, bold: true, size: 19 })],
            spacing: { before: 60, after: 40 },
            keepLines: true,
        }));
        for (const bullet of experience.bullets) {
            paragraphs.push(new Paragraph({
                text: bullet,
                bullet: { level: 0 },
                indent: { left: 360, hanging: 180 },
                spacing: { after: 20 },
            }));
        }
    }

    if (source.educationLines.length > 0) {
        pushSectionHeading("EDUCATION");
        for (const line of source.educationLines) {
            paragraphs.push(new Paragraph({
                children: [new TextRun({ text: line, size: 18 })],
                spacing: { after: 40 },
            }));
        }
    }

    return new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: convertInchesToTwip(0.45),
                        bottom: convertInchesToTwip(0.45),
                        left: convertInchesToTwip(0.75),
                        right: convertInchesToTwip(0.75),
                    },
                    size: {
                        width: 12240,
                        height: 15840,
                    },
                },
            },
            children: paragraphs,
        }],
    });
}

function compareParsedResumeContent(source: ParsedResumeText, extracted: ParsedResumeText): string[] {
    const failures: string[] = [];
    const compareArray = (label: string, left: string[], right: string[]) => {
        if (left.length !== right.length) {
            failures.push(`${label}_count_mismatch:${left.length}:${right.length}`);
            return;
        }
        for (let index = 0; index < left.length; index += 1) {
            if (normalizeInlineText(left[index]) !== normalizeInlineText(right[index])) {
                failures.push(`${label}_line_mismatch:${index}`);
            }
        }
    };

    compareArray("section_order", source.sectionOrder, extracted.sectionOrder);
    compareArray("header", source.headerLines, extracted.headerLines);
    compareArray("summary", source.summaryLines, extracted.summaryLines);
    compareArray("core_skills", source.coreSkillsLines, extracted.coreSkillsLines);
    compareArray("education", source.educationLines, extracted.educationLines);

    if (source.experiences.length !== extracted.experiences.length) {
        failures.push(`experience_count_mismatch:${source.experiences.length}:${extracted.experiences.length}`);
        return failures;
    }
    for (let index = 0; index < source.experiences.length; index += 1) {
        const left = source.experiences[index];
        const right = extracted.experiences[index];
        if (normalizeInlineText(left.header) !== normalizeInlineText(right.header)) {
            failures.push(`experience_header_mismatch:${index}`);
        }
        compareArray(`experience_bullet_${index}`, left.bullets, right.bullets);
    }
    return failures;
}

export async function buildTailoredResumeDocxExport(params: {
    sourceText: string;
    fileName: string;
    sourceSafeToDownload: boolean;
}, deps: DocxExportDeps = {}): Promise<{
    fileName: string;
    mimeType: typeof DOCX_EXPORT_MIME_TYPE;
    fileBase64: string;
    diagnostics: JobCopilotDownloadDiagnostics;
}> {
    const parsedSource = parseResumeText(params.sourceText, "txt");
    const diagnostics = buildDefaultDiagnostics({
        requested: true,
        fileName: params.fileName,
        safeToDownload: params.sourceSafeToDownload,
        parsedSource,
    });

    try {
        const document = buildDocxDocument(parsedSource);
        const packToBuffer = deps.packToBuffer ?? ((doc) => Packer.toBuffer(doc));
        const extractRawText = deps.extractRawText ?? ((input) => mammoth.extractRawText(input));
        const buffer = await packToBuffer(document);
        diagnostics.docx_export_generated = true;

        diagnostics.docx_content_equivalence_checked = true;
        diagnostics.docx_text_extraction_method = "mammoth.extractRawText";
        const extraction = await extractRawText({ buffer });
        const extractedText = normalizeMultilineText(extraction.value ?? "");
        if (/Ã¢â‚¬|â€¢|â€“|â€”/.test(extractedText)) {
            diagnostics.docx_content_equivalence_failures.push("mojibake_present");
        }
        const extractedParsed = parseResumeText(extractedText, "docx");
        diagnostics.docx_content_equivalence_failures.push(
            ...compareParsedResumeContent(parsedSource, extractedParsed),
        );
        diagnostics.docx_content_equivalence_passed = diagnostics.docx_content_equivalence_failures.length === 0;

        if (!diagnostics.docx_content_equivalence_passed) {
            diagnostics.docx_export_failed = true;
            diagnostics.docx_export_failure_reason = `docx_content_equivalence_failed:${diagnostics.docx_content_equivalence_failures.join(",")}`;
            throw new TailoredResumeDocxExportError(
                diagnostics.docx_export_failure_reason,
                diagnostics,
            );
        }

        return {
            fileName: params.fileName,
            mimeType: DOCX_EXPORT_MIME_TYPE,
            fileBase64: buffer.toString("base64"),
            diagnostics,
        };
    } catch (error) {
        if (error instanceof TailoredResumeDocxExportError) throw error;
        diagnostics.docx_export_failed = true;
        diagnostics.docx_export_failure_reason = error instanceof Error ? error.message : "docx_export_failed";
        throw new TailoredResumeDocxExportError(
            `docx_export_failed:${diagnostics.docx_export_failure_reason}`,
            diagnostics,
        );
    }
}
