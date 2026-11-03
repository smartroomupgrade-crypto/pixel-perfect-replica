import { describe, expect, it } from "vitest";
import { resolveServerUrl } from "@/lib/native";

describe("Android app online requests", () => {
  it("sends server requests to the published address inside the Android app", () => {
    expect(resolveServerUrl("/_serverFn/abc", true, "https://smartroom.lovable.app")).toBe(
      "https://smartroom.lovable.app/_serverFn/abc",
    );
  });

  it("leaves requests unchanged in the browser", () => {
    expect(resolveServerUrl("/_serverFn/abc", false, "https://smartroom.lovable.app")).toBe("/_serverFn/abc");
  });

  it("refuses to fall back to the phone itself when no published address was built in", () => {
    expect(() => resolveServerUrl("/_serverFn/abc", true, "")).toThrow();
  });
});
