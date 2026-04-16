"use client";

import { useEffect, useRef, useState } from "react";

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

type GoalDraft = {
  calories: string;
  proteinPct: string;
  carbsPct: string;
  fatPct: string;
};

type UserName = "Zach" | "Suzie" | "Munch" | "Andrew" | "Brian";

type UserData = {
  dailyGoals: DailyGoals;
  entries: Record<MealSection, FoodEntry[]>;
};

type StoredData = {
  activeUser: UserName;
  usersData: Record<UserName, UserData>;
};

const STORAGE_KEY = "calorie-club-data";

const users: UserName[] = ["Zach", "Suzie", "Munch", "Andrew", "Brian"];

const initialUsersData: Record<UserName, UserData> = Object.fromEntries(
  users.map((user) => [user, createBlankUserData()])
) as Record<UserName, UserData>;

function createBlankUserData(): UserData {
  return {
    dailyGoals: {
      calories: "2000",
      proteinPct: 30,
      carbsPct: 40,
      fatPct: 30,
    },
    entries: {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: [],
    },
  };
}

function createGoalDraft(goals: DailyGoals): GoalDraft {
  return {
    calories: goals.calories,
    proteinPct: String(goals.proteinPct),
    carbsPct: String(goals.carbsPct),
    fatPct: String(goals.fatPct),
  };
}

function normalizeCaloriesInput(value: string): string {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? String(Math.max(0, Math.round(parsed))) : "0";
}

function normalizePercentageInput(value: string): number {
  const parsed = Number(value.trim());
  return Number.isFinite(parsed) ? clampInt(parsed, 0, 100) : 0;
}

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
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(() =>
    createGoalDraft(initialUsersData["Zach"].dailyGoals)
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserName>("Zach");
  const menuContainerRef = useRef<HTMLDivElement | null>(null);
  const [usersData, setUsersData] = useState<Record<UserName, UserData>>(initialUsersData);
  const hasMounted = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        hasMounted.current = true;
        return;
      }

      const parsed = JSON.parse(stored) as Partial<StoredData>;
      const loadedActiveUser = users.includes(parsed.activeUser as UserName)
        ? (parsed.activeUser as UserName)
        : "Zach";
      const loadedUsersData = parsed.usersData
        ? ({ ...initialUsersData, ...parsed.usersData } as Record<UserName, UserData>)
        : initialUsersData;

      setActiveUser(loadedActiveUser);
      setUsersData(loadedUsersData);
    } catch {
      // Ignore invalid storage data and continue with defaults
    } finally {
      hasMounted.current = true;
    }
  }, []);

  useEffect(() => {
    if (!hasMounted.current) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ activeUser, usersData })
      );
    } catch {
      // localStorage may be unavailable in some browser modes
    }
  }, [activeUser, usersData]);

  const currentUserData = usersData[activeUser];
  const { dailyGoals, entries } = currentUserData;

  const toggleGoalsOpen = () => {
    if (goalsOpen) {
      const normalizedCalories = normalizeCaloriesInput(goalDraft.calories);
      const normalizedProtein = normalizePercentageInput(goalDraft.proteinPct);
      const normalizedCarbs = normalizePercentageInput(goalDraft.carbsPct);
      const normalizedFat = normalizePercentageInput(goalDraft.fatPct);

      updateDailyGoals(() => ({
        calories: normalizedCalories,
        proteinPct: normalizedProtein,
        carbsPct: normalizedCarbs,
        fatPct: normalizedFat,
      }));
      setGoalsOpen(false);
      return;
    }

    setGoalDraft(createGoalDraft(dailyGoals));
    setGoalsOpen(true);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuContainerRef.current) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (!menuContainerRef.current.contains(target)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      return () => document.removeEventListener("mousedown", handleOutsideClick);
    }

    return undefined;
  }, [menuOpen]);

  const updateDailyGoals = (updater: (goals: DailyGoals) => DailyGoals) => {
    setUsersData((current) => ({
      ...current,
      [activeUser]: {
        ...current[activeUser],
        dailyGoals: updater(current[activeUser].dailyGoals),
      },
    }));
  };

  const updateEntries = (
    updater: (entries: Record<MealSection, FoodEntry[]>) => Record<MealSection, FoodEntry[]>
  ) => {
    setUsersData((current) => ({
      ...current,
      [activeUser]: {
        ...current[activeUser],
        entries: updater(current[activeUser].entries),
      },
    }));
  };

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

  const draftCalories = goalsOpen ? toNumber(goalDraft.calories) : toNumber(dailyGoals.calories);
  const draftProteinPct = goalsOpen ? toNumber(goalDraft.proteinPct) : dailyGoals.proteinPct;
  const draftCarbsPct = goalsOpen ? toNumber(goalDraft.carbsPct) : dailyGoals.carbsPct;
  const draftFatPct = goalsOpen ? toNumber(goalDraft.fatPct) : dailyGoals.fatPct;

  const goalsCalories = toNumber(dailyGoals.calories);
  const goalsPctTotal = draftProteinPct + draftCarbsPct + draftFatPct;
  const goalsPctOk = goalsPctTotal === 100;
  const goalsReady = draftCalories > 0 && goalsPctOk;

  const goalProteinGrams = goalsReady ? (draftCalories * (draftProteinPct / 100)) / 4 : 0;
  const goalCarbsGrams = goalsReady ? (draftCalories * (draftCarbsPct / 100)) / 4 : 0;
  const goalFatGrams = goalsReady ? (draftCalories * (draftFatPct / 100)) / 9 : 0;

  const remainingCalories = goalsReady ? draftCalories - totals.calories : 0;
  const remainingProtein = goalsReady ? goalProteinGrams - totals.protein : 0;
  const remainingCarbs = goalsReady ? goalCarbsGrams - totals.carbs : 0;
  const remainingFat = goalsReady ? goalFatGrams - totals.fat : 0;

  const deleteEntry = (meal: MealSection, index: number) => {
    updateEntries((current) => ({
      ...current,
      [meal]: current[meal].filter((_, i) => i !== index),
    }));
  };

  const handleResetDay = () => {
    const confirmed = window.confirm(
      `Reset today's meals for ${activeUser}? This will clear all current meal entries but keep your goals.`
    );
    if (!confirmed) {
      return;
    }

    updateEntries(() => ({
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: [],
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
        
          updateEntries((current) => ({
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
        <div className="top-header">
          <div className="branding">
            <p className="branding-label">Calorie Club</p>
          </div>

          <div className="user-bar" ref={menuContainerRef}>
            <div className="user-menu-wrapper">
              <button
                type="button"
                className="user-menu-button"
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label={`Switch user, currently ${activeUser}`}
                onClick={() => setMenuOpen((current) => !current)}
              >
                <span className="user-menu-symbol" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                <span className="user-menu-text">{activeUser}</span>
              </button>

              {menuOpen ? (
                <div className="user-menu-drawer" role="menu">
                  {users.map((user) => (
                    <button
                      key={user}
                      type="button"
                      className={`user-menu-item ${user === activeUser ? "user-menu-item--active" : ""}`}
                      onClick={() => {
                        setActiveUser(user);
                        setMenuOpen(false);
                      }}
                    >
                      <span>{user}</span>
                      {user === activeUser ? <span className="user-menu-check">✓</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* <p className="branding-tagline">No stress. Just progress.</p> */}

        {/* <p className="branding-tagline">No stress. Just progress.</p> */}

        <section className="summary" aria-label="Daily summary">
          <div className="summary-header">
            <div>
              <p className="eyebrow">Daily Summary</p>
            </div>
            <div className="summary-actions">
              <button
                type="button"
                className="reset-button"
                onClick={handleResetDay}
              >
                Reset Day
              </button>
              <button
                type="button"
                className="goals-toggle"
                onClick={toggleGoalsOpen}
                aria-expanded={goalsOpen}
              >
                {goalsOpen ? "Done" : "Set goals"}
              </button>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-stat summary-stat--calories">
              <p className="summary-label macro macro--calories">Calories</p>
              <p className="summary-value macro macro--calories">
                {goalsOpen ? (
                  <input
                    className="summary-input"
                    type="number"
                    min={0}
                    value={goalDraft.calories}
                    onChange={(e) =>
                      setGoalDraft((current) => ({
                        ...current,
                        calories: e.target.value,
                      }))
                    }
                    aria-label="Daily calorie goal"
                    inputMode="numeric"
                  />
                ) : (
                  <>
                    {Math.round(totals.calories)}{" "}
                    <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                      ({goalsReady ? Math.round(goalsCalories) : "—"})
                    </span>
                  </>
                )}
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingCalories < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsOpen
                  ? goalsReady
                    ? `${Math.round(remainingCalories)} remaining`
                    : "Update goals to preview remaining"
                  : goalsReady
                  ? `${Math.round(remainingCalories)} remaining`
                  : "Set goals to see remaining"}
              </p>
            </div>

            <div className="summary-stat summary-stat--protein">
              <p className="summary-label macro macro--protein">Protein</p>
              <p className="summary-value macro macro--protein">
                {goalsOpen ? (
                  <span className="summary-input-inline">
                    <input
                      className="summary-input summary-input--pct"
                      type="number"
                      min={0}
                      max={100}
                      value={goalDraft.proteinPct}
                      onChange={(e) =>
                        setGoalDraft((current) => ({
                          ...current,
                          proteinPct: e.target.value,
                        }))
                      }
                      aria-label="Protein percentage goal"
                    />
                    %
                  </span>
                ) : (
                  <>
                    {Math.round(totals.protein)}g{" "}
                    <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                      ({goalsReady ? `${Math.round(goalProteinGrams)}g` : "—"})
                    </span>
                  </>
                )}
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingProtein < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsOpen
                  ? `${Math.round(goalProteinGrams)}g`
                  : goalsReady
                  ? `${Math.round(remainingProtein)}g remaining`
                  : "—"}
              </p>
            </div>

            <div className="summary-stat summary-stat--carbs">
              <p className="summary-label macro macro--carbs">Carbs</p>
              <p className="summary-value macro macro--carbs">
                {goalsOpen ? (
                  <span className="summary-input-inline">
                    <input
                      className="summary-input summary-input--pct"
                      type="number"
                      min={0}
                      max={100}
                      value={goalDraft.carbsPct}
                      onChange={(e) =>
                        setGoalDraft((current) => ({
                          ...current,
                          carbsPct: e.target.value,
                        }))
                      }
                      aria-label="Carbs percentage goal"
                    />
                    %
                  </span>
                ) : (
                  <>
                    {Math.round(totals.carbs)}g{" "}
                    <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                      ({goalsReady ? `${Math.round(goalCarbsGrams)}g` : "—"})
                    </span>
                  </>
                )}
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingCarbs < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsOpen
                  ? `${Math.round(goalCarbsGrams)}g`
                  : goalsReady
                  ? `${Math.round(remainingCarbs)}g remaining`
                  : "—"}
              </p>
            </div>

            <div className="summary-stat summary-stat--fat">
              <p className="summary-label macro macro--fat">Fat</p>
              <p className="summary-value macro macro--fat">
                {goalsOpen ? (
                  <span className="summary-input-inline">
                    <input
                      className="summary-input summary-input--pct"
                      type="number"
                      min={0}
                      max={100}
                      value={goalDraft.fatPct}
                      onChange={(e) =>
                        setGoalDraft((current) => ({
                          ...current,
                          fatPct: e.target.value,
                        }))
                      }
                      aria-label="Fat percentage goal"
                    />
                    %
                  </span>
                ) : (
                  <>
                    {Math.round(totals.fat)}g{" "}
                    <span className={`summary-goal-inline ${goalsReady ? "" : "summary-goal-inline--muted"}`}>
                      ({goalsReady ? `${Math.round(goalFatGrams)}g` : "—"})
                    </span>
                  </>
                )}
              </p>
              <p
                className={`summary-subvalue ${goalsReady ? "" : "summary-subvalue--muted"} ${goalsReady && remainingFat < 0 ? "summary-subvalue--over" : ""}`}
              >
                {goalsOpen
                  ? `${Math.round(goalFatGrams)}g`
                  : goalsReady
                  ? `${Math.round(remainingFat)}g remaining`
                  : "—"}
              </p>
            </div>
          </div>

          {goalsOpen ? (
            <p className={`summary-hint ${goalsPctOk ? "" : "summary-subvalue--over"}`}>
              Macro percentages should add up to <strong>100%</strong>.
            </p>
          ) : null}
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