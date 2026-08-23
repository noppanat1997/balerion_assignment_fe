import { allocate } from "@/lib/engine/allocate";
import { manualAllocate } from "@/lib/engine/manual";
import { Dataset, generateDataset } from "@/lib/mock/generate";
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

interface AllocationState {
  data: Dataset;

  init: () => void;
  reset: () => void;
  manualAllocate: (subOrderId: string) => void;
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
      reset: () => set({ data: allocateDataset(generateDataset()) }),
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
