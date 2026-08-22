import { ANY_SUPPLIER, ANY_WAREHOUSE } from "../constants";
import { Price, Stock, SubOrder } from "../types";
import { findPrice } from "./price";

function matches(subOrder: SubOrder, stock: Stock): boolean {
  const warehouseOk =
    subOrder.warehouseId === ANY_WAREHOUSE ||
    subOrder.warehouseId === stock.warehouseId;
  const supplierOk =
    subOrder.supplierId === ANY_SUPPLIER ||
    subOrder.supplierId === stock.supplierId;
  return warehouseOk && supplierOk && subOrder.salmonId === stock.salmonId;
}

export function pickStock(
  subOrder: SubOrder,
  stocks: Stock[],
  prices: Price[],
): Stock[] {
  return stocks
    .filter(
      (s) =>
        s.qty > 0 &&
        findPrice(s.salmonId, s.supplierId, prices) !== undefined &&
        matches(subOrder, s),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}
