import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        eventId: string;
        eventTitle: string;
        artist: string;
        ticketsSold: number;
      }>
    >`
      SELECT
        e.id AS "eventId",
        e.title AS "eventTitle",
        e.artist AS "artist",
        COALESCE(SUM(ri.qty), 0)::int AS "ticketsSold"
      FROM "Event" e
      JOIN "Show" s ON s."eventId" = e.id
      JOIN "Reservation" r ON r."showId" = s.id
      JOIN "ReservationItem" ri ON ri."reservationId" = r.id
      WHERE r.status = 'ACTIVE'
      GROUP BY e.id, e.title, e.artist
      ORDER BY "ticketsSold" DESC;
    `;

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Greška pri učitavanju izveštaja" }, { status: 500 });
  }
}