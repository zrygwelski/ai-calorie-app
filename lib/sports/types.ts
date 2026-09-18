export type Sport = "NFL" | "NCAAF";

export type GameStatus = "scheduled" | "in_progress" | "final";

export type Team = {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
};

export type Game = {
  id: string;
  sport: Sport;
  homeTeam: Team;
  awayTeam: Team;
  startTime: string;
  venue?: string;
  status: GameStatus;
};
