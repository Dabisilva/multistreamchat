/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TWITCH_CLIENT_ID?: string;
  readonly VITE_TWITCH_CLIENT_SECRET?: string;
  readonly VITE_TWITCH_REDIRECT_URI?: string;
  readonly VITE_YOUTUBE_CLIENT_ID?: string;
  readonly VITE_YOUTUBE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
