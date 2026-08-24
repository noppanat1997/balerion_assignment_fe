"use client";

import { Progress } from "@/components/ui/progress";
import { minus, plus } from "@/lib/money";
import { cn, formatMoney } from "@/lib/utils";

interface CustomerCreditCardProps {
  creditLimit: number;
  creditUsed: number;
  pendingCost: number;
}

export function CustomerCreditCard({
  creditLimit,
  creditUsed,
  pendingCost,
}: CustomerCreditCardProps) {
  const projectedUsed = plus(creditUsed, pendingCost);
  const projectedLeft = minus(creditLimit, projectedUsed);
  const overCredit = projectedLeft < 0;
  const progressValue =
    creditLimit > 0 ? Math.min(100, (projectedUsed / creditLimit) * 100) : 0;

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
        <span className="text-muted-foreground">Credit left</span>
        <span
          className={cn(
            "min-w-0 truncate font-medium",
            overCredit ? "text-destructive" : "text-foreground",
          )}
        >
          {formatMoney(projectedLeft)} / {formatMoney(creditLimit)} THB
        </span>
      </div>
      <Progress
        value={progressValue}
        indicatorClassName={overCredit ? "bg-destructive" : undefined}
      />
      {overCredit && (
        <p className="text-xs text-destructive">
          Exceeds credit by {formatMoney(Math.abs(projectedLeft))} THB
        </p>
      )}
    </div>
  );
}

export function isOverCredit(
  creditLimit: number,
  creditUsed: number,
  pendingCost: number,
): boolean {
  return minus(creditLimit, plus(creditUsed, pendingCost)) < 0;
}
