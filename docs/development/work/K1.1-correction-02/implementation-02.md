# Implementation report — K1.1-correction-02, round 2

## Identity

- Packet: K1.1-correction-02. [Contract](contract.md) at C (KC2-1 restated, below); governing process
  baseline unchanged: `70467f4cf76896529486499db24fcaa953292491`.
- State: WAITING_FOR_REVIEW. Correction of the same released packet after
  [review 01](review-01.md) (Codex, GPT-6, 2026-09-23), which reviewed H
  `e1c751b87ee0e16af1280aefcf485fceeb409664` and returned CHANGES REQUIRED with finding KC2-R1-01.
- Author: Claude Code session (Claude Opus 5.5), 2026-09-23, at the owner's instruction.
- Branch `claude/pre-k1.2-reviews`. Review record transcribed in administrative commit
  `6f2d51de81c802d6a9967a721be602d15115727c` (review files and status rows only).
- C = `12bb29cda27369b9d0e91313d4e192c692ec886b`. Correction delta: `git diff e1c751b 12bb29c --
  packages/kernel docs/development/002-implemented-kernel-baseline.md
  docs/development/work/K1.1-correction-02/contract.md`. Cumulative code diff:
  `git diff 227cd05373f5c5f2d4dbb3e8a6d9ff3cd6c23b3f 12bb29c -- packages/kernel/`. The branch also
  carries PLAN-01's correction (`fabc641`), which is not this packet.
- Candidate H: the commit containing this report, supplied in the owner handoff. C..H allowlist: this
  report, `validation-02/*.txt` and this packet's status row in 007.

## Finding disposition

**KC2-R1-01 (P1) — fixed.** The reviewer's counterexamples all reproduce on the reviewed code and are
bounded on C:

| Case | Reviewed H `e1c751b` | C `12bb29c` |
|---|---|---|
| 33,554,432-character string | 67,108,864 character reads | 65,536 |
| 8,388,608-character string | not remeasured; the reviewer observed 16,777,216 | 65,536 |
| 1,048,576-character string | not remeasured; the reviewer observed 2,097,152 | 65,536 |
| Same, as a member name | 67,108,864 | ≤ 131,074 (test bound) |
| 4,096 shared occurrences of the 33,554,432-character string | 67,124,138 | ≤ 131,074 (test bound) |
| Object of 550,000 names, counting descriptor reads | 550,000 | 4,097 |
| Array proxy listing 1,000,001 names | 1,000,000 index-descriptor reads | < 10 (test bound) |

The H column comes from the ablation (`validation-02/ablation.txt`: the new tests run against
`git show e1c751b:packages/kernel/src/values.ts`) and the reviewer's own table. The C column comes from
`validation-02/measure-after.txt` (the reviewer's wrapper method, as a probe script) and the new tests.

## Changes and coverage

- **One bounded string pass.** `scanBoundaryString` replaces `isWellFormed`, `scalarValueCount` and
  `canonicalStringBytes`, which were three full scans run before any charge. It answers all three
  questions in one pass and stops at an unpaired surrogate or at the 65,537th scalar value, reading at
  most `2 * (stringScalarValues + 1)` code units; accepting a string at the limit costs the same.
  String values and member names both use it. A refused string is still charged its full `.length`:
  that is free to read and never less than the reading done, and it keeps the existing
  repeated-occurrence test's bound.
- **Object listings.** At most `containerEntries + 1` descriptors are read. By then an object is
  certainly refused, and a reason is already recorded: more than `containerEntries` enumerable members,
  or a non-enumerable or unowned name. The `enumerable` list is bounded with it. Exactly one over the
  limit still reads every name and reports the same reason as before (tested).
- **Array listings.** A listing longer than `containerEntries + 1` names is refused as one aggregate
  `unrepresentable_member`, without per-name classification. Shorter listings keep every earlier
  per-name diagnostic. `isArrayIndex` checks length before reading characters.
- **Kept outside the bound.** The engine's own-key enumeration (`getOwnPropertyNames`,
  `getOwnPropertySymbols`) is the one step proportional to a container's size that Kernel code cannot
  shorten, as the review distinguishes. Time spent inside caller traps is the caller's.
- **Reported reasons.** Two observable changes, both still refusals with the same codes the existing
  tests pin. An over-long string is reported as "more than 65,536 Unicode scalar values" rather than by
  its exact count. An unpaired surrogate beyond that point is no longer reported, because reading stops
  first. An array over the listing bound gets one aggregate reason instead of one per name.
- **Tests.** Five new tests under "refusing a value costs no more than the size limit allows": oversized
  string, oversized member name, shared oversized and shared long strings, oversized object listing
  (single, 64 shared occurrences, and exactly one over), and an overlong array listing. The shared
  child-process helper gains an optional prelude so a counting wrapper can be installed before the
  module loads, as in the reviewer's reproduction. No existing assertion changed.
- **Records.** KC2-1 now states the within-one-visit bound and lists the new tests; the 002 baseline
  sentence says the same. Decision 01 is unchanged: V-D1 always required this bound.

**Semantic correction closure (012).** Changed invariant: work to refuse a value is bounded by the
limits within each visit, not only across visits. The facts in play:

- **Where they are created.** `capture`'s string and container branches.
- **Consumers.** Every root goes through `canonicalize` → `capture`: creation input, ingress payload,
  authority context, and identity text via `acceptIdentityText` in `coordinator.ts`. `packIdentity`
  only receives accepted text of at most 65,536 scalar values. K1.2's Outcome roots will use the same
  entry.
- **Other code that scans strings.** `inheritedIndexShadows` also calls `isArrayIndex`, but over host
  prototypes, not caller data; the length check helps it too. The serializer runs only on accepted
  snapshots.
- **Not reached.** The wire decoder does not exist.
- **Checks.** Exact byte accounting is re-checked by the unchanged exactness test (at the limit, and
  one byte over), and all earlier tests pass unchanged.
- **How the earlier pass missed it.** Round 1 bounded how often a member is re-read and measured cost
  only through repeated visits, so it never examined the work inside one visit.

Selected 012 methods: deterministic execution with an ablation, as in round 1.

## Validation and interpretation

Environment: macOS 26.6.2, Node v25.2.1, npm 11.6.2. Suites ran on the tree whose code equals C; the
builder check ran at C.

| Command | Result | Attachment (SHA-256) |
|---|---|---|
| `npm run typecheck` | exit 0 | `typecheck.txt` `a2051020811e29fd9b6835fc0916e232da583bb86b9bbfc4f0f9c28df44084be` |
| `node --test --experimental-strip-types packages/kernel/tests/*.test.ts` | exit 0; 274 tests (269 + 5), 0 fail/cancelled/skipped | `kernel.txt` `8423e3b4a7694fa28f5fde43ee5ef2aedc3bf6fad89f3a5d0cd9e14c3d8d4a31` |
| `npm test` | exit 0; 2,328 tests / 356 suites, 0 fail/cancelled/skipped | `full.txt` `e4f9f8711df379a4ad7543f4a05db994eb0771b5b14421fb82b0d0cb1e6b3b6b` |
| `npm run check:builder-docs` at C | exit 0; 72 Markdown files, 1,718 links/anchors, 38 imports | `builder.txt` `938217e0eb868e859f909d59f651b7ebc602654b3ee96e1dcbc3445af8cdbf93` |
| Ablation: the cost tests against H's `values.ts` in a detached worktree | exit 1; the 5 earlier tests pass, the 5 new ones fail on their read-count assertions | `ablation.txt` `9561d6e3f13142d41c6b927afaba9880829845baa42405ebd286ec9be4334092` |
| Read-count probe at C (`node --experimental-strip-types measure.mjs`; source attached as `measure-probe.txt`) | 65,536 reads per oversized string; 4,097 descriptor reads for 550,000 names | `measure-after.txt` `7cb73ff07e48da40793b77b83de876360aa1f9f09491f8cdefd0d6abbe7bd8e3`; `measure-probe.txt` `548056a7054b9b0db48273757e6d390451b62d84cee3543cd067929b1d26a16c` |

The first ablation run of the array test failed for an unrelated reason. The unbounded code reports one
issue per listed name, and printing them overflowed the child-process output buffer. The probe now
prints only the first codes and checks the read count before the reason code, so it fails on the
defect itself. The attached ablation is the rerun.

Not run: Node 22, wire decoding, benchmarks. Implementer assessment, not acceptance: KC2-1–KC2-6 are
met. Strongest remaining risk: another caller-proportional step I have not found. The inventory above
covers every loop over caller data in `capture` and its helpers. The remaining proportional work is
engine enumeration, which the review places outside Kernel control.

Third-party review: none.

## Handoff

Ready for independent review of the cumulative packet. No self-acceptance; K1.2 stays held.
