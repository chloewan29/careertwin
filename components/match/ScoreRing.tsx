import { Card } from "@/components/ui/Card";

interface ScoreRingProps {
    score: number;
}

function getScoreColor(score: number): string {
    if (score >= 75) return "#22d3ee"; // accent
    if (score >= 50) return "#818cf8"; // primary-light
    if (score >= 30) return "#f59e0b"; // amber
    return "#ef4444"; // red
}

function getScoreLabel(score: number): string {
    if (score >= 80) return "Excellent Match";
    if (score >= 65) return "Strong Match";
    if (score >= 50) return "Moderate Match";
    if (score >= 30) return "Partial Match";
    return "Low Match";
}

export function ScoreRing({ score }: ScoreRingProps) {
    const color = getScoreColor(score);
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (score / 100) * circumference;

    return (
        <Card className="flex flex-col items-center justify-center py-8">
            <div className="relative w-36 h-36 mb-4">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background ring */}
                    <circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke="currentColor"
                        className="text-border"
                        strokeWidth="8"
                    />
                    {/* Score ring */}
                    <circle
                        cx="60" cy="60" r="54"
                        fill="none"
                        stroke={color}
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset}
                        style={{ transition: "stroke-dashoffset 1s ease-out" }}
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold" style={{ color }}>{score}</span>
                    <span className="text-xs text-muted">/ 100</span>
                </div>
            </div>
            <p className="text-sm font-semibold" style={{ color }}>
                {getScoreLabel(score)}
            </p>
        </Card>
    );
}
