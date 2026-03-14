import { NextRequest, NextResponse } from "next/server";
import { CAPABILITY_STRENGTH_WEIGHTS, getCapabilityStrengthProfile } from "@/lib/career-engine/capability/capability-strength";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const careerId = searchParams.get("careerId")?.trim();
        const topSignalsParam = Number.parseInt(searchParams.get("topSignals") ?? "3", 10);
        const topSignals = Number.isFinite(topSignalsParam) ? Math.max(1, Math.min(10, topSignalsParam)) : 3;

        if (!careerId) {
            return NextResponse.json({ error: "careerId is required" }, { status: 400 });
        }

        const rankedCapabilities = await getCapabilityStrengthProfile(careerId, {
            topSignalsLimit: topSignals,
        });

        return NextResponse.json({
            career_id: careerId,
            model: "capability_strength_v1",
            notes: {
                confidence_vs_strength: "Confidence reflects inference certainty of labels. Strength reflects substantive evidence quality/weight behind a capability.",
                strength_vs_ranking: "Strength is computed per capability from weighted supporting signals. Ranking is simply sorting capabilities by strength_score descending.",
            },
            weights: CAPABILITY_STRENGTH_WEIGHTS,
            formula: "signal_strength = base_weight * ownership_weight * scope_weight * impact_weight * recency_weight * confidence_modifier; weighted_signal_score = sum(signal_strength * diminishing_return_factor); strength_score = 1 - exp(-weighted_signal_score / normalization_scale)",
            ranked_capabilities: rankedCapabilities,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: `Failed to compute capability strength profile: ${message}` }, { status: 500 });
    }
}
