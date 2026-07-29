import type { Metadata } from "next";
import { ResumeTextIntakeWorkspace } from "@/components/career-possibility/ResumeTextIntakeWorkspace";
import { canonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityFamilyLibrary } from "@/lib/career-possibility/canonical-capability-family-library";
import { buildCareerMapCapabilityDefinitionsFromCanonicalLibrary } from "@/lib/career-possibility/canonical-capability-definition-adapter";

export const metadata: Metadata = {
  title: "Text Résumé Intake Preview — CareerTwin",
  description:
    "A browser-memory-only deterministic résumé evidence review preview.",
};

export default function ResumeTextIntakePage() {
  const capabilityDefinitions =
    buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({
      capabilityLibrary: canonicalCapabilityLibrary,
      familyLibrary: canonicalCapabilityFamilyLibrary,
    });
  if (!capabilityDefinitions.ok)
    throw new Error(
      `Canonical capability definitions are invalid: ${JSON.stringify(capabilityDefinitions.issues)}`,
    );
  return (
    <main className="min-h-screen bg-[#050912] px-4 pb-12 pt-24 text-slate-100 sm:px-7 sm:pt-28">
      <div className="mx-auto max-w-[1180px]">
        <header className="border-b border-cyan-100/10 pb-7">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs text-cyan-200">
              Text résumé intake preview
            </span>
            <span className="rounded-full border border-amber-300/20 bg-amber-300/5 px-3 py-1.5 text-xs text-amber-100">
              Evidence review only
            </span>
          </div>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">
            Plain-text source boundary
          </p>
          <h1 className="mt-3 max-w-4xl text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Inspect evidence before making any capability claim
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-400">
            Paste plain résumé text, inspect deterministic segmentation, then
            confirm, edit, reject, or restore evidence in this page.
          </p>
          <div className="mt-5 rounded-xl border border-amber-200/20 bg-amber-200/5 p-4 text-sm leading-6 text-amber-100">
            <p className="font-semibold">
              Review controls every capability mapping.
            </p>
            <p className="text-amber-100/70">
              No capability is inferred automatically; mappings remain
              provisional and browser-memory only.
            </p>
          </div>
        </header>
        <ResumeTextIntakeWorkspace
          parserVersion="1.0.0"
          normalisationVersion="1.0.0"
          capabilityDefinitions={capabilityDefinitions.definitions}
          capabilityDefinitionVersion={capabilityDefinitions.definitionVersion}
        />
      </div>
    </main>
  );
}
