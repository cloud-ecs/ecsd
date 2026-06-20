<!-- agents-version: 1 -->

# AGENTS.md

Shared instructions for every coding agent in this repo. The tool-specific files
(`CLAUDE.md`, `.github/copilot-instructions.md`) defer to this one.

## Repository model

**ecsd** is an Express.js application that scans emails with multiple content filtering engines.

- **Root structure**: `server.js` (entry point), `lib/` (scanner engines and utilities), `routes/` (Express routes), `html/` (web UI), `test/` (node:test suite), `cloud-email-scanner.ini` (config).
- **Scanner architecture**: `lib/scanner.js` orchestrates engines; individual engines (`clamav.js`, `rspamd.js`, etc.) extend `base-scanner.js` and connect via CLI, TCP socket, or Unix socket.
- **Routes**: `/scan` (POST to scan email), `/status/scannersAll` (list all), `/status/scannersAvailable` (detected engines), static assets and status UI.

## Working agreement

- Do only what was asked. When you spot an adjacent bug or smell, surface it and ask before expanding scope — don't silently refactor, but don't ignore it either.
- Preserve compatibility; break it only for an explicit, stated reason.
- When adding/modifying a scanner engine, verify its output format against the real implementation or documentation.

## Source control

- Never run history- or remote-mutating commands (`git commit`, `git push`, `git tag`, `gh pr create`) unless explicitly asked. Stage diffs; the human reviews, commits, and pushes.
- Propose a commit message in Conventional Commit format, imperative mood.
- Update `CHANGELOG.md` under `### Unreleased`: one terse clause per change, least markup. Rationale belongs in the code or PR, not the bullet.

## Coding standards

- Target current Node LTS; prefer ES2024 over legacy patterns.
- The package is ESM (`"type": "module"`): use `import`/`export`, not `require`/`module.exports`. Relative imports need explicit file extensions (`./logger.js`). Import named exports directly (`import { loadConfig } from './config.js'`) and whole-module namespaces with `import * as` (`import * as logger from './logger.js'`); `BaseScanner` and `ClamStream` are default exports. `public`/`private` are reserved words, so route registrars are named internally and re-exported via `export { fn as public }`. Optional deps load through `await import()` in a try/catch (see `lib/dspam.js`).
- Add `node:` prefixes to built-in imports in any file you touch (`import fs from 'fs'` → `import fs from 'node:fs'`).
- Prefer: promise APIs (`fs/promises`), `for...of`/`for...in` over `forEach`, `node:readline` for line parsing, template literals over concatenation, `true`/`false` over `1`/`0`, and guard-style early returns.
- Remove commented-out code (it lives in git history). `npm run lint` and `npm run prettier` must pass without warnings.

## Comments

- Prefer self-documenting code: a better name beats a comment.
- Keep only WHY comments — a hidden constraint, an invariant, a workaround for a specific bug, or documentation that explains otherwise-surprising behavior.
- Delete WHAT comments that restate the code, and comments that narrate history or audit findings. If a rename makes a comment redundant, delete it rather than updating it.

## Scanner engines (`lib/*.js`)

- Engines extend `BaseScanner` and implement `scan(emailBuffer, envelope)` → `{ pass, fail, error, raw }`.
- Each engine detects availability via `detect-cli.js`, `detect-socket.js`, or `detect-tcp.js` (returns true if reachable).
- Envelope metadata (`IP`, `Helo`, `From`, `Rcpt`, `SPF`, etc.) is extracted from `X-Env-*` headers and passed as the `envelope` param.
- Output parsing must be resilient; wrap real process execution in try-catch and log errors without crashing.
- Use an injectable seam for external I/O (spawning processes, opening sockets) so tests can stub it without mocking the entire module.

## Testing

- Test real behavior and observable outcomes — scan results, HTTP responses, side effects — not how a function was called. Asserting call shape (`calledWith`, arity, call counts) tests the test and hides signature drift.
- Mocks/stubs are a smell. Prefer real inputs (test email files in `test/files/`) and real engine output when possible. When you must isolate a dependency, inject a seam and assert the outcome.
- For bug fixes, add a failing test first, then fix.
- Every feature ships with meaningful tests. A `.skip` is a coverage hole: fix it or delete it.
- Use `node:test` and `node:assert/strict`. Test helpers are in `test/helpers/`.
- Run `npm test`, `npm run lint`, `npm run prettier` before handoff.

## Commands

- **Test**: `npm test` (all tests with `--test-force-exit`). Single file: `node --test test/path/to/file.js`.
- **Coverage**: `npm run test:coverage`; lcov: `npm run test:coverage:lcov`. Keep coverage at/above ~90%.
- **Lint**: `npm run lint` (ESLint on `*.js`, `lib/`, `routes/`, `test/`).
- **Format**: `npm run prettier` (check); `npm run prettier:fix` (write).
- **Start**: `npm start` (runs `node server.js`).

## Configuration

- Engines are configured in `cloud-email-scanner.ini` (loaded and parsed by `lib/config.js`).
- Config keys: `[<engine>]` sections with `enabled=true/false` and engine-specific options (host, port, socket path, API key, etc.).
- Detection logic in `lib/scanner.js` calls detect functions and populates available engines; routes serve `/status/scannersAll` and `/status/scannersAvailable`.

