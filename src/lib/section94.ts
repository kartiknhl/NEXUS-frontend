import { caseReference, detectChain } from "./utils";

/**
 * Section 94 BNSS notice generator.
 *
 * jsPDF is imported dynamically inside `generateSection94Notice` rather than at
 * module scope: the library reads `window`/`navigator` when a document is
 * constructed, so a top-level import would break the server render of any page
 * that pulls this file in. Deferring it also keeps ~350 kB out of the initial
 * client chunk — it loads on the first export click.
 */

export type NoticeVasp = {
  matched_address?: string;
  vasp_name?: string;
  entity?: string;
  detected_at_hop?: number;
  terminal_tx_hash?: string;
};

export type NoticeTrace = {
  target: string;
  hops?: number;
  terminalVasp: NoticeVasp | null;
};

/**
 * Chain-of-custody particulars collected from the investigating officer before
 * the notice is issued. Every field is optional at the type level so a draft can
 * still be produced with blanks, but an order without an FIR/NCRP reference is
 * not court-ready — the console asks for these up front.
 */
export type CaseData = {
  investigatorName?: string;
  officerId?: string;
  policeStation?: string;
  firNumber?: string;
};

/* ------------------------------ page geometry ----------------------------- */

const PAGE_W = 210; // A4, mm
const PAGE_H = 297;
const MARGIN = 20;
const CONTENT_W = PAGE_W - MARGIN * 2; // 170mm
const FOOTER_Y = PAGE_H - 14;
const BODY_LIMIT = PAGE_H - 26; // start a new page past this

const INK = 17;
const RULE = 130;

const em = (s: string | number | undefined | null, fallback = "—") => {
  const v = s === null || s === undefined ? "" : String(s).trim();
  return v.length > 0 ? v : fallback;
};

/** Filesystem-safe fragment for the download filename. */
const slug = (s: string) =>
  s
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40) || "VASP";

function timestamps() {
  const now = new Date();
  const ist = now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return {
    ist: `${ist} IST`,
    utc: now.toISOString(),
    fileDate: now.toISOString().slice(0, 10),
    dateLong: now.toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }),
  };
}

/* --------------------------------------------------------------------------- */

/**
 * Builds the notice and returns the jsPDF document plus its filename, without
 * touching the filesystem. Kept separate from the download so the layout can be
 * exercised headlessly (see scripts/section94.smoke.mts).
 */
export async function buildSection94Notice(
  trace: NoticeTrace,
  caseData: CaseData = {}
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });

  const vasp = trace.terminalVasp ?? {};
  const ts = timestamps();
  const caseRef = caseReference(trace.target);
  const chain = detectChain(trace.target);

  let y = MARGIN;

  /* ---- layout primitives ---- */

  const need = (h: number) => {
    if (y + h <= BODY_LIMIT) return;
    doc.addPage();
    y = MARGIN;
  };

  const rule = (weight = 0.2, gapBefore = 0, gapAfter = 4) => {
    y += gapBefore;
    need(2);
    doc.setDrawColor(RULE);
    doc.setLineWidth(weight);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += gapAfter;
  };

  /** Wrapped paragraph. Returns nothing; advances the cursor. */
  const para = (
    text: string,
    opts: {
      size?: number;
      style?: "normal" | "bold" | "italic";
      font?: "times" | "courier" | "helvetica";
      align?: "left" | "center" | "justify";
      lead?: number;
      gapAfter?: number;
      indent?: number;
    } = {}
  ) => {
    const {
      size = 10.5,
      style = "normal",
      font = "times",
      align = "left",
      lead = size * 0.52,
      gapAfter = 3,
      indent = 0,
    } = opts;

    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(INK);

    const width = CONTENT_W - indent;
    const lines = doc.splitTextToSize(text, width) as string[];

    for (const line of lines) {
      need(lead + 1);
      const x =
        align === "center" ? PAGE_W / 2 : MARGIN + indent;
      doc.text(line, x, y, align === "center" ? { align: "center" } : undefined);
      y += lead;
    }
    y += gapAfter;
  };

  /** Two-column evidence row inside a bordered block. Handles long hashes. */
  const evidenceRow = (label: string, value: string, mono = false) => {
    const labelW = 58;
    const valueW = CONTENT_W - labelW - 8;

    doc.setFont(mono ? "courier" : "times", "normal");
    doc.setFontSize(mono ? 8.4 : 10);
    const vLines = doc.splitTextToSize(value, valueW) as string[];

    const lead = mono ? 4 : 4.6;
    const rowH = Math.max(7, vLines.length * lead + 2.6);
    need(rowH);

    // label
    doc.setFont("times", "bold");
    doc.setFontSize(8.6);
    doc.setTextColor(70);
    doc.text(label.toUpperCase(), MARGIN + 3, y + 4.4);

    // value
    doc.setFont(mono ? "courier" : "times", "normal");
    doc.setFontSize(mono ? 8.4 : 10);
    doc.setTextColor(INK);
    let vy = y + 4.4;
    for (const line of vLines) {
      doc.text(line, MARGIN + labelW, vy);
      vy += lead;
    }

    // hairline separator
    doc.setDrawColor(205);
    doc.setLineWidth(0.15);
    doc.line(MARGIN + 3, y + rowH, PAGE_W - MARGIN - 3, y + rowH);

    y += rowH;
  };

  const numbered = (n: number, text: string) => {
    const indent = 9;
    doc.setFont("times", "bold");
    doc.setFontSize(10.5);
    need(6);
    doc.setTextColor(INK);
    doc.text(`${n}.`, MARGIN + 1, y);
    para(text, { indent, gapAfter: 3.4 });
  };

  /* ---------------------------- classification ---------------------------- */

  doc.setFont("courier", "bold");
  doc.setFontSize(7.6);
  doc.setTextColor(90);
  doc.text("RESTRICTED // LAW ENFORCEMENT SENSITIVE", MARGIN, y);
  doc.text(`CASE ${caseRef}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 3;
  rule(0.5, 0, 7);

  /* -------------------------------- issuer -------------------------------- */

  para("INDIAN CYBERCRIME COORDINATION CENTRE (I4C)", {
    size: 10,
    style: "bold",
    align: "center",
    gapAfter: 1,
  });
  para("Ministry of Home Affairs, Government of India", {
    size: 9,
    align: "center",
    gapAfter: 7,
  });

  /* -------------------------------- title --------------------------------- */

  para(
    "ORDER UNDER SECTION 94 OF THE BHARATIYA NAGARIK SURAKSHA SANHITA (BNSS), 2023",
    { size: 12.5, style: "bold", align: "center", lead: 6.2, gapAfter: 2.5 }
  );
  para(
    "(Formerly Section 91 Cr.P.C — Order for Production of Digital Evidence / Electronic Record)",
    { size: 9, style: "italic", align: "center", gapAfter: 5 }
  );

  rule(0.5, 0, 6);

  /* ------------------------------ meta header ----------------------------- */

  doc.setFont("courier", "normal");
  doc.setFontSize(8.6);
  doc.setTextColor(60);
  doc.text(`Ref: ${caseRef}`, MARGIN, y);
  doc.text(`Date: ${ts.dateLong}`, PAGE_W - MARGIN, y, { align: "right" });
  y += 8;

  /* ------------------------------- addressee ------------------------------ */

  para("TO: The Nodal / Grievance / Compliance Officer", {
    size: 11,
    style: "bold",
    gapAfter: 2,
  });
  para(
    `${em(vasp.entity, "Virtual Asset Service Provider")} — Legal & Compliance Department`,
    { size: 10.5, gapAfter: 1.5 }
  );
  para(
    `Custodial wallet identifier: ${em(vasp.vasp_name, "hot wallet")}`,
    { size: 9.6, gapAfter: 1.5 }
  );

  doc.setFont("courier", "bold");
  doc.setFontSize(8.6);
  doc.setTextColor(INK);
  const depositLines = doc.splitTextToSize(
    `Target deposit wallet: ${em(vasp.matched_address)}`,
    CONTENT_W
  ) as string[];
  for (const line of depositLines) {
    need(5);
    doc.text(line, MARGIN, y);
    y += 4.2;
  }
  y += 6;

  /* -------------------------------- subject ------------------------------- */

  para(
    "SUB: Immediate preservation and requisition of KYC, transaction logs, and account freezing under Section 94 BNSS.",
    { size: 10.5, style: "bold", gapAfter: 7 }
  );

  /* ------------------ issuing authority & case particulars ----------------- */

  para("ISSUING AUTHORITY & CASE PARTICULARS", {
    size: 9.4,
    style: "bold",
    gapAfter: 3,
  });

  // The FIR / NCRP reference is the number the court and the VASP will key on,
  // so it is set larger than the officer lines that follow it.
  para(`FIR / NCRP Case Number: ${em(caseData.firNumber)}`, {
    size: 11.5,
    style: "bold",
    gapAfter: 3.5,
  });

  para(`Name of Investigating Officer: ${em(caseData.investigatorName)}`, {
    size: 10,
    gapAfter: 1.5,
  });
  para(`Badge / Officer ID: ${em(caseData.officerId)}`, {
    size: 10,
    gapAfter: 1.5,
  });
  para(`Police Station: ${em(caseData.policeStation)}`, {
    size: 10,
    gapAfter: 8,
  });

  /* -------------------- forensic chain of evidence block ------------------- */

  para("FORENSIC CHAIN OF EVIDENCE", {
    size: 9.4,
    style: "bold",
    gapAfter: 2.5,
  });

  const blockTop = y;
  const rowsStartPage = doc.getNumberOfPages();

  evidenceRow("Origin suspect address", em(trace.target), true);
  evidenceRow("Chain / ledger", chain === "Unknown" ? "Unidentified" : chain);
  evidenceRow(
    "Multi-hop traversal depth",
    `${em(trace.hops, "0")} hop(s)`
  );
  evidenceRow(
    "VASP detected at hop",
    em(vasp.detected_at_hop ?? trace.hops)
  );
  evidenceRow("Terminal transaction ID", em(vasp.terminal_tx_hash), true);
  evidenceRow("Identification timestamp", ts.ist);
  evidenceRow("Recorded (UTC, ISO 8601)", ts.utc, true);

  // Frame the block only when it did not straddle a page boundary — a box
  // drawn across an added page would land in the wrong place.
  if (doc.getNumberOfPages() === rowsStartPage) {
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.3);
    doc.rect(MARGIN, blockTop, CONTENT_W, y - blockTop);
  }
  y += 8;

  /* ---------------------------- directive body ---------------------------- */

  para(
    `WHEREAS an investigation under the above case reference has established, through on-chain forensic traversal, that funds originating from the suspect address named above were routed across ${em(
      trace.hops,
      "0"
    )} intermediary hop(s) and were ultimately deposited into a custodial wallet under the control of ${em(
      vasp.entity,
      "your organisation"
    )};`,
    { gapAfter: 4 }
  );

  para(
    "AND WHEREAS the said deposit address is reasonably believed to be mapped to an internal user account maintained by you, the records of which are necessary and material to the investigation;",
    { gapAfter: 4 }
  );

  para(
    "NOW THEREFORE, in exercise of the powers conferred under Section 94 of the Bharatiya Nagarik Suraksha Sanhita, 2023, you are hereby DIRECTED to comply with the following, forthwith and in any event within seventy-two (72) hours of receipt of this order:",
    { gapAfter: 5 }
  );

  numbered(
    1,
    `Immediately freeze and restrict all outflow from the internal user account / UID corresponding to deposit address ${em(
      vasp.matched_address
    )}, including withdrawals, internal transfers, and conversions, and preserve the account in its present state.`
  );
  numbered(
    2,
    "Furnish complete KYC documentation for the said account holder, comprising government-issued photo identification, full legal name, registered email address, and registered mobile number, together with the date and method of onboarding."
  );
  numbered(
    3,
    "Provide login IP logs with timestamps and device fingerprints, all withdrawal destination addresses, and the complete account ledger of deposits, trades, and withdrawals for the subject account."
  );

  y += 2;
  para(
    "The material sought shall be produced in a machine-readable format (CSV or JSON) accompanied by a certificate under Section 63 of the Bharatiya Sakshya Adhiniyam, 2023, attesting to the authenticity and integrity of the electronic record.",
    { size: 10, gapAfter: 4 }
  );
  para(
    "Non-compliance with this order attracts the consequences prescribed under Section 94(3) BNSS read with the applicable provisions of the Bharatiya Nyaya Sanhita, 2023. This order shall not be disclosed to the account holder, as such disclosure would prejudice the ongoing investigation.",
    { size: 10, gapAfter: 10 }
  );

  /* ------------------------------- sign-off ------------------------------- */

  need(46);
  rule(0.3, 0, 7);

  para("Issued by Investigating Officer / Cyber Crime Police Station", {
    size: 10,
    style: "bold",
    gapAfter: 2,
  });
  para(
    `${em(caseData.investigatorName, "Investigating Officer")}${
      caseData.officerId ? `  (ID: ${caseData.officerId})` : ""
    }`,
    { size: 10, gapAfter: 1.5 }
  );
  para(em(caseData.policeStation, "Cyber Crime Police Station"), {
    size: 9.6,
    gapAfter: 13,
  });

  // signature rules
  doc.setDrawColor(120);
  doc.setLineWidth(0.25);
  doc.line(MARGIN, y, MARGIN + 66, y);
  doc.line(PAGE_W - MARGIN - 66, y, PAGE_W - MARGIN, y);
  y += 4;

  doc.setFont("times", "normal");
  doc.setFontSize(8.4);
  doc.setTextColor(70);
  doc.text("Signature & seal of Investigating Officer", MARGIN, y);
  doc.text("Station / Unit and date", PAGE_W - MARGIN, y, { align: "right" });
  y += 9;

  doc.setFont("courier", "normal");
  doc.setFontSize(7.8);
  doc.setTextColor(105);
  const attest = doc.splitTextToSize(
    `DIGITAL VERIFICATION PLACEHOLDER — this draft is machine-generated by NEXUS from case ${caseRef} and is unsigned until countersigned above. Integrity hash and DSC token to be affixed on issue.`,
    CONTENT_W
  ) as string[];
  for (const line of attest) {
    need(4);
    doc.text(line, MARGIN, y);
    y += 3.4;
  }

  /* -------------------------- footer on every page ------------------------ */

  const total = doc.getNumberOfPages();
  const footerLeft = caseData.firNumber
    ? `NEXUS · §94 BNSS · ${caseRef} · FIR ${caseData.firNumber}`
    : `NEXUS · §94 BNSS · ${caseRef}`;
  for (let p = 1; p <= total; p += 1) {
    doc.setPage(p);
    doc.setDrawColor(RULE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, FOOTER_Y - 4, PAGE_W - MARGIN, FOOTER_Y - 4);

    doc.setFont("courier", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(115);
    doc.text(footerLeft, MARGIN, FOOTER_Y);
    doc.text("RESTRICTED", PAGE_W / 2, FOOTER_Y, { align: "center" });
    doc.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, FOOTER_Y, {
      align: "right",
    });
  }

  const filename = `Section_94_Notice_${slug(
    em(vasp.entity, "VASP")
  )}_${ts.fileDate}.pdf`;

  return { doc, filename };
}

/** Builds the notice and triggers the browser download. */
export async function generateSection94Notice(
  trace: NoticeTrace,
  caseData: CaseData = {}
): Promise<void> {
  const { doc, filename } = await buildSection94Notice(trace, caseData);
  doc.save(filename);
}