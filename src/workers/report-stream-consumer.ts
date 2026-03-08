import Redis from "ioredis";
import { prisma } from "@/lib/prisma";

const redis = new Redis(process.env.REDIS_URL!);

const STREAM = process.env.REDIS_STREAM ?? "stream:ticket_events";
const GROUP = process.env.REDIS_GROUP ?? "app_report";
const CONSUMER = process.env.REDIS_CONSUMER ?? "c1";

type RawStreamFields = Record<string, string>;

function fieldsToObj(fields: string[]): RawStreamFields {
  const obj: Record<string, string> = {};
  for (let i = 0; i < fields.length; i += 2) {
    obj[fields[i]] = fields[i + 1];
  }
  return obj;
}

async function ensureGroup() {
  try {
    await redis.xgroup("CREATE", STREAM, GROUP, "0", "MKSTREAM");
  } catch (e: any) {
    const m = String(e?.message ?? e);
    if (!m.includes("BUSYGROUP")) throw e;
  }
}

function mapType(t: string) {
  switch (t) {
    case "ticket.created":
      return "ticket_created";
    case "ticket.updated":
      return "ticket_updated";
    case "ticket.cancelled":
      return "ticket_cancelled";
    case "ticket.purchase_rejected":
      return "ticket_purchase_rejected";
    default:
      return null;
  }
}

function safeJsonParse(v: string | undefined) {
  if (!v) return {};
  try {
    return JSON.parse(v);
  } catch {
    return {};
  }
}

function toSafeDate(v: unknown): Date | undefined {
  if (!v) return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function extractCore(
  type: string,
  payload: any
): {
  showId?: string;
  eventId?: string;
  venueId?: string;
  deltaQty: number;
  hasMeaningfulDelta: boolean;
  meta: {
    eventTitle?: string;
    eventArtist?: string;
    venueName?: string;
    venueCity?: string;
    venueCountry?: string;
    startsAt?: Date;
  };
} {
  const showId =
    payload.showId ??
    payload.show?.id ??
    payload.reservation?.showId;

  const eventId =
    payload.eventId ??
    payload.event?.id ??
    payload.show?.eventId;

  const venueId =
    payload.venueId ??
    payload.venue?.id ??
    payload.show?.venueId;

  const meta = {
    eventTitle: payload.eventTitle ?? payload.event?.title,
    eventArtist: payload.eventArtist ?? payload.event?.artist,
    venueName: payload.venueName ?? payload.venue?.name,
    venueCity: payload.venueCity ?? payload.venue?.city,
    venueCountry: payload.venueCountry ?? payload.venue?.country,
    startsAt:
      toSafeDate(payload.startsAt) ??
      toSafeDate(payload.show?.startsAt),
  };

  let deltaQty = 0;

  if (payload.ticketsDelta != null) deltaQty = toNumber(payload.ticketsDelta);
  else if (payload.deltaQty != null) deltaQty = toNumber(payload.deltaQty);
  else if (payload.qty != null) deltaQty = toNumber(payload.qty);
  else if (payload.totalQty != null) deltaQty = toNumber(payload.totalQty);

  if (type === "ticket.cancelled" && deltaQty > 0) {
    deltaQty = -deltaQty;
  }

  if (type === "ticket.purchase_rejected") {
    deltaQty = 0;
  }

  return {
    showId,
    eventId,
    venueId,
    deltaQty,
    hasMeaningfulDelta: deltaQty !== 0,
    meta,
  };
}

async function applyEvent(streamId: string, data: RawStreamFields) {
  const rawEventId = data.eventId;
  const rawType = data.type;
  const occurredAtStr = data.occurredAt;
  const payloadStr = data.payload;

  if (!rawEventId || !rawType || !occurredAtStr) {
    console.warn("Invalid stream entry, missing fields:", { streamId, data });
    return;
  }

  const typeEnum = mapType(rawType);
  if (!typeEnum) {
    console.warn("Unknown event type:", rawType, "streamId:", streamId);
    return;
  }

  const occurredAt = new Date(occurredAtStr);
  if (Number.isNaN(occurredAt.getTime())) {
    console.warn("Invalid occurredAt:", occurredAtStr, "streamId:", streamId);
    return;
  }

  const payload = safeJsonParse(payloadStr);
  const core = extractCore(rawType, payload);
  const cancelledQty =
    rawType === "ticket.cancelled" ? Math.abs(core.deltaQty) : 0;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.ticketEvent.create({
        data: {
          eventId: rawEventId,
          streamId,
          type: typeEnum,
          occurredAt,
          payload,
        },
      });

      if (core.showId) {
        await tx.showSnapshot.upsert({
          where: { id: core.showId },
          update: {
            startsAt: core.meta.startsAt ?? undefined,
            eventId: core.eventId ?? undefined,
            eventTitle: core.meta.eventTitle ?? undefined,
            eventArtist: core.meta.eventArtist ?? undefined,
            venueId: core.venueId ?? undefined,
            venueName: core.meta.venueName ?? undefined,
            venueCity: core.meta.venueCity ?? undefined,
            venueCountry: core.meta.venueCountry ?? undefined,
          },
          create: {
            id: core.showId,
            startsAt: core.meta.startsAt ?? null,
            eventId: core.eventId ?? null,
            eventTitle: core.meta.eventTitle ?? null,
            eventArtist: core.meta.eventArtist ?? null,
            venueId: core.venueId ?? null,
            venueName: core.meta.venueName ?? null,
            venueCity: core.meta.venueCity ?? null,
            venueCountry: core.meta.venueCountry ?? null,
          },
        });

        if (core.hasMeaningfulDelta) {
          await tx.showAgg.upsert({
            where: { showId: core.showId },
            update: {
              ticketsSold: { increment: core.deltaQty },
              ...(rawType === "ticket.cancelled"
                ? { ticketsCancelled: { increment: cancelledQty } }
                : {}),
            },
            create: {
              showId: core.showId,
              ticketsSold: core.deltaQty,
              ticketsCancelled:
                rawType === "ticket.cancelled" ? cancelledQty : 0,
            },
          });
        } else if (rawType === "ticket.purchase_rejected") {
          await tx.showAgg.upsert({
            where: { showId: core.showId },
            update: {
              purchasesRejected: { increment: 1 },
            },
            create: {
              showId: core.showId,
              purchasesRejected: 1,
            },
          });
        }
      }

      if (core.eventId) {
        if (core.hasMeaningfulDelta) {
          await tx.eventAgg.upsert({
            where: { eventId: core.eventId },
            update: {
              ticketsSold: { increment: core.deltaQty },
              eventTitle: core.meta.eventTitle ?? undefined,
              eventArtist: core.meta.eventArtist ?? undefined,
              ...(rawType === "ticket.cancelled"
                ? { ticketsCancelled: { increment: cancelledQty } }
                : {}),
            },
            create: {
              eventId: core.eventId,
              eventTitle: core.meta.eventTitle ?? null,
              eventArtist: core.meta.eventArtist ?? null,
              ticketsSold: core.deltaQty,
              ticketsCancelled:
                rawType === "ticket.cancelled" ? cancelledQty : 0,
            },
          });
        } else if (rawType === "ticket.purchase_rejected") {
          await tx.eventAgg.upsert({
            where: { eventId: core.eventId },
            update: {
              purchasesRejected: { increment: 1 },
              eventTitle: core.meta.eventTitle ?? undefined,
              eventArtist: core.meta.eventArtist ?? undefined,
            },
            create: {
              eventId: core.eventId,
              eventTitle: core.meta.eventTitle ?? null,
              eventArtist: core.meta.eventArtist ?? null,
              purchasesRejected: 1,
            },
          });
        }
      }

      if (core.venueId) {
        if (core.hasMeaningfulDelta) {
          await tx.venueAgg.upsert({
            where: { venueId: core.venueId },
            update: {
              ticketsSold: { increment: core.deltaQty },
              venueName: core.meta.venueName ?? undefined,
              venueCity: core.meta.venueCity ?? undefined,
              ...(rawType === "ticket.cancelled"
                ? { ticketsCancelled: { increment: cancelledQty } }
                : {}),
            },
            create: {
              venueId: core.venueId,
              venueName: core.meta.venueName ?? null,
              venueCity: core.meta.venueCity ?? null,
              ticketsSold: core.deltaQty,
              ticketsCancelled:
                rawType === "ticket.cancelled" ? cancelledQty : 0,
            },
          });
        } else if (rawType === "ticket.purchase_rejected") {
          await tx.venueAgg.upsert({
            where: { venueId: core.venueId },
            update: {
              purchasesRejected: { increment: 1 },
              venueName: core.meta.venueName ?? undefined,
              venueCity: core.meta.venueCity ?? undefined,
            },
            create: {
              venueId: core.venueId,
              venueName: core.meta.venueName ?? null,
              venueCity: core.meta.venueCity ?? null,
              purchasesRejected: 1,
            },
          });
        }
      }
    });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return;
    }
    throw e;
  }
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
          await applyEvent(msgId, fieldsToObj(fields));
          await redis.xack(STREAM, GROUP, msgId);
        } catch (e) {
          console.error("Greška pri obradi poruke:", msgId, e);
        }
      }
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});