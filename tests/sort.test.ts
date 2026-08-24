import { sortSubOrders } from "@/lib/engine/sort";
import { PriorityType, SubOrder } from "@/lib/types";
import { describe, expect, it } from "vitest";

const subOrder = (over: Partial<SubOrder> = {}): SubOrder => ({
  id: "SO-001",
  orderId: "OD-001",
  customerId: "CT-001",
  salmonId: "SM-001",
  warehouseId: "WH-000",
  supplierId: "SP-000",
  requestQty: 10,
  allocatedQty: 0,
  totalAmount: 0,
  priorityType: "DAILY" as PriorityType,
  fillStatus: "NONE",
  createdAt: "2026-08-22T00:00:00.000Z",
  ...over,
});

describe("sortSubOrders", () => {
  it("serves EMERGENCY before OVER_DUE before DAILY regardless of input order", () => {
    const res = sortSubOrders([
      subOrder({ id: "SO-daily", priorityType: "DAILY" }),
      subOrder({ id: "SO-emg", priorityType: "EMERGENCY" }),
      subOrder({ id: "SO-overdue", priorityType: "OVER_DUE" }),
    ]);

    expect(res.map((s) => s.id)).toEqual(["SO-emg", "SO-overdue", "SO-daily"]);
  });

  it("breaks ties within the same priority by createdAt, then orderId, then id", () => {
    const res = sortSubOrders([
      subOrder({
        id: "later",
        createdAt: "2026-08-22T01:00:00.000Z",
        orderId: "OD-001",
      }),
      subOrder({
        id: "earlier",
        createdAt: "2026-08-22T00:00:00.000Z",
        orderId: "OD-001",
      }),
      subOrder({
        id: "same-time-higher-id",
        createdAt: "2026-08-22T00:00:00.000Z",
        orderId: "OD-001",
      }),
    ]);

    expect(res.map((s) => s.id)).toEqual([
      "earlier",
      "same-time-higher-id",
      "later",
    ]);
  });

  it("does not mutate the input array", () => {
    const input = [
      subOrder({ id: "SO-daily", priorityType: "DAILY" }),
      subOrder({ id: "SO-emg", priorityType: "EMERGENCY" }),
    ];
    sortSubOrders(input);

    expect(input.map((s) => s.id)).toEqual(["SO-daily", "SO-emg"]);
  });
});
