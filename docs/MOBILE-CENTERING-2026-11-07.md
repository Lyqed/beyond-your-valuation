# Mobile hero alignment

The mobile opening text and Find out button now share the board's horizontal
center. The ownership legend keeps its seven-degree tilt, but rotates around
its own center so it no longer shifts to the right. The board heading now says
“Your company” in the ownership view on all screen sizes.

The ivory/white selector, flat mobile note and arrow, tilted board, desktop
alignment, model inputs and calculations are unchanged.

Validation: all 19 existing tests, the production build and TypeScript check
pass. Six browser cases cover Chromium and WebKit at 320, 390 and 1440px. Mobile
button, selector, board, legend, note and footnote centers are within one pixel
of the viewport center. Both ownership/proceeds views work, the board has 100
tiles, and there is no horizontal overflow or JavaScript error. Screenshots were
inspected at 320 and 390px.
