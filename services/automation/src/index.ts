import { createServer } from "node:http"
import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = process.env.AUTOMATION_CONFIG ?? join(__dirname, "..", "..", "..", "config", "automation.jsonc")

async function main() {
  const { parseAutomationConfig } = await import("./config")
  const { registerSchedules } = await import("./scheduler")
  const { runTask } = await import("./task-runner")
  const { formatReport } = await import("./reporting")
  const { postGithubComment } = await import("./outputs/github")
  const { postSlackMessage } = await import("./outputs/slack")
  const { mapGithubEvent, verifySignature } = await import("./webhooks/github")
  const { OutputTarget } = await import("./types")

  const PORT = Number(process.env.AUTOMATION_PORT ?? 4098)
  const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET ?? ""
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? ""

  function resolveTaskOutputs(outputs?: OutputTarget[]) {
    return outputs ?? []
  }

  async function executeTask(taskId: string, config: ReturnType<typeof parseAutomationConfig>) {
    const task = config.tasks[taskId]
    if (!task) return
    const result = await runTask(task, config.opencode.bin, config.opencode.defaultWorkingDir)
    const report = formatReport({ taskId, ...result })
    for (const output of resolveTaskOutputs(task.outputs)) {
      if (output.type === "github") await postGithubComment(GITHUB_TOKEN, output.repo, output.issueOrPrNumber ?? 0, report)
      if (output.type === "slack") await postSlackMessage(process.env[output.webhookUrlEnv] ?? "", report)
    }
  }

  const raw = readFileSync(CONFIG_PATH, "utf8")
  const config = parseAutomationConfig(raw)

  registerSchedules(config, (taskId) => executeTask(taskId, config))

  createServer(async (req, res) => {
    if (req.url !== config.server.webhookPath || req.method !== "POST") {
      res.writeHead(404).end()
      return
    }
    const body = await new Response(req).text()
    const signature = req.headers["x-hub-signature-256"] as string | undefined
    if (!verifySignature(WEBHOOK_SECRET, body, signature)) {
      res.writeHead(401).end()
      return
    }
    const event = req.headers["x-github-event"] as string | undefined
    if (!event) {
      res.writeHead(400).end()
      return
    }
    const payload = JSON.parse(body)
    const mapped = mapGithubEvent(event, payload)
    if (mapped) {
      const triggers = config.triggers ?? []
      for (const trigger of triggers) {
        if (trigger.event === mapped) await executeTask(trigger.taskId, config)
      }
    }
    res.writeHead(200).end()
  }).listen(PORT)

  console.log(`Automation service listening on port ${PORT}`)
}

main()
