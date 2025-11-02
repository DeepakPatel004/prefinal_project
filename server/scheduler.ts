import { db } from "./db";
import { grievances } from "@shared/schema";
import { lt, and, or, eq } from "drizzle-orm";
import { storage } from "./storage";
import { recordVerifiedResolution } from './blockchainService';

const DEFAULT_INTERVAL_MS = process.env.SCHEDULER_INTERVAL_MS ? parseInt(process.env.SCHEDULER_INTERVAL_MS, 10) : (process.env.NODE_ENV === 'production' ? 24 * 60 * 60 * 1000 : 60 * 1000);

let handle: NodeJS.Timeout | null = null;

async function runChecksOnce() {
  try {
    const now = new Date();

    // 1) Pending grievances past acceptBy => mark overdue and escalate
    const pendingToAccept = await db.select().from(grievances).where(and(eq(grievances.status, 'pending'), lt(grievances.acceptBy, now)));
    for (const g of pendingToAccept) {
      console.log(`Scheduler: marking grievance ${g.id} as overdue (acceptBy passed)`);
      await storage.updateGrievanceStatus(g.id, 'overdue');
      try {
        await storage.escalateGrievance(g.id, 'Auto-escalated: officer did not accept within acceptBy deadline');
      } catch (err) {
        console.error('Error auto-escalating grievance', g.id, err);
      }
    }

    // 2) Accepted/in_progress grievances past dueDate => mark overdue and escalate
    const acceptedPastDue = await db.select().from(grievances).where(and(lt(grievances.dueDate, now), or(eq(grievances.status, 'in_progress'), eq(grievances.status, 'pending'))));
    for (const g of acceptedPastDue) {
      console.log(`Scheduler: marking grievance ${g.id} as overdue (dueDate passed)`);
      await storage.updateGrievanceStatus(g.id, 'overdue');
      try {
        await storage.escalateGrievance(g.id, 'Auto-escalated: due date passed without resolution');
      } catch (err) {
        console.error('Error auto-escalating grievance', g.id, err);
      }
    }

    // 3) Pending verification past verificationDeadline => finalize as resolved
    const pendingVerifications = await db.select().from(grievances).where(and(eq(grievances.status, 'pending_verification'), lt(grievances.verificationDeadline, now)));
    for (const g of pendingVerifications) {
      console.log(`Scheduler: finalizing grievance ${g.id} as resolved (verificationDeadline passed)`);
      try {
  // Call blockchain first and store the tx hash on success
  const txHash = await recordVerifiedResolution(g.id, g.title || '', now);
  // Normalize final status to 'verified'
  await storage.updateGrievanceStatus(g.id, 'verified', { resolvedAt: g.resolvedAt || new Date(), blockchainTxHash: txHash });
  console.log(`Scheduler: recorded grievance ${g.id} on-chain. TxHash: ${txHash}`);
      } catch (err) {
        console.error(`Scheduler: failed to record grievance ${g.id} on-chain, will retry next run:`, err);
        // do not update the DB so that the scheduler can retry later
      }
    }

  } catch (err) {
    console.error('Scheduler run failed:', err);
  }
}

export function startScheduler() {
  if (handle) return;
  console.log(`Starting scheduler with interval ${DEFAULT_INTERVAL_MS}ms`);
  handle = setInterval(() => {
    runChecksOnce().catch(e => console.error('Scheduler runChecksOnce error', e));
  }, DEFAULT_INTERVAL_MS);
  // also run once immediately
  runChecksOnce().catch(e => console.error('Scheduler initial run failed', e));
}

export function stopScheduler() {
  if (!handle) return;
  clearInterval(handle);
  handle = null;
}
