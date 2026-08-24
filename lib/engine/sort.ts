import { TYPE_PRIORITY } from "../constants";
import { SubOrder } from "../types";

export function compareSubOrders(a: SubOrder, b: SubOrder): number {
  const byType = TYPE_PRIORITY[a.priorityType] - TYPE_PRIORITY[b.priorityType];
  if (byType !== 0) return byType;

  const byDate = a.createdAt.localeCompare(b.createdAt);
  if (byDate !== 0) return byDate;

  const byOrder = a.orderId.localeCompare(b.orderId);
  if (byOrder !== 0) return byOrder;

  return a.id.localeCompare(b.id);
}

export function sortSubOrders(subOrders: SubOrder[]): SubOrder[] {
  return [...subOrders].sort(compareSubOrders);
}
