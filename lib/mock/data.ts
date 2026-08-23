import { ANY_SUPPLIER, ANY_WAREHOUSE } from "../constants";
import type { Salmon, Supplier, Warehouse } from "../types";

export const SALMONS: Salmon[] = [
  { id: "Item-1", name: "Atlantic Salmon" },
  { id: "Item-2", name: "Sockeye Salmon" },
  { id: "Item-3", name: "Coho Salmon" },
  { id: "Item-4", name: "King Salmon" },
  { id: "Item-5", name: "Pink Salmon" },
  { id: "Item-6", name: "Chum Salmon" },
];

/** WH-000 is the wildcard, it never holds stock of its own */
export const WAREHOUSES: Warehouse[] = [
  { id: ANY_WAREHOUSE, name: "Any Warehouse" },
  { id: "WH-001", name: "Bangkok Cold Store" },
  { id: "WH-002", name: "Prakan Freezer Hub" },
  { id: "WH-003", name: "Chabang Port DC" },
  { id: "WH-004", name: "Chiang Mai DC" },
  { id: "WH-005", name: "Phuket Depot" },
];

/** SP-000 is the wildcard, it never supplies stock of its own */
export const SUPPLIERS: Supplier[] = [
  { id: ANY_SUPPLIER, name: "Any Supplier" },
  { id: "SP-001", name: "Nordic Fjord" },
  { id: "SP-002", name: "Bergen Marine" },
  { id: "SP-003", name: "Austral Chile" },
  { id: "SP-004", name: "Hokkaido Foods" },
  { id: "SP-005", name: "Alaska Catch" },
];

export const REAL_WAREHOUSES = WAREHOUSES.filter(
  (warehouse) => warehouse.id !== ANY_WAREHOUSE,
);
export const REAL_SUPPLIERS = SUPPLIERS.filter(
  (supplier) => supplier.id !== ANY_SUPPLIER,
);

export const CUSTOMER_NAMES = [
  "Sakura Sushi",
  "Ocean Basket",
  "Fuji Mart",
  "Siam Deli",
  "Blue Fin Izakaya",
  "Chao Phraya Grill",
  "Hokkaido Ramen",
  "Andaman Seafood",
  "Golden Bay Hotel",
  "Rimping Mart",
  "Kinu Omakase",
  "Nordic Table",
  "Bangkok Poke",
  "Silom Sashimi",
  "Emerald Catering",
  "Pacific Wave",
  "Thonglor Fish Mart",
  "Coral Reef Diner",
  "Sunrise Bento",
  "Riverside Buffet",
  "Sea Breeze Resort",
  "Isan Fusion",
  "Krabi Beach Club",
  "Nimman Sushi",
  "Pattaya Seafood",
];

export const REMARKS = [
  "Special for VIP",
  "Ship with cold chain truck",
  "Weekly contract",
  "Confirm before dispatch",
  "Split delivery allowed",
];
