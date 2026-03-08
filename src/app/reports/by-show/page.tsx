"use client";

import Link from "next/link";
import { useMemo } from "react";
import { usePolling } from "@/app/components/usePolling";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";

type Row = {
  eventId: string;
  eventTitle: string | null;
  artist: string | null;
  ticketsSold: number;
};

export default function ByShowReport() {
  const { data, error } = usePolling<Row[]>("/api/reporting/tickets-by-show", 3000);
  const rows = data ?? [];

  const chartData = useMemo(
    () =>
      rows.slice(0, 10).map((r) => ({
        id: r.eventId,
        title: r.eventTitle?.trim() || "Nepoznat koncert",
        artist: r.artist?.trim() || "Nepoznat izvođač",
        fullLabel: `${r.artist?.trim() || "Nepoznat izvođač"} • ${
          r.eventTitle?.trim() || "Nepoznat koncert"
        }`,
        value: r.ticketsSold,
      })),
    [rows]
  );

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Izveštaj: kupljene karte po koncertu</h1>
        </div>

        <nav className="nav">
          <Link className="btn" href="/reports/by-location">
            Po lokaciji
          </Link>
        </nav>
      </header>

      {error && <div className="alert">Greška: {error}</div>}

      <div className="card">
        <div className="card pad" style={{ marginBottom: 14 }}>
          <h2 className="h2">Grafikon (Top 10)</h2>

          <div
            className="chart"
            style={{
              width: "100%",
              padding: "12px 8px 4px 0",
            }}
          >
            {chartData.length === 0 ? (
              <div className="muted" style={{ padding: "24px 8px" }}>
                Nema podataka za grafikon.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 24, left: 8, bottom: 70 }}
                >
                  <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.08)" />
                  <XAxis
                    dataKey="title"
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 12, fill: "#cbd5e1" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.16)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.16)" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 12, fill: "#cbd5e1" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.16)" }}
                    tickLine={{ stroke: "rgba(255,255,255,0.16)" }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 12,
                      color: "#fff",
                    }}
                    formatter={(value) => [value, "Kupljeno"]}
                    labelFormatter={(_, payload) => {
                      const item = payload?.[0]?.payload;
                      return item?.fullLabel ?? "";
                    }}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {chartData.map((item) => (
                      <Cell key={item.id} fill="#60a5fa" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Koncert</th>
                <th>Izvođač</th>
                <th className="right">Kupljeno</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted" style={{ textAlign: "center", padding: "18px" }}>
                    Nema podataka (još uvek).
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.eventId}>
                    <td>{r.eventTitle?.trim() || "Nepoznat koncert"}</td>
                    <td>{r.artist?.trim() || "Nepoznat izvođač"}</td>
                    <td className="right">{r.ticketsSold}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}