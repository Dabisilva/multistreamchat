import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  YOUTUBE_ICON_BODY_PATH,
  YOUTUBE_ICON_MIN_SIZE,
  YOUTUBE_ICON_TRIANGLE_PATH,
  YOUTUBE_RED,
  YOUTUBE_WHITE,
  youtubeIconDimensions,
} from "@/utils/youtubeBrand";
import { CHAT_DISPLAY_LIMITS } from "@/utils/chatLogic";

const UNOFFICIAL_YOUTUBE_PATH =
  "M23.498 6.186a2.974 2.974 0 0 0-2.09-2.103C19.505 3.546 12 3.546 12 3.546s-7.505 0-9.408.537A2.974 2.974 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a2.974 2.974 0 0 0 2.09 2.103c1.903.537 9.408.537 9.408.537s7.505 0 9.408-.537a2.974 2.974 0 0 0 2.09-2.103C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z";

describe("YouTube branding", () => {
  it("enforces a minimum height of 20px without squashing", () => {
    expect(YOUTUBE_ICON_MIN_SIZE).toBe(20);
    expect(youtubeIconDimensions(14).height).toBe(20);
    expect(youtubeIconDimensions(16).height).toBe(20);
    const sized = youtubeIconDimensions(20);
    expect(sized.height).toBe(20);
    expect(sized.width).toBeGreaterThan(sized.height);
  });

  it("uses official red and a separate white play triangle", () => {
    expect(YOUTUBE_RED).toBe("#FF0000");
    expect(YOUTUBE_WHITE).toBe("#FFFFFF");
    expect(YOUTUBE_ICON_BODY_PATH.length).toBeGreaterThan(50);
    expect(YOUTUBE_ICON_TRIANGLE_PATH).toContain("11.4253");
  });

  it("does not keep the unofficial Simple Icons YouTube path", () => {
    const iconSrc = readFileSync(
      path.resolve("src/components/PlatformIcon.tsx"),
      "utf8",
    );
    expect(iconSrc).not.toContain(UNOFFICIAL_YOUTUBE_PATH);
    expect(iconSrc).toContain("YOUTUBE_ICON_TRIANGLE_PATH");
  });
});

describe("YouTube live chat display policy", () => {
  it("keeps chat ephemeral with a short hide timeout and small in-memory cap", () => {
    expect(CHAT_DISPLAY_LIMITS.hideAfterSeconds).toBe(180);
    expect(CHAT_DISPLAY_LIMITS.messagesLimit).toBe(20);
  });

  it("does not persist chat messages in the YouTube storage helper", () => {
    const storageSrc = readFileSync(
      path.resolve("src/utils/youtubeStorage.ts"),
      "utf8",
    );
    const chatSrc = readFileSync(
      path.resolve("src/services/YoutubeChat.ts"),
      "utf8",
    );
    expect(storageSrc).not.toMatch(/liveChat\/messages|displayMessage/);
    expect(chatSrc).not.toContain("localStorage");
    expect(chatSrc).not.toContain("indexedDB");
  });
});
