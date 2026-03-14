import type { JobAnalysisRisk } from "@/extensions/job-copilot/extension/shared/types";

type Props = {
    risks: JobAnalysisRisk[];
};

export function AtsRiskCard(props: Props) {
    return (
        <section className="ctsp-card">
            <h2>ATS risk</h2>
            {props.risks.length === 0 ? (
                <p className="ctsp-empty">No ATS risks flagged.</p>
            ) : (
                <ul className="ctsp-row-list">
                    {props.risks.map((risk, index) => (
                        <li key={`${risk.type}-${index}`}>
                            <span className={`ctsp-risk ctsp-risk-${risk.level}`}>{risk.level}</span>
                            <div>
                                <strong>{risk.type.replace("_", " ")}</strong>
                                <p>{risk.message}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
