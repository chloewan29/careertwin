# Matching Alignment Audit: Publicis Analytics Manager

## Artifact paths
- Structured replay audit: `tmp-publicis-audit.json`
- Seeded benchmark comparison: `tmp-human-alignment-benchmark.json`
- Benchmark fixture seed: `scripts/fixtures/human-alignment-benchmark.seed.json`

## Publicis case summary
- Baseline v1 score: `50.94`
- Improved v2 score: `51.63`
- Improved human bucket: `medium_fit`
- New title prior effect: `adjacent`, penalty `0.004`
- New domain prior effect: `direct`, penalty `0`
- Tailoring reasoning: recommend tailoring with caution; role is viable but needs stronger emphasis on highest-signal evidence

## Top 5 reasons the original system under-scored the case
1. It reduced the job to a flat capability list instead of modeling the mission of translating analytics into creative, CX, and commercial outcomes.
2. It treated literal canonical capability coverage as the main signal, so transferable evidence in strategy, insight storytelling, and adjacent analytics work was under-credited.
3. Title and ATS priors were able to influence the overall decision more than they should for a role-family-adjacent candidate.
4. Literal keyword/tool overlap had too much influence relative to scope, ownership, and evidence quality.
5. It did not distinguish blocking gaps from stretch gaps, so narrative-sensitive requirements looked too close to hard rejects.

## Seed benchmark delta
- Baseline bucket agreement: `0.30`
- Improved bucket agreement: `0.35`
- Baseline over-reject rate: `0.25`
- Improved over-reject rate: `0.00`
- Baseline over-accept rate: `0.05`
- Improved over-accept rate: `0.00`
- Baseline average score on human-high-fit cases: `31.19`
- Improved average score on human-high-fit cases: `50.90`

## Remaining gap
- The improved scorer now removes the worst over-rejection pattern, but several human-high-fit cases still land in `medium_fit` rather than `high_fit`.
- Broader separation work is still needed for adjacent analytics/insights/strategy roles versus medium-fit transformation roles.
