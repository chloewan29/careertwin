import type { ResumeTailoringResult } from "@/extensions/job-copilot/extension/shared/types";

type Props = {
    result: ResumeTailoringResult;
};

export function TailoredCvCard(props: Props) {
    const decision = props.result.job_analysis.tailoring_decision;
    const canDownload = decision.allowed && Boolean(props.result.tailored_resume_artifact?.download_url);

    return (
        <section className="ctsp-card">
            <h2>Tailored CV</h2>
            {decision.status === "ready" && <p className="ctsp-tailor-ready">Tailored CV ready.</p>}
            {decision.status === "stretch" && <p className="ctsp-tailor-stretch">Stretch fit: stronger positioning may be required.</p>}
            {decision.status === "not_recommended" && <p className="ctsp-tailor-low">Tailored CV not recommended.</p>}
            <p className="ctsp-note">{decision.message}</p>
            {canDownload ? (
                <button
                    type="button"
                    className="ctsp-download-btn"
                    onClick={() => window.alert(`Mock download: ${props.result.tailored_resume_artifact?.download_url}`)}
                >
                    Download CV
                </button>
            ) : null}
        </section>
    );
}
