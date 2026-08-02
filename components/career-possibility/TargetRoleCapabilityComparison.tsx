"use client";

import { useState } from "react";
import type { LocalCareerMapState } from "@/lib/career-possibility/local-career-map-state";
import type { CanonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import type { CanonicalCapabilityGovernanceLibrary } from "@/lib/career-possibility/canonical-capability-governance-decisions";
import type { RoleCapabilityProfile } from "@/lib/career-possibility/role-capability-library";
import { buildPersonalTargetRoleComparison } from "@/lib/career-possibility/personal-target-role-comparison";
import { buildProofBuildingAction } from "@/lib/career-possibility/proof-building-action";

export function TargetRoleCapabilityComparison({ state, roles, canonicalLibrary, governance, definitionVersion }: { state: LocalCareerMapState; roles: readonly RoleCapabilityProfile[]; canonicalLibrary: CanonicalCapabilityLibrary; governance: CanonicalCapabilityGovernanceLibrary; definitionVersion: string }) {
  const [selected, setSelected] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const ordered = roles;
  const role = ordered.find((item) => item.roleFamilyId === selected);
  const result = role ? buildPersonalTargetRoleComparison({ localCareerMapState: state, targetRoleProfile: role, canonicalCapabilityLibrary: canonicalLibrary, governanceDecisions: governance, definitionVersion }) : null;
  const proofAction = buildProofBuildingAction(result?.ok ? result.comparison.nextProofToBuild : undefined);

  return <section className="mt-6 rounded-[2rem] border border-violet-300/15 bg-[#0b0c1b] p-4 sm:p-6" aria-labelledby="target-role-heading">
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Personal Role Lens</p>
    <h2 id="target-role-heading" className="mt-2 text-2xl font-semibold">Compare with a target role</h2>
    <p className="mt-2 text-sm text-slate-400">Requirement-by-requirement evidence comparison only. No fit score or suitability verdict.</p>
    <p className="mt-2 text-sm text-slate-400">Explore the calibrated generic role lenses currently available. These directional archetypes are not an exhaustive list of careers.</p>
    <label htmlFor="target-role" className="mt-5 block text-sm font-medium">Choose a target role</label>
    <select id="target-role" value={selected} onChange={(event) => { setSelected(event.target.value); setExpanded(null); }} className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-[#101827] px-3">
      <option value="">Choose a target role</option>
      {ordered.map((item) => <option key={item.roleFamilyId} value={item.roleFamilyId}>{item.canonicalTitle} · {item.domain}</option>)}
    </select>
    {result && !result.ok && <p role="alert" className="mt-4 text-red-200">{result.issues[0].message}</p>}
    {result?.ok && role && <>
      <div className="mt-5 rounded-2xl border border-violet-200/15 bg-violet-200/[0.04] p-4 sm:p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">About this role lens</p>
        <h3 className="mt-2 text-xl font-semibold">{role.canonicalTitle}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-300">{role.description}</p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs"><Pill n={result.comparison.summary.directly_demonstrated} t="directly demonstrated"/><Pill n={result.comparison.summary.transferable_signal} t="transferable"/><Pill n={result.comparison.summary.evidence_not_yet_shown} t="evidence not yet shown"/><Pill n={result.comparison.summary.governance_deferred + result.comparison.summary.governance_excluded} t="taxonomy limitations"/></div>
      {result.comparison.nextProofToBuild && <aside className="mt-5 rounded-2xl border border-amber-200/20 bg-amber-200/[0.05] p-4 sm:p-5" aria-labelledby="next-proof-heading">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-200">Start here</p>
        <h3 id="next-proof-heading" className="mt-2 text-lg font-semibold">{result.comparison.nextProofToBuild.capabilityLabel}</h3>
        <p className="mt-1 text-sm text-slate-400">{result.comparison.nextProofToBuild.reason} This is the first evidence gap to investigate, not a suitability or readiness verdict.</p>
        <div className="mt-3 border-t border-amber-100/10 pt-3"><p className="text-xs font-semibold text-amber-100">Proof to build</p><p className="mt-1 text-sm leading-6 text-slate-300">{result.comparison.nextProofToBuild.expectedEvidence}</p></div>
        {proofAction.status === "available" && <section className="mt-4 rounded-xl border border-cyan-200/15 bg-cyan-200/[0.04] p-3" aria-labelledby="proof-action-heading"><h4 id="proof-action-heading" className="text-sm font-semibold text-cyan-100">{proofAction.copy.heading}</h4><p className="mt-2 text-sm leading-6 text-slate-300">{proofAction.copy.instruction}</p><p className="mt-1 text-xs leading-5 text-slate-400">{proofAction.copy.uncertainty}</p><a href="#personal-explorer-heading" className="mt-3 inline-block rounded text-sm font-medium text-cyan-200 underline decoration-cyan-300/40 underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200">Review evidence already in your Career Map</a></section>}
      </aside>}
      <div className="mt-5 grid gap-3">{result.comparison.requirements.map((requirement) => {
        const open = expanded === requirement.capabilityId;
        return <article key={requirement.capabilityId} className="rounded-xl border border-white/10 p-4">
          <p className="text-[10px] uppercase tracking-wider text-violet-300">{requirement.importance} · {requirement.outcome.replaceAll("_", " ")}</p>
          <h3 className="mt-1 font-semibold">{requirement.canonicalLabel ?? requirement.roleLabel}</h3>
          <p className="mt-1 text-xs text-slate-500">Role wording: {requirement.roleLabel}{requirement.family ? ` · ${requirement.family}` : ""}</p>
          {requirement.outcome === "evidence_not_yet_shown" && <p className="mt-2 text-sm text-amber-100">Your current reviewed Career Map does not yet show evidence for this requirement.</p>}
          {requirement.expectedEvidence && <div className="mt-3 rounded-lg border border-amber-200/15 bg-amber-200/[0.04] p-3"><p className="text-xs font-semibold text-amber-100">Proof to build</p><p className="mt-1 text-sm leading-6 text-slate-300">{requirement.expectedEvidence}</p></div>}
          {requirement.governanceReason && <p className="mt-2 text-sm text-amber-100">Taxonomy limitation: {requirement.governanceReason.replaceAll("_", " ")}.</p>}
          {requirement.evidence.length > 0 && <><button type="button" aria-expanded={open} aria-controls={`role-evidence-${requirement.capabilityId}`} onClick={() => setExpanded((current) => current === requirement.capabilityId ? null : requirement.capabilityId)} className="mt-3 min-h-11 rounded-lg border border-cyan-300/20 px-3 text-sm text-cyan-200">{open ? "Hide" : "Show"} reviewed evidence</button>{open && <ul id={`role-evidence-${requirement.capabilityId}`} className="mt-3 grid gap-2">{requirement.evidence.map((evidence) => <li key={evidence.mappingId} className="rounded-lg bg-white/[0.03] p-3 text-sm text-slate-300">{evidence.text}<span className="mt-1 block text-xs text-slate-500">{evidence.relationship.replaceAll("_", " ")}</span></li>)}</ul>}</>}
        </article>;
      })}</div>
    </>}
  </section>;
}

function Pill({ n, t }: { n: number; t: string }) { return <span className="rounded-full border border-white/10 px-3 py-2">{n} {t}</span>; }
