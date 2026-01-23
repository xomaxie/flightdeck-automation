import { readFileSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { parseAutomationConfig } from "./config"
import { registerSchedules } from "./scheduler"
import { runTask } from "./task-runner"
import { formatReport } from "./reporting"
import { postGithubComment } from "./outputs/github"
import { postSlackMessage } from "./outputs/slack"
import { createAutomationServer } from "./server"
import type { OutputTarget } from "./types"

const __dirname = dirname(fileURLToPath(import.meta.url))
const CONFIG_PATH = process.env.AUTOMATION_CONFIG ?? join(__dirname, "..", "..", "..", "config", "automation.jsonc")

export async function main() {
  const port = Number(process.env.AUTOMATION_PORT ?? 4098)
  const apiKey = process.env.AUTOMATION_API_KEY ?? ""
  const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? ""
  const githubTokenFallback = process.env.GITHUB_TOKEN ?? ""
  const extensionManagerUrl = process.env.EXTENSION_MANAGER_URL ?? ""
  const extensionId = process.env.EXTENSION_ID ?? ""
  const extensionRuntimeToken = process.env.EXTENSION_RUNTIME_TOKEN ?? ""

  if (!apiKey) {
    throw new Error("AUTOMATION_API_KEY is required")
  }

  const raw = readFileSync(CONFIG_PATH, "utf8")
  const config = parseAutomationConfig(raw)
  const tokenCache = new Map<string, string>()

  function resolveTaskOutputs(outputs?: OutputTarget[]) {
    return outputs ?? []
  }

  function resolveConnectionId(taskId: string, output?: OutputTarget) {
    if (output?.type === "github" && output.connectionId) return output.connectionId
    const task = config.tasks[taskId]
    const taskConnection =
      task && "githubConnectionId" in task && typeof task.githubConnectionId === "string"
        ? task.githubConnectionId
        : undefined
    const defaultConnection =
      typeof config.github?.defaultConnectionId === "string" ? config.github.defaultConnectionId : undefined
    return taskConnection || defaultConnection
  }

  async function fetchSecret(secretKey: string) {
    if (!extensionManagerUrl || !extensionId || !extensionRuntimeToken) return undefined
    if (tokenCache.has(secretKey)) return tokenCache.get(secretKey)
    const url = `${extensionManagerUrl.replace(/\/+$/, "")}/api/v1/extensions/${extensionId}/secrets/${encodeURIComponent(secretKey)}`
    try {
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${extensionRuntimeToken}` },
      })
      if (!res.ok) return undefined
      const data = (await res.json()) as { value?: string }
      if (typeof data.value !== "string" || !data.value.trim()) return undefined
      tokenCache.set(secretKey, data.value)
      return data.value
    } catch (error) {
      console.warn(`Failed to fetch GitHub token from extension manager: ${String(error)}`)
      return undefined
    }
  }

  async function resolveGithubToken(taskId: string, output?: OutputTarget) {
    const connectionId = resolveConnectionId(taskId, output)
    if (!connectionId) return githubTokenFallback
    const connection = config.connections?.find((item) => item.id === connectionId)
    const secretKey = connection?.secretKey ?? `github:${connectionId}`
    const token = await fetchSecret(secretKey)
    return token ?? githubTokenFallback
  }

  const server = createAutomationServer(config, {
    apiKey,
    port,
    webhookSecret,
    runTask: (task, taskId, context) =>
      runTask(task, config.opencode.bin, config.opencode.defaultWorkingDir, context),
    publishReport: async ({ taskId, outputs, result, context }) => {
      const report = formatReport({ taskId, ...result })
      for (const output of resolveTaskOutputs(outputs)) {
        if (output.type === "github") {
          const repo = output.repo ?? context?.repo
          const issueOrPrNumber = output.issueOrPrNumber ?? context?.issueOrPrNumber
          if (!repo || !issueOrPrNumber) {
            console.warn(`Skipping GitHub output for ${taskId}: missing repo or issue/PR number`)
            continue
          }
          const token = await resolveGithubToken(taskId, output)
          if (!token) {
            console.warn(`Skipping GitHub output for ${taskId}: missing GitHub token`)
            continue
          }
          await postGithubComment(token, repo, issueOrPrNumber, report)
        }
        if (output.type === "slack") await postSlackMessage(process.env[output.webhookUrlEnv] ?? "", report)
      }
    },
    log: (message) => console.warn(message),
  })

  registerSchedules(config, (taskId) => server.triggerRun(taskId, "schedule"))

  console.log(`Automation service listening on port ${server.port}`)
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(String(error))
    process.exit(1)
  })
}
