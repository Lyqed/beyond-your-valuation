/** Integer cents at the boundary; BigInt for intermediate multiplication. */
export function integer(value: number, name: string, min = 0, max = 10_000_000_000_000): number {
  if (!Number.isSafeInteger(value) || value < min || value > max) throw new RangeError(`${name} must be an integer from ${min} to ${max}.`);
  return value;
}

export function mulDiv(value: number, numerator: number, denominator: number, roundUp = false): number {
  integer(value, 'amount'); integer(numerator, 'numerator'); integer(denominator, 'denominator', 1);
  const product = BigInt(value) * BigInt(numerator), divisor = BigInt(denominator);
  return Number((product + (roundUp ? divisor - 1n : 0n)) / divisor);
}

/** Largest remainders allocate every cent; input order breaks equal remainders. */
export function allocate(amount: number, weights: readonly number[]): number[] {
  integer(amount, 'amount'); weights.forEach(w => integer(w, 'weight', 0, 10_000));
  const total = weights.reduce((a, b) => a + b, 0);
  if (!total) { if (amount) throw new RangeError('A positive amount needs a positive allocation.'); return weights.map(() => 0); }
  const divisor = BigInt(total), products = weights.map(w => BigInt(amount) * BigInt(w));
  const result = products.map(p => Number(p / divisor));
  const remainders = products.map((p, index) => ({ index, value: p % divisor })).sort((a, b) => a.value === b.value ? a.index - b.index : a.value > b.value ? -1 : 1);
  const left = amount - result.reduce((a, b) => a + b, 0);
  for (let i = 0; i < left; i++) result[remainders[i].index]++;
  return result;
}

export type TraceRow = { label: string; amountCents: number; calculation: string };
export const exactMoney = (cents: number, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100);
