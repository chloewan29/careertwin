"use client";
import { useMemo, useState } from "react";
import type { CanonicalCapabilityLibrary } from "@/lib/career-possibility/canonical-capability-library";
import { CUSTOM_TARGET_ROLE_SCHEMA_VERSION, createCustomTargetRole, findUniqueSourceSpan, type CustomTargetRole, type CustomTargetRoleRequirement } from "@/lib/career-possibility/custom-target-role-contract";
import type { CapabilityImportance } from "@/lib/career-possibility/role-capability-library";

type RequirementDraft = { capabilityId: string; importance: "" | CapabilityImportance; passage: string };
const emptyRequirement: RequirementDraft = { capabilityId: "", importance: "", passage: "" };

export function CustomTargetRoleBuilder({ canonicalLibrary, appliedRole, onApply, onDiscard, onClose }: { canonicalLibrary: CanonicalCapabilityLibrary; appliedRole: CustomTargetRole | null; onApply: (role: CustomTargetRole) => void; onDiscard: () => void; onClose: () => void }) {
  const [title, setTitle] = useState(appliedRole?.title ?? "");
  const [jobDescription, setJobDescription] = useState("");
  const [requirements, setRequirements] = useState<readonly CustomTargetRoleRequirement[]>(appliedRole?.requirements ?? []);
  const [draft, setDraft] = useState<RequirementDraft>(emptyRequirement);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const definitions = useMemo(() => canonicalLibrary.capabilities.filter((item) => !search.trim() || `${item.label} ${item.family}`.toLocaleLowerCase("en").includes(search.trim().toLocaleLowerCase("en"))), [canonicalLibrary, search]);
  const chosen = canonicalLibrary.capabilities.find((item) => item.id === draft.capabilityId);

  function addRequirement() {
    if (!chosen || !draft.importance) return setError("Choose a canonical capability and importance.");
    const span = findUniqueSourceSpan(jobDescription, draft.passage);
    if (!span.ok) return setError(span.code === "ambiguous_source_text" ? "This passage occurs more than once. Add enough surrounding text to make it unique." : span.code === "source_not_found" ? "The reviewed passage must exactly occur in the pasted job description." : "Enter a reviewed source passage.");
    if (requirements.some((item) => item.capabilityId === chosen.id)) return setError("This capability already has a reviewed requirement. Remove or edit it before adding another passage.");
    const requirementId = `requirement-${requirements.length + 1}-${chosen.id}`;
    setRequirements((current) => [...current, Object.freeze({ requirementId, capabilityId: chosen.id, capabilityLabel: chosen.label, family: chosen.family, importance: draft.importance as CapabilityImportance, sourceText: draft.passage, sourceStart: span.start, sourceEnd: span.end })]);
    setDraft(emptyRequirement); setError("");
  }

  function apply() {
    const result = createCustomTargetRole({ draft: { schemaVersion: CUSTOM_TARGET_ROLE_SCHEMA_VERSION, roleId: `custom-role-${crypto.randomUUID().toLowerCase()}`, title, requirements }, jobDescription, canonicalLibrary });
    if (!result.ok) return setError(result.issues[0].message);
    onApply(result.role); setError("");
  }

  return <section className="mt-5 rounded-2xl border border-violet-300/20 bg-violet-300/[0.035] p-4 sm:p-5" aria-labelledby="custom-role-builder-heading">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 id="custom-role-builder-heading" className="text-lg font-semibold">Build from a job description</h3><p className="mt-1 text-xs leading-5 text-slate-400">Your pasted job description stays in this browser session. Only reviewed requirement passages are used in the comparison.</p></div><button type="button" onClick={onClose} className="min-h-11 rounded-lg border border-white/10 px-3 text-sm">Close builder</button></div>
    <label htmlFor="custom-role-title" className="mt-5 block text-sm font-medium">Target role title</label><input id="custom-role-title" value={title} onChange={(event) => { setTitle(event.target.value); setError(""); }} className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3" />
    <label htmlFor="job-description" className="mt-4 block text-sm font-medium">Pasted job description</label><textarea id="job-description" value={jobDescription} onChange={(event) => { setJobDescription(event.target.value); setError(""); }} className="mt-2 min-h-40 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm" />
    <div className="mt-5 rounded-xl border border-white/[0.08] p-4"><h4 className="font-semibold">Add reviewed requirement</h4><label htmlFor="custom-capability-search" className="mt-4 block text-xs">Search canonical capabilities</label><input id="custom-capability-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3" />
      <label htmlFor="custom-capability" className="mt-3 block text-xs">Canonical capability ({canonicalLibrary.capabilities.length} available)</label><select id="custom-capability" value={draft.capabilityId} onChange={(event) => { setDraft({ ...draft, capabilityId: event.target.value }); setError(""); }} className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3"><option value="">Choose capability</option>{definitions.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.family}</option>)}</select>{chosen && <p className="mt-2 text-xs text-cyan-200">Governed family: {chosen.family}</p>}
      <label htmlFor="custom-importance" className="mt-3 block text-xs">Importance</label><select id="custom-importance" value={draft.importance} onChange={(event) => { setDraft({ ...draft, importance: event.target.value as RequirementDraft["importance"] }); setError(""); }} className="mt-2 min-h-11 w-full rounded-lg border border-white/10 bg-[#101827] px-3"><option value="">Choose importance</option><option value="must">Must</option><option value="should">Should</option><option value="differentiator">Differentiator</option></select>
      <label htmlFor="reviewed-passage" className="mt-3 block text-xs">Reviewed source passage</label><textarea id="reviewed-passage" value={draft.passage} onChange={(event) => { setDraft({ ...draft, passage: event.target.value }); setError(""); }} placeholder="Copy an exact requirement sentence from the job description" className="mt-2 min-h-24 w-full rounded-xl border border-white/10 bg-black/20 p-3 text-sm" /><button type="button" onClick={addRequirement} className="mt-3 min-h-11 rounded-lg border border-violet-300/30 px-4 text-sm text-violet-200">Add reviewed requirement</button>
    </div>
    {requirements.length > 0 && <div className="mt-5"><h4 className="font-semibold">Reviewed requirements</h4><ul className="mt-3 grid gap-3">{requirements.map((item) => <li key={item.requirementId} className="rounded-xl border border-white/10 p-3"><p className="text-xs uppercase tracking-wider text-violet-300">{item.importance} · {item.family}</p><p className="mt-1 font-semibold">{item.capabilityLabel}</p><p className="mt-2 text-sm text-slate-300">{item.sourceText}</p><div className="mt-3 flex flex-wrap gap-2"><select aria-label={`Importance for ${item.capabilityLabel}`} value={item.importance} onChange={(event) => setRequirements((current) => current.map((entry) => entry.requirementId === item.requirementId ? Object.freeze({ ...entry, importance: event.target.value as CapabilityImportance }) : entry))} className="min-h-11 rounded-lg border border-white/10 bg-[#101827] px-3"><option value="must">Must</option><option value="should">Should</option><option value="differentiator">Differentiator</option></select><button type="button" onClick={() => setRequirements((current) => current.filter((entry) => entry.requirementId !== item.requirementId))} className="min-h-11 rounded-lg border border-red-300/20 px-3 text-sm text-red-200">Remove requirement</button></div></li>)}</ul></div>}
    {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-2"><button type="button" disabled={!title.trim() || !jobDescription || requirements.length === 0} onClick={apply} className="min-h-11 rounded-xl bg-violet-200 px-5 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-40">Use this target role</button>{appliedRole && <button type="button" onClick={onDiscard} className="min-h-11 rounded-xl border border-red-300/20 px-4 text-sm text-red-200">Discard custom role</button>}</div><p className="mt-2 text-xs text-slate-500">Custom role drafts and applied roles are session-only. Refresh may clear them.</p>
  </section>;
}
