Principle 1
Job Interpretation Comes Before Candidate Matching

CareerTwin must interpret the job before evaluating the candidate.

The system should first determine:

What kind of job this is

before deciding:

Why the candidate fits or does not fit.

Implication:

JD signals define the explanation frame

Candidate strengths cannot redefine the job

Explanation must be anchored in job interpretation

Principle 2
Domain Signals Outrank Generic Signals

When interpreting a job description, signals must be prioritized by interpretation layer, not by raw frequency or score.

Priority order:

1 Domain-defining signals
2 Functional role signals
3 Work-mode signals
4 Generic transferable signals

Examples:

Domain signals:

MMM

Google Ads

legal workflows

data platform migration

Functional role signals:

analytics leadership

product management

consulting delivery

Work-mode signals:

stakeholder leadership

reporting

dashboards

cross-functional work

Generic signals:

strategic thinking

insight storytelling

Explanation must follow this hierarchy.

Principle 3
Domain Anchoring Shapes Explanation

Once a domain family is detected, explanation must be anchored to that domain.

Example:

marketing + analytics leadership

should produce:

marketing analytics leadership

not:

generic analytics leadership

All major sections must reflect the domain:

Career Insight

Why Fit

Potential Risk

Quick Checks

Principle 4
Candidate Strengths Cannot Override Domain

Even if the candidate has strong generic capabilities, the system must not reinterpret a domain-specific role as a generic role.

Example:

A marketing measurement role should not be explained as:

stakeholder leadership role

even if the candidate's strongest evidence is leadership.

The system must preserve job identity.

Principle 5
Explanations Must Be Job-Specific

Different jobs should produce visibly different explanations.

Two adjacent jobs should not generate the same explanation simply because the candidate profile is the same.

Explanation diversity should come from:

domain signals

role signals

requirement clusters

Principle 6
Calibration Questions Must Reflect Job Uncertainty

Quick checks should not be generic skill questions.

They must target:

unresolved job-defining signals

Examples:

Marketing measurement role:

measurement methods

ad platform exposure

Data platform role:

architecture

platform migration

Product analytics role:

experimentation

product metrics

Principle 7
Deterministic First, LLM Later

Phase 1 systems must prefer:

deterministic + inspectable logic

before introducing LLM classification.

Reasons:

auditability

predictable behavior

easier debugging

lower cost

LLM augmentation can be considered only after deterministic logic stabilizes.

Principle 8
Configuration Over Hardcoding

Domain interpretation should be driven primarily by configurable signal bundles, not scattered if/else logic.

Maintenance should involve:

adding signals
tuning weights
adding specialization hints

rather than rewriting detector logic.

Principle 9
The Job Defines the Narrative

CareerTwin is not a resume summarizer.

It is a job interpretation system.

The narrative should always answer:

How this candidate relates to THIS job.

not:

What this candidate is generally good at.