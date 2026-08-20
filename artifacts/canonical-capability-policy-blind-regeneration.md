# BLIND POLICY VALIDATION OUTPUT
> [!WARNING]
> NOT CANONICAL
> NOT FOR PRODUCTION INFERENCE

## 1. insight-synthesis
**DEFINITION**: Integrating and interpreting disparate evidence to produce a coherent, decision-ready recommendation or point of view.
**DIRECT EVIDENCE STANDARD**: Must demonstrate performing the defining action of synthesizing complex or disparate evidence into a clear implication, recommendation, or interpretation used for a decision.
**TRANSFERABLE EVIDENCE STANDARD**: Performing a related analytical foundation such as interpreting a subset of evidence, while lacking the material defining component of integrating multi-source synthesis into a broader decision-ready point of view.
**OUT OF SCOPE**:
- Simple factual reporting or passive consumption of data (NO_SUPPORT: EXPOSURE_ONLY, OUTPUT_WITHOUT_DEFINING_ACTION).
- Executing someone else's synthesis (NO_SUPPORT).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `strategic-analysis`: Insight synthesis integrates evidence for a decision, but does not inherently evaluate material trade-offs or strategic direction.
- vs `audience-insight`: Insight synthesis integrates general evidence; audience insight focuses specifically on uncovering behavioural audience characteristics.
**SEMANTIC SOURCE COVERAGE**: MODERATE
**SEMANTIC CONFIDENCE**: HIGH

## 2. measurement-design
**DEFINITION**: Establishing frameworks and approaches for how outcomes, performance, or effects will be measured and evaluated.
**DIRECT EVIDENCE STANDARD**: Must demonstrate designing or establishing the measurement approach, evaluation framework, or KPI structure used to evaluate performance or decisions.
**TRANSFERABLE EVIDENCE STANDARD**: Contributing to a specific component of a measurement approach (e.g., defining a single metric calculation) without owning the overall design of the framework.
**OUT OF SCOPE**:
- Merely reporting on established metrics or using dashboards (NO_SUPPORT: OUTPUT_WITHOUT_DEFINING_ACTION).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `research-design`: Measurement design establishes how outcomes/performance are evaluated; research design establishes how evidence is generated to answer a specific learning question.
**SEMANTIC SOURCE COVERAGE**: MODERATE
**SEMANTIC CONFIDENCE**: HIGH

## 3. analytics-governance
**DEFINITION**: Establishing and maintaining trusted definitions, standards, and quality controls for metrics and data products.
**DIRECT EVIDENCE STANDARD**: Must demonstrate establishing, enforcing, or maintaining systemic controls, standards, definitions, or governance mechanisms across an analytics domain.
**TRANSFERABLE EVIDENCE STANDARD**: Contributing reusable documentation, standards, or consistency checks without owning governance across the broader domain.
**OUT OF SCOPE**:
- Performing QA on one's own individual analysis (NO_SUPPORT: PARTICIPATION_ONLY).
- Following established governance standards (NO_SUPPORT: PASSIVE_CONSUMPTION).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `tooling-enablement`: Governance ensures trust and standards; tooling enablement drives the usage and adoption of tools.
**SEMANTIC SOURCE COVERAGE**: STRONG
**SEMANTIC CONFIDENCE**: HIGH

## 4. cross-functional-delivery
**DEFINITION**: Coordinating and aligning contributors across multiple different functions to achieve a shared delivery outcome.
**DIRECT EVIDENCE STANDARD**: Must demonstrate substantive coordination and alignment responsibility across distinct functional groups (e.g., technical and business) to deliver a shared outcome.
**TRANSFERABLE EVIDENCE STANDARD**: Owning a meaningful workstream that requires active coordination with another function, without demonstrating broader multi-function delivery alignment.
**OUT OF SCOPE**:
- Attending cross-functional meetings or being on a cross-functional team (NO_SUPPORT: PARTICIPATION_ONLY).
- Delivering work entirely within a single functional silo (NO_SUPPORT).
**IMPORTANT SIBLING BOUNDARIES**: None explicitly flagged.
**SEMANTIC SOURCE COVERAGE**: STRONG
**SEMANTIC CONFIDENCE**: HIGH

## 5. strategic-analysis
**DEFINITION**: Using structured analysis to evaluate and shape direction, priorities, options, or material trade-offs.
**DIRECT EVIDENCE STANDARD**: Must demonstrate using structured analysis to explicitly evaluate and shape strategic choices such as resource allocation, priorities, or competing options.
**TRANSFERABLE EVIDENCE STANDARD**: Producing analysis that contains meaningful prioritisation context or decision implications, but falls short of explicitly evaluating material trade-offs or strategic choices.
**OUT OF SCOPE**:
- Producing generic business analysis or insights without evaluating trade-offs (NO_SUPPORT: OUTPUT_WITHOUT_DEFINING_ACTION).
- Executing a strategy decided by others (NO_SUPPORT).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `insight-synthesis`: Strategic analysis must evaluate direction or trade-offs; merely synthesizing insights into a recommendation is not automatically strategic.
**SEMANTIC SOURCE COVERAGE**: STRONG
**SEMANTIC CONFIDENCE**: HIGH

## 6. audience-insight
**DEFINITION**: Understanding meaningful audience or customer behaviours, attitudes, patterns, and needs to interpret performance or inform decisions.
**DIRECT EVIDENCE STANDARD**: Must demonstrate uncovering, connecting, or applying behavioural, attitudinal, or audience-level evidence to understand choices or improve decision-making.
**TRANSFERABLE EVIDENCE STANDARD**: Connecting basic descriptive traits to an observation, but missing substantive understanding of deeper behaviours or attitudes.
**OUT OF SCOPE**:
- Reporting basic demographic metrics or generic commercial transactions without behavioural insight (NO_SUPPORT: EXPOSURE_ONLY).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `customer-segmentation`: Audience insight builds understanding of the audience; segmentation defines groupings for differentiated treatment.
- vs `insight-synthesis`: Audience insight specifically concerns understanding the audience, whereas insight-synthesis integrates evidence without restricting the subject.
**SEMANTIC SOURCE COVERAGE**: MODERATE
**SEMANTIC CONFIDENCE**: HIGH

## 7. customer-segmentation
**DEFINITION**: Defining or using meaningful customer groupings and segments to differentiate strategy, targeting, or experiences.
**DIRECT EVIDENCE STANDARD**: Must demonstrate defining meaningful customer segments OR explicitly applying an established segmentation to change a strategy, decision, or targeted experience.
**TRANSFERABLE EVIDENCE STANDARD**: Proposing descriptive groupings based on data, without evidence that these groupings were applied to differentiate strategy.
**OUT OF SCOPE**:
- Analysing customer data by pre-existing simple dimensions (e.g., geography) without driving a differentiated strategy (NO_SUPPORT: OUTPUT_WITHOUT_DEFINING_ACTION).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `audience-insight`: Audience insight understands the customer; customer segmentation groups them for differentiated action.
**SEMANTIC SOURCE COVERAGE**: WEAK
**SEMANTIC CONFIDENCE**: MEDIUM

## 8. research-design
**DEFINITION**: Designing a learning approach or research study to answer a consequential question.
**DIRECT EVIDENCE STANDARD**: Must demonstrate designing the research question, method, sampling, or evidence-gathering approach suited to answering a consequential business/customer question.
**TRANSFERABLE EVIDENCE STANDARD**: Contributing to a specific research component (e.g., drafting survey questions) without owning the design of the broader learning plan.
**OUT OF SCOPE**:
- Executing a pre-designed survey or analyzing NPS output without designing the research approach (NO_SUPPORT: PARTICIPATION_ONLY, OUTPUT_WITHOUT_DEFINING_ACTION).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `measurement-design`: Research design establishes how evidence is generated for a learning question; measurement design establishes ongoing performance evaluation frameworks.
**SEMANTIC SOURCE COVERAGE**: WEAK
**SEMANTIC CONFIDENCE**: MEDIUM

## 9. product-insights
**DEFINITION**: Using evidence (user, product, market, or usage) to understand or shape product problems, opportunities, or roadmap decisions.
**DIRECT EVIDENCE STANDARD**: Must demonstrate explicitly using relevant evidence to define a product problem, shape an opportunity, or influence a product decision.
**TRANSFERABLE EVIDENCE STANDARD**: Exploring product data and surfacing observations, but without shaping a clear product problem definition or decision.
**OUT OF SCOPE**:
- Providing generic data analysis to a product team without shaping a product decision (NO_SUPPORT: OUTPUT_WITHOUT_DEFINING_ACTION).
- Owning an analytics product operationally without shaping its definition (NO_SUPPORT: PARTICIPATION_ONLY).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `tooling-enablement`: Product insights shapes what should be built/solved; tooling enablement drives the adoption/use of tools.
**SEMANTIC SOURCE COVERAGE**: WEAK
**SEMANTIC CONFIDENCE**: MEDIUM

## 10. tooling-enablement
**DEFINITION**: Enabling the reliable use, adoption, and repeatability of tools, platforms, or reusable capabilities by others.
**DIRECT EVIDENCE STANDARD**: Must demonstrate driving the adoption, enablement, or reliable operational use of a tool, platform, or capability across users or teams.
**TRANSFERABLE EVIDENCE STANDARD**: Improving reusable tooling, creating documentation, or establishing standards, without demonstrating broader adoption/enablement ownership.
**OUT OF SCOPE**:
- Personally using a tool (e.g., Power BI, Python, Gemini) to do one's own work (NO_SUPPORT: TOOL_USE_ONLY).
**IMPORTANT SIBLING BOUNDARIES**:
- vs `analytics-governance`: Governance ensures trust and controls; tooling enablement drives usage and adoption.
- vs `product-insights`: Tooling enablement focuses on adoption; product insights focuses on shaping the product definition.
**SEMANTIC SOURCE COVERAGE**: WEAK
**SEMANTIC CONFIDENCE**: MEDIUM
