import { ANY_SUPPLIER, ANY_WAREHOUSE } from "@/lib/constants";
import { pickStock } from "@/lib/engine/stock";
import { Price, Stock, SubOrder } from "@/lib/types";
import { describe, expect, it } from "vitest";

const stock = (over: Partial<Stock> = {}): Stock => ({
  id: "A",
  salmonId: "SM-001",
  warehouseId: "WH-001",
  supplierId: "SP-001",
  qty: 100,
  ...over,
});

const price = (over: Partial<Price> = {}): Price => ({
  id: "SM-001|SP-001",
  salmonId: "SM-001",
  supplierId: "SP-001",
  price: 100,
  ...over,
});

const subOrder = (over: Partial<SubOrder> = {}): SubOrder => ({
  id: "SO-001",
  orderId: "OD-001",
  customerId: "CT-001",
  salmonId: "SM-001",
  warehouseId: ANY_WAREHOUSE,
  supplierId: ANY_SUPPLIER,
  requestQty: 10,
  allocatedQty: 0,
  totalAmount: 0,
  priorityType: "DAILY",
  fillStatus: "NONE",
  createdAt: "2026-08-22T00:00:00.000Z",
  ...over,
});

describe("pickStock", () => {
  it("excludes empty stock, wrong salmon, and stock without a price", () => {
    const stocks = [
      stock({ id: "empty", qty: 0 }),
      stock({ id: "wrong-salmon", salmonId: "SM-999" }),
      stock({ id: "no-price", supplierId: "SP-999" }),
      stock({ id: "ok" }),
    ];

    const res = pickStock(subOrder(), stocks, [price()]);

    expect(res.map((s) => s.id)).toEqual(["ok"]);
  });

  it("treats ANY_WAREHOUSE/ANY_SUPPLIER as wildcard but honours a pinned one", () => {
    const stocks = [
      stock({ id: "A", warehouseId: "WH-001", supplierId: "SP-001" }),
      stock({ id: "B", warehouseId: "WH-002", supplierId: "SP-002" }),
    ];
    const prices = [
      price({ id: "P1", supplierId: "SP-001" }),
      price({ id: "P2", supplierId: "SP-002" }),
    ];

    const anyRes = pickStock(subOrder(), stocks, prices);
    expect(anyRes.map((s) => s.id)).toEqual(["A", "B"]);

    const pinnedRes = pickStock(
      subOrder({ warehouseId: "WH-002", supplierId: "SP-002" }),
      stocks,
      prices,
    );
    expect(pinnedRes.map((s) => s.id)).toEqual(["B"]);
  });

  it("orders ANY_WAREHOUSE/ANY_SUPPLIER candidates by highest remaining stock first", () => {
    const stocks = [
      stock({ id: "low", warehouseId: "WH-001", supplierId: "SP-001", qty: 5 }),
      stock({ id: "high", warehouseId: "WH-002", supplierId: "SP-002", qty: 50 }),
      stock({ id: "mid", warehouseId: "WH-003", supplierId: "SP-003", qty: 20 }),
    ];
    const prices = [
      price({ id: "P1", supplierId: "SP-001" }),
      price({ id: "P2", supplierId: "SP-002" }),
      price({ id: "P3", supplierId: "SP-003" }),
    ];

    const res = pickStock(subOrder(), stocks, prices);
    expect(res.map((s) => s.id)).toEqual(["high", "mid", "low"]);
  });
});
