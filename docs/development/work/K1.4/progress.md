# K1.4 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Range B (K14-4, K14-5, K14-6, docs), 2026-11-07.** Built on top of range A. **C (ranges A and B):**
  `8c513dfa1a51861edb6a0059d0bf777bf477976f` (pushed). Packet verify CI run
  [`42361468266`](https://github.com/ArrokothI/arrokothi/actions/runs/42361468266) dispatched on it; its result is the
  handoff evidence. Fresh-clone checks before dispatch (Node v26.10.0): `corpus` `mappings_complete`, `inventory`
  `provenance_verified`, `coverage` `coverage_reported`, value-cost `cases` `selected_cases_passed`, tool tests 777 OK,
  example tests 18/18. The C's only change after those runs is the repository-tests floor (4,832 → 4,897).
  Next: read the run; if green, write `implementation-01.md` and mark review-ready in 007.
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
