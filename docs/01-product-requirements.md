# Asili Playground — Product Requirements Document

As of 7 November 2026 · Victor Kaiuki

The playground is where people first touch Asili. It runs code in the browser today; it should also
show what the Pata toolchain does (format, lint, check, test, trace) and every language feature,
without an install. It is hosted at `asili-programming.github.io/playground/` and stays
self-hostable with Asili's own static server (decided 7 November 2026).

## Problem and goals

Today the playground has a CodeMirror editor, a Run button (Endesha), a sample picker with three
samples (Karibu, Sifa na Umbo, Kushughulikia Makosa), a Clear button (Futa), a keyboard shortcut and
an output panel. It is not hosted anywhere yet, loads CodeMirror from a third-party CDN (esm.sh), and
runs only one file. Errors arrive as one string in the output panel, not marked in the editor. None
of the Pata tools besides the compiler and runner are available.

Goals:

1. **Run anything a learner writes**, one file or several modules, with errors marked on the line.
2. **Show the toolchain**: format (`nadhifu`), lint (`pata kagua`), check without running, run tests
   (`#[jaribio]`), and trace a run (`--fuatilia`), each from a button.
3. **Show every feature**: a sample for each language area and each standard library module that
   works in a browser, with the modules that cannot work in a browser named plainly.
4. **Share and embed**: a link that opens with the same code; an embed mode the website and wiki
   use for runnable examples.

## Audiences

| Audience | Needs | Success looks like |
| --- | --- | --- |
| Swahili-speaking learner | Swahili interface, samples, errors on the line | Edits a sample, fixes an error, runs it |
| Teacher | Share a program with a class; lesson-sized samples | Sends one link that opens the exercise |
| Developer evaluating Asili | See formatter, linter, tests, trace without installing | Tries each tool in under five minutes |
| Wiki and website readers | Run the example on the page they are reading | Clicks Run under a wiki example |
| Self-hoster | Run the playground offline or on their own server | `build.sh` then `pata jenga --tenda` works |

## Tool coverage

Which Pata tools the playground surfaces. "In browser" means compiled to wasm and run client-side.

| Pata tool | In the playground | Release | Notes |
| --- | --- | --- | --- |
| Compiler and runner (`jenga --tenda`) | Run button | Today | `run` and `runBundle` exported by `asili-wasm` |
| Multi-file projects | File tabs; `runBundle(entry, modules)` | v1 | API exists, UI does not |
| Check without running (semantic analysis) | Diagnostics as you type, marked in the editor | v1 | Needs a `check` export with structured diagnostics |
| `pata nadhifu` | Format button and format on Run (optional) | v1 | `pata-fmt` library compiled to wasm; feasibility to verify |
| `pata kagua` | Lint button; findings in the editor | v1 | The `pata-lint` library `pata kagua` runs, compiled to wasm; feasibility to verify |
| `pata jaribu` | Test button runs every `#[jaribio]` function | v1 | Needs a `test` export |
| `--fuatilia` | Trace tab showing the run as a tree | v2 | Trace events from the wasm build |
| Mwalimu (hover, completion) | Hover types and completion in the editor | v2 | LSP logic in a worker; large |
| `pata repl` | REPL panel | v2 | |
| `jenga --lengo wasm` output | Download the built module | v2 | |
| `pata ongeza`, `ondoa`, `njozi`, `thibitisha` | Not offered | Out | Need a file system, network or git |
| `pata-dap` debugger | Not offered | Out | Use VS Code |

## Scope

**v1:** host at `/playground/`; vendored CodeMirror; Swahili and English interface; errors marked
on lines; multi-file tabs; format, lint, check and test buttons; samples for every language area;
share links; embed mode; Stop button (programs run in a Web Worker).

**v2:** trace tab, hover and completion, REPL panel, download build output.

**Out of scope:** accounts, saving to a server, running code on a server, package installation.

## Functional requirements

| ID | Requirement | Priority | Release |
| --- | --- | --- | --- |
| PG-1 | Hosted at `/playground/` and runnable locally with `build.sh` and `pata jenga --tenda` | Must | v1 |
| PG-2 | Interface in Swahili and English, chosen by `?lugha=sw|en`, then the stored choice, then Swahili | Must | v1 |
| PG-3 | Compile and runtime errors marked on the line, with the Swahili message and code | Must | v1 |
| PG-4 | Programs run in a Web Worker; Stop ends a run and keeps the output so far | Must | v1 |
| PG-5 | Several files in tabs; one is the entry (`kuu`); runs with `runBundle` | Must | v1 |
| PG-6 | Format button (`nadhifu` rules) | Must | v1 |
| PG-7 | Lint button with findings marked in the editor | Must | v1 |
| PG-8 | Diagnostics while typing, without running | Should | v1 |
| PG-9 | Test button runs every `#[jaribio]` and lists pass and fail | Should | v1 |
| PG-10 | Sample gallery: one sample per language area and per browser-capable stdlib module | Must | v1 |
| PG-11 | Share link carries all files in the URL (compressed); opening it restores them | Must | v1 |
| PG-12 | Embed mode (`?embed=1`): editor, Run and output only, for the website and wiki | Should | v1 |
| PG-13 | A "browser support" panel lists stdlib modules that need a file system, network or threads, so failures are explained | Must | v1 |
| PG-14 | Trace tab | Could | v2 |
| PG-15 | Hover and completion | Could | v2 |
| PG-16 | REPL panel | Could | v2 |

## Non-functional requirements

| ID | Area | Requirement |
| --- | --- | --- |
| PG-NFR-1 | Performance | Interactive within 5 s on throttled 3G; editor usable before the wasm finishes loading |
| PG-NFR-2 | Size | Gzipped wasm size recorded in CI and held under a budget set from the first hosted build |
| PG-NFR-3 | Privacy | No request leaves the domain: CodeMirror vendored, no analytics, code never uploaded |
| PG-NFR-4 | Same results | A program prints the same output in the playground as with native `pata` (the Asili repo's `driver/wasm/tests/agree.sh` keeps them equal) |
| PG-NFR-5 | Accessibility | Keyboard-only use, visible focus, output announced to screen readers |
| PG-NFR-6 | Portability | Only relative asset paths, so the same files work at `/playground/`, a self-hosted root and `127.0.0.1:8080` |

## Success metrics

| Metric | Source | Target |
| --- | --- | --- |
| Pata tools with a playground surface (v1 rows) | Tool coverage table | 100% |
| Language areas with a sample | Sample gallery vs. the wiki's Language Tour sections | 100% |
| Samples that run and match native output | CI agreement check | 100% |
| Third-party requests | Browser network log in CI | 0 |

## Open questions

- [ ] Can `pata-fmt` and `pata-lint` build for `wasm32-unknown-unknown` as they are, or do they need
  their file-system code behind a feature flag?
- [ ] Which stdlib modules work in the browser? Needs an audit (`faili`, networking and `sambamba`
  are the likely exceptions).
- [ ] Share links: URL only (private, length-limited) or optional GitHub Gist export?
