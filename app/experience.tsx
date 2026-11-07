'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { calculateExit, type ExitInput } from '@/packages/equity-engine';
import { assetDefinitions, calculatePortfolio, portfolioPresets, type PortfolioInput } from '@/packages/portfolio-engine';
import { calculateInsurance, type InsuranceInput } from '@/packages/insurance-engine';
import { allocate, exactMoney, type TraceRow } from '@/packages/shared/money';
import RangeField from './range-field';
import { decodeScenario, freshScenario, validateScenario, type Scenario } from '@/packages/scenario-schema';

const sessionKey = 'beyond-your-valuation:scenario:v1';
const sourceURL = 'https://github.com/Lyqed/beyond-your-valuation';
const million = 100_000_000;
const money = (cents: number, digits = 1) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: digits }).format(cents / 100).replace('M', 'm').replace('K', 'k').replace('B', 'bn');
const shekels = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'ILS', notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100).replace('M', 'm');
const pct = (bps: number) => `${bps / 100}%`;
function Mark() { return <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>; }
function Tiles({ values, colors, label }: { values: number[]; colors: string[]; label: string }) {
  const counts = useMemo(() => values.some(Boolean)
    ? allocate(100, values.map(value => Math.round(value / Math.max(...values) * 10_000)))
    : values.map(() => 0), [values]);
  const cells = counts.flatMap((count, group) => Array.from({ length: count }, () => colors[group]));
  return <div className="tiles" role="img" aria-label={label}>{Array.from({ length: 100 }, (_, index) =>
    <i key={index} style={{ '--tile': cells[index] || 'var(--line)', '--tile-order': index } as CSSProperties} />)}</div>;
}
function Arrow({ diagonal = false }: { diagonal?: boolean }) { return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d={diagonal ? 'M5 19 19 5M5 5h14v14' : 'M4 12h15m-6-6 6 6-6 6'} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function GitIcon() { return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.86c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.64-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.55 9.55 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>; }


function Toggle({ title, detail, checked, onChange }: { title: string; detail: string; checked: boolean; onChange: () => void }) {
  return <button type="button" className={`event-toggle ${checked ? 'active' : ''}`} aria-pressed={checked} onClick={onChange}><span><strong>{title}</strong><small>{detail}</small></span><span className="toggle-glyph" aria-hidden="true">{checked ? '✓' : ''}</span></button>;
}

function BreakdownBar({ items, total, label }: { items: { label: string; amount: number; color: string }[]; total: number; label: string }) {
  return <div className="breakdown-wrap"><div className="breakdown-bar" role="img" aria-label={`${label}. ${items.map(item => `${item.label}: ${exactMoney(item.amount)}`).join('; ')}.`}>{items.filter(i => i.amount > 0).map(item => <span key={item.label} style={{ width: `${total ? item.amount / total * 100 : 0}%`, background: item.color }} title={`${item.label}: ${exactMoney(item.amount)}`} />)}</div><div className="bar-legend">{items.map(item => <span key={item.label}><i style={{ background: item.color }} />{item.label}</span>)}</div></div>;
}

function ChapterHeading({ number, title, subtitle }: { number: string; title: ReactNode; subtitle: string }) { return <div className="chapter-heading"><span className="chapter-number">{number}</span><div><h2 id={`chapter-title-${number}`} tabIndex={-1}>{title}</h2><p>{subtitle}</p></div></div>; }

export default function Experience() {
  const [scenario, setScenario] = useState<Scenario>(freshScenario);
  const [modal, setModal] = useState<'exit' | 'portfolio' | 'insurance' | null>(null);
  const [toast, setToast] = useState('');
  const [restored, setRestored] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [active, setActive] = useState('exit');
  const [boardView, setBoardView] = useState<'ownership' | 'proceeds'>('ownership');
  const dialog = useRef<HTMLDialogElement>(null);
  const exit = useMemo(() => calculateExit(scenario.exit), [scenario.exit]);
  const nonParticipating = useMemo(() => calculateExit({ ...scenario.exit, participation: 'non-participating' }), [scenario.exit]);
  const participating = useMemo(() => calculateExit({ ...scenario.exit, participation: 'participating' }), [scenario.exit]);
  const portfolio = useMemo(() => calculatePortfolio(scenario.portfolio), [scenario.portfolio]);
  const insurance = useMemo(() => calculateInsurance(scenario.insurance), [scenario.insurance]);
  const e = scenario.exit, p = scenario.portfolio, ins = scenario.insurance;
  const boardGroups = boardView === 'ownership' ? [
    { label: 'Founder', value: e.founderBps, color: 'var(--green)', display: pct(e.founderBps) },
    { label: 'Investors', value: e.investorBps, color: 'var(--lavender)', display: pct(e.investorBps) },
    { label: 'Team', value: e.teamBps, color: 'var(--peach)', display: pct(e.teamBps) },
    { label: 'Other', value: exit.otherBps, color: 'var(--pale)', display: pct(exit.otherBps) },
  ] : [
    { label: 'Founder cash', value: exit.founderNetCents, color: 'var(--green)', display: money(exit.founderNetCents) },
    { label: 'Investors', value: exit.investorCents, color: 'var(--lavender)', display: money(exit.investorCents) },
    { label: 'Other holders', value: exit.teamCents + exit.otherCents, color: 'var(--peach)', display: money(exit.teamCents + exit.otherCents) },
    { label: 'Costs & tax', value: exit.feesCents + exit.taxCents, color: 'var(--pale)', display: money(exit.feesCents + exit.taxCents) },
  ];
  function updateExit(change: Partial<ExitInput>) { setActive('exit'); setScenario(s => ({ ...s, exit: { ...s.exit, ...change } })); }
  function updatePortfolio(change: Partial<PortfolioInput>) { setActive('portfolio'); setScenario(s => ({ ...s, portfolio: { ...s.portfolio, ...change } })); }
  function updateInsurance(change: Partial<InsuranceInput>) { setActive('insurance'); setScenario(s => ({ ...s, insurance: { ...s.insurance, ...change } })); }
  function go(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    const chapter = target.closest<HTMLElement>('.chapter')?.id;
    if (chapter) setActive(chapter);
    else if (id === 'top') setActive('exit');
    const heading = target.querySelector<HTMLElement>('h1, h2, h3') || target;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    target.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }

  useEffect(() => {
    function loadShared() {
      if (!window.location.hash.startsWith('#s=')) return false;
      try { setScenario(decodeScenario(window.location.hash.slice(3))); setToast('Shared scenario loaded.'); }
      catch { setScenario(freshScenario()); setToast('That scenario link is invalid. The original example is loaded instead.'); }
      return true;
    }
    if (!loadShared()) {
      try {
        const saved = sessionStorage.getItem(sessionKey);
        if (saved) { setScenario(validateScenario(JSON.parse(saved))); setToast('Your choices are restored in this tab.'); }
      } catch { try { sessionStorage.removeItem(sessionKey); } catch { /* Storage may be unavailable. */ } }
    }
    setRestored(true);
    const onHashChange = () => { loadShared(); };
    window.addEventListener('hashchange', onHashChange);
    let frame = 0;
    const trackChapter = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const threshold = Math.min(180, window.innerHeight * 0.25);
        const current = ['insurance', 'portfolio', 'exit'].find(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= threshold);
        setActive(current || 'exit');
      });
    };
    window.addEventListener('scroll', trackChapter, { passive: true });
    window.addEventListener('resize', trackChapter);
    trackChapter();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('scroll', trackChapter);
      window.removeEventListener('resize', trackChapter);
    };
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      if (JSON.stringify(scenario) === JSON.stringify(freshScenario())) sessionStorage.removeItem(sessionKey);
      else sessionStorage.setItem(sessionKey, JSON.stringify(scenario));
    } catch { /* Calculations also work when browser storage is unavailable. */ }
  }, [scenario, restored]);
  useEffect(() => {
    if (!restored) return;
    const text = active === 'exit' ? `Founder net cash: ${exactMoney(exit.founderNetCents)}.`
      : active === 'portfolio' ? `Available within 30 days: ${exactMoney(portfolio.liquidCents)}. Due: ${exactMoney(portfolio.dueCents)}. Funding shortfall: ${exactMoney(portfolio.shortfallCents)}. Purchasing power: ${exactMoney(portfolio.purchasingPowerIlsCents, 'ILS')}.`
        : `Insurer payment: ${exactMoney(insurance.insurerCents)}. Business retains: ${exactMoney(insurance.retainedCents)}. Cash gap within 30 days: ${exactMoney(insurance.shortfallCents)}.`;
    const timer = setTimeout(() => setAnnouncement(text), 300);
    return () => clearTimeout(timer);
  }, [active, restored, exit.founderNetCents, portfolio.liquidCents, portfolio.dueCents, portfolio.shortfallCents, portfolio.purchasingPowerIlsCents, insurance.insurerCents, insurance.retainedCents, insurance.shortfallCents]);
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close(); }, [modal]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 6500); return () => clearTimeout(timer); }, [toast]);

  function download() {
    const data = { ...scenario, methodologyVersion: '0.1.0', results: { exit, portfolio, insurance } };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'beyond-your-valuation-scenario.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Scenario and calculation receipts downloaded.');
  }
  function followExit() { updatePortfolio({ capitalCents: exit.founderNetCents }); go('portfolio'); }
  function explorePortfolio() { setScenario(s => ({ ...s, portfolio: freshScenario().portfolio })); go('portfolio'); }
  function reset() { setScenario(freshScenario()); setBoardView('ownership'); window.history.replaceState(null, '', window.location.pathname); try { sessionStorage.removeItem(sessionKey); } catch { /* Optional storage. */ } setToast('Back to the original fictional examples.'); go('top'); }
  function changeAllocation(index: number, value: number) {
    const next = [...p.allocationsBps], bps = Math.round(value * 100);
    next[0] += next[index] - bps; next[index] = bps; updatePortfolio({ allocationsBps: next });
  }
  const receipt: { title: string; rows: TraceRow[]; note: string } | null = modal === 'exit' ? { title: 'Exit calculation', rows: exit.trace, note: 'One preferred class. Fully exercised common shares. Integer cents; largest remainders resolve allocation rounding.' }
    : modal === 'portfolio' ? { title: 'Liquidity calculation', rows: portfolio.trace, note: 'A snapshot before payments. Calls create a cash obligation, not an automatic loss. All shocks and liquidity windows are stipulated, not forecasts.' }
      : modal === 'insurance' ? { title: 'Insurance calculation', rows: insurance.trace, note: 'A fictional contract. This ordering of exclusions, sublimits, deductible and overall limit is a model assumption, not a description of every policy.' } : null;

  return <>
    <a className="skip" href="#exit">Skip to the simulator</a>
    <header className="site-header"><a className="brand" href="#top" aria-label="Beyond Your Valuation, home"><Mark /><span>beyond your<br /><b>valuation.</b></span></a><div className="header-links"><a href="/methodology/">The assumptions <Arrow diagonal /></a><a className="source-link" href={sourceURL} target="_blank" rel="noreferrer" aria-label="View the open-source code on GitHub"><GitIcon /><span>Open source</span></a></div></header>

    <main id="top">
      <section className="hero" aria-labelledby="intro-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="live-dot" /> A fictional startup sale</p>
          <h1 id="intro-title" tabIndex={-1}>You just sold<br />your startup for<br /><span className="hero-amount">${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(e.exitCents / million)}<span> million.</span></span></h1>
          <p className="hero-question">Congratulations.<br /><em>How much of it is actually yours?</em></p>
          <button className="button primary" onClick={() => go('exit')}>Find out <Arrow /></button>
          <p className="hero-fine">A fictional company. Real arithmetic.<br />Change the terms. Inspect every calculation.</p>
        </div>
        <div className="hero-art">
          <div className="board-view" role="group" aria-label="Compare ownership and proceeds">
            <button aria-pressed={boardView === 'ownership'} onClick={() => setBoardView('ownership')}>Ownership</button>
            <button aria-pressed={boardView === 'proceeds'} onClick={() => setBoardView('proceeds')}>After the deal</button>
          </div>
          <div className="board-frame"><div className="board">
            <div className="board-top"><span>{boardView === 'ownership' ? 'The company' : 'Where the price goes'}</span><span>{boardView === 'ownership' ? '100% on paper' : `${money(e.exitCents)} to distribute`}</span></div>
            <Tiles values={boardGroups.map(group => group.value)} colors={boardGroups.map(group => group.color)} label={`${boardView === 'ownership' ? 'Ownership' : 'Exit proceeds'}: ${boardGroups.map(group => `${group.label} ${group.display}`).join(', ')}. Tiles rounded to whole percentages.`} />
            <div className="board-sticker"><span>{boardView === 'ownership' ? 'Your share' : 'Your net cash'}</span><strong data-testid="board-value">{boardView === 'ownership' ? <>{e.founderBps / 100}<span>%</span></> : money(exit.founderNetCents)}</strong><small>{boardView === 'ownership' ? 'Share of the company.' : 'After costs and tax.'}</small></div>
          </div></div>
          <div className="board-details">
            <div className="board-caption">{boardGroups.map(group => <span key={group.label}><i style={{ background: group.color }} />{group.label} <b>{group.display}</b></span>)}</div>
            <p className="board-note">Each tile is about 1%. Exact amounts are in the calculation.</p>
            <div className="art-footnote"><span className="drawn-arrow" aria-hidden="true">↳</span><span>Compare ownership<br />with cash after the deal.</span></div>
          </div>
        </div>
      </section>
      <div className="journey"><p>A sale. A portfolio. An insurance policy.</p><button className="text-action" onClick={() => go('exit')}>Start with the sale <span aria-hidden="true">↓</span></button></div>
      <nav className="chapter-nav" aria-label="Chapters"><div>{[['exit', '1', 'Exit proceeds'], ['portfolio', '2', 'Liquidity'], ['insurance', '3', 'Insurance']].map(([id, number, label]) => <button key={id} className={active === id ? 'selected' : ''} aria-current={active === id ? 'step' : undefined} onClick={() => go(id)}><span>{number}</span>{label}</button>)}</div></nav>

      <section className="chapter exit-chapter" id="exit" aria-labelledby="chapter-title-01">
        <ChapterHeading number="01" title={<>You own {pct(e.founderBps)}.<br /><em>How much reaches you?</em></>} subtitle="Your ownership is one part of the calculation. Investor terms, costs and tax assumptions matter too. All amounts are in USD." />
        <div className="chapter-feedback" data-active={active === 'exit'}> <span>Founder net cash</span><strong>{money(exit.founderNetCents)}</strong><button className="text-action" onClick={() => go('exit-outcome')}>See breakdown <span aria-hidden="true">↓</span></button></div>
        <p className="experiment-prompt">Keep ownership at {pct(e.founderBps)}. Switch the investor terms below. What happens to your cash?</p>
        <div className="exit-workspace">
          <div className="deal-controls"><div className="panel-heading"><span>Deal assumptions</span><span className="small-tag">USD</span></div>
            <RangeField label="The company sells for" value={e.exitCents / million} min={0} max={250} display={money(e.exitCents)} onChange={v => updateExit({ exitCents: Math.round(v * million) })} />
            <RangeField label="Founder ownership" value={e.founderBps / 100} max={(10_000 - e.investorBps - e.teamBps) / 100} display={pct(e.founderBps)} onChange={v => updateExit({ founderBps: Math.round(v * 100) })} hint="Fully diluted, including the team allocation." />
            <div className="cap-strip" role="img" aria-label={`Ownership: founder ${pct(e.founderBps)}, investors ${pct(e.investorBps)}, team ${pct(e.teamBps)}, other common ${pct(exit.otherBps)}`}><span style={{ width: pct(e.founderBps), background: 'var(--accent)' }} /><span style={{ width: pct(e.investorBps), background: 'var(--neutral-strong)' }} /><span style={{ width: pct(e.teamBps), background: 'var(--neutral-mid)' }} /><span style={{ width: pct(exit.otherBps), background: 'var(--neutral-light)' }} /></div><div className="cap-labels"><span>Founder {pct(e.founderBps)}</span><span>Investors {pct(e.investorBps)}</span><span>Team {pct(e.teamBps)}</span><span>Other {pct(exit.otherBps)}</span></div>
            <div className="field-top preferences-label"><span>Investors’ liquidation preference</span><a href="/methodology/#exit">What is this?</a></div>
            <p className="term-explainer">The investors put in {money(e.investmentCents)}. At {e.preferenceMultipleBps / 10_000}×, their priority claim is {money(exit.claimCents)}, limited by the money available after costs.</p>
            <div className="segmented" role="group" aria-label="Preference multiple">{[1, 2, 3].map(n => <button key={n} aria-pressed={e.preferenceMultipleBps === n * 10_000} onClick={() => updateExit({ preferenceMultipleBps: n * 10_000 })}>{n}× <span>their investment</span></button>)}</div>
            <div className="participation-options" role="group" aria-label="Investor participation"><button aria-pressed={e.participation === 'non-participating'} onClick={() => updateExit({ participation: 'non-participating' })}><span className="radio" /><span><strong>Non-participating</strong><small>Take the priority payment OR their ownership share, whichever pays more.</small></span></button><button aria-pressed={e.participation === 'participating'} onClick={() => updateExit({ participation: 'participating' })}><span className="radio" /><span><strong>Participating</strong><small>Take the priority payment AND their ownership share of what remains. No cap.</small></span></button></div>
            <details className="advanced"><summary>More deal assumptions <span>+</span></summary><div className="advanced-content">
              <RangeField label="Capital invested" value={e.investmentCents / million} max={e.investorBps ? 100 : 0} display={money(e.investmentCents)} onChange={v => updateExit({ investmentCents: Math.round(v * million) })} hint={e.investorBps ? undefined : 'Assign investor ownership before adding invested capital.'} />
              <RangeField label="Investors’ ownership" value={e.investorBps / 100} min={e.investmentCents ? 1 : 0} max={(10_000 - e.founderBps - e.teamBps) / 100} display={pct(e.investorBps)} onChange={v => updateExit({ investorBps: Math.round(v * 100) })} />
              <RangeField label="Team common shares" value={e.teamBps / 100} max={(10_000 - e.founderBps - e.investorBps) / 100} display={pct(e.teamBps)} onChange={v => updateExit({ teamBps: Math.round(v * 100) })} hint="Assumed vested and already exercised. Other common holders own the balance." />
              <RangeField label="Transaction costs" value={e.feeBps / 100} max={10} step={0.5} display={pct(e.feeBps)} onChange={v => updateExit({ feeBps: Math.round(v * 100) })} />
              <RangeField label="Illustrative founder tax rate" value={e.taxBps / 100} max={60} display={pct(e.taxBps)} onChange={v => updateExit({ taxBps: Math.round(v * 100) })} hint="A flat assumption, not a rate for any country or person." />
              <RangeField label="Founder tax basis" value={e.founderBasisCents / million} max={10} step={0.1} display={money(e.founderBasisCents)} onChange={v => updateExit({ founderBasisCents: Math.round(v * million) })} />
            </div></details>
          </div>

          <div className="payout-panel" id="exit-outcome" tabIndex={-1} aria-label="Exit proceeds breakdown"><div className="panel-heading"><span>Founder net proceeds</span></div><button className="big-payout" onClick={() => setModal('exit')} aria-label={`Founder net cash ${exactMoney(exit.founderNetCents)}. Show the calculation.`}><span data-testid="founder-net">{money(exit.founderNetCents)}</span><span className="payout-caption">After the assumed costs and tax <span>↗</span></span></button>
            <div className="receipt-lines"><div><span>Acquisition price</span><strong>{money(e.exitCents)}</strong></div><div><span>After transaction costs</span><strong>{money(exit.distributableCents)}</strong></div><div><span>Founder gross proceeds</span><strong>{money(exit.founderGrossCents)}</strong></div><div><span>Illustrative founder tax</span><strong>−{money(exit.taxCents)}</strong></div><div className="receipt-total"><span>Founder net cash</span><strong>{money(exit.founderNetCents)}</strong></div></div>
            <BreakdownBar total={e.exitCents} label="How the exit consideration is distributed" items={[{ label: 'Founder cash', amount: exit.founderNetCents, color: 'var(--accent)' }, { label: 'Investors', amount: exit.investorCents, color: 'var(--neutral-strong)' }, { label: 'Other holders', amount: exit.teamCents + exit.otherCents, color: 'var(--neutral-mid)' }, { label: 'Costs & tax', amount: exit.feesCents + exit.taxCents, color: 'var(--neutral-light)' }]} />
            <button className="text-action" onClick={() => setModal('exit')}>Show every step <Arrow diagonal /></button><p className="decision-note">{exit.decision === 'conversion' ? 'Investors convert to common shares. That pays at least as much as their preference.' : exit.decision === 'preference' ? 'Investors take their preference first. The common shareholders split what remains.' : 'Investors receive their preference first, then participate in the remaining proceeds.'}</p>
          </div>
        </div>

        <div className="comparison"><div><h3>{nonParticipating.founderNetCents === participating.founderNetCents ? 'Here, both terms give the same result.' : 'Same sale. Different deal.'}</h3><p>Founder ownership stays at {pct(e.founderBps)}, with a {money(e.exitCents)} acquisition price. Changing participation produces a {money(nonParticipating.founderNetCents - participating.founderNetCents)} difference in founder net proceeds.</p></div><div className="comparison-bars"><div><span>Non-participating</span><strong>{money(nonParticipating.founderNetCents)}</strong><i style={{ width: `${nonParticipating.founderNetCents ? 100 : 0}%` }} /></div><div><span>Participating</span><strong>{money(participating.founderNetCents)}</strong><i style={{ width: `${nonParticipating.founderNetCents ? participating.founderNetCents / nonParticipating.founderNetCents * 100 : 0}%` }} /></div><p>Founder net cash, after the same assumed costs and tax.</p></div></div>
        <div className="chapter-bridge"><p>Next, try a separate $5m portfolio. How much could you use within 30 days?</p><div className="chapter-bridge-actions"><button className="text-action" onClick={explorePortfolio}>Explore the $5m example <Arrow /></button><button className="text-action" onClick={followExit}>Or use your {money(exit.founderNetCents)} proceeds <Arrow /></button></div></div>
      </section>

      <section className="chapter portfolio-chapter" id="portfolio" aria-labelledby="chapter-title-02">
        <ChapterHeading number="02" title={<>You have {money(p.capitalCents)} in assets.<br /><em>Can you pay the bills?</em></>} subtitle="Liquidity is how readily an asset can become cash. In this separate example, some assets can be sold within 30 days. Others stay tied up." />
        <div className="chapter-feedback" data-active={active === 'portfolio'} data-negative={portfolio.shortfallCents > 0}> <span>{portfolio.shortfallCents ? '30-day shortfall' : 'Available in 30 days'}</span><strong>{money(portfolio.shortfallCents || portfolio.liquidCents)}</strong><button className="text-action" onClick={() => go('portfolio-outcome')}>See breakdown <span aria-hidden="true">↓</span></button></div>
        <p className="experiment-prompt">Apply the events, then switch between “Mostly illiquid” and “More liquid”. The starting wealth stays the same.</p>
        <div className="portfolio-toolbar"><div className="capital-choice" role="group" aria-label="Starting wealth"><button aria-pressed={p.capitalCents === 5 * million} onClick={() => updatePortfolio({ capitalCents: 5 * million })}>The $5m example</button><button aria-pressed={p.capitalCents === exit.founderNetCents && p.capitalCents !== 5 * million} onClick={() => updatePortfolio({ capitalCents: exit.founderNetCents })}>Use founder proceeds: {money(exit.founderNetCents)}</button></div><span className="small-tag">30-day snapshot</span></div>
        <p className="preset-note portfolio-source-note">Starting assets: {money(p.capitalCents)}. Using founder proceeds copies the amount once; later deal changes do not update it.</p>
        <div className="portfolio-workspace"><div className="allocation-panel"><div className="panel-heading"><span>Portfolio allocation</span><strong>{money(p.capitalCents)}</strong></div><div className="preset-buttons" role="group" aria-label="Illustrative portfolios">{Object.entries(portfolioPresets).map(([key, allocations]) => <button key={key} aria-pressed={JSON.stringify(p.allocationsBps) === JSON.stringify(allocations)} onClick={() => updatePortfolio({ allocationsBps: [...allocations] })}>{key === 'paper-rich' ? 'Mostly illiquid' : key === 'room-to-move' ? 'More liquid' : 'Concentrated in a new company'}</button>)}</div><p className="preset-note">Illustrative allocations, not recommended portfolios.</p>
          <div className="asset-list">{portfolio.assets.map((asset, index) => <div className="asset-row" key={asset.id}><span>{asset.label}<small>{index === 0 ? 'Cash today' : asset.liquid ? 'Saleable within 30 days' : 'Tied up beyond 30 days'}</small></span><strong>{pct(p.allocationsBps[index])}</strong><span className="asset-value">{money(asset.valueCents)}</span></div>)}</div>
          <details className="advanced"><summary>Make your own allocation <span>+</span></summary><div className="advanced-content"><p className="field-hint">Cash is the balance. Reduce another asset to free up room.</p>{assetDefinitions.slice(1).map((asset, i) => <RangeField key={asset.id} label={asset.label} value={p.allocationsBps[i + 1] / 100} max={(p.allocationsBps[i + 1] + p.allocationsBps[0]) / 100} display={pct(p.allocationsBps[i + 1])} onChange={value => changeAllocation(i + 1, value)} />)}<p className="field-hint">Cash remaining: {pct(p.allocationsBps[0])}</p></div></details>
        </div><div className="shock-panel"><div className="panel-heading"><span>Scenario events</span><button className="small-link" onClick={() => updatePortfolio({ marketShock: true, fxShock: true, capitalCallCents: 50_000_000, familyExpenseIlsCents: 180_000_000, ventureCallCents: 50_000_000 })}>Apply all events</button></div><Toggle title="The markets fall" detail="Shares −35%. Other assets fall too." checked={p.marketShock} onChange={() => updatePortfolio({ marketShock: !p.marketShock })} /><Toggle title="The dollar weakens" detail="20% less shekel purchasing power per dollar." checked={p.fxShock} onChange={() => updatePortfolio({ fxShock: !p.fxShock })} /><p className="field-hint fx-explanation">At the modeled ₪{(portfolio.effectiveFxMicros / 1_000_000).toFixed(2)} per dollar, this portfolio buys {shekels(portfolio.purchasingPowerIlsCents)}. Dollar asset values do not change with this switch.</p><Toggle title="A private fund calls capital" detail="$500,000 is due within 30 days." checked={p.capitalCallCents > 0} onChange={() => updatePortfolio({ capitalCallCents: p.capitalCallCents ? 0 : 50_000_000 })} /><Toggle title="A new company needs capital" detail="Another $500,000, also within 30 days." checked={p.ventureCallCents > 0} onChange={() => updatePortfolio({ ventureCallCents: p.ventureCallCents ? 0 : 50_000_000 })} /><Toggle title="An unexpected family expense" detail="₪1.8 million. Your assets are in dollars." checked={p.familyExpenseIlsCents > 0} onChange={() => updatePortfolio({ familyExpenseIlsCents: p.familyExpenseIlsCents ? 0 : 180_000_000 })} /><p className="scenario-note">Hypothetical shocks, not forecasts. The initial rate of ₪3.60 per dollar is an assumption, not a live quote.</p></div></div>
        <div id="portfolio-outcome" tabIndex={-1} aria-label="Liquidity breakdown" className={`liquidity-result ${portfolio.shortfallCents ? 'has-gap' : ''}`}><div className="liquidity-stats"><div><span>Asset value in this scenario</span><strong>{money(portfolio.totalCents)}</strong></div><div><span>Available within 30 days</span><strong>{money(portfolio.liquidCents)}</strong></div><div><span>Due within 30 days</span><strong>{money(portfolio.dueCents)}</strong></div></div><div className="liquidity-conclusion"><span>{portfolio.shortfallCents ? 'Funding shortfall' : portfolio.dueCents ? 'Available after obligations' : 'Cash balance'}</span><strong data-testid="liquidity-gap">{money(portfolio.shortfallCents || (portfolio.dueCents ? portfolio.surplusCents : portfolio.cashCents))}</strong><p>{portfolio.shortfallCents ? 'These bills exceed the funds available within 30 days.' : portfolio.dueCents ? 'There is enough available to cover these bills. You may still need to sell investments.' : 'The rest is invested. Try a few events to see what can move when you need it.'}</p></div></div>
        <div className="under-result"><p>{money(portfolio.lockedCents)} remains tied up. The snapshot is before payments.<br />Capital calls are cash needs, not assumed investment losses.</p><button className="text-action" onClick={() => setModal('portfolio')}>Show the calculation <Arrow diagonal /></button></div>
        <div className="chapter-bridge"><p>Next, a separate business. What if its insurance pays after the bills are due?</p><button className="text-action" onClick={() => go('insurance')}>Explore insurance <Arrow /></button></div>
      </section>

      <section className="chapter insurance-chapter" id="insurance" aria-labelledby="chapter-title-03">
        <ChapterHeading number="03" title={<>A {money(ins.policyLimitCents)} policy.<br /><em>What gets paid, and when?</em></>} subtitle={`A separate business faces a ${money(ins.grossLossCents)} cyber incident. The bills are due in 30 days. Its cash balance is ${money(ins.businessCashCents)}.`} />
        <div className="chapter-feedback" data-active={active === 'insurance'} data-negative={insurance.shortfallCents > 0}> <span>30-day cash gap</span><strong>{money(insurance.shortfallCents)}</strong><button className="text-action" onClick={() => go('insurance-outcome')}>See breakdown <span aria-hidden="true">↓</span></button></div>
        <ul className="incident-breakdown" aria-label="Fictional incident costs"><li><strong>{money(insurance.responseCents)}</strong> Response costs</li><li><strong>{money(insurance.interruptionCents)}</strong> Lost income over five days</li><li><strong>{money(insurance.ransomCents)}</strong> Ransom</li></ul>
        <p className="experiment-prompt">The payment in this example is {money(insurance.insurerCents)}. Compare day 30 with day 60. Does the business have the cash when its bills arrive?</p>
        <div className={`timing-panel ${insurance.shortfallCents ? 'has-gap' : ''}`}><div><h3>Payment timing</h3><p>The bills are due within 30 days. Choose when the insurance payment arrives.</p><div className="timing-buttons" role="group" aria-label="Insurance payment timing">{[15, 30, 60, 90].map(days => <button key={days} aria-pressed={ins.paymentDelayDays === days} onClick={() => updateInsurance({ paymentDelayDays: days })}>Day {days}</button>)}</div></div><div className="timing-result" id="insurance-outcome" tabIndex={-1} aria-label="Insurance payment timing breakdown"><span>Funding shortfall within 30 days</span><strong data-testid="insurance-gap">{money(insurance.shortfallCents)}</strong><p>{insurance.insurerCents === 0 ? 'There is no insurance payment under these assumptions.' : ins.paymentDelayDays > 30 ? `The ${money(insurance.insurerCents)} payment arrives after the bills are due.` : 'The insurance payment arrives within the 30-day window.'}</p><small>Business cash: {money(ins.businessCashCents)}. This fictional business is separate from the personal portfolio above. Payment timing is an assumption, not a claims forecast.</small></div></div>
        <div className="insurance-workspace"><div className="insurance-controls"><div className="panel-heading"><span>The incident and the policy</span></div><RangeField label="Gross incident loss" value={ins.grossLossCents / million} min={0.1} max={5} step={0.1} display={money(ins.grossLossCents)} onChange={v => updateInsurance({ grossLossCents: Math.round(v * million) })} /><RangeField hint="The part of eligible loss the business pays before this policy contributes." label="Deductible" value={ins.deductibleCents / 100_000} max={500} step={10} display={money(ins.deductibleCents)} onChange={v => updateInsurance({ deductibleCents: Math.round(v * 100_000) })} /><RangeField hint="The most this fictional policy can pay, even if the loss is larger." label="Overall policy limit" value={ins.policyLimitCents / million} min={0} max={5} step={0.1} display={money(ins.policyLimitCents)} onChange={v => updateInsurance({ policyLimitCents: Math.round(v * million) })} /><div className="coverage-toggles"><Toggle title="Business interruption" detail="Lost income, subject to a waiting period and sublimit." checked={ins.interruptionCovered} onChange={() => updateInsurance({ interruptionCovered: !ins.interruptionCovered })} /><Toggle title="Ransom payments" detail="Excluded here. Switch on to include it in this example." checked={ins.ransomCovered} onChange={() => updateInsurance({ ransomCovered: !ins.ransomCovered })} /></div><details className="advanced"><summary>More policy assumptions <span>+</span></summary><div className="advanced-content"><RangeField label="Interruption sublimit" value={ins.interruptionSublimitCents / 100_000} max={1000} step={25} display={money(ins.interruptionSublimitCents)} onChange={v => updateInsurance({ interruptionSublimitCents: v * 100_000 })} /><RangeField label="Waiting period" value={ins.waitingDays} max={10} display={`${ins.waitingDays} days`} onChange={v => updateInsurance({ waitingDays: v })} hint="The fictional interruption lasts five days. Loss is spread evenly across those days." /><RangeField label="Cash in the business" value={ins.businessCashCents / 100_000} max={2000} step={50} display={money(ins.businessCashCents)} onChange={v => updateInsurance({ businessCashCents: v * 100_000 })} /></div></details></div>
          <div className="coverage-result"><div className="panel-heading"><span>Loss left with the business</span></div><div className="loss-pair"><div><span>Without this policy</span><strong>{money(ins.grossLossCents)}</strong><small>left with the business</small></div><div><span>With this policy</span><strong data-testid="retained-loss">{money(insurance.retainedCents)}</strong><small>left with the business</small></div></div><BreakdownBar total={ins.grossLossCents} label={`Insurer pays ${exactMoney(insurance.insurerCents)}; the business retains ${exactMoney(insurance.retainedCents)}.`} items={[{ label: `Insurer: ${money(insurance.insurerCents)}`, amount: insurance.insurerCents, color: 'var(--green)' }, { label: `Business: ${money(insurance.retainedCents)}`, amount: insurance.retainedCents, color: 'var(--shortfall)' }]} /><div className="coverage-ledger"><div><span>Not covered</span><strong>{money(insurance.excludedCents)}</strong></div><div><span>Deductible</span><strong>{money(insurance.deductibleAppliedCents)}</strong></div><div><span>Above the overall limit</span><strong>{money(insurance.limitGapCents)}</strong></div></div><button className="text-action" onClick={() => setModal('insurance')}>Read the calculation <Arrow diagonal /></button></div>
        </div>

      </section>

      <section className="ending"><p className="eyebrow">With your assumptions</p><h2>How much?<br />Available when?<br /><em>On what terms?</em></h2><p>Here is where each example stands.</p><dl className="ending-recap"><div><dt>The sale</dt><dd>{money(exit.founderNetCents)}<small>Founder net cash from a {money(e.exitCents)} sale</small></dd></div><div><dt>The portfolio</dt><dd>{money(portfolio.liquidCents)}<small>Available within 30 days, with {money(portfolio.dueCents)} due</small></dd></div><div><dt>The policy</dt><dd>{money(insurance.insurerCents)}<small>{insurance.insurerCents ? `Payment on day ${ins.paymentDelayDays}` : 'No insurance payment'}; {money(insurance.retainedCents)} loss left with the business</small></dd></div></dl><div className="ending-actions"><button className="button primary" onClick={download}>Download the numbers <span aria-hidden="true">↓</span></button></div><div className="ending-links"><a href="/methodology/">Assumptions and calculations</a><a href={sourceURL} target="_blank" rel="noreferrer">Source code on GitHub</a><button onClick={reset}>Start over</button></div></section>
    </main>
    <footer><a className="footer-brand" href="https://worthbuilding.org/" target="_blank" rel="noreferrer">An experiment worth building. <Arrow diagonal /></a><p>Created by <a href="https://antonbraverman.com/" target="_blank" rel="noreferrer">Anton Braverman</a>. MIT-licensed code.<br />Hypothetical examples. Educational use, not financial, tax, legal or insurance advice.</p><span>Calculated in your browser.<br />No account. No financial data upload.</span></footer>
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</div>
    {toast && <div className="toast" role="status">{toast}<button aria-label="Dismiss message" onClick={() => setToast('')}>×</button></div>}
    <dialog ref={dialog} className="math-dialog" onCancel={() => setModal(null)} onClose={() => setModal(null)} onClick={event => { if (event.target === dialog.current) { const r = dialog.current.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) setModal(null); } }} aria-labelledby="dialog-title"><div className="dialog-top"><span className="eyebrow">Calculation details</span><button className="close-dialog" onClick={() => setModal(null)} aria-label="Close calculation">×</button></div><h2 id="dialog-title">{receipt?.title}</h2>{receipt ? <><p className="dialog-note">{receipt.note}</p><ol className="trace-list">{receipt.rows.map((row, i) => <li key={`${row.label}-${i}`}><span className="trace-number">{String(i + 1).padStart(2, '0')}</span><div><div><h3>{row.label}</h3><strong>{exactMoney(row.amountCents)}</strong></div><p>{row.calculation}</p></div></li>)}</ol><a className="text-action" href="/methodology/">All assumptions and limitations <Arrow diagonal /></a></> : null}</dialog>
  </>;
}
