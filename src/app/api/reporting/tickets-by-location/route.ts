import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.$queryRaw<
      Array<{
        venueId: string;
        venueName: string;
        city: string;
        ticketsSold: number;
      }>
    >`
      SELECT
        v.id AS "venueId",
        v.name AS "venueName",
        v.city AS "city",
        COALESCE(SUM(ri.qty), 0)::int AS "ticketsSold"
      FROM "Venue" v
      JOIN "Show" s ON s."venueId" = v.id
      JOIN "Reservation" r ON r."showId" = s.id
      JOIN "ReservationItem" ri ON ri."reservationId" = r.id
      WHERE r.status = 'ACTIVE'
      GROUP BY v.id, v.name, v.city
      ORDER BY "ticketsSold" DESC;
    `;

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: "Greška pri učitavanju izveštaja" }, { status: 500 });
  }
}