Layer 1 — Career Memory Engine

核心：职业证据存储

evidence

职责：

resume
↓
extract EvidencePieces
↓
EvidencePiece[]

未来这里应该包含：

EvidencePiece schema
evidence extraction
career memory store

当前状态：

✅ 已存在
⚠ 未来需要成为 系统中心

Layer 2 — Capability Engine
capability

职责：

EvidencePieces
↓
capability inference
↓
Capabilities

例如：

program_delivery
stakeholder_management
analytics_strategy

当前状态：

✅ 已存在

Layer 3 — Job Intelligence Engine

这里其实是你现在 最分散的一层。

现在包含：

parsing
matching
scoring
job
job-fetcher
intelligence

职责：

JD
↓
signals
↓
role understanding

我帮你解释一下每个目录：

parsing
JD parsing
resume parsing
title normalization

属于：

Job Intelligence
job-fetcher
Adzuna integration
job ingestion

属于：

Job Intelligence
job

可能是：

job schema
job utilities
matching
candidate ↔ role
scoring
match score
gap score
intelligence

这个目录名字其实 有点危险。

原因：

intelligence

听起来像：

system brain

但你已经有：

capability
matching
scoring

所以这个目录可能会变成：

misc dump

（很多项目都会发生）

Layer 4 — Career Copilot / Scenario Engine

这里是：

profile
strategy

职责：

EvidencePieces
+ Capabilities
+ Job signals
↓
user outputs

例如：

resume rewrite
career strategy
role recommendation
CareerTwin system map (current implemented surfaces)
                      UI Layer
              (review workspace / jobs)

                          │

                    Career Copilot
                profile / strategy

                          │

        ┌─────────────────┴─────────────────┐
        │                                   │

   Capability Engine                 Job Intelligence
     capability                     parsing
                                    job-fetcher
                                    job
                                    matching
                                    scoring

                    │
                    │

               Career Memory
                 evidence

Note:
- The compact map above is the closest view of current implemented surfaces.
- The expanded map below is a target / product-direction view.
- It includes roadmap-oriented surfaces and should not be read as fully implemented today.

CareerTwin target system map (conceptual north-star)


                       ┌─────────────────────────────┐
                    │        Career Copilot       │
                    │  (User Scenarios Layer)    │
                    │                             │
                    │  Job Hunting                │
                    │  Career Transition          │
                    │  Promotion Strategy         │
                    │  Onboarding Intelligence    │
                    │  Capability Gap Detection   │
                    └──────────────▲──────────────┘
                                   │
                                   │
                    ┌──────────────┴──────────────┐
                    │       Job Intelligence      │
                    │                             │
                    │  Job Fetch (Adzuna)         │
                    │  Job Deduplication          │
                    │  JD Parsing                 │
                    │  Job Signals Extraction     │
                    │                             │
                    │  target_title               │
                    │  role_family                │
                    │  required_skills            │
                    │  responsibilities           │
                    │  domains                    │
                    └──────────────▲──────────────┘
                                   │
                                   │
                    ┌──────────────┴──────────────┐
                    │       Capability Engine     │
                    │                             │
                    │  Evidence → Capability      │
                    │  Capability Strength        │
                    │  Capability Graph           │
                    │                             │
                    │  Program Leadership         │
                    │  Analytics Strategy         │
                    │  Stakeholder Management     │
                    │  Data Product Thinking      │
                    └──────────────▲──────────────┘
                                   │
                                   │
                    ┌──────────────┴──────────────┐
                    │     Career Memory Engine    │
                    │                             │
                    │  Career                    │
                    │  Experiences               │
                    │  EvidencePieces            │
                    │                             │
                    │  "Led Power BI transformation" 
                    │  "Built analytics framework"
                    │  "Delivered reporting strategy"
                    │                             │
                    │  (Career Replica)          │
                    └─────────────────────────────┘              
