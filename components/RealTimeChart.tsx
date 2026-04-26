'use client';

import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';

interface RealTimeChartProps {
  data: any[];
  top5Names: string[];
}

export default function RealTimeChart({ data, top5Names }: RealTimeChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 16, left: -8, bottom: 0 }}>
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
          dataKey="time"
          stroke="rgba(148,163,184,0.5)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={{ stroke: "rgba(148,163,184,0.15)" }}
          minTickGap={40}
        />
        <YAxis
          domain={["dataMin - 0.002", "dataMax + 0.002"]}
          stroke="rgba(148,163,184,0.5)"
          tick={{ fontSize: 10, fontFamily: "var(--font-mono)" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => Number(v).toFixed(3)}
          width={45}
        />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <Card className="border-white/10 bg-background/90 px-3 py-2 font-mono text-[11px] shadow-2xl backdrop-blur-xl">
                <div className="mb-1.5 text-muted-foreground">{label} CET</div>
                <div className="space-y-1">
                  {payload.map((p) => (
                    <div key={String(p.dataKey)} className="flex items-center justify-between gap-6">
                      <span className="inline-flex items-center gap-2 text-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color }} />
                        {String(p.dataKey)}
                      </span>
                      <span className="tabular-nums text-foreground">{Number(p.value).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            );
          }} 
          cursor={{ stroke: "rgba(148,163,184,0.2)" }} 
        />

        {top5Names.map((name, i) => (
          <Area
            key={name}
            type="monotone"
            dataKey={name}
            stroke={["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ef4444"][i]}
            strokeWidth={i === 0 ? 2.25 : 1.75}
            fill={["url(#fillMid)", "url(#fillBlue)", "url(#fillBlue)", "url(#fillBlue)", "url(#fillBlue)"][i]}
            strokeDasharray={i === 0 ? "0" : i === 1 ? "4 4" : "2 4"}
            dot={false}
            connectNulls={true}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
