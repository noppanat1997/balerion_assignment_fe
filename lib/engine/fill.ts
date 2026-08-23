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
      operation,
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

  return allocations;
}
