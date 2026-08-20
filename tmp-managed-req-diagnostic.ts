import { bridgeEvidenceToProvisionalSignals } from "./lib/career-possibility/provisional-evidence-signal-bridge";
import { provisionalEvidenceSignalPolicy } from "./lib/career-possibility/provisional-evidence-signal-policy";
import type { ProvisionalEvidenceSignalInput } from "./lib/career-possibility/provisional-evidence-signal-contract";

const fixture = (id: string, text: string): ProvisionalEvidenceSignalInput => ({
  evidence: { id, employmentRecordId: "employment:synthetic", sourceSpanIds: [`span:${id}`], sourceText: text, reviewStatus: "unreviewed", processingStatus: "source_provided", extractionMethod: "deterministic", warnings: [] },
  sourceSpans: [{ id: `span:${id}`, documentId: "document:synthetic", sourceType: "resume_upload", employmentRecordId: "employment:synthetic", startOffset: 0, endOffset: text.length, originalText: text }],
});
const bridge = (id: string, text: string) => bridgeEvidenceToProvisionalSignals(fixture(id, text), provisionalEvidenceSignalPolicy);
const tokens = (r: Awaited<ReturnType<typeof bridge>>) => (r.status === "structured" ? r.evidence.signals.map((s) => s.value) : []);

const cases: Array<[string, string]> = [
  // valid management
  ["valid-managed", "Managed requirements for the product."],
  ["valid-defined-owned", "Defined and owned product requirements."],
  ["valid-owned-platform", "Owned the platform requirements."],
  ["valid-prioritised", "Prioritised requirements across releases."],
  ["valid-prioritized", "Prioritized service requirements."],
  ["valid-workflow-owner", "Managed a reporting workflow, requirements and delivery quality."],
  ["valid-product-multiple", "Owned a reporting product, its requirements and delivery quality."],
  // gathering/collection negatives
  ["neg-gathered", "Gathered requirements."],
  ["neg-collected", "Collected requirements."],
  ["neg-captured", "Captured requirements."],
  ["neg-documented", "Documented requirements."],
  ["neg-facilitated", "Facilitated requirements gathering."],
  ["neg-interviewed", "Interviewed users to gather requirements."],
  ["neg-workshops", "Ran workshops to collect requirements."],
  // delegation negatives
  ["neg-delegated-team", "Managed a team gathering requirements."],
  ["neg-delegated-analysts", "Managed analysts documenting requirements."],
  ["neg-delegated-consultants", "Managed consultants collecting requirements."],
  ["neg-delegated-process", "Managed a process for requirements gathering."],
  ["neg-delegated-delivery", "Managed delivery while the team gathered requirements."],
  // passive/support negatives
  ["neg-supported", "Supported requirements management."],
  ["neg-contributed", "Contributed to requirements."],
  ["neg-reviewed", "Reviewed requirements."],
  ["neg-received", "Received requirements."],
  ["neg-worked", "Worked with requirements."],
  ["neg-responsible", "Responsible for requirements."],
  ["neg-experience", "Requirements management experience."],
  ["neg-skills", "Requirements management skills."],
  ["neg-passive-defined", "Requirements were defined."],
  ["neg-helped-define", "Helped define requirements."],
];

async function main() {
  for (const [id, text] of cases) {
    const r = await bridge(id, text);
    const t = tokens(r);
    const detail = r.status === "structured" ? t.join(",") : `${r.status}:${r.unresolved.reason}`;
    console.log(`${t.includes("managed_requirements") ? "EMIT " : "no   "} ${id.padEnd(26)} ${text}  =>  ${detail}`);
  }
}
main().catch((error) => { process.exitCode = 1; throw error; });
