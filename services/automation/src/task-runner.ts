import type { AutomationTask } from "./types"

export function buildOpencodeCommand(task: AutomationTask) {
  const args = ["run"] as string[]
  if (task.type === "prompt") {
    args.push("prompt", task.prompt)
  } else if (task.type === "plan") {
    args.push("plan", task.planPath)
  } else {
    args.push("command", ...task.commands)
  }
  if (task.model) {
    args.unshift("--model", task.model)
  }
  return { args }
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
