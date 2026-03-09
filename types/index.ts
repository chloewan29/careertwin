export interface Profile {
    id: string;
    display_name: string | null;
    created_at: string;
}

export interface Resume {
    id: string;
    profile_id: string;
    file_name: string;
    file_url: string;
    raw_text: string | null;
    created_at: string;
}

export interface ExperienceEntry {
    title: string;
    company: string;
    start_date: string;
    end_date: string | null;
    description: string;
}

export interface EducationEntry {
    degree: string;
    institution: string;
    year: string;
}

export interface CareerData {
    id: string;
    resume_id: string;
    name: string | null;
    current_title: string | null;
    summary: string | null;
    skills: string[];
    industries: string[];
    experience: ExperienceEntry[];
    education: EducationEntry[];
    certifications: string[];
    created_at: string;
}

export interface JobDescription {
    id: string;
    profile_id: string;
    title: string | null;
    company: string | null;
    raw_text: string;
    required_skills: string[];
    created_at: string;
}

export interface MatchResult {
    id: string;
    career_data_id: string;
    job_description_id: string;
    overall_score: number;
    skill_matches: string[];
    skill_gaps: string[];
    recommendations: string[];
    created_at: string;
}
