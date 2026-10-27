import { allocate, exactMoney, integer, mulDiv, type TraceRow } from '../shared/money';

export type ExitInput = {
  exitCents: number;
  founderBps: number;
  investorBps: number;
  teamBps: number;
  investmentCents: number;
  preferenceMultipleBps: number;
  participation: 'non-participating' | 'participating';
  feeBps: number;
  taxBps: number;
  founderBasisCents: number;
};

export const defaultExit: ExitInput = {
  exitCents: 10_000_000_000, founderBps: 4000, investorBps: 4000, teamBps: 1000,
  investmentCents: 3_000_000_000, preferenceMultipleBps: 10_000,
  participation: 'non-participating', feeBps: 200, taxBps: 2500, founderBasisCents: 0,
};

export function validateExit(input: ExitInput): ExitInput {
  if (!input || typeof input !== 'object') throw new TypeError('An exit scenario is required.');
  for (const key of ['exitCents', 'investmentCents', 'founderBasisCents'] as const) integer(input[key], key);
  for (const key of ['founderBps', 'investorBps', 'teamBps', 'feeBps', 'taxBps'] as const) integer(input[key], key, 0, 10_000);
  integer(input.preferenceMultipleBps, 'preference multiple', 0, 30_000);
  if (input.founderBps + input.investorBps + input.teamBps > 10_000) throw new RangeError('Ownership cannot exceed 100%.');
  if (!input.investorBps && input.investmentCents) throw new RangeError('Invested capital requires investor ownership.');
  if (!['non-participating', 'participating'].includes(input.participation)) throw new RangeError('Unsupported preference type.');
  return input;
}

export function calculateExit(raw: ExitInput) {
  const input = validateExit(raw);
  const otherBps = 10_000 - input.founderBps - input.investorBps - input.teamBps;
  const feesCents = mulDiv(input.exitCents, input.feeBps, 10_000);
  const distributableCents = input.exitCents - feesCents;
  const claimCents = mulDiv(input.investmentCents, input.preferenceMultipleBps, 10_000);
  const preferenceCents = Math.min(claimCents, distributableCents);
  const weights = [input.founderBps, input.investorBps, input.teamBps, otherBps];
  const converted = allocate(distributableCents, weights);
  let proceeds: number[], decision: 'conversion' | 'preference' | 'participation';
  if (input.participation === 'participating') {
    proceeds = allocate(distributableCents - preferenceCents, weights);
    proceeds[1] += preferenceCents; decision = 'participation';
  } else if (converted[1] >= preferenceCents) {
    proceeds = converted; decision = 'conversion';
  } else {
    const common = allocate(distributableCents - preferenceCents, [input.founderBps, input.teamBps, otherBps]);
    proceeds = [common[0], preferenceCents, common[1], common[2]]; decision = 'preference';
  }
  const [founderGrossCents, investorCents, teamCents, otherCents] = proceeds;
  const taxableCents = Math.max(0, founderGrossCents - input.founderBasisCents);
  const taxCents = mulDiv(taxableCents, input.taxBps, 10_000);
  const founderNetCents = founderGrossCents - taxCents;
  const decisionText = decision === 'conversion'
    ? `Investors convert: ${exactMoney(converted[1])} as common is at least ${exactMoney(preferenceCents)} under the preference.`
    : decision === 'preference'
      ? `Investors take ${exactMoney(preferenceCents)} first. The remaining common holders split ${exactMoney(distributableCents - preferenceCents)}.`
      : `Investors take ${exactMoney(preferenceCents)} first, then ${input.investorBps / 100}% of the remainder. Participation is uncapped.`;
  const trace: TraceRow[] = [
    { label: 'Acquisition consideration', amountCents: input.exitCents, calculation: 'The fictional all-cash offer. No company debt, escrow or earn-out.' },
    { label: 'Transaction costs', amountCents: feesCents, calculation: `${input.feeBps / 100}% × ${exactMoney(input.exitCents)}, deducted before distributions.` },
    { label: 'Available to shareholders', amountCents: distributableCents, calculation: `${exactMoney(input.exitCents)} − ${exactMoney(feesCents)}` },
    { label: 'Investors receive', amountCents: investorCents, calculation: decisionText },
    { label: 'Team receives', amountCents: teamCents, calculation: `${input.teamBps / 100}% fully diluted ownership, treated as already exercised common shares.` },
    { label: 'Other common holders receive', amountCents: otherCents, calculation: `${otherBps / 100}% fully diluted ownership. Common proceeds use the selected waterfall.` },
    { label: 'Your gross proceeds', amountCents: founderGrossCents, calculation: decision === 'preference' ? `${input.founderBps} ÷ ${10_000 - input.investorBps} of the residual common pool.` : `${input.founderBps / 100}% of ${decision === 'participation' ? 'the pool after the preference' : 'the distributable pool'}.` },
    { label: 'Illustrative founder tax', amountCents: taxCents, calculation: `${input.taxBps / 100}% × max(gross proceeds − ${exactMoney(input.founderBasisCents)} basis, 0). No jurisdiction, reliefs or tax advice implied.` },
    { label: 'Your net cash', amountCents: founderNetCents, calculation: `${exactMoney(founderGrossCents)} − ${exactMoney(taxCents)}` },
  ];
  return { feesCents, distributableCents, claimCents, preferenceCents, asConvertedInvestorCents: converted[1], founderGrossCents, founderNetCents, investorCents, teamCents, otherCents, otherBps, taxCents, taxableCents, decision, decisionText, trace };
}

/** A plain priced-round dilution helper, not a SAFE or financing waterfall. */
export function dilute(holdingsBps: readonly number[], newInvestorBps: number): number[] {
  integer(newInvestorBps, 'new investor ownership', 0, 10_000);
  if (holdingsBps.reduce((a, b) => a + b, 0) !== 10_000) throw new RangeError('Starting ownership must total 100%.');
  return [...allocate(10_000 - newInvestorBps, holdingsBps), newInvestorBps];
}
