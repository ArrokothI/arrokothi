# Implementation report — K1.1, round 9

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5** — additive
  only: five coverage-map rows and one decision record (K1.1-DEC-6) for the counterexamples this
  round closes. No criterion, limit, refusal, evidence obligation or prior decision is relaxed; every
  revision-4 requirement stands verbatim, and both open findings remain implementation defects
  against it rather than contract amendments.
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after both mandatory defects were corrected and the clean payload revalidated. No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds on a released
  packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both verified as ancestors of C9 in
  [`01-tree-and-environment.log`](validation-09/01-tree-and-environment.log).
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Round-9 payload C9:** `5ac76207a05b61f918a1efd2313c25b7108d775c`. **This is the candidate's
  payload.**
- **Why there is a round 9 with no review between it and round 8.** Rounds 8 and 9 are one correction
  attempt against one review. Round 8's candidate H8 `c1e7d78afc9aebb89410ff55892adcfb37e9e973` over
  payload C8 `79151afc77533d5d542918515d8809773ff61809` was **never pushed and never reviewed**. While
  re-reading the finished work before handoff, self-review found that one behaviour the serializer
  window documents — what happens to a prototype position it cannot remove — was asserted in prose and
  in a code comment but had no committed case behind it. That is precisely the pattern the last three
  reviews have each caught, so it was closed rather than shipped: C9 adds the case (run in a child
  process, because the pollution it installs is permanent) and narrows the comment to what is actually
  the Kernel's to answer. Under 006 a payload change requires a new C and fresh clean validation, so
  C8/H8 are **superseded**, C8/H8 and `validation-08/` are preserved in ancestry rather than rewritten
  (a `git reset` would have rewritten them), and *everything* in the Validation section below was
  rerun on C9. `validation-08/` is the clean-C8 run and is not claimed as this candidate's evidence.
  **The reviewer binds to H9.**
- **Earlier local-only amendment, disclosed for completeness.** C8 itself was amended once before any
  reported validation, any review and any push: the dispatch fixture's trapping `options` envelope now
  installs its inherited accessor at most once even if `bound` is read more than once. A correct
  implementation observes it exactly once (K11-R4-DISP-01), but the *ablation* of that earlier fix
  reads it three times, which stacked three accessors and left a partly-restorable one on
  `Array.prototype` after the case finished. That is fixture hygiene, not Kernel behaviour; the
  discarded validation pass is not reported anywhere.
- **Reviewed candidate this round corrects:** H7 `ae02c32ae575c70326cd7d2a91aa5c268671d92f`.
- **Authoritative review record:** [review-06-supplement-01.md](review-06-supplement-01.md)
  (OpenAI GPT-5.6 Sol High; recorded at `7eca0641ed984d1141a147e9e2464baf893f63d8`), which binds only
  to H7. A concurrent [review-06.md](review-06.md) exists later in branch history at
  `9f2954104f92c27f2631b881712e5ba61e9114ad` and reaches the same two findings with the same IDs and
  the same `CHANGES REQUIRED` outcome; it is preserved and is **not** treated as acceptance of
  anything, and neither is `613bad94ae0d09bd16c772139d0e945461df53da` (`update-doc`) or any other
  post-H7 documentation commit.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C8:**
  C `8cd9e269` / H `0f345b3c` / [review-01](review-01.md);
  C2 `6b7e5fb0` / H2 `297cc56f`;
  C3 `615cdf88` / H3 `b3cdf337` / [review-02](review-02.md) (CHANGES REQUIRED);
  C4 `1d4e4867` / H4 `156f1353` / [review-03](review-03.md) plus
  [review-03-supplement-01](review-03-supplement-01.md) (CHANGES REQUIRED);
  C5 `e0660eff` / H5 `bd2dab6d` / [review-04](review-04.md) (CHANGES REQUIRED);
  C6 `b3d0d59f` / H6 `417798a3` / [review-05](review-05.md) (CHANGES REQUIRED);
  C7 `e59bd312` / H7 `ae02c32a` / this attempt's two review records (CHANGES REQUIRED);
  C8 `79151afc` / H8 `c1e7d78a` (superseded above, never pushed, never reviewed).
  Nothing was amended, rebased, squashed, force-pushed or reset this round; C8 and H8 are ancestors
  of C9.
- **Candidate H9:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C9..H9 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-09.md` (this report),
  `docs/development/work/K1.1/validation-09/` (MANIFEST plus ten declared output-only logs,
  force-added with `git add -f` because root `.gitignore` ignores `*.log`), and the K1.1 status
  transcription in `docs/development/007-work-packets.md`, plus one appended superseding note at the
  end of each of `docs/development/work/K1.1/implementation-08.md` and
  `docs/development/work/K1.1/validation-08/MANIFEST.md` so a reader who opens the superseded records
  first is not misled — appended under [008](../../008-implementation-report.md)'s rule for
  superseding notes, with nothing above them altered. No production source, test, script, fixture,
  evaluator rule, threshold or configuration is in that interval; all of those are payload in C9.
- **Exact H8..C9 payload delta:** `packages/kernel/src/values.ts` and
  `packages/kernel/tests/values.test.ts`, and nothing else — shown in
  [`01-tree-and-environment.log`](validation-09/01-tree-and-environment.log). An `H7..C9` file listing
  additionally shows four `mental-model/*.md` files; those come from the owner-side `update-doc`
  commit `613bad94` that sits between H7 and this work, not from this attempt's payload.
- **Working-tree state:** clean at C9 apart from (a) `validation-09/`, which the validation run
  writes and which H9 commits with `-f`, and (b) one pre-existing uncommitted `mental-model/kernel.md`
  modification made by the user before this session began, explicitly **not** part of this packet: it
  is neither staged nor committed in C8, H8, C9 or H9, and the validation worktree does not contain it.
  Validation ran in a detached `git worktree` at exactly C9 (`/tmp/k11-c9-validation`, `node_modules`
  symlinked), where `git status` showed only `?? node_modules`.

## Changes and coverage

### The invariant, derived before the mechanism

Both open findings are the same sentence: **a Kernel-owned list must be built and read from its own
data, and nothing a caller can install may stand between the Kernel's decision and that list.**

Round 7 had already derived the surrounding rule — no live global, no live prototype method, no
iteration protocol, no promise machinery on any path after the first caller observation — and
enforced it by replacing method calls with index loops and `list[list.length] = item`. The review is
right that this treats ordinary indexed assignment as an ambient-independent primitive. It is not:

- `list[index] = value` is `[[Set]]`. On a position the list does not own, `OrdinarySetWithOwnDescriptor`
  walks the prototype chain; an inherited accessor at that index name receives the write, and no own
  element is created.
- `Array.prototype.push` performs the same `Set(O, ToString(len), E, true)` and then sets `length`
  regardless, so a captured, load-time `push` produces a *longer* list with a hole in it — strictly
  worse than the plain assignment, not a mitigation.
- A later ordinary read of that still-unowned position resolves through the same chain to the
  attacker's getter.
- `Array.prototype` cannot be *replaced* (non-writable, non-configurable), but its **properties** are
  mutable, and a caller can install one from inside any boundary observation the Kernel performs: a
  `getPrototypeOf` trap, a payload getter, or the `dispatch` `options.bound` getter.

Two consequences decide the shape of the fix. First, capturing more references cannot help, because
the defect is the *operation*, not the function object that performs it. Second, the complement is
exact and cheap: `[[DefineOwnProperty]]` never consults a prototype, and an own-descriptor read never
consults one either. So the correction replaces the operation everywhere and gives it one owner.

### Change groups

| Group | Files | What changed |
|---|---|---|
| The rule, with one owner | `packages/kernel/src/own-array.ts` (**new**) | `defineAt`/`appendOwn`/`appendAllOwn`/`readAt`/`copyOwn`/`mapOwn`/`truncateOwn`/`sizedList`. Positions are installed with `[[DefineOwnProperty]]` and read from own descriptors. Documents the two things deliberately *not* wrapped (an array's own `length`; lists complete at literal or engine construction) and why each is already own data. |
| Value capture and canonical bytes | `packages/kernel/src/values.ts` | `captureArray` installs each accepted element directly into the frozen snapshot — the holey scratch array it wrote and read back is gone entirely. `captureObject`'s member lists, the open-container stack, the issue list, the sandbox slot and saved-descriptor lists and the clone's `map` shadow are all own-data. The serializer window additionally removes every own index-named property from `Array.prototype`/`Object.prototype` for the exact JCS call, and both swaps now restore on partial failure. `BOUNDARY_LIMITS` is frozen. |
| Commit, dispatch, evidence, projections | `packages/kernel/src/coordinator.ts` | Batch selection, carried Events, batch IDs, mailbox, receipts, refusals, delivery attempts, `visibleExecutions` and every view list are built with `appendOwn`/`mapOwn`/`copyOwn` and read with `readAt`. `String`/`Error`/`RangeError` come from load-time references so the module's stated rule is true as written. |
| Decision vocabulary | `packages/kernel/src/lifecycle.ts`, `packages/kernel/src/identity.ts` | `TERMINAL_STATES` frozen at definition; `TypeError` from a load-time reference; the two remaining ordinary indexed reads (`packIdentity`'s literal parts, `mayReachScope`'s host-supplied scopes) documented with why they are own reads or trusted input. |
| Mechanical enforcement | `packages/kernel/tests/boundary.test.ts` | Two source-text controls over the zone: no ordinary indexed assignment outside `own-array.ts`, and no array prototype method in executable text. Both assert non-vacuity. |
| Distinguishing regressions | `packages/kernel/tests/{dispatch,ingress,creation,inspection,evidence,values}.test.ts`, `harness.ts` | 18 new cases across eight suites, plus trap instrumentation that records as own data so the observers stay honest inside the polluted window. The last of them (C9) runs in a child process, because the pollution it installs is permanent by construction. |
| Structural bookkeeping | `docs/development/work/K1.0/ownership-inventory.md`, `tests/conformance/architecture/kernel-landing-zone.test.ts` | The measured tree is 11 `.ts` files, not 10; inventory row, reachable-module set and the guard's own fixture rows updated under [015](../../015-structural-evidence-rules.md)'s editing rule. No agreement check weakened, no schema relaxed, no export-surface change (17 runtime exports; `own-array.ts` is internal). |
| Contract | `docs/development/work/K1.1/contract.md` | Revision 5, additive only. |

### Selected 012 methods, and material exclusions

**Deterministic execution** is again primary: every counterexample is driven through
`ExecutionCoordinator` (or `canonicalize`, for the value module's own boundary) with controlled fakes
and an explicitly installed, explicitly witnessed inherited accessor, and each assertion accounts for
the whole observable result rather than the headline state. **Normative decisions** covers the value
rules the array counterexample sits inside — the refusal case is exercised alongside the acceptance
case so "one observation, one value" is shown to have exactly two legal answers. **Race and fault**
is used narrowly for the ordering of the accessor installation against commit and projection.
**Process/documentation** covers the inventory/guard maintenance.

Materially excluded and unchanged from the contract: native Runtime/Driver fidelity (no real Driver
exists; R1 owns it), external evidence/gate methods (no E gate is claimed), packaging/release (the
zone stays private), and persistence/process-failure methods (this packet makes no such claim).

### Semantic correction closure — K11-R6-STATE-02 (P1)

**Invariant changed.** Previously: "after the first caller observation, consult no live global,
prototype method, iterator or promise." Now: that, **and** every Kernel-owned list position is
installed and read as own data. Authoritative sources: `creation.md` (an accepted decision is
retained), `execution-cycle.md` (the intent reserves the exact batch before sending), `core.md`
(reservation acknowledges nothing; a view reports retained state), `identity.md` (receipts and
refusals are retained evidence), contract C2/C4/C6/C9.

**Original counterexample** (the review's, reproduced and now covered by a case): a `dispatch`
`options.bound` getter returns a valid `1` and installs a dropping setter at `Array.prototype["0"]`.
The selection loop's `selected[selected.length] = entry` lands on the setter, `selected.length` stays
zero, the loop re-selects into the same swallowed position, and the Kernel accepts a dispatch intent
with an empty reserved batch while a queued Event was available under the bound it had just
validated.

**Dependent paths walked together**, not only the edited lines:

| Who | Path | What was fixed |
|---|---|---|
| creates the fact | `captureArray`/`captureObject` scratch, issue and open-container lists | own-data writes and own-descriptor reads (see VAL-04 below) |
| validates it | `located`/`explain`/`appendIssue`/`appendIssues` | a swallowed issue left a hole a later read answered from the attacker, putting attacker text in a refusal reason |
| commits it | `submitInput` mailbox + receipts; `createExecution`'s literal-built mailbox; `dispatch`'s receipts | `appendOwn`; acceptance now always has retention behind it |
| selects it | `dispatch` batch selection, carried Events, batch IDs | `appendOwn`/`mapOwn`; the exact prefix under the validated bound |
| records refusal | `#refusal` → `record.refusals` | `appendOwn` |
| records delivery | `#deliver` → `intent.deliveries` | `appendOwn` |
| replays it | `byInputId` lookup, creation-key lookup | unchanged (primordial `Map`), but now reachable because the entry is actually retained |
| redelivers it | `redeliver` → the same frozen Activation | unchanged; the batch it re-sends is now correct at formation |
| projects it | `viewOf` mailbox/queued/terminal lists, `toActivationView` batch+deliveries, `copyOwn(refusals/receipts)`, `visibleExecutions` | `appendOwn`/`copyOwn`/`mapOwn`/`readAt`; a fresh view under residual pollution equals the unpolluted view exactly |
| decides on it | `isTerminal`'s `TERMINAL_STATES`, `capture`'s `BOUNDARY_LIMITS` | frozen at definition (self-found; see below) |

**Conceptual aliases searched, not just names.** The audit was run over the *operation*, not over a
list of method names: every `x[...] = ...` in the zone, every array prototype method, every list that
is grown after construction, and every list that is read after being grown. The two remaining
ordinary indexed reads (`packIdentity`'s literal `parts`, `mayReachScope`'s host-supplied
`caller.scopes`) and the engine-built name lists are each documented in place with the reason they
are own reads or trusted input.

**Why this closes the class rather than another witness.** Lists are now dense own data over
`[0, length)` by construction, so there is no unowned position for an inherited accessor to answer
for — on the write or on the read. And the claim is checkable without reading comments:
`boundary.test.ts` fails if any ordinary indexed assignment or array prototype method reappears in
the zone's executable text outside `own-array.ts`. Ablation X4 reintroduces exactly one such write at
a site with no runtime witness and is rejected by that control alone.

Two ablations answer the review's governing point directly. **X1** reverts only the operation — the
exact H7 shape — and is rejected by 11 cases across dispatch, ingress, creation, inspection and
values. **X7** replaces it with the captured, load-time `Array.prototype.push` that the previous
round's discipline would have reached for, and is rejected by 12. A captured method is not the fix.

### Semantic correction closure — K11-R6-VAL-04 (P1)

**Invariant.** `values.md` and contract C3: acceptance reads a caller's value once; validation,
canonical bytes, retained content, Activation projection and inspection all derive from that one
immutable snapshot; a representation that presents no single reading is refused, never normalized.

**Original counterexample** (the review's, reproduced and now covered by a case): a genuine array
behind a `Proxy` whose `getPrototypeOf` trap installs a dropping setter and a substituting getter at
one of its own index names and then returns the genuine `Array.prototype`. The plain-array check
legitimately passes, the element's own descriptor and its ordinary read still agree, so the one
observation is unambiguous — and then `captured[index] = item` was swallowed and `captured[index]`
answered from the trap's getter, so the frozen snapshot and its canonical bytes described a value
nobody sent.

**Fix.** The scratch array is removed, not hardened: each accepted element is installed directly into
the snapshot with `defineAt` at the moment it is captured, and the snapshot is frozen once the whole
root is accepted. There is now no second reading of anything between the observation and the
snapshot. `captureObject`'s member lists, the open-container stack and the issue list are own-data
for the same reason.

**Self-found while walking that path to canonical bytes — K11-R6-VAL-05 (P1, separate provenance).**
The snapshot being correct is not sufficient for C3, because the *bytes* are produced by the approved
dependency, and the exact published `canonicalize@3.0.0` builds its object branch as `const parts = []`
grown with `parts.push(...)` and read back by `parts.join(',')`. Both are ordinary property
operations on positions `parts` does not own, so an inherited accessor at `Array.prototype["0"]`
chooses the canonical form outright — with the primordial `push` and `join` reinstalled by the
round-6 slot sandbox, because that sandbox neutralizes *named* ambient reads and this is not one.
Measured against the unmodified dependency, `canonicalize({a: 1})` returned the getter's string. Since
canonical bytes are the identity this Kernel binds, that is a caller choosing another request's
identity, and it is not reachable by any adapter-side change: the writes happen inside the dependency,
which is used exactly as published and is not patched.

What the Kernel does control is the environment it calls into. `inheritedIndexShadows` removes every
own index-named property from `Array.prototype` and `Object.prototype` for the exact call and
reinstalls them afterwards — the same save/neutralize/restore discipline the named slots already use,
extended to the one channel the slot table could not name. Both prototypes are covered because an
array's `[[Set]]` walks the whole chain. In an undisturbed process this finds nothing and changes
nothing; if an attacker made such a position non-configurable, the removal throws and `accept`
contains it as a located refusal — degraded availability, never wrong bytes. Both swaps were also
restructured so a partial failure still restores everything the call had changed.

`toSerializationSafe`'s `map` shadow writes own data too, which is a second, overlapping layer:
ablation X3 removes only the shadow removal and is already rejected by 3 cases, so that layer is
load-bearing on its own; X5 removes both and is rejected by 5. Ablation X2 reinstates the holey
scratch — the exact H7 VAL-04 shape — and is rejected by 4, and X8 stops the window handing back what
it borrowed and is rejected by 6.

**What happens when the window cannot remove a position, stated exactly.** If a caller has made such
a position non-configurable, the removal throws, `accept` contains it as a located
`unstable_representation` refusal, no canonical bytes are produced, and the named slots the window did
install are still handed back — degraded availability, never wrong bytes. That is a committed case
(C9), run in a child process because installing a non-configurable accessor on `Array.prototype` is
permanent by definition. The variant that is *also* non-writable data is deliberately **not** claimed:
Node's own internals assign to index positions of ordinary arrays, so that host dies inside the
runtime before any Kernel boundary is reached. Asserting a Kernel behaviour there would be exactly the
kind of claim-beyond-evidence these rounds keep finding, so it is recorded as a limit instead.

### Additional self-found defects (separate provenance from the reviewer's findings)

1. **`TERMINAL_STATES` and `BOUNDARY_LIMITS` were caller-mutable.** Both are *exported*, and both are
   read by the Kernel at decision time — `isTerminal` on every ingress and dispatch, the four limits
   on every value checked. `readonly` and `as const` are erased at run time, so an ordinary caller
   could append `"READY"` to the terminal vocabulary and make the Kernel refuse ingress to every live
   Execution, or raise `canonicalBytes` and have the next boundary call enforce its own limit. Both
   are now frozen where they are defined, for the same reason receipts and refusals are frozen at
   their mints: one construction site rather than every reader. Ablation X6 is rejected by the two
   new cases.
2. **Live `String`/`Error`/`RangeError`/`TypeError` on post-observation paths.** `describeFailure`
   runs inside `#deliver`, which the dispatch tick reaches after the caller's `bound` getter has run;
   `packIdentity` raises after caller observation in the same tick. Both failures were already
   contained by existing guards, so this is closing the module's *stated* rule rather than a reachable
   wrong-answer path — but a rule that is not true as written is the thing that produced this defect
   twice, so it is closed rather than annotated.
3. **The serializer window did not restore on a partial swap failure.** The slot installation loop sat
   outside the `try`, so an attacker who made one slot non-configurable left the process with the
   primordials installed and no restoration. Now both mutation loops are inside the `try`. Ablation X8
   removes the restoration entirely and is rejected by 6 cases.
4. **A documented behaviour with no committed evidence (found in self-review, closed in C9).** The
   window's answer for a position it cannot remove was stated in a code comment, in the report and in
   the manifest, but nothing tested it. It is now a case, and the part of the original wording that
   over-claimed — the non-writable data variant — is narrowed to the truth: that host is already broken
   before the Kernel is reached. This is the same defect class the last three reviews found, caught
   before handoff rather than after it.

### Tests added, changed and retired

18 new cases, 8 new suites; **no test was removed, weakened or retired**, and no threshold moved.
`test:kernel` goes 176 → 194; `npm test` 2,234 → 2,252. Conformance (1,949) and the architecture
suite (362) keep their counts: the guard changes are to expected values, not to assertions.

| Suite | Cases | What would fail without the fix |
|---|---|---|
| `dispatch.test.ts` | 2 | the reserved batch is empty/short because a selection write was intercepted; a larger batch is truncated; a redelivery re-sends the wrong exchange |
| `ingress.test.ts` | 2 | an accepted Event, its receipt and its replay disposition have nothing retained behind them; a creation's own atomic Event is lost |
| `creation.test.ts` | 1 | the creation key binds bytes the caller never sent, so the caller's own honest retry arrives as a conflict |
| `inspection.test.ts` | 2 | a fresh view or listing under residual pollution omits or substitutes retained facts; a recorded refusal never reaches retained evidence |
| `values.test.ts` | 7 | the retained structure and canonical bytes are a third value the accessor supplied; the JCS call's bytes are chosen by the prototype chain; host state is altered by the call; an environment the window cannot control yields bytes instead of a refusal |
| `evidence.test.ts` | 2 | the exported terminal vocabulary or the published limits can be edited by a caller |
| `boundary.test.ts` | 2 | the operation reappears anywhere in the zone's executable text |

Each case asserts its trap is actually live across the boundary call (`inheritedIndexIsLive`) and, where
applicable, that only the test's own probe write reached the setter — so a green result cannot come
from a trap that was never installed or was restored too early.

### Prior findings

| ID | Round | Disposition |
|---|---|---|
| **K11-R6-STATE-02** | 6 (supplement) | **Corrected this round.** Closure above; witnesses in dispatch/ingress/creation/inspection plus the two mechanical controls. |
| **K11-R6-VAL-04** | 6 (supplement) | **Corrected this round.** Closure above; witnesses in values/creation. |
| K11-R5-STATE-01 | 5 | Remains closed, and its mechanism is preserved: primordial `Map`/`Set`/`Promise`/freeze discipline is untouched. Ablations S1 and S2 re-prove the Map-commit and freeze witnesses still discriminate after the reconstruction. |
| K11-R5-VAL-03 | 5 | Remains closed; the primordial plain-object prototype decision and the descriptor own-value checks are untouched. Ablation V3 re-proves it. |
| K11-R4-DISP-01 | 4 | Remains closed; the single `bound` observation is untouched and is what the new dispatch case builds on. Ablation N3 re-proves it. |
| K11-R4-PROC-01 | 4 | Remains closed. See "no known defect" below. |
| K11-R2-VAL-02 | 2/3/4/5 | The named witnesses stay fixed (safe clone, restored environment, exact JCS substrate, descriptor agreement, outside-length indices, hostile-throw formatter). Ablations N1, P1, JCS re-prove them. This round closes the remaining member of the family the review identified, plus the dependency-internal channel (VAL-05). |
| K11-R2-EVID-01 | 2 | Remains closed; `mintReceipt`/`mintRefusal` are byte-identical and the mints still freeze. The new evidence cases add retention *behind* those mints. |
| K11-R1-VAL-01, ID-01/ID-02/ID-03, SCOPE-01, JCS-01, LIMIT-01, DOC-01/DOC-02, PROC-01/PROC-02 | 1–3 | Remain closed on their specific obligations; nothing this round weakens any of them. The exact JCS substrate, its pin and its license record are unchanged. |

### Unresolved obligations

K1.1-OPEN-3 through OPEN-7 stand exactly as the contract states them (trivial accepted progress,
unreachable empty batch, the published no-expiry retention policy, no durability/isolation/fidelity
claim, unbounded delivery-attempt log). OPEN-1 and OPEN-2 remain resolved. Nothing new is opened, and
no owned semantic case is left for the reviewer.

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c9-validation` at exactly
C9 `5ac76207a05b61f918a1efd2313c25b7108d775c` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-09/MANIFEST.md`](validation-09/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,252 tests, 340 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 194 tests, 39 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 194 tests, 39 suites, 0 fail, every case named |
| control + 15 one-behaviour ablations | 0 | control clean (194/0); **15 of 15 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C9** in the
detached worktree; none of it is carried over, including from the superseded C8 run.
**Inspected, not rerun:** the prior payload/report/review commits and the K1.0 prerequisite
integrations, checked by `git merge-base --is-ancestor` in `01-tree-and-environment.log`, and the
committed `validation-01/.../08` logs, which remain in the tree as their own rounds' evidence and are
not claimed as this candidate's reruns — `validation-08/` in particular is the superseded clean-C8
run. **Implementer-only auxiliary probes (not validation evidence):** isolated `node` probes of
`[[Set]]` prototype-chain behaviour, of the unmodified dependency's object branch, and of a
non-configurable non-writable *data* shadow, used to derive the counterexamples before writing the
cases. They are not repository tests and are not counted above, and every claim they motivated is now
carried by a committed case — including the last one, which is why the probe's finding is stated as a
limit below rather than as Kernel behaviour.

**Cumulative re-check, not only the new cases.** The whole packet is re-proved after the
reconstruction: atomic creation and retry identity, ingress identity, replay versus conflict,
capacity-before-acknowledgment, reservation versus acknowledgment, single-observation bound selection,
asynchronous dispatch, redelivery identity, frozen receipts/refusals/dispositions, hidden-versus-missing
scope work, unsupported surfaces, inspection purity and scoping, and the target zone's imports and
exports.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and this correction adds no Agent, no model path and no eval fixture. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver, packaging or release
check. So nothing here supports a durability, isolation, native-fidelity, release or E-gate claim.

### Why the evidence supports each criterion — implementer assessment, not acceptance

| Criterion | Assessment | Why, and what would have failed |
|---|---|---|
| **C1** | met | Atomic bind, `READY`, the three lost-response rows, conflict, fresh key, cross-caller key text and principal-not-from-payload all hold, and the initial Event is now provably retained under an accessor trapping its own mailbox position. The creation case proves the key binds the observed value: the caller's plain retry replays and a different value still conflicts. |
| **C2** | met | Triple identity, replay/conflict, cross-producer/destination, unknown-versus-invisible, capacity-before-acknowledgment and per-root limits hold; the new case proves the accepted answer has a retained decision behind it at the mailbox, the receipt list, the replay index and the next reservation. |
| **C3** | met | Rules 1–6 byte-for-byte, four limits at and one over, per-root measurement, no repair. The one observation now survives the pass that took it (no scratch to intercept), and the canonical bytes no longer depend on what the prototypes carry. An incoherent representation is still refused with the accessor live, and an environment the window cannot control yields a located refusal rather than bytes. |
| **C4** | met | Intent-before-send, pinned fields, reservation-acknowledges-nothing, single-observation bound, non-blocking dispatch, one unresolved Activation. The exact acceptance-order prefix is reserved under a trapping bound getter, at bound 1 and bound 3, and the excluded Event stays queued. |
| **C5** | met | Redelivery preserves ID, epoch, base revision, batch and receipt and re-sends the same frozen Activation object; a batch formed under the trap survives redelivery unchanged. |
| **C6** | met | Three boundaries, three receipts, replay returns the original, refusals mint none, reads authenticate and scope first with hidden indistinguishable from missing. The mints are byte-identical; what is new is that the receipt and refusal reach retained evidence under pollution. |
| **C7** | met | Outcome, takeover and recovery refuse as K1.2, cancellation as K1.3, and the full snapshot is unchanged around each. Untouched, re-proved. |
| **C8** | met | No Agent/Workflow discriminator in code or exports; the JCS pin is structurally held; the zone's imports are internal, `node:` or exactly `canonicalize`; the new module adds no exported name (17 runtime exports, unchanged). |
| **C9** | met | Inspection is inert and scoped, and a freshly built view or listing under residual pollution now equals the unpolluted one exactly, field for field, including the batch copy, delivery attempts, refusals and receipts. |
| **C10** | met | Zone reaches only in-zone modules, `node:` builtins and exact `canonicalize`; the approved-leaf list is still empty; the zone is still private; the inventory, the reachable-module set and the guard fixtures were updated to the measured 11-file tree with no agreement check weakened and no schema relaxed. |

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **one owning module rather than a per-call-site rule** — 012 asks a
semantic rule to have one normative home, and the previous two rounds show that an inspected list of
call sites is exactly what decays; (b) **removing the scratch array rather than hardening it** — a
structure that does not exist cannot be intercepted; (c) **neutralize-and-restore rather than refuse**
for the JCS window, unchanged in spirit from round 6, so a polluted-but-correctable environment still
produces correct bytes instead of denying service; (d) **an ordinary read is kept where the list is
own data by construction** (array literals, engine-built name lists, an array's own `length`), each
documented in place rather than wrapped, so the rule stays a statement about growth rather than a
blanket ceremony; (e) the mechanical controls are source-text checks in the packet's own suite, not
new conformance machinery.

Trust boundaries, stated plainly and unchanged: the host-authenticated caller object, the
host-provided Driver object, and module-load host integrity for the primordial capture are trusted.
Everything crossing the request or value boundary is not. Persistent cross-call pollution is now
covered to the same extent as same-tick pollution for every Kernel-owned list, because the operation
no longer consults ambient state at any time; the one place that must borrow and return host state is
the JCS window, and it restores on both the success and the partial-failure path.

**Strongest remaining risk.** Six rounds have each found a deeper layer of the same family — reads,
snapshot, prototype hooks, serializer environment, commit and projection bindings, and now the write
operation itself. What is different this round is that the closure is enforced rather than argued:
two source-text controls fail if the operation reappears anywhere in the zone, and the ablation set
includes one reintroduction at a site with no runtime witness precisely to prove those controls carry
the claim. What they still cannot cover: (a) an ambient channel that is neither a named intrinsic nor
an indexed position — the honest limit is that the JCS window's audit table is derived from one exact
published dependency revision, so a substrate change reopens it, which is why the version is pinned
structurally; (b) host-level subversion (module registry, loader) that no in-language discipline
addresses, including the non-writable-data prototype shadow that kills Node's own internals before
this boundary runs; (c) `String`/`instanceof` on *Driver-supplied* values, which remain host-trusted
inputs inside a total guard rather than validated content.

The process-level risk is worth naming too, because round 9 exists for it: the failure mode across
these rounds has not been carelessness but claims that outran their evidence. The countermeasure used
here is to treat every prose assertion about behaviour as owing a case, and the one that did not have
one was closed before handoff rather than left for a seventh review to find.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
and `package-lock.json` still pins the same registry tarball and integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`;
neither file is in the `H7..C9` delta, and both are shown pinned in
[`01-tree-and-environment.log`](validation-09/01-tree-and-environment.log). The Apache-2.0 record and
the round-3 owner approval in the contract's Third-party review section stand unchanged and are not
reopened.

One point deserves an explicit statement because this round reasons about the dependency's internals:
**the dependency is still used exactly as published and is not patched, wrapped, vendored or
modified.** `inheritedIndexShadows` changes the *ArrokothI process environment* around the call for
its duration and restores it; it does not alter the package, its files, its behaviour as published, or
any obligation under its licence. The audit of its 49-line `lib/canonicalize.js` is reading published
source to bound what the Kernel must neutralize, which is the same basis the existing slot table
already rests on. No RFC text, test vector or corpus is copied. No legal-clearance claim beyond the
existing record is made.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The [roadmap mapping](../../../../mental-model/roadmap.md#k11)
names creation, execution-cycle, core, identity and state as K1.1's expected owners. This round
changes no accepted semantics in any of them: the obligations it corrects — an accepted decision is
retained, the intent reserves the exact batch, a view reports retained state, one observation decides
one value's identity — are already stated there, and the defect was that the implementation did not
hold them under actual JavaScript object semantics. `values.md`'s canonical-form and
single-observation rules likewise stand unchanged and are what the correction is measured against.

Dependencies inspected for incoming effects and found unaffected: `mechanisms/creation.md`,
`mechanisms/execution-cycle.md`, `mechanisms/lifecycle.md`, `concepts/core.md`, `concepts/identity.md`,
`concepts/values.md`, `concepts/state.md` and `mechanisms/evidence.md#structural-evidence`. No
placeholder became resolvable, no current description was superseded, and no Layer-1/2 change is
justified — the whole-system model and the major abstractions are untouched. The implementation-level
rule this round introduces (how a Kernel-owned list is built) is deliberately *not* promoted into the
mental model: it is a property of one JavaScript implementation of these semantics, not a Kernel
concept, and `own-array.ts` plus K1.1-DEC-6 are its home. Link validation for the documents this
round does touch (contract, inventory) is the `check:builder-docs` run above.

## Handoff

- **Ready for independent review** on the corrected candidate. Both mandatory defects from
  [review-06-supplement-01](review-06-supplement-01.md) are corrected with distinguishing regressions
  and mechanical controls, four further defects found during the reconstruction and self-review are
  corrected with separate provenance, the clean payload is fully revalidated with accessible raw
  evidence, and no known mandatory defect, unresolved owned semantic case or missing result remains. That is the basis
  for `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, payload C9 and candidate H9 with the verified advertised remote SHA are supplied in the
  external owner handoff after the push, not in this report. C8/H8 are superseded and must not be
  reviewed in place of H9.
- **No self-acceptance.** Every criterion assessment above is the implementer's. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
