import { describe, expect, it } from "vitest";
import {
  YOUTUBE_VIEWER_STALE_MS,
  isYoutubeViewerFresh,
  youtubeUnavailable,
  type PlatformViewers,
} from "@/services/ViewerCountService";

describe("YouTube viewer statistic freshness", () => {
  it("treats a successful live fetch as fresh when fetchedAt is recent", () => {
    const stat: PlatformViewers = {
      platform: "youtube",
      count: 12,
      isLive: true,
      fetchedAt: 1000,
    };
    expect(isYoutubeViewerFresh(stat, 1000 + 45_000)).toBe(true);
  });

  it("makes an old live count unavailable", () => {
    const stat: PlatformViewers = {
      platform: "youtube",
      count: 12,
      isLive: true,
      fetchedAt: 1000,
    };
    expect(
      isYoutubeViewerFresh(stat, 1000 + YOUTUBE_VIEWER_STALE_MS),
    ).toBe(false);
  });

  it("does not treat a live count without fetchedAt as current", () => {
    expect(
      isYoutubeViewerFresh({
        platform: "youtube",
        count: 99,
        isLive: true,
      }),
    ).toBe(false);
  });

  it("resets to an unavailable (not live) value", () => {
    expect(youtubeUnavailable()).toEqual({
      platform: "youtube",
      count: 0,
      isLive: false,
      error: undefined,
    });
  });
});
