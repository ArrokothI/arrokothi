# Independent review 02 — K1.1-correction-03, round 3

Acceptance is withheld for exact H `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`. The required clean-C verification, corpus and mutation runs pass. Review 01's concrete runtime stop defect and Q6 documentation defect are corrected. The new search nevertheless reproduces false assertion credit, a stop-enforcement oracle gap, and an unclosed C1 conversion obligation. These are evidence/closure findings; the search found no new accepted-value regression or post-stop continuation in **unmodified C**.

This is the second independent review requiring changes in subsystems corrected after review 01. **006's stop-and-redesign rule fires.** The root-cause note and owner options below replace a patch list. No further patch round starts before the owner chooses a route.

## Identity, authority and access

- Reviewer: **Codex Desktop, local session `01a13ae6-14a7-7f20-a52f-f484b0614df4`, model `gpt-6-astra`, reasoning effort `xhigh`**. Identity was read from this session's local `turn_context`, not inferred from a report. Work occurred on 2026-10-14 America/New_York; final probe timestamps are 2026-10-15 UTC. This is a separate review session from the Claude Code cloud implementer (`claude-opus-5-5`). No subagents were used. The model is the same model family/name as review 01; no diversity claim is made.
- Repository/branch inspected: `ArrokothI/arrokothi`, `claude/k1.1-correction-03`.
- B, cumulative review and policy baseline: `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.
- C, payload executed: `ad9bc8640d261ace8af5e75c47aad1bad3ca84d7`.
- H, the sole candidate this verdict concerns: `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`.
- Prior review: H `5f586b176089987fa3667e4c03f26b3dac0a5bfb`, recorded at `c91b82d0fe6c2db04f2683d71873eec7618b643b`, [review 01](review-01.md) and [brief 02](review-01/brief-02.md).

I had full local pinned source, Git objects/history, the cumulative binary-capable B..H diff, the C..H diff, reports and their attached ablation/requalification records, and a working shell. B is an ancestor of C; H is C's direct child. C..H changes exactly 007 and `implementation-03.md`; executable payload is identical at C and H. The 145-path cumulative diff is retained in full, including its large evidence additions. [Identity](review-02/identity.json), [pinned inputs](review-02/pinned-inputs.json), [history](review-02/history.txt), [changed paths](review-02/changed-files.txt), [cumulative diff](review-02/cumulative.diff), [administrative diff](review-02/administrative.diff).

Access limits: filesystem writes are restricted to authorized workspace/temporary locations and network access is restricted. I did not authenticate the current remote branch or inspect the implementer's private cloud session or private owner conversations. Owner directions below are direct user-supplied authority. Implementer verification stdout was not attached, so I did not treat its reported hash as accessible evidence: I independently executed the required verification and retained its raw output. No required source or run remained inaccessible; 006's external-blocker path was not needed.

I read AGENTS.md and 006/007/008/012 at B; the mental-model front door/reference and affected value/Kernel owners; the development baseline; the relevant prior-art reading-map sections; release 01, brief 01, design 01/check, owner choice 01, review 01/brief 02, design 02, implementation 01–03, and their ablation/requalification records. The architecture and slice-audit skills guided the review. [Coverage was derived before reading the implementation reports](review-02/coverage-before-reports.md), then reconciled against them. Prior acceptance/design is evidence, not an exemption. [Record reconciliation](review-02/record-audit.json) checks prerequisite identities, adoption and C1 maps; all 68 files in the prior review manifest match their recorded sizes and SHA-256 values ([audit](review-02/prior-manifest-audit.json)).

### Owner supplements — verbatim, separate from findings

```text
2026-10-12: the owner choice 01 standing rule covers a changed witnessed test, not a changed helper
module. artifact-21fb34d9 and artifact-ada9f66c stay complete. The owner accepts the 007 TOOLS-02 scope
edit and the kernel-sweep timeout of 2,400 s.
2026-10-14: round 2 was pre-approved past design 02 except on stop conditions, and none was raised.
docs/development/014-owner-progress-summary.md is an owner summary pinned at B. Its 'next steps' line
about K1.1-correction-03 describes brief 01's planned scope, not current behaviour. The owner updates
014 at integration, and it is not a DOC-03 instance.
```

These decisions are applied. There is no finding about missing design-02 approval, the helper-only origins, the accepted TOOLS-02 edit/timeout, or 014's planned-scope line.

## Executed verification and evidence reconciliation

The required command ran in a **fresh, clean, detached clone at C**, with independent Git objects, under Node **v26.10.0**, npm 11.19.1, Python 3.14.6, macOS arm64. Dependencies came from the existing local npm cache. No other validation job ran during verify; process-name inspection before launch found no competing Node/Python/npm validation. Desktop/background services were present. The clone was clean before and after.

```sh
python3 -B scripts/packet_tools.py verify --revision ad9bc8640d261ace8af5e75c47aad1bad3ca84d7 --spec docs/development/work/K1.1-correction-03/verification.json
```

Result: exit 0, **`checks_passed`**, no result reuse. [Complete stdout](review-02/verify.json), [stderr](review-02/verify.stderr.log), [run/environment record](review-02/verify-run.json), [derived summary](review-02/verification-summary.json). The recorded monotonic duration is 3,299.987 seconds. The raw UTC timestamps span longer; I retain both observations without attributing that discrepancy to an unverified cause. Timing is not an acceptance gate.

| Required check | Independent result |
|---|---|
| Tool tests | 599 pass |
| Repository tests | 4,114 pass; zero failed, cancelled, skipped or todo |
| Typecheck; archive tests | Pass; 4 archive tests pass |
| Inventory/adoption | `provenance_verified`; `revalidation_complete`: 1,549 origins, 1,125 counterexamples, 26 families, 415 members, 52 suite targets, 37 preserved |
| Mutation registries inside verify | 109 general, 321 refusal-guard, 231 value-cost registrations reported killed |
| Kernel sweeps | 57/57 exits; 66 scenarios and 54,314 fault runs, zero violations; poison sweep 48 files, 347 names, 2,052 passing tests in each of off/count/throw/reenter |
| Advisory area report | 145 changed paths, 35 behaviour paths; 342 touched open origins of 1,457 (296 pending, 46 pending_revalidation), zero prose pending; Kernel 341 and tooling 10 overlap; 664 ungated origins |

The area report is advisory under owner choice 07, over-includes lexically, and does not close adoption work. Its full lists are in `verify.json`.

**After verify**, I sequentially reran the maintained eight-file value corpus (**475/475**), adoption corpus, and all three mutation registries. All pass again, with the same 109/321/231 classifications and a clean C clone throughout. [Commands, order and cleanliness](review-02/required-followups.json), [summary](review-02/followup-summary.json); raw outputs are the corresponding `capture-corpus`, `adoption-corpus`, `mutations`, `refusal-guards` and `value-cost` logs in [the evidence directory](review-02/README.md).

Then I ran the independent review probes and focused follow-ups. [Review command record](review-02/review-probes.json), [follow-up command record](review-02/extra-probes.json). The separate B comparison clone retained only an untracked dependency symlink, `node_modules`; its tracked files were restored after C1 requalification. The required C clone stayed completely clean. `check:builder-docs` at B and C has exactly the same pre-existing missing target from `014-owner-progress-summary.md` to `work/DESIGN-AUDIT-01/` ([B](review-02/builder-docs-B.stderr.log), [C](review-02/builder-docs-C.stderr.log)). C..H adds no affected builder documentation.

All 231 submitted value-cost observations were inspected programmatically: each has a named witnessed failure; five also contain nonqualifying leaf failures. This is **not** a claim that all 231 kills are false. The counterexamples below establish that the witness itself does not enforce its attribution promise. Mixed runs containing an independently genuine assertion are not used as false-kill counterexamples. [All extracted observations](review-02/value-cost-observation-audit.json).

### C1 and adoption

The historical reduced matrices reconcile to 69 conversions and 437 B test/mutant pairs: 383 retained, four restored, 37 replaced elsewhere, eight vanished at B, five B cascades; no retained pair is credited solely through disappearance at C. I inspected/reconciled those matrices and their source transformations, rather than rerunning all 1,566 historical file/mutant combinations. Their disclosed historical timeouts/cascade limits remain limits of that evidence.

The new requalification was independently rerun at B and C: all five group controls pass; the nine withdrawals and two equivalent single-edit registrations reproduce the report. Eight withdrawals have no qualifying kill on either side. **Ingress O-APPENDOWN-PUSH has a qualifying B failure and only subject exceptions at C.** The two single-edit byte-stop-flag mutants survive C because return propagation now enforces stopping; the faithful two-edit analogues are killed in the current registry. The 231-registration arithmetic reconciles: 216 retained/ported + two faithful analogues + twelve stop mutations + MV3. C1 provenance is 153 group registrations plus MV3, rather than the former 162. [B/C requalification output](review-02/c1-requalification.stdout.log).

The replacement O-APPENDOWN-PUSH registration in `c1.values` has three named `assert.equal` failures. The O-DEFINEDATA-LITERAL replacement in `c1.creation` has a named failure plus a separate subject exception; only the former is creditable. MV3's 4,096-symbol byte-charge assertion is present and killed. These are real packet-level sensitivity observations; finding C1-03 explains why they do not by themselves satisfy C1's per-converted-test condition.

Adoption reconciliation preserves the owner-authorized 15 reopened origins, 96 removed stale witnesses (76 linked, 20 already transferred), and 24 additional limited members. The two helper-only origins remain complete by the owner supplement. The additive C2-LIMIT path retains decision/list digests, origin membership, uniqueness, old-list exclusion and the requirement that a listed member remain unbound. No acceptance or P1/P2 completion is inferred from `revalidation_complete`.

## Prior findings and declared search

| Review-01 finding | Disposition at exact H |
|---|---|
| KC3-R1-STOP-01 | Its actual post-diagnostic listing is corrected. The original probe now fails its old “violation reproduced” assertion because the target names listing is empty. The unchanged fixtures with corrected expected assertions pass all real-B alignments and 14 consumer schedules. Current-C source tracing and the new helper-entry search find no post-stop continuation. Required enforcement closure remains open through R2-STOP-02 below. |
| KC3-R1-EVID-02 | Parse/load counterexamples are corrected with **both** new support files copied. Control passes 23 leaves; syntax and top-level throw are non-credit `setup_error`, with `parse_error`/`load_error` observations. The broader assertion-origin obligation remains open through R2-EVID-01. |
| KC3-R1-DOC-03 | Closed within Q6. WeakRef and FinalizationRegistry still accept as `{}`, as permitted; the broad roadmap sentence is gone and its detectable-kind qualifier is present. No new current Q6 overclaim was found. 014 is excluded by the direct owner decision. |

Evidence: [adapted stop probe](review-02/rerun-stop-boundary.mjs) and [output](review-02/stop-boundary.stdout.log); [attribution rerun](review-02/rerun-evidence-attribution.py) and [output](review-02/old-attribution.stdout.log); [Q6 probe](review-02/rerun-declared-limit.mjs) and [output](review-02/declared-limit.stdout.log). Original failing-probe stderr is retained separately. The adaptations preserve the inputs and observation machinery and change the expected disposition; the attribution rerun additionally copies `value-cost-witness.mjs` and `value-cost-reporter.mjs` as required.

The search covered the following finite domains, after the required corpus/registries:

- **Review-01 dimensions rerun:** 5,460 refused cases, thirteen refusal families × four prototypes (plain/null/foreign depth 1/foreign depth 1,000) × widths 1/7/8/9/33/257/4,096 × wrappers 0/1/15/29/31 × shared/alternating/distinct identity. This includes first-eight diagnostic rollover, 72 byte stops and exact native-listing accounting. No listing mismatch. Separately, 1,543 accepted values, including 1,500 generated with seed `0x4b433303`, exact edge values and the named costliest witness, match B's canonical bytes and the independently calculated costs. There are 1,056 consumer cases over the declared eleven consumer schedules, including eight eager unauthorized Outcome roots and whole-state checks. [Output](review-02/dimensions.stdout.log); executable source is pinned at C in `review-01/search-dimensions.mjs`.
- **Real-B alignments:** offsets −2 through +2; target names 0/1/257/4,096/65,536; nested wrappers 1/15/29; null prototype and distinct aliases. Fourteen root schedules include all three exports, both creation roots, ingress, all three recovery lists, four Outcome field kinds and the eight eager roots. Every native listing is accounted for; each eager root stops independently.
- **New continuation search:** 1,824 shapes and **359,254 capture runs**, with 1,824 pristine/instrumented full-result comparisons. The main matrix is twelve families × ordinary/null/foreign-chain-513 prototypes × widths 1/7/8/9/17 × depths 0/1/15/29/31 × shared/distinct aliases, with accepted object/array and NaN siblings before/after refusal and alternating object/array wrappers. Additional cases cover string/member-name lengths 0/1/10/128/129/65,536/65,537/131,072/131,073 and array/object widths 4,095/4,096/4,097. It traces 27 helper entries, examines before/at/after charge boundaries and paired work/byte thresholds, and reaches all seven work-crossing kinds. No forbidden accessor/Proxy trap or post-stop traced helper was observed; cycle-set unwind is explicitly allowed. Wide/long transition sets are sampled as the executable declares. [Driver](review-02/probe-continuations.py), [JS](review-02/probe-continuations.mjs), [raw output](review-02/continuations.stdout.log).
- **Evidence controls and bypasses:** the 18 maintained attribution controls all pass, including pure parse/load/hook/cancellation/timeout/no-selection/overflow cases ([named output](review-02/attribution-controls.stderr.log)). Eighteen additional attribution scenarios vary callback/comparison execution, helper diagnostics/value reads and mixed failure domains. Stop mutations vary sentinel choice, a nested returned charge whose caller ignores it, a helper class, and an alias. The minimal boolean mutation was additionally run against all 475 maintained value tests. Full sources and outputs are attached below.
- **Normative search:** current `refus*`, built-in/internal-slot/exotic/re-prototyped and coherent-Proxy/V-D1 descriptions were read in context across the canonical values owner, roadmap, provenance, baseline, 007, source comments and changed fixture descriptions. Historical decisions/reports were distinguished from current claims. The canonical owner and summaries respect Q6 and R1–R4; the source trace records the examined paths.

This is not every Cartesian combination of every root and engine object. Native-addon External, all platform-private kinds, physical containment, live providers and large-memory/timing profiles were not run; they are outside this packet's declared deterministic scope or named owner-accepted limits. No engine-time or universal static-analysis proof is claimed. No in-packet criterion is marked DEFERRED. [Source/consumer/budget trace](review-02/source-review.md).

## New findings

### KC3-R2-EVID-01 — P2 — import-site wrapping still credits subject exceptions

**Locations at H:** `tests/tooling/value-cost-witness.mjs:45–64`, `:90–101`; unchanged `packages/kernel/tests/harness.ts:547–555`. Governing obligations: KC3-5; review-01 EVID-02/brief 02; design-02 §1.2; TOOLS-01 F3 and owner choice 09; 012's oracle rule.

The wrapper remembers **any** `AssertionError` escaping an imported assertion function. Importing that function on the test side does not establish where the error was created or thrown: assertions can execute subject callbacks, validation predicates and comparison getters. In [probe-attribution-02.py](review-02/probe-attribution-02.py), the subject module lives under `packages/kernel/src`, receives the real assertion module, and constructs a subject-owned `AssertionError`. Four routes give this error false `assertion_failed`/`killed` credit, with no genuine failed test assertion: `doesNotThrow(subject, TypeError)`, asynchronous `doesNotReject` with the same nonmatching filter, a getter invoked by `deepEqual`, and an assertion validation callback throwing the subject error. Directly throwing that same subject error is correctly `subject_exception`/`setup_error`. Thus the route through the test import changes credit without changing error provenance. [All raw observations](review-02/attribution-02.stdout.log).

The unchanged-harness deviation creates a second form of the same defect. The wrapper catches an error and **re-reads** `result.ok` to infer that the helper's assertion failed. `accepted({ok:1, get value(){throw subjectTypeError;}})` passes the real helper's truthiness condition, then throws from the value getter. The wrapper's `ok !== true` nevertheless marks it `harness.accepted`, and the runner calls it killed. A changing `ok` getter also earns that credit; malformed refusal diagnostic getters and a missing `error` object do likewise. These four controls throw ordinary `TypeError`s, not assertion errors.

This is eight demonstrated false-credit cases, not a supposition based on an error name or stack. The passing and genuine-failure controls distinguish the two intended outcomes. Mixed tests with an independently genuine assertion are recorded but are not the basis of this finding. Pure setup/parse/load/hook/cancellation/timeout/overflow controls pass; that does not close subject-exception attribution through a reentrant assertion/helper.

**Required outcome for the owner-selected route:** qualifying credit must establish an intended reached assertion failure, with a finishable account of callbacks, comparison/property access, asynchronous rejection and harness failure construction. Exception transit or a condition inspected after an exception is insufficient. Requalification must use that account consistently at B and C. These attached controls are corpus obligations, not a request to patch only the listed wrappers.

### KC3-R2-STOP-02 — P2 — both enforcement layers miss ordinary post-stop bookkeeping

**Locations at H:** `packages/kernel/tests/capture-metering.ts:299–334` (`isStopValue`/`unconsumedStop`), `:116–153` and `:259–285` (top-level/direct-name call graph); `packages/kernel/tests/capture-stop.test.ts:343–389` and its subsequent assertions. The mutated production sites are `values.ts:980–981`; the observed continuations are `:1196` and `:1203`. Governing obligations: KC3-1's maintained bypass guard; design-02 SP-reach and runtime coverage; review-01 STOP-01/brief 02; 012's plausible-mutation/oracle rule.

SC10 treats `false` and `STOPPED` as interchangeable stop returns without considering the caller's protocol. But `false` is a valid `BoundaryValue`; traversal callers recognize only `STOPPED` as a stop. A one-token mutation of the boolean scalar branch from `... ? value : STOPPED` to `... ? value : false` typechecks, returns **zero metering violations**, and passes **all 475 tests in the maintained eight-file value corpus**. With `[false]`, full work budget and byte limit 2, the root stops in the child's scalar byte charge and then executes both `defineAt(out, index, item)` and `finishArray(out)` with `state.stopped === true`. The mutated root still returns the expected refusal and counters, hiding the forbidden bookkeeping from the oracle. [Reproducer](review-02/probe-stop-corpus.py), [raw guard/corpus/trace output](review-02/stop-corpus.stdout.log).

The null-branch version likewise passes the guard and all 26 stop tests ([probe](review-02/probe-stop-guard.py), [output](review-02/stop-guard.stdout.log)). A correct control has no continuation. A nested function returning the charge result whose caller ignores it, a helper class whose returned stop is ignored, and a charge alias all produce the same post-stop operations while passing the guard and those 26 tests. [All forms, including the control](review-02/probe-stop-forms.py), [output](review-02/stop-forms.stdout.log). The alias is already a declared static gap; the missing runtime discrimination is still relevant. The finding does not require making a custom analyzer sound against arbitrary evasive code: the boolean return substitution is an ordinary maintainer mistake in the exact syntactic form SC10 claims to enforce.

The runtime oracle counts caller listings/descriptors and compares result/cost/stop summaries. It cannot distinguish these forbidden writes/finalization calls when they add no caller observation or charge. Design-02's claim that SC10/SC11 plus this runtime oracle enforce every continuation therefore overstates the closing mechanism. **Unmodified C did not exhibit this violation** in source inspection or the new bounded trace; this is a reproducible evidence defect, not a claim that the mutation is present in H.

**Required outcome for the owner-selected route:** make the stop representation, caller interpretation and observables cover the same invariant, including bookkeeping/finalization and nested/helper call boundaries. The closing mechanism must reject these non-equivalent regressions or have an explicitly owner-amended, finishable scope. The attached mutants and control belong in the maintained corpus after the redesign decision.

### KC3-R2-C1-03 — P2 — a disclosed group loss is still counted as C1 closure

**Locations at H:** `implementation-03.md`, “C1 at B and at C by the same rule” and KC3-9 “Met”; `c1-requalification-02/result.json`, ingress O-APPENDOWN-PUSH; `packages/kernel/tests/ingress.test.ts:775–806`. Governing condition: [design-check C1](design-01-check.md), lines 33–34, “For every converted Proxy-instrument test (§7.2), show by ablation that the mutants it killed before are still killed after conversion.” KC3-9's preservation evidence and KC3-5's qualification rule apply together.

The report honestly discloses the group loss but treats a kill in `c1.values` as enough to close C1. The independent requalification reproduces B `killed` → C `subject_exception`/`setup_error` for ingress mutant `mutation-83e566c29bc58d6e3d5878f8de63c27c4c379dca329cd13fbfa7cac4b7c34d49` (`O-APPENDOWN-PUSH`). [A separate direct test run](review-02/probe-c1-group.py), bypassing the adapter, confirms the distinction: B's mailbox-index test reaches the helper's explicit “expected acceptance, got malformed_value…” failure; C throws `TypeError: Cannot convert undefined or null to object` in `envelope.explain` during `submitInput`, before reaching that assertion. [Raw B/C leaf errors](review-02/c1-direct.stdout.log).

The `c1.values` replacement demonstrates sensitivity of other tests to the shared helper mutation. It does not demonstrate that the converted ingress test/group retained its qualifying discriminator. C1 is quantified over each converted test, not “some test somewhere still fails.” No supplied owner decision amends that condition. Review 01's acceptance of 37 packet-level replacements is earlier reviewer reasoning, not such an amendment; I do not elevate it into an invariant. This newly requalified loss supplies concrete cause to reopen the closure assessment. The review does not infer a production ingress regression from the mutant.

**Required outcome for the owner-selected route:** close conversion preservation at C1's stated unit, or obtain an explicit owner refinement defining when a replacement in another group is sufficient and what interaction evidence that requires. Retain all downgrades. Neither a subject exception nor the global kill total may silently stand in for the missing per-group evidence.

## Cumulative criterion assessment

| Criterion | Result | Independent rationale |
|---|---|---|
| KC3-1 | **FAIL** | Current helper/cost structure was traced, but the required maintained bypass enforcement misses STOP-02's type-correct scalar substitution, even across all 475 value tests. |
| KC3-2 | **PASS for current implementation** | Independent accepted-cost derivation holds; the costliest witness and B byte comparisons pass. Every current stop writer/caller was traced, and 359,254 additional runs find no continuation. The future-code enforcement defect is separately failed under KC3-1; a mutation is not attributed to unmodified C. |
| KC3-3 | **PASS within R1–R4** | Visit, per-name, scan, allocation and diagnostic operations have bounds tied to the fixed limits. Immediate-prototype checks and at-most-32 active-container membership avoid input-depth walks. The four engine residuals are explicit owner limits, not CPU preemption or containment. |
| KC3-4 | **PASS** | Captured Set operations remove the old per-position depth scan. Depth 2/16/31, alias and whole-result/eager unauthorized Outcome checks pass, supplemented by the declared consumer search. |
| KC3-5 | **FAIL** | N15 and the other registered charge weakenings are exercised, but the required attribution mechanism still gives subject exceptions qualifying credit (EVID-01). Global registry success cannot establish the missing provenance property. |
| KC3-6 | **FAIL as a closure claim** | Its specified closure depends on KC3-1–4. Current cost/retention/string mechanisms were traced, but the required continuation enforcement remains incomplete under STOP-02. This is not a new unmodified-C time-cost counterexample. |
| KC3-7 | **PASS** | Every object/function visit tests Proxy before cycle/depth/IsArray/prototype/listing. Identity text also tests Proxy before IsArray. Recovery checks owned captures. Revoked/callable/array/exotic-target and root-consumer witnesses record zero traps. |
| KC3-8 | **PASS within Q6** | Recognized internal-slot kinds use captured predicates before listings, independent of tag/prototype/realm; large typed-array/String and spoof controls pass. WeakRef/FinalizationRegistry acceptance is the declared limit, not a missed guaranteed refusal. |
| KC3-9 | **FAIL for the full required evidence** | Semantic preservation checks, 1,543 independent B-byte comparisons and whole-result fault/poison tests pass. The per-converted-test C1 closure does not: the new ingress qualification loss is replaced only at packet level (C1-03). No new accepted-value regression is claimed. |
| KC3-10 | **PASS** | Canonical owner, baseline, roadmap, 007 and source summaries respect Q6/R1–R4; historical claims are not current promises. Prior DOC-03 is corrected. Builder-docs has only the same B failure; 014's planning sentence is expressly exempt. |
| KC3-11 | **PASS as the specified deterministic gate** | The exact clean-C verify independently returns `checks_passed`; the advisory area report and raw evidence are retained. This does not override failed closing mechanisms. |

**Budget and dependencies.** Splitting accepted canonical bytes into disjoint per-node parts gives at most three units per byte: nonempty arrays have `2n+4` units for `n+1` own punctuation bytes; empty arrays 4/2; objects `3n+3+Σℓ` for at least `4n+1+Σℓ` own bytes (empty 3/2); strings `1+ℓ` for at least `ℓ+2`; other scalars one unit for at least one byte. Aliases count at every occurrence. Monotonic charging gives `B = 3 × 1,048,576`. The named witness reproduces 1,048,555 bytes and 3,094,930 units, gap 50,798; it is a found witness, not a proved optimum. The serializer runs on accepted owned snapshots outside the meter.

The source trace follows both stop writers (`spend`, `charge`), diagnostic propagation, terminal/nonterminal refusal, listings, scans, descriptors/reads, array/object nested returns, mixed siblings, active-container unwind and root finalization. No current helper class or alias forwards a stop outside that graph. The inventory allowances were assessed by their actual invariants: native boolean predicates, genuine-array own length, descriptor-proven own reads and dense returned names; they do not authorize arbitrary caller reads. Cumulative production changes are confined to `values.ts` and Proxy-first classification in `envelope.ts`. This remains Kernel boundary/evidence work; no Runtime cognition, provider behavior or deployment containment is introduced.

**Design-02 departures.** The `captureWithWork` head-start seam reaches the same fixed production comparisons, can only lower budgets, subtracts the head start from counters, and leaves production consumers at literal zero head starts. Its documented byte-stop message includes the head start. Source/range/consumer checks and the additional trace support this deviation. The unchanged `harness.ts` deviation is not equivalent to placing an assertion at the actual failure branch: it substitutes post-exception inference and is part of EVID-01. Keeping helper-review bindings does not waive assertion provenance. The separate 2,000-work/4,000-byte exhaustive bounds are declared; larger cases are sampled, not called exhaustive.

No third-party implementation or dependency was added by this review; probes are reviewer-authored or explicitly adapted from this repository's prior review. Candidate dependency manifests/lockfile are unchanged from B. Existing dependencies were used to execute the pinned code; this is not a new license-clearance claim.

## Root-cause note and owner options

The recurring problem is a mismatch between the property claimed and what the evidence can distinguish.

1. **Stop propagation:** design 01 confined observations but did not propagate all stop effects. Design 02 correctly repairs the current traversal, then treats syntactic return forms as a proof without separating boolean-helper failure from accepted boolean values. The runtime oracle sees caller observations and counts, while the contract also forbids bookkeeping/finalization. Both layers therefore miss the same effect boundary. Earlier passes covered the known listing counterexample and typed `REFUSED` substitutions, not a valid `false` payload or helper-return boundary with no extra native read.
2. **Assertion attribution:** review 01 exposed process-failure/kill conflation. Design 02 moves the boundary to test-side imports, but an imported function may execute subject code and rethrow its error. The harness deviation adds a later condition read as an origin proxy. Controls covered errors before entry and direct subject throws, not reentry through callbacks/comparison accessors or helper diagnostic/value reads. The accepted design and implementation evidence contract need reconsideration, not another error-name filter.
3. **Conversion preservation:** C1's unit is a converted test; the ablation explanation and review-01 reasoning accepted packet-level substitutes. Requalification exposes a concrete qualifying group loss. Reporting that loss is necessary, but does not itself authorize a different closing unit. This is a weakness in the earlier assessment as well as the current closure claim.

Under 006, the owner chooses before any further patch round:

| Option | Decision and consequence |
|---|---|
| **Redesign** | Commission a new design note and design check for stop-effect enforcement and assertion-origin evidence, including the C1 preservation unit. Keep the current contract and require its mechanisms to distinguish all attached controls. This costs broader evidence work and requalification, but preserves the claim. |
| **Refined finishable claim** | Explicitly define a bounded assertion vocabulary/preconditions, the stop effects the mechanism enforces, and whether/when cross-group C1 replacements qualify. Specify distinguishing checks and excluded cases. An owner amendment is required; current green totals cannot silently redefine the promise. |
| **Split** | Separate value semantics from evidence-tooling/conversion qualification, with explicit dependencies and a combined acceptance gate. The split must not leave the interacting stop/evidence obligation unowned or release the present holds prematurely. |
| **Accepted, recorded limit** | Record a justified limit on the unsupported evidence cases and its operational consequences, including which mutation credits cannot be automatic. This requires explicit authority and consistent dependent claims; declaring a limit solely to excuse the demonstrated failures does not satisfy 006/012. |

The [owner decision brief](review-02/brief-03.md) carries these findings and counterexamples forward. It authorizes no implementation and prescribes no patch sequence. No unresolved semantic ambiguity prevents this review's verdict: the current evidence promises are clear enough to fail; the owner's next route is the stop-and-redesign decision.

## Disposition

For transcription: **K1.1-correction-03 — CHANGES_REQUESTED; exact reviewed H `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`; open findings KC3-R2-EVID-01 (P2), KC3-R2-STOP-02 (P2), KC3-R2-C1-03 (P2); review `review-02.md`; 006 stop-and-redesign active, owner choice required before another patch round.** Review-01's concrete runtime STOP witness and DOC-03 are corrected; its broader evidence/closing obligations remain open as described above.

All accessible in-scope obligations were reviewed after the first defect. Candidate tracked files, 007, and branch history are untouched. No implementation, commit, push, merge, hold lift or successor release was performed. The delivered review/evidence are new local files only. [Reproduction guide](review-02/README.md), [final workspace check](review-02/final-check.json), [SHA-256 manifest](review-02/manifest.json).

CHANGES REQUIRED
