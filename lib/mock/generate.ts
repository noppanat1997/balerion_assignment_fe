import { nanoid } from "nanoid";
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
const MIN_SUBORDERS = 5000;

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

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
      id: nanoid(),
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
        id: nanoid(),
        salmonId: salmon.id,
        supplierId: supplier.id,
        price: randInt(100, 500),
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
          id: nanoid(),
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

function generateOrdersAndSubOrders(customers: Customer[]) {
  const orders: Order[] = [];
  const subOrders: SubOrder[] = [];

  while (subOrders.length < MIN_SUBORDERS) {
    const order: Order = { id: nanoid(), customerId: pick(customers).id };
    orders.push(order);

    const lineCount = randInt(1, 4);
    for (let seq = 0; seq < lineCount; seq++) {
      subOrders.push({
        id: nanoid(),
        orderId: order.id,
        customerId: order.customerId,
        salmonId: pick(SALMONS).id,
        warehouseId: pick(WAREHOUSES).id,
        supplierId: pick(SUPPLIERS).id,
        seq,
        requestQty: randInt(1, 200),
        allocatedQty: 0,
        totalAmount: 0,
        priorityType: pick(PRIORITY_TYPES),
        fillStatus: "NONE",
        remark: Math.random() < 0.2 ? pick(REMARKS) : undefined,
        createdAt: randomDate(),
      });
    }
  }

  return { orders, subOrders: shuffle(subOrders) };
}

export function generateDataset(): Dataset {
  const customers = generateCustomers();
  const { orders, subOrders } = generateOrdersAndSubOrders(customers);

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
