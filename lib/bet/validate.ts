import type { BetLeg, BetRecommendation, Confidence } from "./types";

const CONFIDENCE_VALUES: Confidence[] = ["low", "moderate", "high"];
const AMERICAN_ODDS_PATTERN = /^[+-]\d{2,4}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidOdds(value: unknown): value is string {
  return typeof value === "string" && AMERICAN_ODDS_PATTERN.test(value);
}

function validateLeg(raw: unknown, index: number): BetLeg {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`Bet leg ${index} is not an object`);
  }
  const leg = raw as Record<string, unknown>;

  if (!isNonEmptyString(leg.market)) {
    throw new Error(`Bet leg ${index} is missing a valid "market"`);
  }
  if (!isNonEmptyString(leg.selection)) {
    throw new Error(`Bet leg ${index} is missing a valid "selection"`);
  }
  if (!isValidOdds(leg.odds)) {
    throw new Error(`Bet leg ${index} has invalid "odds": ${JSON.stringify(leg.odds)}`);
  }
  if (!isNonEmptyString(leg.reason)) {
    throw new Error(`Bet leg ${index} is missing a valid "reason"`);
  }

  return {
    market: leg.market,
    selection: leg.selection,
    odds: leg.odds,
    reason: leg.reason,
  };
}

export function validateBetRecommendation(raw: unknown): BetRecommendation {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Response is not a JSON object");
  }
  const obj = raw as Record<string, unknown>;

  if (obj.betType !== "straight" && obj.betType !== "parlay") {
    throw new Error(`Invalid "betType": ${JSON.stringify(obj.betType)}`);
  }
  if (typeof obj.targetOdds !== "string" || obj.targetOdds.trim().length === 0) {
    throw new Error(`Invalid "targetOdds": ${JSON.stringify(obj.targetOdds)}`);
  }
  if (!isNonEmptyString(obj.title)) {
    throw new Error(`Invalid "title": ${JSON.stringify(obj.title)}`);
  }
  if (!Array.isArray(obj.bets) || obj.bets.length === 0) {
    throw new Error('"bets" must be a non-empty array');
  }
  if (obj.betType === "straight" && obj.bets.length !== 1) {
    throw new Error('A "straight" bet must have exactly one leg in "bets"');
  }
  if (!isValidOdds(obj.combinedOdds)) {
    throw new Error(`Invalid "combinedOdds": ${JSON.stringify(obj.combinedOdds)}`);
  }
  if (!isNonEmptyString(obj.summary)) {
    throw new Error(`Invalid "summary": ${JSON.stringify(obj.summary)}`);
  }
  if (!CONFIDENCE_VALUES.includes(obj.confidence as Confidence)) {
    throw new Error(`Invalid "confidence": ${JSON.stringify(obj.confidence)}`);
  }

  const bets = obj.bets.map((leg, index) => validateLeg(leg, index));

  return {
    betType: obj.betType,
    targetOdds: obj.targetOdds,
    title: obj.title,
    bets,
    combinedOdds: obj.combinedOdds,
    summary: obj.summary,
    confidence: obj.confidence as Confidence,
  };
}

function americanOddsToDecimal(odds: string): number {
  const value = Number(odds);
  return value > 0 ? 1 + value / 100 : 1 + 100 / Math.abs(value);
}

function decimalToAmericanOdds(decimal: number): string {
  if (decimal >= 2) {
    const value = Math.round((decimal - 1) * 100);
    return `+${value}`;
  }
  const value = Math.round(-100 / (decimal - 1));
  return `${value}`;
}

export function computeCombinedAmericanOdds(legOdds: string[]): string {
  const combinedDecimal = legOdds.reduce(
    (product, odds) => product * americanOddsToDecimal(odds),
    1
  );
  return decimalToAmericanOdds(combinedDecimal);
}
