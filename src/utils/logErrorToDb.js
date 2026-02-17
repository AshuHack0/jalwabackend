import ErrorLog from "../models/ErrorLog.js";

/**
 * Logs an error to the database. Fire-and-forget; never throws.
 * Call from anywhere: catch blocks, global handler, scheduler, etc.
 *
 * @param {Error|unknown} err - The error (or any value)
 * @param {Object} [options]
 * @param {string} [options.source] - Where the error originated (e.g. "winGoScheduler", "auth", "express")
 * @param {Object} [options.context] - Extra data (e.g. { roundId, gameCode })
 * @param {Object} [options.req] - Express request (extracts path, method, user)
 */
export async function logErrorToDb(err, options = {}) {
  try {
    const { source = "unknown", context = null, req = null } = options;
    const message = err?.message ?? String(err);
    const stack = err?.stack ?? null;

    const doc = {
      message,
      stack,
      source,
      context,
    };

    if (req) {
      doc.path = req.path ?? req.url ?? null;
      doc.method = req.method ?? null;
      doc.userId = req.user?._id ?? req.user?.id ?? null;
    }

    await ErrorLog.create(doc);
  } catch (logErr) {
    // Never let logging break the app; fallback to console
    console.error("[logErrorToDb] Failed to persist error:", logErr?.message);
  }
}

/**
 * Fire-and-forget version: schedules DB write without awaiting.
 * Use when you don't want to slow down the error path.
 */
export function logErrorToDbAsync(err, options = {}) {
  logErrorToDb(err, options).catch(() => {});
}
