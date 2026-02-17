import { logErrorToDbAsync } from "./logErrorToDb.js";

export const logger = {
  info: (message, ...args) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[ERROR] ${message}`, ...args);
    const err = message instanceof Error ? message : new Error(String(message));
    logErrorToDbAsync(err, { source: "logger", context: args.length ? { args } : null });
  },
  warn: (message, ...args) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  debug: (message, ...args) => {
    console.debug(`[DEBUG] ${message}`, ...args);
  },
};
