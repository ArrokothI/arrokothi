# Implementation report — TOOLS-02, round 4 (range 1: rules P and O)

## Identity

- **Packet:** TOOLS-02, scope B. [Brief 01](brief-01.md) is the contract, as amended by
  [owner choice 01](owner-choice-01.md). This round corrects range 1 (T2-1, T2-2) under
  [owner choice 05](owner-choice-05.md). The governing process baseline is [006](../../006-development-process.md) at B.
- **State:** WAITING_FOR_REVIEW for range 1, for the bounded review 04 that owner choice 05 sets. The packet stays
  IN_PROGRESS for ranges 2–4.
  - Owner release: [release 01](release-01.md).
  - Previous review: [review 03](review-03.md) (Codex GPT-6) of H `23d65ac332fdbd267b00d12d5b02e3b77ad8923e`:
    CHANGES REQUIRED, with T2-R3-PATH-01 and T2-R3-OPTIONS-01 (P2) and T2-R3-ADMIN-01 (P3). 006 stop-and-redesign
    fired.
  - Owner route: owner choice 05.
    - The threat model is cooperative test code, with 017 L-18 for forms built to evade the census.
    - Rule P binds paths to tracked entries; rule O restricts options prototypes.
    - T2-R3-ADMIN-01 gets an explicit candidate-check accommodation.
    - Review 04 is bounded, with no new design check.
  - Design: [design 05](design-05.md), with §8 added under owner choice 05. Earlier: §7, after
    [design check 05](design-check-05.md), and owner choices [03](owner-choice-03.md) and [04](owner-choice-04.md).
- **Branch:** `claude/tools-02` on `origin`.
  - B `b5daf35aeee37305c1ee41bb626c97d26db94ab2`.
  - Payload C: C6 `5d0f1cc49eb9cb534ad2818a8f8d38253438418d`.
- **Candidate H:** the commit containing this report.
- **C..H administrative allowlist** (as in [verification.json](verification.json)):
  `docs/development/007-work-packets.md`, this report, `progress.md`.
- **Candidate check:** `candidate --payload C --head H --spec docs/development/work/TOOLS-02/verification.json` passes
  under one recorded accommodation (design 05 §8.3, T2-R3-ADMIN-01):
  - `whitespace_exceptions` exempts `design-04.md`, at its correction commit `c10eb149`, from `git diff --check`;
  - that file is on the preserve list at the same revision, so its bytes are frozen;
  - every other path still gets the whitespace check;
  - the sealed text is not edited.
- **Working tree:** clean. The push is verified in the external handoff.

## Changes and coverage

| Group | Files |
|---|---|
| Capture | `tests/tooling/read-trace.mjs`: each options object's prototype (`Object.prototype`, `null` or `other`), compared with intrinsics captured at load |
| Rules | `scripts/packet_tools.py`: rule P in `walk_path` (first check of each step, before the symlink check); rule O in `admit`; `candidate`'s `whitespace_exceptions` |
| Controls | `test_read_form.py`: rule P and rule O unit controls; the real-tracer test extended (inherited and null-prototype options, case variant); `ReadMatrixCensusTests` gains review 03's options and shell-child probes, own-property and null-prototype controls, and exact versus alternate spelling through two edits. `test_packet_tools.py`: three candidate accommodation tests |
| Registries | `mutations.json`: rule P and rule O mutants, `alias` re-anchored; `coverage.json`: their values; `refusal-guards.json`: the accommodation's ablation (census 330/330) |
| Docs | 017 L-18; design 05 §8; `tests/tooling/README.md` (rules P and O, threat model); [verification.json](verification.json) |

No product file changes. The preserve list adds review 03 and its evidence, implementation 03 and owner choice 05.
017 and design 05 are re-pinned at `4e86b667`.

**T2-R3-PATH-01 → fixed by rule P.** Every component of a read path that exists in the checkout must be a Git entry at C
under exactly that spelling. This applies inside the repository and outside `node_modules`.
- Because rule P is the first check of each walk step, it precedes the tracked-symlink check, identity, fixture
  classification and the pin comparison. A case variant of a tracked symlink can no longer pass as an untracked link.
- "Successful" is existence in the checkout the census runs in. That checkout is pristine at C, and its pre- and
  post-run checks bar untracked entries other than `node_modules` and `.DS_Store`.
- On this case-insensitive host, `tests/fixtures/INPUT.txt` is refused. On a case-sensitive host the alternate spelling
  does not exist, so the read fails, as the traced run observed.

**T2-R3-OPTIONS-01 → fixed by rule O.** Admission refuses any options object whose prototype is not `Object.prototype`
or `null`, for every operation that takes options. A missing record refuses too. `Object.create({fd})` is refused; own
`{fd}` stays refused by the key check.

**T2-R3-ADMIN-01 → recorded accommodation** (above). Its new `require` has a registered ablation, killed by
`test_a_whitespace_exception_must_be_preserved_with_a_reason`.

**End-to-end controls** (the real tracer through the census):
- review 03's options probe: a production helper returning `Object.create({fd})` for a decoy-path stream is refused by
  rule O;
- the shell-child inherited-descriptor probe: never preserved;
- own-property `{encoding}` and literal `{ __proto__: null, encoding }` options: preserved;
- review 03's path probe: the alternate-case reader is never preserved through two edits. It is refused by rule P on a
  case-insensitive host, or because its leaf fails on a case-sensitive one;
- exact-spelling positive controls: the exact reader starts preserved, and each edit makes the table stale and refuses
  it for a changed fixture read.

A first null-prototype control used `Object.assign(Object.create(null), …)`. Those `Object.*` calls put it in the V-ENV
hold register, so it showed as held. It now uses literal syntax, so it tests admission alone.

**Mutants.** Two new mutants, `rule-p` and `rule-o`, are each killed by a host-independent unit control. For `rule-p`, an
untracked on-disk entry stands for the case variant. `alias` is re-anchored. All 21 read mutants kill.

**Measure first** (owner choice 05). A dry-run regenerate in a fresh clone wrote a byte-identical preserved table: no
member changes status, reason or digest. No real member loses credit, so no owner question arose.

**Prior findings:**
- T2-R1-READ-01, T2-R2-READ-01 and T2-R2-PATTERN-01 stay closed.
- D05-CHK-1's effective-input requirement is now met for inherited options through rule O, under the cooperative model.
- T2-2 (passed in reviews 01–03): unchanged, apart from `candidate`'s accommodation.
- Owner choices 01, 03 and 04 remain in force.

**Cumulative range-1 re-audit (implementer):** the walk's other branches (`..`, missing components, untracked links,
`node_modules`) were reread against rule P; every options-taking operation against rule O; and the candidate check's
other requirements. No further defect was found.

## Validation and interpretation

**Packet verify CI run [40181329943](https://github.com/ArrokothI/arrokothi/actions/runs/40181329943)** at C, with spec
`docs/development/work/TOOLS-02/verification.json`: job `verify` succeeded (09:36–11:05Z, 2026-10-25); the owner reported the pass, and the run log shows the input
revision is C. The implementer did not download the artifact.

- **Fresh clone at C** (`git clone --no-local`, `npm ci`, nothing untracked; Mac arm64, Node v26.10.0, Python 3.13.5).
  It ran after the quiet-machine gate, with the 1- and 5-minute load averages below 4:
  - `regenerate` (check): `table_current`;
  - `corpus`: `revalidation_complete`;
  - tool tests: 671 pass;
  - `mutations.json`: `selected_cases_passed`, 140 killed;
  - `value-cost.json`: `selected_cases_passed`, 238 killed;
  - full verify: `checks_passed`, all 18 checks. They include refusal mutants 330 killed; adoption
    `revalidation_complete` (23 preserved); repository tests 4,412 pass, with no failures, cancellations, skips or
    todos; archive 4; examples 18; typecheck, both censuses, kernel sweeps, value-cost dimensions and continuations,
    builder-docs and area-gate.
- **Checks not run:** none of the declared checks were skipped. The case-insensitive branch of the path controls ran
  on this Mac. On CI's case-sensitive Linux runner, the same tests take their case-sensitive branch.

- **Criteria (implementer assessment, not acceptance):**
  - **T2-1:** under owner choice 05's cooperative threat model, every admitted read binds to a tracked entry under its
    exact spelling, enters the record with its identity at C, and is compared at the pin. Options with inherited
    prototypes, and every form outside the matrix, refuse. Unrelated additions stay stable. Twenty-one killed mutants
    pin the rules.
  - **T2-2:** unchanged since reviews 01–03.
- **Strongest remaining risk:** forms built to evade the census (017 L-18), and reads the tracer cannot see (native,
  module-loader, processes that drop `NODE_OPTIONS`).
- **Third-party:** none.

## Handoff

Ready for the bounded review 04 (Codex GPT-6) of range 1, H over C and B, citing CI `40181329943`. The pushed H SHA is supplied
externally. No self-acceptance; no hold is lifted and no successor is released.
