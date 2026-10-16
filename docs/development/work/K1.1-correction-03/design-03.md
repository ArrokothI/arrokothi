# Design 03 — K1.1-correction-03

This is the design-check submission required by [owner choice 02](owner-choice-02.md) after
[review 02](review-02.md). It answers [brief 03](review-02/brief-03.md) questions 1–3. It proposes
changes; none of them has been implemented or qualified in this round. The next action after this
note is committed and pushed is the delegated Claude Code (`claude-opus-5-5`) design check, relayed
by the owner. There is no new C/H, acceptance, hold release or successor release here.

Identity and preparation:

- Coding agent: Codex Desktop session `01a13f97-1cb0-7fe0-8377-11757e0894b1`, 2026-10-15–16,
  `gpt-6-astra`, reasoning `xhigh`, read from this session's local metadata. Backend serving details
  beyond that metadata are not exposed. No subagents were used.
- Repository: `ArrokothI/arrokothi`; branch `claude/k1.1-correction-03`; configured origin
  `https://github.com/ArrokothI/arrokothi.git`. Fetch and `git pull --ff-only origin
  claude/k1.1-correction-03` confirmed starting tip
  `fe7953da27141ef0f98dcdbe0abb4b54e7b711cc`.
- Cumulative base B remains `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`. Previous reviewed payload
  C is `ad9bc8640d261ace8af5e75c47aad1bad3ca84d7`, previous H is
  `41628b8bcfd11c899c2fcf60ef4fb73c0858e298`. The letter B for this Git base is distinct from the
  work budget B = 3,145,728 below; neither changes.
- Access: local macOS arm64 source and Git history, shell, installed Node v26.10.0; sandboxed
  filesystem/network with reviewed escalation for GitHub and dependency installation. The managed
  worktree tool could not operate from the chat's non-repository parent directory, so a separate
  Git worktree was created inside the authorized workspace, leaving the other branch untouched.
- First `node --version` returned v26.8.1. All baseline commands then used
  `/Users/linzhenglin/.local/share/arrokothi/node-v26.10.0-darwin-arm64/bin` first on PATH
  (confirmed v26.10.0, npm 11.19.1). Sandboxed `npm ci` failed with registry DNS resolution;
  its network-enabled retry exited 0. `npm run typecheck` exited 0. Detached `npm test` exited 0:
  4,114 tests, 464 suites, 4,114 pass, zero fail/cancelled/skipped/todo. Logs are local preparation
  records at `/private/tmp/k11-c03-baseline-{npm-ci-network,typecheck,test}.log`, not clean-C
  acceptance evidence. No sweep, registry or full verify was run in this design-only round.

The governing sources remain [brief 01](brief-01.md), its owner amendments and
[design check](design-01-check.md), [owner choice 01](owner-choice-01.md), and owner choice 02.
The 2026-10-12 supplement quoted in the reviews still applies to the two zone-helper origins;
owner choice 02 expressly extends the standing transfer rule to `harness.ts`.
[006](../../006-development-process.md) governs the stop, lifecycle and C/H sequence;
[012](../../012-review-methods.md) governs the distinction between a structural mechanism,
a regression guard and a bounded search. Earlier design and review conclusions are evidence,
not premises that this note assumes correct.

## Mechanism

### 1. One stop result across the capture call graph — brief 03 question 2

The defect in the enforcement model is an inconsistent protocol: `spend`, `charge` and `record`
return a boolean, but traversal callers distinguish a stop from accepted `false` or `null` only
by comparing with `STOPPED`. The new protocol has exactly one stop result: the existing private
`unique symbol` `STOPPED`. No accepted `BoundaryValue` can equal it. `REFUSED` remains the separate
non-stopping refusal result, so a refused sibling can still be followed by another sibling.

`spend`, `charge` and `record` will return `true | typeof STOPPED`; success is `true`, failure to
continue is `STOPPED`. All other stop-capable functions return their ordinary result unioned with
`typeof STOPPED`. Their callers compare with `STOPPED` explicitly. There is no boolean negation,
truthiness test, `false`, `null`, `undefined`, `REFUSED` or thrown exception used to propagate a stop.
The state fields `stopped`, `stop` and `crossing` remain root-local accounting facts, not a second
return protocol. Only `spend` and `charge` transition them; initialization at the root is separate.

The entire current internal boundary inventory is:

| Producer → consumer boundary | Required behavior |
|---|---|
| `spend` → `record`, `listOwnNames`, `listOwnSymbols`, `observeElement`, `observeDescriptor`, `readMember`, `scanText`, `capture` | Explicit identity test; return `STOPPED` before the next operation. A listing first gates on state, then lists, then immediately charges its returned length. |
| `record` → `refuse`, `checkMember`, `capture`, `captureArray`, `captureObject` | A stopped diagnostic is returned as `STOPPED`; a completed diagnostic retains its existing issue/count meaning. |
| `charge` → `capture`, `captureArray`, `captureObject` | Return `STOPPED` on a crossing byte charge, including every scalar return and refused-string/name charge. |
| `refuse` → `capture`, `captureArray`, `captureObject` | Tail-return its result; do not collapse stop into ordinary refusal. `checkMember` records directly. |
| `scanText` → `capture`, `captureObject`; listing/observation helpers → container traversals | Bind once, immediately return if `STOPPED`, then inspect the successful result. `undefined` from a missing descriptor remains ordinary data, not stop. |
| `checkMember` → both container traversals | Test stop before reading `ok`; `{ ok: false }` is a non-stopping member refusal. |
| recursive `capture` → both container traversals | Test stop before `REFUSED`, snapshot append/write, next sibling or finishing. |
| `captureArray` / `captureObject` → `capture` | Tail-return the result. Its `finally` only closes the paired active-container entry. |
| `capture` → `acceptMetered` | Handle `STOPPED` explicitly as a refused root with its already-recorded issues. Never serialize or finish an accepted snapshot on this branch. |
| `acceptMetered` → `accept` / `captureWithWork`; `accept` → public entry points | Return ordinary `Acceptance` (plus evidence counts for `captureWithWork`); no stop symbol escapes the module. |

This inventory comes from reading `values.ts` and searching its call sites at the starting tip.
The stop-capable set is `spend`, `charge`, `record`, `refuse`, the six charged helpers, and the
four traversal functions; `acceptMetered` handles their result at the root. Non-stopping helpers
(`child`, `element`, `isArrayIndex`, cycle operations, allocation and finishing) do not acquire
an alternative stop protocol. They must only be reached while their work is allowed.

External consumers remain behind that one handler. A source search of `packages/kernel/src`
for `canonicalize`, `boundaryValueIssues`, `isBoundaryValue`, `acceptRoot`, `captureTextList` and
`acceptIdentityText` confirms: the three public value helpers; creation authority and initial
input; ingress payload; recovery's three availability lists; Outcome progress, each Emission,
completed result and failed error; and identity text through `envelope.ts`. The existing fourteen
real-budget schedules include the eight eager roots of an unauthorized Outcome. Identity text
has separate scalar/Proxy ordering cases. A stopped root does not cancel later roots or create an
aggregate budget. Outer envelope observation and diagnostic rendering keep their existing rules.

**Precisely what may happen after a stop.** The crossing charge finishes updating its own fixed
accounting fields and records its one stop issue through the existing bounded collector. A listing
whose length is learned on return has already happened before that charge. Active frames then only
test/return `STOPPED` and delete their own cycle-set entry in `finally`. At the root,
`acceptMetered` packages the refusal and freezes the two fixed-size evidence records (`work` and
`end`). Returning the existing issues and those fixed-size records is necessary root handling,
not permission to resume traversal. No accepted snapshot write, pending-member append, container
allocation, `finishArray`, `finishObject`, snapshot freeze, diagnostic for another position,
new traversal/observation helper entry or serialization is allowed after the transition. The stop-issue collector's
bounded append is allowed only inside that crossing charge, once; it is not a blanket exemption
for `appendOwn`. Cycle unwind remains allowed and is matched to prior opens.

**Bounded future-code claim.** SC10/SC11 in `capture-metering.ts` will be a syntax guard over
`values.ts`, together with TypeScript checking, not a proof about arbitrary future JavaScript.
The supported form is module-level named functions or `const` function bindings, called directly
by their binding, with synchronous lexical control flow. Starting at `spend`/`charge`, a fixpoint
finds direct stop-capable callers. For this form the check requires one of:

- tail-returning the complete stop-capable call (including a tail-selected container call);
- an immediate `if (call(...) === STOPPED) return STOPPED;`;
- a single `const result = call(...);` immediately followed by
  `if (result === STOPPED) return STOPPED;`;
- a returned conditional whose condition is the explicit stop comparison and whose stop arm is
  exactly `STOPPED` (the successful arm may be an accepted `false` or `null`).

The stop writers' crossing and already-stopped exits, entry gates and return types are checked
against that same protocol. The root's unique call/handling form is checked structurally in the
AST, replacing the current substring check. State transitions outside the two writers fail;
unrecognized uses of a direct stop-capable call fail. Thus the scalar sentinel substitutions
are rejected even though TypeScript alone permits them. Existing SC1–SC9 still check helper
confinement, charge placement, observation order, loops and serializer separation.

The guard will inspect each callable's own body and reject a stop-capable call in a nested
function, method/class or callback rather than treating an inner `return` as its outer caller's
return. It will also reject nested callable definitions in a stop-capable traversal body. A
module-level helper class containing a direct `charge` call is outside the supported form and
fails for that reason. This closes the two review examples without building a general class or
higher-order effect analyzer. New direct top-level wrappers enter the fixpoint automatically.

Declared static gaps are calls through aliases, computed properties, `.call`/`.apply`, dynamically
selected/imported functions, deliberately shadowed or reconstructed bindings, and state escaped
through aliases. The existing gaps in charge amount, extra helper work, caller-sized string
construction and recursion outside the declared traversal also remain explicit. The check makes
no soundness claim for evasive code in those forms. Runtime evidence covers their maintained
counterexamples and shapes; it does not claim to cover every possible aliased program. These are
the owner-requested bounds on future-code evidence, not new accepted semantic residuals.

### 2. Runtime observation includes bookkeeping and finishing

Keep the native-operation/count oracle, but add a maintained version of the review's continuation
trace to `capture-stop.test.ts` and a test-side instrumentation helper. It instruments a disposable
copy of the module before import, with no trace callback or assertion added to production exports.
The observer records plain events; it does not throw into capture's catch block. Assertions run
on the completed observations in the maintained test, so a subject exception cannot masquerade
as a post-stop assertion failure.

The trace has an explicit operation-site inventory, generated/checked against the parsed source:

- entry to each traversal, charged, visit-covered and per-name helper;
- snapshot/pending-list allocations, array/object literals used to grow capture bookkeeping,
  `defineAt`, `defineData`, `appendOwn`, `sizedList` and object creation at their capture sites;
- `finishArray` and `finishObject`, plus their writes and `PrimordialObjectFreeze` calls;
- both stop transitions, the stop collector and its bounded writes, cycle opens/deletes;
- root handling, both evidence-record freezes, and any attempt to reach `encode`.

Site identities include the owning function and operation, with expected match counts. Missing,
duplicated or unclassified sites fail instrumentation setup, not a mutant kill. A new operation
cannot disappear merely because an old text replacement matched nothing. Native primitive
wrapping provides a second observation for listings/descriptors/freezes. The trace associates
every event with the current root and reads that root's actual stop state; it does not infer stop
from the returned sentinel. Therefore replacing `STOPPED` with an accepted scalar still reveals
the subsequent writes. The observer retains a total violation count and bounded first events so
that recording a defective run cannot itself expand without bound.

Allowed events after the transition are identified by exact site and phase: one crossing writer's
stop-issue construction, matched cycle deletion, then the root's fixed refusal packaging. No
general exemption for all freezing, all bookkeeping or all of `finishAcceptance` is used. In
particular, the refusal branch of `finishAcceptance` can return the existing diagnostics, but its
accepted branch/serializer must be unreachable. Controls deliberately inject a post-stop
`defineAt`, pending append, `finishArray`, `finishObject` and freeze, one at a time; each must be
visible even when the final refusal and every meter count are identical to the correct run.

The maintained search is declared, not universal:

1. Retain the 21 current shapes and their exhaustive thresholds (work cost ≤ 2,000; byte count
   ≤ 4,000); retain the stated larger-shape sampling (0–256, every 61st, final 256).
2. Add explicit `[false]`, `[null]`, object-member counterparts, both scalar siblings around the
   stopped value, nested array/object parents, and accepted controls. Run both meters and every
   threshold of these small shapes. Include an ordinary `undefined` refusal to distinguish it
   from a stop, and `false`/`null` at non-stopping thresholds to prevent over-refusal.
3. Maintain review 02's `probe-continuations.py` / `.mjs` search as a test-side driver: twelve
   refusal families × ordinary/null/foreign-chain-513 prototypes × widths 1/7/8/9/17 × depths
   0/1/15/29/31 × shared/distinct identity, plus the named string/name and 4,095/4,096/4,097-entry
   edges. Retain before/at/after charge neighborhoods, the script's large-case sampling and four
   paired work/byte thresholds. Its historical 1,824 shapes and 359,254 runs are provenance;
   the new run reports its actual counts and all seven work-crossing kinds.
4. Retain review 01's real-budget alignments −2…+2, names 0/1/257/4,096/65,536, wrappers 1/15/29,
   plain/null prototypes and shared/distinct rows, through all fourteen consumer schedules.

For each shape compare pristine and instrumented full results, counters, diagnostics and canonical
bytes where accepted. For each stopped run require no forbidden event, exactly one stop reason,
correct crossing units/bytes, diagnostic-prefix/occurrence preservation and balanced cycle unwind.
The public schedules assert the whole refusal and unchanged Kernel state/receipts, including each
of the eight eager root captures. Bounds, seeds, sampled dimensions and observed counts are emitted
with the evidence. Ordinary own-data reads that have no native hook retain their existing
structural discrimination (`RC-ELEMENT-READ-TWICE`); a trace of other operations does not count them.

### 3. Qualifying assertions — brief 03 question 1

Credit is the conjunction of a clean source-policy check, an eligible test assertion call, and
that call's own error reaching a selected leaf's `testCodeFailure`. Import-site wrapping remains
useful for locating test calls, but exception transit through a wrapper is insufficient.

**Source policy.** Add a maintained static check, run before qualification of each control and
mutated tree, over every source module below a `packages/**/src/` directory. This deliberately
includes nested workspaces such as `packages/models/gemini/src`, not just the Kernel or one
glob depth. Enumerate the actual source files and record their digests; a missing/partial source
tree or parse error cannot produce a successful certificate. Check import/export module requests,
literal dynamic imports and require/import-equals forms for `assert`, `node:assert` and their
`/strict` subpaths. Reject them regardless of imported alias. Reject executable references to
`AssertionError` (identifier, property, string-key constructor access or throw), so renaming an
imported constructor does not evade the import prohibition. Conservatively reject computed module
requests and dynamic code generation in this qualification scope rather than guessing their
targets. Audit throws/constructions through the existing TypeScript bindings where applicable.

The certificate establishes this repository-source rule for the declared module syntax. It is
not a claim about arbitrary dependency source, maliciously synthesized error constructors or
hostile modification of the evidence harness. No source-policy failure is itself credited as
the intended value-cost kill. Controls cover all import spellings, aliases, construction and
throw forms, a nested workspace and a clean module. At the starting tip the source search found
no assertion import or `AssertionError` reference; the build must check this mechanically at B,
C and every applied mutation, not inherit that observation.

**Declared automatic-credit vocabulary.** Use a deliberately small synchronous vocabulary:

| Assertion form | Eligible arguments |
|---|---|
| default strict `assert`, `assert.ok` | A boolean computed before the call; optional primitive string message. |
| `assert.strictEqual`, `assert.notStrictEqual`; `equal` / `notEqual` imported from `node:assert/strict` | Plain data as defined below, including primitive scalars; optional primitive string message. Identity comparisons retain their normal semantics. |
| `assert.deepStrictEqual`, `assert.notDeepStrictEqual`; `deepEqual` / `notDeepEqual` imported from `node:assert/strict` | Two verified plain-data graphs; optional primitive string message. |
| `assert.fail` | No arguments or one primitive string, evaluated before entry. No `Error` argument and no legacy multi-argument form. |

The `assert` and `assert/strict` spellings without `node:` resolve by the same policy; legacy
coercive `equal`/`deepEqual` do not gain strict semantics by being wrapped. Explicit strict methods
on the legacy module can qualify under the same argument rules. `match`, `doesNotMatch`,
`throws`, `rejects`, `doesNotThrow`, `doesNotReject`, `ifError`, custom `Assert` instances and all
other methods receive no automatic credit. No callback/validator assertion form is included.
An async test can qualify by awaiting its subject operation first and then making an eligible
synchronous assertion on recorded data. An async assertion rejection does not qualify.

For this vocabulary, plain data means primitives or finite graphs of ordinary own-data records
(ordinary or null prototype) and ordinary arrays. There are no functions, Proxies, accessors,
custom prototypes, comparison/inspection hooks or exotic objects anywhere in an operand graph.
The witness checks Proxies before any reflective observation, then prototypes and own descriptors,
and traverses descriptor values rather than property reads. It handles sharing/cycles with its
own visited set. Accessor descriptors, symbolic hook keys, function-valued data, unsupported
brands or an exceeded evidence traversal bound make the call unqualified; they are not invoked
or coerced to make it qualify. Errors during argument evaluation or preflight are uncredited.
This definition is an assertion-input restriction, not a change to accepted boundary values.

Use captured clean built-ins for that preflight and verify the relevant Object/Array/assertion
intrinsics and prototypes still match their clean snapshots before admitting a call. A poisoned
environment does not silently enter the eligible domain. The build will inspect the pinned Node
v26.10.0 assertion/comparison paths and maintain getter, inherited-hook, custom-inspection,
Proxy and message-Error controls. If a call cannot be shown to stay within this domain, it is
reported as unqualified; tests may instead project the specific observed fact into plain data
outside the assertion. Projections must retain the claimed obligation and cannot turn a subject
crash into `assert.fail` merely to manufacture credit.

The wrapper calls the actual assertion with its original operands; it does not replace its
comparison or stringify operands to hide a hook. It remembers an error only for an eligible
call, with assertion form and test-module identity. A non-vocabulary outer assertion cannot
launder an inner callback assertion: the wrapper tracks nesting, suppresses witnessing inside
that dynamic extent and removes any witness on an error escaping it. No harness-specific
post-exception condition read remains. The reporter correlates the exact error identity with
the selected leaf and records full test path/declaration, assertion kind and source module;
qualification records pin the intended assertion anchor and its obligation. Stack text, error
name and TAP totals are not provenance.

The process must complete with a usable event stream and summary. Parse/load/setup failure,
signal, output overflow, cancellation, timeout and no selection keep distinct non-credit
dispositions. A selected non-vocabulary assertion failure or subject exception remains visibly
uncredited. A mixed run records each domain; a claimed replacement from it is rerun with its
qualifying leaf selected alone and a passing unmutated control. An unrelated failed leaf cannot
supply the obligation-specific witness. Tool failures never become qualifying assertions.

**Harness failure branches and transfer.** Change the actual failure branches in
`packages/kernel/tests/harness.ts`: `accepted` uses `assert.fail` with its existing diagnostic
message after `!result.ok`; `refused` uses `assert.fail` with its existing message after
`result.ok`. Preserve those truthiness conditions and evaluate the diagnostic message before
calling `fail`. Do not reread `ok` after any exception. A throwing `value`, `ok` or diagnostic
getter, or missing error record, therefore remains a subject/helper-evaluation exception.
Delete the current synthetic harness wrapper in `value-cost-witness.mjs`.

The following module-review bindings all pin the old whole helper module and will be invalidated:

| Binding | Origin |
|---|---|
| `review.harness.creation` | `artifact-6c57cc9dd8febdefa65ed496` |
| `review.harness.evidence` | `artifact-394a3572417fe81cafbd7097` |
| `review.harness.ingress` | `artifact-ecb10ef937e0612352e7c7ef` |
| `review.harness.inspection` | `artifact-a45b1c9d40d46e183ebd203d` |
| `review.harness.receipts` | `artifact-f1a28bedebfe204b9687fa53` |

Under owner choice 02 §2.3 and owner choice 01's standing rule, preserve their old binding/closure
records in a pinned transfer attachment, remove stale bindings, reopen affected complete origins
to `pending_revalidation`, and transfer to TOOLS-02 through `transferred` / `transfer_lists`.
Already-transferred origins remain open with the additional reason recorded; do not duplicate or
erase the earlier transfer. Recompute the preserved census and affected witness/closure routes
with the tooling, account for dependent origins and remove/relink stale witnesses mechanically.
Also apply the standing rule to any witnessed tests the build changes. No replacement helper
review is self-certified to keep an old closure complete. The two zone-helper origins
`artifact-21fb34d9…` and `artifact-ada9f66c…` retain the 2026-10-12 supplement's disposition.

### 4. C1 is loss-by-loss replacement evidence — brief 03 question 3

Owner choice 02 §3 explicitly permits a converted test to lose a kill when the **same mutant**
still has a qualifying assertion in another maintained test and the report identifies the loss,
replacement site and obligation. This applies to every loss, including the historical 37
replacements, not just the newly reported ingress loss. A total of kills or a group name cannot
substitute for a replacement assertion.

The maintained reconciliation table will have one row per original converted-test/mutant pair:
original test/title and anchor, B mutation, C mutation or faithful analogue, original result,
new B/C qualification, loss reason, replacement test/declaration/assertion anchor, observed
qualifying failure, and the obligation that assertion checks. Dispositions distinguish retained,
restored, replaced, uncredited-at-B, uncredited-at-C, equivalent and inapplicable. Historical
results remain immutable; superseding qualification is additive.

For ingress `O-APPENDOWN-PUSH`, retain the direct B failure and C `envelope.explain` TypeError
from `probe-c1-group.py`. The proposed replacement is the maintained `c1.values` witness for
own-array append under inherited indexed-setter pollution. Its assertion must still reject the
same `appendOwn`→`push` edit and check that Kernel-owned appended content/diagnostics cannot be
swallowed by that setter. Record the exact leaf and assertion after rerunning it under §3.
This preserves that shared-helper obligation; it does not claim that the converted ingress
leaf reaches its former assertion. Strengthening that leaf is optional under the owner decision.
If the replacement does not qualify, the loss remains open until another qualifying witness
of the same mutant and obligation is maintained.

Apply the same rule individually to descriptor/read disagreement (`MV1` and
`VAL-object-read-from-descriptor`), duplicate reads (`RC-ELEMENT-READ-TWICE`), symbol listing/byte
charge (`MV3`), `O-DEFINEDATA-LITERAL` and the catch mutants. The nine withdrawals in
implementation 03 remain visible even when replacements qualify. The eight vanished B leaves
and five B cascades are historical non-evidence, not newly retained kills. Keep the two
single-edit byte-stop-flag equivalence arguments separate from their faithful propagation-bypass
analogues; recheck each argument after changing the return protocol. Equivalent edits earn no kill.

## Why each criterion closes

These are proposed closing methods, not PASS assessments. The build and both independent reviews
must establish them against the eventual exact H.

| Criterion / finding | Method, observable obligation and distinguishing evidence |
|---|---|
| KC3-1; R1-STOP-01; R2-STOP-02 | Single sentinel protocol and explicit caller handling; bounded static syntax guard; runtime operation trace on declared shapes. Reject scalar substitution and ignored-return mutants even when final refusals/counters agree. |
| KC3-2 | Existing per-node cost derivation stays unchanged; exact costliest witness remains 3,094,930 units / 1,048,555 bytes, with gap 50,798. Both crossing charges return the sole stop result. At-limit acceptance, first-over-limit and all traced transitions distinguish early/late stopping. |
| KC3-3 | Existing unit table and accepted R1–R4 remain. No new engine-time or hostile-runtime guarantee. Only the operation whose own charge crosses may already have run; trace rejects later work. |
| KC3-4 | Keep depth 2/16/31 count comparisons and the eight-root unauthorized Outcome whole-result/state check. Set membership/unwind and per-root budgets remain unchanged. |
| KC3-5; R1-EVID-02; R2-EVID-01 | Source-policy certificate plus declared non-reentrant assertion vocabulary, actual harness failure assertions, controls and fresh mutation qualification. N15 below/above threshold and every charge weakening need a named qualifying assertion. |
| KC3-6 | Carry design 01's transferred-item mapping: value-cost time → KC3-1/2/4; DEC-7 and string-cost claims → KC3-1/3; V-D1 → those claims plus Proxy refusal. Closure depends on the corrected enforcement/evidence, not the previous green total. |
| KC3-7/8 | Preserve Proxy-first zero-trap and detectable-brand zero-listing evidence, all root consumers, cross-realm/tag controls and Q6 permitted-kind witnesses. No new classification rule. |
| KC3-9; C1; R2-C1-03 | Accepted bytes/diagnostic ordering/counts are unchanged; existing semantic and whole-state oracles, plus the complete loss-by-loss B/C ledger and qualified same-mutant replacements. C1 uses owner choice 02, not the old report's interpretation. |
| KC3-10; R1-DOC-03 | Update canonical stop meaning and BASELINE's implementation/evidence scope together; keep Q6 and R1–R4 in every current summary. Preserve historical records and owner-pinned 014. |
| KC3-11 | Full prescribed verify at clean C, with the new maintained checks in its declared inputs/counts; accessible raw logs, exact output and advisory report. A passing verify is necessary, not a substitute for the other rows. |

### Requalification and build sequence after the design check

1. Implement this mechanism and its maintained corpus. Keep changes confined to the released packet.
   Update `values.ts` protocol comments and static/runtime helpers together; do not change the unit
   charges, accepted-value rules, issue text/weights, stop locations or the head-start seam. Preserve
   literal zero head starts on production consumer paths (the earlier DEC-9 interaction matters).
2. Maintain one mutation registry/runner. Extend `tests/fixtures/packet-tools/value-cost.json`
   with the stop regressions and the needed evidence cases; use `packet_tools.py mutations` for
   qualification. Add tool controls in `test_value_cost_probe.py` and related maintained helpers,
   not one standalone mutant runner per review round. A B/C matrix driver prepares revision-specific
   inputs and invokes that same probe/classifier; it does not invent a second kill definition.
3. Build a paired inventory covering **all** current 231 registrations, their prior 227-registration
   ancestry, the nine withdrawals, the two equivalent edits/analogues, and the full C1 ablation
   domain (69 conversions, 87 historical mutations across nine files, including all 437 reported
   B pairs). Run all applicable cases at both revisions, not only the nine known downgrades.
   Preserve historical IDs and exact edits; record a port's equivalence argument and anchor matches.
4. Use disposable B and candidate copies, Node v26.10.0 and the same new probe, reporter, source
   check and witness. B production stays byte-for-byte B. For a fair helper assertion comparison,
   apply only the two `harness.ts` failure-branch assertion changes and necessary test-side import
   to the B copy, with the exact overlay/digest recorded. Label results **B with test-only harness
   overlay**, never pristine B. Keep the direct unadapted B/C ingress run as separate evidence.
   C's converted tests run at C; B's original converted-test counterparts run at B. New meter-only
   tests or sites absent at B are explicitly `inapplicable_at_B`, with the missing API/site named;
   never copy new production metering code into B to manufacture a paired kill.
5. Run passing controls first, then each applicable mutant. Retain complete observations and named
   leaves, not only a twenty-item summary. Isolate mixed/cascading/ambiguous failures and each
   claimed replacement. Report source-policy rejection, setup, exception, non-vocabulary assertion,
   timeout, overflow, survival, equivalence and inapplicability separately. No historical credit is
   carried forward without requalification. Each downgrade keeps its former site/result and its
   new disposition. A non-equivalent uncovered mandatory charge/stop obligation must be fixed
   with meaningful evidence or brought to the owner; it cannot disappear from the denominator.
6. Apply the harness/test transfer, regenerate the adoption census, and maintain docs as payload.
   `mental-model/concepts/values.md` states the stop/allowed-unwind distinction, including the
   implementation marker as appropriate; `002-implemented-kernel-baseline.md` replaces its current
   universal SC10/SC11 wording with the bounded syntax claim and fuller runtime observables.
   `tests/tooling/README.md` owns the qualification vocabulary and non-credit states. Inspect
   `sources.md`, `rewrite-index.md`, `roadmap.md`, 007 and dependent creation/Outcome/recovery
   descriptions for agreement. Layer 1/2 ownership does not change. Q6 witnesses stay permitted;
   014 is left to the owner at integration, as directed.
7. Make clean payload C, including the final evidence scripts, fixtures, registry and verification
   specification. Run `python3 -B scripts/packet_tools.py verify --revision <full-C> --spec
   docs/development/work/K1.1-correction-03/verification.json`. Full suites, searches, B/C matrices,
   registries and verify run **one at a time, detached, with logs**. No baseline/old-result reuse.
   If payload changes after a run, create a new C and rerun affected evidence and the required gate.
8. Write `implementation-04.md` under 008, recording actual session/model/access, B/C, cumulative
   coverage, per-loss and per-registration dispositions, transfers, actual counts and remaining
   declared search bounds. Attach long-run logs with commands, environment, revision identities
   and digest manifest, using the exact C..H output-only allowlist. Set 007 to
   `WAITING_FOR_REVIEW` only when all required results and closures exist, commit H, push without
   force and verify the advertised branch SHA. Hand off B/C/H for the fresh full GPT-6 review and
   targeted Opus review; both must accept that exact H. No PR, merge or self-acceptance.

## Accepted designs relied on

| Earlier design / decision | Assessment for this round |
|---|---|
| Design 01's unit table, cost derivation and per-root capture | Retained, with the owner-approved R1–R4 and Q6 scope. The new protocol changes control representation, not charging or accepted bytes. Their tests and arguments are rerun, not presumed valid. |
| Design 02's boolean-helper / sentinel-traversal combination | Unfit for the claimed stop guard: review 02's `false`/`null` substitutions expose the ambiguity. Replace the protocol end to end under owner choice 02. |
| Design 02's listing/descriptor-only stop oracle | Insufficient for bookkeeping and finishing. Extend its observables and retain independent pristine/instrumented comparisons and discriminating controls. |
| Import-site assertion witness and synthetic harness wrapper | Unfit as attribution: imported functions can run subject code; a later read of `ok` is not the failed branch. Replace with the vocabulary/preconditions and actual helper assertions above. |
| TOOLS-01 outer classifier and owner choice 09 | Retained: it classifies honest probe observations and rejects setup/exit disagreement. Do not reintroduce stack-based origin claims or treat classifier success as assertion provenance. |
| Historical C1 packet-level replacements | Reassess individually under the owner's newly clarified rule. Earlier review reasoning alone did not authorize the unit change. |
| Adoption helper-review bindings | Old whole-module reviews cannot certify the edited harness. Owner choice 02 authorizes reopening/transfer; it does not authorize refreshing their digests while calling the old reviews current. |

The prior-art reading-map sections on refusal metering, surviving mutants, strict-validator tests
and evidence tooling were read as background. This design relies on the repository's owner
decisions and concrete probes, not unverified external project claims. No new dependency or
third-party source is proposed. Maintained adaptations of this repository's review probes retain
their provenance and the originals remain unchanged.

## Corpus

All source records below are under this packet; maintained tests live in `packages/kernel/tests`
or `tests/tooling`, and mutants go through the shared value-cost registry. The build produces a
source-case → maintained-test/assertion → mutant/disposition map, including controls. Historical
probe assertions that expected a defect are not blindly rerun as the new success criterion.

| Source | Maintained evidence and required distinction |
|---|---|
| Review 01 `probe-stop-boundary.mjs` | Keep the real-budget alignment family, fourteen schedules and whole-state assertions in `capture-stop.test.ts`; add the bookkeeping trace, not just native listing counts. |
| Review 01 `probe-evidence-attribution.py` and leaf audit | Keep parse/load controls, passing control, real charge-assertion positive control and `O-DEFINEDATA-LITERAL` exception classification. Requalify all former audit rows; do not promote a failed leaf into an assertion. |
| Review 01 `probe-declared-limit.mjs` | Keep WeakRef/FinalizationRegistry `{}` acceptance witnesses and Q6-consistent current descriptions. |
| Review 01 `search-dimensions.mjs` | Maintain its declared refused, accepted-byte differential and public-consumer slices with seed `0x4b433303`; record actual counts, including the historical 5,460 / 1,543 / 1,056 counts as provenance, not a new result. |
| Review 02 `probe-stop-corpus.py` | Boolean scalar's failed charge returns accepted `false`; `[false]` at byte limit 2 must expose forbidden `defineAt`/`finishArray`. New static check rejects it; runtime trace independently rejects its faithful new-protocol analogue. Keep the correct full-corpus control. |
| Review 02 `probe-stop-guard.py` | Null scalar stop substitution, `[null]` at byte limit 2; same static/runtime distinction and unchanged-result observation. |
| Review 02 `probe-stop-forms.py` | Keep correct control; false/null substitution rejected statically and dynamically; nested-function ignored return and helper-class ignored return rejected as unsupported static callable boundaries and dynamically on their maintained shapes; charge alias is a **declared static gap**, killed by the runtime bookkeeping trace. Record original and ported edits separately. None is excused as equivalent merely because its refusal is unchanged. |
| Review 02 `probe-continuations.py` / `.mjs` | Maintain the finite search in §2, expanded to snapshot writes/finishing/freezes and allowed root packaging. Keep pristine/instrumented result equality and all seven work-crossing kinds. |
| Review 02 `probe-attribution-02.py` | Retain all eight false-credit routes: `doesNotThrow`, async `doesNotReject`, comparison getter, assertion validator; malformed diagnostic getter, truthy `ok` plus throwing value, changing `ok` plus throwing value, missing error object. Each earns no credit. Retain direct subject, passing/genuine assertion, pure hook and mixed-domain controls. |
| Review 02 `probe-c1-group.py` | Keep direct original B/C ingress errors independent of the adapter, plus the qualified replacement-site assertion and complete loss ledger under owner choice 02. |
| Review 02 nine downgrades, equivalent stop-flag edits and replacement observations | Preserve each former registration/result, rerun both sides under §3, retain faithful analogues and pin real replacement leaves/obligations. Neither deletion nor aggregate totals close them. |

The original attribution fixture itself imports/constructs `AssertionError` in a source module.
Maintain that exact fixture as a negative **source-policy** control. To test the witness rather
than let that preflight mask all its routes, also run the eight routes with a source-compliant
subject: a test creates and supplies the error, the subject only returns data/throws that supplied
error. Passing and genuine-assertion controls use a clean subject. Runtime-only controls bypassing
the policy are explicitly witness-unit tests, never qualifying registry runs. This gives separate
evidence for both conjuncts of the rule and prevents an indiscriminate preflight rejection from
looking like successful attribution.

Additional controls cover accepted `false`/`null`, a successful non-stopping refusal followed by a
sibling, each forbidden post-stop write/finish operation, the permitted cycle unwind and root
evidence freezes, non-vocabulary nested assertions, unsafe messages, getter/Proxy preflight,
and a genuine synchronous assertion after an awaited operation. All controls have a clean
passing counterpart; compilation/load failures are kept separate from runtime discrimination.

## Questions

No new semantic choice is requested. Owner choice 02 supplies the stop representation, bounded
evidence route, harness transfer and C1 unit. This note asks the delegated design check to assess
the concrete protocol, bounded static grammar, operation trace, assertion vocabulary and B/C
overlay/comparison plan before any implementation starts.

The implementation remains stopped here. If the check or build reveals a need to raise the work
budget, change the Git base, add a residual or accepted limit, or change accepted values/bytes,
diagnostic meaning or cycle/depth/foreign-form ordering, record the smallest counterexample and
ask the owner before proceeding. Listing unqualified failures is required transparency, not
permission to waive a mandatory coverage obligation. Neither hold is lifted by this design.
