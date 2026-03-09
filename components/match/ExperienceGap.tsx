import { Card } from "@/components/ui/Card";

interface ExperienceGapProps {
    requiredYears: number | null;
    candidateYears: number;
    meets: boolean;
}

export function ExperienceGap({ requiredYears, candidateYears, meets }: ExperienceGapProps) {
    const percentage = requiredYears
        ? Math.min(100, Math.round((candidateYears / requiredYears) * 100))
        : 100;

    return (
        <Card>
            <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${meets ? "bg-green-500/15" : "bg-amber-500/15"
                    }`}>
                    <svg className={`w-5 h-5 ${meets ? "text-green-400" : "text-amber-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold">Experience</h3>
                    <p className="text-xs text-muted">
                        {requiredYears
                            ? `${requiredYears}+ years required`
                            : "No specific years mentioned"}
                    </p>
                </div>
            </div>

            <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Your experience</span>
                    <span className={`font-semibold ${meets ? "text-green-400" : "text-amber-400"}`}>
                        {candidateYears} years
                    </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-surface-light overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${meets
                                ? "bg-gradient-to-r from-green-500 to-emerald-400"
                                : "bg-gradient-to-r from-amber-500 to-orange-400"
                            }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                <p className="text-xs text-muted">
                    {meets
                        ? "✓ You meet the experience requirement."
                        : `${requiredYears ? requiredYears - candidateYears : 0} more year${(requiredYears || 0) - candidateYears !== 1 ? "s" : ""} needed. Consider highlighting transferable experience.`}
                </p>
            </div>
        </Card>
    );
}
