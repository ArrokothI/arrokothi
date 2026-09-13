# K1.0 validation-02 — raw output for clean payload C

**Payload C:** `960a446b77bbd7d6973900eb23e10558c2584763`. **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Date:** 2026-09-13.
**Environment:** Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.
**Working directory:** `/Users/rex-shih/Documents/ArrokothI/arrokothi`.

Declared output-only attachments under [006](../../006-development-process.md). Every command
ran against the committed payload tree, whose only uncommitted content was this directory,
which the run itself writes. Nothing here introduces or changes a script, fixture, evaluator
rule, threshold or configuration; those are payload in C.

| File | Command | Exit | Result | SHA-256 |
|---|---|---|---|---|
| [01-tree-and-environment.log](01-tree-and-environment.log) | `git` state, versions, cumulative diffstat | 0 | clean tree at C; `tests/conformance/k0` byte-identical to base (0 files differ) | `28f3775a088ee140b38576391215f8e3381af70816f363eb1584e260aeaba485` |
| [02-typecheck.log](02-typecheck.log) | `npm run typecheck` | 0 | clean | `9dbef48424b09bf17903098dc2cedef01fd004e45f80374db536ff9487d541f9` |
| [03-test-full.log](03-test-full.log) | `npm test` | 0 | 1846 tests, 280 suites, 0 fail, 0 skipped | `93b0d23a671bd7519ae96fd6129501644d98e8341737ad05a4acc660382ffb01` |
| [04-test-conformance.log](04-test-conformance.log) | `npm run test:conformance` | 0 | 1733 tests, 261 suites, 0 fail, 0 skipped | `b5e4c03771383cff25e4bb75c39e2905cb86f8a9b2fe94db6790fa617820b06d` |
| [05-check-builder-docs.log](05-check-builder-docs.log) | `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports | `cb06317d46bd10dcbd7be84f68710f2b3380d1abc4ccd323ee8d4d5a352aaeb3` |
| [06-test-kernel.log](06-test-kernel.log) | `npm run test:kernel` | 0 | 4 tests, 0 fail | `51e8efbee7935a82f5801449a0e372818972c31ee01eb24f83d099fd71d1cfe8` |
| [07-test-sdk.log](07-test-sdk.log) | `npm run test:sdk` | 0 | 22 tests, 0 fail | `cbe685ac028177b7ccb3aa7d78c29926c873d7069e9534ba6ea4c64fc02b1458` |
| [08-scanner-comparison.log](08-scanner-comparison.log) | inline comparison, source quoted in the log | 0 | 325 files, 317 identical; 32 old-only, 1 new-only; pre-existing prose removals only, no lost genuine import | `274d946bf5b7d0ccfa539eba3182877b011340375a39b1bd89b896cabc1f2a4e` |
| [09-r101-demonstration.log](09-r101-demonstration.log) | inline demonstration, source quoted in the log | 0 | K10-R1-01: regex-after-paren and non-literal cases each yield exactly 1 forbidden violation via the real guard path | `f099c10665a89352bf9fac18d54bcb06a82a98cbed961f01fe692e9caf460543` |

`npm run test:evals` was not run. This packet changes no Agent behaviour and no model-facing
path; nothing in the diff is reachable from an eval. Recorded as not run, with that limit.

## Reading 08

Four of the old-only specifiers are in files that existed at the base. Each was read in
source and confirmed to be prose or data rather than an import:

| File | Reported by the old scanner | What it actually is |
|---|---|---|
| `packages/retrieval/local/src/records.ts:10` | `nothing matched` | documentation prose |
| `packages/interoperability/mcp/src/import/result.ts:234` | `this may have happened and the answer was lost` | documentation prose |
| `packages/retrieval/local/src/lexical.ts:21` | `, ` | a stopword list containing the word `from` |
| `scripts/check-builder-docs.ts:91` | `@arrokothi/sdk` | a string used as a search needle |

The other 28 are in files K1.0 adds: the fixture text and prose the forbidden-edge controls
deliberately carry, which is why the scanner had to be corrected before those controls could
be stated at all. The one new-only specifier — `node:test` in
`tests/conformance/architecture/legacy-core-boundaries.test.ts` — is a genuine import the old
scanner destroyed by matching across a preceding documentation block.

On files that existed at the base the committed TypeScript-parser scanner removes only prose
phantoms and adds only genuine imports: no pre-existing guard result can change except the
intended fail-closed additions (non-literal sentinel, `typescript` parser dependency with its
allowlist reason).

## Reading 09

Both K10-R1-01 counterexamples run through temporary fixture repositories via the same
`loadWorkspace` / `walkModuleGraph` / `boundaryViolations` path the real guard uses:

- `if (true) /["']/.test('x');` followed by `import { LegacyHarness } from "@arrokothi/core"`
  yields exactly one violation with specifier `@arrokothi/core`, attributed to
  `packages/kernel/src/index.ts`.
- `const target = "@arrokothi/core"; await import(target)` yields exactly one violation with
  specifier `__non_literal_dynamic_import__` and the fail-closed reason, attributed to
  `packages/kernel/src/index.ts`.

The committed guard tests pin the same two cases (`kernel-landing-zone.test.ts` K10-R1-01
controls) and the scanner unit tests pin them at the extractor level
(`import-scanner.test.ts` K10-R1-01 cases).
