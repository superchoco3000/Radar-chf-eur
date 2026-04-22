"use client"

import { Activity, Command, Radio, Search, Settings2 } from "lucide-react"

export function TopBar({ status = "live" as "live" | "cache" }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-emerald-400/90 to-emerald-600 text-background">
            <Activity className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-[13px] font-semibold tracking-tight">Frontalier Terminal</span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              CHF / EUR · v4.2
            </span>
          </div>
        </div>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {["Dashboard", "Providers", "History", "Alerts"].map((l, i) => (
            <button
              key={l}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition ${
                i === 0
                  ? "bg-white/5 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {l}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden items-center gap-2 rounded-md border border-white/10 bg-white/[0.02] px-2.5 py-1.5 text-xs text-muted-foreground lg:flex">
            <Search className="h-3.5 w-3.5" />
            <span>Search provider, rate, ISIN…</span>
            <kbd className="ml-2 flex items-center gap-1 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px]">
              <Command className="h-2.5 w-2.5" />K
            </kbd>
          </div>

          <StatusPill status={status} />

          <button className="grid h-8 w-8 place-items-center rounded-md border border-white/10 bg-white/[0.02] text-muted-foreground transition hover:bg-white/5 hover:text-foreground">
            <Settings2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Ticker tape */}
      <div className="relative overflow-hidden border-t border-white/5 bg-black/30">
        <div className="flex whitespace-nowrap animate-ticker py-1.5 font-mono text-[11px] text-muted-foreground">
          {[...tickerItems, ...tickerItems].map((it, i) => (
            <span key={i} className="mx-6 inline-flex items-center gap-2">
              <span className="text-foreground/80">{it.sym}</span>
              <span>{it.px}</span>
              <span className={it.delta >= 0 ? "text-emerald-400" : "text-rose-400"}>
                {it.delta >= 0 ? "+" : ""}
                {it.delta.toFixed(2)}%
              </span>
              <span className="text-white/10">·</span>
            </span>
          ))}
        </div>
      </div>
    </header>
  )
}

function StatusPill({ status }: { status: "live" | "cache" }) {
  const live = status === "live"
  return (
    <div
      className={`relative flex items-center gap-2 overflow-hidden rounded-md border px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] ${
        live
          ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
          : "border-amber-400/20 bg-amber-400/5 text-amber-300"
      }`}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
            live ? "bg-emerald-400/70" : "bg-amber-400/70"
          }`}
        />
        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            live ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />
      </span>
      <Radio className="h-3 w-3" strokeWidth={2.5} />
      <span>{live ? "Tactical Scan · Live" : "Tactical Scan · Cache"}</span>
      {live && (
        <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 animate-scan-sweep bg-gradient-to-r from-transparent via-emerald-300/20 to-transparent" />
      )}
    </div>
  )
}

const tickerItems = [
  { sym: "EUR/CHF", px: "1.0712", delta: 0.12 },
  { sym: "USD/CHF", px: "0.8834", delta: -0.08 },
  { sym: "GBP/CHF", px: "1.1205", delta: 0.21 },
  { sym: "SNB Policy", px: "1.00%", delta: 0 },
  { sym: "CHF Vol (1M)", px: "5.42", delta: 0.04 },
  { sym: "ECB Depo", px: "3.25%", delta: -0.25 },
  { sym: "Gold/CHF", px: "2,104.3", delta: 0.31 },
  { sym: "Brent", px: "82.41", delta: -0.14 },
]
