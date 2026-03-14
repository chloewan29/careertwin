export function mapCapabilitiesForDisplay(values: string[], limit: number): string[] {
    const deduped = Array.from(
        new Set(
            values
                .map((value) => value.trim())
                .filter((value) => value.length > 0),
        ),
    );
    return deduped.slice(0, Math.max(0, limit));
}
