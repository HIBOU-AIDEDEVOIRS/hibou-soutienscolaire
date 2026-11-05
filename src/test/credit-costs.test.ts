import { describe, expect, it } from "vitest";
import { dataUrlBytes, imageCost, VOICE_COST } from "@/lib/credit-costs";

describe("credit costs", () => {
  it("voice note costs 0.5", () => expect(VOICE_COST).toBe(0.5));
  it("small image (≤ 1 Mo) costs 0.5", () => expect(imageCost(500_000)).toBe(0.5));
  it("exactly 1 Mo costs 0.5", () => expect(imageCost(1024 * 1024)).toBe(0.5));
  it("large image (> 1 Mo) costs 0.75", () => expect(imageCost(2_000_000)).toBe(0.75));
  it("measures data URL size", () => expect(dataUrlBytes("data:image/png;base64,AAAA")).toBe(3));
});
