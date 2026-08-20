# CLEAN-ROOM V2 POLICY VALIDATION OUTPUT
> NOT CANONICAL
> NOT FOR PRODUCTION INFERENCE

## 1. insight-synthesis
- **definition**: The process of synthesizing disparate data and analytical findings into cohesive, actionable insights.
- **directEvidenceStandard**: Evidence of synthesizing multiple data sources or analytical outputs into a unified insight that directly informed a decision or strategy.
- **transferableEvidenceStandard**: Evidence of contributing to data synthesis or extracting partial findings, without demonstrating the final integration into a cohesive, actionable insight.
- **outOfScope**: EXPOSURE_ONLY, PASSIVE_CONSUMPTION, TOOL_USE_ONLY, OUTPUT_WITHOUT_DEFINING_ACTION. Mere presentation of pre-synthesized dashboards.
- **importantSiblingBoundaries**: `strategic-analysis`, `audience-insight`, `product-insights`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 2. measurement-design
- **definition**: The design and establishment of metrics, KPIs, and measurement frameworks to track performance or outcomes.
- **directEvidenceStandard**: Evidence of independently designing a measurement framework or defining key metrics that were adopted for tracking performance.
- **transferableEvidenceStandard**: Evidence of implementing tracking for predefined metrics or building dashboards to display them, without demonstrating the original design of the measurement framework.
- **outOfScope**: OPERATOR_OF_EXISTING_METHOD_ONLY, PASSIVE_EXECUTION_ONLY. Mere reporting of existing metrics.
- **importantSiblingBoundaries**: `analytics-governance`, `research-design`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 3. analytics-governance
- **definition**: The establishment and enforcement of policies, standards, and controls for data analytics and reporting.
- **directEvidenceStandard**: Evidence of establishing or enforcing governance policies and controls specifically for analytics processes or outputs.
- **transferableEvidenceStandard**: Evidence of operating within an analytics governance framework or conducting compliance checks, without demonstrating the establishment or enforcement of the policies.
- **outOfScope**: COMPLIANCE_ONLY, CONSUMER_OF_FRAMEWORK_ONLY. Mere adherence to data privacy rules without shaping analytics governance.
- **importantSiblingBoundaries**: `policy-governance`, `architecture-governance`, `risk-controls`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 4. cross-functional-delivery
- **definition**: The coordination and delivery of initiatives across multiple independent functional domains or teams.
- **directEvidenceStandard**: Evidence of coordinating delivery execution across multiple distinct functional groups to achieve a shared outcome.
- **transferableEvidenceStandard**: Evidence of delivering an initiative within a single function or participating as a functional representative in a cross-functional project, without demonstrating the overarching cross-functional coordination.
- **outOfScope**: PARTICIPATION_ONLY, TEAM_MEMBERSHIP_ONLY, COORDINATION_PROXIMITY_ONLY. Managing a team within one department.
- **importantSiblingBoundaries**: `dependency-management`, `operating-rhythm`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 5. strategic-analysis
- **definition**: The evaluation of market, business, or operational contexts to identify strategic options and inform overarching business direction.
- **directEvidenceStandard**: Evidence of conducting contextual evaluation that directly shaped business strategy or leadership decision-making.
- **transferableEvidenceStandard**: Evidence of performing discrete analytical tasks or compiling market data, without demonstrating the evaluation of strategic options or impact on business direction.
- **outOfScope**: OUTPUT_WITHOUT_DEFINING_ACTION, TOOL_USE_ONLY. Routine financial reporting or operational variance analysis.
- **importantSiblingBoundaries**: `market-strategy`, `insight-synthesis`, `operating-strategy`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 6. audience-insight
- **definition**: The extraction and synthesis of understanding regarding specific audience behaviors, preferences, and needs.
- **directEvidenceStandard**: Evidence of generating actionable understanding of an audience that informed marketing, product, or engagement strategies.
- **transferableEvidenceStandard**: Evidence of collecting audience data or reporting on audience metrics, without demonstrating the synthesis of actionable audience understanding.
- **outOfScope**: PASSIVE_CONSUMPTION, TOOL_USE_ONLY. Operating a CRM without extracting insights.
- **importantSiblingBoundaries**: `customer-segmentation`, `insight-synthesis`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 7. customer-segmentation
- **definition**: The design and definition of distinct customer groups based on shared characteristics to enable targeted strategies.
- **directEvidenceStandard**: Evidence of defining customer segments and their criteria that were subsequently utilized for targeted business activities.
- **transferableEvidenceStandard**: Evidence of assigning customers to existing segments or executing campaigns against predefined segments, without demonstrating the design or definition of the segments.
- **outOfScope**: OPERATOR_OF_EXISTING_METHOD_ONLY, CONSUMER_OF_FRAMEWORK_ONLY. Mere use of demographic filters in a tool.
- **importantSiblingBoundaries**: `audience-insight`, `market-strategy`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 8. research-design
- **definition**: The formulation of methodologies, hypotheses, and structures for conducting formal research or studies.
- **directEvidenceStandard**: Evidence of formulating the methodology and structure of a research initiative or study.
- **transferableEvidenceStandard**: Evidence of executing data collection or conducting interviews for a study, without demonstrating the formulation of the underlying research methodology.
- **outOfScope**: PASSIVE_EXECUTION_ONLY, PARTICIPATION_ONLY. Answering research questions or purely participating as a subject.
- **importantSiblingBoundaries**: `measurement-design`, `audience-insight`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 9. product-insights
- **definition**: The generation of actionable understanding related to product usage, performance, and user interaction to inform product development.
- **directEvidenceStandard**: Evidence of extracting product-specific understanding that directly influenced product roadmap, features, or design decisions.
- **transferableEvidenceStandard**: Evidence of tracking product metrics or conducting user testing on specific features, without demonstrating the generation of broad actionable product understanding that shaped product direction.
- **outOfScope**: EXPOSURE_ONLY, TOOL_USE_ONLY. Basic QA testing or bug reporting.
- **importantSiblingBoundaries**: `audience-insight`, `insight-synthesis`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO

## 10. tooling-enablement
- **definition**: The implementation, configuration, and enablement of software tools to support business processes or team operations.
- **directEvidenceStandard**: Evidence of configuring, deploying, or driving the adoption of specific tools to enable operational capabilities.
- **transferableEvidenceStandard**: Evidence of maintaining user access or providing basic IT support for a tool, without demonstrating the implementation, configuration, or structural enablement of the tool for the business process.
- **outOfScope**: TOOL_USE_ONLY, CONSUMER_OF_FRAMEWORK_ONLY, PASSIVE_CONSUMPTION. Mere use of Jira or Salesforce as an end-user.
- **importantSiblingBoundaries**: `legal-technology`, `hr-systems`
- **semanticSourceCoverage**: NONE
- **semanticConfidence**: MEDIUM
- **SPECIAL_CASE_OVERRIDE_USED**: NO
