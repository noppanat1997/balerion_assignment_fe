import { Customer, Price, Stock, SubOrder } from "../types";
import { AllocateResult } from "./allocate";
import { fillSubOrder } from "./fill";

export interface ManualAllocateInput {
  subOrderId: string;
  subOrders: SubOrder[];
  stocks: Stock[];
  prices: Price[];
  customers: Customer[];
}

export type ManualAllocateResult = AllocateResult;

// same picking logic as "allocate" but focus on a single sub order
export function manualAllocate(
  input: ManualAllocateInput,
): ManualAllocateResult {
  const subOrders = input.subOrders.map((so) => ({ ...so }));
  const stocks = input.stocks.map((s) => ({ ...s }));
  const customers = input.customers.map((c) => ({ ...c }));
  const mapCustomer: Record<string, Customer> = Object.fromEntries(
    customers.map((c) => [c.id, c]),
  );

  let newAllocations: ManualAllocateResult["newAllocations"] = [];

  const so = subOrders.find((s) => s.id === input.subOrderId);
  if (so !== undefined) {
    const customer = mapCustomer[so.customerId];
    if (customer !== undefined) {
      newAllocations = fillSubOrder(
        so,
        stocks,
        input.prices,
        customer,
        "MANUAL",
      );
    }
  }

  return {
    newAllocations,
    subOrders,
    stocks,
    customers,
  };
}
