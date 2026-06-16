(function initSidepanelRenderMatchViewModel() {
  // Adapts raw analysis payload into compact, presentation-focused sidepanel sections.
  const Utils = globalThis.CareerTwinSharedUtils || {};
  const QuickCheckCtaState = globalThis.CareerTwinQuickCheckCtaState || {};

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
    const calibrationAnswers = asArray(analysis && analysis.calibration && analysis.calibration.answers)
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const questionId = toString(item.question_id || item.questionId);
        const answer = toString(item.answer).toLowerCase();
        if (!questionId || (answer !== "yes" && answer !== "no")) return null;
        return { questionId, answer };
      })
      .filter(Boolean);
    const confirmedStrengthAreas = asArray(analysis && analysis.calibration && analysis.calibration.confirmed_strength_areas)
      .filter((item) => typeof item === "string")
      .map((item) => toString(item))
      .filter(Boolean);
    const positioningHints = asArray(analysis && analysis.positioning_hints)
      .filter((item) => typeof item === "string")
      .map((item) => toString(item))
      .filter(Boolean);

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
      calibrationAnswers,
      confirmedStrengthAreas,
      positioningHints,
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

  function toApplyRecommendation(data, analysis) {
    const fromAnalysis = analysis && analysis.apply_recommendation ? analysis.apply_recommendation : null;
    const fromData = data && data.applyRecommendation ? data.applyRecommendation : null;
    const source = fromAnalysis || fromData || {};
    const score = toScoreNumber(source.score);
    const fallback = toScoreNumber(data && data.matchScore) || toScoreNumber(analysis && analysis.match_score) || null;
    const finalScore = typeof score === "number"
      ? Math.round(score)
      : (typeof fallback === "number" ? Math.round(fallback) : null);
    const band = toString(source.band).toLowerCase();
    if (band === "strong" || band === "consider" || band === "weak") {
      return {
        score: finalScore,
        band,
      };
    }
    if (typeof finalScore === "number" && finalScore >= 80) return { score: finalScore, band: "strong" };
    if (typeof finalScore === "number" && finalScore >= 60) return { score: finalScore, band: "consider" };
    return { score: finalScore, band: "weak" };
  }

  function toApplyBandLabel(band) {
    if (band === "strong") return "Strong";
    if (band === "consider") return "Consider";
    return "Weak";
  }

  function normalizeJobFitScore(data) {
    const raw = data && data.jobFitScore && typeof data.jobFitScore === "object"
      ? data.jobFitScore
      : null;
    if (!raw) return null;

    const totalScore = toScoreNumber(raw.total_score);
    const bucket = toString(raw.bucket);
    const breakdown = raw.breakdown && typeof raw.breakdown === "object" ? raw.breakdown : {};
    const specializationFit = toScoreNumber(breakdown.specialization_fit);
    const capabilityMatch = toScoreNumber(breakdown.capability_match);
    const evidenceStrength = toScoreNumber(breakdown.evidence_strength);
    if (typeof totalScore !== "number" || !bucket) return null;

    return {
      bucket,
      totalScore: Math.round(totalScore),
      specializationFit: typeof specializationFit === "number" ? Math.round(specializationFit) : null,
      capabilityMatch: typeof capabilityMatch === "number" ? Math.round(capabilityMatch) : null,
      evidenceStrength: typeof evidenceStrength === "number" ? Math.round(evidenceStrength) : null,
    };
  }

  function normalizeWhyFitItems(rawItems, fallbackItems) {
    const textItems = asArray(rawItems)
      .filter((item) => typeof item === "string")
      .map((item) => toString(item))
      .filter(Boolean)
      .slice(0, 3);
    if (textItems.length > 0) {
      return textItems.map((item, index) => ({
        label: `Career fit ${index + 1}`,
        explanation: truncateText(item, 160),
      }));
    }
    return fallbackItems;
  }

  function normalizeRiskItems(rawItems, fallbackItems) {
    const textItems = asArray(rawItems)
      .filter((item) => typeof item === "string")
      .map((item) => toString(item))
      .filter(Boolean)
      .slice(0, 3);
    if (textItems.length > 0) {
      return textItems.map((item, index) => ({
        label: `Risk ${index + 1}`,
        explanation: truncateText(item, 160),
      }));
    }
    return fallbackItems;
  }

  function normalizeQuickChecks(data, analysis) {
    const fromAnalysis = analysis && analysis.calibration && Array.isArray(analysis.calibration.questions)
      ? analysis.calibration.questions
      : [];
    const fromData = data && Array.isArray(data.calibrationQuestions)
      ? data.calibrationQuestions
      : [];
    const source = (fromAnalysis.length > 0 ? fromAnalysis : fromData)
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id = toString(item.id || item.question_id || item.questionId);
        const question = toString(item.question);
        if (!id || !question) return null;
        return {
          ...item,
          id,
          question,
        };
      })
      .filter(Boolean);

    const calibration = analysis && analysis.calibration ? analysis.calibration : {};
    const calibrationAnswers = Array.isArray(calibration.answers) ? calibration.answers : [];
    const normalizedQuickCheckState = QuickCheckCtaState && typeof QuickCheckCtaState.normalizeQuickCheckState === "function"
      ? QuickCheckCtaState.normalizeQuickCheckState({
        source,
        calibrationAnswers,
        calibrationRequired: typeof calibration.required === "boolean" ? calibration.required : null,
      })
      : null;
    const items = (
      normalizedQuickCheckState
      && Array.isArray(normalizedQuickCheckState.items)
      && normalizedQuickCheckState.items.length > 0
        ? normalizedQuickCheckState.items
        : source.map((item) => {
          const answerRaw = toString(item && item.answer).toLowerCase();
          const answer = answerRaw === "yes" || answerRaw === "no" ? answerRaw : null;
          return {
            id: toString(item && item.id),
            question: toString(item && item.question),
            answer,
            quickCheckKind: toString(item && (item.quick_check_kind || item.quickCheckKind)),
            quickCheckBlocksCta: item && (item.quick_check_blocks_cta === false || item.quickCheckBlocksCta === false)
              ? false
              : true,
            quickCheckGapType: toString(item && (item.quick_check_gap_type || item.quickCheckGapType)),
            targetArea: toString(item && (item.target_area || item.targetArea)),
            requirementCluster: toString(item && (item.requirement_cluster || item.requirementCluster)),
          };
        })
    ).slice(0, 3);
    const answeredCount = typeof calibration.answered_count === "number"
      ? calibration.answered_count
      : items.filter((item) => item.answer === "yes" || item.answer === "no").length;
    const totalQuestions = typeof calibration.total_questions === "number"
      ? calibration.total_questions
      : items.length;
    const required = normalizedQuickCheckState && typeof normalizedQuickCheckState.required === "boolean"
      ? normalizedQuickCheckState.required
      : totalQuestions > 0;
    const unresolvedCount = normalizedQuickCheckState && typeof normalizedQuickCheckState.unresolvedCount === "number"
      ? normalizedQuickCheckState.unresolvedCount
      : items.filter((item) => item.answer !== "yes" && item.answer !== "no").length;
    const runtimeState = normalizedQuickCheckState && hasText(normalizedQuickCheckState.runtimeState)
      ? normalizedQuickCheckState.runtimeState
      : (required && unresolvedCount > 0 ? "quick_check_pending" : (required ? "quick_check_available" : "quick_check_not_required"));
    const optionalEnrichment = Boolean(
      normalizedQuickCheckState
      && (
        normalizedQuickCheckState.optionalEnrichment === true
        || normalizedQuickCheckState.hasOptionalEnrichment === true
      ),
    );
    const scoreDelta = typeof calibration.score_delta === "number"
      ? calibration.score_delta
      : 0;
    const deltaText = scoreDelta === 0
      ? ""
      : scoreDelta > 0
        ? `Score adjusted +${Math.round(scoreDelta)}`
        : `Score adjusted ${Math.round(scoreDelta)}`;
    const statusText = totalQuestions > 0
      ? `${answeredCount}/${totalQuestions} answered. ${deltaText}`.trim()
      : "";
    const firstUnresolvedItem = items.find((item) => item.answer !== "yes" && item.answer !== "no") || items[0] || null;
    const seededSection = {
      sectionTitle: "A few quick checks",
      items,
      required,
      questionCount: totalQuestions,
      unresolvedCount,
      runtimeState,
      optionalEnrichment,
      topQuickCheckGap: toString(firstUnresolvedItem && (firstUnresolvedItem.targetArea || firstUnresolvedItem.requirementCluster)),
      quickCheckGapType: toString(firstUnresolvedItem && firstUnresolvedItem.quickCheckGapType),
      topQuestion: toString(firstUnresolvedItem && firstUnresolvedItem.question),
      statusText,
    };
    const quickCheckDisplayState = QuickCheckCtaState && typeof QuickCheckCtaState.deriveQuickCheckCtaState === "function"
      ? QuickCheckCtaState.deriveQuickCheckCtaState({
        quickChecksSeededForDisplay: seededSection,
        authoritativeRecommendationState: required && unresolvedCount > 0 ? "confirm_first" : "ready_apply",
        contractRecommendationCtaState: required && unresolvedCount > 0 ? "calibrate" : "apply",
      })
      : null;
    const quickChecksForDisplay = quickCheckDisplayState && quickCheckDisplayState.quickChecksForDisplay
      ? quickCheckDisplayState.quickChecksForDisplay
      : seededSection;
    if (QuickCheckCtaState && typeof QuickCheckCtaState.buildQuickCheckViewModel === "function") {
      return QuickCheckCtaState.buildQuickCheckViewModel({
        quickChecksForDisplay,
        focusLine: "",
        interviewFocus: [],
        likelyChallengeAreas: [],
        uncertaintyFlags: [],
        primaryAxisLabel: "",
        primaryAxisKey: "",
        supportingAxisLabel: "",
        supportingAxisKey: "",
        specificAnchorLabel: "",
        specificAnchorKey: "",
        roleFrameAnchorLabel: "",
        roleFrameAnchorKey: "",
        primaryGapLabel: seededSection.topQuickCheckGap || "",
        primaryGapType: seededSection.quickCheckGapType || "",
        readonlyReason: quickCheckDisplayState && quickCheckDisplayState.quickCheckReadOnlyReason
          ? quickCheckDisplayState.quickCheckReadOnlyReason
          : "",
        lowPriorityAuthoritative: Boolean(
          quickCheckDisplayState && quickCheckDisplayState.quickCheckLowPriorityAuthoritative === true,
        ),
        ctaRequiresCalibration: Boolean(
          quickCheckDisplayState && quickCheckDisplayState.quickCheckCtaRequiresCalibration === true,
        ),
        copyVariant: quickCheckDisplayState && quickCheckDisplayState.quickCheckCopyVariant
          ? quickCheckDisplayState.quickCheckCopyVariant
          : "",
        ctaQuickCheckConsistencyStatus: quickCheckDisplayState && quickCheckDisplayState.quickCheckConsistencyStatus
          ? quickCheckDisplayState.quickCheckConsistencyStatus
          : "",
        hasOptionalQuickCheckNonBlocking: Boolean(
          (quickCheckDisplayState && quickCheckDisplayState.hasOptionalQuickCheckNonBlocking === true)
          || optionalEnrichment,
        ),
        hasRequiredBlockingQuickCheck: Boolean(
          (quickCheckDisplayState && quickCheckDisplayState.hasRequiredBlockingQuickCheck === true)
          || (!optionalEnrichment && items.some((item) => item && item.quickCheckBlocksCta !== false)),
        ),
        ctaStateBeforeOptionalConsistencyGate: quickCheckDisplayState
          && quickCheckDisplayState.resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate
          ? quickCheckDisplayState.resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate
          : (required && unresolvedCount > 0 ? "confirm_first" : "ready_apply"),
        ctaStateAfterOptionalConsistencyGate: quickCheckDisplayState
          && quickCheckDisplayState.resolvedAuthoritativeCtaState
          ? quickCheckDisplayState.resolvedAuthoritativeCtaState
          : (required && unresolvedCount > 0 ? "confirm_first" : "ready_apply"),
        ctaOptionalConsistencyGateApplied: Boolean(
          quickCheckDisplayState && quickCheckDisplayState.shouldApplyOptionalConsistencyGate === true,
        ),
      });
    }
    return seededSection;
  }

  function normalizePositioningHints(data, analysis) {
    const fromAnalysis = asArray(analysis && analysis.positioning_hints)
      .filter((item) => typeof item === "string")
      .map((item) => toString(item))
      .filter(Boolean);
    const fromData = asArray(data && data.positioningHints)
      .filter((item) => typeof item === "string")
      .map((item) => toString(item))
      .filter(Boolean);
    const items = (fromAnalysis.length > 0 ? fromAnalysis : fromData).slice(0, 3);
    return {
      sectionTitle: "How to position yourself",
      items,
    };
  }

  function toViewModelFromEngine(data, analysis, explanation) {
    const recommendation = toApplyRecommendation(data, analysis);
    const score = toScoreNumber(explanation.score);
    const effectiveScore = typeof recommendation.score === "number"
      ? recommendation.score
      : (typeof score === "number" ? Math.round(score) : null);
    const jobFitScore = normalizeJobFitScore(data);
    return {
      matchHeader: {
        sectionTitle: "Apply Recommendation",
        verdictLabel: toApplyBandLabel(recommendation.band),
        score: effectiveScore,
        summary: truncateText(toString(explanation.summary), 190),
      },
      jobFitScore,
      careerInsight: {
        sectionTitle: "Career Insight",
        text: toString(analysis.career_insight || data.careerInsight),
      },
      whyFit: {
        sectionTitle: "Why this role fits your career",
        items: normalizeWhyFitItems(
          analysis.why_fit || data.whyFit,
          normalizeEngineItems(explanation.strengths, 3),
        ),
      },
      potentialRisks: {
        sectionTitle: "Potential career risk",
        items: normalizeRiskItems(
          analysis.potential_risks || data.risks,
          normalizeEngineItems(explanation.risks, 2),
        ),
      },
      quickChecks: normalizeQuickChecks(data, analysis),
      positioning: normalizePositioningHints(data, analysis),
      applyCta: buildApplyCta(data, analysis),
    };
  }

  function toMatchPanelViewModel(data) {
    const analysis = data && data.job_analysis ? data.job_analysis : {};
    const recommendation = toApplyRecommendation(data, analysis);
    const matchExplanation = analysis && analysis.match_explanation ? analysis.match_explanation : null;
    if (hasEngineExplanation(matchExplanation)) {
      return toViewModelFromEngine(data, analysis, matchExplanation);
    }

    const score = typeof recommendation.score === "number"
      ? recommendation.score
      : toScoreNumber(analysis.match_score);
    const capabilities = normalizeCapabilityRows(analysis.top_matched_capabilities);
    const verdictLabel = toApplyBandLabel(recommendation.band) || toVerdictLabel({
          score,
          fitLevel: toString(analysis.fit_level),
        });
    const fallbackWhyFit = buildWhyFitItems(analysis.top_matched_capabilities, analysis.evidence_highlights);
    const fallbackRisks = buildRiskItems(analysis);
    const jobFitScore = normalizeJobFitScore(data);

    return {
      matchHeader: {
        sectionTitle: "Apply Recommendation",
        verdictLabel,
        score: typeof score === "number" ? Math.round(score) : null,
        summary: buildSummarySentence(capabilities),
      },
      jobFitScore,
      careerInsight: {
        sectionTitle: "Career Insight",
        text: toString(analysis.career_insight || data.careerInsight),
      },
      whyFit: {
        sectionTitle: "Why this role fits your career",
        items: normalizeWhyFitItems(
          analysis.why_fit || data.whyFit,
          fallbackWhyFit,
        ),
      },
      potentialRisks: {
        sectionTitle: "Potential career risk",
        items: normalizeRiskItems(
          analysis.potential_risks || data.risks,
          fallbackRisks,
        ),
      },
      quickChecks: normalizeQuickChecks(data, analysis),
      positioning: normalizePositioningHints(data, analysis),
      applyCta: buildApplyCta(data, analysis),
    };
  }

  globalThis.CareerTwinRenderMatchViewModel = {
    toMatchPanelViewModel,
  };
})();
