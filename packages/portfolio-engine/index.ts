import { allocate, exactMoney, integer, mulDiv, type TraceRow } from '../shared/money';

export const assetDefinitions = [
  { id: 'cash', label: 'Cash', lossBps: 0, liquid: true },
  { id: 'equities', label: 'Public shares', lossBps: 3500, liquid: true },
  { id: 'bonds', label: 'Bonds', lossBps: 800, liquid: true },
  { id: 'property', label: 'Property', lossBps: 1200, liquid: false },
  { id: 'privateEquity', label: 'Private equity', lossBps: 2000, liquid: false },
  { id: 'venture', label: 'Your next company', lossBps: 5000, liquid: false },
] as const;

export type PortfolioInput = {
  capitalCents: number; allocationsBps: number[]; marketShock: boolean; fxShock: boolean;
  capitalCallCents: number; familyExpenseIlsCents: number; ventureCallCents: number; fxRateMicros: number;
};
export const portfolioPresets = {
  'paper-rich': [300, 1700, 1000, 3000, 2500, 1500],
  'room-to-move': [2000, 3500, 2500, 1000, 500, 500],
  'all-in-again': [500, 1000, 500, 1000, 1000, 6000],
};
export const defaultPortfolio: PortfolioInput = {
  capitalCents: 500_000_000, allocationsBps: [...portfolioPresets['paper-rich']], marketShock: false, fxShock: false,
  capitalCallCents: 0, familyExpenseIlsCents: 0, ventureCallCents: 0, fxRateMicros: 3_600_000,
};
export function validatePortfolio(input: PortfolioInput): PortfolioInput {
  if (!input || typeof input !== 'object') throw new TypeError('A portfolio scenario is required.');
  for (const key of ['capitalCents', 'capitalCallCents', 'familyExpenseIlsCents', 'ventureCallCents'] as const) integer(input[key], key);
  integer(input.fxRateMicros, 'USD/ILS rate', 100_000, 100_000_000);
  if (typeof input.marketShock !== 'boolean' || typeof input.fxShock !== 'boolean') throw new TypeError('Scenario switches must be booleans.');
  if (!Array.isArray(input.allocationsBps) || input.allocationsBps.length !== 6) throw new RangeError('Six asset allocations are required.');
  input.allocationsBps.forEach(v => integer(v, 'allocation', 0, 10_000));
  if (input.allocationsBps.reduce((a, b) => a + b, 0) !== 10_000) throw new RangeError('Allocations must total 100%.');
  return input;
}
export function calculatePortfolio(raw: PortfolioInput) {
  const input = validatePortfolio(raw), original = allocate(input.capitalCents, input.allocationsBps);
  const assets = assetDefinitions.map((asset, index) => ({ ...asset, beforeCents: original[index], valueCents: mulDiv(original[index], input.marketShock ? 10_000 - asset.lossBps : 10_000, 10_000), ownershipBps: input.allocationsBps[index] }));
  const totalCents = assets.reduce((sum, a) => sum + a.valueCents, 0);
  const liquidCents = assets.filter(a => a.liquid).reduce((sum, a) => sum + a.valueCents, 0);
  const cashCents = assets[0].valueCents, lockedCents = totalCents - liquidCents;
  const effectiveFxMicros = mulDiv(input.fxRateMicros, input.fxShock ? 8000 : 10_000, 10_000);
  const expenseUsdCents = mulDiv(input.familyExpenseIlsCents, 1_000_000, effectiveFxMicros, true);
  const dueCents = input.capitalCallCents + input.ventureCallCents + expenseUsdCents;
  const shortfallCents = Math.max(0, dueCents - liquidCents), surplusCents = Math.max(0, liquidCents - dueCents);
  const purchasingPowerIlsCents = mulDiv(totalCents, effectiveFxMicros, 1_000_000);
  const trace: TraceRow[] = assets.map(a => ({ label: a.label, amountCents: a.valueCents, calculation: `${exactMoney(a.beforeCents)} × ${input.marketShock ? (10_000 - a.lossBps) / 100 : 100}%. ${a.liquid ? 'Available within 30 days in this model.' : 'No sale available within 30 days in this model.'}` }));
  trace.push(
    { label: 'Available within 30 days', amountCents: liquidCents, calculation: 'Cash + stressed public shares + stressed bonds, before paying obligations. No sale fees or taxes modeled.' },
    { label: 'Family expense in USD', amountCents: expenseUsdCents, calculation: `${exactMoney(input.familyExpenseIlsCents, 'ILS')} ÷ ${(effectiveFxMicros / 1_000_000).toFixed(2)} ILS per USD. Rounded up to a cent.` },
    { label: 'Total due within 30 days', amountCents: dueCents, calculation: `Private equity call ${exactMoney(input.capitalCallCents)} + new-company call ${exactMoney(input.ventureCallCents)} + family expense ${exactMoney(expenseUsdCents)}.` },
    { label: 'Funding shortfall', amountCents: shortfallCents, calculation: 'max(obligations − available funds, 0). No asset purchases or payments have yet been posted.' },
  );
  return { assets, totalCents, liquidCents, cashCents, lockedCents, effectiveFxMicros, expenseUsdCents, dueCents, shortfallCents, surplusCents, purchasingPowerIlsCents, trace };
}
