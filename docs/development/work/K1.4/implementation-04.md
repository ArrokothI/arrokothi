# Implementation report — K1.4, round 4

## Identity

- **Packet:** K1.4, the legacy bridge (K14-1 to K14-6; K14-G is K1.4-gate's). This round disposes review 03 by
  owner choice 05's route (d): recorded limits, with no further patch round. Records:
  - [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md)
    and its [brief 04](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03/brief-04.md):
    Codex GPT-6, CHANGES REQUIRED of H `b1769c0fcdb73bfc6297551b87f80e74bc6cb588`, findings K14-R3-01..03. Read
    by commit on `codex/k1.4-review-03` at `5e36d514fb10347a182bbeaa36879ce9074fe72a`, with `probes.mjs` and the
    other evidence files; not merged.
  - [owner choice 06](owner-choice-06.md): R3-01 "Record limit", R3-02 "Promote as tests", R3-03 "Record
    exclusion" (2026-11-11). Brief 04's criteria R3-LIMIT, R3-CLAIMS, R3-CORPUS and R3-PRESERVE govern.
  - [owner choice 05](owner-choice-05.md), whose fallback selected route (d) for this outcome.
  - Earlier records stand: [release 01](release-01.md), [brief 01](brief-01.md), designs [01](design-01.md) to
    [04](design-04.md), owner choices [01](owner-choices-01.md) to [05](owner-choice-05.md), and implementation
    reports [01](implementation-01.md) to [03](implementation-03.md).

  Process: [006](../../006-development-process.md), [008](../../008-implementation-report.md),
  [012](../../012-review-methods.md), [017](../../017-known-limitations.md).
- **Prerequisites:** K1.3 and TOOLS-02 ranges 2–4 are accepted and integrated in B.
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), on the owner's Mac (arm64), on
  2026-11-11. It has a local checkout, a shell, Node v26.10.0, Python 3.13 and `gh`, and used no subagents. It is
  not the reviewer.
- **Branch:** `claude/k1.4`, in its own worktree.
  - Base B: `608f9ece44dbe42b78974bdac9e7ddcd33697705`. Main has not moved since.
  - Payload C: `697922e251a572d0c96f7a02c1b646b607c351fc`. It sits on `739a0586`, the first round-4 payload,
    which sits on the reviewed H `b1769c0f`. `739a0586` was superseded before any H (self-found defect 2).
  - Candidate H: the commit that contains this report. Its full SHA goes in the external handoff.
  - The C..H allowlist (`administrative_files` in C's `verification.json`) is exactly:
    `docs/development/007-work-packets.md`, `docs/development/work/K1.4/implementation-04.md` and
    `docs/development/work/K1.4/progress.md`.
- **Push:** C was pushed before the CI dispatch. H is pushed after this report is committed.

## Changes and coverage

**Production:** none. `packages/sdk/src`, `packages/kernel/src` and `packages/core/src` are byte-identical to
round 3's C `3e8b4bac`; Kernel and core source are byte-identical to B. No native state is forced, no native call
is repeated, and every cascade stays.

**Tests** (`packages/sdk/tests/bridge-terminate.test.ts`, 70 → 90 tests):
- **F1–F3** (R3-02), review 03's three one-fault witnesses as maintained rows. In each, the request's own cascade
  fails its first native read once, and the row asserts Kernel CANCELLED, every native member terminal and no
  later native work:
  - F1: `app.cancel` on a parked Workflow with a called chat child (`cancel.application`);
  - F2: a root that exists before its exchange starts (`cancel.exchange-start`, Driver rig);
  - F3: the exchange held at its root read, before the forwarding loop (`cancel.forward-loop`, Driver rig).
- **The oracle table.** F1–F3 map their `cancel.*` label to **kill** and `cancel.request` to **redundant** by
  that label. `EQUIVALENT_ONLY` keeps only `initial-input` (T6). The baseline and every F-row removal assert the
  fault count, so a kill is counted only under the one-fault schedule. Two new negative controls: the table
  without its F rows fails for each of the three labels, and restoring a reason for a killed label fails.
- **B-TERM-LIMIT** (R3-01, R3-CORPUS): review 03's two counterexamples (a failed `applyOutcome` transaction and a
  failed definition read after READY→RUNNING), plus one implementer-found variant (deviation 1). Each asserts the
  behaviour [017](../../017-known-limitations.md) L-36 records: one fault, the Kernel's terminal state, no hold, the
  native root RUNNING with its cancellation pending, and no later step. These are a limit, not a guarantee.
- **L-37 exclusions** in B-TERM-CENSUS (R3-03, R3-CORPUS): review 03's three census probes, each asserting that
  the form escapes (no error, no new label).
- **Narrowed wording:** the file header and the B-TERM-TRIGGERS title say each *row* ends every member; the
  header and the census doc comment name the checked forms and the exclusions.
- No assertion, expected result or fault was relaxed. The 17 earlier rows and their 24 pairs are unchanged.

**Fixtures and evidence:**
- `tests/conformance/legacy-mapping.json`: the `bridge-terminate.test.ts` property and the
  `child-cancellation.test.ts` bridge clause now say the Driver requests the end (L-36) and the census is bounded
  (L-37).
- `tests/fixtures/packet-tools/adoption.json`: unchanged; `regenerate` reports `table_current` at C in a fresh
  clone. `mutations.json`, `refusal-guards.json` and `value-cost.json` are byte-identical to B.
- `verification.json`: the administrative file is now this report. The round 3 census clause points to the new
  round 4 limit, which states L-36, F1–F3 and L-37's checked forms and exclusions.
- `implementation-04/`: review 03's probe files rerun unchanged at this tree, and round 3's ablation runner (§
  Validation). The repository ignores `*.log`, so each log is added with `git add -f`.

**Documents:**
- [017](../../017-known-limitations.md): **L-36** (R3-01) and **L-37** (R3-03), with the owner's trigger and fixing
  owner.
- [BASELINE](../../002-implemented-kernel-baseline.md): cancellation, Driver `fail` and native terminal roots
  *request* the end of every non-terminal member; when a RUNNING member stays RUNNING; L-36.
- Guides: [quick start](../../../guides/deployment/quick-start.md) (two `app.cancel` rows) and
  [capabilities, Effects and authority](../../../guides/kernel/capabilities-effects-and-authority.md) now say
  `app.cancel` requests the end, and a member mid-step ends when that step finishes unless it fails (L-36).
- Dated corrections (2026-11-11), never rewrites:
  - design [03](design-03.md) R1-05, which also covers design [02](design-02.md) D01-CHK-01's cascade bullet:
    `verification.json` preserves design 02 unchanged;
  - design [04](design-04.md) §6: D04-CHK-02's "never claims the cleanup succeeded", and D04-CHK-03's "fails closed"
    list and cancellation rows;
  - implementation report [02](implementation-02.md) K14-R1-05;
  - implementation report [03](implementation-03.md): D04-CHK-02, the census bullet, the oracle counts, deviation
    4, the bounded-search risk and the K14-6 assessment.
- Unchanged: [integration](../../../../mental-model/mechanisms/integration.md#native-human-work-and-output), which
  already says a native cancellation request may only schedule cooperative handling, and that neither
  acknowledgment proves a stop. L-36 is the legacy Driver's gap against it; no Layer-3 change was needed.

**Diff sizes:**
- C over the reviewed H (`b1769c0f`..C): 17 files, +1,352/−31. The test file is +256/−21 of that; the rest is
  documents, the mapping, `verification.json` and evidence logs.
- Cumulative, B..C: 105 files, +14,913/−1,252.

### Prior findings (review 03)

| Finding | Disposition | Evidence |
|---|---|---|
| K14-R3-01 (P2) | Recorded limit: 017 L-36 (owner choice 06). No production change | B-TERM-LIMIT's three counterexamples. The baseline, guides and mapping narrowed; dated corrections in designs 03–04 (design 03's covers design 02) and reports 02–03. `review-03-probes.log`: both R3-01 probes still fail, by decision |
| K14-R3-02 (P2) | Promoted: rows F1–F3 kill `cancel.application`, `cancel.exchange-start` and `cancel.forward-loop`; their equivalence reasons are removed | B-TERM-ABLATION's six F pairs; the two new table controls. `review-03-probes.log`: the three R3-02 probes pass |
| K14-R3-03 (P2) | Recorded exclusion: 017 L-37, with the checked forms named in the census comment, the test header and `verification.json` | The three L-37 exclusion tests. `review-03-probes.log`: the three R3-03 probes still fail, by decision |

### Brief 04 criteria

- **R3-LIMIT.** Owner choice 06 decides each finding. L-36 and L-37 carry its scope, trigger and fixing owner;
  R3-02 is promoted, so it needs no entry. Neither limit loses or corrupts cooperative caller data: L-36's
  failure is explicit and Kernel state is authoritative, and L-37 bounds a test guard.
- **R3-CLAIMS.** Each current claim that a fulfilled cancel call ended the members is narrowed: the baseline, two
  guides, the mapping, the test header and the census comment. The historical designs and reports get dated
  corrections. The three equivalence reasons are gone. One claim stays, in production comments (deviation 3).
- **R3-CORPUS.** All eight review-03 probes have maintained counterparts. The five that assert unbuilt guarantees
  are kept as counterexamples that assert today's behaviour, named as limits; the three that pass are F1–F3. The
  review's own file, rerun unchanged, gives 3 pass and 5 fail, as expected.
- **R3-PRESERVE.** Production source is unchanged since round 3. Review 02's and the review-01 probes pass 10/10,
  design check 04's attacks still fail (neither defect reproduces), review 02's hold mutant is still caught, and
  round 3's five removed-fix ablations are all still caught.

**Oracle counts** (round 4):

| Measure | Count |
|---|---|
| Baseline rows | 20 |
| Distinct labels | 16 |
| Removals, one per (row, label) pair | 30 |
| Behavioural kills | 16 |
| Executed equivalences | 14 (1 empty obligation, 13 redundant) |

- Fifteen labels have a killing row. Only `initial-input` is equivalent only (T6's empty obligation).
- The redundant pairs hold on their rows' schedules: successful cleanup, plus the F rows' one rejected request
  cascade. They do not cover other fault combinations, and the rows are not a proof for every interleaving.

### Deviations and decisions for the owner

1. **L-36 also states a cancelled variant (implementer-found; please confirm).** The owner's answer describes the
   Kernel `FAILED` case. While narrowing the guides, I checked a Kernel cancellation that reaches a running step,
   followed by the same native exception: Kernel `CANCELLED` stands, `app.cancel` resolves, and the native root
   stays RUNNING with its cancellation pending, with no hold. It is the same mechanism. Recording only the
   `FAILED` case would leave L-36 narrower than the behaviour, which 017 treats as a blocking finding. So L-36
   names both, and B-TERM-LIMIT keeps the variant. The owner may narrow or reword it.
2. **The F rows fail the request's own cascade, not the first cascade read.** Review 03's probe failed the first
   read under any cascade. With `cancel.request` removed, that fault would move to the row's own label, which is
   then a different schedule. An `AsyncLocalStorage` mark set inside `requestCancellation` scopes the fault to the
   request's cascade. So with `cancel.request` removed nothing fails, the row's label ends the lineage, and the
   pair is executed as **redundant**. The three kill pairs reproduce the review's results: members WAITING (F1)
   or READY (F2, F3).
3. **Production comments still say "ends the lineage".** `driver.ts`'s header (lines 19–24) and its `endLineage`
   and `cascade` doc comments describe the cascade as ending members. Owner choice 06 forbids production changes,
   so they stay. L-36, the baseline and the guides govern. The next packet that touches `driver.ts` should narrow
   them.

   > **Correction, 2026-11-11 (round 5, after [review 04](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04.md) K14-R4-01; [brief 05](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04/brief-05.md)).**
   > Review 04 found these comments false (K14-R4-01), and the owner's comment-only fix applies in round 5:
   > the comments now say the Driver requests native cancellation and starts no further native step, with
   > L-36's limit. No executable line changed.

### Additional self-found defects (separate provenance)

1. **L-37's first wording was read as a link.** The builder-docs check reported a missing target in 017, because
   the template example contained a bracketed key followed by a parenthesis. The example now shows only the
   element access.
2. **The first round-4 payload changed a preserved file.**
   - *Found:* by the candidate check on a trial H, after `739a0586` was pushed and its Packet verify run
     [`43086358185`](https://github.com/ArrokothI/arrokothi/actions/runs/43086358185) had started.
   - *What:* C's `verification.json` preserves `design-02.md` at `13893791`, and `739a0586` added a dated
     correction to it, so no H over it could pass.
   - *Fix:* the run was cancelled. C `697922e2` restores design 02's preserved bytes, and design 03's R1-05
     correction also covers design 02's cascade bullet. The trial H over the new C is `facts_verified`.
   - *Process:* the candidate check now runs on a trial H before C is pushed or CI dispatched.

### Not changed, and the strongest remaining risk

- **L-36:** after a native exception past READY→RUNNING, a native member can stay RUNNING with a pending
  cancellation, with no hold and no recovery. Nothing advances it, but nothing reports it either. Only the
  Kernel's state and the original failure are explicit.
- **L-37:** the census remains a bounded syntactic guard.
- **The oracle** is a finite row set with one-fault schedules.
- **Unchanged from round 3:** the committed-READY reconciliation, the detector, the input accounting, and the
  Kernel-only report for a rejected cleanup call.

  > **Correction, 2026-11-11 (round 5, after [review 04](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04.md) K14-R4-01; [brief 05](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04/brief-05.md)).**
  > The Kernel-only report covers `terminate`'s rejected cleanup call only, and the Kernel records it only for
  > E's unresolved Activation while E is not terminal. `requestCancellation`'s request swallows its rejection,
  > and `app.cancel`'s fallback (`cancel.application`) requests again (review 04's probe of row F1's schedule).

## Validation and interpretation

**Packet verify CI at C** with spec `docs/development/work/K1.4/verification.json`: run
[`43088962951`](https://github.com/ArrokothI/arrokothi/actions/runs/43088962951) at C
`697922e251a572d0c96f7a02c1b646b607c351fc`: started 2026-11-11 19:38:08 UTC, finished 21:55:39 UTC: `checks_passed`,
19/19, exit 0, Node v26.10.0, Linux x86_64. Repository tests 5,054/5,054; archive tests 4/4; example tests 18/18;
tool tests 777; typecheck; adoption `mappings_complete`; inventory `provenance_verified`; dimensions
`coverage_reported`; registered, refusal and value-cost mutants `selected_cases_passed`; refusal and oracle
censuses; Kernel sweeps; race search; value-cost dimensions and continuations; builder docs; area gate
`reported`. The job log and `run.txt` both report revision and head C.

**Local checks:**
- A fresh clone at C, with `npm ci` and Node v26.10.0:
  - `npm test`: 5,054/5,054, with 0 failed, cancelled, skipped or todo;
  - `npm run typecheck`: exit 0;
  - `regenerate` on the adoption manifest: `table_current`;
  - `corpus`: `mappings_complete`; `inventory`: `provenance_verified`;
  - the architecture tests: 390/390.
- In the worktree (identical to C):
  - `npm test`: 5,054/5,054; `npm run check:builder-docs`: passed;
  - `bridge-terminate.test.ts` three times in a row: 90/90 each.
- Review 03's files at `5e36d514`, unchanged, copied into `review-03/` for each run and removed after:

| Log | Run | Result | Expected |
|---|---|---|---|
| [`review-03-probes.log`](implementation-04/review-03-probes.log) | `probes.mjs` | 8 tests: 3 pass, 5 fail | Yes. The R3-01 and R3-03 failures are L-36 and L-37 by decision; the R3-02 passes are F1–F3 |
| [`prior-probes.log`](implementation-04/prior-probes.log) | review 02's probes and the review-01 probes | 10/10 pass | Yes |
| [`d04-witnesses.log`](implementation-04/d04-witnesses.log) | design check 04's attacks, without the installer | 0/2: neither defect reproduces | Yes |
| [`hold-mutant.log`](implementation-04/hold-mutant.log) | review 02's removed-hold-cascade mutant, source restored | 507/509: T13 and its baseline fail | Yes: the mutant is caught |
| [`ablations.log`](implementation-04/ablations.log) | round 3's `ablate.py`, unchanged | all five removed fixes caught | Yes |

**Checks not run:** live-provider canaries and large-memory timing (`profiles_not_run`, owner choice 01). No E1
benchmark (K14-G is K1.4-gate's). The mutation registries were not rerun locally; CI runs them, unchanged.

**Why the evidence supports each criterion** (implementer assessment, not acceptance):
- **K14-1 and K14-4:** the exchange and feature behaviour are unchanged since round 3. The whole-lineage cleanup
  claim is narrowed to L-36.
- **K14-6:** every cleanup call site is in the oracle, from the source, within L-37's forms. Every label except
  `initial-input` has a behavioural kill, and every equivalence is executed.
- **K14-2, K14-3 and K14-5:** unchanged since review 02, which passed them; review 03 passed them too.

**Third-party code and licences:** none. The tests use repository fixtures, Node builtins (including
`node:async_hooks`), and the TypeScript compiler API already in the repository.

## Handoff

Ready for the bounded review 04 against brief 04, of H over C `697922e251a572d0c96f7a02c1b646b607c351fc` and B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`: Packet verify CI run [`43088962951`](https://github.com/ArrokothI/arrokothi/actions/runs/43088962951) at C reports `checks_passed`, 19/19. Deviation 1 asks the owner to confirm L-36's
cancelled variant. There is no self-acceptance, and K14-G stays with K1.4-gate.
