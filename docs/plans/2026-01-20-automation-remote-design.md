# Automation Remote Service Design

**Goal:** Split the automation server into a standalone repository that can run locally or remotely, with the FlightDeck web UI and launcher acting as thin clients.

## Architecture

The automation server becomes its own repo (e.g., `flightdeck-automation`) with a Bun/TypeScript runtime. It owns config loading, scheduling, webhook intake, task execution, reporting, and persistence. The server exposes a REST API for commands and a WebSocket endpoint for live events. Authentication is a shared API key passed as `Authorization: Bearer <key>` for both REST and WS. The FlightDeck launcher starts/stops the server locally or connects to a remote URL, and the web UI uses the same API surface for all automation views.

## Components

- **Config + scheduler:** JSONC config parser with cron schedules and GitHub event triggers.
- **Task runner:** Executes opencode tasks (prompt/plan/command) and captures stdout/stderr.
- **Persistence:** SQLite optional for runs, schedules, triggers, and recent output metadata.
- **REST API:** Task discovery, run creation, run history, and health/config endpoints.
- **WebSocket:** Broadcasts run lifecycle events and optional log tail updates.
- **Publishers:** GitHub comment and Slack webhook outputs invoked after run completion.

## Data Flow

On startup, the server loads config, initializes storage, and registers schedules and webhook routes. When a schedule fires or a webhook matches, the server creates a run record, executes the task, writes the results, and emits `run.started` and `run.finished` events. REST endpoints allow the UI to list tasks/schedules, trigger runs, and inspect run history. The UI opens a WS connection to receive live updates and log tails. Webhook handlers validate signatures and enqueue runs; they respond quickly to avoid GitHub timeouts.

## API Sketch

- `GET /api/v1/health` → basic uptime/status
- `GET /api/v1/config` → sanitized config metadata
- `GET /api/v1/tasks` → task definitions
- `GET /api/v1/runs` → run history (pagination)
- `GET /api/v1/runs/:id` → run details
- `POST /api/v1/runs` → trigger run `{ taskId, trigger }`
- `WS /ws` → events: `run.started`, `run.progress`, `run.finished`, `system.event`

All routes require `Authorization: Bearer <API_KEY>`; unauthenticated requests return 401.

## Error Handling

REST errors return `{ error: { code, message } }` with appropriate status codes. Task failures are normal outcomes recorded as `status: failed` and still emit `run.finished`. Webhooks with invalid signatures return 401; unknown events return 202 without scheduling a run. WS connections close with explicit codes on auth failure.

## Testing

- Unit tests for config parsing, command building, scheduler registration, webhook mapping.
- Storage tests with SQLite in-memory DB for runs and query behavior.
- API tests for auth gating and run creation.
- WS integration test that connects, triggers a run, and asserts event emission.
- Manual smoke test: `bun dev` + curl to `POST /api/v1/runs`.

## Migration Plan

1. Extract `services/automation` into a new repo preserving structure.
2. Wrap existing scheduler/webhook/task-runner logic with REST + WS layers.
3. Add API key auth and storage backing for runs.
4. Update FlightDeck launcher to manage server profiles (local/remote).
5. Update web UI to use REST + WS clients instead of direct coupling.
