import { Card } from "@/components/ui/Card";

interface ProfileHeaderProps {
    name: string;
    currentTitle: string;
    summary: string;
}

export function ProfileHeader({ name, currentTitle, summary }: ProfileHeaderProps) {
    return (
        <Card className="relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary-light" />

            <div className="flex items-start gap-5 pt-4">
                {/* Avatar */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                </div>

                <div className="min-w-0">
                    <h2 className="text-2xl font-bold truncate">{name}</h2>
                    <p className="text-primary-light font-medium truncate">{currentTitle}</p>
                    <p className="text-sm text-muted mt-2 leading-relaxed">{summary}</p>
                </div>
            </div>
        </Card>
    );
}
