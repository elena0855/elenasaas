"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DailySale {
  date: string;
  amount: number;
}

interface DashboardChartsProps {
  data: DailySale[];
  currency?: string;
}

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const formatted = (() => {
      try {
        return new Intl.NumberFormat("fr-BJ", {
          style: "currency",
          currency: "XOF",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(payload[0].value);
      } catch {
        return `${payload[0].value.toFixed(0)} FCFA`;
      }
    })();
    return (
      <div className="bg-slate-950/95 border border-cyan-800/40 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs">
        <p className="text-slate-400 font-medium mb-1">{payload[0].payload.date}</p>
        <p className="text-cyan-400 font-bold font-mono text-sm">{formatted}</p>
      </div>
    );
  }
  return null;
};

export default function DashboardCharts({ data, currency = "XOF" }: DashboardChartsProps) {
  const hasData = data.some((d) => d.amount > 0);

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.35} />
              <stop offset="60%" stopColor="#10B981" stopOpacity={0.08} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="line-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06B6D4" />
              <stop offset="100%" stopColor="#10B981" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#1e293b"
            opacity={0.5}
            vertical={false}
          />
          <XAxis
            dataKey="date"
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            dy={10}
            tick={{ fill: "#64748b" }}
          />
          <YAxis
            stroke="#475569"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v} F`}
            dx={-5}
            tick={{ fill: "#64748b" }}
          />
          <Tooltip
            content={<CustomTooltip currency={currency} />}
            cursor={{
              stroke: "rgba(6,182,212,0.2)",
              strokeWidth: 1,
              strokeDasharray: "4 2",
            }}
          />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="url(#line-gradient)"
            strokeWidth={2.5}
            fill="url(#area-gradient)"
            dot={false}
            activeDot={{
              r: 5,
              fill: "#06B6D4",
              stroke: "#0a0f1e",
              strokeWidth: 2,
              filter: "url(#glow)",
            }}
            animationDuration={1200}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>

      {!hasData && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 pointer-events-none">
          <p className="text-xs">Aucune vente sur les 7 derniers jours</p>
        </div>
      )}
    </div>
  );
}
