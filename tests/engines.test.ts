import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';
import { calculateExit, defaultExit, dilute } from '../packages/equity-engine';
import { calculatePortfolio, defaultPortfolio, portfolioPresets } from '../packages/portfolio-engine';
import { calculateInsurance, defaultInsurance } from '../packages/insurance-engine';
import { allocate } from '../packages/shared/money';
import { decodeScenario, encodeScenario, freshScenario } from '../packages/scenario-schema';

test('the $100m exit: conversion, costs, tax and $29.4m net cash', () => {
  const r = calculateExit(defaultExit);
  assert.equal(r.decision, 'conversion'); assert.equal(r.feesCents, 200_000_000);
  assert.equal(r.investorCents, 3_920_000_000); assert.equal(r.founderGrossCents, 3_920_000_000);
  assert.equal(r.taxCents, 980_000_000); assert.equal(r.founderNetCents, 2_940_000_000);
});

test('uncapped participation changes the same founder net cash to $20.4m', () => {
  const r = calculateExit({ ...defaultExit, participation: 'participating' });
  assert.equal(r.investorCents, 5_720_000_000); assert.equal(r.founderNetCents, 2_040_000_000);
});

test('a preference takes the available pool at a low exit; common gets zero', () => {
  for (const participation of ['participating', 'non-participating'] as const) {
    const r = calculateExit({ ...defaultExit, exitCents: 1_000_000_000, participation });
    assert.equal(r.investorCents, 980_000_000); assert.equal(r.founderNetCents, 0); assert.equal(r.teamCents, 0);
  }
});

test('preference branch splits only between common holders', () => {
  const r = calculateExit({ ...defaultExit, preferenceMultipleBps: 20_000 });
  assert.equal(r.decision, 'preference'); assert.equal(r.investorCents, 6_000_000_000);
  assert(Math.abs(r.founderGrossCents - 3_800_000_000 * 2 / 3) < 1);
});

test('zero exit, all fees, tax basis above proceeds, and full investor ownership', () => {
  assert.equal(calculateExit({ ...defaultExit, exitCents: 0 }).founderNetCents, 0);
  assert.equal(calculateExit({ ...defaultExit, feeBps: 10_000 }).distributableCents, 0);
  assert.equal(calculateExit({ ...defaultExit, founderBasisCents: 10_000_000_000 }).taxCents, 0);
  assert.equal(calculateExit({ ...defaultExit, founderBps: 0, teamBps: 0, investorBps: 10_000 }).investorCents, 9_800_000_000);
});

test('shareholder proceeds plus transaction fees conserve the entire exit to the cent', () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 100_000_000_000 }), fc.integer({ min: 0, max: 10_000 }), fc.integer({ min: 0, max: 10_000 }),
    fc.integer({ min: 0, max: 10_000 }), fc.integer({ min: 0, max: 10_000 }), fc.integer({ min: 0, max: 3 }), fc.boolean(),
    (exitCents, first, second, third, taxBps, multiple, participating) => {
      const cuts = [0, first, second, third, 10_000].sort((a, b) => a - b);
      const [founderBps, investorBps, teamBps] = cuts.slice(1).map((v, i) => v - cuts[i]);
      const r = calculateExit({ ...defaultExit, exitCents, founderBps, investorBps, teamBps, taxBps, investmentCents: investorBps ? 3_000_000_000 : 0, preferenceMultipleBps: multiple * 10_000, participation: participating ? 'participating' : 'non-participating' });
      assert.equal(r.feesCents + r.investorCents + r.teamCents + r.otherCents + r.founderGrossCents, exitCents);
      assert.equal(r.founderNetCents + r.taxCents, r.founderGrossCents);
      assert([r.feesCents, r.investorCents, r.teamCents, r.otherCents, r.founderNetCents, r.taxCents].every(n => Number.isSafeInteger(n) && n >= 0));
    }), { numRuns: 1200, seed: 20261028 });
});

test('cent allocation and ordinary round dilution preserve totals', () => {
  assert.deepEqual(allocate(2, [1, 1, 1]), [1, 1, 0]);
  assert.deepEqual(dilute([5000, 5000], 2000), [4000, 4000, 2000]);
  fc.assert(fc.property(fc.integer({ min: 0, max: 10_000 }), (bps) => assert.equal(dilute([4000, 4000, 1000, 1000], bps).reduce((a, b) => a + b, 0), 10_000)), { numRuns: 500, seed: 42 });
});

test('initial paper wealth and cash are different quantities', () => {
  const r = calculatePortfolio(defaultPortfolio);
  assert.equal(r.totalCents, 500_000_000); assert.equal(r.cashCents, 15_000_000);
  assert.equal(r.liquidCents, 150_000_000); assert.equal(r.lockedCents, 350_000_000);
});

test('FX changes shekel purchasing power, not the USD asset values', () => {
  const before = calculatePortfolio(defaultPortfolio), after = calculatePortfolio({ ...defaultPortfolio, fxShock: true });
  assert.equal(after.totalCents, before.totalCents);
  assert.equal(after.purchasingPowerIlsCents, before.purchasingPowerIlsCents * 0.8);
});

test('combined stress leaves $462,500 unavailable for obligations', () => {
  const r = calculatePortfolio({ ...defaultPortfolio, marketShock: true, fxShock: true, capitalCallCents: 50_000_000, ventureCallCents: 50_000_000, familyExpenseIlsCents: 180_000_000 });
  assert.equal(r.totalCents, 385_750_000); assert.equal(r.liquidCents, 116_250_000);
  assert.equal(r.expenseUsdCents, 62_500_000); assert.equal(r.shortfallCents, 46_250_000);
});

test('capital calls are liquidity obligations, not losses subtracted from wealth', () => {
  const base = calculatePortfolio(defaultPortfolio);
  assert.equal(calculatePortfolio({ ...defaultPortfolio, capitalCallCents: 500_000_000 }).totalCents, base.totalCents);
});

test('portfolio buckets conserve stressed assets and shortfalls stay bounded', () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 100_000_000_000 }), fc.boolean(), fc.boolean(), fc.integer({ min: 0, max: 2 }), (capitalCents, marketShock, fxShock, preset) => {
    const r = calculatePortfolio({ ...defaultPortfolio, capitalCents, marketShock, fxShock, allocationsBps: Object.values(portfolioPresets)[preset], capitalCallCents: 50_000_000 });
    assert.equal(r.totalCents, r.liquidCents + r.lockedCents); assert(r.totalCents <= capitalCents);
    assert(r.cashCents <= r.liquidCents); assert.equal(r.shortfallCents, Math.max(0, r.dueCents - r.liquidCents));
  }), { numRuns: 700, seed: 103 });
});

test('the fictional $1.2m cyber incident pays $800k and retains $400k', () => {
  const r = calculateInsurance(defaultInsurance);
  assert.equal(r.eligibleCents, 90_000_000); assert.equal(r.insurerCents, 80_000_000); assert.equal(r.retainedCents, 40_000_000);
  assert.equal(r.shortfallCents, 45_000_000); assert.equal(r.paidWithin30DaysCents, 0);
});

test('payment timing changes liquidity, not the covered amount', () => {
  const r = calculateInsurance({ ...defaultInsurance, paymentDelayDays: 30 });
  assert.equal(r.insurerCents, 80_000_000); assert.equal(r.shortfallCents, 0);
});

test('waiting periods and sublimits precede the aggregate deductible and limit', () => {
  const r = calculateInsurance({ ...defaultInsurance, waitingDays: 2, interruptionSublimitCents: 10_000_000, policyLimitCents: 50_000_000 });
  assert.equal(r.coveredInterruptionCents, 10_000_000); assert.equal(r.eligibleCents, 70_000_000);
  assert.equal(r.insurerCents, 50_000_000); assert.equal(r.limitGapCents, 10_000_000);
});

test('insurance never pays more than the loss, eligible loss or limit; retained + paid = gross', () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 1_000_000_000 }), fc.integer({ min: 0, max: 1_000_000_000 }), fc.integer({ min: 0, max: 1_000_000_000 }), fc.integer({ min: 0, max: 10 }), fc.boolean(), (grossLossCents, deductibleCents, policyLimitCents, waitingDays, ransomCovered) => {
    const r = calculateInsurance({ ...defaultInsurance, grossLossCents, deductibleCents, policyLimitCents, waitingDays, ransomCovered });
    assert.equal(r.retainedCents + r.insurerCents, grossLossCents);
    assert(r.insurerCents >= 0 && r.insurerCents <= policyLimitCents && r.insurerCents <= r.eligibleCents);
    assert.equal(r.excludedCents + r.deductibleAppliedCents + r.limitGapCents, r.retainedCents);
  }), { numRuns: 1000, seed: 104 });
});

test('invalid or unsupported inputs fail instead of producing plausible-looking numbers', () => {
  for (const exitCents of [NaN, Infinity, -1, 0.5, Number.MAX_SAFE_INTEGER]) assert.throws(() => calculateExit({ ...defaultExit, exitCents }));
  assert.throws(() => calculateExit({ ...defaultExit, founderBps: 8000 }));
  assert.throws(() => calculatePortfolio({ ...defaultPortfolio, allocationsBps: [100, 100, 100, 100, 100, 100] }));
  assert.throws(() => calculateInsurance({ ...defaultInsurance, interruptionDays: 0 }));
  assert.throws(() => decodeScenario(encodeURIComponent('{"version":2}')));
  assert.throws(() => decodeScenario('x'.repeat(8001)));
});

test('share links round-trip a validated, reproducible scenario', () => {
  const original = freshScenario(); original.exit.participation = 'participating'; original.portfolio.marketShock = true;
  assert.deepEqual(decodeScenario(encodeScenario(original)), original);
});

test('shared scenarios reject hidden terms, unsupported controls and contradictory assumptions', () => {
  const invalid = [
    { ...freshScenario(), unknown: true },
    { ...freshScenario(), exit: { ...defaultExit, seniority: 'senior' } },
    { ...freshScenario(), exit: { ...defaultExit, taxBps: 9900 } },
    { ...freshScenario(), portfolio: { ...defaultPortfolio, fxRateMicros: 7_000_000 } },
    { ...freshScenario(), portfolio: { ...defaultPortfolio, capitalCallCents: 1 } },
    { ...freshScenario(), insurance: { ...defaultInsurance, interruptionDays: 30 } },
  ];
  for (const scenario of invalid) assert.throws(() => decodeScenario(encodeURIComponent(JSON.stringify(scenario))));
  const noInvestors = freshScenario();
  noInvestors.exit = { ...defaultExit, investorBps: 0, investmentCents: 0, founderBps: 10_000, teamBps: 0 };
  assert.deepEqual(decodeScenario(encodeScenario(noInvestors)), noInvestors);
});
