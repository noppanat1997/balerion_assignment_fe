import { floor, minus, plus, round2 } from "@/lib/money";
import { describe, expect, it } from "vitest";

describe("round2", () => {
  it("uses banker's rounding and avoids floating point drift", () => {
    expect(round2(2.675)).toBe(2.68);
    expect(round2(2.665)).toBe(2.66);
    expect(round2(0.1 + 0.2)).toBe(0.3);
  });
});

describe("floor", () => {
  it("never rounds up, qty is whole units", () => {
    expect(floor(2.999)).toBe(2);
    expect(floor(10 / 3)).toBe(3);
  });
});

describe("plus / minus", () => {
  it("keeps a running total exact across many small amounts", () => {
    let total = 0;
    for (const v of [0.1, 0.2, 0.3, 970.05]) total = plus(total, v);
    expect(total).toBe(970.65);
    expect(minus(total, 0.65)).toBe(970);
  });
});
