import { allocate } from "@/lib/engine/allocate";
import { assignStock, manualAllocate } from "@/lib/engine/manual";
import { Dataset, GenerateOptions, generateDataset } from "@/lib/mock/generate";
import { nextIdFrom, subOrderId } from "@/lib/mock/seed";
import { Order, PriorityType, SubOrder } from "@/lib/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const EMPTY_DATASET: Dataset = {
  salmons: [],
  warehouses: [],
  suppliers: [],
  customers: [],
  prices: [],
  stocks: [],
  orders: [],
  subOrders: [],
  allocations: [],
};

// re-allocate every page refresh
function allocateDataset(data: Dataset): Dataset {
  const result = allocate({
    subOrders: data.subOrders,
    stocks: data.stocks,
    prices: data.prices,
    customers: data.customers,
  });

  return {
    ...data,
    subOrders: result.subOrders,
    stocks: result.stocks,
    customers: result.customers,
    allocations: [...data.allocations, ...result.newAllocations],
  };
}

export interface AssignStockInput {
  subOrderId: string;
  stockId: string;
  qty: number;
}

export interface OrderLineInput {
  salmonId: string;
  warehouseId: string;
  supplierId: string;
  requestQty: number;
}

export interface CreateOrderInput {
  customerId: string;
  priorityType: PriorityType;
  remark?: string;
  lines: OrderLineInput[];
}

interface AllocationState {
  data: Dataset;

  init: () => void;
  reset: (options?: GenerateOptions) => void;
  manualAllocate: (subOrderId: string) => void;
  assignStock: (input: AssignStockInput) => void;
  createOrder: (input: CreateOrderInput) => void;
}

export const useAllocation = create<AllocationState>()(
  persist(
    (set, get) => ({
      data: EMPTY_DATASET,
      init: () => {
        const current = get().data;
        const data =
          current.subOrders.length === 0 ? generateDataset() : current;
        set({ data: allocateDataset(data) });
      },
      reset: (options) => set({ data: allocateDataset(generateDataset(options)) }),
      manualAllocate: (subOrderId) => {
        const data = get().data;
        const result = manualAllocate({
          subOrderId,
          subOrders: data.subOrders,
          stocks: data.stocks,
          prices: data.prices,
          customers: data.customers,
        });

        set({
          data: {
            ...data,
            subOrders: result.subOrders,
            stocks: result.stocks,
            customers: result.customers,
            allocations: [...data.allocations, ...result.newAllocations],
          },
        });
      },
      assignStock: (input) => {
        const data = get().data;
        const result = assignStock({
          subOrderId: input.subOrderId,
          stockId: input.stockId,
          qty: input.qty,
          subOrders: data.subOrders,
          stocks: data.stocks,
          prices: data.prices,
          customers: data.customers,
        });

        set({
          data: {
            ...data,
            subOrders: result.subOrders,
            stocks: result.stocks,
            customers: result.customers,
            allocations: [...data.allocations, ...result.newAllocations],
          },
        });
      },
      // Only creates the Order/SubOrders — stock isn't assigned here. The
      // requested qty is just a target; the next allocate pass (see init())
      // is what actually fills them, same as freshly generated mock data.
      createOrder: (input) => {
        const data = get().data;

        const orderId = nextIdFrom(
          data.orders.map((o) => o.id),
          "ORDER",
        );
        const order: Order = { id: orderId, customerId: input.customerId };
        const createdAt = new Date().toISOString();
        const newSubOrders: SubOrder[] = input.lines.map((line, i) => ({
          id: subOrderId(orderId, i + 1),
          orderId,
          customerId: input.customerId,
          salmonId: line.salmonId,
          warehouseId: line.warehouseId,
          supplierId: line.supplierId,
          requestQty: line.requestQty,
          allocatedQty: 0,
          totalAmount: 0,
          priorityType: input.priorityType,
          fillStatus: "NONE",
          remark: input.remark,
          createdAt,
        }));

        set({
          data: {
            ...data,
            orders: [...data.orders, order],
            subOrders: [...newSubOrders, ...data.subOrders],
          },
        });
      },
    }),
    {
      name: "salmon-allocation",
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (state) => ({
        data: state.data,
      }),
    },
  ),
);
