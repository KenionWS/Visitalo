import { sql, eq } from "drizzle-orm";
import { db } from "@/db";
import { jobs } from "@/db/schema";

const MAX_ATTEMPTS = 5;

type JobHandler = (payload: Record<string, unknown>) => Promise<void>;

/**
 * Registro de handlers por tipo de job, poblado por src/lib/job-handlers.ts.
 * Vive separado de los handlers para que módulos de dominio (conversation,
 * distribution, etc.) puedan encolar jobs sin crear un import circular con
 * el archivo que los registra.
 */
const handlers: Record<string, JobHandler> = {};

export function registerJobHandler(type: string, handler: JobHandler): void {
  handlers[type] = handler;
}

export async function enqueueJob(
  type: string,
  payload: Record<string, unknown> = {},
  runAt: Date = new Date()
) {
  const [job] = await db.insert(jobs).values({ type, payload, runAt }).returning();
  return job;
}

/** Backoff exponencial: 30s, 60s, 120s... con tope de 1 hora. */
function backoffSeconds(attempts: number): number {
  return Math.min(30 * 2 ** attempts, 3600);
}

type ClaimedJob = {
  id: string;
  type: string;
  payload: Record<string, unknown> | null;
  attempts: number;
};

/** Reclama hasta `limit` jobs pendientes de forma atómica (evita doble procesamiento entre workers). */
async function claimJobs(limit: number): Promise<ClaimedJob[]> {
  const claimed = await db.execute(sql`
    UPDATE jobs
    SET status = 'processing'
    WHERE id IN (
      SELECT id FROM jobs
      WHERE status = 'pending' AND run_at <= now()
      ORDER BY run_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING id, type, payload, attempts
  `);
  return claimed as unknown as ClaimedJob[];
}

export async function processJobs(limit = 10) {
  const claimed = await claimJobs(limit);
  const results = { processed: 0, done: 0, requeued: 0, failed: 0 };

  for (const job of claimed) {
    results.processed++;
    const handler = handlers[job.type];

    if (!handler) {
      await db
        .update(jobs)
        .set({ status: "failed", lastError: `Sin handler registrado para type="${job.type}"` })
        .where(eq(jobs.id, job.id));
      results.failed++;
      continue;
    }

    try {
      await handler(job.payload ?? {});
      await db.update(jobs).set({ status: "done" }).where(eq(jobs.id, job.id));
      results.done++;
    } catch (err) {
      const attempts = job.attempts + 1;
      const message = err instanceof Error ? err.message : String(err);

      if (attempts >= MAX_ATTEMPTS) {
        await db
          .update(jobs)
          .set({ status: "failed", attempts, lastError: message })
          .where(eq(jobs.id, job.id));
        results.failed++;
      } else {
        await db
          .update(jobs)
          .set({
            status: "pending",
            attempts,
            lastError: message,
            runAt: new Date(Date.now() + backoffSeconds(attempts) * 1000),
          })
          .where(eq(jobs.id, job.id));
        results.requeued++;
      }
    }
  }

  return results;
}
