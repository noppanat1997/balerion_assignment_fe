"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  CustomerCreditCard,
  isOverCredit,
} from "@/components/customer-credit-card";
import { useAllocation, type OrderLineInput } from "@/store/use-allocation";
import { ANY_SUPPLIER, ANY_WAREHOUSE, PRICE_TIER } from "@/lib/constants";
import { findBasePrice } from "@/lib/engine/price";
import { estimateUnitPrice, stockQtyAvailable } from "@/lib/engine/stock";
import { multiply, plus, round2 } from "@/lib/money";
import { PriorityType } from "@/lib/types";
import { formatMoney, idName } from "@/lib/utils";

const PRIORITIES: PriorityType[] = ["EMERGENCY", "OVER_DUE", "DAILY"];

let lineKeySeq = 0;
const nextLineKey = () => `line-${++lineKeySeq}`;

interface LineState {
  key: string;
  salmonId: string;
  warehouseId: string;
  supplierId: string;
  requestQty: string;
}

const emptyLine = (): LineState => ({
  key: nextLineKey(),
  salmonId: "",
  warehouseId: ANY_WAREHOUSE,
  supplierId: ANY_SUPPLIER,
  requestQty: "1",
});

export function CreateOrderDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Order</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Order</DialogTitle>
        </DialogHeader>
        <CreateOrderForm onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CreateOrderForm({ onDone }: { onDone: () => void }) {
  const data = useAllocation((s) => s.data);
  const createOrder = useAllocation((s) => s.createOrder);

  const [customerId, setCustomerId] = useState("");
  const [priorityType, setPriorityType] = useState<PriorityType>("DAILY");
  const [remark, setRemark] = useState("");
  const [lines, setLines] = useState<LineState[]>([emptyLine()]);

  const customer = data.customers.find((c) => c.id === customerId) ?? null;

  function updateLine(key: string, patch: Partial<LineState>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((prev) => [...prev, emptyLine()]);
  }

  function removeLine(key: string) {
    setLines((prev) =>
      prev.length > 1 ? prev.filter((line) => line.key !== key) : prev,
    );
  }

  const priced = lines.map((line) => {
    const qty = Number(line.requestQty) || 0;
    const basePrice = line.salmonId
      ? findBasePrice(line.salmonId, line.supplierId, data.prices)
      : null;
    const unitPrice = line.salmonId
      ? estimateUnitPrice(
          priorityType,
          line.salmonId,
          line.warehouseId,
          line.supplierId,
          data.stocks,
          data.prices,
        )
      : null;
    const cost = unitPrice !== null ? round2(multiply(unitPrice, qty)) : null;
    const availableQty = line.salmonId
      ? stockQtyAvailable(
          line.salmonId,
          line.warehouseId,
          line.supplierId,
          data.stocks,
          data.prices,
        )
      : null;
    return { ...line, qty, basePrice, unitPrice, cost, availableQty };
  });

  const totalCost = round2(
    priced.reduce((sum, line) => plus(sum, line.cost ?? 0), 0),
  );

  const creditLimit = customer?.creditLimit ?? 0;
  const creditUsed = customer?.creditUsed ?? 0;
  const overCredit =
    customer !== null && isOverCredit(creditLimit, creditUsed, totalCost);

  const linesValid = priced.every(
    (line) => line.salmonId !== "" && Number.isInteger(line.qty) && line.qty > 0,
  );
  const canSubmit = customerId !== "" && linesValid && !overCredit;

  function handleSubmit() {
    if (!canSubmit) return;
    const orderLines: OrderLineInput[] = priced.map((line) => ({
      salmonId: line.salmonId,
      warehouseId: line.warehouseId,
      supplierId: line.supplierId,
      requestQty: line.qty,
    }));

    createOrder({
      customerId,
      priorityType,
      remark: remark || undefined,
      lines: orderLines,
    });
    onDone();
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Customer</Label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select customer" />
            </SelectTrigger>
            <SelectContent>
              {data.customers.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {idName(c.id, c.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {customer && (
          <CustomerCreditCard
            creditLimit={creditLimit}
            creditUsed={creditUsed}
            pendingCost={totalCost}
          />
        )}

        <div className="gap-3 grid grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Priority</Label>
            <Select
              value={priorityType}
              onValueChange={(v) => setPriorityType(v as PriorityType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Remark</Label>
            <Input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <Label>Salmon</Label>
            <Button size="sm" variant="outline" onClick={addLine}>
              <span className="font-black text-[#fa8072]">///</span>
              Add Salmon
            </Button>
          </div>

          <ScrollArea
            className={priced.length > 3 ? "h-[27.5rem] pr-3 -mr-3" : ""}
          >
            <div className="flex flex-col gap-2">
              {priced.map((line) => (
                <div
                  key={line.key}
                  className="flex flex-col gap-2 p-2 border rounded-lg"
                >
                  <div className="gap-2 grid grid-cols-[1fr_1fr_1fr]">
                    <Select
                      value={line.salmonId}
                      onValueChange={(v) =>
                        updateLine(line.key, { salmonId: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Salmon" />
                      </SelectTrigger>
                      <SelectContent>
                        {data.salmons.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={line.warehouseId}
                      onValueChange={(v) =>
                        updateLine(line.key, { warehouseId: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {idName(w.id, w.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={line.supplierId}
                      onValueChange={(v) =>
                        updateLine(line.key, { supplierId: v })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {data.suppliers.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {idName(s.id, s.name)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <div className="flex items-center gap-1.5">
                      <Label className="text-muted-foreground text-xs">
                        Qty
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        className="w-20"
                        value={line.requestQty}
                        onChange={(e) =>
                          updateLine(line.key, { requestQty: e.target.value })
                        }
                      />
                      {line.salmonId !== "" && (
                        <span className="text-muted-foreground text-xs">
                          / {line.availableQty ?? 0} kg
                        </span>
                      )}
                    </div>
                    <span className="min-w-0 text-muted-foreground text-xs truncate">
                      {line.unitPrice !== null
                        ? `@ ${formatMoney(line.unitPrice)} = ${formatMoney(line.cost ?? 0)} THB`
                        : "no price"}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      disabled={lines.length === 1}
                      onClick={() => removeLine(line.key)}
                    >
                      Remove
                    </Button>
                  </div>
                  {line.basePrice !== null && line.unitPrice !== null && (
                    <p className="text-muted-foreground text-xs">
                      {formatMoney(line.basePrice)} ×{" "}
                      {PRICE_TIER[priorityType]} ({priorityType}) ={" "}
                      {formatMoney(line.unitPrice)} THB/kg
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit}>
          Create
        </Button>
      </DialogFooter>
    </>
  );
}
