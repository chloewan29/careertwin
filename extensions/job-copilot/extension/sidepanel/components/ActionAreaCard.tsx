import type { ResumeTailoringResult } from "@/extensions/job-copilot/extension/shared/types";

type PanelActionState = "analysis_ready" | "cv_generating" | "cv_ready";

type Props = {
    result: ResumeTailoringResult;
    state: PanelActionState;
    onGenerate: () => void;
    onDownload: () => void;
};

export function ActionAreaCard(props: Props) {
    const decision = props.result.job_analysis.tailoring_decision;
    const canGenerate = decision.allowed;
    const hasDownload = Boolean(props.result.tailored_resume_artifact?.download_url) && canGenerate;

    return (
        <section className="ctsp-card ctsp-action-card">
            <h2>Next step</h2>

            {!canGenerate && (
                <>
                    <p className="ctsp-tailor-low">Tailored CV is unavailable for low-confidence matches.</p>
                    <p className="ctsp-note">{decision.message}</p>
                    <button type="button" className="ctsp-secondary-btn">See why</button>
                </>
            )}

            {canGenerate && props.state === "analysis_ready" && (
                <>
                    {decision.status === "stretch" && (
                        <p className="ctsp-tailor-stretch">This role may require stronger positioning.</p>
                    )}
                    {decision.status === "ready" && (
                        <p className="ctsp-tailor-ready">Tailored CV ready to generate.</p>
                    )}
                    <button type="button" className="ctsp-download-btn" onClick={props.onGenerate}>
                        {decision.status === "stretch" ? "Generate stretch CV" : "Generate Tailored CV"}
                    </button>
                </>
            )}

            {canGenerate && props.state === "cv_generating" && (
                <div className="ctsp-generating">
                    <h3>Generating tailored CV</h3>
                    <p>Rewriting experience highlights</p>
                    <p>Optimizing phrasing for this role</p>
                    <button type="button" className="ctsp-download-btn" disabled>
                        Generating...
                    </button>
                </div>
            )}

            {canGenerate && props.state === "cv_ready" && (
                <div className="ctsp-ready-block">
                    <h3>Tailored CV ready</h3>
                    <p>Optimized for this job description</p>
                    <p>ATS-aware phrasing applied</p>
                    {hasDownload ? (
                        <button type="button" className="ctsp-download-btn" onClick={props.onDownload}>
                            Download CV
                        </button>
                    ) : (
                        <button type="button" className="ctsp-download-btn" disabled>
                            Download unavailable
                        </button>
                    )}
                    <small>Generated just now</small>
                </div>
            )}
        </section>
    );
}
