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
  const githubToken = process.env.GITHUB_TOKEN ?? ""

  if (!apiKey) {
    throw new Error("AUTOMATION_API_KEY is required")
  }

  const raw = readFileSync(CONFIG_PATH, "utf8")
  const config = parseAutomationConfig(raw)

  function resolveTaskOutputs(outputs?: OutputTarget[]) {
    return outputs ?? []
  }

  const server = createAutomationServer(config, {
    apiKey,
    port,
    webhookSecret,
    runTask: (task, taskId) => runTask(task, config.opencode.bin, config.opencode.defaultWorkingDir),
    publishReport: async ({ taskId, outputs, result }) => {
      const report = formatReport({ taskId, ...result })
      for (const output of resolveTaskOutputs(outputs)) {
        if (output.type === "github") await postGithubComment(githubToken, output.repo, output.issueOrPrNumber ?? 0, report)
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
