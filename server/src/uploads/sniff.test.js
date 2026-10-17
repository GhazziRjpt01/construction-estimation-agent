import { describe, expect, it } from "vitest"

import { extensionForPlan, sniffPlanType } from "./sniff.js"

describe("sniffPlanType", () => {
  it("recognizes PNG, JPEG, and PDF magic bytes", () => {
    expect(
      sniffPlanType(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      )
    ).toBe("image/png")
    expect(sniffPlanType(Buffer.from([0xff, 0xd8, 0xff, 0x00]))).toBe(
      "image/jpeg"
    )
    expect(sniffPlanType(Buffer.from("%PDF-1.7"))).toBe("application/pdf")
  })

  it("rejects a file whose contents do not match an allowed type", () => {
    expect(sniffPlanType(Buffer.from("GIF89a"))).toBeNull()
    expect(sniffPlanType(Buffer.from("%PDF"))).toBeNull()
    expect(extensionForPlan("image/png")).toBe("png")
    expect(extensionForPlan("text/plain")).toBeNull()
  })
})
