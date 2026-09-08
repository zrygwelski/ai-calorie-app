@AGENTS.md

# Calorie Club — Project Guide

Calorie Club is a lightweight, personal calorie/macro tracker with an AI-assisted food-logging flow. This document describes the current architecture as it exists in the codebase today.

## Technology Stack

- **Next.js 16.2.3** — App Router (`app/` directory)
- **React 19.2.4** / **react-dom 19.2.4**
- **TypeScript 5**
- **Tailwind CSS v4** (via `@tailwindcss/postcss`) — configured, but the app's visual design is driven primarily by a large hand-written `app/globals.css`, not Tailwind utility classes
- **OpenAI SDK (`openai` ^6.34.0)** — used server-side only, to parse natural-language food descriptions into structured nutrition data (model: `gpt-4.1-mini`)
- **No database** — all application data is persisted client-side via `localStorage`
- **No test suite** currently exists

## Project Structure

```
app/
  layout.tsx                 Root layout: fonts (Geist Sans/Mono), page metadata
  page.tsx                   Entire Calorie Club UI + client state (single component, ~1000 lines)
  globals.css                All app styling/theming (dark theme, CSS custom properties)
  api/parse-food/route.ts    POST route: calls OpenAI to convert free text into structured food items
  suzie/, zach/               Empty directories — no files currently; not wired into routing
public/                       Static assets (SVGs, calorieclublogo.png)
```

There is no `components/`, `lib/`, or `hooks/` directory — this is intentionally a single-file application. All UI, state, and domain logic live in `app/page.tsx`.

## Application Architecture

### Single-component design

`app/page.tsx` is a `"use client"` component (`Home()`) that owns all UI rendering and state for the app. There is no client-side routing beyond the single root page, and no server components hold state — the only server-side code is the `/api/parse-food` route handler.

### Data model

- `UserName` — a fixed union of allowed users: `"Zach" | "Suzie" | "Munch" | "Andrew" | "Brian"`. Users are not authenticated accounts; they are simply named local profiles selectable from a dropdown menu.
- `MealSection` — `"Breakfast" | "Lunch" | "Dinner" | "Snacks"`, a fixed set (not user-configurable).
- `FoodEntry` — `{ name, quantity, calories, protein, carbs, fat }`. Numeric fields are typed as `number | string` because values may arrive as `"-"` placeholders when the AI parse fails to produce a field.
- `UserData` — `{ dailyGoals: DailyGoals, entries: Record<MealSection, FoodEntry[]> }`, one per user.
- `DailyGoals` — `{ calories: string, proteinPct: number, carbsPct: number, fatPct: number }`. Goals are stored as a calorie target plus macro percentages (not gram targets); gram targets are derived at render time.
- `StoredData` — `{ activeUser: UserName, usersData: Record<UserName, UserData> }`, the full shape persisted to `localStorage`.

### State & persistence

- All state is managed with plain React `useState`/`useEffect`/`useRef` — there is no external state management library (no Redux/Zustand/Context).
- Persistence key: `"calorie-club-data"` in `localStorage`.
- On mount, a `useEffect` reads and `JSON.parse`s stored data, merging it over `initialUsersData` defaults (so new users/fields added in code won't crash on old stored data). A `hasMounted` ref guards against writing to storage before this initial load completes (avoids clobbering existing data with default state on first render).
- A second `useEffect` writes `{ activeUser, usersData }` to `localStorage` any time either changes, after mount.
- All mutations to user data go through two helpers that immutably update `usersData` scoped to `activeUser`: `updateDailyGoals(updater)` and `updateEntries(updater)`. New state logic should follow this same pattern rather than mutating `usersData` directly, to keep per-user data isolated and updates immutable.

### Derived state (compute, don't store)

Totals, remaining calories/macros, and gram targets from percentage goals are all computed inline in the render body from `entries` and `dailyGoals` — they are never stored in state. Follow this convention: goals are stored as calories + macro percentages, and grams/remaining values are always derived (see `totals`, `goalProteinGrams`, `remainingCalories`, etc. in `page.tsx`).

### Goal editing flow

- `goalsOpen` toggles an inline edit mode on the summary cards (draft values live in `goalDraft`, a string-based shadow of `DailyGoals` suited to controlled inputs).
- Closing the editor (`toggleGoalsOpen`) normalizes and commits the draft via `normalizeCaloriesInput`/`normalizePercentageInput`.
- A separate "Estimate my goals" modal (`estimateOpen`/`estimateDraft`) computes a suggested calorie target using the **Mifflin-St Jeor** BMR formula (`bmrEstimate`), an activity multiplier (`activityFactor`), and a goal-based calorie adjustment (`goalCaloriesAdjustment`, ±300 kcal for lose/gain), plus goal-appropriate macro percentage presets (`estimateMacros`). Applying the estimate writes directly into `dailyGoals` and syncs `goalDraft`.

### AI food-parsing flow

1. User opens a meal's "+" modal, types a free-text food description (`input`), and submits.
2. Client `POST`s `{ input }` to `/api/parse-food`.
3. `app/api/parse-food/route.ts` sends the text to OpenAI (`gpt-4.1-mini`) with a system prompt that mandates strict JSON output in the shape `{ items: [{ name, quantity, calories, protein, carbs, fat }] }`, with guidance to split multi-food descriptions into separate items and estimate complex dishes as a single item.
4. Client strips any Markdown code-fence wrapping, extracts the JSON object substring (`extractJsonObject`) defensively in case the model adds stray text, and parses it.
5. Parsed items are normalized into `FoodEntry[]` (missing fields fall back to `"-"`) and appended to the active meal's entries via `updateEntries`.
6. On any parse failure, the raw model output is shown in an error panel (`rawOutput`) rather than silently failing, to aid debugging bad AI responses.

### Styling conventions

- Dark theme defined via CSS custom properties in `:root`/`body` in `globals.css` (e.g. `--surface-0/1/2`, `--text-1/2/3`, `--border-1/2`).
- Each macro (calories/protein/carbs/fat) has a dedicated color token (`--macro-calories`, `--macro-protein`, `--macro-carbs`, `--macro-fat`) applied via `macro macro--<name>` class pairs — reuse these classes for any new macro-related UI rather than introducing new colors.
- Each meal section has an RGB tint token (`--tint-breakfast`, etc.) used for meal-specific accents via `meal-section--<mealname>` classes.
- Component styling is done with descriptive, hyphenated class names (BEM-ish: `summary-stat--calories`, `entry-header`, `modal-backdrop`) rather than Tailwind utilities — new UI should follow this existing naming convention for consistency, even though Tailwind is available.

## Development Guidelines

- **Read `AGENTS.md` first** (included at the top of this file) — this project pins a Next.js version whose APIs/conventions may differ from general training data; check `node_modules/next/dist/docs/` before writing Next.js-specific code (routing, server actions, config, etc.).
- Keep new user-data mutations flowing through `updateDailyGoals`/`updateEntries` so persistence and per-user isolation keep working automatically.
- Keep derived values (totals, remaining amounts, gram targets) computed at render time rather than duplicated into stored state, to avoid drift between stored goals and displayed values.
- `OPENAI_API_KEY` is required in `.env.local` for the `/api/parse-food` route to function; never commit this file or log its value.
- There is no test suite — verify UI changes manually via `npm run dev` (`http://localhost:3000`).
- The `app/suzie` and `app/zach` directories are currently empty and not part of any active route; don't assume they contain conventions to follow until they're populated.
