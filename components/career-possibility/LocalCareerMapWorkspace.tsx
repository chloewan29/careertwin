"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CareerMapCapabilityDefinition } from "@/lib/career-possibility/reviewed-resume-evidence-map-adapter";
import { clearLocalCareerMapState, readLocalCareerMapState, type LocalCareerMapReadResult } from "@/lib/career-possibility/local-career-map-storage";
import { buildPersonalCareerMapPresentation } from "@/lib/career-possibility/local-career-map-presentation-adapter";
import { PersonalCapabilityExplorer } from "./PersonalCapabilityExplorer";
import { TargetRoleCapabilityComparison } from "./TargetRoleCapabilityComparison";
import type { RoleCapabilityProfile } from "@/lib/career-possibility/role-capability-library";
import type { CanonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import type { CanonicalCapabilityGovernanceLibrary } from "@/lib/career-possibility/canonical-capability-governance-decisions";
export function LocalCareerMapWorkspace({ definitions, definitionVersion, fallback, roles, canonicalLibrary, governance }: { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; fallback: React.ReactNode; roles: readonly RoleCapabilityProfile[]; canonicalLibrary: CanonicalCapabilityLibrary; governance: CanonicalCapabilityGovernanceLibrary }) {
  const [result,setResult]=useState<LocalCareerMapReadResult|null>(null);
  const refresh = useCallback(() => setResult(readLocalCareerMapState(definitions, definitionVersion)), [definitions, definitionVersion]);
  useEffect(() => {
    const id = window.setTimeout(refresh, 0);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);
  function clear(){if(!window.confirm("Clear imported résumé evidence stored in this browser?"))return;const cleared=clearLocalCareerMapState();if(cleared.ok)setResult({status:"absent"})}
  if(!result)return <div className="py-16 text-center text-sm text-slate-500">Loading browser-local Career Map…</div>;
  if(result.status==="loaded"){const personal=buildPersonalCareerMapPresentation({localState:result.state,canonicalDefinitions:definitions});if(!personal.ok)return <StateNotice title="Saved browser data could not be read" message={personal.issues[0].message} clear={clear}/>;return <section className="py-7"><div className="rounded-2xl border border-teal-300/20 bg-teal-300/[0.05] p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Imported from reviewed résumé evidence</p><h1 className="mt-2 text-3xl font-semibold">Your Career Map</h1><p className="mt-2 text-sm text-slate-400">Stored only in this browser. Reviewed evidence remains provisional, not externally verified.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/career-map/resume-intake" className="min-h-11 rounded-lg border border-cyan-300/25 px-4 py-3 text-sm text-cyan-200">Review a different résumé</Link><button type="button" onClick={clear} className="min-h-11 rounded-lg border border-red-300/20 px-4 text-sm text-red-200">Clear imported résumé evidence</button></div><p className="mt-3 text-xs text-slate-500">Applying a different reviewed résumé will replace the evidence in this Career Map.</p></div><PersonalCapabilityExplorer presentation={personal.presentation}/><TargetRoleCapabilityComparison state={result.state} roles={roles} canonicalLibrary={canonicalLibrary} governance={governance} definitionVersion={definitionVersion}/></section>}
  if(result.status==="incompatible_version")return <StateNotice title="Saved Career Map needs review" message="Your saved Career Map was created with an older capability definition version. Review the résumé mappings again before applying them." clear={clear}/>; if(result.status==="invalid")return <StateNotice title="Saved browser data could not be read" message={result.message} clear={clear}/>;if(result.status==="storage_unavailable")return <StateNotice title="Browser storage is unavailable" message={result.message}/>;
  return <><section className="py-10 sm:py-14"><p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-300">Career Map</p><h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">Your career, replicated.</h1><p className="mt-5 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">CareerTwin turns your experience into a living map of your capabilities, the evidence behind them, and the career directions they can support.</p><Link href="/career-map/resume-intake" className="mt-7 inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Uncover your career map</Link></section><section aria-labelledby="example-career-map-heading" className="rounded-xl border border-cyan-100/10 bg-white/[0.025] p-4 text-sm text-slate-400"><div className="flex flex-wrap items-center justify-between gap-2"><h2 id="example-career-map-heading" className="font-semibold text-slate-200">Example Career Map</h2><span className="rounded-full border border-blue-300/15 px-3 py-1 text-xs text-blue-200">Mock data preview</span></div><p className="mt-2">No résumé evidence has been applied to this browser. This example is not personal evidence or a recommendation.</p></section>{fallback}</>;
}
function StateNotice({title,message,clear}:{title:string;message:string;clear?:()=>void}){return <section className="my-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5"><h1 className="text-xl font-semibold text-amber-100">{title}</h1><p className="mt-2 text-sm text-amber-100/70">{message}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/career-map/resume-intake" className="min-h-11 rounded-lg border border-cyan-300/25 px-4 py-3 text-sm text-cyan-200">Review résumé again</Link>{clear&&<button type="button" onClick={clear} className="min-h-11 rounded-lg border border-red-300/20 px-4 text-sm text-red-200">Clear saved Career Map</button>}</div></section>}
