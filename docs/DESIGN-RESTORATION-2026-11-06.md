# Restore and improve the original design

The presentation returns to the first saved version's warm paper background,
green, lavender and peach palette, large opening, tilted ownership board,
serif asides, chapter headings, favicon and sharing artwork. The source
reference is `bf0b354a670728279c43465684229763b472521d`.

The ownership board now uses the current scenario instead of a fixed cap
table. Its second view shows the same exit calculation used by the controls:
founder net cash, investors, other common holders, and costs plus modeled tax.
The sale price and sticker update with the inputs. The tiles are explicitly
rounded to whole percentages; the model's integer-cent receipts remain exact.
Zero proceeds display an empty neutral board and zero net cash.

Supporting text, mobile spacing, touch targets and active controls are more
legible. Current precise control labels, calculation receipts, downloads and
decoding of existing scenario links remain. The previously removed sharing
controls remain absent. No engine, assumption, scenario schema or model test
was changed. Existing custom-domain edits in README and layout are preserved.

Validation: all 19 model tests pass, including the seeded property checks;
the production build and TypeScript check pass. Chromium and WebKit pass at
1440px and 390px. The browser suite also checks 320px, 768px and 1920px widths,
dynamic ownership/proceeds views, the zero-exit case, calculation dialogs,
keyboard sliders, shocks, insurance timing, downloads, saved links, invalid
links and reset. No application errors, failed requests or external requests
occurred in these local production-build checks.

At preparation time, the existing Sites project remains public. Its custom
domain `whatyouactuallyown.com` is pending hostname/TLS validation; the existing
Sites hostname is reachable. No DNS or access settings were changed.
