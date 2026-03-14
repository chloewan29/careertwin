import type { JobAnalysisRisk } from "@/extensions/job-copilot/extension/shared/types";

type Props = {
    gaps: string[];
    risks: JobAnalysisRisk[];
};

function severityForIndex(index: number): "high" | "medium" | "low" {
    if (index === 0) return "high";
    if (index === 1) return "medium";
    return "low";
}

export function GapsList(props: Props) {
    const gapItems = props.gaps.map((value) => ({ label: value, kind: "gap" as const }));
    const riskItems = props.risks.map((risk) => ({ label: risk.message, kind: "risk" as const }));
    const rows = [...gapItems, ...riskItems].slice(0, 3);

    return (
        <section className="ctsp-card">
            <h2>Gaps / Risks</h2>
            {rows.length === 0 ? (
                <p className="ctsp-empty">No major gaps identified in this snapshot.</p>
            ) : (
                <ul className="ctsp-row-list">
                    {rows.map((row, index) => (
                        <li key={`${row.kind}-${row.label}`}>
                            <span className={`ctsp-severity ctsp-severity-${severityForIndex(index)}`}>
                                {severityForIndex(index)}
                            </span>
                            <span>{row.label}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
