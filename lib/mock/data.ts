import { ANY_SUPPLIER, ANY_WAREHOUSE } from "../constants";
import type { Salmon, Supplier, Warehouse } from "../types";

// Pools are sized for large generated datasets; generate.ts picks a
// count proportional to how many sub orders are being generated instead
// of always using the whole pool, so a small dataset still feels small.

export const SALMON_POOL: Salmon[] = [
  { id: "Item-1", name: "Fatty" },
  { id: "Item-2", name: "Skinny" },
  { id: "Item-3", name: "Big" },
  { id: "Item-4", name: "Silver" },
  { id: "Item-5", name: "Golden" },
  { id: "Item-6", name: "Slim" },
  { id: "Item-7", name: "Chunky" },
  { id: "Item-8", name: "Pink" },
];

/** WH-000 is the wildcard, it never holds stock of its own */
export const WILDCARD_WAREHOUSE: Warehouse = {
  id: ANY_WAREHOUSE,
  name: "Any Warehouse",
};
export const WAREHOUSE_POOL: Warehouse[] = [
  { id: "WH-001", name: "Big Fridge" },
  { id: "WH-002", name: "Ice Box" },
  { id: "WH-003", name: "Cold Room" },
  { id: "WH-004", name: "Frost Vault" },
  { id: "WH-005", name: "Chill Dock" },
  { id: "WH-006", name: "Arctic Bay" },
  { id: "WH-007", name: "Deep Freeze" },
];

/** SP-000 is the wildcard, it never supplies stock of its own */
export const WILDCARD_SUPPLIER: Supplier = {
  id: ANY_SUPPLIER,
  name: "Any Supplier",
};
export const SUPPLIER_POOL: Supplier[] = [
  { id: "SP-001", name: "Wave Rider" },
  { id: "SP-002", name: "Deep Blue" },
  { id: "SP-003", name: "Net Master" },
  { id: "SP-004", name: "Blue Current" },
  { id: "SP-005", name: "Tide Runner" },
  { id: "SP-006", name: "Coral Reach" },
  { id: "SP-007", name: "Silver Wake" },
];

export const CUSTOMER_NAME_POOL = [
  "Fish House",
  "Sushi Spot",
  "Fresh Table",
  "Fish Market",
  "Ocean Grill",
  "Blue Wave Bistro",
  "Harbor Kitchen",
  "Salmon & Co",
  "Tide Table",
  "Catch of the Day",
  "Coastal Plate",
  "Reef House",
  "Northern Catch",
  "Bay Leaf Kitchen",
  "Marina Table",
];

export const REMARKS = [
  "Special for VIP",
  "Ship with cold chain truck",
  "Weekly contract",
  "Confirm before dispatch",
  "Split delivery allowed",
];
