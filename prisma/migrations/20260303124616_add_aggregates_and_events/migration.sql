-- CreateEnum
CREATE TYPE "TicketEventType" AS ENUM ('ticket_created', 'ticket_updated', 'ticket_cancelled', 'ticket_purchase_rejected');

-- CreateTable
CREATE TABLE "TicketEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "streamId" TEXT NOT NULL,
    "type" "TicketEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowSnapshot" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3),
    "eventId" TEXT,
    "eventTitle" TEXT,
    "eventArtist" TEXT,
    "venueId" TEXT,
    "venueName" TEXT,
    "venueCity" TEXT,
    "venueCountry" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowAgg" (
    "showId" TEXT NOT NULL,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "ticketsCancelled" INTEGER NOT NULL DEFAULT 0,
    "purchasesRejected" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowAgg_pkey" PRIMARY KEY ("showId")
);

-- CreateTable
CREATE TABLE "EventAgg" (
    "eventId" TEXT NOT NULL,
    "eventTitle" TEXT,
    "eventArtist" TEXT,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "ticketsCancelled" INTEGER NOT NULL DEFAULT 0,
    "purchasesRejected" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventAgg_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "VenueAgg" (
    "venueId" TEXT NOT NULL,
    "venueName" TEXT,
    "venueCity" TEXT,
    "ticketsSold" INTEGER NOT NULL DEFAULT 0,
    "ticketsCancelled" INTEGER NOT NULL DEFAULT 0,
    "purchasesRejected" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VenueAgg_pkey" PRIMARY KEY ("venueId")
);

-- CreateTable
CREATE TABLE "StreamCheckpoint" (
    "id" TEXT NOT NULL DEFAULT 'ticket_events',
    "streamName" TEXT NOT NULL,
    "lastStreamId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StreamCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketEvent_eventId_key" ON "TicketEvent"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketEvent_streamId_key" ON "TicketEvent"("streamId");

-- CreateIndex
CREATE INDEX "TicketEvent_type_idx" ON "TicketEvent"("type");

-- CreateIndex
CREATE INDEX "TicketEvent_occurredAt_idx" ON "TicketEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "ShowSnapshot_eventId_idx" ON "ShowSnapshot"("eventId");

-- CreateIndex
CREATE INDEX "ShowSnapshot_venueId_idx" ON "ShowSnapshot"("venueId");

-- CreateIndex
CREATE INDEX "ShowSnapshot_startsAt_idx" ON "ShowSnapshot"("startsAt");

-- CreateIndex
CREATE UNIQUE INDEX "StreamCheckpoint_streamName_key" ON "StreamCheckpoint"("streamName");

-- AddForeignKey
ALTER TABLE "ShowAgg" ADD CONSTRAINT "ShowAgg_showId_fkey" FOREIGN KEY ("showId") REFERENCES "ShowSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
