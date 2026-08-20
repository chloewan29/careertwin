# CareerTwin Post-MVP Task F.8 — Canonical Capability Semantic Contract Audit

## Decision and boundary

`POST_MVP_TASK_F8_BENCHMARK_SEMANTIC_CONTRACT_CONFLICT`

This is a read-only audit. The existing 51 identities and 12 families remain authoritative. The proposed contracts below explain those identities; they do not add IDs, sub-capabilities, tags, families, or a parallel ontology. No provider call or Founder holdout was made.

The first semantic drift point is the canonical context consumed by Stage 2: production supplies only `id`, `label`, and `family`. The first future writable fault would be the existing canonical capability authority, but F.8 does not authorize that write.

## Authority and inventory

Canonical authority: `lib/career-possibility/canonical-capability-library.ts`, schema `1.0.0`, content `1.2.0`. Its type contains no definition, description, inclusion criterion, exclusion criterion, or neighbour boundary. Role requirements provide contextual `expectedEvidence`, but they are role-specific consumers and not a shared canonical semantic contract.

Existing-contract classes are mutually exclusive. `LABEL_ONLY` means the label suggests a reasonably stable core but supplies no explicit boundary. `AMBIGUOUS` means the label itself admits materially different plausible interpretations. There are no `STRONG` or `PARTIAL` canonical contracts.

Benchmark columns are counts of required / allowed-optional / forbidden appearances. `0/0/0` means the identity is not observed by the frozen benchmark.

| ID | Label | Family | Existing contract | Current representative role usage | Benchmark R/O/F |
| --- | --- | --- | --- | --- | ---: |
| forecasting | Forecasting | Analytics & Insight | LABEL_ONLY | fpa-manager | 1/1/5 |
| insight-synthesis | Insight Synthesis | Analytics & Insight | AMBIGUOUS | analytics-manager; customer-insights-lead | 1/1/1 |
| marketing-effectiveness | Marketing Effectiveness | Analytics & Insight | AMBIGUOUS | marketing-strategy-manager; marketing-analytics-lead | 1/0/0 |
| measurement-design | Measurement Design | Analytics & Insight | AMBIGUOUS | analytics-manager; marketing-analytics-lead | 0/1/0 |
| research-design | Research Design | Analytics & Insight | LABEL_ONLY | customer-insights-lead | 0/0/3 |
| scenario-modelling | Scenario Modelling | Analytics & Insight | LABEL_ONLY | commercial-finance-manager | 0/1/1 |
| variance-analysis | Variance Analysis | Analytics & Insight | LABEL_ONLY | fpa-manager | 1/1/0 |
| account-growth | Account Growth | Commercial | LABEL_ONLY | sales-account-manager | 0/0/1 |
| commercial-negotiation | Commercial Negotiation | Commercial | LABEL_ONLY | sales-account-manager | 2/0/2 |
| commercial-partnerships | Commercial Partnerships | Commercial | AMBIGUOUS | gtm-partnerships-manager | 2/2/2 |
| consultative-selling | Consultative Selling | Commercial | LABEL_ONLY | sales-account-manager | 0/0/0 |
| pipeline-management | Pipeline Management | Commercial | LABEL_ONLY | sales-account-manager | 0/0/0 |
| education-partnerships | Education Partnerships | Communication & Collaboration | LABEL_ONLY | education-program-lead | 1/0/2 |
| audience-insight | Audience Insight | Customer & Market | AMBIGUOUS | marketing-strategy-manager; customer-insights-lead; marketing-analytics-lead | 1/1/0 |
| customer-adoption | Customer Adoption | Customer & Market | LABEL_ONLY | customer-success-manager; customer-insights-lead; data-product-manager | 1/0/2 |
| customer-segmentation | Customer Segmentation | Customer & Market | LABEL_ONLY | customer-insights-lead | 1/1/1 |
| legal-technology | Legal Technology | Data & Technology | LABEL_ONLY | legal-operations-manager | 0/0/0 |
| tooling-enablement | Tooling Enablement | Data & Technology | AMBIGUOUS | product-operations-manager; data-product-manager | 3/0/4 |
| analytics-governance | Analytics Governance | Governance & Risk | AMBIGUOUS | analytics-manager; marketing-analytics-lead; data-product-manager | 1/1/2 |
| architecture-governance | Architecture Governance | Governance & Risk | AMBIGUOUS | engineering-manager | 0/0/2 |
| investment-governance | Investment Governance | Governance & Risk | AMBIGUOUS | commercial-finance-manager; marketing-analytics-lead | 1/1/3 |
| operating-control | Operating Control | Governance & Risk | AMBIGUOUS | operations-manager | 0/4/2 |
| policy-governance | Policy Governance | Governance & Risk | AMBIGUOUS | people-operations-lead | 0/1/3 |
| regulatory-compliance | Regulatory Compliance | Governance & Risk | LABEL_ONLY | clinical-operations-manager | 0/0/2 |
| risk-controls | Risk and Controls | Governance & Risk | AMBIGUOUS | program-manager | 2/0/1 |
| business-ownership | Business Ownership | Leadership | AMBIGUOUS | general-business-manager | 0/0/3 |
| commercial-leadership | Commercial Leadership | Leadership | AMBIGUOUS | general-business-manager | 0/0/0 |
| people-leadership | People Leadership | Leadership | LABEL_ONLY | engineering-manager; general-business-manager | 1/0/7 |
| education-delivery | Education Delivery | Learning & Development | LABEL_ONLY | education-program-lead | 2/1/3 |
| cross-functional-delivery | Cross-functional Delivery | Operations & Delivery | AMBIGUOUS | transformation-manager; analytics-manager; customer-insights-lead; data-product-manager | 3/2/3 |
| dependency-management | Dependency Management | Operations & Delivery | LABEL_ONLY | program-manager | 1/2/1 |
| ecosystem-operations | Ecosystem Operations | Operations & Delivery | AMBIGUOUS | gtm-partnerships-manager | 0/0/0 |
| operating-rhythm | Operating Rhythm | Operations & Delivery | AMBIGUOUS | strategy-operations-manager | 0/1/2 |
| process-improvement | Process Improvement | Operations & Delivery | LABEL_ONLY | operations-manager | 2/0/0 |
| service-performance | Service Performance | Operations & Delivery | AMBIGUOUS | operations-manager | 0/1/0 |
| employee-relations | Employee Relations | People & Organisation | LABEL_ONLY | hr-business-partner | 0/0/1 |
| hr-systems | HR Systems | People & Organisation | AMBIGUOUS | people-operations-lead | 0/0/0 |
| organisation-design | Organisation Design | People & Organisation | LABEL_ONLY | hr-business-partner | 2/0/1 |
| people-process | People Process Design | People & Organisation | AMBIGUOUS | people-operations-lead | 1/0/2 |
| talent-planning | Talent Planning | People & Organisation | LABEL_ONLY | hr-business-partner | 0/0/1 |
| workforce-advisory | Workforce Advisory | People & Organisation | AMBIGUOUS | hr-business-partner | 0/0/0 |
| product-insights | Product Insights | Product | AMBIGUOUS | product-operations-manager; data-product-manager | 1/1/0 |
| product-cadence | Product Operating Cadence | Product | AMBIGUOUS | product-operations-manager; data-product-manager | 2/0/0 |
| roadmap-governance | Roadmap Governance | Product | AMBIGUOUS | product-operations-manager; data-product-manager | 1/0/2 |
| benefits-realisation | Benefits Realisation | Strategy & Transformation | AMBIGUOUS | transformation-manager; analytics-manager | 1/0/0 |
| change-leadership | Change Leadership | Strategy & Transformation | AMBIGUOUS | transformation-manager | 3/0/12 |
| market-strategy | Market Strategy | Strategy & Transformation | LABEL_ONLY | marketing-strategy-manager | 0/2/2 |
| operating-model | Operating Model Design | Strategy & Transformation | LABEL_ONLY | transformation-manager | 1/2/2 |
| operating-strategy | Operating Strategy | Strategy & Transformation | AMBIGUOUS | general-business-manager | 0/0/3 |
| partner-strategy | Partner Strategy | Strategy & Transformation | AMBIGUOUS | gtm-partnerships-manager | 1/1/1 |
| strategic-analysis | Strategic Analysis | Strategy & Transformation | AMBIGUOUS | strategy-operations-manager; analytics-manager; customer-insights-lead; marketing-analytics-lead | 1/1/1 |

Inventory reconciliation: 51 total; 0 strong; 0 partial; 22 label-only; 29 ambiguous; 51 missing explicit decision boundaries. Benchmark observation is 44/51 identities, with 29/51 required at least once. The seven unobserved identities are `consultative-selling`, `pipeline-management`, `legal-technology`, `commercial-leadership`, `ecosystem-operations`, `hr-systems`, and `workforce-advisory`.

## Proposed contracts for all current capabilities

Each entry uses the required audit-only shape. “Positive” criteria are conjunctive where the sentence says “and”; otherwise they are representative sufficient behaviors. Runtime compression would retain the definition, two strongest positive criteria, two strongest exclusions, and nearest-neighbour boundary.

### Analytics & Insight

#### `forecasting` — Forecasting
- **Definition:** Producing an evidence-based estimate of a future quantity or outcome over a stated horizon.
- **Positive evidence criteria:** builds or owns forward projections from relevant drivers; updates projections as assumptions or actuals change; explains forecast uncertainty or movement.
- **Not sufficient:** reporting past actuals; comparing actuals with budget without projecting forward; naming forecasting as a skill.
- **Nearest confusable capabilities / decision boundary:** `scenario-modelling` compares multiple plausible futures; `variance-analysis` explains past or current deviations. Forecasting commits to an expected future view.
- **Generic positive example:** Rebuilt the quarterly demand forecast from volume drivers and refreshed it after new orders arrived.
- **Generic counterexample:** Reported last quarter's sales totals.

#### `insight-synthesis` — Insight Synthesis
- **Definition:** Integrating multiple evidence signals into a coherent conclusion or recommendation usable for a decision.
- **Positive evidence criteria:** reconciles differing sources; identifies the consequential pattern or trade-off; turns findings into a supported decision point.
- **Not sufficient:** producing a report; restating one metric; presenting others' conclusions; collecting data without integration.
- **Neighbours / boundary:** `strategic-analysis` evaluates strategic options and implications; `product-insights` interprets product/user behavior; `audience-insight` explains audience needs. Insight synthesis is the cross-source integration act, independent of domain.
- **Positive example:** Reconciled survey, usage, and service evidence into one recommendation with explicit limits.
- **Counterexample:** Circulated a dashboard with no interpretation.

#### `marketing-effectiveness` — Marketing Effectiveness
- **Definition:** Evaluating how marketing activity causes or contributes to defined commercial or audience outcomes and using that evidence to optimise action.
- **Positive:** compares interventions, channels, or campaigns against outcomes; isolates effectiveness rather than activity volume; changes marketing action from the result.
- **Not sufficient:** campaign reporting; audience research alone; budget ownership without effectiveness evidence.
- **Neighbours / boundary:** `measurement-design` creates the measurement approach; `investment-governance` governs allocation; `audience-insight` explains audiences. Marketing effectiveness is the evaluated performance conclusion.
- **Positive example:** Used holdout results to stop an ineffective campaign and redirect spend.
- **Counterexample:** Reported impressions and clicks without judging impact.

#### `measurement-design` — Measurement Design
- **Definition:** Designing a valid, repeatable approach that connects measures, methods, and decision use.
- **Positive:** selects metrics tied to a decision; defines method, comparison, attribution, or quality rules; establishes how results will be interpreted.
- **Not sufficient:** tracking an existing KPI; producing analysis with no designed framework; governing metric ownership only.
- **Neighbours / boundary:** `research-design` designs evidence collection to answer a question; `analytics-governance` controls trusted definitions; `marketing-effectiveness` applies measures to marketing outcomes.
- **Positive example:** Designed an experiment and success framework linking activation measures to a launch decision.
- **Counterexample:** Updated a pre-existing KPI spreadsheet.

#### `research-design` — Research Design
- **Definition:** Designing an inquiry that can credibly answer a defined question through appropriate participants, methods, and evidence.
- **Positive:** frames the research question; selects methods/sample; addresses validity, bias, ethics, or analysis plan.
- **Not sufficient:** conducting interviews from someone else's design; analysing existing operational data; segmenting customers without designing research.
- **Neighbours / boundary:** `measurement-design` designs ongoing or evaluative measurement; `audience-insight` is a finding; `customer-segmentation` creates groups. Research design owns the inquiry architecture.
- **Positive example:** Designed a mixed-method study and sampling plan to test why customers churned.
- **Counterexample:** Attended three customer interviews as an observer.

#### `scenario-modelling` — Scenario Modelling
- **Definition:** Constructing and comparing explicit alternative futures by varying material assumptions or drivers.
- **Positive:** defines distinct scenarios; models consequences under changed assumptions; uses comparison to inform contingency or choice.
- **Not sufficient:** one expected forecast; a qualitative list of options with no future-state assumptions; retrospective sensitivity commentary.
- **Neighbours / boundary:** `forecasting` estimates the expected future; `strategic-analysis` can compare options without modelling futures. Scenario modelling makes alternative assumptions and consequences explicit.
- **Positive example:** Modelled base, downside, and expansion cases under different demand and cost assumptions.
- **Counterexample:** Produced one monthly revenue forecast.

#### `variance-analysis` — Variance Analysis
- **Definition:** Explaining material differences between actual outcomes and a baseline such as plan, forecast, standard, or prior period.
- **Positive:** quantifies the deviation; identifies causal drivers; communicates implications or corrective action.
- **Not sufficient:** updating a forecast when actuals arrive; listing actual and budget values without explanation.
- **Neighbours / boundary:** `forecasting` is forward-looking; `service-performance` manages service outcomes. Variance analysis is explanation of deviation from a comparison baseline.
- **Positive example:** Decomposed the monthly cost variance into volume, rate, and timing drivers.
- **Counterexample:** Copied actual expenditure into the budget template.

### Commercial

#### `account-growth` — Account Growth
- **Definition:** Expanding measurable value, revenue, or adoption within an existing customer account.
- **Positive:** identifies expansion opportunity in an existing account; secures increased use/revenue/scope; links action to retained or expanded value.
- **Not sufficient:** servicing an account; renewing unchanged terms; general market growth.
- **Neighbours / boundary:** `commercial-negotiation` trades terms; `consultative-selling` diagnoses and shapes a solution; `customer-adoption` increases product use. Account growth requires an existing-account commercial expansion outcome.
- **Positive example:** Expanded an existing client from one service line to three after proving value.
- **Counterexample:** Answered routine questions for an existing customer.

#### `commercial-negotiation` — Commercial Negotiation
- **Definition:** Reaching a commercial agreement by actively trading price, scope, risk, service, or contractual terms.
- **Positive:** prepares or tests positions; exchanges concessions; secures an agreed commercial outcome.
- **Not sufficient:** collaborating with a supplier; agreeing delivery actions without traded terms; approving a purchase.
- **Neighbours / boundary:** `commercial-partnerships` builds joint value over time; `partner-strategy` chooses partnership direction. Negotiation is the explicit trade of commercial terms.
- **Positive example:** Traded contract length and service levels to secure a lower total cost.
- **Counterexample:** Held a quarterly supplier review.

#### `commercial-partnerships` — Commercial Partnerships
- **Definition:** Building and operating a relationship in which independent organisations jointly create and capture commercial value.
- **Positive:** establishes mutual value and responsibilities; co-develops an offer/channel/outcome; governs sustained joint commercial delivery.
- **Not sufficient:** any external collaboration; supplier purchasing; educational cooperation without a commercial value exchange.
- **Neighbours / boundary:** `partner-strategy` sets which partners and value logic to pursue; `education-partnerships` pursues learning outcomes; `commercial-negotiation` trades terms. This capability demonstrates operating joint commercial value.
- **Positive example:** Co-created a distribution offer with shared incentives and quarterly value reviews.
- **Counterexample:** Coordinated a non-commercial university placement programme.

#### `consultative-selling` — Consultative Selling
- **Definition:** Diagnosing a prospective customer's problem and shaping a commercially viable solution around it.
- **Positive:** elicits needs and consequences; reframes the problem; connects a tailored solution to customer value and advances a sale.
- **Not sufficient:** presenting a standard product; account support; generic stakeholder consultation without a sales objective.
- **Neighbours / boundary:** `account-growth` expands an existing account; `commercial-negotiation` closes terms. Consultative selling owns problem diagnosis and solution shaping in a selling process.
- **Positive example:** Diagnosed a client's workflow constraint and shaped a tailored proposal that advanced to contract.
- **Counterexample:** Delivered a standard product demonstration.

#### `pipeline-management` — Pipeline Management
- **Definition:** Systematically managing commercial opportunities through defined stages, prioritisation, forecasting, and next actions.
- **Positive:** maintains opportunity stages and evidence; prioritises effort; removes progression blockers and manages conversion risk.
- **Not sufficient:** keeping a contact list; closing one deal; producing a revenue forecast without opportunity management.
- **Neighbours / boundary:** `forecasting` predicts an outcome; `consultative-selling` shapes an individual solution; `account-growth` expands an account. Pipeline management governs the opportunity portfolio.
- **Positive example:** Requalified the opportunity pipeline and introduced stage evidence that improved conversion visibility.
- **Counterexample:** Recorded prospect names in a spreadsheet.

### Communication & Collaboration

#### `education-partnerships` — Education Partnerships
- **Definition:** Establishing and sustaining inter-organisational collaboration to deliver education, learning, placement, or learner outcomes.
- **Positive:** agrees shared educational purpose; defines partner responsibilities and delivery commitments; maintains joint governance or outcomes.
- **Not sufficient:** delivering teaching alone; any university contact; a commercial partnership whose primary purpose is revenue.
- **Neighbours / boundary:** `commercial-partnerships` requires joint commercial value; `partner-strategy` sets partner direction; `education-delivery` performs learning delivery. Education partnerships are distinguished by the shared learning outcome.
- **Positive example:** Established a multi-year university placement programme with shared supervision and delivery commitments.
- **Counterexample:** Delivered one internal training session.

### Customer & Market

#### `audience-insight` — Audience Insight
- **Definition:** Deriving a supported understanding of an audience's needs, motivations, attitudes, or behavior that changes a decision.
- **Positive:** combines audience evidence; identifies a meaningful need or behavior; applies it to offer, communication, or experience choices.
- **Not sufficient:** demographic description; a segmentation output without interpreted need; generic customer contact.
- **Neighbours / boundary:** `customer-segmentation` creates distinct groups; `product-insights` concerns product use; `insight-synthesis` is domain-general integration. Audience insight is the interpreted audience truth.
- **Positive example:** Combined interviews and purchases to identify an underserved group's unmet need and reshape an offer.
- **Counterexample:** Listed customers by age bracket.

#### `customer-adoption` — Customer Adoption
- **Definition:** Increasing and sustaining customers' meaningful use of a product, service, or changed customer workflow.
- **Positive:** identifies an adoption barrier; changes onboarding/use experience; measures sustained customer behavior or value.
- **Not sufficient:** employee adoption of an internal tool; launching a product; delivering customer training with no use outcome.
- **Neighbours / boundary:** `tooling-enablement` enables users of a work tool; `change-leadership` shifts organisational behavior; `product-insights` diagnoses product behavior. Customer adoption requires external customer use.
- **Positive example:** Removed an onboarding barrier and verified sustained first-month use.
- **Counterexample:** Announced a new feature to customers.

#### `customer-segmentation` — Customer Segmentation
- **Definition:** Creating and validating distinct customer groups using meaningful characteristics or behavior for differentiated action.
- **Positive:** selects discriminating variables; derives stable/actionable groups; validates and applies them to decisions.
- **Not sufficient:** broad audience description; two anecdotal personas; product behavior analysis without group construction.
- **Neighbours / boundary:** `audience-insight` interprets needs; `research-design` designs inquiry; `market-strategy` chooses market action. Segmentation's output is a defensible grouping model.
- **Positive example:** Built behavioral segments from transaction patterns and validated them for campaign choices.
- **Counterexample:** Referred generally to younger customers.

### Data & Technology

#### `legal-technology` — Legal Technology
- **Definition:** Selecting, configuring, implementing, or improving technology specifically to strengthen legal-service work and outcomes.
- **Positive:** owns a legal workflow technology intervention; connects configuration/adoption to legal service, risk, or efficiency; measures operational result.
- **Not sufficient:** using standard office software in a legal team; buying software without implementation; generic tooling enablement with no legal-work context.
- **Neighbours / boundary:** `tooling-enablement` is domain-general user enablement; `hr-systems` concerns people systems. Legal technology requires applied legal-service workflow ownership.
- **Positive example:** Configured contract-intake automation and reduced legal review cycle time.
- **Counterexample:** Used a spreadsheet while working in legal operations.

#### `tooling-enablement` — Tooling Enablement
- **Definition:** Making a work tool reliably usable by others through implementation, workflow integration, support, and adoption-enabling practice.
- **Positive:** introduces or configures a tool for users; embeds it in work; provides reusable support/practice that enables independent use.
- **Not sufficient:** personally using a tool; attending tool training; changing behavior without a tool; teaching content unrelated to tool use.
- **Neighbours / boundary:** `education-delivery` develops learning; `change-leadership` manages broader behavior transition; `customer-adoption` concerns customers; `legal-technology`/`hr-systems` add domain-system ownership.
- **Positive example:** Replaced local spreadsheets with a shared workspace, templates, and office hours until analysts worked independently.
- **Counterexample:** Used a finance spreadsheet supplied by another team.

### Governance & Risk

#### `analytics-governance` — Analytics Governance
- **Definition:** Establishing and enforcing trusted definitions, ownership, quality, access, and decision controls for analytics and metrics.
- **Positive:** assigns metric/data ownership; standardises definitions or quality rules; creates approval/review controls that govern analytical use.
- **Not sufficient:** sharing templates; producing analysis; using a governed dataset; general architecture decisions.
- **Neighbours / boundary:** `measurement-design` chooses how to measure; `architecture-governance` controls technical architecture; `policy-governance` controls organisational policy. Analytics governance governs analytical truth and use.
- **Positive example:** Assigned metric owners and required approval before definitions entered executive reporting.
- **Counterexample:** Published a reusable reporting template.

#### `architecture-governance` — Architecture Governance
- **Definition:** Governing technical architecture decisions, standards, exceptions, and lifecycle alignment across systems.
- **Positive:** defines architecture principles; runs decision/exception review; resolves system design trade-offs against target architecture.
- **Not sufficient:** implementing one tool; data-definition governance; attending an architecture meeting.
- **Neighbours / boundary:** `analytics-governance` governs data/metric trust; `tooling-enablement` embeds use; `operating-model` designs organisational operation. Architecture governance owns technical-system structure decisions.
- **Positive example:** Established an architecture review and exception process for integration patterns.
- **Counterexample:** Configured a shared analyst workspace.

#### `investment-governance` — Investment Governance
- **Definition:** Governing allocation, continuation, or withdrawal of resources using explicit criteria, evidence, and accountable decisions.
- **Positive:** sets investment thresholds; compares value/risk evidence; redirects or challenges funding against an approved case.
- **Not sufficient:** negotiating purchase price; monitoring ordinary operating cost; analysing an option without allocation authority.
- **Neighbours / boundary:** `benefits-realisation` tracks achieved value after commitment; `marketing-effectiveness` evaluates marketing impact; `commercial-negotiation` trades terms. Investment governance controls resource allocation decisions.
- **Positive example:** Set evidence thresholds and redirected budget from weak to proven initiatives.
- **Counterexample:** Negotiated a supplier discount.

#### `operating-control` — Operating Control
- **Definition:** Designing and operating repeatable controls that keep an operational process within required performance, quality, or authorization limits.
- **Positive:** defines control steps/ownership; embeds them in routine operations; monitors exceptions and corrects control failure.
- **Not sufficient:** complying with an existing checklist; identifying risk without a control; improving speed while merely preserving someone else's checks.
- **Neighbours / boundary:** `risk-controls` targets a defined risk and treatment; `policy-governance` governs rules; `service-performance` manages outcomes. Operating control is the operational control environment in use.
- **Positive example:** Introduced exception ownership and remediation checks into a procurement workflow.
- **Counterexample:** Followed the required approval checklist.

#### `policy-governance` — Policy Governance
- **Definition:** Creating, approving, maintaining, communicating, and enforcing authoritative organisational policies and their exceptions.
- **Positive:** owns policy lifecycle or approval; defines applicability and exception rights; reviews compliance and updates the policy.
- **Not sufficient:** following a policy; designing one process control; documenting a calculation rule with no broader policy authority.
- **Neighbours / boundary:** `operating-control` embeds process controls; `risk-controls` treats risk; `regulatory-compliance` satisfies external obligations. Policy governance owns internal authoritative rules.
- **Positive example:** Established policy ownership, approval, exceptions, and annual review across the organisation.
- **Counterexample:** Escalated a form missing a required signature.

#### `regulatory-compliance` — Regulatory Compliance
- **Definition:** Interpreting and operationalising external legal or regulatory obligations and demonstrating conformance.
- **Positive:** identifies applicable obligation; designs or executes compliance response; produces assurance, remediation, or regulator-ready evidence.
- **Not sufficient:** working to a regulatory deadline; following an internal checklist; coordinating legal stakeholders.
- **Neighbours / boundary:** `policy-governance` owns internal policy; `risk-controls` treats risk; `operating-control` controls operations. Regulatory compliance requires an external obligation and conformance work.
- **Positive example:** Translated a new regulation into controls and closed audit findings before inspection.
- **Counterexample:** Removed blockers before a product's regulatory deadline.

#### `risk-controls` — Risk and Controls
- **Definition:** Identifying a defined risk and designing, implementing, or testing controls that prevent, detect, or remediate it.
- **Positive:** articulates the risk; establishes preventive/detective control and exception path; verifies effectiveness or remediation.
- **Not sufficient:** following an existing control; generic process governance; meeting a deadline in a risky domain.
- **Neighbours / boundary:** `operating-control` concerns the broader operational control environment; `regulatory-compliance` external obligations; `policy-governance` internal rules. Risk-controls evidence must connect control design/operation to a specific risk.
- **Positive example:** Designed a release control that detected unauthorised changes and required remediation.
- **Counterexample:** Completed the required release checklist.

### Leadership

#### `business-ownership` — Business Ownership
- **Definition:** Holding accountable decision authority for the integrated performance and trade-offs of a business, unit, product, or material outcome area.
- **Positive:** owns outcome targets; makes cross-domain resource/trade-off decisions; is accountable for sustained results.
- **Not sufficient:** leading a project; managing a team; facilitating a product forum; using “owner” as a task label.
- **Neighbours / boundary:** `commercial-leadership` leads commercial performance; `people-leadership` leads people; `operating-strategy` sets operating direction. Business ownership integrates multiple outcome dimensions with accountability.
- **Positive example:** Owned a business unit's revenue, cost, service, and investment trade-offs.
- **Counterexample:** Was named owner of one meeting action.

#### `commercial-leadership` — Commercial Leadership
- **Definition:** Setting commercial direction and leading coordinated execution to achieve revenue, margin, growth, or market outcomes.
- **Positive:** sets commercial priorities; directs multiple commercial levers or teams; owns measurable commercial performance.
- **Not sufficient:** completing one negotiation; managing a sales pipeline; having a commercial title.
- **Neighbours / boundary:** `business-ownership` spans whole-business outcomes; `market-strategy` sets market choices; `account-growth` expands accounts. Commercial leadership combines direction, coordinated leadership, and commercial accountability.
- **Positive example:** Reset pricing, channel, and account priorities and led teams to restore margin growth.
- **Counterexample:** Negotiated one supplier contract.

#### `people-leadership` — People Leadership
- **Definition:** Directly leading people's performance, development, workload, and working environment with accountable managerial action.
- **Positive:** coaches and gives feedback; allocates work or makes people decisions; develops capability and addresses performance.
- **Not sufficient:** facilitating peers; delivering training; being called a lead; managing adoption without line/team responsibility.
- **Neighbours / boundary:** `change-leadership` leads a behavior transition; `education-delivery` teaches; `business-ownership` owns business outcomes. People leadership requires accountable leadership of people.
- **Positive example:** Managed analysts through coaching, workload decisions, feedback, and development plans.
- **Counterexample:** Led data entry for a weekly register.

### Learning & Development

#### `education-delivery` — Education Delivery
- **Definition:** Designing, facilitating, and adapting structured learning so participants can demonstrate improved knowledge or practice.
- **Positive:** prepares learning activity; facilitates instruction/practice; assesses understanding and adapts delivery.
- **Not sufficient:** providing tool support only; attending training; leading people; establishing an education partnership.
- **Neighbours / boundary:** `tooling-enablement` embeds a work tool; `people-leadership` develops direct reports; `education-partnerships` governs partner delivery. Education delivery owns the learning intervention.
- **Positive example:** Delivered a workshop, assessed exercises, and revised the module after observed difficulty.
- **Counterexample:** Attended the required system briefing.

### Operations & Delivery

#### `cross-functional-delivery` — Cross-functional Delivery
- **Definition:** Coordinating accountable work across distinct functions to deliver a shared outcome and resolve inter-functional execution barriers.
- **Positive:** aligns function-specific responsibilities; resolves ownership/blockers; integrates delivery to an outcome.
- **Not sufficient:** meeting attendance; generic collaboration; stakeholders receiving a status pack; several people from one function working together.
- **Neighbours / boundary:** `dependency-management` sequences dependencies; `change-leadership` shifts adoption; `commercial-partnerships` crosses organisations for commercial value. Cross-functional delivery requires active integration across functions.
- **Positive example:** Aligned legal, operations, and engineering ownership and removed blockers to complete a release.
- **Counterexample:** Participated in regular cross-team discussions.

#### `dependency-management` — Dependency Management
- **Definition:** Identifying, sequencing, owning, and resolving dependencies whose timing or completion affects delivery.
- **Positive:** maps dependency relationships; assigns owners/dates; resolves conflicts or escalates dependency risk.
- **Not sufficient:** generic collaboration; maintaining a plan without dependencies; coordinating tasks that are independent.
- **Neighbours / boundary:** `cross-functional-delivery` integrates functions broadly; `roadmap-governance` prioritises product commitments; `operating-rhythm` maintains recurring coordination. Dependency management focuses on prerequisite relationships.
- **Positive example:** Sequenced vendor, data, and frontline prerequisites across staged cutovers.
- **Counterexample:** Attended a project meeting with several functions.

#### `ecosystem-operations` — Ecosystem Operations
- **Definition:** Operating repeatable processes, hand-offs, performance routines, and issue resolution across a network of external partners.
- **Positive:** establishes multi-partner operating model; coordinates shared service/delivery flows; monitors and improves ecosystem performance.
- **Not sufficient:** managing one supplier contract; setting partner strategy; internal cross-functional delivery.
- **Neighbours / boundary:** `commercial-partnerships` creates joint commercial value; `partner-strategy` selects partnership direction; `cross-functional-delivery` is internal. Ecosystem operations runs the partner network.
- **Positive example:** Established shared service metrics and escalation across distributors, logistics partners, and support vendors.
- **Counterexample:** Negotiated one partner agreement.

#### `operating-rhythm` — Operating Rhythm
- **Definition:** Establishing a recurring organisational cadence for reviewing information, making decisions, assigning action, and following through.
- **Positive:** creates repeatable forums/cycles; defines inputs and decision rights; tracks commitments across cycles.
- **Not sufficient:** attending a meeting; circulating status; a product-specific cadence with no broader operating purpose.
- **Neighbours / boundary:** `product-cadence` governs product discovery/delivery/learning; `roadmap-governance` owns priority choices. Operating rhythm is domain-general recurring management cadence.
- **Positive example:** Introduced monthly performance reviews with decision inputs, named owners, and tracked follow-through.
- **Counterexample:** Received the monthly status pack.

#### `process-improvement` — Process Improvement
- **Definition:** Redesigning an existing workflow to improve measurable efficiency, quality, reliability, or experience.
- **Positive:** diagnoses current workflow; changes steps/hand-offs; demonstrates a better operational outcome.
- **Not sufficient:** documenting a process; designing an enterprise operating model; complying with an existing process.
- **Neighbours / boundary:** `operating-model` designs system-wide ownership; `people-process` concerns employee lifecycle processes; `operating-control` embeds control. Process improvement changes a bounded workflow and outcome.
- **Positive example:** Removed duplicate approval hand-offs and reduced turnaround time.
- **Counterexample:** Drew the existing workflow without changing it.

#### `service-performance` — Service Performance
- **Definition:** Managing service outcomes against defined levels or measures and intervening to restore or improve performance.
- **Positive:** monitors service measures; diagnoses performance gap; executes and verifies corrective action.
- **Not sufficient:** preparing a status report from others' updates; general process improvement without service measures; passive SLA awareness.
- **Neighbours / boundary:** `variance-analysis` explains deviation; `operating-control` keeps processes within limits; `benefits-realisation` tracks investment value. Service performance requires owned service measures and intervention.
- **Positive example:** Identified a service-level decline, changed staffing coverage, and restored response time.
- **Counterexample:** Compiled the weekly programme status report.

### People & Organisation

#### `employee-relations` — Employee Relations
- **Definition:** Managing workplace conduct, grievance, performance, conflict, or employment-relations cases to fair and compliant resolution.
- **Positive:** assesses a specific case; advises or leads formal process; documents resolution and risk handling.
- **Not sufficient:** redesigning promotion workflow; routine people management; writing general HR policy.
- **Neighbours / boundary:** `people-process` designs repeatable employee processes; `policy-governance` owns rules; `workforce-advisory` advises workforce choices. Employee relations is case-based workplace resolution.
- **Positive example:** Led a complex grievance investigation through documented resolution.
- **Counterexample:** Standardised promotion approval steps.

#### `hr-systems` — HR Systems
- **Definition:** Owning implementation, configuration, integration, or improvement of technology supporting people processes and workforce data.
- **Positive:** configures an HR platform/workflow; integrates it into people operations; improves data/service outcomes and user use.
- **Not sufficient:** using an HR system; generic tool training; redesigning a people process without system ownership.
- **Neighbours / boundary:** `tooling-enablement` is domain-general user enablement; `people-process` designs the process; `legal-technology` applies legal domain systems. HR systems requires people-domain system ownership.
- **Positive example:** Configured onboarding workflow in the HR platform and reduced incomplete employee records.
- **Counterexample:** Entered leave data into the HR system.

#### `organisation-design` — Organisation Design
- **Definition:** Designing organisational structures, roles, accountabilities, reporting relationships, and decision rights to support an objective.
- **Positive:** diagnoses structural issue; redesigns units/roles/rights; aligns structure to intended operating outcome.
- **Not sufficient:** defining a workflow; designing a broad operating model without people-structure change; moving tasks informally.
- **Neighbours / boundary:** `operating-model` covers broader processes, governance, systems, and structure; `people-process` designs employee workflows. Organisation design specifically changes organisational structure and accountability.
- **Positive example:** Consolidated regional roles into specialist teams and redrew reporting lines and decision rights.
- **Counterexample:** Simplified an approval workflow.

#### `people-process` — People Process Design
- **Definition:** Designing or materially improving repeatable employee-lifecycle processes and their roles, decisions, evidence, and exceptions.
- **Positive:** redesigns hiring, promotion, onboarding, performance, or similar workflow; defines roles/criteria; improves employee/manager outcome.
- **Not sufficient:** resolving one employee case; changing organisation structure; administering an unchanged HR process.
- **Neighbours / boundary:** `employee-relations` is case resolution; `organisation-design` changes structure; `operating-control` is domain-general control. People-process is a repeatable employee lifecycle workflow.
- **Positive example:** Reworked promotion intake, calibration, evidence, approvals, and exception ownership.
- **Counterexample:** Advised on one grievance.

#### `talent-planning` — Talent Planning
- **Definition:** Assessing future capability and succession needs and converting them into workforce or development actions.
- **Positive:** runs talent/succession assessment; identifies critical gaps or successors; agrees development, movement, or hiring actions.
- **Not sufficient:** processing promotions; individual coaching alone; generic workforce advice.
- **Neighbours / boundary:** `workforce-advisory` advises business workforce decisions; `people-leadership` develops a team; `organisation-design` sets structure. Talent planning creates future talent/succession actions.
- **Positive example:** Facilitated succession review and agreed development actions for critical roles.
- **Counterexample:** Administered annual promotion forms.

#### `workforce-advisory` — Workforce Advisory
- **Definition:** Applying people, organisation, and workforce expertise to advise leaders on consequential workforce decisions.
- **Positive:** diagnoses workforce issue; frames options and implications; influences a documented people-practice or workforce decision.
- **Not sufficient:** providing policy information; HR administration; making a line-management decision for one's own team.
- **Neighbours / boundary:** `talent-planning` owns succession/capability planning; `organisation-design` creates structure; `employee-relations` resolves cases. Workforce advisory is decision counsel across workforce topics.
- **Positive example:** Advised leaders on workforce options that changed resourcing and role design.
- **Counterexample:** Explained the existing leave policy.

### Product

#### `product-insights` — Product Insights
- **Definition:** Deriving and applying evidence about product users, behavior, value, and friction to product decisions.
- **Positive:** analyses product use or discovery evidence; identifies product-specific problem/opportunity; changes hypothesis, priority, or design.
- **Not sufficient:** generic customer research; reporting feature metrics; governing a roadmap without insight generation.
- **Neighbours / boundary:** `audience-insight` concerns broader audience needs; `insight-synthesis` is domain-general; `roadmap-governance` makes priority decisions. Product insights supplies product-specific evidence and interpretation.
- **Positive example:** Traced feature abandonment and converted the causes into a prioritised product hypothesis.
- **Counterexample:** Reported weekly active users without interpretation.

#### `product-cadence` — Product Operating Cadence
- **Definition:** Establishing a repeatable product-management cycle connecting discovery, outcome review, delivery decisions, and learning.
- **Positive:** creates product-specific recurring forum/cycle; reviews outcome evidence; commits next product work and follows through.
- **Not sufficient:** generic status meetings; one roadmap decision; an organisation-wide operating review unrelated to product learning.
- **Neighbours / boundary:** `operating-rhythm` is domain-general management cadence; `roadmap-governance` owns priority/trade-offs; `cross-functional-delivery` executes across functions. Product cadence connects product learning and decisions over time.
- **Positive example:** Introduced fortnightly evidence reviews that converted outcomes into named product commitments.
- **Counterexample:** Attended a monthly project status meeting.

#### `roadmap-governance` — Roadmap Governance
- **Definition:** Owning transparent prioritisation, sequencing, trade-offs, and change control for a product roadmap.
- **Positive:** evaluates competing roadmap demands; resolves priority/sequence trade-offs; updates and communicates governed commitments.
- **Not sufficient:** generating a product insight; facilitating a cadence without prioritisation authority; maintaining a release list.
- **Neighbours / boundary:** `product-cadence` is the recurring cycle; `dependency-management` manages prerequisites; `product-insights` informs choices. Roadmap governance is decision authority over product commitments.
- **Positive example:** Replaced ad-hoc requests with evidence-based sequencing decisions and an updated shared release plan.
- **Counterexample:** Identified why users abandoned one feature.

### Strategy & Transformation

#### `benefits-realisation` — Benefits Realisation
- **Definition:** Defining, assigning, measuring, and actively securing the outcomes promised by an investment or change after commitment.
- **Positive:** establishes benefit measures and owners; tracks actual value; intervenes when realised value diverges from the case.
- **Not sufficient:** approving investment; reporting project completion; measuring service performance unrelated to a committed benefit.
- **Neighbours / boundary:** `investment-governance` allocates resources; `service-performance` manages ongoing service; `change-leadership` secures adoption. Benefits realisation owns delivery of promised value.
- **Positive example:** Reconciled automation savings after launch and challenged owners where value fell short.
- **Counterexample:** Approved the automation budget.

#### `change-leadership` — Change Leadership
- **Definition:** Leading a transition in organisational behavior or ways of working by mobilising people, addressing adoption barriers, and stabilising the new practice.
- **Positive:** creates adoption ownership/champions; addresses resistance or reversion; reinforces new behavior until it sustains.
- **Not sufficient:** participating in change; implementing technology alone; delivering training alone; managing a project labelled transformation; changing a process with no adoption leadership.
- **Neighbours / boundary:** `tooling-enablement` makes a tool usable; `education-delivery` develops skill; `cross-functional-delivery` coordinates execution; `customer-adoption` concerns customers. Change leadership requires active organisational behavior transition.
- **Positive example:** Used local champions and barrier reviews until teams stopped reverting to the old routine.
- **Counterexample:** Attended the mandatory briefing and used the new system.

#### `market-strategy` — Market Strategy
- **Definition:** Choosing where and how to compete based on market, customer, competitor, and economic evidence.
- **Positive:** assesses market attractiveness/position; chooses target segments, proposition, or route; sets coherent market priorities and trade-offs.
- **Not sufficient:** customer segmentation alone; evaluating campaign performance; internal operating strategy.
- **Neighbours / boundary:** `audience-insight` explains needs; `strategic-analysis` evaluates options; `operating-strategy` sets internal execution direction. Market strategy makes external competitive choices.
- **Positive example:** Chose target segments and route-to-market after comparing demand, competition, and economics.
- **Counterexample:** Built customer segments for an existing campaign.

#### `operating-model` — Operating Model Design
- **Definition:** Designing how an organisation delivers value through integrated accountabilities, decision rights, processes, governance, structure, and enabling systems.
- **Positive:** defines a future operating system across several elements; resolves interfaces/hand-offs; aligns design to strategic outcome.
- **Not sufficient:** improving one workflow; changing reporting lines alone; introducing a meeting cadence.
- **Neighbours / boundary:** `organisation-design` focuses structure/roles; `process-improvement` changes a bounded workflow; `operating-rhythm` creates cadence. Operating-model evidence integrates multiple operating-system elements.
- **Positive example:** Designed future service ownership, decision rights, governance forums, and central-regional hand-offs.
- **Counterexample:** Removed two steps from one approval process.

#### `operating-strategy` — Operating Strategy
- **Definition:** Setting the medium-term choices and priorities by which an organisation will build and deploy operating capabilities to deliver strategy.
- **Positive:** diagnoses operating constraints; chooses capability/scale/service priorities; links choices to strategic and performance outcomes.
- **Not sufficient:** programme status reporting; designing a detailed operating model; market-entry analysis; generic transformation participation.
- **Neighbours / boundary:** `market-strategy` chooses external competition; `operating-model` designs how work operates; `strategic-analysis` evaluates options. Operating strategy sets internal capability direction.
- **Positive example:** Set a three-year operating-capability strategy balancing automation, service model, and investment priorities.
- **Counterexample:** Prepared weekly transformation status updates.

#### `partner-strategy` — Partner Strategy
- **Definition:** Choosing which external partners to pursue, the strategic role and value logic of each, and how the portfolio should evolve.
- **Positive:** evaluates partner fit; defines mutual strategic value and role; sets portfolio, lifecycle, or expansion direction.
- **Not sufficient:** operating one joint offer; negotiating contract terms; any external collaboration.
- **Neighbours / boundary:** `commercial-partnerships` builds/operates joint commercial value; `ecosystem-operations` runs partner processes; `education-partnerships` serves learning outcomes. Partner strategy is direction and portfolio choice.
- **Positive example:** Reset a partner's role and agreed a multi-year improvement and expansion agenda.
- **Counterexample:** Renewed unchanged supplier terms.

#### `strategic-analysis` — Strategic Analysis
- **Definition:** Evaluating consequential strategic choices through structured evidence, alternatives, trade-offs, and implications.
- **Positive:** frames a strategic decision; compares material options; assesses economics, risk, constraints, or second-order effects; recommends a choice.
- **Not sufficient:** synthesising findings for an operational decision; producing a forecast; reporting performance.
- **Neighbours / boundary:** `insight-synthesis` integrates evidence into any decision; `scenario-modelling` models alternative futures; `market-strategy` makes external competitive choices. Strategic analysis requires consequential option/trade-off evaluation.
- **Positive example:** Compared market-entry paths across demand, economics, execution constraints, and downside risk.
- **Counterexample:** Summarised survey results for a routine process decision.

## Pairwise confusability and family audit

Meaningful groups, not a blind 51×51 matrix:

| Group | IDs | Classification | Distinguishing evidence; insufficient discriminator |
| --- | --- | --- | --- |
| Future/actual/deviation analysis | forecasting; scenario-modelling; variance-analysis | SOFT_BOUNDARY | Expected future vs explicit alternative futures vs explained deviation. Merely using numbers or “plan” is insufficient. |
| General/strategic/product/audience insight | insight-synthesis; strategic-analysis; product-insights; audience-insight | MISSING_BOUNDARY | Integration act vs strategic option evaluation vs product-use interpretation vs audience need. “Produced insights” is insufficient. |
| Measurement/effectiveness/allocation/value | measurement-design; marketing-effectiveness; investment-governance; benefits-realisation | MISSING_BOUNDARY | Design method vs evaluate marketing impact vs allocate resources vs secure promised value. Tracking a metric is insufficient. |
| Research/segmentation/audience | research-design; customer-segmentation; audience-insight | SOFT_BOUNDARY | Inquiry design vs grouping model vs interpreted need. Interviews alone do not distinguish them. |
| Selling/account lifecycle | consultative-selling; pipeline-management; account-growth; commercial-negotiation | CLEAR_BOUNDARY after proposal | Diagnose solution vs govern opportunity portfolio vs expand existing account vs trade terms. A sales context alone is insufficient. |
| Partnership identity | commercial-partnerships; partner-strategy; ecosystem-operations; education-partnerships | MISSING_BOUNDARY; POTENTIAL_DUPLICATE_SEMANTICS for commercial-partnerships/partner-strategy | Operate joint commercial value vs set partner direction vs run multi-partner processes vs shared learning outcome. “Partnered with” is insufficient. |
| Adoption/enablement/learning/change | tooling-enablement; education-delivery; change-leadership; customer-adoption | MISSING_BOUNDARY | Internal tool usability vs learning intervention vs organisational behavior transition vs external customer use. Rollout context alone is insufficient. |
| Governance/control/compliance | analytics-governance; architecture-governance; investment-governance; operating-control; policy-governance; regulatory-compliance; risk-controls | MISSING_BOUNDARY; POTENTIAL_DUPLICATE_SEMANTICS for operating-control/risk-controls | Governed object and authority must be explicit. “Governance”, a deadline, or following a control is insufficient. |
| Leadership scope | business-ownership; commercial-leadership; people-leadership | MISSING_BOUNDARY | Integrated business accountability vs commercial direction/outcome vs accountable people management. “Led” or title is insufficient. |
| Delivery coordination | cross-functional-delivery; dependency-management; change-leadership | SOFT_BOUNDARY | Integrate functions vs manage prerequisites vs stabilise behavior transition. Meetings and stakeholder presence are insufficient. |
| Operating system | operating-model; organisation-design; people-process; process-improvement | MISSING_BOUNDARY | Integrated operating system vs organisational structure vs employee-lifecycle workflow vs bounded workflow improvement. “Redesigned process” is insufficient. |
| Cadence and product decisions | operating-rhythm; product-cadence; roadmap-governance | MISSING_BOUNDARY; POTENTIAL_DUPLICATE_SEMANTICS for operating-rhythm/product-cadence | General management cycle vs product learning cycle vs roadmap decision authority. Recurring meetings alone are insufficient. |
| Service/value/control outcomes | service-performance; benefits-realisation; operating-control | SOFT_BOUNDARY | Service-level intervention vs promised investment value vs operational control environment. Reporting status is insufficient. |
| Domain systems | tooling-enablement; legal-technology; hr-systems | SOFT_BOUNDARY | User enablement vs ownership of legal/people-domain system outcomes. Tool use is insufficient. |
| Strategy direction | market-strategy; operating-strategy; strategic-analysis | MISSING_BOUNDARY | External competitive choice vs internal capability direction vs evaluation method. “Strategic” wording is insufficient. |

Potential duplicate-semantic groups: 3. Cross-family ambiguity groups: 12 (insight; measurement/value; partnerships; adoption; governance/control; leadership/strategy; delivery/change; operating-system design; cadence; service/value; domain systems; market/operating strategy).

Family-internal findings:

- **Analytics & Insight:** distinct territory is recoverable, but insight/measurement and future/deviation boundaries are absent.
- **Commercial:** lifecycle stages are distinct after boundaries; commercial-partnerships overlaps strategy across families.
- **Communication & Collaboration:** one-member family makes `education-partnerships` family placement less useful for disambiguation.
- **Customer & Market:** segmentation, interpreted audience insight, and adoption are distinct; the current labels do not explain output-versus-method boundaries.
- **Data & Technology:** both identities depend partly on domain/context. `tooling-enablement` needs performed-behavior criteria; `legal-technology` is a domain specialization.
- **Governance & Risk:** highest internal collision density. Governed object, authority, external/internal source, and control lifecycle must be explicit.
- **Leadership:** labels risk encoding seniority. Proposed definitions require accountable performed behavior, not role level.
- **Learning & Development:** single identity is clear but overlaps tooling/change through enablement activity.
- **Operations & Delivery:** cross-functional delivery, dependency management, cadence, control-adjacent performance, and process improvement require object/outcome boundaries.
- **People & Organisation:** structure, repeatable people process, case resolution, talent planning, advisory, and systems are distinct when the object of work is explicit.
- **Product:** `product-cadence` and `roadmap-governance` are not interchangeable; one is cycle, the other decision authority.
- **Strategy & Transformation:** analysis, market direction, operating direction, operating design, partner direction, adoption leadership, and value realisation are distinct but currently underdefined.

Family placement: 48 `FAMILY_ALIGNED`; 3 `FAMILY_AMBIGUOUS` (`education-partnerships`, `legal-technology`, `tooling-enablement`); 0 `POTENTIAL_FAMILY_MISPLACEMENT`. These are interpretation concerns, not recommendations to move identities.

## Frozen benchmark consistency

The frozen benchmark contains 42 REQUIRED, 29 ALLOWED_OPTIONAL, and 86 FORBIDDEN expectation links.

- REQUIRED: 42/42 `CONSISTENT` with the proposed boundaries.
- FORBIDDEN: 86/86 `CONSISTENT`. The exclusions correctly guard title/skill claims, passive participation, tool use, compliance-by-following, stakeholder attendance, generic transformation context, and nearby-but-unperformed capabilities.
- ALLOWED_OPTIONAL: 21 `CONSISTENT`, 5 `DEFENSIBLE_BUT_AMBIGUOUS`, and 3 `CONFLICTS_WITH_PROPOSED_BOUNDARY`.

Exact `BENCHMARK_SEMANTIC_CONTRACT_CONFLICT` entries:

1. `l2-analyst-workspace` / `analytics-governance` / `ALLOWED_OPTIONAL`: shared templates and workspace enablement do not establish metric definitions, analytical quality, ownership, access, or approval governance.
2. `l2-university-joint-programme` / `commercial-partnerships` / `ALLOWED_OPTIONAL`: the evidence establishes an education partnership but no joint commercial value creation or capture.
3. `adv-transformation-context` / `service-performance` / `ALLOWED_OPTIONAL`: compiling a status report from workstream updates does not demonstrate ownership of service measures or corrective intervention; it also conflicts with the fixture's zero-proposal intent.

Ambiguous optional expectations needing architectural review, not automatic edits: `l1-demand-forecast/variance-analysis`, `l1-workflow-improvement/operating-control`, `l3-field-service-rollout/education-delivery`, `l3-claims-workflow-adoption/cross-functional-delivery`, and `l2-market-entry-options/scenario-modelling`.

Per-fixture classification below accounts for every expectation. `C` = `CONSISTENT`, `A` = `DEFENSIBLE_BUT_AMBIGUOUS`, and `X` = `CONFLICTS_WITH_PROPOSED_BOUNDARY`. “all C” applies separately to every ID in that fixture's required or forbidden array.

| Fixture | REQUIRED | ALLOWED_OPTIONAL | FORBIDDEN |
| --- | --- | --- | --- |
| l1-demand-forecast | all C | variance-analysis A | all C |
| l1-supplier-negotiation | all C | none | all C |
| l1-behavioural-segmentation | all C | audience-insight C | all C |
| l1-release-risk-control | all C | operating-control C | all C |
| l1-team-leadership | all C | none | all C |
| l1-workshop-delivery | all C | none | all C |
| l1-workflow-improvement | all C | operating-control A | all C |
| l1-operating-model | all C | none | all C |
| l2-decision-brief | all C | strategic-analysis C | all C |
| l2-university-joint-programme | all C | commercial-partnerships X | all C |
| l2-analyst-workspace | all C | analytics-governance X | all C |
| l2-metric-decision-rights | all C | policy-governance C | all C |
| l2-regulated-release | all C | dependency-management C | all C |
| l2-service-accountabilities | all C | operating-model C | all C |
| l2-feature-behaviour | all C | insight-synthesis C | all C |
| l2-onboarding-activation | all C | product-insights C | all C |
| l2-joint-market-offer | all C | partner-strategy C | all C |
| l2-fortnightly-product-forum | all C | operating-rhythm C | all C |
| l2-market-entry-options | all C | market-strategy C; scenario-modelling A | all C |
| l2-promotion-workflow | all C | operating-control C | all C |
| l2-realised-savings | all C | investment-governance C | all C |
| l3-field-service-rollout | all C | education-delivery A | all C |
| l3-procurement-exception-regime | all C | operating-control C | all C |
| l3-marketing-investment-loop | all C | measurement-design C | all C |
| l3-claims-workflow-adoption | all C | cross-functional-delivery A | all C |
| l3-channel-needs-offer | all C | customer-segmentation C; market-strategy C | all C |
| l3-case-platform-transition | all C | cross-functional-delivery C | all C |
| l3-logistics-partner-renewal | all C | commercial-partnerships C | all C |
| l3-centralised-service-transition | all C | operating-model C | all C |
| l3-mobile-product-decisions | all C | dependency-management C | all C |
| adv-tool-use-not-enablement | all C | none | all C |
| adv-change-participant | none | none | all C |
| adv-stakeholder-attendance | none | none | all C |
| adv-control-compliance | none | none | all C |
| adv-transformation-context | none | service-performance X | all C |
| adv-led-data-entry | none | none | all C |
| adv-collaboration-mention | none | none | all C |
| adv-metadata-title-skills | none | none | all C |

The benchmark remains frozen. Because conflicts exist, its prior durability recommendation changes to `BENCHMARK_NEEDS_SEMANTIC_REVIEW_BEFORE_ADMISSION`.

## Repeated misses and false positives

Privacy-safe F.2–F.7 evidence repeatedly implicated `tooling-enablement`, `education-delivery`, `cross-functional-delivery`, `investment-governance`, `risk-controls`, `commercial-partnerships`, and `partner-strategy`; F.7 also showed family-level instability affecting Data & Technology, Learning & Development, Governance & Risk, Operations & Delivery, People & Organisation, Product, and Strategy & Transformation.

| Capability | Plausible library-semantic explanation |
| --- | --- |
| tooling-enablement | MISSING_DEFINITION + MISSING_DECISION_BOUNDARY + NEIGHBOUR_OVERLAP with education/change/adoption |
| education-delivery | MISSING_DECISION_BOUNDARY + NEIGHBOUR_OVERLAP with tooling enablement |
| cross-functional-delivery | MISSING_DECISION_BOUNDARY + LABEL_LEXICAL_BIAS toward generic collaboration/delivery |
| investment-governance | MISSING_DEFINITION + NEIGHBOUR_OVERLAP with marketing effectiveness/benefits realisation |
| risk-controls | MISSING_DECISION_BOUNDARY + NEIGHBOUR_OVERLAP with operating control/policy/compliance |
| commercial-partnerships | MISSING_DECISION_BOUNDARY + NEIGHBOUR_OVERLAP with partner strategy/negotiation |
| partner-strategy | MISSING_DEFINITION + NEIGHBOUR_OVERLAP with commercial partnerships |
| dependency-management | LABEL_LEXICAL_BIAS + NEIGHBOUR_OVERLAP with cross-functional delivery |
| product-cadence / roadmap-governance | MISSING_DECISION_BOUNDARY between cycle and authority |
| change-leadership | MISSING_DEFINITION + broad lexical/context bias; not treated specially |

These are plausible contributors, not causal proof. F.4–F.7 also prove inference-process competition and model variance independently.

Recurring forbidden outputs included `change-leadership` from transformation/rollout context, `regulatory-compliance` from a regulatory deadline, and P3 mappings on zero-proposal cases. Classification: `LIBRARY_BOUNDARY_LIKELY_CONTRIBUTOR` for change/compliance/control confusions, with `INFERENCE_PROCESS_MORE_LIKELY` for P3's broad zero-case instability. Overall false-positive judgment: `AMBIGUOUS / MULTI-CAUSE`.

## Role and personal-evidence consistency

Representative role requirements were inspected for every canonical identity. The proposed definitions preserve the intended meaning of current canonical role uses: `CONSISTENT`, with 0 conflicts. Role-specific expected-evidence phrases are useful supporting sources but cannot substitute for one shared canonical contract. The three family-ambiguous identities should receive special compatibility tests in a future implementation.

Privacy-safe historical mapping metadata identifies major personal mappings including `analytics-governance`, `insight-synthesis`, `measurement-design`, `people-leadership`, and `strategic-analysis`; earlier controlled holdout metadata also identified `tooling-enablement` and `change-leadership`. At the conceptual level these remain consistent with the proposed contracts. Classification: `CONSISTENT_WITH_AVAILABLE_PRIVACY_SAFE_METADATA`, not exhaustive personal-data revalidation.

All proposed contracts are usable from atomic performed-professional evidence without title, employer, career level, target role, or Founder identity. Generalization result: **YES**. Leadership and domain-system contracts explicitly require performed ownership rather than title or domain presence.

## Max-three assessment cap

- Maximum REQUIRED capabilities for one benchmark item: 3 (`l3-case-platform-transition`, `l3-mobile-product-decisions`). Required mappings fit exactly.
- Maximum REQUIRED plus strongly defensible OPTIONAL capabilities: 4. This occurs for `l3-channel-needs-offer`, `l3-case-platform-transition`, and `l3-mobile-product-decisions` under the proposed boundaries.
- Therefore the schema can represent every required benchmark mapping but cannot represent every required plus strongly defensible optional mapping for those cases.
- Classification: `MAX3_CURRENT_SEMANTIC_BOTTLENECK` for full semantic representation, though it is not the cause of missing required mappings in the current benchmark scoring.
- Outside the benchmark, one genuinely atomic outcome can plausibly demonstrate more than three materially distinct capabilities, especially a compact transformation outcome combining design, governance, enablement, adoption, and value. This is not authorization to change the schema.

## Runtime context feasibility and recommendation

Current provider canonical JSON is 4,458 characters, approximately 1,115 tokens using a transparent four-characters-per-token estimate. A compact runtime form containing ID, label, family, one concise definition, two positive criteria, two exclusions, and one neighbour distinction is estimated at roughly 18,000–22,000 characters or 4,500–5,500 tokens for all 51 identities: approximately 4.0–4.9× the current canonical-only context, an increase of roughly 3,400–4,400 tokens.

This remains operationally reasonable for one Stage-2 call relative to the already measured full-benchmark prompts, but it is material and must be measured. The audit prose is not the runtime payload; examples and extended criteria should remain in tests/documentation rather than all being sent to the model.

Recommended runtime shape: **D — `ID + LABEL + FAMILY + CONCISE DEFINITION + POSITIVE EVIDENCE TEST + KEY EXCLUSIONS + NEAREST-NEIGHBOUR DISTINCTION`**. Option C is close but omits an explicit positive evidence test and neighbour distinction, both necessary for this library.

Recommended next measured architecture: return first to the lowest-complexity measured arm, **F.3 prompt-only single full-batch mapping**, with only the new compact canonical semantic contracts added. This isolates contract value without the F.5 Stage-1 or F.7 partition variables. If it passes precision but remains incomplete, later testing may add the already measured F.5 full-batch behavior decomposition; bounded partitioning should not be reintroduced until semantic contracts are independently measured.

Temperature remains 0.1. Expected residual variance after definitions: `MODERATE`; F.4–F.7 established order, neighbour, batch, and run effects that semantic boundaries may reduce but cannot be assumed to eliminate. A separate determinism test remains necessary in the future implementation task.

## Scorecard and judgment

| Measure | Result |
| --- | ---: |
| Total capabilities | 51 |
| Strong existing contracts | 0 |
| Partial existing contracts | 0 |
| Label-only contracts | 22 |
| Ambiguous contracts | 29 |
| Missing explicit boundaries | 51 |
| Potential duplicate-semantic groups | 3 |
| Cross-family ambiguity groups | 12 |
| Benchmark-contract conflicts | 3 |
| Role-semantic conflicts | 0 |
| Family-placement concerns | 3 |
| Proposed definitions | 51 |
| Positive-evidence criteria coverage | 51/51 |
| Not-sufficient criteria coverage | 51/51 |
| Neighbour decision-boundary coverage | 51/51 |

Canonical semantic-contract weakness is system-wide and sufficiently characterized. A generalized hardening task is warranted, but the three benchmark conflicts require an explicit architecture decision before either the contracts or benchmark can be admitted. No canonical ID, rename, family move, schema change, validator change, provider change, or prompt change is automatically required by this audit.

Single next action: Founder/EM architecture review of the three exact benchmark-versus-contract conflicts, choosing authoritative canonical meanings before admitting one generalized semantic-contract implementation task.
