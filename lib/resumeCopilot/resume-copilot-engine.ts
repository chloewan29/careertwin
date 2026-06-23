export type JobSignalWeights = {
  // compatibility-only legacy engine; canonical runtime uses Job Copilot TailoringPlan.
  keyword_overlap: number;
  required_skill_overlap: number;
  preferred_skill_overlap: number;
  responsibility_overlap: number;
  role_family_overlap: number;
  domain_overlap: number;
};

export const DEFAULT_SIGNAL_WEIGHTS: JobSignalWeights = {
  keyword_overlap: 1,
  required_skill_overlap: 4,
  preferred_skill_overlap: 2,
  responsibility_overlap: 3,
  role_family_overlap: 2,
  domain_overlap: 2,
};

export type UUID = string;

export interface JobSignals {
  job_id: UUID;
  target_title: string | null;
  normalized_role_family: string | null;
  required_skills: string[];
  preferred_skills: string[];
  responsibilities: string[];
  domain_tokens: string[];
  keywords: string[];
}

export interface EvidencePiece {
  id: UUID;
  career_id: UUID;
  experience_id: UUID | null;
  company: string | null;
  role: string | null;
  date_range: string | null;
  raw_text: string;
  source_type?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface ExperienceGroupKey {
  company: string;
  role: string;
  date_range: string;
}

export interface EvidenceScoreBreakdown {
  keyword_overlap: number;
  required_skill_overlap: number;
  preferred_skill_overlap: number;
  responsibility_overlap: number;
  role_family_overlap: number;
  domain_overlap: number;
  total_score: number;
  matched_keywords: string[];
  matched_required_skills: string[];
  matched_preferred_skills: string[];
  matched_responsibilities: string[];
  matched_role_family: string[];
  matched_domain_tokens: string[];
}

export interface RankedEvidence extends EvidencePiece {
  score: EvidenceScoreBreakdown;
  group_key: ExperienceGroupKey;
}

export interface TailoredBullet {
  evidence_piece_id: UUID;
  original_bullet: string;
  rewritten_bullet: string;
  score: number;
  grounding_notes: string[];
}

export interface TailoredExperience {
  company: string;
  title: string;
  date_range: string;
  bullets: TailoredBullet[];
  evidence_piece_ids: UUID[];
}

export interface TailoredResume {
  target_job_id: UUID;
  target_title: string | null;
  summary: string | null;
  experiences: TailoredExperience[];
  audit: {
    total_evidence_loaded: number;
    total_evidence_ranked: number;
    total_evidence_selected: number;
    dropped_evidence_ids: UUID[];
    weights: JobSignalWeights;
  };
}

export interface ResumeCopilotOptions {
  maxBulletsPerExperience?: number;
  weights?: Partial<JobSignalWeights>;
  minScoreThreshold?: number;
}

const STOPWORDS = new Set([
  'a', 'an', 'and', 'the', 'or', 'for', 'to', 'of', 'in', 'on', 'with', 'by', 'at', 'from',
  'into', 'across', 'through', 'over', 'under', 'about', 'as', 'is', 'are', 'was', 'were',
  'be', 'been', 'being', 'that', 'this', 'these', 'those', 'it', 'its', 'their', 'his', 'her',
  'our', 'my', 'your', 'you', 'we', 'they', 'he', 'she', 'i', 'will', 'can', 'could', 'should'
]);

const ROLE_FAMILY_SYNONYMS: Record<string, string[]> = {
  analytics: ['analytics', 'analyst', 'analysis', 'insights', 'reporting', 'bi'],
  product: ['product', 'roadmap', 'feature', 'backlog', 'discovery'],
  strategy: ['strategy', 'strategic', 'planning', 'transformation'],
  program: ['program', 'programme', 'pmo', 'governance', 'delivery'],
  marketing: ['marketing', 'campaign', 'media', 'customer'],
  data: ['data', 'sql', 'model', 'pipeline', 'warehouse'],
};

export class ResumeCopilotEngine {
  private readonly maxBulletsPerExperience: number;
  private readonly minScoreThreshold: number;
  private readonly weights: JobSignalWeights;

  constructor(options: ResumeCopilotOptions = {}) {
    this.maxBulletsPerExperience = options.maxBulletsPerExperience ?? 3;
    this.minScoreThreshold = options.minScoreThreshold ?? 1;
    this.weights = {
      ...DEFAULT_SIGNAL_WEIGHTS,
      ...(options.weights ?? {}),
    };
  }

  buildTailoredResume(input: {
    jobSignals: JobSignals;
    evidencePieces: EvidencePiece[];
    existingSummary?: string | null;
  }): TailoredResume {
    const ranked = this.rankEvidence(input.jobSignals, input.evidencePieces);
    const selected = this.selectTopEvidenceByExperience(ranked);
    const experiences = this.assembleExperiences(selected);

    const selectedIds = new Set(selected.map((x) => x.id));
    const droppedIds = ranked.filter((x) => !selectedIds.has(x.id)).map((x) => x.id);

    return {
      target_job_id: input.jobSignals.job_id,
      target_title: input.jobSignals.target_title,
      summary: this.rewriteSummaryConservatively(input.existingSummary ?? null, input.jobSignals, selected),
      experiences,
      audit: {
        total_evidence_loaded: input.evidencePieces.length,
        total_evidence_ranked: ranked.length,
        total_evidence_selected: selected.length,
        dropped_evidence_ids: droppedIds,
        weights: this.weights,
      },
    };
  }

  rankEvidence(jobSignals: JobSignals, evidencePieces: EvidencePiece[]): RankedEvidence[] {
    return evidencePieces
      .map((piece, originalIndex) => {
        const score = this.scoreEvidencePiece(jobSignals, piece);
        return {
          ...piece,
          score,
          group_key: buildGroupKey(piece),
          __originalIndex: originalIndex,
        } as RankedEvidence & { __originalIndex: number };
      })
      .filter((piece) => piece.score.total_score >= this.minScoreThreshold)
      .sort((a, b) => {
        if (b.score.total_score !== a.score.total_score) {
          return b.score.total_score - a.score.total_score;
        }
        return a.__originalIndex - b.__originalIndex;
      })
      .map(({ __originalIndex, ...piece }) => piece);
  }

  scoreEvidencePiece(jobSignals: JobSignals, piece: EvidencePiece): EvidenceScoreBreakdown {
    const rawText = normalizeText(piece.raw_text);
    const roleText = normalizeText(piece.role ?? '');

    const matched_keywords = overlapTerms(tokenize(rawText), normalizeTerms(jobSignals.keywords));
    const matched_required_skills = overlapPhrases(rawText, jobSignals.required_skills);
    const matched_preferred_skills = overlapPhrases(rawText, jobSignals.preferred_skills);
    const matched_responsibilities = overlapPhrases(rawText, jobSignals.responsibilities);
    const matched_domain_tokens = overlapTerms(tokenize(rawText), normalizeTerms(jobSignals.domain_tokens));
    const matched_role_family = matchRoleFamily(jobSignals.normalized_role_family, rawText, roleText);

    const keyword_overlap = matched_keywords.length * this.weights.keyword_overlap;
    const required_skill_overlap = matched_required_skills.length * this.weights.required_skill_overlap;
    const preferred_skill_overlap = matched_preferred_skills.length * this.weights.preferred_skill_overlap;
    const responsibility_overlap = matched_responsibilities.length * this.weights.responsibility_overlap;
    const role_family_overlap = matched_role_family.length * this.weights.role_family_overlap;
    const domain_overlap = matched_domain_tokens.length * this.weights.domain_overlap;

    return {
      keyword_overlap,
      required_skill_overlap,
      preferred_skill_overlap,
      responsibility_overlap,
      role_family_overlap,
      domain_overlap,
      total_score:
        keyword_overlap +
        required_skill_overlap +
        preferred_skill_overlap +
        responsibility_overlap +
        role_family_overlap +
        domain_overlap,
      matched_keywords,
      matched_required_skills,
      matched_preferred_skills,
      matched_responsibilities,
      matched_role_family,
      matched_domain_tokens,
    };
  }

  selectTopEvidenceByExperience(ranked: RankedEvidence[]): RankedEvidence[] {
    const groups = new Map<string, RankedEvidence[]>();

    for (const piece of ranked) {
      const key = serializeGroupKey(piece.group_key);
      const existing = groups.get(key) ?? [];
      if (existing.length < this.maxBulletsPerExperience) {
        existing.push(piece);
        groups.set(key, existing);
      }
    }

    return Array.from(groups.values())
      .flat()
      .sort((a, b) => {
        if (a.group_key.date_range !== b.group_key.date_range) {
          return String(b.group_key.date_range).localeCompare(String(a.group_key.date_range));
        }
        return b.score.total_score - a.score.total_score;
      });
  }

  assembleExperiences(selected: RankedEvidence[]): TailoredExperience[] {
    const groups = new Map<string, RankedEvidence[]>();

    for (const piece of selected) {
      const key = serializeGroupKey(piece.group_key);
      const bucket = groups.get(key) ?? [];
      bucket.push(piece);
      groups.set(key, bucket);
    }

    return Array.from(groups.entries()).map(([_, pieces]) => {
      const first = pieces[0];
      const bullets = pieces.map((piece) => ({
        evidence_piece_id: piece.id,
        original_bullet: piece.raw_text,
        rewritten_bullet: conservativeRewrite(piece.raw_text),
        score: piece.score.total_score,
        grounding_notes: buildGroundingNotes(piece.score),
      }));

      return {
        company: first.group_key.company,
        title: first.group_key.role,
        date_range: first.group_key.date_range,
        bullets,
        evidence_piece_ids: pieces.map((x) => x.id),
      };
    });
  }

  rewriteSummaryConservatively(
    existingSummary: string | null,
    jobSignals: JobSignals,
    selected: RankedEvidence[],
  ): string | null {
    if (!existingSummary) return null;

    const strongestSignals = Array.from(
      new Set([
        ...jobSignals.required_skills,
        ...jobSignals.responsibilities.slice(0, 3),
      ])
    ).slice(0, 5);

    const evidenceWords = new Set(
      selected
        .flatMap((x) => tokenize(normalizeText(x.raw_text)))
        .filter(Boolean)
    );

    const groundedSignals = strongestSignals.filter((signal) => {
      const parts = tokenize(normalizeText(signal));
      return parts.some((part) => evidenceWords.has(part));
    });

    if (groundedSignals.length === 0) {
      return existingSummary;
    }

    const cleanedSummary = existingSummary.replace(/\s+/g, ' ').trim();
    return `${cleanedSummary} Focus areas aligned to this role include ${groundedSignals.join(', ')}.`;
  }
}

export function conservativeRewrite(rawBullet: string): string {
  const text = rawBullet.replace(/\s+/g, ' ').trim();
  if (!text) return text;

  const withoutTrailingPeriod = text.replace(/[.;:,]+$/, '');
  const sentence = withoutTrailingPeriod.charAt(0).toUpperCase() + withoutTrailingPeriod.slice(1);

  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

export function buildGroundingNotes(score: EvidenceScoreBreakdown): string[] {
  const notes: string[] = [];
  if (score.matched_required_skills.length) {
    notes.push(`Matched required skills: ${score.matched_required_skills.join(', ')}`);
  }
  if (score.matched_responsibilities.length) {
    notes.push(`Matched responsibilities: ${score.matched_responsibilities.join(', ')}`);
  }
  if (score.matched_role_family.length) {
    notes.push(`Matched role family: ${score.matched_role_family.join(', ')}`);
  }
  if (score.matched_domain_tokens.length) {
    notes.push(`Matched domain: ${score.matched_domain_tokens.join(', ')}`);
  }
  if (score.matched_keywords.length) {
    notes.push(`Matched keywords: ${score.matched_keywords.join(', ')}`);
  }
  return notes;
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s/+&-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
}

function normalizeTerms(terms: string[]): string[] {
  return terms
    .flatMap((term) => tokenize(term))
    .filter(Boolean);
}

function overlapTerms(haystackTokens: string[], signalTokens: string[]): string[] {
  const haystack = new Set(haystackTokens);
  return Array.from(new Set(signalTokens.filter((token) => haystack.has(token))));
}

function overlapPhrases(rawText: string, phrases: string[]): string[] {
  const text = normalizeText(rawText);
  return phrases.filter((phrase) => {
    const normalized = normalizeText(phrase);
    if (!normalized) return false;
    if (text.includes(normalized)) return true;

    const phraseTokens = tokenize(normalized);
    const textTokens = new Set(tokenize(text));
    return phraseTokens.length > 1 && phraseTokens.every((token) => textTokens.has(token));
  });
}

function serializeGroupKey(groupKey: ExperienceGroupKey): string {
  return [groupKey.company, groupKey.role, groupKey.date_range].join('||');
}

function buildFallback(value: string | null | undefined, fallback: string): string {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : fallback;
}

function buildGroupKey(piece: EvidencePiece): ExperienceGroupKey {
  return {
    company: buildFallback(piece.company, 'Unknown company'),
    role: buildFallback(piece.role, 'Unknown role'),
    date_range: buildFallback(piece.date_range, 'Unknown date range'),
  };
}

function roleFamilyCandidates(roleFamily: string | null): string[] {
  if (!roleFamily) return [];
  const normalized = normalizeText(roleFamily);
  return Array.from(new Set([normalized, ...(ROLE_FAMILY_SYNONYMS[normalized] ?? [])]));
}

function matchRoleFamily(roleFamily: string | null, rawText: string, roleText: string): string[] {
  const candidates = roleFamilyCandidates(roleFamily);
  if (candidates.length === 0) return [];

  const fullText = `${rawText} ${roleText}`;
  return candidates.filter((candidate) => fullText.includes(candidate));
}

// Example integration boundary for Supabase / service layer.
export interface ResumeCopilotRepository {
  getJobSignals(jobId: UUID): Promise<JobSignals>;
  getEvidencePiecesForCareer(careerId: UUID): Promise<EvidencePiece[]>;
}

export async function generateTailoredResume(params: {
  repository: ResumeCopilotRepository;
  careerId: UUID;
  jobId: UUID;
  existingSummary?: string | null;
  options?: ResumeCopilotOptions;
}): Promise<TailoredResume> {
  const [jobSignals, evidencePieces] = await Promise.all([
    params.repository.getJobSignals(params.jobId),
    params.repository.getEvidencePiecesForCareer(params.careerId),
  ]);

  const engine = new ResumeCopilotEngine(params.options);
  return engine.buildTailoredResume({
    jobSignals,
    evidencePieces,
    existingSummary: params.existingSummary ?? null,
  });
}
