import { test, expect } from "bun:test"
import { buildOpencodeCommand } from "./task-runner"

test("builds prompt command", () => {
  const cmd = buildOpencodeCommand({ type: "prompt", prompt: "hello" })
  expect(cmd.args.join(" ")).toContain("run")
  expect(cmd.args.join(" ")).toContain("prompt")
})

test("builds plan command", () => {
  const cmd = buildOpencodeCommand({ type: "plan", planPath: "docs/plans/test.md" })
  expect(cmd.args.join(" ")).toContain("run")
  expect(cmd.args.join(" ")).toContain("plan")
})

test("builds command command", () => {
  const cmd = buildOpencodeCommand({ type: "command", commands: ["echo", "hello"] })
  expect(cmd.args.join(" ")).toContain("run")
  expect(cmd.args.join(" ")).toContain("command")
})

test("builds prompt command with model", () => {
  const cmd = buildOpencodeCommand({ type: "prompt", prompt: "hello", model: "gpt-4.1" })
  expect(cmd.args.join(" ")).toContain("--model gpt-4.1")
})

test("injects PR context into prompt", () => {
  const cmd = buildOpencodeCommand(
    { type: "prompt", prompt: "review please" },
    { repo: "owner/repo", issueOrPrNumber: 42 },
  )
  const joined = cmd.args.join(" ")
  expect(joined).toContain("owner/repo#42")
  expect(joined).toContain("gh pr view 42 --repo owner/repo")
})
