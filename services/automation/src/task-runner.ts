import type { AutomationTask } from "./types"

export function buildOpencodeCommand(task: AutomationTask) {
  if (task.type === "prompt") return { args: ["run", "prompt", task.prompt] }
  if (task.type === "plan") return { args: ["run", "plan", task.planPath] }
  return { args: ["run", "command", ...task.commands] }
}

export async function runTask(task: AutomationTask, bin: string, defaultDir?: string) {
  const { args } = buildOpencodeCommand(task)
  const cwd = task.workingDir ?? defaultDir ?? process.cwd()
  const proc = Bun.spawn([bin, ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}
