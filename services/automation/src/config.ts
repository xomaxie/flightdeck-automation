import { parse } from "jsonc-parser"
import { z, record, union, literal, object, array, string, number, optional, enum as zodEnum } from "zod"

const promptTaskSchema = object({
  type: literal("prompt"),
  prompt: string(),
  model: optional(string()),
  workingDir: optional(string()),
  githubConnectionId: optional(string()),
  outputs: optional(array(object({
    type: zodEnum(["github", "slack"]),
    repo: optional(string()),
    issueOrPrNumber: optional(number()),
    connectionId: optional(string()),
    webhookUrlEnv: optional(string()),
  }))),
})

const planTaskSchema = object({
  type: literal("plan"),
  planPath: string(),
  model: optional(string()),
  workingDir: optional(string()),
  githubConnectionId: optional(string()),
  outputs: optional(array(object({
    type: zodEnum(["github", "slack"]),
    repo: optional(string()),
    issueOrPrNumber: optional(number()),
    connectionId: optional(string()),
    webhookUrlEnv: optional(string()),
  }))),
})

const commandTaskSchema = object({
  type: literal("command"),
  commands: array(string()).min(1),
  model: optional(string()),
  workingDir: optional(string()),
  githubConnectionId: optional(string()),
  outputs: optional(array(object({
    type: zodEnum(["github", "slack"]),
    repo: optional(string()),
    issueOrPrNumber: optional(number()),
    connectionId: optional(string()),
    webhookUrlEnv: optional(string()),
  }))),
})

const taskSchema = union([promptTaskSchema, planTaskSchema, commandTaskSchema])

const configSchema = object({
  server: object({ port: number(), webhookPath: string() }),
  opencode: object({ bin: string(), defaultWorkingDir: optional(string()) }),
  tasks: record(string(), taskSchema),
  schedules: optional(array(object({ taskId: string(), cron: string() }))),
  triggers: optional(array(object({
    taskId: string(),
    event: zodEnum(["pull_request.opened", "pull_request.synchronize", "issue_comment.created"]),
  }))),
  github: optional(object({ defaultConnectionId: optional(string()) })),
  connections: optional(array(object({
    id: string(),
    label: optional(string()),
    secretKey: optional(string()),
  }))),
})

export function parseAutomationConfig(raw: string) {
  const parsed = parse(raw) as unknown
  return configSchema.parse(parsed)
}
