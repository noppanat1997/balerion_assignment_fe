import { ANY_SUPPLIER, ANY_WAREHOUSE } from "@/lib/constants";
import { allocate, AllocateInput } from "@/lib/engine/allocate";
import { Customer, Price, PriorityType, Stock, SubOrder } from "@/lib/types";
import { describe, expect, it } from "vitest";

export const customer = (over: Partial<Customer> = {}): Customer => ({
  id: "CT-001",
  name: "customer",
  creditLimit: 1_000_000,
  creditUsed: 0,
  ...over,
});

export const stock = (over: Partial<Stock> = {}): Stock => ({
  id: "SM-001|WH-001|SP-001",
  salmonId: "SM-001",
  warehouseId: "WH-001",
  supplierId: "SP-001",
  qty: 100,
  ...over,
});

export const price = (over: Partial<Price> = {}): Price => ({
  id: "SM-001|SP-001",
  salmonId: "SM-001",
  supplierId: "SP-001",
  price: 100,
  ...over,
});

export const subOrder = (over: Partial<SubOrder> = {}): SubOrder => ({
  id: "SO-001",
  orderId: "OD-001",
  customerId: "CT-001",
  salmonId: "SM-001",
  warehouseId: ANY_WAREHOUSE,
  supplierId: ANY_SUPPLIER,
  requestQty: 10,
  allocatedQty: 0,
  totalAmount: 0,
  priorityType: "OVER_DUE" as PriorityType,
  fillStatus: "NONE",
  createdAt: "2026-08-22T00:00:00.000Z",
  ...over,
});

const run = (over: Partial<AllocateInput>) =>
  allocate({
    subOrders: [subOrder()],
    stocks: [stock()],
    prices: [price()],
    customers: [customer()],
    ...over,
  });

describe("allocate", () => {
  it("fills a sub order from a matching stock and never mutates the input", () => {
    const so = subOrder();
    const s = stock();
    const c = customer();
    const res = run({ subOrders: [so], stocks: [s], customers: [c] });

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 10,
      totalAmount: 1000,
      fillStatus: "FULL",
    });
    expect(res.newAllocations[0]).toMatchObject({
      subOrderId: "SO-001",
      qty: 10,
      unitPrice: 100,
      amount: 1000,
      operation: "AUTO",
    });
    expect(so.allocatedQty).toBe(0);
    expect(s.qty).toBe(100);
    expect(c.creditUsed).toBe(0);
  });

  it("spans several stocks, highest remaining stock first, and stays PARTIAL when supply runs out", () => {
    const res = run({
      subOrders: [subOrder({ requestQty: 30 })],
      stocks: [
        stock({ id: "A", warehouseId: "WH-001", qty: 10 }),
        stock({ id: "B", warehouseId: "WH-002", qty: 15 }),
      ],
    });

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 25,
      fillStatus: "PARTIAL",
    });
    expect(res.newAllocations.map((a) => a.qty)).toEqual([15, 10]);
  });

  it("serves the higher priority sub order first", () => {
    const res = run({
      subOrders: [
        subOrder({ id: "SO-daily", priorityType: "DAILY", requestQty: 10 }),
        subOrder({ id: "SO-emg", priorityType: "EMERGENCY", requestQty: 10 }),
      ],
      stocks: [stock({ qty: 10 })],
    });

    expect(res.newAllocations.map((a) => a.subOrderId)).toEqual(["SO-emg"]);
    const daily = res.subOrders.find((so) => so.id === "SO-daily");
    expect(daily).toMatchObject({ allocatedQty: 0, fillStatus: "NONE" });
  });

  it("caps allocation to the customer's remaining credit and never overspends across sub orders", () => {
    const res = run({
      subOrders: [
        subOrder({ id: "SO-001", requestQty: 5 }),
        subOrder({ id: "SO-002", requestQty: 5 }),
      ],
      customers: [customer({ creditLimit: 700 })],
    });

    expect(res.customers[0].creditUsed).toBe(700);
    expect(res.subOrders.map((so) => so.allocatedQty)).toEqual([5, 2]);
    expect(res.subOrders.map((so) => so.fillStatus)).toEqual([
      "FULL",
      "PARTIAL",
    ]);
  });

  it("honours a pinned warehouse/supplier and skips stock with no usable price", () => {
    const res = run({
      subOrders: [subOrder({ warehouseId: "WH-002", supplierId: "SP-002" })],
      stocks: [
        stock({ id: "A", warehouseId: "WH-001", supplierId: "SP-001" }),
        stock({ id: "B", warehouseId: "WH-002", supplierId: "SP-002" }),
      ],
      prices: [
        price({ id: "P1", supplierId: "SP-001" }),
        price({ id: "P2", supplierId: "SP-002", price: 0 }), // no usable price yet
      ],
    });

    // only stock B matches the pin, but it has no usable price -> nothing allocated
    expect(res.newAllocations).toHaveLength(0);
  });
});
