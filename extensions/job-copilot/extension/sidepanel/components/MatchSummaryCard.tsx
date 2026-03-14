import type { JobCopilotAnalysis } from "@/extensions/job-copilot/extension/shared/types";

type Props = {
    analysis: JobCopilotAnalysis;
};

export function MatchSummaryCard(props: Props) {
    const { analysis } = props;
    const fitLabel = analysis.fit_level === "low"
        ? "Low Fit"
        : analysis.fit_level === "moderate"
            ? "Moderate Fit"
        : analysis.fit_level === "stretch"
            ? "Stretch"
            : "Strong Fit";

    return (
        <section className="ctsp-card">
            <h2>Match summary</h2>
            <div className="ctsp-score-row">
                <div>
                    <span className="ctsp-score-value">{analysis.match_score}%</span>
                </div>
                <div className="ctsp-score-meta">
                    <span className={`ctsp-fit-badge ctsp-fit-${analysis.fit_level}`}>{fitLabel}</span>
                    <span className="ctsp-confidence">Confidence: {analysis.score_confidence}</span>
                </div>
            </div>
            <p className="ctsp-note">{analysis.interpretation_note}</p>
        </section>
    );
}
