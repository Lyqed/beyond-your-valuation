# Beyond Your Valuation: adversarial experience review

Three independent reviews examined the published version-six experience on
7 November 2026: visitor journey and copy, visual/accessibility behavior, and
model/UI trust. The journey review compared live Worth Building experiences
including They Were So Sure, It Didn’t Make Itself, Adam & Eve Ventures and
The Best Ad in History. Comparisons informed interaction design, not a request
to copy their appearance or turn this experiment into a different product.

The $100m opening and paper-and-tiles design were retained. Reviewers found
no material arithmetic discrepancy against the models’ stated assumptions.
The priority was making the experiment easier to follow, keeping effects
visible, and ensuring that controls actually represent their inputs.

## Findings addressed

| Finding | Resulting behavior |
| --- | --- |
| Mobile inputs were separated from their outcomes by several screens | A compact result stays below the chapter navigation while that chapter is active, including with advanced controls open. Other chapters’ summaries are hidden. |
| Find out scrolled but left keyboard focus in the hero | Chapter and breakdown navigation moves focus to its destination. The next Tab continues locally. Reset returns to the opening. |
| Changed results were not announced | A short debounced status announces the current chapter’s result. Active chapter selection follows section position and direct interaction. |
| The default continuation silently changed the story into a $5m portfolio; importing $29.4m weakened the intended comparison | The default bridge explicitly starts a separate $5m example. Importing founder proceeds stays available as an optional, explicitly described snapshot. |
| Preference controls hid the invested amount and relied on unexplained terms | The current investment and priority claim are stated next to the controls. OR versus AND descriptions explain participation without leaving the experiment. |
| Insurance settings appeared before the incident was understood | The incident’s response, lost-income and ransom amounts are shown first. Payment timing now precedes detailed policy controls. Deductible and policy-limit hints explain the fictional rules. |
| The ending offered only a technical download | A readable three-example recap precedes the existing JSON download. No removed share controls were restored. |
| The exit chart’s accessible label omitted amounts and the ownership strip had unsupported ARIA | The chart exposes every exact component amount. The ownership strip has an image role matching its description. |
| Insurance timing caveat contrast was insufficient | Its text color is darker while retaining the established palette. |
| Returning from assumptions discarded edits | Validated inputs are retained in the current tab’s session. Explicit saved scenarios take priority; invalid ones load the original examples. Reset clears saved state. Storage failure does not prevent calculation. |
| A same-document saved fragment changed the URL but not the model | Initial loading and hash changes use the same validated scenario loader; browser history between scenarios works. |
| Accepted saved values disagreed with native range controls | The extracted RangeField preserves precise imported values, including below-grid ownership. User edits move to reachable steps without inventing or losing ownership. |
| The currency event initially changed no visible number | Its existing ILS purchasing-power output and assumed exchange rate are now visible beside the event. Dollar asset values remain correctly unchanged. |
| Imported founder proceeds appeared to remain linked to subsequent deal edits | A nearby note states that the copy is a snapshot and later deal changes do not update it. |

## Boundaries retained

No engine arithmetic, defaults, scenario version, fixed shocks, currency rate,
coverage assumptions or export schema changed. The examples remain fictional
and browser-local. The source link, canonical custom domain, metadata, favicon,
Open Graph artwork and existing saved-scenario encoding remain intact. No
accounts, uploads, analytics, external calculation services or financial advice
were introduced. The assumptions page explains the new per-tab persistence.

## Verification

- All 19 engine/schema tests pass, including the seeded property cases.
- The static production build and TypeScript check pass.
- Expanded browser checks cover Chromium and WebKit at desktop and mobile
  widths: original model outputs, input interactions, focus, current-chapter
  summaries, announcements, FX, the explicit $5m path, insurance ordering,
  recap, methodology continuity, fragment precedence/history, reset, receipts
  and JSON export.
- A separate saved-input suite checks exact imported values and receipts,
  keyboard/pointer edits, fractional ownership limits and integer exports in
  Chromium and WebKit. No engine/schema restrictions were added to discard
  existing version-one scenarios.
- Focused visual/accessibility checks cover 320px, 390px and desktop layouts.
  These automated and visual checks are evidence about the tested flows, not
  a claim of exhaustive accessibility or financial validation.

Run `npm test`, `npm run build`, `npm run typecheck`, then serve `out/` on 3048.
With an existing Playwright installation, run both `scripts/qa-browser.mjs`
and `scripts/qa-saved-inputs.mjs` using `PLAYWRIGHT_MODULE` when needed.
`BASE_URL` overrides the local URL. Reports and captures go to ignored
`test-results/`. The Sites owner handles source packaging and publication;
this document records the reviewed implementation and local verification.
