import { useEffect, useMemo, useState } from "react";
import { MatchSummaryCard } from "./components/MatchSummaryCard";
import { WhyFitList } from "./components/WhyFitList";
import { GapsList } from "./components/GapsList";
import { EvidenceList } from "./components/EvidenceList";
import { ActionAreaCard } from "./components/ActionAreaCard";
import { SystemNotice } from "./components/SystemNotice";
import { SIDEPANEL_JOB_ANALYSIS_FIXTURES } from "./mock/job-analysis-fixtures";
import { AtsRiskCard } from "./components/AtsRiskCard";

type PanelUiState = "jd_loading" | "analysis_ready" | "cv_generating" | "cv_ready" | "error";

export function App() {
    const [fixtureId, setFixtureId] = useState(SIDEPANEL_JOB_ANALYSIS_FIXTURES[0].id);
    const [uiState, setUiState] = useState<PanelUiState>("analysis_ready");

    const fixture = useMemo(
        () => SIDEPANEL_JOB_ANALYSIS_FIXTURES.find((item) => item.id === fixtureId) ?? SIDEPANEL_JOB_ANALYSIS_FIXTURES[0],
        [fixtureId],
    );

    const analysis = fixture.result.job_analysis;

    useEffect(() => {
        setUiState("analysis_ready");
    }, [fixtureId]);

    useEffect(() => {
        if (uiState !== "cv_generating") return;
        const timer = setTimeout(() => setUiState("cv_ready"), 1400);
        return () => clearTimeout(timer);
    }, [uiState]);

    const handleRetry = () => {
        setUiState("jd_loading");
        setTimeout(() => setUiState("analysis_ready"), 1000);
    };

    const handleGenerate = () => {
        if (uiState === "cv_generating") return;
        setUiState("cv_generating");
    };

    const handleDownload = () => {
        window.alert(`Mock download: ${fixture.result.tailored_resume_artifact?.download_url ?? "unavailable"}`);
    };

    return (
        <main className="ctsp-root">
            <header className="ctsp-header">
                <h1>Job Copilot</h1>
                <p>{uiState === "jd_loading" ? "Reading job description" : `${fixture.roleTitle} - ${fixture.company}`}</p>
            </header>

            <nav className="ctsp-fixture-nav" aria-label="Mock state selector">
                {SIDEPANEL_JOB_ANALYSIS_FIXTURES.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        className={item.id === fixture.id ? "ctsp-fixture-btn ctsp-fixture-btn-active" : "ctsp-fixture-btn"}
                        onClick={() => setFixtureId(item.id)}
                    >
                        {item.label}
                    </button>
                ))}
                <button
                    type="button"
                    className={uiState === "jd_loading" ? "ctsp-fixture-btn ctsp-fixture-btn-active" : "ctsp-fixture-btn"}
                    onClick={() => setUiState("jd_loading")}
                >
                    JD Loading
                </button>
                <button
                    type="button"
                    className={uiState === "error" ? "ctsp-fixture-btn ctsp-fixture-btn-active" : "ctsp-fixture-btn"}
                    onClick={() => setUiState("error")}
                >
                    Error
                </button>
            </nav>

            {uiState === "jd_loading" && (
                <section className="ctsp-card">
                    <h2>Reading job description</h2>
                    <div className="ctsp-skeleton-row" />
                    <div className="ctsp-skeleton-row ctsp-skeleton-row-short" />
                    <ul className="ctsp-loading-steps">
                        <li>Extracting role</li>
                        <li>Parsing requirements</li>
                        <li>Preparing fit analysis</li>
                    </ul>
                </section>
            )}

            {uiState === "error" && (
                <section className="ctsp-card">
                    <h2>We couldn&apos;t fully read this job description.</h2>
                    <p className="ctsp-note">Please try the analysis again on this page.</p>
                    <button type="button" className="ctsp-download-btn" onClick={handleRetry}>
                        Retry analysis
                    </button>
                </section>
            )}

            {(uiState === "analysis_ready" || uiState === "cv_generating" || uiState === "cv_ready") && (
                <>
                    <MatchSummaryCard analysis={analysis} />
                    <WhyFitList capabilities={analysis.top_matched_capabilities} />
                    <GapsList gaps={analysis.key_gaps} risks={analysis.ats_risks} />
                    <EvidenceList evidence={analysis.evidence_highlights} />
                    <ActionAreaCard
                        result={fixture.result}
                        state={uiState === "analysis_ready" ? "analysis_ready" : uiState === "cv_generating" ? "cv_generating" : "cv_ready"}
                        onGenerate={handleGenerate}
                        onDownload={handleDownload}
                    />

                    <details className="ctsp-diagnostics">
                        <summary>Diagnostics</summary>
                        <AtsRiskCard risks={analysis.ats_risks} />
                        <section className="ctsp-card">
                            <h2>System notices</h2>
                            {analysis.system_notices.length === 0 ? (
                                <p className="ctsp-empty">No active notices.</p>
                            ) : (
                                <div className="ctsp-notice-stack">
                                    {analysis.system_notices.map((notice) => (
                                        <SystemNotice key={`${notice.code}-${notice.message}`} notice={notice} />
                                    ))}
                                </div>
                            )}
                        </section>
                    </details>
                </>
            )}
        </main>
    );
}
