# K1.4 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Round 5 payload C: `72d452bb39e0ae0f846d85e273441d06a9cd22fb`** (pushed, 2026-11-11), directly on round 4's H `1b98a76e`.
  - *Review:* [review 04](https://github.com/ArrokothI/arrokothi/blob/8ca7288b041d376dad7a8c12f083e43427bbb101/docs/development/work/K1.4/review-04.md) (Codex GPT-6, `codex/k1.4-review-04` at `8ca7288b`) is CHANGES REQUIRED of H
    `1b98a76e`: one P2 prose finding, K14-R4-01 (brief 05). L-36, L-37, F1–F3 and the closed dispositions stand.
  - *Owner:* deviation 1 "Confirm both cases"; deviation 3 "Review as is", with the comment-only fix taken now.
  - *C:* comments and documents only. `driver.ts`, `application.ts` and `types.ts` comments say the Driver requests
    native cancellation; only `terminate` turns a rejected request into a hold. L-36, the baseline and its limits
    index, the quick start and `verification.json` follow; dated corrections in reports 03–04 and design 04. Packet
    verify CI run [`43131441604`](https://github.com/ArrokothI/arrokothi/actions/runs/43131441604) on it: `checks_passed`, 19/19 (repository tests 5,054/5,054).
  - *H:* [implementation report 05](implementation-05.md), the 007 entry and this file. **WAITING_FOR_REVIEW.**
  - *Next:* an independent review bounded by brief 05; no self-acceptance.
- **Round 4 payload C: `697922e251a572d0c96f7a02c1b646b607c351fc`** (pushed, 2026-11-11). It sits on `739a0586`, superseded
  before any H because it changed the preserved design 02.
  - *Review:* [review 03](https://github.com/ArrokothI/arrokothi/blob/5e36d514fb10347a182bbeaa36879ce9074fe72a/docs/development/work/K1.4/review-03.md) (Codex GPT-6, `codex/k1.4-review-03` at `5e36d514`) is CHANGES REQUIRED of H
    `b1769c0f`: K14-R3-01..03, the third in this subsystem, so owner choice 05's route (d) applies.
  - *Owner:* [owner choice 06](owner-choice-06.md): R3-01 "Record limit" (017 L-36), R3-02 "Promote as tests",
    R3-03 "Record exclusion" (017 L-37). No production change.
  - *C:* L-36 and L-37; rows F1–F3 kill the three `cancel.*` labels; B-TERM-LIMIT and the L-37 exclusion tests keep
    review 03's counterexamples with the recorded behaviour; the baseline, guides and mapping narrowed; dated
    corrections in designs 03–04 and reports 02–03. Packet verify CI run [`43088962951`](https://github.com/ArrokothI/arrokothi/actions/runs/43088962951) on it: `checks_passed`, 19/19 (repository tests 5,054/5,054).
  - *H:* [implementation report 04](implementation-04.md), the 007 entry and this file. **WAITING_FOR_REVIEW.**
  - *Next:* the bounded GPT-6 review 04 against brief 04; no self-acceptance. Report 04's deviation 1 asks the owner
    to confirm L-36's cancelled variant.
- **Round 3 payload C: `3e8b4bac60266fda3e277ae0dd381c4936e15ff3`** (pushed, 2026-11-08).
  - *C:* builds R2-01 and R2-02 per design 04 and its §6 addendum (D04-CHK-01..03). The Driver schedules every
    READY member on each `continue`; a failed cleanup is reported as a Kernel hold; the cleanup oracle comes from
    the source. Packet verify CI run [`42528215484`](https://github.com/ArrokothI/arrokothi/actions/runs/42528215484) on it: `checks_passed`, 19/19 (repository tests 5,034/5,034).
  - *H:* [implementation report 03](implementation-03.md), the 007 entry and this file. **WAITING_FOR_REVIEW.**
  - *Next:* independent cumulative re-review of H over C and B; no self-acceptance. Owner choice 05's fallback
    applies: a third CHANGES REQUIRED in this subsystem routes to (d), a recorded limit.
- **Narrow redesign after review 02** (2026-11-08).
  - *Review:* [review 02](https://github.com/ArrokothI/arrokothi/blob/b655733b9b90810eca747c61b8f2095f5f201341/docs/development/work/K1.4/review-02.md)
    (Codex GPT-6, `codex/k1.4-review-02` at `b655733b`) is CHANGES REQUIRED of H `96214874`: K14-R2-01 (a lost
    post-commit enqueue strands settled READY work) and K14-R2-02 (no maintained discriminator for the `hold`
    cascade). Stop-and-redesign fired.
  - *Owner:* [owner choice 05](owner-choice-05.md) is "(a) Narrow redesign": only R2-01 and R2-02, with a new bounded
    design check; route (d), a recorded limit, if review 03 finds a third CHANGES REQUIRED in this subsystem.
  - *Design:* [design 04](design-04.md) answers brief 03: the Driver schedules unqueued READY members from its own
    root, with no read (R2-01); one label per cleanup call site, a static census and a label-by-row ablation
    oracle, plus live-lineage T13 (R2-02).
  - *Design check:* [design check 04](https://github.com/ArrokothI/arrokothi/blob/dc21f8e989b0828a236d65d3988eb9ade5391af3/docs/development/work/K1.4/design-check-04.md)
    (`dc21f8e9`) is APPROVED WITH REQUIRED CHANGES D04-CHK-01..03; design 04 §6 disposes them.
- **Round 2 payload C: `3e4c59faa7b6138693bb9094144cafff7a33158e`** (pushed, 2026-11-08).
  - *Design:* [design check 03](https://github.com/ArrokothI/arrokothi/blob/3e55960e0493854490ac83a420ee12295c003e82/docs/development/work/K1.4/design-check-03.md)
    (`3e55960e`) is APPROVED WITH REQUIRED CHANGES D03-CHK-01..03. The design 03 §8 addendum (`c306fe38`)
    disposes them; [owner choice 04](owner-choice-04.md) is "Amend L-29".
  - *C:* builds R1-01..05 with those changes. Packet verify CI run [`42451451228`](https://github.com/ArrokothI/arrokothi/actions/runs/42451451228) on it: `checks_passed`, 19/19 (repository tests 4,957/4,957).
  - *H:* [implementation report 02](implementation-02.md), the 007 entry and this file. **WAITING_FOR_REVIEW.**
  - *Next:* independent cumulative re-review of H over C and B; no self-acceptance.
- **Correction round after review 01** (2026-11-07). Review 01 (Codex GPT-6, `codex/k1.4-review-01` at
  `0f415d6e016824ea9bddac0ca7aca3fd2d3accb5`, read by commit, not merged) is CHANGES REQUIRED of H `072f9627`:
  K14-R1-01..05; its brief 02 governs this round. [Design 03](design-03.md) answers brief 02's five questions
  (validated double-collect observation and commit signal; Kernel-recorded destination on keyed retries; one batch
  ledger; scheduler-first construction; one `terminate` with a trigger table and per-exit mutants). No owner
  question. **Next:** the design check of design 03; no code before it.
- **Payload C for review: `0d05d32971dfeda89dc874450e38f440af2c4a1d`** (pushed, 2026-11-07). The owner chose a
  new C for [owner choice 03](owner-choice-03.md) ("Approve": the six limited-origin extras are authorized by owner
  choices 02 D, with no adoption credit). C equals `ad6ee133` plus two `administrative_files` entries in
  `verification.json` (the record and its member list) and two candidate-check repairs found by a trial
  `packet_tools.py candidate` run: the whitespace-exception file preserved at `72e6f5ec`, and a trailing blank
  line removed from `bridge-inventory.test.ts`. It sits on `9a992bdc` (allowlist only) and H `81e625a5`, both
  superseded before review. Packet verify CI run
  [`42405868481`](https://github.com/ArrokothI/arrokothi/actions/runs/42405868481) on it: `checks_passed`, 19/19
  (repository tests 4,897/4,897).
  (`42405639257` at `9a992bdc` and `42405606091`, dispatched by mistake at `81e625a5`, were cancelled.) **WAITING_FOR_REVIEW:**
  [implementation report 01](implementation-01.md), the 007 entry and owner choice 03 with its list are H. Next:
  independent review by Codex GPT-6 of H over C and B; no self-acceptance.
- **`ad6ee1335fbf5c0ef7524fe56b16794f9263096a`** (2026-11-07), the previous payload. Packet verify CI run
  [`42391948564`](https://github.com/ArrokothI/arrokothi/actions/runs/42391948564) on it: `checks_passed`, 19/19
  (repository tests 4,897/4,897). It differs from `8c513dfa` only by the self-review fixes: G-MEMORY's vacuous
  `memory.executions` check, S-RT-NATIVE now passing `activationBudget` and `securityProfile`, and one values-page
  sentence. `regenerate` is `table_current` at it in a fresh clone.
- **Range B (K14-4, K14-5, K14-6, docs), 2026-11-07.** Built on top of range A. First range-B C:
  `8c513dfa1a51861edb6a0059d0bf777bf477976f` (pushed). Packet verify CI run
  [`42361468266`](https://github.com/ArrokothI/arrokothi/actions/runs/42361468266) on it: `checks_passed`, 19/19,
  exit 0 (repository tests 4,897/4,897). Fresh-clone checks before dispatch (Node v26.10.0): `corpus` `mappings_complete`, `inventory`
  `provenance_verified`, `coverage` `coverage_reported`, value-cost `cases` `selected_cases_passed`, tool tests 777 OK,
  example tests 18/18. The C's only change after those runs is the repository-tests floor (4,832 → 4,897).
  - K14-5: `toCanonicalBytes`, `ValueIssue` and `WrapperEnvironmentError` exported through `packages/sdk/src/wrapper.ts`
    (the seam guard keeps `index.ts` from naming `value-capture`). The L-01 check (`checkSerializerEnvironment`, appended
    after the capture prefix) runs in `createApplication`, in `toCanonicalBytes` and inside the serializer window
    before the dependency call. B-WRAPPER (`wrapper-environment.test.ts`, 7 tests, fresh processes); an ablation of
    the in-window call fails the capture-time case. `binding-surface.test.ts` re-pins: importers of `internal/` are the
    codec and `wrapper.ts`; the prefix hash is B's once the L-01 call and the widened own-array import are removed.
    The DEC-8 inventory gains the eight free reads; the KC3 metering check gains an `environment` helper kind.
  - K14-4: `bridge-inventory.test.ts`, 52 rows plus 2 closure tests (TypeScript enumeration of SDK-declared members,
    documentation extraction E1–E4 over the 18 reachable guide pages, the SDK README, the builder skill and the
    examples, with a synthetic-page control). It builds its own TypeScript program, so it stays outside the Kernel
    quarantine list.
  - K14-6: `tests/conformance/legacy-mapping.json` (164 files: 79 R, 38 U, 12 S, 11 X, 7 P, 7 N, 6 G, 4 M) and
    `tests/conformance/architecture/legacy-mapping.test.ts`. The test sits under `architecture/` (design 01 §12 named
    `tests/conformance/mapping.test.ts`), because `npm test` runs only `tests/conformance/*/*.test.ts`. B-MAP's cases are
    B-QUIESCE-CELLS since design 02 D01-CHK-02, and B-CONV is B-WAKE. The 11 X files carry a two-line header note.
  - Docs: quick start (Kernel-routed host actions, start options, migration table), new
    `docs/guides/deployment/values-at-the-boundary.md`, capabilities/diagnosis/hosting/authoring/state guides, SDK
    README, builder skill, example README; Layer 3 (integration status line and acknowledgment sentence,
    execution-cycle host pumping, reference index row); BASELINE header and §16; 017 L-01 narrowed, L-20 amended,
    L-29 to L-35.
  - `verification.json`: `docs/guides` and `.agents/skills` leave the preserve list; limits rewritten for both ranges.
  - Fixtures: `value-cost-source-files.json` adds `wrapper.ts` (194); the adoption preserved table regenerated in a
    fresh clone (418 members' read data; status counts unchanged); `corpus` `mappings_complete` at `5715a32f`.
  - Local: typecheck exit 0; `npm test` 4,897/4,897 (0 fail, 0 skipped) at `789e8c35`; `check:builder-docs` passed.
- **Phase:** IN_PROGRESS (2026-11-07), build, range A done (CI green), range B built (above). [Owner choices 02](owner-choices-02.md) and
  [design 02](design-02.md) are pushed (`13893791`). Range A (the bridge and the switch, K14-1..3) is built:
  - `packages/sdk/src/legacy-bridge/`: `driver.ts` (the only SDK file that constructs a `Harness`),
    `lineage-scheduler.ts`, `root-ids.ts`, `codec.ts`, `classify.ts` (the D01-CHK-02 predicate),
    `harness-view.ts` (Q2 refusals);
  - `packages/sdk/src/host.ts` (the coordinator, dispatch, timer pumping, known-state ledger) and the
    rewritten `application.ts` (`start` creates the root synchronously, owner choice A; `input`,
    `resolveConfirmation`, `cancel`, `inspect`); option dispositions; `"private": true` (owner choice D);
  - K14-3: `legacy-bridge` zone and `zoneOf` (longest prefix), `bridgeBoundaryViolations` with
    rejected-edge controls (`legacy-bridge-boundaries.test.ts`), the quarantine and builder-docs admission
    lists (`SDK_KERNEL_IMPORTERS`), and `kernel-ownership.md`'s tables;
  - migrated tests: `packages/sdk/tests/application.test.ts`, the examples and their `settle.ts`, and two
    restated `binding-surface.test.ts` assertions (D01-CHK-06);
  - the bridge corpus `packages/sdk/tests/bridge-*.test.ts` (design 02 §3, range-A items).
  **Range-A C:** `1fab55494ac299d12906edbfa827808f6817efb1` (pushed). Packet verify CI run
  [`42347496157`](https://github.com/ArrokothI/arrokothi/actions/runs/42347496157) on it (2026-11-07, 06:33–08:34 UTC,
  Linux x86_64, Node v26.10.0): `checks_passed`, exit 0, all 19 checks passed, including `repository-tests`
  4,832/4,832, `example-tests` 18/18, `tool-tests` 777, `adoption` `mappings_complete`, `inventory`
  `provenance_verified`, and all three mutation registries `selected_cases_passed`.
  - The first C, `1e0f04ff`, failed CI run [`42334517878`](https://github.com/ArrokothI/arrokothi/actions/runs/42334517878)
    on one check: `value-cost-mutants`, 238 `invalid_baseline` controls. The value-cost source policy compares the
    production tree with `tests/fixtures/packet-tools/value-cost-source-files.json`, which did not list `host.ts` and
    the six `legacy-bridge` modules (the fix K1.3 made for its two Kernel modules in `7d9be1bc`). The other 18 checks
    passed there, including `repository-tests` 4,832/4,832, `adoption` `mappings_complete`, both other mutation
    registries, the sweeps and the race search.
  - `1fab5549` adds the seven files to that inventory and changes nothing else. At it, the source policy passes over
    193 files, and the value-cost controls (`cases`) return `selected_cases_passed` in a fresh clone.
  - Local checks at `1e0f04ff` in a fresh clone (Node v26.10.0): typecheck exit 0; `npm test` 4,832/4,832, 0 fail,
    0 skipped (B: 4,766); example tests 18/18; `check:builder-docs` passed; tool tests 777 OK (working tree);
    `regenerate` `table_current`, `corpus` `mappings_complete`, `inventory` `provenance_verified`, `coverage`
    `coverage_reported`.
  Next: range B (design 02 §5).
- Range-A adoption-fixture maintenance (`tests/fixtures/packet-tools/adoption.json`, TOOLS-02 tools only):
  - the hold register: 188 `kernel-landing-zone.test.ts` keys rekeyed through the B→C line mapping (no
    classification changed), and one new `not_held` V-ENV entry with a per-entry reading for the new child-process
    control in `builder-docs-anchor.test.ts`, by the route TOOLS-02 range 4 used for that file;
  - the 18 landing-zone suite-target declarations moved by the same mapping;
  - the preserved table regenerated: six landing-zone tests whose bodies K1.4 changed (the SDK is no longer the
    published-package example; the host-sdk row gained reaches) move `unread` → `refused` under both pins (12
    members). Unread members carried no credit (L-17), so no credit is lost. Their 12 `unread_witness` records and
    their links are removed;
  - the six `deedd7950724` members sit in a limited origin (TOOLS-01 owner choices 04 and 11), so each gets an
    `authorized_replacement` suite target on its current test, passing P1-T apart from the unread register entry at
    its declaration, and is admitted as an `extras` entry, as earlier packets did for K1.2's row changes;
  - `builder-docs-anchor.test.ts`'s new control uses its own variable names, so the existing target's anchors stay
    unique.
- Range-A notes for the review:
  - The legacy effect processor already abandons a spawn or capability dispatch once the native cancellation
    request is recorded (`abandonIfCancellationPending`, inside the commit). The Driver's post-step cascade
    covers the window before that record lands; B-CANCEL-MIDSTEP-CHILD holds that window open with a gated
    store read, and an ablation of the post-step cascade fails it.
  - A full local SDK suite once timed out the `capture-continuations.mjs small` child (900 s) under parallel
    load; run alone it takes 43 s with 0 violations (the L-16 pattern).
- Design history: [design 01](design-01.md) pushed `e06e6e71`; [owner choices 01](owner-choices-01.md) and the
  decision-02 amendment note pushed `6831b112`.
- Design 01 in brief: one legacy Driver privately owns the 0.8.x `Harness` as the native Runtime. Each Kernel
  Execution has one native lineage whose root shares the Kernel ID. Each exchange runs one native step: `continue`,
  `await` with input subscriptions at native quiescence, or `complete`/`fail`. A lineage scheduler gives each
  Execution its own worker. The SDK host dispatches READY Executions and pumps timers inside host calls only.
  Replies to native pauses travel as Kernel input. `app.harness` becomes a deprecated read view. The wrapper is
  exported with the L-01 startup check. Recommended shape: one packet, ranges A (bridge) and B (surface and
  migration), one review.
- Branch: `claude/k1.4` in its own worktree (`../wt-k1.4` beside the main checkout). B:
  `608f9ece44dbe42b78974bdac9e7ddcd33697705` (main after PR #66).
- Implementer: Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), Mac arm64, 2026-11-05. Not the adversary,
  design checker or reviewer.
- Setup: prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; `node --version`
  is `v26.10.0`.
- B baseline (fresh clone from GitHub at B, `npm install`, Node v26.10.0): `npm run typecheck` exit 0; `npm test`
  exit 0, 4,766 tests, 4,766 pass, 0 fail, 0 skipped, 523 suites.
- Command plan (build phase): a `verification.json` modelled on K1.3's runs the composed verify in
  [Packet verify](../../../../.github/workflows/packet-verify.yml) from the first C. Before each dispatch, run the
  tool tests, both mutation registries and the full verify in a fresh clone. Regenerate
  `tests/fixtures/packet-tools/adoption.json` only with TOOLS-02's `regenerate`, in a fresh clone.
