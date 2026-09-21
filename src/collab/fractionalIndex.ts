// Order keys for a list that several people edit at once — the web twin of the
// app's `Sources/Collab/FractionalIndex.swift`. The two MUST mint identical keys
// (shared vectors in both test suites): a line inserted on the web and one
// inserted in the app have to sort the same way everywhere.
//
// Keys are base-62 digit strings ("0-9A-Za-z", which is also their ASCII order)
// read as fractions. A key never ends in "0", so there is always room before it.

const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const BASE = 62;
/** Appending/prepending steps a fixed-width head instead of bisecting what's left. */
const HEAD = 4;
const STEP = 16;
/** Split a gap 1/8 of the way in: lines are usually written one after another. */
const BIAS = 8;

const val = (c: string | undefined): number => (c === undefined ? 0 : DIGITS.indexOf(c));

/** A key strictly between `a` and `b`. null/empty = the open end on that side. */
export function between(a: string | null, b: string | null): string {
  const lo = a || null;
  const hi = b || null;
  if (lo === null && hi === null) return "V";
  if (hi === null) return after(lo!);
  if (lo === null) return before(hi);
  if (!(lo < hi)) throw new Error(`fractionalIndex.between needs a < b (got ${lo} ≥ ${hi})`);
  return midpoint(lo, hi);
}

/** `count` evenly spaced keys for a whole list at once (first share, rebalance). */
export function spread(count: number): string[] {
  if (count <= 0) return [];
  let width = 2;
  while (Math.pow(BASE, width) < (count + 1) * 64) width++;
  const stride = Math.floor(Math.pow(BASE, width) / (count + 1));
  return Array.from({ length: count }, (_, i) => encode((i + 1) * stride, width));
}

function head(key: string): number {
  let n = 0;
  for (let i = 0; i < HEAD; i++) n = n * BASE + val(key[i]);
  return n;
}

function after(a: string): string {
  const n = head(a) + STEP;
  return n < Math.pow(BASE, HEAD) ? encode(n, HEAD) : midpoint(a, null);
}

function before(b: string): string {
  const n = head(b) - STEP;
  return n > 0 ? encode(n, HEAD) : midpoint("", b);
}

/** Fixed-width base-62, never ending in "0" (nudged up by one, still inside the step). */
function encode(value: number, width: number): string {
  let n = value % BASE === 0 ? value + 1 : value;
  const out = new Array<string>(width).fill("0");
  for (let i = width - 1; i >= 0; i--) {
    out[i] = DIGITS[n % BASE];
    n = Math.floor(n / BASE);
  }
  return out.join("");
}

/** `a` < `b` as fractions; `b` null = 1.0. Neither ends in "0". */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    let n = 0;
    while (n < b.length && (a[n] ?? "0") === b[n]) n++;
    if (n > 0) return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
  }
  const da = val(a[0]);
  const db = b !== null && b.length > 0 ? val(b[0]) : BASE;
  if (db - da > 1) return DIGITS[da + Math.max(1, Math.floor((db - da) / BIAS))];
  if (b !== null && b.length > 1) return b[0];
  return DIGITS[da] + midpoint(a.slice(1), null);
}
