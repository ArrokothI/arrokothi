# K1.4-candidate progress

The resume point for any session continuing this packet. Newest facts first.

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
