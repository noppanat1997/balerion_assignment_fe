import { divide, floor, minus } from "../money";
import { Allocation, Customer, Price, Stock, SubOrder } from "../types";
import { AllocateResult } from "./allocate";
import { applyPick, fillSubOrder } from "./fill";
import { getUnitPrice } from "./price";

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

export interface AssignStockInput {
  subOrderId: string;
  stockId: string;
  qty: number;
  subOrders: SubOrder[];
  stocks: Stock[];
  prices: Price[];
  customers: Customer[];
}

export type AssignStockResult = AllocateResult;

// user picked exactly which stock to draw from, clamp to what's actually possible
export function assignStock(input: AssignStockInput): AssignStockResult {
  const subOrders = input.subOrders.map((so) => ({ ...so }));
  const stocks = input.stocks.map((s) => ({ ...s }));
  const customers = input.customers.map((c) => ({ ...c }));

  const newAllocations: Allocation[] = [];

  const so = subOrders.find((s) => s.id === input.subOrderId);
  const stock = stocks.find((s) => s.id === input.stockId);
  const customer = so && customers.find((c) => c.id === so.customerId);

  if (so !== undefined && stock !== undefined && customer !== undefined) {
    const unitPrice = getUnitPrice(
      so.priorityType,
      stock.salmonId,
      stock.supplierId,
      input.prices,
    );
    const creditLeft = minus(customer.creditLimit, customer.creditUsed);
    const needQty = floor(so.requestQty - so.allocatedQty);
    const maxAffordable =
      unitPrice !== null && unitPrice > 0
        ? floor(divide(creditLeft, unitPrice))
        : 0;

    const qty = Math.min(input.qty, stock.qty, needQty, maxAffordable);

    if (unitPrice !== null && qty > 0) {
      newAllocations.push(
        applyPick(so, stock, qty, unitPrice, customer, "MANUAL"),
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
