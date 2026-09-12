import { describe, expect, it } from "vitest";
import { stripSensitiveSearch } from "@/utils/sensitiveUrl";

describe("stripSensitiveSearch", () => {
  it("removes tokens but keeps overlay config", () => {
    const next = stripSensitiveSearch(
      "twitchChannel=alice&twitchToken=secret&refreshToken=r1&messageDelay=5",
    );
    const params = new URLSearchParams(next);
    expect(params.get("twitchChannel")).toBe("alice");
    expect(params.get("messageDelay")).toBe("5");
    expect(params.get("twitchToken")).toBeNull();
    expect(params.get("refreshToken")).toBeNull();
  });
});
