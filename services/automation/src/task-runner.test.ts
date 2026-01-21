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
