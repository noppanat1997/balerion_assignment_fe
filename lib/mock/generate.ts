import { PRICE_TIER } from "../constants";
import {
  Allocation,
  Customer,
  Order,
  Price,
  PriorityType,
  Salmon,
  Stock,
  SubOrder,
  Supplier,
  Warehouse,
} from "../types";
import {
  CUSTOMER_NAME_POOL,
  REMARKS,
  SALMON_POOL,
  SUPPLIER_POOL,
  WAREHOUSE_POOL,
  WILDCARD_SUPPLIER,
  WILDCARD_WAREHOUSE,
} from "./data";
import { nextId, random, resetSeed, subOrderId } from "./seed";

export interface Dataset {
  salmons: Salmon[];
  warehouses: Warehouse[];
  suppliers: Supplier[];
  customers: Customer[];
  prices: Price[];
  stocks: Stock[];
  orders: Order[];
  subOrders: SubOrder[];
  allocations: Allocation[];
}

const PRIORITY_TYPES: PriorityType[] = ["EMERGENCY", "OVER_DUE", "DAILY"];
export const DEFAULT_MIN_SUBORDERS = 5000;

// Matches generatePrices' randInt(MIN_PRICE, MAX_PRICE) range below.
const MIN_PRICE = 100;
const MAX_PRICE = 500;
// Worst case a line could ever cost per kg, across all priority tiers.
const MAX_UNIT_PRICE = MAX_PRICE * Math.max(...Object.values(PRICE_TIER));

// How many entries of a reference pool (salmons/warehouses/suppliers/
// customers) to actually use for a given dataset size: starts at `base`
// (what a small dataset looked like before pools existed) and pulls in
// one more per `perExtra` sub orders, capped at the pool's own size.
function scaledCount(
  minSubOrders: number,
  base: number,
  perExtra: number,
  poolSize: number,
): number {
  return Math.min(poolSize, base + Math.floor(minSubOrders / perExtra));
}

// Matches ResetDatasetDialog's MAX_MIN_SUBORDERS: the practical upper
// bound for dataset size, used below to scale down starting credit usage.
const MAX_PRACTICAL_SUBORDERS = 10000;

// A bigger dataset throws far more order volume at the same handful of
// customers, so start them with proportionally less credit already
// "used" — otherwise a big backlog would have even less room to ever
// get allocated. Shrinks from 70% used (small dataset) down to 5% used
// (max practical dataset size).
function creditUsedFraction(minSubOrders: number): number {
  const maxFraction = 0.7;
  const minFraction = 0.05;
  const t = Math.min(1, minSubOrders / MAX_PRACTICAL_SUBORDERS);
  return maxFraction - t * (maxFraction - minFraction);
}

// ---- Demand vs. supply/credit balance ----
// Stock qty and credit limits used to be flat random ranges regardless
// of dataset size, so at "gigaton" scale (10k sub orders) total request
// value dwarfed both — tens of times more demand than there was credit
// or stock to ever cover. Size both off a rough estimate of total
// demand so the ratio of demand to supply/credit stays roughly the same
// at any dataset size, small or huge.
const AVG_TIER =
  Object.values(PRICE_TIER).reduce((a, b) => a + b, 0) /
  Object.values(PRICE_TIER).length;
// Midpoint of the uncapped 1-200 requestQty range; the per-customer
// affordability cap above only pulls small customers below this.
const AVG_REQUEST_QTY = 100;
const AVG_LINE_VALUE =
  ((MIN_PRICE + MAX_PRICE) / 2) * AVG_TIER * AVG_REQUEST_QTY;

// Multiple of total expected demand value that aggregate credit/stock
// should be sized to cover. Credit is sized above demand (2x) so it
// isn't the thing every customer runs dry on first — stock stays a
// genuine fraction (0.7x) so it's the tighter, more interesting
// constraint, giving a realistic mix of FULL/PARTIAL/NONE instead of
// every customer maxing out their credit line.
const CREDIT_COVERAGE = 2.0;
const STOCK_COVERAGE = 0.7;

// Floors so a tiny dataset still looks like a real business (matches the
// original fixed ranges: creditLimit 50k-500k, stock qty avg ~1000/entry).
const MIN_BASE_CREDIT_LIMIT = 50_000;
const MIN_AVG_STOCK_QTY = 1000;

function expectedTotalDemand(minSubOrders: number): number {
  return minSubOrders * AVG_LINE_VALUE;
}

const randInt = (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

// Each sub order can only draw from the one stock lot matching its exact
// salmon/warehouse/supplier combo (see pickStock), so a flat random range
// around the average still starves whichever combos get unlucky with
// demand — total supply looks fine while individual lots run dry. Keep
// the normal range as a floor for every lot, and on top of that give a
// share of lots an oversized "deep" restock, so more combos end up with
// enough to absorb a demand spike instead of all sitting near the mean.
function randomLotQty(avgQty: number): number {
  const normal = randInt(0, Math.round(avgQty * 2));
  if (random() >= 0.15) return normal;
  return normal + randInt(Math.round(avgQty * 3), Math.round(avgQty * 8));
}

const pick = <T>(items: T[]): T => items[randInt(0, items.length - 1)];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function randomDate(): string {
  const start = new Date("2026-01-01").getTime();
  const end = new Date("2026-08-23").getTime();
  return new Date(randInt(start, end)).toISOString();
}

function generateCustomers(names: string[], minSubOrders: number): Customer[] {
  const usedFraction = creditUsedFraction(minSubOrders);

  // Total credit spread across all customers, sized off expected demand
  // for this dataset; per customer it's randomized ±30% around the
  // resulting average for variety, same as the old flat 50k-500k range
  // was at small scale.
  const baseCreditLimit = Math.max(
    MIN_BASE_CREDIT_LIMIT,
    (expectedTotalDemand(minSubOrders) * CREDIT_COVERAGE) / names.length,
  );

  return names.map((name) => {
    const creditLimit = Math.round((randInt(70, 130) * baseCreditLimit) / 100);
    return {
      id: nextId("CT"),
      name,
      creditLimit,
      creditUsed: randInt(0, creditLimit * usedFraction),
    };
  });
}

function generatePrices(salmons: Salmon[], realSuppliers: Supplier[]): Price[] {
  const prices: Price[] = [];
  for (const salmon of salmons) {
    for (const supplier of realSuppliers) {
      prices.push({
        id: nextId("PRC"),
        salmonId: salmon.id,
        supplierId: supplier.id,
        price: randInt(MIN_PRICE, MAX_PRICE),
      });
    }
  }
  return prices;
}

function generateStocks(
  salmons: Salmon[],
  realWarehouses: Warehouse[],
  realSuppliers: Supplier[],
  minSubOrders: number,
): Stock[] {
  const entryCount = salmons.length * realWarehouses.length * realSuppliers.length;
  // Average qty per stock entry, sized off expected demand for this
  // dataset; randomLotQty below keeps roughly this mean.
  const avgQtyPerEntry = Math.max(
    MIN_AVG_STOCK_QTY,
    (expectedTotalDemand(minSubOrders) * STOCK_COVERAGE) /
      (((MIN_PRICE + MAX_PRICE) / 2) * entryCount),
  );

  const stocks: Stock[] = [];
  for (const salmon of salmons) {
    for (const warehouse of realWarehouses) {
      for (const supplier of realSuppliers) {
        stocks.push({
          id: nextId("STK"),
          salmonId: salmon.id,
          warehouseId: warehouse.id,
          supplierId: supplier.id,
          qty: randomLotQty(avgQtyPerEntry),
        });
      }
    }
  }
  return stocks;
}

function generateOrdersAndSubOrders(
  customers: Customer[],
  minSubOrders: number,
  salmons: Salmon[],
  warehouses: Warehouse[],
  suppliers: Supplier[],
) {
  const orders: Order[] = [];
  const subOrders: SubOrder[] = [];

  while (subOrders.length < minSubOrders) {
    const customer = pick(customers);
    const order: Order = {
      id: nextId("ORDER"),
      customerId: customer.id,
    };
    orders.push(order);

    // Cap a single line's quantity so its worst-case cost (at max price and
    // priority tier) never exceeds the customer's entire credit limit.
    const maxAffordableQty = Math.max(
      1,
      Math.min(200, Math.floor(customer.creditLimit / MAX_UNIT_PRICE)),
    );

    const lineCount = randInt(1, 4);
    for (let seq = 0; seq < lineCount; seq++) {
      subOrders.push({
        id: subOrderId(order.id, seq + 1),
        orderId: order.id,
        customerId: order.customerId,
        salmonId: pick(salmons).id,
        warehouseId: pick(warehouses).id,
        supplierId: pick(suppliers).id,
        requestQty: randInt(1, maxAffordableQty),
        allocatedQty: 0,
        totalAmount: 0,
        priorityType: pick(PRIORITY_TYPES),
        fillStatus: "NONE",
        remark: random() < 0.2 ? pick(REMARKS) : undefined,
        createdAt: randomDate(),
      });
    }
  }

  return { orders, subOrders: shuffle(subOrders) };
}

export interface GenerateOptions {
  seed?: number;
  minSubOrders?: number;
}

export function generateDataset(options: GenerateOptions = {}): Dataset {
  const { seed, minSubOrders = DEFAULT_MIN_SUBORDERS } = options;
  resetSeed(seed);

  const salmons = SALMON_POOL.slice(
    0,
    scaledCount(minSubOrders, 3, 1800, SALMON_POOL.length),
  );
  const realWarehouses = WAREHOUSE_POOL.slice(
    0,
    scaledCount(minSubOrders, 3, 1800, WAREHOUSE_POOL.length),
  );
  const realSuppliers = SUPPLIER_POOL.slice(
    0,
    scaledCount(minSubOrders, 3, 1800, SUPPLIER_POOL.length),
  );
  const warehouses = [WILDCARD_WAREHOUSE, ...realWarehouses];
  const suppliers = [WILDCARD_SUPPLIER, ...realSuppliers];
  const customerNames = CUSTOMER_NAME_POOL.slice(
    0,
    scaledCount(minSubOrders, 5, 700, CUSTOMER_NAME_POOL.length),
  );

  const customers = generateCustomers(customerNames, minSubOrders);
  const { orders, subOrders } = generateOrdersAndSubOrders(
    customers,
    minSubOrders,
    salmons,
    warehouses,
    suppliers,
  );

  return {
    salmons,
    warehouses,
    suppliers,
    customers,
    prices: generatePrices(salmons, realSuppliers),
    stocks: generateStocks(salmons, realWarehouses, realSuppliers, minSubOrders),
    orders,
    subOrders,
    allocations: [],
  };
}
