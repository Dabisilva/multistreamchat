export const DEFAULT_TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";

export function getTwitchClientId(): string {
  return import.meta.env.VITE_TWITCH_CLIENT_ID || DEFAULT_TWITCH_CLIENT_ID;
}

export function getTwitchClientSecret(): string {
  return import.meta.env.VITE_TWITCH_CLIENT_SECRET || "";
}

export function getTwitchRedirectUri(fallback: string): string {
  return import.meta.env.VITE_TWITCH_REDIRECT_URI || fallback;
}

export function getYoutubeClientId(): string {
  return import.meta.env.VITE_YOUTUBE_CLIENT_ID || "";
}

export function getYoutubeRedirectUri(fallback: string): string {
  return import.meta.env.VITE_YOUTUBE_REDIRECT_URI || fallback;
}
