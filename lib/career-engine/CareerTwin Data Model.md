# CareerTwin Data Model

CareerTwin is a **Career Intelligence System**.

It is not just a resume tool or job hunter. It is a long-term AI companion that mirrors a person's career using structured career evidence.

The core system objects are:

- Career
- Experience
- EvidencePiece
- Capability
- JobSignal

---

## Core Model Principles

### 1. Career is the root container
A Career represents the user's professional identity and acts as the root object for all career data.

### 2. Experience is the timeline layer
Experience preserves the familiar career timeline used for display, organization, and regrouping.

### 3. EvidencePiece is the intelligence layer
EvidencePiece is the core unit of career memory and the primary unit used for inference, matching, and tailoring.

### 4. Capability is the inference layer
Capabilities are inferred from EvidencePieces and must remain traceable back to real evidence.

### 5. JobSignal is the target-role layer
JobSignal represents the structured understanding of a target job description or market role.

### Key design rule

> Experience is the timeline layer.  
> EvidencePiece is the intelligence layer.  
> Capability is the inference layer.

Another key rule:

> Resume is only one view of Career Memory.

---

## Entity Overview

### Career

Represents the user's overall career identity.

\`\`\`ts
interface Career {
  id: string
  user_id: string

  headline?: string
  summary?: string
  total_years_experience?: number

  created_at: string
  updated_at: string
}
\`\`\`

---

### Experience

Represents a career timeline entry such as a role at a company.

\`\`\`ts
interface Experience {
  id: string
  career_id: string

  company: string
  title: string
  date_range: string

  location?: string
  summary?: string

  source_type?: "resume" | "linkedin" | "manual"

  created_at: string
  updated_at: string
}
\`\`\`

Notes:
- Experience is not the primary intelligence unit.
- It mainly supports timeline display and regrouping into resume output.

---

### EvidencePiece

Represents a real unit of professional evidence.

Examples:
- a work action
- a measurable outcome
- a leadership example
- a transformation initiative
- a stakeholder management example

\`\`\`ts
interface EvidencePiece {
  id: string
  career_id: string
  experience_id: string

  company: string
  role: string
  date_range: string

  raw_text: string
  normalized_text?: string

  source_type: "resume_bullet" | "linkedin" | "manual" | "interview"

  role_family?: string
  domains?: string[]
  skills?: string[]
  capabilities?: string[]

  leadership?: boolean
  team_size?: number
  stakeholder_level?: string[]
  initiative_type?: string[]
  impact_type?: string[]

  created_at: string
  updated_at: string
}
\`\`\`

Notes:
- This is the most important object in CareerTwin.
- Tailoring, matching, and inference should operate on EvidencePieces.
- Generated outputs must trace back to `EvidencePiece.raw_text`.

---

### Capability

Represents an inferred professional capability supported by evidence.

\`\`\`ts
interface Capability {
  id: string
  career_id: string

  name: string
  normalized_name: string

  evidence_piece_ids: string[]

  confidence?: number
  strength?: number

  created_at: string
  updated_at: string
}
\`\`\`

Examples:
- Program Delivery
- Stakeholder Management
- Analytics Strategy
- Transformation Leadership

Notes:
- A capability must always be traceable to supporting EvidencePieces.
- Capabilities should not exist as unsupported labels.

---

### JobSignal

Represents the structured understanding of a target role or job description.

\`\`\`ts
interface JobSignal {
  id: string
  job_id: string

  target_title?: string
  role_family?: string
  seniority?: string

  required_skills?: string[]
  preferred_skills?: string[]
  responsibilities?: string[]
  domains?: string[]
  keywords?: string[]

  created_at: string
  updated_at: string
}
\`\`\`

Notes:
- JobSignal is derived from the target job description.
- It powers matching, gap analysis, and tailored output generation.

---

## Relationships

\`\`\`
Career
 ├─ Experience[]
 │    └─ EvidencePiece[]
 │
 └─ Capability[]  ← inferred from EvidencePiece[]

Job
 └─ JobSignal
\`\`\`

Operational relationship:

\`\`\`
EvidencePiece[] + Capability[] + JobSignal[]
↓
matching / tailoring / transition / promotion / gap analysis
\`\`\`

---

## MVP-Critical Fields

The MVP does not need the full long-term model immediately.

### Minimum required now

#### Career
- id
- user_id

#### Experience
- company
- title
- date_range

#### EvidencePiece
- company
- role
- date_range
- raw_text
- source_type

#### Capability
- name
- evidence_piece_ids

#### JobSignal
- required_skills
- preferred_skills
- responsibilities
- role_family
- domains
- keywords

This minimum model is enough to support:
- capability inference
- job matching
- evidence-based resume tailoring
- basic career profile

---

## Guardrails

### No Fabrication
CareerTwin must never fabricate professional experience.

### Evidence Traceability
All generated outputs must trace to real EvidencePieces.

### Output Preservation
When rebuilding resume output:
- preserve company exactly
- preserve title exactly
- preserve date_range exactly

### Evidence-First Reasoning
Matching and tailoring should operate on EvidencePieces rather than directly on resume entries.

---

## Long-Term Extensions

These fields are useful later, but are not required for MVP.

### EvidencePiece extensions
- embedding
- impact_metrics
- seniority_signal
- confidence
- source_reference
- evidence_quality_score

### Capability extensions
- level
- growth_trend
- last_evidence_at
- role_family_affinity

### Career extensions
- target_roles
- career_goals
- career_stage
- preferred_directions

### JobSignal extensions
- must_have_requirements
- leadership_scope
- operating_model
- transformation_type

---

## Product Meaning

CareerTwin is not fundamentally a resume rewriting system.

It is a **Career Memory + Intelligence System** built on:
- Experience as timeline
- EvidencePiece as memory
- Capability as inference
- JobSignal as target understanding

This model should guide engineering, product design, and future feature prioritization.
