# Tightening the experience

Anton asked on 16 November 2026 to tighten the existing experience. Nothing
was added. The three chapters, the models, the defaults, the saved-scenario
format and the visual direction are unchanged. This pass removes repetition
and shortens the distance between each question, its controls and its answer.

## What changed

- Chapter headings lose their 01, 02 and 03 reference numbers. The chapter
  navigation still numbers the three chapters.
- Chapter one opens on its question and one line of direction. The subtitle
  that explained the conclusion in advance is gone.
- The founder's number is no longer labelled three times. It keeps one
  caption, and the sentence saying what the investors chose now sits directly
  under it, where it explains the number. The receipt lists the four steps
  that lead to it without repeating the total.
- The preference control reads 1×, 2×, 3×. The words "their investment" are
  still in each button's accessible name. The priority-claim sentence only
  mentions a limit when the claim is larger than the money available.
- All three calculation links say "Show the calculation".
- In the liquidity chapter the currency event shows its own before and after
  inside the toggle, so the separate paragraph between the events is gone.
  Three separate caveats about invented allocations, shocks and the exchange
  rate are now one sentence under the events. The note about copied founder
  proceeds appears only when founder proceeds are in use.
- The insurance chapter asks "When does the payment arrive?" and drops the
  sentence that repeated the chapter's opening. The small print keeps the
  caveat about payment timing.
- The ending is the three questions, the three numbers and one row of links.
  "Download the numbers" is now a link in that row, not a primary button.
- The board in the opening keeps its legend and the note that a tile is about
  1%. The hand-drawn instruction under it is gone; the switch above the board
  already says what it does.
- Spacing is reduced between chapters, around prompts, in the asset and event
  lists and around the ending.

On the default scenario the home page went from about 919 to 737 words, from
6,816 to 6,013 pixels tall at 1440 wide, and from 9,941 to 8,799 at 390 wide.

## What was kept on purpose

Every statement that the examples are fictional and not forecasts or advice
is still on the page at least once near the numbers it qualifies, and in the
footer. The calculation dialogs keep their full notes. The assumptions page
is unchanged.

## Verification

- `npm test`: all 19 regression and property tests pass.
- `npm run typecheck` and `npm run build` pass. The first build attempt
  stopped on the Next.js security-upgrade reminder for 16.4.3; the second ran
  normally. No dependency was changed in this pass.
- `scripts/qa-browser.mjs` passes in Chromium and WebKit at 1440 and 390
  pixels, and `scripts/qa-saved-inputs.mjs` passes. Both were updated for the
  renamed calculation link and the currency sentence.
- Desktop and phone-width captures of the whole page were inspected.
