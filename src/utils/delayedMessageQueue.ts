import type { ChatMessage, Platform } from "@/types";
import { messageMatchesUser } from "@/utils/chatLogic";

export interface DelayedQueueItem {
  message: ChatMessage;
  releaseAt: number;
}

export interface DelayedMessageQueueOptions {
  delayMs: number;
  onRelease: (message: ChatMessage) => void;
  maxPending?: number;
  now?: () => number;
}

export class DelayedMessageQueue {
  private pending = new Map<string, DelayedQueueItem>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delayMs: number;
  private onRelease: (message: ChatMessage) => void;
  private readonly maxPending: number;
  private readonly now: () => number;
  private disposed = false;

  constructor(options: DelayedMessageQueueOptions) {
    this.delayMs = Math.max(0, options.delayMs);
    this.onRelease = options.onRelease;
    this.maxPending = options.maxPending ?? 250;
    this.now = options.now ?? (() => Date.now());
  }

  setDelay(delayMs: number): void {
    this.delayMs = Math.max(0, delayMs);
  }

  get size(): number {
    return this.pending.size;
  }

  enqueue(message: ChatMessage): void {
    if (this.disposed) return;

    if (this.delayMs <= 0) {
      this.onRelease(message);
      return;
    }

    while (this.pending.size >= this.maxPending) {
      const oldestKey = this.pending.keys().next().value;
      if (oldestKey == null) break;
      this.pending.delete(oldestKey);
    }

    this.pending.set(message.id, {
      message,
      releaseAt: this.now() + this.delayMs,
    });
    this.schedule();
  }

  cancel(id: string): ChatMessage | undefined {
    const item = this.pending.get(id);
    if (!item) return undefined;
    this.pending.delete(id);
    this.schedule();
    return item.message;
  }

  cancelByMsgId(msgId: string): ChatMessage | undefined {
    if (!msgId) return undefined;
    for (const [id, item] of this.pending) {
      if (item.message.msgId === msgId || item.message.id === msgId) {
        this.pending.delete(id);
        this.schedule();
        return item.message;
      }
    }
    return undefined;
  }

  cancelByUser(username: string, userId?: string): void {
    let removed = false;
    for (const [id, item] of this.pending) {
      if (messageMatchesUser(item.message, username, userId)) {
        this.pending.delete(id);
        removed = true;
      }
    }
    if (removed) this.schedule();
  }

  cancelByProvider(provider: Platform): void {
    let removed = false;
    for (const [id, item] of this.pending) {
      if (item.message.provider === provider) {
        this.pending.delete(id);
        removed = true;
      }
    }
    if (removed) this.schedule();
  }

  clear(): void {
    this.pending.clear();
    this.clearTimer();
  }

  dispose(): void {
    this.disposed = true;
    this.clear();
    this.onRelease = () => {};
  }

  private schedule(): void {
    this.clearTimer();
    if (this.disposed || this.pending.size === 0) return;

    let nextRelease = Infinity;
    for (const item of this.pending.values()) {
      if (item.releaseAt < nextRelease) {
        nextRelease = item.releaseAt;
      }
    }

    const wait = Math.max(0, nextRelease - this.now());
    this.timer = setTimeout(() => this.flushDue(), wait);
  }

  private flushDue(): void {
    this.timer = null;
    if (this.disposed) return;

    const now = this.now();
    const due: ChatMessage[] = [];

    for (const [id, item] of this.pending) {
      if (item.releaseAt <= now) {
        this.pending.delete(id);
        due.push(item.message);
      }
    }

    due.sort((a, b) => a.timestamp - b.timestamp);
    for (const message of due) {
      if (this.disposed) return;
      this.onRelease(message);
    }

    this.schedule();
  }

  private clearTimer(): void {
    if (this.timer != null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
