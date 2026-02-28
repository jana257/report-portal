"use client";
import Link from "next/link";
import { usePolling } from "@/app/components/usePolling";

type Row = { venueId: string; venueName: string; city: string; ticketsSold: number };

export default function ByLocationReport() {
  const { data, error } = usePolling<Row[]>("/api/reporting/tickets-by-location", 3000);
  const rows = data ?? [];

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Izveštaj: kupljene karte po lokaciji</h1>
          <p className="muted">Osvežava se automatski na 3s.</p>
        </div>
        <nav className="nav">
          <Link className="btn" href="/reports/by-show">Po koncertu</Link>
        </nav>
      </header>

      {error && <div className="alert">Greška: {error}</div>}

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Lokacija</th>
              <th>Grad</th>
              <th className="right">Kupljeno</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="muted">Nema podataka (još uvek).</td></tr>
            ) : (
              rows.map(r => (
                <tr key={r.venueId}>
                  <td>{r.venueName}</td>
                  <td>{r.city}</td>
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