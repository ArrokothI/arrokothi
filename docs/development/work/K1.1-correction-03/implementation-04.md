# Implementation report — K1.1-correction-03, round 4

This round builds [design 03](design-03.md) under [owner choice 02](owner-choice-02.md), the
[design 03 check](design-03-check.md) (its `match`/`doesNotMatch` amendment and conditions D1–D2) and
[owner choice 03](owner-choice-03.md), the owner's scope freeze. It answers [review 02](review-02.md)'s
findings KC3-R2-EVID-01, KC3-R2-STOP-02 and KC3-R2-C1-03. [Implementations 01](implementation-01.md),
[02](implementation-02.md) and [03](implementation-03.md) remain the record for what this round does not
change. This is an implementer's report, not acceptance.

## Identity

- **Packet:** K1.1-correction-03, metered value refusal cost. Governing records: [release 01](release-01.md),
  [brief 01](brief-01.md), design 01 and its [check](design-01-check.md), owner choices
  [01](owner-choice-01.md), 02 and 03, review 02 with [brief 03](review-02/brief-03.md), design 03 and its
  check. Process baseline: 006, 008, 009 and 012 as at B.
- **State:** WAITING_FOR_REVIEW, recorded in H.
- **Sessions (the session change).**
  1. Codex Desktop session `01a1460f-48f6-79e3-8318-77aa6f29d423`, `gpt-6-astra`, reasoning `xhigh`,
     2026-10-16–17 (identity from [design 03 check](design-03-check.md)'s recording note). It built
     `ac4b1836`..`1e4ddaa3`, committed under the repository's local Git identity `Rex-Shih`. Its quota ran
     out before the requalification runs, verify and this report.
  2. Claude Code desktop session, `claude-opus-5-5`, 2026-10-17–18, from `1e4ddaa3`. It recorded owner
     choice 03, fixed the evidence-tooling defects listed below, ran every result below and wrote this
     report. It used the earlier session's uncommitted report draft as a source and checked each fact it
     kept. It reused none of that session's runs; it ran B and C itself.
  Access: local macOS arm64 checkout, Git history, shell, Node v26.10.0 (npm 11.19.1), Python 3.13.5.
  No subagents.
- **Branch:** `claude/k1.1-correction-03` on `origin` (`https://github.com/ArrokothI/arrokothi.git`).
  - Base B: `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b` (unchanged).
  - Previous reviewed H: `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`, review 02 recorded at `d32427f7`.
  - Payload C: `2bf220e9e426c810f2505fa2d74d70197807e584`. This round's commits from design 03 (`0294c238`) to C: `ac4b1836` (design 03 check
    record), `8e75961d`, `10aa09aa`, `00f87cac`, `b4dc23cd`, `5236e9e5`, `42d42bf3`, `1e4ddaa3` (GPT-6
    build); `7eab971a` (owner choice 03), `3befdd72`, `8a8579cf`, `d4bb18b2`, `f7371872` and C (this session, below).
- **Candidate H:** the commit that contains this report. Its full SHA is in the external handoff.
- **C..H allowlist** (verification.json `administrative_files`): `docs/development/007-work-packets.md`,
  this report, and the output-only attachments `evidence-04/{b-matrices,c-matrices,isolations,verify,continuations,c1-ledger,manifest}.json`.
- **Working tree:** clean during every run below; push status is in the external handoff.

## Changes and coverage

**Production.** This round changes one thing in `packages/kernel/src/values.ts` (`8e75961d`): the stop
protocol. `spend`, `charge` and `record` return `true | typeof STOPPED`. Every stop-capable function returns
the private unique symbol `STOPPED` and every caller tests it by identity, so no accepted value (`false`,
`null`) can stand for a stop and `REFUSED` stays a non-stopping refusal. Unit charges, the budget
B = 3,145,728, accepted values and bytes, issue text and weights, head starts, and cycle, depth and
foreign-form ordering are unchanged. The cumulative B..C production diff is still `values.ts` and
`envelope.ts` (+772/−302 lines); [implementations 01–03](implementation-03.md) describe the rest.

**Evidence built under design 03** (GPT-6 session, `8e75961d`..`1e4ddaa3`):
- SC10/SC11 in `capture-metering.ts` check the bounded direct-call grammar, the single private
  unique-symbol `STOPPED` declaration, the root handler and stop-state writers, and reject nested
  callables and classes around stop-capable work. Aliases, `.call`/`.apply`, computed or dynamic calls,
  shadowing and escaped state are declared gaps (BASELINE).
- `capture-trace.mjs` instruments a disposable copy of `values.ts` with a checked site inventory and
  observes actual stop state, snapshot writes, pending growth, finishing, freezes and native observations.
  `capture-continuations.mjs` runs the declared search: 38 small shapes inside `npm test`, and the full
  1,862-shape search at C.
- Kill qualification: a source-policy certificate over every `packages/**/src` module, the declared
  synchronous vocabulary (with the owner's `match`/`doesNotMatch` amendment) on plain-data operands under
  a clean intrinsic snapshot, and that call's own error reaching the selected leaf. `harness.ts`
  `accepted`/`refused` now fail through `assert.fail` with their original conditions and messages (the
  only assertion rewrite, D1).
- Owner choice 02's standing transfer: five invalidated `review.harness.*` bindings and a fresh
  1,272-member census reopen 46 complete origins and transfer them to TOOLS-02
  ([transfer list](owner-choice-02/transferred-origins.json), [helper](owner-choice-02/helper-transfer-04.json)
  and [census](owner-choice-02/census-transfer-04.json) records); ten more dispatch members are pinned as
  limited; five obsolete dispatch extras are dropped ([target refresh](owner-choice-02/extra-target-refresh-04.json)).
  The two zone-helper origins stay complete under the 2026-10-12 supplement.
- Registry: the 231 prior registrations are ported one-to-one ([registry-ports-04.json](registry-ports-04.json));
  18 are added (six bookkeeping-trace, five review-02 syntax forms, three callable-grammar and four
  sentinel-declaration controls).

**Fixed in this session** (all evidence tooling; production untouched):

| Defect | How found | Fix | Evidence |
|---|---|---|---|
| The manifest test still pinned only the earlier decisions' lists after `b4dc23cd` added owner choice 02's | GPT-6's last tool-test run | Pin owner choice 02's transfer and limited-member lists (`3befdd72`) | 607/607 tool tests |
| The probe reported temp-dir absolute paths, so the determinism repeat never matched: all ten `unit-table` registrations `invalid_baseline` | First full value-cost registry run | Tree-relative paths; ledger accepts them (`8a8579cf`) | New control fails without the fix |
| A test that defines and deletes an `Array.prototype` index leaves its length raised; the witness then refused every later assertion in that process (71 registrations) | Same run | A raised `Array.prototype.length` alone is not unclean; a remaining index still is (`8a8579cf`) | New control fails without the fix; 238/249 then kill |
| The trace's post-stop allowance covered only the collector's first-eight append path: 118,608 false violations in the full search | First full continuation run | Admit the crossing writer's bounded suffix search: ≤ 12 own reads and one `occurrences` write (`f7371872`) | Full search: 0 violations; a new control keeps an outside read a violation |
| verify's `value-cost-dimensions` step imported B's `values.ts` from the declared read-only snapshot, which has no `node_modules`, so `canonicalize` did not resolve; the step had never run under verify | First verify at `f7371872` (all other checks passed) | Import a temporary copy of B's Kernel source that resolves through the candidate tree (C) | Same 5,460 / 1,543 / 1,056 slices; verify at C |
| `tests/tooling/README.md` still called Proxy `{}` acceptance current | Layer 3/BASELINE agreement check | Corrected sentence (`8a8579cf`) | — |

GPT-6's own self-found defects (its draft report): the witness first read inherited descriptor fields
(now own fields only); the first sentinel-declaration check accepted a scalar `STOPPED` (four negative
controls now); stale derived V-ENV routes and held-only extras after the harness rewrite (attachments
above).

**Uncredited and transferred (owner choice 03 §2).** Eleven C1-group registrations in creation (6),
dispatch (3) and ingress (2) fail only at assertions made while an intrinsic the test itself replaced or
polluted is still live (`Object.freeze`, the global `Object`, `Object.prototype` or `Array.prototype`
members). The witness refuses those by design 03's rule. They are out of the active registry and listed,
with each refused call, in [uncredited-04.json](uncredited-04.json); TOOLS-02 owns them. Asserting after
restoration would qualify them; that test rewrite is TOOLS-02's. Five of the 87 C1 mutant meanings
have no qualifying kill at C in the C1 matrix or the registry, and none at B either: C-KIND-ORDINARY, C-FREEZE-ACTIVATION, C-FREEZE-EVENT, C-FREEZE-EVENTS (the four C1 ledger
rows below, same cause) and E-IDTEXT-CATCH (identity-text catch path; it survives at both). With the
eleven registrations they are the packet's uncredited value-cost evidence, transferred to TOOLS-02.

**Prior findings.**

| Finding | Disposition |
|---|---|
| KC3-R2-STOP-02 | One stop representation and explicit identity tests; SC10/SC11 reject review 02's false/null/boolean substitutions and nested/class forms; the alias form is a declared static gap killed by the runtime trace. All six review-02 forms are registered and killed (`value-cost.static`, `value-cost.bookkeeping-trace`). |
| KC3-R2-EVID-01 | Kill credit only through the source policy, the vocabulary and the exact error. Review 02's eight false-credit routes earn no credit (`test_review_02_false_credit_routes`). Downgrades are listed above and in the ledger. |
| KC3-R2-C1-03 | Loss-by-loss ledger under owner choice 02 §3 (below). |

**C1 ledger.** All 6,003 converted-test/mutant pairs (69 conversions × 87 mutant meanings over nine
files, 437 historical pairs) are requalified at B (test-only overlay) and C. 297 pairs keep a qualifying
kill on both sides. All 32 qualifying B kills that the converted test loses at C are replaced by a
qualifying kill of the same mutant in another maintained test, each confirmed selected alone with a
passing control (table below). Of the 63 historical B kills that do not qualify under the new rule, 59
have such a replacement and four have none at B or C (C-KIND-ORDINARY in creation; C-FREEZE-ACTIVATION,
-EVENT and -EVENTS in dispatch): uncredited, transferred to TOOLS-02. Over all 87 meanings no mutant
loses its last qualifying kill between B and C. Two unconverted tests lose V-FOREIGN-PROTO because their
`new Date()` input is now refused by the internal-slot check first; the mutant keeps seven qualifying
kills at C.

A replacement counts only when its leaf, selected alone, has a passing control and fails under the same
mutant at a witnessed assertion. A retained pair whose qualifying leaf came from a mixed matrix run counts
only if that leaf also qualifies selected alone; all 297 do.

**C1 losses and their replacements (owner choice 02 §3).** Each of the 32 losses is a converted test that
no longer kills a mutant its original killed at B with a qualifying assertion (each B kill confirmed
selected alone). The replacing assertion checks the mutant's obligation in the named test; it is shown
for one of the isolation-confirmed replacements per mutant. Every row, with all its confirmed
replacements, is in `evidence-04/c1-ledger.json`.

| Mutant (losses) | Obligation | Replacement: test › leaf, assertion |
|---|---|---|
| RC-ELEMENT-READ-TWICE (9) | each array position is read at most once | `value-refusal-cost.test.ts` › "V-D1 eight eager roots before authority: every position once, no forbidden mutation", `assert.deepEqual` line 651 |
| MV1-element-read-replaced-by-descriptor-value (7) | one ordinary read per array position, compared with its own descriptor | `values.test.ts` › "an array position read differently than it is owned is refused, not silently picked", `assert.deepEqual` line 417 |
| VAL-object-read-from-descriptor (7) | an object member's one ordinary read is compared with its descriptor | `values.test.ts` › "an object member read differently than it is owned is refused the same way", `assert.deepEqual` line 430 |
| MV3-array-symbols-listing-skipped (6) | arrays list their own symbols before acceptance | `capture-work.test.ts` › "an array with 4,096 symbol-keyed members is charged one byte per symbol", `assert.equal` line 569 |
| V-FOREIGN-PROTO (2) | a value with a non-plain prototype is refused | `values.test.ts` › "K11-R5-VAL-03 a prototype observation that swaps the live Object binding cannot pass a foreign prototype as plain", `assert.deepEqual` line 1704 |
| RC-ELEMENT-READ (1) | each array position's one ordinary read is taken | `value-refusal-cost.test.ts` › "V-D1 eight eager roots before authority: every position once, no forbidden mutation", `harness.ts` `accepted` → `assert.fail` line 552 |

Ingress O-APPENDOWN-PUSH (review 02's group loss) is one of the 59 historical replacements: `values.test.ts`
› "the retained structure and the canonical bytes are exactly the one value observed", `assert.equal`
line 1815. The direct, unadapted ingress run still shows B failing at the harness's acceptance check and
C throwing a `TypeError` in the subject first, as review 02 found.

**Criteria (implementer's assessment, not acceptance).**

| Criterion | Evidence at C |
|---|---|
| KC3-1, KC3-2, KC3-3 | Unchanged unit table, budget derivation and costliest witness (3,094,930 units, 1,048,555 bytes); stop protocol above; full continuation search 0 violations; registry kills of every charge and stop registration. |
| KC3-4 | Depth 2/16/31 counts and the eight-root Outcome schedule unchanged (`npm test`). |
| KC3-5 | N15 and every charge weakening killed by qualifying assertions (`value-cost.byte-charges`, `unit-table`). |
| KC3-6 | Transferred claims map to KC3-1/2/3/4 and Proxy refusal as in design 01. |
| KC3-7, KC3-8 | Proxy-first zero-trap and detectable-brand zero-listing witnesses (`value-cost.proxy`, `brands`) unchanged. |
| KC3-9 | Accepted bytes and diagnostics unchanged; C1 ledger as above. |
| KC3-10 | Layer 3/BASELINE agreement checked below. |
| KC3-11 | Verify `checks_passed` at clean C (below). |

**Layer 3, BASELINE and 007.** `values.md` (stop distinct from accepted values; only the crossing
operation's fixed accounting, one bounded stop issue, cycle unwind and root packaging remain), BASELINE
§work meter (SC10/SC11 bounded grammar and declared gaps; runtime trace; 38-shape and full searches) and
`sources.md` match `values.ts` and the tests at C. The roadmap, reference index, rewrite index and the
creation/Outcome/recovery descriptions need no change. 014 stays owner-pinned. Layer 1/2 unchanged.

## Limitations

The owner's limitations register, `docs/development/017-known-limitations.md`, is on branch
`claude/known-limitations` (`982234ec`), not on this branch, so it is named rather than linked. This
section maps the packet's accepted limits to its entries. It does not edit 017.

| This packet's accepted limit | Where it is decided | 017 entry |
|---|---|---|
| R1: own-key listing work before its length is known, one listing per root | values.md residuals; design 01 check Q5 | L-04 |
| R2: host objects with host-defined internal methods | values.md residuals; design 01 check Q5 | L-05 |
| R3: hash-table lookups are constant only in expectation | values.md residuals | L-06 |
| R4: own entries a listing walks but does not return | values.md residuals; owner choice 01 | L-07 |
| Q6: undetectable re-prototyped built-ins accepted as their own-data projection | values.md in-process capture; design 01 check Q6 | L-08 |
| Q7: request-envelope accessors or a Proxy envelope can run caller code between root captures | values.md request envelope; design 01 check Q7 | L-09 |
| B is a proven upper bound (gap 50,798 units over the costliest acceptance found), not the attained maximum | BASELINE; design 01 check Q3 | L-10 |
| SC10/SC11 are a bounded syntax guard; aliases, `.call`/`.apply`, computed or dynamic calls, shadowing and escaped state are declared gaps | design 03; BASELINE | L-11 |
| Kill credit only from the declared assertion vocabulary; uncredited mutants and C1 losses go to TOOLS-02 | owner choices 02 and 03; `tests/tooling/README.md` | L-12 |
| V-D1 is metered work; timing and heap are observations, not a gate | decision-05 | L-03 (on main) |
| The in-process binding has a cooperative contract; capture integrity against same-process global replacement is BINDING-01's | decision-01; invalidation-03 | L-02, L-01 (on main) |

Limits this packet relies on that no entry covers, proposed for owner approval:

| Proposed | Not guaranteed | Why acceptable now | Fix when | Expected fix | Source |
|---|---|---|---|---|---|
| L-13 | A request-wide work budget. Each captured root has its own budget B and no aggregate cap applies, so one request's refusal work is up to B per root, and the root count is bounded only by each consumer's own limits (for example `emissionsPerOutcome`) | Owner decision-05 item 5 chose per-root budgets; every root count is already bounded | A measured stall from a request with many roots | BINDING-01, or a consumer limit | decision-05 item 5; values.md fixed semantic limits |
| L-11 (widen) | Add: the runtime continuation trace and its search are finite declared searches (38 small shapes in `npm test`; the full design-03 search at C), not a proof over other shapes | Same reason as L-11 | Same as L-11 | TOOLS-02 | design 03 §2; design 03 check D2 |

## Validation and interpretation

Every run below used Node v26.10.0, npm 11.19.1 and Python 3.13.5 on macOS arm64, one job at a time,
detached under `caffeinate -i`, on a clean checkout (checked before and after). No earlier session's result
is reused. Verify ran at C. The requalification, ledger, isolation and continuation runs ran at
`f73718728837eaa6f8724a43c385f2da02cc4bf6`, C's parent: C changes only `tests/tooling/capture-dimensions.mjs`, which only verify's dimensions
step reads (`git diff --stat f7371872 2bf220e9`; no test, registry or requalification input names it). Under
design 03 step 7 those runs are unaffected evidence and were not repeated. Raw outputs, commands and digests are the C..H attachments
in `evidence-04/` ([manifest](evidence-04/manifest.json)).

**Verification command** (D2: the full continuation search is inside it, so no subset was needed):

```sh
python3 -B scripts/packet_tools.py verify --revision 2bf220e9e426c810f2505fa2d74d70197807e584 --spec docs/development/work/K1.1-correction-03/verification.json
```

Result: exit 0, **`checks_passed`**, no result reuse, 3,736 s (2026-10-18 07:23–08:25 UTC), tree clean
after ([verify.json](evidence-04/verify.json)).

| Check | Result at C |
|---|---|
| Tool tests | 609 pass |
| Inventory; adoption | `provenance_verified`; `revalidation_complete`: 1,549 origins, 636 counterexamples, 26 families, 415 members, 52 suite targets, 33 preserved |
| Mutation registries | 109 general, 321 refusal-guard and 238 value-cost registrations killed (`selected_cases_passed`) |
| Refusal and oracle census | 321 refusal checks / 321 registered; 29 oracle comparisons / 29 |
| Typecheck; repository tests; archive tests | pass; 4,123 pass, 0 failed/cancelled/skipped/todo; 4 pass |
| Kernel sweeps | 57/57 exits, 0 violations; 66 fault scenarios, 54,314 runs, 0 violations; poison sweep 48 files, 347 names, 2,061/2,061 tests in each of off/count/throw/reenter |
| Value-cost dimensions | 5,460 refused, 1,543 accepted (costliest 3,094,930 units, all byte-equal to B), 1,056 consumer cases |
| Value-cost continuations (full) | 1,862 shapes, 373,694 runs, 0 violations |
| Area report (advisory) | 261 changed paths, 48 behaviour paths; 388 touched open origins of 1,503 (296 pending, 92 pending_revalidation), 0 prose pending; 664 ungated |

The first verify, at `f7371872`, failed only its dimensions step (the defect fixed in C); its raw output
is retained in the same attachment.

**Requalification** (`tests/tooling/requalify-value-cost.py`, 2026-10-18 UTC; [B](evidence-04/b-matrices.json),
[C](evidence-04/c-matrices.json), [isolations](evidence-04/isolations.json)). B is
`b9c1e549` production byte-for-byte with only the test-only `harness.ts` overlay (digest in the metadata);
the direct ingress run is unadapted B.

| Selection | B (overlay) | C |
|---|---|---|
| C1 matrix, 88 plans × 9 files | 792 runs: 565 passed, 172 qualifying, 50 subject exception, 4 load error, 1 signal | 792 runs: 535 passed, 228 qualifying, 28 subject exception, 1 signal |
| Registry (238 registrations) | 96 inapplicable at B (file or API absent); 151 runs: 7 controls pass, 123 qualifying, 18 subject exception, 2 load error, 1 setup error | 256 runs: 18 controls pass, all 238 qualifying |
| Nine withdrawals (implementation 03) | 9 controls pass, 9 subject exception | same |
| Two single-edit stop-flag equivalents | killed (4 runs) | survive (the explicit propagation enforces the stop); their faithful analogues are registered and killed |
| Direct ingress O-APPENDOWN-PUSH | harness acceptance failure | subject `TypeError` |
| Isolations (782 of 789 leads) | 311 controls pass; 250 qualifying, 61 not | 471 controls pass; 471 qualifying |

Seven leads were not isolated: their leaf ("every poisoned run returned exactly what the unpoisoned run
returned", `poison-catalog.test.ts`) depends on earlier tests and fails selected alone at B and C. A
scratch screen (unmaintained, never credit) ran each lead's control alone first; those seven earn no
credit and are listed in `c1-ledger.json`. The join of ledger and isolations is also a scratch analysis;
its output is `c1-ledger.json` › `dispositions.json`.

**Continuation search** ([continuations.json](evidence-04/continuations.json); also inside verify):
1,862 shapes (38 small), 373,694 runs, every run compared with pristine capture; 0 violations, 0 caller-code
calls; stops none 12,883 / work 187,343 / bytes 173,468; all seven crossing kinds; 1,868,169 cycle unwinds.

**Checks not run.** The live-provider canaries, the historical large-memory/timing probes and
`check:builder-docs` (its pre-existing missing `work/DESIGN-AUDIT-01/` link at B) are declared
`profiles_not_run` in the verification specification. Timing is an observation only.

**Third-party code.** None added. The analysis helpers use the existing TypeScript 5.9.3 compiler API
(Apache-2.0, already a dependency); no compiler source is copied. Node v26.10.0 assertion internals were
read to scope the vocabulary (GPT-6 session); none was copied.

**Strongest remaining risk.** The evidence tooling grew again this round, and four of its defects
surfaced only on the first full runs. Each fix is narrow and has a control, but a reviewer can find more
of the same kind. Under owner choice 03 those are P3 and go to TOOLS-02.

## Handoff

Ready for one independent review under owner choice 03 item 4 (a fresh Codex GPT-6 session, or a fresh
Claude Code session that did not implement). Base B, C and H, and the verified pushed SHA, are in the
external handoff. No pull request, merge, force-push, hold release or successor release; no
self-acceptance. On acceptance the packet requests release of the invalidation-02 V-D1 hold (metered
meaning, R1–R4) and of the invalidation-01 classification hold (detectable kinds), as before.
