import { nanoid } from "nanoid";
import { divide, floor, minus, multiply, plus, round2 } from "../money";
import {
  Allocation,
  Customer,
  Operation,
  Price,
  Stock,
  SubOrder,
} from "../types";
import { getUnitPrice } from "./price";
import { pickStock } from "./stock";

// Mutates stock/customer/subOrder for a single pick and records the
// resulting Allocation. Shared by the auto-fill loop below and manual
// single-stock assignment (see manual.ts's assignStock), which both need
// the exact same bookkeeping for a chosen (stock, qty, unitPrice).
export function applyPick(
  so: SubOrder,
  stock: Stock,
  qty: number,
  unitPrice: number,
  customer: Customer,
  operation: Operation,
): Allocation {
  const amount = round2(multiply(qty, unitPrice));

  stock.qty -= qty;
  customer.creditUsed = plus(customer.creditUsed, amount);
  so.allocatedQty += qty;
  so.totalAmount = plus(so.totalAmount, amount);
  so.fillStatus = so.allocatedQty >= so.requestQty ? "FULL" : "PARTIAL";

  return {
    id: nanoid(),
    subOrderId: so.id,
    salmonId: stock.salmonId,
    warehouseId: stock.warehouseId,
    supplierId: stock.supplierId,
    qty,
    unitPrice,
    amount,
    operation,
  };
}

export function fillSubOrder(
  so: SubOrder,
  stocks: Stock[],
  prices: Price[],
  customer: Customer,
  operation: Operation,
): Allocation[] {
  const allocations: Allocation[] = [];

  if (so.fillStatus === "FULL") {
    return allocations;
  }

  let creditLeft = minus(customer.creditLimit, customer.creditUsed);
  if (creditLeft <= 0) {
    return allocations;
  }

  let needQty = floor(so.requestQty - so.allocatedQty);
  if (needQty <= 0) {
    return allocations;
  }

  const eligibleStocks = pickStock(so, stocks, prices);
  for (const s of eligibleStocks) {
    const unitPrice = getUnitPrice(
      so.priorityType,
      s.salmonId,
      s.supplierId,
      prices,
    );
    if (unitPrice === null) {
      // skip no assinged price yet
      continue;
    }

    // take all salmon from stock, or only as much as still needed
    let pickQty = Math.min(s.qty, needQty);

    if (creditLeft < round2(multiply(pickQty, unitPrice))) {
      // partial: take only what the remaining credit can afford
      pickQty = floor(divide(creditLeft, unitPrice));
    }
    if (pickQty < 1) {
      continue;
    }

    const allocation = applyPick(
      so,
      s,
      pickQty,
      unitPrice,
      customer,
      operation,
    );
    allocations.push(allocation);

    creditLeft = minus(creditLeft, allocation.amount);
    needQty -= pickQty;

    if (needQty <= 0 || creditLeft <= 0) {
      break;
    }
  }

  return allocations;
}
