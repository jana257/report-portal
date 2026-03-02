import Redis from "ioredis";
import { prisma } from "@/lib/prisma";

const redis = new Redis(process.env.REDIS_URL!);

const STREAM = process.env.REDIS_STREAM ?? "ticket_events";
const GROUP = process.env.REDIS_GROUP ?? "app_report";
const CONSUMER = process.env.REDIS_CONSUMER ?? "c1";

async function ensureGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
  } catch (e: any) {
    const m = String(e?.message ?? e);
    if (!m.includes("BUSYGROUP")) throw e;
  }
}

function fieldsToObj(fields: string[]) {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) obj[fields[i]] = fields[i + 1];
  return obj;
}

async function applyEvent(data: Record<string, string>) {
  const eventId = data.eventId;
  const type = data.type;
  const occurredAt = new Date(data.occurredAt);

  const already = await prisma.processedEvent.findUnique({ where: { eventId } });
  if (already) return;

  const showId = data.showId;
  const venueId = data.venueId;
  const venueName = data.venueName ?? "";
  const city = data.city ?? "";
  const ticketsDelta = Number(data.ticketsDelta ?? "0");

  await prisma.$transaction(async (tx) => {
    await tx.processedEvent.create({ data: { eventId, type, occurredAt } });

    if (!ticketsDelta || ticketsDelta === 0) return;

    await tx.ticketsByShow.upsert({
      where: { showId },
      update: { ticketsSold: { increment: ticketsDelta } },
      create: { showId, ticketsSold: ticketsDelta },
    });

    await tx.ticketsByLocation.upsert({
      where: { venueId },
      update: { ticketsSold: { increment: ticketsDelta }, venueName, city },
      create: { venueId, venueName, city, ticketsSold: ticketsDelta },
    });
  });
}

async function main() {
  await ensureGroup();

  while (true) {
    const res = await redis.xreadgroup(
      "GROUP",
      GROUP,
      CONSUMER,
      "COUNT",
      "20",
      "BLOCK",
      "5000",
      "STREAMS",
      STREAM,
      ">"
    );

    if (!res) continue;

    for (const [, entries] of res as any[]) {
      for (const [msgId, fields] of entries) {
        try {
          await applyEvent(fieldsToObj(fields));
          await redis.xack(STREAM, GROUP, msgId);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});