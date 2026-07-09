CareerTwin Product Principles v1
Purpose

This document defines the current product principles for CareerTwin Phase 1.
Its purpose is to keep product, architecture, UX, and implementation aligned while CareerTwin is still in the Job Copilot stage.

CareerTwin has a broader long-term vision as a career companion built on career memory.
However, in the current phase, the product must remain sharply focused on one immediate user value:

Help the user understand whether they should apply for a job, why, and how to position themselves — grounded in their real experience.

This document exists to prevent product drift, feature sprawl, generic AI behavior, and UI / architecture inconsistency.

1. Current Product Definition
CareerTwin in Phase 1

CareerTwin is an evidence-grounded Job Copilot.

It is not currently a broad career coach, a generic AI assistant, or a general-purpose career chat tool.

Its Phase 1 job is simple:

Before the user applies, help them understand their real fit for a role and how to position themselves truthfully and effectively.

Current external value promise

Know your real fit before you apply.

Supporting explanation:

CareerTwin uses your real experience to tell you whether to apply, why, and how to position yourself.

What CareerTwin should not lead with in Phase 1

The following may be true internally, but should not be the primary external framing in the current phase:

career replica
capability graph
career memory engine
long-term career companion
promotion / performance review / transition system
broad multi-scenario intelligence platform

These belong to the deeper system truth, not the first user-facing promise.

2. Product North Star

The current north star is not feature count, UI richness, or model sophistication.

North star

Make the job verdict feel clear, stable, and trustworthy because it is grounded in the user’s real evidence.

CareerTwin succeeds in Phase 1 when the user feels:

The verdict is clear
I understand whether I should apply, why, what the main risk is, and how to position myself.
The verdict is stable
The sidepanel, quick checks, recommendation, resume emphasis, and later interview outputs all feel like they come from the same judgment.
The verdict is grounded
This is not generic AI advice or keyword guessing. It is based on my real experience.
3. Core Product Principles
Principle 1: Sell the result first, not the system

CareerTwin may have a complex internal system, including career memory, capability inference, job intelligence, and multiple copilot layers.

The user should not experience that complexity first.

The user should experience a result first.

The front-stage product must prioritize:
Apply recommendation
Why this role fits
Biggest risk
How to position yourself
Tailored CV output
Job-specific calibration questions
The front-stage product must not prioritize:
architecture explanation
capability taxonomy exposure
internal engine language
broad system framing before user value is proven
Product rule

The user should encounter a finished judgment, not a visible internal system.

Any front-end feature should be evaluated by asking:

Does this help the user more quickly understand whether to apply, why, and how to position themselves?

If not, it should not compete for front-stage priority.

Principle 2: Evidence grounding must be productized

CareerTwin’s strongest differentiator is not that it can generate outputs.

Its strongest differentiator is:

Its judgments are grounded in real work evidence.

That grounding must not remain hidden in the backend.
It must be expressed as product trust.

Every important output should be traceable to evidence logic

At minimum, the system should know the basis for:

primary fit claim
main risk
quick check question basis
positioning suggestion
resume emphasis
interview emphasis
Product implication

The user does not need to see every raw internal object.
But the product must make the user feel:

this fit claim came from something real in my background
this risk is based on a specific missing or weak proof area
this question is being asked for a reason
this resume emphasis is not random rewriting
Trust standard

The goal is not merely:

“This sounds reasonable.”

The goal is:

“I can tell why the system is saying this.”

Principle 3: One job must produce one authoritative story

For any given job, CareerTwin must present one coherent story.

It must not allow different output surfaces to re-interpret the job independently and drift apart.

This means the following must align:
panel headline
fit explanation
primary requirement context
quick checks
main risk
positioning guidance
resume emphasis
recommendation framing
interview direction
Product rule

A single job can only have one authoritative story.

This is not only an architecture rule.
It is a core trust rule.

If the panel says one thing, the quick checks imply another thing, and the resume emphasizes a third thing, the user will conclude the system is unstable.

System implication

Selection ownership must happen upstream in the authoritative matching / selection layer.

The renderer / output layer must not re-select:

primary axis
anchor theme
primary risk
entry angle
CTA framing

The renderer should only consume and shape authoritative output.

Principle 4: Quick checks are a calibration system, not a chat system

Quick checks do not exist to make the product feel conversational.

Quick checks exist to improve decision quality.
They also help confirm and enrich missing career memory that is directly relevant to the current job decision.

Quick checks should be:
job-specific
tied to the current job’s most important requirement clusters
based on unresolved or weak proof areas
concrete
low in number
capable of changing the verdict or explanation
Quick checks should not be:
generic onboarding questions
broad capability surveys
personality questions
open-ended AI conversation for its own sake
“smart sounding” but low-impact interaction
Product rule

Each quick check must exist because removing it would reduce decision quality.

Desired user feeling

The user should not feel:

“The AI is asking me more questions.”

The user should feel:

“The system is filling in a specific missing part of this job decision.”

Principle 5: Job Copilot is the default product entry point

CareerTwin’s long-term vision is broader than job search.
However, the first product entry point must stay narrow.

Phase 1 entry point

Job Copilot is the default entry point.

Not:

broad career companion
general career Q&A assistant
generic resume tool
generic interview practice tool
broad life / work coach
Why this matters

Job Copilot is the strongest current entry point because it is:

concrete
decision-oriented
high frequency
easy for users to understand
naturally connected to resume and interview workflows
best suited to showcase evidence-grounded differentiation
Product rule

Users should first understand CareerTwin through a real job decision.

Only after that should they gradually realize that CareerTwin is powered by a deeper career memory system.

Principle 6: New features must increase current decision value and/or career memory

CareerTwin should not become a collection of smart-looking but non-compounding features.

Feature filter

Every new feature should be tested against two questions:

Does it improve current job decision clarity, trust, or actionability?
Does it increase career memory?
Quick-check-driven memory enrichment is a direct example of a feature that should improve both.
Prioritization guidance
If neither is true, do not build it.
If only one is weakly true, be cautious.
If both are true, prioritize it.
Product rule

Do not build features that neither sharpen job decisions nor strengthen career memory.

This is especially important because CareerTwin is vulnerable to feature drift into:

generic AI summaries
visually interesting but low-value panels
broad career advice without accumulation
non-memory-enhancing interaction
one-off output generation with no long-term system benefit
4. Product Implications by Surface
A. Landing Page

The landing page should not attempt to explain the full long-term CareerTwin system.

Its job is to make the user understand three things immediately:

What it does
Why it is different
What happens if I try it now
Recommended landing page message structure
Primary line

Know your real fit before you apply.

Supporting line

CareerTwin uses your real experience to tell you whether to apply, why, and how to position yourself.

Immediate proof points
Apply recommendation
Evidence-based fit reasoning
Role-specific positioning guidance
Tailored CV support
Landing page should avoid leading with:
architecture complexity
excessive feature grids
abstract capability language
long-term scenario expansion
broad “career platform” messaging before user value is concrete
Landing page rule

The landing page sells the first job decision, not the whole future system.

B. Sidepanel

The sidepanel is the core Phase 1 product surface.
Job Copilot sidepanel framing should be treated as a buying-case builder, not a match explainer.
For detailed sidepanel-specific principles, see `docs/product/careertwin-sidepanel-product-principles.md`.
`Why you` should be treated as a buying-case section, not a relevance summary.
For detailed `Why you` evaluation and design rules, see `docs/product/why-you-buying-case-checklist.md`.

Its purpose is not to display system richness.
Its purpose is to deliver a fast, credible, actionable decision in the context of a live job.

The sidepanel should consistently answer:
Should I apply?
Why does this fit?
What is the main risk?
What should I clarify?
How should I position myself?
What could this role newly add or strengthen for me?
The sidepanel should not become:
a broad career analysis dashboard
a capability taxonomy browser
an information wall
a generic AI chat surface
a multi-purpose research tool
Sidepanel rule

Be narrow, sharp, and decisive.

Less surface area is acceptable if the judgment is stronger.

C. Resume Copilot

Resume Copilot is not a separate interpretation layer.

It should be a downstream proof artifact of the same authoritative story chosen by Job Copilot.

Resume Copilot must:
consume the same authoritative selection context
consume post-quick-check clarified context and any unlock-informed positioning implication already established upstream
reinforce the same primary requirement story
strengthen the same positioning line
avoid introducing a conflicting role narrative
Resume rule

The resume must prove the job verdict, not invent a new one.

If the generated resume tells a different story from the panel, the system has drifted.

D. Interview Copilot

Interview Copilot should not be a generic interview trainer.

It should convert the Job Copilot verdict into job-specific interview preparation.

Interview Copilot should help the user prepare for:
likely questions tied to the role’s key requirements
risk areas surfaced by the job verdict
real-evidence storytelling relevant to this job
the most important proof themes to prepare
Interview rule

Interview preparation must extend the same authoritative story, not fork it.

Question generation, answer framing, and coaching should all be grounded in the same job-specific logic already established upstream.

5. Implementation Guardrails

These are product guardrails with implementation consequences.

Guardrail 1: Renderer is consumer-only

Output layers may handle:

contract assembly
view-model mapping
phrasing
display shaping
formatting for specific surfaces

Output layers must not re-decide:

primary axis
primary evidence theme
main gap
main risk
entry angle
recommendation narrative
Guardrail 2: Calibration questions must map to decision uncertainty

Every quick check should have a clearly defined basis in:

unresolved requirement
weak proof area
high-priority requirement ambiguity
missing experience confirmation

If that basis is not clear, the question should not exist.

Guardrail 3: Recommendation, panel, resume, and interview must stay aligned

No downstream surface should create a new interpretation of the role unless explicitly authorized by upstream contract.

Guardrail 4: Broad-role and specialist-role integrity must be preserved

If upstream selects a broad leadership framing, downstream outputs must remain broad.

If upstream selects a specialist framing, downstream outputs must remain specialist.

Downstream phrasing must not collapse broad roles into narrow domains or flatten specialist roles into generic leadership language.

6. Phase 1 Success Criteria

Phase 1 is successful when the user experiences CareerTwin as:

fast to understand
credible
specific to the current job
grounded in real experience
more useful than generic job fit tools
coherent across outputs
strong enough to influence apply / not-apply behavior
The target user feeling is:

“This tool actually understands my background and gives me a grounded decision about this role.”

Not:

“This is a smart AI.”
“This is a broad career platform.”
“This seems to know lots of career concepts.”
7. Product Decision Filter

Use the following filter before adding any new feature, module, or visible surface.

CareerTwin Product Filter
Does this help the user understand whether they should apply?
Does this help the user understand why?
Does this make the judgment more evidence-grounded?
Does this stay aligned with the authoritative story?
Does this increase career memory?
Decision guidance
If fewer than 3 answers are clearly yes, do not prioritize it.
If it improves appearance but not trust or decision quality, deprioritize it.
If it creates visible intelligence but not compounding memory, deprioritize it.
If it strengthens both decision quality and career memory, prioritize it.
8. Final Principle

CareerTwin should not lead by saying:

“I am a powerful career twin system.”

CareerTwin should lead by proving:

“I use your real experience to tell you whether this role is worth applying to, and how to prove your fit.”

If that is done well, users will gradually discover the deeper truth:

CareerTwin is not just a job tool. It is building their career memory underneath.

But that realization should come through use, not through early over-explanation.
