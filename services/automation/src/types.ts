export type AutomationTask =
  | { type: "prompt"; prompt: string; workingDir?: string; outputs?: OutputTarget[] }
  | { type: "plan"; planPath: string; workingDir?: string; outputs?: OutputTarget[] }
  | { type: "command"; commands: string[]; workingDir?: string; outputs?: OutputTarget[] }

export type OutputTarget =
  | { type: "github"; repo: string; issueOrPrNumber?: number }
  | { type: "slack"; webhookUrlEnv: string }

export type AutomationConfig = {
  server: { port: number; webhookPath: string }
  opencode: { bin: string; defaultWorkingDir?: string }
  tasks: Record<string, AutomationTask>
  schedules?: { taskId: string; cron: string }[]
  triggers?: { taskId: string; event: "pull_request.opened" | "pull_request.synchronize" | "issue_comment.created" }[]
}
