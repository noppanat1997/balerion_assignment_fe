"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PackagePlus } from "lucide-react";
import { useAllocation } from "@/store/use-allocation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ManualAssignDialog } from "@/components/manual-assign-dialog";
import { TYPE_PRIORITY } from "@/lib/constants";
import { FillStatus, PriorityType, SubOrder } from "@/lib/types";
import { formatDate, formatMoney, idName } from "@/lib/utils";

const ROW_HEIGHT = 44;
// Only the name columns (Customer/Salmon/Warehouse/Supplier) shrink+truncate
// under pressure; the rest are sized to their content so badges, numbers,
// and the action button never overflow their track.
const GRID_COLS =
  "grid-cols-[100px_100px_minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.1fr)_92px_90px_84px_120px_36px]";

const PRIORITY_VARIANT: Record<PriorityType, "destructive" | "default" | "outline"> = {
  EMERGENCY: "destructive",
  OVER_DUE: "default",
  DAILY: "outline",
};

const PRIORITY_CLASS: Partial<Record<PriorityType, string>> = {
  EMERGENCY: "bg-[#fa8072]/15 text-[#fa8072]",
};

const FILL_VARIANT: Record<FillStatus, "default" | "secondary" | "outline"> = {
  FULL: "default",
  PARTIAL: "secondary",
  NONE: "outline",
};

type PriorityFilter = PriorityType | "ALL";
type StatusFilter = FillStatus | "ALL";
type SortKey = "default" | "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

const SORT_LABEL: Record<SortKey, string> = {
  default: "Needs fill first",
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
  "amount-desc": "Amount: high to low",
  "amount-asc": "Amount: low to high",
};

// Not-yet-filled orders first (oldest, highest priority first, i.e. FIFO
// allocation order); FULL orders sink to the bottom since they need no action.
function compareDefault(a: SubOrder, b: SubOrder): number {
  const aFull = a.fillStatus === "FULL" ? 1 : 0;
  const bFull = b.fillStatus === "FULL" ? 1 : 0;
  if (aFull !== bFull) return aFull - bFull;

  const byPriority = TYPE_PRIORITY[a.priorityType] - TYPE_PRIORITY[b.priorityType];
  if (byPriority !== 0) return byPriority;

  return a.createdAt.localeCompare(b.createdAt);
}

const SORTERS: Record<SortKey, (a: SubOrder, b: SubOrder) => number> = {
  default: compareDefault,
  "date-desc": (a, b) => b.createdAt.localeCompare(a.createdAt),
  "date-asc": (a, b) => a.createdAt.localeCompare(b.createdAt),
  "amount-desc": (a, b) => b.totalAmount - a.totalAmount,
  "amount-asc": (a, b) => a.totalAmount - b.totalAmount,
};

export function SubOrdersTable() {
  const data = useAllocation((s) => s.data);
  const [assignTarget, setAssignTarget] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("default");

  const customerNames = useMemo(
    () => new Map(data.customers.map((c) => [c.id, c.name])),
    [data.customers],
  );
  const salmonNames = useMemo(
    () => new Map(data.salmons.map((s) => [s.id, s.name])),
    [data.salmons],
  );
  const warehouseNames = useMemo(
    () => new Map(data.warehouses.map((w) => [w.id, w.name])),
    [data.warehouses],
  );
  const supplierNames = useMemo(
    () => new Map(data.suppliers.map((s) => [s.id, s.name])),
    [data.suppliers],
  );

  const customerName = (id: string) => {
    const name = customerNames.get(id);
    return name ? idName(id, name) : id;
  };
  const salmonName = (id: string) => salmonNames.get(id) ?? id;
  const warehouseName = (id: string) => {
    const name = warehouseNames.get(id);
    return name ? idName(id, name) : id;
  };
  const supplierName = (id: string) => {
    const name = supplierNames.get(id);
    return name ? idName(id, name) : id;
  };

  const visibleSubOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = data.subOrders.filter((so) => {
      if (priorityFilter !== "ALL" && so.priorityType !== priorityFilter)
        return false;
      if (statusFilter !== "ALL" && so.fillStatus !== statusFilter)
        return false;
      if (q === "") return true;

      const haystack = [
        so.id,
        customerNames.get(so.customerId) ?? so.customerId,
        salmonNames.get(so.salmonId) ?? so.salmonId,
        warehouseNames.get(so.warehouseId) ?? so.warehouseId,
        supplierNames.get(so.supplierId) ?? so.supplierId,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });

    return filtered.sort(SORTERS[sortKey]);
  }, [
    data.subOrders,
    search,
    priorityFilter,
    statusFilter,
    sortKey,
    customerNames,
    salmonNames,
    warehouseNames,
    supplierNames,
  ]);

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: visibleSubOrders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 12,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sub order, customer, salmon, warehouse, supplier"
            className="w-full sm:w-64"
          />
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              <SelectItem value="EMERGENCY">EMERGENCY</SelectItem>
              <SelectItem value="OVER_DUE">OVER_DUE</SelectItem>
              <SelectItem value="DAILY">DAILY</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              <SelectItem value="FULL">FULL</SelectItem>
              <SelectItem value="PARTIAL">PARTIAL</SelectItem>
              <SelectItem value="NONE">NONE</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">
            {visibleSubOrders.length.toLocaleString()} of{" "}
            {data.subOrders.length.toLocaleString()}
          </span>

          <Select
            value={sortKey}
            onValueChange={(v) => setSortKey(v as SortKey)}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border">
        <div ref={parentRef} className="flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={`sticky top-0 z-10 grid ${GRID_COLS} gap-2 border-b bg-background px-3 py-2 text-xs text-muted-foreground`}
          >
            <div>Sub Order</div>
            <div>Date</div>
            <div>Customer</div>
            <div>Salmon</div>
            <div>Warehouse</div>
            <div>Supplier</div>
            <div>Priority</div>
            <div className="text-right">Alloc/Req</div>
            <div>Status</div>
            <div className="text-right">Amount</div>
            <div />
          </div>

          <div
            style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const so = visibleSubOrders[virtualRow.index];
              return (
                <div
                  key={so.id}
                  className={`grid ${GRID_COLS} items-center gap-2 border-b px-3 text-sm`}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: virtualRow.size,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  <div className="truncate text-xs" title={so.id}>
                    {so.id}
                  </div>
                  <div
                    className="truncate text-xs"
                    title={new Date(so.createdAt).toLocaleString()}
                  >
                    {formatDate(so.createdAt)}
                  </div>
                  <div className="truncate" title={customerName(so.customerId)}>
                    {customerName(so.customerId)}
                  </div>
                  <div className="truncate" title={salmonName(so.salmonId)}>
                    {salmonName(so.salmonId)}
                  </div>
                  <div className="truncate" title={warehouseName(so.warehouseId)}>
                    {warehouseName(so.warehouseId)}
                  </div>
                  <div className="truncate" title={supplierName(so.supplierId)}>
                    {supplierName(so.supplierId)}
                  </div>
                  <div className="overflow-hidden">
                    <Badge
                      variant={PRIORITY_VARIANT[so.priorityType]}
                      className={PRIORITY_CLASS[so.priorityType]}
                    >
                      {so.priorityType}
                    </Badge>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    {so.allocatedQty}/{so.requestQty} kg
                  </div>
                  <div className="overflow-hidden">
                    <Badge variant={FILL_VARIANT[so.fillStatus]}>
                      {so.fillStatus}
                    </Badge>
                  </div>
                  <div className="truncate text-right text-xs">
                    {formatMoney(so.totalAmount)} THB
                  </div>
                  <div className="flex justify-end">
                    <Button
                      size="icon-sm"
                      variant="outline"
                      disabled={so.fillStatus === "FULL"}
                      onClick={() => setAssignTarget(so.id)}
                      title="Manual Assign"
                      aria-label="Manual Assign"
                    >
                      <PackagePlus />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <ManualAssignDialog
        subOrderId={assignTarget}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      />
    </div>
  );
}
