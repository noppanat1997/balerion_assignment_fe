import { PriorityType } from "./types";

export const TYPE_PRIORITY: Record<PriorityType, number> = {
  EMERGENCY: 0,
  OVER_DUE: 1,
  DAILY: 2,
};
export const PRICE_TIER: Record<PriorityType, number> = {
  EMERGENCY: 1.25,
  OVER_DUE: 1.0,
  DAILY: 0.9,
};
export const ANY_WAREHOUSE = "WH-000";
export const ANY_SUPPLIER = "SP-000";
