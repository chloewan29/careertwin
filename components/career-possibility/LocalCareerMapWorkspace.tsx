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
export function LocalCareerMapWorkspace({ definitions, definitionVersion, roles, canonicalLibrary, governance }: { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; roles: readonly RoleCapabilityProfile[]; canonicalLibrary: CanonicalCapabilityLibrary; governance: CanonicalCapabilityGovernanceLibrary }) {
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
  if(result.status==="loaded"){const personal=buildPersonalCareerMapPresentation({localState:result.state,canonicalDefinitions:definitions});if(!personal.ok)return <StateNotice title="Saved browser data could not be read" message={personal.issues[0].message} clear={clear}/>;return <section className="py-7"><div className="rounded-2xl border border-teal-300/20 bg-teal-300/[0.05] p-5"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">Imported from reviewed résumé evidence</p><h1 className="mt-2 text-3xl font-semibold">Your Career Map</h1><p className="mt-2 text-sm text-slate-400">Stored only in this browser. Reviewed evidence remains provisional, not externally verified.</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/" className="min-h-11 rounded-lg border border-cyan-300/25 px-4 py-3 text-sm text-cyan-200">Review a different résumé</Link><button type="button" onClick={clear} className="min-h-11 rounded-lg border border-red-300/20 px-4 text-sm text-red-200">Clear imported résumé evidence</button></div><p className="mt-3 text-xs text-slate-500">Applying a different reviewed résumé will replace the evidence in this Career Map.</p></div><PersonalCapabilityExplorer presentation={personal.presentation}/><TargetRoleCapabilityComparison state={result.state} roles={roles} canonicalLibrary={canonicalLibrary} governance={governance} definitionVersion={definitionVersion}/></section>}
  if(result.status==="incompatible_version")return <StateNotice title="Saved Career Map needs review" message="Your saved Career Map was created with an older capability definition version. Review the résumé mappings again before applying them." clear={clear}/>; if(result.status==="invalid")return <StateNotice title="Saved browser data could not be read" message={result.message} clear={clear}/>;if(result.status==="storage_unavailable")return <StateNotice title="Browser storage is unavailable" message={result.message}/>;
  return <section className="mx-auto my-16 max-w-2xl rounded-2xl border border-cyan-100/10 bg-white/[0.025] p-6 text-center sm:my-24 sm:p-9"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">Career Map</p><h1 className="mt-3 text-2xl font-semibold sm:text-3xl">No personal Career Map has been created yet.</h1><p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400">Start with your résumé, review the evidence, and apply it before viewing your personal Career Map.</p><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Start with your résumé</Link></section>;
}
function StateNotice({title,message,clear}:{title:string;message:string;clear?:()=>void}){return <section className="my-8 rounded-2xl border border-amber-300/20 bg-amber-300/[0.05] p-5"><h1 className="text-xl font-semibold text-amber-100">{title}</h1><p className="mt-2 text-sm text-amber-100/70">{message}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/" className="min-h-11 rounded-lg border border-cyan-300/25 px-4 py-3 text-sm text-cyan-200">Review résumé again</Link>{clear&&<button type="button" onClick={clear} className="min-h-11 rounded-lg border border-red-300/20 px-4 text-sm text-red-200">Clear saved Career Map</button>}</div></section>}
