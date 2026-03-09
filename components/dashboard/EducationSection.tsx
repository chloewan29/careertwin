import { Card } from "@/components/ui/Card";
import { EducationEntry } from "@/types";

interface EducationSectionProps {
    education: EducationEntry[];
}

export function EducationSection({ education }: EducationSectionProps) {
    return (
        <Card>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent-light/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-accent-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold">Education</h3>
            </div>

            <div className="space-y-4">
                {education.map((entry, index) => (
                    <div
                        key={index}
                        className="flex items-start gap-4 p-3 rounded-xl bg-surface/50 hover:bg-surface-light transition-colors"
                    >
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-semibold text-sm">{entry.degree}</h4>
                            <p className="text-sm text-muted">{entry.institution}</p>
                            <p className="text-xs text-muted mt-0.5">{entry.year}</p>
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}
