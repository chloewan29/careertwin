import type { JobAnalysisEvidenceHighlight } from "@/extensions/job-copilot/extension/shared/types";

type Props = {
    evidence: JobAnalysisEvidenceHighlight[];
};

function parseEvidenceLabel(label: string): { source: string; snippet: string } {
    const parts = label.split(" - ");
    if (parts.length >= 2) {
        return {
            source: parts[0].trim(),
            snippet: parts.slice(1).join(" - ").trim(),
        };
    }
    return {
        source: "Experience",
        snippet: label,
    };
}

export function EvidenceList(props: Props) {
    const rows = props.evidence.slice(0, 2);
    return (
        <section className="ctsp-card">
            <h2>Evidence from your experience</h2>
            {rows.length === 0 ? (
                <p className="ctsp-empty">No evidence snippets available in this snapshot.</p>
            ) : (
                <ul className="ctsp-evidence-list">
                    {rows.map((item) => {
                        const parsed = parseEvidenceLabel(item.label);
                        return (
                            <li key={item.evidencePieceId}>
                                <strong>{parsed.source}</strong>
                                <p>{parsed.snippet}</p>
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}
