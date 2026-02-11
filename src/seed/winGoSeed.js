import WinGoGame from "../models/WinGoGame.js";
import { logger } from "../utils/logger.js";
import { WINGO_GAMES } from "../constants/winGoConstants.js";

const seedWinGoGames = async () => {
  try {
    for (const game of WINGO_GAMES) {
      await WinGoGame.findOneAndUpdate(
        { durationSeconds: game.durationSeconds },
        { $set: game },
        { upsert: true, new: true }
      );
    }
    logger.info(`✅ Seeded / updated ${WINGO_GAMES.length} WinGo games`);
  } catch (error) {
    logger.error("Error seeding WinGo games:", error);
  }
};

export default seedWinGoGames;
