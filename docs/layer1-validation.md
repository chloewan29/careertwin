# Layer 1 Validation Playbook

## Current Layer 1 Focus
The current Layer 1 issue is drift across this chain:
- raw Layer 1 output
- parsed contract
- consumed / authoritative contract

## First Drift Point Rule
For each case, locate the first point where meaning changes:
1. if raw output is already wrong, drift starts at raw generation
2. if raw is correct but parsed is wrong, drift starts at parsing/normalization
3. if parsed is correct but consumed is wrong, drift starts at contract transport/consumption

Do not assign root cause before this first-drift check.

## Narrow Validation For Layer 1 Fixes
Default iterative validation:
1. run `npm run verify:daily`
2. inspect 1-3 representative Layer 1 cases (include SCAR4 when relevant)
3. optionally include one stable native-owner case as a regression guard

For each checked case, report:
- raw output summary
- parsed contract summary
- consumed / authoritative contract summary
- first drift point
- improvement or no improvement

## Model-Problem Label Rule
Do not label a case as a model problem unless raw output is already incorrect.
If raw output is correct, treat drift as a Layer 1 contract-formation/parsing/consumption issue first.
