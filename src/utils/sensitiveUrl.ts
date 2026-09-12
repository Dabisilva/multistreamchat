const SENSITIVE_QUERY_PARAMS = [
  "twitchToken",
  "refreshToken",
  "expiresAt",
  "youtubeToken",
  "youtubeRefreshToken",
  "youtubeExpiresAt",
] as const;

export function stripSensitiveSearch(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  let changed = false;

  for (const key of SENSITIVE_QUERY_PARAMS) {
    if (params.has(key)) {
      params.delete(key);
      changed = true;
    }
  }

  if (!changed) return search.startsWith("?") ? search : `?${search}`;
  const next = params.toString();
  return next ? `?${next}` : "";
}

export function scrubSensitiveSearchParams(): void {
  if (typeof window === "undefined") return;

  const nextSearch = stripSensitiveSearch(window.location.search);
  if (nextSearch === window.location.search) return;

  const next = `${window.location.pathname}${nextSearch}${window.location.hash}`;
  window.history.replaceState(null, "", next);
}
