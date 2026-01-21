# FlightDeck Automation Service

Standalone automation server for running opencode tasks on schedules or GitHub webhooks.

## Quickstart

```bash
cd services/automation
bun install
bun dev
```

## Configuration

Default config path: `config/automation.jsonc`

Environment variables:
- `AUTOMATION_CONFIG`: Override config file path
- `AUTOMATION_PORT`: HTTP port (default: 4098)
- `GITHUB_WEBHOOK_SECRET`: GitHub webhook secret
- `GITHUB_TOKEN`: GitHub token for comment outputs
- `SLACK_WEBHOOK_URL`: Slack webhook URL (if used by tasks)

## Tests

```bash
cd services/automation
bun test
```
