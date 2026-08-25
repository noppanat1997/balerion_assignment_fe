import { ANY_SUPPLIER, ANY_WAREHOUSE } from "../constants";
import { Price, PriorityType, Stock, SubOrder } from "../types";
import { findPrice, getUnitPrice } from "./price";

interface StockQuery {
  salmonId: string;
  warehouseId: string;
  supplierId: string;
}

function matchesQuery(query: StockQuery, stock: Stock): boolean {
  const warehouseOk =
    query.warehouseId === ANY_WAREHOUSE ||
    query.warehouseId === stock.warehouseId;
  const supplierOk =
    query.supplierId === ANY_SUPPLIER || query.supplierId === stock.supplierId;
  const salmonOk = query.salmonId === "" || query.salmonId === stock.salmonId;
  return warehouseOk && supplierOk && salmonOk;
}

// Priced, in-stock candidates for a query, in the same order the
// allocation engine draws from them. Shared by pickStock (actual
// allocation), stockQtyAvailable, and estimateUnitPrice (UI previews) so
// they can't drift apart on what counts as "available".
function findEligibleStocks(
  query: StockQuery,
  stocks: Stock[],
  prices: Price[],
): Stock[] {
  return stocks
    .filter(
      (s) =>
        s.qty > 0 &&
        findPrice(s.salmonId, s.supplierId, prices) !== undefined &&
        matchesQuery(query, s),
    )
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function pickStock(
  subOrder: SubOrder,
  stocks: Stock[],
  prices: Price[],
): Stock[] {
  return findEligibleStocks(
    {
      salmonId: subOrder.salmonId,
      warehouseId: subOrder.warehouseId,
      supplierId: subOrder.supplierId,
    },
    stocks,
    prices,
  );
}

// salmonId === "" matches any salmon (used for warehouse/supplier qty hints
// before a salmon is picked).
export function stockQtyAvailable(
  salmonId: string,
  warehouseId: string,
  supplierId: string,
  stocks: Stock[],
  prices: Price[],
): number {
  return findEligibleStocks(
    { salmonId, warehouseId, supplierId },
    stocks,
    prices,
  ).reduce((sum, s) => sum + s.qty, 0);
}

// "Any Supplier" draws from whichever eligible stock the allocation engine
// would pick first (see findEligibleStocks' id-sort order), not necessarily
// the cheapest one — estimate off that same stock so credit checks reflect
// what the order will actually be charged, not an optimistic lower bound.
export function estimateUnitPrice(
  priorityType: PriorityType,
  salmonId: string,
  warehouseId: string,
  supplierId: string,
  stocks: Stock[],
  prices: Price[],
): number | null {
  if (supplierId !== ANY_SUPPLIER) {
    return getUnitPrice(priorityType, salmonId, supplierId, prices);
  }

  const [first] = findEligibleStocks(
    { salmonId, warehouseId, supplierId },
    stocks,
    prices,
  );
  if (first === undefined) return null;

  return getUnitPrice(priorityType, first.salmonId, first.supplierId, prices);
}
