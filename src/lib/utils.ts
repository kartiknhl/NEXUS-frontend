import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Truncate a long wallet hash for display: 0x1234abcd…9f0e */
export function shortenHash(value: string, lead = 6, tail = 4): string {
  if (!value) return ""
  const v = value.trim()
  if (v.length <= lead + tail + 1) return v
  return `${v.slice(0, lead)}…${v.slice(-tail)}`
}

/** Auto-detect the chain from an address prefix (mirrors the backend router). */
export function detectChain(value: string): "Ethereum" | "Tron" | "Unknown" {
  const v = value.trim()
  if (v.startsWith("0x")) return "Ethereum"
  if (v.startsWith("T")) return "Tron"
  return "Unknown"
}

/** Deterministic case reference from a target hash — no clock needed. */
export function caseReference(target: string): string {
  const clean = (target || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
  const tag = clean.slice(-6).padStart(6, "0")
  return `NEX-2026-${tag}`
}
