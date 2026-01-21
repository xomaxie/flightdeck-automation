import { test, expect } from "bun:test"
import { createAutomationServer } from "./server"
import type { AutomationConfig } from "./types"

const baseConfig: AutomationConfig = {
  server: { port: 0, webhookPath: "/webhooks/github" },
  opencode: { bin: "opencode" },
  tasks: {
    daily: { type: "prompt", prompt: "hello" },
  },
}

test("requires api key for health", async () => {
  const server = createAutomationServer(baseConfig, {
    apiKey: "secret",
    port: 0,
    webhookSecret: "",
    runTask: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }),
    publishReport: async () => {},
  })
  try {
    const baseUrl = `http://127.0.0.1:${server.port}`
    const unauthorized = await fetch(`${baseUrl}/api/v1/health`)
    expect(unauthorized.status).toBe(401)

    const authorized = await fetch(`${baseUrl}/api/v1/health`, {
      headers: { authorization: "Bearer secret" },
    })
    expect(authorized.status).toBe(200)
  } finally {
    server.stop()
  }
})

test("creates run via api", async () => {
  const server = createAutomationServer(baseConfig, {
    apiKey: "secret",
    port: 0,
    webhookSecret: "",
    runTask: async () => ({ stdout: "ok", stderr: "", exitCode: 0 }),
    publishReport: async () => {},
  })
  try {
    const baseUrl = `http://127.0.0.1:${server.port}`
    const response = await fetch(`${baseUrl}/api/v1/runs`, {
      method: "POST",
      headers: {
        authorization: "Bearer secret",
        "content-type": "application/json",
      },
      body: JSON.stringify({ taskId: "daily", trigger: "manual" }),
    })

    expect(response.status).toBe(201)
    const payload = (await response.json()) as { run: { id: number } }
    expect(payload.run.id).toBeGreaterThan(0)

    await new Promise((resolve) => setTimeout(resolve, 20))
    const runResponse = await fetch(`${baseUrl}/api/v1/runs/${payload.run.id}`, {
      headers: { authorization: "Bearer secret" },
    })
    expect(runResponse.status).toBe(200)
  } finally {
    server.stop()
  }
})
