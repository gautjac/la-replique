import { describe, it, expect } from "vitest";
import { STRINGS, t } from "./i18n";

describe("i18n completeness", () => {
  const keys = Object.keys(STRINGS) as (keyof typeof STRINGS)[];

  it("has at least one string", () => {
    expect(keys.length).toBeGreaterThan(0);
  });

  it("every key has a non-empty fr and en value", () => {
    for (const k of keys) {
      expect(STRINGS[k].fr, `fr missing for ${k}`).toBeTruthy();
      expect(STRINGS[k].en, `en missing for ${k}`).toBeTruthy();
    }
  });

  it("t() returns the right locale", () => {
    expect(t("newPlay", "fr")).toBe(STRINGS.newPlay.fr);
    expect(t("newPlay", "en")).toBe(STRINGS.newPlay.en);
  });
});
