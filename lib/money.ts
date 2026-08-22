import Decimal from "decimal.js";

export const round2 = (v: Decimal.Value) =>
  new Decimal(v).toDecimalPlaces(2, Decimal.ROUND_HALF_EVEN).toNumber();

export const floor = (v: Decimal.Value) => new Decimal(v).floor().toNumber();

export const divide = (a: Decimal.Value, b: Decimal.Value) =>
  new Decimal(a).div(b);

export const multiply = (a: Decimal.Value, b: Decimal.Value) =>
  new Decimal(a).times(b);

export const minus = (a: Decimal.Value, b: Decimal.Value) =>
  new Decimal(a).minus(b).toNumber();

export const plus = (a: Decimal.Value, b: Decimal.Value) =>
  new Decimal(a).plus(b).toNumber();
