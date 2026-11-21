-- Somewhere to record where a PERSONAL fault is, when it is not at a
-- registered room. Org and QR reports identify the place by locationId; a
-- homeowner has no registered room, so they give an address instead.

-- AlterTable
ALTER TABLE "fault_reports" ADD COLUMN     "address" TEXT;

