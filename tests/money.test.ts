import { floor, minus, plus, round2 } from "@/lib/money";
import { describe, expect, it } from "vitest";

describe("round2", () => {
  it("uses banker's rounding on the half", () => {
    expect(round2(2.675)).toBe(2.68);
    expect(round2(2.665)).toBe(2.66);
    expect(round2(0.125)).toBe(0.12);
    expect(round2(0.135)).toBe(0.14);
  });

  it("is avoid floating number problem", () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.0);
  });
});

describe("floor", () => {
  it("never rounds up, qty is whole units", () => {
    expect(floor(2.999)).toBe(2);
    expect(floor(2.675)).toBe(2);
    expect(floor(10 / 3)).toBe(3);
    expect(floor(0.8)).toBe(0);
  });
});

describe("plus / minus", () => {
  it("is avoid floating number problem", () => {
    expect(plus(0.1, 0.2)).toBe(0.3);
    expect(minus(9.9, 0.2)).toBe(9.7);
    expect(minus(0.3, 0.1)).toBe(0.2);
  });

  it("keeps a running total exact", () => {
    let total = 0;
    for (const v of [0.1, 0.2, 0.3, 970.05]) total = plus(total, v);
    expect(total).toBe(970.65);
  });
});
