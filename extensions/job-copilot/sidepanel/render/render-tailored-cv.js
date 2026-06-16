(function initSidepanelRenderTailoredCv() {
  // Owns final recommendation action section.
  const Utils = globalThis.CareerTwinSharedUtils || {};
  const QuickCheckCtaState = globalThis.CareerTwinQuickCheckCtaState || {};

  function toText(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function emitTailoredCvTrace(stage, payload) {
    try {
      console.debug("[CareerTwin][tailored-cv-trace]", {
        stage,
        timestamp: new Date().toISOString(),
        ...(payload && typeof payload === "object" ? payload : {}),
      });
    } catch {
      // no-op
    }
  }

  function isNearDuplicateAngle(primary, supporting) {
    const left = toText(primary).toLowerCase();
    const right = toText(supporting).toLowerCase();
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  }

  function hasQualifierResidue(value) {
    return /\b(preferred|not mandatory|nice to have|desirable|advantageous|bonus)\b/i.test(toText(value));
  }

  function toProofGapPhrase(value) {
    const text = toText(value)
      .replace(/^what we still need to confirm:\s*/i, "")
      .replace(/^need to prove:\s*/i, "")
      .replace(/^positioning fix:\s*/i, "")
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
    if (!text) return "";
    if (/^(none identified|n\/a|unknown)$/i.test(text)) return "";
    if (hasQualifierResidue(text)) return "";
    if (/^(proof|evidence)\b/i.test(text)) return text.toLowerCase();
    return `${text.charAt(0).toLowerCase()}${text.slice(1)}`;
  }

  function toUnlockActionLine(unresolvedProofPhrase) {
    const phrase = toText(unresolvedProofPhrase);
    if (!phrase) {
      return "Confirm one strong role-relevant example tied to decision impact to unlock a stronger CV.";
    }
    if (hasQualifierResidue(phrase) || /^(this role|the role|for this role)\b/i.test(phrase)) {
      return "Confirm one strong role-relevant example tied to decision impact to unlock a stronger CV.";
    }
    return `Confirm one strong example of ${phrase} in practice to unlock a stronger CV.`;
  }

  function toActionBridgeStep(actionBridge, primaryLabel) {
    const cleaned = toText(actionBridge)
      .replace(/^recommended action:\s*/i, "")
      .replace(/^so the right next step is to\s*/i, "")
      .replace(/^next step:\s*/i, "")
      .replace(/[.!?]+$/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (cleaned && !/^(confirm|answer)\b/i.test(cleaned)) {
      return `${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
    }
    const anchor = toText(primaryLabel).replace(/[.!?]+$/g, "");
    if (anchor) return `prepare one concrete ${anchor} story with decision impact`;
    return "prepare one concrete role-relevant story with decision impact";
  }

  function toPrimaryPositioningLabel(header) {
    const contract = header && header.panelJudgmentContract && typeof header.panelJudgmentContract === "object"
      ? header.panelJudgmentContract
      : {};
    const bestEntryAngle = toText(contract.best_entry_angle);
    return bestEntryAngle
      || toText(header.primaryAxisLabel)
      || toText(header.specificAnchorLabel)
      || toText(header.roleFrameAnchorLabel)
      || toText(header.bestPositionLabel)
      || "your recommended angle";
  }

  function toSupportingPositioningLabel(header, primaryLabel) {
    const contract = header && header.panelJudgmentContract && typeof header.panelJudgmentContract === "object"
      ? header.panelJudgmentContract
      : {};
    if (toText(contract.proof_alignment_subject_family)) return "";
    const support = toText(header.supportingAxisLabel);
    if (!support || isNearDuplicateAngle(primaryLabel, support)) return "";
    return support;
  }

  function resolveActionState(viewModel, ctaSection) {
    if (QuickCheckCtaState && typeof QuickCheckCtaState.resolveTailoredCvActionState === "function") {
      return QuickCheckCtaState.resolveTailoredCvActionState(viewModel, ctaSection);
    }
    return ctaSection && ctaSection.enabled ? "ready_apply" : "deprioritize";
  }

  function renderTailoredCv(viewModel) {
    const esc = Utils.escapeHtml || ((v) => String(v || ""));
    const section = viewModel && viewModel.applyCta ? viewModel.applyCta : {};
    const header = viewModel && viewModel.matchHeader && typeof viewModel.matchHeader === "object"
      ? viewModel.matchHeader
      : {};
    const contract = header && header.panelJudgmentContract && typeof header.panelJudgmentContract === "object"
      ? header.panelJudgmentContract
      : {};
    const quickChecks = viewModel && viewModel.quickChecks && typeof viewModel.quickChecks === "object"
      ? viewModel.quickChecks
      : {};
    const quickCheckState = toText(quickChecks.runtimeState);
    const actionState = resolveActionState(viewModel, section);
    const resumePayload = section && section.resumePayload && typeof section.resumePayload === "object"
      ? section.resumePayload
      : null;
    const disabledReasonText = toText(section && section.disabledReason);
    const failedCanApplySubconditions = section && Array.isArray(section.failedCanApplySubconditions)
      ? section.failedCanApplySubconditions
      : [];
    const isApplyActionable = Boolean(
      section
      && section.enabled === true
      && resumePayload
      && !disabledReasonText,
    );
    const effectiveActionState = actionState === "ready_apply" && !isApplyActionable
      ? "needs_more_match_context"
      : actionState;
    const primaryLabel = toPrimaryPositioningLabel(header);
    const supportingLabel = toSupportingPositioningLabel(header, primaryLabel);
    const bestPositionLabel = supportingLabel
      ? `${primaryLabel}, supported by ${supportingLabel}`
      : primaryLabel;
    const sectionTitle = "Recommended Action";
    const unresolvedProof = toText(contract.gate_proof) || toText(quickChecks.topQuickCheckGap) || toText(quickChecks.primaryGapLabel);
    const unresolvedProofPhrase = toProofGapPhrase(unresolvedProof);
    const actionBridgeRaw = toText(contract.action_bridge_statement);
    const internalDebugCopySuppressed = Boolean(
      QuickCheckCtaState
      && typeof QuickCheckCtaState.isInternalDebugActionBridgeCopy === "function"
      && QuickCheckCtaState.isInternalDebugActionBridgeCopy(actionBridgeRaw),
    );
    const actionBridge = internalDebugCopySuppressed ? "" : actionBridgeRaw;

    let subtitle = "";
    let message = "";
    let buttonLabel = "";
    let buttonAttr = "";
    let feedback = "";
    let continuityHint = "";
    let interviewActionHtml = "";

    if (effectiveActionState === "ready_apply") {
      subtitle = "Ready to apply";
      message = actionBridge || `Apply with this positioning: ${bestPositionLabel}.`;
      buttonLabel = "Generate stronger role-fit CV";
      buttonAttr = 'data-ctsp-action="apply-tailored-cv"';
      feedback = section.message || "";
      continuityHint = "Interview continuation is currently gated. Apply with this tailored CV first.";
      const hasInterviewRoute = Boolean(resumePayload && typeof resumePayload.jobSnapshotId === "number" && resumePayload.jobSnapshotId > 0);
      const interviewButtonAttr = "disabled";
      const interviewFeedback = hasInterviewRoute
        ? "Interview continuation is currently gated while we finish the in-product interview path."
        : "Interview continuation is currently gated for this role right now.";
      interviewActionHtml = `
        <button
          type="button"
          class="ctsp-download-btn"
          ${interviewButtonAttr}
        >
          Interview prep currently gated
        </button>
        <p class="ctsp-cta-feedback" data-ctsp-action="interview-feedback">${esc(interviewFeedback)}</p>
      `;
    } else if (effectiveActionState === "confirm_first") {
      subtitle = "Needs one proof first";
      const blockerLine = toUnlockActionLine(unresolvedProofPhrase);
      const bridgeStep = toActionBridgeStep(actionBridge, primaryLabel);
      const unresolvedCount = Number.isFinite(Number(quickChecks.unresolvedCount))
        ? Math.max(0, Math.round(Number(quickChecks.unresolvedCount)))
        : 0;
      if (quickCheckState === "quick_check_pending") {
        message = `${blockerLine} Then ${bridgeStep}.`;
        buttonLabel = "Confirm one proof first";
      } else {
        message = `${blockerLine} Then ${bridgeStep}.`;
        buttonLabel = "Confirm one proof first";
      }
      buttonAttr = "disabled";
      feedback = "";
      continuityHint = unresolvedCount > 0
        ? "After confirmation, tailor your CV around that same proof."
        : "Then tailor your CV around that same proof.";
    } else if (effectiveActionState === "needs_more_match_context") {
      subtitle = "Needs more match context";
      message = disabledReasonText || "Tailored CV becomes available once this job has enough match context.";
      buttonLabel = "Generate stronger role-fit CV";
      buttonAttr = "disabled";
      feedback = disabledReasonText || "Tailored CV is not yet available for this role.";
      continuityHint = "We will unlock this once your role-match context is complete.";
    } else {
      subtitle = "Low priority for now";
      message = "With current evidence and role framing, this role is not worth prioritizing right now.";
      buttonLabel = "Deprioritize this role";
      buttonAttr = "disabled";
      feedback = section.disabledReason || "Focus effort on roles that better fit your trajectory and positioning.";
      continuityHint = "When you choose a better-fit role, we can continue with interview prep next.";
    }

    const hasDisabledAttribute = /\bdisabled\b/i.test(buttonAttr);
    const actionAttrMatch = buttonAttr.match(/data-ctsp-action="([^"]+)"/i);
    emitTailoredCvTrace("render_tailored_cv_template", {
      rendered_template: effectiveActionState || null,
      source_recommendation_action_state: actionState || null,
      recommendation_action_state: toText(contract.recommendation_action_state) || null,
      visible_title: subtitle || null,
      helper_copy: feedback || null,
      button_label: buttonLabel || null,
      button_disabled: hasDisabledAttribute,
      intended_disabled_flag: hasDisabledAttribute,
      intended_data_ctsp_action: actionAttrMatch ? actionAttrMatch[1] : null,
      rendered_disabled_attribute: hasDisabledAttribute,
      rendered_disabled_reason: feedback || null,
      disabled_reason: disabledReasonText || null,
      applyCta_enabled: section && typeof section.enabled === "boolean" ? section.enabled : null,
      applyCta_resumePayload_present: Boolean(resumePayload),
      applyCta_disabledReason: disabledReasonText || null,
      apply_actionable: isApplyActionable,
      failed_canApply_subconditions: failedCanApplySubconditions,
      cta_internal_debug_copy_suppressed: internalDebugCopySuppressed,
      section_mode: effectiveActionState || null,
    });

    return `
      <section class="ctsp-card ctsp-apply-section">
        <h2>${esc(sectionTitle)}</h2>
        <p class="ctsp-note">${esc(subtitle)}</p>
        <p class="ctsp-apply-value">${esc(message)}</p>

        <button
          type="button"
          class="ctsp-download-btn"
          ${buttonAttr}
        >
          ${esc(buttonLabel)}
        </button>

        ${feedback
      ? `
        <p class="ctsp-cta-feedback" data-ctsp-action="apply-feedback">
          ${esc(feedback)}
        </p>
        `
      : ""}
        ${interviewActionHtml}
        <p class="ctsp-apply-continuation">${esc(continuityHint)}</p>
      </section>
    `;
  }

  globalThis.CareerTwinRenderTailoredCv = {
    renderTailoredCv,
  };
})();
