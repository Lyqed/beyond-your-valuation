import { defaultExit, validateExit, type ExitInput } from '../equity-engine';
import { defaultPortfolio, validatePortfolio, type PortfolioInput } from '../portfolio-engine';
import { defaultInsurance, validateInsurance, type InsuranceInput } from '../insurance-engine';
import { integer } from '../shared/money';

export type Scenario = { version: 1; exit: ExitInput; portfolio: PortfolioInput; insurance: InsuranceInput };
export function freshScenario(): Scenario { return structuredClone({ version: 1, exit: defaultExit, portfolio: defaultPortfolio, insurance: defaultInsurance }); }
function exactKeys(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) throw new TypeError('Unsupported or missing scenario fields.');
}
function oneOf(value: number, allowed: number[], label: string) {
  if (!allowed.includes(value)) throw new RangeError(`${label} is not supported by this version of the experience.`);
}
export function validateScenario(value: unknown): Scenario {
  exactKeys(value, ['version', 'exit', 'portfolio', 'insurance']);
  if (!value || typeof value !== 'object' || !('version' in value) || value.version !== 1) throw new TypeError('Only scenario version 1 is supported.');
  const input = value as Scenario;
  exactKeys(input.exit, Object.keys(defaultExit)); exactKeys(input.portfolio, Object.keys(defaultPortfolio)); exactKeys(input.insurance, Object.keys(defaultInsurance));
  const e = validateExit(input.exit), p = validatePortfolio(input.portfolio), i = validateInsurance(input.insurance);
  // Shared links describe the controls and fixed assumptions of this interface.
  // The standalone engines deliberately accept a broader range of inputs.
  integer(e.exitCents, 'exit', 0, 25_000_000_000); integer(e.investmentCents, 'investment', 0, 10_000_000_000);
  integer(e.founderBasisCents, 'basis', 0, 1_000_000_000); integer(e.feeBps, 'fees', 0, 1000); integer(e.taxBps, 'tax', 0, 6000);
  oneOf(e.preferenceMultipleBps, [10_000, 20_000, 30_000], 'Preference multiple');
  integer(p.capitalCents, 'starting wealth', 0, 25_000_000_000);
  oneOf(p.fxRateMicros, [3_600_000], 'Initial exchange rate');
  oneOf(p.capitalCallCents, [0, 50_000_000], 'Private equity call'); oneOf(p.ventureCallCents, [0, 50_000_000], 'Venture call');
  oneOf(p.familyExpenseIlsCents, [0, 180_000_000], 'Family expense');
  integer(i.grossLossCents, 'incident loss', 10_000_000, 500_000_000); integer(i.deductibleCents, 'deductible', 0, 50_000_000);
  integer(i.policyLimitCents, 'policy limit', 0, 500_000_000); integer(i.interruptionSublimitCents, 'sublimit', 0, 100_000_000);
  integer(i.businessCashCents, 'business cash', 0, 200_000_000); integer(i.waitingDays, 'waiting period', 0, 10);
  oneOf(i.interruptionDays, [5], 'Interruption duration'); oneOf(i.paymentDelayDays, [15, 30, 60, 90], 'Payment delay');
  return { version: 1, exit: { ...e }, portfolio: { ...p, allocationsBps: [...p.allocationsBps] }, insurance: { ...i } };
}
export function encodeScenario(scenario: Scenario): string { return encodeURIComponent(JSON.stringify(validateScenario(scenario))); }
export function decodeScenario(encoded: string): Scenario {
  if (encoded.length > 8000) throw new RangeError('This scenario link is too large.');
  return validateScenario(JSON.parse(decodeURIComponent(encoded)));
}
