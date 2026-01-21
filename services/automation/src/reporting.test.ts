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
