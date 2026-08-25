"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { SiteNav } from "@/components/brand";

/* -------------------------------------------------------------------------- */
/*  Signature: the live trace — the product's thesis, drawn on load           */
/* -------------------------------------------------------------------------- */

type DemoNode = {
  type: "suspect" | "mule" | "vasp";
  label: string;
  hash: string;
  asset?: string;
};

const DEMO_TRACE: DemoNode[] = [
  { type: "suspect", label: "Suspect wallet · hop 0", hash: "0x9f2a4b7c1d8e5f30…c4e1" },
  { type: "mule", label: "Intermediary · hop 1", hash: "0x3c71e0a9b2f4d6c8…a0b8", asset: "4.20 ETH" },
  { type: "mule", label: "Intermediary · hop 2", hash: "0x8ad0f5c33e9714bb…39ff", asset: "4.19 ETH" },
  { type: "vasp", label: "Binance · Hot Wallet 14", hash: "0x28c6c06298d514db…7be2", asset: "4.15 ETH" },
];

function NodeMarker({ type }: { type: DemoNode["type"] }) {
  if (type === "suspect") {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-flag ring-4 ring-flag/20" />
    );
  }
  if (type === "vasp") {
    return <span className="h-3.5 w-3.5 bg-seal ring-4 ring-seal/20" />;
  }
  return (
    <span className="h-3 w-3 rounded-full border-2 border-wire bg-ink-900" />
  );
}

function LiveTrace() {
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: {},
    show: {
      transition: { staggerChildren: reduce ? 0 : 0.55, delayChildren: 0.3 },
    },
  };
  const row: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 10 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };
  const stamp: Variants = {
    hidden: { opacity: 0, scale: reduce ? 1 : 1.6, rotate: reduce ? -8 : -22 },
    show: {
      opacity: 1,
      scale: 1,
      rotate: -8,
      transition: { type: "spring", stiffness: 240, damping: 14, delay: 0.15 },
    },
  };

  return (
    <div className="relative w-full overflow-hidden border border-line bg-ink-800/80 shadow-2xl shadow-black/40">
      {/* card header */}
      <div className="flex items-center justify-between border-b border-line bg-ink-850 px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-2 rounded-full bg-seal seal-pulse" />
          <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-faint">
            Live trace
          </span>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Case NEX-2026-D514DB
        </span>
      </div>

      <div className="dossier-grid px-6 py-7">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative"
        >
          {DEMO_TRACE.map((node, i) => {
            const last = i === DEMO_TRACE.length - 1;
            return (
              <motion.div
                key={node.hash}
                variants={row}
                className="relative flex gap-4 pb-7 last:pb-0"
              >
                {!last && (
                  <span className="absolute left-[7px] top-6 bottom-1 w-px bg-gradient-to-b from-wire/70 to-wire/20" />
                )}
                <div className="mt-1 flex w-3.5 shrink-0 justify-center">
                  <NodeMarker type={node.type} />
                </div>

                <div
                  className={
                    "relative flex-1 border bg-ink-750/70 px-4 py-3 " +
                    (node.type === "vasp"
                      ? "border-seal/50"
                      : "border-line")
                  }
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-faint">
                      {node.label}
                    </span>
                    {node.asset && (
                      <span className="font-mono text-[11px] text-muted">
                        ▼ {node.asset}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 font-mono text-[13px] text-paper">
                    {node.hash}
                  </div>

                  {node.type === "vasp" && (
                    <motion.span
                      variants={stamp}
                      className="evidence-stamp absolute -right-2 -top-3 bg-ink-900 px-2.5 py-1 font-mono text-[9.5px] font-semibold uppercase"
                    >
                      Flagged · Seizure
                    </motion.span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      <div className="flex items-center justify-between border-t border-line bg-ink-850 px-5 py-3">
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
          4 hops · 0.05 ETH dust filtered
        </span>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-jade">
          ● VASP identified
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Pipeline: a genuine four-step sequence (numbering earns its place)        */
/* -------------------------------------------------------------------------- */

const PIPELINE = [
  {
    n: "01",
    title: "Ingest",
    body: "Paste a wallet. NEXUS auto-detects Ethereum or Tron and pulls its outbound transfers.",
  },
  {
    n: "02",
    title: "Traverse",
    body: "A breadth-first search follows the funds hop by hop, filtering dust meant to bury the trail.",
  },
  {
    n: "03",
    title: "Attribute",
    body: "Each terminal wallet is matched against known exchange hot wallets until a VASP is found.",
  },
  {
    n: "04",
    title: "Draft §94",
    body: "The exchange, address, and transaction hash flow into a Section 94 BNSS freezing notice.",
  },
];

/* -------------------------------------------------------------------------- */

export default function NexusLandingPage() {
  const [wallet, setWallet] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = wallet.trim();
    if (cleaned) router.push(`/trace?wallet=${encodeURIComponent(cleaned)}`);
  };

  const samples = [
    { label: "ETH sample", value: "0x28C6c06298d514Db089934071355E5743bf21d60" },
    { label: "Tron sample", value: "TJRabPrwbZy45sbavfcjinPJC18kjpRTv8" },
  ];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink-900 text-paper">
      <SiteNav
        active="home"
        stripItems={[
          { label: "Restricted" },
          { label: "I4C forensic evidence system" },
          { label: "BNSS", value: "§94" },
        ]}
        stripRight="MHA · Govt. of India"
      />

      {/* ---- HERO ---- */}
      <main className="relative">
        <div className="dossier-grid absolute inset-0 -z-10" />
        <div className="absolute left-1/2 top-24 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-seal/[0.06] blur-[140px]" />

        <div className="mx-auto grid max-w-7xl gap-12 px-6 pb-24 pt-36 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:px-10 lg:pb-28 lg:pt-40">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-seal">
              Indian Cybercrime Coordination Centre
            </p>
            <h1 className="mt-5 font-display text-[2.75rem] font-extrabold leading-[1.02] tracking-tight text-paper sm:text-6xl">
              Follow illicit crypto to the exchange that can freeze it.
            </h1>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-muted">
              NEXUS ingests a suspect wallet, traces the money across mule
              wallets to the exchange where it cashes out, and drafts the
              Section&nbsp;94 BNSS freezing notice — in a single pass, before
              the funds clear to fiat.
            </p>

            <form onSubmit={handleSearch} className="mt-9 max-w-xl">
              <div className="group flex items-stretch border border-line bg-ink-750/70 focus-within:border-seal">
                <span className="flex items-center pl-4 font-mono text-sm text-faint">
                  ⌕
                </span>
                <input
                  type="text"
                  value={wallet}
                  onChange={(e) => setWallet(e.target.value)}
                  placeholder="Paste a suspect wallet — Ethereum (0x…) or Tron (T…)"
                  aria-label="Suspect wallet address"
                  className="min-w-0 flex-1 bg-transparent px-3 py-3.5 font-mono text-sm text-paper placeholder:text-faint focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  className="shrink-0 bg-seal px-6 font-mono text-[12px] font-semibold uppercase tracking-[0.18em] text-ink-900 transition-colors hover:bg-seal-bright"
                >
                  Trace
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-faint">
                  Try
                </span>
                {samples.map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setWallet(s.value)}
                    className="border border-line px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted transition-colors hover:border-wire hover:text-paper"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <LiveTrace />
          </motion.div>
        </div>
      </main>

      {/* ---- PIPELINE ---- */}
      <section
        id="capabilities"
        className="border-t border-line bg-ink-850/40 px-6 py-24 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-faint">
              How a trace runs
            </p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-paper sm:text-[2.5rem]">
              Suspect wallet to freezing notice, uninterrupted.
            </h2>
          </div>

          <div className="mt-14 grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {PIPELINE.map((step, i) => (
              <motion.div
                key={step.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group relative bg-ink-900 p-7"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-mono text-[12px] font-semibold tracking-[0.1em] text-seal">
                    {step.n}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-faint transition-colors group-hover:text-wire">
                    {i < PIPELINE.length - 1 ? "→" : "◼"}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-lg font-bold tracking-tight text-paper">
                  {step.title}
                </h3>
                <p className="mt-2.5 text-[13.5px] leading-6 text-muted">
                  {step.body}
                </p>
              </motion.div>
            ))}
          </div>

          {/* authority strip */}
          <div className="mt-10 grid gap-px border border-line bg-line text-center sm:grid-cols-3">
            {[
              { k: "Chains traced", v: "Ethereum · Tron" },
              { k: "EVM networks", v: "60+ via unified index" },
              { k: "Legal instrument", v: "BNSS Section 94" },
            ].map((stat) => (
              <div key={stat.k} className="bg-ink-900 px-6 py-6">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
                  {stat.k}
                </div>
                <div className="mt-2 font-display text-lg font-bold tracking-tight text-paper">
                  {stat.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="border-t border-line px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
            NEXUS · Blockchain forensic attribution engine
          </p>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
            Prototype · Team 6 Bits · Not for operational use
          </p>
        </div>
      </footer>
    </div>
  );
}
