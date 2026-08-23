import { Allocation, Customer, Price, Stock, SubOrder } from "../types";
import { fillSubOrder } from "./fill";
import { sortSubOrders } from "./sort";

export interface AllocateInput {
  subOrders: SubOrder[];
  stocks: Stock[];
  prices: Price[];
  customers: Customer[];
}

export interface AllocateResult {
  newAllocations: Allocation[];
  subOrders: SubOrder[];
  stocks: Stock[];
  customers: Customer[];
}

export function allocate(input: AllocateInput): AllocateResult {
  const allocations: Allocation[] = [];
  const subOrders = input.subOrders.map((so) => ({ ...so }));
  const stocks = input.stocks.map((s) => ({ ...s }));
  const customers = input.customers.map((c) => ({ ...c }));
  const mapCustomer: Record<string, Customer> = Object.fromEntries(
    customers.map((c) => [c.id, c]),
  );

  for (const so of sortSubOrders(subOrders)) {
    const customer = mapCustomer[so.customerId];
    if (customer === undefined) {
      // orphan sub order, we have no credit to spend
      continue;
    }

    allocations.push(
      ...fillSubOrder(so, stocks, input.prices, customer, "AUTO"),
    );
  }

  return {
    newAllocations: allocations,
    subOrders,
    stocks,
    customers,
  };
}
