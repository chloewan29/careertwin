import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createClient } from "@supabase/supabase-js";
import { analyzeJobForCopilot } from "@/lib/career-engine/job-copilot/backend/job-copilot-service";

type SnapshotRow = {
    job_snapshot_id: number;
    source_platform: "linkedin" | "seek";
    job_url: string | null;
    job_title: string | null;
    company: string | null;
    location: string | null;
    job_description_raw: string | null;
};

type ExpectedShape = "specialist_narrow_functional" | "hybrid_role_native" | "true_broad_leadership";
type RoleShape = "true_broad_native" | "fallback_broad_risk";
type Bucket = "role_native_functional" | "operating_mode" | "governance_process" | "delivery_posture" | "business_abstraction" | "proof_posture" | "broad_leadership_native";

const DEFAULT_PROFILE = "8ec2c318-dbd0-42e2-acc7-10a103284b53";
const DEFAULT_OUT = "artifacts/post-fix-fresh-subject-sidepanel-audit.json";
const EXCLUDE_FILES = [
    "artifacts/layer1-role-reading-audit.before.json",
    "artifacts/layer1-role-reading-audit.after-shape-gate.json",
    "artifacts/broad-dominance-audit.before-shape-gate.json",
    "artifacts/broad-dominance-audit.after-shape-gate.json",
    "artifacts/true-broad-vs-fallback.before-shape-gate.json",
    "artifacts/true-broad-vs-fallback.after-shape-gate.json",
    "artifacts/qc-role-subject-collapse-audit.after.json",
];
const STOP = new Set(["the", "and", "for", "with", "that", "this", "you", "your", "are", "from", "one", "then", "into", "about", "role"]);

function loadEnvLocal() {
    const p = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(p)) return;
    for (const line of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const i = t.indexOf("=");
        if (i <= 0) continue;
        const k = t.slice(0, i).trim();
        let v = t.slice(i + 1).trim();
        if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        if (!(k in process.env)) process.env[k] = v;
    }
}

function arg(name: string): string | null {
    const a = process.argv.slice(2);
    const i = a.indexOf(name);
    return i === -1 ? null : a[i + 1] ?? null;
}

function norm(v: unknown): string {
    if (typeof v !== "string") return "";
    return v.toLowerCase().replace(/[_/]+/g, " ").replace(/[^a-z0-9\s-]+/g, " ").replace(/\s+/g, " ").trim();
}

function bucket(family: string | null | undefined): Bucket {
    const f = norm(family).replace(/[\s-]+/g, "_");
    if (!f) return "business_abstraction";
    if (f.includes("broad_functional_leadership") || f.includes("functional_leadership") || f.includes("people_leadership")) return "broad_leadership_native";
    if (f.includes("governance") || f.includes("risk") || f.includes("compliance") || f.includes("assurance") || f.includes("policy") || f.includes("program_management_governance") || f.includes("business_analysis_requirements_process")) return "governance_process";
    if (f.includes("operating_model") || f.includes("standards_methodology") || f.includes("ways_of_working") || f.includes("operating_mode")) return "operating_mode";
    if (f.includes("transformation") || f.includes("enablement") || f.includes("implementation") || f.includes("rollout") || f.includes("delivery") || f.includes("data_platform_transformation")) return "delivery_posture";
    if (f.includes("analytics_translation_storytelling") || f.includes("stakeholder_decision_support") || f.includes("stakeholder_embedding") || f.includes("insight_generation_reporting") || f.includes("insight_reporting_analytics")) return "proof_posture";
    if (f.includes("commercial_strategy_planning") || f.includes("strategy_consulting_advisory") || f.includes("business_intelligence_reporting") || f.includes("commercial_analytics")) return "business_abstraction";
    return "role_native_functional";
}

function expectedShape(row: SnapshotRow): ExpectedShape {
    const t = norm(row.job_title);
    const jd = norm(row.job_description_raw);
    const c = `${t} ${jd}`;
    const lead = /\b(head|director|chief|vp|vice president|general manager|gm)\b/.test(t);
    const spec = /\b(analyst|scientist|engineer|specialist|accountant|researcher)\b/.test(t);
    const hybrid = /\b(manager|lead|principal|consultant|advisor)\b/.test(t);
    const narrow = /\b(fp&a|financial planning|forecast|sales intelligence|sales operations|revenue operations|consumer insights|customer insights|digital journey|acquisition|retention|conversion|experiment|product analytics)\b/.test(c);
    const broad = /\b(enterprise|portfolio|function wide|org wide|cross functional|operating model|decision rights|accountable)\b/.test(c);
    if (lead && broad && !narrow) return "true_broad_leadership";
    if (spec && !hybrid) return "specialist_narrow_functional";
    if (hybrid) return "hybrid_role_native";
    return narrow ? "hybrid_role_native" : "specialist_narrow_functional";
}

function rng(seed: number) {
    let s = seed >>> 0;
    return () => {
        s += 0x6D2B79F5;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle<T>(rows: T[], seed: number): T[] {
    const r = rng(seed);
    for (let i = rows.length - 1; i > 0; i -= 1) {
        const j = Math.floor(r() * (i + 1));
        const tmp = rows[i];
        rows[i] = rows[j];
        rows[j] = tmp;
    }
    return rows;
}

function stripHtml(html: string): string {
    return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

function section(html: string, title: string): string {
    const t = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const m = html.match(new RegExp(`<section[^>]*>[\\s\\S]*?<h2>${t}<\\/h2>([\\s\\S]*?)<\\/section>`, "i"));
    return m?.[1] ? stripHtml(m[1]) : "";
}

function toks(text: string): Set<string> {
    return new Set(norm(text).split(/\s+/).filter((x) => x.length >= 3 && !STOP.has(x)));
}

function jaccard(a: Set<string>, b: Set<string>): number {
    if (!a.size && !b.size) return 1;
    if (!a.size || !b.size) return 0;
    let i = 0;
    for (const t of a) if (b.has(t)) i += 1;
    return i / (a.size + b.size - i);
}

function createRenderer() {
    (globalThis as Record<string, unknown>).CareerTwinSharedUtils = { asArray: (v: unknown) => (Array.isArray(v) ? v : []), escapeHtml: (v: unknown) => String(v ?? "") };
    const ctx = vm.createContext(globalThis as unknown as vm.Context);
    for (const file of [
        "extensions/job-copilot/sidepanel/render/render-match-view-model.js",
        "extensions/job-copilot/sidepanel/render/render-match-summary.js",
        "extensions/job-copilot/sidepanel/render/render-quick-checks.js",
        "extensions/job-copilot/sidepanel/render/render-tailored-cv.js",
    ]) {
        new vm.Script(fs.readFileSync(path.join(process.cwd(), file), "utf8"), { filename: file }).runInContext(ctx);
    }
    const g = globalThis as Record<string, any>;
    return {
        toVM: g.CareerTwinRenderMatchViewModel.toMatchPanelViewModel as (p: Record<string, unknown>) => Record<string, unknown>,
        sum: g.CareerTwinRenderMatchSummary.renderMatchSummary as (v: Record<string, unknown>) => string,
        qc: g.CareerTwinRenderQuickChecks.renderQuickChecks as (v: Record<string, unknown>) => string,
        cv: g.CareerTwinRenderTailoredCv.renderTailoredCv as (v: Record<string, unknown>) => string,
    };
}

function exclusions(): Set<number> {
    const out = new Set<number>([5661, 5666, 5668, 5670]);
    const add = (obj: unknown) => {
        if (obj === null || obj === undefined) return;
        if (Array.isArray(obj)) return obj.forEach(add);
        if (typeof obj === "object") {
            for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
                if (typeof v === "number" && /snapshot/i.test(k)) out.add(Math.trunc(v));
                else add(v);
            }
        }
    };
    for (const f of EXCLUDE_FILES) {
        const p = path.join(process.cwd(), f);
        if (!fs.existsSync(p)) continue;
        try { add(JSON.parse(fs.readFileSync(p, "utf8"))); } catch {}
    }
    return out;
}

async function run() {
    loadEnvLocal();
    const profileId = arg("--profileId") ?? DEFAULT_PROFILE;
    const outPath = path.isAbsolute(arg("--out") ?? DEFAULT_OUT) ? (arg("--out") as string) : path.join(process.cwd(), arg("--out") ?? DEFAULT_OUT);
    const samplePool = Number(arg("--samplePool") ?? 1600);
    const seed = Number(arg("--seed") ?? 20260328);
    const reqTotal = Number(arg("--total") ?? 20);
    const target = { s: Number(arg("--specialistCount") ?? 7), h: Number(arg("--hybridCount") ?? 7), b: Number(arg("--broadCount") ?? 6) };

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data, error } = await supabase.from("job_snapshots").select("job_snapshot_id,source_platform,job_url,job_title,company,location,job_description_raw").order("job_snapshot_id", { ascending: false }).limit(samplePool);
    if (error) throw new Error(error.message);
    const excluded = exclusions();
    const rows = (data ?? []) as SnapshotRow[];
    const candidates = rows.filter((r) => !excluded.has(r.job_snapshot_id) && (r.job_description_raw ?? "").trim().length >= 420);
    const s = shuffle(candidates.filter((r) => expectedShape(r) === "specialist_narrow_functional"), seed + 1);
    const h = shuffle(candidates.filter((r) => expectedShape(r) === "hybrid_role_native"), seed + 2);
    const b = shuffle(candidates.filter((r) => expectedShape(r) === "true_broad_leadership"), seed + 3);
    const selected: SnapshotRow[] = [...s.slice(0, target.s), ...h.slice(0, target.h), ...b.slice(0, target.b)];
    const used = new Set(selected.map((r) => r.job_snapshot_id));
    if (selected.length < reqTotal) {
        const fill = shuffle(candidates.filter((r) => !used.has(r.job_snapshot_id)), seed + 9);
        for (const r of fill) {
            if (selected.length >= reqTotal) break;
            selected.push(r);
        }
    }
    const finalRows = shuffle(selected, seed + 17).slice(0, reqTotal);
    const renderer = createRenderer();

    const details: Array<Record<string, unknown>> = [];
    const subFail = new Map<string, number>();
    const wordFail = new Map<string, number>();
    const pairFreq = new Map<string, number>();

    for (const snap of finalRows) {
        const expected = expectedShape(snap);
        const out = await analyzeJobForCopilot({
            profileId,
            source: snap.source_platform,
            jobUrl: snap.job_url ?? `https://post-fix-fresh-audit.local/${snap.job_snapshot_id}`,
            jobTitle: snap.job_title ?? `Snapshot ${snap.job_snapshot_id}`,
            company: snap.company ?? null,
            location: snap.location ?? null,
            jobDescription: snap.job_description_raw ?? "",
            topEvidenceLimit: 4,
        });
        const r: any = out.response ?? {};
        const d: any = r.diagnostics ?? {};
        const rs: any = d.jd_role_structure_contract ?? {};
        const rd: any = rs.primary_resolution_diagnostics ?? {};
        const roleShape = (rs.role_shape ?? "fallback_broad_risk") as RoleShape;
        const before = rd.primary_family_before_shape_gate ?? rs.primary_role_family ?? null;
        const after = rd.primary_family_after_shape_gate ?? rs.primary_role_family ?? null;
        const narrow = Boolean(rd.role_shape_signals?.narrow_role_native_center_existed);
        const gov = Boolean(rd.governance_process_explicit_purpose);
        const l1b = bucket(after);
        const l1ok = roleShape === "true_broad_native" ? Boolean(after) : (l1b === "role_native_functional" || (l1b === "governance_process" && gov));

        const payload = { ...r, job: { jobTitle: out.job.jobTitle, jobDescriptionSnapshot: out.job.jobDescriptionSnapshot } };
        const viewModel: any = renderer.toVM(payload);
        const header: any = viewModel.matchHeader ?? {};
        const contract: any = header.panelJudgmentContract ?? {};
        const downFamily = norm(contract.proof_alignment_subject_family || contract.proof_alignment_subject_label || header.primaryAxisLabel || "");
        const downBucket = bucket(downFamily);
        const reentered = roleShape === "fallback_broad_risk" && ["operating_mode", "delivery_posture", "business_abstraction", "proof_posture"].includes(downBucket);
        const l23ok = !reentered && (downBucket === l1b || (l1b === "role_native_functional" && downBucket === "role_native_functional"));

        const html1 = renderer.sum(viewModel);
        const html2 = renderer.qc(viewModel);
        const html3 = renderer.cv(viewModel);
        const sections = {
            careerVerdict: section(html1, "Career Verdict"),
            whyYou: section(html1, "Why You"),
            biggestRisk: section(html1, "Biggest Risk"),
            confirmOneKeyFact: section(html2, "Confirm One Key Fact"),
            recommendedAction: section(html3, "Recommended Action"),
        };
        const verdict = norm(sections.careerVerdict);
        const cue = norm(String(contract.proof_alignment_subject_label ?? after ?? ""));
        const cueTokens = cue.split(/\s+/).filter((x) => x.length >= 4).slice(0, 6);
        const l4ok = cueTokens.length === 0 || cueTokens.some((x) => verdict.includes(x));
        const subjectPass = l1ok && l23ok && l4ok;
        const subjectLayer = !l1ok ? "Layer 1 subject misread" : !l23ok ? "Layer 2/3 downstream drift" : !l4ok ? "Layer 4 renderer drift" : null;

        const tv = toks(sections.careerVerdict);
        const tw = toks(sections.whyYou);
        const tr = toks(sections.biggestRisk);
        const tq = toks(sections.confirmOneKeyFact);
        const ta = toks(sections.recommendedAction);
        const sims = [
            { pair: "Career Verdict ↔ Why You", score: Number(jaccard(tv, tw).toFixed(3)) },
            { pair: "Career Verdict ↔ Recommended Action", score: Number(jaccard(tv, ta).toFixed(3)) },
            { pair: "Why You ↔ Recommended Action", score: Number(jaccard(tw, ta).toFixed(3)) },
            { pair: "Biggest Risk ↔ Confirm One Key Fact", score: Number(jaccard(tr, tq).toFixed(3)) },
        ];
        const repeated = sims.filter((x) => x.score >= 0.52).map((x) => x.pair);
        repeated.forEach((p) => pairFreq.set(p, (pairFreq.get(p) ?? 0) + 1));
        const lowInfo = [
            ["Career Verdict", tv], ["Why You", tw], ["Biggest Risk", tr], ["Confirm One Key Fact", tq], ["Recommended Action", ta],
        ].filter(([, sset]) => (sset as Set<string>).size <= 2).map(([name]) => String(name));
        const wordingPass = repeated.length <= 1 && lowInfo.length <= 1;
        const wordingNote = `${repeated.length ? `重复: ${repeated.join(", ")}.` : ""} ${lowInfo.length ? `低信息增量: ${lowInfo.join(", ")}.` : ""}`.trim() || null;

        if (!subjectPass && subjectLayer) subFail.set(subjectLayer, (subFail.get(subjectLayer) ?? 0) + 1);
        if (!wordingPass) wordFail.set("sidepanel redundancy only", (wordFail.get("sidepanel redundancy only") ?? 0) + 1);

        details.push({
            snapshot_id: snap.job_snapshot_id,
            source_platform: snap.source_platform,
            job_title: snap.job_title,
            expected_role_shape: expected,
            final_selected_role_subject: contract.proof_alignment_subject_label ?? after ?? null,
            subject_pass: subjectPass,
            subject_issue_layer: subjectLayer,
            wording_pass: wordingPass,
            wording_note: wordingNote,
            layered_trace: {
                layer1: { role_shape: roleShape, narrow_center_detected: narrow, primary_family_before_shape_gate: before, primary_family_after_shape_gate: after, layer1_primary_acceptable: l1ok },
                layer23: { downstream_aligned_with_layer1: l23ok, broad_safe_reentered_headline: reentered, supporting_families_remained_supporting: !reentered },
                layer4: { final_panel_headline_aligned: l4ok, final_panel_headline_text: sections.careerVerdict },
            },
            sidepanel_sections: sections,
            wording_diagnostics: { repeated_pairs: repeated, low_info_sections: lowInfo, pairwise_similarity: sims },
        });
    }

    const subjectPass = details.filter((r) => r.subject_pass === true).length;
    const wordingPass = details.filter((r) => r.wording_pass === true).length;
    const recommendation = subjectPass >= 19
        ? "subject problem can be closed; move to wording polish"
        : subjectPass >= 17
            ? "subject mostly closed but 1 more narrow mechanism fix needed"
            : "subject still not stable; do not close";

    const outJson = {
        generated_at: new Date().toISOString(),
        sample: {
            total_selected: details.length,
            excluded_snapshot_count: excluded.size,
            selected_mix: {
                specialist: details.filter((r) => r.expected_role_shape === "specialist_narrow_functional").length,
                hybrid: details.filter((r) => r.expected_role_shape === "hybrid_role_native").length,
                broad: details.filter((r) => r.expected_role_shape === "true_broad_leadership").length,
            },
        },
        summary_scorecard: {
            subject_resolution_pass_rate: `${subjectPass}/${details.length}`,
            wording_redundancy_pass_rate: `${wordingPass}/${details.length}`,
            subject_fail_count: details.length - subjectPass,
            wording_fail_count: details.length - wordingPass,
            success_standard_met_19_of_20: subjectPass >= 19,
        },
        case_table: details.map((r) => ({
            snapshot_id: r.snapshot_id,
            job_title: r.job_title,
            expected_role_shape: r.expected_role_shape,
            final_selected_role_subject: r.final_selected_role_subject,
            subject_pass: r.subject_pass,
            issue_layer: r.subject_issue_layer,
            wording_pass: r.wording_pass,
            wording_note: r.wording_note,
        })),
        remaining_failure_clusters: {
            layer1_subject_misread: subFail.get("Layer 1 subject misread") ?? 0,
            layer23_downstream_drift: subFail.get("Layer 2/3 downstream drift") ?? 0,
            layer4_renderer_drift: subFail.get("Layer 4 renderer drift") ?? 0,
            sidepanel_redundancy_only: wordFail.get("sidepanel redundancy only") ?? 0,
        },
        sidepanel_redundancy_findings: {
            most_common_repeated_patterns: [...pairFreq.entries()].map(([pattern, count]) => ({ pattern, count })).sort((a, b) => b.count - a.count),
            verdict_why_differentiation_failures: details.filter((r) => ((r.wording_diagnostics as any)?.repeated_pairs ?? []).includes("Career Verdict ↔ Why You")).length,
            recommendation_adds_new_information_in_cases: details.filter((r) => !((r.wording_diagnostics as any)?.low_info_sections ?? []).includes("Recommended Action")).length,
        },
        layered_case_details: details,
        next_action_recommendation: recommendation,
    };

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, `${JSON.stringify(outJson, null, 2)}\n`, "utf8");
    console.log(JSON.stringify({
        out: outPath,
        selected_cases: details.length,
        subject_pass_count: subjectPass,
        wording_pass_count: wordingPass,
        success_standard_met_19_of_20: subjectPass >= 19,
        recommendation,
    }, null, 2));
}

run().catch((error) => {
    console.error("[run-post-fix-subject-sidepanel-audit] failed", error);
    process.exit(1);
});
