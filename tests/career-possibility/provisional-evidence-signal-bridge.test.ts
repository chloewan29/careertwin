import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { canonicalCapabilityLibrary } from "../../lib/career-possibility/canonical-capability-library";
import { bridgeEvidenceToProvisionalSignals, validateProvisionalEvidenceSignalPolicy, validateProvisionalEvidenceSignalRule, validateProvisionalEvidenceSignalUnresolved, validateProvisionalStructuredEvidence } from "../../lib/career-possibility/provisional-evidence-signal-bridge";
import type { ProvisionalEvidenceSignalInput, ProvisionalEvidenceSignalPolicy } from "../../lib/career-possibility/provisional-evidence-signal-contract";
import { PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION, provisionalEvidenceSignalPolicy } from "../../lib/career-possibility/provisional-evidence-signal-policy";
import { mapProvisionalResumeEvidence } from "../../lib/career-possibility/provisional-resume-capability-mapper";
import { provisionalResumeMappingPolicy } from "../../lib/career-possibility/provisional-resume-mapping-policy";

const definitions = canonicalCapabilityLibrary.capabilities;
const definitionVersion = canonicalCapabilityLibrary.contentVersion;
const fixture = (id: string, text: string, offset = 0): ProvisionalEvidenceSignalInput => ({ evidence: { id, employmentRecordId: "employment:synthetic", sourceSpanIds: [`span:${id}`], sourceText: text, reviewStatus: "unreviewed", processingStatus: "source_provided", extractionMethod: "deterministic", warnings: [] }, sourceSpans: [{ id: `span:${id}`, documentId: "document:synthetic", sourceType: "resume_upload", employmentRecordId: "employment:synthetic", startOffset: offset, endOffset: offset + text.length, originalText: text }] });
const bridge = (input: ProvisionalEvidenceSignalInput, policy = provisionalEvidenceSignalPolicy) => bridgeEvidenceToProvisionalSignals(input, policy);
const map = async (result: Awaited<ReturnType<typeof bridge>>) => result.status === "structured" ? mapProvisionalResumeEvidence({ evidence: result.evidence, policy: provisionalResumeMappingPolicy, capabilityDefinitions: definitions, capabilityDefinitionVersion: definitionVersion }) : undefined;

async function main() {
  const direct = await bridge(fixture("research-direct", "Designed a research study for customer discovery."));
  assert.equal(direct.status, "structured"); if (direct.status !== "structured") throw new Error();
  assert.deepEqual(direct.evidence.signals, [{ field: "action", value: "designed_research" }]); assert.equal(direct.evidence.reviewStatus, "unreviewed"); assert.deepEqual(validateProvisionalStructuredEvidence(direct.evidence, provisionalEvidenceSignalPolicy), []);
  const directMapping = await map(direct); assert.equal(directMapping?.status, "auto_admitted"); if (directMapping?.status === "auto_admitted") { assert.equal(directMapping.mapping.capabilityId, "research-design"); assert.equal(directMapping.mapping.relationship, "direct_evidence"); }

  const support = await bridge(fixture("research-support", "Supported the delivery of research interviews.")); assert.equal(support.status, "structured"); if (support.status !== "structured") throw new Error(); assert.deepEqual(support.evidence.signals, [{ field: "action", value: "supported_research_delivery" }]); assert.equal(support.evidence.signals.some((item) => item.field === "ownership"), false);
  const supportMapping = await map(support); assert.equal(supportMapping?.status, "auto_admitted"); if (supportMapping?.status === "auto_admitted") assert.equal(supportMapping.mapping.relationship, "transferable_signal");

  const insight = await bridge(fixture("insight", "Synthesized research findings to inform a decision.")); assert.equal(insight.status, "structured"); if (insight.status !== "structured") throw new Error(); assert.deepEqual(insight.evidence.signals, [{ field: "action", value: "synthesised_findings" }, { field: "outcome", value: "informed_decision" }]); const insightMapping = await map(insight); assert.equal(insightMapping?.status, "auto_admitted");
  const crossFunctional = await bridge(fixture("cross-functional", "Led a cross-functional delivery program.")); assert.equal(crossFunctional.status, "structured"); if (crossFunctional.status !== "structured") throw new Error(); assert.deepEqual(crossFunctional.evidence.signals, [{ field: "action", value: "coordinated_cross_functional_delivery" }, { field: "ownership", value: "owned_delivery" }, { field: "scope", value: "cross_functional" }]); const crossMapping = await map(crossFunctional); assert.equal(crossMapping?.status, "auto_admitted");
  const process = await bridge(fixture("process", "Redesigned the operating process.")); assert.equal(process.status, "structured"); if (process.status !== "structured") throw new Error(); assert.deepEqual(process.evidence.signals, [{ field: "action", value: "redesigned_process" }]); const processMapping = await map(process); assert.equal(processMapping?.status, "auto_admitted");

  const participation = await bridge(fixture("participation", "Assisted the delivery team with documentation.")); assert.equal(participation.status, "unsupported"); if (participation.status === "unsupported") assert.equal(participation.unresolved.reason, "no_authored_signal_rule");
  const activityOnly = await bridge(fixture("activity", "Synthesized research findings for the weekly meeting.")); assert.equal(activityOnly.status, "structured"); if (activityOnly.status === "structured") assert.equal(activityOnly.evidence.signals.some((item) => item.field === "outcome"), false);
  const titleOnly = await bridge(fixture("title", "Senior Research Director")); assert.equal(titleOnly.status, "unsupported");
  const toolOnly = await bridge(fixture("tool", "Tableau, Power BI, SQL")); assert.equal(toolOnly.status, "unsupported");
  const ambiguous = await bridge(fixture("ambiguous", "Designed research and redesigned the operating process.")); assert.equal(ambiguous.status, "unresolved"); if (ambiguous.status === "unresolved") assert.equal(ambiguous.unresolved.reason, "multiple_action_signals");
  const ownershipConflict = await bridge(fixture("ownership-conflict", "Owned delivery and assisted the team.")); assert.equal(ownershipConflict.status, "unresolved"); if (ownershipConflict.status === "unresolved") assert.equal(ownershipConflict.unresolved.reason, "ownership_conflict");
  const hypothetical = await bridge(fixture("hypothetical", "Proposed a redesigned process.")); assert.equal(hypothetical.status, "structured"); if (hypothetical.status === "structured") assert.deepEqual(hypothetical.evidence.signals, [{ field: "context", value: "hypothetical" }]); assert.equal((await map(hypothetical))?.status, "unsupported");

  const realisticCases = [
    ["developed-method", "Developed a research methodology.", ["action:designed_research"], "research-design", "direct_evidence"],
    ["implemented-experiment", "Implemented an experiment design.", ["action:designed_research"], "research-design", "direct_evidence"],
    ["synthesised-recommendations", "Synthesised analysis into recommendations.", ["action:synthesised_findings", "outcome:informed_decision"], "insight-synthesis", "direct_evidence"],
    ["translated-recommendations", "Translated findings into business recommendations.", ["action:synthesised_findings", "outcome:informed_decision"], "insight-synthesis", "direct_evidence"],
    ["commercial-decision", "Combined multiple data sources to identify insights that informed a commercial decision.", ["action:synthesised_findings", "outcome:informed_decision"], "insight-synthesis", "direct_evidence"],
    ["partnered", "Partnered with Product and Sales.", ["scope:cross_functional"], "", ""],
    ["coordinated-across", "Coordinated delivery across Product and Sales.", ["action:coordinated_cross_functional_delivery", "scope:cross_functional"], "", ""],
    ["led-program", "Led a cross-functional program.", ["action:coordinated_cross_functional_delivery", "ownership:owned_delivery", "scope:cross_functional"], "cross-functional-delivery", "direct_evidence"],
    ["supported-program", "Supported a cross-functional program.", ["scope:cross_functional"], "", ""],
    ["streamlined-reporting", "Streamlined the reporting workflow.", ["action:redesigned_process"], "process-improvement", "direct_evidence"],
    ["standardised-measurement", "Standardised the measurement process.", ["action:redesigned_process"], "process-improvement", "direct_evidence"],
    ["automated-reporting", "Automated recurring reporting.", ["action:redesigned_process"], "process-improvement", "direct_evidence"],
    ["governance-process", "Established a governance process.", ["action:redesigned_process"], "process-improvement", "direct_evidence"],
    ["operating-model", "Scaled a repeatable operating model.", ["action:redesigned_process"], "process-improvement", "direct_evidence"],
  ] as const;
  for (const [id, text, expectedSignals, capabilityId, relationship] of realisticCases) {
    const result = await bridge(fixture(id, text)); assert.equal(result.status, "structured", id); if (result.status !== "structured") throw new Error(id);
    assert.deepEqual(result.evidence.signals.map((value) => `${value.field}:${value.value}`), [...expectedSignals], id); assert.equal(result.evidence.reviewStatus, "unreviewed", id);
    const mapped = await map(result); if (capabilityId) { assert.equal(mapped?.status, "auto_admitted", id); if (mapped?.status === "auto_admitted") { assert.equal(mapped.mapping.capabilityId, capabilityId, id); assert.equal(mapped.mapping.relationship, relationship, id); } } else assert.equal(mapped?.status, "unsupported", id);
  }
  for (const [id, text] of [["dashboard", "Built a dashboard."], ["analysis-only", "Analysed customer data."], ["improved-revenue", "Improved revenue."], ["enabled-growth", "Enabled growth."], ["designed-dashboard", "Designed a dashboard."], ["implemented-sql", "Implemented SQL."], ["responsible-analytics", "Responsible for analytics."], ["skills", "Skills: analytics, SQL, Tableau"], ["requirement", "Candidate will implement an experiment design."]] as const) assert.equal((await bridge(fixture(id, text))).status, "unsupported", id);
  const futureResearch = await bridge(fixture("future-research", "Would implement an experiment design.")); assert.equal(futureResearch.status, "structured"); if (futureResearch.status === "structured") assert.deepEqual(futureResearch.evidence.signals, [{ field: "context", value: "hypothetical" }]); assert.equal((await map(futureResearch))?.status, "unsupported");

  const signalCases = [
    ["strategic-risk", "Evaluated commercial trends, risks and opportunities for a planning decision.", "performed_strategic_analysis"],
    ["strategic-case", "Developed an analytical case for a strategic decision.", "performed_strategic_analysis"],
    ["executive-narrative", "Translated complex analysis into an executive narrative and recommendations.", "synthesised_executive_insight"],
    ["executive-presented", "Presented findings and recommendations to senior leaders.", "synthesised_executive_insight"],
    ["metric-governance", "Aligned KPI definitions and source logic to improve reporting consistency.", "established_analytics_governance"],
    ["quality-governance", "Established QA routines and documentation standards for reporting.", "established_analytics_governance"],
    ["dashboard-governance", "Reviewed the dashboard portfolio for consolidation and governance.", "established_analytics_governance"],
    ["measurement-framework", "Designed a measurement framework for programme evaluation.", "designed_measurement_framework"],
    ["incrementality", "Created an incrementality methodology for campaign evaluation.", "designed_measurement_framework"],
    ["business-framing", "Translated ambiguous business questions into analysis and recommendations.", "provided_analytics_business_advice"],
    ["business-advice", "Advised commercial leaders using evidence and recommendations.", "provided_analytics_business_advice"],
    ["product-owner", "Owned an analytics product, its requirements and delivery quality.", "owned_analytics_product"],
    ["workflow-owner", "Managed a reporting workflow, requirements and delivery quality.", "owned_analytics_product"],
    ["workflow-repeatable", "Standardised a repeatable analytical production workflow.", "enabled_analytics_workflow"],
    ["people-led", "Led and mentored analysts across the function.", "led_analytics_team"],
    ["people-managed", "Managed a team of analysts.", "led_analytics_team"],
    ["people-coached", "Coached analysts to build analytical capability.", "led_analytics_team"],
    ["investigative", "Identified behavioural patterns, anomalies and root causes.", "performed_investigative_analysis"],
    ["signal-noise", "Isolated signal from noise during an analytical deep dive.", "performed_investigative_analysis"],
    ["ai-reusable", "Built a reusable AI-assisted analytics workflow.", "enabled_analytics_workflow"],
    ["ai-validated", "Used an AI-assisted analytical workflow with explicit human validation.", "enabled_analytics_workflow"],
  ] as const;
  const admittedGroupA = new Map([
    ["performed_strategic_analysis", "strategic-analysis"],
    ["synthesised_executive_insight", "insight-synthesis"],
    ["established_analytics_governance", "analytics-governance"],
    ["led_analytics_team", "people-leadership"],
  ]);
  for (const [id, text, token] of signalCases) {
    const result = await bridge(fixture(id, text)); assert.equal(result.status, "structured", id); if (result.status !== "structured") throw new Error(id);
    assert.equal(result.evidence.signals.some((item) => item.value === token), true, id);
    assert.equal(result.evidence.reviewStatus, "unreviewed", id); assert.equal("capabilityId" in result.evidence, false); assert.equal("mappingId" in result.evidence, false);
    const mapped = await map(result); const capabilityId = admittedGroupA.get(token);
    if (capabilityId) { assert.equal(mapped?.status, "auto_admitted", id); if (mapped?.status === "auto_admitted") { assert.equal(mapped.mapping.capabilityId, capabilityId, id); assert.equal(mapped.mapping.relationship, "direct_evidence", id); } }
    else { assert.equal(mapped?.status, "unsupported", `${id}: intentionally deferred`); if (mapped?.status === "unsupported") assert.equal(mapped.unresolved.reason, "no_canonical_rule", id); }
  }
  const guardedCases = [
    ["strategic-title", "Strategic leader"], ["commercial-skill", "Skills: commercial analytics"],
    ["presented-dashboard", "Presented a dashboard."], ["executive-stakeholder", "Executive stakeholder"],
    ["dashboard-tool", "Power BI dashboard"], ["measurement-report", "Delivered a measurement report."],
    ["measurement-skill", "Skills: measurement"], ["generic-partner", "Partnered with Sales."],
    ["stakeholder-names", "Sales, Product, Finance"], ["supported-product", "Supported an analytics product."],
    ["lead-title", "Analytics Lead"], ["generic-analysis", "Analysed customer data."],
    ["risk-only", "Risk analytics"], ["ai-skills", "Skills: AI, LLM, Python, Codex, Gemini"],
    ["tool-names", "Python, Power BI, Tableau"], ["governance-only", "Analytics governance"],
  ] as const;
  for (const [id, text] of guardedCases) assert.equal((await bridge(fixture(id, text))).status, "unsupported", id);

  const unsupported = await bridge(fixture("unsupported", "Prepared weekly notes.")); assert.equal(unsupported.status, "unsupported"); if (unsupported.status === "unsupported") { assert.equal(unsupported.unresolved.reason, "no_authored_signal_rule"); assert.deepEqual(validateProvisionalEvidenceSignalUnresolved(unsupported.unresolved), []); }
  const invalid = await bridge({ evidence: { ...fixture("invalid", "Designed research.").evidence, reviewStatus: "confirmed" }, sourceSpans: fixture("invalid", "Designed research.").sourceSpans }); assert.equal(invalid.status, "unresolved"); if (invalid.status === "unresolved") assert.equal(invalid.unresolved.reason, "invalid_evidence");
  const duplicatePolicy: ProvisionalEvidenceSignalPolicy = { ...provisionalEvidenceSignalPolicy, rules: [provisionalEvidenceSignalPolicy.rules[0], provisionalEvidenceSignalPolicy.rules[0]] }; assert.equal(validateProvisionalEvidenceSignalPolicy(duplicatePolicy).some((item) => item.code === "duplicate_rule_id"), true); const invalidPolicy = await bridge(fixture("invalid-policy", "Designed research."), duplicatePolicy); assert.equal(invalidPolicy.status, "unresolved"); if (invalidPolicy.status === "unresolved") assert.equal(invalidPolicy.unresolved.reason, "invalid_signal_policy");
  assert.equal(validateProvisionalEvidenceSignalRule({ ...provisionalEvidenceSignalPolicy.rules[0], explanation: "" }, provisionalEvidenceSignalPolicy.vocabulary).some((item) => item.code === "missing_explanation"), true);
  assert.equal(validateProvisionalEvidenceSignalRule({ ...provisionalEvidenceSignalPolicy.rules[0], token: "unknown" as never }, provisionalEvidenceSignalPolicy.vocabulary).some((item) => item.code === "unknown_signal_token"), true);

  const repeated = await bridge(fixture("research-direct", "Designed a research study for customer discovery.")); assert.deepEqual(repeated, direct);
  const differentId = await bridge(fixture("research-direct-2", "Designed a research study for customer discovery.", 100)); assert.equal(differentId.status, "structured"); if (differentId.status === "structured") assert.notEqual(differentId.evidence.signalIdentity, direct.evidence.signalIdentity);
  const changedPolicy = await bridge(fixture("research-direct", "Designed a research study for customer discovery."), { ...provisionalEvidenceSignalPolicy, policyVersion: "provisional-evidence-signal-policy/1.0.1" }); assert.equal(changedPolicy.status, "structured"); if (changedPolicy.status === "structured") assert.notEqual(changedPolicy.evidence.signalIdentity, direct.evidence.signalIdentity);
  assert.equal(PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION, "provisional-evidence-signal-policy/1.2.0"); assert.equal(PROVISIONAL_EVIDENCE_SIGNAL_POLICY_VERSION, provisionalEvidenceSignalPolicy.policyVersion); assert.equal(provisionalEvidenceSignalPolicy.coverage, "bounded_non_exhaustive"); assert.equal(provisionalEvidenceSignalPolicy.vocabulary.length, 18); assert.equal(provisionalEvidenceSignalPolicy.rules.length, 45);
  assert.equal("capabilityId" in direct.evidence, false); assert.equal("mappingId" in direct.evidence, false);
  const source = ["provisional-evidence-signal-contract.ts", "provisional-evidence-signal-policy.ts", "provisional-evidence-signal-bridge.ts"].map((name) => readFileSync(new URL(`../../lib/career-possibility/${name}`, import.meta.url), "utf8")).join("\n"); assert.doesNotMatch(source, /\bfetch\s*\(|supabase|localStorage|indexedDB|openai|anthropic|embedding|fuzzy|react|next\//i);

  const row = (name: string, result: Awaited<ReturnType<typeof bridge>>, mapped: Awaited<ReturnType<typeof map>>) => ({ fixture: name, rule: result.status === "structured" ? result.evidence.matchedSignalRuleIds.join(", ") : result.unresolved.matchedSignalRuleIds.join(", "), signals: result.status === "structured" ? result.evidence.signals.map((item) => `${item.field}:${item.value}`).join(", ") : "", bridge: result.status, mapping: mapped?.status ?? "excluded", capability: mapped?.status === "auto_admitted" ? mapped.mapping.capabilityId : "", relationship: mapped?.status === "auto_admitted" ? mapped.mapping.relationship : "" });
  console.table([row("research design direct", direct, directMapping), row("research support transferable", support, supportMapping), row("insight synthesis", insight, insightMapping), row("cross-functional delivery", crossFunctional, crossMapping), row("process improvement", process, processMapping), row("ambiguous evidence", ambiguous, undefined), row("unsupported evidence", unsupported, undefined)]);
  console.log("provisional evidence signal bridge tests passed");
}

main().catch((error) => { process.exitCode = 1; throw error; });
