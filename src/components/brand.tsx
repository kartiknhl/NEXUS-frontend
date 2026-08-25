import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * NEXUS seal — an official emblem: a struck-coin ring of ticks (echoing a
 * state seal) enclosing a minimal three-node trace (suspect → mule → terminal).
 * Monochrome gold so it reads as a stamp, not an app icon.
 */
export function NexusSeal({ className }: { className?: string }) {
  const ticks = Array.from({ length: 36 });
  return (
    <svg viewBox="0 0 48 48" className={cn("text-seal", className)} aria-hidden>
      <circle cx="24" cy="24" r="22.25" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <circle cx="24" cy="24" r="14.5" fill="none" stroke="currentColor" strokeWidth="0.75" opacity="0.5" />
      <g stroke="currentColor" strokeWidth="1" opacity="0.65">
        {ticks.map((_, i) => {
          const a = (i / ticks.length) * Math.PI * 2;
          const r1 = 17.5;
          const r2 = i % 3 === 0 ? 20 : 19;
          return (
            <line
              key={i}
              x1={24 + Math.cos(a) * r1}
              y1={24 + Math.sin(a) * r1}
              x2={24 + Math.cos(a) * r2}
              y2={24 + Math.sin(a) * r2}
            />
          );
        })}
      </g>
      {/* central trace glyph */}
      <line x1="24" y1="17" x2="24" y2="31" stroke="currentColor" strokeWidth="1.1" />
      <circle cx="24" cy="16.5" r="2.2" fill="currentColor" />
      <circle cx="24" cy="24" r="1.9" fill="none" stroke="currentColor" strokeWidth="1.1" />
      <rect x="21.8" y="29" width="4.4" height="4.4" fill="currentColor" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <NexusSeal className="h-8 w-8" />
      <span className="font-display text-[19px] font-extrabold leading-none tracking-[0.28em] text-paper">
        NEXUS
      </span>
    </span>
  );
}

type StripItem = { label: string; value?: string };

/**
 * The classification banner that runs under the nav on every page — the device
 * that frames the whole product as an on-the-record forensic instrument.
 */
export function ClassificationStrip({
  items,
  right,
  className,
}: {
  items: StripItem[];
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full border-b border-line bg-ink-850/90 backdrop-blur-sm",
        className
      )}
    >
      <div className="mx-auto flex h-8 max-w-7xl items-center gap-4 overflow-hidden px-6 lg:px-10">
        <span className="h-2 w-2 shrink-0 bg-seal" aria-hidden />
        <div className="flex min-w-0 items-center gap-4 font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint">
          {items.map((item, i) => (
            <span key={i} className="flex shrink-0 items-center gap-4">
              {i > 0 && <span className="text-line-strong">{"//"}</span>}
              <span className="whitespace-nowrap">
                {item.label}
                {item.value ? (
                  <span className="ml-1.5 text-muted">{item.value}</span>
                ) : null}
              </span>
            </span>
          ))}
        </div>
        {right ? (
          <div className="ml-auto hidden shrink-0 font-mono text-[10.5px] uppercase tracking-[0.2em] text-faint sm:block">
            {right}
          </div>
        ) : null}
      </div>
    </div>
  );
}

const NAV_LINKS = [
  { key: "home", label: "Home", href: "/" },
  { key: "capabilities", label: "Capabilities", href: "/#capabilities" },
  { key: "trace", label: "Trace Console", href: "/trace" },
] as const;

/**
 * Fixed page header: nav bar + classification strip. Both pages pad content by
 * pt-24 (nav 4rem + strip 2rem) to sit clear of it.
 */
export function SiteNav({
  active,
  stripItems,
  stripRight,
}: {
  active?: "home" | "capabilities" | "trace";
  stripItems: StripItem[];
  stripRight?: React.ReactNode;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <nav className="border-b border-line bg-ink-900/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Link href="/" aria-label="NEXUS home" className="outline-none">
            <Wordmark />
          </Link>

          <div className="hidden items-center gap-9 md:flex">
            {NAV_LINKS.map((link) => {
              const isActive = active === link.key;
              return (
                <Link
                  key={link.key}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative font-mono text-[11px] uppercase tracking-[0.18em] transition-colors",
                    isActive
                      ? "text-paper"
                      : "text-faint hover:text-paper"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <span className="absolute -bottom-[7px] left-0 h-px w-full bg-seal" />
                  )}
                </Link>
              );
            })}
          </div>

          <Link
            href="/trace"
            className="border border-line px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-paper transition-colors hover:border-seal hover:text-seal"
          >
            IO Login
          </Link>
        </div>
      </nav>
      <ClassificationStrip items={stripItems} right={stripRight} />
    </header>
  );
}

