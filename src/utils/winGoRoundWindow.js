/**
 * Compute the deterministic round window for a WinGo game duration.
 * Returns aligned start/end times and period string (YYYYMMDD + gameCode + daily sequence, UTC boundaries).
 */
export function getRoundWindow(durationSeconds, gameCode, forTime = Date.now()) {
  const date = new Date(forTime);

  const dateStr =
    date.getUTCFullYear().toString() +
    String(date.getUTCMonth() + 1).padStart(2, "0") +
    String(date.getUTCDate()).padStart(2, "0");

  const midnightUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );

  const secondsSinceMidnight = Math.floor((forTime - midnightUTC) / 1000);
  const slot = Math.floor(secondsSinceMidnight / durationSeconds);

  const startsAt = new Date(midnightUTC + slot * durationSeconds * 1000);
  const endsAt = new Date(startsAt.getTime() + durationSeconds * 1000);
  const sequence = slot + 1;

  const period = `${dateStr}${gameCode}${String(sequence).padStart(4, "0")}`;

  return { startsAt, endsAt, period };
}
