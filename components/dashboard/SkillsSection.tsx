import { Card } from "@/components/ui/Card";

interface SkillsSectionProps {
    skills: string[];
    industries: string[];
    certifications: string[];
}

export function SkillsSection({ skills, industries, certifications }: SkillsSectionProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Skills */}
            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary-light/20 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                    </div>
                    <h3 className="text-lg font-semibold">Skills</h3>
                    <span className="ml-auto text-xs text-muted bg-surface-light px-2 py-1 rounded-full">
                        {skills.length}
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                        <span
                            key={skill}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-primary/10 text-primary-light border border-primary/20 hover:bg-primary/20 transition-colors"
                        >
                            {skill}
                        </span>
                    ))}
                </div>
            </Card>

            {/* Industries + Certifications */}
            <div className="space-y-6">
                <Card>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent-light/20 flex items-center justify-center">
                            <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold">Industries</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {industries.map((industry) => (
                            <span
                                key={industry}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-accent/10 text-accent-light border border-accent/20"
                            >
                                {industry}
                            </span>
                        ))}
                    </div>
                </Card>

                {certifications.length > 0 && (
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center">
                                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.745 3.745 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-semibold">Certifications</h3>
                        </div>
                        <ul className="space-y-2">
                            {certifications.map((cert) => (
                                <li key={cert} className="flex items-center gap-2 text-sm text-foreground/80">
                                    <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {cert}
                                </li>
                            ))}
                        </ul>
                    </Card>
                )}
            </div>
        </div>
    );
}
