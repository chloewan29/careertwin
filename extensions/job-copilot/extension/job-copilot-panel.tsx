import type { JobCopilotAnalyzeResponse } from "./job-copilot-client";

type PanelState =
    | { status: "loading"; message: string }
    | { status: "error"; message: string }
    | { status: "unsupported"; message: string }
    | { status: "ready"; data: JobCopilotAnalyzeResponse };

type Props = {
    state: PanelState;
    onDownloadResume: () => void;
    downloading: boolean;
};

export function JobCopilotPanel(props: Props) {
    if (props.state.status === "loading") {
        return <div className="ctjc-state">{props.state.message}</div>;
    }
    if (props.state.status === "error") {
        return <div className="ctjc-state ctjc-state-error">{props.state.message}</div>;
    }
    if (props.state.status === "unsupported") {
        return <div className="ctjc-state">{props.state.message}</div>;
    }

    const copilot = props.state.data.response;
    const analysis = copilot.job_analysis;
    const verdictSentence = copilot.verdictText || (copilot.verdict === "strong_fit"
        ? "You are a strong fit for this role"
        : copilot.verdict === "possible_fit"
            ? "You could be a fit for this role"
            : copilot.verdict === "stretch"
                ? "This role may be a stretch"
                : "This role is likely not a strong fit");
    const isLowFit = copilot.matchScore < 50;

    return (
        <div className="ctjc-panel">
            <section>
                <strong>{verdictSentence}</strong>
                <span>{copilot.matchScore}%</span>
            </section>
            {!isLowFit && (
                <section>
                    <h3>Matched capabilities</h3>
                    <ul>{analysis.matched_capabilities.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
            )}
            <section>
                <h3>Key gaps</h3>
                <ul>{analysis.key_gaps.map((item) => <li key={item}>{item}</li>)}</ul>
            </section>
            <section>
                <h3>Diagnostics</h3>
                <p>Confidence: {analysis.confidence}</p>
                <p>Job profile quality: {analysis.job_profile_quality}</p>
                <p>{analysis.interpretation_note}</p>
            </section>
            {analysis.extraction_notices.length > 0 && (
                <section>
                    <h3>Extraction notices</h3>
                    <ul>{analysis.extraction_notices.map((notice) => <li key={notice.code}>{notice.message}</li>)}</ul>
                </section>
            )}
            {!isLowFit && (
                <>
                    <section>
                        <h3>Evidence highlights</h3>
                        <ul>{analysis.evidence_highlights.slice(0, 4).map((item) => <li key={item.evidencePieceId}>{item.label}</li>)}</ul>
                    </section>
                    <section>
                        <h3>Tailored resume ready</h3>
                        <button disabled={!copilot.resume.ready || props.downloading} onClick={props.onDownloadResume}>
                            {props.downloading ? "Preparing..." : "Download Resume"}
                        </button>
                    </section>
                </>
            )}
        </div>
    );
}
