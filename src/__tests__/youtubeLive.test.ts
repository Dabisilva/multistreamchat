import { describe, expect, it } from "vitest";
import { YoutubeLiveTracker } from "@/services/youtubeLive";

function jsonResponse(data: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

function endpointName(url: string): string {
  if (url.includes("/liveBroadcasts")) return "liveBroadcasts";
  if (url.includes("/search")) return "search";
  if (url.includes("/videos")) return "videos";
  return url;
}

function liveVideoResponse() {
  return jsonResponse({
    items: [
      {
        liveStreamingDetails: {
          actualStartTime: "2026-01-01T00:00:00Z",
          activeLiveChatId: "chat-1",
          concurrentViewers: "12",
        },
      },
    ],
  });
}

describe("YoutubeLiveTracker", () => {
  it("checks liveBroadcasts once when offline and does not search again", async () => {
    const urls: string[] = [];
    const apiFetch = async (url: string) => {
      urls.push(endpointName(url));
      return jsonResponse({ items: [] });
    };

    const tracker = new YoutubeLiveTracker();
    const first = await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });
    const second = await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });
    const third = await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(third).toBeNull();
    expect(tracker.isIdle()).toBe(true);
    expect(urls.filter((name) => name === "liveBroadcasts")).toHaveLength(1);
    expect(urls.filter((name) => name === "search")).toHaveLength(0);
    expect(urls).toHaveLength(1);
  });

  it("does not rediscover after a live ends", async () => {
    const urls: string[] = [];
    let live = true;
    const apiFetch = async (url: string) => {
      urls.push(endpointName(url));
      if (url.includes("/videos")) {
        return live ? liveVideoResponse() : jsonResponse({ items: [] });
      }
      return jsonResponse({ items: [] });
    };

    const tracker = new YoutubeLiveTracker();
    tracker.remember({ videoId: "vid-1" });

    const connected = await tracker.refresh(apiFetch, { includeViewers: true });
    expect(connected?.isLive).toBe(true);

    live = false;
    const ended = await tracker.refresh(apiFetch, { includeViewers: true });
    expect(ended).toBeNull();
    expect(tracker.isIdle()).toBe(true);

    urls.length = 0;
    await tracker.refresh(apiFetch, { includeViewers: true });
    expect(urls).toEqual([]);
  });

  it("uses a stale cached video only as a first-render check, then one broadcast lookup", async () => {
    const urls: string[] = [];
    const apiFetch = async (url: string) => {
      urls.push(endpointName(url));
      return jsonResponse({ items: [] });
    };

    const tracker = new YoutubeLiveTracker();
    tracker.remember({ videoId: "old-vid" });

    await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });
    await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });

    expect(urls[0]).toBe("videos");
    expect(urls.filter((name) => name === "liveBroadcasts")).toHaveLength(1);
    expect(urls.filter((name) => name === "search")).toHaveLength(0);
    expect(urls).toHaveLength(2);
    expect(tracker.isIdle()).toBe(true);
  });

  it("resolves chat from liveBroadcasts without videos.list", async () => {
    const urls: string[] = [];
    const apiFetch = async (url: string) => {
      urls.push(endpointName(url));
      if (url.includes("/liveBroadcasts")) {
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
      return jsonResponse({ items: [] });
    };

    const tracker = new YoutubeLiveTracker();
    const live = await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });

    expect(live).toEqual({
      videoId: "vid-1",
      liveChatId: "chat-1",
      concurrentViewers: null,
      isLive: true,
    });
    expect(urls).toEqual(["liveBroadcasts"]);

    urls.length = 0;
    await tracker.refresh(apiFetch, {
      includeViewers: false,
      channelId: "UC123",
    });
    expect(urls).toEqual([]);
  });

  it("does not treat a lingering VOD as live when fetching viewers", async () => {
    const urls: string[] = [];
    const apiFetch = async (url: string) => {
      urls.push(endpointName(url));
      if (url.includes("/liveBroadcasts")) {
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
      return jsonResponse({
        items: [
          {
            liveStreamingDetails: {
              actualStartTime: "2026-01-01T00:00:00Z",
              activeLiveChatId: "chat-1",
            },
          },
        ],
      });
    };

    const tracker = new YoutubeLiveTracker();
    const live = await tracker.refresh(apiFetch, { includeViewers: true });
    expect(live).toBeNull();
    expect(tracker.isIdle()).toBe(true);

    urls.length = 0;
    await tracker.refresh(apiFetch, { includeViewers: true });
    expect(urls).toEqual([]);
  });
});
