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
import { useAllocation } from "@/store/use-allocation";
import { DEFAULT_MIN_SUBORDERS } from "@/lib/mock/generate";
import { DEFAULT_SEED } from "@/lib/mock/seed";

const MAX_MIN_SUBORDERS = 50000;

export function ResetDatasetDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const reset = useAllocation((s) => s.reset);

  const [seed, setSeed] = useState(String(DEFAULT_SEED));
  const [minSubOrders, setMinSubOrders] = useState(
    String(DEFAULT_MIN_SUBORDERS),
  );

  const seedNum = Number(seed);
  const minSubOrdersNum = Number(minSubOrders);
  const canSubmit =
    !pending &&
    Number.isInteger(seedNum) &&
    Number.isInteger(minSubOrdersNum) &&
    minSubOrdersNum > 0 &&
    minSubOrdersNum <= MAX_MIN_SUBORDERS;

  function handleReset() {
    if (!canSubmit) return;
    // Let the "Resetting..." state paint before the synchronous
    // generate+allocate pass blocks the main thread for large datasets.
    setPending(true);
    setTimeout(() => {
      reset({ seed: seedNum, minSubOrders: minSubOrdersNum });
      setPending(false);
      setOpen(false);
    }, 0);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Reset Dataset</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Reset Dataset</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Seed</Label>
            <Input
              type="number"
              value={seed}
              disabled={pending}
              onChange={(e) => setSeed(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Min Sub Orders</Label>
            <Input
              type="number"
              min={1}
              max={MAX_MIN_SUBORDERS}
              value={minSubOrders}
              disabled={pending}
              onChange={(e) => setMinSubOrders(e.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              Up to {MAX_MIN_SUBORDERS.toLocaleString()}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={handleReset} disabled={!canSubmit}>
            {pending ? "Resetting…" : "Reset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
