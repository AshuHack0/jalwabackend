import WinGoRound from "../models/WinGoRound.js";
import WinGoBet from "../models/WinGoBet.js";

const MODEL_MAP = {
  WinGoRound,
  WinGoBet,
};

/**
 * Clears specified collections before server start.
 * Use CLEAR_DB_ON_START=true and CLEAR_DB_COLLECTIONS=WinGoRound,WinGoBet in .env
 */
export async function clearCollections(collectionNames) {
  const names = collectionNames
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const results = [];
  for (const name of names) {
    const Model = MODEL_MAP[name];
    if (!Model) {
      console.warn(`⚠️ Unknown collection "${name}", skipping`);
      continue;
    }
    const { deletedCount } = await Model.deleteMany({});
    results.push(`${name}: ${deletedCount}`);
  }
  console.log(`🧹 Cleared DB: ${results.join(", ")}`);
}
