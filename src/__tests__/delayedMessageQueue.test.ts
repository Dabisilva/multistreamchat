import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChatMessage } from "@/types";
import { DelayedMessageQueue } from "@/utils/delayedMessageQueue";

function message(partial: Partial<ChatMessage> & Pick<ChatMessage, "id">): ChatMessage {
  return {
    userId: "1",
    username: "alice",
    displayName: "Alice",
    displayColor: "#fff",
    text: "hi",
    badges: [],
    emotes: [],
    isAction: false,
    timestamp: Number(partial.id.replace(/\D/g, "") || 1),
    provider: "twitch",
    channel: "chan",
    msgId: partial.id,
    ...partial,
  };
}

describe("DelayedMessageQueue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("releases messages after the delay and keeps order", () => {
    vi.useFakeTimers();
    const released: string[] = [];
    const queue = new DelayedMessageQueue({
      delayMs: 1000,
      onRelease: (msg) => released.push(msg.id),
    });

    queue.enqueue(message({ id: "1", timestamp: 1 }));
    queue.enqueue(message({ id: "2", timestamp: 2 }));
    expect(released).toEqual([]);

    vi.advanceTimersByTime(999);
    expect(released).toEqual([]);
    vi.advanceTimersByTime(1);
    expect(released).toEqual(["1", "2"]);
    queue.dispose();
  });

  it("releases immediately when delay is zero", () => {
    const released: string[] = [];
    const queue = new DelayedMessageQueue({
      delayMs: 0,
      onRelease: (msg) => released.push(msg.id),
    });
    queue.enqueue(message({ id: "now" }));
    expect(released).toEqual(["now"]);
  });

  it("does not release deleted or banned messages", () => {
    vi.useFakeTimers();
    const released: string[] = [];
    const queue = new DelayedMessageQueue({
      delayMs: 2000,
      onRelease: (msg) => released.push(msg.id),
    });

    queue.enqueue(message({ id: "keep" }));
    queue.enqueue(message({ id: "gone", msgId: "gone" }));
    queue.enqueue(message({ id: "banned", username: "spammer", displayName: "Spammer" }));

    queue.cancelByMsgId("gone");
    queue.cancelByUser("spammer");
    vi.advanceTimersByTime(2000);

    expect(released).toEqual(["keep"]);
    queue.dispose();
  });

  it("drops delayed messages from an old channel/provider", () => {
    vi.useFakeTimers();
    const released: string[] = [];
    const queue = new DelayedMessageQueue({
      delayMs: 1000,
      onRelease: (msg) => released.push(msg.id),
    });

    queue.enqueue(message({ id: "old", provider: "twitch" }));
    queue.enqueue(message({ id: "kick", provider: "kick" }));
    queue.cancelByProvider("twitch");
    vi.advanceTimersByTime(1000);

    expect(released).toEqual(["kick"]);
    queue.dispose();
  });

  it("cancels pending work on dispose so stale messages cannot land", () => {
    vi.useFakeTimers();
    const released: string[] = [];
    const queue = new DelayedMessageQueue({
      delayMs: 1000,
      onRelease: (msg) => released.push(msg.id),
    });

    queue.enqueue(message({ id: "stale" }));
    queue.dispose();
    vi.advanceTimersByTime(5000);
    expect(released).toEqual([]);
  });

  it("stays bounded under high volume", () => {
    vi.useFakeTimers();
    const released: string[] = [];
    const queue = new DelayedMessageQueue({
      delayMs: 5000,
      maxPending: 3,
      onRelease: (msg) => released.push(msg.id),
    });

    queue.enqueue(message({ id: "1" }));
    queue.enqueue(message({ id: "2" }));
    queue.enqueue(message({ id: "3" }));
    queue.enqueue(message({ id: "4" }));
    expect(queue.size).toBe(3);

    vi.advanceTimersByTime(5000);
    expect(released).toEqual(["2", "3", "4"]);
    queue.dispose();
  });
});
