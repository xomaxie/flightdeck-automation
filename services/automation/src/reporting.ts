export function formatReport(input: { taskId: string; exitCode: number; stdout: string; stderr: string }) {
  const status = input.exitCode === 0 ? "success" : "failure"
  return `opencode automation: ${input.taskId}\nstatus: ${status}\nstdout:\n${input.stdout}\nstderr:\n${input.stderr}`
}
