// A word-level comparison of two texts — twin of the app's WordDiff.swift:
// same tokens (runs of non-blanks / runs of blanks), same plain LCS, so both
// sides show the same segments on the same input (shared test vectors).

export type Segment = { kind: "same" | "removed" | "inserted"; text: string };

export function tokens(s: string): string[] {
  const out: string[] = [];
  let cur = "", blank: boolean | undefined;
  for (const ch of s) {
    const b = /\s/.test(ch);
    if (blank !== undefined && blank !== b) { out.push(cur); cur = ""; }
    cur += ch; blank = b;
  }
  if (cur) out.push(cur);
  return out;
}

/** Above this many cell comparisons the line is shown as replaced outright. */
const CAP = 250_000;

export function wordDiff(oldText: string, newText: string): Segment[] {
  if (oldText === newText) return oldText ? [{ kind: "same", text: oldText }] : [];
  const a = tokens(oldText), b = tokens(newText);
  if (!a.length) return [{ kind: "inserted", text: newText }];
  if (!b.length) return [{ kind: "removed", text: oldText }];
  if (a.length * b.length > CAP) return [{ kind: "removed", text: oldText }, { kind: "inserted", text: newText }];
  const n = a.length, m = b.length;
  const L: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  // Walk forward; at a fork prefer removing (old text first, then new).
  const raw: Segment[] = [];
  let i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { raw.push({ kind: "same", text: a[i] }); i++; j++; }
    else if (j === m || (i < n && L[i + 1][j] >= L[i][j + 1])) { raw.push({ kind: "removed", text: a[i] }); i++; }
    else { raw.push({ kind: "inserted", text: b[j] }); j++; }
  }
  return normalise(raw);
}

/** Within each run of changes put removals before insertions, then merge neighbours of the same kind. */
function normalise(raw: Segment[]): Segment[] {
  const out: Segment[] = [];
  let removed = "", inserted = "";
  const flush = () => {
    if (removed) { out.push({ kind: "removed", text: removed }); removed = ""; }
    if (inserted) { out.push({ kind: "inserted", text: inserted }); inserted = ""; }
  };
  for (const s of raw) {
    if (s.kind === "same") {
      flush();
      const last = out[out.length - 1];
      if (last?.kind === "same") last.text += s.text; else out.push({ kind: "same", text: s.text });
    } else if (s.kind === "removed") removed += s.text;
    else inserted += s.text;
  }
  flush();
  return out;
}
