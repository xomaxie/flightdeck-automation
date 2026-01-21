import { describe, it, expect } from "bun:test"

describe("index", () => {
  it("should load module", async () => {
    process.env.AUTOMATION_API_KEY = "test-key"
    const mod = await import("./index")
    expect(typeof mod).toBe("object")
  })
})
