# CANONICAL SEMANTIC RUBRIC PILOT DRAFT

> [!WARNING]
> **NON-AUTHORITATIVE PILOT DRAFT**
> NOT FOR PRODUCTION INFERENCE
> NOT YET PART OF CANONICAL CAPABILITY AUTHORITY
> REQUIRES FOUNDER/EM APPROVAL

## Excluded Capabilities
The following 5 capabilities were excluded from this pilot: `forecasting`, `scenario-modelling`, `operating-control`, `change-leadership`, `commercial-negotiation`.
**Reason:** The current role library contains insufficient non-boilerplate semantic material for these five capabilities (only seeded placeholder text like "A specific owned outcome demonstrating..."). They will be defined/revisited later as part of broader canonical ontology completion, rather than inventing definitions from scratch merely to serve as negative controls.

---

## 1. insight-synthesis

**CANONICAL ID:** `insight-synthesis`
**LABEL:** Insight Synthesis
**FAMILY:** analytics-insight

**CROSS-ROLE SOURCE COVERAGE:** MODERATE

**DEFINITION:** Integrating, interpreting, and synthesising evidence into a clear point of view, implication, or recommendation that makes the evidence useful for a decision.

**DIRECT EVIDENCE STANDARD:** Must demonstrate taking disparate or complex evidence (e.g. analysis, research, customer signals) and synthesising it into a coherent interpretation, implication, recommendation, or decision-ready point of view.

**TRANSFERABLE EVIDENCE STANDARD:** Interpreting a coherent subset of evidence or drawing meaningful implications without demonstrating broader multi-source synthesis or a fully decision-ready point of view.

**OUT OF SCOPE:**
- Simple factual reporting with no interpretive synthesis (NO SUPPORT).
- Making a decision based on someone else's synthesis (NO SUPPORT).
- **Important Sibling Boundaries:** 
  - vs `strategic-analysis`: Insight synthesis focuses on forming a coherent decision-ready understanding from evidence. A recommendation alone does not make it strategic. `strategic-analysis` requires evaluating direction, priorities, options, or material trade-offs.
  - vs `audience-insight`: Audience insight focuses on understanding meaningful audience behaviour/needs/patterns, whereas insight-synthesis is the act of integrating evidence (of any kind) for a decision.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Excludes weak factual reporting; requires meaningful interpretation/implication building blocks.
**DRAFT CONFIDENCE:** HIGH

**SOURCE TRACE:**
- Roles using: Analytics Manager (Arch), Customer Insights Lead (Arch)
- ExpectedEvidence: "Synthesised analysis into a clear decision direction." / "Integrated customer evidence into a decision-ready point of view."
- Invariant Core: Integrating/synthesizing evidence into a clear, decision-ready output.
- Excluded Wording: "customer evidence", "analysis" (Domain specific).

---

## 2. measurement-design

**CANONICAL ID:** `measurement-design`
**LABEL:** Measurement Design
**FAMILY:** analytics-insight

**CROSS-ROLE SOURCE COVERAGE:** MODERATE

**DEFINITION:** Establishing how outcomes, performance, effects, or decisions will be measured.

**DIRECT EVIDENCE STANDARD:** Must demonstrate designing, establishing, or owning the measurement approach used to evaluate performance, outcomes, or inform a business decision. (Includes evaluation frameworks, experiments, incrementality, effectiveness measurement, attribution approaches, KPI frameworks, etc.)

**TRANSFERABLE EVIDENCE STANDARD:** Contributing a component to measurement design (e.g., advising on specific metric logic or defining a calculation) without demonstrating ownership of the broader measurement approach or framework design.

**OUT OF SCOPE:**
- Simply producing measurement reports or dashboards using established metrics (NO SUPPORT).
- Using metrics without having designed the approach (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `research-design`: Measurement design establishes how outcomes, performance, effects, or decisions will be measured. Research design establishes how evidence will be generated to answer a research or learning question.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Excludes purely operational reporting; requires contributing to how things are measured.
**DRAFT CONFIDENCE:** HIGH

**SOURCE TRACE:**
- Roles using: Analytics Manager (Arch), Marketing Analytics Lead (Arch)
- ExpectedEvidence: "Owned an analytical measurement approach tied to a decision." / "Designed a measurement framework suited to marketing decisions."
- Invariant Core: Designing/owning a measurement approach/framework tied to decisions.
- Excluded Wording: "marketing decisions", "analytical".

---

## 3. analytics-governance

**CANONICAL ID:** `analytics-governance`
**LABEL:** Analytics Governance
**FAMILY:** governance-risk

**CROSS-ROLE SOURCE COVERAGE:** STRONG

**DEFINITION:** Establishing and maintaining trust, quality controls, and governed definitions for metrics, analytics, or data products.

**DIRECT EVIDENCE STANDARD:** Must demonstrate establishing, enforcing, or maintaining trusted definitions, quality controls, standards, or governance mechanisms across an analytics or data domain.

**TRANSFERABLE EVIDENCE STANDARD:** Contributing reusable definitions, controls, standards, documentation, or consistency mechanisms without owning governance across the broader domain.

**OUT OF SCOPE:**
- Following established analytics standards (NO SUPPORT).
- Performing standard QA or error-checking on one's own individual analysis (NO SUPPORT).
- Consuming governed data without being responsible for its governance (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `tooling-enablement`: Governance is about trust, definitions, and controls. Tooling enablement is about driving the reliable use/adoption of the tools themselves.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Self-QA and simple compliance are explicitly excluded, requiring contribution to systemic reusable controls.
**DRAFT CONFIDENCE:** HIGH

**SOURCE TRACE:**
- Roles using: Analytics Manager (Arch), Marketing Analytics Lead (Arch), Data Product Manager (Arch)
- ExpectedEvidence: "Established trusted definitions, quality controls, or analytical standards." / "Maintained trusted marketing metrics..." / "Applied trust and governance expectations to data-product decisions."
- Invariant Core: Establishing and maintaining trust, quality controls, and definitions for metrics/analytics.
- Excluded Wording: "marketing metrics", "data-product decisions".

---

## 4. cross-functional-delivery

**CANONICAL ID:** `cross-functional-delivery`
**LABEL:** Cross-functional Delivery
**FAMILY:** delivery-execution

**CROSS-ROLE SOURCE COVERAGE:** STRONG

**DEFINITION:** Coordinating and aligning contributors across different functions toward a shared delivery outcome.

**DIRECT EVIDENCE STANDARD:** Must demonstrate substantive coordination and alignment responsibility across multiple functions (e.g., business, technical, product) toward a shared delivery outcome.

**TRANSFERABLE EVIDENCE STANDARD:** Owning a meaningful workstream requiring active coordination with another function, without demonstrating broader multi-function delivery alignment.

**OUT OF SCOPE:**
- Merely attending cross-functional meetings (NO SUPPORT).
- Being a member of a cross-functional team (NO SUPPORT).
- Handing work to another team (NO SUPPORT).
- Delivering work entirely within a single functional silo (NO SUPPORT).

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Passive participation is ruled out; active inter-functional coordination of a workstream is required.
**DRAFT CONFIDENCE:** HIGH

**SOURCE TRACE:**
- Roles using: Transformation Manager (Seeded), Analytics Manager (Arch), Customer Insights Lead (Arch), Data Product Manager (Arch)
- ExpectedEvidence: "Coordinated analytical delivery across business and technical partners." / "Worked across functions to embed customer evidence in delivery." / "Aligned data, engineering, analytics, and business contributors around outcomes."
- Invariant Core: Coordinating and aligning contributors across different functions around shared outcomes.
- Excluded Wording: "analytical delivery", "customer evidence", "data, engineering".

---

## 5. strategic-analysis

**CANONICAL ID:** `strategic-analysis`
**LABEL:** Strategic Analysis
**FAMILY:** strategy-planning

**CROSS-ROLE SOURCE COVERAGE:** STRONG

**DEFINITION:** Using structured analysis to shape and evaluate direction, priorities, options, or material trade-offs.

**DIRECT EVIDENCE STANDARD:** Must demonstrate using evidence or structured analysis to explicitly evaluate and shape strategic choices, such as what should be prioritised, where resources should be allocated, or which competing opportunities/options should be selected.

**TRANSFERABLE EVIDENCE STANDARD:** Producing analysis that contains meaningful decision implications, prioritisation context, or option evaluation, while falling short of demonstrated strategic choice/trade-off analysis.

**OUT OF SCOPE:**
- Merely producing insights, generic business analysis, or recommendations without evaluating trade-offs/options/direction (NO SUPPORT).
- Executing a strategy decided by others (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `insight-synthesis`: Strategic analysis must evaluate direction, allocation, or trade-offs. Producing a coherent "decision-ready understanding" (insight-synthesis) is not automatically strategic unless it shapes these material choices.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Generic business analysis is ruled out; material option/prioritisation context is required.
**DRAFT CONFIDENCE:** HIGH

**SOURCE TRACE:**
- Roles using: Strategy & Ops Mgr (Seeded), Analytics Mgr (Arch), Customer Insights Lead (Arch), Marketing Analytics Lead (Arch)
- ExpectedEvidence: "Used structured analysis to shape priorities and trade-offs." / "Translated customer evidence into strategic implications." / "Connected marketing evidence to growth or allocation trade-offs."
- Invariant Core: Translating structured analysis/evidence into strategic implications, priorities, or trade-offs.
- Excluded Wording: "marketing evidence", "customer evidence".

---

## 6. audience-insight

**CANONICAL ID:** `audience-insight`
**LABEL:** Audience Insight
**FAMILY:** marketing-communications

**CROSS-ROLE SOURCE COVERAGE:** MODERATE

**DEFINITION:** Understanding meaningful audience or customer behaviour, attitudes, needs, characteristics, patterns, or choices, and using that understanding to interpret performance or inform decisions.

**DIRECT EVIDENCE STANDARD:** Must demonstrate uncovering, connecting, or using behavioural, attitudinal, need-based, or audience-level evidence to understand choices, interpret performance, or improve decision-making.

**TRANSFERABLE EVIDENCE STANDARD:** Connecting basic descriptive metrics or traits to a meaningful observation about a segment, while falling short of demonstrating substantive understanding of behaviour, attitudes, or needs.

**OUT OF SCOPE:**
- Tracking basic demographic metrics (NO SUPPORT).
- Reporting generic commercial analytics about customers without any behavioural or attitudinal insight (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `insight-synthesis`: Audience insight specifically concerns meaningful understanding of the audience/customer (behaviours, attitudes, needs, etc.); insight-synthesis focuses on the act of integrating evidence for a decision without mandating the subject is the audience.
  - vs `customer-segmentation`: Audience insight builds understanding of the audience; customer segmentation focuses on defining or using groupings for differentiated treatment.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Excludes purely commercial/transactional reporting unless it builds meaningful audience understanding.
**DRAFT CONFIDENCE:** HIGH

**SOURCE TRACE:**
- Roles using: Marketing Strategy Mgr (Seeded), Customer Insights Lead (Arch), Marketing Analytics Lead (Arch)
- ExpectedEvidence: "Connected behavioural or attitudinal evidence to customer choices." / "Used audience evidence to interpret marketing performance."
- Invariant Core: Connecting behavioural/attitudinal audience evidence to interpret choices or performance.
- Excluded Wording: "marketing performance".

---

## 7. customer-segmentation

**CANONICAL ID:** `customer-segmentation`
**LABEL:** Customer Segmentation
**FAMILY:** analytics-insight

**CROSS-ROLE SOURCE COVERAGE:** WEAK

**DEFINITION:** Defining or using meaningful customer groupings or segments to differentiate strategy, targeting, experience, or decisions.

**DIRECT EVIDENCE STANDARD:** Must demonstrate defining meaningful customer groups/segments, OR explicitly applying an established segmentation to differentiate strategy, target an experience, or drive a decision.

**TRANSFERABLE EVIDENCE STANDARD:** Identifying descriptive attributes or proposing groupings based on data, but without evidence that these groupings were meaningfully applied to differentiate strategy or treatment.

**OUT OF SCOPE:**
- Analysing customer data categories or breaking down reporting by pre-existing simple dimensions (e.g. geography) without driving a differentiated strategy (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `audience-insight`: Audience insight is about understanding the customer's behaviours/attitudes; segmentation requires defining or applying groupings for differentiated action.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Breaking data down by simple generic dimensions is correctly treated as NO SUPPORT.
**DRAFT CONFIDENCE:** MEDIUM

**SOURCE TRACE:**
- Roles using: Customer Insights Lead (Arch)
- ExpectedEvidence: "Used meaningful customer groups to change strategy or experience decisions."
- Invariant Core: Using customer groupings to change decisions.

---

## 8. research-design

**CANONICAL ID:** `research-design`
**LABEL:** Research Design
**FAMILY:** analytics-insight

**CROSS-ROLE SOURCE COVERAGE:** WEAK

**DEFINITION:** Designing a research or learning approach to answer a consequential business or customer question.

**DIRECT EVIDENCE STANDARD:** Must demonstrate designing the research question, evidence-gathering approach, method, study structure, or learning plan suited to answering a consequential question.

**TRANSFERABLE EVIDENCE STANDARD:** Contributing to the design of specific research components (e.g., drafting interview questions or refining survey logic) without owning the design of the broader research approach or learning plan.

**OUT OF SCOPE:**
- Executing a pre-designed survey or interviewing customers without a formal learning agenda (NO SUPPORT).
- Analysing the output of research or NPS designed by others (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `measurement-design`: Research design establishes how evidence will be generated to answer a research or learning question; measurement design establishes how outcomes, performance, or effects will be measured.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Excludes passive participation and execution without design.
**DRAFT CONFIDENCE:** MEDIUM

**SOURCE TRACE:**
- Roles using: Customer Insights Lead (Arch)
- ExpectedEvidence: "Owned research designed around a consequential customer question."
- Invariant Core: Designing research around a consequential question.

---

## 9. product-insights

**CANONICAL ID:** `product-insights`
**LABEL:** Product Insights
**FAMILY:** product-management

**CROSS-ROLE SOURCE COVERAGE:** WEAK

**DEFINITION:** Using evidence (user, product, usage, behavioural, market, or other) to understand or shape product problems, opportunities, or decisions.

**DIRECT EVIDENCE STANDARD:** Must demonstrate explicitly using relevant evidence (user, product, market, usage) to define a product problem, shape a product opportunity, or influence a product roadmap decision.

**TRANSFERABLE EVIDENCE STANDARD:** Exploring user/product data and surfacing observations, but without evidence of shaping a clear product problem definition, opportunity, or decision.

**OUT OF SCOPE:**
- Providing general data analysis to a product team without shaping a product decision (NO SUPPORT).
- Owning an analytics product operationally without shaping its problem definition via evidence (NO SUPPORT).
- Providing operational reporting on a product (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `tooling-enablement`: Product insights uses evidence to understand or shape product problems/decisions; tooling enablement focuses on reliable use/adoption of tools or reusable capabilities.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Excludes generic data pulls for product teams; requires surfacing relevant observations.
**DRAFT CONFIDENCE:** MEDIUM

**SOURCE TRACE:**
- Roles using: Product Ops Mgr (Seeded), Data Product Mgr (Arch)
- ExpectedEvidence: "Used user and product evidence to define a data-product problem."
- Invariant Core: Using user/product evidence to define a product problem.

---

## 10. tooling-enablement

**CANONICAL ID:** `tooling-enablement`
**LABEL:** Tooling Enablement
**FAMILY:** technology-operations

**CROSS-ROLE SOURCE COVERAGE:** WEAK

**DEFINITION:** Enabling the reliable and repeatable use or adoption of tools, platforms, or reusable capabilities.

**DIRECT EVIDENCE STANDARD:** Must demonstrate driving the adoption, enablement, or reliable operational use of a tool, platform, or reusable capability across users or teams.

**TRANSFERABLE EVIDENCE STANDARD:** Improving reusable tooling, configuring reusable capabilities, creating documentation, establishing standards, creating support mechanisms, or reducing friction for other users, without demonstrating broader adoption/enablement ownership.

**OUT OF SCOPE:**
- Simply personally using a tool (Power BI, Gemini, Python, etc.) to deliver one's own work (NO SUPPORT).
- Configuring a tool for a single personal use case (NO SUPPORT).
- **Important Sibling Boundaries:**
  - vs `analytics-governance`: Governance ensures trust, definitions, and controls; tooling enablement drives usage and capability adoption.
  - vs `product-insights`: Tooling enablement drives reliable use/adoption of tools; product insights shapes what should be built/solved.

**PERSON TEST:** Passes.
**ROLE TEST:** Passes.
**TRANSFERABILITY TEST:** Passes. Ensures that just using tools like Gemini or Power BI is marked as NO SUPPORT, preventing false positives.
**DRAFT CONFIDENCE:** MEDIUM

**SOURCE TRACE:**
- Roles using: Product Ops Mgr (Seeded), Data Product Mgr (Arch)
- ExpectedEvidence: "Enabled reliable use of reusable data capabilities."
- Invariant Core: Enabling the reliable use of capabilities/tools.
