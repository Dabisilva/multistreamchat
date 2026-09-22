import type { ChatMessage, Platform } from "@/types";

export const CHAT_DISPLAY_LIMITS = {
  hideAfterSeconds: 180,
  messagesLimit: 20,
} as const;

export const PRIVILEGED_BADGES = [
  "lead_moderator",
  "moderator",
  "vip",
  "broadcaster",
  "owner",
  "og",
  "staff",
  "super_admin",
];

export function getMessageKey(message: ChatMessage): string {
  return `${message.provider}:${message.msgId || message.id}`;
}

export function appendBounded<T>(items: T[], item: T, limit: number): T[] {
  const next = [...items, item];
  if (limit <= 0) return [];
  return next.length > limit ? next.slice(-limit) : next;
}

export function excludeProvider(
  messages: ChatMessage[],
  provider: Platform,
): ChatMessage[] {
  return messages.filter((message) => message.provider !== provider);
}

export function hasPrivilegedBadge(badges: ChatMessage["badges"]): boolean {
  return badges.some((badge) =>
    PRIVILEGED_BADGES.includes(badge.type?.toLowerCase() || ""),
  );
}

export function messageMatchesUser(
  message: Pick<ChatMessage, "username" | "displayName" | "userId">,
  username: string,
  userId?: string,
): boolean {
  if (userId && message.userId && message.userId === userId) return true;
  const target = username.trim().toLowerCase();
  if (!target) return false;
  return (
    message.username.toLowerCase() === target ||
    message.displayName.toLowerCase() === target
  );
}

export class MessageIdSet {
  private ids = new Set<string>();

  constructor(
    private readonly limit = 1000,
    private readonly keep = 500,
  ) {}

  has(key: string): boolean {
    return this.ids.has(key);
  }

  add(key: string): void {
    this.ids.add(key);
    if (this.ids.size > this.limit) {
      const idsArray = Array.from(this.ids);
      this.ids.clear();
      idsArray.slice(-this.keep).forEach((id) => this.ids.add(id));
    }
  }

  deleteByPrefix(prefix: string): void {
    for (const id of this.ids) {
      if (id.startsWith(prefix)) {
        this.ids.delete(id);
      }
    }
  }

  clear(): void {
    this.ids.clear();
  }

  get size(): number {
    return this.ids.size;
  }
}
