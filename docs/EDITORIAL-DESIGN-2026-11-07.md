# Copy, color and typography review

Reviewed on 7 November 2026 after the interaction review in
`ADVERSARIAL-REVIEW-2026-11-07.md`. Three parallel reviews covered copy, live
Worth Building references and the favicon/sharing image.

## Direction

Worth Building satellites do not use a single mandatory typeface or palette.
The hub itself includes a serif tagline. This refinement follows the clear
Inter typography and restrained surfaces of the closest interactive examples,
including Wrong Measurements and Rethinking Value, while preserving Beyond
Your Valuation's tilted ownership board and three-chapter experience.

The previous version's cream canvas, Georgia italics and several decorative
pastel panels made the site feel more like a finance publication. The new
version uses the existing local Inter font throughout. No new font dependency
or external font request was added. Stronger headings, tabular figures and
consistent normal styles make questions and changing results easier to scan.

## Copy

The chapters now ask concrete questions: "You own 40%. How much reaches you?"
and "What gets paid, and when?" The ownership percentage follows the input.
The opening identifies the sale as fictional. Liquidity is defined where the
portfolio starts. Bridges clearly identify the separate portfolio and business
examples. The founder-proceeds option retains its one-time-copy explanation.

The ending asks "How much? Available when? On what terms?" rather than implying
that assets cease to belong to someone when they cannot readily become cash.
Insurance uses "loss left with the business" because the modeled loss includes
lost income as well as bills. A zero insurer payment explicitly says there is
no payment instead of describing a payment arrival date.

## Color and assets

| Role | Color |
| --- | --- |
| Canvas | White, #ffffff |
| Main text | Near-black, #171717 |
| Secondary text | Gray, #606060 |
| Founder, available funds, primary actions | Green, #087e45 |
| Investors | Blue, #4165c1 |
| Team | Orange, #d97732 |
| Other ownership | Gray, #858d95 |
| Shortfalls and retained loss | Rust, #9b352d |

Orange and ownership gray are graphic fills, not body text. All four ownership
fills exceed 3:1 against the white board. Normal green and rust text exceed
4.5:1 on their displayed light surfaces. Labels and amounts accompany colors.
Both founder comparison bars use green; blue continues to identify investors.
The sale price is near-black, distinct from the founder's available proceeds.
Positive and negative mobile summaries follow their actual result.

The existing SVG favicon and sharing artwork now use the same palette and
Inter. The sharing PNG was rendered at 1200 by 630 with the bundled font loaded.
Metadata uses new asset query strings so clients can fetch the updated artwork.

## Verification

- All 19 arithmetic and scenario tests passed. Models, defaults and shared-link
  schemas are unchanged.
- Production build, TypeScript check and whitespace check passed.
- Main browser regression suite passed in Chromium and WebKit at desktop
  and mobile widths, including the added zero-payment explanation check.
- The final visual pass corrected a one-pixel overflow at 320 pixels by
  insetting the ownership sticker. The board surface was made white to retain
  at least 3:1 contrast for the orange tiles.
- Final focused checks passed in Chromium at 1440, 390 and 320 pixels and
  WebKit at 390 and 320 pixels: Inter loaded, no decorative italic runs,
  no horizontal overflow, both board views working, and result colors matching
  positive and shortfall states. Methodology typography and forced-color
  feedback were also checked.

Screenshots and detailed browser evidence are kept in the private workspace
review output rather than shipped in the public application.
