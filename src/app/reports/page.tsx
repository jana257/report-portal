"use client";

import Link from "next/link";
import { usePolling } from "@/app/components/usePolling";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type ShowRow = { eventId: string; eventTitle: string; artist: string; ticketsSold: number };
type LocRow = { venueId: string; venueName: string; city: string; ticketsSold: number };

export default function ReportsDashboard() {
  const shows = usePolling<ShowRow[]>("/api/reporting/tickets-by-show", 3000);
  const locs = usePolling<LocRow[]>("/api/reporting/tickets-by-location", 3000);

  const showRows = shows.data ?? [];
  const locRows = locs.data ?? [];

  const totalTickets =
    showRows.reduce((sum, r) => sum + (r.ticketsSold ?? 0), 0);

  const topShows = showRows.slice(0, 5).map(r => ({
    name: `${r.artist} - ${r.eventTitle}`,
    value: r.ticketsSold,
  }));

  const topLocs = locRows.slice(0, 5).map(r => ({
    name: `${r.venueName} (${r.city})`,
    value: r.ticketsSold,
  }));

  return (
    <main className="container">
      <header className="header">
        <div>
          <h1>Dashboard izveštaja</h1>
          <p className="muted">Osvežava se automatski na 3s.</p>
        </div>
        <nav className="nav">
          <Link className="btn" href="/reports/by-show">Izveštaj po koncertu</Link>
          <Link className="btn" href="/reports/by-location">Izveštaj po lokaciji</Link>
        </nav>
      </header>

      {(shows.error || locs.error) && (
        <div className="alert">Greška: {shows.error || locs.error}</div>
      )}

      <section className="grid">
        <div className="stat">
          <div className="statLabel">Ukupno prodatih karata</div>
          <div className="statValue">{totalTickets}</div>
        </div>
        <div className="stat">
          <div className="statLabel">Koncerata u izveštaju</div>
          <div className="statValue">{showRows.length}</div>
        </div>
        <div className="stat">
          <div className="statLabel">Lokacija u izveštaju</div>
          <div className="statValue">{locRows.length}</div>
        </div>
      </section>

      <section className="grid2">
        <div className="card pad">
          <h2 className="h2">Top 5 koncerata</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topShows}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small">Klikni “Izveštaj po koncertu” za celu tabelu.</p>
        </div>

        <div className="card pad">
          <h2 className="h2">Top 5 lokacija</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topLocs}>
                <XAxis dataKey="name" hide />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="muted small">Klikni “Izveštaj po lokaciji” za celu tabelu.</p>
        </div>
      </section>
    </main>
  );
}