import type { JobAnalysisSystemNotice } from "@/extensions/job-copilot/extension/shared/types";

type Props = {
    notice: JobAnalysisSystemNotice;
};

function levelLabel(level: JobAnalysisSystemNotice["level"]): string {
    if (level === "critical") return "Critical";
    if (level === "warning") return "Warning";
    return "Info";
}

export function SystemNotice(props: Props) {
    const level = props.notice.level;
    return (
        <div className={`ctsp-notice ctsp-notice-${level}`}>
            <span className="ctsp-notice-level">{levelLabel(level)}</span>
            <p>{props.notice.message}</p>
        </div>
    );
}
