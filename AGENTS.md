# Working on Beyond Your Valuation

This is a static educational experiment. Keep calculations deterministic and
browser-local. Preserve explicit assumptions and avoid implying that fictional
rates, shocks, liquidity windows or coverage are real-world predictions.

Money is integer cents. Percentages are basis points. Keep engine changes in
`packages/`, with corresponding receipts, documentation and meaningful tests.
Do not silently introduce unsupported financing or policy terms. Shared links
must match the versioned interface and its stated assumptions.

Run `npm test`, `npm run build` and `npm run typecheck` after model or app changes.
Use `scripts/qa-browser.mjs` when changing interactive behavior. Do not publish
internal employer details. Site copy uses plain language and no em dashes.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
