"use client";

import { useEffect, useState } from "react";
import { useAllocation } from "@/store/use-allocation";
import { CreateOrderDialog } from "@/components/create-order-dialog";
import { ResetDatasetDialog } from "@/components/reset-dataset-dialog";
import { SubOrdersTable } from "@/components/sub-orders-table";

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
    <div className="flex flex-1 justify-center p-6 overflow-hidden">
      <div className="flex flex-col gap-4 w-full max-w-6xl min-h-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="font-medium text-3xl">
              <span className="font-black text-[#fa8072]">///</span> SALMONERIA
            </h1>
          </div>
          <div className="flex gap-2">
            <CreateOrderDialog />
            <ResetDatasetDialog />
          </div>
        </div>
        <SubOrdersTable />
      </div>
    </div>
  );
}
