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
  CUSTOMER_NAMES,
  REAL_SUPPLIERS,
  REAL_WAREHOUSES,
  REMARKS,
  SALMONS,
  SUPPLIERS,
  WAREHOUSES,
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

const randInt = (min: number, max: number) =>
  Math.floor(random() * (max - min + 1)) + min;

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

function generateCustomers(): Customer[] {
  return CUSTOMER_NAMES.map((name) => {
    const creditLimit = randInt(50, 500) * 1000;
    return {
      id: nextId("CT"),
      name,
      creditLimit,
      creditUsed: randInt(0, creditLimit * 0.5),
    };
  });
}

function generatePrices(): Price[] {
  const prices: Price[] = [];
  for (const salmon of SALMONS) {
    for (const supplier of REAL_SUPPLIERS) {
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

function generateStocks(): Stock[] {
  const stocks: Stock[] = [];
  for (const salmon of SALMONS) {
    for (const warehouse of REAL_WAREHOUSES) {
      for (const supplier of REAL_SUPPLIERS) {
        stocks.push({
          id: nextId("STK"),
          salmonId: salmon.id,
          warehouseId: warehouse.id,
          supplierId: supplier.id,
          qty: randInt(0, 2000),
        });
      }
    }
  }
  return stocks;
}

function generateOrdersAndSubOrders(
  customers: Customer[],
  minSubOrders: number,
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
        salmonId: pick(SALMONS).id,
        warehouseId: pick(WAREHOUSES).id,
        supplierId: pick(SUPPLIERS).id,
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

  const customers = generateCustomers();
  const { orders, subOrders } = generateOrdersAndSubOrders(
    customers,
    minSubOrders,
  );

  return {
    salmons: SALMONS,
    warehouses: WAREHOUSES,
    suppliers: SUPPLIERS,
    customers,
    prices: generatePrices(),
    stocks: generateStocks(),
    orders,
    subOrders,
    allocations: [],
  };
}
