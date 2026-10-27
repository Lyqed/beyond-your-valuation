import { allocate, exactMoney, integer, mulDiv, type TraceRow } from '../shared/money';

export type InsuranceInput = {
  grossLossCents: number; deductibleCents: number; policyLimitCents: number; interruptionSublimitCents: number;
  interruptionCovered: boolean; ransomCovered: boolean; interruptionDays: number; waitingDays: number;
  paymentDelayDays: number; businessCashCents: number;
};
export const defaultInsurance: InsuranceInput = {
  grossLossCents: 120_000_000, deductibleCents: 10_000_000, policyLimitCents: 100_000_000,
  interruptionSublimitCents: 50_000_000, interruptionCovered: true, ransomCovered: false,
  interruptionDays: 5, waitingDays: 0, paymentDelayDays: 60, businessCashCents: 75_000_000,
};
export function validateInsurance(input: InsuranceInput): InsuranceInput {
  if (!input || typeof input !== 'object') throw new TypeError('An insurance scenario is required.');
  for (const key of ['grossLossCents', 'deductibleCents', 'policyLimitCents', 'interruptionSublimitCents', 'businessCashCents'] as const) integer(input[key], key);
  integer(input.interruptionDays, 'incident duration', 1, 365); integer(input.waitingDays, 'waiting days', 0, 365); integer(input.paymentDelayDays, 'payment delay', 0, 365);
  if (typeof input.interruptionCovered !== 'boolean' || typeof input.ransomCovered !== 'boolean') throw new TypeError('Coverage switches must be booleans.');
  return input;
}
export function calculateInsurance(raw: InsuranceInput) {
  const input = validateInsurance(raw);
  const [responseCents, interruptionCents, ransomCents] = allocate(input.grossLossCents, [5000, 2500, 2500]);
  const coveredDays = Math.max(0, input.interruptionDays - input.waitingDays);
  const afterWaitingCents = input.interruptionCovered ? mulDiv(interruptionCents, coveredDays, input.interruptionDays) : 0;
  const coveredInterruptionCents = Math.min(afterWaitingCents, input.interruptionSublimitCents);
  const coveredRansomCents = input.ransomCovered ? ransomCents : 0;
  const eligibleCents = responseCents + coveredInterruptionCents + coveredRansomCents;
  const deductibleAppliedCents = Math.min(input.deductibleCents, eligibleCents);
  const beforeLimitCents = eligibleCents - deductibleAppliedCents;
  const insurerCents = Math.min(input.policyLimitCents, beforeLimitCents);
  const retainedCents = input.grossLossCents - insurerCents;
  const excludedCents = input.grossLossCents - eligibleCents;
  const limitGapCents = beforeLimitCents - insurerCents;
  const paidWithin30DaysCents = input.paymentDelayDays <= 30 ? insurerCents : 0;
  const shortfallCents = Math.max(0, input.grossLossCents - input.businessCashCents - paidWithin30DaysCents);
  const uninsuredShortfallCents = Math.max(0, input.grossLossCents - input.businessCashCents);
  const trace: TraceRow[] = [
    { label: 'Gross incident loss', amountCents: input.grossLossCents, calculation: 'Fictional loss: 50% response costs, 25% lost income, 25% ransom. All amounts due within 30 days.' },
    { label: 'Eligible response costs', amountCents: responseCents, calculation: 'All modeled response costs qualify under this fictional contract.' },
    { label: 'Eligible interruption loss', amountCents: coveredInterruptionCents, calculation: input.interruptionCovered ? `min(${exactMoney(interruptionCents)} × ${coveredDays}/${input.interruptionDays} covered days, ${exactMoney(input.interruptionSublimitCents)} sublimit).` : 'Business interruption is excluded.' },
    { label: 'Eligible ransom loss', amountCents: coveredRansomCents, calculation: input.ransomCovered ? 'Ransom is assumed eligible. Legality, sanctions and actual policy requirements are outside this model.' : 'Ransom is excluded.' },
    { label: 'Total eligible loss', amountCents: eligibleCents, calculation: 'Eligible categories after exclusions, waiting period and the interruption sublimit.' },
    { label: 'Deductible applied', amountCents: deductibleAppliedCents, calculation: `min(${exactMoney(input.deductibleCents)} deductible, eligible loss). One aggregate deductible.` },
    { label: 'Insurer payment', amountCents: insurerCents, calculation: `min(${exactMoney(input.policyLimitCents)} overall limit, eligible loss − applied deductible). Assumed payment on day ${input.paymentDelayDays}.` },
    { label: 'Loss retained by business', amountCents: retainedCents, calculation: `${exactMoney(input.grossLossCents)} − ${exactMoney(insurerCents)}. Premiums and claim disputes are not modeled.` },
    { label: 'Cash gap within 30 days', amountCents: shortfallCents, calculation: `max(${exactMoney(input.grossLossCents)} − ${exactMoney(input.businessCashCents)} cash − ${exactMoney(paidWithin30DaysCents)} timely insurance payment, 0).` },
  ];
  return { responseCents, interruptionCents, ransomCents, coveredInterruptionCents, coveredRansomCents, eligibleCents, deductibleAppliedCents, insurerCents, retainedCents, excludedCents, limitGapCents, paidWithin30DaysCents, shortfallCents, uninsuredShortfallCents, trace };
}
