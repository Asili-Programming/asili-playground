# Playground planning documents

The plan for a playground that runs Asili and shows the Pata toolchain in the browser:

| # | Document | What it settles |
| --- | --- | --- |
| 1 | [Product Requirements](01-product-requirements.md) | Goals, tool coverage, PG requirements |
| 2 | [Technical Requirements](02-technical-requirements.md) | Worker architecture, wasm exports, sharing, hosting, CI |
| 3 | [App Flow](03-app-flow.md) | Layout, states, run/tools/files/share flows, edge cases |
| 4 | [Design Brief](04-design-brief.md) | Layout, words, editor theme, embed mode |
| 5 | [Implementation Plan](05-implementation-plan.md) | Roadmap, task tracker, decisions, launch checklist |

The hosted playground is built by the website repo (`asili-programming.github.io`) into
`/playground/`; see that repo's `docs/` for the site-wide plan. Change these documents by pull
request.
