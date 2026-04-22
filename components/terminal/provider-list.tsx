"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  Building2,
  ChevronDown,
  Clock3,
  Crown,
  Gauge,
  Star,
  Trophy,
  Sparkles,
} from "lucide-react"
import { PROVIDERS, type Provider } from "@/lib/terminal-data"

export function ProviderList() {
  const sorted = [...PROVIDERS].sort((a, b) => b.realProfit - a.realProfit)
  const [openId, setOpenId] = useState<string | null>(sorted[0]?.id ?? null)
  const topProfit = sorted[0]?.realProfit ?? 1
  const worstProfit = sorted[sorted.length - 1]?.realProfit ?? 0

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] backdrop-blur-xl">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-white/5 p-5 sm:p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
              Leaderboard
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            Providers ranked by{" "}
            <span className="underline decoration-emerald-400/40 decoration-2 underline-offset-4">
              Real Profit
            </span>
          </h2>
          <p className="text-xs text-muted-foreground">
            Net EUR on a 1,000 CHF conversion · travel expenses, spreads, and fees included.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono">
            <Gauge className="h-3 w-3" /> Sort: Real Profit
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2 py-1 font-mono">
            Base: 1,000 CHF
          </span>
        </div>
      </header>

      <div className="divide-y divide-white/5">
        {sorted.map((p, i) => {
          const isOpen = openId === p.id
          const isBest = i === 0
          const profitScore = (p.realProfit - worstProfit) / (topProfit - worstProfit || 1)
          return (
            <ProviderRow
              key={p.id}
              provider={p}
              rank={i + 1}
              isBest={isBest}
              profitScore={profitScore}
              isOpen={isOpen}
              onToggle={() => setOpenId(isOpen ? null : p.id)}
            />
          )
        })}
      </div>
    </section>
  )
}

function ProviderRow({
  provider,
  rank,
  isBest,
  profitScore,
  isOpen,
  onToggle,
}: {
  provider: Provider
  rank: number
  isBest: boolean
  profitScore: number
  isOpen: boolean
  onToggle: () => void
}) {
  return (
    <div className={isBest ? "relative bg-emerald-400/[0.03]" : ""}>
      {isBest && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent"
        />
      )}

      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.02] sm:px-6"
      >
        {/* Rank */}
        <div
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border font-mono text-sm font-semibold tabular-nums ${
            isBest
              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[0.03] text-muted-foreground"
          }`}
        >
          {isBest ? <Crown className="h-4 w-4" /> : String(rank).padStart(2, "0")}
        </div>

        {/* Name + meta */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-foreground">{provider.name}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Building2 className="h-2.5 w-2.5" /> {provider.type}
            </span>
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {provider.country}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3 w-3" />
              {provider.openingHours}
              <span
                className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                  provider.status === "open" ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span className={provider.status === "open" ? "text-emerald-300" : "text-rose-300"}>
                {provider.status === "open" ? "Open" : "Closed"}
              </span>
            </span>
            <span className="inline-flex items-center gap-1">
              <Star className="h-3 w-3 text-amber-300" />
              {provider.rating.toFixed(1)}
            </span>
            <span>Liquidity · {provider.liquidity}</span>
          </div>
        </div>

        {/* Spread audit */}
        <div className="hidden w-32 shrink-0 md:block">
          <div className="mb-1 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Spread</span>
            <span className="text-foreground">{provider.bankSpread.toFixed(2)}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${
                provider.bankSpread < 0.2
                  ? "bg-emerald-400"
                  : provider.bankSpread < 1
                  ? "bg-blue-400"
                  : provider.bankSpread < 1.5
                  ? "bg-amber-400"
                  : "bg-rose-400"
              }`}
              style={{ width: `${Math.min(100, (provider.bankSpread / 2.2) * 100)}%` }}
            />
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            Fee {provider.fee === 0 ? "—" : `${provider.fee.toFixed(2)} CHF`}
          </div>
        </div>

        {/* Rate */}
        <div className="hidden shrink-0 text-right sm:block">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Rate
          </div>
          <div className="font-mono text-base font-semibold tabular-nums">
            {provider.rate.toFixed(4)}
          </div>
        </div>

        {/* Real profit */}
        <div className="shrink-0 text-right">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Real Profit
          </div>
          <div className="flex items-center justify-end gap-2">
            <div
              className={`font-mono text-xl font-semibold tabular-nums tracking-tight ${
                isBest ? "text-emerald-300" : "text-foreground"
              }`}
            >
              {provider.realProfit.toFixed(2)}
              <span className="ml-1 text-xs font-medium text-muted-foreground">€</span>
            </div>
          </div>
          <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-white/5">
            <div
              className={`h-full rounded-full ${
                isBest ? "bg-gradient-to-r from-emerald-400 to-emerald-300" : "bg-blue-400/60"
              }`}
              style={{ width: `${Math.max(8, profitScore * 100)}%` }}
            />
          </div>
        </div>

        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-md border border-white/10 bg-white/[0.03] text-muted-foreground"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <EliteStrategy provider={provider} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function EliteStrategy({ provider }: { provider: Provider }) {
  return (
    <div className="grid gap-4 border-t border-white/5 bg-black/30 px-5 py-5 sm:grid-cols-[1fr_1fr] sm:px-6">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
            Elite Strategy
          </span>
          <span className="text-xs text-muted-foreground">— {provider.eliteStrategy.title}</span>
        </div>
        <ul className="space-y-2">
          {provider.eliteStrategy.bullets.map((b, i) => (
            <li
              key={i}
              className="flex gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-sm text-foreground/90"
            >
              <span className="mt-1 font-mono text-[10px] text-emerald-300">{String(i + 1).padStart(2, "0")}</span>
              <span className="leading-6 text-pretty">{b}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-white/5 bg-white/[0.02] p-4">
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Spread Audit
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Audit label="Provider spread" value={`${provider.bankSpread.toFixed(2)}%`} />
            <Audit
              label="Fixed fee"
              value={provider.fee === 0 ? "—" : `${provider.fee.toFixed(2)} CHF`}
            />
            <Audit
              label="Net of mid"
              value={`${(((provider.rate / 1.0712) - 1) * 100).toFixed(2)}%`}
              accent={provider.rate >= 1.07 ? "emerald" : "rose"}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-400/15">
            Execute via {provider.name.split(" ")[0]}
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-foreground transition hover:bg-white/5">
            View full audit
          </button>
        </div>
      </div>
    </div>
  )
}

function Audit({
  label,
  value,
  accent,
}: {
  label: string
  value: string
  accent?: "emerald" | "rose"
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-300"
      : accent === "rose"
      ? "text-rose-300"
      : "text-foreground"
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-base font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}
