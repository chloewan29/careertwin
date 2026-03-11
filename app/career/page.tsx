import { getCareerSignals } from "@/lib/career-engine/strategy/career-signals-service";
import { loadCareerGraph } from "@/lib/career-engine/memory/career-graph-loader";
import { createServerSupabaseClient } from "@/lib/db/supabase/server";

const TARGET_ROLES = [
    "Program Manager",
    "Data Product Manager",
    "Transformation Lead",
] as const;

async function resolveProfileId(): Promise<string | null> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from("profiles")
        .select("id")
        .limit(1);

    if (error) {
        throw new Error(`Failed to resolve profile for /career page: ${error.message}`);
    }

    return data?.[0]?.id ?? null;
}

export default async function CareerPage() {
    const profileId = await resolveProfileId();

    if (!profileId) {
        return (
            <main className="min-h-screen px-6 py-10">
                <div className="mx-auto max-w-4xl">
                    <h1 className="text-2xl font-semibold">Career</h1>
                    <p className="mt-3 text-sm text-muted-foreground">
                        No profile found yet. Upload a resume to build Career Memory.
                    </p>
                </div>
            </main>
        );
    }

    const careerGraph = await loadCareerGraph(profileId);
    if (!careerGraph.career) {
        return (
            <main className="min-h-screen px-6 py-10">
                <div className="mx-auto max-w-4xl">
                    <h1 className="text-2xl font-semibold">Career</h1>
                    <p className="mt-3 text-sm text-muted-foreground">
                        Career Memory is not populated yet for profile <code>{profileId}</code>.
                    </p>
                </div>
            </main>
        );
    }

    const signals = getCareerSignals(careerGraph, [...TARGET_ROLES]);

    return (
        <main className="min-h-screen px-6 py-10">
            <div className="mx-auto max-w-4xl space-y-8">
                <header className="space-y-2">
                    <h1 className="text-2xl font-semibold">Career</h1>
                    <p className="text-sm text-muted-foreground">
                        Profile: <code>{profileId}</code>
                    </p>
                </header>

                <section className="rounded-lg border p-4">
                    <h2 className="text-lg font-medium">Career Snapshot</h2>
                    <p className="mt-2 text-sm">
                        {careerGraph.career.headline ?? "No headline"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {careerGraph.career.summary ?? "No summary available yet."}
                    </p>
                    <ul className="mt-3 space-y-1 text-sm">
                        <li>Experiences: {careerGraph.experiences.length}</li>
                        <li>Evidence Pieces: {careerGraph.evidencePieces.length}</li>
                        <li>Capabilities: {careerGraph.capabilities.length}</li>
                    </ul>
                </section>

                <section className="rounded-lg border p-4">
                    <h2 className="text-lg font-medium">Top Capabilities</h2>
                    <ul className="mt-3 space-y-1 text-sm">
                        {signals.topCapabilities.slice(0, 5).map((item) => (
                            <li key={item.capability.id}>
                                {item.capability.name} ({item.evidenceCount} evidence)
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-lg border p-4">
                    <h2 className="text-lg font-medium">Best Fit Roles</h2>
                    <ul className="mt-3 space-y-3 text-sm">
                        {signals.bestFitRoles.map((fit) => (
                            <li key={fit.targetRole} className="rounded border p-3">
                                <p className="font-medium">{fit.targetRole} - {fit.fitScore}/100</p>
                                <p className="mt-1 text-muted-foreground">{fit.fitSummary}</p>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="rounded-lg border p-4">
                    <h2 className="text-lg font-medium">Evidence Highlights</h2>
                    <ul className="mt-3 space-y-3 text-sm">
                        {signals.evidenceHighlights.map((evidence) => (
                            <li key={evidence.id} className="rounded border p-3">
                                <p>{evidence.raw_text}</p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {evidence.company} | {evidence.role} | {evidence.date_range}
                                </p>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>
        </main>
    );
}

