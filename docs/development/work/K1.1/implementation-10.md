# Implementation report — K1.1, round 10

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 5 (unchanged)** —
  the obligations K11-R7-STATE-03 violates (one atomic accept/refuse decision per boundary; retained
  evidence; exact batch selection; projections reporting retained truth) are already stated there, and
  the defect is that the implementation did not hold them under actual JavaScript descriptor
  semantics. No criterion, limit, refusal, evidence obligation or prior decision is relaxed; changing
  the contract to fit the implementation is explicitly refused below.
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after the mandatory defect was corrected at the semantic-class level and the clean payload
  revalidated. No self-acceptance. **Owner release:** explicit instruction on 2026-09-14 ("Let's
  release K1.1") through [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction
  rounds on a released packet need no renewed permission under 006. **Do not release or begin K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`. Both verified as ancestors of C10 in
  [`01-tree-and-environment.log`](validation-10/01-tree-and-environment.log).
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Round-10 payload C10:** `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14`. **This is the candidate's
  payload.**
- **Reviewed candidate this round corrects:** H9 `5dddc2ad3cfd616b38c062380e450873cbc4c132`
  (payload C9 `5ac76207a05b61f918a1efd2313c25b7108d775c`).
- **Authoritative review record:** [review-07.md](review-07.md) (OpenAI ChatGPT, GPT-5.6 Sol, High;
  `CHANGES REQUIRED` with one mandatory P1 finding, K11-R7-STATE-03). The later documentation commit
  `fa5cba36a2a0ebcde2659f8a01dc85864b06b2ff` (`improve-kernel.md`, parent H9) is outside H9 acceptance
  and receives none from any review; it is ancestry of C10 through normal branch history, not payload.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C10:**
  C `8cd9e269` / H `0f345b3c` / [review-01](review-01.md);
  C2 `6b7e5fb0` / H2 `297cc56f`;
  C3 `615cdf88` / H3 `b3cdf337` / [review-02](review-02.md) (CHANGES REQUIRED);
  C4 `1d4e4867` / H4 `156f1353` / [review-03](review-03.md) plus
  [review-03-supplement-01](review-03-supplement-01.md) (CHANGES REQUIRED);
  C5 `e0660eff` / H5 `bd2dab6d` / [review-04](review-04.md) (CHANGES REQUIRED);
  C6 `b3d0d59f` / H6 `417798a3` / [review-05](review-05.md) (CHANGES REQUIRED);
  C7 `e59bd312` / H7 `ae02c32a` / [review-06-supplement-01](review-06-supplement-01.md) and
  [review-06](review-06.md) (CHANGES REQUIRED);
  C8 `79151afc` / H8 `c1e7d78a` (superseded before review, preserved);
  C9 `5ac76207` / H9 `5dddc2ad` / [review-07](review-07.md) (CHANGES REQUIRED, preserved).
  Nothing was amended, rebased, squashed, force-pushed or reset this round.
- **Candidate H10:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C10..H10 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-10.md` (this report),
  `docs/development/work/K1.1/validation-10/` (MANIFEST plus ten declared output-only logs,
  force-added with `git add -f` because root `.gitignore` ignores `*.log`), and the K1.1 status
  transcription in `docs/development/007-work-packets.md`. No production source, test, script,
  fixture, evaluator rule, threshold or configuration is in that interval; all of those are payload
  in C10.
- **Exact H9..C10 payload delta:** nine `packages/kernel` files — `src/own-array.ts`,
  `src/values.ts`, `tests/harness.ts`, and six test suites (`boundary`, `creation`, `dispatch`,
  `ingress`, `inspection`, `values`) — shown in
  [`01-tree-and-environment.log`](validation-10/01-tree-and-environment.log). An `H9..C10` file
  listing additionally shows `review-07.md` (the authoritative review record) and one owner-side
  `mental-model/kernel.md` edit (`fa5cba3`); neither is this attempt's payload.
- **Working-tree state:** at C10 the tree is clean. In the main checkout two pre-existing uncommitted
  user modifications (`mental-model/concepts/roles.md`, `mental-model/runtime.md`, wording only,
  not this packet) remain **unstaged and uncommitted** in C10 and H10; validation ran in a detached
  `git worktree` at exactly C10 (`/tmp/k11-c10-validation`, `node_modules` symlinked), where
  `git status` showed only `?? node_modules`.

## Changes and coverage

### The invariant, derived before the mechanism

The open finding is one sentence at the language-operation level: **a captured `Object.defineProperty`
is not an ambient-independent primitive, because its descriptor argument is converted with
`ToPropertyDescriptor` before the target's `[[DefineOwnProperty]]` runs, and that conversion reads
the descriptor's six fields through ordinary `[[Get]]` — which walks the descriptor's prototype
chain.** Every descriptor literal in the zone was an ordinary object, so a caller that installs an
inherited `get` or `set` field on `Object.prototype` from inside any boundary observation (a payload
getter, the dispatch `options.bound` getter) makes the next Kernel definition throw
`TypeError: Cannot both specify accessors and a value or writable attribute` — and an inherited
getter *runs* inside the supposedly hardened operation even when the outcome is not a throw. The
symmetric half fails the same way: reinstalling a saved *accessor* descriptor while
`Object.prototype` carries an inherited `value`/`writable` field throws as well.

Two consequences decide the shape of the fix, exactly as in the two previous rounds. First, capturing
more references cannot help, because the defect is in the *conversion*, not in which function object
performs it. Second, the complement is exact and cheap: a **null-prototype descriptor** has no chain
for the conversion to consult, so every field the conversion reads is either own or absent. The
correction therefore replaces the *descriptor*, not another set of captured references, and gives the
replacement one owner.

### Change groups

| Group | Files | What changed |
|---|---|---|
| The hardened primitive, with one owner | `packages/kernel/src/own-array.ts` | New `defineData` (fresh null-prototype data descriptor; the null-prototype object is bootstrapped with dot assignment, which on a null-prototype object creates own data with no chain) and `restoreDescriptor` (copies a saved descriptor's exactly-owned fields — among the six — onto a null-prototype object, reading each field only through `getOwnPropertyDescriptor`, which reports own state without invoking any getter; `undefined` still means "did not exist", removed rather than invented). `defineAt` is now `defineData` with the same attributes. Module comment derives the conversion chain. |
| Every definition site migrated | `packages/kernel/src/values.ts` | Snapshot member installs, all four serialization-clone installs (elements, `toJSON`/`map` shadows, object members), the serializer slot installs, and both restoration loops (shadows and named slots) go through the new primitive with byte-identical attributes; the now-unused `PrimordialDefineProperty` capture is removed. No validation, limit, traversal, agreement-check or window-ordering logic changed. |
| Instrumentation that survives the window it measures | `packages/kernel/tests/harness.ts` | `recordOwn` goes through the hardened `defineAt` (trap setters run while descriptor pollution is live); index-trap installation/restoration use null-prototype installers and `restoreDescriptor` so combined traps compose; new `polluteDescriptorFields` (save-all-then-install-all, so a mid-installation throw cannot leak a partial install), `polluteDescriptorGetter` (execution-counting accessor) and `descriptorConversionIsHostile` (the exact H9 operation as a liveness probe). |
| Mechanical enforcement | `packages/kernel/tests/boundary.test.ts` | New control: no `defineProperty`/`defineProperties` call (including via `Reflect`) in the zone's executable text outside `own-array.ts`, with non-vacuity assertions. The comment states honestly what a spelling check cannot see (the descriptor's prototype), which is why it is paired with runtime cases. |
| Distinguishing regressions | `packages/kernel/tests/{dispatch,values,creation,ingress,inspection}.test.ts` | 13 new cases across six suites (table below); **no test was removed, weakened or retired**, and no threshold moved. `test:kernel` goes 194 → 207; `npm test` 2,252 → 2,265. Conformance (1,949) and the architecture suite (362) keep their counts. |
| Structural bookkeeping | — | None needed: still 11 `.ts` files, still 17 runtime exports, still exact `canonicalize@3.0.0`; `own-array.ts`'s new exports are internal (not re-exported by `index.ts`). The guard and inventory are untouched because the measured tree is unchanged. |
| Contract | `docs/development/work/K1.1/contract.md` | **Unchanged, deliberately.** Every violated observable (atomic accept/refuse, exact batch, retained evidence, truthful projection) is already required at revision 5; the new witness is a new counterexample of already-covered obligations, not a new obligation. A contract edit here could only weaken the artifact under review to fit the implementation. |

### Selected 012 methods, and material exclusions

**Deterministic execution** is again primary: every counterexample is driven through
`ExecutionCoordinator` (or `canonicalize`, for the value module's own boundary) with an explicitly
installed, explicitly witnessed pollution, and each assertion accounts for the whole observable
result — observation count, accepted/refused status, retained bytes, receipt, evidence, Driver
delivery, redelivery identity, both inspection reads, canonical bytes, and exact host restoration.
**Normative decisions** covers the refusal half: the incoherent-handler shape is exercised alongside
the acceptance shape so "one observation, one value" is shown to have exactly two legal answers.
**Race and fault** is used narrowly for the ordering of pollution installation against commit,
projection and restoration, including the partial-failure discipline both swaps already had.
**Process/documentation** covers the unchanged inventory/guard.

Materially excluded and unchanged from the contract: native Runtime/Driver fidelity (no real Driver
exists; R1 owns it), external evidence/gate methods (no E gate is claimed), packaging/release (the
zone stays private), and persistence/process-failure methods (this packet makes no such claim).

### Semantic correction closure — K11-R7-STATE-03 (P1)

**Invariant changed.** Previously: "every Kernel-owned list position is installed and read as own
data." Now: that, **and** no `defineProperty` call in the zone is ever handed an ordinary object —
fresh definitions convert null-prototype descriptors built by `defineData`, and restorations convert
null-prototype copies built by `restoreDescriptor`. Authoritative sources: `creation.md` (an accepted
decision is retained), `execution-cycle.md` (the intent reserves the exact batch before sending),
`core.md` (reservation acknowledges nothing; a view reports retained state), `identity.md` (receipts
and refusals are retained evidence), contract C1/C2/C3/C4/C6/C9.

**Original counterexample** (the review's, reproduced before patching and now covered by a case): a
`dispatch` `options.bound` getter installs `Object.prototype.get = 1` and returns the valid bound
`1`. H9 validates the bound, builds `selected = []`, and `appendOwn` → `defineAt` throws
`TypeError: Getter must be a function: 1` out of the boundary — no refusal, no intent, a
contract-valid request escaping as a raw ambient exception. The fix was verified against this exact
witness first (accepted, exact batch, Driver delivery, inspection all correct), then generalized.

**Dependent paths walked together**, not only the edited lines:

| Who | Path | What was fixed |
|---|---|---|
| creates the fact | `captureObject` snapshot installs | `defineData` with identical attributes |
| serializes it | safe-clone element/member/`toJSON`/`map` installs | `defineAt`/`defineData` with identical attributes |
| calls the substrate | serializer slot installs | `defineData` with identical attributes |
| restores the host | shadow and named-slot restoration, success and partial-failure paths | `restoreDescriptor`; try/finally order and non-configurable semantics unchanged |
| commits it | dispatch batch, carried Events, batch IDs, mailbox, receipts, refusals, delivery attempts | already through `own-array.ts`; now converting immune descriptors |
| projects it | every `viewOf` list, batch/delivery copies, `visibleExecutions` | same — no call-site change needed, which is the point of one owner |
| decides on it | `packIdentity`, `mayReachScope`, `isTerminal`, limits, freezes | audited, no descriptor conversion anywhere on these paths; unchanged |

**Conceptual aliases searched, not just names.** The audit was run over the *conversion*, not over a
list of function names: every `defineProperty`/`defineProperties` spelling in the zone (now confined
to `own-array.ts` by the mechanical control), every `Object.create` second argument (none in the
zone — all creations are single-argument), every saved-descriptor reinstall, and every
`delete`-then-restore path. The two remaining ordinary reads the zone documents (`packIdentity`'s
literal parts, `mayReachScope`'s host-supplied scopes) take no descriptor and are unaffected; the
engine-built name lists and array literals likewise never convert one.

**Why this closes the class rather than another witness.** `ToPropertyDescriptor` consults exactly
the six fields on exactly the descriptor object's chain. A null-prototype descriptor has no chain,
so there is no inherited field to find and no getter to run — for data installs, accessor restores,
and installation/restoration in either order. The ablation pair answers the review's governing point
directly. **XA** weakens only the install direction (ordinary literal, captured function and
surrounding code untouched) and is rejected by 11 cases. **XB** weakens only the restore direction
(saved descriptor passed through) and is rejected by 6. A fix that special-cased the string `get`
would pass neither the `set`/`value`/`writable`/accessor variants nor the execution-count case; the
cases pin all of them.

### Additional self-found defect (separate provenance from the reviewer's finding)

**Proxy handler trap lookup consults the handler's prototype chain — contained, not patched.**
While building the creation witness, a Proxy payload with an *ordinary* handler was found to break
under the very pollution its own `getPrototypeOf` observation installs: the next trap lookup
(`handler.get` for the member read) inherits `Object.prototype.get` and throws. The Kernel cannot
repair the caller's handler, and must not normalize the value either: the observation genuinely
throws, so the contract's defined answer — `malformed_value`/`unstable_representation` refusal, no
raw escape, nothing committed, the same key reusable with a coherent value — is exactly what the
implementation produces (capture's containment was already there; this round proves it with a
committed case). The accepted-content cases therefore use a null-prototype handler, whose trap
lookups never consult `Object.prototype`, isolating the Kernel-side closure: any failure there
would be the Kernel's own definition throwing. The agreement check (K11-R2-VAL-02) continues to
contain coherently-lying trap pairs the same way it contains getters — that is observation, not
ambient steering, and "one observation, one value" accepts what it observed once.

### Tests added, changed and retired

13 new cases, 6 suites; **no test was removed, weakened or retired**, and no threshold moved.
`test:kernel` goes 194 → 207 (+13); `npm test` 2,252 → 2,265 (+13); suites 340 → 345 (+5).
Conformance (1,949) and the architecture suite (362) keep their counts.

| Suite | Cases | What would fail without the fix |
|---|---|---|
| `dispatch.test.ts` | 4 | the review's exact witness (`get` install + valid bound 1) escapes as a raw `TypeError`; the `set` variant shortens a bound-2 batch; an inherited getter runs inside the commit; combined descriptor + indexed traps steer selection |
| `values.test.ts` | 4 | hostile `get`/`set`/`get+set` change or refuse canonical bytes for object/array/nested roots; an inherited getter executes during capture/clone/window; an own `__proto__` member is lost under hostility; an accessor shadow is not handed back under `value` pollution |
| `creation.test.ts` | 2 | a payload observation installing `get`/`set` escapes instead of creating (null-prototype handler); an ordinary handler broken by its own pollution is accepted or leaks instead of refused |
| `ingress.test.ts` | 1 | an accepted Event, its receipt and its replay disposition have nothing retained behind them |
| `inspection.test.ts` | 1 | a fresh view, listing or redelivery under residual pollution throws or misreports retained truth |
| `boundary.test.ts` | 1 | a raw `defineProperty` call outside the one owner (the operation reappears anywhere in the zone) |

Each case asserts its pollution is genuinely hostile across the boundary call
(`descriptorConversionIsHostile`), asserts exact host restoration afterwards, and — for the
execution-count case — asserts zero caller-code executions inside the hardened operation. The
liveness probes cannot pass vacuously: the same probes reject the XA/XB-ablated implementations.

### Prior findings

| ID | Round | Disposition |
|---|---|---|
| **K11-R7-STATE-03** | 7 (review-07) | **Corrected this round.** Closure above; witnesses in dispatch/values/creation/ingress/inspection plus the mechanical control. |
| K11-R6-STATE-02 | 6 (supplement) | Remains closed; the operation replacement is untouched and X1/X7 re-prove it discriminates after the reconstruction (15 and 14 cases, up from 11 and 12 — the new pollution cases also cross those operations). |
| K11-R6-VAL-04 | 6 (supplement) | Remains closed; the scratch removal is untouched. |
| K11-R6-VAL-05 | 6 (self-found) | Remains closed; the serializer window's order, both swaps and partial-failure restoration are untouched, and X3/X8 re-prove them (3 and 9 cases). |
| K11-R5-STATE-01 | 5 | Remains closed; primordial Map/Set/Promise/freeze discipline is byte-identical. |
| K11-R5-VAL-03 | 5 | Remains closed; the primordial prototype decision and descriptor own-value checks are untouched. |
| K11-R4-DISP-01 | 4 | Remains closed; the single `bound` observation is untouched and every new dispatch case counts it (exactly one). |
| K11-R4-PROC-01 | 4 | Remains closed. See "no known defect" below. |
| K11-R2-VAL-02 | 2/3/4/5 | The named witnesses stay fixed (safe clone, restored environment, exact JCS substrate, descriptor agreement, outside-length indices, hostile-throw formatter). The new ordinary-handler case re-proves the observation-throws half. |
| K11-R2-EVID-01 | 2 | Remains closed; `mintReceipt`/`mintRefusal` are byte-identical and still freeze at the mints. |
| K11-R1-VAL-01, ID-01/ID-02/ID-03, SCOPE-01, JCS-01, LIMIT-01, DOC-01/DOC-02, PROC-01/PROC-02 | 1–3 | Remain closed on their specific obligations; nothing this round weakens any of them. The exact JCS substrate, its pin and its license record are unchanged. |

### Unresolved obligations

K1.1-OPEN-3 through OPEN-7 stand exactly as the contract states them. OPEN-1 and OPEN-2 remain
resolved. Nothing new is opened, and no owned semantic case is left for the reviewer.

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c10-validation` at exactly
C10 `d1fcffdf8b3f411ecde28ae0b14fe79523dfcc14` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from that worktree's repository
root. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-10/MANIFEST.md`](validation-10/MANIFEST.md).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,265 tests, 345 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 207 tests, 44 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 207 tests, 44 suites, 0 fail, every case named |
| control + 7 one-behaviour ablations | 0 | control clean (207/0); **7 of 7 rejected** by named cases |

**Reran versus inspected history.** Everything in the table above was **rerun on clean C10** in the
detached worktree; none of it is carried over. **Inspected, not rerun:** the prior payload/report/
review commits and the K1.0 prerequisite integrations, checked by `git merge-base --is-ancestor` in
`01-tree-and-environment.log`, and the committed `validation-01/.../09` logs, which remain in the
tree as their own rounds' evidence and are **not** claimed as this candidate's reruns.
**Implementer-only auxiliary probes (not validation evidence):** isolated `node` probes of
`ToPropertyDescriptor` prototype-chain behaviour in both directions, of getter-execution counting,
and of Proxy handler trap lookup under the same pollution, used to derive the counterexamples before
writing the cases. They are not repository tests and are not counted above, and every claim they
motivated is now carried by a committed case — including the handler-lookup containment, which is a
refusal case rather than prose.
**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and this correction adds no Agent, no model path and no eval fixture. No
process-kill run: this packet makes no persistence or process-failure claim. No native Driver,
packaging or release check. So nothing here supports a durability, isolation, native-fidelity,
release or E-gate claim.

**Cumulative re-check, not only the new cases.** The whole packet is re-proved after the
reconstruction: atomic creation and retry identity, ingress identity, replay versus conflict,
capacity-before-acknowledgment, reservation versus acknowledgment, single-observation bound
selection, asynchronous dispatch, redelivery identity, frozen receipts/refusals/dispositions,
hidden-versus-missing scope work, unsupported surfaces, inspection purity and scoping, and the
target zone's imports and exports.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

### Why the evidence supports each criterion — implementer assessment, not acceptance

| Criterion | Assessment | Why, and what would have failed |
|---|---|---|
| **C1** | met | Atomic bind, `READY`, the three lost-response rows, conflict, fresh key, cross-caller key text and principal-not-from-payload all hold; the new case proves a payload observation installing `get`/`set` still binds the observed value (replay replays, conflict conflicts), and the incoherent-handler shape is refused with nothing committed. |
| **C2** | met | Triple identity, replay/conflict, cross-producer/destination, unknown-versus-invisible, capacity-before-acknowledgment and per-root limits hold; the new case proves the accepted answer has a retained decision behind it at the mailbox, the receipt list, the replay index and the next reservation. |
| **C3** | met | Rules 1–6 byte-for-byte, four limits at and one over, per-root measurement, no repair. The one observation now survives descriptor conversion on every path that defines from it (snapshot, clone, shadows, window swap), and canonical bytes no longer depend on what the prototypes carry — for data fields, accessor fields, and execution counting. An unobservable representation is still refused. |
| **C4** | met | Intent-before-send, pinned fields, reservation-acknowledges-nothing, single-observation bound, non-blocking dispatch, one unresolved Activation. The exact acceptance-order prefix is reserved under a trapping bound getter for `get`, `set`, getter-counting and combined descriptor+indexed pollution, and excluded Events stay queued. |
| **C5** | met | Redelivery preserves ID, epoch, base revision, batch and receipt and re-sends the same frozen Activation object; batches formed under descriptor pollution and views read under residual pollution survive redelivery unchanged. |
| **C6** | met | Three boundaries, three receipts, replay returns the original, refusals mint none, reads authenticate and scope first with hidden indistinguishable from missing. The mints are byte-identical; what is new is that every definition between the observation and the mint no longer consults ambient state. |
| **C7** | met | Outcome, takeover and recovery refuse as K1.2, cancellation as K1.3, and the full snapshot is unchanged around each. Untouched, re-proved. |
| **C8** | met | No Agent/Workflow discriminator in code or exports; the JCS pin is structurally held; the zone's imports are internal, `node:` or exactly `canonicalize`; the new exports are internal to `own-array.ts` (17 runtime exports, unchanged). |
| **C9** | met | Inspection is inert and scoped, and a freshly built view, listing and redelivery under residual descriptor pollution now equals the unpolluted result exactly, field for field. |
| **C10** | met | Zone reaches only in-zone modules, `node:` builtins and exact `canonicalize`; the approved-leaf list is still empty; the zone is still private; the measured tree is unchanged (11 files), so the inventory and guard need no edit — no agreement check weakened and no schema relaxed. |

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) **one owning module rather than a per-call-site rule** — 012 asks a
semantic rule to have one normative home, and the previous three rounds show that an inspected list
of call sites is exactly what decays; the migration is nine call sites into two functions, and the
mechanical control enforces the ownership rather than the spelling; (b) **null-prototype descriptors
rather than neutralize-and-restore around every definition** — definitions happen on every list
append on every boundary, while the serializer window borrows host state exactly once per
canonicalization; per-definition borrowing would multiply the partial-failure surface for no gain;
(c) **restoration by exactly-owned-field copy rather than by descriptor-shape classification** — a
data/accessor branch would reintroduce the `in`-operator consultation the zone already removed, and
the copy is correct for both shapes including future host shapes; (d) **no contract change** — the
required invariant is already the contract; editing it here would be the implementation authorizing
its own weakening; (e) the ablation pair is directional (XA install-only, XB restore-only) rather
than one combined weakening, so each half of the primitive must earn its own rejection.

Trust boundaries, stated plainly and unchanged: the host-authenticated caller object, the
host-provided Driver object, and module-load host integrity for the primordial capture are trusted.
Everything crossing the request or value boundary is not. The one place the Kernel must borrow and
return host state remains the JCS window, and it restores on both the success and the
partial-failure path — now through descriptors that cannot themselves throw for ambient reasons.

**Strongest remaining risk.** Seven rounds have each found a deeper layer of the same family — reads,
snapshot, prototype hooks, serializer environment, commit and projection bindings, the write
operation, and now the descriptor the write converts. What is different across the last two rounds is
that each closure is enforced rather than argued: two source-text controls fail if the operation or
its owner reappears anywhere in the zone, and the ablation set includes weakenings with no runtime
witness of their own precisely to prove those controls carry the claim. What they still cannot
cover: (a) an ambient channel that is neither a named intrinsic, an indexed position, nor a
descriptor field — the honest limit is that the audit is derived from ECMA-262 semantics of the
operations this exact code performs, so a new operation reopens it, which is why the zone's
operation set is pinned by the controls; (b) host-level subversion (module registry, loader) that no
in-language discipline addresses; (c) `String`/`instanceof` on *Driver-supplied* values, which
remain host-trusted inputs inside a total guard rather than validated content.

The process-level risk is the same one round 9 named: claims that outrun their evidence. The
countermeasure used here is unchanged — every prose assertion about behaviour owes a case — plus one
addition: the two auxiliary probes that motivated fixture design (descriptor conversion in both
directions; handler trap lookup) are each paired with a committed case that fails if the probe's
claim is false, including one case whose asserted answer is *refusal* rather than acceptance.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
and `package-lock.json` still pins the same registry tarball and integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`;
neither file is in the `H9..C10` payload delta. The Apache-2.0 record and the round-3 owner approval
in the contract's Third-party review section stand unchanged and are not reopened. The audit of the
dependency's 49-line `lib/canonicalize.js` is reading published source to bound what the Kernel must
neutralize, as in prior rounds; no RFC text, test vector or corpus is copied.

### Reference maintenance ([008](../../008-implementation-report.md))

**No Layer-3 owner changed, and none needed to.** The [roadmap mapping](../../../../mental-model/roadmap.md#k11)
names creation, execution-cycle, core, identity and state as K1.1's expected owners. This round
changes no accepted semantics in any of them: the obligations it corrects are already stated there,
and the defect was that the implementation did not hold them under actual JavaScript descriptor
semantics. The implementation-level rule this round introduces (how a Kernel definition converts its
descriptor) is deliberately *not* promoted into the mental model: it is a property of one JavaScript
implementation of these semantics, not a Kernel concept, and `own-array.ts` is its home. Link
validation for the documents this round touches (report, manifest) is the `check:builder-docs` run
above. The reviewed-but-sealed records ([review-07](review-07.md), [implementation-09](implementation-09.md))
are not altered; history is carried forward in this report and in the 007 status transcription, not
by editing sealed records.

## Handoff

- **Ready for independent review** on the corrected candidate. The mandatory defect from
  [review-07](review-07.md) is corrected at the semantic-class level with distinguishing
  regressions, directional ablations and a mechanical control; one further same-family facet found
  during the reconstruction (Proxy handler trap lookup) is contained with separate provenance; the
  clean payload is fully revalidated with accessible raw evidence; and no known mandatory defect,
  unresolved owned semantic case or missing result remains. That is the basis for
  `WAITING_FOR_REVIEW`; it is not acceptance.
- Base B, payload C10 and candidate H10 with the verified advertised remote SHA are supplied in the
  external owner handoff after the push, not in this report. C9/H9 are superseded as candidates and
  must not be reviewed in place of H10; they are preserved as ancestors.
- **No self-acceptance.** Every criterion assessment above is the implementer's. The verdict is an
  independent reviewer's, bound to the exact candidate.
- **No successor release.** K1.2 is not begun and is not released; `next_release: none`.
