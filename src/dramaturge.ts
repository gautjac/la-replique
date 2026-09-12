// Pure helpers for the "Dramaturge" thread — tested, no React.
import type { DramaturgeTurn } from "./api";

export type AnswerBlock = { kind: "p"; text: string } | { kind: "ul"; items: string[] };

/** Split a dramaturg answer into paragraphs and "- " bullet lists. */
export function answerBlocks(answer: string): AnswerBlock[] {
  const out: AnswerBlock[] = [];
  for (const chunk of answer.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) continue;
    let para: string[] = [];
    let items: string[] = [];
    const flush = () => {
      if (para.length) out.push({ kind: "p", text: para.join(" ") });
      if (items.length) out.push({ kind: "ul", items });
      para = [];
      items = [];
    };
    for (const l of lines) {
      const m = /^[-•]\s+(.*)$/.exec(l);
      if (m) {
        if (para.length) {
          out.push({ kind: "p", text: para.join(" ") });
          para = [];
        }
        items.push(m[1]);
      } else {
        if (items.length) {
          out.push({ kind: "ul", items });
          items = [];
        }
        para.push(l);
      }
    }
    flush();
  }
  return out;
}

/** Starter questions for an empty thread (Conduite AI rule 9: solve the blank canvas). */
export function starterQuestions(t: (k: "aiStarter1" | "aiStarter2" | "aiStarter3" | "aiStarter4") => string, castNames: string[]): string[] {
  const name = castNames[0];
  const list = [name ? t("aiStarter1").replace("{name}", name) : null, t("aiStarter2"), t("aiStarter3"), t("aiStarter4")];
  return list.filter((s): s is string => !!s);
}

/** The thread as the server wants it: strictly alternating, oldest first, without the pending question. */
export function threadToHistory(thread: { role: "user" | "assistant"; text: string }[]): DramaturgeTurn[] {
  return thread.filter((t) => t.text.trim()).map((t) => ({ role: t.role, text: t.text }));
}
