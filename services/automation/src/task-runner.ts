import type { AutomationTask, TaskContext } from "./types"

function injectPromptContext(task: AutomationTask, context?: TaskContext): AutomationTask {
  if (!context?.repo || !context?.issueOrPrNumber) return task
  if (task.type !== "prompt") return task
  const header = `You are reviewing GitHub PR ${context.repo}#${context.issueOrPrNumber}.\n` +
    `If you need to fetch details, use: gh pr view ${context.issueOrPrNumber} --repo ${context.repo}.\n\n`
  return { ...task, prompt: `${header}${task.prompt}` }
}

export function buildOpencodeCommand(task: AutomationTask, context?: TaskContext) {
  const effectiveTask = injectPromptContext(task, context)
  const args = ["run"] as string[]
  if (effectiveTask.type === "prompt") {
    args.push("prompt", effectiveTask.prompt)
  } else if (effectiveTask.type === "plan") {
    args.push("plan", effectiveTask.planPath)
  } else {
    args.push("command", ...effectiveTask.commands)
  }
  if (effectiveTask.model) {
    args.unshift("--model", effectiveTask.model)
  }
  return { args }
}

export async function runTask(task: AutomationTask, bin: string, defaultDir?: string, context?: TaskContext) {
  const { args } = buildOpencodeCommand(task, context)
  const cwd = task.workingDir ?? defaultDir ?? process.cwd()
  const proc = Bun.spawn([bin, ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()
  const exitCode = await proc.exited
  return { stdout, stderr, exitCode }
}
