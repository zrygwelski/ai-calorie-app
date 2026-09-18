import type { Game, Sport } from "./types";
import { EspnGameProvider } from "./espn-provider";

export interface GameProvider {
  getUpcomingGames(sport: Sport): Promise<Game[]>;
}

let provider: GameProvider | null = null;

export function getGameProvider(): GameProvider {
  if (!provider) {
    provider = new EspnGameProvider();
  }
  return provider;
}
