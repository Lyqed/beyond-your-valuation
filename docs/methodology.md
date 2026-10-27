# Model definitions, version 0.1.0

All amounts are fictional. The source modules implement the definitions below. The website's [methodology page](../app/methodology/page.tsx) provides the detailed assumptions and background links.

## Exit

Let `D = price - transaction costs` and `P = min(D, invested capital × preference multiple)`.

For a non-participating preferred class, compare its as-converted common allocation from `D` with `P`. If the converted amount is at least `P`, distribute `D` to all holders as common. Otherwise, pay `P` to investors and allocate `D - P` only among the common groups, normalized by their relative common ownership.

For uncapped participating preferred, pay `P` first, then allocate `D - P` among all holders, including investors. Founder tax is `max(gross proceeds - basis, 0) × illustrative rate`. No other holder's personal tax is modeled.

The cap table starts after funding. Team shares are vested and already exercised common shares. A separate `dilute` helper models the proportional effect of an ordinary priced round.

Default: $100m offer, 40% founder, 40% investor, 10% team, 10% other common, $30m invested, 1× preference, 2% costs and 25% illustrative founder tax. Non-participating founder net: $29.4m. Participating founder net: $20.4m.

Mechanics were checked against [Morrison Foerster](https://scaleup.mofo.com/guidance/ask-a-mofo-common-provisions-in-venture-capital-term-sheets-liquidation-preference) and [Carta](https://carta.com/learn/equity/liquidity-events/liquidation-preferences/). Actual transaction documents govern actual distributions.

## Portfolio

Allocate the starting USD capital across cash, public shares, bonds, property, private equity and a new company. The optional joint shock applies respective losses of 0%, 35%, 8%, 12%, 20% and 50%. These are stipulated examples with no probability attached.

Cash, public shares and bonds are available within 30 days at their displayed values. The other assets cannot be sold in that window. The FX shock changes 3.60 ILS/USD to 2.88; USD assets retain the same USD values, while ILS spending needs more USD.

```text
Due = private equity call + new-company call + ILS family expense / FX rate
Available = cash + stressed shares + stressed bonds
Shortfall = max(Due - Available, 0)
```

This is a snapshot before payments. Calls do not automatically reduce total wealth. Their potential new assets, and any resulting sales, are not posted. With all five events active, the default $5m example has $3,857,500 of assets, $1,162,500 available, $1,625,000 due and a $462,500 shortfall.

See the SEC's background on [private equity liquidity](https://www.investor.gov/introduction-investing/investing-basics/investment-products/private-investment-funds/private-equity) and [asset allocation](https://www.investor.gov/introduction-investing/getting-started/asset-allocation). These sources do not supply or validate the invented stress percentages.

## Insurance

The separate fictional business suffers a loss split 50% response costs, 25% interruption and 25% ransom. Response is eligible; interruption and ransom can be excluded. The waiting period removes a proportional share of the five-day interruption before applying its sublimit.

```text
Eligible = response + interruption after waiting/sublimit + eligible ransom
Deductible applied = min(deductible, Eligible)
Insurer payment = min(overall limit, Eligible - deductible applied)
Retained loss = gross loss - insurer payment
Cash gap = max(gross loss - cash - payment received by day 30, 0)
```

All loss is assumed due within 30 days. Payment occurs wholly on the selected day. The default $1.2m loss produces $900k eligible loss, $100k applied deductible, $800k payment and $400k retained loss. Cash of $750k and payment on day 60 leave a temporary $450k gap.

Policy ordering, categories and timing are invented for this example. The [NAIC cybersecurity overview](https://content.naic.org/insurance-topics/cybersecurity) provides general context on varied cyber exposures and policies.

## Arithmetic

Inputs and outputs use integer cents. Intermediate products use `BigInt`. Largest remainders conserve allocations exactly; original input order resolves ties. Fees, tax and post-shock valuations round down. USD needed for a foreign-currency obligation rounds up. UI values are compact; receipts and exports retain cents.
