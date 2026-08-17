export const CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION = "1.0.0" as const;
export const CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION = "1.3.0" as const;

export type CanonicalCapabilitySemanticDistinction = Readonly<{
  capabilityId: string;
  boundary: string;
}>;

export type CanonicalCapabilitySemanticContract = Readonly<{
  definition: string;
  positiveEvidence: readonly string[];
  notSufficient: readonly string[];
  distinctions: readonly CanonicalCapabilitySemanticDistinction[];
}>;

export type CanonicalCapabilityDefinition = {
  readonly id: string;
  readonly label: string;
  readonly family: string;
  /** Optional on the shared type for legacy/synthetic consumers; mandatory in validated canonical authority. */
  readonly semanticContract?: CanonicalCapabilitySemanticContract;
};

export type CanonicalCapabilityLibrary = {
  readonly schemaVersion: string;
  readonly contentVersion: string;
  readonly capabilities: readonly CanonicalCapabilityDefinition[];
};

export type CanonicalCapabilityLibraryIssueCode =
  | "invalid_schema_version"
  | "invalid_content_version"
  | "empty_capability_library"
  | "invalid_capability_id"
  | "invalid_capability_label"
  | "invalid_capability_family"
  | "duplicate_capability_id"
  | "duplicate_capability_label"
  | "invalid_semantic_contract"
  | "invalid_semantic_distinction"
  | "noncanonical_order";

export type CanonicalCapabilityLibraryIssue = {
  code: CanonicalCapabilityLibraryIssueCode;
  path: string;
  message: string;
};

export type CanonicalCapabilityLibraryValidationResult =
  | { ok: true; library: CanonicalCapabilityLibrary }
  | { ok: false; issues: readonly CanonicalCapabilityLibraryIssue[] };

export type CanonicalCapabilityLibraryVersionTransitionIssue = {
  code:
    | "invalid_previous_library"
    | "invalid_next_library"
    | "content_changed_without_version_change"
    | "content_unchanged_with_version_change";
  severity: "error" | "warning";
  path: string;
  message: string;
};

export type CanonicalCapabilityLibraryVersionTransitionResult =
  | { ok: true; warnings: readonly CanonicalCapabilityLibraryVersionTransitionIssue[] }
  | { ok: false; issues: readonly CanonicalCapabilityLibraryVersionTransitionIssue[] };

const capabilityIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const versionPattern = /^\d+\.\d+\.\d+$/;
const compareText = (left: string, right: string) => left.localeCompare(right, "en");
const canonicalText = (value: string) => value.length > 0 && value === value.trim();

function compareCapabilities(left: CanonicalCapabilityDefinition, right: CanonicalCapabilityDefinition) {
  return compareText(left.family, right.family) || compareText(left.label, right.label) || compareText(left.id, right.id);
}

function validationIssue(
  code: CanonicalCapabilityLibraryIssueCode,
  path: string,
  message: string,
): CanonicalCapabilityLibraryIssue {
  return { code, path, message };
}

/** Stable authoritative content; the explicit content version remains authoritative. */
export function serializeCanonicalCapabilityLibraryContent(library: CanonicalCapabilityLibrary) {
  return JSON.stringify(library.capabilities.map(({ id, label, family, semanticContract }) => ({ id, label, family, semanticContract })));
}

/** Pure compact context for future inference evaluation; F.9 does not wire it into a provider. */
export function serializeCanonicalCapabilitySemanticContext(library: CanonicalCapabilityLibrary) {
  return JSON.stringify(library.capabilities.map(({ id, label, family, semanticContract }) => ({
    id,
    label,
    family,
    definition: semanticContract?.definition,
    positiveEvidence: semanticContract?.positiveEvidence,
    notSufficient: semanticContract?.notSufficient,
    distinctions: semanticContract?.distinctions,
  })));
}

export function validateCanonicalCapabilityLibrary(
  library: CanonicalCapabilityLibrary,
): CanonicalCapabilityLibraryValidationResult {
  const issues: CanonicalCapabilityLibraryIssue[] = [];
  if (library.schemaVersion !== CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION) {
    issues.push(validationIssue("invalid_schema_version", "schemaVersion", `Unsupported canonical capability library schema version ${library.schemaVersion}.`));
  }
  if (!versionPattern.test(library.contentVersion)) {
    issues.push(validationIssue("invalid_content_version", "contentVersion", `Canonical capability content version ${library.contentVersion || "<empty>"} is invalid.`));
  }
  if (library.capabilities.length === 0) {
    issues.push(validationIssue("empty_capability_library", "capabilities", "Canonical capability library must contain at least one definition."));
  }

  const canonicalIds = new Set(library.capabilities.map((capability) => capability.id));
  const ids = new Set<string>();
  const labels = new Set<string>();
  library.capabilities.forEach((capability, index) => {
    const path = `capabilities[${index}]`;
    if (!canonicalText(capability.id) || !capabilityIdPattern.test(capability.id)) {
      issues.push(validationIssue("invalid_capability_id", `${path}.id`, `Canonical capability ID ${capability.id || "<empty>"} is invalid.`));
    }
    if (!canonicalText(capability.label)) {
      issues.push(validationIssue("invalid_capability_label", `${path}.label`, `Canonical capability label for ${capability.id || "<empty>"} is invalid.`));
    }
    if (!canonicalText(capability.family)) {
      issues.push(validationIssue("invalid_capability_family", `${path}.family`, `Canonical capability family for ${capability.id || "<empty>"} is invalid.`));
    }
    if (ids.has(capability.id)) issues.push(validationIssue("duplicate_capability_id", `${path}.id`, `Canonical capability ID ${capability.id} is duplicated.`));
    if (labels.has(capability.label)) issues.push(validationIssue("duplicate_capability_label", `${path}.label`, `Canonical capability label ${capability.label} is duplicated.`));
    const contract = capability.semanticContract;
    if (!contract || !canonicalText(contract.definition) || contract.positiveEvidence.length < 2 || contract.positiveEvidence.length > 4 || contract.notSufficient.length < 2 || contract.notSufficient.length > 4) {
      issues.push(validationIssue("invalid_semantic_contract", `${path}.semanticContract`, `Canonical capability ${capability.id || "<empty>"} requires a concise definition, 2-4 positive evidence criteria, and 2-4 exclusions.`));
    } else {
      const validCriteria = [...contract.positiveEvidence, ...contract.notSufficient].every(canonicalText);
      const neighbourIds = contract.distinctions.map((distinction) => distinction.capabilityId);
      const validDistinctions = contract.distinctions.every((distinction) => canonicalText(distinction.capabilityId) && canonicalText(distinction.boundary) && distinction.capabilityId !== capability.id && canonicalIds.has(distinction.capabilityId));
      if (!validCriteria || !validDistinctions || new Set(neighbourIds).size !== neighbourIds.length) {
        issues.push(validationIssue("invalid_semantic_distinction", `${path}.semanticContract`, `Canonical capability ${capability.id} has invalid evidence criteria or neighbour distinctions.`));
      }
    }
    ids.add(capability.id);
    labels.add(capability.label);
    if (index > 0 && compareCapabilities(library.capabilities[index - 1], capability) > 0) {
      issues.push(validationIssue("noncanonical_order", path, `Canonical capability ${capability.id || "<empty>"} is out of order.`));
    }
  });

  issues.sort((left, right) => compareText(left.path, right.path) || compareText(left.code, right.code) || compareText(left.message, right.message));
  return issues.length > 0 ? { ok: false, issues } : { ok: true, library };
}

export function validateCanonicalCapabilityLibraryVersionTransition(
  previous: CanonicalCapabilityLibrary,
  next: CanonicalCapabilityLibrary,
): CanonicalCapabilityLibraryVersionTransitionResult {
  const previousValidation = validateCanonicalCapabilityLibrary(previous);
  const nextValidation = validateCanonicalCapabilityLibrary(next);
  const invalid: CanonicalCapabilityLibraryVersionTransitionIssue[] = [];
  if (!previousValidation.ok) invalid.push({ code: "invalid_previous_library", severity: "error", path: "previous", message: "Previous canonical capability library is invalid." });
  if (!nextValidation.ok) invalid.push({ code: "invalid_next_library", severity: "error", path: "next", message: "Next canonical capability library is invalid." });
  if (invalid.length > 0) return { ok: false, issues: invalid };

  const contentChanged = serializeCanonicalCapabilityLibraryContent(previous) !== serializeCanonicalCapabilityLibraryContent(next);
  const versionChanged = previous.contentVersion !== next.contentVersion;
  if (contentChanged && !versionChanged) return { ok: false, issues: [{ code: "content_changed_without_version_change", severity: "error", path: "contentVersion", message: "Canonical capability content changed without a content-version change." }] };
  if (!contentChanged && versionChanged) return { ok: true, warnings: [{ code: "content_unchanged_with_version_change", severity: "warning", path: "contentVersion", message: "Canonical capability content version changed without a structural content change." }] };
  return { ok: true, warnings: [] };
}

const seedCapabilityIdentities = [
  { id: "forecasting", label: "Forecasting", family: "Analytics & Insight" },
  { id: "insight-synthesis", label: "Insight Synthesis", family: "Analytics & Insight" },
  { id: "marketing-effectiveness", label: "Marketing Effectiveness", family: "Analytics & Insight" },
  { id: "measurement-design", label: "Measurement Design", family: "Analytics & Insight" },
  { id: "research-design", label: "Research Design", family: "Analytics & Insight" },
  { id: "scenario-modelling", label: "Scenario Modelling", family: "Analytics & Insight" },
  { id: "variance-analysis", label: "Variance Analysis", family: "Analytics & Insight" },
  { id: "account-growth", label: "Account Growth", family: "Commercial" },
  { id: "commercial-negotiation", label: "Commercial Negotiation", family: "Commercial" },
  { id: "commercial-partnerships", label: "Commercial Partnerships", family: "Commercial" },
  { id: "consultative-selling", label: "Consultative Selling", family: "Commercial" },
  { id: "pipeline-management", label: "Pipeline Management", family: "Commercial" },
  { id: "education-partnerships", label: "Education Partnerships", family: "Communication & Collaboration" },
  { id: "audience-insight", label: "Audience Insight", family: "Customer & Market" },
  { id: "customer-adoption", label: "Customer Adoption", family: "Customer & Market" },
  { id: "customer-segmentation", label: "Customer Segmentation", family: "Customer & Market" },
  { id: "legal-technology", label: "Legal Technology", family: "Data & Technology" },
  { id: "tooling-enablement", label: "Tooling Enablement", family: "Data & Technology" },
  { id: "analytics-governance", label: "Analytics Governance", family: "Governance & Risk" },
  { id: "architecture-governance", label: "Architecture Governance", family: "Governance & Risk" },
  { id: "investment-governance", label: "Investment Governance", family: "Governance & Risk" },
  { id: "operating-control", label: "Operating Control", family: "Governance & Risk" },
  { id: "policy-governance", label: "Policy Governance", family: "Governance & Risk" },
  { id: "regulatory-compliance", label: "Regulatory Compliance", family: "Governance & Risk" },
  { id: "risk-controls", label: "Risk and Controls", family: "Governance & Risk" },
  { id: "business-ownership", label: "Business Ownership", family: "Leadership" },
  { id: "commercial-leadership", label: "Commercial Leadership", family: "Leadership" },
  { id: "people-leadership", label: "People Leadership", family: "Leadership" },
  { id: "education-delivery", label: "Education Delivery", family: "Learning & Development" },
  { id: "cross-functional-delivery", label: "Cross-functional Delivery", family: "Operations & Delivery" },
  { id: "dependency-management", label: "Dependency Management", family: "Operations & Delivery" },
  { id: "ecosystem-operations", label: "Ecosystem Operations", family: "Operations & Delivery" },
  { id: "operating-rhythm", label: "Operating Rhythm", family: "Operations & Delivery" },
  { id: "process-improvement", label: "Process Improvement", family: "Operations & Delivery" },
  { id: "service-performance", label: "Service Performance", family: "Operations & Delivery" },
  { id: "employee-relations", label: "Employee Relations", family: "People & Organisation" },
  { id: "hr-systems", label: "HR Systems", family: "People & Organisation" },
  { id: "organisation-design", label: "Organisation Design", family: "People & Organisation" },
  { id: "people-process", label: "People Process Design", family: "People & Organisation" },
  { id: "talent-planning", label: "Talent Planning", family: "People & Organisation" },
  { id: "workforce-advisory", label: "Workforce Advisory", family: "People & Organisation" },
  { id: "product-insights", label: "Product Insights", family: "Product" },
  { id: "product-cadence", label: "Product Operating Cadence", family: "Product" },
  { id: "roadmap-governance", label: "Roadmap Governance", family: "Product" },
  { id: "benefits-realisation", label: "Benefits Realisation", family: "Strategy & Transformation" },
  { id: "change-leadership", label: "Change Leadership", family: "Strategy & Transformation" },
  { id: "market-strategy", label: "Market Strategy", family: "Strategy & Transformation" },
  { id: "operating-model", label: "Operating Model Design", family: "Strategy & Transformation" },
  { id: "operating-strategy", label: "Operating Strategy", family: "Strategy & Transformation" },
  { id: "partner-strategy", label: "Partner Strategy", family: "Strategy & Transformation" },
  { id: "strategic-analysis", label: "Strategic Analysis", family: "Strategy & Transformation" },
] as const;

type SeedCapabilityId = (typeof seedCapabilityIdentities)[number]["id"];
type DistinctionSeed = readonly [capabilityId: SeedCapabilityId, boundary: string];

const semanticContract = (
  definition: string,
  positiveEvidence: readonly [string, string, ...string[]],
  notSufficient: readonly [string, string, ...string[]],
  distinctions: readonly [DistinctionSeed, ...DistinctionSeed[]],
): CanonicalCapabilitySemanticContract => Object.freeze({
  definition,
  positiveEvidence: Object.freeze([...positiveEvidence]),
  notSufficient: Object.freeze([...notSufficient]),
  distinctions: Object.freeze(distinctions.map(([capabilityId, boundary]) => Object.freeze({ capabilityId, boundary }))),
});

const semanticContracts = {
  "forecasting": semanticContract("Produces an evidence-based estimate of a future quantity or outcome over a stated horizon.", ["Builds forward projections from relevant drivers or assumptions.", "Updates projections when material assumptions or actuals change."], ["Reporting historical actuals without a future estimate.", "Explaining actual-versus-plan differences without projecting forward."], [["scenario-modelling", "Forecasting produces an expected future view; scenario modelling compares distinct futures under varied assumptions."], ["variance-analysis", "Forecasting estimates what will happen; variance analysis explains why actual performance differed from a baseline."]]),
  "insight-synthesis": semanticContract("Integrates multiple evidence signals into a coherent conclusion or recommendation usable for a decision.", ["Reconciles materially different evidence sources or findings.", "Converts the combined evidence into a supported decision point or recommendation."], ["Restating one metric or source without integration.", "Producing or circulating a report without an interpreted conclusion."], [["strategic-analysis", "Insight synthesis integrates evidence for a decision; strategic analysis explicitly evaluates consequential options and trade-offs."], ["product-insights", "Insight synthesis is domain-general; product insights specifically interprets product-user behaviour for product decisions."]]),
  "marketing-effectiveness": semanticContract("Evaluates how marketing activity contributes to defined commercial or audience outcomes and uses that evidence to optimise action.", ["Compares campaigns, channels, or interventions against meaningful outcomes.", "Changes marketing action or allocation based on effectiveness evidence."], ["Reporting marketing activity or reach without judging impact.", "Researching an audience without evaluating marketing intervention performance."], [["measurement-design", "Marketing effectiveness is the evaluated performance conclusion; measurement design creates the method and measures."], ["investment-governance", "Marketing effectiveness evaluates impact; investment governance controls resource-allocation decisions."]]),
  "measurement-design": semanticContract("Designs a valid, repeatable approach connecting measures, methods, and decision use.", ["Selects measures that answer a defined decision need.", "Defines comparison, attribution, quality, or interpretation rules for the measurement."], ["Tracking a pre-existing metric without designing the approach.", "Governing ownership of metric definitions without designing measurement."], [["research-design", "Measurement design establishes an evaluative measurement system; research design structures an inquiry and evidence collection."], ["analytics-governance", "Measurement design chooses how to measure; analytics governance controls trust, ownership, and use of analytical assets."], ["investment-governance", "Measurement design defines how outcomes will be measured; investment governance decides whether resources should be allocated, continued, or withdrawn."]]),
  "research-design": semanticContract("Designs an inquiry that can credibly answer a defined question through appropriate participants, methods, and evidence.", ["Frames the research question and selects suitable methods or sample.", "Addresses validity, bias, ethics, or the evidence-analysis plan."], ["Participating in research designed by someone else.", "Analysing existing operational data without designing an inquiry."], [["measurement-design", "Research design structures evidence collection for an inquiry; measurement design creates repeatable decision measures."], ["customer-segmentation", "Research design defines how to investigate; customer segmentation produces and validates customer groups."]]),
  "scenario-modelling": semanticContract("Constructs and compares explicit alternative futures by varying material assumptions or drivers.", ["Defines distinct scenarios with explicit assumptions.", "Models consequences across scenarios to inform contingency or choice."], ["Producing one expected forecast.", "Listing options without modelling changed assumptions and consequences."], [["forecasting", "Scenario modelling compares alternative futures; forecasting produces an expected future estimate."], ["strategic-analysis", "Scenario modelling varies future assumptions quantitatively or structurally; strategic analysis may compare options without modelling futures."]]),
  "variance-analysis": semanticContract("Explains material differences between actual outcomes and a baseline such as plan, forecast, standard, or prior period.", ["Quantifies a deviation from a defined baseline.", "Identifies drivers and implications of the deviation."], ["Listing actual and baseline values without explanation.", "Refreshing a future forecast without analysing past deviation."], [["forecasting", "Variance analysis explains observed deviation; forecasting estimates future performance."], ["service-performance", "Variance analysis explains a comparison gap; service performance owns intervention against service outcomes."]]),
  "account-growth": semanticContract("Expands measurable value, revenue, scope, or adoption within an existing customer account.", ["Identifies and acts on an expansion opportunity in an existing account.", "Secures increased revenue, scope, use, or retained value."], ["Routine account servicing without expansion.", "Renewing unchanged terms without increased account value."], [["consultative-selling", "Account growth requires expansion in an existing account; consultative selling diagnoses and shapes a customer solution."], ["customer-adoption", "Account growth requires account-level commercial expansion; customer adoption concerns sustained product or service use."]]),
  "commercial-negotiation": semanticContract("Reaches a commercial agreement by actively trading price, scope, risk, service, or contractual terms.", ["Prepares and tests commercial positions or constraints.", "Exchanges concessions and secures an agreed commercial outcome."], ["Collaborating with a supplier without trading terms.", "Agreeing delivery actions without a commercial exchange."], [["commercial-partnerships", "Commercial negotiation trades terms for an agreement; commercial partnerships establish and operate joint commercial value."], ["investment-governance", "Commercial negotiation determines transaction terms; investment governance governs allocation of resources."]]),
  "commercial-partnerships": semanticContract("Establishes, develops, or manages an inter-organisational partnership with a material commercial purpose or value exchange.", ["Defines mutual commercial value, incentives, or strategic business benefit.", "Builds or governs sustained joint commercial delivery."], ["Collaboration or cross-organisational working without commercial value.", "A joint academic, institutional, or community programme without commercial purpose."], [["partner-strategy", "Commercial partnerships operate joint commercial value; partner strategy chooses partner roles, value logic, and portfolio direction."], ["education-partnerships", "Commercial partnerships require material commercial value; education partnerships are established around learning outcomes."]]),
  "consultative-selling": semanticContract("Diagnoses a prospective customer's problem and shapes a commercially viable solution around it.", ["Elicits customer needs, consequences, and decision constraints.", "Connects a tailored solution to customer value and advances a sale."], ["Presenting a standard product without problem diagnosis.", "Stakeholder consultation with no selling objective."], [["commercial-negotiation", "Consultative selling shapes the solution and value case; commercial negotiation trades the final terms."], ["account-growth", "Consultative selling may acquire or expand business; account growth specifically expands an existing account."]]),
  "pipeline-management": semanticContract("Systematically manages commercial opportunities through defined stages, prioritisation, forecasting, and next actions.", ["Maintains evidence-based opportunity stages and progression actions.", "Prioritises the opportunity portfolio and manages conversion risk."], ["Keeping a contact list without opportunity stages.", "Closing one deal without managing an opportunity portfolio."], [["forecasting", "Pipeline management governs opportunity progression; forecasting estimates future outcomes from drivers."], ["consultative-selling", "Pipeline management governs the portfolio; consultative selling shapes an individual customer solution."]]),
  "education-partnerships": semanticContract("Establishes and sustains inter-organisational collaboration to deliver education, learning, placement, or learner outcomes.", ["Agrees a shared educational purpose and partner responsibilities.", "Maintains joint delivery commitments, governance, or learner outcomes."], ["Delivering teaching without a partner relationship.", "External collaboration whose primary purpose is commercial value."], [["commercial-partnerships", "Education partnerships are grounded in shared learning outcomes; commercial partnerships require material commercial value exchange."], ["education-delivery", "Education partnerships govern inter-organisational learning collaboration; education delivery performs the learning intervention."]]),
  "audience-insight": semanticContract("Derives a supported understanding of an audience's needs, motivations, attitudes, or behaviour that changes a decision.", ["Combines audience evidence to identify a meaningful need or behaviour.", "Applies the interpreted insight to an offer, communication, or experience choice."], ["A demographic description without interpreted meaning.", "Generic customer contact without evidence-based insight."], [["customer-segmentation", "Audience insight interprets needs or behaviour; customer segmentation constructs and validates distinct groups."], ["product-insights", "Audience insight concerns an audience broadly; product insights specifically informs product decisions from product-user evidence."]]),
  "customer-adoption": semanticContract("Increases and sustains customers' meaningful use of a product, service, or changed customer workflow.", ["Identifies and removes a customer adoption barrier.", "Measures sustained customer use, behaviour, or realised customer value."], ["Employee adoption of an internal tool.", "Launching or announcing a product without evidence of sustained use."], [["tooling-enablement", "Customer adoption concerns external customers; tooling enablement makes a work tool usable by its users."], ["change-leadership", "Customer adoption changes customer use; change leadership stabilises organisational behaviour and ways of working."]]),
  "customer-segmentation": semanticContract("Creates and validates distinct customer groups using meaningful characteristics or behaviour for differentiated action.", ["Selects discriminating variables and derives actionable groups.", "Validates the groups and applies them to differentiated decisions."], ["Broadly describing an audience without creating groups.", "Using anecdotal personas without a defensible grouping basis."], [["audience-insight", "Customer segmentation creates groups; audience insight interprets what an audience needs or does."], ["research-design", "Customer segmentation is an analytical output; research design establishes how evidence will be collected to answer a question."]]),
  "legal-technology": semanticContract("Selects, configures, implements, or improves technology to strengthen legal-service work and outcomes.", ["Owns a technology intervention in a legal-service workflow.", "Connects system implementation to legal service, risk, quality, or efficiency outcomes."], ["Using ordinary software while working in a legal context.", "Buying legal software without implementation or workflow ownership."], [["tooling-enablement", "Legal technology requires ownership of a legal-domain system outcome; tooling enablement is domain-general user enablement."], ["hr-systems", "Legal technology applies to legal-service systems; HR systems applies to people-process and workforce systems."]]),
  "tooling-enablement": semanticContract("Makes a work tool reliably usable by others through implementation, workflow integration, support, and adoption-enabling practice.", ["Introduces or configures a tool for a defined user workflow.", "Provides reusable support or practice that enables independent use."], ["Personally using a tool supplied by someone else.", "Attending training or receiving access without enabling other users."], [["education-delivery", "Tooling enablement embeds tool use in work; education delivery designs and facilitates a learning intervention."], ["change-leadership", "Tooling enablement makes a tool usable; change leadership addresses broader organisational adoption barriers and behaviour transition."]]),
  "analytics-governance": semanticContract("Establishes, maintains, applies, or governs standards and controls that make analytics or data use consistent, trustworthy, and appropriately controlled.", ["Defines analytical standards, metric definitions, quality expectations, ownership, or access rules.", "Applies review, approval, or decision controls governing analytical use."], ["Using an analytics workspace or creating dashboards without governance mechanisms.", "Providing analyst tooling or ordinary analysis delivery without standards, controls, definitions, quality, access, or decision rules."], [["measurement-design", "Analytics governance controls analytical trust and use; measurement design creates the method and measures for a decision."], ["architecture-governance", "Analytics governance governs data and analytical practice; architecture governance governs technical-system architecture decisions."]]),
  "architecture-governance": semanticContract("Governs technical architecture decisions, standards, exceptions, and lifecycle alignment across systems.", ["Defines and applies architecture principles or standards.", "Runs technical design, exception, or target-architecture decisions."], ["Implementing one tool without architecture authority.", "Governing metric definitions or analytical quality."], [["analytics-governance", "Architecture governance controls technical-system structure; analytics governance controls trusted analytical definitions and use."], ["operating-model", "Architecture governance concerns technical architecture; operating-model design concerns how an organisation operates."]]),
  "investment-governance": semanticContract("Governs allocation, continuation, or withdrawal of resources using explicit criteria, evidence, and accountable decisions.", ["Sets investment criteria, thresholds, or decision rights.", "Redirects, challenges, continues, or stops funding using value and risk evidence."], ["Negotiating a purchase price without allocation governance.", "Analysing options without responsibility for an investment decision."], [["benefits-realisation", "Investment governance controls allocation decisions; benefits realisation secures and measures value after commitment."], ["marketing-effectiveness", "Investment governance governs resource allocation; marketing effectiveness evaluates marketing impact."]]),
  "operating-control": semanticContract("Designs and operates repeatable controls that keep an operational process within required performance, quality, or authorisation limits.", ["Defines operational control steps, ownership, and exception handling.", "Monitors control operation and corrects failures or exceptions."], ["Following an existing checklist without control ownership.", "Improving process speed while merely preserving someone else's controls."], [["risk-controls", "Operating control concerns the operational control environment; risk-controls connects a control explicitly to prevention, detection, or remediation of a defined risk."], ["policy-governance", "Operating control embeds process controls; policy governance owns authoritative organisational rules and their lifecycle."]]),
  "policy-governance": semanticContract("Creates, approves, maintains, communicates, and enforces authoritative organisational policies and their exceptions.", ["Owns policy approval, applicability, review, or change.", "Defines and governs policy exceptions, obligations, or enforcement."], ["Following an existing policy.", "Documenting one process rule without broader policy authority."], [["operating-control", "Policy governance owns authoritative rules; operating control embeds repeatable controls in operations."], ["regulatory-compliance", "Policy governance concerns internal authoritative policy; regulatory compliance operationalises external obligations."]]),
  "regulatory-compliance": semanticContract("Interprets and operationalises external legal or regulatory obligations and demonstrates conformance.", ["Identifies an applicable external obligation and implements a response.", "Produces assurance, remediation, or regulator-ready evidence of conformance."], ["Working to a regulatory deadline without compliance responsibility.", "Following an internal checklist without interpreting or assuring external obligations."], [["policy-governance", "Regulatory compliance addresses external obligations; policy governance owns internal policy."], ["risk-controls", "Regulatory compliance demonstrates conformance; risk-controls designs or tests treatment of a defined risk."]]),
  "risk-controls": semanticContract("Identifies a defined risk and designs, implements, or tests controls that prevent, detect, or remediate it.", ["Connects a control to a specific articulated risk.", "Establishes prevention, detection, exception, remediation, or effectiveness testing."], ["Following an existing control without design or ownership.", "Working in a regulated or risky context without control activity."], [["operating-control", "Risk-controls requires a specific risk-control relationship; operating control concerns the broader operational control environment."], ["regulatory-compliance", "Risk-controls treats a defined risk; regulatory compliance demonstrates conformance with an external obligation."]]),
  "business-ownership": semanticContract("Holds accountable decision authority for integrated performance and trade-offs across a business, unit, product, or material outcome area.", ["Owns outcome targets spanning more than one functional dimension.", "Makes accountable resource or trade-off decisions and carries sustained result responsibility."], ["Leading a bounded project without business accountability.", "Being called an owner or lead for one task or forum."], [["commercial-leadership", "Business ownership integrates broad business outcomes; commercial leadership directs commercial performance."], ["people-leadership", "Business ownership spans accountable business trade-offs; people leadership manages people's performance and development."], ["operating-strategy", "Business ownership carries sustained accountability for integrated results; operating strategy chooses medium-term operating capabilities and priorities."]]),
  "commercial-leadership": semanticContract("Sets commercial direction and leads coordinated execution to achieve revenue, margin, growth, or market outcomes.", ["Sets commercial priorities across multiple levers or teams.", "Owns measurable commercial performance and directs corrective action."], ["Completing one commercial negotiation.", "Holding a commercial title without performed direction and outcome accountability."], [["business-ownership", "Commercial leadership focuses on commercial direction and outcomes; business ownership integrates wider business performance."], ["market-strategy", "Commercial leadership leads execution and results; market strategy chooses where and how to compete."]]),
  "people-leadership": semanticContract("Directly leads people's performance, development, workload, and working environment through accountable managerial action.", ["Coaches, gives feedback, and develops people's capability.", "Allocates work or makes accountable performance and people decisions."], ["Facilitating peers without people accountability.", "Using a leadership title or leading a task without managing people."], [["change-leadership", "People leadership manages people and performance; change leadership mobilises and stabilises a behaviour transition."], ["education-delivery", "People leadership owns ongoing people performance; education delivery facilitates a bounded learning intervention."]]),
  "education-delivery": semanticContract("Designs, facilitates, and adapts structured learning so participants can demonstrate improved knowledge or practice.", ["Prepares and facilitates a learning activity with practice or instruction.", "Assesses understanding and adapts delivery from learner evidence."], ["Attending training as a participant.", "Providing informal tool support without a structured learning intervention."], [["tooling-enablement", "Education delivery owns the learning intervention; tooling enablement embeds reliable tool use in work."], ["education-partnerships", "Education delivery performs learning activity; education partnerships establish shared inter-organisational learning delivery."]]),
  "cross-functional-delivery": semanticContract("Coordinates accountable work across distinct functions to deliver a shared outcome and resolve inter-functional execution barriers.", ["Aligns function-specific responsibilities around a shared deliverable.", "Resolves ownership gaps, blockers, or hand-offs across functions."], ["Stakeholder attendance or status circulation.", "Generic collaboration without accountable integrated delivery."], [["dependency-management", "Cross-functional delivery integrates functions broadly; dependency management owns prerequisite relationships and sequencing."], ["change-leadership", "Cross-functional delivery coordinates execution; change leadership stabilises adoption and changed behaviour."]]),
  "dependency-management": semanticContract("Identifies, sequences, owns, and resolves dependencies whose timing or completion affects delivery.", ["Maps prerequisite relationships, timing, and owners.", "Resolves or escalates dependency conflicts and risks."], ["Generic collaboration without prerequisite relationships.", "Maintaining a plan containing only independent tasks."], [["cross-functional-delivery", "Dependency management focuses on prerequisites and sequencing; cross-functional delivery integrates accountable work across functions."], ["roadmap-governance", "Dependency management resolves prerequisites; roadmap governance decides product priorities and commitments."]]),
  "ecosystem-operations": semanticContract("Operates repeatable processes, hand-offs, performance routines, and issue resolution across a network of external partners.", ["Establishes shared operating flows or service routines across multiple partners.", "Monitors and improves partner-network delivery performance."], ["Managing one supplier contract.", "Selecting partnership strategy without operating the partner network."], [["commercial-partnerships", "Ecosystem operations runs multi-partner delivery; commercial partnerships builds and governs joint commercial value."], ["partner-strategy", "Ecosystem operations executes partner-network processes; partner strategy chooses partner roles and direction."]]),
  "operating-rhythm": semanticContract("Establishes a recurring organisational cadence for reviewing information, making decisions, assigning action, and following through.", ["Creates a repeatable forum or management cycle with defined inputs.", "Records decisions, owners, and follow-through across cycles."], ["Attending a recurring meeting.", "Circulating a status pack without decision or action ownership."], [["product-cadence", "Operating rhythm is domain-general management cadence; product cadence connects product discovery, outcomes, delivery, and learning."], ["roadmap-governance", "Operating rhythm provides a decision cycle; roadmap governance owns product priority and sequencing decisions."]]),
  "process-improvement": semanticContract("Redesigns an existing workflow to improve measurable efficiency, quality, reliability, or experience.", ["Diagnoses and changes workflow steps, roles, or hand-offs.", "Demonstrates an improved operational outcome from the change."], ["Documenting an unchanged process.", "Designing an enterprise operating model rather than improving a bounded workflow."], [["operating-model", "Process improvement changes a bounded workflow; operating-model design integrates organisation-wide operating elements."], ["people-process", "Process improvement is domain-general; people-process specifically designs employee-lifecycle workflows."]]),
  "service-performance": semanticContract("Manages, monitors, or improves measurable service-delivery outcomes such as quality, efficiency, responsiveness, throughput, reliability, or service levels.", ["Owns or monitors defined service-performance measures.", "Intervenes to correct or improve an actual service-delivery outcome."], ["Transformation, operating-model, programme, or process activity without service-outcome responsibility.", "Preparing status reports from others' updates without measuring or improving service performance."], [["benefits-realisation", "Service performance manages ongoing service outcomes; benefits realisation secures value promised by an investment or change."], ["operating-control", "Service performance owns service outcomes and intervention; operating control keeps an operational process within control limits."]]),
  "employee-relations": semanticContract("Manages workplace conduct, grievance, performance, conflict, or employment-relations cases to fair and compliant resolution.", ["Assesses and leads a specific employee-relations case or formal process.", "Documents resolution, advice, and employment-risk handling."], ["Redesigning a repeatable people process.", "Routine people management without an employee-relations case."], [["people-process", "Employee relations resolves specific workplace cases; people-process designs repeatable employee-lifecycle workflows."], ["policy-governance", "Employee relations applies policy to cases; policy governance owns the policy lifecycle."]]),
  "hr-systems": semanticContract("Owns implementation, configuration, integration, or improvement of technology supporting people processes and workforce data.", ["Configures or implements an HR platform or people-system workflow.", "Connects the system change to people-service, data-quality, or user outcomes."], ["Entering data into an HR system.", "Redesigning a people process without system ownership."], [["tooling-enablement", "HR systems requires ownership of a people-domain system outcome; tooling enablement is domain-general user enablement."], ["people-process", "HR systems implements people technology; people-process defines the employee workflow and decisions."]]),
  "organisation-design": semanticContract("Designs organisational structures, roles, accountabilities, reporting relationships, and decision rights to support an objective.", ["Diagnoses a structural or accountability problem.", "Redesigns units, roles, reporting lines, or decision rights against an intended outcome."], ["Improving one workflow without structural change.", "Designing processes and governance without changing organisational structure or accountability."], [["operating-model", "Organisation design focuses on structure and accountability; operating-model design integrates structure with processes, governance, and systems."], ["people-process", "Organisation design changes organisational structure; people-process designs repeatable employee workflows."]]),
  "people-process": semanticContract("Designs or materially improves repeatable employee-lifecycle processes and their roles, decisions, evidence, and exceptions.", ["Redesigns a hiring, promotion, onboarding, performance, or related people workflow.", "Defines roles, criteria, decisions, and exception handling that improve employee or manager outcomes."], ["Resolving one employee-relations case.", "Administering an unchanged HR process."], [["employee-relations", "People-process designs repeatable workflows; employee relations resolves specific workplace cases."], ["organisation-design", "People-process changes employee lifecycle workflow; organisation design changes structure and accountabilities."]]),
  "talent-planning": semanticContract("Assesses future capability and succession needs and converts them into workforce or development actions.", ["Runs talent, capability, or succession assessment against future needs.", "Agrees development, movement, succession, or hiring actions from the assessment."], ["Administering promotion approvals.", "Coaching one person without future workforce or succession planning."], [["workforce-advisory", "Talent planning produces future talent and succession actions; workforce advisory counsels leaders across workforce decisions."], ["people-leadership", "Talent planning addresses future organisational capability; people leadership develops and manages a current team."]]),
  "workforce-advisory": semanticContract("Applies people, organisation, and workforce expertise to advise leaders on consequential workforce decisions.", ["Diagnoses a material workforce issue and frames viable options.", "Influences a documented workforce or people-practice decision."], ["Providing routine policy information.", "Performing HR administration without advisory judgment."], [["talent-planning", "Workforce advisory counsels across workforce issues; talent planning owns future capability and succession actions."], ["organisation-design", "Workforce advisory may recommend structural options; organisation design performs the structure and accountability design."]]),
  "product-insights": semanticContract("Derives and applies evidence about product users, behaviour, value, and friction to product decisions.", ["Analyses product use, discovery, or behaviour evidence.", "Converts a product-specific finding into a hypothesis, priority, or design decision."], ["Reporting product metrics without interpretation.", "Generic audience research without a product decision."], [["audience-insight", "Product insights specifically informs product decisions; audience insight interprets broader audience needs and behaviour."], ["roadmap-governance", "Product insights supplies evidence for choices; roadmap governance owns prioritisation and commitment decisions."]]),
  "product-cadence": semanticContract("Establishes a repeatable product-management cycle connecting discovery, outcome review, delivery decisions, and learning.", ["Creates a recurring product-specific evidence and decision cycle.", "Converts reviewed outcomes into owned product commitments and follow-through."], ["Generic project status meetings.", "A one-off roadmap decision without a repeatable product cycle."], [["operating-rhythm", "Product cadence connects product learning and delivery decisions; operating rhythm is a domain-general management cadence."], ["roadmap-governance", "Product cadence is the recurring cycle; roadmap governance owns priority, sequencing, and change-control decisions."]]),
  "roadmap-governance": semanticContract("Owns transparent prioritisation, sequencing, trade-offs, and change control for a product roadmap.", ["Evaluates competing roadmap demands using explicit evidence and criteria.", "Resolves sequencing trade-offs and updates governed commitments."], ["Generating a product insight without roadmap authority.", "Maintaining a release list without prioritisation decisions."], [["product-cadence", "Roadmap governance owns product commitments; product cadence supplies the recurring discovery, outcome, and decision cycle."], ["dependency-management", "Roadmap governance decides priorities and sequence; dependency management resolves prerequisites affecting delivery."]]),
  "benefits-realisation": semanticContract("Defines, assigns, measures, and actively secures the outcomes promised by an investment or change after commitment.", ["Establishes benefit measures and accountable owners.", "Tracks realised value and intervenes when it diverges from the approved case."], ["Approving an investment without tracking delivered value.", "Reporting project completion without measuring promised outcomes."], [["investment-governance", "Benefits realisation secures value after commitment; investment governance decides allocation, continuation, or withdrawal."], ["service-performance", "Benefits realisation tracks promised change value; service performance manages ongoing service outcomes."]]),
  "change-leadership": semanticContract("Leads a transition in organisational behaviour or ways of working by mobilising people, addressing adoption barriers, and stabilising the new practice.", ["Creates adoption ownership, champions, or reinforcement mechanisms.", "Addresses resistance or reversion until the changed behaviour sustains."], ["Working in a transformation or change programme.", "Implementing technology, changing a process, or attending training without leading adoption behaviour."], [["tooling-enablement", "Change leadership addresses organisational behaviour transition; tooling enablement makes a work tool reliably usable."], ["cross-functional-delivery", "Change leadership stabilises adoption; cross-functional delivery coordinates accountable execution across functions."]]),
  "market-strategy": semanticContract("Chooses where and how to compete based on market, customer, competitor, and economic evidence.", ["Assesses market attractiveness, customer value, competition, or positioning.", "Chooses target segments, proposition, route, or market priorities with explicit trade-offs."], ["Creating customer segments without making a market choice.", "Evaluating campaign performance without setting market direction."], [["operating-strategy", "Market strategy sets external competitive choices; operating strategy sets internal capability and operating priorities."], ["strategic-analysis", "Market strategy is the chosen external direction; strategic analysis is the method of evaluating consequential options."]]),
  "operating-model": semanticContract("Designs how an organisation delivers value through integrated accountabilities, decision rights, processes, governance, structure, and enabling systems.", ["Defines a future operating system across multiple operating elements.", "Resolves interfaces and hand-offs to support a strategic or service outcome."], ["Improving one bounded workflow.", "Changing reporting lines alone without an integrated operating design."], [["organisation-design", "Operating-model design integrates multiple operating elements; organisation design focuses on structure, roles, and accountabilities."], ["process-improvement", "Operating-model design defines the broader operating system; process improvement changes a bounded existing workflow."]]),
  "operating-strategy": semanticContract("Sets medium-term choices and priorities for building and deploying operating capabilities to deliver organisational strategy.", ["Diagnoses material operating constraints or capability needs.", "Chooses operating capability, scale, service, or investment priorities linked to strategic outcomes."], ["Programme or transformation status reporting.", "Designing detailed operating processes without setting operating direction."], [["market-strategy", "Operating strategy sets internal capability direction; market strategy sets external competitive direction."], ["operating-model", "Operating strategy chooses operating priorities; operating-model design specifies how the organisation will operate."]]),
  "partner-strategy": semanticContract("Chooses which external partners to pursue, the strategic role and value logic of each, and how the partner portfolio should evolve.", ["Evaluates partner fit and defines mutual strategic value or role.", "Sets partner portfolio, lifecycle, improvement, or expansion direction."], ["Operating one joint offer without broader partner-direction choices.", "Negotiating contract terms without defining partnership strategy."], [["commercial-partnerships", "Partner strategy chooses partner roles and value logic; commercial partnerships establishes and operates joint commercial value."], ["ecosystem-operations", "Partner strategy sets direction; ecosystem operations runs repeatable processes across the partner network."]]),
  "strategic-analysis": semanticContract("Evaluates consequential strategic choices through structured evidence, alternatives, trade-offs, and implications.", ["Frames a consequential strategic decision and compares material options.", "Assesses economics, risks, constraints, or second-order effects and recommends a choice."], ["Summarising findings for a routine operational decision.", "Producing a forecast without evaluating strategic alternatives."], [["insight-synthesis", "Strategic analysis explicitly evaluates consequential options and trade-offs; insight synthesis integrates evidence for any decision."], ["scenario-modelling", "Strategic analysis compares choices and implications; scenario modelling constructs alternative futures under varied assumptions."]]),
} satisfies Record<SeedCapabilityId, CanonicalCapabilitySemanticContract>;

const seedCapabilities = seedCapabilityIdentities.map((capability) => Object.freeze({
  ...capability,
  semanticContract: semanticContracts[capability.id],
})) as readonly CanonicalCapabilityDefinition[];

/** Admitted seed identities only; this is not a complete external capability taxonomy. */
export const canonicalCapabilityLibrary: CanonicalCapabilityLibrary = Object.freeze({
  schemaVersion: CANONICAL_CAPABILITY_LIBRARY_SCHEMA_VERSION,
  contentVersion: CANONICAL_CAPABILITY_LIBRARY_CONTENT_VERSION,
  capabilities: Object.freeze(seedCapabilities),
});
