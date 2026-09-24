// Deterministic policy comparison: split both versions into sections,
// match sections by number or title, then run a word-level diff (LCS)
// on each pair. Everything shown on screen comes from the pasted text;
// the AI is only asked to summarise the changes this code found.

const KEYWORD_HEADING = /^\s*(section|article|chapter|part|annex|schedule|§)\s*([0-9]+[a-z]?|[ivxlc]+)\b/i;
const NUMBERED_HEADING = /^\s*(\d+(?:\.\d+)*)[.)]?\s+\S/;

function headingInfo(line) {
  const t = line.trim();
  if (!t || t.length > 120) return null;
  let m = t.match(KEYWORD_HEADING);
  if (m) {
    const word = m[1] === "§" ? "section" : m[1].toLowerCase();
    return { key: `${word} ${m[2].toLowerCase()}` };
  }
  // "1. Scope" / "4.2 Sanctions" — only short lines that don't read like a sentence
  m = t.match(NUMBERED_HEADING);
  if (m && t.length <= 80 && !/[.;:,]$/.test(t)) return { key: `num ${m[1]}` };
  return null;
}

const titleKey = (heading) =>
  heading.toLowerCase().replace(/\[[^\]]*\]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

export function splitSections(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const sections = [];
  let cur = null;
  for (const line of lines) {
    const h = headingInfo(line);
    if (h) {
      cur = { heading: line.trim(), key: h.key, title: titleKey(line), lines: [line] };
      sections.push(cur);
    } else {
      if (!cur) {
        if (!line.trim()) continue;
        cur = { heading: "(Text before the first heading)", key: "preamble", title: "preamble", lines: [] };
        sections.push(cur);
      }
      cur.lines.push(line);
    }
  }
  if (sections.length === 1 && sections[0].key === "preamble") {
    sections[0].heading = "(Whole document — no section headings found)";
  }
  return sections.map((s) => ({ ...s, text: s.lines.join("\n").trim() }));
}

// Pair V1 and V2 sections. Keys first (Section 19 ↔ Section 19), then titles.
export function matchSections(a, b) {
  const usedA = new Set();
  const pairOfB = b.map(() => -1);
  const tryMatch = (field) => {
    b.forEach((sb, j) => {
      if (pairOfB[j] !== -1) return;
      const i = a.findIndex((sa, i) => !usedA.has(i) && sa[field] && sa[field] === sb[field]);
      if (i !== -1) { usedA.add(i); pairOfB[j] = i; }
    });
  };
  tryMatch("key");
  tryMatch("title");

  // Keep document order: removed V1 sections appear where they used to be.
  const out = [];
  let nextA = 0;
  const flushRemovedBefore = (limit) => {
    for (; nextA < limit; nextA++) if (!usedA.has(nextA)) out.push({ old: a[nextA], new: null });
  };
  b.forEach((sb, j) => {
    const i = pairOfB[j];
    if (i !== -1) { flushRemovedBefore(i); nextA = Math.max(nextA, i + 1); }
    out.push({ old: i === -1 ? null : a[i], new: sb });
  });
  flushRemovedBefore(a.length);
  return out;
}

const TOKEN = /\s+|[\p{L}\p{N}]+(?:[.,'’\-/][\p{L}\p{N}]+)*|[^\s\p{L}\p{N}]/gu;
const tokenize = (s) => s.match(TOKEN) || [];
const isWs = (t) => /^\s+$/.test(t);
const same = (x, y) => x === y || (isWs(x) && isWs(y));

// Word-level LCS diff. Returns [{t:'eq'|'del'|'ins', s}]
export function diffWords(oldText, newText) {
  const A = tokenize(oldText), B = tokenize(newText);
  let pre = 0;
  while (pre < A.length && pre < B.length && same(A[pre], B[pre])) pre++;
  let suf = 0;
  while (suf < A.length - pre && suf < B.length - pre && same(A[A.length - 1 - suf], B[B.length - 1 - suf])) suf++;
  const a = A.slice(pre, A.length - suf), b = B.slice(pre, B.length - suf);
  const n = a.length, m = b.length;

  const ops = [];
  if (pre) ops.push({ t: "eq", s: B.slice(0, pre).join("") });
  if (n * m > 16e6) {
    // too large for a word-level table: show the block as replaced
    if (n) ops.push({ t: "del", s: a.join("") });
    if (m) ops.push({ t: "ins", s: b.join("") });
  } else {
    const W = m + 1;
    const L = new Uint32Array((n + 1) * W);
    for (let i = n - 1; i >= 0; i--)
      for (let j = m - 1; j >= 0; j--)
        L[i * W + j] = same(a[i], b[j]) ? L[(i + 1) * W + j + 1] + 1 : Math.max(L[(i + 1) * W + j], L[i * W + j + 1]);
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (same(a[i], b[j])) { ops.push({ t: "eq", s: b[j] }); i++; j++; }
      else if (L[(i + 1) * W + j] >= L[i * W + j + 1]) ops.push({ t: "del", s: a[i++] });
      else ops.push({ t: "ins", s: b[j++] });
    }
    while (i < n) ops.push({ t: "del", s: a[i++] });
    while (j < m) ops.push({ t: "ins", s: b[j++] });
  }
  if (suf) ops.push({ t: "eq", s: B.slice(B.length - suf).join("") });

  // A lone space between two changes belongs to the change, so highlights don't fragment.
  for (let k = 1; k < ops.length - 1; k++) {
    if (ops[k].t === "eq" && isWs(ops[k].s) && ops[k - 1].t !== "eq" && ops[k + 1].t !== "eq") {
      ops.splice(k, 1, { t: "del", s: ops[k].s }, { t: "ins", s: ops[k].s });
    }
  }
  // Merge runs of the same type; put deletions before insertions inside a change.
  const merged = [];
  let k = 0;
  while (k < ops.length) {
    if (ops[k].t === "eq") {
      const last = merged[merged.length - 1];
      if (last && last.t === "eq") last.s += ops[k].s; else merged.push({ ...ops[k] });
      k++;
      continue;
    }
    let del = "", ins = "";
    while (k < ops.length && ops[k].t !== "eq") { if (ops[k].t === "del") del += ops[k].s; else ins += ops[k].s; k++; }
    if (del) merged.push({ t: "del", s: del });
    if (ins) merged.push({ t: "ins", s: ins });
  }
  return merged;
}

// Pairs of old → new for each contiguous change, for the "Changes" chips and the AI prompt.
export function changeBlocks(ops) {
  const blocks = [];
  let cur = null;
  for (const o of ops) {
    if (o.t === "eq") { cur = null; continue; }
    if (!cur) { cur = { old: "", new: "" }; blocks.push(cur); }
    if (o.t === "del") cur.old += o.s; else cur.new += o.s;
  }
  return blocks
    .map((b) => ({ old: b.old.trim(), new: b.new.trim() }))
    .filter((b) => b.old || b.new);
}

const norm = (s) => s.replace(/\s+/g, " ").trim();

export function comparePolicies(v1, v2) {
  const pairs = matchSections(splitSections(v1), splitSections(v2));
  const changes = [];
  let unchanged = 0;
  pairs.forEach((p) => {
    if (p.old && p.new) {
      if (norm(p.old.text) === norm(p.new.text)) { unchanged++; return; }
      const ops = diffWords(p.old.text, p.new.text);
      const blocks = changeBlocks(ops);
      changes.push({ type: "modified", section: p.new.heading, oldText: p.old.text, newText: p.new.text, ops, blocks,
        numeric: blocks.some((b) => /\d/.test(b.old + b.new)) });
    } else if (p.new) {
      changes.push({ type: "added", section: p.new.heading, oldText: "", newText: p.new.text, ops: [{ t: "ins", s: p.new.text }], blocks: [], numeric: false });
    } else {
      changes.push({ type: "removed", section: p.old.heading, oldText: p.old.text, newText: "", ops: [{ t: "del", s: p.old.text }], blocks: [], numeric: false });
    }
  });
  return { changes, unchanged };
}
