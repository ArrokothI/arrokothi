# TOOLS-02 progress

The resume point for any session continuing this packet. Newest facts first within each list.

- **Phase:** IN_PROGRESS, range 1 build (T2-1, T2-2) under design 02 with D02-CHK-01's completion.
- **Range 1 candidate:** C2 `a6ce515018c2bd59a930b20c762a339089bb0973` (local until its fresh-clone checks pass).
  - C1 `c8074099` failed its fresh-clone mutations registry: three new read-form mutants returned `setup_error`,
    because `python-probe.py` found no unique reach anchor (an empty or repeated replacement). C2 adds
    `test_target_tools.ProbeAnchorTests`, which applies the probe's anchor rule to every python-probe mutant in every
    registry before any registry runs, and gives the three mutants unique replacements. C1 was never pushed or
    dispatched.
  - At C1, in a fresh clone: tool tests 638 OK (687 s); `value-cost.json` passed (1,324 s).
  - Next: fresh-clone checks at C2 (regenerate check, tool tests, both registries, full verify), push, one CI dispatch,
    record the run ID here. If CI passes: H1 with `implementation-01.md` (008, range 1 only), push, stop for the
    range-1 review.
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
