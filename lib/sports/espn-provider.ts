import type { GameProvider } from "./provider";
import type { Game, GameStatus, Sport, Team } from "./types";

const ESPN_ENDPOINTS: Record<Sport, string> = {
  NFL: "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?limit=100",
  NCAAF:
    "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=200",
};

type EspnTeam = {
  id: string;
  location: string;
  name: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
};

type EspnCompetitor = {
  homeAway: "home" | "away";
  team: EspnTeam;
};

type EspnStatusType = {
  state: "pre" | "in" | "post";
};

type EspnCompetition = {
  venue?: { fullName?: string };
  competitors: EspnCompetitor[];
  status?: { type: EspnStatusType };
};

type EspnEvent = {
  id: string;
  date: string;
  status?: { type: EspnStatusType };
  competitions: EspnCompetition[];
};

type EspnScoreboardResponse = {
  events?: EspnEvent[];
};

function toTeam(espnTeam: EspnTeam): Team {
  return {
    id: espnTeam.id,
    name: espnTeam.displayName,
    shortName: espnTeam.shortDisplayName,
    abbreviation: espnTeam.abbreviation,
  };
}

function toStatus(state: EspnStatusType["state"] | undefined): GameStatus {
  if (state === "in") return "in_progress";
  if (state === "post") return "final";
  return "scheduled";
}

function normalizeEvent(event: EspnEvent, sport: Sport): Game | null {
  const competition = event.competitions?.[0];
  if (!competition) return null;

  const home = competition.competitors?.find((c) => c.homeAway === "home");
  const away = competition.competitors?.find((c) => c.homeAway === "away");
  if (!home?.team || !away?.team) return null;

  const state = competition.status?.type?.state ?? event.status?.type?.state;

  return {
    id: event.id,
    sport,
    homeTeam: toTeam(home.team),
    awayTeam: toTeam(away.team),
    startTime: event.date,
    venue: competition.venue?.fullName,
    status: toStatus(state),
  };
}

export class EspnGameProvider implements GameProvider {
  async getUpcomingGames(sport: Sport): Promise<Game[]> {
    const url = ESPN_ENDPOINTS[sport];

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      throw new Error(`Sports data provider request failed (${res.status})`);
    }

    const data = (await res.json()) as EspnScoreboardResponse;
    const events = data.events ?? [];

    return events
      .map((event) => normalizeEvent(event, sport))
      .filter((game): game is Game => game !== null && game.status !== "final")
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }
}
