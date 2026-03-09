import { Card } from "@/components/ui/Card";
import type { MatchAnalysis } from "@/app/match/page";

interface ResumeRewriteProps {
    rewrite: MatchAnalysis["resumeRewrite"];
}

export function ResumeRewrite({ rewrite }: ResumeRewriteProps) {
    if (!rewrite || (rewrite.roles.length === 0 && !rewrite.summary_suggestion)) {
        return (
            <Card>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold">Resume Improvements</h3>
                        <p className="text-xs text-muted">No rewrite suggestions available</p>
                    </div>
                </div>
                <div className="py-6 text-center text-sm text-muted bg-surface-light/40 rounded-xl border border-dashed border-border">
                    Provide a more detailed resume to generate tailored bullet points.
                </div>
            </Card>
        );
    }

    return (
        <Card>
            <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                </div>
                <div>
                    <h3 className="font-semibold">Resume Improvements</h3>
                    <p className="text-xs text-muted">Tailor your bullets to this role</p>
                </div>
            </div>

            {rewrite.summary_suggestion && (
                <div className="mb-6">
                    <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Suggested Summary</p>
                    <div className="rounded-xl bg-surface-light/40 border p-3">
                        <p className="text-sm text-foreground/80 leading-relaxed italic">"{rewrite.summary_suggestion}"</p>
                    </div>
                </div>
            )}

            {rewrite.roles.length > 0 && (
                <div className="space-y-6">
                    {rewrite.roles.map((role) => (
                        <div key={role.company} className="rounded-xl border border-border p-4 bg-surface/50">
                            <p className="text-sm font-semibold text-primary-light mb-1">{role.company}</p>
                            <p className="text-xs text-muted mb-4">{role.role_description}</p>

                            <div className="space-y-4">
                                {role.rewritten_bullets.map((newBullet, i) => {
                                    const oldBullet = role.original_bullets[i] || "Generic duty description";
                                    return (
                                        <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                            {/* Before */}
                                            <div className="bg-surface-light/30 rounded-lg p-3 border border-border/50">
                                                <div className="flex items-center gap-1.5 mb-1.5 opacity-60">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted">Before</span>
                                                </div>
                                                <p className="text-xs text-foreground/60 leading-relaxed strike">{oldBullet}</p>
                                            </div>

                                            {/* After */}
                                            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20 relative">
                                                <div className="hidden sm:flex absolute -left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-surface border border-border items-center justify-center z-10">
                                                    <svg className="w-2.5 h-2.5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                                    </svg>
                                                </div>

                                                <div className="flex items-center gap-1.5 mb-1.5">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-500/80">After</span>
                                                </div>
                                                <p className="text-xs text-foreground/90 font-medium leading-relaxed">{newBullet}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}
