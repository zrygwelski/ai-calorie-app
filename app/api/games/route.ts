import { getGameProvider } from "@/lib/sports/provider";
import type { Sport } from "@/lib/sports/types";

const VALID_SPORTS: Record<string, Sport> = {
  nfl: "NFL",
  ncaaf: "NCAAF",
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sportParam = (searchParams.get("sport") ?? "").toLowerCase();
  const sport = VALID_SPORTS[sportParam];

  if (!sport) {
    return Response.json(
      { error: "Invalid or missing 'sport' query param. Use 'nfl' or 'ncaaf'." },
      { status: 400 }
    );
  }

  try {
    const games = await getGameProvider().getUpcomingGames(sport);
    return Response.json({ games });
  } catch {
    return Response.json(
      { error: "Could not load upcoming games right now. Please try again shortly." },
      { status: 502 }
    );
  }
}
