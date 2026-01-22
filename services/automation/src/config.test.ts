import { test, expect } from "bun:test"
import { parseAutomationConfig } from "./config"

test("parses valid automation config", () => {
  const raw = `{
    "server": { "port": 4098, "webhookPath": "/webhooks/github" },
    "opencode": { "bin": "opencode" },
    "tasks": { "daily": { "type": "prompt", "prompt": "hello" } },
    "schedules": [{ "taskId": "daily", "cron": "0 9 * * *" }]
  }`
  const config = parseAutomationConfig(raw)
  expect(config.server.port).toBe(4098)
  expect(config.tasks.daily.type).toBe("prompt")
})

test("parses model on prompt task", () => {
  const raw = `{
    "server": { "port": 4098, "webhookPath": "/webhooks/github" },
    "opencode": { "bin": "opencode" },
    "tasks": { "daily": { "type": "prompt", "prompt": "hello", "model": "gpt-4.1" } }
  }`
  const config = parseAutomationConfig(raw)
  expect(config.tasks.daily).toEqual(expect.objectContaining({ model: "gpt-4.1" }))
})
