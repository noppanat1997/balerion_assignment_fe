import { PRICE_TIER } from "../constants";
import { multiply, round2 } from "../money";
import { Price, PriorityType } from "../types";

export const priceKey = (salmonId: string, supplierId: string) =>
  `${salmonId}|${supplierId}`;

export function findPrice(
  salmonId: string,
  supplierId: string,
  prices: Price[],
): Price | undefined {
  return prices.find(
    (p) =>
      p.salmonId === salmonId && p.supplierId === supplierId && p.price > 0,
  );
}

export function getUnitPrice(
  priorityType: PriorityType,
  salmonId: string,
  supplierId: string,
  prices: Price[],
): number | null {
  const base = findPrice(salmonId, supplierId, prices);

  if (base === undefined) return null;
  return round2(multiply(base.price, PRICE_TIER[priorityType]));
}
