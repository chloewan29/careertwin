import { Card } from "@/components/ui/Card";
import { ExperienceEntry } from "@/types";

interface WorkHistoryProps {
    experience: ExperienceEntry[];
}

function formatDate(dateStr: string): string {
    const [year, month] = dateStr.split("-");
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${months[parseInt(month, 10) - 1]} ${year}`;
}

export function WorkHistory({ experience }: WorkHistoryProps) {
    return (
        <Card>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold">Work History</h3>
                <span className="ml-auto text-xs text-muted bg-surface-light px-2 py-1 rounded-full">
                    {experience.length} roles
                </span>
            </div>

            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-px bg-border" />

                <div className="space-y-6">
                    {experience.map((entry, index) => (
                        <div key={index} className="relative flex gap-4">
                            {/* Timeline dot */}
                            <div className="relative z-10 flex-shrink-0">
                                <div
                                    className={`w-10 h-10 rounded-full flex items-center justify-center ${index === 0
                                        ? "bg-primary text-white"
                                        : "bg-surface-light border border-border text-muted"
                                        }`}
                                >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0 pb-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-1">
                                    <h4 className="font-semibold truncate">{entry.title}</h4>
                                    {index === 0 && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary-light border border-primary/20 w-fit">
                                            CURRENT
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-accent-light font-medium">{entry.company}</p>
                                <p className="text-xs text-muted mt-0.5">
                                    {formatDate(entry.start_date)} — {entry.end_date ? formatDate(entry.end_date) : "Present"}
                                </p>
                                <p className="text-sm text-foreground/70 mt-2 leading-relaxed">
                                    {entry.description}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Card>
    );
}
