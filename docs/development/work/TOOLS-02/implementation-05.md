# Implementation report — TOOLS-02, round 5 (ranges 2–4: T2-3, T2-4, T2-5 and the P3 items)

## Identity

- **Packet:** TOOLS-02, scope B. [Brief 01](brief-01.md) is the contract, as amended by
  [owner choice 01](owner-choice-01.md) and owner choices 02–14. This round covers ranges 2–4 (T2-3, T2-4, T2-5 and
  the P3 items). The governing process baseline is [006](../../006-development-process.md) at B.
- **State:** WAITING_FOR_REVIEW, for review 05 by a separate fresh Claude Opus session
  ([owner choice 12](owner-choice-12.md)).
  - Owner release: [release 01](release-01.md).
  - Range 1 (T2-1, T2-2): ACCEPT by [review 04](review-04.md) of H `34ab91a5de23beb4997cdd2ae209a3b67aac50a0`;
    integrated `4015599e6178202541e0091f99b6196adaff0430` (PR #59); [receipt](integration-01.md). No review of ranges
    2–4 has run yet.
- **Implementers:**
  - Ranges 2–3, and range 4's tooling and triage through `9f6321b4`: Codex GPT-6 sessions
    ([owner choice 06](owner-choice-06.md)).
  - From `9f6321b4` to C: a Claude Code desktop session (`claude-opus-5-5`), under owner choice 12. It ran the complete
    adoption passes, the fixture fixes, design 06, the P1 binding, register reconciliation, the self-audit, the final
    runs, C and this report.
- **Branch:** `codex/tools-02` on `origin`.
  - B `335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b` ([verification.json](verification.json) `base`).
  - Payload C `302fee9de7dc857ce58cf1e86d7fbb223af7c5fb`.
  - Previous reviewed H: `34ab91a5de23beb4997cdd2ae209a3b67aac50a0` (range 1).
- **Candidate H:** the commit containing this report, a direct child of C.
- **C..H administrative allowlist** (as in [verification.json](verification.json)):
  - `docs/development/007-work-packets.md`;
  - this report;
  - `progress.md`;
  - [`self-audit-05.json`](self-audit-05.json).
- **Working tree:** clean. The push is verified in the external handoff.

## Changes and coverage

The cumulative B..C diff touches 121 files. Most of the line count is fixtures and records.
- **Product source and manifests:** no file under `packages/*/src` and no package manifest or lockfile changes.
- **Product tests:** five maintained Kernel test files gain the extraction tests: `origin-regressions`,
  `control-observation`, `exact-coordinates`, `host-members` and `nondisclosure`.

| Group | Files | Record |
|---|---|---|
| T2-3 target-kill provenance | `scripts/packet_tools.py` (target runs, assertion witnesses), `tests/tooling/catalog-reporter.mjs`, `value-cost-witness.mjs`, `value-cost-source-policy.mjs`, `test_runner_targets.py` | progress, range 2 checkpoint |
| T2-4 register | `packet_tools.py` (released-claim reclassification, `unread`, case register), `test_released_holds.py`, `test_case_register.py`, `test_venv_detector.py` | [design 03](design-03.md) §6; progress, range 3 checkpoint |
| T2-5 triage tooling | `packet_tools.py` (retirement pointers, executable closures, transfer provenance), `tests/tooling/triage-sample.py`, `test_triage_tools.py`, `test_transfer_limits.py`, `test_preserved_tools.py` | progress, range 4 tooling checkpoint |
| T2-5 triage | `adoption.json` (1,280 retired, 269 closed), [triage-05.json](triage-05.json), triage batches 16–33, group reviews 05–23, family applicability, transfer and additional readings | owner choices 07–11; projections 05–11 |
| Extraction | the five Kernel test files above; 85 + 67 adoption cases in `mutations.json`; `state-owner-controls.json` | [build 01](extraction-build-01.md), [build 02](extraction-build-02.md), [build 03](extraction-build-03.md) |
| Design 06 | `packet_tools.py` (`via` and `covered` routes, context reference language, one-hop context), `test_family_tools.py`, `test_context_references.py`, `test_closure_tools.py`, `test_refusal_guards.py` | [design 06](design-06.md); owner choices [13](owner-choice-13.md) and [14](owner-choice-14.md) |
| Registries | `mutations.json` (339 cases), `refusal-guards.json` (358), `coverage.json` | — |
| Docs | 017; `tests/tooling/README.md`; [verification.json](verification.json) | — |

**12 methods.** For the tooling: mechanism argument plus registered mutants, one refusal ablation per `require`
(census 358/358), and deterministic tool tests (777). For triage: a declared rule (S1–S6, design 01 §5.4), the
implementer self-audit before H, and checked pointers. The reviewer's audit over the frozen retired population is
review 05's, with its own seed.

**T2-3.** Target files run in separate direct-script processes, with the reporter beside the error object.
- The source policy covers the copied production set.
- An assertion witness binds the file and fullName, and the control refuses duplicate joined names.
- Real and helper assertions earn kills. Forged shapes or frames, cross-leaf rethrows, hooks and excluded assertions
  do not.
- Reach is collected on a separate passing, uninstrumented control, so V8 offsets stay original.

**T2-4.** Under design 03 §6 and owner choice 02, entries matched only by a released claim (V-ENV, V-D1, Proxy,
re-prototyped built-in) are `unread` by default. `not_held` needs a per-entry reading. No entry cites a released
hold as active.
- At C the register has 1,186 entries, reconciled as [build 03](extraction-build-03.md) §4 describes.
- Eleven new test leaves carry per-entry readings.
- 190 registry cases matched by a released claim carry `mechanism_witness` attributions owned by TOOLS-02, in the
  K1.3 form. They earn no conformance credit.

**T2-5.** All 1,549 origins are disposed of.

| Disposition | Origins |
|---|---:|
| Closed under P1 | 269 |
| Retired: `covered_elsewhere` | 793 |
| Retired: `not_a_counterexample` | 395 |
| Retired: `superseded` | 71 |
| Retired: `recorded_limit` | 21 |

- Retirement earns no credit and deletes no evidence.
- Extracted origins carry `disposition: extracted` for the reviewer's relevance sample.
- The 15 new-test groups and 152 adoption cases (owner choice 11's caps 25 and 250) are bound under P1. The 28 P1
  revalidations are closed or re-dispositioned.
- Six origins moved from their plans to S5 with checked pointers, because none can close under P1: refused members
  without a unique P1-T anchor, or a C2-LIMIT origin ([build 03](extraction-build-03.md) §5).

**P3.**
- KC3-R3-RAW-02: closed by design 05 §8.3's recorded exception, with a new tool test.
- CR1-R1-TOOLS-01: the resulting-state family `dropped-coupled-field-results` and its registry case.
- KC3-R3-CREDIT-03: unchanged under 017 L-12.

**Semantic correction closure.** Design 06 replaces named accepted TOOLS-01 controls, each by an owner choice.
- §5 widens the context reference language and reasons references that are absent at their revision or leave the
  repository. Two controls are replaced.
- §6 makes closure context one hop. Five transitive controls are replaced.
- Unchanged: the record-like refusal `unsupported sealed-record reference` and every other `require`.
- Design 06 §1–§2 add the `via` and `covered` member routes. A `covered` member is counted, never a kill.
- Review 05 checks design 06 in place of a separate design check (owner choice 13).

**Accepted design found unfit**, each settled by the owner before code:
- the TOOLS-01 member route set: 218 of 396 members had no fitting route (owner choice 13);
- the TOOLS-01 context reference language and its transitive walk: 135 origins refused, and once widened the walk
  exceeded 2,400 records (owner choice 14).

**Prior findings.** Range 1's T2-R1 to T2-R3 findings stay closed (review 04). No ranges 2–4 finding exists yet.

**Self-found defects** (provenance: this implementer, fixed before H; none is a product defect):
1. The first complete adoption pass had six non-kills, all registry fixture defects ([build 03](extraction-build-03.md) §1).
2. Two tool tests expected stale messages or keys ([build 03](extraction-build-03.md) §7).
3. A fresh-clone `mutations.json` run at `cc3795ce` had nine invalid baselines. `package-lock.json` was not copied
   into the case trees, so `npm`-resolved reads failed. It is now in the shared files of `mutations.json` and
   `refusal-guards.json` (`2d33974c`).
4. The full verify at `2d33974c` refused because the P3 case had no declared coverage family. It is declared in
   `state-owner` with stage `resulting-state` (`e364786f`).
5. The full verify at `e364786f` found guard `guard.context_check.557d3f1c1daa356e` naming the test that §6 renamed.
   It now names `test_named_sealed_records_are_context_one_hop`, which asserts the same refusal (`302fee9d`).
   The refusal census matches only `require` text, so it could not see a stale test name. Renames of tool tests now
   need a grep of guard `assertion` and `input.test`.

**Unresolved obligations:** none known to the implementer. CREDIT-03 stays a recorded limit.

## Validation and interpretation

**Packet verify CI run [41286444190](https://github.com/ArrokothI/arrokothi/actions/runs/41286444190)** at C, with
spec `docs/development/work/TOOLS-02/verification.json`:
- job `verify` succeeded, 07:51–10:09Z on 2026-11-01;
- the run log's inputs and checkout show revision C;
- it ran from `main`'s workflow file, byte-identical to the one at C;
- the implementer did not download the artifact.

**Fresh clones at C.** Each used `git clone --no-local` and `npm ci`, with nothing untracked, on Mac arm64 with
Node v26.10.0 and Python 3.13.5.
- **Full verify:** `checks_passed`, 19 of 19, in 5,457 s; the clone stayed clean.
  - tool tests 777;
  - inventory `provenance_verified`;
  - adoption `mappings_complete`;
  - registered mutants 339 killed, refusal mutants 358 killed, value-cost mutants 238 killed;
  - repository tests 4,766, with no failures, cancellations, skips or todos;
  - archive 4 and examples 18;
  - typecheck, both censuses, kernel sweeps, race search, value-cost dimensions and continuations, builder-docs and
    area-gate.
- **`regenerate` (check):** `table_current` over 1,272 members, in 290 s; the clone stayed clean.
- **Earlier final runs:**
  - At `cc3795ce`: tool tests 777 in 1,428 s; `value-cost.json` 238 killed; `mutations.json` 330 killed with nine
    invalid baselines (defect 3).
  - At `e364786f`: full verify passed 18 of 19, missing only defect 5.
  - The files changed since then are named in defects 3–5.
- **Complete adoption pass** (owner choice 13's 1,200 s cap): 776.867 s at `cf95cf52`; 152/152 controls passed and
  179/179 mutants received qualified kills. Every attempt is in the [ledger](adoption-runtime-12.json).
- **Self-audit** ([self-audit-05.json](self-audit-05.json)): seed 20261026, n = 50, over the frozen retired
  population (1,280 origins, SHA-256 `538b3aaa…`).
  - 0 unsafe errors, within the stop of at most 1.
  - 2 minor errors: items 12 and 23, both S1 where S5 fits. Both results are maintained.
  - This is an implementer stop only, never evidence for the audit bound.

**Checks not run:**
- the external live-provider and large-memory profiles (`profiles_not_run`);
- the reviewer's n = 150 audit and its 10 + 10 relevance samples, which belong to review 05.

**Criteria (implementer assessment, not acceptance):**
- **T2-3:** a target-set kill needs a witnessed assertion of the named test. Forged frames earn nothing, and
  registered mutants pin the classification.
- **T2-4:** the register is recomputed at C. Released claims are `unread` unless read per entry, and `verify`'s
  corpus check refuses a mismatch.
- **T2-5:** every origin has exactly one checked disposition, under the declared rule. The bound depends on review
  05's audit.

**Design choices and owner amendments:**
- owner choices 06–11: implementer, caps and checkpoints;
- owner choice 12: roles;
- owner choice 13: the 1,200 s cap and design 06 §1–§2;
- owner choice 14: design 06 §5–§6;
- 190 `mechanism_witness` attributions, following the K1.3 precedent.

**Strongest remaining risk.** Judgment in triage:
- a retired origin whose pointer leaf asserts less than the origin's required result;
- `covered` member readings that overstate what the named case or leaf asserts.

One-hop context also reads less than TOOLS-01 did, by design.

**Third-party:** none.

## Handoff

Ready for review 05, a separate fresh Claude Opus session, of H over C and B, citing CI `41286444190`. The pushed H
SHA is supplied externally. No self-acceptance; no hold is lifted and no successor is released.
