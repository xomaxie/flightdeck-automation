type TaskBase = {
  model?: string
  workingDir?: string
  outputs?: OutputTarget[]
  githubConnectionId?: string
}

export type AutomationTask =
  | ({ type: "prompt"; prompt: string } & TaskBase)
  | ({ type: "plan"; planPath: string } & TaskBase)
  | ({ type: "command"; commands: string[] } & TaskBase)

export type OutputTarget =
  | { type: "github"; repo?: string; issueOrPrNumber?: number; connectionId?: string }
  | { type: "slack"; webhookUrlEnv: string }

export type GithubConnection = {
  id: string
  label?: string
  secretKey?: string
}

export type TaskContext = {
  repo?: string
  issueOrPrNumber?: number
}

export type AutomationConfig = {
  server: { port: number; webhookPath: string }
  opencode: { bin: string; defaultWorkingDir?: string }
  tasks: Record<string, AutomationTask>
  schedules?: { taskId: string; cron: string }[]
  triggers?: { taskId: string; event: "pull_request.opened" | "pull_request.synchronize" | "issue_comment.created" }[]
  github?: { defaultConnectionId?: string }
  connections?: GithubConnection[]
}
