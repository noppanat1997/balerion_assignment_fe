import { fillSubOrder } from "@/lib/engine/fill";
import { describe, expect, it } from "vitest";
import { customer, price, stock, subOrder } from "./allocate.test";

describe("fillSubOrder", () => {
  it("spans multiple stocks, highest remaining stock first, until the need is met", () => {
    const so = subOrder({ requestQty: 30 });
    const stocks = [
      stock({ id: "A", warehouseId: "WH-001", qty: 10 }),
      stock({ id: "B", warehouseId: "WH-002", qty: 25 }),
    ];
    const c = customer();

    const allocations = fillSubOrder(so, stocks, [price()], c, "AUTO");

    expect(allocations.map((a) => a.qty)).toEqual([25, 5]);
    expect(stocks.map((s) => s.qty)).toEqual([5, 0]);
    expect(so).toMatchObject({ allocatedQty: 30, fillStatus: "FULL" });
    expect(c.creditUsed).toBe(3000);
  });

  it("caps the pick to remaining credit, skipping a stock it cannot afford a whole unit at", () => {
    const so = subOrder();
    const stocks = [
      stock({ id: "A", supplierId: "SP-001", qty: 10 }),
      stock({ id: "B", supplierId: "SP-002", qty: 10 }),
    ];
    const prices = [
      price({ id: "P1", supplierId: "SP-001", price: 100 }),
      price({ id: "P2", supplierId: "SP-002", price: 50 }),
    ];
    // 80 credit buys no whole unit at 100, but 1 whole unit at 50
    const c = customer({ creditLimit: 80, creditUsed: 0 });

    const allocations = fillSubOrder(so, stocks, prices, c, "AUTO");

    expect(allocations).toHaveLength(1);
    expect(allocations[0]).toMatchObject({ supplierId: "SP-002", qty: 1 });
    expect(so.fillStatus).toBe("PARTIAL");
  });

  it("returns no allocations when already FULL or the customer has no credit left", () => {
    const full = subOrder({ fillStatus: "FULL" });
    expect(
      fillSubOrder(full, [stock()], [price()], customer(), "AUTO"),
    ).toEqual([]);

    const noCredit = subOrder();
    const brokeCustomer = customer({ creditLimit: 500, creditUsed: 500 });
    expect(
      fillSubOrder(noCredit, [stock()], [price()], brokeCustomer, "AUTO"),
    ).toEqual([]);
  });
});
