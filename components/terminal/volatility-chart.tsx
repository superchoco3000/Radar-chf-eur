"use client"

import { useState } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Activity, LineChart as LineChartIcon } from "lucide-react"
import { VOLATILITY_SERIES } from "@/lib/terminal-data"

const RANGES = ["1D", "5D", "1M", "3M", "YTD"] as const
type Range = (typeof RANGES)[number]

export function VolatilityChart() {
  const [range, setRange] = useState<Range>("1D")

  const high = Math.max(...VOLATILITY_SERIES.map((d) => d.mid))
  const low = Math.min(...VOLATILITY_SERIES.map((d) => d.mid))
  const last = VOLATILITY_SERIES[VOLATILITY_SERIES.length - 1]
  const first = VOLATILITY_SERIES[0]
  const change = ((last.mid - first.mid) / first.mid) * 100
  const positive = change >= 0

  return (
    <section className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-5 backdrop-blur-xl sm:p-6">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <LineChartIcon className="h-4 w-4 text-blue-300" />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-blue-300">
              Volatility comparison
            </span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight">
            EUR/CHF effective rate by provider
          </h2>
          <p className="text-xs text-muted-foreground">
            Intraday spread divergence from the interbank mid. Tighter is better.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-[11px] text-muted-foreground">
            <span>
              H <span className="text-foreground">{high.toFixed(4)}</span>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span>
              L <span className="text-foreground">{low.toFixed(4)}</span>
            </span>
            <span className="h-3 w-px bg-white/10" />
            <span className={positive ? "text-emerald-300" : "text-rose-300"}>
              {positive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>

          <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-md px-2.5 py-1 font-mono text-[11px] transition ${
                  r === range
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={VOLATILITY_SERIES} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
            <defs>
              <linearGradient id="fillMid" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(148,163,184,0.08)" vertical={false} />
            <XAxis
              dataKey="t"
              stroke="rgba(148,163,184,0.5)"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
            />
            <YAxis
              domain={["dataMin - 0.002", "dataMax + 0.002"]}
              stroke="rgba(148,163,184,0.5)"
              tick={{ fontSize: 11, fontFamily: "var(--font-mono)" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => Number(v).toFixed(3)}
              width={56}
            />
            <Tooltip content={<TerminalTooltip />} cursor={{ stroke: "rgba(148,163,184,0.2)" }} />

            <Area
              type="monotone"
              dataKey="mid"
              stroke="#10b981"
              strokeWidth={2.25}
              fill="url(#fillMid)"
              dot={false}
              activeDot={{ r: 4, stroke: "#10b981", strokeWidth: 2, fill: "#020617" }}
            />
            <Area
              type="monotone"
              dataKey="wise"
              stroke="#3b82f6"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              fill="url(#fillBlue)"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="ubs"
              stroke="#f59e0b"
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="raiffeisen"
              stroke="#f43f5e"
              strokeWidth={1.5}
              strokeDasharray="2 4"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <footer className="mt-4 flex flex-wrap items-center gap-4 border-t border-white/5 pt-4 text-[11px]">
        <LegendDot color="#10b981" label="Interbank mid" />
        <LegendDot color="#3b82f6" label="Wise" dashed />
        <LegendDot color="#f59e0b" label="UBS" dashed />
        <LegendDot color="#f43f5e" label="Raiffeisen" dashed />
        <span className="ml-auto inline-flex items-center gap-2 font-mono text-muted-foreground">
          <Activity className="h-3 w-3 text-emerald-300" />
          Stream · 2,183 pts · 1s tick
        </span>
      </footer>
    </section>
  )
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 font-mono text-muted-foreground">
      <span
        className="h-0.5 w-6 rounded-full"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)`
            : color,
        }}
      />
      <span className="text-foreground/80">{label}</span>
    </div>
  )
}

type TooltipPayloadItem = {
  dataKey: string
  value: number
  color: string
  name: string
}

function TerminalTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-white/10 bg-background/90 px-3 py-2 font-mono text-[11px] shadow-2xl backdrop-blur-xl">
      <div className="mb-1.5 text-muted-foreground">{label} CET</div>
      <div className="space-y-1">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center justify-between gap-6">
            <span className="inline-flex items-center gap-2 text-foreground/80">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
              {p.dataKey}
            </span>
            <span className="tabular-nums text-foreground">{Number(p.value).toFixed(4)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
