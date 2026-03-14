import { NextRequest, NextResponse } from "next/server";
import { getCapabilityMatchV1 } from "@/lib/career-engine/matching/capability-match-v1";
import { extractJobCapabilitiesV1 } from "@/lib/career-engine/matching/job-capability-extractor";

const SAMPLE_JOB_DESCRIPTION = `Senior Manager, Analytics Strategy and Automation
We are seeking a senior analytics leader to drive analytics strategy, automation, and commercial growth insights.
You will lead a cross-functional analytics team, partner with product, finance, marketing, and operations leaders, and present business cases to executive stakeholders.
Required: proven experience building strategic roadmaps, market and opportunity assessment, commercial analytics, and translating analysis into revenue outcomes.
Required: experience implementing analytics automation using SQL/Python and BI tools (Power BI, Tableau, or similar).
Preferred: experience in enterprise BI/data platform transformation and enablement programs to improve adoption and capability uplift.
You will own delivery of transformation initiatives, optimize operational performance, and ensure measurable business impact.`;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const careerId = searchParams.get("careerId")?.trim();
        const jobDescription = searchParams.get("jobDescription")?.trim() ?? SAMPLE_JOB_DESCRIPTION;
        const topSignalsParam = Number.parseInt(searchParams.get("topSignals") ?? "3", 10);
        const topSignals = Number.isFinite(topSignalsParam) ? Math.max(1, Math.min(8, topSignalsParam)) : 3;

        if (!careerId) {
            return NextResponse.json({ error: "careerId is required" }, { status: 400 });
        }

        const result = await getCapabilityMatchV1({
            careerId,
            jobDescription,
            topSignalsLimit: topSignals,
        });

        return NextResponse.json({
            ...result,
            notes: {
                model: "deterministic capability matching over Capability Strength Model v1",
                confidence_vs_strength: "confidence estimates label certainty; strength estimates depth/substance of evidence support",
                ranking: "candidate capabilities are ranked by strength_score; job matching compares ranked strengths against JD requirements",
            },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Failed to compute capability match: ${message}` }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as {
            careerId?: string;
            jobDescription?: string;
            topSignals?: number;
        };

        const careerId = body.careerId?.trim();
        const jobDescription = body.jobDescription?.trim();
        const topSignals = Number.isFinite(body.topSignals)
            ? Math.max(1, Math.min(8, Math.trunc(body.topSignals ?? 3)))
            : 3;

        if (!careerId) {
            return NextResponse.json({ error: "careerId is required" }, { status: 400 });
        }
        if (!jobDescription) {
            return NextResponse.json({ error: "jobDescription is required" }, { status: 400 });
        }

        const extractedJobCapabilities = extractJobCapabilitiesV1(jobDescription);
        const result = await getCapabilityMatchV1({
            careerId,
            jobDescription,
            topSignalsLimit: topSignals,
        });

        return NextResponse.json({
            ...result,
            extracted_job_capability_count: extractedJobCapabilities.length,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Failed to compute capability match: ${message}` }, { status: 500 });
    }
}

