import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvLocal() {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!fs.existsSync(envPath)) return;
    const content = fs.readFileSync(envPath, "utf8");
    for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const idx = trimmed.indexOf("=");
        if (idx <= 0) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        if (!(key in process.env)) process.env[key] = value;
    }
}

function normalizeWhitespace(text) {
    return text.replace(/\s+/g, " ").trim();
}

const ACTION_CATALOG = [
    ["led", /\b(led|lead)\b/i],
    ["built", /\b(built|build)\b/i],
    ["developed", /\b(developed|develop)\b/i],
    ["deployed", /\b(deployed|deploy)\b/i],
    ["presented", /\b(presented|present)\b/i],
    ["identified", /\b(identified|identify)\b/i],
    ["implemented", /\b(implemented|implement)\b/i],
    ["created", /\b(created|create)\b/i],
    ["delivered", /\b(delivered|deliver)\b/i],
    ["managed", /\b(managed|manage)\b/i],
    ["optimized", /\b(optimized|optimised|optimize|optimise)\b/i],
    ["reduced", /\b(reduced|reduce)\b/i],
    ["increased", /\b(increased|increase)\b/i],
    ["drove", /\b(drove|drive)\b/i],
    ["pioneered", /\b(pioneered|pioneer)\b/i],
    ["secured approval", /\b(secured approval|gained approval|won approval)\b/i],
    ["influenced", /\b(influenced|influence)\b/i],
    ["negotiated", /\b(negotiated|negotiate)\b/i],
];

const TOOL_PATTERNS = [
    ["sql", /\bsql\b/i],
    ["python", /\bpython\b/i],
    ["r", /\b(?:using|in|with)\s+r\b|\br language\b|\br\/shiny\b|\btidyverse\b/i],
    ["power bi", /\bpower\s*bi\b/i],
    ["tableau", /\btableau\b/i],
    ["bigquery", /\bbigquery\b/i],
    ["excel", /\bexcel\b/i],
    ["snowflake", /\bsnowflake\b/i],
    ["dbt", /\bdbt\b/i],
    ["google analytics", /\bgoogle analytics\b|\bga4\b/i],
    ["looker", /\blooker\b/i],
];

function splitCandidates(rawText) {
    const normalized = normalizeWhitespace(rawText);
    return normalized
        .split(/(?<=[.!?])\s+(?=[A-Z0-9])/)
        .flatMap((s) => s.split(/\s*(?:;|\.|\band\b(?=\s+[A-Z][a-z])|\bwhile\b|\bwhich\b)\s*/i))
        .flatMap((s) => s.split(/\s+(?=(?:Led|Built|Presented|Conducted|Generated|Owned|Established|Drove|Developed|Implemented|Created|Delivered|Launched|Managed|Improved|Reduced|Increased|Pioneered|Identified|Secured|Influenced|Negotiated)\b)/g))
        .map((s) => s.trim())
        .filter((s) => s.length >= 12);
}

function actionOf(text) {
    for (const [normalized, pattern] of ACTION_CATALOG) {
        if (pattern.test(text)) return normalized;
    }
    return null;
}

function toolsOf(text) {
    return [...new Set(TOOL_PATTERNS.filter(([, re]) => re.test(text)).map(([tool]) => tool))];
}

function initiativeOf(text) {
    if (/\b(transformation|operating model|modernization|modernisation)\b/i.test(text)) return "transformation";
    if (/\b(strategy|strategic|roadmap|planning)\b/i.test(text)) return "strategy";
    if (/\b(analytics|insight|reporting|bi)\b/i.test(text)) return "analytics";
    if (/\b(automation|automated|pipeline)\b/i.test(text)) return "automation";
    if (/\b(consulting|advisory|client engagement)\b/i.test(text)) return "consulting";
    if (/\b(delivery|rollout|implementation)\b/i.test(text)) return "delivery";
    if (/\b(optimi[sz]ed|improved|efficiency|cycle time)\b/i.test(text)) return "optimization";
    if (/\b(market analysis|market sizing|competitive analysis|demand analysis)\b/i.test(text)) return "market_analysis";
    if (/\b(capability framework|standards|enablement|uplift)\b/i.test(text)) return "capability_uplift";
    return null;
}

function ownershipOf(text) {
    if (/\b(accountable for|owned|owner|head of|responsible for)\b/i.test(text)) return "owner";
    if (/\b(led|managed|leadership|oversight|pioneered)\b/i.test(text)) return "lead";
    if (/\b(drove|spearheaded|secured approval|influenced|negotiated|championed)\b/i.test(text)) return "driver";
    if (actionOf(text)) return "contributor";
    return null;
}

function stakeholderOf(text) {
    const out = [];
    if (/\b(executive|c-suite|senior leadership|board|vp)\b/i.test(text)) out.push("executive");
    if (/\b(cross-functional|multiple teams|business units|partners?)\b/i.test(text)) out.push("cross_functional");
    if (/\b(customer|client|vendor|agency|external)\b/i.test(text)) out.push("external");
    if (out.length === 0) out.push("internal");
    return [...new Set(out)];
}

function impactOf(text) {
    if (/\b(revenue|profit|margin|pricing)\b/i.test(text)) return "revenue";
    if (/\b(cost|savings?|efficiency|reduced|reduce)\b/i.test(text)) return "cost";
    if (/\b(operational|cycle time|automation|process)\b/i.test(text)) return "operational";
    if (/\b(strategy|strategic|roadmap|transformation)\b/i.test(text)) return "strategic";
    return null;
}

function hintsOf(text) {
    const out = [];
    if (/\b(mentored|coached|managed a team|team leadership|team of \d+)\b/i.test(text)) out.push("People Leadership");
    if (/\b(program(?:me)?|cross-functional delivery|multi-workstream)\b/i.test(text)) out.push("Program Leadership");
    if (/\b(enterprise transformation|operating model transformation|enterprise-wide transformation)\b/i.test(text)) out.push("Enterprise Transformation");
    if (/\b(executive stakeholders?|stakeholder alignment|influenced stakeholders?|secured approval)\b/i.test(text)) out.push("Stakeholder Strategy");
    if (/\b(commercial analytics|pricing|margin|revenue analysis|profitability)\b/i.test(text)) out.push("Commercial Analytics");
    if (/\b(data platform transformation|bi transformation|reporting platform modernization)\b/i.test(text)) out.push("BI / Data Platform Transformation");
    if (/\b(strategy roadmap|strategic planning|annual planning)\b/i.test(text)) out.push("Strategic Planning");
    if (/\b(change rollout|change management|adoption strategy)\b/i.test(text)) out.push("Change Management");
    return out;
}

function refinedSignals(piece) {
    return splitCandidates(piece.raw_text).map((c) => ({
        action: actionOf(c),
        initiative_type: initiativeOf(c),
        ownership_level: ownershipOf(c),
        stakeholder_scope: stakeholderOf(c),
        tool_signals: toolsOf(c),
        impact_signal: impactOf(c),
        capability_hints: hintsOf(c),
        snippet: c.slice(0, 180),
    }));
}

function inferRefinedCapabilities(signals) {
    const caps = new Set();
    for (const s of signals) {
        const hints = s.capability_hints.map((h) => h.toLowerCase());
        if ((s.ownership_level === "lead" || s.ownership_level === "owner") && s.snippet.match(/\bteam\b/i)) caps.add("People Leadership");
        if ((s.initiative_type === "delivery" || s.initiative_type === "transformation") && (s.ownership_level === "lead" || s.ownership_level === "driver" || s.ownership_level === "owner")) caps.add("Program Leadership");
        if ((s.initiative_type === "transformation" && /enterprise|function/.test(s.snippet.toLowerCase())) || hints.includes("enterprise transformation")) caps.add("Enterprise Transformation");
        if (s.stakeholder_scope.includes("executive") || ["presented", "secured approval", "influenced", "negotiated"].includes(s.action)) caps.add("Stakeholder Strategy");
        if ((s.impact_signal === "revenue" || s.impact_signal === "cost") && /analytics|commercial/.test(s.snippet.toLowerCase())) caps.add("Commercial Analytics");
        if ((s.initiative_type === "transformation" || s.initiative_type === "automation" || s.initiative_type === "capability_uplift") && s.tool_signals.some((t) => ["sql", "power bi", "tableau", "bigquery", "snowflake", "dbt", "looker"].includes(t))) caps.add("BI / Data Platform Transformation");
        if (s.initiative_type === "strategy" || s.initiative_type === "market_analysis" || hints.includes("strategic planning")) caps.add("Strategic Planning");
        if (hints.includes("change management")) caps.add("Change Management");
    }
    return [...caps];
}

async function run() {
    loadEnvLocal();
    const careerId = process.argv[2];
    if (!careerId) throw new Error("Usage: node scripts/preview-signal-refinement.mjs <careerId>");

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const { data: pieces, error: pieceErr } = await supabase
        .from("evidence_pieces")
        .select("id, raw_text")
        .eq("career_id", careerId)
        .limit(30);
    if (pieceErr) throw pieceErr;
    const pieceIds = pieces.map((p) => p.id);

    const { data: signals, error: signalErr } = await supabase
        .from("evidence_signals")
        .select("id, evidence_piece_id, action, initiative_type, ownership_level, stakeholder_scope, tool_signals, impact_signal, capability_hints")
        .in("evidence_piece_id", pieceIds);
    if (signalErr) throw signalErr;

    const signalIds = signals.map((s) => s.id);
    const { data: links, error: linkErr } = await supabase
        .from("capability_signal_links")
        .select("capability_id, evidence_signal_id")
        .in("evidence_signal_id", signalIds);
    if (linkErr) throw linkErr;

    const capIds = [...new Set(links.map((l) => l.capability_id))];
    const { data: caps, error: capErr } = await supabase
        .from("capabilities")
        .select("id, name")
        .in("id", capIds);
    if (capErr) throw capErr;
    const capMap = new Map(caps.map((c) => [c.id, c.name]));
    const linksBySignal = new Map();
    for (const l of links) {
        const b = linksBySignal.get(l.evidence_signal_id) ?? [];
        b.push(l.capability_id);
        linksBySignal.set(l.evidence_signal_id, b);
    }
    const signalsByPiece = new Map();
    for (const s of signals) {
        const b = signalsByPiece.get(s.evidence_piece_id) ?? [];
        b.push(s);
        signalsByPiece.set(s.evidence_piece_id, b);
    }

    const examples = [];
    for (const p of pieces) {
        const beforeSignals = signalsByPiece.get(p.id) ?? [];
        const beforeCaps = [...new Set(beforeSignals.flatMap((s) => (linksBySignal.get(s.id) ?? []).map((id) => capMap.get(id) ?? id)))];
        const afterSignals = refinedSignals(p);
        const afterCaps = inferRefinedCapabilities(afterSignals);
        if (beforeSignals.length === 0 && afterSignals.length === 0) continue;
        examples.push({
            evidence_piece_id: p.id,
            raw_text: p.raw_text,
            before: {
                actions: beforeSignals.map((s) => s.action),
                initiative_types: beforeSignals.map((s) => s.initiative_type),
                ownership: beforeSignals.map((s) => s.ownership_level),
                tools: beforeSignals.flatMap((s) => s.tool_signals ?? []),
                capabilities: beforeCaps,
            },
            after: {
                actions: afterSignals.map((s) => s.action),
                initiative_types: afterSignals.map((s) => s.initiative_type),
                ownership: afterSignals.map((s) => s.ownership_level),
                tools: [...new Set(afterSignals.flatMap((s) => s.tool_signals))],
                capabilities: afterCaps,
            },
        });
        if (examples.length >= 3) break;
    }

    console.log(JSON.stringify({ careerId, examples }, null, 2));
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
