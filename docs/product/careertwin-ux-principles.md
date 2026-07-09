CareerTwin UX Principles v1
Purpose

This document defines the user experience principles for CareerTwin Phase 1.

Its purpose is to ensure that CareerTwin’s interface, interaction model, and visible outputs feel:

clear
credible
grounded
job-specific
stable
action-oriented

CareerTwin is not a generic AI chat product.
Its UX should not optimize for open-ended conversation, novelty, or surface complexity.

Its UX should optimize for one thing first:

Help the user quickly understand whether they should apply, why, what the main risk is, and how to position themselves.

1. UX must present a decision, not a system

The user should feel they are receiving a clear job decision, not exploring a complex internal engine.

The interface should foreground:
apply recommendation
why this fits
biggest risk
positioning guidance
job-specific calibration questions
resume / interview next actions
The interface should not foreground:
backend complexity
capability taxonomy
architecture concepts
abstract scoring components
multiple competing narratives
UX rule

The product should feel like a finished judgment, not a visible reasoning machine.

2. Clarity beats richness

CareerTwin should prefer a small number of high-value outputs over a dense or impressive-looking interface.

Good UX in Phase 1 means:
fewer sections
stronger hierarchy
less duplication
less explanatory clutter
faster understanding
Bad UX in Phase 1 means:
too many cards
too many parallel labels
too much analysis on first view
repeated concepts phrased differently
surfaces competing for attention
UX rule

If a UI element adds complexity without improving decision clarity, remove or demote it.

3. The recommendation must be immediately legible

The most important judgment should be understandable within seconds.

The user should quickly understand:
Should I apply?
How strong is the fit?
What is the main reason?
What is the main risk?
What should I do next?
UX implication

The recommendation should not be buried under long explanation blocks or secondary modules.

The first visible layer should communicate:

decision
fit direction
confidence / strength cue
next action direction
UX rule

The primary verdict must be scannable before anything else.

4. One job must feel like one coherent story

The UI must never make the user feel that different parts of the product are telling different stories.

This means the following must align visually and conceptually:
headline
fit summary
risk framing
quick checks
positioning guidance
resume direction
interview direction
UX rule

Every visible surface should reinforce the same job-specific story.

If two sections feel like they are describing different versions of the user, the UX has failed even if the backend logic is technically explainable.

5. Evidence grounding should be felt, not dumped

CareerTwin’s trust comes from evidence grounding.
But good UX does not mean exposing raw system objects everywhere.

The goal is not to overwhelm the user with evidence detail.
The goal is to make the judgment feel traceable and real.

Good evidence UX should communicate:
this claim comes from your real background
this risk is based on a specific missing or weak proof area
this question is being asked for a reason
this recommendation is not generic AI text
Bad evidence UX includes:
raw internal labels
overly technical explanation
dense evidence inventories
long proof dumps in the main view
UX rule

Evidence should increase trust, not increase cognitive load.

6. Quick checks are calibration moments, not conversations

Quick checks should feel purposeful and tightly connected to the live job decision.

They should not feel like generic onboarding or chatbot filler.

Good quick checks feel like:
a missing proof confirmation
a targeted clarification
a precise decision refinement step
Bad quick checks feel like:
broad capability surveys
abstract self-description prompts
unnecessary AI conversation
questions with no visible effect on outcome
UX rule

Every quick check should feel like it sharpens the verdict.

The user should understand why the question matters, even if that reason is expressed simply.

7. The product should stay narrow in each moment

CareerTwin may become a multi-scenario product over time, but in each screen, the user should feel that the product is focused on one immediate task.

In the job sidepanel, the task is:

understand this job decision

In resume flow, the task is:

prove this job fit

In interview flow, the task is:

prepare to defend this job fit

UX rule

Each surface should feel single-purpose, even if the overall system is broader.

8. Actionability is part of UX, not a separate layer

A good CareerTwin screen should not end at insight.
It should naturally lead to action.

The product should help the user move from:
verdict
to positioning
to proof
to application action
to interview preparation
UX implication

Each major output should imply or enable the next useful step.

Examples:

recommendation → apply / hold / skip
risk → quick check or mitigation
positioning guidance → resume emphasis
fit explanation → interview preparation
UX rule

Insight without next-step movement is incomplete UX.

9. Reduce cognitive switching

The user should not need to mentally re-interpret themselves across different product surfaces.

If the user feels like they must constantly re-learn:

what the role is
what the system thinks they are
why the fit exists
what the risk is

then the UX is too fragmented.

UX rule

Do not make the user reconstruct continuity between surfaces.

Continuity should be designed into:

language
emphasis
narrative
action flow
10. Trust comes from stability, specificity, and restraint

CareerTwin should not try to impress the user by sounding overly smart or overly expansive.

It should build trust through:

stable judgment
specific language
grounded claims
restrained UI
visible relevance to the current job
UX rule

Do not optimize for “AI impressiveness.” Optimize for believable usefulness.

11. Phase 1 UX hierarchy

When screen space is limited, the following order should guide prioritization:

Highest priority
recommendation
why fit
biggest risk
quick checks
positioning guidance
Secondary priority
tailored resume action
interview preparation action
deeper supporting detail
Lowest priority
system explanation
abstract capability breakdown
exploratory or decorative analysis
UX rule

If something competes with the decision core, it should usually lose.

12. Final UX principle

CareerTwin UX should make the user feel:

This tool understands my background, gives me a grounded decision on this role, and helps me act on it immediately.

It should not make the user feel:

this is a generic chat UI
this is a dashboard full of AI analysis
this is a complex career theory product
this is trying to impress me more than help me
