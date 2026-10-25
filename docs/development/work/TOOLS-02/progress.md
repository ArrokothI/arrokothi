# TOOLS-02 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** IN_PROGRESS. [Owner choice 04](owner-choice-04.md) picks 006's refined finishable claim: an explicit
  supported matrix, refusing any traced call outside it and any recursive listing that crosses a symlink.
  [Design 05](design-05.md) states the matrix and waits for a short GPT-6 design check; no code before it.
  - [Review 02](review-02.md) (GPT-6, 2026-10-24) of H `7791cda6` over C4: CHANGES REQUIRED.
    - T2-R2-READ-01: Node 26.10's recursive `readdir` (sync and promise) descends symlinked directories, and
      `tree_listings` follows only git subtrees. Design 04's claim that Node does not descend them was untested
      and wrong; recursive `opendir` does not descend them.
    - T2-R2-PATTERN-01: `globSync([...])` is traced as `{path: null, argument: 'object'}`, and `compared_reads` drops it
      before `pattern_refusal`.
    - The implementer confirmed both directly. T2-2 passed again. The repository's only symlinks are four under
      `.claude/skills`.
    - Root cause (review 02): calls are compressed to a path and a kind before checking that the representation covers
      the call, so unrepresentable shapes are dropped rather than refused.
  - Earlier: range 1 round 2 at H `7791cda6` with [implementation 02](implementation-02.md) over C4; CI run
    40132829525 passed.
  - [Review 01](review-01.md) (GPT-6, 2026-10-24) of H1 `f2184fc6`: CHANGES REQUIRED. T2-R1-READ-01: a
    `{ recursive: true }` listing of `tests/fixtures` keeps a stale identity, because the trace drops listing options
    and `listing()` returns immediate children only. T2-2 passed. The implementer reproduced the probe at C.
  - Nearby forms found by the implementer: `glob` rows record the pattern as a path (always absent), and sync,
    callback and promise recursive `readdir` record only the root. Only `tests/fixtures` is a fixtures directory.
  - [Design 04](design-04.md) answers brief 02's four questions. The owner directed the build without a design check.
  - **C3** `df80badc6502aa9da6315367032fb211a1bf0232` (local until its fresh-clone checks pass):
    - tracer flags and `tree`/`pattern` read kinds, typed listings, and review 01's probe as
      `RecursiveListingCensusTests`, with 5 new killed mutants;
    - tool tests 651 OK on the working tree (717 s);
    - regeneration: 7 `mcp-boundaries` members go from preserved to refused (preserved 30 → 23, refused 228 → 235);
      418 rows gain fixture reasons; no other status change.
  - The draft `implementation-02.md` waits in the session scratchpad for H.
  - First fresh-clone run at C3 (2026-10-24), on a heavily loaded machine (load average up to 41 on 8 cores, with
    macOS services `BTLEServer`, `ANECompilerService` and `mediaanalysisd` busy):
    - passed: regenerate `table_current`; tool tests 651; `mutations.json` 130 killed;
    - failed: `value-cost.json` (3 `bookkeeping-trace` mutants hit ETIMEDOUT, 017 L-16) and the full verify
      (adoption: 158 `value-capture.test.ts` rows differ, the whole file refused);
    - the same clone's census matched the table in two of three runs. The traced file passes alone (84/84 in 4 s)
      and in 12 parallel copies. A full `npm test` there hit `spawnSync ETIMEDOUT` in `capture-stop.test.ts:177`
      (4,397 of 4,412 ran). Cause: 60 s child-process limits under load, which predate the correction.
  - Owner decision: wait for a quieter machine, then rerun `value-cost.json` and the full verify locally before
    dispatching. A background job waits until the 1- and 5-minute load averages stay below 4, then runs both.
  - Quiet rerun at C3 (load about 4): `value-cost.json` 238 killed; the full verify's census matched, but its adoption
    step refused two complete `mcp-boundaries` origins whose seven formerly preserved members are now refused with no
    linked target. [Owner choice 03](owner-choice-03.md) reopens both as `pending_revalidation`, transferred to range 4.
  - **C4** `5ab098bd893e3d39f58851276926abea81e5a5d8`, pushed: owner choice 03 applied in the manifest. Packet verify CI
    run [40132829525](https://github.com/ArrokothI/arrokothi/actions/runs/40132829525), dispatched 2026-10-24; not polled.
    - Fresh clone at C4 before dispatch (quiet gate; load about 3–5, briefly higher): regenerate `table_current`
      (254 s); `corpus` `revalidation_complete`, 123 transferred origins (285 s); tool tests 651 OK (677 s);
      `mutations.json` 130 killed (674 s); `value-cost.json` 238 killed (1,063 s); full verify, all 18 checks passed
      (3,901 s).
  - Next: review 02 of H. After range 1 integrates, ranges 2–4 in design 01 §9's order; range 3 under design 03 §6.
- **Earlier range 1 candidate (reviewed in review 01):** C2 `a6ce515018c2bd59a930b20c762a339089bb0973`, pushed. Packet verify CI run
  [40064371529](https://github.com/ArrokothI/arrokothi/actions/runs/40064371529), dispatched 2026-10-24; not polled.
  - Fresh clone at C2, before dispatch: regenerate `table_current` (no member changed; 255 s); tool tests 639 OK
    (602 s); `mutations.json` 125 killed (596 s); `value-cost.json` 238 killed (1,044 s); full verify, all 18 checks
    passed (3,628 s).
  - C1 `c8074099` failed its fresh-clone mutations registry: three new read-form mutants returned `setup_error`,
    because `python-probe.py` found no unique reach anchor (an empty or repeated replacement). C2 adds
    `test_target_tools.ProbeAnchorTests`, which applies the probe's anchor rule to every python-probe mutant in every
    registry before any registry runs, and gives the three mutants unique replacements. C1 was never pushed or
    dispatched.
  - At C1, in a fresh clone: tool tests 638 OK (687 s); `value-cost.json` passed (1,324 s).
  - Next: the range-1 review of H1. After range 1 integrates, ranges 2–4 in design 01 §9's order; range 3 builds
    under design 03 with its §6 addendum.
- **Design 03 (T2-4 only), on branch `claude/tools-02-design-03`** (its files are not on this branch yet):
  - `owner-choice-02.md` records the owner's words ("plan A: a refined finishable claim") and the
    effect;
  - `design-03.md`, checked by GPT-6's `design-check-03.md` (`d0b18b0d`, committed
    unchanged): APPROVED WITH REQUIRED CHANGES (D03-CHK-01);
  - design 03 §6 (`c71818c8`) answers D03-CHK-01 (C2-LIMIT binds to the released V-ENV claim) and adopts the check's
    §5 answer (no executable `limit` class). Under 006 this is a routine correction, with no further design check;
    the range-3 review checks it.
  - Range 3 waits for range 1's integration.
- **Design check 02:** GPT-6 [design check 02](design-check-02.md) (`6e96639a`) closed D01-CHK-02, -03, -04 and -06.
  D02-CHK-01 (completed in range 1) and D02-CHK-05 (settled by owner choice 02) remained.
- **Design check 01:** Codex GPT-6 [design check 01](design-check-01.md) (`9ca58fbe`, fast-forwarded onto this branch)
  returned REDESIGN, with findings D01-CHK-01 to D01-CHK-06.
- **Owner choice 01:** [owner choice 01](owner-choice-01.md) settles D01-CHK-01 by amending T2-1 (option A) and adopts
  `recorded_limit` and 017 L-16. It also gives range 1 (T2-1 and T2-2) its own narrow review and integration on main
  before the rest.
- **Design 02:** answers D01-CHK-02 to D01-CHK-06 as follows.
  - Identity-at-C record form; directory existence reads follow the listing rule.
  - Guards at the CLI dispatch and inside the census routes; a bounded-vocabulary writer census.
  - Invocation-bound witness; checked source set for trees without `packages/`.
  - `unread` class (design 03 replaces design 02 §4's environment observation).
  - Frozen population; reviewer-chosen seed; re-audit rule; rate bound for small populations.
- **Earlier phase:** [design 01](design-01.md) pushed at `1aec8b62`.
- **Branch:** `claude/tools-02`, from B `b5daf35aeee37305c1ee41bb626c97d26db94ab2` (main after PR #58, which merged
  [release 01](release-01.md) and [brief 01](brief-01.md), scope B).
- **Implementer:** Claude Code desktop, Claude Opus 5.5 (`claude-opus-5-5`), Mac arm64, 2026-10-23 America/New_York.
  The design checker and the reviewer are Codex GPT-6 sessions.
- **Setup:** prepend `/Users/rex-shih/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` to PATH; `node --version`
  is `v26.10.0`. The owner's main checkout holds ignored files (`.env`, `docs/development/work/K1.1/`), so run the census,
  `corpus` and `verify` only in a fresh clone (`git clone --no-local`, `npm ci`, nothing untracked).
- **B baseline** (fresh clone, local): `npm run typecheck` exit 0; `npm test` 4,412/4,412 pass.
- **Command plan:** `verification.json` (written in range 1, modelled on COORD-REFACTOR-01's) runs the composed verify in
  [Packet verify](../../../../.github/workflows/packet-verify.yml).
  1. Before each dispatch, in a fresh clone: `tool-tests`, both mutation registries (`mutations.json`, `value-cost.json`)
     and the full verify.
  2. Dispatch: `gh workflow run packet-verify.yml -f revision=<full C> -f spec=docs/development/work/TOOLS-02/verification.json`.
  3. Record the run ID here and end the turn. Never poll.
- **Build order after the check** (design 01 §9):
  1. Range 1: T2-1 and T2-2. It is self-contained, verified at C1, and K1.3 waits on it.
  2. Range 2: T2-3.
  3. Range 3: T2-4.
  4. Range 4: T2-5's triage, extraction and P3 items.
- **Declared before any triage** (design 01 §5.4, as amended by design 02 §5):
  - the rule S1–S6;
  - the classes `not_a_counterexample`, `covered_elsewhere`, `superseded` and `recorded_limit` (adopted by owner
    choice 01);
  - the audit over the retired population frozen at H: n = 150, with a reviewer-chosen seed recorded with H's SHA
    before sampling, and a bound of at most ⌊0.02·n⌋ unsafe errors;
  - relevance samples of 10 + 10, also with reviewer-chosen seeds;
  - a re-audit rule;
  - an implementer self-audit before H only, with n = 50 and seed 20261026.
- **Measurement scripts** live in the session scratchpad and are not committed. Design 01 §1.1 and §4.1 state their
  results.
