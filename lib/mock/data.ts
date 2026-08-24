import { ANY_SUPPLIER, ANY_WAREHOUSE } from "../constants";
import type { Salmon, Supplier, Warehouse } from "../types";

export const SALMONS: Salmon[] = [
  { id: "Item-1", name: "Fatty" },
  { id: "Item-2", name: "Skinny" },
  { id: "Item-3", name: "Big" },
];

/** WH-000 is the wildcard, it never holds stock of its own */
export const WAREHOUSES: Warehouse[] = [
  { id: ANY_WAREHOUSE, name: "Any Warehouse" },
  { id: "WH-001", name: "Big Fridge" },
  { id: "WH-002", name: "Ice Box" },
  { id: "WH-003", name: "Cold Room" },
];

/** SP-000 is the wildcard, it never supplies stock of its own */
export const SUPPLIERS: Supplier[] = [
  { id: ANY_SUPPLIER, name: "Any Supplier" },
  { id: "SP-001", name: "Wave Rider" },
  { id: "SP-002", name: "Deep Blue" },
  { id: "SP-003", name: "Net Master" },
];

export const REAL_WAREHOUSES = WAREHOUSES.filter(
  (warehouse) => warehouse.id !== ANY_WAREHOUSE,
);
export const REAL_SUPPLIERS = SUPPLIERS.filter(
  (supplier) => supplier.id !== ANY_SUPPLIER,
);

export const CUSTOMER_NAMES = [
  "Fish House",
  "Sushi Spot",
  "Fresh Table",
  "Fish Market",
  "Ocean Grill",
];

export const REMARKS = [
  "Special for VIP",
  "Ship with cold chain truck",
  "Weekly contract",
  "Confirm before dispatch",
  "Split delivery allowed",
];
