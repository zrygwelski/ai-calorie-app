import OpenAI from "openai";
import { extractJsonObject, stripCodeFences } from "@/lib/ai/json";
import { computeCombinedAmericanOdds, validateBetRecommendation } from "@/lib/bet/validate";
import type { AnalyzeBetRequest } from "@/lib/bet/types";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const SYSTEM_PROMPT = `
You are a sports betting analyst.

Your job is to analyze a single selected football game and recommend a bet that matches
the user's requested bet type and, if given, target American odds as closely as
reasonably possible.

Rules:
- Always return valid JSON. Do NOT include markdown, code blocks, or explanations outside the JSON.
- Only return JSON in the exact shape described below.

Output format:
{
  "betType": "straight" | "parlay",
  "targetOdds": "string, echo back exactly what was requested (e.g. \\"+100\\", \\"-110\\", or \\"not_specified\\")",
  "title": "short human-readable title for the recommendation",
  "bets": [
    {
      "market": "e.g. Spread, Moneyline, Total",
      "selection": "e.g. \\"Ole Miss +7.5\\"",
      "odds": "American odds for this leg, e.g. \\"-110\\"",
      "reason": "1-2 sentence justification for this specific leg"
    }
  ],
  "combinedOdds": "American odds for the full recommendation (single leg's odds for a straight bet, or the parlay's combined odds)",
  "summary": "2-4 sentence explanation of why this overall recommendation makes sense",
  "confidence": "low" | "moderate" | "high"
}

Critical constraints:
- Do NOT fabricate current sportsbook lines, injuries, player statuses, or other time-sensitive
  facts. You do not have live sportsbook access. Base your reasoning on team quality, matchup
  characteristics, home/away, and general football knowledge, and be explicit in "reason"/"summary"
  when something is analysis or a reasonable assumption rather than a known fact.
- If a specific target odds value is given, try to construct a recommendation reasonably close to
  it. An exact match is NOT required — actual sportsbook odds vary. If the target is unreasonable,
  return the closest sensible recommendation instead of inventing numbers to hit it exactly.
- If "not_specified" is given for targetOdds, do not optimize for odds at all — just recommend
  whatever bet your analysis best supports.
- For a "straight" bet, "bets" must contain exactly one leg, and "combinedOdds" must equal that
  leg's "odds".
- For a "parlay", every leg must relate to the selected game only (do not reference other games).
  Do not invent legs or odds merely to hit a target number. Compute "combinedOdds" precisely by
  converting each leg's American odds to decimal odds (positive odds: 1 + odds/100; negative odds:
  1 + 100/abs(odds)), multiplying the decimal odds together, then converting the product back to
  American odds. Choose legs whose true combined odds land near the target, rather than picking
  legs first and guessing at a combined number.
- Do not restate a specific odds number inside "summary" (e.g. "combined odds around +150") since
  the exact combinedOdds value is already shown separately to the user and may be recalculated —
  describe the reasoning for the pick instead, without asserting a precise number there.
- Never invent injuries or player statuses you were not given.
`.trim();

export async function POST(req: Request) {
  let body: AnalyzeBetRequest;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { sport, game, betType, targetOdds } = body ?? {};

  if (!sport || !game || (betType !== "straight" && betType !== "parlay") || !targetOdds) {
    return Response.json(
      { error: "Missing or invalid sport, game, betType, or targetOdds" },
      { status: 400 }
    );
  }

  const userMessage = JSON.stringify(
    {
      sport,
      game,
      betType,
      targetOdds,
    },
    null,
    2
  );

  let rawText: string | null = null;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
    });

    rawText = response.choices[0]?.message?.content ?? null;
    if (!rawText) {
      throw new Error("Empty response from model");
    }

    const cleaned = stripCodeFences(rawText);
    const jsonCandidate = extractJsonObject(cleaned) ?? cleaned;
    const parsed = JSON.parse(jsonCandidate);

    const recommendation = validateBetRecommendation(parsed);

    if (recommendation.betType === "parlay" && recommendation.bets.length > 1) {
      recommendation.combinedOdds = computeCombinedAmericanOdds(
        recommendation.bets.map((leg) => leg.odds)
      );
    }

    return Response.json({ result: recommendation });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get a bet recommendation";
    return Response.json({ error: message, rawOutput: rawText ?? undefined }, { status: 502 });
  }
}
