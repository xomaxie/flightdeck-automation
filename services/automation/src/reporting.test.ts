import { test, expect } from "bun:test"
import { formatReport } from "./reporting"

test("formats success report", () => {
  const text = formatReport({ taskId: "daily", exitCode: 0, stdout: "ok", stderr: "" })
  expect(text).toContain("daily")
  expect(text).toContain("success")
})

test("formats failure report", () => {
  const text = formatReport({ taskId: "daily", exitCode: 1, stdout: "", stderr: "error" })
  expect(text).toContain("daily")
  expect(text).toContain("failure")
})

test("strips ansi and truncates", () => {
  const noisy = "\u001b[31mERROR\u001b[0m"
  const long = "a".repeat(5005)
  const text = formatReport({ taskId: "daily", exitCode: 1, stdout: noisy + long, stderr: noisy })
  expect(text).not.toContain("\u001b[31m")
  expect(text).toContain("truncated")
})

test("omits stderr on success", () => {
  const text = formatReport({ taskId: "daily", exitCode: 0, stdout: "ok", stderr: "warn" })
  expect(text).not.toContain("stderr:")
})
