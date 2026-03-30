# Nongsha

Nongsha is a local-first PWA for the exact moment when you have a little time, a messy head, and no clue what to do next.

The app keeps the raw note on-device, sends it to a thin parse endpoint only when you explicitly ask, then turns the result into editable goals and tasks. Recommendation stays local and deterministic so the app can explain itself instead of acting like a slot machine.

## What Exists Today

- `Capture` page for raw-note entry and explicit parsing
- Editable structured draft with field locks, so user edits beat future reparses
- `Home` page with local recommendation scoring, lightweight weekly/daily markers, and execution logging
- `Report` page with believable progress metrics, not fake timer precision
- Thin Express API at `/api/parse`
- IndexedDB persistence through Dexie
- Unit tests for merge, scoring, reporting, and parser contracts
- Playwright end-to-end test for the core capture -> recommend -> done -> report loop

## Stack

- React 19 + TypeScript
- Vite 8
- Express 5 for the thin parse API and unified dev server
- Dexie for local-first IndexedDB storage
- Vitest + Playwright for test coverage

## Run It

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:5173`.

## Test It

```bash
npm run typecheck
npm run lint
npm test
```

## Parse Modes

Nongsha supports two parse modes:

1. `Remote parse`
   If a compatible OpenAI-style provider is configured, the parse endpoint will try the remote model first.
2. `Heuristic fallback`
   If no provider is configured, or the request fails, Nongsha falls back to a deterministic local parser so the product still works.

The server never needs to persist raw notes for parsing.

## Environment

Copy `.env.example` if you want remote parsing.

Supported variables today:

- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL`
- `ARK_API_KEY`
- `ARK_BASE_URL`
- `ARK_MODEL`
- `DISABLE_REMOTE_PARSE=true`

## Important Product Rules In Code

- Raw note is canonical for capture and auditability.
- User-edited structured fields stay authoritative on reparse.
- Recommendations are derived locally, but each shown recommendation gets a persisted snapshot event.
- Execution creates its own event so reports and history do not drift when scoring changes later.
