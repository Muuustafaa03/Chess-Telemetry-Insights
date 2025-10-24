"use client";

import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, Legend,
  LineChart, Line, BarChart, Bar, ComposedChart
} from "recharts";

type DailyData = { date: string; games: number; wins: number; winRate: number };
type TimeClassData = { timeClass: string; games: number; winRate: number };

export default function Stats({
  kpis,
  daily,
  byTimeClass,
}: {
  kpis: { total7d: number; wins7d: number; winRate7d: number; lastIngested?: string | null };
  daily: DailyData[];
  byTimeClass: TimeClassData[];
}) {
  return (
    <div className="p-6 space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KpiCard label="Games (7d)" value={kpis.total7d.toString()} />
        <KpiCard label="Wins (7d)" value={kpis.wins7d.toString()} />
        <KpiCard label="Win Rate (7d)" value={`${(kpis.winRate7d * 100).toFixed(2)}%`} />
        <KpiCard label="Last Ingested" value={kpis.lastIngested ? new Date(kpis.lastIngested).toLocaleString() : "—"} />
      </div>

      {/* Games per day (last 30d) */}
      <div className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold mb-2">Games per day (last 30d)</h2>
        <div className="w-full h-72">
          <ResponsiveContainer>
            <LineChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #999",
                    borderRadius: "6px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
                itemStyle={{
                    color: "#000000",
                    fontWeight: 600,
                }}
                labelStyle={{
                    color: "#000000",
                    fontWeight: 700,
                }}
                formatter={(value: any, name: string) => {
                  if (name === "winRate") return `${(value * 100).toFixed(2)}%`;
                  return value;
                }}
                />
              <Legend />
              <Line type="monotone" dataKey="games" name="Games" dot={false} />
              <Line type="monotone" dataKey="wins" name="Wins" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Win rate by time control */}
      <div className="rounded-2xl border p-4">
        <h2 className="text-lg font-semibold mb-2">Win rate by time control (last 60d)</h2>
        <div className="w-full h-72">
          <ResponsiveContainer>
            <ComposedChart data={byTimeClass}>
              <CartesianGrid strokeDasharray="3 3" />
            <XAxis
            dataKey="timeClass"
            tick={{
                fill: "#000000",
                fontSize: 13,
                fontWeight: 700,
            }}
            axisLine={{ stroke: "#555" }}
            tickLine={{ stroke: "#555" }}
            />
              {/* Games on left axis; WinRate on right axis */}
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
              <Tooltip
                contentStyle={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #999",
                    borderRadius: "6px",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
                }}
                itemStyle={{ color: "#000000", fontWeight: 600 }}
                labelStyle={{ color: "#000000", fontWeight: 700 }}
                formatter={(value: any, name: string) => {
                  if (name === "Win Rate") return `${(value * 100).toFixed(2)}%`;
                  return value;
                }}
                />
              <Legend />
              {/* Turquoise bars */}
              <Bar yAxisId="left" dataKey="games" name="Games" fill="#14b8a6" />
              <Line yAxisId="right" type="monotone" dataKey="winRate" name="Win Rate" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Win rate displayed as percentage (hover for exact values).
        </p>
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}