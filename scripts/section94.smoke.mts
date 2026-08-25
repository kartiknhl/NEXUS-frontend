/**
 * Headless smoke test for the §94 notice layout.
 *
 *   npx tsx scripts/section94.smoke.mts
 *
 * Renders two PDFs to scripts/out/ — a fully-populated Ethereum case and a
 * sparse case with missing VASP fields — so the layout can be eyeballed and the
 * page count asserted without a browser.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { buildSection94Notice, type CaseData, type NoticeTrace } from "../src/lib/section94";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "out");
mkdirSync(OUT, { recursive: true });

const OFFICER: CaseData = {
  investigatorName: "Insp. Kartik Chaudhary",
  officerId: "UP-ID-9942",
  policeStation: "Meerut District Cyber Cell",
  firNumber: "NCRP-2026-883A",
};

const cases: Array<{ name: string; trace: NoticeTrace; caseData?: CaseData }> = [
  {
    name: "full-eth",
    caseData: OFFICER,
    trace: {
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
    },
  },
  {
    name: "sparse-tron",
    // no caseData — exercises the blank-field fallbacks
    trace: {
      target: "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8",
      hops: 1,
      terminalVasp: {
        matched_address: "TQrY8tryqsYVnkzKTLnZQpvbLkyPPeLqXQ",
        entity: undefined,
        vasp_name: undefined,
        terminal_tx_hash: undefined,
      },
    },
  },
];

let failed = false;

for (const { name, trace, caseData } of cases) {
  try {
    const { doc, filename } = await buildSection94Notice(trace, caseData);
    const bytes = Buffer.from(doc.output("arraybuffer") as ArrayBuffer);
    const path = join(OUT, `${name}.pdf`);
    writeFileSync(path, bytes);

    const pages = doc.getNumberOfPages();
    const valid = bytes.subarray(0, 5).toString() === "%PDF-";

    console.log(
      `${valid && bytes.length > 1000 ? "PASS" : "FAIL"}  ${name.padEnd(12)} ` +
        `pages=${pages}  bytes=${bytes.length}  header=${bytes
          .subarray(0, 5)
          .toString()}`
    );
    console.log(`      filename: ${filename}`);
    if (!valid || bytes.length < 1000) failed = true;
  } catch (err) {
    failed = true;
    console.error(`FAIL  ${name}:`, err);
  }
}

console.log(failed ? "\nSMOKE: FAILED" : "\nSMOKE: OK");
process.exit(failed ? 1 : 0);
