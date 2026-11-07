import { describe, expect, it } from "vitest";
import { buildSystemPrompt, isMode, isProMode, MODES, type PromptProfile } from "@/lib/prompt";

const base: PromptProfile = {
  nickname: "Sam", first_name: "Samuel", grade: "4e", age: 13, tone: "cool", use_emojis: true,
  answer_length: "normal", correct_mistakes: true, interests: "", word_map: [{ from: "Bonjour", to: "Salut" }],
};

describe("buildSystemPrompt", () => {
  it("always forbids giving the answer, in every mode", () => {
    for (const { value: m } of MODES) {
      expect(buildSystemPrompt(base, m)).toContain("tu ne donnes JAMAIS la réponse");
    }
  });
  it("accepts corriger as a supported mode", () => {
    expect(isMode("corriger")).toBe(true);
    expect(isMode("correction-inconnue")).toBe(false);
  });
  it("guides correction without revealing the correct answer", () => {
    const prompt = buildSystemPrompt(base, "corriger");
    expect(prompt).toContain("demande l'énoncé et la tentative de l'élève s'ils manquent");
    expect(prompt).toContain("sans révéler la bonne réponse ni réécrire son devoir");
  });
  it("makes Rechercher and Corriger Pro, keeps Générer free", () => {
    expect(isProMode("rechercher")).toBe(true);
    expect(isProMode("corriger")).toBe(true);
    expect(isProMode("generer")).toBe(false);
  });
  it("uses the chosen nickname, grade and age", () => {
    const s = buildSystemPrompt(base, "expliquer");
    expect(s).toContain("aide Sam");
    expect(s).toContain("classe 4e, 13 ans");
  });
  it("includes custom word replacements", () => {
    expect(buildSystemPrompt(base, "expliquer")).toContain("« Bonjour » → « Salut »");
  });
  it("adds the spelling correction note only when enabled", () => {
    expect(buildSystemPrompt(base, "expliquer")).toContain("Petite correction");
    expect(buildSystemPrompt({ ...base, correct_mistakes: false }, "expliquer")).not.toContain("Petite correction");
  });
});
