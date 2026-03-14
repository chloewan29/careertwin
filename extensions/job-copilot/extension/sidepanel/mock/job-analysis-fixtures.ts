import type { ResumeTailoringResult } from "@/extensions/job-copilot/extension/shared/types";

export type SidepanelFixture = {
    id: "strong_fit" | "stretch_fit" | "low_fit" | "sparse_signal";
    label: string;
    roleTitle: string;
    company: string;
    result: ResumeTailoringResult;
};

const strongFit: SidepanelFixture = {
    id: "strong_fit",
    label: "Strong Fit",
    roleTitle: "Senior Analytics Manager",
    company: "Northstar Retail",
    result: {
        job_analysis: {
            match_score: 82,
            fit_level: "strong",
            score_confidence: "high",
            job_profile_quality: "strong",
            interpretation_note: "Strong fit with high confidence from current extracted job signals.",
            top_matched_capabilities: [
                "Strategic Planning",
                "Cross-Functional Stakeholder Leadership",
                "People Leadership",
            ],
            key_gaps: [
                "BI / Data Platform Transformation",
            ],
            evidence_highlights: [
                { evidencePieceId: "ev-strong-1", label: "Optus - Led analytics platform transformation across business and marketing teams.", score: 31.2 },
                { evidencePieceId: "ev-strong-2", label: "Microsoft Advertising - Delivered scaled insights solutions for enterprise advertisers.", score: 27.8 },
            ],
            ats_risks: [
                {
                    type: "title_mismatch",
                    level: "low",
                    message: "Candidate title history aligns well with this role family.",
                },
            ],
            system_notices: [],
            tailoring_decision: {
                allowed: true,
                status: "ready",
                message: "Tailored CV is ready for this role.",
            },
        },
        tailored_resume_artifact: {
            format: "text/plain",
            download_url: "/mock/download/strong-fit-resume.txt",
        },
    },
};

const stretchFit: SidepanelFixture = {
    id: "stretch_fit",
    label: "Stretch Fit",
    roleTitle: "Data Platform Transformation Lead",
    company: "Summit Finance",
    result: {
        job_analysis: {
            match_score: 60,
            fit_level: "stretch",
            score_confidence: "medium",
            job_profile_quality: "usable",
            interpretation_note: "Moderate precision: the job profile is usable but not fully complete.",
            top_matched_capabilities: [
                "Strategic Planning",
                "Commercial Analytics",
            ],
            key_gaps: [
                "BI / Data Platform Transformation",
                "Hands-on Data Architecture",
            ],
            evidence_highlights: [
                { evidencePieceId: "ev-stretch-1", label: "Optus - Owned analytics strategy across multiple business units.", score: 22.5 },
                { evidencePieceId: "ev-stretch-2", label: "Amobee - Reduced campaign cost through data-driven insights delivery.", score: 18.3 },
            ],
            ats_risks: [
                {
                    type: "title_mismatch",
                    level: "medium",
                    message: "Candidate title overlap is partial for this job family.",
                },
            ],
            system_notices: [
                {
                    code: "stretch_fit_caution",
                    level: "info",
                    message: "This role is a stretch fit; use the tailored CV with caution.",
                },
            ],
            tailoring_decision: {
                allowed: true,
                status: "stretch",
                message: "Tailored CV is available, but this role is a stretch. Review key gaps before applying.",
            },
        },
        tailored_resume_artifact: {
            format: "text/plain",
            download_url: "/mock/download/stretch-fit-resume.txt",
        },
    },
};

const lowFit: SidepanelFixture = {
    id: "low_fit",
    label: "Low Fit",
    roleTitle: "Enterprise Sales Director",
    company: "Blue Peak Telecom",
    result: {
        job_analysis: {
            match_score: 42,
            fit_level: "low",
            score_confidence: "low",
            job_profile_quality: "usable",
            interpretation_note: "Deterministic fit interpretation based on current match, confidence, and profile quality.",
            top_matched_capabilities: [
                "Commercial Analytics",
            ],
            key_gaps: [
                "Enterprise Sales Leadership",
                "Quota Ownership",
                "Channel Partner Management",
            ],
            evidence_highlights: [
                { evidencePieceId: "ev-low-1", label: "Optus - Owned commercial dashboards supporting marketing decisions.", score: 14.7 },
            ],
            ats_risks: [
                {
                    type: "title_mismatch",
                    level: "high",
                    message: "Candidate title history appears misaligned with this job title/family and may create ATS screening risk.",
                },
            ],
            system_notices: [],
            tailoring_decision: {
                allowed: false,
                status: "not_recommended",
                message: "Tailored CV is not recommended for this role due to low match.",
            },
        },
    },
};

const sparseSignal: SidepanelFixture = {
    id: "sparse_signal",
    label: "Sparse Signals",
    roleTitle: "Commercial Growth Lead",
    company: "Signal One Media",
    result: {
        job_analysis: {
            match_score: 58,
            fit_level: "stretch",
            score_confidence: "low",
            job_profile_quality: "sparse",
            interpretation_note: "Limited-signal interpretation: job extraction is sparse and likely incomplete.",
            top_matched_capabilities: [
                "Strategic Planning",
            ],
            key_gaps: [
                "Growth Experimentation",
                "Pipeline Forecasting",
            ],
            evidence_highlights: [
                { evidencePieceId: "ev-sparse-1", label: "Optus - Built market opportunity view used for localized planning.", score: 16.2 },
            ],
            ats_risks: [
                {
                    type: "title_mismatch",
                    level: "medium",
                    message: "Title alignment could not be fully confirmed from available signals.",
                },
            ],
            system_notices: [
                {
                    code: "sparse_extraction",
                    level: "warning",
                    message: "Job profile extraction is sparse; capability coverage may be incomplete.",
                },
                {
                    code: "weak_job_signals",
                    level: "warning",
                    message: "Job description quality is weak, reducing confidence in this analysis.",
                },
                {
                    code: "stretch_fit_caution",
                    level: "info",
                    message: "This role is a stretch fit; use the tailored CV with caution.",
                },
            ],
            tailoring_decision: {
                allowed: true,
                status: "stretch",
                message: "Tailored CV is available, but this role is a stretch. Review key gaps before applying.",
            },
        },
        tailored_resume_artifact: {
            format: "text/plain",
            download_url: "/mock/download/sparse-signal-resume.txt",
        },
    },
};

export const SIDEPANEL_JOB_ANALYSIS_FIXTURES: SidepanelFixture[] = [
    strongFit,
    stretchFit,
    lowFit,
    sparseSignal,
];
