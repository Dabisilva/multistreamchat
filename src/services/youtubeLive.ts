export interface YoutubeLiveInfo {
  videoId: string;
  liveChatId: string;
  concurrentViewers: number | null;
  isLive: boolean;
}

type YoutubeFetch = (url: string) => Promise<Response>;

interface BroadcastItem {
  id?: string;
  snippet?: {
    liveChatId?: string;
    channelId?: string;
  };
  status?: {
    lifeCycleStatus?: string;
  };
  statistics?: {
    concurrentViewers?: string | number;
  };
  contentDetails?: {
    boundStreamId?: string;
  };
}

const LIVE_STATUSES = new Set(["live", "liveStarting", "testing"]);

function pickLiveBroadcast(items: BroadcastItem[]): BroadcastItem | null {
  if (!items?.length) return null;

  const live = items.find((item) =>
    LIVE_STATUSES.has(item.status?.lifeCycleStatus || ""),
  );
  return live || items[0] || null;
}

async function fetchBroadcasts(
  apiFetch: YoutubeFetch,
  query: string,
): Promise<BroadcastItem[]> {
  const url =
    "https://www.googleapis.com/youtube/v3/liveBroadcasts" +
    `?part=snippet,contentDetails,status,statistics&${query}`;

  const response = await apiFetch(url);
  if (!response.ok) return [];

  const data = await response.json();
  return data.items || [];
}

async function resolveFromSearch(
  apiFetch: YoutubeFetch,
  channelId: string,
): Promise<YoutubeLiveInfo | null> {
  const searchUrl =
    "https://www.googleapis.com/youtube/v3/search" +
    `?part=snippet&channelId=${encodeURIComponent(channelId)}` +
    "&type=video&eventType=live&maxResults=1";

  const searchRes = await apiFetch(searchUrl);
  if (!searchRes.ok) return null;

  const searchData = await searchRes.json();
  const videoId = searchData.items?.[0]?.id?.videoId;
  if (!videoId) return null;

  return resolveFromVideoId(apiFetch, videoId);
}

async function resolveFromVideoId(
  apiFetch: YoutubeFetch,
  videoId: string,
): Promise<YoutubeLiveInfo | null> {
  const videosUrl =
    "https://www.googleapis.com/youtube/v3/videos" +
    `?part=liveStreamingDetails,snippet&id=${encodeURIComponent(videoId)}`;

  const response = await apiFetch(videosUrl);
  if (!response.ok) return null;

  const data = await response.json();
  const video = data.items?.[0];
  const details = video?.liveStreamingDetails;
  if (!details) return null;

  const hasEnded = !!details.actualEndTime;
  const liveChatId = details.activeLiveChatId || "";
  const concurrent =
    details.concurrentViewers != null
      ? parseInt(String(details.concurrentViewers), 10) || 0
      : null;

  // Live if started, not ended, and preferably has chat or concurrent viewers
  const isLive =
    !hasEnded &&
    (!!details.actualStartTime || concurrent != null || !!liveChatId);

  if (!isLive) return null;

  return {
    videoId,
    liveChatId,
    concurrentViewers: concurrent,
    isLive: true,
  };
}

function broadcastToLiveInfo(item: BroadcastItem): YoutubeLiveInfo | null {
  const videoId = item.id;
  if (!videoId) return null;

  const lifeCycle = item.status?.lifeCycleStatus || "";
  const isLive = LIVE_STATUSES.has(lifeCycle);
  if (!isLive && lifeCycle) return null;

  const concurrent =
    item.statistics?.concurrentViewers != null
      ? parseInt(String(item.statistics.concurrentViewers), 10) || 0
      : null;

  return {
    videoId,
    liveChatId: item.snippet?.liveChatId || "",
    concurrentViewers: concurrent,
    isLive: true,
  };
}

/**
 * Resolve the authenticated user's current live stream (chat id + viewers).
 * Tries active broadcasts, then all mine broadcasts, then channel search.
 */
export async function resolveYoutubeLive(
  apiFetch: YoutubeFetch,
  channelId?: string,
): Promise<YoutubeLiveInfo | null> {
  // 1) Explicitly active broadcasts (cheapest / most accurate for owner)
  const active = await fetchBroadcasts(
    apiFetch,
    "broadcastStatus=active&broadcastType=all&mine=true",
  );
  const activeLive = pickLiveBroadcast(active);
  if (activeLive?.id) {
    // Items from broadcastStatus=active are live by definition
    const liveChatId = activeLive.snippet?.liveChatId || "";
    const concurrent =
      activeLive.statistics?.concurrentViewers != null
        ? parseInt(String(activeLive.statistics.concurrentViewers), 10) || 0
        : null;

    if (liveChatId && concurrent != null) {
      return {
        videoId: activeLive.id,
        liveChatId,
        concurrentViewers: concurrent,
        isLive: true,
      };
    }

    const fromVideo = await resolveFromVideoId(apiFetch, activeLive.id);
    if (fromVideo) {
      return {
        ...fromVideo,
        liveChatId: fromVideo.liveChatId || liveChatId,
        concurrentViewers: fromVideo.concurrentViewers ?? concurrent,
      };
    }

    if (liveChatId || concurrent != null) {
      return {
        videoId: activeLive.id,
        liveChatId,
        concurrentViewers: concurrent,
        isLive: true,
      };
    }
  }

  // 2) Upcoming (useful right before going live / testing)
  const upcoming = await fetchBroadcasts(
    apiFetch,
    "broadcastStatus=upcoming&broadcastType=all&mine=true",
  );
  const upcomingItem = upcoming.find((item) => item.snippet?.liveChatId);
  if (upcomingItem?.id && upcomingItem.snippet?.liveChatId) {
    return {
      videoId: upcomingItem.id,
      liveChatId: upcomingItem.snippet.liveChatId,
      concurrentViewers:
        upcomingItem.statistics?.concurrentViewers != null
          ? parseInt(String(upcomingItem.statistics.concurrentViewers), 10) || 0
          : null,
      isLive: true,
    };
  }

  // 3) All mine broadcasts — filter by lifeCycleStatus
  const allMine = await fetchBroadcasts(
    apiFetch,
    "mine=true&broadcastType=all&maxResults=25",
  );
  const mineLive = allMine.find((item) =>
    LIVE_STATUSES.has(item.status?.lifeCycleStatus || ""),
  );
  if (mineLive) {
    const info = broadcastToLiveInfo(mineLive);
    if (info?.liveChatId) return info;
    if (info?.videoId) {
      const fromVideo = await resolveFromVideoId(apiFetch, info.videoId);
      if (fromVideo) return fromVideo;
      return info;
    }
  }

  // 4) Fallback: search channel for a live video (higher quota cost)
  if (channelId) {
    const fromSearch = await resolveFromSearch(apiFetch, channelId);
    if (fromSearch) return fromSearch;
  }

  return null;
}
