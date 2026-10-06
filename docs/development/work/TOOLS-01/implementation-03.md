# Implementation 03 — TOOLS-01, round 3 (correction after reviews 01 and 02)

## Identity

- State: **WAITING_FOR_REVIEW**, entered by the implementer; this is not acceptance. Contract
  [revision 9](contract.md); the 006/008/012 policy is pinned at `b759d0ab…`, per the contract.
- Implementers:
  - Codex (GPT-6) through design 05 steps 1–7, step 8 part 1, repairs 01–02 and item 1;
  - Claude Code for items 2–6 (round 2);
  - this round, a new Claude Code session (`claude-opus-5-5`) under [owner choice 08](owner-choice-08.md),
    2026-10-05/06, with no part in items 2–6 or either review.
- Owner authority: [release 01](release-01.md); owner choices [01](owner-choice-01.md)–[09](owner-choice-09.md).
  Owner choice 08 binds at `9e84b587`, owner choice 09 at `2b48e40e` (its contract diff applies with
  `git apply`), and the design check approval at `9b2aafcd` (REC-02).
- Base B: `f62527e8d564a6e2f63b83cbb52e24053f333540`. Branch: `codex/tools-01`. Previous H:
  `446dd25820500db4e0eb3d6940ec49e45634f39c`; [review 01](review-01.md) and [review 02](review-02.md),
  both CHANGES REQUIRED.
- Payload C: `28258b282532b36eef8fb1571d79b6343b54427b`, pushed. Two earlier Cs failed: `b94e3bef`
  its composed verify and `ca28491d` the candidate check (below). H is the commit containing this
  report, a direct child of C. By the owner's instruction H is committed locally and not pushed; its
  SHA is in the handoff. A first H (`e6468b40`, child of `ca28491d`) was never pushed and is superseded.
- C..H allowlist ([verification.json](verification.json)): this report and
  `docs/development/007-work-packets.md`. The implementer does not edit 007; the design author adds the
  row below to H.

## Changes and coverage (cumulative since [implementation 02](implementation-02.md))

| Commit | Change |
|---|---|
| `e39a8b10`, `2b48e40e` | Contract revisions 8 (owner choice 08) and 9 (owner choice 09) |
| `56af8c4e`, `2d76d441`, `ae53c984` | [Design 06](design-06.md) revisions 1–3; checks [01](design-06-check.md) (`b66688c6`) and [02](design-06-check-02.md) (`9b2aafcd`) |
| `4a914a46` | R1-02: one Markdown block parse for fences and minimum context |
| `2e4ff422` | R1-03 and C2-LIMIT: pinned transfer lists; [owner-choice-04/limited-origins.json](owner-choice-04/limited-origins.json) |
| `c157e096` | R1-04: target-set mutations report observations, never kills (owner choice 09) |
| `98fd91d3` | Self-found: the `helpers` table keys a null-prototype object |
| `5894346e` | R1-01 and §2: the V-ENV run-set detector and the rule-1 structural check |
| `b94e3bef` | The adoption manifest regenerated (register, census, witnesses, targets, closures, transfers) |
| `ca28491d` | Unique subtest labels in `test_run_level_categories_stay_distinct` (verify failure at `b94e3bef`) |
| `28258b28` (C) | Trailing whitespace removed from owner-choice-09.md and 13 review-01 samples (candidate failure at `ca28491d`) |

- **012 methods.** Deterministic execution for the tooling: corpus fixtures for every finding, 307
  ablated refusals, 9 registered tool-result ablations, and the full corpus at C. Process review for
  the owner records and handoff.
- **Exclusions.** No Kernel, Runtime, hold-release or production claim. Race and fault apply only
  to the runner's bounded processes.
- **Tests.** 561 tooling tests (489 before). No production, Layer-3, sealed-record or 007 file
  changed. The only test-source edit in the packet is the floor fix in
  `tests/conformance/effects/fast-slow-equivalence.test.ts` (`89b49e53`), authorized by the owner's
  FLOOR-03-01 instruction recorded in [node-floor-04](node-floor-04.md) and kept by design 05 §6
  (REC-01).

### Findings

| Finding | Disposition |
|---|---|
| R1-01 (P1) | Fixed. V-ENV matches when the detector finds a write, writer call, escape, unread code, parse diagnostic, unresolvable test-side binding or an unclassified-value write anywhere in the leaf's run set. Review 01's four leaves (`creation:333:3`, `dispatch:615:3`, `values:893:3`, `values:910:3`) are rule-1 entries; their members are held witnesses and their targets left the table. |
| R1-02 (P1) | Fixed. `fenced_bytes` and `markdown_section` share `markdown_blocks`; an uncertain parse refuses closure; a fence origin closes only as a recognized closed fence. |
| R1-03 (P2) | Fixed. A transfer must be in its decision's digest-pinned list; review 01's 45th-origin and unrelated-decision fixtures are refused. |
| R1-04 (P1) | Fixed under owner choice 09. The target-set route never returns `killed`; skips, todos, cancellations, errors, assertion-like failures and missing or malformed provenance are visible observations. |
| VENV-01 (P2) | Option (b) by owner choice 08 §2. 188 entries are held by rule 1 and name owner-choice-08.md, including all 44 of review 02; category entries name decision-01, decision-05 or invalidation-02; the register refuses an entry naming neither a decision nor a reading. C2-LIMIT binds the limit to the 24 plus `dispatch:1363:3` and `dispatch:1426:3`, each through its target record. |
| REC-01, REC-02 (P3) | This report cites node-floor-04; owner choice 09's diff carries real hunk headers and approvals bind to commit SHAs. |
| HANDOFF-01 (P3) | Resolved by owner choice 08 §3 before this round. |

### Self-found defects (in the commit messages)

- A helper named `constructor` crashed source-facts (`98fd91d3`).
- R1-04 left the registered ablation `result.target-wrong-kill` anchored to removed code; it is
  re-anchored (`c157e096`).
- Node v26.10.0 reports a hook failure as `hookFailed`, not `hookFailure` (`c157e096`).
- **The composed verify at `b94e3bef` failed** (`attention_required`; run 1 below). Only
  `registered-mutants` failed: 108 of 109 cases killed, and `result.target-malformed` ended
  `setup_error`. `test_run_level_categories_stay_distinct` ran two subtests labelled
  `status='malformed'` (no catalog events; an invalid catalog tree). Under the mutant both failed, so
  `python-probe.py` reported the same failure name twice, and the runner's `observation()` refuses
  repeated failure names. It reproduced alone. The cause in the process: the check run on each new
  ablation before commit `c157e096` confirmed that the ablation made its test fail, but it did not
  apply the runner's unique-failure-name rule. `ca28491d` gives every subtest a distinct label; no
  assertion, expected value or registry entry changed. Before pushing it, the registered mutants ran
  alone at `ca28491d` through the runner itself (`mutations`): 109 of 109 killed in 478 s. Run 2 below
  is the composed verify at that C.
- **The candidate check failed at `ca28491d` for any H** (found by the owner). `candidate` runs
  `git diff --check B H`, and trailing whitespace had arrived after the last passing candidate
  (`446dd258`): owner-choice-09.md lines 43 and 48, blank context lines of its embedded diff written
  as a single space (`2b48e40e`), and 217 lines of review-01/sample-{01..07,09..14}.txt, line-numbered
  excerpts such as `14: ` (`c4a13bc2`). The implementer's candidate run on the first H stopped at the
  earlier C..H file-set refusal, which is expected until the 007 row is added, so it never reached
  the whitespace check. `28258b28` makes the two lines empty and strips trailing spaces and tabs from
  the samples, with review-01/manifest.json's `bytes` and `sha256` updated for exactly those 13 files.
  The embedded diff still turns contract.md at `e39a8b10` (revision 8) into a file byte-identical to
  revision 9 (`c6fcac95…`); outside the manifest, `git diff --ignore-space-at-eol` of review-01 is
  empty; `git diff --check f62527e8 28258b28` prints nothing. A `.gitattributes` exemption was not
  used, because git reads attributes from the checked-out tree. This time the candidate check ran in a
  throwaway clone on a scratch H carrying the proposed row (handoff).
- **The full record of `target.dispatch.1363.3.5a8d958ffdab` was never committed.**
  continuation-repair-01 keeps only its check facts, with anchors cut at 120 characters. It was
  restored from `step8/built-dispatch.json` in the scratch space of session `c9f0cfbb`, the session
  that imported the 391 targets (SHA-256 `d5ea1655…f7b278`; not retained in the repository). That file
  holds 43 dispatch targets: 34 were imported and equal the manifest's rows at `446dd258` byte for
  byte, 8 were never imported, and the 43rd is 1363:3. The restored record equals the file's, and its
  five anchors extend the committed check record's. At C it passes P1-T except the expected P1-H
  refusal (its leaf is held): all five anchors bound, reached and matched once; title `literal`;
  reach run `valid`.
- Two kernel tests walk the repository tree, so their traced reads digest its directories. In the main
  checkout the stray untracked `examples/strands-gemini/` (it holds only ignored `node_modules`, so
  `git status` stays clean) changed 21 `reads` digests: 11 in `packages/kernel/tests/ambient-reads.test.ts`
  and 10 in `control-commits.test.ts`. The manifest records a clean clone's digests (see Risks).

## Figures against implementation 02

| Figure | Implementation 02 (C `b104bab1`) | This C |
|---|---|---|
| Preserved census: preserved / held / superseded / refused | 766 / 125 / 74 / 307 | 713 / 183 / 74 / 302 (53 preserved and 5 refused members now held) |
| Closed origins | 110 | 110; 18 relinked to held witnesses, none reopened |
| Suite targets | 391, all `target_reading` | 383: 381 `target_reading`; 2 C2-LIMIT mapping targets refused by P1-H only |
| Witness records | 199 (125 held, 74 superseded) | 257 (183 held, 74 superseded) |
| V-ENV entries | 44 held by one unrecorded rule (review 02) | 188 rule-1 entries naming owner choice 08, all 44 included |
| Register | 226 entries, 65 cases | 305 entries, 94 cases; 20 `not_held`; 235 with detector matches, 1 with an unclassified site |
| Transferred origins | 44 | 44, each in its decision's pinned list |
| Refused, unbound members of the limited origins | 25 (one unrecorded) | 26: the 24 listed plus `dispatch:1363:3` and `dispatch:1426:3`, each mapped through its target |
| Tooling tests; refusal ablations; registry cases | 489; 281; 100 | 561; 307; 109 (9 tool-result ablations) |

Design 06 measured 714/182/74/302 and a register of 304. The detector at C also holds
`fault-oracle:254:3`, which runs the file's load-time `child(...)` call; the prototype did not follow
load-time references.

## Criteria (implementer assessment, not acceptance)

| Criterion | Assessment and evidence |
|---|---|
| F1 | Candidate facts: ancestry, exact C..H set and preserved paths. The check runs on the committed H; see the handoff. |
| F2 | Inventory of 1,549 origins verified; the shared fence parse leaves all 29 fence bodies at their pinned digests. |
| F3 | Probe route: 109 registry cases, all killed at C. The target-set route never returns `killed`; its corpus shows no observed outcome becoming a kill; run-level categories stay distinct (`malformed` is new). |
| F4 | Declared environment and census; floor v26.10.0; temporary copies only. |
| F5 | Summaries keep origins, members, targets, kills (0), observations, holds, detector kinds and areas separate. |
| F6 | `tests/tooling/README.md` documents each finding's mechanism; no third-party material added. |
| P1-T | 381 targets pass at C as readings; the 2 mapping targets fail only P1-H. No mutation kills. |
| P1-P | Census 713 / 183 / 74 / 302; every held member has an attributed witness. |
| P1-H | Register 305; every held or superseded entry names its decision; rule 1 holds every V-ENV match; the detector's stated gaps are in the README. |
| P1-R | 110 of 154 revalidation origins close; the open ones are exactly the 44 in owner choices 04–05's pinned lists; C2-LIMIT binds the limit. |
| P1-G, context | One block parse decides fence bounds; no open or closed origin has an uncertain minimum context. |
| P1-M | TOOLS-02's (owner choice 04); 26 families, 415 members pending. |
| P1-X | Advisory gate in every `verify` (owner choice 07); triage is TOOLS-02's. |
| P1-C | Adoption, execution, holds and acceptance stay separate; not-run profiles listed. |
| P2 | Composed verify at clean C below; this self-review; independent review pending. |

## Area gate at C (owner choice 07)

TOOLS-01's own B..C at C: 272 changed paths, 68 of them behaviour-bearing (owner choice 06 rule 1).
The advisory result is `reported`.

| Touched area | Open origins | `prose_pending` |
|---|---:|---:|
| `package.json` | 47 | 0 |
| `package-lock.json` | 26 | 0 |
| `tests/conformance/effects` | 17 | 0 |
| `tooling` | 10 | 0 |

That is 69 distinct origins (64 `pending`, 5 `pending_revalidation`) and 664 `ungated`. The
manifests and the effects test were changed by the owner-choice-03 floor amendment. No origin was
triaged or closed for the gate.

## Validation at clean C

Each run: `python3 -B scripts/packet_tools.py verify --revision <C> --spec docs/development/work/TOOLS-01/checks.json`,
Node v26.10.0 and Python 3.13.5, under `caffeinate -i`, alone. Runs 1 and 2 used the implementer's
worktree, checked to hold no directory a fresh clone lacks besides `node_modules`. Run 3 used a fresh
`git clone` checked out at C, with `node_modules` copied from that worktree.

**Run 1, C `b94e3bef`: `attention_required`**, 2026-10-06 06:09:56–06:51:37Z (41 min 41 s). Every
step passed as in run 3 except `registered-mutants`: 108 of 109 killed, 1 `setup_error`
(`result.target-malformed`; cause and fix above).

**Run 2, C `ca28491d`: `checks_passed`**, 2026-10-06 10:04:49–10:46:28Z (41 min 39 s), with the
figures of run 3. That C then failed the candidate check (above).

**Run 3, C `28258b28`: `checks_passed`**, 2026-10-06 11:28:26–12:08:50Z (40 min 24 s), in the fresh clone.

| Step | Result |
|---|---|
| tool-tests | 561 tests OK |
| inventory | `provenance_verified`: 1,549 origins (208 artifact, 1,333 mention, 8 additional) |
| adoption | `revalidation_complete`: 110 complete, 44 transferred (4 by owner choice 04, 40 by owner choice 05), 1,395 pending; 383 targets, 381 `target_reading`, 2 refused by P1-H only; census 713 / 183 / 74 / 302; register 305 (94 cases), 188 by rule 1; 110 closures with 116 context ranges; 0 kills |
| dimensions | `coverage_reported` |
| registered-mutants | 109 of 109 killed |
| refusal-mutants | 307 of 307 killed |
| refusal-census, oracle-census | pass |
| typecheck | pass |
| repository-tests | 3,774 tests; 0 fail, cancelled, skipped or todo |
| archive-tests | 4 tests; 0 fail |
| kernel-sweeps | pass |
| area-gate | `reported` (advisory) |

The F1 `candidate` check runs on this C/H after H is committed. Its result is in the external
handoff, not in this report.

Not run: the `live-provider`, `large-memory-timing` and `known-base-failure` (`builder-docs`)
profiles, by owner choice 01 and checks.json's limits. Not run either: any Kernel release or hold
evaluation.

## Proposed 007 wording (the design author applies)

1. **TOOLS-01 status row**, replacing the current one:

   ```markdown
   | TOOLS-01 | WAITING_FOR_REVIEW | Owner [release 01](work/TOOLS-01/release-01.md), 2026-10-02; branch `codex/tools-01`, base `f62527e8d564a6e2f63b83cbb52e24053f333540`; contract [revision 9](work/TOOLS-01/contract.md) (owner choices 01–09). C `28258b282532b36eef8fb1571d79b6343b54427b`; [implementation 03](work/TOOLS-01/implementation-03.md), correcting reviews 01–02 by [design 06](work/TOOLS-01/design-06.md). 110 of 154 revalidation origins closed; 44 transferred and 1,395 pending origins left to TOOLS-02; V-ENV register matches held by owner choice 08; target-set mutations earn no kill (owner choice 09); advisory area gate in every `verify`. Independent review pending; no acceptance or successor release. |
   ```
2. **TOOLS-02 scope** ([owner choice 09](owner-choice-09.md)): after "the 40 revalidation origins
   transferred by owner choice 05.", add:
   > It also designs the evidence that a target-set mutation's qualifying assertion executed and
   > failed, which P1-M's kills need; until then target-set mutations earn no kill
   > ([owner choice 09](work/TOOLS-01/owner-choice-09.md)).

## Risks and limits

- **The V-ENV detector is syntactic.** Values that never meet an intrinsic object in the run set,
  production modules, native code and non-JavaScript case files are stated gaps. Aliases are
  scope-blind, so it over-includes; held entries lose credit, they are never granted it.
- **Deviation from design 06.** Design 06 lists `entries` among the readers whose results are exempt
  from unclassified values. The detector does not exempt `entries`, nor `values` (not on design 06's
  list either): their elements are the inspected object's own values, which can be intrinsic objects.
  The deviation can only add matches, so it can only hold more entries, never grant credit.
- **Run `corpus` and `verify` in a clean clone.** Two kernel tests' traced reads digest the
  repository's directory tree. A directory a clone lacks changes those digests and fails the
  adoption step's preserved checks, and `git status` does not show it when it is empty or holds only
  ignored files. A fresh clone (or a worktree with no extra directories) reproduces the manifest.
- **No target-set kills in TOOLS-01** (owner choice 09). P1-M stays TOOLS-02's.
- **The restored 1363:3 target came from an uncommitted build file.** It is checked against the
  committed check record and passes P1-T at C except P1-H; it earns no credit.
- Third-party review under AGENTS.md: none needed; no third-party code, dependency or asset was added.

## Handoff

Ready for independent review of the exact C/H. No self-acceptance; successor release stays with the owner.
