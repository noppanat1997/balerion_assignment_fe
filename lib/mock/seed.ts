// Fixed seed so generateDataset() always produces the same mock data by
// default, meaning a "reset" restores the same default dataset every time.
export const DEFAULT_SEED = 42;

function createRng(seed: number) {
  let state = seed;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let rng = createRng(DEFAULT_SEED);
let counters: Record<string, number> = {};

export function resetSeed(seed: number = DEFAULT_SEED): void {
  rng = createRng(seed);
  counters = {};
}

export function random(): number {
  return rng();
}

// Readable, running-number id, e.g. nextId("CT") -> "CT-0001", "CT-0002", ...
export function nextId(prefix: string, width = 4): string {
  const next = (counters[prefix] ?? 0) + 1;
  counters[prefix] = next;
  return `${prefix}-${String(next).padStart(width, "0")}`;
}

// A sub order id nests under its parent order, e.g. "ORDER-0001-001".
export function subOrderId(orderId: string, seq: number): string {
  return `${orderId}-${String(seq).padStart(3, "0")}`;
}

// Derives the next running number from ids already present in the data, so
// ids created at runtime (e.g. a new order) keep counting up from whatever
// was last generated/persisted, independent of the generator's own counters.
export function nextIdFrom(
  existingIds: string[],
  prefix: string,
  width = 4,
): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  const max = existingIds.reduce((acc, id) => {
    const match = pattern.exec(id);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(width, "0")}`;
}
