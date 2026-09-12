import { describe, expect, it } from "vitest";
import { hexToRgba, sanitizeCssColor } from "@/utils/colorUtils";
import {
  createUsernameHtml,
  htmlEncode,
  shouldHideMessage,
} from "@/utils/messageUtils";
import { nextYoutubeRediscoveryDelayMs } from "@/services/youtubeLive";
import { nextKickReconnectDelayMs } from "@/services/KickChat";

describe("htmlEncode", () => {
  it("encodes markup and ampersands", () => {
    expect(htmlEncode(`<img src="x" onerror="alert(&)">`)).toContain("&lt;");
    expect(htmlEncode("a & b")).toBe("a &amp; b");
  });
});

describe("createUsernameHtml", () => {
  it("encodes display names before HTML injection", () => {
    const html = createUsernameHtml(`<b>mod</b>`, "#fff");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;b&gt;mod&lt;/b&gt;");
  });

  it("rejects unsafe CSS colors", () => {
    const html = createUsernameHtml("alice", `red; } </style><img src=x>`);
    expect(html).toContain("color: #ffffff");
    expect(html).not.toContain("red;");
  });
});

describe("shouldHideMessage", () => {
  it("hides commands and ignored logins", () => {
    expect(shouldHideMessage("!help", true, [], "alice")).toBe(true);
    expect(shouldHideMessage("hi", true, ["nightbot"], "NightBot", "nightbot")).toBe(
      true,
    );
    expect(shouldHideMessage("hi", true, ["other"], "alice", "alice")).toBe(false);
  });
});

describe("hexToRgba", () => {
  it("returns a transparent color for empty or invalid hex", () => {
    expect(hexToRgba("", "0")).toBe("rgba(0, 0, 0, 0)");
    expect(hexToRgba("nope", "1")).toBe("rgba(0, 0, 0, 1)");
  });

  it("converts valid hex", () => {
    expect(hexToRgba("#ff0000", "0.5")).toBe("rgba(255, 0, 0, 0.5)");
    expect(sanitizeCssColor("#abc")).toBe("#abc");
  });
});

describe("reconnect/rediscovery backoff", () => {
  it("bounds Kick reconnect delay", () => {
    expect(nextKickReconnectDelayMs(0)).toBe(5000);
    expect(nextKickReconnectDelayMs(1)).toBe(10000);
    expect(nextKickReconnectDelayMs(10)).toBe(30000);
  });

  it("bounds YouTube rediscovery delay", () => {
    expect(nextYoutubeRediscoveryDelayMs(0)).toBe(30_000);
    expect(nextYoutubeRediscoveryDelayMs(1)).toBe(60_000);
    expect(nextYoutubeRediscoveryDelayMs(8)).toBe(5 * 60_000);
  });
});
