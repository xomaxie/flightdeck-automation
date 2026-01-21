# FlightDeck Automation Service

Standalone automation server for running opencode tasks on schedules or GitHub webhooks.

## Quickstart

```bash
cd services/automation
bun install
AUTOMATION_API_KEY=dev-key bun dev
```

## Configuration

Default config path: `config/automation.jsonc`

Environment variables:
- `AUTOMATION_API_KEY`: API key for REST/WS access (required)
- `AUTOMATION_CONFIG`: Override config file path
- `AUTOMATION_PORT`: HTTP port (default: 4098)
- `GITHUB_WEBHOOK_SECRET`: GitHub webhook secret
- `GITHUB_TOKEN`: GitHub token for comment outputs
- `SLACK_WEBHOOK_URL`: Slack webhook URL (if used by tasks)

## API

- `GET /api/v1/health`
- `GET /api/v1/config`
- `GET /api/v1/tasks`
- `GET /api/v1/schedules`
- `GET /api/v1/triggers`
- `GET /api/v1/runs`
- `GET /api/v1/runs/:id`
- `POST /api/v1/runs`
- `WS /ws`

All endpoints require `Authorization: Bearer <API_KEY>`.

## Tests

```bash
cd services/automation
bun test
```
