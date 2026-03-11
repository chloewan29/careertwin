import { strict as assert } from "node:assert";
import { NextRequest } from "next/server";
import { createResumeGeneratePostHandler } from "@/app/api/resume/generate/route";
import type { ResumeCopilotServiceResult } from "@/lib/career-engine/copilot/resume-copilot/resume-copilot-types";

type GenerateFn = (params: {
    profileId: string;
    jobId: string;
    options?: { includeDebug?: boolean };
}) => Promise<ResumeCopilotServiceResult>;

function makeRequest(body: Record<string, unknown>): NextRequest {
    return new NextRequest("http://localhost:3000/api/resume/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
    return (await response.json()) as Record<string, unknown>;
}

function makeSuccessResponse(includeDebug = false): ResumeCopilotServiceResult {
    return {
        resume: {
            summary: "Grounded summary",
            experience: [
                {
                    company: "Acme",
                    role: "Program Manager",
                    date_range: "2022 - Present",
                    bullets: ["Delivered roadmap outcomes."],
                },
            ],
        },
        ...(includeDebug ? {
            debug: {
                metadata: {
                    profile_id: "profile-1",
                    career_id: "career-1",
                    job_id: "job-1",
                    total_evidence_loaded: 3,
                    total_evidence_in_pool: 2,
                    total_evidence_ranked: 2,
                    total_evidence_selected: 1,
                    selected_experience_count: 1,
                    pool_source_counts: { "role_fit.supportingEvidence": 1 },
                    matched_capabilities_in_summary: ["Program Leadership"],
                    dropped_for_length: 0,
                    dropped_for_validation: 0,
                    dropped_for_duplicate: 0,
                },
                job_signals: {
                    job_id: "job-1",
                    target_title: "Program Manager",
                    role_family: "program",
                    required_skills: ["sql"],
                    preferred_skills: [],
                    responsibilities: [],
                    domains: [],
                    keywords: [],
                },
                experiences: [
                    {
                        company: "Acme",
                        role: "Program Manager",
                        date_range: "2022 - Present",
                        bullets: [
                            {
                                evidence_piece_id: "ev-1",
                                original_bullet: "delivered roadmap",
                                rewritten_bullet: "Delivered roadmap.",
                                score: 10,
                                matched_signals: ["sql"],
                                pool_sources: ["role_fit.supportingEvidence"],
                                score_breakdown: {
                                    keyword_overlap: 1,
                                },
                            },
                        ],
                    },
                ],
            },
        } : {}),
    };
}

async function run() {
    // 1) valid profileId + jobId returns summary and experience[]
    {
        const handler = createResumeGeneratePostHandler(async () => makeSuccessResponse(false));
        const response = await handler(makeRequest({ profileId: "profile-1", jobId: "job-1" }));
        const data = await parseJson(response);

        assert.equal(response.status, 200);
        assert.equal(typeof (data.resume as Record<string, unknown>).summary, "string");
        assert.ok(Array.isArray((data.resume as Record<string, unknown>).experience));
    }

    // 2) debug=true returns debug payload
    {
        const handler = createResumeGeneratePostHandler(async () => makeSuccessResponse(true));
        const response = await handler(makeRequest({ profile_id: "profile-1", job_id: "job-1", debug: true }));
        const data = await parseJson(response);

        assert.equal(response.status, 200);
        assert.ok(Boolean(data.debug));
    }

    // 3) missing profileId returns 400
    {
        const handler = createResumeGeneratePostHandler(async () => makeSuccessResponse(false));
        const response = await handler(makeRequest({ jobId: "job-1" }));
        const data = await parseJson(response);

        assert.equal(response.status, 400);
        assert.equal(data.error, "profileId is required");
    }

    // 4) missing jobId returns 400
    {
        const handler = createResumeGeneratePostHandler(async () => makeSuccessResponse(false));
        const response = await handler(makeRequest({ profileId: "profile-1" }));
        const data = await parseJson(response);

        assert.equal(response.status, 400);
        assert.equal(data.error, "jobId is required");
    }

    // 5) unknown profileId handled safely
    {
        const failingGenerate: GenerateFn = async () => {
            throw new Error("No career found for profileId=unknown-profile");
        };
        const handler = createResumeGeneratePostHandler(failingGenerate);
        const response = await handler(makeRequest({ profileId: "unknown-profile", jobId: "job-1" }));
        const data = await parseJson(response);

        assert.equal(response.status, 500);
        assert.equal(data.error, "No career found for profileId=unknown-profile");
    }

    // 6) unknown jobId handled safely
    {
        const failingGenerate: GenerateFn = async () => {
            throw new Error("No job_signals found for jobId=unknown-job");
        };
        const handler = createResumeGeneratePostHandler(failingGenerate);
        const response = await handler(makeRequest({ profileId: "profile-1", jobId: "unknown-job" }));
        const data = await parseJson(response);

        assert.equal(response.status, 500);
        assert.equal(data.error, "No job_signals found for jobId=unknown-job");
    }

    // 7) empty evidence pool returns stable empty result
    {
        const handler = createResumeGeneratePostHandler(async () => ({
            resume: {
                summary: null,
                experience: [],
            },
        }));
        const response = await handler(makeRequest({ profileId: "profile-1", jobId: "job-1" }));
        const data = await parseJson(response);

        assert.equal(response.status, 200);
        assert.equal((data.resume as Record<string, unknown>).summary, null);
        assert.deepEqual((data.resume as Record<string, unknown>).experience, []);
    }

    // 8) deterministic ordering: same input returns same output
    {
        const deterministicGenerate: GenerateFn = async () => ({
            resume: {
                summary: "Stable",
                experience: [
                    {
                        company: "Acme",
                        role: "Program Manager",
                        date_range: "2022 - Present",
                        bullets: ["A", "B", "C"],
                    },
                ],
            },
        });

        const handler = createResumeGeneratePostHandler(deterministicGenerate);
        const response1 = await handler(makeRequest({ profileId: "profile-1", jobId: "job-1" }));
        const response2 = await handler(makeRequest({ profileId: "profile-1", jobId: "job-1" }));
        const data1 = await parseJson(response1);
        const data2 = await parseJson(response2);

        assert.equal(response1.status, 200);
        assert.equal(response2.status, 200);
        assert.deepEqual(data1.resume, data2.resume);
    }

    console.log("test-api-resume-generate passed");
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
