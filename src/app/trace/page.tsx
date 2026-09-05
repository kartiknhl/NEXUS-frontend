"use client";

import { type FormEvent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type cytoscape from "cytoscape";
import { generateSection94Notice, type CaseData } from "@/lib/section94";
import { caseReference, detectChain, shortenHash } from "@/lib/utils";

const REQUEST_TIMEOUT_MS = 20_000;
const MIN_HOPS = 1;
const MAX_HOPS = 8;
const DEFAULT_HOPS = 2;

const CytoscapeGraph = dynamic(
  async () => (await import("react-cytoscapejs")).default,
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[640px] items-center justify-center bg-white font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
        Initializing renderer…
      </div>
    ),
  }
);

type GraphNode = {
  id: string;
  label: string;
  type: string;
  hop?: number;
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  asset?: string;
  hash?: string;
  valueRaw?: string;
  timestamp?: string;
  hop?: number;
};

async function computeEvidenceHash(data: unknown) {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

type TerminalVasp = {
  matched_address?: string;
  vasp_name?: string;
  entity?: string;
  detected_at_hop?: number;
  terminal_tx_hash?: string;
};

type TraceMeta = {
  status?: string;
  target: string;
  hops?: number;
  terminalVasp: TerminalVasp | null;
};

const emptyGraph = { nodes: [] as GraphNode[], edges: [] as GraphEdge[] };

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown): JsonRecord =>
  value !== null && typeof value === "object" ? (value as JsonRecord) : {};

const asString = (value: unknown, fallback: string) =>
  value === null || value === undefined ? fallback : String(value);

const asNumber = (value: unknown): number | undefined => {
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/** Shorten only if the label is a raw hash; keep human names (e.g. exchange). */
const displayLabel = (label: string) =>
  /^(0x[0-9a-fA-F]{6,}|T[0-9A-Za-z]{20,})$/.test(label)
    ? shortenHash(label)
    : label;

const graphStyles: cytoscape.StylesheetJsonBlock[] = [
  {
    selector: "node",
    style: {
      width: 52,
      height: 52,
      label: "data(short)",
      color: "#0F172A",
      "font-size": "12px",
      "font-weight": "500" as never,
      "font-family": "var(--font-plex-mono), ui-monospace, monospace",
      "text-valign": "bottom",
      "text-margin-y": 9,
      "text-background-color": "#FFFFFF",
      "text-background-opacity": 0.9,
      "text-background-padding": "4px",
      "text-background-shape": "roundrectangle",
      "text-border-color": "#E2E8F0",
      "text-border-width": 1,
      "text-border-opacity": 1,
      "border-width": 2,
      "border-color": "#94A3B8",
      "background-color": "#F8FAFC",
      shape: "round-rectangle",
    },
  },
  {
    selector: "node[type = 'suspect']",
    style: {
      "background-color": "#FEF2F2",
      "border-color": "#EF4444",
      "border-width": 3,
      width: 58,
      height: 58,
    },
  },
  {
    selector: "node[type = 'intermediary']",
    style: {
      "background-color": "#F8FAFC",
      "border-color": "#94A3B8",
      "border-width": 2,
    },
  },
  {
    selector: "node[type = 'vasp']",
    style: {
      "background-color": "#ECFDF5",
      "border-color": "#10B981",
      "border-width": 3,
      width: 64,
      height: 64,
      shape: "round-rectangle",
    },
  },
  {
    selector: "edge",
    style: {
      width: 2.5,
      "line-color": "#94A3B8",
      "target-arrow-color": "#94A3B8",
      "target-arrow-shape": "triangle",
      "arrow-scale": 1.3,
      "curve-style": "bezier",
      label: "data(asset)",
      color: "#334155",
      "font-size": "11px",
      "font-family": "var(--font-plex-mono), ui-monospace, monospace",
      "text-background-color": "#F8FAFC",
      "text-background-opacity": 1,
      "text-background-padding": "4px",
      "text-background-shape": "roundrectangle",
      "text-border-color": "#E2E8F0",
      "text-border-width": 1,
      "text-border-opacity": 1,
      "text-rotation": "autorotate",
    },
  },
];

const normalizeGraphData = (rawGraph: unknown) => {
  const graph = asRecord(rawGraph);
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];

  return {
    nodes: nodes.map((node: unknown): GraphNode => {
      const nodeRecord = asRecord(node);
      const nodeData = asRecord(nodeRecord.data ?? node);
      const id = asString(
        nodeData.id ?? nodeData.wallet ?? nodeData.address ?? nodeData.label,
        "node"
      );
      return {
        id,
        label: asString(
          nodeData.label ?? nodeData.name ?? nodeData.wallet ?? nodeData.address ?? id,
          id
        ),
        type: asString(nodeData.type, "intermediary").toLowerCase(),
        hop: asNumber(nodeData.hop),
      };
    }),
    edges: edges
      .map((edge: unknown, index: number) => {
        const edgeRecord = asRecord(edge);
        const edgeData = asRecord(edgeRecord.data ?? edge);
        const source = edgeData.source ?? edgeData.from ?? edgeData.src;
        const target = edgeData.target ?? edgeData.to ?? edgeData.dst;
        if (!source || !target) return null;
        return {
          id: asString(edgeData.id, `edge-${index}`),
          source: String(source),
          target: String(target),
          label: asString(edgeData.label, ""),
          asset: asString(
            edgeData.asset ?? edgeData.token ?? edgeData.symbol ?? edgeData.label,
            ""
          ),
          hash: asString(edgeData.hash ?? edgeData.tx_hash ?? edgeData.transaction_hash, ""),
          valueRaw: asString(edgeData.value_raw ?? edgeData.value ?? edgeData.amount, ""),
          timestamp: asString(
            edgeData.timestamp ?? edgeData.timeStamp ?? edgeData.block_timestamp,
            ""
          ),
          hop: asNumber(edgeData.hop) ?? index + 1,
        };
      })
      .filter(Boolean) as GraphEdge[],
  };
};

/* -------------------------------------------------------------------------- */
/*  Small presentational helpers                                              */
/* -------------------------------------------------------------------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
        {label}
      </span>
      <span className="min-w-0 truncate font-mono text-[12.5px] text-slate-600">
        {children}
      </span>
    </div>
  );
}

function typeDot(type: string) {
  if (type === "suspect") return "bg-red-500";
  if (type === "vasp") return "bg-emerald-500";
  return "bg-slate-400";
}

function formatLedgerAmount(valueRaw: string, asset: string) {
  if (!valueRaw) return "—";
  const raw = Number(valueRaw);
  if (!Number.isFinite(raw)) return valueRaw;
  const normalizedAsset = asset.toUpperCase();
  const decimals = normalizedAsset === "ETH" ? 18 : normalizedAsset === "USDT" ? 6 : 0;
  const amount = raw / 10 ** decimals;
  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: decimals,
  })} ${normalizedAsset}`;
}

function formatLedgerDate(timestamp: string) {
  if (!timestamp) return "—";
  const numeric = Number(timestamp);
  const date = new Date(
    Number.isFinite(numeric)
      ? numeric < 10_000_000_000
        ? numeric * 1000
        : numeric
      : timestamp
  );
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function draftNotice(meta: TraceMeta, openedAt: string) {
  const v = meta.terminalVasp ?? {};
  return [
    `SECTION 94 BNSS — SUMMONS TO PRODUCE / FREEZE`,
    `Indian Cybercrime Coordination Centre (I4C), Ministry of Home Affairs`,
    ``,
    `Case reference : ${caseReference(meta.target)}`,
    `Issued (draft) : ${openedAt || "—"}`,
    ``,
    `To             : ${v.entity ?? "Virtual Asset Service Provider"}`,
    `Deposit wallet : ${v.matched_address ?? "—"}  (${v.vasp_name ?? "hot wallet"})`,
    `Detected at hop: ${v.detected_at_hop ?? meta.hops ?? "—"}`,
    ``,
    `Under Section 94 of the Bharatiya Nagarik Suraksha Sanhita, 2023, you are`,
    `directed to freeze the above account and produce the KYC records and`,
    `transaction history associated with the following terminal transfer,`,
    `traced from suspect wallet ${shortenHash(meta.target)}:`,
    ``,
    `Terminal tx    : ${v.terminal_tx_hash ?? "—"}`,
  ].join("\n");
}

/* -------------------------------------------------------------------------- */
/*  Chain-of-custody capture                                                  */
/* -------------------------------------------------------------------------- */

const CASE_FIELDS: Array<{
  key: keyof CaseData;
  label: string;
  placeholder: string;
}> = [
  {
    key: "investigatorName",
    label: "Investigating officer",
    placeholder: "e.g. Insp. Kushagra Gola",
  },
  {
    key: "officerId",
    label: "Officer badge / ID",
    placeholder: "e.g. UP-ID-9942",
  },
  {
    key: "policeStation",
    label: "Police station / unit",
    placeholder: "e.g. Meerut District Cyber Cell",
  },
  {
    key: "firNumber",
    label: "FIR / NCRP number",
    placeholder: "e.g. NCRP-2026-883A",
  },
];

/**
 * Collects the officer and case particulars that turn a machine-generated draft
 * into an attributable order. Interposed between the export button and the PDF
 * so nothing is issued anonymously.
 */
function CaseMetadataModal({
  open,
  value,
  onChange,
  onSubmit,
  onCancel,
  busy,
  error,
  entity,
  caseRef,
}: {
  open: boolean;
  value: CaseData;
  onChange: (next: CaseData) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  entity: string;
  caseRef: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Escape to dismiss, Tab cycles inside the panel, and the page behind is
  // locked so the dialog is the only thing that scrolls.
  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        "input:not([disabled]), button:not([disabled])"
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 py-10 backdrop-blur-sm"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="case-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-[430px] rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-300/50"
      >
        <header className="border-b border-slate-200 px-5 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-blue-600">
            Chain of custody
          </p>
          <h2
            id="case-modal-title"
            className="mt-1.5 text-lg font-bold tracking-tight text-slate-900"
          >
            Case &amp; officer particulars
          </h2>
          <p className="mt-2 text-[12.5px] leading-5 text-slate-600">
            Printed on the order to {entity} and recorded against {caseRef}.
          </p>
        </header>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          <div className="space-y-3.5 px-5 py-5">
            {CASE_FIELDS.map((field, index) => (
              <label key={field.key} className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500">
                  {field.label}
                </span>
                <input
                  type="text"
                  value={value[field.key] ?? ""}
                  onChange={(event) =>
                    onChange({ ...value, [field.key]: event.target.value })
                  }
                  placeholder={field.placeholder}
                  autoFocus={index === 0}
                  autoComplete="off"
                  spellCheck={false}
                  disabled={busy}
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
                />
              </label>
            ))}
            <p className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
              Blank fields print as a dash
            </p>
          </div>

          {error && (
            <p className="mx-5 mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-[11px] leading-5 text-red-600">
              {error}
            </p>
          )}

          <footer className="flex items-center justify-end gap-3 border-t border-slate-200 px-5 py-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
            >
              {busy ? "Building PDF…" : "Generate & download"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

function NexusDashboard() {
  const searchParams = useSearchParams();
  const target = (searchParams.get("wallet") ?? "").trim();

  const [graphData, setGraphData] = useState(emptyGraph);
  const [meta, setMeta] = useState<TraceMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedAt, setOpenedAt] = useState("");
  const [showNotice, setShowNotice] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [caseData, setCaseData] = useState<CaseData>({
    investigatorName: "",
    officerId: "",
    policeStation: "",
    firNumber: "",
  });

  const cytoscapeRef = useRef<cytoscape.Core | null>(null);
  const chain = detectChain(target);
  const [reloadKey, setReloadKey] = useState(0);

  // Depth of the BFS the backend runs (max_hops). Seedable from a ?hops= param
  // so a trace URL is shareable; otherwise defaults to DEFAULT_HOPS.
  const [maxHops, setMaxHops] = useState(() => {
    const seed = Math.round(Number(searchParams.get("hops")));
    return Number.isFinite(seed) && seed >= MIN_HOPS && seed <= MAX_HOPS
      ? seed
      : DEFAULT_HOPS;
  });
  const [timeframe, setTimeframe] = useState("7d");
  const [editingHops, setEditingHops] = useState(false);
  const [hopDraft, setHopDraft] = useState(String(DEFAULT_HOPS));

  // Timestamp is client-only (avoids an SSR hydration mismatch); reading the
  // clock on mount is exactly what an effect is for here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenedAt(
      new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, []);

  useEffect(() => {
    if (!target) return;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setShowNotice(false);
      try {
        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
        let minTimestamp = 0;
        const now = Math.floor(Date.now() / 1000);

        if (timeframe === "24h") minTimestamp = now - 86400;
        else if (timeframe === "7d") minTimestamp = now - 86400 * 7;
        else if (timeframe === "30d") minTimestamp = now - 86400 * 30;

        const response = await fetch(
          `${API_BASE_URL}/api/trace/${encodeURIComponent(target)}?max_hops=${maxHops}&min_timestamp=${minTimestamp}`,
          { signal: controller.signal }
        );
        if (!response.ok) {
          throw new Error(`Backend returned status ${response.status}.`);
        }
        const payload = await response.json();
        if (cancelled) return;
        const graphPayload = payload.graph_data ?? payload.graphData ?? payload;
        setGraphData(normalizeGraphData(graphPayload));
        setMeta({
          status: payload.status,
          target: payload.target ?? target,
          hops: asNumber(payload.hops_traversed),
          terminalVasp: payload.terminal_vasp ?? null,
        });
      } catch (err) {
        if (cancelled) return;
        setGraphData(emptyGraph);
        setMeta(null);
        if (err instanceof DOMException && err.name === "AbortError") {
          setError(
            `The trace timed out after ${REQUEST_TIMEOUT_MS / 1000}s. The backend may be busy or a chain API is rate-limited. Retry the trace.`
          );
        } else if (err instanceof TypeError) {
          setError(
            `Can't reach the forensic engine at ${process.env.NEXT_PUBLIC_API_URL || "127.0.0.1:8000"}. Start the backend, then retry.`
          );
        } else {
          setError(err instanceof Error ? err.message : "Unable to fetch trace data.");
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [target, reloadKey, maxHops, timeframe]);

  const elements = useMemo(() => {
    const nodeElements = graphData.nodes.map((node) => ({
      data: {
        id: node.id,
        label: node.label,
        short: displayLabel(node.label),
        type: (node.type || "intermediary").toLowerCase(),
      },
    }));
    const edgeElements = graphData.edges.map((edge, index) => ({
      data: {
        id: edge.id ?? `edge-${index}`,
        source: edge.source,
        target: edge.target,
        asset: edge.asset ?? edge.label ?? "",
      },
    }));
    return [...nodeElements, ...edgeElements];
  }, [graphData]);

  const hopLog = useMemo(
    () =>
      [...graphData.nodes].sort(
        (a, b) => (a.hop ?? 99) - (b.hop ?? 99)
      ),
    [graphData]
  );

  const fitGraph = useCallback(() => {
    cytoscapeRef.current?.fit(undefined, 60);
    cytoscapeRef.current?.center();
  }, []);

  useEffect(() => {
    fitGraph();
  }, [elements, fitGraph]);

  const copy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  // Apply a new hop depth. Changing maxHops re-runs the fetch effect (it's a
  // dep); re-applying the same value still forces a recompute via reloadKey.
  const applyHops = (event: FormEvent) => {
    event.preventDefault();
    const parsed = Math.round(Number(hopDraft));
    const next = Math.min(
      MAX_HOPS,
      Math.max(MIN_HOPS, Number.isFinite(parsed) ? parsed : maxHops)
    );
    setEditingHops(false);
    setHopDraft(String(next));
    if (next !== maxHops) {
      setMaxHops(next);
    } else {
      setReloadKey((k) => k + 1);
    }
  };

  // Builds and downloads the §94 PDF. jsPDF is code-split behind this call, so
  // the first click pays a short import cost — hence the pending state. On
  // failure the modal stays open with the message, so the entered case data is
  // not lost.
  const exportNotice = async () => {
    if (!meta?.terminalVasp) return;
    setExporting(true);
    setExportError(null);
    try {
      const traceData = {
        target: meta.target,
        hops: meta.hops,
        terminalVasp: meta.terminalVasp,
      };
      const evidenceHash = await computeEvidenceHash({ traceData, caseData });
      await generateSection94Notice(traceData, caseData, evidenceHash);
      setShowModal(false);
    } catch (err) {
      setExportError(
        err instanceof Error
          ? `Could not build the PDF: ${err.message}`
          : "Could not build the PDF."
      );
    } finally {
      setExporting(false);
    }
  };

  const vaspFound = Boolean(meta?.terminalVasp);
  const hasGraph = graphData.nodes.length > 0;
  const ledgerEntries = useMemo(
    () =>
      graphData.edges.map((edge, index) => ({
        hop: edge.hop ?? index + 1,
        asset: edge.asset || "UNKNOWN",
        amount: formatLedgerAmount(edge.valueRaw ?? "", edge.asset || "UNKNOWN"),
        timestamp: formatLedgerDate(edge.timestamp ?? ""),
        from: edge.source,
        to: edge.target,
        hash: edge.hash || edge.id,
      })),
    [graphData.edges]
  );

  const statusPill = loading
    ? { text: "Tracing", cls: "border-blue-200 bg-blue-50 text-blue-700" }
    : error
      ? { text: "Fault", cls: "border-red-200 bg-red-50 text-red-600" }
      : vaspFound
        ? { text: "VASP identified", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" }
        : hasGraph
          ? { text: "Inconclusive", cls: "border-slate-200 bg-slate-100 text-slate-600" }
          : { text: "Idle", cls: "border-slate-200 bg-slate-100 text-slate-500" };

  /* ---- empty: no target ---- */
  if (!target) {
    return (
      <Shell target="" openedAt={openedAt}>
        <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
          <div className="rounded-xl border border-slate-200 bg-white px-8 py-10 shadow-sm">
            <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-slate-500">
              No target loaded
            </p>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              This console needs a suspect wallet.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Start from the ingest bar to route a wallet through the tracing
              engine.
            </p>
            <Link
              href="/"
              className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700"
            >
              Go to ingest
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  return (
    <Shell target={target} openedAt={openedAt}>
      <div className="mx-auto w-full max-w-[1600px] px-6 pb-14 pt-8 lg:px-16">
        {/* case header */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.26em] text-slate-500">
              Forensic console · {caseReference(target)}
            </p>
            <h1 className="mt-2.5 text-3xl font-bold tracking-tight text-slate-900">
              Transaction trace
            </h1>
          </div>
          <span
            className={`rounded border px-3 py-1 font-mono text-sm ${statusPill.cls}`}
          >
            {loading ? "● " : ""}
            {statusPill.text}
          </span>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* ---- left rail ---- */}
          <aside className="flex flex-col gap-6">
            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Trace parameters
                </h2>
              </header>
              <div className="divide-y divide-slate-100 px-5">
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
                    Target
                  </span>
                  <button
                    onClick={() => copy(target, "target")}
                    title="Copy full address"
                    className="min-w-0 truncate font-mono text-[12.5px] text-slate-600 transition-colors hover:text-blue-600"
                  >
                    {copied === "target" ? "copied ✓" : shortenHash(target, 8, 6)}
                  </button>
                </div>
                <Field label="Chain">
                  {chain === "Unknown" ? (
                    <span className="text-slate-500">unrecognized</span>
                  ) : (
                    chain
                  )}
                </Field>
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
                    Max hops
                  </span>
                  {editingHops ? (
                    <form onSubmit={applyHops} className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={MIN_HOPS}
                        max={MAX_HOPS}
                        step={1}
                        value={hopDraft}
                        onChange={(e) => setHopDraft(e.target.value)}
                        autoFocus
                        aria-label="Maximum hops"
                        title={`Between ${MIN_HOPS} and ${MAX_HOPS} hops`}
                        className="w-12 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-right font-mono text-[12.5px] text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="submit"
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700"
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingHops(false)}
                        aria-label="Cancel"
                        className="rounded-lg border border-slate-300 px-2 py-1 font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
                      >
                        ✕
                      </button>
                    </form>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12.5px] text-slate-700">{maxHops}</span>
                      <button
                        onClick={() => {
                          setHopDraft(String(maxHops));
                          setEditingHops(true);
                        }}
                        disabled={loading}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2 py-3">
                  <label
                    htmlFor="incident-window"
                    className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500"
                  >
                    Incident window
                  </label>
                  <select
                    id="incident-window"
                    value={timeframe}
                    onChange={(event) => setTimeframe(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 font-mono text-[12px] text-slate-900 outline-none focus:border-transparent focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="24h">Last 24 hours</option>
                    <option value="7d">Last 7 days</option>
                    <option value="30d">Last 30 days</option>
                    <option value="all">All time (legacy)</option>
                  </select>
                </div>
                <Field label="Dust filter">on</Field>
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Legend
                </h2>
              </header>
              <ul className="space-y-3.5 px-5 py-4 text-[13px] text-slate-700">
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-red-500" /> Suspect wallet
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full bg-slate-400" /> Intermediary (mule)
                </li>
                <li className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Terminal VASP
                </li>
              </ul>
            </section>

            {hopLog.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 px-5 py-3.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Hop log
                  </h2>
                </header>
                <ol className="px-5 py-2">
                  {hopLog.map((node, i) => (
                    <li
                      key={node.id}
                      className="flex items-center gap-3 border-slate-100 py-2.5 [&:not(:last-child)]:border-b"
                    >
                      <span className="font-mono text-[11px] text-slate-500">
                        {String(node.hop ?? i).padStart(2, "0")}
                      </span>
                      <span className={`h-2 w-2 shrink-0 rounded-full ${typeDot(node.type)}`} />
                      <span className="min-w-0 truncate font-mono text-[12px] text-slate-600">
                        {displayLabel(node.label)}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </aside>

          {/* ---- main column ---- */}
          <div className="flex flex-col gap-6">
            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  Network view
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={fitGraph}
                    disabled={!hasGraph}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40"
                  >
                    Fit
                  </button>
                  <button
                    onClick={() => cytoscapeRef.current?.center()}
                    disabled={!hasGraph}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 disabled:opacity-40"
                  >
                    Center
                  </button>
                </div>
              </header>

              <div className="relative overflow-hidden rounded-b-xl border-t border-slate-200 bg-white shadow-inner" style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
                {/* graph */}
                <CytoscapeGraph
                  elements={elements}
                  cy={(cy) => {
                    cytoscapeRef.current = cy;
                    cy.fit(undefined, 60);
                    cy.center();
                  }}
                  style={{ width: "100%", height: "640px" }}
                  stylesheet={graphStyles}
                  layout={{
                    name: "breadthfirst",
                    directed: true,
                    circle: false,
                    roots: ['node[type = "suspect"]'],
                    spacingFactor: 1.7,
                    padding: 60,
                    avoidOverlap: true,
                  }}
                  minZoom={0.35}
                  maxZoom={1.8}
                  boxSelectionEnabled={false}
                />

                {/* overlays */}
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-white/85">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      Traversing the ledger…
                    </p>
                  </div>
                )}

                {!loading && error && (
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="max-w-sm rounded-xl border border-red-200 bg-white p-6 text-center shadow-xl">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-red-600">
                        Trace fault
                      </p>
                      <p className="mt-3 text-[13.5px] leading-6 text-slate-600">{error}</p>
                      <div className="mt-5 flex items-center justify-center gap-3">
                        <button
                          onClick={() => setReloadKey((k) => k + 1)}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700"
                        >
                          Retry
                        </button>
                        <Link
                          href="/"
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                        >
                          New target
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {!loading && !error && !hasGraph && (
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="max-w-sm text-center">
                      <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-slate-500">
                        No outbound flow
                      </p>
                      <p className="mt-3 text-[13.5px] leading-6 text-slate-600">
                        The engine returned no transfers above the dust threshold
                        for this wallet. Try a different target or raise the hop
                        limit.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {ledgerEntries.length > 0 && (
              <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <header className="border-b border-slate-200 px-5 py-3.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Evidentiary Transaction Ledger
                  </h2>
                </header>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left">
                    <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Hop #
                        </th>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Asset
                        </th>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Amount
                        </th>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Date / Time
                        </th>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Source (From)
                        </th>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Recipient (To)
                        </th>
                        <th className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.16em]">
                          Transaction Hash
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledgerEntries.map((entry, index) => {
                        const fromKey = `from-${entry.from}-${index}`;
                        const toKey = `to-${entry.to}-${index}`;
                        const hashKey = `tx-${entry.hash}-${index}`;
                        const isMatchedRecipient =
                          entry.to.toLowerCase() === (meta?.terminalVasp?.matched_address ?? "").toLowerCase();
                        const txExplorer =
                          detectChain(entry.from) === "Tron" || detectChain(entry.to) === "Tron"
                            ? `https://tronscan.org/#/transaction/${entry.hash}`
                            : `https://etherscan.io/tx/${entry.hash}`;

                        return (
                          <tr key={`${entry.hash || entry.from}-${index}`} className="border-b border-slate-100 transition-colors hover:bg-slate-50/70">
                            <td className="px-4 py-3 font-mono text-[12px] text-slate-700">
                              Hop {entry.hop}
                            </td>
                            <td className="px-4 py-3">
                              <span className="inline-flex rounded border border-blue-200 bg-blue-50 px-2 py-0.5 font-mono text-xs font-bold text-blue-700">
                                {entry.asset.toUpperCase()}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-[12px] font-bold text-slate-900">
                              {entry.amount}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-slate-500">
                              {entry.timestamp}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copy(entry.from, fromKey)}
                                  title="Copy source address"
                                  className="font-mono text-[12px] text-slate-600 transition-colors hover:text-blue-600"
                                >
                                  {copied === fromKey ? "Copied!" : shortenHash(entry.from, 6, 4)}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copy(entry.to, toKey)}
                                  title="Copy recipient address"
                                  className={`font-mono text-[12px] transition-colors ${
                                    isMatchedRecipient ? "text-emerald-600 hover:text-emerald-700" : "text-slate-600 hover:text-blue-600"
                                  }`}
                                >
                                  {copied === toKey ? "Copied!" : shortenHash(entry.to, 6, 4)}
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => copy(entry.hash, hashKey)}
                                  title="Copy transaction hash"
                                  className="font-mono text-[12px] text-slate-600 transition-colors hover:text-blue-600"
                                >
                                  {copied === hashKey ? "Copied!" : shortenHash(entry.hash, 8, 6)}
                                </button>
                                <a
                                  href={txExplorer}
                                  target="_blank"
                                  rel="noreferrer"
                                  aria-label={`Open transaction on explorer`}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded border border-slate-200 text-[10px] text-slate-500 transition-colors hover:border-blue-600 hover:text-blue-600"
                                >
                                  ↗
                                </a>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* ---- terminal VASP / seizure ---- */}
            {!loading && !error && (
              <section
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
              >
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
                  <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Terminal VASP
                  </h2>
                  {vaspFound && (
                    <span className="rounded border border-blue-200 bg-blue-50 px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase text-blue-700">
                      Flagged · Seizure
                    </span>
                  )}
                </header>

                {vaspFound && meta?.terminalVasp ? (
                  <div className="p-5">
                    <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                      <Field label="Entity">
                        {meta.terminalVasp.entity ?? "—"}
                      </Field>
                      <Field label="Wallet">
                        {meta.terminalVasp.vasp_name ?? "—"}
                      </Field>
                      <Field label="Detected at hop">
                        {meta.terminalVasp.detected_at_hop ?? meta.hops ?? "—"}
                      </Field>
                      <div className="flex items-center justify-between gap-3 py-2.5">
                        <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-slate-500">
                          Matched address
                        </span>
                        <button
                          onClick={() =>
                            copy(meta.terminalVasp?.matched_address ?? "", "matched")
                          }
                          className="min-w-0 truncate font-mono text-[12.5px] text-slate-600 transition-colors hover:text-blue-600"
                          title="Copy address"
                        >
                          {copied === "matched"
                            ? "copied ✓"
                            : shortenHash(meta.terminalVasp.matched_address ?? "", 8, 6)}
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 border-t border-slate-200 pt-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            setExportError(null);
                            setShowModal(true);
                          }}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700"
                        >
                          Export §94 BNSS notice (PDF)
                        </button>
                        <button
                          onClick={() => setShowNotice((s) => !s)}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50"
                        >
                          {showNotice ? "Hide preview" : "Preview text"}
                        </button>
                      </div>
                      <p className="mt-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-slate-500">
                        Asks for FIR and officer details before download
                      </p>
                    </div>

                    {showNotice && meta && (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
                        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5">
                          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-blue-600">
                            Draft · Section 94 BNSS
                          </span>
                          <button
                            onClick={() => copy(draftNotice(meta, openedAt), "notice")}
                            className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-900"
                          >
                            {copied === "notice" ? "copied ✓" : "copy"}
                          </button>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap px-4 py-4 font-mono text-[12px] leading-6 text-slate-600">
                          {draftNotice(meta, openedAt)}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-5 py-6">
                    <p className="text-[13.5px] leading-6 text-slate-600">
                      {hasGraph
                        ? "No known exchange wallet was reached within the hop limit. Raise max hops or extend the VASP registry to resolve a terminal endpoint."
                        : "Run a trace to resolve the terminal exchange."}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        </div>
      </div>

      <CaseMetadataModal
        open={showModal}
        value={caseData}
        onChange={setCaseData}
        onSubmit={exportNotice}
        onCancel={() => setShowModal(false)}
        busy={exporting}
        error={exportError}
        entity={meta?.terminalVasp?.entity ?? "the exchange"}
        caseRef={caseReference(target)}
      />
    </Shell>
  );
}

function Shell({
  target,
  openedAt,
  children,
}: {
  target: string;
  openedAt: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex min-h-16 w-full max-w-[1600px] flex-wrap items-center justify-between gap-3 px-6 py-3 lg:px-16">
          <Link href="/" aria-label="NEXUS home" className="select-none">
            <div className="flex items-center gap-3 select-none">
              <div className="relative flex h-8 w-8 items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0" aria-hidden="true">
                  <circle cx="16" cy="16" r="14" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
                  <circle cx="16" cy="2" r="2" fill="#2563EB" />
                  <circle cx="29.8" cy="12" r="2" fill="#2563EB" />
                  <circle cx="2.2" cy="12" r="2" fill="#2563EB" />
                  <circle cx="24.4" cy="27.3" r="2" fill="#10B981" />
                  <circle cx="7.6" cy="27.3" r="2" fill="#10B981" />
                  <path d="M12 21V11L20 21V11" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="square" strokeLinejoin="miter" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-extrabold leading-none tracking-[0.15em] text-slate-900">NEXUS</span>
              </div>
            </div>
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-600">Restricted</span>
            <span className="rounded border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700">Case: {target ? caseReference(target) : "—"}</span>
            <span className="rounded border border-slate-200 bg-slate-100 px-3 py-1 font-mono text-sm text-slate-700">Target: {target ? shortenHash(target) : "none"}</span>
            {openedAt && <span className="hidden text-xs text-slate-500 lg:inline">Opened {openedAt}</span>}
          </div>
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}

export default function TracePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50 font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">
          Loading console…
        </div>
      }
    >
      <NexusDashboard />
    </Suspense>
  );
}
