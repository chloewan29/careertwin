# Job Copilot Human Verdict Benchmark

## Purpose
This benchmark defines the human-judged gold standard for Job Copilot sidepanel quality.
It is used to evaluate whether outputs are trustworthy from a hiring-side decision perspective, not only internally consistent with system debug traces.

## Why Human Verdict Is The Gold Standard
Internal debug signals are diagnostic.
Human evaluation is the final quality authority.

A sidepanel output is correct only when a human evaluator agrees it reflects:
1. what the role is actually buying;
2. why the candidate is credible for that buy-side demand;
3. which evidence best proves the active buying points;
4. what risk matters most;
5. what career capital the role adds;
6. what CTA positioning angle is most useful.

## Surfaces Evaluated
The benchmark evaluates:
1. Career Verdict
2. Why You
3. Biggest Risk
4. Quick Checks
5. What This Role Adds
6. CTA / Tailored CV angle
7. Cross-surface consistency

## Layer Authority Relationship
Architecture authority remains:
1. Layer 1 owns the job buying contract.
2. Layer 3 owns evidence attachment and evidence selection.
3. Layer 4 renders only and must not reinterpret selected evidence.
4. Human verdict evaluates final output quality across these surfaces.

## Fixture Rule
Benchmark cases are acceptance fixtures, not production hard-code.
They must never be used as runtime overrides, evidence-ID forcing logic, or case-ID conditionals in product selection code.

## Scoring Rubric
Each evaluated surface uses:
1. `2` = human-safe, clearly supports the buy-side thesis
2. `1` = partially aligned, generic/weak/incomplete
3. `0` = wrong, misleading, overclaimed, or trust-risky

Overall posture:
1. `GREEN` = safe to show
2. `YELLOW` = usable but watchlist
3. `RED` = trust-risky

## How To Use During Repair
Use this loop:
1. Freeze replay for the target cases.
2. Compare current output against human verdict fixture expectations.
3. Identify repeated failure pattern(s), not one-off case quirks.
4. Repair one general rule in bounded scope.
5. Re-validate against the same benchmark cases and control cases.

## Explicit Warnings
Do not treat broad JD relevance as proof.
Do not let generic leadership evidence beat explicit buying-point proof.
Do not let renderer logic reinterpret or replace Layer 3 selected evidence meaning.

## No-Proof Routing Rule
`No-Proof Routing Rule` is a product/architecture safety rule for Job Copilot:

Why You is a proof surface, not a gap-filling surface.
A buying point may appear in Why You only when defensible proof exists.

If best available evidence is only:
1. adjacent/contextual,
2. generic leadership/translation/posture,
3. coverage `none`,
4. low strength,

then Job Copilot must not overclaim that buying point in Why You.

Routing behavior for unproven buying points:
1. If important to hiring decision, route to Biggest Risk.
2. If user confirmation could resolve uncertainty, route to Quick Check.
3. If it is upside/stretch rather than proven current capability, route to What This Role Adds.
4. If no safe claim can be made, omit it from Why You.

## Intentional TBD Benchmark Semantics
`expected_evidence_id = "TBD"` is valid when human adjudication concludes there is no defensible proof in the current evidence state.

This is not benchmark incompleteness by default.
It is an explicit no-proof gold label:
1. do not force-fill with weak evidence;
2. do not treat unresolved-by-design slots as fixture failure;
3. use them to block overclaiming and to trigger no-proof routing behavior.
