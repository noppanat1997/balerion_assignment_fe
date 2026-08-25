"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CustomerCreditCard,
  isOverCredit,
} from "@/components/customer-credit-card";
import { useAllocation } from "@/store/use-allocation";
import { pickStock } from "@/lib/engine/stock";
import { findBasePrice, getUnitPrice } from "@/lib/engine/price";
import { PRICE_TIER } from "@/lib/constants";
import { multiply, round2 } from "@/lib/money";
import type { SubOrder } from "@/lib/types";
import { formatMoney, formatQty, idName } from "@/lib/utils";

interface ManualAssignDialogProps {
  subOrderId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ManualAssignDialog({
  subOrderId,
  onOpenChange,
}: ManualAssignDialogProps) {
  const subOrder =
    useAllocation((s) => s.data.subOrders.find((so) => so.id === subOrderId)) ??
    null;

  return (
    <Dialog open={subOrderId !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Stock</DialogTitle>
        </DialogHeader>
        {subOrder && (
          <ManualAssignForm
            key={subOrder.id}
            subOrder={subOrder}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ManualAssignForm({
  subOrder,
  onDone,
}: {
  subOrder: SubOrder;
  onDone: () => void;
}) {
  const data = useAllocation((s) => s.data);
  const assignStock = useAllocation((s) => s.assignStock);

  const customer =
    data.customers.find((c) => c.id === subOrder.customerId) ?? null;
  const eligibleStocks = pickStock(subOrder, data.stocks, data.prices);
  const needQty = subOrder.requestQty - subOrder.allocatedQty;

  const warehouseIds = [...new Set(eligibleStocks.map((s) => s.warehouseId))];
  const supplierIds = [...new Set(eligibleStocks.map((s) => s.supplierId))];

  const salmonQty = eligibleStocks.reduce((sum, s) => sum + s.qty, 0);
  const qtyForWarehouse = (id: string) =>
    eligibleStocks
      .filter((s) => s.warehouseId === id)
      .reduce((sum, s) => sum + s.qty, 0);
  const qtyForSupplier = (id: string) =>
    eligibleStocks
      .filter((s) => s.supplierId === id)
      .reduce((sum, s) => sum + s.qty, 0);

  const [warehouseId, setWarehouseId] = useState(warehouseIds[0] ?? "");
  const [supplierId, setSupplierId] = useState(supplierIds[0] ?? "");

  const selectedStock =
    eligibleStocks.find(
      (s) => s.warehouseId === warehouseId && s.supplierId === supplierId,
    ) ?? null;

  const [qty, setQty] = useState("0");

  function selectWarehouse(id: string) {
    setWarehouseId(id);
    setQty("0");
  }

  function selectSupplier(id: string) {
    setSupplierId(id);
    setQty("0");
  }

  const salmonName =
    data.salmons.find((s) => s.id === subOrder.salmonId)?.name ??
    subOrder.salmonId;
  const warehouseName = (id: string) => {
    const name = data.warehouses.find((w) => w.id === id)?.name;
    return name ? idName(id, name) : id;
  };
  const supplierName = (id: string) => {
    const name = data.suppliers.find((s) => s.id === id)?.name;
    return name ? idName(id, name) : id;
  };

  const basePrice = selectedStock
    ? findBasePrice(
        selectedStock.salmonId,
        selectedStock.supplierId,
        data.prices,
      )
    : null;
  const unitPrice = selectedStock
    ? getUnitPrice(
        subOrder.priorityType,
        selectedStock.salmonId,
        selectedStock.supplierId,
        data.prices,
      )
    : null;

  const qtyNum = Number(qty);
  const cost =
    unitPrice !== null ? round2(multiply(unitPrice, qtyNum || 0)) : 0;

  const creditLimit = customer?.creditLimit ?? 0;
  const creditUsed = customer?.creditUsed ?? 0;
  const overCredit =
    customer !== null && isOverCredit(creditLimit, creditUsed, cost);

  const canSubmit =
    selectedStock !== null &&
    Number.isInteger(qtyNum) &&
    qtyNum > 0 &&
    qtyNum <= selectedStock.qty &&
    qtyNum <= needQty &&
    unitPrice !== null &&
    !overCredit;

  function handleAssign() {
    if (!selectedStock || !canSubmit) return;
    assignStock({
      subOrderId: subOrder.id,
      stockId: selectedStock.id,
      qty: qtyNum,
    });
    onDone();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <p className="text-muted-foreground text-sm">Needs {needQty} more kg</p>

        <div className="flex flex-col gap-2 p-2 border rounded-lg">
          <div className="gap-2 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr]">
            <Select value={subOrder.salmonId} disabled>
              <SelectTrigger className="w-full">
                <SelectValue>{salmonName}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={subOrder.salmonId}>
                  <span className="flex justify-between items-center gap-2 w-full min-w-0">
                    <span className="font-medium truncate">{salmonName}</span>
                    <span className="text-muted-foreground text-xs shrink-0">
                      {formatQty(salmonQty)} left
                    </span>
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={warehouseId}
              onValueChange={selectWarehouse}
              disabled={warehouseIds.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Warehouse">
                  {warehouseId ? warehouseName(warehouseId) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {warehouseIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex justify-between items-center gap-2 w-full min-w-0">
                      <span className="font-medium truncate">
                        {warehouseName(id)}
                      </span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {formatQty(qtyForWarehouse(id))} left
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={supplierId}
              onValueChange={selectSupplier}
              disabled={supplierIds.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Supplier">
                  {supplierId ? supplierName(supplierId) : undefined}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {supplierIds.map((id) => (
                  <SelectItem key={id} value={id}>
                    <span className="flex justify-between items-center gap-2 w-full min-w-0">
                      <span className="font-medium truncate">
                        {supplierName(id)}
                      </span>
                      <span className="text-muted-foreground text-xs shrink-0">
                        {formatQty(qtyForSupplier(id))} left
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eligibleStocks.length === 0 ? (
            <p className="px-1 text-muted-foreground text-sm">
              No eligible stock found.
            </p>
          ) : !selectedStock ? (
            <p className="px-1 text-muted-foreground text-sm">
              No stock for this combination.
            </p>
          ) : (
            <p className="px-1 text-muted-foreground text-xs">
              {selectedStock.qty} kg available
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <div className="flex items-center gap-1.5">
              <Label className="text-muted-foreground text-xs">Qty</Label>
              <Input
                type="number"
                min={1}
                step={1}
                max={
                  selectedStock
                    ? Math.min(selectedStock.qty, needQty)
                    : undefined
                }
                className="w-20"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                disabled={!selectedStock}
              />
            </div>
            <span className="min-w-0 text-muted-foreground text-xs truncate">
              {unitPrice !== null
                ? `@ ${formatMoney(unitPrice)} = ${formatMoney(cost)} THB`
                : "no price"}
            </span>
          </div>
          {basePrice !== null && unitPrice !== null && (
            <p className="px-1 text-muted-foreground text-xs">
              {formatMoney(basePrice)} × {PRICE_TIER[subOrder.priorityType]} (
              {subOrder.priorityType}) = {formatMoney(unitPrice)} THB/kg
            </p>
          )}
        </div>

        {customer && (
          <CustomerCreditCard
            creditLimit={creditLimit}
            creditUsed={creditUsed}
            pendingCost={cost}
          />
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={handleAssign} disabled={!canSubmit}>
          Assign
        </Button>
      </DialogFooter>
    </>
  );
}
