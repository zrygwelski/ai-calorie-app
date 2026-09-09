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

type EstimateDraft = {
  sex: "male" | "female";
  age: string;
  feet: string;
  inches: string;
  pounds: string;
  activity: "sedentary" | "light" | "moderate" | "active" | "very-active";
  goal: "lose" | "maintain" | "gain";
};

type UserData = {
  dailyGoals: DailyGoals;
  entries: Record<MealSection, FoodEntry[]>;
};

type ActiveTab = "food" | "gym";

type GymExercise = {
  id: string;
  name: string;
  sets: string;
  weight: string;
  reps: string;
};

type Workout = {
  id: string;
  name: string;
  exercises: GymExercise[];
};

type ExerciseDraft = {
  name: string;
  sets: string;
  weight: string;
  reps: string;
};

function createExerciseDraft(): ExerciseDraft {
  return { name: "", sets: "", weight: "", reps: "" };
}

const STORAGE_KEY = "calorie-club-data";

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

function createEstimateDraft(): EstimateDraft {
  return {
    sex: "male",
    age: "30",
    feet: "5",
    inches: "8",
    pounds: "165",
    activity: "moderate",
    goal: "maintain",
  };
}

function heightToCm(feet: string, inches: string): number {
  const parsedFeet = Number(feet.trim());
  const parsedInches = Number(inches.trim());
  if (!Number.isFinite(parsedFeet) || !Number.isFinite(parsedInches)) {
    return 0;
  }
  return parsedFeet * 30.48 + parsedInches * 2.54;
}

function poundsToKg(pounds: string): number {
  const parsed = Number(pounds.trim());
  return Number.isFinite(parsed) ? parsed * 0.45359237 : 0;
}

function bmrEstimate(draft: EstimateDraft): number {
  const age = Number(draft.age);
  const height = heightToCm(draft.feet, draft.inches);
  const weight = poundsToKg(draft.pounds);

  if (!Number.isFinite(age) || age <= 0 || height <= 0 || weight <= 0) {
    return 0;
  }

  const base = 10 * weight + 6.25 * height - 5 * age;
  const sexModifier = draft.sex === "male" ? 5 : -161;
  return base + sexModifier;
}

function activityFactor(level: EstimateDraft["activity"]): number {
  switch (level) {
    case "sedentary":
      return 1.2;
    case "light":
      return 1.375;
    case "moderate":
      return 1.55;
    case "active":
      return 1.725;
    case "very-active":
      return 1.9;
    default:
      return 1.2;
  }
}

function goalCaloriesAdjustment(goal: EstimateDraft["goal"]): number {
  switch (goal) {
    case "lose":
      return -300;
    case "gain":
      return 300;
    default:
      return 0;
  }
}

function estimateMacros(goal: EstimateDraft["goal"]) {
  if (goal === "lose") {
    return { proteinPct: 30, carbsPct: 35, fatPct: 35 };
  }

  if (goal === "gain") {
    return { proteinPct: 25, carbsPct: 50, fatPct: 25 };
  }

  return { proteinPct: 25, carbsPct: 45, fatPct: 30 };
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

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function Home() {
  const [activeMeal, setActiveMeal] = useState<MealSection | null>(null);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [rawOutput, setRawOutput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState<GoalDraft>(() =>
    createGoalDraft(createBlankUserData().dailyGoals)
  );
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [estimateDraft, setEstimateDraft] = useState<EstimateDraft>(() =>
    createEstimateDraft()
  );
  const [dailyGoals, setDailyGoals] = useState<DailyGoals>(
    () => createBlankUserData().dailyGoals
  );
  const [entries, setEntries] = useState<Record<MealSection, FoodEntry[]>>(
    () => createBlankUserData().entries
  );
  const [activeTab, setActiveTab] = useState<ActiveTab>("food");
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [activeWorkoutId, setActiveWorkoutId] = useState<string | null>(null);
  const [newWorkoutName, setNewWorkoutName] = useState("");
  const [exerciseModalOpen, setExerciseModalOpen] = useState(false);
  const [exerciseDraft, setExerciseDraft] = useState<ExerciseDraft>(() =>
    createExerciseDraft()
  );
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ExerciseDraft>(() => createExerciseDraft());
  const hasMounted = useRef(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        hasMounted.current = true;
        return;
      }

      const parsed = JSON.parse(stored) as {
        dailyGoals?: DailyGoals;
        entries?: Record<MealSection, FoodEntry[]>;
        activeUser?: string;
        usersData?: Record<string, UserData>;
        workouts?: Workout[];
      };

      // Legacy storage (pre multi-user removal) nested data under
      // { activeUser, usersData }. Migrate whichever profile was active
      // on this device so existing history isn't lost.
      const legacyUserData =
        parsed.activeUser && parsed.usersData
          ? parsed.usersData[parsed.activeUser]
          : undefined;
      const loaded = legacyUserData ?? parsed;

      if (loaded.dailyGoals) {
        setDailyGoals(loaded.dailyGoals);
      }
      if (loaded.entries) {
        setEntries(loaded.entries);
      }
      if (parsed.workouts) {
        setWorkouts(parsed.workouts);
      }
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ dailyGoals, entries, workouts }));
    } catch {
      // localStorage may be unavailable in some browser modes
    }
  }, [dailyGoals, entries, workouts]);

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
      setEstimateOpen(false);
      return;
    }

    setGoalDraft(createGoalDraft(dailyGoals));
    setEstimateDraft(createEstimateDraft());
    setGoalsOpen(true);
  };

  const updateDailyGoals = (updater: (goals: DailyGoals) => DailyGoals) => {
    setDailyGoals(updater);
  };

  const updateEntries = (
    updater: (entries: Record<MealSection, FoodEntry[]>) => Record<MealSection, FoodEntry[]>
  ) => {
    setEntries(updater);
  };

  const updateWorkouts = (updater: (workouts: Workout[]) => Workout[]) => {
    setWorkouts(updater);
  };

  const activeWorkout = workouts.find((workout) => workout.id === activeWorkoutId) ?? null;

  const handleAddWorkout = () => {
    const name = newWorkoutName.trim();
    if (!name) {
      return;
    }

    updateWorkouts((current) => [...current, { id: generateId(), name, exercises: [] }]);
    setNewWorkoutName("");
  };

  const handleDeleteWorkout = (workoutId: string, workoutName: string) => {
    const confirmed = window.confirm(
      `Delete "${workoutName}"? This will remove all of its exercises.`
    );
    if (!confirmed) {
      return;
    }

    updateWorkouts((current) => current.filter((workout) => workout.id !== workoutId));
    if (activeWorkoutId === workoutId) {
      setActiveWorkoutId(null);
    }
  };

  const handleDeleteExercise = (workoutId: string, exerciseId: string) => {
    updateWorkouts((current) =>
      current.map((workout) =>
        workout.id === workoutId
          ? { ...workout, exercises: workout.exercises.filter((exercise) => exercise.id !== exerciseId) }
          : workout
      )
    );
  };

  const handleAddExercise = () => {
    if (!activeWorkoutId) {
      return;
    }

    const name = exerciseDraft.name.trim();
    if (!name) {
      return;
    }

    const newExercise: GymExercise = {
      id: generateId(),
      name,
      sets: exerciseDraft.sets.trim() || "-",
      weight: exerciseDraft.weight.trim() || "-",
      reps: exerciseDraft.reps.trim() || "-",
    };

    updateWorkouts((current) =>
      current.map((workout) =>
        workout.id === activeWorkoutId
          ? { ...workout, exercises: [...workout.exercises, newExercise] }
          : workout
      )
    );

    setExerciseDraft(createExerciseDraft());
    setExerciseModalOpen(false);
  };

  const startEditExercise = (exercise: GymExercise) => {
    setEditingExerciseId(exercise.id);
    setEditDraft({
      name: exercise.name,
      sets: exercise.sets,
      weight: exercise.weight,
      reps: exercise.reps,
    });
  };

  const cancelEditExercise = () => {
    setEditingExerciseId(null);
  };

  const handleSaveExercise = () => {
    if (!activeWorkoutId || !editingExerciseId) {
      return;
    }

    const name = editDraft.name.trim();
    if (!name) {
      return;
    }

    updateWorkouts((current) =>
      current.map((workout) =>
        workout.id === activeWorkoutId
          ? {
              ...workout,
              exercises: workout.exercises.map((exercise) =>
                exercise.id === editingExerciseId
                  ? {
                      ...exercise,
                      name,
                      sets: editDraft.sets.trim() || "-",
                      weight: editDraft.weight.trim() || "-",
                      reps: editDraft.reps.trim() || "-",
                    }
                  : exercise
              ),
            }
          : workout
      )
    );

    setEditingExerciseId(null);
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
      "Reset today's meals? This will clear all current meal entries but keep your goals."
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
    if (!activeMeal || isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
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
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="page">
      <div className="app-shell">
        <div className="tab-bar" role="tablist" aria-label="Section">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "food"}
            className={`tab-button ${activeTab === "food" ? "tab-button--active" : ""}`}
            onClick={() => setActiveTab("food")}
          >
            Food
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "gym"}
            className={`tab-button tab-button--gym ${activeTab === "gym" ? "tab-button--active" : ""}`}
            onClick={() => setActiveTab("gym")}
          >
            Gym
          </button>
        </div>

        {activeTab === "gym" ? (
          activeWorkout ? (
            <div className="workout-detail">
              <button
                type="button"
                className="back-button"
                onClick={() => {
                  setActiveWorkoutId(null);
                  setEditingExerciseId(null);
                }}
              >
                ← Back to workouts
              </button>

              <div className="workout-detail-header">
                <div>
                  <p className="eyebrow">Workout</p>
                  <h2>{activeWorkout.name}</h2>
                </div>
                <button
                  type="button"
                  className="add-button"
                  onClick={() => {
                    setExerciseDraft(createExerciseDraft());
                    setExerciseModalOpen(true);
                  }}
                  aria-label={`Add exercise to ${activeWorkout.name}`}
                >
                  +
                </button>
              </div>

              <div className="entry-list">
                {activeWorkout.exercises.length === 0 ? (
                  <p className="empty-state">No exercises yet.</p>
                ) : (
                  activeWorkout.exercises.map((exercise) =>
                    editingExerciseId === exercise.id ? (
                      <article key={exercise.id} className="entry-card">
                        <div className="estimate-grid">
                          <label className="goals-field">
                            <span className="goals-label">Exercise</span>
                            <input
                              className="meal-input"
                              value={editDraft.name}
                              onChange={(e) =>
                                setEditDraft((current) => ({ ...current, name: e.target.value }))
                              }
                            />
                          </label>

                          <label className="goals-field">
                            <span className="goals-label">Sets</span>
                            <input
                              className="meal-input"
                              value={editDraft.sets}
                              onChange={(e) =>
                                setEditDraft((current) => ({ ...current, sets: e.target.value }))
                              }
                              inputMode="numeric"
                            />
                          </label>

                          <label className="goals-field">
                            <span className="goals-label">Weight</span>
                            <input
                              className="meal-input"
                              value={editDraft.weight}
                              onChange={(e) =>
                                setEditDraft((current) => ({ ...current, weight: e.target.value }))
                              }
                            />
                          </label>

                          <label className="goals-field">
                            <span className="goals-label">Max reps</span>
                            <input
                              className="meal-input"
                              value={editDraft.reps}
                              onChange={(e) =>
                                setEditDraft((current) => ({ ...current, reps: e.target.value }))
                              }
                              inputMode="numeric"
                            />
                          </label>
                        </div>
                        <div className="entry-edit-actions">
                          <button type="button" className="submit-button" onClick={handleSaveExercise}>
                            Save
                          </button>
                          <button type="button" className="reset-button" onClick={cancelEditExercise}>
                            Cancel
                          </button>
                        </div>
                      </article>
                    ) : (
                      <article key={exercise.id} className="entry-card">
                        <div className="entry-header">
                          <h3>{exercise.name}</h3>
                          <div className="entry-actions">
                            <button
                              type="button"
                              className="edit-button"
                              onClick={() => startEditExercise(exercise)}
                              aria-label={`Edit ${exercise.name}`}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="delete-button"
                              onClick={() => handleDeleteExercise(activeWorkout.id, exercise.id)}
                              aria-label={`Delete ${exercise.name}`}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="entry-metrics">
                          <p className="metric metric--sets">
                            <span className="metric-label">Sets</span>
                            <span className="metric-value">{exercise.sets}</span>
                          </p>
                          <p className="metric metric--weight">
                            <span className="metric-label">Weight</span>
                            <span className="metric-value">{exercise.weight}</span>
                          </p>
                          <p className="metric metric--reps">
                            <span className="metric-label">Max reps</span>
                            <span className="metric-value">{exercise.reps}</span>
                          </p>
                        </div>
                      </article>
                    )
                  )
                )}
              </div>
            </div>
          ) : (
            <div className="workout-list">
              <div className="gym-header">
                <h2>Workouts</h2>
              </div>

              <div className="gym-add-form">
                <input
                  className="meal-input"
                  value={newWorkoutName}
                  onChange={(e) => setNewWorkoutName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAddWorkout();
                    }
                  }}
                  placeholder="New workout name (e.g. Back and Biceps)"
                />
                <button type="button" className="submit-button" onClick={handleAddWorkout}>
                  Add workout
                </button>
              </div>

              {workouts.length === 0 ? (
                <p className="empty-state">No workouts yet. Add one above to get started.</p>
              ) : (
                <div className="workout-grid">
                  {workouts.map((workout, index) => (
                    <div
                      key={workout.id}
                      className={`workout-card workout-card--tint-${(index % 5) + 1}`}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        setActiveWorkoutId(workout.id);
                        setEditingExerciseId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setActiveWorkoutId(workout.id);
                          setEditingExerciseId(null);
                        }
                      }}
                    >
                      <p className="workout-card-name">{workout.name}</p>
                      <p className="workout-card-meta">
                        {workout.exercises.length} exercise{workout.exercises.length === 1 ? "" : "s"}
                      </p>
                      <button
                        type="button"
                        className="delete-button workout-card-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteWorkout(workout.id, workout.name);
                        }}
                        aria-label={`Delete ${workout.name}`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          <>
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
              {goalsOpen ? (
                <button
                  type="button"
                  className="goals-toggle"
                  onClick={() => setEstimateOpen(true)}
                >
                  Estimate my goals
                </button>
              ) : null}
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
                      inputMode="numeric"
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
                      inputMode="numeric"
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
                      inputMode="numeric"
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
            <>
              <p className={`summary-hint ${goalsPctOk ? "" : "summary-subvalue--over"}`}>
                Macro percentages should add up to <strong>100%</strong>.
              </p>
              <p className="summary-footnote">
                Want a quick starting point? Estimate your goals using your personal details.
              </p>
            </>
          ) : null}
        </section>

        {estimateOpen ? (
          <div className="modal-backdrop" role="presentation" onClick={() => setEstimateOpen(false)}>
            <div
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="estimate-modal-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div>
                  <p className="modal-eyebrow">Estimate goals</p>
                  <h2 id="estimate-modal-title">Calculate a goal plan</h2>
                </div>
                <button
                  type="button"
                  className="close-button"
                  onClick={() => setEstimateOpen(false)}
                >
                  ×
                </button>
              </div>

              <div className="estimate-grid">
                <label className="goals-field">
                  <span className="goals-label">Sex</span>
                  <select
                    className="meal-input"
                    value={estimateDraft.sex}
                    onChange={(e) =>
                      setEstimateDraft((current) => ({
                        ...current,
                        sex: e.target.value as EstimateDraft["sex"],
                      }))
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </label>

                <label className="goals-field">
                  <span className="goals-label">Age</span>
                  <input
                    className="meal-input"
                    type="number"
                    min={10}
                    max={120}
                    value={estimateDraft.age}
                    onChange={(e) =>
                      setEstimateDraft((current) => ({
                        ...current,
                        age: e.target.value,
                      }))
                    }
                    inputMode="numeric"
                  />
                </label>

                <label className="goals-field">
                  <span className="goals-label">Height</span>
                  <div className="estimate-height-row">
                    <input
                      className="meal-input"
                      type="number"
                      min={3}
                      max={8}
                      value={estimateDraft.feet}
                      onChange={(e) =>
                        setEstimateDraft((current) => ({
                          ...current,
                          feet: e.target.value,
                        }))
                      }
                      aria-label="Height in feet"
                      placeholder="ft"
                      inputMode="numeric"
                    />
                    <input
                      className="meal-input"
                      type="number"
                      min={0}
                      max={11}
                      value={estimateDraft.inches}
                      onChange={(e) =>
                        setEstimateDraft((current) => ({
                          ...current,
                          inches: e.target.value,
                        }))
                      }
                      aria-label="Height in inches"
                      placeholder="in"
                      inputMode="numeric"
                    />
                  </div>
                </label>

                <label className="goals-field">
                  <span className="goals-label">Weight (lb)</span>
                  <input
                    className="meal-input"
                    type="number"
                    min={70}
                    max={400}
                    value={estimateDraft.pounds}
                    onChange={(e) =>
                      setEstimateDraft((current) => ({
                        ...current,
                        pounds: e.target.value,
                      }))
                    }
                    inputMode="numeric"
                  />
                </label>

                <label className="goals-field">
                  <span className="goals-label">Activity level</span>
                  <select
                    className="meal-input"
                    value={estimateDraft.activity}
                    onChange={(e) =>
                      setEstimateDraft((current) => ({
                        ...current,
                        activity: e.target.value as EstimateDraft["activity"],
                      }))
                    }
                  >
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Lightly active</option>
                    <option value="moderate">Moderately active</option>
                    <option value="active">Very active</option>
                    <option value="very-active">Extra active</option>
                  </select>
                </label>

                <label className="goals-field">
                  <span className="goals-label">Goal</span>
                  <select
                    className="meal-input"
                    value={estimateDraft.goal}
                    onChange={(e) =>
                      setEstimateDraft((current) => ({
                        ...current,
                        goal: e.target.value as EstimateDraft["goal"],
                      }))
                    }
                  >
                    <option value="lose">Lose weight</option>
                    <option value="maintain">Maintain weight</option>
                    <option value="gain">Gain weight</option>
                  </select>
                </label>
              </div>

              <p className="summary-footnote">
                These are estimates only. Use them as a starting point, not medical advice.
              </p>

              <button
                type="button"
                className="submit-button"
                onClick={() => {
                  const bmr = bmrEstimate(estimateDraft);
                  const maintenance = bmr * activityFactor(estimateDraft.activity);
                  const targetCalories = Math.max(0, Math.round(maintenance + goalCaloriesAdjustment(estimateDraft.goal)));
                  const macros = estimateMacros(estimateDraft.goal);

                  updateDailyGoals(() => ({
                    calories: String(targetCalories),
                    proteinPct: macros.proteinPct,
                    carbsPct: macros.carbsPct,
                    fatPct: macros.fatPct,
                  }));
                  setGoalDraft({
                    calories: String(targetCalories),
                    proteinPct: String(macros.proteinPct),
                    carbsPct: String(macros.carbsPct),
                    fatPct: String(macros.fatPct),
                  });
                  setEstimateOpen(false);
                }}
              >
                Apply estimate
              </button>
            </div>
          </div>
        ) : null}
        
        <div className="meal-list">
          {mealSections.map((meal) => (
            <section
              key={meal}
              className={`meal-section meal-section--${meal.toLowerCase()}`}
            >
              <div className="meal-header">
                <div>
                  <h2>{meal}</h2>
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
          </>
        )}
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

            <button
              type="button"
              className="submit-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Save entry"}
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

      {exerciseModalOpen && activeWorkout ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setExerciseModalOpen(false)}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="exercise-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <p className="modal-eyebrow">New exercise</p>
                <h2 id="exercise-modal-title">Add to {activeWorkout.name}</h2>
              </div>
              <button
                type="button"
                className="close-button"
                onClick={() => setExerciseModalOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="estimate-grid">
              <label className="goals-field">
                <span className="goals-label">Exercise</span>
                <input
                  className="meal-input"
                  value={exerciseDraft.name}
                  onChange={(e) =>
                    setExerciseDraft((current) => ({ ...current, name: e.target.value }))
                  }
                  placeholder="e.g. Bent over row"
                />
              </label>

              <label className="goals-field">
                <span className="goals-label">Sets</span>
                <input
                  className="meal-input"
                  value={exerciseDraft.sets}
                  onChange={(e) =>
                    setExerciseDraft((current) => ({ ...current, sets: e.target.value }))
                  }
                  placeholder="3"
                  inputMode="numeric"
                />
              </label>

              <label className="goals-field">
                <span className="goals-label">Weight</span>
                <input
                  className="meal-input"
                  value={exerciseDraft.weight}
                  onChange={(e) =>
                    setExerciseDraft((current) => ({ ...current, weight: e.target.value }))
                  }
                  placeholder="45 lb"
                />
              </label>

              <label className="goals-field">
                <span className="goals-label">Max reps</span>
                <input
                  className="meal-input"
                  value={exerciseDraft.reps}
                  onChange={(e) =>
                    setExerciseDraft((current) => ({ ...current, reps: e.target.value }))
                  }
                  placeholder="10"
                  inputMode="numeric"
                />
              </label>
            </div>

            <button type="button" className="submit-button" onClick={handleAddExercise}>
              Add exercise
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}