import { describe, expect, it, beforeEach } from "vitest";
import {
  ViewerCountService,
  YOUTUBE_VIEWER_STALE_MS,
} from "@/services/ViewerCountService";
import { resetYoutubeLiveGate } from "@/services/youtubeLive";

function jsonResponse(data: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    clone() {
      return jsonResponse(data, status);
    },
  } as Response;
}

function liveVideoResponse(viewers = "12") {
  return jsonResponse({
    items: [
      {
        snippet: { liveBroadcastContent: "live" },
        liveStreamingDetails: {
          actualStartTime: "2026-01-01T00:00:00Z",
          activeLiveChatId: "chat-1",
          concurrentViewers: viewers,
        },
      },
    ],
  });
}

function activeBroadcast() {
  return jsonResponse({
    items: [
      {
        id: "vid-1",
        snippet: { liveChatId: "chat-1", channelId: "UC123" },
        status: { lifeCycleStatus: "live" },
      },
    ],
  });
}

describe("ViewerCountService YouTube lifecycle", () => {
  beforeEach(() => {
    resetYoutubeLiveGate();
  });

  it("updates fetchedAt on a successful live fetch and refreshes the count", async () => {
    const now = { value: 5_000 };
    const service = new ViewerCountService(
      { youtubeToken: "token", youtubeChannelId: "UC123" },
      { now: () => now.value },
    );

    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("/liveBroadcasts")) return activeBroadcast();
      return liveVideoResponse("12");
    }) as typeof fetch;

    const [first] = await service.fetchAll({
      twitch: false,
      kick: false,
      youtube: true,
    });
    expect(first).toMatchObject({
      platform: "youtube",
      count: 12,
      isLive: true,
      fetchedAt: 5_000,
    });

    now.value = 50_000;
    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("/videos")) return liveVideoResponse("40");
      return activeBroadcast();
    }) as typeof fetch;

    const [second] = await service.fetchAll({
      twitch: false,
      kick: false,
      youtube: true,
    });
    expect(second).toMatchObject({
      count: 40,
      isLive: true,
      fetchedAt: 50_000,
    });
  });

  it("resets the viewer count when the stream ends", async () => {
    const service = new ViewerCountService({
      youtubeToken: "token",
      youtubeChannelId: "UC123",
    });

    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("/liveBroadcasts")) return activeBroadcast();
      return liveVideoResponse("12");
    }) as typeof fetch;

    await service.fetchAll({ twitch: false, kick: false, youtube: true });

    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("/videos")) {
        return jsonResponse({
          items: [
            {
              snippet: { liveBroadcastContent: "none" },
              liveStreamingDetails: {
                actualStartTime: "2026-01-01T00:00:00Z",
                actualEndTime: "2026-01-01T01:00:00Z",
                activeLiveChatId: "chat-1",
              },
            },
          ],
        });
      }
      return activeBroadcast();
    }) as typeof fetch;

    const [ended] = await service.fetchAll({
      twitch: false,
      kick: false,
      youtube: true,
    });
    expect(ended).toMatchObject({
      platform: "youtube",
      count: 0,
      isLive: false,
    });
  });

  it("does not keep an indefinitely stale count after quota", async () => {
    const now = { value: 1_000 };
    const service = new ViewerCountService(
      { youtubeToken: "token", youtubeChannelId: "UC123" },
      { now: () => now.value },
    );

    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("/liveBroadcasts")) return activeBroadcast();
      return liveVideoResponse("12");
    }) as typeof fetch;
    await service.fetchAll({ twitch: false, kick: false, youtube: true });

    globalThis.fetch = (async () =>
      jsonResponse(
        {
          error: {
            errors: [{ reason: "quotaExceeded" }],
            status: "RESOURCE_EXHAUSTED",
            message: "quota exceeded",
          },
        },
        403,
      )) as typeof fetch;

    const [quotaFresh] = await service.fetchAll({
      twitch: false,
      kick: false,
      youtube: true,
    });
    expect(quotaFresh.isLive).toBe(true);
    expect(quotaFresh.count).toBe(12);

    now.value = 1_000 + YOUTUBE_VIEWER_STALE_MS;
    const [quotaStale] = await service.fetchAll({
      twitch: false,
      kick: false,
      youtube: true,
    });
    expect(quotaStale).toMatchObject({
      platform: "youtube",
      count: 0,
      isLive: false,
    });
  });

  it("resets the previous YouTube count when the channel changes", async () => {
    const service = new ViewerCountService({
      youtubeToken: "token",
      youtubeChannelId: "UC123",
    });

    globalThis.fetch = (async (url: string) => {
      if (String(url).includes("/liveBroadcasts")) return activeBroadcast();
      return liveVideoResponse("12");
    }) as typeof fetch;
    await service.fetchAll({ twitch: false, kick: false, youtube: true });

    service.updateCredentials({ youtubeChannelId: "UC999" });
    resetYoutubeLiveGate();

    globalThis.fetch = (async () => jsonResponse({ items: [] })) as typeof fetch;
    const [next] = await service.fetchAll({
      twitch: false,
      kick: false,
      youtube: true,
    });
    expect(next).toMatchObject({ count: 0, isLive: false });
  });
});
