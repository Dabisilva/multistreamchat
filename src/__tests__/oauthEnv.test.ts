import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import * as appEnv from "@/utils/appEnv";

describe("YouTube OAuth env surface", () => {
  it("does not export a frontend YouTube client secret helper", () => {
    expect("getYoutubeClientSecret" in appEnv).toBe(false);
  });

  it("does not reference VITE_YOUTUBE_CLIENT_SECRET in application source", () => {
    const files = [
      "src/utils/appEnv.ts",
      "src/vite-env.d.ts",
      "src/services/OAuthService.ts",
      "src/hooks/useAppDashboard.ts",
      "src/hooks/useChat.ts",
      "src/hooks/useViewerCount.ts",
    ];
    for (const file of files) {
      const src = readFileSync(path.resolve(file), "utf8");
      expect(src).not.toContain("VITE_YOUTUBE_CLIENT_SECRET");
    }
  });
});
