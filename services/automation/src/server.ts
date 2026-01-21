import type { AutomationConfig, AutomationTask, OutputTarget } from "./types"
import { mapGithubEvent, verifySignature } from "./webhooks/github"

type TaskResult = { stdout: string; stderr: string; exitCode: number }

export type RunRecord = {
  id: number
  taskId: string
  trigger: string
  status: "running" | "success" | "failure"
  startedAt: string
  finishedAt?: string
  exitCode?: number
  stdout?: string
  stderr?: string
}

export type AutomationServerDeps = {
  apiKey: string
  port?: number
  webhookSecret: string
  runTask: (task: AutomationTask, taskId: string) => Promise<TaskResult>
  publishReport: (input: { taskId: string; outputs?: OutputTarget[]; result: TaskResult }) => Promise<void>
  log?: (message: string) => void
}

export type AutomationServer = {
  port: number
  stop: () => void
  runs: RunRecord[]
  triggerRun: (taskId: string, trigger: string) => void
}

type AutomationEvent =
  | { type: "run.started"; data: RunRecord }
  | { type: "run.finished"; data: RunRecord }
  | { type: "system.event"; data: { message: string } }

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  })
}

function parseBearerToken(header: string | null) {
  if (!header) return null
  const [scheme, token] = header.split(" ")
  if (!scheme || scheme.toLowerCase() !== "bearer") return null
  return token || null
}

function requireJson(request: Request) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) {
    return { error: jsonResponse(415, { error: { code: "invalid_content_type", message: "Expected application/json" } }) }
  }
  return { error: null }
}

export function createAutomationServer(config: AutomationConfig, deps: AutomationServerDeps): AutomationServer {
  const runs: RunRecord[] = []
  let runId = 0
  const sockets = new Set<WebSocket>()
  const apiKey = deps.apiKey
  const webhookSecret = deps.webhookSecret

  const log = deps.log ?? (() => {})

  function isAuthorized(request: Request) {
    const token = parseBearerToken(request.headers.get("authorization"))
    return Boolean(token && token === apiKey)
  }

  function broadcast(event: AutomationEvent) {
    const payload = JSON.stringify(event)
    for (const socket of sockets) {
      socket.send(payload)
    }
  }

  async function executeTask(taskId: string, trigger: string) {
    const task = config.tasks[taskId]
    if (!task) return
    const run: RunRecord = {
      id: ++runId,
      taskId,
      trigger,
      status: "running",
      startedAt: new Date().toISOString(),
    }
    runs.unshift(run)
    broadcast({ type: "run.started", data: run })
    try {
      const result = await deps.runTask(task, taskId)
      run.status = result.exitCode === 0 ? "success" : "failure"
      run.exitCode = result.exitCode
      run.stdout = result.stdout
      run.stderr = result.stderr
      run.finishedAt = new Date().toISOString()
      await deps.publishReport({ taskId, outputs: task.outputs, result })
    } catch (error) {
      run.status = "failure"
      run.exitCode = 1
      run.stderr = String(error)
      run.finishedAt = new Date().toISOString()
      log(`Failed to run task ${taskId}: ${String(error)}`)
    }
    broadcast({ type: "run.finished", data: run })
  }

  const server = Bun.serve({
    port: deps.port ?? config.server.port,
    fetch: async (request) => {
      const url = new URL(request.url)

      if (url.pathname === config.server.webhookPath) {
        if (request.method !== "POST") return jsonResponse(405, { error: { code: "method_not_allowed", message: "POST required" } })
        const body = await request.text()
        const signature = request.headers.get("x-hub-signature-256") ?? undefined
        if (!verifySignature(webhookSecret, body, signature)) {
          return jsonResponse(401, { error: { code: "invalid_signature", message: "Invalid webhook signature" } })
        }
        const event = request.headers.get("x-github-event")
        if (!event) return jsonResponse(400, { error: { code: "missing_event", message: "Missing x-github-event header" } })
        const payload = JSON.parse(body)
        const mapped = mapGithubEvent(event, payload)
        if (!mapped) return jsonResponse(202, { ok: true })
        const triggers = config.triggers ?? []
        for (const trigger of triggers) {
          if (trigger.event === mapped) void executeTask(trigger.taskId, `webhook:${mapped}`)
        }
        return jsonResponse(200, { ok: true })
      }

      if (url.pathname === "/ws") {
        if (!isAuthorized(request)) {
          return jsonResponse(401, { error: { code: "unauthorized", message: "Missing or invalid API key" } })
        }
        const upgraded = server.upgrade(request)
        if (upgraded) return new Response(null, { status: 101 })
        return jsonResponse(400, { error: { code: "upgrade_failed", message: "WebSocket upgrade failed" } })
      }

      if (url.pathname.startsWith("/api/v1")) {
        if (!isAuthorized(request)) {
          return jsonResponse(401, { error: { code: "unauthorized", message: "Missing or invalid API key" } })
        }

        if (request.method === "GET" && url.pathname === "/api/v1/health") {
          return jsonResponse(200, { status: "ok" })
        }

        if (request.method === "GET" && url.pathname === "/api/v1/config") {
          return jsonResponse(200, {
            server: config.server,
            schedules: config.schedules ?? [],
            triggers: config.triggers ?? [],
          })
        }

        if (request.method === "GET" && url.pathname === "/api/v1/tasks") {
          return jsonResponse(200, {
            tasks: Object.entries(config.tasks).map(([id, task]) => ({ id, ...task })),
          })
        }

        if (request.method === "GET" && url.pathname === "/api/v1/schedules") {
          return jsonResponse(200, { schedules: config.schedules ?? [] })
        }

        if (request.method === "GET" && url.pathname === "/api/v1/triggers") {
          return jsonResponse(200, { triggers: config.triggers ?? [] })
        }

        if (url.pathname === "/api/v1/runs" && request.method === "GET") {
          return jsonResponse(200, { runs })
        }

        if (url.pathname === "/api/v1/runs" && request.method === "POST") {
          const contentTypeCheck = requireJson(request)
          if (contentTypeCheck.error) return contentTypeCheck.error
          let payload: { taskId?: string; trigger?: string }
          try {
            payload = (await request.json()) as { taskId?: string; trigger?: string }
          } catch {
            return jsonResponse(400, { error: { code: "invalid_json", message: "Invalid JSON payload" } })
          }
          if (!payload.taskId || !config.tasks[payload.taskId]) {
            return jsonResponse(404, { error: { code: "task_not_found", message: "Task not found" } })
          }
          void executeTask(payload.taskId, payload.trigger ?? "manual")
          const latest = runs[0]
          return jsonResponse(201, { run: latest })
        }

        const runMatch = url.pathname.match(/^\/api\/v1\/runs\/(\d+)$/)
        if (request.method === "GET" && runMatch) {
          const id = Number(runMatch[1])
          const run = runs.find((entry) => entry.id === id)
          if (!run) return jsonResponse(404, { error: { code: "run_not_found", message: "Run not found" } })
          return jsonResponse(200, { run })
        }

        return jsonResponse(404, { error: { code: "not_found", message: "Unknown API route" } })
      }

      return jsonResponse(404, { error: { code: "not_found", message: "Route not found" } })
    },
    websocket: {
      open: (ws) => {
        sockets.add(ws)
        ws.send(JSON.stringify({ type: "system.event", data: { message: "connected" } }))
      },
      close: (ws) => {
        sockets.delete(ws)
      },
    },
  })

  return {
    port: server.port,
    stop: () => server.stop(true),
    runs,
    triggerRun: (taskId, trigger) => {
      void executeTask(taskId, trigger)
    },
  }
}
