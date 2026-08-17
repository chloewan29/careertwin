import type {
  CareerCapabilityStructuredInferenceResponse,
  CareerCapabilityStructuredInferenceValidationResult,
} from "../../../lib/career-possibility/career-capability-structured-inference-contract";

export const STRUCTURED_INFERENCE_COVERAGE_BENCHMARK_VERSION =
  "structured-inference-coverage-benchmark/2.1.0" as const;

export type StructuredInferenceDifficulty =
  | "LEVEL_1_EXPLICIT"
  | "LEVEL_2_IMPLICIT_CLEAR"
  | "LEVEL_3_OVERSHADOWED";

export type StructuredInferenceCoverageFixture = Readonly<{
  fixtureId: string;
  atomicEvidence: string;
  difficultyLevel: StructuredInferenceDifficulty;
  primaryFailureClass: string;
  rationaleCategory?: string;
  requiredCanonicalCapabilityIds: readonly string[];
  allowedOptionalCanonicalCapabilityIds: readonly string[];
  forbiddenCanonicalCapabilityIds: readonly string[];
  zeroProposalExpected: boolean;
  multiCapabilityExpected: boolean;
  requiredCapabilityRationales?: Readonly<Record<string, string>>;
}>;

const fixture = (value: StructuredInferenceCoverageFixture): StructuredInferenceCoverageFixture => Object.freeze({
  ...value,
  requiredCanonicalCapabilityIds: Object.freeze([...value.requiredCanonicalCapabilityIds]),
  allowedOptionalCanonicalCapabilityIds: Object.freeze([...value.allowedOptionalCanonicalCapabilityIds]),
  forbiddenCanonicalCapabilityIds: Object.freeze([...value.forbiddenCanonicalCapabilityIds]),
  ...(value.requiredCapabilityRationales ? { requiredCapabilityRationales: Object.freeze({ ...value.requiredCapabilityRationales }) } : {}),
});

export const structuredInferenceCoverageFixtures = Object.freeze([
  fixture({ fixtureId: "l1-demand-forecast", atomicEvidence: "Built monthly demand forecasts from historical sales and seasonality, then refreshed projections as actuals arrived.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["forecasting"], allowedOptionalCanonicalCapabilityIds: ["variance-analysis"], forbiddenCanonicalCapabilityIds: ["scenario-modelling", "strategic-analysis"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-supplier-negotiation", atomicEvidence: "Negotiated a supplier renewal by testing pricing assumptions, trading contract terms, and securing a lower total cost without reducing service scope.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["commercial-negotiation"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["commercial-partnerships", "investment-governance"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-behavioural-segmentation", atomicEvidence: "Developed a behavioural customer segmentation from transaction patterns and validated the groups for differentiated campaign planning.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["customer-segmentation"], allowedOptionalCanonicalCapabilityIds: ["audience-insight"], forbiddenCanonicalCapabilityIds: ["market-strategy", "research-design"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-release-risk-control", atomicEvidence: "Designed and operated a risk control that detected unauthorised changes, recorded exceptions, and required remediation before release.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["risk-controls"], allowedOptionalCanonicalCapabilityIds: ["operating-control"], forbiddenCanonicalCapabilityIds: ["policy-governance", "regulatory-compliance"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-team-leadership", atomicEvidence: "Managed a team of analysts through weekly coaching, workload decisions, performance feedback, and individual development planning.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["people-leadership"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["business-ownership", "change-leadership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-workshop-delivery", atomicEvidence: "Designed and delivered a practical workshop, assessed participant exercises, and adapted the final module when learners struggled with one concept.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["education-delivery"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["education-partnerships", "people-leadership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-workflow-improvement", atomicEvidence: "Mapped an approval workflow, removed two duplicate hand-offs, and reduced turnaround time while preserving the required checks.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["process-improvement"], allowedOptionalCanonicalCapabilityIds: ["operating-control"], forbiddenCanonicalCapabilityIds: ["operating-model", "change-leadership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l1-operating-model", atomicEvidence: "Defined a future operating model covering decision rights, service ownership, governance forums, and hand-offs between central and regional teams.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "explicit_single_dimension", requiredCanonicalCapabilityIds: ["operating-model"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["organisation-design", "operating-rhythm"], zeroProposalExpected: false, multiCapabilityExpected: false }),

  fixture({ fixtureId: "l2-decision-brief", atomicEvidence: "Reconciled conflicting survey, sales and service findings into one recommendation, making the trade-offs and limits clear enough for an executive decision.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "implicit_realistic_evidence", requiredCanonicalCapabilityIds: ["insight-synthesis"], allowedOptionalCanonicalCapabilityIds: ["strategic-analysis"], forbiddenCanonicalCapabilityIds: ["research-design", "forecasting"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-university-joint-programme", atomicEvidence: "Agreed a two-year student-industry programme with a university faculty, resolving responsibilities, placements, supervision and shared delivery commitments.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "implicit_realistic_evidence", requiredCanonicalCapabilityIds: ["education-partnerships"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["commercial-partnerships", "education-delivery", "partner-strategy"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-analyst-workspace", atomicEvidence: "Replaced locally maintained analyst spreadsheets with a shared workspace, reusable templates and office hours that enabled the team to produce routine reporting independently.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "platform_tool_rollout", requiredCanonicalCapabilityIds: ["tooling-enablement"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["analytics-governance", "architecture-governance", "change-leadership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-metric-decision-rights", atomicEvidence: "Resolved conflicting business measures by assigning owners, documenting calculation rules and introducing approval before definitions could enter executive reporting.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "governance_control_program", requiredCanonicalCapabilityIds: ["analytics-governance"], allowedOptionalCanonicalCapabilityIds: ["policy-governance"], forbiddenCanonicalCapabilityIds: ["tooling-enablement", "architecture-governance"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-regulated-release", atomicEvidence: "Brought legal, operations and engineering around one release sequence, closed ownership gaps and removed inter-team blockers before the regulatory deadline.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "delivery_execution", requiredCanonicalCapabilityIds: ["cross-functional-delivery"], allowedOptionalCanonicalCapabilityIds: ["dependency-management"], forbiddenCanonicalCapabilityIds: ["regulatory-compliance", "change-leadership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-service-accountabilities", atomicEvidence: "Shifted service accountabilities from regional generalists into specialist teams, clarified decision rights and redrew reporting lines around the new structure.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "people_organisation_change", requiredCanonicalCapabilityIds: ["organisation-design"], allowedOptionalCanonicalCapabilityIds: ["operating-model"], forbiddenCanonicalCapabilityIds: ["people-process", "people-leadership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-feature-behaviour", atomicEvidence: "Traced where users abandoned a new feature, separated onboarding friction from low-value usage and converted the findings into a prioritised product hypothesis.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "analytics_decision_product", requiredCanonicalCapabilityIds: ["product-insights"], allowedOptionalCanonicalCapabilityIds: ["insight-synthesis"], forbiddenCanonicalCapabilityIds: ["roadmap-governance", "customer-segmentation"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-onboarding-activation", atomicEvidence: "Tested revised onboarding steps with new subscribers, removed the main activation barrier and tracked whether first-month use was sustained.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "customer_go_to_market", requiredCanonicalCapabilityIds: ["customer-adoption"], allowedOptionalCanonicalCapabilityIds: ["product-insights"], forbiddenCanonicalCapabilityIds: ["change-leadership", "education-delivery"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-joint-market-offer", atomicEvidence: "Built a joint offer with a distribution company, aligned incentives and service responsibilities, and governed delivery through a shared quarterly plan.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "commercial_partnership", requiredCanonicalCapabilityIds: ["commercial-partnerships"], allowedOptionalCanonicalCapabilityIds: ["partner-strategy"], forbiddenCanonicalCapabilityIds: ["commercial-negotiation", "education-partnerships"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-fortnightly-product-forum", atomicEvidence: "Introduced a fortnightly forum where product teams reviewed outcomes, surfaced blocked decisions and committed the next slice of work to named owners.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "product_operating_system", requiredCanonicalCapabilityIds: ["product-cadence"], allowedOptionalCanonicalCapabilityIds: ["operating-rhythm"], forbiddenCanonicalCapabilityIds: ["roadmap-governance", "business-ownership"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-market-entry-options", atomicEvidence: "Compared three market-entry paths across demand, economics, execution constraints and downside exposure, then recommended the option with the strongest risk-adjusted case.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "strategy_decision", requiredCanonicalCapabilityIds: ["strategic-analysis"], allowedOptionalCanonicalCapabilityIds: ["market-strategy", "scenario-modelling"], forbiddenCanonicalCapabilityIds: ["investment-governance", "operating-strategy"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-promotion-workflow", atomicEvidence: "Reworked promotion intake, calibration and approval steps so managers used common evidence, employees received timely decisions and exceptions had a clear owner.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "people_process", requiredCanonicalCapabilityIds: ["people-process"], allowedOptionalCanonicalCapabilityIds: ["operating-control"], forbiddenCanonicalCapabilityIds: ["talent-planning", "employee-relations"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "l2-realised-savings", atomicEvidence: "Set the expected savings and service measures for an automation investment, reconciled them after launch and challenged owners where realised value fell short of the approved case.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "value_realisation", requiredCanonicalCapabilityIds: ["benefits-realisation"], allowedOptionalCanonicalCapabilityIds: ["investment-governance"], forbiddenCanonicalCapabilityIds: ["forecasting", "operating-control"], zeroProposalExpected: false, multiCapabilityExpected: false }),

  fixture({ fixtureId: "l3-field-service-rollout", atomicEvidence: "Moved field technicians from paper schedules to a mobile dispatch application, using depot champions, ride-along practice and weekly friction reviews until crews stopped reverting to the old routine.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "platform_tool_rollout", requiredCanonicalCapabilityIds: ["tooling-enablement", "change-leadership"], allowedOptionalCanonicalCapabilityIds: ["education-delivery"], forbiddenCanonicalCapabilityIds: ["customer-adoption", "people-leadership"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "tooling-enablement": "The person operationalised a new application through practical use support rather than merely using it.", "change-leadership": "Champions, practice and active removal of reversion behaviour materially demonstrate adoption leadership without relying on a change keyword." } }),
  fixture({ fixtureId: "l3-procurement-exception-regime", atomicEvidence: "Introduced exception checks for high-risk purchases while aligning finance, procurement and business-unit owners on thresholds, hand-offs and remediation so the control worked across teams rather than on paper.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "governance_control_program", requiredCanonicalCapabilityIds: ["risk-controls", "cross-functional-delivery"], allowedOptionalCanonicalCapabilityIds: ["operating-control"], forbiddenCanonicalCapabilityIds: ["policy-governance", "change-leadership"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "risk-controls": "The evidence establishes detection thresholds, exceptions and remediation for a defined risk.", "cross-functional-delivery": "The control was made operational through coordinated ownership and hand-offs across three functions." } }),
  fixture({ fixtureId: "l3-marketing-investment-loop", atomicEvidence: "Combined test-versus-control results with spend and margin data, then set decision thresholds with marketing and finance that redirected budget from weak activity into proven channels each month.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "analytics_decision_product", requiredCanonicalCapabilityIds: ["marketing-effectiveness", "investment-governance"], allowedOptionalCanonicalCapabilityIds: ["measurement-design"], forbiddenCanonicalCapabilityIds: ["forecasting", "market-strategy"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "marketing-effectiveness": "The work evaluates causal campaign performance and changes channel allocation from the result.", "investment-governance": "Agreed thresholds and a recurring cross-functional allocation decision materially govern investment." } }),
  fixture({ fixtureId: "l3-claims-workflow-adoption", atomicEvidence: "Cut a claims approval path from seven hand-offs to four, piloted the new sequence with two teams and worked through manager resistance until the revised routine held without daily intervention.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "operating_model_process_redesign", requiredCanonicalCapabilityIds: ["process-improvement", "change-leadership"], allowedOptionalCanonicalCapabilityIds: ["cross-functional-delivery"], forbiddenCanonicalCapabilityIds: ["operating-model", "people-leadership"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "process-improvement": "The person removed hand-offs and implemented a demonstrably leaner operating sequence.", "change-leadership": "Piloting, addressing resistance and sustaining the new behaviour are independent adoption actions." } }),
  fixture({ fixtureId: "l3-channel-needs-offer", atomicEvidence: "Used interviews and purchase patterns to isolate the needs of two underserved buyer groups, then worked with a channel partner to reshape the offer and launch route for each group.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "customer_go_to_market", requiredCanonicalCapabilityIds: ["audience-insight", "commercial-partnerships"], allowedOptionalCanonicalCapabilityIds: ["customer-segmentation", "market-strategy"], forbiddenCanonicalCapabilityIds: ["research-design", "commercial-negotiation"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "audience-insight": "The person derives differentiated buyer needs from qualitative and behavioural evidence.", "commercial-partnerships": "The resulting offer and route are jointly developed with an external channel partner." } }),
  fixture({ fixtureId: "l3-case-platform-transition", atomicEvidence: "Moved a service operation onto a new case platform across four staged cutovers, sequencing vendor, data and frontline dependencies while building scenario practice that enabled staff to handle live cases from day one.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "migration_transition_program", requiredCanonicalCapabilityIds: ["tooling-enablement", "dependency-management", "education-delivery"], allowedOptionalCanonicalCapabilityIds: ["cross-functional-delivery"], forbiddenCanonicalCapabilityIds: ["change-leadership", "customer-adoption"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "tooling-enablement": "The new platform is operationalised for frontline work rather than merely installed.", "dependency-management": "Four cutovers explicitly require sequencing vendor, data and operational dependencies.", "education-delivery": "Scenario practice is designed and delivered to establish day-one performance." } }),
  fixture({ fixtureId: "l3-logistics-partner-renewal", atomicEvidence: "Reset a logistics contract after repeated failures, trading price and service terms while agreeing a two-year joint improvement agenda, executive checkpoints and shared expansion priorities.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "commercial_partnership", requiredCanonicalCapabilityIds: ["commercial-negotiation", "partner-strategy"], allowedOptionalCanonicalCapabilityIds: ["commercial-partnerships"], forbiddenCanonicalCapabilityIds: ["account-growth", "operating-strategy"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "commercial-negotiation": "Price and service terms are actively traded to reset the contract.", "partner-strategy": "The multi-year agenda, governance and joint priorities define the future partner direction beyond the transaction." } }),
  fixture({ fixtureId: "l3-centralised-service-transition", atomicEvidence: "Consolidated locally run support into one specialist function, reset roles and decision rights, and used manager clinics plus staged transfers to keep teams engaged until the new accountabilities became routine.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "people_organisation_change", requiredCanonicalCapabilityIds: ["organisation-design", "change-leadership"], allowedOptionalCanonicalCapabilityIds: ["operating-model"], forbiddenCanonicalCapabilityIds: ["people-leadership", "people-process"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "organisation-design": "The work changes structural ownership, roles and decision rights.", "change-leadership": "Clinics, staged transfers and sustained engagement establish adoption of the new accountabilities." } }),
  fixture({ fixtureId: "l3-mobile-product-decisions", atomicEvidence: "Replaced ad-hoc feature requests with a fortnightly evidence review where product, engineering and service teams resolved sequencing conflicts, assigned owners and updated the shared release plan.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "dominant_dimension_overshadowing", rationaleCategory: "product_operating_system", requiredCanonicalCapabilityIds: ["product-cadence", "roadmap-governance", "cross-functional-delivery"], allowedOptionalCanonicalCapabilityIds: ["dependency-management"], forbiddenCanonicalCapabilityIds: ["business-ownership", "change-leadership"], zeroProposalExpected: false, multiCapabilityExpected: true, requiredCapabilityRationales: { "product-cadence": "A recurring evidence-based product decision rhythm is established.", "roadmap-governance": "Sequencing, ownership and updates to the shared release plan create an explicit roadmap decision mechanism.", "cross-functional-delivery": "Product, engineering and service jointly resolve delivery conflicts and commit owners." } }),

  fixture({ fixtureId: "adv-tool-use-not-enablement", atomicEvidence: "Used a spreadsheet supplied by finance to compare actual expenditure with budget and explain the largest monthly differences.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "tool_use_without_enablement", requiredCanonicalCapabilityIds: ["variance-analysis"], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["tooling-enablement", "forecasting", "investment-governance"], zeroProposalExpected: false, multiCapabilityExpected: false }),
  fixture({ fixtureId: "adv-change-participant", atomicEvidence: "The department moved to a new rostering system; attended the required briefing and used the new screen after access was enabled.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "change_without_leadership", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["change-leadership", "tooling-enablement", "education-delivery"], zeroProposalExpected: true, multiCapabilityExpected: false, requiredCapabilityRationales: {} }),
  fixture({ fixtureId: "adv-stakeholder-attendance", atomicEvidence: "Stakeholders from sales, legal and operations attended the monthly meeting and received the circulated status pack.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "stakeholders_without_influence", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["cross-functional-delivery", "insight-synthesis", "operating-rhythm"], zeroProposalExpected: true, multiCapabilityExpected: false }),
  fixture({ fixtureId: "adv-control-compliance", atomicEvidence: "Followed the required approval checklist and escalated the form when a mandatory signature was missing.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "governance_compliance_only", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["risk-controls", "operating-control", "policy-governance"], zeroProposalExpected: true, multiCapabilityExpected: false }),
  fixture({ fixtureId: "adv-transformation-context", atomicEvidence: "Worked as an analyst in a transformation programme and prepared the weekly status report from updates supplied by workstream owners.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "transformation_context_without_leadership", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["change-leadership", "cross-functional-delivery", "operating-strategy", "service-performance"], zeroProposalExpected: true, multiCapabilityExpected: false, requiredCapabilityRationales: {} }),
  fixture({ fixtureId: "adv-led-data-entry", atomicEvidence: "Led data entry for the weekly register by copying approved values into the template and submitting it before the deadline.", difficultyLevel: "LEVEL_3_OVERSHADOWED", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "led_grammar_without_leadership", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["people-leadership", "change-leadership", "analytics-governance", "tooling-enablement"], zeroProposalExpected: true, multiCapabilityExpected: false, requiredCapabilityRationales: {} }),
  fixture({ fixtureId: "adv-collaboration-mention", atomicEvidence: "Collaborated with colleagues from several functions and participated in regular project discussions.", difficultyLevel: "LEVEL_2_IMPLICIT_CLEAR", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "collaboration_without_delivery", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["cross-functional-delivery", "commercial-partnerships", "dependency-management"], zeroProposalExpected: true, multiCapabilityExpected: false }),
  fixture({ fixtureId: "adv-metadata-title-skills", atomicEvidence: "Senior Analytics Manager. MBA. Skills: leadership, forecasting, transformation, governance, stakeholder management.", difficultyLevel: "LEVEL_1_EXPLICIT", primaryFailureClass: "adversarial_keyword_trap", rationaleCategory: "metadata_title_education_skills", requiredCanonicalCapabilityIds: [], allowedOptionalCanonicalCapabilityIds: [], forbiddenCanonicalCapabilityIds: ["people-leadership", "forecasting", "change-leadership", "analytics-governance"], zeroProposalExpected: true, multiCapabilityExpected: false }),
]);

export type StructuredInferenceCoverageMetrics = Readonly<{
  requiredRecall: number;
  requiredRecallByDifficulty: Readonly<Record<StructuredInferenceDifficulty, number>>;
  dominantDimensionOvershadowingRecall: number;
  forbiddenFalsePositiveRate: number;
  multiCapabilityCompleteness: number;
  zeroProposalPrecision: number;
  evidenceLinkValidity: number;
  unknownCanonicalIdCount: number;
  duplicateMappingCount: number;
  validatorRejectionRate: number;
  unexpectedOutputCount: number;
  averageProposalCount: number;
  proposalCountDistribution: Readonly<Record<string, number>>;
  perFamilyRequiredRecall: Readonly<Record<string, number>>;
}>;

export function evaluateStructuredInferenceCoverage(input: {
  fixtures: readonly StructuredInferenceCoverageFixture[];
  response: CareerCapabilityStructuredInferenceResponse;
  validation: CareerCapabilityStructuredInferenceValidationResult;
  canonicalCapabilities: readonly { id: string; family: string }[];
}): Readonly<{ metrics: StructuredInferenceCoverageMetrics; fixtureResults: readonly Readonly<{ fixtureId: string; difficultyLevel: StructuredInferenceDifficulty; primaryFailureClass: string; producedCapabilityIds: readonly string[]; missingRequiredIds: readonly string[]; forbiddenHitIds: readonly string[]; unexpectedIds: readonly string[] }>[] }> {
  const canonicalIds = new Set(input.canonicalCapabilities.map((item) => item.id));
  const familyById = new Map(input.canonicalCapabilities.map((item) => [item.id, item.family] as const));
  const fixtureById = new Map(input.fixtures.map((item) => [item.fixtureId, item] as const));
  const validByEvidence = new Map(input.validation.validEvidenceResults.map((item) => [item.evidenceId, item.capabilityAssessments.map((assessment) => assessment.capabilityId)] as const));
  const rawResults = Array.isArray(input.response.results) ? input.response.results : [];
  let invalidEvidenceLinks = 0;
  let unknownCanonicalIdCount = 0;
  let duplicateMappingCount = 0;
  for (const result of rawResults) {
    if (!fixtureById.has(result.evidenceId)) invalidEvidenceLinks += 1;
    const seen = new Set<string>();
    for (const assessment of Array.isArray(result.capabilityAssessments) ? result.capabilityAssessments : []) {
      if (!canonicalIds.has(assessment.capabilityId)) unknownCanonicalIdCount += 1;
      if (seen.has(assessment.capabilityId)) duplicateMappingCount += 1;
      seen.add(assessment.capabilityId);
    }
  }

  let requiredTotal = 0;
  let requiredHitTotal = 0;
  let forbiddenTotal = 0;
  let forbiddenHitTotal = 0;
  let multiTotal = 0;
  let multiComplete = 0;
  let zeroTotal = 0;
  let zeroCorrect = 0;
  let unexpectedOutputCount = 0;
  let proposalTotal = 0;
  let overshadowedRequiredTotal = 0;
  let overshadowedRequiredHits = 0;
  const difficultyTotals = new Map<StructuredInferenceDifficulty, number>();
  const difficultyHits = new Map<StructuredInferenceDifficulty, number>();
  const proposalCountDistribution: Record<string, number> = {};
  const familyTotals = new Map<string, number>();
  const familyHits = new Map<string, number>();
  const fixtureResults = input.fixtures.map((item) => {
    const produced = [...new Set(validByEvidence.get(item.fixtureId) ?? [])].sort();
    const producedSet = new Set(produced);
    const allowed = new Set([...item.requiredCanonicalCapabilityIds, ...item.allowedOptionalCanonicalCapabilityIds]);
    const missingRequiredIds = item.requiredCanonicalCapabilityIds.filter((id) => !producedSet.has(id));
    const forbiddenHitIds = item.forbiddenCanonicalCapabilityIds.filter((id) => producedSet.has(id));
    const unexpectedIds = produced.filter((id) => !allowed.has(id));
    const hits = item.requiredCanonicalCapabilityIds.length - missingRequiredIds.length;
    requiredTotal += item.requiredCanonicalCapabilityIds.length;
    requiredHitTotal += hits;
    difficultyTotals.set(item.difficultyLevel, (difficultyTotals.get(item.difficultyLevel) ?? 0) + item.requiredCanonicalCapabilityIds.length);
    difficultyHits.set(item.difficultyLevel, (difficultyHits.get(item.difficultyLevel) ?? 0) + hits);
    if (item.primaryFailureClass === "dominant_dimension_overshadowing") {
      overshadowedRequiredTotal += item.requiredCanonicalCapabilityIds.length;
      overshadowedRequiredHits += hits;
    }
    forbiddenTotal += item.forbiddenCanonicalCapabilityIds.length;
    forbiddenHitTotal += forbiddenHitIds.length;
    unexpectedOutputCount += unexpectedIds.length;
    proposalTotal += produced.length;
    proposalCountDistribution[String(produced.length)] = (proposalCountDistribution[String(produced.length)] ?? 0) + 1;
    if (item.multiCapabilityExpected) {
      multiTotal += 1;
      if (missingRequiredIds.length === 0) multiComplete += 1;
    }
    if (item.zeroProposalExpected) {
      zeroTotal += 1;
      if (produced.length === 0) zeroCorrect += 1;
    }
    for (const capabilityId of item.requiredCanonicalCapabilityIds) {
      const family = familyById.get(capabilityId) ?? "UNKNOWN";
      familyTotals.set(family, (familyTotals.get(family) ?? 0) + 1);
      if (producedSet.has(capabilityId)) familyHits.set(family, (familyHits.get(family) ?? 0) + 1);
    }
    return Object.freeze({ fixtureId: item.fixtureId, difficultyLevel: item.difficultyLevel, primaryFailureClass: item.primaryFailureClass, producedCapabilityIds: Object.freeze(produced), missingRequiredIds: Object.freeze([...missingRequiredIds]), forbiddenHitIds: Object.freeze([...forbiddenHitIds]), unexpectedIds: Object.freeze([...unexpectedIds]) });
  });
  const recallForDifficulty = (difficulty: StructuredInferenceDifficulty) => {
    const total = difficultyTotals.get(difficulty) ?? 0;
    return total === 0 ? 1 : (difficultyHits.get(difficulty) ?? 0) / total;
  };
  const perFamilyRequiredRecall = Object.fromEntries([...familyTotals].sort(([left], [right]) => left.localeCompare(right)).map(([family, total]) => [family, (familyHits.get(family) ?? 0) / total]));
  const validatorResultCount = input.validation.validEvidenceResults.length + input.validation.rejectedEvidenceResults.length;
  return Object.freeze({ metrics: Object.freeze({
    requiredRecall: requiredTotal === 0 ? 1 : requiredHitTotal / requiredTotal,
    requiredRecallByDifficulty: Object.freeze({ LEVEL_1_EXPLICIT: recallForDifficulty("LEVEL_1_EXPLICIT"), LEVEL_2_IMPLICIT_CLEAR: recallForDifficulty("LEVEL_2_IMPLICIT_CLEAR"), LEVEL_3_OVERSHADOWED: recallForDifficulty("LEVEL_3_OVERSHADOWED") }),
    dominantDimensionOvershadowingRecall: overshadowedRequiredTotal === 0 ? 1 : overshadowedRequiredHits / overshadowedRequiredTotal,
    forbiddenFalsePositiveRate: forbiddenTotal === 0 ? 0 : forbiddenHitTotal / forbiddenTotal,
    multiCapabilityCompleteness: multiTotal === 0 ? 1 : multiComplete / multiTotal,
    zeroProposalPrecision: zeroTotal === 0 ? 1 : zeroCorrect / zeroTotal,
    evidenceLinkValidity: rawResults.length === 0 ? 1 : (rawResults.length - invalidEvidenceLinks) / rawResults.length,
    unknownCanonicalIdCount,
    duplicateMappingCount,
    validatorRejectionRate: validatorResultCount === 0 ? 0 : input.validation.rejectedEvidenceResults.length / validatorResultCount,
    unexpectedOutputCount,
    averageProposalCount: proposalTotal / input.fixtures.length,
    proposalCountDistribution: Object.freeze({ ...proposalCountDistribution }),
    perFamilyRequiredRecall: Object.freeze(perFamilyRequiredRecall),
  }), fixtureResults: Object.freeze(fixtureResults) });
}
