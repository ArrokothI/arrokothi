# Implementation report — TOOLS-02, round 1 (range 1: T2-1, T2-2)

## Identity

- **Packet:** TOOLS-02, remaining corpus extraction, scope B. [Brief 01](brief-01.md) is the contract, as amended by
  [owner choice 01](owner-choice-01.md). The governing process baseline is [006](../../006-development-process.md) at B.
- **This round covers range 1 only:** T2-1 and T2-2. Owner choice 01 gives range 1 its own narrow review and early
  integration on main. T2-3, T2-4 and T2-5 are not part of this candidate.
- **State:** WAITING_FOR_REVIEW for range 1. The packet stays IN_PROGRESS for ranges 2–4.
  - Owner release: [release 01](release-01.md), 2026-10-23.
  - Prerequisites: none beyond the release (PR #58 merged it into B).
  - Design: [design 01](design-01.md) and [design 02](design-02.md), a delta on design 01.
  - Design checks: [design check 01](design-check-01.md) returned REDESIGN.
    [Design check 02](design-check-02.md) closed D01-CHK-02, -03, -04 and -06, and required the D02-CHK-01
    completion that this build implements.
- **Branch:** `claude/tools-02` on `origin`.
  - B `b5daf35aeee37305c1ee41bb626c97d26db94ab2`.
  - Payload C `a6ce515018c2bd59a930b20c762a339089bb0973`.
  - No earlier review.
- **Candidate H:** the commit containing this report.
- **C..H administrative allowlist** (as in [verification.json](verification.json)):
  `docs/development/007-work-packets.md`, this report, `progress.md`.
- **Working tree:** clean. The push is verified in the external handoff.

## Changes and coverage

| Group | Files |
|---|---|
| T2-1 walk form | `scripts/packet_tools.py`: `fixture_read`, `read_form`, `read_identity`, `listed_directories`, `is_directory`; `preserved_census` traces carry `walks` |
| T2-2 clean checkout | `scripts/packet_tools.py`: `pristine`, `UNCLEAN`, `GUARDED_OPERATIONS` and the dispatch guard; guards in `preserved_census`, `corpus_format_2` and `regenerate`; `requalify-value-cost.py` and `value-cost-loss-ledger.py` guards |
| Regeneration | `regenerate` (check, or `--write` the preserved table only), `manifest_text`; `adoption.json`'s preserved table regenerated in the walk form |
| Controls | `test_read_form.py` (12), `test_pristine_routes.py` (8), `test_writer_census.py` (3), `test_target_tools.ProbeAnchorTests` (1) |
| Registries | `refusal-guards.json` (7 guard ablations), `mutations.json` (6 `weaken-read-form` cases), `coverage.json` (their failure values), `check-refusal-registry.py` (scans the two evidence scripts too), `python-probe.py` (anchor rule as a function, unchanged) |
| Docs | `tests/tooling/README.md` (regenerate, clean checkout, read classes, probe anchors), [verification.json](verification.json) |

No product file changes. `packages/`, `examples/`, the other packet directories and `.github/` are on
verification.json's preserve list at B.

**T2-1 (owner choice 01, option A; design 02 §1 with D02-CHK-01's completion).** Every compared `(path, kind)` read falls
in exactly one class:
- **walk-root listing:** a listing with no listed proper ancestor;
- **enumerated:** a read beneath a listed directory, classed under its outermost listed ancestor;
- **named:** everything else.

The record digest covers:
- the identity at C of every named read;
- the identity at C of every fixture read, enumerated or walk-root listing;
- the sorted walk roots.

Non-fixture walk-root listings and enumerated non-fixture reads are recorded by their root only. A fixture read is a
non-source file under `tests`, or a listing under a `fixtures` directory. A directory existence read follows the listing
rule, using the path's kind at C, or at the pin when it is absent at C.

Duplicate membership is per `(path, kind)`, not per path. One path may be a named read through one kind and a walk
root through its listing. An enumerated fixture read is recorded under fixtures and adds its root to the walks.

**D02-CHK-01 controls** (`test_read_form.py`). Unit tests over two traces:
- duplicate membership;
- the directory-existence rule;
- unrelated additions;
- each named read and each enumerated fixture edited twice;
- an enumerated non-fixture edit;
- a fixture walk-root listing whose entries change twice.

End-to-end censuses over three members (a recursive scanner, a direct `tests/fixtures` lister and a named-fixture reader):
- an unrelated test in an existing directory and in a new directory leaves `revalidation_complete`;
- the direct fixture listing changes with each of two entry changes;
- named and fixture reads edited twice;
- an enumerated source edit leaves the table valid.

With the old digest restored, the unrelated-addition census fails both subtests.

**T2-2 (design 02 §2; D02-CHK-03).** `pristine` holds when:
- HEAD is the revision;
- nothing is modified;
- no untracked, ignored or git-invisible entry exists, except `node_modules` and `.DS_Store`.

Where the guards sit:
- the CLI dispatch, for `inventory`, `mutations`, `cases`, `corpus`, `coverage` and `regenerate`;
- inside the callable census routes, `preserved_census` and `corpus_format_2`;
- inside `regenerate`, which also refuses a manifest not already in canonical form;
- in `requalify-value-cost.py` and `value-cost-loss-ledger.py`.

`candidate` and `gate` stay unguarded; they write no fixture. Each guard is its own `require`, and each has a
registered ablation (`refusal-guards.json`, run by `python-probe.py`). The ablations cover inner guards behind a guarded
outer route, because each ablation test calls its route directly. `check-refusal-registry.py` now scans the two
evidence scripts, so the requalification guard is in the census (329 checks, 329 registered).

`test_pristine_routes.py` refuses an untracked, an ignored and a git-invisible entry on each route.
`test_writer_census.py` classes every write call in the bounded vocabulary:
- 3 fixture writers, each holding a guard;
- 13 scratch writers.

- **Selected 012 methods:** mutation of each record-form rule (6 cases, all killed) and an ablation of each new guard
  (7 cases, all killed); deterministic positive and negative controls; and the design 02 §1.3 self-check below.
- **Design 02 §1.3 self-check** (regeneration at C1, fresh clone):
  - `by_status` unchanged: held 1,013, refused 228, preserved 30, superseded 1.
  - No status change and no non-fixture reason change.
  - 21 rows (`ambient-reads`, `control-commits`) lose fixture reasons for the directories `tests/tooling` and
    `tests/tooling/node-floor`. Those were the directory-existence false positives D01-CHK-02 named.
  - `repository_read_changed` differs in 504 rows; every other field is identical.
  - At C, `regenerate` reports `table_current` with no member changed.
- **Legacy retired:** the whole-path read digest of preserved members. `regenerate` is now the one writer of the
  preserved table.
- **Accepted design found unfit:** none in range 1. D01-CHK-01's objection to T2-1's original wording was settled by
  owner choice 01's amendment.
- **Prior findings:** D02-CHK-01 is completed as above. D02-CHK-02's directory-existence rule is
  `test_a_directory_existence_read_follows_the_listing_rule` and mutant `result.fixture-read.directory`. D02-CHK-03's
  guard-ablation and registry-scan obligations are met as above. D02-CHK-04 and -06 belong to ranges 2 and 4.
  D02-CHK-05 is settled by owner choice 02 for range 3.
- **Self-found defect (implementer provenance):** C1 `c8074099` was never pushed. In its fresh-clone mutations
  registry, three of the six new read-form mutants returned `setup_error`. `python-probe.py` traces reach at the
  mutant's `after` text when its `before` is gone, and those replacements were empty, a plain `pass`, or a line used
  elsewhere. Nothing checked this before a 13-minute registry run. Fixed in C:
  - the probe's rule becomes `reach_anchor()`, with behaviour unchanged;
  - `ProbeAnchorTests` applies it to every probe mutant in every registry (it fails on exactly those three at C1);
  - the three mutants take unique replacements.
- **Unresolved obligations:** none for range 1. Design 01's Q4 (moves in `regenerate`) and Q6 (the extraction cap)
  belong to later ranges.

## Validation and interpretation

**Packet verify CI run [40064371529](https://github.com/ArrokothI/arrokothi/actions/runs/40064371529)** at C, with
spec `docs/development/work/TOOLS-02/verification.json`:
- job `verify` succeeded (04:57–06:04Z, 2026-10-24); the owner reported the pass;
- the run log shows the input revision and checkout at C;
- the implementer did not download the artifact.

- **Fresh clone at C** (`git clone --no-local`, `npm ci`, nothing untracked; Mac arm64, Node v26.10.0, Python 3.13.5):
  - `regenerate` (check): `table_current`, 1,272 members, none changed;
  - tool tests: 639 pass;
  - `mutations.json`: `selected_cases_passed`, 125 killed;
  - `value-cost.json`: `selected_cases_passed`, 238 killed;
  - full verify: `checks_passed`, all 18 checks. They include:
    - refusal mutants: 329 killed;
    - inventory: `provenance_verified`;
    - adoption: `revalidation_complete` (1,549 origins, 415 members, 30 preserved);
    - repository tests: 4,412 pass, with no failures, cancellations, skips or todos;
    - archive: 4 tests; examples: 18 tests;
    - typecheck, both censuses, kernel sweeps, value-cost dimensions and continuations, builder-docs and area-gate.
- **Checks not run:** none of the declared checks were skipped. 017 L-16 (the local timeout of
  `value-cost.bookkeeping-trace`) did not occur in this run.
- **Criteria (implementer assessment, not acceptance):**
  - **T2-1:** an unrelated test file or directory leaves `revalidation_complete` (end-to-end census). Under owner
    choice 01, a named or fixture dependency still invalidates on every edit, an enumerated non-fixture edit is
    recorded by its walk root, and six killed mutants pin each record rule.
  - **T2-2:** every fixture writer and recomputing route refuses an untracked, ignored or git-invisible entry.
    Seven registered guard ablations are killed, and the writer census binds the vocabulary.
- **Strongest remaining risk:** the writer census is a bounded vocabulary of write calls. A writer using a form outside
  it would not be classed. Design 02 §2.2 declares that bound.
- **Third-party:** none.

## Handoff

Ready for an independent narrow review of range 1 (Codex GPT-6) of H over C and B, citing CI `40064371529`. The pushed
H SHA is supplied externally. No self-acceptance; no hold is lifted and no successor is released. Ranges 2–4 follow
after range 1's integration; design 03 (T2-4) and its check are on branch `claude/tools-02-design-03`.
