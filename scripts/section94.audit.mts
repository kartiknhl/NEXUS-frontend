/**
 * Layout audit for the §94 notice — checks the rendered artifact, not the calls.
 *
 *   npx tsx scripts/section94.audit.mts
 *
 * Inflates the PDF content streams, parses the `x y Td / (text) Tj` operators
 * back into millimetres, and re-measures every line with the real font metrics
 * (recovered from the PDF's own font resource map) so the horizontal check is
 * exact rather than an estimate. Catches the failure mode the manual cursor
 * arithmetic in section94.ts is prone to: content overflowing a page or a margin.
 */
import { inflateSync } from "node:zlib";

import { buildSection94Notice, type NoticeTrace } from "../src/lib/section94";

const PT_PER_MM = 72 / 25.4;
const PAGE_H_MM = 297;
const PAGE_W_MM = 210;
const PAGE_H_PT = PAGE_H_MM * PT_PER_MM;
const MARGIN = 20;
const RIGHT_EDGE = PAGE_W_MM - MARGIN; // 190
const FOOTER_RULE = PAGE_H_MM - 18; // 279 — body must stay above this
const FOOTER_TEXT = PAGE_H_MM - 14; // 283 — footer baseline
const TOL = 0.75; // mm, absorbs rounding in the emitted coordinates

type Draw = {
  page: number;
  x: number;
  y: number;
  size: number;
  fontId: string;
  text: string;
};

/** jsPDF standard-14 BaseFont name -> (family, style) accepted by setFont. */
const FONT_MAP: Record<string, [string, string]> = {
  Helvetica: ["helvetica", "normal"],
  "Helvetica-Bold": ["helvetica", "bold"],
  "Helvetica-Oblique": ["helvetica", "italic"],
  "Helvetica-BoldOblique": ["helvetica", "bolditalic"],
  Courier: ["courier", "normal"],
  "Courier-Bold": ["courier", "bold"],
  "Courier-Oblique": ["courier", "italic"],
  "Courier-BoldOblique": ["courier", "bolditalic"],
  "Times-Roman": ["times", "normal"],
  "Times-Bold": ["times", "bold"],
  "Times-Italic": ["times", "italic"],
  "Times-BoldItalic": ["times", "bolditalic"],
};

/** WinAnsi high bytes back to Unicode for display and measurement. */
const WINANSI: Record<number, string> = {
  0x85: "…",
  0x91: "‘",
  0x92: "’",
  0x93: "“",
  0x94: "”",
  0x96: "–",
  0x97: "—",
};

const decode = (s: string) =>
  [...s].map((ch) => WINANSI[ch.charCodeAt(0)] ?? ch).join("");

function inflatedStreams(buf: Buffer): string[] {
  const out: string[] = [];
  let at = 0;
  for (;;) {
    const s = buf.indexOf("stream", at);
    if (s === -1) break;
    let d = s + 6;
    if (buf[d] === 0x0d) d += 1;
    if (buf[d] === 0x0a) d += 1;
    const e = buf.indexOf("endstream", d);
    if (e === -1) break;
    try {
      out.push(inflateSync(buf.subarray(d, e)).toString("latin1"));
    } catch {
      /* font file or metadata — not flate */
    }
    at = e + 9;
  }
  return out;
}

/** /F<n> -> BaseFont, via the page Resources dict and the font objects. */
function fontResourceMap(raw: string): Record<string, string> {
  const objToBase: Record<string, string> = {};
  for (const m of raw.matchAll(/(\d+) 0 obj\s*<<([\s\S]*?)>>/g)) {
    const base = m[2].match(/\/BaseFont\s*\/([A-Za-z-]+)/);
    if (base) objToBase[m[1]] = base[1];
  }
  const map: Record<string, string> = {};
  const fontDict = raw.match(/\/Font\s*<<([\s\S]*?)>>/);
  if (fontDict) {
    for (const m of fontDict[1].matchAll(/\/(F\d+)\s+(\d+)\s+0\s+R/g)) {
      const base = objToBase[m[2]];
      if (base) map[m[1]] = base;
    }
  }
  return map;
}

const TD_TJ =
  /\/(F\d+)\s+([\d.]+)\s+Tf[\s\S]*?([-\d.]+)\s+([-\d.]+)\s+Td\s*\(((?:[^()\\]|\\.)*)\)\s*Tj/g;

function parseDraws(stream: string, page: number): Draw[] {
  const draws: Draw[] = [];
  for (const m of stream.matchAll(TD_TJ)) {
    const [, fontId, size, xPt, yPt, raw] = m;
    draws.push({
      page,
      fontId,
      size: Number(size),
      x: Number(xPt) / PT_PER_MM,
      y: (PAGE_H_PT - Number(yPt)) / PT_PER_MM,
      text: decode(raw.replace(/\\([()\\])/g, "$1")),
    });
  }
  return draws;
}

/* ------------------------------- run a case ------------------------------- */

const trace: NoticeTrace = {
  target: "0x28C6c06298d514Db089934071355E5743bf21d60",
  hops: 3,
  terminalVasp: {
    matched_address: "0x21a31Ee1afC51d94C2eFcCAa2092aD1028285549",
    vasp_name: "Binance Hot Wallet 14",
    entity: "Binance Holdings Ltd.",
    detected_at_hop: 3,
    terminal_tx_hash:
      "0x9a8f1c4b2e6d3a750f8b1c9e4d2a6b8f0c3e7d1a5b9f2c8e4d6a0b3f7c1e5d9a",
  },
};

const { doc, filename } = await buildSection94Notice(trace, {
  investigatorName: "Insp. Kartik Chaudhary",
  officerId: "UP-ID-9942",
  policeStation: "Meerut District Cyber Cell",
  firNumber: "NCRP-2026-883A",
});

const pages = doc.getNumberOfPages();
const buf = Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
const raw = buf.toString("latin1");

const fonts = fontResourceMap(raw);
const content = inflatedStreams(buf).filter(
  (s) => s.includes(" Td") && s.includes(" Tj")
);
const draws = content.flatMap((s, i) => parseDraws(s, i + 1));

// Scratch document purely for metric lookups.
const { jsPDF } = await import("jspdf");
const ruler = new jsPDF({ unit: "mm", format: "a4" });
const widthOf = (d: Draw) => {
  const base = fonts[d.fontId];
  const mapped = base ? FONT_MAP[base] : undefined;
  if (!mapped) return null;
  ruler.setFont(mapped[0], mapped[1]);
  ruler.setFontSize(d.size);
  return ruler.getTextWidth(d.text);
};

const footer = draws.filter((d) => Math.abs(d.y - FOOTER_TEXT) < 0.05);
const body = draws.filter((d) => Math.abs(d.y - FOOTER_TEXT) >= 0.05);

const problems: string[] = [];
let unmeasured = 0;

if (content.length !== pages)
  problems.push(`expected ${pages} content streams, parsed ${content.length}`);
if (footer.length !== pages * 3)
  problems.push(`expected ${pages * 3} footer draws, parsed ${footer.length}`);
if (body.length < 40)
  problems.push(`suspiciously few body draws (${body.length}) — parser may be off`);

let widest = 0;
for (const d of body) {
  const label = `p${d.page} y=${d.y.toFixed(1)} "${d.text.slice(0, 44)}"`;
  if (d.y > FOOTER_RULE)
    problems.push(`body past footer rule (>${FOOTER_RULE}mm): ${label}`);
  if (d.y > PAGE_H_MM) problems.push(`off page bottom: ${label}`);
  if (d.y < 0) problems.push(`above page top: ${label}`);
  if (d.x < MARGIN - TOL) problems.push(`left of margin (x=${d.x.toFixed(1)}): ${label}`);

  const w = widthOf(d);
  if (w === null) {
    unmeasured += 1;
    continue;
  }
  const right = d.x + w;
  widest = Math.max(widest, right);
  if (right > RIGHT_EDGE + TOL)
    problems.push(`past right margin (ends ${right.toFixed(1)}mm > ${RIGHT_EDGE}): ${label}`);
}

if (unmeasured) problems.push(`${unmeasured} draw(s) had no resolvable font metric`);

/* --------------------------------- report --------------------------------- */

console.log(`file: ${filename}`);
console.log(`fonts: ${Object.entries(fonts).map(([k, v]) => `${k}=${v}`).join(" ")}`);
console.log(
  `pages: ${pages}   draws: ${draws.length} (body ${body.length}, footer ${footer.length})`
);
for (let p = 1; p <= pages; p += 1) {
  const on = body.filter((d) => d.page === p);
  if (!on.length) continue;
  const ys = on.map((d) => d.y);
  console.log(
    `  p${p}: ${String(on.length).padStart(3)} draws  y ${Math.min(...ys).toFixed(1)}→${Math.max(...ys).toFixed(1)} (limit ${FOOTER_RULE})`
  );
}
console.log(`widest line ends at ${widest.toFixed(1)}mm (right margin ${RIGHT_EDGE})`);

console.log("\n--- audit ---");
if (problems.length) {
  for (const p of problems) console.log(`FAIL  ${p}`);
  console.log(`\nAUDIT: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log("AUDIT: OK — within margins, clear of the footer, no page overflow");
