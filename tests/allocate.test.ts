import { ANY_SUPPLIER, ANY_WAREHOUSE } from "@/lib/constants";
import { allocate, AllocateInput } from "@/lib/engine/allocate";
import { manualAllocate, ManualAllocateInput } from "@/lib/engine/manual";
import { Customer, Price, PriorityType, Stock, SubOrder } from "@/lib/types";
import { describe, expect, it } from "vitest";

const customer = (over: Partial<Customer> = {}): Customer => ({
  id: "CT-001",
  name: "customer",
  creditLimit: 1_000_000,
  creditUsed: 0,
  ...over,
});

const stock = (over: Partial<Stock> = {}): Stock => ({
  id: "SM-001|WH-001|SP-001",
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
  seq: 1,
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
  it("fills a sub order from a matching stock", () => {
    const res = run({});

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 10,
      totalAmount: 1000,
      fillStatus: "FULL",
    });
    expect(res.stocks[0].qty).toBe(90);
    expect(res.customers[0].creditUsed).toBe(1000);
    expect(res.newAllocations).toHaveLength(1);
    expect(res.newAllocations[0]).toMatchObject({
      subOrderId: "SO-001",
      salmonId: "SM-001",
      warehouseId: "WH-001",
      supplierId: "SP-001",
      qty: 10,
      unitPrice: 100,
      amount: 1000,
      operation: "AUTO",
    });
  });

  it("never mutates the input", () => {
    const so = subOrder();
    const s = stock();
    const c = customer();
    run({ subOrders: [so], stocks: [s], customers: [c] });

    expect(so.allocatedQty).toBe(0);
    expect(so.fillStatus).toBe("NONE");
    expect(s.qty).toBe(100);
    expect(c.creditUsed).toBe(0);
  });

  it("prices per priority tier", () => {
    const res = run({ subOrders: [subOrder({ priorityType: "EMERGENCY" })] });

    expect(res.newAllocations[0].unitPrice).toBe(125);
    expect(res.subOrders[0].totalAmount).toBe(1250);
  });

  it("spans several stocks and reports FULL only when the need is met", () => {
    const res = run({
      subOrders: [subOrder({ requestQty: 30 })],
      stocks: [
        stock({ id: "A", warehouseId: "WH-001", qty: 10 }),
        stock({ id: "B", warehouseId: "WH-002", qty: 25 }),
      ],
    });

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 30,
      fillStatus: "FULL",
    });
    expect(res.newAllocations.map((a) => a.qty)).toEqual([10, 20]);
    expect(res.stocks.map((s) => s.qty)).toEqual([0, 5]);
  });

  it("stays PARTIAL when the stock runs out", () => {
    const res = run({
      subOrders: [subOrder({ requestQty: 30 })],
      stocks: [stock({ qty: 12 })],
    });

    expect(res.subOrders[0]).toMatchObject({
      allocatedQty: 12,
      fillStatus: "PARTIAL",
    });
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

  describe("credit", () => {
    it("cuts the pick down to what the credit can afford", () => {
      // 10 x 100 = 1000 wanted, only 650 of credit left -> 6 whole units
      const res = run({
        customers: [customer({ creditLimit: 1000, creditUsed: 350 })],
      });

      expect(res.subOrders[0]).toMatchObject({
        allocatedQty: 6,
        totalAmount: 600,
        fillStatus: "PARTIAL",
      });
      expect(res.newAllocations[0].qty).toBe(6);
      expect(res.customers[0].creditUsed).toBe(950);
      expect(res.stocks[0].qty).toBe(94);
    });

    it("skips to the next stock when it cannot afford a single unit there", () => {
      // 80 of credit buys no whole unit at 100, but 1 at 50
      const res = run({
        customers: [customer({ creditLimit: 80, creditUsed: 0 })],
        stocks: [
          stock({ id: "A", supplierId: "SP-001", qty: 10 }),
          stock({ id: "B", supplierId: "SP-002", qty: 10 }),
        ],
        prices: [
          price({ id: "P1", supplierId: "SP-001", price: 100 }),
          price({ id: "P2", supplierId: "SP-002", price: 50 }),
        ],
      });

      expect(res.newAllocations).toHaveLength(1);
      expect(res.newAllocations[0]).toMatchObject({
        supplierId: "SP-002",
        qty: 1,
        amount: 50,
      });
      expect(res.stocks.map((s) => s.qty)).toEqual([10, 9]);
    });

    it("skips a sub order whose customer has no credit left", () => {
      const res = run({
        customers: [customer({ creditLimit: 500, creditUsed: 500 })],
      });

      expect(res.newAllocations).toHaveLength(0);
      expect(res.stocks[0].qty).toBe(100);
    });

    it("does not overspend across sub orders of the same customer", () => {
      const res = run({
        subOrders: [
          subOrder({ id: "SO-001", seq: 1, requestQty: 5 }),
          subOrder({ id: "SO-002", seq: 2, requestQty: 5 }),
        ],
        customers: [customer({ creditLimit: 700 })],
      });

      expect(res.customers[0].creditUsed).toBe(700);
      expect(res.customers[0].creditUsed).toBeLessThanOrEqual(
        res.customers[0].creditLimit,
      );
      expect(res.subOrders.map((so) => so.allocatedQty)).toEqual([5, 2]);
      expect(res.subOrders.map((so) => so.fillStatus)).toEqual([
        "FULL",
        "PARTIAL",
      ]);
    });
  });

  describe("eligibility", () => {
    it("honours a pinned warehouse and supplier", () => {
      const res = run({
        subOrders: [subOrder({ warehouseId: "WH-002", supplierId: "SP-002" })],
        stocks: [
          stock({ id: "A", warehouseId: "WH-001", supplierId: "SP-001" }),
          stock({ id: "B", warehouseId: "WH-002", supplierId: "SP-002" }),
          stock({ id: "C", warehouseId: "WH-002", supplierId: "SP-001" }),
        ],
        prices: [
          price({ id: "P1", supplierId: "SP-001" }),
          price({ id: "P2", supplierId: "SP-002" }),
        ],
      });

      expect(res.newAllocations.map((a) => a.warehouseId)).toEqual(["WH-002"]);
      expect(res.newAllocations.map((a) => a.supplierId)).toEqual(["SP-002"]);
    });

    it("ignores stock of another salmon and stock without a price", () => {
      const res = run({
        stocks: [
          stock({ id: "A", salmonId: "SM-002" }),
          stock({ id: "B", supplierId: "SP-999" }),
        ],
      });

      expect(res.newAllocations).toHaveLength(0);
    });

    it("ignores stock whose price row has no usable number", () => {
      const res = run({
        stocks: [
          stock({ id: "A", supplierId: "SP-001" }),
          stock({ id: "B", supplierId: "SP-002" }),
          stock({ id: "C", supplierId: "SP-003" }),
        ],
        prices: [
          price({ id: "P1", supplierId: "SP-001", price: 0 }),
          price({ id: "P2", supplierId: "SP-002", price: -50 }),
          price({ id: "P3", supplierId: "SP-003", price: 100 }),
        ],
      });

      expect(res.newAllocations).toHaveLength(1);
      expect(res.newAllocations[0]).toMatchObject({
        supplierId: "SP-003",
        qty: 10,
        amount: 1000,
      });
      expect(res.stocks.map((s) => s.qty)).toEqual([100, 100, 90]);
    });

    it("leaves an already FULL sub order alone", () => {
      const res = run({
        subOrders: [
          subOrder({ requestQty: 10, allocatedQty: 10, fillStatus: "FULL" }),
        ],
      });

      expect(res.newAllocations).toHaveLength(0);
      expect(res.stocks[0].qty).toBe(100);
    });

    it("tops up a PARTIAL sub order by its remaining qty", () => {
      const res = run({
        subOrders: [
          subOrder({
            requestQty: 10,
            allocatedQty: 4,
            totalAmount: 400,
            fillStatus: "PARTIAL",
          }),
        ],
      });

      expect(res.newAllocations[0].qty).toBe(6);
      expect(res.subOrders[0]).toMatchObject({
        allocatedQty: 10,
        totalAmount: 1000,
        fillStatus: "FULL",
      });
    });
  });

  it("keeps money exact across many small picks", () => {
    const res = run({
      subOrders: [subOrder({ requestQty: 3 })],
      stocks: [
        stock({ id: "A", warehouseId: "WH-1", qty: 1 }),
        stock({ id: "B", warehouseId: "WH-2", qty: 1 }),
        stock({ id: "C", warehouseId: "WH-3", qty: 1 }),
      ],
      prices: [price({ price: 0.1 })],
    });

    expect(res.subOrders[0].totalAmount).toBe(0.3);
    expect(res.customers[0].creditUsed).toBe(0.3);
  });

  it("gives every allocation its own id", () => {
    const res = run({
      subOrders: [subOrder({ requestQty: 30 })],
      stocks: [
        stock({ id: "A", warehouseId: "WH-001", qty: 10 }),
        stock({ id: "B", warehouseId: "WH-002", qty: 25 }),
      ],
    });

    const ids = res.newAllocations.map((a) => a.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });
});

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
  it("fills the targeted sub order from available stock, tagged MANUAL", () => {
    const res = runManual();

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
  });

  it("only touches the targeted sub order", () => {
    const res = runManual({
      subOrders: [
        subOrder({ id: "SO-001", requestQty: 10 }),
        subOrder({ id: "SO-other", requestQty: 10 }),
      ],
    });

    expect(res.newAllocations.every((a) => a.subOrderId === "SO-001")).toBe(
      true,
    );
    const other = res.subOrders.find((so) => so.id === "SO-other");
    expect(other).toMatchObject({ allocatedQty: 0, fillStatus: "NONE" });
  });

  it("leaves an already FULL sub order alone", () => {
    const res = runManual({
      subOrders: [
        subOrder({ requestQty: 10, allocatedQty: 10, fillStatus: "FULL" }),
      ],
    });

    expect(res.newAllocations).toHaveLength(0);
    expect(res.stocks[0].qty).toBe(100);
  });

  it("respects credit limit like auto allocate", () => {
    const res = runManual({
      customers: [customer({ creditLimit: 1000, creditUsed: 350 })],
    });

    expect(res.newAllocations[0].qty).toBe(6);
    expect(res.customers[0].creditUsed).toBe(950);
  });

  it("does nothing when the sub order id is unknown", () => {
    const res = runManual({ subOrderId: "SO-missing" });

    expect(res.newAllocations).toHaveLength(0);
    expect(res.subOrders[0].allocatedQty).toBe(0);
  });

  it("never mutates the input", () => {
    const so = subOrder();
    const s = stock();
    runManual({ subOrders: [so], stocks: [s] });

    expect(so.allocatedQty).toBe(0);
    expect(s.qty).toBe(100);
  });
});
