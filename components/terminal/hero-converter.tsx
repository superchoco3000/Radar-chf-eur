"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  Clock,
  Fuel,
  Shield,
  TrendingUp,
  Zap,
} from "lucide-react"
import { INTERBANK_MID, TRAVEL_EXPENSE_TOTAL, minutesAgo } from "@/lib/terminal-data"

type Direction = "CHF_TO_EUR" | "EUR_TO_CHF"

export function HeroConverter({ lastUpdated }: { lastUpdated: Date }) {
  const [amount, setAmount] = useState<number>(1000)
  const [direction, setDirection] = useState<Direction>("CHF_TO_EUR")
  const rate = direction === "CHF_TO_EUR" ? INTERBANK_MID : 1 / INTERBANK_MID
  const converted = amount * rate

  const dailyChange = 0.34 // percent
  const weeklyChange = -0.18

  const netEuro = useMemo(() => {
    // best-case net EUR after fintech spread (0.08%) minus travel expense if physical
    const fintechSpread = 0.0008
    const gross = amount * INTERBANK_MID * (1 - fintechSpread)
    return gross - TRAVEL_EXPENSE_TOTAL * INTERBANK_MID
  }, [amount])

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01]">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[120%] -translate-x-1/2 rounded-full opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, rgba(16,185,129,0.25), rgba(59,130,246,0.08) 50%, transparent 70%)",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-grid bg-grid-fade opacity-50" aria-hidden />

      <div className="relative grid gap-8 p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
        {/* LEFT — converter */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-emerald-300">
              Hero Pair
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Frontalier · GE → Annemasse
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              The CHF/EUR trading terminal{" "}
              <span className="text-muted-foreground">for border workers.</span>
            </h1>
            <p className="max-w-lg text-pretty text-sm leading-6 text-muted-foreground">
              Real-time spread audits across Swiss and French providers. Optimized for payroll days,
              weekend markups, and cross-border payments.
            </p>
          </div>

          {/* Converter card */}
          <div className="rounded-xl border border-white/10 bg-background/60 p-4 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Interactive Converter
              </span>
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Updated {minutesAgo(lastUpdated)}
              </span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <AmountField
                label={direction === "CHF_TO_EUR" ? "You send" : "You receive"}
                currency="CHF"
                flag="CH"
                value={amount}
                onChange={setAmount}
                editable={direction === "CHF_TO_EUR"}
              />

              <button
                onClick={() =>
                  setDirection((d) => (d === "CHF_TO_EUR" ? "EUR_TO_CHF" : "CHF_TO_EUR"))
                }
                aria-label="Swap direction"
                className="group grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition hover:border-emerald-400/40 hover:bg-emerald-400/10 hover:text-emerald-300"
              >
                <ArrowLeftRight className="h-4 w-4 transition group-hover:scale-110" />
              </button>

              <AmountField
                label={direction === "CHF_TO_EUR" ? "You receive" : "You send"}
                currency="EUR"
                flag="EU"
                value={converted}
                onChange={(v) =>
                  setAmount(direction === "CHF_TO_EUR" ? v / rate : v * INTERBANK_MID)
                }
                editable={direction === "EUR_TO_CHF"}
              />
            </div>

            {/* Giant rate */}
            <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-white/5 pt-5">
              <div>
                <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  Interbank mid · 1 CHF =
                </div>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={direction + rate.toFixed(5)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.25 }}
                    className="font-mono text-5xl font-semibold tracking-tight tabular-nums sm:text-6xl"
                  >
                    {(direction === "CHF_TO_EUR" ? INTERBANK_MID : 1 / INTERBANK_MID).toFixed(4)}
                    <span className="ml-2 text-xl font-medium text-muted-foreground">
                      {direction === "CHF_TO_EUR" ? "EUR" : "CHF"}
                    </span>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <Delta label="24h" value={dailyChange} />
                <Delta label="7d" value={weeklyChange} />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="group inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-background transition hover:bg-emerald-300">
                <Zap className="h-4 w-4" strokeWidth={2.5} />
                Execute optimal route
                <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/5">
                <Bell className="h-4 w-4" />
                Set rate alert
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT — KPI stack */}
        <div className="grid grid-cols-2 gap-3 self-start lg:grid-cols-2">
          <KpiTile
            icon={<TrendingUp className="h-4 w-4" />}
            label="Best rate today"
            value="1.0707"
            sub="Wise · 09:47 CET"
            accent="emerald"
          />
          <KpiTile
            icon={<Shield className="h-4 w-4" />}
            label="Worst spread"
            value="2.00%"
            sub="Cornèr Change (FR)"
            accent="rose"
          />
          <KpiTile
            icon={<Fuel className="h-4 w-4" />}
            label="Travel cost"
            value={`${TRAVEL_EXPENSE_TOTAL.toFixed(2)} CHF`}
            sub="Round-trip GE ↔ Annemasse"
            accent="blue"
          />
          <KpiTile
            icon={<Clock className="h-4 w-4" />}
            label="Net for 1000 CHF"
            value={`${netEuro.toFixed(2)} €`}
            sub="After spread & transit"
            accent="emerald"
          />
        </div>
      </div>
    </section>
  )
}

function AmountField({
  label,
  currency,
  flag,
  value,
  onChange,
  editable,
}: {
  label: string
  currency: string
  flag: string
  value: number
  onChange: (v: number) => void
  editable: boolean
}) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-foreground">
          <span className="grid h-3.5 w-3.5 place-items-center rounded-sm bg-white/10 font-semibold">
            {flag}
          </span>
          {currency}
        </span>
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : ""}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        disabled={!editable}
        className="w-full bg-transparent font-mono text-2xl font-semibold tabular-nums tracking-tight text-foreground outline-none disabled:cursor-default disabled:text-foreground/90 sm:text-3xl"
      />
    </div>
  )
}

function Delta({ label, value }: { label: string; value: number }) {
  const positive = value >= 0
  return (
    <div
      className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 font-mono text-[11px] ${
        positive
          ? "border-emerald-400/20 bg-emerald-400/5 text-emerald-300"
          : "border-rose-400/20 bg-rose-400/5 text-rose-300"
      }`}
    >
      <span className="uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="font-semibold">
        {positive ? "+" : ""}
        {value.toFixed(2)}%
      </span>
    </div>
  )
}

function KpiTile({
  icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  accent: "emerald" | "blue" | "rose"
}) {
  const accentMap = {
    emerald: "text-emerald-300 border-emerald-400/20 bg-emerald-400/5",
    blue: "text-blue-300 border-blue-400/20 bg-blue-400/5",
    rose: "text-rose-300 border-rose-400/20 bg-rose-400/5",
  }
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="rounded-xl border border-white/10 bg-background/60 p-4 backdrop-blur-xl"
    >
      <div className="flex items-center gap-2">
        <span className={`grid h-7 w-7 place-items-center rounded-md border ${accentMap[accent]}`}>
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="mt-3 font-mono text-2xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </motion.div>
  )
}
