-- Cancelling a job used to strand its fault permanently: `jobs.faultId` was
-- UNIQUE and createJob refuses a fault that already has a job, so the cancelled
-- row blocked every future assignment while the fault showed as OPEN.
--
-- A fault may now hold a history of job attempts. "At most one ACTIVE job per
-- fault" moves to createJob, which checks for a non-cancelled job before
-- inserting. Note this is an application-level guarantee, not a database one:
-- a partial unique index (WHERE status <> 'CANCELLED') would be stronger, but
-- Prisma cannot express one in the schema and would report it as drift.

-- DropIndex
DROP INDEX "jobs_faultId_key";

-- CreateIndex
CREATE INDEX "jobs_faultId_idx" ON "jobs"("faultId");
