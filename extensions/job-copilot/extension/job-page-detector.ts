export type SupportedJobSource = "linkedin" | "seek";

export type SupportedJobPage =
    | { platform: "linkedin"; isSupported: true }
    | { platform: "seek"; isSupported: true }
    | { platform: "unknown"; isSupported: false };

function normalizePath(pathname: string): string {
    return pathname.toLowerCase().replace(/\/+$/, "");
}

function isLinkedInHost(url: URL): boolean {
    return url.hostname.toLowerCase() === "www.linkedin.com";
}

function isSeekHost(url: URL): boolean {
    return url.hostname.toLowerCase() === "www.seek.com.au";
}

export function isLinkedInJobDetailPage(url: URL): boolean {
    if (!isLinkedInHost(url)) return false;
    const path = normalizePath(url.pathname);
    // LinkedIn detail pages use /jobs/view/<numeric-id>.
    return /^\/jobs\/view\/\d+/.test(path);
}

export function isSeekJobDetailPage(url: URL): boolean {
    if (!isSeekHost(url)) return false;
    const path = normalizePath(url.pathname);
    // Seek detail pages use /job/<numeric-id>.
    return /^\/job\/\d+/.test(path);
}

export function detectSupportedJobPage(urlLike: string): SupportedJobPage {
    try {
        const url = new URL(urlLike);
        if (isLinkedInJobDetailPage(url)) return { platform: "linkedin", isSupported: true };
        if (isSeekJobDetailPage(url)) return { platform: "seek", isSupported: true };
        return { platform: "unknown", isSupported: false };
    } catch {
        return { platform: "unknown", isSupported: false };
    }
}

