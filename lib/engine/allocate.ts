import { nanoid } from "nanoid";
import { divide, floor, minus, multiply, plus, round2 } from "../money";
import { Allocation, Customer, Price, Stock, SubOrder } from "../types";
import { getUnitPrice } from "./price";
import { sortSubOrders } from "./sort";
import { pickStock } from "./stock";

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
    if (so.fillStatus === "FULL") {
      continue;
    }

    const customer = mapCustomer[so.customerId];
    if (customer === undefined) {
      // orphan sub order, we have no credit to spend
      continue;
    }

    let creditLeft = minus(customer.creditLimit, customer.creditUsed);
    if (creditLeft <= 0) {
      continue;
    }

    let needQty = floor(so.requestQty - so.allocatedQty);
    if (needQty <= 0) {
      continue;
    }

    const eligibleStocks = pickStock(so, stocks, input.prices);
    for (const s of eligibleStocks) {
      const unitPrice = getUnitPrice(
        so.priorityType,
        s.salmonId,
        s.supplierId,
        input.prices,
      );
      if (unitPrice === null) {
        // skip no assinged price yet
        continue;
      }

      let pickQty = 0;
      if (s.qty <= needQty) {
        // take all salmon from stock
        pickQty = s.qty;
      } else {
        // take some salmon from stock
        pickQty = needQty;
      }

      if (creditLeft < round2(multiply(pickQty, unitPrice))) {
        // partial: take only what the remaining credit can afford
        pickQty = floor(divide(creditLeft, unitPrice));
      }
      if (pickQty < 1) {
        continue;
      }

      const amount = round2(multiply(pickQty, unitPrice));

      // mutate Stock
      s.qty -= pickQty;

      // mutate Customer
      customer.creditUsed = plus(customer.creditUsed, amount);
      creditLeft = minus(creditLeft, amount);

      needQty -= pickQty;

      // mutate SubOrder
      so.allocatedQty += pickQty;
      so.totalAmount = plus(so.totalAmount, amount);

      allocations.push({
        id: nanoid(),
        subOrderId: so.id,
        salmonId: s.salmonId,
        warehouseId: s.warehouseId,
        supplierId: s.supplierId,
        qty: pickQty,
        unitPrice: unitPrice,
        amount,
        operation: "AUTO",
      });

      if (needQty <= 0) {
        so.fillStatus = "FULL";
        break;
      }
      so.fillStatus = "PARTIAL";

      if (creditLeft <= 0) {
        // use all credit
        break;
      }
    }
  }

  return {
    newAllocations: allocations,
    subOrders,
    stocks,
    customers,
  };
}
