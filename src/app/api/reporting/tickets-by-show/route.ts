import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const rows = await prisma.eventAgg.findMany({
      select: {
        eventId: true,
        eventTitle: true,
        eventArtist: true,
        ticketsSold: true,
        ticketsCancelled: true,
        purchasesRejected: true,
      },
      orderBy: { ticketsSold: "desc" },
    });

    const mapped = rows.map((r) => ({
      eventId: r.eventId,
      eventTitle: r.eventTitle ?? "",
      artist: r.eventArtist ?? "",
      ticketsSold: r.ticketsSold,
      ticketsCancelled: r.ticketsCancelled,
      purchasesRejected: r.purchasesRejected,
    }));

    return NextResponse.json({ ok: true, rows: mapped });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "Greška pri učitavanju izveštaja" },
      { status: 500 }
    );
  }
}