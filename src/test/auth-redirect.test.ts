import { describe, expect, it } from "vitest";
import { isRecoveryUrl, resetRedirectUrl } from "@/lib/auth-redirect";

describe("resetRedirectUrl", () => {
  it("builds the reset page from the current origin, never a hard-coded host", () => {
    expect(resetRedirectUrl("https://hibou-soutienscolaire.lovable.app")).toBe(
      "https://hibou-soutienscolaire.lovable.app/reset-password",
    );
  });
  it("does not double the slash when the origin ends with one", () => {
    expect(resetRedirectUrl("https://hibou.app/")).toBe("https://hibou.app/reset-password");
  });
});

describe("isRecoveryUrl", () => {
  it("accepts a token-flow reset link", () => {
    expect(
      isRecoveryUrl("https://hibou.app/reset-password#access_token=abc&token_type=bearer&type=recovery"),
    ).toBe(true);
  });
  it("accepts a PKCE reset link still carrying its exchange code", () => {
    expect(isRecoveryUrl("https://hibou.app/reset-password?code=xyz123")).toBe(true);
  });
  it("rejects a signup confirmation link (type=signup)", () => {
    expect(isRecoveryUrl("https://hibou.app/reset-password#access_token=abc&type=signup")).toBe(false);
  });
  it("rejects a plain visit to the reset page", () => {
    expect(isRecoveryUrl("https://hibou.app/reset-password")).toBe(false);
  });
});
