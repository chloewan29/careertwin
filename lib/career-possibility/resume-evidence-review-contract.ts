import type {
  EvidenceCapabilityRelationship,
  EvidenceReviewStatus,
  ResumeEvidenceBundle,
  ResumeEvidenceOutcome,
} from "./resume-evidence-contract";
import type { CareerMapCapabilityDefinition } from "./reviewed-resume-evidence-map-adapter";

export const RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION = "1.0.0" as const;

export type ResumeEvidenceReviewSessionStatus = "not_started" | "in_progress" | "completed";
export type ResumeEvidenceReviewActor = "user";
export type ResumeEvidenceReviewAction = "confirm" | "edit" | "reject" | "restore" | "remap" | CreateCapabilityMappingReviewDecision["action"];
export type EmploymentReviewField = "employerName" | "roleTitle" | "startDate" | "endDate" | "location";
export type EvidenceReviewField = "displayText" | "action" | "context" | "outcome";

type DecisionIdentity = {
  id: string;
  sequence: number;
  actor: ResumeEvidenceReviewActor;
  priorDecisionId?: string;
  reason?: string;
  /** Non-semantic metadata; explicit sequence alone controls replay order. */
  createdAt?: string;
};

type DecisionBase = DecisionIdentity & {
  targetId: string;
  expectedReviewStatus?: EvidenceReviewStatus;
};

type ReviewOnlyAction = "confirm" | "reject" | "restore";

export type EmploymentFieldReviewDecision = DecisionBase & {
  targetType: "employment_field";
  field: EmploymentReviewField;
} & (
  | { action: ReviewOnlyAction }
  | { action: "edit"; value: string; sourceSpanIds: string[] }
);

export type EvidenceRecordReviewDecision = DecisionBase & {
  targetType: "evidence_record";
  action: ReviewOnlyAction;
};

export type EvidenceFieldReviewDecision = DecisionBase & {
  targetType: "evidence_field";
  field: EvidenceReviewField;
} & (
  | { action: ReviewOnlyAction }
  | { action: "edit"; value: string; sourceSpanIds: string[]; field: "displayText" | "action" | "context" }
  | { action: "edit"; value: ResumeEvidenceOutcome; sourceSpanIds: string[]; field: "outcome" }
);

export type CapabilityMappingReviewDecision = DecisionBase & {
  targetType: "capability_mapping";
} & (
  | { action: ReviewOnlyAction }
  | {
      action: "remap";
      newMappingId: string;
      capabilityId: string;
      relationship: Exclude<EvidenceCapabilityRelationship, "possible">;
      sourceSpanIds: string[];
      rationale?: string;
    }
);

export type CreateCapabilityMappingReviewDecision = DecisionIdentity & {
  targetType: "evidence_capability_mapping";
  action: "create";
  /** Creation targets evidence; a nonexistent mapping target is forbidden. */
  targetId?: undefined;
  targetEvidenceId: string;
  newMappingId: string;
  capabilityId: string;
  relationship: Exclude<EvidenceCapabilityRelationship, "possible">;
  sourceSpanIds: string[];
  expectedEvidenceReviewStatus: Extract<EvidenceReviewStatus, "confirmed" | "edited">;
  expectedMappingState: "absent";
  rationale?: string;
};

export type InterpretationReviewDecision = DecisionBase & {
  targetType: "interpretation";
} & (
  | { action: ReviewOnlyAction }
  | { action: "edit"; newInterpretationId: string; text: string; sourceSpanIds: string[] }
);

/** Decisions are the complete revision history over an immutable extraction bundle. */
export type ResumeEvidenceReviewDecision =
  | EmploymentFieldReviewDecision
  | EvidenceRecordReviewDecision
  | EvidenceFieldReviewDecision
  | CapabilityMappingReviewDecision
  | CreateCapabilityMappingReviewDecision
  | InterpretationReviewDecision;

export type ResumeEvidenceReviewSession = {
  schemaVersion: typeof RESUME_EVIDENCE_REVIEW_SCHEMA_VERSION;
  id: string;
  sourceBundleId: string;
  sourceSchemaVersion: string;
  capabilityDefinitionVersion: string;
  status: ResumeEvidenceReviewSessionStatus;
  decisions: ResumeEvidenceReviewDecision[];
  warnings: string[];
};

export type ResumeEvidenceReviewIssueSeverity = "error" | "warning" | "info";
export type ResumeEvidenceReviewIssue = {
  code: string;
  path: string;
  /** Messages identify contract entities only and must never expose résumé content. */
  message: string;
  severity: ResumeEvidenceReviewIssueSeverity;
};

export type ApplyResumeEvidenceReviewInput = {
  bundle: ResumeEvidenceBundle;
  session: ResumeEvidenceReviewSession;
  capabilityDefinitions: readonly CareerMapCapabilityDefinition[];
  capabilityDefinitionVersion: string;
};

export type ApplyResumeEvidenceReviewResult =
  | {
      ok: true;
      reviewedBundle: ResumeEvidenceBundle;
      session: ResumeEvidenceReviewSession;
      warnings: ResumeEvidenceReviewIssue[];
    }
  | { ok: false; issues: ResumeEvidenceReviewIssue[] };
