(function initSidepanelQuickCheckCtaState() {
  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function hasText(value) {
    return toText(value).length > 0;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function toQuickCheckGroupKey(item) {
    const requirementCluster = toText(
      item && (
        item.requirement_cluster
        || item.requirementCluster
        || item.source_requirement_id
        || item.sourceRequirementId
      ),
    );
    if (requirementCluster) return requirementCluster;
    const id = toText(item && item.id);
    const pairMatch = id.match(/^(.*)_q[12]$/i);
    return pairMatch ? pairMatch[1] : id;
  }

  function toCalibrationAnswerMap(rawAnswers) {
    if (rawAnswers instanceof Map) return rawAnswers;
    return new Map(
      asArray(rawAnswers)
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const questionId = toText(item.question_id || item.questionId);
          const answer = toText(item.answer).toLowerCase();
          if (!questionId || (answer !== "yes" && answer !== "no")) return null;
          return [questionId, answer];
        })
        .filter(Boolean),
    );
  }

  function normalizeQuickCheckItems(source, calibrationAnswers) {
    const calibrationAnswerMap = toCalibrationAnswerMap(calibrationAnswers);
    return asArray(source)
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const id = toText(item.id);
        const question = toText(item.question);
        if (!id || !question) return null;
        const answerRaw = toText(item.answer).toLowerCase();
        const fallbackAnswer = calibrationAnswerMap.get(id);
        const answer = answerRaw === "yes" || answerRaw === "no"
          ? answerRaw
          : (fallbackAnswer === "yes" || fallbackAnswer === "no" ? fallbackAnswer : null);
        const quickCheckBlocksCtaRaw = item.quick_check_blocks_cta;
        const quickCheckBlocksCtaAltRaw = item.quickCheckBlocksCta;
        return {
          id,
          question,
          answer,
          importance: toText(item.importance).toLowerCase(),
          requirementCluster: toText(
            item.requirement_cluster
            || item.requirementCluster
            || item.source_requirement_id
            || item.sourceRequirementId,
          ),
          targetArea: toText(item.target_area || item.targetArea),
          quickCheckGapType: toText(item.quick_check_gap_type || item.quickCheckGapType),
          questionPurpose: toText(item.question_purpose || item.questionPurpose),
          memoryTarget: toText(item.memory_target || item.memoryTarget),
          quickCheckKind: toText(item.quick_check_kind || item.quickCheckKind),
          quickCheckBlocksCta: quickCheckBlocksCtaRaw === false || quickCheckBlocksCtaAltRaw === false
            ? false
            : true,
          quickCheckSource: toText(item.quick_check_source || item.quickCheckSource),
          quickCheckSuppressionBypassReason: toText(
            item.quick_check_suppression_bypass_reason || item.quickCheckSuppressionBypassReason,
          ),
          groupKey: toQuickCheckGroupKey(item),
        };
      })
      .filter(Boolean);
  }

  function deriveQuickCheckRuntimeState(required, questionCount, unresolvedCount, optionalEnrichment) {
    if (optionalEnrichment && questionCount > 0) return "quick_check_optional_enrichment";
    if (!required) return "quick_check_not_required";
    if (questionCount <= 0) return "quick_check_pending";
    if (unresolvedCount > 0) return "quick_check_pending";
    return "quick_check_available";
  }

  function normalizeQuickCheckState(options) {
    const items = normalizeQuickCheckItems(
      options && options.source,
      options && options.calibrationAnswers,
    );
    const calibrationRequired = options && typeof options.calibrationRequired === "boolean"
      ? options.calibrationRequired
      : null;
    const questionCount = items.length;
    const unresolvedCount = items.filter((item) => item.answer !== "yes" && item.answer !== "no").length;
    const hasOptionalEnrichment = items.some((item) =>
      toText(item.quickCheckKind) === "optional_enrichment" || item.quickCheckBlocksCta === false,
    );
    const required = typeof calibrationRequired === "boolean"
      ? calibrationRequired
      : questionCount > 0;
    const runtimeState = deriveQuickCheckRuntimeState(
      required,
      questionCount,
      unresolvedCount,
      hasOptionalEnrichment,
    );
    return {
      items,
      required,
      questionCount,
      unresolvedCount,
      runtimeState,
      hasOptionalEnrichment,
      optionalEnrichment: hasOptionalEnrichment && runtimeState === "quick_check_optional_enrichment",
    };
  }

  function hasUnresolvedQuickChecks(viewModel) {
    const quickChecks = viewModel && viewModel.quickChecks && typeof viewModel.quickChecks === "object"
      ? viewModel.quickChecks
      : {};
    const runtimeState = toText(quickChecks.runtimeState);
    const optionalEnrichment = Boolean(quickChecks.optionalEnrichment === true || runtimeState === "quick_check_optional_enrichment");
    if (optionalEnrichment) return false;
    if (runtimeState === "quick_check_pending") return true;
    if (runtimeState === "quick_check_not_required" || runtimeState === "quick_check_available") return false;
    const unresolvedCountRaw = Number(quickChecks.unresolvedCount);
    if (Number.isFinite(unresolvedCountRaw)) {
      return Math.max(0, Math.round(unresolvedCountRaw)) > 0;
    }
    const items = asArray(quickChecks.items);
    return items.some((item) => item && item.answer !== "yes" && item.answer !== "no");
  }

  function hasRequiredBlockingQuickChecks(viewModel) {
    const quickChecks = viewModel && viewModel.quickChecks && typeof viewModel.quickChecks === "object"
      ? viewModel.quickChecks
      : {};
    const items = asArray(quickChecks.items);
    const runtimeState = toText(quickChecks.runtimeState);
    if (runtimeState === "quick_check_optional_enrichment" || quickChecks.optionalEnrichment === true) {
      return false;
    }
    return items.some((item) => {
      if (!item || typeof item !== "object") return false;
      const explicitOptional = item.quickCheckBlocksCta === false
        || item.quick_check_blocks_cta === false
        || toText(item.quickCheckKind) === "optional_enrichment";
      if (explicitOptional) return false;
      return true;
    });
  }

  function isOptionalQuickCheckNonBlocking(viewModel) {
    const quickChecks = viewModel && viewModel.quickChecks && typeof viewModel.quickChecks === "object"
      ? viewModel.quickChecks
      : {};
    const runtimeState = toText(quickChecks.runtimeState);
    const items = asArray(quickChecks.items);
    if (quickChecks.optionalEnrichment === true || runtimeState === "quick_check_optional_enrichment") return true;
    return items.some((item) => item && (
      item.quickCheckBlocksCta === false
      || item.quick_check_blocks_cta === false
      || toText(item.quickCheckKind) === "optional_enrichment"
    ));
  }

  function shouldHoldForRoleNativeProof(viewModel) {
    const header = viewModel && viewModel.matchHeader && typeof viewModel.matchHeader === "object"
      ? viewModel.matchHeader
      : {};
    const contract = header && header.panelJudgmentContract && typeof header.panelJudgmentContract === "object"
      ? header.panelJudgmentContract
      : {};
    const selector = contract && contract.entry_angle_selector && typeof contract.entry_angle_selector === "object"
      ? contract.entry_angle_selector
      : {};
    const dominantUsage = toText(selector.dominant_axis_usage);
    const roleFirstSensitive = dominantUsage === "downweighted" || dominantUsage === "supporting";
    if (!roleFirstSensitive) return false;
    const quickChecks = viewModel && viewModel.quickChecks && typeof viewModel.quickChecks === "object"
      ? viewModel.quickChecks
      : {};
    const runtimeState = toText(quickChecks.runtimeState);
    const unresolvedCountRaw = Number(quickChecks.unresolvedCount);
    const unresolvedCount = Number.isFinite(unresolvedCountRaw) ? Math.max(0, Math.round(unresolvedCountRaw)) : 0;
    const items = asArray(quickChecks.items);
    const hasConfirmedProof = items.some((item) => item && item.answer === "yes");
    const hasUnansweredProof = runtimeState === "quick_check_pending"
      ? true
      : runtimeState === "quick_check_not_required"
        ? false
        : runtimeState === "quick_check_available"
          ? unresolvedCount > 0
          : (items.length === 0 || items.some((item) => item && item.answer !== "yes" && item.answer !== "no"));
    const unresolvedProof = toText(contract.gate_proof) || toText(quickChecks.topQuickCheckGap) || toText(quickChecks.primaryGapLabel);
    return Boolean(unresolvedProof && !hasConfirmedProof && hasUnansweredProof);
  }

  function resolveTailoredCvActionState(viewModel, ctaSection) {
    const header = viewModel && viewModel.matchHeader && typeof viewModel.matchHeader === "object"
      ? viewModel.matchHeader
      : {};
    const contract = header && header.panelJudgmentContract && typeof header.panelJudgmentContract === "object"
      ? header.panelJudgmentContract
      : {};
    const optionalQuickCheckNonBlocking = isOptionalQuickCheckNonBlocking(viewModel);
    const hasBlockingRequiredQuickChecks = hasRequiredBlockingQuickChecks(viewModel);
    const authoritativeState = toText(contract.recommendation_action_state);
    if (authoritativeState === "deprioritize") return "deprioritize";
    if (optionalQuickCheckNonBlocking && !hasBlockingRequiredQuickChecks) {
      return ctaSection && ctaSection.enabled ? "ready_apply" : "needs_more_match_context";
    }
    if (authoritativeState === "ready_apply" || authoritativeState === "confirm_first" || authoritativeState === "deprioritize") {
      return authoritativeState;
    }
    if (hasUnresolvedQuickChecks(viewModel)) return "confirm_first";
    if (shouldHoldForRoleNativeProof(viewModel)) return "confirm_first";
    if (ctaSection && ctaSection.enabled) return "ready_apply";
    return "deprioritize";
  }

  function deriveQuickCheckCtaState(options) {
    const quickChecksSeededForDisplay = options && options.quickChecksSeededForDisplay && typeof options.quickChecksSeededForDisplay === "object"
      ? options.quickChecksSeededForDisplay
      : {};
    const authoritativeRecommendationState = toText(options && options.authoritativeRecommendationState);
    const contractRecommendationCtaState = toText(options && options.contractRecommendationCtaState);
    const regulatedSafetySurfaceContext = Boolean(options && options.regulatedSafetySurfaceContext);
    const shouldLiftConfirmFirstAfterSave = Boolean(options && options.shouldLiftConfirmFirstAfterSave);

    const resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate = regulatedSafetySurfaceContext
      && toText(quickChecksSeededForDisplay.runtimeState) === "quick_check_pending"
      ? "confirm_first"
      : shouldLiftConfirmFirstAfterSave
        ? "ready_apply"
        : authoritativeRecommendationState;
    const quickCheckSeedItemsForConsistency = asArray(quickChecksSeededForDisplay.items)
      .filter((item) => item && typeof item === "object");
    const hasOptionalQuickCheckNonBlocking = Boolean(
      quickChecksSeededForDisplay.optionalEnrichment === true
      || toText(quickChecksSeededForDisplay.runtimeState) === "quick_check_optional_enrichment"
      || quickCheckSeedItemsForConsistency.some((item) =>
        toText(item && item.quickCheckKind) === "optional_enrichment"
        || item.quickCheckBlocksCta === false
        || item.quick_check_blocks_cta === false
      )
    );
    const hasRequiredBlockingQuickCheck = quickCheckSeedItemsForConsistency.some((item) => {
      const quickCheckKind = toText(item && item.quickCheckKind);
      const explicitOptional = quickCheckKind === "optional_enrichment"
        || item.quickCheckBlocksCta === false
        || item.quick_check_blocks_cta === false;
      if (explicitOptional) return false;
      return quickCheckKind === "required" || quickCheckKind === "";
    });
    const ctaStateRequestsCalibration = resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate === "confirm_first"
      || authoritativeRecommendationState === "confirm_first"
      || contractRecommendationCtaState === "calibrate"
      || contractRecommendationCtaState === "hold";
    const shouldApplyOptionalConsistencyGate = hasOptionalQuickCheckNonBlocking
      && !hasRequiredBlockingQuickCheck
      && resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate !== "deprioritize"
      && ctaStateRequestsCalibration;
    const resolvedAuthoritativeCtaState = shouldApplyOptionalConsistencyGate
      ? "ready_apply"
      : resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate;
    const rawContractRecommendationCtaStateForDisplay = shouldApplyOptionalConsistencyGate
      ? "apply"
      : contractRecommendationCtaState;
    const quickCheckRuntimeStateBeforeDeprioritizeGate = toText(quickChecksSeededForDisplay.runtimeState);
    const quickCheckCanonicalItemsBeforeDeprioritizeGate = asArray(quickChecksSeededForDisplay.items)
      .filter((item) => item && typeof item === "object");
    const deprioritizeQuickCheckException = Boolean(
      quickChecksSeededForDisplay.deprioritizeButRecoverableWithKeyProof === true
      || toText(quickChecksSeededForDisplay.quickCheckExceptionKind) === "reconsideration"
    );
    const quickChecksForDisplay = (() => {
      if (resolvedAuthoritativeCtaState !== "deprioritize" || deprioritizeQuickCheckException) {
        return quickChecksSeededForDisplay;
      }
      const originalQuestionCount = Number(quickChecksSeededForDisplay.questionCount);
      const safeOriginalQuestionCount = Number.isFinite(originalQuestionCount)
        ? originalQuestionCount
        : quickCheckCanonicalItemsBeforeDeprioritizeGate.length;
      return {
        ...quickChecksSeededForDisplay,
        required: false,
        runtimeState: "quick_check_suppressed_deprioritized",
        items: [],
        unresolvedCount: 0,
        questionCount: 0,
        quickcheckSuppressedByDeprioritize: true,
        quickcheckSuppressionReason: "authoritative_deprioritize",
        quickcheckRuntimeStateBefore: quickCheckRuntimeStateBeforeDeprioritizeGate || null,
        quickcheckRuntimeStateAfter: "quick_check_suppressed_deprioritized",
        quickcheckOriginalQuestionsCount: safeOriginalQuestionCount,
        quickcheckOriginalCanonicalItemsCount: quickCheckCanonicalItemsBeforeDeprioritizeGate.length,
      };
    })();
    const quickCheckRuntimeStateForDisplay = toText(quickChecksForDisplay.runtimeState);
    const quickCheckCanonicalItemsForDisplay = asArray(quickChecksForDisplay.items)
      .filter((item) => item && typeof item === "object");
    const quickCheckHasCanonicalItemsForDisplay = quickCheckCanonicalItemsForDisplay.length > 0;
    const quickCheckLowPriorityAuthoritative = resolvedAuthoritativeCtaState === "deprioritize";
    const quickCheckCtaRequiresCalibration = resolvedAuthoritativeCtaState === "confirm_first";
    const quickCheckReadOnlyForDisplay = quickCheckRuntimeStateForDisplay === "quick_check_not_required"
      || !quickCheckHasCanonicalItemsForDisplay;
    const quickCheckReadOnlyReason = (() => {
      if (!quickCheckReadOnlyForDisplay) return "";
      if (quickCheckLowPriorityAuthoritative) return "authoritative_low_priority";
      if (quickCheckCtaRequiresCalibration) return "calibration_required_missing_questions";
      if (quickCheckRuntimeStateForDisplay === "quick_check_not_required") return "not_required_policy";
      if (!quickCheckHasCanonicalItemsForDisplay) return "canonical_items_missing";
      return "read_only_other";
    })();
    const quickCheckCopyVariant = quickCheckLowPriorityAuthoritative
      ? "low_priority"
      : quickCheckCtaRequiresCalibration
        ? "calibration_gap_readonly"
        : quickCheckRuntimeStateForDisplay === "quick_check_not_required"
          ? "not_required_neutral"
          : "readonly_neutral";
    const quickCheckConsistencyStatus = quickCheckReadOnlyForDisplay
      ? (quickCheckLowPriorityAuthoritative
        ? "consistent_low_priority"
        : quickCheckCtaRequiresCalibration
          ? "inconsistent_cta_requires_calibration_but_quickcheck_readonly"
          : "consistent_not_required")
      : shouldApplyOptionalConsistencyGate
        ? "consistent_optional_enrichment_non_blocking"
        : "interactive";

    return {
      resolvedAuthoritativeCtaStateBeforeOptionalConsistencyGate,
      hasOptionalQuickCheckNonBlocking,
      hasRequiredBlockingQuickCheck,
      ctaStateRequestsCalibration,
      shouldApplyOptionalConsistencyGate,
      resolvedAuthoritativeCtaState,
      rawContractRecommendationCtaStateForDisplay,
      quickChecksForDisplay,
      quickCheckLowPriorityAuthoritative,
      quickCheckCtaRequiresCalibration,
      quickCheckReadOnlyReason,
      quickCheckCopyVariant,
      quickCheckConsistencyStatus,
    };
  }

  function deriveQuickCheckRenderState(section, recommendationState) {
    const runtimeState = toText(section && section.runtimeState);
    const canonicalItems = asArray(section && section.items);
    const hasCanonicalItems = canonicalItems.length > 0;
    const renderReadOnlyState = runtimeState === "quick_check_not_required" || !hasCanonicalItems;
    return {
      runtimeState,
      canonicalItems,
      hasCanonicalItems,
      renderReadOnlyState,
      readOnlyReason: toText(section && section.readonlyReason),
      lowPriorityAuthoritative: Boolean(
        (section && section.lowPriorityAuthoritative === true)
        || toText(recommendationState) === "deprioritize"
      ),
      ctaRequiresCalibration: Boolean(section && section.ctaRequiresCalibration === true),
      copyVariant: toText(section && section.copyVariant),
      ctaQuickCheckConsistencyStatus: toText(section && section.ctaQuickCheckConsistencyStatus),
      optionalEnrichment: Boolean(
        (section && section.optionalEnrichment === true)
        || runtimeState === "quick_check_optional_enrichment"
      ),
    };
  }

  function normalizeAreaLabel(value) {
    return toText(value)
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function toProofTargetPhrase(section) {
    const contract = section && section.panelJudgmentContract && typeof section.panelJudgmentContract === "object"
      ? section.panelJudgmentContract
      : null;
    const raw = toText(contract && contract.gate_proof)
      || toText(section && section.topQuickCheckGap)
      || toText(section && section.primaryGapLabel)
      || toText(contract && contract.gate_proof_focus_line);
    if (isInternalDebugActionBridgeCopy(raw)) {
      return "role-relevant decision impact";
    }
    const cleaned = raw
      .replace(/^what we still need to confirm:\s*/i, "")
      .replace(/^need to prove:\s*/i, "")
      .replace(/^direct proof of\s+/i, "")
      .replace(/^direct proof in\s+/i, "")
      .replace(/^no direct\s+/i, "")
      .replace(/^no explicit\s+/i, "")
      .replace(/^no\s+/i, "")
      .replace(/^lack of explicit\s+/i, "")
      .replace(/^lack of\s+/i, "")
      .replace(/^missing\s+/i, "")
      .replace(/\b(preferred but not mandatory|preferred|not mandatory|nice to have|desirable|advantageous|bonus)\b/gi, "")
      .replace(/[.!?]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (!cleaned || /^(none identified|n\/a|unknown)$/i.test(cleaned)) {
      return "role-relevant decision impact";
    }
    return cleaned;
  }

  function toGapLabel(section) {
    const fromTarget = toText(toProofTargetPhrase(section));
    if (fromTarget) return fromTarget;
    const fromTopGap = toText(section && section.topQuickCheckGap);
    if (fromTopGap && !isInternalDebugActionBridgeCopy(fromTopGap)) return fromTopGap;
    return "the main unresolved role proof";
  }

  function toQuickCheckPair(section) {
    const items = asArray(section && section.items);
    const gapRaw = toGapLabel(section);
    const gap = gapRaw.replace(/[.!?]+$/g, "");
    const gapType = normalizeAreaLabel(section && section.quickCheckGapType);
    const gapNorm = normalizeAreaLabel(gap);
    const id1 = toText(items[0] && items[0].id) || `qc_${gapNorm.replace(/\s+/g, "_") || "main_gap"}_q1`;
    const id2 = toText(items[1] && items[1].id)
      || (/_q1$/i.test(id1) ? id1.replace(/_q1$/i, "_q2") : `${id1}_q2`);
    const answer1Raw = toText(items[0] && items[0].answer).toLowerCase();
    const answer2Raw = toText(items[1] && items[1].answer).toLowerCase();
    const answer1 = answer1Raw === "yes" || answer1Raw === "no" ? answer1Raw : null;
    const answer2 = answer2Raw === "yes" || answer2Raw === "no" ? answer2Raw : null;

    let q1 = `Have you directly delivered ${gap} in a comparable role context?`;
    let q2 = `Did your ${gap} work materially change a final decision, priority, or outcome?`;

    if (/(financial crime|fraud|compliance|risk|regulated|rail safety|safety|policy)/.test(gapNorm)) {
      q1 = `Have you worked directly with ${gap} teams or operating requirements?`;
      q2 = `Did your analysis influence a control, investigation, alerting, or risk-prioritisation decision in ${gap}?`;
    } else if (/(experiment|experimentation|cro|conversion|a b test|ab test|test)/.test(gapNorm) || gapType === "experimentation_depth") {
      q1 = `Have you led an experiment or test tied to ${gap}?`;
      q2 = `Did you define the success metric or final recommendation for that ${gap} experiment?`;
    } else if (/(ai|workflow|automation|claude|clay)/.test(gapNorm)) {
      q1 = `Have you built or owned an AI-enabled workflow for ${gap}?`;
      q2 = `Did that ${gap} workflow create a measurable improvement in speed, quality, cost, or decision-making?`;
    } else if (/(operations|systems|platform|hubspot|salesforce)/.test(gapNorm)) {
      q1 = `Have you owned the system or operating process for ${gap}, not only contributed analysis?`;
      q2 = `Did your ${gap} ownership change execution rhythm, accountability, or commercial outcomes?`;
    } else if (gapType === "analytics_translation") {
      q1 = `Have you translated ${gap} into recommendations for non-technical decision-makers?`;
      q2 = `Were those ${gap} recommendations used to make a final business decision?`;
    }

    return [
      { id: id1, question: q1, answer: answer1 },
      { id: id2, question: q2, answer: answer2 },
    ];
  }

  function buildQuickCheckRenderModel(section, recommendationState) {
    const renderState = deriveQuickCheckRenderState(section, recommendationState);
    const runtimeState = toText(section && section.runtimeState);
    const canonicalItems = asArray(section && section.items);
    const renderReadOnlyState = Boolean(renderState && renderState.renderReadOnlyState === true);
    const readOnlyReason = toText(renderState && renderState.readOnlyReason);
    const lowPriorityAuthoritative = Boolean(renderState && renderState.lowPriorityAuthoritative === true);
    const ctaRequiresCalibration = Boolean(renderState && renderState.ctaRequiresCalibration === true);
    const copyVariant = toText(renderState && renderState.copyVariant);
    const ctaQuickCheckConsistencyStatus = toText(renderState && renderState.ctaQuickCheckConsistencyStatus);
    const optionalEnrichment = Boolean(renderState && renderState.optionalEnrichment === true);
    const interactiveItems = renderReadOnlyState
      ? []
      : optionalEnrichment
        ? canonicalItems
          .slice(0, 1)
          .map((item) => ({
            id: toText(item && item.id),
            question: toText(item && item.question),
            answer: toText(item && item.answer).toLowerCase() === "yes"
              ? "yes"
              : (toText(item && item.answer).toLowerCase() === "no" ? "no" : null),
          }))
          .filter((item) => item.id && item.question)
        : toQuickCheckPair(section);
    const readOnlyTitle = "No quick check needed right now.";
    const readOnlyMessage = (() => {
      if (lowPriorityAuthoritative) {
        return "This role is currently low priority based on the available evidence.";
      }
      if (readOnlyReason === "calibration_required_missing_questions" || ctaRequiresCalibration) {
        return "This role still has a proof gap, but no calibration question is available for this run.";
      }
      if (readOnlyReason === "canonical_items_missing") {
        return "No calibration question is available for this run.";
      }
      return "No quick check is needed right now.";
    })();
    return {
      runtimeState,
      canonicalItems,
      renderReadOnlyState,
      readOnlyReason,
      lowPriorityAuthoritative,
      ctaRequiresCalibration,
      copyVariant,
      ctaQuickCheckConsistencyStatus,
      optionalEnrichment,
      interactiveItems,
      readOnlyTitle,
      readOnlyMessage,
      introText: optionalEnrichment ? "Optional: strengthen this role" : "To confirm the main gap:",
      supportText: optionalEnrichment ? "This check is optional and does not block applying." : "",
    };
  }

  function buildQuickCheckViewModel(options) {
    const quickChecksForDisplay = options && options.quickChecksForDisplay && typeof options.quickChecksForDisplay === "object"
      ? options.quickChecksForDisplay
      : {};
    return {
      ...quickChecksForDisplay,
      focusLine: toText(options && options.focusLine),
      interviewFocus: asArray(options && options.interviewFocus).map((item) => toText(item)).filter(Boolean),
      likelyChallengeAreas: asArray(options && options.likelyChallengeAreas).map((item) => toText(item)).filter(Boolean),
      uncertaintyFlags: asArray(options && options.uncertaintyFlags).map((item) => toText(item)).filter(Boolean),
      primaryAxisLabel: toText(options && options.primaryAxisLabel),
      primaryAxisKey: toText(options && options.primaryAxisKey),
      supportingAxisLabel: toText(options && options.supportingAxisLabel),
      supportingAxisKey: toText(options && options.supportingAxisKey),
      specificAnchorLabel: toText(options && options.specificAnchorLabel),
      specificAnchorKey: toText(options && options.specificAnchorKey),
      roleFrameAnchorLabel: toText(options && options.roleFrameAnchorLabel),
      roleFrameAnchorKey: toText(options && options.roleFrameAnchorKey),
      primaryGapLabel: toText(options && options.primaryGapLabel),
      primaryGapType: toText(options && options.primaryGapType),
      readonlyReason: toText(options && options.readonlyReason),
      lowPriorityAuthoritative: Boolean(options && options.lowPriorityAuthoritative === true),
      ctaRequiresCalibration: Boolean(options && options.ctaRequiresCalibration === true),
      copyVariant: toText(options && options.copyVariant),
      ctaQuickCheckConsistencyStatus: toText(options && options.ctaQuickCheckConsistencyStatus),
      panelJudgmentContract: options && options.panelJudgmentContract && typeof options.panelJudgmentContract === "object"
        ? options.panelJudgmentContract
        : null,
      quickcheckSuppressedByDeprioritize: Boolean(
        quickChecksForDisplay && quickChecksForDisplay.quickcheckSuppressedByDeprioritize === true,
      ),
      quickcheckSuppressionReason: toText(quickChecksForDisplay && quickChecksForDisplay.quickcheckSuppressionReason),
      quickcheckRuntimeStateBefore: toText(quickChecksForDisplay && quickChecksForDisplay.quickcheckRuntimeStateBefore),
      quickcheckRuntimeStateAfter: toText(quickChecksForDisplay && quickChecksForDisplay.quickcheckRuntimeStateAfter),
      quickcheckOriginalQuestionsCount: Number.isFinite(Number(quickChecksForDisplay && quickChecksForDisplay.quickcheckOriginalQuestionsCount))
        ? Number(quickChecksForDisplay.quickcheckOriginalQuestionsCount)
        : null,
      quickcheckOriginalCanonicalItemsCount: Number.isFinite(Number(quickChecksForDisplay && quickChecksForDisplay.quickcheckOriginalCanonicalItemsCount))
        ? Number(quickChecksForDisplay.quickcheckOriginalCanonicalItemsCount)
        : null,
      quickCheckKind: Boolean(options && options.hasOptionalQuickCheckNonBlocking === true)
        ? "optional_enrichment"
        : "required_or_unspecified",
      quickCheckBlocksCta: Boolean(options && options.hasRequiredBlockingQuickCheck === true)
        || !Boolean(options && options.hasOptionalQuickCheckNonBlocking === true),
      ctaStateBeforeOptionalConsistencyGate: toText(options && options.ctaStateBeforeOptionalConsistencyGate) || null,
      ctaStateAfterOptionalConsistencyGate: toText(options && options.ctaStateAfterOptionalConsistencyGate) || null,
      ctaOptionalConsistencyGateApplied: Boolean(options && options.ctaOptionalConsistencyGateApplied === true),
    };
  }

  function buildQuickCheckSectionCore(options) {
    const countAxisKeywordHits = options && typeof options.countAxisKeywordHits === "function"
      ? options.countAxisKeywordHits
      : (() => 0);
    const preferredAxisKey = toText(options && options.preferredAxisKey);
    const contractCalibrationQuestions = asArray(options && options.contractCalibrationQuestions)
      .map((item) => toText(item))
      .filter(Boolean);
    const authoritativeQuestionIds = asArray(options && options.authoritativeQuestionIds)
      .map((item) => toText(item))
      .filter(Boolean);
    const authoritativeRequirementCluster = toText(options && options.authoritativeRequirementCluster);
    const normalizedQuickCheckState = normalizeQuickCheckState({
      source: asArray(options && options.source),
      calibrationAnswers: asArray(options && options.calibrationAnswers),
      calibrationRequired: typeof (options && options.calibrationRequired) === "boolean"
        ? options.calibrationRequired
        : null,
    });
    const broadQuickCheckClusters = new Set([
      "stakeholder_embedding",
      "analytics_translation_storytelling",
      "insight_generation_reporting",
      "transformation_enablement",
      "commercial_strategy_planning",
      "customer_cx_insights",
    ]);
    const items = asArray(normalizedQuickCheckState && normalizedQuickCheckState.items)
      .filter((item) => item && typeof item === "object");
    const hasOptionalEnrichment = Boolean(
      normalizedQuickCheckState
      && (
        normalizedQuickCheckState.hasOptionalEnrichment === true
        || normalizedQuickCheckState.optionalEnrichment === true
      )
    );
    const questionCount = Number.isFinite(Number(normalizedQuickCheckState && normalizedQuickCheckState.questionCount))
      ? Number(normalizedQuickCheckState.questionCount)
      : items.length;
    const unresolvedCount = Number.isFinite(Number(normalizedQuickCheckState && normalizedQuickCheckState.unresolvedCount))
      ? Number(normalizedQuickCheckState.unresolvedCount)
      : items.filter((item) => item.answer !== "yes" && item.answer !== "no").length;
    const required = typeof (normalizedQuickCheckState && normalizedQuickCheckState.required) === "boolean"
      ? normalizedQuickCheckState.required
      : questionCount > 0;
    const runtimeState = toText(normalizedQuickCheckState && normalizedQuickCheckState.runtimeState)
      || deriveQuickCheckRuntimeState(required, questionCount, unresolvedCount, hasOptionalEnrichment);
    const normalizedItemQuestionMap = new Map(
      items.map((item) => [toText(item.question).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(), item]),
    );
    const matchedContractQuestionIds = contractCalibrationQuestions
      .map((question) => {
        const normalized = toText(question).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
        if (!normalized) return "";
        const exact = normalizedItemQuestionMap.get(normalized);
        if (exact && hasText(exact.id)) return toText(exact.id);
        const fuzzy = items.find((item) => {
          const candidate = toText(item && item.question).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
          if (!candidate) return false;
          return candidate.includes(normalized) || normalized.includes(candidate);
        });
        return toText(fuzzy && fuzzy.id);
      })
      .filter(Boolean);
    const grouped = new Map();
    items.forEach((item, index) => {
      const key = item.groupKey || item.id || `group_${index}`;
      const existing = grouped.get(key);
      if (!existing) {
        grouped.set(key, {
          key,
          firstIndex: index,
          items: [item],
        });
        return;
      }
      existing.items.push(item);
    });
    const groupedMeta = Array.from(grouped.values()).map((group) => {
      const unresolved = group.items.filter((item) => item.answer !== "yes" && item.answer !== "no");
      const unresolvedCritical = unresolved.filter((item) => item.importance === "critical");
      const axisHits = preferredAxisKey
        ? countAxisKeywordHits(
          group.items.map((item) => [
            toText(item.requirementCluster),
            toText(item.targetArea),
            toText(item.question),
            toText(item.quickCheckGapType),
          ].join(" ")).join(" "),
          preferredAxisKey,
        )
        : 0;
      const representativeCluster = toText(group.items[0] && group.items[0].requirementCluster);
      return {
        key: group.key,
        firstIndex: group.firstIndex,
        totalCount: group.items.length,
        unresolvedCount: unresolved.length,
        unresolvedCriticalCount: unresolvedCritical.length,
        axisHits,
        isBroadCluster: broadQuickCheckClusters.has(representativeCluster),
      };
    });
    const unresolvedGroups = groupedMeta.filter((group) => group.unresolvedCount > 0);
    const baseGroups = unresolvedGroups.length > 0 ? unresolvedGroups : groupedMeta;
    const axisAlignedGroups = preferredAxisKey
      ? baseGroups.filter((group) => group.axisHits > 0)
      : [];
    const rankedGroups = (axisAlignedGroups.length > 0 ? axisAlignedGroups : baseGroups)
      .sort((left, right) => {
        if (right.unresolvedCriticalCount !== left.unresolvedCriticalCount) return right.unresolvedCriticalCount - left.unresolvedCriticalCount;
        if (right.axisHits !== left.axisHits) return right.axisHits - left.axisHits;
        if (right.unresolvedCount !== left.unresolvedCount) return right.unresolvedCount - left.unresolvedCount;
        if (left.isBroadCluster !== right.isBroadCluster) return left.isBroadCluster ? 1 : -1;
        return left.firstIndex - right.firstIndex;
      });
    const authoritativeQuestionIdSet = new Set([
      ...authoritativeQuestionIds,
      ...matchedContractQuestionIds,
    ]);
    const forcedGroupFromQuestionId = authoritativeQuestionIdSet.size > 0
      ? items.find((item) => authoritativeQuestionIdSet.has(item.id))
      : null;
    const forcedGroupFromCluster = authoritativeRequirementCluster
      ? groupedMeta.find((group) => group.key === authoritativeRequirementCluster)
      : null;
    const topGapKey = forcedGroupFromQuestionId
      ? forcedGroupFromQuestionId.groupKey
      : forcedGroupFromCluster
        ? forcedGroupFromCluster.key
        : (rankedGroups[0]
          ? rankedGroups[0].key
          : (items[0] ? items[0].groupKey : ""));
    const focusedItems = topGapKey
      ? items.filter((item) => item.groupKey === topGapKey)
      : items;
    const unresolvedFocused = focusedItems.filter((item) => item.answer !== "yes" && item.answer !== "no");
    const visibleSource = unresolvedFocused.length > 0 ? unresolvedFocused : focusedItems;
    const visible = visibleSource
      .slice(0, 2)
      .map((item) => ({
        id: item.id,
        question: item.question,
        answer: item.answer,
        targetArea: item.targetArea,
        quickCheckGapType: item.quickCheckGapType,
        requirementCluster: item.requirementCluster,
        quickCheckKind: item.quickCheckKind,
        quickCheckBlocksCta: item.quickCheckBlocksCta,
        quickCheckSource: item.quickCheckSource,
        quickCheckSuppressionBypassReason: item.quickCheckSuppressionBypassReason,
      }));
    const confirmedStatements = focusedItems
      .filter((item) => item.answer === "yes")
      .map((item) => item.question)
      .filter(Boolean)
      .slice(0, 3);
    const inferredGapType = focusedItems[0] ? focusedItems[0].quickCheckGapType : "";
    const topQuickCheckGapLabel = focusedItems[0]
      ? (
        broadQuickCheckClusters.has(toText(focusedItems[0].requirementCluster))
          ? toText(focusedItems[0].targetArea || focusedItems[0].requirementCluster)
          : toText(focusedItems[0].requirementCluster)
      )
      : "";
    return {
      normalizedQuickCheckState,
      items,
      focusedItems,
      visible,
      confirmedStatements,
      inferredGapType,
      topQuickCheckGapLabel,
      hasOptionalEnrichment,
      required,
      questionCount,
      unresolvedCount,
      runtimeState,
      optionalEnrichment: typeof (normalizedQuickCheckState && normalizedQuickCheckState.optionalEnrichment) === "boolean"
        ? normalizedQuickCheckState.optionalEnrichment
        : hasOptionalEnrichment && runtimeState === "quick_check_optional_enrichment",
    };
  }

  function isInternalDebugActionBridgeCopy(value) {
    const lower = toText(value).toLowerCase();
    if (!lower) return false;
    return lower.includes("release control downgrade")
      || lower.includes("runtime checks recover")
      || lower.includes("internal debug");
  }

  globalThis.CareerTwinQuickCheckCtaState = {
    normalizeQuickCheckItems,
    normalizeQuickCheckState,
    deriveQuickCheckRuntimeState,
    deriveQuickCheckCtaState,
    deriveQuickCheckRenderState,
    buildQuickCheckRenderModel,
    buildQuickCheckViewModel,
    buildQuickCheckSectionCore,
    hasUnresolvedQuickChecks,
    hasRequiredBlockingQuickChecks,
    isOptionalQuickCheckNonBlocking,
    shouldHoldForRoleNativeProof,
    resolveTailoredCvActionState,
    isInternalDebugActionBridgeCopy,
  };
})();
