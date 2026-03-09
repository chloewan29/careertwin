import { getSupabase } from "@/lib/db/supabase/client";

const PROFILE_KEY = "careertwin_profile_id";

/**
 * Get or create an anonymous profile.
 * Stores the profile ID in localStorage so it persists across sessions.
 */
export async function getOrCreateProfile(): Promise<string> {
    // Check localStorage first
    if (typeof window !== "undefined") {
        const stored = localStorage.getItem(PROFILE_KEY);
        if (stored) return stored;
    }

    // Create a new anonymous profile
    const { data, error } = await getSupabase()
        .from("profiles")
        .insert({ display_name: "Anonymous" })
        .select("id")
        .single();

    if (error) throw new Error(`Failed to create profile: ${error.message}`);

    const profileId = data.id;

    if (typeof window !== "undefined") {
        localStorage.setItem(PROFILE_KEY, profileId);
    }

    return profileId;
}

/**
 * Get the current profile ID without creating one.
 */
export function getStoredProfileId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(PROFILE_KEY);
}
