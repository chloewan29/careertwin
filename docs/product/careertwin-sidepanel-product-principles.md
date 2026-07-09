CareerTwin Sidepanel Product Principles
Purpose

This document defines sidepanel-specific product principles for Job Copilot.
It complements `docs/product/careertwin-product-principles.md` and should be used when making sidepanel product and UX decisions.

The sidepanel is not a generic match explainer.
It is a buying-case builder that helps the user decide whether to apply and how to present a credible case.

1. Sidepanel Product Frame

Primary frame

The sidepanel should answer the hiring decision question:

Should this user pursue this role now, and on what proof basis?

The sidepanel should not behave like:
- a score wall
- a capability taxonomy browser
- an abstract job-match explainer
- a generic AI summary panel

Product rule

Treat each output surface as part of one buying case, not independent commentary.

2. Buying Logic First

Sidepanel output should lead with buying logic:
- what is buyable now
- what risk blocks buyability
- what proof closes the decision

Do not lead with abstract category language if role-grounded proof is available.
Do not prioritize broad analytics stems over role-defining evidence when both exist.

3. Evidence Is Buying Proof

Evidence in sidepanel is not decorative context.
It is the proof used to justify the decision.

For each major output, the user should be able to infer:
- what evidence supports fit
- what evidence is missing or weak
- why the recommendation follows from that evidence

Trust standard

The user should feel:
"This recommendation is based on real proof."

Not:
"This sounds plausible but generic."

4. Surface Roles As Buying Questions

Each sidepanel surface has a fixed buying function:

- `Why you`: Why the candidate is currently buyable for this role.
- `Biggest risk`: The main proof gap or credibility gap that still blocks confidence.
- `Quick checks`: The smallest questions that would most improve the decision by confirming missing proof and clarifying/enriching job-relevant career memory.
- `What This Role Adds`: What this role would add or strengthen in the user's career assets (ownership, credibility, scope, and leverage).
- `How to position yourself`: How to present existing proof without inventing new claims.
- `Apply recommendation`: The operational decision under current evidence.

Rule

If a surface cannot be tied to a buying question, it should not expand in scope.

What This Role Adds boundary rules

- What This Role Adds is post-quick-check.
- What This Role Adds is a thin, evidence-led consumer assembly from existing sidepanel outputs.
- What This Role Adds is not a second `Why you`.
- What This Role Adds is not a second `Biggest risk`.
- What This Role Adds is not a long-term career forecast.
- What This Role Adds is not a new inference layer.

5. Style: Short, High-Conviction, Evidence-Led

Sidepanel language should be:
- concise
- specific
- role-relevant
- evidence-led

Avoid:
- long taxonomy-heavy explanation
- repetitive generic stems
- soft, hedged filler language
- verbosity that lowers action clarity

6. Prefer Proof Gap Over Skill Gap

When diagnosing risk, prefer proof framing over abstract skill framing.

Use:
- "insufficient evidence for requirement X in this role context"

Avoid defaulting to:
- "missing skill Y" without role-grounded proof context

This keeps guidance honest, actionable, and less generic.

7. Expansion Gate: Sidepanel Trust Before Interview

Do not expand continuation into interview paths by default until sidepanel output quality is trustworthy.

Minimum expectation before expansion:
- evidence-led `Why you` output
- meaningful risk statement
- useful quick checks
- coherent recommendation alignment across panel surfaces

If sidepanel output quality is not yet credible, prioritize sidepanel quality hardening first.

8. Differentiation Versus Market Tools

CareerTwin sidepanel should differentiate by:
- hiring-decision usefulness, not match-score theater
- evidence-backed recommendation, not generic advice
- coherent multi-surface judgment, not disconnected tips
- proof-gap clarity, not buzzword-rich summaries

Product outcome target

The user should leave with:
- a clear apply decision
- a clear proof-backed reason
- a clear next action to improve buyability
- a clear sense of what this role could newly add or strengthen
