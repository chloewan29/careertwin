"use client";

import { useState } from "react";
import type { CareerCapabilityExplorerResult } from "./mockCareerPossibility";

const positions = [
  { left: "50%", top: "10%" },
  { left: "82%", top: "31%" },
  { left: "82%", top: "68%" },
  { left: "50%", top: "88%" },
  { left: "18%", top: "68%" },
  { left: "18%", top: "31%" },
];

export function CapabilityExplorer({ result }: { result: CareerCapabilityExplorerResult }) {
  const [selectedCapabilityId, setSelectedCapabilityId] = useState(result.defaultCapabilityId);
  const selected = result.capabilities.find((capability) => capability.id === selectedCapabilityId) ?? result.capabilities[0];
  const selectedExperiences = result.experiences.filter((experience) => experience.capabilityIds.includes(selected.id));

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-3xl border border-cyan-100/10 bg-[#0a1321]/80 p-4 shadow-[0_30px_100px_rgba(6,182,212,0.07)] backdrop-blur sm:p-6" aria-labelledby="graph-heading">
        <div className="flex items-start justify-between gap-4">
          <div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Capability network</p><h2 id="graph-heading" className="mt-2 text-xl font-semibold">Select a strength to explore</h2></div>
          <span className="rounded-full border border-cyan-300/20 bg-cyan-300/5 px-3 py-1 text-xs text-cyan-200">{selected.strength}% signal</span>
        </div>

        <div className="mt-5 md:hidden">
          <div className="flex flex-wrap gap-2">{result.capabilities.map((capability) => <button key={capability.id} type="button" onClick={() => setSelectedCapabilityId(capability.id)} className={`rounded-full border px-3 py-2 text-xs transition ${capability.id === selected.id ? "border-cyan-300 bg-cyan-300 text-[#061018]" : "border-white/10 bg-white/[0.03] text-slate-300"}`}>{capability.label}</button>)}</div>
          <div className="mt-5 rounded-2xl border border-cyan-300/30 bg-cyan-300/[0.07] p-5"><p className="text-xs uppercase tracking-widest text-cyan-300">Selected capability</p><h3 className="mt-2 text-xl font-semibold">{selected.label}</h3><p className="mt-2 text-sm text-slate-400">{selectedExperiences.length} experiences support this capability</p><div className="mt-4 flex flex-wrap gap-2">{selected.subCapabilities.map((sub) => <span key={sub.id} className="rounded-full bg-blue-400/10 px-3 py-1.5 text-xs text-blue-200">{sub.label}</span>)}</div></div>
        </div>

        <div className="relative mt-4 hidden h-[590px] overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.08),transparent_45%)] md:block">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <defs><linearGradient id="flow" x1="0" x2="1"><stop offset="0" stopColor="#22d3ee" stopOpacity=".15" /><stop offset=".5" stopColor="#60a5fa" stopOpacity=".65" /><stop offset="1" stopColor="#22d3ee" stopOpacity=".15" /></linearGradient></defs>
            {positions.map((position, index) => <line key={result.capabilities[index].id} x1="50%" y1="50%" x2={position.left} y2={position.top} stroke="url(#flow)" strokeWidth={result.capabilities[index].id === selected.id ? 2.5 : 1} className="transition-all duration-300" />)}
          </svg>
          <div className="absolute left-1/2 top-1/2 z-10 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-cyan-200/40 bg-[#0c1d2a] text-center shadow-[0_0_45px_rgba(34,211,238,0.18)]"><span className="text-xs uppercase tracking-widest text-cyan-300">You</span><span className="mt-1 text-sm font-semibold">Your Profile</span></div>
          {result.capabilities.map((capability, index) => {
            const isSelected = capability.id === selected.id;
            return <button key={capability.id} type="button" onClick={() => setSelectedCapabilityId(capability.id)} style={positions[index]} className={`absolute z-20 w-40 -translate-x-1/2 -translate-y-1/2 rounded-2xl border px-3 py-3 text-left transition-all duration-300 ${isSelected ? "scale-105 border-cyan-200 bg-[#102b37] text-white shadow-[0_0_36px_rgba(34,211,238,0.35)]" : "border-white/10 bg-[#0d1725]/95 text-slate-300 opacity-65 hover:border-cyan-300/30 hover:opacity-100"}`} aria-pressed={isSelected}><span className="block text-xs font-semibold leading-4">{capability.label}</span><span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-cyan-300" style={{ width: `${capability.strength}%` }} /></span></button>;
          })}
          <div className="absolute bottom-4 left-1/2 z-30 w-[min(92%,590px)] -translate-x-1/2 rounded-2xl border border-cyan-300/20 bg-[#07111e]/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">{selected.label} expanded</p><p className="mt-1 text-sm text-slate-300">{selectedExperiences.length} experiences support this capability</p></div><span className="h-2 w-2 rounded-full bg-cyan-300 shadow-[0_0_12px_#22d3ee]" /></div>
            <div className="mt-3 flex flex-wrap gap-2">{selected.subCapabilities.map((sub) => <span key={sub.id} className="rounded-full border border-blue-300/15 bg-blue-400/10 px-3 py-1.5 text-xs text-blue-100">{sub.label}</span>)}</div>
          </div>
        </div>
      </section>

      <aside className="rounded-3xl border border-cyan-100/10 bg-[#0a1321]/80 p-5 backdrop-blur sm:p-6" aria-labelledby="roles-heading">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-300">Future directions</p><h2 id="roles-heading" className="mt-2 text-xl font-semibold">Adjacent Roles</h2><p className="mt-2 text-sm text-slate-500">Updated for {selected.label}</p>
        <div className="mt-5 space-y-3">{result.adjacentRoles.map((role) => {
          const related = role.capabilityIds.includes(selected.id);
          return <article key={role.id} className={`rounded-2xl border p-4 transition-all duration-300 ${related ? "border-cyan-300/30 bg-cyan-300/[0.07] shadow-[0_0_25px_rgba(34,211,238,0.08)]" : "border-white/[0.07] bg-white/[0.025] opacity-50"}`}><div className="flex items-start justify-between gap-3"><div><span className={`text-[10px] font-semibold uppercase tracking-wider ${related ? "text-cyan-300" : "text-slate-500"}`}>{role.category}</span><h3 className="mt-1 text-sm font-semibold text-slate-100">{role.roleFamily}</h3></div><span className="text-xl font-semibold text-cyan-200">{role.fitScore}</span></div><p className="mt-3 text-xs leading-5 text-slate-400">{role.explanation}</p></article>;
        })}</div>
      </aside>

      <section className="rounded-3xl border border-cyan-100/10 bg-[#0a1321]/80 p-5 backdrop-blur sm:p-6 xl:col-span-2" aria-labelledby="evidence-heading">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">Evidence layer</p><h2 id="evidence-heading" className="mt-2 text-xl font-semibold">Supporting Experiences</h2></div><p className="text-sm text-slate-500">Showing evidence for <span className="text-cyan-200">{selected.label}</span></p></div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">{selectedExperiences.map((experience) => <article key={experience.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition hover:border-cyan-300/20"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-slate-100">{experience.company}</h3><p className="mt-1 text-xs text-slate-500">{experience.role}</p></div><span className="rounded-full bg-cyan-300/10 px-2.5 py-1 text-[10px] font-semibold uppercase text-cyan-200">{experience.relevance === "high" ? "High relevance" : `${experience.relevance} evidence`}</span></div><p className="mt-5 text-sm leading-6 text-slate-300">{experience.evidenceText}</p></article>)}</div>
      </section>
    </div>
  );
}
