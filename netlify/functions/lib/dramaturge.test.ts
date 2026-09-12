import { describe, expect, it } from "vitest";
import { DRAMATURGE_MAX_TURNS, TOOLS, trimHistory } from "./dramaturge.ts";

describe("dramaturge — thread hygiene", () => {
  it("keeps only the tail and starts on a user turn", () => {
    const h = Array.from({ length: 30 }, (_, i) => ({ role: (i % 2 ? "assistant" : "user") as "user" | "assistant", text: `t${i}` }));
    const out = trimHistory(h);
    expect(out.length).toBeLessThanOrEqual(DRAMATURGE_MAX_TURNS);
    expect(out[0].role).toBe("user");
    expect(out[out.length - 1].text).toBe("t29");
  });
  it("drops a leading assistant turn and empty/invalid turns", () => {
    expect(trimHistory([{ role: "assistant", text: "hi" }, { role: "user", text: "q" }, { role: "assistant", text: "" }, { role: "assistant", text: "a" }])).toEqual([
      { role: "user", text: "q" },
      { role: "assistant", text: "a" },
    ]);
    expect(trimHistory(undefined)).toEqual([]);
    expect(trimHistory([{ role: "system" as never, text: "x" }])).toEqual([]);
  });
  it("collapses same-role runs so the API sees strict alternation", () => {
    const out = trimHistory([{ role: "user", text: "a" }, { role: "user", text: "b" }, { role: "assistant", text: "c" }]);
    expect(out).toEqual([{ role: "user", text: "a\n\nb" }, { role: "assistant", text: "c" }]);
  });
  it("the reponse tool is last in the fixed tool list", () => {
    expect(TOOLS[TOOLS.length - 1].name).toBe("reponse");
  });
});
