"use client";

import { useMemo } from "react";
import { useAllocation } from "@/store/use-allocation";
import { Progress } from "@/components/ui/progress";
import { plus } from "@/lib/money";
import { formatMoney, formatQty } from "@/lib/utils";

export function OrderStats() {
  const subOrders = useAllocation((s) => s.data.subOrders);

  const stats = useMemo(() => {
    const today = new Date().toDateString();

    let totalAmount = 0;
    let totalAllocated = 0;
    let totalRequested = 0;
    let todayRequested = 0;
    let todayAllocated = 0;

    for (const so of subOrders) {
      totalAmount = plus(totalAmount, so.totalAmount);
      totalAllocated += so.allocatedQty;
      totalRequested += so.requestQty;

      if (new Date(so.createdAt).toDateString() === today) {
        todayRequested += so.requestQty;
        todayAllocated += so.allocatedQty;
      }
    }

    const todayAllocatedRatio =
      todayRequested > 0 ? (todayAllocated / todayRequested) * 100 : 0;

    return {
      totalAmount,
      totalAllocated,
      totalRequested,
      todayRequested,
      todayAllocated,
      todayAllocatedRatio,
    };
  }, [subOrders]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <StatTile label="Total requested" value={formatQty(stats.totalRequested)} />
      <StatTile label="Total allocated" value={formatQty(stats.totalAllocated)} />
      <StatTile
        label="Total amount"
        value={`${formatMoney(stats.totalAmount)} THB`}
      />
      <div className="flex flex-col gap-1.5 rounded-lg border p-3">
        <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
          <span className="text-muted-foreground">Today allocated / requested</span>
          <span className="font-medium tabular-nums">
            {formatQty(stats.todayAllocated)} / {formatQty(stats.todayRequested)}
          </span>
        </div>
        <Progress value={stats.todayAllocatedRatio} />
      </div>
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-medium tabular-nums">{value}</span>
    </div>
  );
}
