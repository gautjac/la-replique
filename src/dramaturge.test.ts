import { describe, expect, it } from "vitest";
import { answerBlocks, starterQuestions, threadToHistory } from "./dramaturge";

describe("answerBlocks", () => {
  it("splits blank-line paragraphs and joins soft-wrapped lines", () => {
    expect(answerBlocks("Un.\nDeux.\n\nTrois.")).toEqual([
      { kind: "p", text: "Un. Deux." },
      { kind: "p", text: "Trois." },
    ]);
  });
  it("turns '- ' lines into a list, even mid-paragraph", () => {
    expect(answerBlocks("Deux pistes :\n- couper la réplique 4\n- faire entrer Bruno plus tôt\nVoilà.")).toEqual([
      { kind: "p", text: "Deux pistes :" },
      { kind: "ul", items: ["couper la réplique 4", "faire entrer Bruno plus tôt"] },
      { kind: "p", text: "Voilà." },
    ]);
  });
  it("ignores empty input and CRLF", () => {
    expect(answerBlocks("")).toEqual([]);
    expect(answerBlocks("a\r\n\r\nb")).toEqual([{ kind: "p", text: "a" }, { kind: "p", text: "b" }]);
  });
});

describe("starterQuestions", () => {
  const t = (k: string) => ({ aiStarter1: "Que veut {name} ?", aiStarter2: "Où ça tourne ?", aiStarter3: "Fin gagnée ?", aiStarter4: "Plus faible ?" })[k] ?? k;
  it("personalises the first starter with the first cast name", () => {
    expect(starterQuestions(t as never, ["ALICE", "BRUNO"])[0]).toBe("Que veut ALICE ?");
    expect(starterQuestions(t as never, ["ALICE"])).toHaveLength(4);
  });
  it("drops the personalised one when there is no cast", () => {
    expect(starterQuestions(t as never, [])).toEqual(["Où ça tourne ?", "Fin gagnée ?", "Plus faible ?"]);
  });
});

describe("threadToHistory", () => {
  it("keeps roles and drops empty turns", () => {
    expect(threadToHistory([{ role: "user", text: "q" }, { role: "assistant", text: " " }, { role: "assistant", text: "a" }])).toEqual([
      { role: "user", text: "q" },
      { role: "assistant", text: "a" },
    ]);
  });
});
