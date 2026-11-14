# Implementation report — K1.4, round 1

## Identity

- **Packet:** K1.4, the legacy bridge (K14-1 to K14-6; K14-G is K1.4-gate's). Records:
  - [release 01](release-01.md) (2026-11-03) and [brief 01](brief-01.md) with the owner's answers;
  - [design 01](design-01.md) and [owner choices 01](owner-choices-01.md) (Q1–Q8, the decision-02 amendment);
  - attack 01, a Prompt E adversary, at
    [`cffb2c81`](https://github.com/ArrokothI/arrokothi/blob/cffb2c81244f7f0955e9b20d30fac70e8a1e1e5d/docs/development/work/K1.4/attack-01.md);
  - design check 01, APPROVED WITH REQUIRED CHANGES, at
    [`5f18c44c`](https://github.com/ArrokothI/arrokothi/blob/5f18c44c6e086d68311862cc95f1417a9c1f17de/docs/development/work/K1.4/design-check-01.md);
  - [owner choices 02](owner-choices-02.md) ("Accept all", plus A–D) and [design 02](design-02.md), which disposes
    D01-CHK-01..14 and wins where it differs from design 01;
  - [owner choice 03](owner-choice-03.md) ("Approve"), which authorizes the six limited-origin extras.

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Prerequisites:** K1.3 and TOOLS-02 ranges 2–4 are accepted and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), from
  2026-11-05 to 2026-11-07. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and used no
  subagents. It is not the adversary, the design checker or the reviewer.
- **Branch:** `claude/k1.4`, in its own worktree.
  - Base B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`, main after PR #66. Main has not moved since.
  - Payload C: `0d05d32971dfeda89dc874450e38f440af2c4a1d`. It differs from
    `ad6ee1335fbf5c0ef7524fe56b16794f9263096a`, the payload of the first H, in three places only:
    - two `administrative_files` entries in the spec (below);
    - the spec's `preserve` entry for the whitespace-exception file at its own revision;
    - the trailing blank line removed from `bridge-inventory.test.ts`.

    The last two are candidate-check repairs (self-found defects, below). C sits on `9a992bdc` (the allowlist change
    alone, pushed and superseded before its CI run finished), which sits on H
    `81e625a513b4d1ace2c6f7ebddd0f74ebbf95a5d`, superseded by owner choice 03 before any review. So B..C also
    carries that H's draft of this report and its 007 and `progress.md` edits, which C..H rewrites.
  - No earlier review.
- **Candidate H:** the commit containing this report. C..H changes exactly the spec's administrative allowlist:
  this report, the 007 row, `progress.md`, [owner choice 03](owner-choice-03.md) and
  [its member list](owner-choice-03/limited-members.json). **The allowlist was extended for owner choice 03.** The
  candidate check reads `administrative_files` from the spec at C, so the two new record files were added there,
  in C, the way K1.1-correction-03 widened its allowlist before C. `packet_tools.py candidate` on C and a trial
  H with these five files reported `facts_verified`, with this exact file set and the one whitespace exception.

## Changes (B..C)

78 files, 8,303 insertions and 1,255 deletions; without the three superseded-H administrative files, 75 files,
8,032 insertions and 1,254 deletions. The one manifest change is `packages/sdk/package.json`
(`"private": true`, owner choice D; the workspace dependency `@arrokothi/kernel` 0.8.1) and its lock entry. No
third-party dependency changed. `packages/kernel/src` is byte-identical to B.

| Group | Files |
|---|---|
| **Range A, the bridge (K14-1, K14-2).** One `LegacyDriver` privately owns the 0.8.x `Harness` as a managed native job. Root creation inside a one-shot root-identity scope (`exe` prefix) in `start` (owner choice A). One native step per exchange. The positive human-wait predicate (D01-CHK-02). The lineage-termination rule with a sticky `ended` flag and a re-run cascade (D01-CHK-01). Pause-anchored deadlines in progress `{ v: 1, root, emissionCursor, pauses }` (D01-CHK-04). Emission order and the carry (EMIT-01). A control-scoped caller used only for `reportProtocolFailure` (D01-CHK-03). The lineage scheduler: one FIFO plus a lineage-filtered claim (D01-CHK-07) | `packages/sdk/src/legacy-bridge/{driver,classify,codec,lineage-scheduler,root-ids,harness-view}.ts` (new) |
| **Range A, the SDK switch.** The host loop owns the coordinator: candidate-set dispatch, timer pumping at every host entry, and the change signal (HOST-01). `createApplication` routes `start`, `input`, `resolveConfirmation`, `cancel`, `inspect`, `runUntilBlocked` and `runUntilIdle` through the Kernel. The deprecated `LegacyHarnessView` with Q2's refusals. Option dispositions (owner choice B) | `packages/sdk/src/{host,application,types,preflight,index}.ts` |
| **Range A, K14-3.** The `legacy-bridge` zone, `zoneOf` (longest prefix), `SDK_KERNEL_IMPORTERS`, the bridge rules with one rejected-edge fixture each, and the builder-docs Kernel admission with the private-manifest check (D01-CHK-12) | `tests/conformance/architecture/{boundary-policy.ts,legacy-bridge-boundaries.test.ts,kernel-landing-zone.test.ts,builder-docs-anchor.test.ts}`, `scripts/check-builder-docs.ts`, `docs/development/kernel-ownership.md` |
| **Range A, migration the switch forces.** SDK application tests, the four example tests and their sources (`settle.ts` becomes `settleOffline` over `runUntilBlocked`), and the restated `binding-surface.test.ts` assertions | `packages/sdk/tests/application.test.ts`, `examples/execution-kernel-minimal/*`, `packages/kernel/tests/binding-surface.test.ts` |
| **Range B, K14-5.** `toCanonicalBytes`, `ValueIssue` and `WrapperEnvironmentError`, exported through `wrapper.ts`. The L-01 check `checkSerializerEnvironment`, appended after the capture prefix and called in `createApplication`, in `toCanonicalBytes` and inside the serializer window just before the dependency call | `packages/sdk/src/{wrapper.ts,internal/value-capture.ts}`, the DEC-8 inventory and the KC3 metering helper kinds |
| **Range B, K14-4 and K14-6.** The feature inventory test; the conformance mapping, its test and the 11 X-row header notes | `packages/sdk/tests/bridge-inventory.test.ts`, `tests/conformance/legacy-mapping.json`, `tests/conformance/architecture/legacy-mapping.test.ts`, `tests/conformance/{execution,interaction}/*` |
| **Tests (bridge corpus).** `bridge-classify` (cells, scheduler, root scope), `bridge-flow`, `bridge-deadline-cancel`, `bridge-values`, `wrapper-environment` and `bridge-fixtures.ts` | `packages/sdk/tests/*` |
| **Docs, Layer 3, BASELINE, 017.** Quick start (Kernel-routed host actions, start options, a migration table), the new values page, five other guides, the SDK README, the builder skill and the example README. Integration (status line, acknowledgment), execution-cycle (host pumping), the reference index row. BASELINE header and §16. 017: L-01 narrowed, L-20 amended, L-29 to L-35 | `docs/guides/**`, `packages/sdk/README.md`, `.agents/skills/arrokothi-agent-builder/SKILL.md`, `mental-model/**`, `docs/development/{002,017}-*.md` |
| **Evidence fixtures.** The value-cost source inventory (eight new production files). The adoption manifest: 188 hold-register keys rekeyed through the line mapping, a new `not_held` V-ENV reading, 18 target declarations moved, six `authorized_replacement` targets with `extras` in limited origin `artifact-9fd619f5375d598ebb2b88aa`, and the preserved table regenerated twice in a fresh clone. The packet's `verification.json` | `tests/fixtures/packet-tools/{adoption,value-cost-source-files}.json`, `docs/development/work/K1.4/verification.json` |

## Criteria (implementer assessment, not acceptance)

| ID | Closure and evidence |
|---|---|
| K14-1 | Every public start/run/input/confirmation/cancel path reaches the Kernel through `host.ts` and `application.ts`, whose only Kernel calls are coordinator entries. Only `legacy-bridge/driver.ts` constructs a `Harness` (rule K14-3-HARNESS, with a rejected `new Harness` control). Deterministic through `createApplication` on a manual clock: B-CONTINUE (`activation_limit`, Kernel `READY`), B-WAKE and B-INPUT (`await` on input, exact retry), B-DEADLINE-WAIT and B-DEADLINE-EXEC, B-TERM and B-FAIL, B-CANCEL, and B-STALL (one parked lineage; another Execution completes). |
| K14-2 | Structural: legacy-core ↛ Kernel and ↛ bridge, and the bridge reaches only `@arrokothi/kernel`'s root (K14-3 rules, rejected edges for relative, type-only and barrel imports). The Driver's only route to a Kernel wait is `submitOutcome`'s `next`. Deterministic: B-QUIESCE-CELLS walks the declared product (lifecycle × wait × pending operation × resumption, for one member and for a parent waiting on a call child). B-RES: a pending native resumption keeps E `RUNNING` with no Kernel wait and resumes once. B-NATIVE-TIMERS pins the predicate's soundness premise. |
| K14-3 | `boundary-policy.ts` and `kernel-ownership.md` agree through the existing oracle. `legacy-bridge-boundaries.test.ts` has one rejected edge per rule. The quarantine names exactly `SDK_KERNEL_IMPORTERS` plus the existing verifiers, and `check:builder-docs` admits the Kernel from that list only, with a fixture showing an example refused. A one-zone-per-file control backs `zoneOf`. |
| K14-4 | `bridge-inventory.test.ts`: 52 rows, one test each, through `createApplication`. Refusal rows assert the named error and no Kernel or native record. Two closure tests: a TypeScript enumeration of the exports and every SDK-declared member (with `runtime.*`, `memory.*` and `input.*`), the 35 Harness methods, and a documentation extraction (E1–E4) over the 18 reachable guide pages, the SDK README, the builder skill and the examples. A synthetic-page control shows the extraction reporting unknown members, exports and example files. Migrations are documented in the quick start's migration table. |
| K14-5 | The export is in the public key list (`binding-surface.test.ts`) and documented on the values page. B-WRAPPER (`wrapper-environment.test.ts`, fresh processes): a lexical shadow of each of the eight identifiers before and after SDK load, a replaced global property, a harmless shadow that passes, and a shadow installed by a capture-time side effect (that call refused, later calls throw). Ablating the in-window call fails the capture-time case. The prefix pin is B's hash once exactly the L-01 call and the widened import are removed. |
| K14-6 | `legacy-mapping.json` covers the declared set of 164 files (79 R, 38 U, 12 S, 11 X, 7 P, 7 N, 6 G, 4 M). Its test lists the set at runtime and fails on a missing or extra file, a P row without an existing bridge test, an X row without an existing owner or header note, or a missing inventory row. |

**Owner choices 02:**
- A (option a): `start` creates the native root synchronously after Kernel acceptance. A native creation error
  cancels E and throws `ApplicationStartError`. A replay returns E without native work. Covered by
  B-START-INSPECT, B-START-REPLAY, B-ROOT-EXISTS and B-CANCEL-PREROOT.
- B: the breaking changes as listed; `runtime.maxActivationsPerRun` is PD (`option_ignored`); N rows read
  "preserved on `@arrokothi/core`, not routed through the Kernel". Inventory rows S-RT-MAXRUN, G-PEER and
  G-CORE-DIRECT.
- C: the 017 entries are added (§4 of design 02).
- D: `"private": true`, guarded by `check:builder-docs`.

**Corpus.** Every item of design 02 §3 is a maintained test, and all but four are named by their IDs in
`packages/sdk/tests` (checked mechanically against `test`/`describe` names).

> **Correction, 2026-11-08 (round 2, after [review 01](https://github.com/ArrokothI/arrokothi/blob/0f415d6e016824ea9bddac0ca7aca3fd2d3accb5/docs/development/work/K1.4/review-01.md)
> K14-R1-05).** This claim was false for B-FAIL-CASCADE. The mechanical check matched test names only, and
> the closure rested on every Driver-originated exit routing through the shared `finish`/`cascadeDescendants`
> helpers. B-FAIL-CASCADE's named tests ran two exits only: a native-store failure on a root with no
> descendant, and a wait-deadline expiry with one called child. They did not run each Driver-originated
> `fail`, or a root `COMPLETED` with a live descendant, as design 02 §3 required. Round 2 adds the trigger
> table B-TERM-TRIGGERS (T1–T12) and the per-site ablation B-TERM-ABLATION; see
> [implementation report 02](implementation-02.md). The remainder of this report is unchanged.

The four:
- B-START-CANCEL-RUN is a named case inside the B-CANCEL-PREROOT test;
- B-SURFACE is the two restated tests of `packages/kernel/tests/binding-surface.test.ts` (its M row in the mapping);
- the builder-docs and zone controls are in `tests/conformance/architecture`;
- the growth probe is the L-35 observation, as design 02 states, not a pass/fail test.

**017:** L-01 narrowed to "genuine intrinsics at SDK module load"; L-20 gains the legacy dispatch-before-cancel
fact; L-29 (acknowledgment), L-30 (no takeover), L-31 (`await` only at quiescence), L-32 (deprecated reads), L-33
(over-limit native values), L-34 (`services` side doors) and L-35 (per-exchange Kernel cost growth).

## Deviations from the design notes

- The K14-6 test is `tests/conformance/architecture/legacy-mapping.test.ts`, not `tests/conformance/mapping.test.ts`:
  `npm test` runs only `tests/conformance/*/*.test.ts`.
- The wrapper is exported through `packages/sdk/src/wrapper.ts`: `capture-stop.test.ts` forbids `index.ts` from
  naming the capture module.
- Two design 01 bridge IDs never became test names. B-MAP's cases are B-QUIESCE-CELLS since D01-CHK-02 replaced
  design 01 §3's table with the predicate, and B-CONV is B-WAKE. The mapping records both.
- The L-01 check is appended after the capture prefix rather than inlined, so the BINDING-01 prefix differs from B
  only by one call and one import line.

## Adoption and evidence migration

The TOOLS-02 tools only, in a fresh clone; no owner question was needed beyond the record below.
- **Rekeys:** K1.4's edits shift `kernel-landing-zone.test.ts`, so 188 hold-register keys and 18 suite-target
  declarations follow a B→C line mapping. No classification changed.
- **New reading:** the child-process control added to `builder-docs-anchor.test.ts` is a `not_held` V-ENV entry
  with a per-entry reading, by the route TOOLS-02 range 4 used for that file.
- **Unread to refused:** six landing-zone tests whose bodies K1.4 changed move to refused under both pins (12
  members). Unread members carried no credit (L-17), so no credit is lost; their 12 `unread_witness` records and
  links are removed.
- **Limited origin:** the six `deedd7950724` members are in `artifact-9fd619f5375d598ebb2b88aa`, a limited origin
  (TOOLS-01 owner choices 04 and 11). Each gets an `authorized_replacement` target on its current test, passing P1-T
  apart from the unread register entry, and an `extras` entry, as earlier packets did for row changes. [Owner
  choice 03](owner-choice-03.md) authorizes the six targets and extras as a consequence of owner choices 02 D (SDK
  private), with no adoption credit, and pins the six members in
  [owner-choice-03/limited-members.json](owner-choice-03/limited-members.json) (R1-03 format). The manifest does
  not cite that list under `limited.added`, because a listed member cannot also be an extra.
- **Range B:** the preserved table was regenerated again (418 members' read data; status counts unchanged).

**Defects I found and fixed, all in evidence or tests, none in production behaviour:**
- The first range-A C omitted the seven new SDK modules from the value-cost source inventory. CI run
  `42334517878` failed only `value-cost-mutants` (238 `invalid_baseline`); fixed in `1fab5549`.
- Range B's inventory test first imported `zone-analysis.ts`, which put it on the Kernel quarantine list. It now
  builds its own TypeScript program.
- Self-review after CI run `42361468266`: G-MEMORY's `memory.executions` assertion was vacuous, and S-RT-NATIVE
  named `activationBudget` and `securityProfile` without passing them. Both now exercise what they cover. The
  values page overstated what throws after a capture-time shadow. Fixed in `ad6ee133`.
- A trial run of `packet_tools.py candidate`, for owner choice 03, showed that it refused every H over earlier
  Cs, including the first H `81e625a5`. Packet verify does not run that check, so CI never saw it. There were two
  causes. First, the spec copied K1.3's whitespace exception for `K1.3/review-01/coverage-comparison.log` at
  `72e6f5ec` but pinned only the K1.3 directory at B, and the check needs the exact (revision, path) pair. Second,
  `bridge-inventory.test.ts` ended in a blank line (`git diff --check`). C adds the pair, as K1.3's spec has it
  (the file is unchanged from `72e6f5ec` to B), and removes the blank line. Both fixes are in C `0d05d329`.

No assertion, expected result, kill requirement or mutant fault was relaxed.

## Validation

**Packet verify CI at C** with spec `docs/development/work/K1.4/verification.json`: run
[`42405868481`](https://github.com/ArrokothI/arrokothi/actions/runs/42405868481) at C
`0d05d32971dfeda89dc874450e38f440af2c4a1d`: 2026-11-07, 19:22–21:08 UTC: `checks_passed`,
19/19, exit 0, Node v26.10.0, Linux x86_64. Repository tests 4,897/4,897; archive tests 4/4; example tests 18/18;
tool tests 777; typecheck; adoption `mappings_complete`; inventory `provenance_verified`; dimensions
`coverage_reported`; registered, refusal and value-cost mutants `selected_cases_passed`; refusal and oracle
censuses; Kernel sweeps; race search; value-cost dimensions and continuations; builder docs; area gate `reported`.

**Earlier runs:**
- [`42391948564`](https://github.com/ArrokothI/arrokothi/actions/runs/42391948564) at `ad6ee133` (C's production,
  tests and fixtures; the spec without the two owner-choice entries), 2026-11-07, 16:34–18:21 UTC: `checks_passed`,
  19/19, Node v26.10.0, Linux x86_64. Repository tests 4,897/4,897; archive tests 4/4; example tests 18/18; tool
  tests 777; typecheck; adoption `mappings_complete`; inventory `provenance_verified`; dimensions
  `coverage_reported`; registered, refusal and value-cost mutants `selected_cases_passed`; refusal and oracle
  censuses; Kernel sweeps; race search; value-cost dimensions and continuations; builder docs; area gate `reported`.
- `42405639257` at `9a992bdc` was cancelled when the candidate-check repairs made a new C; it has no result.
- `42405606091` was dispatched by mistake at the superseded H `81e625a5` and cancelled within a minute; it has no
  result.
- `42361468266` at `8c513dfa` (ranges A and B before the self-review fixes): `checks_passed`, 19/19, exit 0, Node
  v26.10.0, Linux x86_64. Repository tests 4,897/4,897; example tests 18/18; tool tests 777; adoption
  `mappings_complete`; inventory `provenance_verified`; all three mutation registries `selected_cases_passed`;
  sweeps, race search, value-cost dimensions and continuations, builder docs and the area gate passed.
  `ad6ee133` differs from `8c513dfa` only in `bridge-inventory.test.ts` (two rows) and one sentence of the values page.
- `42347496157` at `1fab5549` (range A): `checks_passed`, 19/19.
- `42334517878` at `1e0f04ff`: failed only `value-cost-mutants`, as above.

**Fresh-clone checks** (`git clone`, checkout, `npm install`, Node v26.10.0): at `5715a32f`, `corpus`
`mappings_complete`, `inventory` `provenance_verified`, `coverage` `coverage_reported`, value-cost `cases`
`selected_cases_passed`, tool tests 777 OK, example tests 18/18. At `ad6ee133` (the same fixtures as C),
`regenerate` `table_current`.
Locally: `npm run typecheck` exit 0; `npm test` 4,897/4,897 (B: 4,766); `check:builder-docs` passed.

**Not run:** the `live-provider` and `large-memory-timing` profiles (the verification spec's owner choice 01), and
K14-G, which is K1.4-gate's.

**Strongest remaining risk.** The human-wait predicate is sound only while the stock controllers have no native
timer (B-NATIVE-TIMERS) and only over the declared cell product; a custom controller or a new native wait kind
falls outside it. A pause behind never-settling sibling work is surfaced only by `executionDeadline` (L-31). The
Kernel does not mediate native tools, children, user input or memory (brief decision 2A).

**Third-party material:** none added. `canonicalize@3.0.0` keeps its recorded approval; `node:async_hooks` is a
builtin. No source was copied or adapted.

## Handoff

Ready for independent review of H over C `0d05d32971dfeda89dc874450e38f440af2c4a1d` and B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`; CI run `42405868481` at C reports `checks_passed`. The pushed H SHA is
supplied externally. There is no self-acceptance; no hold is lifted and no successor is released.
