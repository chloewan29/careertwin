(function initSidepanelRenderMatchViewModel() {
  // Adapts raw analysis payload into compact, presentation-focused sidepanel sections.
  const Utils = globalThis.CareerTwinSharedUtils || {};

  function asArray(value) {
    return Utils.asArray ? Utils.asArray(value) : (Array.isArray(value) ? value : []);
  }

  function toString(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function hasText(value) {
    return toString(value).length > 0;
  }

  function toTitleFromSlug(value) {
    return toString(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function truncateText(value, maxChars) {
    const text = toString(value);
    if (!text || text.length <= maxChars) return text;
    return `${text.slice(0, Math.max(0, maxChars - 1)).trimEnd()}...`;
  }

  function toScoreNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function toVerdictLabel(params) {
    const score = params.score;
    const fitLevel = params.fitLevel;
    if (typeof score === "number" && score >= 85) return "Excellent Match";
    if (fitLevel === "strong" || (typeof score === "number" && score >= 70)) return "Strong Match";
    if (fitLevel === "moderate" || (typeof score === "number" && score >= 50)) return "Moderate Match";
    if (fitLevel === "stretch" || (typeof score === "number" && score >= 42)) return "Stretch";
    return "Low Match";
  }

  function normalizeCapabilityRows(rawItems) {
    const rows = [];
    const seen = new Set();
    for (const entry of asArray(rawItems)) {
      if (!entry) continue;
      const label = typeof entry === "string"
        ? toString(entry)
        : toString(entry.capability || entry.label || entry.name);
      if (!label) continue;

      const dedupeKey = label.toLowerCase();
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);

      const explanation = typeof entry === "string"
        ? ""
        : toString(
          entry.explanation
          || entry.reasoning
          || entry.message
          || entry.why
          || entry.rationale,
        );

      rows.push({
        label,
        explanation,
      });
    }
    return rows;
  }

  function normalizeEvidenceHighlights(rawItems) {
    return asArray(rawItems)
      .map((item) => (item && typeof item.label === "string" ? toString(item.label) : ""))
      .filter((item) => item.length > 0);
  }

  function buildSummarySentence(capabilities) {
    const first = capabilities[0] ? capabilities[0].label : "";
    const second = capabilities[1] ? capabilities[1].label : "";

    if (first && second) {
      return `Your evidence-backed strengths in ${first} and ${second} align with this role's core requirements and support a credible application story.`;
    }
    if (first) {
      return `Your evidence-backed experience in ${first} aligns with this role's key expectations and supports a practical fit for applying now.`;
    }
    return "Your profile shows partial role alignment, with fit depending on how clearly your strongest evidence maps to this job's priorities.";
  }

  function buildWhyFitItems(rawCapabilities, rawEvidenceHighlights) {
    const capabilities = normalizeCapabilityRows(rawCapabilities).slice(0, 3);
    const evidenceHighlights = normalizeEvidenceHighlights(rawEvidenceHighlights);

    return capabilities.map((capability, index) => {
      if (hasText(capability.explanation)) {
        return {
          label: capability.label,
          explanation: truncateText(capability.explanation, 150),
        };
      }

      const evidenceLabel = evidenceHighlights[index] || evidenceHighlights[0] || "";
      if (evidenceLabel) {
        return {
          label: capability.label,
          explanation: `Your career evidence includes ${truncateText(evidenceLabel, 80)}, aligning with this role's ${capability.label.toLowerCase()} focus.`,
        };
      }

      return {
        label: capability.label,
        explanation: "Your past work shows repeatable strength in this area, aligning with responsibilities highlighted in this role.",
      };
    });
  }

  function normalizeGapRows(rawItems) {
    return normalizeCapabilityRows(rawItems).map((item) => ({
      label: item.label,
      explanation: hasText(item.explanation)
        ? truncateText(item.explanation, 150)
        : `This role places more weight on ${item.label.toLowerCase()}, so clearer evidence in your background may strengthen your application positioning.`,
    }));
  }

  function normalizeAtsRiskRows(rawItems) {
    const rows = [];
    for (const item of asArray(rawItems)) {
      if (!item) continue;
      if (typeof item === "string") {
        rows.push({
          label: "Role alignment signal",
          explanation: truncateText(item, 150),
        });
        continue;
      }

      const label = hasText(item.label)
        ? toString(item.label)
        : item.type === "title_mismatch"
          ? "Title alignment clarity"
          : toTitleFromSlug(item.type || "role_alignment_signal");

      const explanation = toString(item.reasoning || item.message);
      if (!explanation) continue;
      rows.push({
        label,
        explanation: truncateText(explanation, 150),
      });
    }
    return rows;
  }

  function buildSignalRisk(analysis) {
    const quality = toString(analysis && analysis.job_profile_quality);
    const confidence = toString(analysis && analysis.score_confidence);

    if (quality === "empty" || quality === "sparse") {
      return {
        label: "Signal confidence",
        explanation: "Job extraction on this page is limited, so some match signals may be incomplete. Clear examples in your CV can reduce this risk.",
      };
    }

    if (confidence === "low") {
      return {
        label: "Match confidence",
        explanation: "Current fit confidence is low, so stronger role-specific evidence could improve how clearly your story maps to this role.",
      };
    }

    return null;
  }

  function buildRiskItems(analysis) {
    const rows = [];
    const seen = new Set();

    const addRow = (row) => {
      if (!row || rows.length >= 2) return;
      const label = toString(row.label);
      const explanation = toString(row.explanation);
      if (!label || !explanation) return;
      const key = label.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ label, explanation });
    };

    for (const gap of normalizeGapRows(analysis && analysis.key_gaps)) addRow(gap);
    for (const risk of normalizeAtsRiskRows(analysis && analysis.ats_risks)) addRow(risk);
    addRow(buildSignalRisk(analysis));

    return rows.slice(0, 2);
  }

  function buildResumeDownloadPayload(data, analysis) {
    const job = data && data.job ? data.job : null;
    if (!job || !hasText(job.jobId)) return null;

    const selectedEvidenceIds = asArray(job.selectedEvidenceIds).filter((value) => typeof value === "string");
    const verdict = data && typeof data.verdict === "string" ? data.verdict : null;
    const matchScore = toScoreNumber(data && data.matchScore);
    const fallbackScore = toScoreNumber(analysis && analysis.match_score);

    return {
      jobId: job.jobId,
      jobSnapshotId: typeof job.jobSnapshotId === "number" ? job.jobSnapshotId : undefined,
      sourcePlatform: hasText(job.sourcePlatform) ? job.sourcePlatform : undefined,
      jobTitle: hasText(job.jobTitle) ? job.jobTitle : undefined,
      company: hasText(job.company) ? job.company : undefined,
      location: hasText(job.location) ? job.location : undefined,
      jobUrl: hasText(job.jobUrl) ? job.jobUrl : undefined,
      jobDescriptionSnapshot: hasText(job.jobDescriptionSnapshot) ? job.jobDescriptionSnapshot : undefined,
      matchScore: typeof matchScore === "number" ? matchScore : fallbackScore,
      verdict: verdict || undefined,
      selectedEvidenceIds,
    };
  }

  function buildApplyCta(data, analysis) {
    const decision = analysis && analysis.tailoring_decision ? analysis.tailoring_decision : null;
    const decisionMessage = decision && hasText(decision.message)
      ? truncateText(decision.message, 160)
      : "Use a tailored CV to emphasize your strongest evidence for this role.";
    const resumePayload = buildResumeDownloadPayload(data, analysis);
    const canApply = Boolean(decision && decision.allowed && resumePayload && resumePayload.jobId);

    return {
      title: "Apply with Tailored CV",
      buttonLabel: "Apply with Tailored CV",
      message: decisionMessage,
      enabled: canApply,
      disabledReason: canApply
        ? ""
        : "Tailored CV becomes available once this job has enough match context.",
      resumePayload,
    };
  }

  function normalizeEngineItems(rawItems, limit) {
    return asArray(rawItems)
      .map((item) => {
        if (!item) return null;
        const label = toString(item.title);
        const explanation = toString(item.explanation);
        if (!label || !explanation) return null;
        return { label, explanation: truncateText(explanation, 150) };
      })
      .filter(Boolean)
      .slice(0, limit);
  }

  function hasEngineExplanation(explanation) {
    if (!explanation || typeof explanation !== "object") return false;
    if (!hasText(explanation.verdict_label)) return false;
    if (!hasText(explanation.summary)) return false;
    return typeof explanation.score === "number" || hasText(explanation.score);
  }

  function toViewModelFromEngine(data, analysis, explanation) {
    const score = toScoreNumber(explanation.score);
    return {
      matchHeader: {
        sectionTitle: "Match header",
        verdictLabel: toString(explanation.verdict_label) || toVerdictLabel({
          score,
          fitLevel: toString(analysis.fit_level),
        }),
        score: typeof score === "number" ? Math.round(score) : null,
        summary: truncateText(toString(explanation.summary), 190),
      },
      whyFit: {
        sectionTitle: "Why this role fits you",
        items: normalizeEngineItems(explanation.strengths, 3),
      },
      potentialRisks: {
        sectionTitle: "Potential risks",
        items: normalizeEngineItems(explanation.risks, 2),
      },
      applyCta: buildApplyCta(data, analysis),
    };
  }

  function toMatchPanelViewModel(data) {
    const analysis = data && data.job_analysis ? data.job_analysis : {};
    const matchExplanation = analysis && analysis.match_explanation ? analysis.match_explanation : null;
    if (hasEngineExplanation(matchExplanation)) {
      return toViewModelFromEngine(data, analysis, matchExplanation);
    }

    const score = toScoreNumber(analysis.match_score);
    const capabilities = normalizeCapabilityRows(analysis.top_matched_capabilities);
    const verdictLabel = toVerdictLabel({
      score,
      fitLevel: toString(analysis.fit_level),
    });

    return {
      matchHeader: {
        sectionTitle: "Match header",
        verdictLabel,
        score: typeof score === "number" ? Math.round(score) : null,
        summary: buildSummarySentence(capabilities),
      },
      whyFit: {
        sectionTitle: "Why this role fits you",
        items: buildWhyFitItems(analysis.top_matched_capabilities, analysis.evidence_highlights),
      },
      potentialRisks: {
        sectionTitle: "Potential risks",
        items: buildRiskItems(analysis),
      },
      applyCta: buildApplyCta(data, analysis),
    };
  }

  globalThis.CareerTwinRenderMatchViewModel = {
    toMatchPanelViewModel,
  };
})();
