# CLEAN-ROOM POLICY VALIDATION OUTPUT
> **NOT CANONICAL**
> **NOT FOR PRODUCTION INFERENCE**

## 1. insight-synthesis
- **definition**: Synthesising qualitative or quantitative evidence into a decision-ready point of view or recommendation.
- **directEvidenceStandard**: Evidence must explicitly demonstrate the performed action of synthesising analysis, findings, or evidence into a recommendation, decision, narrative, or clear direction.
- **transferableEvidenceStandard**: Delivering analysis or providing data without explicitly claiming the synthesis into an executive or decision-ready recommendation.
- **outOfScope**: Tool usage without synthesis (e.g., building dashboards, pulling data), EXPOSURE_ONLY to insights, PASSIVE_CONSUMPTION of research, TITLE_ONLY.
- **importantSiblingBoundaries**: `strategic-analysis` (synthesis translates evidence to insight; strategy shapes priorities/trade-offs based on that insight), `research-design` (collection vs synthesis).
- **semanticSourceCoverage**: STRONG
- **semanticConfidence**: HIGH

## 2. measurement-design
- **definition**: Designing an analytical measurement framework or methodology to connect metrics to an organisational decision.
- **directEvidenceStandard**: Evidence must explicitly demonstrate designing or establishing a measurement framework or approach suited to specific decisions.
- **transferableEvidenceStandard**: Operating or executing an existing measurement framework without designing it.
- **outOfScope**: Reporting, TOOL_USE_ONLY (building dashboards), PARTICIPATION_ONLY in measurement, using established metrics.
- **importantSiblingBoundaries**: `analytics-governance` (designing the framework vs governing the metrics).
- **semanticSourceCoverage**: STRONG
- **semanticConfidence**: HIGH

## 3. analytics-governance
- **definition**: Establishing or maintaining quality controls, trusted definitions, and analytical standards.
- **directEvidenceStandard**: Evidence must explicitly demonstrate establishing, governing, or enforcing analytics governance, standards, or quality controls.
- **transferableEvidenceStandard**: Applying or adhering to analytical standards and governance processes without owning their establishment.
- **outOfScope**: Data engineering pipelines, adhering to standards without governing them, EXPOSURE_ONLY, TITLE_ONLY.
- **importantSiblingBoundaries**: `measurement-design` (governing vs designing).
- **semanticSourceCoverage**: STRONG
- **semanticConfidence**: HIGH

## 4. cross-functional-delivery
- **definition**: Coordinating delivery across multiple functional partners to achieve an outcome.
- **directEvidenceStandard**: Evidence must explicitly demonstrate owning and coordinating delivery across cross-functional or technical and business partners.
- **transferableEvidenceStandard**: Participating in a cross-functional team or project without owning the coordination or delivery outcome.
- **outOfScope**: Within-team delivery, basic collaboration, meeting attendance (PARTICIPATION_ONLY), TITLE_ONLY.
- **importantSiblingBoundaries**: `process-improvement` (delivering an outcome vs redesigning the operating process).
- **semanticSourceCoverage**: STRONG
- **semanticConfidence**: HIGH

## 5. strategic-analysis
- **definition**: Performing structured analysis to shape organisational priorities, implications, or trade-offs.
- **directEvidenceStandard**: Evidence must explicitly demonstrate translating evidence or structured analysis into strategic implications, growth priorities, or allocation trade-offs.
- **transferableEvidenceStandard**: Providing analytical data to support strategy without performing the strategic analysis or trade-off shaping itself.
- **outOfScope**: Pure data extraction, tactical reporting, execution of a strategy without analysis, TITLE_ONLY.
- **importantSiblingBoundaries**: `insight-synthesis` (strategy shapes priorities/trade-offs; synthesis stops at the decision-ready insight).
- **semanticSourceCoverage**: STRONG
- **semanticConfidence**: HIGH

## 6. audience-insight
- **definition**: Connecting behavioural or attitudinal evidence to understand customer choices or audience behaviour.
- **directEvidenceStandard**: Evidence must explicitly demonstrate interpreting audience or customer evidence to explain behaviour or interpret performance.
- **transferableEvidenceStandard**: Gathering audience data without interpreting the behavioral choices or underlying reasons.
- **outOfScope**: Demographic reporting without insight, survey execution without interpretation (OUTPUT_WITHOUT_DEFINING_ACTION).
- **importantSiblingBoundaries**: `customer-segmentation` (insight into behaviour vs grouping for strategy), `insight-synthesis`.
- **semanticSourceCoverage**: MODERATE
- **semanticConfidence**: HIGH

## 7. customer-segmentation
- **definition**: Defining or using meaningful customer groups to influence strategy or experience decisions.
- **directEvidenceStandard**: Evidence must explicitly demonstrate creating or applying customer segments to change a strategy or experience decision.
- **transferableEvidenceStandard**: Identifying or profiling segments without applying them to influence decisions.
- **outOfScope**: Basic demographic filtering, reporting on existing groups without strategic application, EXPOSURE_ONLY.
- **importantSiblingBoundaries**: `audience-insight` (grouping vs understanding behaviour).
- **semanticSourceCoverage**: WEAK
- **semanticConfidence**: MEDIUM

## 8. research-design
- **definition**: Designing a research approach or learning agenda to answer a consequential question.
- **directEvidenceStandard**: Evidence must explicitly demonstrate designing the research approach, methodology, or learning agenda.
- **transferableEvidenceStandard**: Supporting research delivery or execution without owning the design of the research.
- **outOfScope**: Running someone else's research script, participating as a research subject, survey execution without design (OUTPUT_WITHOUT_DEFINING_ACTION).
- **importantSiblingBoundaries**: `insight-synthesis` (designing the collection vs synthesizing the result).
- **semanticSourceCoverage**: STRONG
- **semanticConfidence**: HIGH

## 9. product-insights
- **definition**: Using user discovery and product evidence to define a product problem or outcome.
- **directEvidenceStandard**: Evidence must explicitly demonstrate using user/product evidence or discovery to define the product problem or outcome.
- **transferableEvidenceStandard**: Conducting user interviews or discovery without defining the product problem.
- **outOfScope**: Building the product delivery output, general analytics reporting, EXPOSURE_ONLY to product decisions.
- **importantSiblingBoundaries**: `audience-insight` (product problem definition vs audience behaviour).
- **semanticSourceCoverage**: WEAK
- **semanticConfidence**: MEDIUM

## 10. tooling-enablement
- **definition**: Enabling the reliable use and adoption of reusable capabilities or tooling.
- **directEvidenceStandard**: Evidence must explicitly demonstrate driving the enablement, reliability, and user adoption of tooling capabilities.
- **transferableEvidenceStandard**: Building reusable tooling without claiming that users adopted it or that it delivered a full enablement outcome.
- **outOfScope**: Using a tool (TOOL_USE_ONLY), building one-off scripts, PASSIVE_CONSUMPTION.
- **importantSiblingBoundaries**: `cross-functional-delivery` (tooling enablement requires driving adoption of reusable assets).
- **semanticSourceCoverage**: WEAK
- **semanticConfidence**: MEDIUM
