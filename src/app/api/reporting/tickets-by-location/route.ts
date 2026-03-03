import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.venueAgg.findMany({
      select: {
        venueId: true,
        venueName: true,
        venueCity: true,
        ticketsSold: true,
        ticketsCancelled: true,
        purchasesRejected: true,
      },
      orderBy: {
        ticketsSold: "desc",
      },
    });

    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Greška pri učitavanju izveštaja" },
      { status: 500 }
    );
  }
}