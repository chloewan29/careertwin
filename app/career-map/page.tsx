import Link from "next/link";
import { CapabilityExplorer } from "@/components/career-possibility/CapabilityExplorer";
import { mockCareerPossibility } from "@/components/career-possibility/mockCareerPossibility";

export default function CareerMapPage() {
  return (
    <main className="min-h-screen bg-[#050912] px-4 pb-5 pt-24 text-[#e8f4f6] sm:px-7 sm:pb-7 sm:pt-28">
      <div className="mx-auto max-w-[1500px]">
        <header className="flex items-center justify-between border-b border-cyan-100/10 pb-5">
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1.5 text-xs text-cyan-200">Example map</span>
          <Link href="/" className="text-sm text-slate-400 transition hover:text-cyan-200">Try another resume</Link>
        </header>
        <section className="py-9 sm:py-12">
          <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Capability Explorer</p><h1 className="mt-3 text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">Explore a capability map</h1><p className="mt-3 text-base text-slate-400 sm:text-lg">Discover how strengths can connect to future opportunities.</p></div><span className="w-fit rounded-full border border-blue-300/15 bg-blue-300/5 px-3 py-1.5 text-xs text-blue-200">Mock data preview</span></div>
          <p className="mt-6 max-w-4xl text-sm leading-6 text-slate-500">{mockCareerPossibility.profileSummary}</p>
          <p className="mt-4 max-w-4xl rounded-xl border border-cyan-100/10 bg-white/[0.025] px-4 py-3 text-xs leading-5 text-slate-500">Frontend prototype — this example is not connected to the CV or resume text selected on the previous page yet.</p>
        </section>
        <CapabilityExplorer result={mockCareerPossibility} />
        <footer className="py-8 text-center text-xs text-slate-600">This is a direction map, not a hiring guarantee.</footer>
      </div>
    </main>
  );
}
