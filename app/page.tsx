import type { Metadata } from "next";
import { RootCvUploadWorkspace } from "@/components/career-possibility/RootCvUploadWorkspace";
import { CapabilityExplorer } from "@/components/career-possibility/CapabilityExplorer";
import { mockCareerPossibility } from "@/components/career-possibility/mockCareerPossibility";
import { canonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import { canonicalCapabilityFamilyLibrary } from "@/lib/career-possibility/canonical-capability-family-library";
import { buildCareerMapCapabilityDefinitionsFromCanonicalLibrary } from "@/lib/career-possibility/canonical-capability-definition-adapter";

export const metadata: Metadata = { title: "CareerTwin — Your career, replicated", description: "See how your experience connects to capabilities and possible career directions." };
export default function Home() {
  const definitions = buildCareerMapCapabilityDefinitionsFromCanonicalLibrary({ capabilityLibrary: canonicalCapabilityLibrary, familyLibrary: canonicalCapabilityFamilyLibrary });
  if (!definitions.ok) throw new Error("Canonical capability definitions are invalid.");
  return <main className="min-h-screen bg-[#050912] px-4 pb-12 pt-20 text-[#e8f4f6] sm:px-7 sm:pt-24"><div className="mx-auto max-w-[1500px]">
    <header className="flex items-center justify-between border-b border-cyan-100/10 pb-4 text-sm"><span className="font-semibold tracking-[0.08em] text-cyan-200">CAREERTWIN</span><span className="text-cyan-50/40">Career Map</span></header>
    <div className="grid gap-8 py-9 lg:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.55fr)] lg:items-start lg:gap-x-12 lg:gap-y-8 lg:py-12">
      <section className="min-w-0 lg:col-start-1 lg:row-start-1"><p className="text-xs font-semibold tracking-[0.18em] text-cyan-300">CAREERTWIN</p><h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-[1.04] tracking-[-0.035em] text-white sm:text-5xl lg:text-6xl">Your career, replicated.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-cyan-50/70 sm:text-lg">See how your experience connects to capabilities<br className="hidden sm:block" /> and possible career directions.</p></section>
      <aside className="lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:pt-24"><RootCvUploadWorkspace capabilityDefinitions={definitions.definitions} capabilityDefinitionVersion={definitions.definitionVersion} /></aside>
      <section className="min-w-0 lg:col-start-1 lg:row-start-2"><p className="mb-3 text-xs text-cyan-50/45">Interactive example · not your data</p><CapabilityExplorer result={mockCareerPossibility} variant="hero" /></section>
    </div>
  </div></main>;
}
