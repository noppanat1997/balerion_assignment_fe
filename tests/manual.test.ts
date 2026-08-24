import {
  assignStock,
  AssignStockInput,
  manualAllocate,
  ManualAllocateInput,
} from "@/lib/engine/manual";
import { describe, expect, it } from "vitest";
import { customer, price, stock, subOrder } from "./allocate.test";

const runManual = (over: Partial<ManualAllocateInput> = {}) =>
  manualAllocate({
    subOrderId: "SO-001",
    subOrders: [subOrder()],
    stocks: [stock()],
    prices: [price()],
    customers: [customer()],
    ...over,
  });

describe("manualAllocate", () => {
  it("fills only the targeted sub order, tagged MANUAL, and never mutates the input", () => {
    const so = subOrder({ id: "SO-001", requestQty: 10 });
    const other = subOrder({ id: "SO-other", requestQty: 10 });
    const s = stock();
    const res = runManual({ subOrders: [so, other], stocks: [s] });

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 10,
      totalAmount: 1000,
      fillStatus: "FULL",
    });
    expect(res.newAllocations).toHaveLength(1);
    expect(res.newAllocations[0]).toMatchObject({
      subOrderId: "SO-001",
      qty: 10,
      operation: "MANUAL",
    });
    const untouched = res.subOrders.find((o) => o.id === "SO-other");
    expect(untouched).toMatchObject({ allocatedQty: 0, fillStatus: "NONE" });

    // input is untouched
    expect(so.allocatedQty).toBe(0);
    expect(s.qty).toBe(100);
  });

  it("respects credit limit like auto allocate", () => {
    const res = runManual({
      customers: [customer({ creditLimit: 1000, creditUsed: 350 })],
    });

    expect(res.newAllocations[0].qty).toBe(6);
    expect(res.customers[0].creditUsed).toBe(950);
  });

  it("does nothing when the sub order id is unknown or already FULL", () => {
    const missing = runManual({ subOrderId: "SO-missing" });
    expect(missing.newAllocations).toHaveLength(0);

    const full = runManual({
      subOrders: [
        subOrder({ requestQty: 10, allocatedQty: 10, fillStatus: "FULL" }),
      ],
    });
    expect(full.newAllocations).toHaveLength(0);
  });
});

const runAssign = (over: Partial<AssignStockInput> = {}) =>
  assignStock({
    subOrderId: "SO-001",
    stockId: "SM-001|WH-001|SP-001",
    qty: 10,
    subOrders: [subOrder()],
    stocks: [stock()],
    prices: [price()],
    customers: [customer()],
    ...over,
  });

describe("assignStock", () => {
  it("draws from exactly the picked stock, tagged MANUAL, and never mutates the input", () => {
    const so = subOrder({ id: "SO-001", requestQty: 10 });
    const s = stock({ qty: 100 });
    const res = runAssign({ subOrders: [so], stocks: [s], qty: 4 });

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 4,
      totalAmount: 400,
      fillStatus: "PARTIAL",
    });
    expect(res.stocks[0].qty).toBe(96);
    expect(res.newAllocations).toHaveLength(1);
    expect(res.newAllocations[0]).toMatchObject({
      subOrderId: "SO-001",
      qty: 4,
      unitPrice: 100,
      amount: 400,
      operation: "MANUAL",
    });

    // input is untouched
    expect(so.allocatedQty).toBe(0);
    expect(s.qty).toBe(100);
  });

  it("clamps to whichever is smallest: requested qty, stock on hand, remaining need, or credit", () => {
    expect(runAssign({ qty: 500, stocks: [stock({ qty: 7 })] }).newAllocations[0].qty).toBe(7);
    expect(
      runAssign({ qty: 500, subOrders: [subOrder({ requestQty: 3 })] })
        .newAllocations[0].qty,
    ).toBe(3);
    expect(
      runAssign({
        qty: 500,
        customers: [customer({ creditLimit: 250 })],
      }).newAllocations[0].qty,
    ).toBe(2);
  });

  it("does nothing when the sub order or stock id is unknown", () => {
    expect(runAssign({ subOrderId: "SO-missing" }).newAllocations).toHaveLength(0);
    expect(runAssign({ stockId: "missing" }).newAllocations).toHaveLength(0);
  });
});
