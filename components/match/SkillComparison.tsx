import { Card } from "@/components/ui/Card";

interface SkillComparisonProps {
    matchedSkills: string[];
    missingSkills: string[];
}

export function SkillComparison({ matchedSkills, missingSkills }: SkillComparisonProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Matched */}
            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold">Matched Skills</h3>
                        <p className="text-xs text-muted">{matchedSkills.length} skills match</p>
                    </div>
                </div>
                {matchedSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {matchedSkills.map((skill) => (
                            <span
                                key={skill}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/10 text-green-400 border border-green-500/20"
                            >
                                ✓ {skill}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted">No direct skill matches found.</p>
                )}
            </Card>

            {/* Missing */}
            <Card>
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="font-semibold">Missing Skills</h3>
                        <p className="text-xs text-muted">{missingSkills.length} skills to develop</p>
                    </div>
                </div>
                {missingSkills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                        {missingSkills.map((skill) => (
                            <span
                                key={skill}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                            >
                                ✗ {skill}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-green-400">You have all the required skills! 🎉</p>
                )}
            </Card>
        </div>
    );
}
