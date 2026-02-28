"use client";
import Link from "next/link";
import { usePolling } from "@/app/components/usePolling";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Row = { eventId: string; eventTitle: string; artist: string; ticketsSold: number };

export default function ByShowReport() {
    const { data, error } = usePolling<Row[]>("/api/reporting/tickets-by-show", 3000);
    const rows = data ?? [];

    return (
        <main className="container">
            <header className="header">
                <div>
                    <h1>Izveštaj: kupljene karte po koncertu</h1>
                    <p className="muted">Osvežava se automatski na 3s.</p>
                </div>
                <nav className="nav">
                    <Link className="btn" href="/reports/by-location">Po lokaciji</Link>
                </nav>
            </header>

            {error && <div className="alert">Greška: {error}</div>}

            <div className="card">
                <div className="card pad" style={{ marginBottom: 14 }}>
                    <h2 className="h2">Grafikon (Top 10)</h2>
                    <div className="chart">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={(rows ?? []).slice(0, 10).map(r => ({ name: `${r.artist} - ${r.eventTitle}`, value: r.ticketsSold }))}>
                                <XAxis dataKey="name" hide />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="value" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Koncert</th>
                            <th>Artist</th>
                            <th className="right">Kupljeno</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr><td colSpan={3} className="muted">Nema podataka (još uvek).</td></tr>
                        ) : (
                            rows.map(r => (
                                <tr key={r.eventId}>
                                    <td>{r.eventTitle}</td>
                                    <td>{r.artist}</td>
                                    <td className="right">{r.ticketsSold}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    );
}