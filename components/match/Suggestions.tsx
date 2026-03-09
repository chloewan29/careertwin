import { Card } from "@/components/ui/Card";

interface StrategySectionProps {
    title: string;
    items: string[];
    accentClass: string;
    numberClass: string;
}

function StrategySection({ title, items, accentClass, numberClass }: StrategySectionProps) {
    if (items.length === 0) return null;
    return (
        <div>
            <h4 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">{title}</h4>
            <ul className="space-y-2.5">
                {items.map((item, i) => (
                    <li key={i} className="flex gap-3">
                        <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${numberClass}`}>
                            {i + 1}
                        </span>
                        <p className="text-sm text-foreground/80 leading-relaxed">{item}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
}

interface SuggestionsProps {
    resumeImprovements: string[];
    positioningSuggestions: string[];
    nextBestActions: string[];
}

export function Suggestions({ resumeImprovements, positioningSuggestions, nextBestActions }: SuggestionsProps) {
    return (
        <Card>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-primary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                    </svg>
                </div>
                <h3 className="font-semibold">Career Action Plan</h3>
            </div>

            <div className="space-y-6">
                <StrategySection
                    title="Resume Improvements"
                    items={resumeImprovements}
                    accentClass="bg-primary/15 text-primary-light"
                    numberClass="bg-primary/15 text-primary-light"
                />
                <StrategySection
                    title="Positioning Suggestions"
                    items={positioningSuggestions}
                    accentClass="bg-accent/15 text-accent"
                    numberClass="bg-accent/15 text-accent"
                />
                <StrategySection
                    title="Next Best Actions"
                    items={nextBestActions}
                    accentClass="bg-green-500/15 text-green-400"
                    numberClass="bg-green-500/15 text-green-400"
                />
            </div>
        </Card>
    );
}
