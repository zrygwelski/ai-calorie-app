import type { Game, Sport } from "../sports/types";

export type BetType = "straight" | "parlay";

export type TargetOdds = string | "not_specified";

export type Confidence = "low" | "moderate" | "high";

export type BetLeg = {
  market: string;
  selection: string;
  odds: string;
  reason: string;
};

export type BetRecommendation = {
  betType: BetType;
  targetOdds: TargetOdds;
  title: string;
  bets: BetLeg[];
  combinedOdds: string;
  summary: string;
  confidence: Confidence;
};

export type AnalyzeBetRequest = {
  sport: Sport;
  game: Game;
  betType: BetType;
  targetOdds: TargetOdds;
};
