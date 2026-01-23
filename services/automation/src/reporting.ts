const ANSI_REGEX = /[\u001B\u009B][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nq-uy=><]/g
const MAX_SECTION_CHARS = 4000

function sanitize(text: string) {
  return text.replace(/\r\n/g, "\n").replace(ANSI_REGEX, "").trimEnd()
}

function truncate(text: string, label: string) {
  if (text.length <= MAX_SECTION_CHARS) return text
  return `${text.slice(0, MAX_SECTION_CHARS)}\n... (${label} truncated, ${text.length} chars total)`
}

export function formatReport(input: { taskId: string; exitCode: number; stdout: string; stderr: string }) {
  const status = input.exitCode === 0 ? "success" : "failure"
  const stdout = truncate(sanitize(input.stdout || ""), "stdout")
  const stderr = truncate(sanitize(input.stderr || ""), "stderr")

  const parts = [
    `opencode automation: ${input.taskId}`,
    `status: ${status}`,
    "stdout:",
    stdout || "(empty)",
  ]

  if (status !== "success" && stderr) {
    parts.push("stderr:")
    parts.push(stderr)
  }

  return parts.join("\n")
}
