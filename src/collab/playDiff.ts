// A line-by-line comparison of two states of a play, by element id — twin of the
// app's PlayDiff.swift (same rows on the same input; shared test vectors).
export interface DocEl { id?: string; type: string; text?: string; label?: string; setting?: string; character?: string; parenthetical?: string; beat?: string; synopsis?: string }
export type DiffRow =
  | { kind: "same"; doc: DocEl }
  | { kind: "added"; doc: DocEl }
  | { kind: "removed"; doc: DocEl }
  | { kind: "changed"; from: DocEl; doc: DocEl }
  | { kind: "moved"; doc: DocEl };

export const sameDoc = (x: DocEl, y: DocEl): boolean =>
  x.type === y.type && x.text === y.text && x.label === y.label && x.setting === y.setting &&
  x.character === y.character && x.parenthetical === y.parenthetical && x.beat === y.beat && x.synopsis === y.synopsis;

export function compare(a: DocEl[], b: DocEl[]): DiffRow[] {
  const inB = new Set(b.map((e) => e.id).filter(Boolean)), inA = new Set(a.map((e) => e.id).filter(Boolean));
  const consumed = new Set<string>();
  const rows: DiffRow[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && a[i].id && consumed.has(a[i].id!)) { i++; continue; }
    if (i < a.length && j < b.length && a[i].id && a[i].id === b[j].id) {
      rows.push(sameDoc(a[i], b[j]) ? { kind: "same", doc: b[j] } : { kind: "changed", from: a[i], doc: b[j] }); i++; j++;
    } else if (i < a.length && !(a[i].id && inB.has(a[i].id))) {
      rows.push({ kind: "removed", doc: a[i] }); i++;
    } else if (j < b.length && !(b[j].id && inA.has(b[j].id))) {
      rows.push({ kind: "added", doc: b[j] }); j++;
    } else if (j < b.length) {
      if (b[j].id) consumed.add(b[j].id!);
      const old = a.find((e) => e.id === b[j].id);
      if (old && !sameDoc(old, b[j])) rows.push({ kind: "changed", from: old, doc: b[j] }); else rows.push({ kind: "moved", doc: b[j] });
      j++;
    } else i++;
  }
  return rows;
}

export function summary(rows: DiffRow[]): { added: number; removed: number; changed: number; moved: number } {
  const s = { added: 0, removed: 0, changed: 0, moved: 0 };
  for (const r of rows) if (r.kind !== "same") s[r.kind]++;
  return s;
}
