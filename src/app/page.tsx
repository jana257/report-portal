import Link from "next/link";

export default function Home() {
  return (
    <main className="container">
      <h1>Report Portal</h1>
      <p className="muted">Sistem za izveštavanje o prodatim kartama.</p>

      <div style={{ marginTop: 20 }}>
        <Link className="btn" href="/reports">
          Otvori dashboard
        </Link>
      </div>
    </main>
  );
}