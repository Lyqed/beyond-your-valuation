# Mobile payout legend

The After the deal legend used a wrapping flex row. At 390 pixels its four
items formed one, two and one items per line; at 320 pixels each item occupied
a separate line. Centering that outer container did not give the payout labels
a consistent structure.

Below 741 pixels, the proceeds legend now uses two equal columns and two rows.
Each category label and color key stay together, with the amount centered below.
The whole legend keeps its seven-degree tilt around its own center. Ownership
uses the existing inline legend, and desktop keeps the existing layout.
The selector, board, notes and mathematical models are unchanged.

Verification:

- All 19 existing regression/property tests pass.
- Production static export and TypeScript checks pass.
- The existing browser suite passes in Chromium and WebKit at 390 and 1440
  pixels, including calculations, controls, receipts, downloads and saved links.
- Focused checks cover both board views in both engines at 320, 360, 390, 430,
  740 and 1440 pixels: 24 cases. Mobile legend centers are within one pixel of
  the viewport center, payout columns and rows align, text fits, and there is no
  horizontal page overflow. Screenshots at 320 and 390 pixels were inspected.

Local evidence is in `../output/beyond-mobile-payout-2026-11-09/` relative to
the repository root. The previous source commit is
`4bebfb12f847bad6c03000b6a3c45313f9cf49d8`.
