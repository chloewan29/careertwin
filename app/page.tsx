import type { Metadata } from "next";
import { ResumeTextIntakeWorkspace } from "@/components/career-possibility/ResumeTextIntakeWorkspace";
import { canonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityFamilyLibrary } from "@/lib/career-possibility/canonical-capability-family-library";
import { buildCareerMapCapabilityDefinitionsFromCanonicalLibrary } from "@/lib/career-possibility/canonical-capability-definition-adapter";

export const metadata: Metadata = {
  title: "CareerTwin — Map the evidence behind your experience",
  description: "Turn reviewed résumé evidence into a browser-local map of transferable capabilities and career directions.",
};

export default function Home() {
  const capabilityDefinitions = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({
    capabilityLibrary: canonicalCapabilityLibrary,
    familyLibrary: canonicalCapabilityFamilyLibrary,
  });
  if (!capabilityDefinitions.ok) throw new Error("Canonical capability definitions are invalid.");

  return (
    <main className="min-h-screen bg-[#050912] px-5 pb-10 pt-24 text-[#e8f4f6] sm:px-8 sm:pt-28">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex items-center justify-between border-b border-cyan-100/10 pb-5 text-sm">
          <span className="font-medium text-cyan-200">CareerTwin</span>
          <span className="text-slate-500">Career Map</span>
        </header>

        <section className="grid items-start gap-10 py-10 lg:grid-cols-[minmax(18rem,0.72fr)_minmax(0,1.28fr)] lg:gap-14 lg:py-16">
          <div className="max-w-2xl lg:sticky lg:top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">CareerTwin</p>
            <h1 className="mt-5 text-4xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Your career, replicated.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              CareerTwin turns your experience into a map of transferable capabilities, the evidence behind them, and credible career directions.
            </p>
            <p className="mt-5 max-w-xl text-sm leading-6 text-slate-500">
              See beyond your job title while keeping every claim grounded in evidence you review.
            </p>
          </div>

          <div className="min-w-0 rounded-2xl border border-cyan-100/10 bg-[#0b1321] p-5 shadow-[0_24px_90px_rgba(6,182,212,0.09)] sm:p-7">
            <h2 className="text-2xl font-semibold">Start with your résumé</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Paste plain résumé text here. It stays in this page while you extract and review the evidence.
            </p>
            <ResumeTextIntakeWorkspace
              parserVersion="1.0.0"
              normalisationVersion="1.0.0"
              capabilityDefinitions={capabilityDefinitions.definitions}
              capabilityDefinitionVersion={capabilityDefinitions.definitionVersion}
              entryMode="root"
              navigateToCareerMapOnApply
            />
          </div>
        </section>
      </div>
    </main>
  );
}
