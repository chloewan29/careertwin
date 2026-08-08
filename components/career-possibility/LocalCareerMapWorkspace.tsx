"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { CareerMapCapabilityDefinition } from "@/lib/career-possibility/reviewed-resume-evidence-map-adapter";
import { clearLocalCareerMapState, readLocalCareerMapState, type LocalCareerMapReadResult } from "@/lib/career-possibility/local-career-map-storage";
import { buildPersonalCareerMapPresentation } from "@/lib/career-possibility/local-career-map-presentation-adapter";
import { PersonalCapabilityExplorer } from "./PersonalCapabilityExplorer";
import { TargetRoleCapabilityComparison } from "./TargetRoleCapabilityComparison";
import type { RoleCapabilityProfile } from "@/lib/career-possibility/role-capability-library";
import type { CanonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import type { CanonicalCapabilityGovernanceLibrary } from "@/lib/career-possibility/canonical-capability-governance-decisions";
import { buildPersonalTargetRoleComparison } from "@/lib/career-possibility/personal-target-role-comparison";
import { buildCareerMapGraphProjection } from "@/lib/career-possibility/career-map-graph-projection";
import { canonicalCapabilityFamilyLibrary } from "@/lib/career-possibility/canonical-capability-family-library";
import { CareerMapNeuralGraph } from "./CareerMapNeuralGraph";

export function LocalCareerMapWorkspace({ definitions, definitionVersion, roles, canonicalLibrary, governance }: { definitions: readonly CareerMapCapabilityDefinition[]; definitionVersion: string; roles: readonly RoleCapabilityProfile[]; canonicalLibrary: CanonicalCapabilityLibrary; governance: CanonicalCapabilityGovernanceLibrary }) {
  const [result, setResult] = useState<LocalCareerMapReadResult | null>(null); const [activeView, setActiveView] = useState<"map" | "graph" | "role-lens">("map"); const refresh = useCallback(() => setResult(readLocalCareerMapState(definitions, definitionVersion)), [definitions, definitionVersion]);
  useEffect(() => { const id = window.setTimeout(refresh, 0); const visible = () => { if (document.visibilityState === "visible") refresh(); }; window.addEventListener("focus", refresh); window.addEventListener("pageshow", refresh); window.addEventListener("storage", refresh); document.addEventListener("visibilitychange", visible); return () => { window.clearTimeout(id); window.removeEventListener("focus", refresh); window.removeEventListener("pageshow", refresh); window.removeEventListener("storage", refresh); document.removeEventListener("visibilitychange", visible); }; }, [refresh]);
  function clear() { if (!window.confirm("Clear the Career Map stored in this browser?")) return; if (clearLocalCareerMapState().ok) setResult({ status: "absent" }); }
  function selectView(view: "map" | "graph" | "role-lens", focusId?: string) { setActiveView(view); if (focusId) document.getElementById(focusId)?.focus(); }
  if (!result) return <div className="py-16 text-center text-sm text-cyan-50/45">Loading browser-local Career Map…</div>;
  if (result.status === "loaded") {
    const personal = buildPersonalCareerMapPresentation({ localState: result.state, canonicalDefinitions: definitions });
    if (!personal.ok) return <StateNotice title="Saved browser data could not be read" message={personal.issues[0].message} clear={clear} />;
    const provisional = result.state.schemaVersion === "2.0.0";
    // --- Neural graph projection (additive, no second storage read) ---
    // Use the stable representative analytics-manager role profile.
    // roles prop is already RoleCapabilityProfile[] — no conversion needed.
    const graphRoleProfile = roles.find((r) => r.roleFamilyId === "analytics-manager") ?? null;
    const graphComparison = graphRoleProfile
      ? buildPersonalTargetRoleComparison({
          localCareerMapState: result.state,
          targetRoleProfile: graphRoleProfile,
          canonicalCapabilityLibrary: canonicalLibrary,
          governanceDecisions: governance,
          definitionVersion,
        })
      : null;
    const graphProjection = buildCareerMapGraphProjection({
      presentation: personal.presentation,
      familyLibrary: canonicalCapabilityFamilyLibrary,
      ...(graphComparison?.ok
        ? { role: { roleProfile: graphRoleProfile!, comparison: graphComparison.comparison } }
        : {}),
    });
    return <section className="py-6 sm:py-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">Your Career Map</h1>
          <p className="mt-2 text-sm text-cyan-50/55">{provisional ? "Based on your CV · Not reviewed yet" : "Based on your reviewed CV evidence"}</p>
        </div>
        <details className="relative text-sm">
          <summary className="flex min-h-11 cursor-pointer list-none items-center rounded-lg px-3 text-slate-400 transition hover:bg-white/[0.04] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Map options</summary>
          <div className="absolute right-0 z-20 mt-2 grid min-w-48 gap-1 rounded-xl border border-white/10 bg-[#101827] p-2 shadow-[0_16px_40px_rgba(0,0,0,0.4)]">
            <Link href="/" className="flex min-h-11 items-center rounded-lg px-3 text-cyan-100 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Upload another CV</Link>
            <button type="button" onClick={clear} className="min-h-11 rounded-lg px-3 text-left text-red-200 hover:bg-red-300/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200">Clear Career Map</button>
          </div>
        </details>
      </div>
      <div className="mt-5 flex gap-1 border-b border-white/[0.08]" role="tablist" aria-label="Career Map views">
        <ViewTab id="career-map-tab" controls="career-map-panel" active={activeView === "map"} onClick={() => selectView("map")} onNext={() => selectView("graph", "career-map-graph-tab")}>Career Map</ViewTab>
        <ViewTab id="career-map-graph-tab" controls="career-map-graph-panel" active={activeView === "graph"} onClick={() => selectView("graph")} onPrevious={() => selectView("map", "career-map-tab")} onNext={() => selectView("role-lens", "role-lens-tab")}>Neural Graph</ViewTab>
        <ViewTab id="role-lens-tab" controls="role-lens-panel" active={activeView === "role-lens"} onClick={() => selectView("role-lens")} onPrevious={() => selectView("graph", "career-map-graph-tab")}>Role Lens</ViewTab>
      </div>
      <div id="career-map-panel" role="tabpanel" aria-labelledby="career-map-tab" hidden={activeView !== "map"}>
        <PersonalCapabilityExplorer presentation={personal.presentation} />
      </div>
      <div id="career-map-graph-panel" role="tabpanel" aria-labelledby="career-map-graph-tab" hidden={activeView !== "graph"}>
        {activeView === "graph" && <CareerMapNeuralGraph projection={graphProjection} />}
      </div>
      <div id="role-lens-panel" role="tabpanel" aria-labelledby="role-lens-tab" hidden={activeView !== "role-lens"}>
        {activeView === "role-lens" && <TargetRoleCapabilityComparison state={result.state} roles={roles} canonicalLibrary={canonicalLibrary} governance={governance} definitionVersion={definitionVersion} />}
      </div>
    </section>;
  }
  if (result.status === "incompatible_version") return <StateNotice title="Saved Career Map needs review" message="Your saved Career Map uses an older capability definition version." clear={clear} />;
  if (result.status === "invalid") return <StateNotice title="Saved browser data could not be read" message={result.message} clear={clear} />;
  if (result.status === "storage_unavailable") return <StateNotice title="Browser storage is unavailable" message={result.message} />;
  return <section className="mx-auto my-16 max-w-xl py-10 text-center sm:my-24"><h1 className="text-2xl font-semibold sm:text-3xl">No personal Career Map has been created yet.</h1><Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">Start with your résumé</Link></section>;
}
function ViewTab({ id, controls, active, onClick, onNext, onPrevious, children }: { id: string; controls: string; active: boolean; onClick: () => void; onNext?: () => void; onPrevious?: () => void; children: ReactNode }) { return <button id={id} type="button" role="tab" aria-selected={active} aria-controls={controls} tabIndex={active ? 0 : -1} onClick={onClick} onKeyDown={(event) => { if ((event.key === "ArrowRight" || event.key === "End") && onNext) { event.preventDefault(); onNext(); } if ((event.key === "ArrowLeft" || event.key === "Home") && onPrevious) { event.preventDefault(); onPrevious(); } }} className={`min-h-11 border-b-2 px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-cyan-200 ${active ? "border-cyan-300 text-cyan-100" : "border-transparent text-slate-400 hover:text-slate-200"}`}>{children}</button>; }
function StateNotice({ title, message, clear }: { title: string; message: string; clear?: () => void }) { return <section className="my-8 rounded-2xl bg-amber-300/[0.06] p-5"><h1 className="text-xl font-semibold text-amber-100">{title}</h1><p className="mt-2 text-sm text-amber-100/70">{message}</p><div className="mt-4 flex flex-wrap gap-2"><Link href="/" className="min-h-11 rounded-lg border border-cyan-300/25 px-4 py-3 text-sm text-cyan-200">Upload your CV</Link>{clear && <button type="button" onClick={clear} className="min-h-11 rounded-lg border border-red-300/20 px-4 text-sm text-red-200">Clear saved Career Map</button>}</div></section>; }
