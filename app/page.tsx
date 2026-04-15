"use client";

import { useState } from "react";

type MealSection = "Breakfast" | "Lunch" | "Dinner" | "Snacks";

type FoodEntry = {
  name: string;
  quantity: number | string;
  calories: number | string;
  protein: number | string;
  carbs: number | string;
  fat: number | string;
};

const mealSections: MealSection[] = ["Breakfast", "Lunch", "Dinner", "Snacks"];

type DailyGoals = {
  calories: string;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
};

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function extractJsonObject(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return text.slice(start, end + 1);
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, Math.round(value)));
}

export default function Home() {
  const [activeMeal, setActiveMeal] = useState<MealSection | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>({
    calories: "2000",
    proteinPct: 30,
    carbsPct: 40,
    fatPct: 30,
  });
  const [entries, setEntries] = useState<Record<MealSection, FoodEntry[]>>({
    Breakfast: [],
    Lunch: [],
    Dinner: [],
    Snacks: [],
  });

  const totals = mealSections.reduce(
    (acc, meal) => {
      for (const entry of entries[meal]) {
        acc.calories += toNumber(entry.calories);
        acc.protein += toNumber(entry.protein);
        acc.carbs += toNumber(entry.carbs);
        acc.fat += toNumber(entry.fat);
      }
  
      return acc;
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  const goalsCalories = toNumber(dailyGoals.calories);
  const goalsPctTotal = dailyGoals.proteinPct + dailyGoals.carbsPct + dailyGoals.fatPct;
  const goalsPctOk = goalsPctTotal === 100;
  const goalsReady = goalsCalories > 0 && goalsPctOk;

  const goalProteinGrams = goalsReady ? (goalsCalories * (dailyGoals.proteinPct / 100)) / 4 : 0;
  const goalCarbsGrams = goalsReady ? (goalsCalories * (dailyGoals.carbsPct / 100)) / 4 : 0;
  const goalFatGrams = goalsReady ? (goalsCalories * (dailyGoals.fatPct / 100)) / 9 : 0;

  const remainingCalories = goalsReady ? goalsCalories - totals.calories : 0;
  const remainingProtein = goalsReady ? goalProteinGrams - totals.protein : 0;
  const remainingCarbs = goalsReady ? goalCarbsGrams - totals.carbs : 0;
  const remainingFat = goalsReady ? goalFatGrams - totals.fat : 0;

  const deleteEntry = (meal: MealSection, index: number) => {
    setEntries((current) => ({
      ...current,
      [meal]: current[meal].filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!activeMeal) {
      return;
    }

    setError("");
    setRawOutput("");

    try {
      const res = await fetch("/api/parse-food", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(
          `Request failed (${res.status} ${res.statusText})${errorText ? `: ${errorText}` : ""}`
        );
      }

      const data = await res.json();
      const rawResult = String(data?.result ?? "");
      const normalizedResult = rawResult
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

        try {
          const jsonCandidate = extractJsonObject(normalizedResult) ?? normalizedResult;
          const parsed = JSON.parse(jsonCandidate) as { items?: Partial<FoodEntry>[] };
        
          if (!parsed.items || !Array.isArray(parsed.items) || parsed.items.length === 0) {
            throw new Error("No food items returned");
          }
        
          const newEntries: FoodEntry[] = parsed.items.map((item) => ({
            name: String(item.name ?? input),
            quantity: item.quantity ?? 1,
            calories: item.calories ?? "-",
            protein: item.protein ?? "-",
            carbs: item.carbs ?? "-",
            fat: item.fat ?? "-",
          }));
        
          setEntries((current) => ({
            ...current,
            [activeMeal]: [...current[activeMeal], ...newEntries],
          }));
        
          setInput("");
          setActiveMeal(null);
        } catch {
          setError("Could not parse response as JSON");
          setRawOutput(rawResult);
        }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong while fetching data";
      setError(message);
    }
  };

  return (
    <main className="page">
      <div className="app-shell">
        <section className="goals" aria-label="Goals">
          <div className="goals-header">
            <div>
              <p className="eyebrow">Goals</p>
              <h2>Daily Targets</h2>
            </div>
            <button
              type="button"
              className="goals-toggle"
              onClick={() => setGoalsOpen((current) => !current)}
              aria-expanded={goalsOpen}
            >
              {goalsOpen ? "Collapse" : "Set goals"}
            </button>
          </div>

          {goalsOpen ? (
            <div className="goals-body">
              {(() => {
                const totalPct =
                  dailyGoals.proteinPct + dailyGoals.carbsPct + dailyGoals.fatPct;
                const pctOk = totalPct === 100;
                const caloriesNumber = toNumber(dailyGoals.calories);
                const proteinGrams = (caloriesNumber * (dailyGoals.proteinPct / 100)) / 4;
                const carbsGrams = (caloriesNumber * (dailyGoals.carbsPct / 100)) / 4;
                const fatGrams = (caloriesNumber * (dailyGoals.fatPct / 100)) / 9;

                return (
                  <div className="goals-daily">
                    <label className="goals-field">
                      <span className="goals-label">Calories</span>
                      <input
                        className="goals-input"
                        value={dailyGoals.calories}
                        onChange={(e) =>
                          setDailyGoals((current) => ({
                            ...current,
                            calories: e.target.value,
                          }))
                        }
                        placeholder="e.g. 2200"
                        inputMode="numeric"
                      />
                    </label>

                    <label className="goals-field">
                      <span className="goals-label">
                        Protein %{" "}
                        <span className="goals-derived">
                          ({caloriesNumber ? `${Math.round(proteinGrams)}g` : "—"})
                        </span>
                      </span>
                      <input
                        className="goals-input"
                        type="number"
                        min={0}
                        max={100}
                        value={dailyGoals.proteinPct}
                        onChange={(e) =>
                          setDailyGoals((current) => ({
                            ...current,
                            proteinPct: clampInt(Number(e.target.value), 0, 100),
                          }))
                        }
                      />
                    </label>

                    <label className="goals-field">
                      <span className="goals-label">
                        Carbs %{" "}
                        <span className="goals-derived">
                          ({caloriesNumber ? `${Math.round(carbsGrams)}g` : "—"})
                        </span>
                      </span>
                      <input
                        className="goals-input"
                        type="number"
                        min={0}
                        max={100}
                        value={dailyGoals.carbsPct}
                        onChange={(e) =>
                          setDailyGoals((current) => ({
                            ...current,
                            carbsPct: clampInt(Number(e.target.value), 0, 100),
                          }))
                        }
                      />
                    </label>

                    <label className="goals-field">
                      <span className="goals-label">
                        Fat %{" "}
                        <span className="goals-derived">
                          ({caloriesNumber ? `${Math.round(fatGrams)}g` : "—"})
                        </span>
                      </span>
                      <input
                        className="goals-input"
                        type="number"
                        min={0}
                        max={100}
                        value={dailyGoals.fatPct}
                        onChange={(e) =>
                          setDailyGoals((current) => ({
                            ...current,
                            fatPct: clampInt(Number(e.target.value), 0, 100),
                          }))
                        }
                      />
                    </label>

                    <div className={`goals-total ${pctOk ? "" : "goals-total--warn"}`}>
                      <p className="goals-total-value">{totalPct}%</p>
                      <p className="goals-total-hint">{pctOk ? "OK" : "Must be 100"}</p>
                    </div>
                  </div>
                );
              })()}

              <p className="goals-footnote">
                Macro percentages should add up to <strong>100%</strong>.
              </p>
            </div>
          ) : null}
        </section>

        <section className="summary" aria-label="Daily summary">
          <div className="summary-header">
            <div>
              <p className="eyebrow">Daily Summary</p>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-stat summary-stat--calories">
              <p className="summary-label macro macro--calories">Calories</p>
              <p className="summary-value macro macro--calories">
                {Math.round(totals.calories)}{" "}
                <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                  ({goalsReady ? Math.round(goalsCalories) : "—"})
                </span>
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingCalories < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsReady ? `${Math.round(remainingCalories)} remaining` : "Set goals to see remaining"}
              </p>
            </div>
            <div className="summary-stat summary-stat--protein">
              <p className="summary-label macro macro--protein">Protein</p>
              <p className="summary-value macro macro--protein">
                {Math.round(totals.protein)}g{" "}
                <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                  ({goalsReady ? `${Math.round(goalProteinGrams)}g` : "—"})
                </span>
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingProtein < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsReady ? `${Math.round(remainingProtein)}g remaining` : "—"}
              </p>
            </div>
            <div className="summary-stat summary-stat--carbs">
              <p className="summary-label macro macro--carbs">Carbs</p>
              <p className="summary-value macro macro--carbs">
                {Math.round(totals.carbs)}g{" "}
                <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                  ({goalsReady ? `${Math.round(goalCarbsGrams)}g` : "—"})
                </span>
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingCarbs < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsReady ? `${Math.round(remainingCarbs)}g remaining` : "—"}
              </p>
            </div>
            <div className="summary-stat summary-stat--fat">
              <p className="summary-label macro macro--fat">Fat</p>
              <p className="summary-value macro macro--fat">
                {Math.round(totals.fat)}g{" "}
                <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                  ({goalsReady ? `${Math.round(goalFatGrams)}g` : "—"})
                </span>
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingFat < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsReady ? `${Math.round(remainingFat)}g remaining` : "—"}
              </p>
            </div>
          </div>
        </section>

        <div className="meal-list">
          {mealSections.map((meal) => (
            <section
              key={meal}
              className={`meal-section meal-section--${meal.toLowerCase()}`}
            >
              <div className="meal-header">
                <div>
                  <h2>{meal}</h2>
                  <p className="meal-description">Track foods and macros for this section.</p>
                </div>
                <button
                  type="button"
                  className="add-button"
                  onClick={() => {
                    setActiveMeal(meal);
                    setInput("");
                    setError("");
                    setRawOutput("");
                  }}
                  aria-label={`Add food to ${meal}`}
                >
                  +
                </button>
              </div>

              <div className="entry-list">
                {entries[meal].length === 0 ? (
                  <p className="empty-state">No entries yet.</p>
                ) : (
                  entries[meal].map((entry, index) => (
                    <article key={`${entry.name}-${index}`} className="entry-card">
                      <div className="entry-header">
                        <h3>
                          {entry.name} <span className="entry-qty">×{entry.quantity}</span>
                        </h3>
                        <button
                          type="button"
                          className="delete-button"
                          onClick={() => deleteEntry(meal, index)}
                          aria-label={`Delete ${entry.name} from ${meal}`}
                        >
                          Remove
                        </button>
                      </div>
                      <div className="entry-metrics">
                        <p className="metric metric--calories">
                          <span className="metric-label macro macro--calories">Cal</span>
                          <span className="metric-value">{entry.calories}</span>
                        </p>
                        <p className="metric metric--protein">
                          <span className="metric-label macro macro--protein">P</span>
                          <span className="metric-value">{entry.protein}g</span>
                        </p>
                        <p className="metric metric--carbs">
                          <span className="metric-label macro macro--carbs">C</span>
                          <span className="metric-value">{entry.carbs}g</span>
                        </p>
                        <p className="metric metric--fat">
                          <span className="metric-label macro macro--fat">F</span>
                          <span className="metric-value">{entry.fat}g</span>
                        </p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      {activeMeal ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setActiveMeal(null)}>
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="meal-modal-title" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">New entry</p>
                <h2 id="meal-modal-title">Add to {activeMeal}</h2>
              </div>
              <button type="button" className="close-button" onClick={() => setActiveMeal(null)}>
                ×
              </button>
            </div>

            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What did you eat?"
              className="meal-input"
            />

            <button type="button" className="submit-button" onClick={handleSubmit}>
              Save entry
            </button>

            {error ? <p className="error-message">{error}</p> : null}
            {rawOutput ? (
              <div className="result-panel">
                <p className="result-label">Raw response</p>
                <pre className="raw-output">{rawOutput}</pre>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}