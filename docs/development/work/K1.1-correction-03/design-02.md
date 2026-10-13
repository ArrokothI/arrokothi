# Design 02 — K1.1-correction-03

Coding agent: a Claude Code cloud session (`claude-opus-5-5`), 2026-10-13, Node v26.10.0. Branch
`claude/k1.1-correction-03`; base B `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`; reviewed H
`5f586b176089987fa3667e4c03f26b3dac0a5bfb`. Governing records: [brief 02](review-01/brief-02.md) and
[review 01](review-01.md) (findings KC3-R1-STOP-01, KC3-R1-EVID-02, KC3-R1-DOC-03), with every record that
[design 01](design-01.md), its [design check](design-01-check.md) and [owner choice 01](owner-choice-01.md)
bind. Owner direction for round 2 (2026-10-13), as relayed in this session: correct in this packet under
brief 02; write this note and continue to build without waiting for a design check, since these are
corrections inside the approved design; stop and ask only if a fix would raise B, add a residual or an
accepted limit, or change accepted bytes or diagnostic meaning.

No fix below does any of those. §5 shows it for each one.

## 1. Mechanism

### 1.1 STOP-01: the stop is a reported result, and every caller acts on it

**What went wrong.** Design 01 enforced the stop in the helpers. Each charged helper calls `spend` first,
and `spend` refuses once the root has stopped. Two things escaped that:
- a listing helper makes its native call *before* its charge, so it had no gate in front of the call;
- `record` returned `void`. A diagnostic that crossed B therefore stopped the root without telling its
  caller, and the caller went on to its next statement.

In H those two meet once: the symbol diagnostic in `captureObject` is followed by the names listing. Other
sites had the same flaw without an observable effect. After `capture` returned `REFUSED` for a stopped
child, its parent went on to the next sibling and relied on that sibling's helper to notice. An array's
extra-name diagnostic was followed by a loop that classified each listed name before its first charged
helper. Both are value-dependent work after the stop. Neither the static check nor the runtime oracle
could see these continuations: SC2 checks that a listing and its charge are adjacent, and the oracle's
nine shapes were required *not* to stop.

**The invariant (SP).** Only two functions change the stop state: `spend` (the work stop) and `charge`
(the byte stop). Each one returns whether reading may continue. Every function that calls one of them,
directly or through another such function, is *stop-capable* and reports the stop to its own caller in its
return value. Every caller of a stop-capable function tests that result at once and returns on a stop.
So:

- **SP-reach.** Every statement of the traversal after a stop-capable call runs only if that call reported
  no stop. The only code that runs after the stop transition is the stop-issue record inside
  `spend`/`charge` (the "plus one operation" of design 01 §1.2), the comparison that detects the stop in
  each active frame, that frame's `finally` (one cycle-set delete), and `acceptMetered`'s freezing of the
  counts. No helper, listing, allocation, per-name loop, diagnostic or charge runs.
- **The listing exception, restated.** A listing helper is the one place where native work precedes its
  charge, because its length is unknown until it returns. That listing is charged right after it returns,
  so if its charge crosses B it is the "one operation" past B. Nothing follows it. The R1 residual is
  therefore exactly one listing per root, structurally: no later listing can start once the root has
  stopped.

**Code changes (`values.ts`).**
1. `record` returns `boolean`. A new `refuse(state, issue)` returns `REFUSED`, or `STOPPED` when the
   diagnostic stopped the root. Every terminal refusal is `return refuse(…)`. A non-terminal one is
   `if (!record(…)) return STOPPED;`.
2. `capture`, `captureArray`, `captureObject` and `checkMember` return `STOPPED`, distinct from `REFUSED`.
   A container loop tests `item === STOPPED` (and `member === STOPPED`) before anything else and returns.
   The traversal result type is `Visited = BoundaryValue | REFUSED | STOPPED`. `acceptMetered` maps a
   root's `STOPPED` to the refusal, whose stop issue is already recorded.
3. A failed byte charge returns `STOPPED`, never `REFUSED` (`charge(…) ? value : STOPPED`).
4. Each listing helper begins with the gate `if (state.stopped) return STOPPED;`, before its native call.
   The charged helpers already gate through `spend`. `capture` begins with the same gate.
5. **An evidence seam for the stop oracle.** `acceptMetered(value, workBudget, byteLimit)` takes both
   thresholds. `canonicalize`, `boundaryValueIssues` and `isBoundaryValue` pass the constants B and
   1,048,576, so every consumer path is unchanged. Only the test-only `captureWithWork` export, which
   `index.ts` does not re-export, accepts lower values. It refuses a threshold above the constant, so the
   evidence path can only stop earlier, never accept more. The stop messages print the threshold in
   force, which is the same text at the constants. With the seam, a test can place the stop at *every*
   charge of a small shape, instead of building a 3-million-unit prefix for each position.

**Static check (`capture-metering.ts`), three new rules.**
- **SC10 stop propagation.** The stop-capable set is computed from `values.ts` by fixpoint: `spend`,
  `charge`, then every top-level function that calls a member. A function added later that calls `record`
  is included without a list edit. In every function except `acceptMetered`, each call to a member is in
  one of these forms:
  - the whole returned expression (`return refuse(…)`, `return captureArray(…)`);
  - the test of a conditional return whose stop branch is `STOPPED` or `false`
    (`return charge(…) ? value : STOPPED`);
  - `if (!call(…)) return STOPPED;` or `return false;`;
  - `const x = call(…);` followed immediately by `if (x === STOPPED) return STOPPED;`.

  Anything else fails the rule: a bare call statement, a call as an argument, a comma expression, a stop
  branch that returns `REFUSED`, or a test that is not the next statement. `acceptMetered` is the root.
  Its one call to `capture` maps `STOPPED` to the refusal, and the rule pins that one form.
- **SC11 one writer.** `state.stopped` and `state.stop` are assigned only in `spend` and `charge`.
- **SC2 listing helpers, extended.** The first statement is the stop gate, the second is the listing and
  the third charges its length.

**Runtime oracle (`capture-stop.test.ts`, wrapped child).** It has three parts.
- **The reviewer's family at the real B.** The direct alignments −2…+2 with 257 names; names 0, 1,
  4,096 and 65,536; wrappers 1, 15 and 29; a null prototype; distinct rows. Each case counts the actual
  native listings: per call on the target object, and Σ(1 + length) over every listing. It asserts that
  sum equals the charged listing units, along with the stop kind, the exact units and the target's
  listing counts. At offset 0 the target's names are listed zero times. At −1 and −2 they are listed
  once and charged. At +1 and +2 the symbols listing crosses and the names are never listed.
- **The 14 consumer schedules, with whole-state assertions.** The three exported entry points, both
  creation roots, ingress, the three recovery lists, progress, Emission, result, error, and the eight
  eager roots of a visible caller's unauthorized Outcome. Each root keeps its own meter: per root, one
  symbols listing and no names listing on the target. Accepted state is unchanged.
- **An exhaustive stop-position search (declared, §4).** For each shape of a declared set, the oracle
  captures it at every work budget from 0 to its full cost, and at every byte limit from 0 to its full
  size. At each run it asserts four things:
  - Σ(1 + length) of native listings on caller objects equals the charged listing units, exactly;
  - native descriptor calls on caller objects, apart from a genuine array's `length`, equal the element
    units plus the descriptor units, exactly;
  - the issues before the stop issue are a prefix of the unstopped run's details, with suffix counts no
    greater, and the stop issue is the last entry;
  - the meter counts are monotone in the threshold.

  An observation after a stop at any position shows up as an uncharged native call.

### 1.2 EVID-02: a kill needs a witnessed assertion in a selected test

**What went wrong.** `value-cost-probe.mjs` read the TAP totals and called any failing run `reached` and
`killed`. Node reports a file that cannot parse or load as one synthetic failed test, so a setup failure
earned a kill. The probe collapsed process failure, test failure and assertion failure into one boolean.
TOOLS-01's outer classifier trusts the observation it is given, as F3 intends. The fix is in the adapter.

**Why not a stack frame.** TOOLS-01 [owner choice 09](../TOOLS-01/owner-choice-09.md) rejected
frame-based attribution: a production `AssertionError` built with `stackStartFn` shows only test frames.
The witness below never reads a stack.

**The witness (import-site attribution).** The probe runs the case's selected file in one Node process,
without `--test` isolation, with:
- `--import tests/tooling/value-cost-witness.mjs`. Its synchronous module hooks give every *test-side*
  module that imports `node:assert` or `node:assert/strict` a wrapping module instead. A test-side
  module is any module under `packages/kernel/tests/`. The wrapper wraps the default assertion function
  and every assertion method. When one of them throws an `AssertionError`, the wrapper adds it to a
  process-local `WeakSet` and rethrows it. Every other module, subject code and dependencies included,
  receives the real `node:assert`.
- `--test-reporter=tests/tooling/value-cost-reporter.mjs`, which writes each test event to a file,
  together with whether its failure's `cause` is in that `WeakSet`. Reporter and tests share one process,
  so the cause is the same object.

So:
- an error raised while an assertion's arguments are evaluated never enters the wrapper;
- an `AssertionError` that subject code constructs, or throws through its own `node:assert`, is never
  witnessed;
- a harness assertion counts because the harness is a test-side module. `accepted()` and `refused()` in
  `harness.ts` now fail through `assert.fail` with their existing messages, instead of `throw new Error`.

**The evidence states.** Exactly one per run, in this precedence:

| State | Condition | Probe exit | Runner result |
|---|---|---|---|
| `spawn_error`, `output_limit` | The test process could not start, or its output passed the case's inner limit | 3 | `setup_error` (invalid) |
| `parse_error`, `load_error` | No test event and no summary. The witness's uncaught-exception monitor saw a `SyntaxError` while modules loaded, or another error | 3 | `setup_error` |
| `setup_error` | No summary for any other reason | 3 | `setup_error` |
| — | The run passes the case timeout | — | `timeout` (the runner kills the process group; the probe sets no inner timeout) |
| `no_selection` | Summary present; no selected leaf ran | 17, `reached: false` | `uncovered` |
| `assertion_failed` | At least one selected leaf failed with `testCodeFailure` and a witnessed cause | 17, `reached: true` | `killed`; `failures` names each such leaf and its assertion |
| `passed` | At least one selected leaf ran; every executed leaf passed; no failure event; exit 0 | 0 | `survived`, or a valid control |
| `hook_failure`, `cancelled`, `test_timeout`, `subject_exception`, `unattributed_failure` | Some other failure: a hook, a cancellation, a test timeout, a `testCodeFailure` with an unwitnessed cause, or a failure outside any leaf | 3 | `setup_error`; the probe's JSON keeps the state and the failing leaves |

Only `assertion_failed` earns credit. Exit 3 is deliberately neither 0 nor the case's `failure_exit`. The
unchanged TOOLS-01 parser therefore refuses the observation, and every non-qualifying state lands in a
non-credit runner category. The probe's own JSON, which the runner keeps, names the finer state.

**Controls (tool tests, `tests/tooling/test_value_cost_probe.py`).** They run the real probe and the real
`execution_outcome` on temporary copies of the tree.
- Positive controls:
  - the passing control: the real `value-cost.unit-table` case is `passed`, and the runner calls it a
    valid control;
  - a genuine selected assertion failure: that case under its registered "visit unit uncharged" mutant is
    `assertion_failed`, and the runner calls it `killed`.
- The reviewer's two negative controls: `const = ;` appended to `values.ts` gives `parse_error`, and a
  top-level throw gives `load_error`. The runner calls both `setup_error`.
- Synthetic controls:
  - a subject exception during argument evaluation, and a subject-internal `AssertionError`: both
    `subject_exception`;
  - a hook failure, a cancelled subtest, no selection, a hang (runner `timeout`), and an inner output
    overflow;
  - a harness-style helper failing through `assert.fail`: `assertion_failed`.

**Requalification.** Every registered value-cost mutant is run again under the new probe. A mutant stays
registered only if it is `killed` by a witnessed selected assertion. For each that is not:
- its test is strengthened so that the failure it already detects is asserted; or
- it is withdrawn from the registry and reported as a downgrade.

C1's group kills are judged by the same rule on both sides. B's original tests run under the same witness,
with the same harness assertion vocabulary, so a pair is compared at one evidence level. §3 gives the plan
and §6 Q5 the answer.

### 1.3 DOC-03: current summaries stay inside Q6

The canonical owner (`values.md`) and the detailed BASELINE already state Q6's limit. These current
summaries restate the refusal claim more broadly, and each now names the detectable-kind scope and links
the declared limit instead of restating it:
- `mental-model/roadmap.md`, the K1.1-correction-03 entry (the finding);
- BASELINE's summary sentence at its head (`002-implemented-kernel-baseline.md`, lines 26–27);
- the module comment and the `unsupported_form` comment in `values.ts`;
- 007's scope and acceptance bullets for this packet.

`014-owner-progress-summary.md` line 172 describes brief 01's scope and claims no refusal. Verify pins
014 at B as the owner's summary, so it is left for the owner. The review's WeakRef and
FinalizationRegistry witnesses become maintained cases, asserting the permitted `{}` acceptance.

## 2. Why each finding and criterion closes

| Item | Closing mechanism and argument |
|---|---|
| KC3-R1-STOP-01; KC3-1/2/6 | **Structural, checked twice.** SP-reach follows from SC10 + SC11: the stop flag changes only inside `spend`/`charge` (SC11), each reports it, and every call of a stop-capable function is in a form that returns on the stop (SC10). The only code after the transition is the unwinding listed in §1.1. The listing gate (SC2) is defense in depth for a helper reached some other way. **Runtime:** the exhaustive stop-position search checks exact listing and descriptor accounting at every charge of every declared shape, for both meters. The real-B family and the 14 consumers check the original counterexample, its neighbors and every root consumer. **Mutants:** single-layer bypasses (a bare `record`, a `REFUSED` stop branch, a dropped nested `STOPPED` test, a removed listing gate, a stop write outside `spend`/`charge`) are killed by the static case. Two-layer bypasses, which are H's own shape and a `record` that always reports success with an ungated listing, are killed by the runtime case. KC3-2's first-over-budget stop now holds at every continuation. KC3-6's transferred cost claims close with it. |
| KC3-R1-EVID-02; KC3-5, TOOLS-01 F3, 012 | **Evidence-state contract (§1.2)** with positive, negative and synthetic controls as maintained tool tests. Import-site witnessing, not frames or error-class names, attributes each credited failure to a test-side assertion in a selected leaf. Every non-qualifying state exits 3, a non-credit runner category. Requalification of all registered mutants and of C1 at both B and C under the same rule. |
| KC3-R1-DOC-03; KC3-10 | **Review of every current restatement (§1.3)** against `values.md` and the design check's Q6. Maintained WeakRef/FinalizationRegistry witnesses assert the permitted acceptance, so a later broadening of the refusal claim must change a test. |
| KC3-9 | §5: no accepted value, canonical byte, diagnostic decision or stop position changes. The suite's exact issue and count assertions run unchanged except where the stop oracle adds cases. |
| KC3-11 | New clean C, full verify detached, `tool-tests` minimum raised by the new tool tests. |

## 3. Accepted designs relied on

- **Design 01's helper decomposition.** Still fit as a decomposition. Its closing argument was incomplete,
  because it charged at the helper but propagated nothing. SP supplies the missing propagation. Fixed
  here as a correction inside the approved design.
- **The byte stop and the DEC-7 collector (K1.1-correction-02, K1.2-correction-01).** The byte stop always
  set the shared flag. The collector's diagnostics were never stop-capable before the meter existed, so
  "continue after a diagnostic" was safe under the byte model. The meter made `record` stop-capable
  without making it report. This is the inherited interaction the brief names. No accepted behavior
  changes: after a stop every later charge and record was already a no-op, so issues and counts are
  identical.
- **TOOLS-01's runner and F3.** Fit. The parser refuses an observation whose exit disagrees with it, and
  the probe now uses that path for every non-qualifying state. No tool code changes. Owner choice 09's
  frame objection is respected: no stack is read.
- **The `harness.ts` assertion helpers.** They threw plain `Error`s. The change keeps each message and
  makes the failure a test-side assertion. It is a helper module, so under the owner's 2026-10-12
  supplement it reopens no origin. If the adoption census pins its digest, the census is recomputed with
  the tool's own functions.

## 4. Corpus

Each item is a maintained test, with its provenance kept in the test.

| Source | Maintained form |
|---|---|
| Review 01 [`probe-stop-boundary.mjs`](review-01/probe-stop-boundary.mjs), direct family | `capture-stop.test.ts`: offsets −2…+2; names 0/1/257/4,096/65,536; wrappers 1/15/29; null prototype; shared and distinct rows. Each with exact units and stop kind, the target's names and symbols listing counts, and Σ native listing units = charged listing units |
| The same probe's consumers | The 14 schedules with whole-state assertions and per-root listing counts on the target |
| SP generalization (self-found continuations, §1.1) | The exhaustive stop-position search, declared in its test. Shapes: an object with a symbol and names (ordinary and null prototype); non-enumerable, accessor and `undefined` members; refused member names (lone surrogate, overlong, escaped); an array with an extra name and a symbol; holes, `undefined` and accessor elements; strings that are accepted, refused for a lone surrogate, or refused for length; non-finite numbers, symbols, functions and bigints; a cycle; too deep; foreign; a re-prototyped Map; a Proxy; mixed accepted and refused siblings at depth 3; shared aliases; an accepted document. Every work budget 0…U and byte limit 0…Y for shapes up to 2,000 units. For the 4,097-member and over-named-array shapes: budgets 0…256, every 61st, and the last 256 |
| Review 01 [`probe-evidence-attribution.py`](review-01/probe-evidence-attribution.py) | Its two negative controls and its passing control, plus a genuine assertion failure, in `test_value_cost_probe.py` |
| Review 01 leaf audit: ingress `O-DEFINEDATA-LITERAL` and the other 22 runs without `ERR_ASSERTION` | Requalified under §1.2. Each is reported as qualified, strengthened or withdrawn |
| Review 01 [`probe-declared-limit.mjs`](review-01/probe-declared-limit.mjs) | `capture-refusals.test.ts`: re-prototyped WeakRef and FinalizationRegistry are accepted as `{}`, labelled as Q6 scope witnesses |
| Registered mutants | `value-cost.stop` (runtime, two-layer bypasses) and additions to `value-cost.static` (single-layer bypasses), §2 |

## 5. Accepted values, bytes, diagnostics, B and residuals

- **Accepted values and bytes.** An accepted value never stops, so every accepted path takes exactly the
  same statements and charges as at H. Canonical bytes are produced by the unchanged serializer.
- **Diagnostics.** At H, after a stop every `record` was refused by `spend` and every `charge` by its own
  gate, so no issue was added and no count changed after the stop. Returning at once yields the same issue
  list, the same units (a refused `spend` added nothing), the same bytes and the same stop kind. The
  `too_much_work` and `too_many_bytes` messages are identical at the constants.
- **B and residuals.** B is unchanged. R1 gets narrower in practice, at most one listing per root past B,
  which is what design 01 already claimed. No residual or limit is added.
- **The evidence seam** can only lower a threshold, and only on a path no consumer reaches.

So no owner question is needed under the owner's stop conditions.

## 6. Brief 02 questions

1. **The invariant and where it is enforced.** SP and SP-reach (§1.1). It is enforced by SC10, SC11 and
   the extended SC2 statically, and by the stop oracle at run time. The only things that legitimately
   finish or unwind after a crossing charge are:
   - the crossing listing, which ran before its own charge (R1);
   - the stop-issue record inside `spend`/`charge`;
   - in each active frame: the test that detects the stop, the return and the `finally` cycle-set delete;
   - `acceptMetered`'s freezing of the counts.

   Diagnostics now return their stop result (`record`/`refuse`). Listing helpers gate before their native
   call.
2. **Coverage.**
   - Both stops set the one flag and both report through their boolean.
   - Every helper class:
     - visit-covered helpers are reachable only between a successful visit charge and the frame's first
       stop-capable call;
     - charged helpers gate through `spend`;
     - listing helpers have an explicit gate;
     - per-name work runs only in loops reached after their listing's charge succeeded.
   - Nested returns carry `STOPPED` distinct from `REFUSED`, and parents test it first.
   - A refused sibling continues the loop; a stopped one returns.
   - Each eager root has its own state.

   Static and runtime checks divide the obligation as follows. SC10/SC11 prove SP-reach for every call
   in the declared syntactic forms, over the whole file. The runtime search covers SC10's stated gaps on
   the declared corpus: a call through an alias, recursion outside the traversal, and a helper reached
   another way.
3. **Distinguished wrong implementations.**

   | Wrong implementation | Detected by |
   |---|---|
   | An extra listing after a diagnostic | SC10 (bare `record`), SC2 (missing gate), and at run time exact listing accounting at the diagnostic-crossing budget plus the real-B offset-0 family |
   | A missing charge | The existing exact unit tests and SC2 |
   | A late charge | Exact accounting at the budgets between the native call and its charge |
   | Stale stop state | SC11; at run time, duplicated stop issues or units past the crossing, in the unit table and the search |
   | Duplicated own-data reads | Not observable at run time. The existing structural pin (`helperContainerUses`) and its registered mutant `RC-ELEMENT-READ-TWICE` keep them |

   The search includes every near-budget position that the old nine-shape oracle excluded.
4. **A reached qualifying assertion.** A selected leaf ran in a process that loaded and completed. It
   failed with `testCodeFailure`, and its cause is an `AssertionError` thrown out of an assertion function
   that a test-side module imported. Other cases are told apart as follows:
   - a file-load failure has no events and no summary, so it is `parse_error`/`load_error`;
   - a hook failure is `hookFailed`;
   - an exception in the test body is an unwitnessed cause (`subject_exception`);
   - cancellations and test timeouts have their own failure types;
   - no matches is `no_selection`.

   Custom harness assertions count by import site, not by error class. An error during argument
   evaluation never enters the wrapper.
5. **Which kills can be credited.** Settled by running every registered mutant under the new probe. The
   report gives the per-mutant result. The reviewer's direct audit gives the expectation: 204 runs had an
   `ERR_ASSERTION` event and 23 did not. Of those 23:
   - 15 failed through `accepted()`/`refused()`, which now count by import site;
   - 3 were Kernel exceptions (`O-APPENDOWN-PUSH` ×2, `O-DEFINEDATA-LITERAL`);
   - 6 were `inWrappedChild` children that crashed under a rethrowing catch.

   The Kernel-exception and child-crash runs either gain an explicit assertion of the property the test
   already claims (a boundary returns a result and never throws; capture contains a throwing
   observation), or they are withdrawn and reported. C1 is judged at both B and C under the same rule. A
   pair that neither side kills with a witnessed assertion is reported as unchanged at that evidence
   level and earns no credit.
6. **Current restatements.** §1.3. Each summary names the scope and links the canonical limit, rather than
   restating it, so none becomes a second rule owner.

## 7. Questions for the owner

None. If requalification shows a C1 loss that cannot be restored without changing a converted test's
claim, the report will raise it as a question rather than settle it.
