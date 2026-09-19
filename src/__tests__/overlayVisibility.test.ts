import { describe, expect, it } from "vitest";
import {
  overlayIsVisible,
  readObsBooleanDetail,
} from "@/utils/overlayVisibility";

describe("overlayIsVisible", () => {
  it("is visible by default in an OBS overlay", () => {
    expect(
      overlayIsVisible({
        documentHidden: false,
        obsVisible: true,
        obsActive: true,
      }),
    ).toBe(true);
  });

  it("pauses when the OBS source is hidden or not in the active scene", () => {
    expect(
      overlayIsVisible({
        documentHidden: false,
        obsVisible: false,
        obsActive: true,
      }),
    ).toBe(false);
    expect(
      overlayIsVisible({
        documentHidden: false,
        obsVisible: true,
        obsActive: false,
      }),
    ).toBe(false);
  });

  it("pauses when a browser tab is in the background", () => {
    expect(
      overlayIsVisible({
        documentHidden: true,
        obsVisible: true,
        obsActive: true,
      }),
    ).toBe(false);
  });
});

describe("readObsBooleanDetail", () => {
  it("reads the OBS CustomEvent object shape", () => {
    expect(readObsBooleanDetail({ visible: false }, "visible")).toBe(false);
    expect(readObsBooleanDetail({ active: true }, "active")).toBe(true);
  });

  it("accepts a raw boolean for the legacy callbacks", () => {
    expect(readObsBooleanDetail(false, "visible")).toBe(false);
  });
});
