# Implementation report — K1.0, round 2

## Identity

- **Packet:** K1.0 — target boundary and legacy quarantine. **Parent milestone:** K1.
  **Contract:** [`contract.md`](contract.md), revision 2.
- **Governing process baseline:** this repository's integrated `docs/development/` documents at the
  base commit — [006](../../006-development-process.md), [007](../../007-work-packets.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [013](../../013-structure-and-evidence-sequencing.md) — including the owner's 2026-09-13 revisions
  to 006, 008 and 009. This candidate changes none of them.
- **State:** CHANGES_REQUESTED (round 1 review) → IN_PROGRESS (correction) → WAITING_FOR_REVIEW.
  No verdict is entered here and none is claimed.
- **Owner release and its provenance.** Unchanged from round 1: entering the round-1 session the
  ledger recorded `next_release: none` with K1.0 PLANNED and unreleased, so the hold was reported
  back to the owner. The owner then replied, in the same session on 2026-09-13, verbatim:

  > "Release ArrokothI K1.0.
  > Treat the Benchmark E1 dependency as the already-built but unaccepted fixture preparation."

  The first line is the release. The second is one owner amendment, resolving K1.0's second
  dependency against 007's general rule that dependencies be "independently ACCEPTED and integrated".
  Both are recorded in the contract's *Release provenance* section with the exact E1 identities relied
  on. No successor is released and none is started. No new owner decision was needed for this
  correction: both round-1 findings require ordinary same-packet corrections, and the review states
  "Neither finding requires an architecture decision".
- **Prerequisite ACCEPT and integration identities.** K0.2 accepted at H16
  `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` by [review-17.md](../K0.2/review-17.md); integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)). The benchmark E1
  fixture preparation is **built and unaccepted**: branch `codex/e1-kernel-acceptance-capture`, payload
  `d8f17549c31f9ee5d995e773c2f211faed2785fb`, candidate `8de04779d279dba82cf834d419e465d2b677ef46`,
  status `BLOCKED_EXTERNAL`, not merged (benchmark `main` is `5a3f1ba525f68244701b1f73a1d29c4902ffe589`).
  Recorded, never claimed as a status in either direction. Unchanged from round 1.
- **Branch and configured remote:** `codex/k1.0-target-boundary-legacy-quarantine` on `origin`
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` — the integrated `main` at branch creation,
  unchanged across rounds. Verified before any round-2 edit.
- **Payload C:** `960a446b77bbd7d6973900eb23e10558c2584763`. One payload commit on top of the
  round-1 reviewed history (`bded42d`): `960a446` (K10-R1-01 + K10-R1-02 + two self-found fixes +
  contract revision 2). Prior history preserved rather than amended: `0eb068d` (packet),
  `2ed8523` (K1.0-SELF-01), `811758e` (contract reconciliation), `40bb07a` (round-1 H),
  `bded42d` (round-1 review record).
- **Previous reviewed H and its review record:** `40bb07a54cd5ba78aed386cb03cd0fb47579b6f6`,
  reviewed by [`review-01.md`](review-01.md) (OpenAI GPT-5.6 Sol (High), 2026-09-13) with verdict
  CHANGES_REQUIRED and two open findings K10-R1-01 (P1) and K10-R1-02 (P2). Required outcomes and
  counterexamples in that record are treated as authoritative here; no suggested implementation was
  narrowed to.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, since a commit cannot name itself.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.0/implementation-02.md` (this report)
  - `docs/development/work/K1.0/validation-02/MANIFEST.md` and its nine `0*.log` attachments
  - the K1.0 status-row transcription in `docs/development/007-work-packets.md`, round 1 →
    round 2 WAITING_FOR_REVIEW, plus the ledger's release paragraph (unchanged release)
  - the matching live-summary sentences in `docs/development/README.md` and
    `docs/development/001-current-status-and-roadmap.md`

  Nothing else. No script, fixture, schema, test, threshold or configuration is in that interval.
- **Working-tree state:** clean at C when every command in `validation-02/` ran; recorded in
  `01-tree-and-environment.log` (the only untracked content during those runs was this directory,
  which the runs themselves write; `*.log` files are git-ignored and were force-added only for H).
- **Push status:** pending at the time of writing. The verified advertised remote SHA is supplied in
  the external handoff after the push; this report certifies no future push.

## Changes and coverage

### Change groups and the full cumulative diff

`base..C` is the round-1 cumulative packet plus one correction commit. The correction commit alone
is 7 files; the cumulative packet's new behavior since round 1 is exactly that commit.

| Group | Paths | Governing source |
|---|---|---|
| Sound scanner (K10-R1-01) | `tests/conformance/architecture/module-graph.ts`, `boundary-policy.ts` | 007 "meaningful transitive import guards"; review-01 required outcome |
| Scanner fidelity + guard controls | `tests/conformance/architecture/import-scanner.test.ts` (38 cases), `kernel-landing-zone.test.ts` (15 controls + 7 agreement cases) | 007 acceptance; 013 non-vacuity; 012 distinguishing evidence |
| Legacy re-audit | `legacy-core-boundaries.test.ts` (`typescript` allowlist + sentinel fail-closed) | 007; 013 truthful attribution |
| Records | `docs/development/work/K1.0/{contract.md rev 2,ownership-inventory.md}` | 006 contract rule; 007 inventory scope |

Prior round-1 groups unchanged: target landing zone (`packages/kernel/...`), workspace registration
(`package.json`, `package-lock.json`), `002` structural note, `tests/conformance/k0` frozen
(byte-identical, verified in `01-tree-and-environment.log`).

### Selected 012 methods, and what was excluded

**Deterministic execution** remains dominant: every guard claim is mechanically decidable over
repository files, and each guard is driven through both a permitted and a forbidden input,
including the two review counterexamples through the identical scanner → resolver → graph →
violation path. **Process/documentation** carries C4, C5, C6, C8, now with bidirectional
policy/document agreement asserted in code rather than by reading alone. **Packaging/release**
is used only negatively, for C6.

Excluded with reasons (unchanged): **race and fault** — this packet commits no state and makes no
ordering, persistence or recovery claim; **native Runtime/Driver** — no Driver exists and R1 owns
fidelity; **external evidence/gate** — E1 is a prerequisite recorded here, not a gate this packet
executes. Bare `require("...")` calls remain an explicit static-guard limit (see *Unresolved
obligations*): in this ESM workspace `require` is not a global, so flagging every identifier named
`require` would trade the scanner's prose soundness for false positives.

### Obligation and interaction coverage

| Criterion | Distinguishing case actually run | Observed | Result |
|---|---|---|---|
| **C1** | Transitive walk from the zone entry over the real tree, following relative, package-root, package-subpath, re-exports and literal dynamic imports; non-literal dynamic import is a violation, not silence. | Zero violations; the graph is exactly `index.ts` and `unsupported.ts`. | **PASS** (implementer assessment) |
| **C2** | Fifteen fixture repositories through the same `loadWorkspace`/`walkModuleGraph`/`boundaryViolations` path: eleven forbidden forms (nine round-1 forms plus regex-after-paren K10-R1-01 and non-literal fail-closed K10-R1-01), two leaf-approval rejections, one attribution case, two accepts. | Each forbidden fixture yields exactly one violation naming that edge (non-literal yields the sentinel with its fail-closed reason); both accepts yield none. | **PASS** |
| **C2 (non-vacuity)** | The real graph asserted file-by-file with a traversed-edge requirement. | Two files, ≥1 internal edge; an absent or unreadable entry module would fail this, not pass it. | **PASS** |
| **C3** | Full suite, typecheck, the legacy export map, sorted-export-name digests for all five subpaths, and a repo-wide scan for importers of the zone. | 1846/1846 pass; typecheck clean; export map and all five digests unchanged; the only importer outside the zone is the guard that verifies it, named exactly. | **PASS** |
| **C4** | Seven agreement cases: zones forward + reverse (Zones table declares exactly the policy zones/roots), deferrals forward + reverse (deferred table declares exactly the policy DX rows), export ownership vs manifests with no undeclared package, cross-boundary file counts and workspace/third-party reaches recomputed with the same analyzer, allowed-leaf empty in both with reason. Inventory provenance now names the candidate tree (pre-existing rows reproducible at the base; target row candidate-only). | All seven pass; the recomputed reaches match the table exactly (target 2/nothing/nothing; legacy 143/—/nothing; runtime 16/four core specs/five third-party; host 4/three core specs/nothing). | **PASS** |
| **C5** | Twelve DX rows; every `currentPath` confirmed to exist; every owner matched against a packet id in 007; reverse check that the document declares no extra DX row. | All twelve assigned and resolvable; documented set equals policy set. | **PASS** |
| **C6** | The zone's whole source; its manifest; the diff. | Exports exactly the error and the refusal; the refusal throws and produces no value; manifest `private: true`; no legacy source moved; no E1 criterion claimed. | **PASS** |
| **C7** | The renamed guard diffed against its predecessor, assertion by assertion. | Thirteen assertions retained one-to-one; exactly two `assert` lines differ, in message strings only; three test titles and four constant names retitled; `specifiersIn` replaced by the shared TypeScript-parser scanner; two allowlist entries (`@arrokothi/kernel`, `typescript`) with reasons at the site, plus sentinel fail-closed handling; architecture cases 79 → 146, none removed. | **PASS** |
| **C8** | The contract's release-provenance table against the benchmark records. | Seven E1 identities recorded with their unaccepted status and an explicit no-E1-credit statement. Unchanged from round 1. | **PASS** |
| **C9** | 38 scanner cases: prose in five shapes, fifteen real import forms, ten parser shapes (regex-after-paren, division, import.meta, escaped quotes, nested templates, non-literal fail-closed ×2, no-substitution template literal), four real repository files, the pinned k0 fixture. Plus a repo-wide old-versus-new comparison. | No prose yields a specifier; every real form does; regex-after-paren still sees the following import; non-literal yields the sentinel; on pre-existing files the new scanner removes only prose phantoms and adds only genuine imports. | **PASS** |

**Interactions re-audited.** C1 is only as strong as C9, so detection is asserted positively and the
two K10-R1-01 bypasses are now controls, not prose. C2's controls and C1's real check share one
predicate and one walker. C4 and C5 are now actually checked in both directions for zones,
deferrals, exports and measured dependencies (the round-1 overstatement is closed by tests, and the
contract wording now describes what is verified). The `@arrokothi/kernel` + `typescript` allowlist
widening in the conformance-surface case is bounded by C3's reverse-quarantine case (single named
importer) and by the sentinel branch (no conformance source may hide a target behind a variable).

### Tests added, ported, removed

Round 2 adds 9 cases, removes none, skips none, weakens no threshold:

- `import-scanner.test.ts` 35 → 38: removed the obsolete `maskSource` order test (the heuristic no
  longer exists); added regex-after-paren (K10-R1-01), non-literal identifier fail-closed (K10-R1-01),
  template-with-substitution fail-closed, and no-substitution template literal.
- `kernel-landing-zone.test.ts` forbidden-edge controls 13 → 15: added the two K10-R1-01 full-path
  controls. Agreement cases 3 → 7: added zone-reverse, deferral-reverse, export-ownership and
  cross-boundary recomputation. Export-names test rewritten to literal imports (K1.0-SELF-03).
- `legacy-core-boundaries.test.ts`: no case added or removed; the conformance-surface case gains the
  `typescript` allowlist entry with its reason and the sentinel fail-closed branch (K1.0-SELF-04).

Suite 1837 → 1846 (0 fail, 0 skipped); conformance 1724 → 1733; architecture 137 → 146.
`tests/conformance/k0` remains byte-identical to the base, verified by
`git diff --name-only` in `01-tree-and-environment.log`.

### Compatibility, refusal and documentation impact

No public export changed. The target zone is `private`, unadvertised and refuses every surface it
does not implement. [`002`](../../002-implemented-kernel-baseline.md) needs no new note: its K1.0
structural note still describes the layout truthfully. `AGENTS.md` and `.agents/skills/` contain
no path claim this correction invalidates; both were rechecked. The only new runtime dependency of
the guard helpers is `typescript`, already a devDependency used by `scripts/check-builder-docs.ts`;
no new external package was added and `package-lock.json` is untouched by this round.

### Semantic correction closure

**K10-R1-01 — the import scanner can miss a real forbidden dependency.**

- *Invariant changed, authoritative source, original counterexample.* 007's "meaningful transitive
  import guards": dependency extraction for the target zone must be sound or fail closed for every
  source form the package can legally contain. The heuristic's division/regex rule did not treat a
  slash after `)` as a regex start, so `if (true) /["']/.test('x');` followed by a forbidden import
  masked that import (review probe: zero specifiers; reproduced here before the fix). Separately,
  `DYNAMIC_IMPORT` recognized only a direct literal slot, so `await import(target)` emitted no edge
  although K1.0 claims dynamic-import coverage.
- *Dependent paths walked.* Both consumers of the shared scanner: (1) `walkModuleGraph` +
  `boundaryViolations` (target forward guard, real graph, all fixture controls, reverse-quarantine
  scan); (2) the legacy `walkGraph`, the conformance-surface allowlist scan, the k0-fixture read,
  the four known-prose-site checks, and every file in the tree containing the prose shape. Also the
  K0.2-SELF-01 correction (prose must stay silent) and the K1.0-SELF-01 traversal rule (forbidden
  files stopped at, permitted leaves still traversed).
- *Correction.* The heuristic (`REGEX_PRECEDING_*`, `SLOT`, `maskSource`, `FROM_CLAUSE` etc.) is
  deleted. `importSpecifiersIn` parses with the TypeScript compiler: static/side-effect/type-only/
  re-export (including `export * as ns`), `import x = require("...")`, and dynamic `import(...)`
  (including no-substitution template literals) yield their literal; any other dynamic argument
  yields `NON_LITERAL_DYNAMIC_IMPORT`. `boundaryViolations` reports that sentinel with its own
  fail-closed reason. Bare `require("...")` stays out of scope by decision (see exclusions).
- *Re-audit and evidence.* The two review counterexamples now each yield exactly one forbidden
  violation through the real guard path (`09-r101-demonstration.log` plus the two committed
  controls). The scanner unit tests pin them at the extractor level. The repo-wide old-versus-new
  comparison (`08-scanner-comparison.log`: 325 files, 317 identical, 32 old-only, 1 new-only) shows
  the four pre-existing old-only entries are prose/data and the one new-only entry is a genuine
  `node:test` import the old regex had destroyed — no lost genuine import, so no pre-existing guard
  result changes except the intended fail-closed additions. Both consumers were re-audited: the
  re-audit found K1.0-SELF-03 and K1.0-SELF-04 below and fixed them in this same payload with
  separate provenance. Prior PASS is not claimed as immunity: the whole cumulative packet was
  re-reviewed (see *Prior findings* and *Additional self-found defects*).

**K10-R1-02 — false measurement provenance and overstated agreement proof.**

- *Invariant changed, authoritative source, original counterexample.* 007's inventory scope plus
  006/012's evidence rule: a required packet record must be reproducibly bound to the tree it names,
  and a claimed bidirectional check must actually distinguish drift. The inventory said its table was
  "Measured at base `c9a9ed7...`" while recording `target-kernel` as two `.ts` files, but
  `packages/kernel` does not exist at that base (`git ls-tree` empty; verified). The three agreement
  tests checked only policy→document substrings, not document-only rows, edge tables or exports,
  while the report claimed "both directions".
- *Dependent paths walked.* The inventory document, the executable policy (`ZONES`,
  `DEFERRED_EXTRACTIONS`, `TARGET_KERNEL_RULES`, manifests), the agreement tests, the contract C4
  wording and the round-1 report's C4 interpretation, plus the actual measured tree (file counts and
  reaches recomputed with the same analyzer for all four zones).
- *Correction.* The inventory now states the candidate tree as the measured identity (the payload
  commit named in this report), with the explicit distinction that pre-existing zone rows are
  reproducible at the base because K1.0 touches none of their files, while the target row exists only
  in the candidate. Agreement is now seven executable cases covering both directions for zones,
  deferrals, export ownership (manifests vs table, no undeclared package) and measured dependencies
  (parsed table vs recomputation, including relative-cross-boundary and sentinel checks). Contract C4
  and the C4↔C5 interaction now describe what is actually verified.
- *Re-audit and evidence.* The cross-boundary test recomputes file counts and workspace/third-party
  reaches for every zone and compares them to the parsed table (target 2/nothing/nothing; legacy
  143/—/nothing; runtime 16/four core specs/five third-party; host 4/three core specs/nothing) —
  exact match. Zone-reverse and deferral-reverse compare documented sets to policy sets for equality.
  Export-ownership compares manifests to the table with no undeclared package. No semantic owner
  decision was needed.

### Prior findings

- **K10-R1-01 (P1, review-01):** CLOSED in payload `960a446` as above. Evidence: `import-scanner.test.ts`
  K10-R1-01 cases, `kernel-landing-zone.test.ts` K10-R1-01 full-path controls,
  `validation-02/09-r101-demonstration.log`, `validation-02/08-scanner-comparison.log`.
- **K10-R1-02 (P2, review-01):** CLOSED in payload `960a446` as above. Evidence: `ownership-inventory.md`
  provenance paragraph, seven agreement cases, contract revision 2 C4 wording,
  cross-boundary recomputation in the test and in the probe summarized here.
- **K1.0-SELF-01 (fixed pre-review in `2ed8523`):** unchanged; its attribution control still passes
  and the traversal predicate is preserved by this round (permitted leaves still walked).
- **K1.0-SELF-02 (fixed pre-handoff in `811758e`):** unchanged as history; this round performs the
  same count reconciliation for its own additions (C2 13→15, C9 35→38, suite 1837→1846,
  conformance 1724→1733, architecture 137→146, builder-docs links 282→284) before handoff, so no new
  count drift is handed over.

### Additional self-found defects (separate provenance)

Found during the correction re-audit of both scanner consumers (not in review-01):

| Id | Defect | Disposition |
|---|---|---|
| **K1.0-SELF-03** | The guard's own export-names test used `await import(specifier)` with a loop variable. The new fail-closed scanner correctly reports this as `NON_LITERAL_DYNAMIC_IMPORT`, so the guard would flag its own test file under the strengthened conformance-surface rule. Found by running the new scanner over the tree during re-audit. | **Fixed** in `960a446`: the test now imports each of the five legacy surfaces by a literal specifier. No assertion changed; the pinned counts/digests are identical. |
| **K1.0-SELF-04** | The shared scanner now imports `typescript` (the parser), and reports the sentinel for non-literal dynamic imports. The `conformance tests use published package surfaces` case — which scans `tests/conformance` including the scanner itself — had no allowlist entry for the dev-only parser and no branch for the sentinel, so it failed on `architecture/module-graph.ts imports typescript` and would have hidden a future non-literal import as a generic surface violation. Found by running `npm run test:conformance` after the scanner swap. | **Fixed** in `960a446`: added `typescript` to the allowlist with its reason at the site, and added an explicit sentinel branch that reports `uses a non-literal dynamic import` rather than a package surface. No assertion subject weakened. |

No other in-scope defects were found in the cumulative re-review. In particular: the real target graph
is still exactly two files with one internal edge; the reverse-quarantine scan still names exactly the
one verifying importer; `tests/conformance/k0` is untouched; manifests and export digests are unchanged;
and the E1 preparation identities are unchanged.

### Unresolved obligations and their unblock conditions

1. **The k0 fixture's stale path reference.** `tests/conformance/k0/controls.test.ts:67` names
   `architecture/kernel-boundaries.test.ts` and explains a wording workaround that is no longer
   necessary. Its bytes are pinned by the benchmark's E1 fixture at `0535160e…`, so this packet does
   not edit them. The substance is closed by C9; the comment is stale. **Unblock:** an owner with
   authority over both the fixture and the benchmark pin; assigned to K1.4 in the contract's *Limits*.
   Unchanged from round 1.
2. **The allowed-leaf list is empty**, so the real tree never exercises a non-empty allowlist. Only
   fixture controls do. **Unblock:** K1.1, the first packet that needs a portable leaf. Unchanged.
3. **Static guarantees only.** These guards constrain dependency direction in source (static
   `import`/`export`/literal-or-fail-closed dynamic `import`, plus `import = require`). They establish
   nothing about durability, isolation, Driver fidelity or protocol correctness, and K1.0 claims none.
   Bare `require("...")` / `createRequire` indirection remains an explicit static-guard limit, not a
   verified prohibition. Unchanged in kind; narrowed from "lexer shapes" to the parser's documented
   form list.

## Validation and interpretation

Exact commands, environment, exit codes, counts and digests are in
[`validation-02/MANIFEST.md`](validation-02/MANIFEST.md). All ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree at C
`960a446b77bbd7d6973900eb23e10558c2584763`, on
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1846 tests, 280 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1733 tests, 261 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |

**Checks not run, and the resulting limit.** `npm run test:evals` was not run: this packet changes no
Agent behaviour and no model-facing path, and nothing in the diff is reachable from an eval. The
limit is that this candidate offers no evidence about Agent behaviour, and claims none. Unchanged.

**External fixture, gate and decision, stated separately.** The benchmark E1 fixture preparation was
**inspected in round 1, not re-executed here**, and is **accepted by nobody**. No E1 schedule was run
here, no E1 criterion is closed, and the structural pass earns no evidence credit. Owners and revisions
are pinned in the contract's release-provenance table (unchanged). Nothing in this repository grants the
benchmark a status and nothing there grants one here.

**Why the evidence supports each criterion** (implementer assessment, not acceptance). The guards are
mechanically decidable and each forbidden form — including the two review counterexamples — runs
against a planted fixture through the identical code path as the real check, so a green result
distinguishes a working rule from an absent one. The non-vacuity case fails on an empty or unreadable
graph rather than passing. The export digests would catch a rename that preserved a count. The scanner
is asserted in both directions with a parser (not a heuristic), which is what separates "reports no
prose" from "reports nothing" and what makes the regex-after-paren case decidable. The inventory is no
longer a substring check: zone/deferral sets must equal, manifests must match, and the dependency table
must equal a recomputation — so prose-only drift fails. The weakest link is stated in *Unresolved
obligations*: these are static guarantees about source, nothing more.

**Design choices.** Keep `packages/kernel` as a new directory (no rename of `packages/core`); keep the
allowed-leaf list empty; use fixture repositories through the real resolution path rather than an
in-memory double; parse with the already-present `typescript` devDependency rather than growing the
heuristic (no new external package, no license review beyond "none" below). The sentinel is a plain
string (not a new `Resolution` kind) so `resolveSpecifier` needs no change and the fail-closed reason
lives in exactly one predicate.

**Owner amendments.** One (from round 1, unchanged): the E1 dependency treatment quoted above,
recorded in the contract. No new amendment was needed for this correction.

**Strongest remaining risk.** Same as round 1: the guards constrain source-level dependency direction.
A future packet could satisfy every rule here and still write target Kernel code that reproduces the
legacy execution model in new files — structure does not prevent that, and K1.4's recheck against
actual behaviour is where it would surface. The new parser does not change that limit.

**Third-party review under AGENTS.md.** None. No dependency was added, no third-party source was
copied, adapted or vendored. `typescript` was already a devDependency (used by
`scripts/check-builder-docs.ts`); this round imports it from one more dev-only guard helper.
`package-lock.json` is untouched by this round. The inspected terms, reuse method and obligations are
therefore "no new reuse".

## Handoff

- **Ready for independent review.** All nine criteria have evidence; no known mandatory defect and no
  unresolved owned semantic case remains. The two round-1 findings are closed with correction closure
  above; two additional self-found defects were fixed in the same payload with separate provenance;
  three obligations are stated as unresolved with named unblock conditions, and none of them can pass
  merely because the suite is green.
- Base, C, H and the verified push SHA are supplied in the external owner handoff.
- No self-acceptance is claimed, nothing is merged, and no successor is started or released.
