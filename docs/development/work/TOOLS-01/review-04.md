# Independent review 04 — TOOLS-01 (corrected candidate; fidelity remit with a soundness sample)

## Reviewer, session and access

- **Reviewer:** Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-07.
  The owner's remit is checks 1–7 of the review request: owner-record fidelity, VENV-01 under owner
  choice 08 option (b), C2-LIMIT, the closed origins, the B..H boundaries, review 02's P3 items, and a
  small soundness sample independent of GPT-6's.
- **Independence.** This is a fresh session. It took no part in TOOLS-01's implementation, design 06,
  owner choices 04–09, or reviews 01–02. It is the same model as the round-3 implementer, the design
  author of choices 04 and 06–08, and review 02's reviewer, so assumptions may be correlated (006). The
  session started with an auto-loaded memory index that earlier Claude sessions in this repository
  wrote, including TOOLS-01 notes. I gave those notes no weight and re-derived every fact below from the
  repository. I read no owner or agent transcripts, no other session's scratch files, and no review-03
  material.
- **Access:** local Git objects for B, C, H and the previous H, with a shell. I worked in my own worktree
  at H and my own fresh clone at C, both in this session's scratch space. The worktree is registered in
  the shared repository, so this review's branch is a local branch there. In the shared checkout I only
  read its Git state and listed its `node_modules` directories; I wrote nothing there beyond that
  registration and this branch. macOS 26.6.2 arm64; Node v26.10.0 first in `PATH`
  (`~/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin`); Python 3.13.5; npm 11.6.2. The verify
  ran under `caffeinate -i` and `perl -e 'alarm 5400; exec @ARGV'`, alone: no other `packet_tools`
  process ran during it. Network use: `git ls-remote origin`, and `npm ci --prefer-offline`, which
  installs from the npm cache and may contact the registry for anything uncached.
- **Limits:** I cannot check that the quoted owner answers are verbatim against the owner's messages;
  I check that the records present them as verbatim and bind them to commits. I did not rerun P1-T reach
  runs, the detector or mutation runs outside the composed verify.

## Candidate identity

| Role | Full SHA | Check |
|---|---|---|
| Base B | `f62527e8d564a6e2f63b83cbb52e24053f333540` | `verification.json` at C names it; ancestor of C |
| Payload C | `28258b282532b36eef8fb1571d79b6343b54427b` | `git rev-parse 28258b28` |
| Candidate H | `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94` | C's direct child; `git ls-remote origin` advertises `codex/tools-01` at H |
| Previous H | `446dd25820500db4e0eb3d6940ec49e45634f39c` | Reviews 01 and 02, both CHANGES REQUIRED; ancestor of C |

- **F1 at C/H:** `facts_verified` ([candidate.json](review-04/candidate.json)). The administrative files are
  exactly 007 and `implementation-03.md`; `require_direct_parent` holds; all 12 preserved paths hold.
- **Policy:** 006, 008 and 012 at H are byte-identical to the pin `b759d0ab…`. I applied them from the pin.
- **Contract:** revision 9 at C and H, equal to the revision committed at `2b48e40e`.
- A sibling local head, `1a345ebf` (branch `claude/tools-01-h3`), is C's child with the same report and
  without the 007 edit. It is not the candidate.

## Coverage map

I derived this map from the review request, contract revision 9 and owner choices 08–09, then read the
report. Each row closes by my own check; the attachments reproduce them.

| Obligation | Check | Result |
|---|---|---|
| 1. Contract revisions 8 and 9 equal choices 08 and 09's embedded diffs | `git apply` of each embedded diff, as it stood at its binding commit, at C and at H, on the previous revision | Byte-identical, 6 of 6 |
| 1. Approvals verbatim and bound to commit SHAs | Records, binding commits, later edits | Holds; choice 09's bytes changed after binding by whitespace only |
| 2. Every V-ENV recipe match held by choice 08 and naming it | Register at C | 188 of 244 V-ENV matches; the other 56 are category entries, under the owner's design-check answer (OVERLAP-01) |
| 2. Each held or superseded entry names a reading or a decision; the register refuses neither | Register at C; code; unit tests; ablations; my probes on the real register | 285 of 285 name a decision; refusals fire (5 probes) |
| 2. Category entries keep their K1.1-correction-03 decisions | Register at C against the previous H | 97 entries; classification, claim and reason unchanged; decisions per choice 08 §2.3 |
| 2. The 188 include review 02's 44 | Review 02's `venv-classification.json` | 44 of 44 |
| 3. C2-LIMIT: 24 plus extras bound by target mapping, never by title | `limited_origins`; manifest recomputation; tests | 24 + 2 = 26, each extra through its only target, at a rule-1 leaf |
| 4. None of 110 closed origins reopened | Origin states and closures at C against the previous H | Same 110; contexts unchanged |
| 4. The 18 relinks listed, each with a valid held witness | Closure diff; route checks | 18 relinks, all valid; **not listed in H** (LIST-01); listed here |
| 4. The report's figures recompute from adoption.json at C | Recount | All recompute |
| 5. No production, Layer-3 or sealed-record change in B..H | `git diff --name-status B H`; preserve list | None |
| 5. C..H is exactly the report and 007 | `git diff --name-only C H` | Exact |
| 5. H's 007 = the report's two proposals | Rebuild H's 007 from C's | Exact, modulo line wrapping |
| 5. 28258b28: review-01 attachments and choice 09 whitespace only; manifest digests updated | Line-by-line strip comparison; manifest diff | Exact: 219 lines, 13 manifest rows (`bytes`, `sha256` only) |
| 6. REC-01 and REC-02 fixed | Report text; `git apply` | Fixed |
| 7. Soundness: 10 of 188 held entries; 5 of 18 relinked origins | Seeded sample against the bytes at C | 10 of 10 real matches (one syntactic over-inclusion); 5 of 5 valid |
| Composed verify at clean C | Fresh clone, alone | `checks_passed`, all 13 steps |

## 1. Owner records

**Contract diffs.** [check_records.py](review-04/check_records.py) extracts the single `diff` block of each
choice as it stands at its binding commit (`9e84b587`, `2b48e40e`), at C and at H. It applies each with
`git apply`, without `--recount` or whitespace options, to the previous revision (`0eee9b41`, `e39a8b10`).
All six results equal the next revision byte for byte: revision 8 is `e211a38e…`, revision 9 is
`c6fcac95…`. Both blocks carry real hunk headers. The contract at C and H equals revision 9 at `2b48e40e`.
No other commit in the round touches the contract.

**Approvals.**
- **Choice 08** quotes the owner's answer as verbatim. The design author recorded it and wrote the rest
  of the record. It binds at its adding commit `9e84b587`, and its bytes are unchanged since.
- **Choice 09** quotes the owner's "Option A" answer as verbatim. The implementer recorded it, and it
  binds at `2b48e40e`. At C its bytes differ from that commit in two lines. Both are blank context
  lines of the embedded diff that held one space and are now empty. Its diff applies identically
  before and after the change. The report discloses the change.
- **Design checks.** The design 06 check (`b66688c6`) returned CHANGES REQUIRED, and the second check
  (`9b2aafcd`) returned APPROVED WITH REQUIRED CHANGES. Revision 3 (`ae53c984`) answers the two
  required corpus items, and both are present: `test_no_observed_outcome_becomes_a_kill` has the
  `empty-stack` and `numeric-stack` cases, and `test_markdown_blocks.py:65` has the tilde fence that
  holds a backtick run and `## x`.
- **The owner's three design-check answers** are recorded only as paraphrase: "existing category holds
  retain their owners; unread child processes match V-ENV; and P1-H witness links can keep the 18
  origins closed" (design-06-check.md:28; design 06 revision 2). There is no verbatim owner record.
  The candidate relies on the first and third. This review's request restates the first as a check,
  so I treat it as the owner's position. See OVERLAP-01.

## 2. VENV-01 under owner choice 08 option (b)

[register_checks.py](review-04/register_checks.py) computes the facts below from adoption.json at C and at
the previous H ([register.json](review-04/register.json)).

- **Register:** 305 entries (94 cases): 239 `held`, 46 `superseded`, 20 `not_held`.
- **Rule 1:** 188 entries are `held`, claim V-ENV, decision `owner-choice-08.md`, and each has V-ENV in
  `matched`. No V-ENV-claimed entry names another decision. No V-ENV-matched entry is `not_held`.
  - 79 entries are new since the previous H.
  - 2 entries were `not_held` before: `creation:516:3` and `ingress:459:3`.
  - Review 02's 44 are all among the 188.
- **Decision or reading:** all 285 held or superseded entries name a decision, and none names a reading.
  - `hold_register` refuses an entry that names neither, names both, names a decision that does not
    govern its claim, or names a category claim without its existing decision. It also refuses a V-ENV
    match left `not_held`, a V-ENV-claimed match not naming choice 08, and choice 08 named by any other
    entry.
  - `StructureTests` in `test_venv_detector.py` covers each refusal, and `refusal-guards.json` ablates
    each one.
  - On the real register at C, my five probes each remove or alter one entry's decision. Each is
    refused before any recomputation, with the expected message.
- **Category entries:** 97 entries (57 Proxy, 29 V-D1, 11 re-prototyped built-in), all owned by
  K1.1-correction-03.
  - Each names decision-01 (Proxy, re-prototyped) or decision-05 (V-D1), as choice 08 §2.3 requires.
  - Their classification, claim and reason are unchanged since the previous H. All 97 gained the
    `decision` field, and 30 also gained V-ENV in `matched`.
- **Overlap:** 56 of the 244 V-ENV-matched entries are category entries: 31 superseded Proxy entries
  and 25 held entries. They name decision-01 or decision-05, not choice 08. 30 of them first match V-ENV
  at C, through the widened detector.
  - Choice 08 §2.1 says every V-ENV match is "`held` under V-ENV by this record". The owner's
    design-check answer says category entries keep their owners.
  - The candidate follows the answer, by design (design 06 §2) and by test: the `both` fixture,
    "Category keeps its owner".
  - Neither route grants credit. The effect is attribution: BINDING-01's transferred classification
    (choice 08 §2.2) does not cover these 56. The report does not say so, and its phrase "rule 1 holds
    every V-ENV match" holds only in the code's sense that no V-ENV match is `not_held`. See
    OVERLAP-01. The list is in register.json.

## 3. C2-LIMIT

[limits_relinks.py](review-04/limits_relinks.py) recomputes the limit from the manifests
([limits-relinks.json](review-04/limits-relinks.json)).

- **The limit:** the four owner-choice-04 rows carry `limited`. Each names
  `continuation-stop-01/unbound-members.json`, with SHA-256 `c317e138…`, which matches. That list has
  24 rows.
- **Per origin:** the refused members without a credited target are exactly the listed members plus
  the extras.

  | Origin | Members | Refused | Unbound | Listed | Extras |
  |---|---:|---:|---:|---:|---|
  | `artifact-73555fe6…` (dispatch) | 50 | 36 | 5 | 3 | `dispatch:1363:3`, `dispatch:1426:3` |
  | `artifact-9fd619f5…` (landing zone) | 189 | 189 | 18 | 18 | — |
  | `artifact-d2153e36…` (evidence-records) | 4 | 4 | 1 | 1 | — |
  | `artifact-ea5444a6…` (values) | 74 | 31 | 2 | 2 | — |

  Total: 26 = 24 + 2. No listed member is bound.
- **The extras:** each is admitted only through its target record.
  - The extra's member is named by exactly one suite target: `target.dispatch.1363.3.5a8d958ffdab`,
    declared at `dispatch:1390:3`, and `target.dispatch.1426.3.5a8d958ffdab`, declared at
    `dispatch:1459:3`.
  - Each declaration leaf is a rule-1 entry (`held`, V-ENV, choice 08).
  - `limited_origins` compares no title. It requires `title_kind: literal` and a P1-T result whose only
    refusal is P1-H's; the verify's adoption step evaluates that result.
  - `test_transfer_limits.py` refuses a same-title leaf in another file or suite, missing or duplicate
    mappings, generated, otherwise-refused or non-rule-1 targets, and an extra outside its origin. It
    accepts both real extras.
- **Why they are unbound:**
  - `1426:3` was bound at the previous H through its target at `1459:3`. That leaf runs a strict
    subprocess, so rule 1 now holds it.
  - `1363:3` had no imported target at the previous H; review 02 named it the 25th member. Its target
    leaf `1390:3` is held.
  - Choice 08 §2.4 names `1363:3` as "the known one" and admits every member that rule 1 leaves unbound.
    `1426:3` qualifies, and the report names it.
- **The restored `1363:3` target:** its record came from an uncommitted build file (the report says so).
  I compared it with the committed check record in `continuation-repair-01/targets.json.gz`:
  - the committed record has `refused: []`, reach run `valid` and credit `target_reading`;
  - each of the manifest's five anchors extends the committed 120-character prefix;
  - each anchor occurs once at C, at the committed offset, inside the `1390:3` span.

## 4. Closed origins, relinks and figures

- **Closed origins:** 110 complete at C, the same set as at the previous H. None reopened and none
  newly closed. All 110 closure contexts are unchanged. 18 closures changed their links, and nothing
  else.
- **The 18 relinks:** for each, the script checks the routes:
  - every member routes: a refused member to a linked target; a held or superseded member to a linked
    witness of the matching kind that names the origin and the member;
  - no linked target is absent or one of the two P1-H-refused mapping targets;
  - each added link is a `held_witness` whose members are `held` and registered `held` under its claim
    (all V-ENV, choice 08);
  - each removed target, 23 removals in all, has a held witness on the same current leaf.

  No defects. The list, with each removed target, its leaf and each added witness, is in
  limits-relinks.json under `closed_origins.relinked`. 33 of the added links are cross-origin: helper
  and review-mention origins link a consumer leaf's witness that names another origin. That matches the
  established pattern for target links (1,168 such target links at the previous H). `origin_closure`
  requires the witness to name the origin only for that origin's own members.
- **Not listed in H.** The report says only "18 relinked to held witnesses, none reopened". The first
  design check asked to "list their routes", and this review's request checks for the list. No file in
  H lists them; they are derivable only by diffing adoption.json against the previous H. See LIST-01.
  The 18:

  | Origin | Change |
  |---|---|
  | `artifact-0e16542d…`, `-791d7283…`, `-98679309…` | Whole-file test origins (`fault-oracle`, `fault-sweep`, `poison-catalog.test.ts` at `66bc0411`) whose members are now held: +38, +2, +2 witnesses |
  | `artifact-0f12d86d…`, `-210dd0aa…` | `harness.ts` helper (pins `66bc0411`, `9fd2faa7`): 8 targets → 13 witnesses on the same 8 leaves |
  | `artifact-30fdff7b…`, `-a8dc74e5…` | `fault-child.ts`, `fault-scenarios.ts` helpers: `fault-sweep.49.1` target → witness |
  | `artifact-ae65d3df…` | `sweep/fault-oracle.ts` helper: `fault-oracle.151.1` target → witness |
  | `artifact-f5306a24…` | `sweep/zone-names.ts` helper: `poison-catalog.291.3` target → witness |
  | `artifact-55f84272…`, `-b06e44e7…` | K1.1-correction-01 review-02.md:59 and blocker-01.md:76: `dispatch.1426.3` target → `dispatch:1459:3` witness |
  | `artifact-ce2e6984…` | K1.1 review-01 K11-R1-VAL-01: `creation.516.3` target → witness |
  | `artifact-6c57cc9d…`, `-febb180b…` | `creation.test.ts` (pins `9fd2faa7`, `66bc0411`): +3 witnesses (333, 516, 1009) |
  | `artifact-510be2a0…`, `-ecb10ef9…` | `ingress.test.ts` (pins `66bc0411`, `9fd2faa7`): +1 witness each (leaf 459) |
  | `artifact-bca863b0…` | `dispatch.test.ts` at `66bc0411`: +4 witnesses (178, 615, 1459, 1529) |
  | `artifact-ebfa0eb3…` | `values.test.ts` at `66bc0411`: +2 witnesses (893, 910) |
- **Figures** (adoption.json at C; all match the report):

  | Figure | Value |
  |---|---|
  | Preserved census (preserved / held / superseded / refused) | 713 / 183 / 74 / 302, from 766 / 125 / 74 / 307 at the previous H |
  | Suite targets | 383: 9 removed (`creation.516.3`, `dispatch.1496.3`, `.178.3`, `.612.3`, `fault-oracle.151.1`, `fault-sweep.49.1`, `poison-catalog.291.3`, `values.589.3`, `.606.3`) and `dispatch.1363.3` added |
  | Witness records | 257: 183 held, 74 superseded |
  | Register | 305 entries, 94 cases, 20 `not_held`, 188 rule 1 |
  | Transferred origins | 44 (4 / 40). They equal the open revalidation set and each pinned list, whose digests match. Unchanged since the previous H |
  | Closures | 110, with 116 context ranges |
  | Families | 26, with 415 members |
  | Registry cases | 109 (100 earlier, kept, plus 9 tool-result ablations) |
  | Refusal ablations | 307 |

  The verify's adoption step independently reports 381 credited targets and the two P1-H refusals
  (below).

## 5. Boundaries

- **B..H:** 272 paths. None under `packages/`, `mental-model/`, `.agents/` or `docs/development/research/`,
  in another packet's work directory, or in a policy file directly under `docs/development/` except 007.
- **Outside TOOLS-01's records and tooling:** `AGENTS.md`, `README.md`, `package.json`,
  `package-lock.json`, `tests/conformance/effects/fast-slow-equivalence.test.ts`,
  `scripts/packet_tools.py` and 007. Between the previous H and C only `packet_tools.py` changed among
  them. Review 02 traced the others to choice 03 and node-floor-04.
- **C..H:** exactly `implementation-03.md` and 007.
- **H's 007:** [check_records.py](review-04/check_records.py) rebuilds it from 007 at C. It replaces the
  TOOLS-01 row with the report's proposed row and inserts the report's TOOLS-02 sentence after "the 40
  revalidation origins transferred by owner choice 05." The sentence equals choice 09's proposal. The
  result equals H's 007 modulo line wrapping, and nothing else changed. The new links resolve at H.
- **28258b28:** it changes 15 files.
  - 13 review-01 samples and `owner-choice-09.md` lose only trailing spaces and tabs, line for line:
    217 and 2 lines. No CR is present.
  - In `review-01/manifest.json`, the same 61 entries remain. Exactly those 13 rows change, in `bytes`
    and `sha256` only, and every entry now matches its file at C.
  - `git diff --check B C` prints nothing. No file in H cites any of the 15 replaced digests (13 samples,
    the manifest, owner-choice-09.md at `2b48e40e`).
  - Authority: the commit message ("owner instruction, whitespace only") and the report. This review's
    request confirms it.
- **Verify specification since the previous H:** `checks.json` raises `tool-tests`' minimum from 489 to
  561; `verification.json` names the new report. Nothing is weakened.
- **Tooling tests:** the eight removed assertion lines are shape updates. Their replacements assert the
  same facts with new fields, or, on the target-set route, choice 09's no-kill outcome. No test method
  was removed: 489 names became 539.

## 6. Review 02's P3 items

- **REC-01:** fixed. The report cites FLOOR-03-01 in node-floor-04 and design 05 §6
  (implementation-03.md:47–50). node-floor-04.md:17 records the verbatim intent.
- **REC-02:** fixed. Choices 08 and 09 embed diffs with real hunk headers, and both apply with
  `git apply` (§1). Approvals bind to commits `9e84b587` and `2b48e40e`, with `9b2aafcd` for the second
  design check.
- **HANDOFF-01:** resolved. H is published as `origin/codex/tools-01`.

## 7. Soundness sample

The seeded selection is in [sample.json](review-04/sample.json): salt `review-04/claude-opus-5-5/2026-10-07`,
strata fixed before reading. The readings are in [sample-notes.md](review-04/sample-notes.md).

- **10 of the 188 rule-1 entries:** three from review 02's 44, one new case, one new child-process leaf,
  two new leaves of other detector kinds, one former `not_held` entry and two V-ENV entries from before
  this round. All ten have a real match in the bytes at C:
  - cast writes to `Number.isInteger` and `Object.prototype.bound`;
  - helper writes through `inherit` and `runCase`;
  - `Array.prototype[0]`;
  - load-time and probe child processes;
  - the `globalThis.JSON` and lexical `Array` hops.

  `ingress:459:3` matches only syntactically: it writes an own `"__proto__"` data member of a
  `JSON.parse` result. Design 06 treats that member chain as intrinsic, which withholds credit and
  grants none. Three of the ten observe a V-ENV claim. The other seven are held by the conservative
  rule, as choice 08 intends.
- **5 of the 18 relinked origins:** `a8dc74e5`, `febb180b`, `510be2a0`, `ce2e6984` and `210dd0aa`. All
  five keep a valid route at C.
  - Each removed target's leaf now carries a held witness for a real match.
  - Each context is the whole pinned file or the unchanged section.
  - The `harness.ts` helper keeps its consumption closure: every replaced leaf's file imports it, and
    87 target links remain.
  - K11-R1-VAL-01 (`ce2e6984`) keeps its value and Activation paths as credited targets. Its creation
    path is now a held witness through the `__proto__` over-inclusion.
- **Adjacent search, in the false-credit direction**
  ([adjacent_sweep.py](review-04/adjacent_sweep.py), [adjacent-sweep.txt](review-04/adjacent-sweep.txt)):
  - **What:** all 712 credited leaves at C (preserved members and the 381 credited targets). I looked
    for an in-span intrinsic write, `delete`, writer call, `__proto__`/`constructor` write,
    `Symbol.species`, child process or `eval`/`Function`. I also looked for a call to any of 14 named
    test-side helpers that write intrinsics or start children: harness `pollute*`,
    `trapInheritedIndices`, `createPoison`, `setProtoFields`, `runCase`, `inherit`, `inBoundedChild`
    and others.
  - **Result:** two hits, both `Object.assign(Object.create(local), …)` on fresh local objects
    (`host-members:159:3`, `:224:3`, correctly `not_held`). No credited leaf writes an intrinsic in its
    own span or calls a named writer helper.
  - **Also searched:** every non-test module under `*/tests/` for such writes, and found them in
    `harness.ts`, the sweep modules and the same-file helpers above.
  - **Limits:** the search is lexical. It is not a run-set analysis; transitive helper chains beyond
    the named helpers, aliases and generated source are the detector's domain and GPT-6's remit.

## Verification runs

| Command | Result |
|---|---|
| `packet_tools.py candidate --payload C --head H --spec …/verification.json` (my worktree at H) | `facts_verified` ([candidate.json](review-04/candidate.json)) |
| `packet_tools.py verify --revision C --spec …/checks.json`, in a fresh `git clone` checked out at C after `npm ci --prefer-offline` from the lockfile (root `node_modules` only, as the lockfile has no nested ones), alone, 2026-10-07 05:11:08–05:58:38Z (47 min 30 s), exit 0 | **`checks_passed`**, all 13 steps ([verify-C-summary.json](review-04/verify-C-summary.json)) |
| [check_records.py](review-04/check_records.py) | all checks PASS, exit 0 ([records.txt](review-04/records.txt)) |
| [register_checks.py](review-04/register_checks.py), [limits_relinks.py](review-04/limits_relinks.py), [sample.py](review-04/sample.py), [adjacent_sweep.py](review-04/adjacent_sweep.py) | outputs attached; no defect |

The clone's HEAD was C and its status clean before and after the run. The steps:
- `tool-tests`: 561 tests OK.
- `inventory`: `provenance_verified` (208 artifacts, 1,333 mentions, 8 additions; 1,549 origins).
- `adoption`: `revalidation_complete`.
  - States 110 / 44 / 1,395; transferred 4 / 40.
  - `limited`: 3 + the two extras, 18, 1 and 2.
  - 110 closures with 116 context ranges.
  - 383 targets: 381 credited `target_reading`; the 2 refused are `target.dispatch.1363.3.5a8d958ffdab`
    and `target.dispatch.1426.3.5a8d958ffdab`, each only by "the target leaf is a registered held test
    (P1-H)", with literal titles and valid reach runs.
  - Census 713 / 183 / 74 / 302; 0 kills.
  - Register 305 (94 cases), 188 by rule 1, 235 entries with detector matches, one unclassified site
    (`poison-catalog.test.ts:273:5`).
- `dimensions`: `coverage_reported`.
- `registered-mutants`: 109 killed.
- `refusal-mutants`: 307 killed.
- `refusal-census`, `oracle-census` and `typecheck`: pass.
- `repository-tests`: 3,774 tests, 0 fail, cancelled, skipped or todo.
- `archive-tests`: 4 tests, 0 fail.
- `kernel-sweeps`: pass; no timeout.
- `area-gate`: `reported`, advisory. 272 changed paths, 68 behaviour-bearing; areas `package.json` 47,
  `package-lock.json` 26, `tests/conformance/effects` 17, `tooling` 10; 69 origins (64 `pending`,
  5 `pending_revalidation`); 664 `ungated`.

These equal the report's run 3 and its area-gate table. The full output is
[verify-C.json.gz](review-04/verify-C.json.gz); the summary records its SHA-256.

Not run:
- the `live-provider`, `large-memory-timing` and `known-base-failure` profiles (owner choice 01;
  listed in `profiles_not_run`);
- any mutation beyond the two registries;
- the GPT-6 reviewer's checks, whose results I do not have.

## Declared search and limits

**Searched:**
- owner choices 08 and 09 and both design checks, against the contract history, the register, the
  transfer tables, 007 and the report;
- all 272 B..H paths by area, and the 446dd258..C delta;
- every register entry by class, claim, decision and match, against the previous H;
- all four limited origins and both extras;
- all 110 closures and all 18 relinks;
- the seeded sample of 10 + 5;
- the adjacent false-credit sweep over 712 credited leaves.

**Not searched:**
- R1-01's detector rules beyond the sample and sweep, R1-02's parser, R1-04's observation
  categories, P1-T anchor and reach machinery, P1-P prefix rules, and F3/F4 runner isolation. These
  are the GPT-6 reviewer's soundness remit; I relied on the composed verify's corpus, registry and
  ablations for them.
- Whether each of the 97 category entries is correctly categorized; the categories are unchanged
  since review 02.
- The 1,395 TOOLS-02 origins and the 44 transferred ones beyond their lists.
- The owner messages themselves.
- Other reviewers' material.

## Per-criterion result

| Criterion | Result | Basis |
|---|---|---|
| F1 | PASS | `facts_verified` at C/H; `tool-tests` (verify) |
| F2 | PASS | `inventory` step: 1,549 origins; states 110 / 44 / 1,395 recomputed |
| F3 | PASS | `registered-mutants`, `refusal-mutants`, `oracle-census` (verify). No target-set route returns `killed` (`target_outcome`; `test_no_observed_outcome_becomes_a_kill`). The 100 earlier registry cases are kept. Depth: GPT-6 |
| F4 | PASS | Declared environment; temporary copies; floor v26.10.0 (verify). Depth: GPT-6 |
| F5 | PASS | Summaries keep origins, members, targets, kills (0), observations, holds and areas separate |
| F6 | PASS | `tests/tooling/README.md`; no Layer-3 edit; no third-party material in the 446dd258..C delta |
| P1 | PASS | Through the rows below |
| P1-T | PASS | 381 credited readings; the 2 mapping targets refused by P1-H only (verify adoption step) |
| P1-P | PASS | Census 713 / 183 / 74 / 302; every held member has an attributed witness. Depth: GPT-6 |
| P1-H | PASS | 285 of 285 name a decision; the structural refusals hold; rule 1 holds every V-ENV match. P3: LIST-01, OVERLAP-01 |
| P1-M | DEFERRED | TOOLS-02 (owner choice 04); target-set kills withheld (owner choice 09) |
| P1-G | DEFERRED | TOOLS-02 (owner choice 04) |
| P1-R | PASS | 110 closed, none reopened; 18 relinks valid; the 44 open origins equal the pinned lists; C2-LIMIT exact |
| P1-X | PASS | Advisory gate in every `verify` (owner choice 07); triage DEFERRED to TOOLS-02 |
| P1-C | PASS | Adoption, execution, holds and acceptance stay separate; profiles not run are listed |
| P2 | PASS | Clean-C verify (above); report and self-review present; this independent review |
| Owner remit, checks 1–7 | PASS, with two P3 findings | LIST-01 (relinks and rule-1 entries not listed in H); OVERLAP-01 |

## Findings

### TOOLS01-R4-LIST-01 (P3) — The report counts the rule-1 entries and the 18 relinks but lists neither

- **Where:** [implementation-03.md:60](implementation-03.md) and `:113`.
- **Governing:** owner choice 08 §2.1: "The report lists these entries and gives their count against
  review 02's 44." The design 06 check, "Scope and measured figures": the 18 relinks "list their
  routes". This review's request, check 4.
- **Defect:** the report gives 188 and 18 as counts. No file in H names the 18 relinked origins. They
  can be found only by diffing adoption.json against the previous H. The 188 are identifiable in
  adoption.json, where each names choice 08, but the report does not say where to look.
- **Impact:** none on credit or holds; every fact checks. A reader of the report cannot see which
  closures now depend on BINDING-01's future classification.
- **Required:** none for this H. Both lists are attached here: register.json `rule_1.keys` and
  limits-relinks.json `closed_origins.relinked`. In the next report on this packet, or in its
  integration record, cite these lists or list the entries.

### TOOLS01-R4-OVERLAP-01 (P3) — 56 V-ENV-matched category entries stay with K1.1-correction-03 only, undisclosed

- **Where:** adoption.json at C, `holds.register.entries`; `hold_register`
  (`scripts/packet_tools.py:2269–2274`); the report's "rule 1 holds every V-ENV match"; H's 007 TOOLS-01
  row, "V-ENV register matches held by owner choice 08".
- **Governing:**
  - choice 08 §2.1 ("every … entry that the V-ENV recipe … matches … is `held` under V-ENV by this
    record") and §2.2 (its classification transfers to BINDING-01);
  - §2.3 (category entries name their existing decision);
  - the owner's design-check answer, recorded only as paraphrase in design-06-check.md:28 ("existing
    category holds retain their owners").
- **Fact:** 244 entries match V-ENV.
  - 188 are held under choice 08.
  - 56 are category entries naming decision-01 or decision-05: 31 superseded Proxy entries and 25
    held. 30 of these first match V-ENV at C.
  - The code requires only that a V-ENV match is not `not_held`, so a superseded category entry
    satisfies "rule 1".
- **Impact:** no credit is granted. BINDING-01's transferred per-test classification does not include
  these 56, and nothing in the report or 007 says so. The owner's precedence rule has no verbatim
  record.
- **Required:** the owner confirms the precedence in a verbatim record. This review's request states it
  as a check ("category entries keep their K1.1-correction-03 decisions"), and the owner may cite that.
  The next report on the packet, or BINDING-01's brief, states the 56 and cites register.json.

No finding is P0, P1 or P2.

### Observations (no finding)

- **The `__proto__` alias over-includes.** `creation:516:3` and `ingress:459:3` write own `"__proto__"`
  data members of `JSON.parse` results, not intrinsics. Rule 1 holds them, so K11-R1-VAL-01's creation
  and ingress retention cases are now BINDING-01 witnesses. Seven of the 18 relinked origins rest
  partly on them (`0f12d86d`, `210dd0aa`, `510be2a0`, `6c57cc9d`, `ce2e6984`, `ecb10ef9`, `febb180b`).
  The design accepts this, and it costs credit only. If BINDING-01 reclassifies them, those closures
  must be re-bound; `witness_records` and `origin_closure` would refuse the stale links.
- **The detector deviates from design 06.** It does not exempt `entries` or `values` results. This only
  adds matches. The report discloses it, and it was not separately design-checked.
- **Reviewer evidence edited by the implementer.** 28258b28 rewrote reviewer-owned files
  (review-01 attachments) for the candidate check. The change is whitespace only, with the digests
  updated and the authority stated. A future rule could exempt evidence attachments from
  `git diff --check`, or have reviewers strip trailing whitespace before committing.

## Stop-and-redesign check

The rule does not fire. This round is the owner-chosen redesign (choice 08 §1; design 06 with two design
checks). This review finds no defect in anything an earlier review accepted, and it returns no CHANGES
REQUIRED.

## Verdict and status text for transcription

Every closing mechanism in this remit holds, the corpus and registry pass at clean C, and the declared
search found no P0–P2 defect. The verdict binds to exact H and to the search declared above. 006 requires
one accountable full cumulative review and forbids silently combining partial ones. This review's remit
leaves runner and detector soundness in depth to the GPT-6 reviewer, as review 02's did. Whether this
record serves alone or alongside that review is the owner's decision.

The links in this text are written relative to 007, where the owner transcribes it.

> Independent review 04 (Claude Code, `claude-opus-5-5`, 2026-10-07; fidelity remit with a soundness
> sample) of H `7f3a2af46d714dc2a0e47a755ccd4fe8aeb0ba94` over C `28258b282532b36eef8fb1571d79b6343b54427b` /
> B `f62527e8d564a6e2f63b83cbb52e24053f333540`, contract revision 9 (owner choices 01–09): ACCEPT.
> F1–F6, P1, P1-T, P1-P, P1-H, P1-R, P1-X, P1-C and P2 PASS; P1-M and P1-G are DEFERRED to TOOLS-02.
> P3: `TOOLS01-R4-LIST-01`, `-OVERLAP-01`. Closes review 02's `TOOLS01-R2-VENV-01` under owner choice 08
> option (b), and `-REC-01`, `-REC-02`, `-HANDOFF-01`. Clean-C composed verify `checks_passed`, rerun
> independently. This acceptance binds to exact H only; it releases no hold and no successor.
> [Review 04](work/TOOLS-01/review-04.md); [evidence](work/TOOLS-01/review-04/README.md).

ACCEPT
