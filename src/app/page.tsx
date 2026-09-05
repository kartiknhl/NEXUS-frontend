"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PILLARS = [
  {
    number: "01",
    title: "Multi-Chain Chronological Traversal",
    description: "Visualize fund flows between addresses and entities with strict temporal filtering (T_out >= T_in) to preserve chain-of-custody across EVM and Tron.",
  },
  {
    number: "02",
    title: "Heuristic Pattern Recognition",
    description: "Uncover obfuscation tactics including automated peel chains, smurfing, and dusting with real-time heuristic path routing.",
  },
  {
    number: "03",
    title: "Automated Section 94 BNSS Notices",
    description: "Transform visual forensic graphs into court-ready production notices, cryptographically sealed under Section 63 BSA for undisputed legal admissibility.",
  },
];
const ETH_SAMPLE_ADDRESS = "0x28C6c06298d514Db089934071355E5743bf21d60";

const floatAnimation = `
  @keyframes float {
    0% { transform: translateY(0px) rotate(0deg); }
    50% { transform: translateY(-20px) rotate(3deg); }
    100% { transform: translateY(0px) rotate(0deg); }
  }
  .animate-float-slow { animation: float 6s ease-in-out infinite; }
  .animate-float-medium { animation: float 5s ease-in-out infinite; }
  .animate-float-fast { animation: float 4s ease-in-out infinite; }
  .delay-1 { animation-delay: 1s; }
  .delay-2 { animation-delay: 2s; }
  .delay-3 { animation-delay: 3s; }
`;

function scrollToSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const start = window.scrollY;
  const target = Math.max(0, section.getBoundingClientRect().top + start - 88);
  const distance = target - start;
  const duration = 900;
  const startedAt = performance.now();

  const animate = (now: number) => {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = progress < 0.5
      ? 2 * progress * progress
      : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    window.scrollTo(0, start + distance * eased);
    if (progress < 1) requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
}

function NetworkGraphic({ activePillar }: { activePillar: number }) {
  if (activePillar === 1) {
    return (
      <div className="relative w-full">
        <div className="absolute left-4 top-2 rounded bg-blue-600 px-3 py-1 font-mono text-xs font-bold tracking-wider text-white">PEEL CHAIN</div>
        <svg viewBox="0 0 620 360" className="h-auto w-full" role="img" aria-label="Peel chain branching diagram">
          <path d="M80 180H180M180 180 285 95M180 180 285 180M180 180 285 265M285 95 410 60M285 95 410 125M285 180h125M285 265 410 230M285 265 410 300" fill="none" stroke="#cbd5e1" strokeWidth="2" />
          <path d="M80 180H180L285 95 410 60" fill="none" stroke="#2563eb" strokeWidth="3" />
          {["80,180", "180,180", "285,95", "285,180", "285,265", "410,60", "410,125", "410,180", "410,230", "410,300"].map((point, index) => { const [cx, cy] = point.split(","); return <circle key={point} cx={cx} cy={cy} r={index === 0 ? 11 : 7} fill="white" stroke={index === 0 || index === 2 ? "#2563eb" : "#94a3b8"} strokeWidth="2" />; })}
          <text x="58" y="220" fill="#64748b" fontSize="11" fontFamily="monospace">ORIGIN</text>
          <text x="390" y="42" fill="#2563eb" fontSize="11" fontFamily="monospace">PEEL 01</text>
        </svg>
      </div>
    );
  }

  if (activePillar === 2) {
    return (
      <svg viewBox="0 0 620 360" className="h-auto w-full" role="img" aria-label="Official legal summons with blue seal checkmarks">
        <path d="M80 85 175 150M80 275l95-65M445 150l95-65M445 210l95 65" fill="none" stroke="#cbd5e1" strokeWidth="2" />
        <circle cx="80" cy="85" r="15" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" /><circle cx="80" cy="275" r="15" fill="#eff6ff" stroke="#93c5fd" strokeWidth="2" />
        <circle cx="540" cy="85" r="15" fill="#2563eb" /><circle cx="540" cy="275" r="15" fill="#2563eb" />
        <path d="M285 45h115l45 45v225H175V45h110" fill="white" stroke="#94a3b8" strokeWidth="2" />
        <path d="M400 45v45h45M215 135h190M215 165h160M215 195h190M215 225h140" stroke="#cbd5e1" strokeWidth="4" />
        <circle cx="310" cy="105" r="21" fill="#2563eb" /><path d="m299 105 7 7 16-18" fill="none" stroke="white" strokeWidth="3" />
        <rect x="220" y="325" width="180" height="22" rx="3" fill="#eff6ff" stroke="#2563eb" /><text x="310" y="340" textAnchor="middle" fill="#1d4ed8" fontSize="11" fontFamily="monospace" fontWeight="bold">SEC 63 BSA CERTIFIED</text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 620 360" className="h-auto w-full" role="img" aria-label="Chronological network diagram">
      <defs><marker id="light-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0 0 6 7 3Z" fill="#2563eb" /></marker></defs>
      <path d="M85 180h105l100-75h100M190 180l100 75h100M390 105l115-35M390 105l115 35M390 255l115-35M390 255l115 35" fill="none" stroke="#cbd5e1" strokeWidth="2" markerEnd="url(#light-arrow)" />
      <path d="M85 180h105l100-75" fill="none" stroke="#2563eb" strokeWidth="3" markerEnd="url(#light-arrow)" />
      <polygon points="85,160 102,170 102,190 85,200 68,190 68,170" fill="white" stroke="#2563eb" strokeWidth="3" />
      {["190,180", "290,105", "290,255", "390,105"].map((point) => { const [cx, cy] = point.split(","); return <circle key={point} cx={cx} cy={cy} r="13" fill="white" stroke="#94a3b8" strokeWidth="2" />; })}
      {["505,70", "505,290"].map((point) => { const [cx, cy] = point.split(","); return <g key={point}><circle cx={cx} cy={cy} r="19" fill="none" stroke="#10b981" strokeOpacity="0.3" strokeWidth="3" /><circle cx={cx} cy={cy} r="11" fill="#ecfdf5" stroke="#10b981" strokeWidth="3" /></g>; })}
      <text x="58" y="230" fill="#64748b" fontSize="11" fontFamily="monospace">ORIGIN</text><text x="480" y="48" fill="#059669" fontSize="11" fontFamily="monospace">VASP</text><text x="480" y="326" fill="#059669" fontSize="11" fontFamily="monospace">VASP</text>
    </svg>
  );
}

function ProductPreview() {
  return (
    <div className="relative w-full max-w-[700px]">
      <div className="absolute -left-8 bottom-16 z-30 w-64 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_15px_40px_-10px_rgba(0,0,0,0.15)] backdrop-blur-sm lg:-left-16">
        <div className="mb-2 flex items-center gap-2.5"><div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" /><p className="text-[11px] font-bold uppercase tracking-widest text-slate-800">VASP Endpoint Hit</p></div>
        <div className="space-y-1 rounded border border-emerald-100 bg-emerald-50/50 p-2.5 font-mono text-xs text-emerald-800"><div className="flex justify-between"><span>Entity:</span><span className="font-bold">BINANCE</span></div><div className="flex justify-between"><span>KYC:</span><span className="font-bold">VERIFIED</span></div><div className="flex justify-between"><span>Deposit:</span><span>14.2 ETH</span></div></div>
      </div>
      <div className="flex h-[450px] w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)]">
        <div className="flex h-10 shrink-0 items-center gap-2 bg-slate-900 px-4"><div className="flex gap-1.5"><div className="h-2.5 w-2.5 rounded-full bg-slate-700" /><div className="h-2.5 w-2.5 rounded-full bg-slate-700" /><div className="h-2.5 w-2.5 rounded-full bg-slate-700" /></div><div className="ml-4 flex items-center gap-2 font-mono text-[10px] tracking-widest text-slate-400"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>NEXUS // TRACE CONSOLE</div>
        </div>
        <div className="flex h-12 shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4"><div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-600"><span className="text-slate-400">TARGET</span>0x9f2a...c4e1</div><div className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[10px] text-slate-600"><span className="text-slate-400">DEPTH</span>3 HOPS</div><div className="ml-auto h-6 w-20 rounded border border-slate-200 bg-slate-100" /></div>
        <div className="relative flex flex-1 overflow-hidden bg-slate-50">
          <div className="relative flex-1 border-r border-slate-200" style={{ backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
            <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true"><line x1="15%" y1="50%" x2="45%" y2="25%" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" /><line x1="15%" y1="50%" x2="50%" y2="75%" stroke="#94A3B8" strokeWidth="2" strokeDasharray="4 4" /><line x1="45%" y1="25%" x2="80%" y2="35%" stroke="#10B981" strokeWidth="2" /></svg>
            <div className="absolute left-[25%] top-[32%] z-10 -translate-x-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-600">14.2 ETH</div><div className="absolute left-[30%] top-[65%] z-10 -translate-x-1/2 -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[9px] text-slate-600">0.05 ETH</div>
            <div className="absolute left-[15%] top-[50%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border-2 border-red-500 bg-red-50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-900 shadow-sm"><div className="h-1.5 w-1.5 rounded-full bg-red-500" />Target</div><div className="absolute left-[45%] top-[25%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-slate-400 bg-white px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-900 shadow-sm">0x3c71...a0b8</div><div className="absolute left-[50%] top-[75%] z-20 -translate-x-1/2 -translate-y-1/2 rounded-lg border-2 border-slate-400 bg-white px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-900 shadow-sm">0x77d2...99f0</div><div className="absolute left-[80%] top-[35%] z-20 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-lg border-2 border-emerald-500 bg-emerald-50 px-2.5 py-1.5 font-mono text-[10px] font-bold text-slate-900 shadow-sm"><div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Binance</div>
          </div>
          <div className="flex w-56 shrink-0 flex-col bg-white p-4"><h4 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Evidentiary Ledger</h4><div className="flex flex-1 flex-col gap-4">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="flex flex-col gap-1.5 border-b border-slate-100 pb-3 last:border-0"><div className="flex items-center justify-between"><div className="h-2 w-16 rounded bg-slate-200" /><div className="h-1.5 w-10 rounded bg-blue-100" /></div><div className="h-1.5 w-full rounded bg-slate-100" /><div className="h-1.5 w-4/5 rounded bg-slate-100" /></div>)}</div><div className="mt-auto flex h-8 w-full items-center justify-center rounded border border-blue-200 bg-blue-50 text-[10px] font-bold uppercase tracking-wider text-blue-600">Generate BNSS Notice</div></div>
        </div>
      </div>
    </div>
  );
}

function FeatureTerminal() {
  return <div className="relative flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50"><div className="relative w-64 rounded-lg border border-slate-200 bg-slate-50 p-5 shadow-2xl"><div className="flex items-center gap-2 border-b border-slate-200 pb-3"><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="h-2.5 w-2.5 rounded-full bg-slate-300" /><span className="ml-auto font-mono text-[8px] text-slate-400">OSINT://SCAN</span></div><div className="flex h-44 items-center justify-center"><svg viewBox="0 0 120 120" className="h-28 w-28" aria-label="Entity attribution network"><circle cx="60" cy="60" r="20" fill="#eff6ff" stroke="#2563eb" strokeWidth="3" /><circle cx="60" cy="60" r="7" fill="#2563eb" /><path d="M60 40V25M60 80v15M40 60H25M80 60h15" stroke="#93c5fd" strokeWidth="3" /><circle cx="60" cy="20" r="7" fill="white" stroke="#64748b" strokeWidth="2" /><circle cx="60" cy="100" r="7" fill="white" stroke="#64748b" strokeWidth="2" /><circle cx="20" cy="60" r="7" fill="white" stroke="#64748b" strokeWidth="2" /><circle cx="100" cy="60" r="7" fill="#ecfdf5" stroke="#10b981" strokeWidth="2" /></svg></div><div className="h-1 rounded-full bg-slate-200"><div className="h-1 w-4/5 rounded-full bg-blue-500" /></div></div><div className="absolute bottom-7 right-7 flex h-24 w-24 items-center justify-center rounded-full border-2 border-blue-400 bg-blue-50"><span className="absolute inset-[-10px] animate-pulse rounded-full border border-blue-200" /><svg viewBox="0 0 64 64" className="h-14 w-14" aria-label="Target inspection"><circle cx="27" cy="27" r="15" fill="none" stroke="#60a5fa" strokeWidth="3" /><path d="m38 38 15 15" stroke="#60a5fa" strokeWidth="5" strokeLinecap="round" /><path d="M27 18v18M18 27h18" stroke="#2563eb" strokeWidth="2" /></svg></div></div>;
}

function InterceptionGraphic() {
  return <div className="flex min-h-[340px] items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50"><div className="flex w-full max-w-xl items-center justify-between gap-2 sm:gap-4"><div className="flex shrink-0 flex-col items-center"><div className="rounded-full border border-blue-200 bg-blue-50 p-3 text-blue-600"><span className="text-xl">◎</span></div><span className="mt-2 font-mono text-[10px] uppercase text-slate-500">Victim</span></div><div className="relative min-w-0 flex-1"><div className="h-px bg-slate-300" /><span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[9px] text-slate-500">ETH / USDT</span></div><div className="flex shrink-0 flex-col items-center"><div className="rounded-lg border border-blue-400 bg-blue-600 p-3 text-white shadow-lg shadow-blue-200"><span className="text-xl">✓</span></div><span className="mt-2 font-mono text-[10px] uppercase text-blue-600">Intercepted</span></div><div className="min-w-0 flex-1 border-t border-dashed border-red-300" /><div className="flex shrink-0 flex-col items-center"><div className="rounded-full border border-red-300 bg-red-50 p-3 text-red-500"><span className="text-xl">▣</span></div><span className="mt-2 block rounded border border-red-200 bg-red-50 px-2 py-0.5 text-center font-mono text-[10px] font-bold text-red-500">SCAM TARGET</span></div></div></div>;
}

function SpotlightCommandBar({ wallet, setWallet, onTrace, onClose, open }: { wallet: string; setWallet: (value: string) => void; onTrace: (event: React.FormEvent<HTMLFormElement>) => void; onClose: () => void; open: boolean }) {
  return (
    <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/40 p-4 backdrop-blur-md transition-opacity duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "visible opacity-100" : "pointer-events-none invisible opacity-0"}`} role="dialog" aria-modal="true" aria-label="Trace console" onClick={onClose}>
      <div className={`relative flex w-full max-w-3xl -translate-y-10 flex-col items-center transform-gpu will-change-[transform,opacity] transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${open ? "scale-100 opacity-100" : "translate-y-4 scale-95 opacity-0"}`} onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex w-full justify-end pr-2">
          <button type="button" onClick={onClose} className="rounded-full border border-white/20 bg-slate-900/30 p-2.5 text-white/80 shadow-lg backdrop-blur-md transition-colors hover:bg-slate-900/50 hover:text-white" aria-label="Close trace console">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>
        <form onSubmit={onTrace} className="relative flex w-full items-center gap-2 rounded-2xl border border-white/60 bg-white/75 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)] backdrop-blur-xl transition-all">
        <label className="sr-only" htmlFor="wallet-target">Target wallet or transaction hash</label>
        <input id="wallet-target" autoFocus={open} value={wallet} onChange={(event) => setWallet(event.target.value)} placeholder="Enter target suspect wallet address (0x... / T...)" className="spotlight-input w-full flex-1 border-none bg-transparent px-4 py-3 font-mono text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:outline-none focus:ring-0 selection:bg-slate-300 selection:text-slate-900" />
        <button type="submit" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700">Trace Funds →</button>
        </form>
            <button type="button" onClick={() => setWallet(ETH_SAMPLE_ADDRESS)} className="mt-5 flex cursor-pointer items-center gap-2 self-center rounded-full border border-white/60 bg-white/70 px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:bg-white/95 hover:text-slate-900">Load Target Sample <span>→</span></button>
      </div>
    </div>
  );
}

export default function NexusLandingPage() {
  const router = useRouter();
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [wallet, setWallet] = useState("");
  const [activePillar, setActivePillar] = useState(0);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setIsCommandOpen(true); }
      if (event.key === "Escape") setIsCommandOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleTrace = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); const target = wallet.trim(); if (target) router.push(`/trace?wallet=${encodeURIComponent(target)}`); };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header>
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
          <div className="flex h-20 w-full items-center justify-between px-6 lg:px-12 xl:px-16">
            <div className="flex flex-1 items-center justify-start select-none">
              <Link href="/" aria-label="NEXUS home" className="select-none">
                <div className="flex items-center gap-3">
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
                  <span className="mt-1 text-lg font-extrabold leading-none tracking-[0.15em] text-slate-900">NEXUS</span>
                </div>
              </Link>
            </div>
            <div className="hidden shrink-0 items-center justify-center gap-10 md:flex">
              <a href="#capabilities" onClick={(event) => { event.preventDefault(); scrollToSection("capabilities"); }} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Capabilities</a>
              <a href="#workflow" onClick={(event) => { event.preventDefault(); scrollToSection("workflow"); }} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Investigation Workflow</a>
              <a href="#legal" onClick={(event) => { event.preventDefault(); scrollToSection("legal"); }} className="text-sm font-semibold text-slate-600 transition-colors hover:text-slate-900">Legal Framework</a>
            </div>
            <div className="flex flex-1 items-center justify-end">
              <button type="button" onClick={() => setIsCommandOpen(true)} className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700">Launch Console</button>
            </div>
          </div>
        </nav>
      </header>

      <main>
        <style>{floatAnimation}</style>
        <section className="relative isolate mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-12 overflow-visible px-6 pb-16 pt-8 lg:grid-cols-12 lg:gap-20 lg:px-16 lg:pb-20 lg:pt-10">
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <div className="absolute right-[10%] top-[15%] flex h-16 w-16 items-center justify-center rounded-full border border-slate-200 bg-white/60 text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow">
              <svg width="24" height="24" viewBox="0 0 320 512" fill="currentColor" aria-label="Ethereum node"><path d="M311.9 260.8L160 353.6 8 260.8 160 0l151.9 260.8zM160 383.4L8 290.6 160 512l152-221.4-152 92.8z" /></svg>
            </div>
            <div className="absolute right-[35%] top-[60%] flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white/60 text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-medium delay-1"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-label="Tron symbol"><path d="M7 6h18v5h-6v15h-6V11H7Z" fill="currentColor" /></svg></div>
            <div className="absolute right-[8%] top-[70%] flex h-20 w-20 items-center justify-center rounded-full border border-slate-200 bg-white/60 text-emerald-500/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow delay-2"><svg viewBox="0 0 48 48" className="h-9 w-9" aria-label="Tether dollar symbol"><circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" strokeWidth="3" /><path d="M14 15h20M24 15v19M17 22c3 2 11 2 14 0M17 22c0 5 14 5 14 0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg></div>
            <div className="absolute right-[45%] top-[25%] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-3"><div className="h-3 w-3 rounded-full bg-slate-300" /></div>
            <div className="absolute right-[2%] top-[40%] flex h-14 w-14 items-center justify-center rounded-full border border-blue-200/50 bg-white/60 text-blue-500 shadow-[0_8px_30px_rgb(37,99,235,0.08)] backdrop-blur-md animate-float-medium delay-2"><div className="h-4 w-4 rounded-sm bg-blue-500" /></div>
            <div className="absolute right-[24%] top-[8%] flex h-11 w-11 items-center justify-center rounded-full border border-orange-200 bg-white/60 text-2xl text-orange-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-1" aria-label="Bitcoin symbol">₿</div>
            <div className="absolute right-[53%] top-[42%] z-10 flex h-16 w-16 items-center justify-center rounded-full border-2 border-blue-200 bg-white/75 text-3xl font-semibold text-blue-600 shadow-[0_8px_30px_rgb(37,99,235,0.12)] backdrop-blur-md animate-float-medium delay-1" aria-label="Indian rupee symbol">₹</div>
            <div className="absolute right-[48%] top-[48%] flex h-14 w-14 items-center justify-center rounded-full border border-sky-200 bg-white/60 text-2xl text-sky-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow delay-3" aria-label="Dollar coin symbol">$</div>
            <div className="absolute right-[20%] top-[82%] flex h-12 w-12 items-center justify-center rounded-full border border-violet-200 bg-white/60 text-violet-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-medium delay-2" aria-label="Solana symbol"><svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true"><path d="M7 9h17l2 3H9Zm0 6h17l-2 3H5Zm2 6h17l-2 3H7Z" fill="currentColor" /></svg></div>
            <div className="absolute right-[62%] top-[78%] flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/60 text-slate-400 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-1"><div className="h-2.5 w-2.5 rounded-sm border border-slate-400 rotate-45" /></div>
            <div className="absolute right-[38%] top-[86%] flex h-10 w-10 items-center justify-center rounded-full border border-indigo-200 bg-white/60 text-indigo-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-2" aria-label="Ripple symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><path d="M7 16c6-8 12-8 18 0-6 8-12 8-18 0Z" fill="none" stroke="currentColor" strokeWidth="2.5" /><path d="M11 16c3-4 7-4 10 0-3 4-7 4-10 0Z" fill="currentColor" /></svg></div>
            <div className="absolute right-[70%] top-[36%] flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200 bg-white/60 text-cyan-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-medium delay-3" aria-label="Cardano symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><circle cx="16" cy="16" r="3" fill="currentColor" /><circle cx="16" cy="7" r="2" fill="currentColor" /><circle cx="16" cy="25" r="2" fill="currentColor" /><circle cx="7" cy="16" r="2" fill="currentColor" /><circle cx="25" cy="16" r="2" fill="currentColor" /><circle cx="10" cy="10" r="1.5" fill="currentColor" /><circle cx="22" cy="22" r="1.5" fill="currentColor" /></svg></div>
            <div className="absolute right-[4%] top-[18%] flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white/60 text-rose-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow delay-3" aria-label="Avalanche symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><path d="m16 5 11 20H5Z" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" /><path d="M16 12v6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></div>
            <div className="absolute right-[56%] top-[12%] flex h-9 w-9 items-center justify-center rounded-full border border-pink-200 bg-white/60 text-pink-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-medium delay-1" aria-label="Polygon symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><path d="M8 10h6l4 4v4l-4 4H8l-3-3v-6Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M18 10h6l3 3v6l-3 3h-5" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
            <div className="absolute right-[78%] top-[68%] flex h-11 w-11 items-center justify-center rounded-full border border-amber-200 bg-white/60 text-amber-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-2" aria-label="Chainlink symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><path d="m12 8 4-3 4 3-4 3Zm0 16 4 3 4-3-4-3ZM8 12l-3 4 3 4 3-4Zm16 0 3 4-3 4-3-4Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m12 12 8 8M20 12l-8 8" stroke="currentColor" strokeWidth="2" /></svg></div>
            <div className="absolute right-[30%] top-[72%] flex h-9 w-9 items-center justify-center rounded-full border border-teal-200 bg-white/60 text-teal-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow delay-3" aria-label="Polkadot symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><circle cx="16" cy="10" r="4" fill="currentColor" /><circle cx="16" cy="22" r="4" fill="currentColor" /><path d="M16 14v4" stroke="currentColor" strokeWidth="3" /></svg></div>
            <div className="absolute right-[88%] top-[25%] flex h-8 w-8 items-center justify-center rounded-full border border-lime-200 bg-white/60 text-lime-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-medium delay-2" aria-label="Stellar symbol"><svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true"><path d="M16 4 19 13l9 3-9 3-3 9-3-9-9-3 9-3Z" fill="currentColor" /></svg></div>
            <div className="absolute right-[15%] top-[34%] flex h-12 w-12 items-center justify-center rounded-full border border-orange-200 bg-white/60 text-orange-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow delay-2" aria-label="Cosmos symbol"><svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true"><path d="M16 3 19 13l10 3-10 3-3 10-3-10-10-3 10-3Z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="16" cy="16" r="3" fill="currentColor" /></svg></div>
            <div className="absolute right-[84%] top-[52%] flex h-10 w-10 items-center justify-center rounded-full border border-fuchsia-200 bg-white/60 text-fuchsia-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-1" aria-label="Monero symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M8 22V12l8 8 8-8v10" fill="none" stroke="currentColor" strokeWidth="2.5" /></svg></div>
            <div className="absolute right-[12%] top-[88%] flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-white/60 text-cyan-600 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-medium delay-3" aria-label="Near symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><path d="M9 23V9l14 14V9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d="M9 9h4l10 10" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
            <div className="absolute right-[42%] top-[3%] flex h-8 w-8 items-center justify-center rounded-full border border-blue-200 bg-white/60 text-blue-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-fast delay-3" aria-label="Arbitrum symbol"><svg viewBox="0 0 32 32" className="h-5 w-5" aria-hidden="true"><path d="M16 4 27 10v12L16 28 5 22V10Z" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m12 21 4-10 4 10M13.5 17h5" fill="none" stroke="currentColor" strokeWidth="2" /></svg></div>
            <div className="absolute right-[52%] top-[92%] flex h-10 w-10 items-center justify-center rounded-full border border-purple-200 bg-white/60 text-purple-500 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md animate-float-slow delay-1" aria-label="Aptos symbol"><svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden="true"><path d="M7 23 13 9h5l7 14M10 18h11" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg></div>
          </div>
          <div className="relative z-10 lg:col-span-5"><h1 className="text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 lg:text-5xl">Connecting the untraceable to the undeniable.</h1><p className="mt-5 text-lg leading-relaxed text-slate-600">Strike fast against crypto crime with real-time multi-chain tracking and instant, BNSS/BSA-compliant evidence.</p><div className="mt-8 flex flex-wrap items-center gap-2"><button type="button" onClick={() => setIsCommandOpen(true)} className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg">INITIALIZE TRACE CONSOLE</button><a href="#legal" onClick={(event) => { event.preventDefault(); scrollToSection("legal"); }} className="px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:text-blue-600">View Legal Framework (BNSS/BSA) →</a></div></div>
          <div className="relative z-20 flex justify-center translate-y-12 lg:col-span-7 lg:translate-y-24 lg:justify-end"><ProductPreview /></div>
        </section>

        <section className="border-y border-slate-200 bg-white pb-12 pt-28"><div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 gap-8 px-6 md:grid-cols-3 lg:gap-12 lg:px-16"><div><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">CHAIN ARCHITECTURE</span><div className="mt-1 text-3xl font-black text-slate-900">EVM + Tron</div><p className="mt-1 text-sm text-slate-500">Native gas-layer and TRC-20 USDT chronological graph traversal.</p></div><div><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">LEGAL COMPLIANCE</span><div className="mt-1 text-3xl font-black text-slate-900">Sec. 94 BNSS</div><p className="mt-1 text-sm text-slate-500">Automated generation of court-admissible production orders.</p></div><div><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">EVIDENTIARY INTEGRITY</span><div className="mt-1 text-3xl font-black text-slate-900">Sec. 63 BSA</div><p className="mt-1 text-sm text-slate-500">SHA-256 client-side cryptographic hashing for zero-tamper evidence.</p></div></div></section>

        <section id="capabilities" className="border-t border-slate-200 bg-slate-50/60 py-20"><div className="mx-auto grid w-full max-w-[1600px] grid-cols-1 items-center gap-12 px-6 lg:grid-cols-12 lg:gap-20 lg:px-16"><div className="min-w-0 space-y-5 lg:col-span-5"><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">CORE CAPABILITIES</span>{PILLARS.map((pillar, index) => { const active = activePillar === index; return <button key={pillar.number} type="button" onClick={() => setActivePillar(index)} aria-expanded={active} className={`w-full rounded-r-lg p-4 text-left transition-all duration-300 ${active ? "border-l-4 border-blue-600 bg-white/60" : "border-l-4 border-transparent hover:border-slate-300"}`}><div className="flex justify-between gap-4"><div><span className="font-mono text-xs text-slate-400">{pillar.number}</span><h2 className={`mt-1 text-lg font-bold ${active ? "text-slate-900" : "text-slate-500 hover:text-slate-800"}`}>{pillar.title}</h2></div><span className={`text-xl ${active ? "text-blue-600" : "text-slate-400"}`}>{active ? "⌃" : "⌄"}</span></div><p className={`overflow-hidden text-sm leading-relaxed text-slate-600 transition-all duration-300 ${active ? "mt-2 max-h-32 opacity-100" : "max-h-0 opacity-0"}`}>{pillar.description}</p></button>; })}</div><div className="flex min-h-[380px] min-w-0 w-full items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 shadow-xl lg:col-span-7"><div className="w-full min-w-0"><NetworkGraphic activePillar={activePillar} /></div></div></div></section>

        <section id="workflow" className="mx-auto w-full max-w-[1600px] space-y-24 px-6 py-20 lg:px-16"><div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-20"><div className="lg:col-span-6"><FeatureTerminal /></div><div className="lg:col-span-6"><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">THREAT INTELLIGENCE & ATTRIBUTION</span><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Stay Ahead of Emerging Illicit Typologies</h2><p className="mt-4 leading-relaxed text-slate-600">Prepare for complex cross-wallet obfuscation with continuously updating OSINT attribution and automated VASP detection across Ethereum and Tron.</p><div className="mt-8 flex items-baseline gap-4 border-l-2 border-blue-500 pl-4"><span className="font-mono text-4xl font-black text-blue-600">92%</span><p className="text-sm leading-snug text-slate-500">reduction in manual attribution latency across multi-hop laundering chains.</p></div></div></div><div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-20"><div className="lg:order-1 lg:col-span-6"><span className="text-xs font-semibold uppercase tracking-wider text-blue-600">GOLDEN HOUR INTERCEPTION</span><h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">Intercept Stolen Capital in the Golden Hour</h2><p className="mt-4 leading-relaxed text-slate-600">Proactively halt the progression of illicit funds before scammers execute off-ramps into centralized P2P markets or fiat bank accounts.</p><ul className="mt-8 space-y-4 text-sm leading-relaxed text-slate-600"><li className="flex gap-3"><span className="text-blue-600">*</span>Real-time transit tagging across mule wallets</li><li className="flex gap-3"><span className="text-blue-600">*</span>Automated Section 94 BNSS production summons generation</li><li className="flex gap-3"><span className="text-blue-600">*</span>Preserved cryptographic chain of custody under Section 63 BSA</li></ul></div><div className="lg:order-2 lg:col-span-6"><InterceptionGraphic /></div></div></section>
      </main>

      <footer id="legal" className="border-t border-slate-200 bg-slate-50/60 px-6 py-12 lg:px-16"><div className="mx-auto grid w-full max-w-[1600px] gap-8 sm:grid-cols-3"><div><h2 className="text-sm font-semibold text-slate-900">Admissibility</h2><p className="mt-3 text-sm text-slate-600">Section 63 BSA compliant. Bharatiya Nagarik Suraksha Sanhita (BNSS) ready.</p></div><div><h2 className="text-sm font-semibold text-slate-900">Infrastructure</h2><p className="mt-3 text-sm text-slate-600">100% in-country data residency. Air-gapped deployment capable.</p></div><div><h2 className="text-sm font-semibold text-slate-900">Status</h2><p className="mt-3 flex items-center gap-2 text-sm font-semibold text-red-600"><span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />RESTRICTED TO LAW ENFORCEMENT</p></div></div></footer>

      <SpotlightCommandBar open={isCommandOpen} wallet={wallet} setWallet={setWallet} onTrace={handleTrace} onClose={() => setIsCommandOpen(false)} />
    </div>
  );
}