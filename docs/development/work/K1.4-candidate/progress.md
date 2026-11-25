# K1.4-candidate progress

The resume point for any session continuing this packet. Newest facts first.

- **INTEGRATED at `e0064da4820579b89faca44316053171ab4ab63c`** (PR #71, merged by the owner 2026-11-22 02:41:03 UTC).
  Its parents are B `c1951226` and the cleanup head `33f8cf18`, and its tree equals the cleanup head's.
  [Integration receipt 01](integration-01.md).
  - *Open:* owner discussion and closure (not recorded); K1.4's O-3; the supported-entry fixture confirmation.
  - *Next:* K1.4-gate, which still needs the benchmark owner's E1 release that pins this candidate and its own
    owner release. `next_release: none`.

- **ACCEPTED at H `a734d03a9eb352bd29988bff1a68d9d6ca9bb2d3`** ([review 04](review-04.md), Codex GPT-6, recorded at
  `30c5c086`, which is also the acceptance transcription A; fast-forwarded). Owner-delegated
  [cleanup 01](cleanup-01.md) is complete (2026-11-21), and `claude/k1.4-candidate` is merge-ready.
  - *Records:* design checks 01, 03, 04 and 05 and reviews 01–03 are imported byte for byte from their branches, so
    [design check 01](design-check-01.md), [review 01](review-01.md), [review 02](review-02.md) and
    [review 03](review-03.md) and their siblings now resolve here. The pinned commit links above keep working.
  - *Open:* integration (the owner's manual merge, then the receipt); owner discussion and closure; the
    supported-entry fixture confirmation.
  - *Next:* the owner merges `claude/k1.4-candidate`. K1.4-gate stays PLANNED: it needs this packet's integration
    and the benchmark owner's E1 release, and then its own owner release. `next_release: none`.

- **Round 4 payload C: `848b1957ae9e598bb256712c07a3cc22c39fbaf7`** (pushed, 2026-11-21). **WAITING_FOR_REVIEW.**
  - *Check and route:* [design check 05](https://github.com/ArrokothI/arrokothi/blob/44d9091f6db6d1f382841cd822befcd80e374f7b/docs/development/work/K1.4-candidate/design-check-05.md) (Codex GPT-6, `codex/k1.4-candidate-design-check-05` at
    `44d9091f6db6d1f382841cd822befcd80e374f7b`) is APPROVED WITH REQUIRED CHANGES of design 05: D05-CHK-01 and D05-CHK-02, both
    bounded and test-side. Read by commit; not merged. Owner choice 07's stop rule did not fire; the owner's instruction of
    2026-11-21 took the ordinary route.
  - *C:* [design 05 addendum 01](design-05-addendum-01.md); the recording laboratory and the oracle in `identity-lab.ts`;
    `identity.test.ts` (78 tests); the new `identity-oracle.test.ts` (15 tests: the declared matrix and the addendum's
    controls); the count types in `identity-search.test.ts`; the README, 017 L-39, one boundary entry and one mapping row;
    the verification spec. `packages/`, `scripts/` and `tests/tooling/` are byte-identical to B. The adapter, the fake
    Driver and the registry data are unchanged since round 3.
  - *Result:* 12 PASS and 3 REFUSED, unchanged. The 2,708-mutation matrix gave every declared code and count on its first
    run, and no stop condition fired. Not an E1 result.
  - *Packet verify:* CI run [`44876502133`](https://github.com/ArrokothI/arrokothi/actions/runs/44876502133) at C: `checks_passed`, 19 of 19; repository tests 5,322 of 5,322 with no skip; the registry 315 cases and 351 kills, each of the twelve candidate cases killed with `semantic_credit: none`; adoption `mappings_complete` (1,199 entries, 315 cases); `run.txt` records revision = head = C (Node v26.10.0, Linux x86_64, 2026-11-21 06:38 to 08:01 UTC).
  - *H:* [implementation report 04](implementation-04.md), the 007 row and this file.
  - *For the reviewer:* the oracle and the adapter have one author, and design check 05 asks the review to enforce their
    separation; the build reused this session's design-05 prototype; D2's scope is the fake Driver's contract; faults
    stand in for refusals no genuine schedule makes.
  - *Next:* an independent review of the cumulative candidate by a Codex GPT-6 session. No self-acceptance.
    After an ACCEPT: Prompt C cleanup by a fresh session, then the owner's merge. E1 round 3 is the benchmark
    owner's separate release.

- **Round 5 started (2026-11-20), design only: design check 04 is NOT APPROVED of design 04 at
  `06e60dd81921946094a6f2323ec8831d61308320`.**
  - *Check:* [design check 04](https://github.com/ArrokothI/arrokothi/blob/99d411e00049ae87b781a7c1e1008161409ec983/docs/development/work/K1.4-candidate/design-check-04.md) (Codex GPT-6, `codex/k1.4-candidate-design-check-04` at
    `99d411e00049ae87b781a7c1e1008161409ec983`), D04-CHK-01..03, all P2 and test-side: exits not decided from recorded answers (a swallowed refusal
    passes); settlement reports outside the recorder, and grant evidence misattributed; the matrix not a reproducible
    declaration. Read by commit; not merged.
  - *Owner:* [owner choice 06](owner-choice-06.md), “Judge settlement callbacks too (recommended)”;
    [owner choice 07](owner-choice-07.md), “Yes, set stop rule”: if design check 05 is not APPROVED or APPROVED WITH
    REQUIRED CHANGES, the packet takes 006's refined-finishable-claim route, and the coding agent proposes a narrower
    oracle claim for the owner's approval, with no further design-check loop.
  - *Design:* [design 05](design-05.md): an answer table and step B2 decide whether an Observation is allowed; the
    laboratory wraps the Driver in its coordinator subclass and records calls, deliveries and settlement reports at
    entry, judged by step D2; a declared corpus of 75 cases, 62 rows, 26 slots and 3 delivery slots, 2,708 mutations
    and 31 declared failures; the first failing record stops judgment. 017 L-39's wording is given. A prototype
    outside the repository reproduced every count and code.
  - *Next:* the design check of design 05 (Codex GPT-6), then the owner's disposition. No candidate code, C or H
    before that. The Kernel, the fixture and the packet tools stay unchanged.

- **Round 4 started (2026-11-20), design only: review 03 is CHANGES REQUIRED of H
  `ddc53bd132fde4f71bc989ccec7f4d0e430a45dc`.**
  - *Review:* [review 03](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03.md) (Codex GPT-6, `codex/k1.4-candidate-review-03` at
    `3e86a8c0f7a310c53810f2ced0533165b1844b54`). K14C-R02-01 is closed. K14C-R03-01 (P2) is open: the oracle checks the primary call's target and
    the last inspection separately and never joins them to the command, and it ignores calls other than the
    primary, so another Execution's inspection, a wrong method and an extra mutation pass. K14C-R03-02 (P3): 017
    L-39's opening sentence says every unnamed timeout gets the label. Read by commit; not merged.
  - *Owner:* stop-and-redesign fired; owner choice 05 is “Redesign the oracle’s command/call/inspection checks,
    with a new design check (recommended)” ([record](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/owner-choice.md)).
    [Brief 04](https://github.com/ArrokothI/arrokothi/blob/3e86a8c0f7a310c53810f2ced0533165b1844b54/docs/development/work/K1.4-candidate/review-03/brief-04.md) governs.
  - *Design:* [design 04](design-04.md): one call table per command kind, a sequence and target check of every
    recorded call, the final inspection tied to the command's Execution and to the Observation, and the legal
    exits with the calls before each. No Kernel state is predicted. The ledger is not reopened.
  - *Next:* the design check of design 04 (Codex GPT-6), then the owner's disposition. No candidate code, C or H
    before that. The Kernel, the fixture and the packet tools stay unchanged.

- **Round 3 payload C: `41bd3aaa5cf83c51e93d41da567558d34f943410`** (pushed, 2026-11-15). **WAITING_FOR_REVIEW.**
  - *C:* the name ledger in the candidate (design 03 with addendum 01, owner choice 04); `identity-lab.ts` with
    the independent oracle; `identity.test.ts` and `identity-search.test.ts`; seven mechanism mutants with their
    witnesses, probe, registry cases, coverage family and hold-register entries; the README and 017 L-38, L-39,
    L-42 and L-44; the verification spec. `packages/`, `scripts/` and `tests/tooling/` are byte-identical to B.
  - *Result:* 12 PASS and 3 REFUSED, unchanged. The 4,126-run search found no uncovered case. Not an E1 result.
  - *Packet verify:* CI run [`43798331633`](https://github.com/ArrokothI/arrokothi/actions/runs/43798331633) at C: `checks_passed`, 19 of 19; repository tests 5,296 of 5,296 with no skip; the registry 315 cases and 351 kills, each of the twelve candidate cases killed with `semantic_credit: none`; adoption `mappings_complete` (1,199 entries, 315 cases); `run.txt` records revision = head = C (Node v26.10.0, Linux x86_64, 2026-11-16 03:28 to 05:47 UTC).
  - *H:* [implementation report 03](implementation-03.md), the 007 row and this file.
  - *For the reviewer:* the search never failed during the build, so its discrimination rests on the oracle's
    rejection controls and the mutants; the oracle and the adapter have one author; three-way name interactions
    are outside the search; the identity claim is about IDs within one run (017 L-39).
  - *Next:* an independent review of the cumulative candidate by a Codex GPT-6 session. No self-acceptance.
    After an ACCEPT: Prompt C cleanup by a fresh session, then the owner's merge. E1 round 3 is the benchmark
    owner's separate release.

- **Design check 03 disposed; round-3 build released by the owner (2026-11-15).**
  - *Check:* [design check 03](https://github.com/ArrokothI/arrokothi/blob/62092a70fec6e82ef4dcec17ce27195debf6b5ca/docs/development/work/K1.4-candidate/design-check-03.md) (Codex GPT-6, `codex/k1.4-candidate-design-check-03` at
    `62092a70fec6e82ef4dcec17ce27195debf6b5ca`), APPROVED WITH REQUIRED CHANGES D03-CHK-01..05. Read by commit;
    not merged.
  - *Owner:* [owner choice 04](owner-choice-04.md): OQ-1, OQ-2 and OQ-3 accepted as recommended; keep the search
    small; the seven mechanism mutants are registry cases with `semantic_credit: none`.
  - *Design:* [design 03 addendum 01](design-03-addendum-01.md) disposes the five required changes: association
    checks (A1), the limited changed-ID claim (A2), the oracle (A3), the counted search of 4,126 runs and the
    registry witnesses (A4), the path census (A5).
  - *Next:* the build to design 03 plus the addendum; C; Packet verify in CI; implementation report 03; H; 007
    WAITING_FOR_REVIEW. Stop and report before any patch if the search finds an uncovered case or a supported
    schedule stops passing. No self-acceptance.

- **Round 3 started (2026-11-15), design only: review 02 is CHANGES REQUIRED of H
  `14a7ef485282ab2c16d08702be5d61cfeb9997e7`.**
  - *Review:* [review 02](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02.md) (Codex GPT-6, `codex/k1.4-candidate-review-02` at
    `2a95a49a6e7ff46242a137f9d9ca6835e70ed946`). K14C-R01-02 and K14C-R01-03 are closed. K14C-R02-01 (P2) is
    open and continues K14C-R01-01: a generated fallback string is outside the collision check, so it can equal
    a laboratory name, in the timeout, wait-generation and Execution families. Read by commit; not merged.
  - *Owner:* stop-and-redesign fired; the owner chose "Redesign with a design check (recommended)"
    ([record](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/owner-choice.md)). [Brief 03](https://github.com/ArrokothI/arrokothi/blob/2a95a49a6e7ff46242a137f9d9ca6835e70ed946/docs/development/work/K1.4-candidate/review-02/brief-03.md) governs.
  - *Design:* [design 03](design-03.md) answers brief 03's five questions: one name ledger per scope that every
    emitted and resolved identity string goes through. It has three owner questions (OQ-1 to OQ-3).
  - *Code:* none in this round. The candidate is as at H. No C and no H.
  - *Next:* the design check of design 03 (a session that has not worked on this packet), then the owner's
    disposition. No build before both. Kernel, fixture and packet tools stay unchanged.

- **Round 2 payload C: `7392e4a640c07c9a2989464cd2a979938c37ee25`** (pushed, 2026-11-15). **WAITING_FOR_REVIEW.**
  - *C:* the timeout name table with provenance and its nine tests; five registry cases with their coverage
    family and hold-register entries; `ablation-probe.mjs` and `ablation-table.ts`; the latest-grant witness; the
    rewritten gate sentence in `evidence.md`; 017 L-39 and L-44; the README; the verification spec.
    `packages/`, `scripts/` and `tests/tooling/` are byte-identical to B.
  - *Result:* 12 PASS and 3 REFUSED, unchanged. Not an E1 result.
  - *Packet verify:* CI run [`43704493967`](https://github.com/ArrokothI/arrokothi/actions/runs/43704493967) at C: `checks_passed`, 19 of 19 checks, exit 0, on Node v26.10.0; repository tests 5,225 of 5,225 with no failure, skip or todo. `registered-mutants` ran 308 cases and killed 344 mutants (303 and 339 in round 1): each of the five new cases passed its control and killed its mutant by its own row, with `semantic_credit: none`. `adoption` reports `mappings_complete` with 308 case entries, and `dimensions` counts five `k14-candidate-ablation` cases. The artifact `packet-verify-7392e4a640c07c9a2989464cd2a979938c37ee25` records `revision` and `head` both equal to C in `run.txt`.
  - *H:* [implementation report 02](implementation-02.md), the 007 row and this file.
  - *For the reviewer:* a conflicting timeout name is exposed, not thrown; the probe links the Kernel package
    into the registry's temporary copy; a new registry category; design 02 had no design check.
  - *Next:* an independent review of the cumulative candidate by a Codex GPT-6 session. No self-acceptance.
    After an ACCEPT: Prompt C cleanup by a fresh session, then the owner's merge. E1 round 3 is the benchmark
    owner's separate release.

- **Round 2 started (2026-11-15): review 01 is CHANGES REQUIRED of H `484afd13d7652958f6496afc56d9aa9c098d58b1`.**
  - *Review:* [review 01](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01.md) (Codex GPT-6, `codex/k1.4-candidate-review-01` at
    `7b8a63fa5f087f870663bc143257e5181d0d385c`), three P2 findings: K14C-R01-01 (a refused timeout name fell into
    the `to-<generation>` label), K14C-R01-02 (the ablations were outside the mutation registry), K14C-R01-03
    (the `evidence.md` sentence generalized a K1 scope decision). Read by commit; not merged.
    [Brief 02](https://github.com/ArrokothI/arrokothi/blob/7b8a63fa5f087f870663bc143257e5181d0d385c/docs/development/work/K1.4-candidate/review-01/brief-02.md) governs the correction.
  - *Owner:* [owner choice 03](owner-choice-03.md): register ABL-1 to ABL-5 through the existing workflow, keep
    the maintained test; stop and ask if registration needs a packet-tools change or a waiver.
  - *Design:* [design 02](design-02.md) answers brief 02's three questions. Registration needs data only
    (registry cases, a coverage family, five `unread` hold-register entries) and one probe file.
  - *Next:* the round-2 payload C, Packet verify in CI at C, implementation report 02, H, 007 WAITING_FOR_REVIEW.
    Kernel source unchanged. No self-acceptance.

- **Round 1 payload C: `61ea8126507506b043ce5ba6515073f62c19c42f`** (pushed, 2026-11-14). **WAITING_FOR_REVIEW.**
  - *C:* the candidate, its encoder and fake Driver, five test files, the README for E1, decision 4's prose
    corrections, the K1.0 guard's three named importers, nine mapping rows, BASELINE §15, 017 L-38 to L-44, one
    sentence in `evidence.md`, and the verification spec. `packages/` is byte-identical to B.
  - *Result:* 12 PASS and 3 REFUSED through the unmodified runner; ABL-1 to ABL-5 each fail at the predicted step
    and field. Not an E1 result.
  - *Packet verify:* CI run [`43676796376`](https://github.com/ArrokothI/arrokothi/actions/runs/43676796376) at C: `checks_passed`, 19 of 19 checks, exit 0, on Node v26.10.0; repository tests 5,212 of 5,212 with no failure, skip or todo. The artifact `packet-verify-61ea8126507506b043ce5ba6515073f62c19c42f` records `revision` and `head` both equal to C in `run.txt`.
  - *H:* [implementation report 01](implementation-01.md), the 007 row and this file.
  - *Deviations for the reviewer:* the ablations are a maintained test, not registry cases (017 L-44); they run in a
    child process so the literal-import guard stays as it was; one Layer-3 sentence in `evidence.md`.
  - *Local note:* `packages/sdk/tests/bridge-observe.test.ts` B-NOTIFY-NOWAKE failed once in a loaded local full
    run (5,211 of 5,212) and passed three times alone; `packages/` is unchanged from B.
  - *Next:* an independent review by a Codex GPT-6 session that has not worked on this packet. No self-acceptance.
    After an ACCEPT: Prompt C cleanup by a fresh session, then the owner's merge. E1 round 3 is the benchmark
    owner's separate release.

- **Design check 01 disposed; build released by the owner (2026-11-14).**
  - *Check:* design check 01 (Codex GPT-6, `codex/k1.4-candidate-design-check-01` at
    `e06984a9573efd1524692ab74332eb7744941bcf`), APPROVED WITH REQUIRED CHANGES D01-CHK-01..09. Read by commit;
    not merged.
  - *Owner:* [owner choice 02](owner-choice-02.md): Q1 a by command capability, Q2 b with Q2 a as the root fix,
    Q3 b with the episode key `(state, activationId, writerEpoch)`, Q4 limits, Q5 and Q6 yes. KC-3 is 12 PASS and
    3 REFUSED, pinned exactly. The gate is E1's predeclared K1 matrix; the 3 dependency-alternative schedules and
    D01-CHK-04 move to K2's E2 gate. 007 and both roadmaps amended.
  - *Design:* [addendum 01](design-01-addendum-01.md) disposes the nine findings and names the five ablations.
  - *Next:* build in this packet with no new design check; Kernel source unchanged; C, Packet verify in CI,
    implementation report 01, H, 007 WAITING_FOR_REVIEW. No self-acceptance.
  - *Local Node:* v26.10.0 is at `~/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin`; put it first in PATH.

- **Owner choice 01 recorded (2026-11-14): "Confirm Q7".** [Owner choice 01](owner-choice-01.md).
  - *Roles:* this Claude Fable 5.2 session implements. A Codex GPT-6 session does the design check and the review;
    a Claude Opus session does them if GPT-6 is out of quota.
  - *Open:* Q1–Q6 of [design 01](design-01.md), which wait for design check 01 and the owner's disposition.
  - *Code:* none. Build nothing yet.
  - *Next:* design check 01 of design 01 at `c237db58441eccfa6d59e59779068ab9b93a203d`.

- **Design 01 written; stopped for the owner (2026-11-14).** Branch `claude/k1.4-candidate` from base B
  `c1951226338de6ccd3e4e6289259549551268f61`. Implementer: a Claude Code desktop session on Claude Fable 5.2
  (`claude-fable-5-2`), assigned by the owner; release 01 names Claude Opus 5.5 (design 01 Q7).
  - *Design:* [design 01](design-01.md) answers brief 01's three suspect designs and four questions.
  - *Stop conditions fired (design 01 §1):*
    - S1: `control-stale-timer-and-lost-wake`, `wait-structure-not-satisfiability` and `cited-decision-edges`
      need a trusted non-timeout Event source. The K1 Kernel has none ([017](../../017-known-limitations.md) L-21).
    - S2: `control-subscription-wait-deadline` step 6 expects `to-gd2`, a Kernel-minted timeout Event no command
      names.
    - S3: the corpus does not say when `Observation.rejection` ends; `identity-create-and-activation` step 3 and
      `control-whole-envelope-validation` step 7 pull apart.
    - S4: `effectIntents` has no Kernel source; the ledger assertions are vacuous at K1.
  - *Predicted, by reading only:* 10 scenarios pass as they are; 2 fail at one step each (S2, S3); 3 cannot run
    (S1). Nothing has been run against the Kernel.
  - *Code:* none. No candidate, test or probe file exists. The fixture and the Kernel are untouched.
  - *Baseline at B:* `npm run typecheck` exit 0; `tests/conformance/k0/*.test.ts` 810 of 810, on local Node
    v25.2.1, which is below the 26.10.0 floor. Informational; Packet verify in CI at the first C is the baseline
    of record. No local Node 26.10 was found.
  - *Next:* the design check (a session that has not worked on this packet), then the owner's answers to Q1–Q7.
    No build before both. On resume, read design 01 §9 and the owner's dispositions first; the build's first act is
    the real run of the scenarios the answers leave runnable.
