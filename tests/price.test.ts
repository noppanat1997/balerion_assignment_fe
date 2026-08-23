import { findPrice, getUnitPrice } from "@/lib/engine/price";
import { Price } from "@/lib/types";
import { describe, expect, it } from "vitest";

const price = (over: Partial<Price> = {}): Price => ({
  id: "SM-001|SP-001",
  salmonId: "SM-001",
  supplierId: "SP-001",
  price: 100,
  ...over,
});

describe("findPrice", () => {
  it("matches on salmonId + supplierId and ignores non-positive prices", () => {
    const prices = [
      price({ id: "P-zero", supplierId: "SP-999", price: 0 }),
      price({ id: "P-neg", supplierId: "SP-998", price: -10 }),
      price({ id: "P-ok", supplierId: "SP-001", price: 100 }),
    ];

    expect(findPrice("SM-001", "SP-999", prices)).toBeUndefined();
    expect(findPrice("SM-001", "SP-001", prices)?.id).toBe("P-ok");
  });
});

describe("getUnitPrice", () => {
  it("applies the priority tier and rounds to 2dp", () => {
    const prices = [price({ price: 33.333 })];

    expect(getUnitPrice("EMERGENCY", "SM-001", "SP-001", prices)).toBe(41.67);
    expect(getUnitPrice("DAILY", "SM-001", "SP-001", prices)).toBe(30);
  });

  it("returns null when there is no usable price", () => {
    expect(getUnitPrice("DAILY", "SM-001", "SP-001", [])).toBeNull();
  });
});
