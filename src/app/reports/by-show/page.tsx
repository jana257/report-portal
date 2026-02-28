"use client";
import Link from "next/link";
import { usePolling } from "@/app/components/usePolling";

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