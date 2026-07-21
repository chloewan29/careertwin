Status
- reference
- cv-line overview layering

Default Read
- no

When To Read
- when a simplified high-level explanation of CV layers is useful
- when orienting someone new to the CV pipeline

Do Not Use For
- primary execution-layer diagnosis
- first writable fault isolation
- detailed owner routing
# Resume / CV Layer Rule

## Purpose

This document defines the layered operating rule for Resume / CV work so tailoring fixes stay in the right layer.

## Authority Position

- This is a simplified high-level layer map for explanation and orientation.
- It is useful for onboarding and quick alignment on CV pipeline shape.
- It is not the primary execution-layer authority for bounded diagnosis and repair admission.
- Primary execution layering for substantial CV-line work is the A/B/C/D/E model in `job-copilot-cvline-architecture.md`.

## Core Rule

- Diagnose the failing layer before code changes.
- Do not patch downstream wording when the target-role read or asset selection is wrong.
- Fix the highest-priority failing layer first.

## Layer 1: Target-Role Reading

### Purpose

Read the target role correctly:
- main role subject
- supporting themes
- role hierarchy
- what the CV must prove

### Inputs

- job description
- job title
- company context
- role-family / requirement interpretation

### Outputs

- target-role subject
- supporting themes
- rewriting target direction

### NGO / pass criteria

- CV tailoring aims at the true target role
- supporting themes do not replace the real role target

### Failure symptoms

- the whole CV is tailored toward the wrong role family
- the target role is read too generically or too narrowly

## Layer 2: Career Asset Selection

### Purpose

Select the right evidence, experiences, and bullets from career memory for the target role.

### Inputs

- target-role reading
- candidate evidence inventory
- canonical evidence links / selected evidence set

### Outputs

- chosen experiences
- chosen evidence pieces
- chosen bullet source material

### NGO / pass criteria

- strongest, most relevant assets are selected
- generic or adjacent evidence does not displace better role-native evidence

### Failure symptoms

- tailoring uses the wrong experiences
- selected bullets are too generic
- adjacent evidence is chosen over more relevant proof

## Layer 3: Role-Aligned Rewriting

### Purpose

Rewrite chosen evidence into role-aligned CV language without changing meaning.

### Inputs

- selected assets
- target-role subject
- rewriting guidance / summary framing

### Outputs

- tailored summary
- tailored bullets
- role-aligned phrasing

### NGO / pass criteria

- rewritten bullets still mean the same thing
- wording aligns to the target role
- no hallucinated ownership or unsupported specificity

### Failure symptoms

- bullets sound like the wrong family
- rewriting is generic or fake-tailored
- ownership inflation appears

## Layer 4: CV Rendering

### Purpose

Render the already-selected and rewritten content into the final CV structure.

### Inputs

- selected experiences
- rewritten bullets
- layout/render formatting

### Outputs

- final CV document / view-model

### NGO / pass criteria

- ordering is coherent
- formatting is consistent
- no display-only corruption of already-correct content

### Failure symptoms

- content is right but ordering/layout is confusing
- formatting introduces contradictions or omissions

## Diagnosis Rule

Before changing CV code, state:
1. failing layer
2. reason for diagnosis
3. out-of-scope layers
4. allowed files
5. replay validation cases
