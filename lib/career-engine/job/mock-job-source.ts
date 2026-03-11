import type { SeekJob } from "../job-fetcher/seek-fetcher";

const MOCK_JOBS_BY_ROLE: Record<string, SeekJob[]> = {
    "analytics manager": [
        {
            title: "Analytics Manager",
            company: "Optus",
            jobUrl: "mock://jobs/analytics-manager-optus",
            jobDescription:
                "Analytics Manager role leading a commercial analytics team. Own stakeholder engagement with senior leaders, deliver insight storytelling, define analytics roadmap, and drive measurable business impact. Requires leadership, SQL, Power BI/Tableau, and cross-functional collaboration.",
        },
        {
            title: "Senior Analytics Manager",
            company: "Telstra",
            jobUrl: "mock://jobs/senior-analytics-manager-telstra",
            jobDescription:
                "Lead analytics strategy and team outcomes across business units. Build capability frameworks, improve decision quality, and influence executive stakeholders. Strong commercial analytics, people leadership, and strategic planning required.",
        },
    ],
    "insights manager": [
        {
            title: "Insights Manager",
            company: "Woolworths Group",
            jobUrl: "mock://jobs/insights-manager-wow",
            jobDescription:
                "Insights Manager responsible for customer and commercial insights. Partner with stakeholders, shape strategic priorities, and communicate recommendations to leadership. Requires stakeholder strategy, storytelling, and analytics experience.",
        },
        {
            title: "Commercial Insights Manager",
            company: "Qantas",
            jobUrl: "mock://jobs/commercial-insights-manager-qantas",
            jobDescription:
                "Drive commercial insights and profitability analysis for growth initiatives. Build trusted partnerships with business leaders and translate data into action. Experience in BI tools and strategic planning preferred.",
        },
    ],
    "program manager": [
        {
            title: "Program Manager - Analytics Transformation",
            company: "NSW Government",
            jobUrl: "mock://jobs/program-manager-analytics-transformation-nsw",
            jobDescription:
                "Lead end-to-end analytics transformation program across multiple business units. Manage delivery cadence, governance, risk, and change enablement. Requires program leadership, change management, and stakeholder alignment.",
        },
        {
            title: "Program Manager",
            company: "Commonwealth Bank",
            jobUrl: "mock://jobs/program-manager-cba",
            jobDescription:
                "Own strategic program delivery across cross-functional teams. Coordinate roadmap execution, business readiness, and executive reporting. Strong leadership, planning, and transformation experience required.",
        },
    ],
    "transformation lead": [
        {
            title: "Transformation Lead",
            company: "Suncorp",
            jobUrl: "mock://jobs/transformation-lead-suncorp",
            jobDescription:
                "Drive enterprise transformation initiatives with clear business outcomes. Lead operating model uplift, change rollout, and stakeholder engagement strategy. Requires transformation leadership, program ownership, and commercial acumen.",
        },
        {
            title: "Business Transformation Lead",
            company: "Westpac",
            jobUrl: "mock://jobs/business-transformation-lead-westpac",
            jobDescription:
                "Lead strategic transformation agenda and cross-business delivery. Define transformation roadmap, influence senior stakeholders, and monitor impact. Strong change leadership and strategic planning experience required.",
        },
    ],
    "data product manager": [
        {
            title: "Data Product Manager",
            company: "Canva",
            jobUrl: "mock://jobs/data-product-manager-canva",
            jobDescription:
                "Own data platform product roadmap and prioritization. Partner with engineering, analytics, and business teams to deliver BI/data products. Requires stakeholder strategy, roadmap planning, and data platform transformation experience.",
        },
        {
            title: "Data Platform Product Manager",
            company: "Atlassian",
            jobUrl: "mock://jobs/data-platform-product-manager-atlassian",
            jobDescription:
                "Lead BI and data platform capabilities through clear product strategy and execution. Align stakeholders, define outcomes, and drive platform adoption. Experience with analytics transformation and strategic planning preferred.",
        },
    ],
};

export function getMockJobsForRole(role: string): SeekJob[] {
    const roleLower = role.trim().toLowerCase();
    const direct = MOCK_JOBS_BY_ROLE[roleLower];
    if (direct) return direct;

    const byContains = Object.entries(MOCK_JOBS_BY_ROLE).find(([key]) => roleLower.includes(key));
    if (byContains) return byContains[1];

    return [];
}
