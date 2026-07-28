import Link from "next/link";
import { ResumeDerivedCapabilityExplorer } from "@/components/career-possibility/ResumeDerivedCapabilityExplorer";
import { exampleResumeDerivedCareerMap } from "@/lib/career-possibility/fixtures/exampleResumeDerivedCareerMap";

export default function ResumeDerivedCareerMapPreviewPage() {
  return (
    <main className="min-h-screen bg-[#050912] px-4 pb-5 pt-24 text-[#e8f4f6] sm:px-7 sm:pb-7 sm:pt-28">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-100/10 pb-5">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs text-cyan-200">Résumé-derived preview</span>
          <Link href="/career-map" className="min-h-11 rounded-lg px-3 py-3 text-sm text-slate-400 transition-colors hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/80">View example map</Link>
        </header>
        <section className="py-7 sm:py-9">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Capability Explorer</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Reviewed evidence, mapped carefully</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-400 sm:text-lg">Explore how reviewed and review-required evidence appears without scores, paths, or readiness claims.</p></div>
            <span className="w-fit rounded-full border border-violet-300/15 bg-violet-300/5 px-3 py-1.5 text-xs text-violet-200">Fictional reviewed evidence</span>
          </div>
          <p className="mt-4 max-w-4xl rounded-xl border border-cyan-100/10 bg-white/[0.025] px-4 py-2.5 text-xs leading-5 text-slate-500">Not connected to your CV. This isolated preview uses fictional evidence to demonstrate provenance and review states.</p>
        </section>
        <ResumeDerivedCapabilityExplorer presentation={exampleResumeDerivedCareerMap} />
        <footer className="py-6 text-center text-xs text-slate-600">This preview describes evidence state, not verification, qualification, or hiring readiness.</footer>
      </div>
    </main>
  );
}
