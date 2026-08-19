import { searchSkillsByLabel, getSkillByUri } from "./esco-index";
import type {
  EscoCandidateRetrievalResult,
  EscoEvidenceGroundingProvider,
  EscoEvidenceGroundingRequest,
  EscoEvidenceGrounding,
  EvidenceBackedEscoSkill,
} from "./esco-evidence-grounding-contract";

// Simple local heuristic retrieval to bound the candidate set for LLM
export function retrieveEscoSkillCandidates(evidenceText: string): EscoCandidateRetrievalResult[] {
  const words = evidenceText.toLowerCase().split(/\W+/).filter(w => w.length > 4);
  const candidatesMap = new Map<string, EscoCandidateRetrievalResult>();

  for (const word of words) {
    const hits = searchSkillsByLabel(word, 5); // top 5 per word
    for (const hit of hits) {
      if (!candidatesMap.has(hit.uri)) {
        candidatesMap.set(hit.uri, {
          skillUri: hit.uri,
          preferredLabel: hit.preferredLabel,
          description: hit.description
        });
      }
    }
  }

  return Array.from(candidatesMap.values());
}

export type GroundingOptions = {
  provider: EscoEvidenceGroundingProvider;
};

export async function processEvidenceGrounding(
  evidenceItems: { evidenceId: string; evidenceText: string }[],
  options: GroundingOptions
): Promise<{
  rawGroundings: EscoEvidenceGrounding[];
  ownedSkills: EvidenceBackedEscoSkill[];
}> {
  // 1. Gather all candidates
  const allCandidatesMap = new Map<string, EscoCandidateRetrievalResult>();
  for (const item of evidenceItems) {
    const itemCandidates = retrieveEscoSkillCandidates(item.evidenceText);
    for (const c of itemCandidates) {
      allCandidatesMap.set(c.skillUri, c);
    }
  }

  // 2. Build Request
  const request: EscoEvidenceGroundingRequest = {
    eligibleEvidence: evidenceItems,
    candidateSkills: Array.from(allCandidatesMap.values()),
  };

  // 3. Call Provider
  const response = await options.provider.groundEvidence(request);

  // 4. Validate & Materialize ownership
  const rawGroundings: EscoEvidenceGrounding[] = [];
  const ownershipMap = new Map<string, Set<string>>(); // skillUri -> set(evidenceId)

  for (const res of response.results) {
    const validMappings = [];
    const seenUris = new Set<string>();

    for (const map of res.mappings) {
      // Check URI exists in ESCO index (this prevents hallucinations outside the taxonomy entirely)
      const validSkill = getSkillByUri(map.skillUri);
      if (validSkill && !seenUris.has(map.skillUri)) {
        validMappings.push(map);
        seenUris.add(map.skillUri);

        if (!ownershipMap.has(map.skillUri)) {
          ownershipMap.set(map.skillUri, new Set());
        }
        ownershipMap.get(map.skillUri)!.add(res.evidenceId);
      }
    }

    rawGroundings.push({
      evidenceId: res.evidenceId,
      mappings: validMappings,
      unresolved: validMappings.length === 0,
    });
  }

  const ownedSkills: EvidenceBackedEscoSkill[] = [];
  for (const [skillUri, evidenceSet] of ownershipMap.entries()) {
    ownedSkills.push({
      skillUri,
      evidenceIds: Array.from(evidenceSet).sort(),
    });
  }
  // deterministic sort
  ownedSkills.sort((a, b) => a.skillUri.localeCompare(b.skillUri, "en"));

  return { rawGroundings, ownedSkills };
}
