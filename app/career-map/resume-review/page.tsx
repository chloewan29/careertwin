import Link from "next/link";
import type { Metadata } from "next";
import { ResumeEvidenceReviewWorkspace } from "@/components/career-possibility/ResumeEvidenceReviewWorkspace";
import { exampleResumeEvidence } from "@/lib/career-possibility/fixtures/exampleResumeEvidence";
import { RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION, type ResumeEvidenceReviewSession } from "@/lib/career-possibility/resume-evidence-review-contract";
import type { CareerMapCapabilityDefinition } from "@/lib/career-possibility/reviewed-resume-evidence-map-adapter";

const capabilityDefinitionVersion = "fictional-review-capabilities/1";
const capabilityDefinitions = [
  { id: "automation", label: "Automation", family: "Delivery" },
  { id: "stakeholder-coordination", label: "Stakeholder coordination", family: "Collaboration" },
  { id: "customer-insight", label: "Customer insight", family: "Insight" },
  { id: "people-leadership", label: "People leadership", family: "Leadership" },
] as const satisfies readonly CareerMapCapabilityDefinition[];

const initialSession: ResumeEvidenceReviewSession = {
  schemaVersion: RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION,
  id: "fictional-resume-review",
  sourceBundleId: exampleResumeEvidence.id,
  sourceSchemaVersion: exampleResumeEvidence.schemaVersion,
  capabilityDefinitionVersion,
  status: "not_started",
  decisions: [],
  warnings: [],
};

export const metadata: Metadata = {
  title: "Fictional Résumé Review Preview — CareerTwin",
  description: "An in-page fictional evidence review demonstration. Nothing is uploaded or saved.",
};

export default function ResumeReviewPreviewPage() {
  return <main className="min-h-screen bg-[#050912] px-4 pb-10 pt-24 text-slate-100 sm:px-7 sm:pt-28">
    <div className="mx-auto max-w-[1500px]">
      <header className="border-b border-cyan-100/10 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-3"><span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs text-cyan-200">Résumé review preview</span><Link href="/career-map/resume-preview" className="min-h-11 rounded-lg px-3 py-3 text-sm text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">View read-only preview</Link></div>
        <div className="mt-7 flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Fictional résumé evidence</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Review evidence before it shapes the map</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">Confirm, edit, reject, restore, or remap fictional evidence through an auditable in-page decision session.</p></div><span className="w-fit rounded-full border border-violet-300/15 bg-violet-300/5 px-3 py-1.5 text-xs text-violet-200">Changes are kept in this page only</span></div>
        <div className="mt-5 grid gap-2 rounded-xl border border-cyan-100/10 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-slate-400 sm:grid-cols-2"><p>Not connected to your CV. This fictional review session stays in this page.</p><p>Nothing is uploaded or saved.</p></div>
      </header>
      <ResumeEvidenceReviewWorkspace bundle={exampleResumeEvidence} initialSession={initialSession} capabilityDefinitions={capabilityDefinitions} capabilityDefinitionVersion={capabilityDefinitionVersion} />
    </div>
  </main>;
}
