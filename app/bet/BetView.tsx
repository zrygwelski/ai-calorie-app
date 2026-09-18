"use client";

import { useEffect, useRef, useState } from "react";
import type { Game, Sport } from "@/lib/sports/types";
import type { BetRecommendation, BetType, TargetOdds } from "@/lib/bet/types";

const sportOptions: { value: Sport; label: string }[] = [
  { value: "NFL", label: "NFL" },
  { value: "NCAAF", label: "NCAA Football" },
];

const betTypeOptions: { value: BetType; label: string }[] = [
  { value: "straight", label: "Straight Bet" },
  { value: "parlay", label: "Parlay" },
];

function formatGameTime(iso: string): string {
  const date = new Date(iso);
  const datePart = date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} · ${timePart}`;
}

type FieldErrors = {
  game?: string;
  betType?: string;
  odds?: string;
};

export default function BetView() {
  const [sport, setSport] = useState<Sport>("NFL");
  const [games, setGames] = useState<Game[]>([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState("");
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  const [betType, setBetType] = useState<BetType | null>(null);

  const [oddsSign, setOddsSign] = useState<"+" | "-">("+");
  const [oddsDigits, setOddsDigits] = useState("");
  const [oddsNotSpecified, setOddsNotSpecified] = useState(false);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [recommendation, setRecommendation] = useState<BetRecommendation | null>(null);
  const isSubmittingRef = useRef(false);

  const gamesSectionRef = useRef<HTMLElement>(null);
  const betTypeSectionRef = useRef<HTMLElement>(null);
  const oddsSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;

    setGamesLoading(true);
    setGamesError("");
    setSelectedGame(null);

    fetch(`/api/games?sport=${sport.toLowerCase()}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error ?? "Could not load upcoming games");
        }
        if (!cancelled) {
          setGames(Array.isArray(data.games) ? data.games : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setGames([]);
          setGamesError(
            err instanceof Error ? err.message : "Could not load upcoming games"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setGamesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sport]);

  const targetOdds: TargetOdds | null = oddsNotSpecified
    ? "not_specified"
    : oddsDigits.length === 3
    ? `${oddsSign}${oddsDigits}`
    : null;

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    if (!selectedGame) {
      errors.game = "Select a game before requesting a bet.";
    }
    if (!betType) {
      errors.betType = "Choose Straight Bet or Parlay.";
    }
    if (!targetOdds) {
      errors.odds = "Enter a 3-digit odds value, or choose Not Specified.";
    }
    return errors;
  };

  const handleGetBet = async () => {
    if (isSubmittingRef.current) return;

    const errors = validate();
    if (errors.game || errors.betType || errors.odds) {
      setFieldErrors(errors);
      const sectionRef = errors.game
        ? gamesSectionRef
        : errors.betType
        ? betTypeSectionRef
        : oddsSectionRef;
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    if (!selectedGame || !betType || !targetOdds) return;

    setFieldErrors({});
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setSubmitError("");
    setRawOutput("");
    setRecommendation(null);

    try {
      const res = await fetch("/api/analyze-bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport,
          game: selectedGame,
          betType,
          targetOdds,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data?.error ?? `Request failed (${res.status})`);
        if (data?.rawOutput) setRawOutput(data.rawOutput);
        return;
      }

      setRecommendation(data.result as BetRecommendation);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong while fetching data"
      );
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bet-view">
      <section aria-label="Sport">
        <div className="analytics-tabs analytics-tabs--compact" role="tablist" aria-label="Sport">
          {sportOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={sport === option.value}
              className={`analytics-tab ${sport === option.value ? "analytics-tab--active" : ""}`}
              onClick={() => setSport(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="bet-games-section" aria-label="Upcoming games" ref={gamesSectionRef}>
        <h2 className="bet-section-heading">Upcoming Games</h2>

        {gamesLoading ? (
          <p className="empty-state">Loading upcoming games…</p>
        ) : gamesError ? (
          <p className="empty-state">{gamesError}</p>
        ) : games.length === 0 ? (
          <p className="empty-state">No upcoming games found right now.</p>
        ) : (
          <div
            className={`game-list ${fieldErrors.game ? "game-list--invalid" : ""}`}
            role="group"
            aria-label="Select a game"
            aria-describedby={fieldErrors.game ? "game-error" : undefined}
          >
            {games.map((game) => (
              <button
                key={game.id}
                type="button"
                className={`game-card ${selectedGame?.id === game.id ? "game-card--selected" : ""}`}
                onClick={() => {
                  setSelectedGame(game);
                  setFieldErrors((prev) => ({ ...prev, game: undefined }));
                }}
                aria-pressed={selectedGame?.id === game.id}
              >
                <span className="game-card-matchup">
                  {game.awayTeam.shortName} @ {game.homeTeam.shortName}
                </span>
                <span className="game-card-meta">
                  {formatGameTime(game.startTime)}
                  {game.venue ? ` · ${game.venue}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
        {fieldErrors.game ? (
          <p className="field-error" role="alert" id="game-error">
            {fieldErrors.game}
          </p>
        ) : null}
      </section>

      <section aria-label="Bet type" ref={betTypeSectionRef}>
        <h2 className="bet-section-heading">Bet Type</h2>
        <div
          className={`analytics-tabs analytics-tabs--compact ${fieldErrors.betType ? "analytics-tabs--invalid" : ""}`}
          role="tablist"
          aria-label="Bet type"
          aria-describedby={fieldErrors.betType ? "bet-type-error" : undefined}
        >
          {betTypeOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={betType === option.value}
              className={`analytics-tab ${betType === option.value ? "analytics-tab--active" : ""}`}
              onClick={() => {
                setBetType(option.value);
                setFieldErrors((prev) => ({ ...prev, betType: undefined }));
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
        {fieldErrors.betType ? (
          <p className="field-error" role="alert" id="bet-type-error">
            {fieldErrors.betType}
          </p>
        ) : null}
      </section>

      <section aria-label="Target odds" ref={oddsSectionRef}>
        <h2 className="bet-section-heading">Target Odds</h2>
        <div
          className={`odds-row ${fieldErrors.odds ? "odds-row--invalid" : ""}`}
        >
          <div className="odds-sign-toggle" role="group" aria-label="Odds sign">
            <button
              type="button"
              className={`odds-sign-button ${!oddsNotSpecified && oddsSign === "+" ? "odds-sign-button--active" : ""}`}
              disabled={oddsNotSpecified}
              onClick={() => setOddsSign("+")}
            >
              +
            </button>
            <button
              type="button"
              className={`odds-sign-button ${!oddsNotSpecified && oddsSign === "-" ? "odds-sign-button--active" : ""}`}
              disabled={oddsNotSpecified}
              onClick={() => setOddsSign("-")}
            >
              −
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={3}
            placeholder="100"
            className="odds-input"
            value={oddsDigits}
            disabled={oddsNotSpecified}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "").slice(0, 3);
              setOddsDigits(digits);
              if (digits.length === 3) {
                setFieldErrors((prev) => ({ ...prev, odds: undefined }));
              }
            }}
            aria-label="Target odds value"
            aria-invalid={!!fieldErrors.odds}
            aria-describedby={fieldErrors.odds ? "odds-error" : undefined}
          />
          <button
            type="button"
            className={`odds-not-specified-button ${oddsNotSpecified ? "odds-not-specified-button--active" : ""}`}
            onClick={() => {
              const next = !oddsNotSpecified;
              setOddsNotSpecified(next);
              if (next) {
                setFieldErrors((prev) => ({ ...prev, odds: undefined }));
              }
            }}
          >
            Not Specified
          </button>
        </div>
        {fieldErrors.odds ? (
          <p className="field-error" role="alert" id="odds-error">
            {fieldErrors.odds}
          </p>
        ) : null}
      </section>

      <button
        type="button"
        className="submit-button"
        disabled={isSubmitting}
        onClick={handleGetBet}
      >
        {isSubmitting ? "Analyzing…" : "Get Bet"}
      </button>

      {submitError ? <p className="error-message">{submitError}</p> : null}
      {rawOutput ? (
        <div className="result-panel">
          <p className="result-label">Raw response</p>
          <pre className="raw-output">{rawOutput}</pre>
        </div>
      ) : null}

      {recommendation ? (
        <section className="bet-results" aria-label="Bet recommendation">
          <h2 className="bet-section-heading">Your Bet</h2>
          <div className="bet-card-group">
            {recommendation.bets.map((leg, index) => (
              <article key={index} className="bet-card">
                <p className="bet-card-market">{leg.market}</p>
                <p className="bet-card-selection">{leg.selection}</p>
                <p className="bet-card-odds">{leg.odds}</p>
                <p className="bet-card-reason">{leg.reason}</p>
              </article>
            ))}
          </div>
          <p className="bet-combined-odds">
            Combined Odds: <span>{recommendation.combinedOdds}</span>
          </p>
          <div className="result-panel bet-summary">
            <p className="result-label">Why this bet?</p>
            <p>{recommendation.summary}</p>
          </div>
          <p className="bet-disclaimer">
            AI-generated analysis for informational purposes — not guaranteed and not financial
            advice.
          </p>
        </section>
      ) : null}
    </div>
  );
}
