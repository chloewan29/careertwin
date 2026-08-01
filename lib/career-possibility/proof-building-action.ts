import type { NextProofToBuild } from "./personal-target-role-comparison";

export const PROOF_BUILDING_ACTION_AUTHORITY_VERSION = "1.0.0" as const;
export const PROOF_BUILDING_ACTION_COPY_VERSION = "1.0.0" as const;

export type ProofBuildingActionAbstentionReason =
  | "missing_next_proof"
  | "blank_capability_id"
  | "blank_capability_label"
  | "unsupported_importance"
  | "blank_expected_evidence"
  | "invalid_input";

export type FindExistingProofAction = Readonly<{
  status: "available";
  category: "find_existing_proof";
  capabilityId: string;
  capabilityLabel: string;
  importance: NextProofToBuild["importance"];
  expectedEvidence: string;
  copy: Readonly<{
    source: "career_twin_platform";
    version: typeof PROOF_BUILDING_ACTION_COPY_VERSION;
    heading: "Next action";
    instruction: "Look through your past work for an example that demonstrates this proof.";
    uncertainty: "Career Map does not know whether that experience exists.";
  }>;
  provenance: Readonly<{
    source: "next_proof_to_build";
    capabilityId: string;
    actionAuthorityVersion: typeof PROOF_BUILDING_ACTION_AUTHORITY_VERSION;
  }>;
}>;

export type NoProofBuildingActionAvailable = Readonly<{
  status: "unavailable";
  category: "no_action_available";
  reason: ProofBuildingActionAbstentionReason;
  provenance: Readonly<{
    source: "proof_building_action_authority";
    actionAuthorityVersion: typeof PROOF_BUILDING_ACTION_AUTHORITY_VERSION;
  }>;
}>;

export type ProofBuildingActionResult = FindExistingProofAction | NoProofBuildingActionAvailable;

const fixedCopy = Object.freeze({
  source: "career_twin_platform" as const,
  version: PROOF_BUILDING_ACTION_COPY_VERSION,
  heading: "Next action" as const,
  instruction: "Look through your past work for an example that demonstrates this proof." as const,
  uncertainty: "Career Map does not know whether that experience exists." as const,
});

function unavailable(reason: ProofBuildingActionAbstentionReason): NoProofBuildingActionAvailable {
  return Object.freeze({
    status: "unavailable",
    category: "no_action_available",
    reason,
    provenance: Object.freeze({ source: "proof_building_action_authority", actionAuthorityVersion: PROOF_BUILDING_ACTION_AUTHORITY_VERSION }),
  });
}

export function buildProofBuildingAction(nextProof: unknown): ProofBuildingActionResult {
  if (nextProof === undefined || nextProof === null) return unavailable("missing_next_proof");
  if (typeof nextProof !== "object" || Array.isArray(nextProof)) return unavailable("invalid_input");
  const value = nextProof as Partial<NextProofToBuild>;
  if (typeof value.capabilityId !== "string") return unavailable("invalid_input");
  if (!value.capabilityId.trim()) return unavailable("blank_capability_id");
  if (typeof value.capabilityLabel !== "string") return unavailable("invalid_input");
  if (!value.capabilityLabel.trim()) return unavailable("blank_capability_label");
  if (!(["must", "should", "differentiator"] as const).includes(value.importance as NextProofToBuild["importance"])) return unavailable("unsupported_importance");
  if (typeof value.expectedEvidence !== "string") return unavailable("invalid_input");
  if (!value.expectedEvidence.trim()) return unavailable("blank_expected_evidence");

  return Object.freeze({
    status: "available",
    category: "find_existing_proof",
    capabilityId: value.capabilityId,
    capabilityLabel: value.capabilityLabel,
    importance: value.importance as NextProofToBuild["importance"],
    expectedEvidence: value.expectedEvidence,
    copy: fixedCopy,
    provenance: Object.freeze({ source: "next_proof_to_build", capabilityId: value.capabilityId, actionAuthorityVersion: PROOF_BUILDING_ACTION_AUTHORITY_VERSION }),
  });
}
