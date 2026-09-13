# Implementation report — K1.0, round 1

## Identity

- **Packet:** K1.0 — target boundary and legacy quarantine. **Parent milestone:** K1.
  **Contract:** [`contract.md`](contract.md), revision 1.
- **Governing process baseline:** this repository's integrated `docs/development/` documents at the
  base commit — [006](../../006-development-process.md), [007](../../007-work-packets.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [013](../../013-structure-and-evidence-sequencing.md) — including the owner's 2026-09-13 revisions
  to 006, 008 and 009. This candidate changes none of them.
- **State:** PLANNED → IN_PROGRESS → WAITING_FOR_REVIEW. No verdict is entered here and none is claimed.
- **Owner release and its provenance.** Entering this session the ledger recorded `next_release: none`
  with K1.0 PLANNED and unreleased, so under [009](../../009-universal-prompts.md) the launcher alone
  was treated as insufficient and the hold was reported back to the owner. The owner then replied,
  in the same session on 2026-09-13, verbatim:

  > "Release ArrokothI K1.0.
  > Treat the Benchmark E1 dependency as the already-built but unaccepted fixture preparation."

  The first line is the release. The second is one owner amendment, resolving K1.0's second
  dependency against 007's general rule that dependencies be "independently ACCEPTED and integrated".
  Both are recorded in the contract's *Release provenance* section with the exact E1 identities relied
  on. No successor is released and none is started.
- **Prerequisite ACCEPT and integration identities.** K0.2 accepted at H16
  `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` by [review-17.md](../K0.2/review-17.md); integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)). The benchmark E1
  fixture preparation is **built and unaccepted**: branch `codex/e1-kernel-acceptance-capture`, payload
  `d8f17549c31f9ee5d995e773c2f211faed2785fb`, candidate `8de04779d279dba82cf834d419e465d2b677ef46`,
  status `BLOCKED_EXTERNAL`, not merged (benchmark `main` is `5a3f1ba525f68244701b1f73a1d29c4902ffe589`).
  Recorded, never claimed as a status in either direction.
- **Branch and configured remote:** `codex/k1.0-target-boundary-legacy-quarantine` on `origin`
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` — local `main` and `origin/main` both resolved
  here at branch creation, verified before any edit. The recorded base is that integrated commit, not
  a moving ref.
- **Payload C:** `811758ee1037c3862d1ebd2ec799fad5f6c3b57f`. Three payload commits, all pre-review:
  `0eb068d960df6ee944de6fbec9ab53950272c7db` (the packet), `2ed8523421bf4546134dc159ede080fafbfb065a`
  (K1.0-SELF-01, self-found), `811758ee1037c3862d1ebd2ec799fad5f6c3b57f` (contract reconciled with the
  delivered controls). All three are preserved rather than amended.
- **Previous reviewed H and its review record:** none. This is round 1.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, since a commit cannot name itself.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.0/implementation-01.md` (this report)
  - `docs/development/work/K1.0/validation-01/MANIFEST.md` and its nine `0*.log` attachments
  - the K1.0 status-row transcription in `docs/development/007-work-packets.md`, PLANNED →
    WAITING_FOR_REVIEW, plus the ledger's release paragraph
  - the matching live-summary sentences in `docs/development/README.md` and
    `docs/development/001-current-status-and-roadmap.md`

  Nothing else. No script, fixture, schema, test, threshold or configuration is in that interval.
- **Working-tree state:** clean at C when every command in `validation-01/` ran; recorded in
  `01-tree-and-environment.log`.
- **Push status:** pending at the time of writing. The verified advertised remote SHA is supplied in
  the external handoff after the push; this report certifies no future push.

## Changes and coverage

### Change groups and the full cumulative diff

`base..C` is 14 files, +1608/−26, with one rename detected.

| Group | Paths | Governing source |
|---|---|---|
| Target landing zone | `packages/kernel/{package.json,src/index.ts,src/unsupported.ts,tests/unsupported.test.ts}` | 007 K1.0 scope; 013 placement table |
| Executable boundary policy | `tests/conformance/architecture/boundary-policy.ts` | 007 acceptance; 013 |
| Import-graph analyzer | `tests/conformance/architecture/module-graph.ts` | 007 "meaningful transitive import guards" |
| Landing-zone guard and controls | `tests/conformance/architecture/kernel-landing-zone.test.ts` | 007 acceptance; 013 non-vacuity rule |
| Scanner fidelity | `tests/conformance/architecture/import-scanner.test.ts` | 012 distinguishing evidence; closes K0.2-SELF-01 |
| Legacy re-attribution | `kernel-boundaries.test.ts` → `legacy-core-boundaries.test.ts` | 013 "truthful legacy attribution" |
| Workspace registration | `package.json`, `package-lock.json` | the zone must be installed and its tests must run |
| Records | `docs/development/work/K1.0/{contract.md,ownership-inventory.md}`, `002-implemented-kernel-baseline.md` | 006 contract rule; 007 inventory scope |

### Selected 012 methods, and what was excluded

**Deterministic execution** is the dominant method: every claim here is mechanically decidable over
repository files, and each guard is driven through both a permitted and a forbidden input.
**Process/documentation** carries the record criteria (C4, C5, C6, C8), checked by policy/document
agreement asserted in code rather than by reading alone. **Packaging/release** is used only
negatively, for C6.

Excluded with reasons: **race and fault** — this packet commits no state and makes no ordering,
persistence or recovery claim; **native Runtime/Driver** — no Driver exists and R1 owns fidelity;
**external evidence/gate** — E1 is a prerequisite recorded here, not a gate this packet executes.

### Obligation and interaction coverage

| Criterion | Distinguishing case actually run | Observed | Result |
|---|---|---|---|
| **C1** | Transitive walk from the zone entry over the real tree, following relative, package-root, package-subpath, re-export and dynamic edges. | Zero violations; the graph is exactly `index.ts` and `unsupported.ts`. | **PASS** (implementer assessment) |
| **C2** | Thirteen fixture repositories through the same `loadWorkspace`/`walkModuleGraph`/`boundaryViolations` path: nine forbidden forms, two leaf-approval rejections, one attribution case, two accepts. | Each forbidden fixture yields exactly one violation naming that edge; both accepts yield none. | **PASS** |
| **C2 (non-vacuity)** | The real graph asserted file-by-file with a traversed-edge requirement. | Two files, ≥1 internal edge; an absent or unreadable entry module would fail this, not pass it. | **PASS** |
| **C3** | Full suite, typecheck, the legacy export map, sorted-export-name digests for all five subpaths, and a repo-wide scan for importers of the zone. | 1837/1837 pass; typecheck clean; export map and all five digests unchanged; the only importer outside the zone is the guard that verifies it, named exactly. | **PASS** |
| **C4** | Zone ids and roots asserted present in the inventory; the empty allowed-leaf list asserted in both with its reason. | Document and policy agree in both directions. | **PASS** |
| **C5** | Twelve DX rows; every `currentPath` confirmed to exist in the tree; every owner matched against a packet id that exists in 007. | All twelve assigned and resolvable. | **PASS** |
| **C6** | The zone's whole source; its manifest; the diff. | Exports exactly the error and the refusal; the refusal throws and produces no value; manifest `private: true`; no legacy source moved; no E1 criterion claimed. | **PASS** |
| **C7** | The renamed guard diffed against its predecessor, assertion by assertion. | Thirteen assertions retained one-to-one; exactly two `assert` lines differ, in message strings only; one allowlist entry added with its reason at the site; architecture cases 79 → 137, none removed. | **PASS** |
| **C8** | The contract's release-provenance table against the benchmark records. | Seven E1 identities recorded with their unaccepted status and an explicit no-E1-credit statement. | **PASS** |
| **C9** | 35 scanner cases: prose in five shapes, fifteen real import forms, six lexer shapes, four real repository files, the pinned k0 fixture. Plus a repo-wide old-versus-new comparison. | No prose yields a specifier; every real form does; on pre-existing files the new scanner is a strict subset of the old, with four prose removals and zero lost imports. | **PASS** |

**Interactions re-audited.** C1 is only as strong as C9, so detection is asserted positively rather
than only as quiet on prose. C2's controls and C1's real check share one predicate and one walker, so
a control cannot pass against a reimplementation of the rule. C4 and C5 are checked in both
directions. The `@arrokothi/kernel` allowlist widening in the conformance-surface case is bounded by
C3's reverse-quarantine case, which names the single permitted importer exactly.

### Tests added, ported, removed

62 cases added: 4 in `packages/kernel/tests`, 35 in `import-scanner.test.ts`, and 23 in
`kernel-landing-zone.test.ts` (13 forbidden-edge controls, 4 landing-zone cases, 3 quarantine cases,
3 policy/inventory agreement cases; two of the thirteen arrived with the K1.0-SELF-01 fix).
**None removed, none skipped, no threshold weakened.** The suite goes 1775 → 1837; the architecture
suite 79 → 137, with `legacy-core-boundaries.test.ts` holding the same 13 cases it had before. `tests/conformance/k0` is byte-identical to the base, verified by
`git diff --name-only` in `01-tree-and-environment.log`.

### Compatibility, refusal and documentation impact

No public export changed. The target zone is `private`, unadvertised and refuses every surface it
does not implement. [`002`](../../002-implemented-kernel-baseline.md) gains a dated structural note
rather than a rewrite, preserving its historical capture. `AGENTS.md` and `.agents/skills/` contain
no path claim this packet invalidates; both were checked.

### Semantic correction closure

No semantic correction to an accepted invariant occurred: this packet changes no Kernel semantics.
The one behavioural correction is the guard scanner, closed under 012 as follows.

**Invariant:** a boundary guard's input is the set of import edges in a source, which is a property
of the code, not of the text. **Authoritative source:** 007's "meaningful transitive import guards".
**Original counterexample:** K0.2-SELF-01 — prose ending in "from" before a quoted term read as a
bare import. **Dependent paths walked:** the scanner's two consumers (the legacy graph walk and the
conformance-surface scan), every file in the tree that contains the prose shape, the k0 fixture whose
wording was contorted to avoid the defect, and the new controls that could not otherwise be written.
**Correction:** a comment- and string-aware scanner with statement-anchored patterns, asserted in
both directions. **Re-audit:** the repo-wide comparison shows a strict subset on pre-existing files
with four prose removals and zero lost imports, so no pre-existing guard result changes; both
new-only specifiers are real imports the old scanner had destroyed.

### Prior findings

No open finding existed against K1.0 — this is round 1 and the packet had no prior candidate.
K0.2-SELF-01 was a self-found defect recorded in [K0.2's round-1 report](../K0.2/implementation-01.md)
and deliberately left open there for "a separate corrective packet". K1.0 owns the guards, so it is
closed here under C9 with the coverage K0.2 said the change would require.

### Additional self-found defects (separate provenance)

| Id | Defect | Disposition |
|---|---|---|
| **K1.0-SELF-01** | `walkModuleGraph` continued through files the policy forbids. One forbidden barrel import therefore reported a violation for every edge *inside* the package it reached, attributed to files outside the guarded zone. Found in the pre-handoff re-audit, before any review. | **Fixed** in `2ed8523421bf4546134dc159ede080fafbfb065a`. The walk takes a traversal predicate: forbidden files are recorded and stopped at; permitted files, including approved leaves, are still walked, so approving a leaf cannot silently approve its own imports. Demonstrated in `09-self-01-demonstration.log`: 4 violations before, 1 after. Two controls added. |
| **K1.0-SELF-02** | The contract's stated counts drifted from the delivered tree (eleven controls versus thirteen, 1835 versus 1837, 135 versus 137). | **Fixed** in `811758ee1037c3862d1ebd2ec799fad5f6c3b57f`, before handoff. |

### Unresolved obligations and their unblock conditions

1. **The k0 fixture's stale path reference.** `tests/conformance/k0/controls.test.ts:67` names
   `architecture/kernel-boundaries.test.ts` and explains a wording workaround that is no longer
   necessary. Its bytes are pinned by the benchmark's E1 fixture at `0535160e…`, so this packet does
   not edit them. The substance is closed by C9; the comment is stale. **Unblock:** an owner with
   authority over both the fixture and the benchmark pin; assigned to K1.4 in the contract's *Limits*.
2. **The allowed-leaf list is empty**, so the real tree never exercises a non-empty allowlist. Only a
   fixture control does. **Unblock:** K1.1, the first packet that needs a portable leaf.
3. **Static guarantees only.** These guards constrain dependency direction in source. They establish
   nothing about durability, isolation, Driver fidelity or protocol correctness, and K1.0 claims none.

## Validation and interpretation

Exact commands, environment, exit codes, counts and digests are in
[`validation-01/MANIFEST.md`](validation-01/MANIFEST.md). All ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree at C, on
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1837 tests, 280 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1724 tests, 261 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 282 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |

**Checks not run, and the resulting limit.** `npm run test:evals` was not run: this packet changes no
Agent behaviour and no model-facing path, and nothing in the diff is reachable from an eval. The
limit is that this candidate offers no evidence about Agent behaviour, and claims none.

**External fixture, gate and decision, stated separately.** The benchmark E1 fixture preparation was
**inspected, not executed**, and is **accepted by nobody**. No E1 schedule was run here, no E1
criterion is closed, and the structural pass earns no evidence credit. Owners and revisions are pinned
in the contract's release-provenance table. Nothing in this repository grants the benchmark a status
and nothing there grants one here.

**Why the evidence supports each criterion** (implementer assessment, not acceptance). The guards are
mechanically decidable and each runs against a planted counterexample through the identical code
path, so a green result distinguishes a working rule from an absent one. The non-vacuity case fails
on an empty or unreadable graph rather than passing. The export digests would catch a rename that
preserved a count. The scanner is asserted in both directions, which is what separates "reports no
prose" from "reports nothing". The weakest link is stated in *Unresolved obligations*: these are
static guarantees about source, nothing more.

**Design choices.** `packages/kernel` is a new directory rather than a rename, because renaming would
carry the existing Harness graph into the target name. The target zone approves no portable leaf, which
is stricter than 013's sketch and defers each extraction to the packet that needs it. Forbidden-edge
controls use temporary fixture repositories through the real resolution path rather than an in-memory
double, so manifest parsing and subpath resolution are exercised too.

**Owner amendments.** One: the E1 dependency treatment quoted above, recorded in the contract.

**Strongest remaining risk.** The guards constrain source-level dependency direction. A future packet
could satisfy every rule here and still write target Kernel code that reproduces the legacy execution
model in new files — structure does not prevent that, and K1.4's recheck against actual behaviour is
where it would surface.

**Third-party review under AGENTS.md.** None. No dependency was added, no third-party source was
copied, adapted or vendored, and `package-lock.json` changed only to register the new workspace link
(9 lines, no new external package).

## Handoff

- **Ready for independent review.** All nine criteria have evidence; no known mandatory defect and no
  unresolved owned semantic case remains. Two self-found defects were fixed before handoff with
  separate provenance; three obligations are stated as unresolved with named unblock conditions, and
  none of them can pass merely because the suite is green.
- Base, C, H and the verified push SHA are supplied in the external owner handoff.
- No self-acceptance is claimed, nothing is merged, and no successor is started or released.
