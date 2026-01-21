import { describe, it, expect } from "bun:test"

describe("index", () => {
  it("should load module", async () => {
    const mod = await import("./index")
    expect(typeof mod).toBe("object")
  })
})
