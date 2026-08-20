"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CareerMapCapabilityDefinition } from "@/lib/career-possibility/reviewed-resume-evidence-map-adapter";
import { clearLocalCareerMapState, readLocalCareerMapState, type LocalCareerMapReadResult } from "@/lib/career-possibility/local-career-map-storage";
import { buildEscoCareerMapPresentation } from "@/lib/career-possibility/esco-career-map-presentation-adapter";
import { canonicalCapabilityFamilyLibrary } from "@/lib/career-possibility/canonical-capability-family-library";
import { CareerMapNeuralGraph } from "./CareerMapNeuralGraph";
import { buildPersonalCareerMapPresentation } from "@/lib/career-possibility/local-career-map-presentation-adapter";
import { buildPersonalGenericRoleAlignment } from "@/lib/career-possibility/personal-generic-role-alignment-adapter";
import { buildCareerMapGraphProjection } from "@/lib/career-possibility/career-map-graph-projection";

export function LocalCareerMapWorkspace({ definitions, definitionVersion }: { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string }) {
  const [result, setResult] = useState<LocalCareerMapReadResult | null>(null); const refresh = useCallback(() => setResult(readLocalCareerMapState(definitions, definitionVersion)), [definitions, definitionVersion]);
  useEffect(() => { const id = window.setTimeout(refresh, 0); const visible = () => { if (document.visibilityState === "visible") refresh(); }; window.addEventListener("focus", refresh); window.addEventListener("pageshow", refresh); window.addEventListener("storage", refresh); document.addEventListener("visibilitychange", visible); return () => { window.clearTimeout(id); window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh); window.removeEventListener("storage", refresh); document.removeEventListener("visibilitychange", visible); }; }, [refresh]);
  function clear() { if (!window.confirm("Clear the Career Map stored in this browser?")) return; if (clearLocalCareerMapState().ok) setResult({ status: "absent" }); }
  if (!result) return <div className="py-16 text-center text-sm text-cyan-50/45">Loading browser-local Career Map…</div>;
  if (result.status === "loaded") {
    let graphProjection;
    let provisional = false;

    if (result.state.schemaVersion === "esco/1.0.0") {
      graphProjection = buildEscoCareerMapPresentation(result.state);
      provisional = true;
    } else {
      provisional = result.state.schemaVersion === "2.0.0";
      const personal = buildPersonalCareerMapPresentation({ localState: result.state, canonicalDefinitions: definitions });
      if (!personal.ok) return <StateNotice title="Saved browser data could not be read" message={personal.issues[0].message} clear={clear} />;
      
      const graphAlignment =
        result.state.schemaVersion === "2.0.0" && result.state.mappings.length > 0
          ? buildPersonalGenericRoleAlignment({ personalState: result.state })
          : null;
      graphProjection = buildCareerMapGraphProjection({
        presentation: personal.presentation,
        familyLibrary: canonicalCapabilityFamilyLibrary,
        ...(graphAlignment?.ok ? { rankedRoleAlignment: { ...graphAlignment.result.alignment, roles: graphAlignment.result.recommendedRoles } } : {}),
      });
    }

    return <section className="flex min-h-[calc(100dvh-5.25rem)] flex-col py-2">
      <div className="flex min-h-11 items-center justify-between gap-3 px-1 pb-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h1 className="text-lg font-semibold tracking-[-0.025em] text-cyan-50 sm:text-xl">Career Map</h1>
          <p className="truncate text-xs text-cyan-50/55 sm:text-sm">{provisional ? "Based on your CV · Not reviewed yet" : "Based on your reviewed CV evidence"}</p>
        </div>
        <details className="relative text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-slate-400 transition hover:bg-white/[0.04] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Map options</summary>
          <div className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-white/10 bg-[#101827] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <Link href="/" className="flex min-h-11 items-center rounded-lg px-3 text-cyan-100 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Upload another CV</Link>
            <button type="button" onClick={clear} className="min-h-11 rounded-lg px-3 text-left text-red-200 hover:bg-red-300/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200">Clear Career Map</button>
          </div>
        </details>
      </div>
      <div className="min-h-0 flex-1">
        <CareerMapNeuralGraph projection={graphProjection} />
      </div>
    </section>;
  }
  if (result.status === "incompatible_version") return <StateNotice title="Saved Career Map needs review" message="Your saved Career Map uses an older capability definition version." clear={clear} />;
  if (result.status === "invalid") return <StateNotice title="Saved browser data could not be read" message={result.message} clear={clear} />;
  if (result.status === "storage_unavailable") return <StateNotice title="Browser storage is unavailable" message={result.message} />;
  return <section className="mx-auto my-16 max-w-xl py-10 text-center sm:my-24"><h1 className="text-2xl font-semibold sm:text-3xl">No personal Career Map has been created yet.</h1><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Start with your résumé</Link></section>;
}

function StateNotice({ title, message, clear }: { title: string; message: string; clear?: () => void }) { return <section className="my-8 rounded-2xl bg-amber-300/[0.06] p-5"><h1 className="text-xl font-semibold text-amber-100">{title}</h1><p className="mt-2 text-sm text-amber-100/70">{message}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/" className="min-h-11 rounded-lg border border-cyan-300/25 px-4 py-3 text-sm text-cyan-200">Upload your CV</Link>{clear && <button type="button" onClick={clear} className="min-h-11 rounded-lg border border-red-300/20 px-4 text-sm text-red-200">Clear saved Career Map</button>}</div></section>; }
