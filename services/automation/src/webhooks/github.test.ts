import { test, expect } from "bun:test"
import { verifySignature, mapGithubEvent } from "./github"

test("rejects invalid signature", () => {
  const ok = verifySignature("secret", "body", "sha256=deadbeef")
  expect(ok).toBe(false)
})

test("accepts valid signature", () => {
  const body = "test body"
  const signature = "sha256=" + require("crypto").createHmac("sha256", "secret").update(body).digest("hex")
  const ok = verifySignature("secret", body, signature)
  expect(ok).toBe(true)
})

test("maps pull_request opened event", () => {
  expect(mapGithubEvent("pull_request", { action: "opened" })).toBe("pull_request.opened")
})

test("maps pull_request synchronize event", () => {
  expect(mapGithubEvent("pull_request", { action: "synchronize" })).toBe("pull_request.synchronize")
})

test("maps issue_comment created event", () => {
  expect(mapGithubEvent("issue_comment", { action: "created" })).toBe("issue_comment.created")
})

test("returns null for unmapped events", () => {
  expect(mapGithubEvent("push", {})).toBe(null)
})
