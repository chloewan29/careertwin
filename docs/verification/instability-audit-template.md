# Instability Audit Output Template

Use this template for instability/drift/weird-gate/recurring-family audit passes.
Keep statements evidence-backed and mode-disciplined.

## 1. Case summary
- What instability was observed
- Why it matters
- Current classification

## 2. What is already proven
- Supported findings only

## 3. What is not yet proven
- Remaining uncertainty
- Boundaries not yet isolated

## 4. Layer-by-layer narrowing result
- Input fixed?
- Random vs cluster-shaped drift?
- Cold-start split vs warmed lock?
- First visible difference?
- Earliest supported owner?
- Inherited downstream differences vs newly introduced downstream differences?

## 5. Semantic delta / feature attribution
- Key semantic delta fields
- Candidate semantic bundle / feature flags
- Confidence level
- Cross-family robustness status

## 6. ROI judgment
- Is further audit still high value?
- Is the current line now low-return?
- Are rare-family sampling limits now dominant?

## 7. Recommended next mode

Choose exactly one:
- `freeze/park`
- `continue audit`
- `candidate control-surface exploration`

## 8. Why this mode is correct now
- Why this branch is correct now
- Why not the nearest wrong branch

## 9. Suggested next smallest action (optional)
- Include only when the mode is not `freeze/park`
- Keep it narrow, executable, and mode-consistent

