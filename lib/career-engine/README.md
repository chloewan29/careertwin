Career Engine

The Career Engine is the core intelligence layer of CareerTwin.

CareerTwin is a Career Intelligence System that mirrors a user's professional history and provides guidance across multiple career scenarios.

This engine operates on career evidence, not just resumes.

The fundamental data unit of the system is:

EvidencePiece

An EvidencePiece represents a real unit of professional experience (action, context, and outcome).

Example:

Led enterprise-wide Power BI transformation across commercial and customer teams.

EvidencePieces together form the user's Career Memory.

System Architecture

The Career Engine follows a four-layer architecture.

Career Memory Engine
Capability Engine
Job Intelligence Engine
Career Copilot / Scenario Engine

Each module in this directory belongs to one of these layers.

1. Career Memory Engine

Responsible for storing and structuring career evidence.

Structure:

Career
  ↓
Experiences
  ↓
EvidencePieces

Key responsibilities:

extract EvidencePieces from resumes or inputs

maintain career memory

provide evidence retrieval

Example modules:

evidence/

Output:

EvidencePieces[]
2. Capability Engine

Infers capabilities from EvidencePieces.

Structure:

EvidencePieces
   ↓
Capability inference
   ↓
Capability graph

Capabilities represent professional strengths such as:

program delivery

stakeholder management

analytics strategy

transformation leadership

Example modules:

capability/

Output:

Capabilities[]
3. Job Intelligence Engine

Responsible for understanding job descriptions and market roles.

Structure:

Job Description
   ↓
JD signal extraction

Signals include:

required skills

preferred skills

responsibilities

role family

domain

seniority indicators

Example modules:

parsing/
matching/
scoring/

Output:

JobSignals
4. Career Copilot / Scenario Engine

User-facing intelligence layer.

Uses:

Career Memory
+ Capability Engine
+ Job Intelligence

to generate guidance across career scenarios.

Examples:

job hunting

career transition

promotion preparation

onboarding

gap identification

Example modules:

profile/
strategy/
Current MVP Focus

The current MVP focuses on the Job Hunting scenario.

Pipeline:

resume
↓
build EvidencePieces
↓
extract JD signals
↓
match EvidencePieces
↓
generate tailored resume

Guardrails:

no fabricated experience

resume bullets must trace back to EvidencePiece.raw_text

preserve original company, title, and date_range

Design Principle

CareerTwin prioritizes features that increase career memory.

Features that only modify output formatting are lower priority.