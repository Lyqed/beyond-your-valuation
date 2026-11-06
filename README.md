# Beyond Your Valuation

Explore how ownership, deal terms and payment timing affect available cash.

An interactive, open-source model of startup exits, liquidity and insurance. Start with a fictional $100 million sale and change the assumptions to see the results. No account or financial-data upload is needed. Calculations run in your browser.

[Open the experience](https://beyondyourvaluation.com) · [Read the assumptions](https://beyondyourvaluation.com/methodology/)

![Beyond Your Valuation: fictional exit, liquidity and insurance scenarios](public/og.png)

## Three chapters

| Chapter | Change | Inspect |
| --- | --- | --- |
| Exit proceeds | Price, ownership, preference, participation, costs and illustrative tax | Who receives each part of the acquisition consideration |
| Liquidity | Allocation, joint market shock, currency shock and cash obligations | Assets available within 30 days versus obligations due |
| Insurance | Deductible, limits, exclusions, waiting period and payment timing | Insurer payment, retained incident loss and temporary cash gap |

Click a result to see the calculation, or download its inputs, exact outputs and calculation receipts as JSON. Existing scenario links continue to load their saved inputs.

The opening ownership board follows the current deal inputs. Switch between
ownership and proceeds to compare the shares on paper with the modeled
distribution of the sale price. Its 100 tiles round to whole percentages;
the calculation receipts retain exact cents.

The default exit produces $29.4 million of founder net cash. Changing only the investor's preference from non-participating to uncapped participating produces $20.4 million. These are outputs of the stated fictional terms, not estimates of a real founder's proceeds.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open `http://localhost:3047`. The development server listens on all interfaces so a host browser can reach it when the project runs in a VM or WSL.

```sh
npm test
npm run build
npm run typecheck
```

The build exports static files to `out/`. Any host that serves the directory with trailing-slash routes can serve this application. There is no runtime server or database. `.openai/hosting.json` identifies the original Sites deployment; replace its project identity when deploying your own copy through Sites.

## Architecture

```text
app/                         Next.js story, controls and methodology page
packages/equity-engine/      One preferred class and common shareholders
packages/portfolio-engine/   Deterministic joint stress and liquidity snapshot
packages/insurance-engine/   Fictional coverage and payment timing
packages/scenario-schema/    Versioned validation and share-link encoding
packages/shared/            Integer money and exact allocation
examples/                   Reproducible inputs and expected outputs
tests/                      Regression and seeded property tests
scripts/qa-browser.mjs      Browser interaction and responsive checks
```

The engines are pure TypeScript modules with no UI, server or network dependency. All three run locally so the displayed numbers come from the same code that can be inspected and tested. This version has no Monte Carlo model, Python service or live market feed.

### Units and rounding

Money is integer cents. Ownership, tax rates and preference multiples use basis points: 4,000 means 40%; a 1× preference is 10,000. Exchange rates use millionths of ILS per USD. Intermediate multiplication uses `BigInt`. Largest remainders allocate every cent; input order breaks ties. Fees and taxes round down, while an ILS obligation converted to USD rounds up. Large display numbers are compacted; receipts and JSON retain cents.

Engine input validators enforce arithmetic constraints. Shared scenario version 1 additionally rejects unknown fields and values outside the experience's controls or fixed assumptions. It does not silently accept extra financing terms. The JSON download is a report containing inputs and outputs, rather than an import format.

### Verification

Regression cases cover conversion versus preference, participation, depleted common proceeds, FX denomination, cash calls, exclusions, limits and payment timing. Seeded property tests run 3,400 cases checking conservation, nonnegative distributions and payment bounds. These checks verify the stated arithmetic, not financial suitability.

The optional browser check uses an existing Playwright installation with Chromium and WebKit available. Serve the production `out/` directory on port 3048, then run:

```sh
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs node scripts/qa-browser.mjs
```

Set `BASE_URL` to test another locally served build. Screenshots and the QA report go to ignored `test-results/`.

## Boundaries

This is an educational model, not financial, tax, legal or insurance advice. Its numbers describe fictional assumptions. It intentionally excludes complex preferred-class waterfalls, actual tax rules, long-term return forecasts and real insurance contract interpretation. The business in the insurance chapter has a separate balance sheet from the personal portfolio.

See [the model definitions](docs/methodology.md), [limitations](docs/limitations.md), and the more detailed [website methodology source](app/methodology/page.tsx). Extend a model by adding explicit assumptions, calculation receipts and meaningful tests together.

## Privacy and licensing

There are no application analytics, accounts or financial-data uploads. Hosts receive ordinary HTTP requests. Browsers do not send URL fragments to the hosting server, but anyone receiving a shared link can read its inputs. Downloads are generated locally.

Created by Anton Braverman as an experiment worth building. Code is [MIT licensed](LICENSE). The locally bundled Inter font is covered by its [SIL Open Font License](public/fonts/OFL.txt). No employer, financial institution or cited organization is a partner or endorser.
