import { test, expect } from "bun:test"
import { shouldRegisterSchedule } from "./scheduler"

test("registers schedule when task exists", () => {
  expect(shouldRegisterSchedule("daily", { daily: { type: "prompt", prompt: "x" } })).toBe(true)
})

test("does not register schedule when task missing", () => {
  expect(shouldRegisterSchedule("missing", { daily: { type: "prompt", prompt: "x" } })).toBe(false)
})
