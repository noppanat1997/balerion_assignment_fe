"use client";

import { useEffect, useState } from "react";
import { useAllocation } from "@/store/use-allocation";
import { CreateOrderDialog } from "@/components/create-order-dialog";
import { ResetDatasetDialog } from "@/components/reset-dataset-dialog";
import { SubOrdersTable } from "@/components/sub-orders-table";
import { OrderStats } from "@/components/order-stats";

export default function Home() {
  const [isMounted, setIsMounted] = useState(false);
  const init = useAllocation((s) => s.init);

  useEffect(() => {
    Promise.resolve(useAllocation.persist.rehydrate()).then(() => {
      init();
      setIsMounted(true);
    });
  }, [init]);

  if (!isMounted) return null;

  return (
    <div className="flex flex-1 justify-center p-3 sm:p-6 overflow-hidden">
      <div className="flex flex-col gap-4 w-full max-w-6xl min-h-0">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h1 className="font-medium text-2xl sm:text-3xl">
              <span className="font-black text-[#fa8072]">///</span> SALMONERIA
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <CreateOrderDialog />
            <ResetDatasetDialog />
          </div>
        </div>
        <OrderStats />
        <SubOrdersTable />
      </div>
    </div>
  );
}
