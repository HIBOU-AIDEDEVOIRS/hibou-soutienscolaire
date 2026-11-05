import { describe, expect, it } from "vitest";
import { friendlyPasswordError, passwordIssue } from "@/lib/password";

describe("passwordIssue", () => {
  it("rejects a password shorter than 6 characters", () => {
    expect(passwordIssue("abc", "abc")).toBe("Mot de passe trop court : 6 caractères minimum.");
  });
  it("rejects a 5-character password even when both fields match", () => {
    expect(passwordIssue("abcde", "abcde")).toBe("Mot de passe trop court : 6 caractères minimum.");
  });
  it("accepts a 6-character password typed twice the same way", () => {
    expect(passwordIssue("soleil", "soleil")).toBeNull();
  });
  it("rejects two different passwords", () => {
    expect(passwordIssue("soleil", "lune66")).toBe("Les deux mots de passe ne sont pas identiques.");
  });
});

describe("friendlyPasswordError", () => {
  it("explains that the new password must differ from the old one", () => {
    expect(
      friendlyPasswordError(new Error("New password must be different from the old password.")),
    ).toBe("Choisis un mot de passe différent de l'ancien.");
  });
  it("translates the too-short answer from the backend", () => {
    expect(friendlyPasswordError(new Error("Password should be at least 6 characters"))).toBe(
      "Mot de passe trop court : 6 caractères minimum.",
    );
  });
  it("asks to log in again when the backend demands reauthentication", () => {
    expect(friendlyPasswordError(new Error("Sensitive operation - please reauthenticate"))).toBe(
      "Reconnecte-toi, puis réessaie de changer ton mot de passe.",
    );
  });
  it("says the login is gone in the settings, the link is gone on the reset page", () => {
    expect(friendlyPasswordError(new Error("Auth session missing!"))).toBe(
      "Tu n'es plus connecté : reconnecte-toi pour changer ton mot de passe.",
    );
    expect(friendlyPasswordError(new Error("Auth session missing!"), true)).toBe(
      "Ton lien a expiré. Demande un nouveau lien de réinitialisation.",
    );
  });
});
