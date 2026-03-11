import { NextRequest, NextResponse } from "next/server";

type RequestBody = {
    job_url?: string;
};

function htmlToText(html: string): string {
    return html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&#39;/gi, "'")
        .replace(/&quot;/gi, "\"")
        .replace(/\s+/g, " ")
        .trim();
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as RequestBody;
        const jobUrl = body.job_url?.trim();
        if (!jobUrl || !/^https?:\/\//i.test(jobUrl)) {
            return NextResponse.json({ error: "job_url is required" }, { status: 400 });
        }

        const response = await fetch(jobUrl, {
            method: "GET",
            headers: {
                "User-Agent": "CareerTwinBot/1.0 (+job-detail)",
            },
        });
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch job detail" }, { status: 502 });
        }

        const html = await response.text();
        const text = htmlToText(html);
        return NextResponse.json({ description: text });
    } catch (error) {
        console.error("job-detail API error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

