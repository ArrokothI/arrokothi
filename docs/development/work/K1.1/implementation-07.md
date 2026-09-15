# Implementation report — K1.1, round 7

## Identity

- **Packet / parent:** K1.1 / K1. **Contract:** [contract.md](contract.md), **revision 4** (unchanged this round; both open findings are implementation defects against it, not contract amendments).
  **Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (B), including
  006/007/008/012/015 as they stand there.
- **State:** correction loop `IN_PROGRESS`; `WAITING_FOR_REVIEW` is claimed on the basis below, only
  after both mandatory defects were corrected and the clean payload revalidated. No self-acceptance.
  **Owner release:** explicit instruction on 2026-09-14 ("Let's release K1.1") through
  [Prompt A](../../009-universal-prompts.md#prompt-a--coding-agent); correction rounds need no
  renewed permission under 006. This round is a correction of the same released packet; no
  successor is released or begun. **Do not release K1.2.**
- **Prerequisite ACCEPT and integration:** K1.0 with corrections 01–02, integrated as `main` PR #21 /
  `9baff3a03662720af6eefe1ecfabc41fde99298f`, receipts [K1.0](../K1.0/integration-01.md) and
  [K1.0-correction-02](../K1.0-correction-02/integration-01.md), ledger-reconciled by `main` PR #26 /
  `05f48c204d1eae021b3464c206e5c11e84bb3505`.
- **Branch / remote:** `codex/k1.1-create-reserve-async-dispatch` on `origin`.
- **Base commit B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- **Round-7 payload C7:** `e59bd312373ca7afacd507a73717b16dfaa0a8f0`.
- **Previously reviewed candidates and reviews, all preserved as ancestors of C7:**
  C `8cd9e269` / H `0f345b3c` / [review-01](review-01.md);
  C2 `6b7e5fb0` / H2 `297cc56f`;
  C3 `615cdf88` / H3 `b3cdf337` / [review-02](review-02.md) at `3012b3c33` (CHANGES REQUIRED);
  C4 `1d4e4867` / H4 `156f1353` / [review-03](review-03.md) plus
  [review-03-supplement-01](review-03-supplement-01.md) (CHANGES REQUIRED);
  C5 `e0660eff` / H5 `bd2dab6d` / [review-04](review-04.md) at `8c26ffe` (CHANGES REQUIRED);
  C6 `b3d0d59f` / H6 `417798a3` / [review-05](review-05.md) at `24ff6b0` (CHANGES REQUIRED, the
  authoritative handoff for this round). Nothing was amended, rebased, squashed or force-pushed,
  with two stated exceptions below, neither of which touches published review history.
- **Ancestry note.** Between H6 and C7 the branch carries two non-payload commits, both preserved:
  `d1f85e5` (`all-doc`, an owner-side `mental-model/README.md` edit) and `24ff6b0` (the authentic
  review-05 record). C7 builds on top of both; neither is treated as a candidate.
- **Amendment note.** C7 was amended once while still local-only — before any validation ran on it,
  before any review of it existed, and before any push: the freeze-witness test was strengthened to
  keep the `Object.freeze` replacement live through the later dispatch, exactly as the witness
  requires (the first version restored it right after creation and therefore could not distinguish
  the dispatch-time freeze path; the S2 ablation proved the gap before handoff). All validation in
  `validation-07/` ran on the final C7. No published or reviewed commit was altered.
- **Candidate H7:** the commit containing this report. Its full SHA and the verified advertised
  remote SHA are in the external handoff, not here: a report cannot certify its own future push.
- **Exact C7..H7 administrative file allowlist:**
  `docs/development/work/K1.1/implementation-07.md` (this report),
  `docs/development/work/K1.1/validation-07/` (MANIFEST plus ten declared output-only logs, force-added
  with `git add -f` because root `.gitignore` ignores `*.log`), and the
  K1.1 status transcription in `docs/development/007-work-packets.md`. No production source, test,
  script, fixture, evaluator rule, threshold or configuration is in that interval; all of those are
  payload in C7.
- **Working-tree state:** clean at C7 apart from (a) `validation-07/`, which the validation run itself
  writes and which H7 commits with `-f`, and (b) one pre-existing uncommitted `mental-model/kernel.md`
  modification made by the user, explicitly not part of this packet: it is neither staged nor
  committed in C7 or H7. (The earlier `mental-model/README.md` working-tree modification is now
  committed as `d1f85e5` and therefore appears in ancestry rather than in the working tree.)
  Validation itself ran in a detached `git worktree` at exactly C7 (`/tmp/k11-c7-validation`,
  `node_modules` symlinked), where `git status` shows only `?? node_modules`.

## Changes and coverage

### Change groups

| Group | Files | Ownership and governing source |
|---|---|---|
| Post-observation ambient closure on commit/projection paths (STATE-01) | `packages/kernel/src/coordinator.ts`, `lifecycle.ts` | Kernel; [creation](../../../../mental-model/mechanisms/creation.md), [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md), [identity](../../../../mental-model/concepts/identity.md) |
| Primordial prototype decision + `in`-operator re-audit (VAL-03) | `packages/kernel/src/values.ts` | Kernel; [values](../../../../mental-model/concepts/values.md) |
| Distinguishing regressions for both findings | `packages/kernel/tests/{values,creation,dispatch}.test.ts` | this packet |
| Contract | unchanged at revision 4 | 006/012 (no semantic amendment) |

Cumulative `B..C7` and the round-7 payload delta are in
[`01-tree-and-environment.log`](validation-07/01-tree-and-environment.log). The payload delta over
H6 is exactly the six files above; `review-05.md` and the `all-doc` edit are preserved ancestry.

### Selected 012 methods, and material exclusions

Unchanged from the contract: **deterministic execution** (primary) with adversarial fixtures,
**normative decisions** for identity/equality/receipt rules, **race and fault** narrowly for dispatch
asynchrony and ingress-versus-reservation ordering, **process/documentation** for the K1.0
inventory/guard. This round is primarily a **semantic-correction closure** exercise under 006/012:
the subsystem is the entire post-observation chain, reconstructed with producers, consumers,
mutation points, replay paths, refusals and projections traced together (see below). Materially
excluded, as before: native Runtime/Driver fidelity (no real Driver exists; R1 owns it), external
evidence/gate methods (no E gate claimed), packaging/release (zone stays private). No persistence or
process-death claim is made or implied.

### The invariant (derived first, before the mechanism)

> **From the first caller-owned observation until the atomic decision is completely recorded — and
> on every replay, redelivery and inspection projection of that decision — no mutable ambient
> operation consulted by an acceptance, retention, evidence, dispatch-intent or projection
> invariant may allow a side effect caused while observing the caller to change the accepted
> observable result.**

The two findings are one invariant with two uncovered regions: STATE-01 is the region *after*
canonical bytes (commit/projection still consulted live builtins); VAL-03 is a region *inside* the
acceptance pass itself (the plain-object decision read a live binding the observation had just
replaced). The mechanism below serves the invariant; the named witnesses (`Map.prototype.set`,
`Object.freeze`, `Object.prototype`) are representatives, and the report shows why the fix does not
depend on their names.

### Semantic correction closure — K11-R5-STATE-01 (P1)

**What was actually wrong.** H6 isolated the exact JCS call but stopped closure at canonical bytes.
After validation, `createExecution`/`submitInput`/`dispatch` committed and projected through live
`Map.prototype.get/set` (retention/replay lookups and stores, including `new Map([[k,v]])` whose
entries path re-reads `set`), live `Array.prototype.push/map/filter` and array spreads (mailbox,
receipts, refusals, deliveries, batch/event/queued/terminal lists), live `Object.freeze` (QUEUED is
load-time and safe; the dispatch intent, carried Events and batch are not), live `new Set` +
`Set.prototype.has` (inspection reservation), live `for...of` over `Map.prototype.values()`
(listing), live `Array.prototype.includes` (terminal check in `lifecycle.ts`), and live
`Promise.resolve`/`.then` (delivery bookkeeping, reachable post-commit from a dispatch-tick getter
side effect). Either review witness breaks an invariant without touching JCS bytes: a `Map.set`
no-op returns success/receipt with no retained decision; an `Object.freeze` identity hands the
Driver a mutable exchange whose edits reappear on redelivery.

**Correction: total primordial discipline, verifiable by inspection.** Every operation on the
acceptance → commit → evidence → Activation → redelivery → inspection chain now resolves through
load-time references captured before any caller code runs, or is eliminated structurally:

- retention/replay: `Map.get/set` via load-time prototype references applied with load-time
  `Reflect.apply` (`mapGet`/`mapSet`); single-entry maps built as `new PrimordialMap()` plus
  `mapSet` (never `new Map(entries)`, whose entries path re-reads live `set`);
- accumulation: index assignment everywhere (mailbox, receipts, refusals, deliveries, visible
  lists, batch/event selection — the last already loop-built for DISP-01);
- sealing: load-time `Object.freeze` at all four dispatch/exchange sites;
- projection: index-loop copies and projections (`copyArray`/`copyMapped`); reservation membership
  by bounded linear scan instead of `Set`; listing by load-time `Map.forEach` (no iterator
  protocol anywhere on these paths — no `for...of`, no array spread, no destructuring iteration);
- lifecycle: `isTerminal` by index loop over the (load-time) terminal vocabulary;
- delivery: load-time `Promise.resolve`/`.then` applied explicitly, so a dispatch-tick getter side
  effect cannot make post-commit bookkeeping throw out of the boundary;
- refusal formatting: already loop-built (H6); `startsWith` replaced by an index read.

**Why this closes the class.** The enumeration that matters is fixed by the source, not by the
attacker: after this change there is *no remaining live ambient operation on these paths to
pollute*. A new witness can only replace something the code no longer consults (no effect) or
something still consulted — and the still-consulted set is enumerated here and consists solely of
(a) language operators and own-data/index reads, (b) object spread over Kernel-owned records,
(c) host-authenticated caller reads, and (d) Driver-supplied values inside `#deliver`'s existing
try/catch (whose formatter is itself total — `describeFailure` cannot throw). The static check in
validation (`09b` header method) confirms zero live
`.get/.set/.has/.push/.map/.filter/.slice/.forEach/.values/.includes(` calls, zero `for...of`,
zero array spreads and zero live `new Map/Set/Promise` across all five source files. Three
ablations (S1/S2 plus the V3-adjacent N1/N3/P1/P4/P5/P6 priors) prove the tests reject the live
forms.

**Consequence trace.** Capture (primordial discipline, H6) → clone → JCS in the restored
environment → limit → identity packing (loop-built) → commit (`mapSet`, index assignment) →
receipts/refusals (primordial mints) → Activation (primordial freeze, loop-built members) →
redelivery (same frozen object) → inspection (loop-built views). The Map witness case proves
retention (replay returns the retained decision, listing shows it); the freeze witness case —
with the replacement live *through the later dispatch*, as the witness requires — proves the
exchange is actually immutable (frozen at three levels, Driver edits throw, redelivery is the
same object, inspection agrees).

### Semantic correction closure — K11-R5-VAL-03 (P1)

**What was actually wrong.** `captureObject` observed the prototype through the load-time
`getPrototypeOf` but compared it against a live `globalThis.Object` read. A `getPrototypeOf` trap
replaces the binding and returns the replacement's (fresh, non-primordial, non-null) prototype,
which then compares equal to the live `Object.prototype` and passes as plain; the snapshot would
inherit the foreign prototype. (Replacing the *binding* works even though `Object.prototype`
itself is non-writable/non-configurable — the live comparison reads through the replaced binding.)

**Correction.** The genuine prototype is captured at load (`PrimordialObjectPrototype`) and both
sides of the decision are now caller-independent; a non-primordial, non-null trap result is refused
as `unsupported_form` rather than normalized. A trap returning the primordial prototype (or null)
yields a genuinely plain snapshot, whatever else the trap did — and everything downstream uses
primordials only, so the swap itself cannot steer later lines.

**Capture-path re-audit (equivalent live reads).** `values.ts` now contains no other live-intrinsic
comparison: the array-half check already used `PrimordialArrayPrototype`; `null` is a literal;
`typeof`/`===`/templates are operators. Additionally, all seven `"value" in descriptor` tests were
converted to a primordial own-property check (`hasOwnValue` via load-time `hasOwnProperty` +
`Reflect.apply`): the `in` operator consults the prototype chain, so a trap polluting
`Object.prototype` with a `value` member would let an accessor descriptor pass as data and make
`descriptor.value` read the pollution as owned content. This covers capture, clone and shadow-map
construction uniformly, so no case analysis of "which holders can be exotic" is needed.

**Distinguishing oracle.** Direct value case (trap swaps the binding and returns the foreign
prototype → `unsupported_form`, no canonical form) plus creation-boundary case (same shape →
`malformed_value`, nothing created/listed). Ablation V3 restores the live comparison and is
rejected by exactly these two cases.

### Tests added, changed and retired

| Change | Reason |
|---|---|
| **+ 1 case** in `values.test.ts` | VAL-03 trap-swap direct refusal (binding verified live across the call, restored after) |
| **+ 1 case** in `creation.test.ts` | VAL-03 creation-boundary refusal with nothing retained |
| **+ 1 case** in `creation.test.ts` | STATE-01 Map.set no-op commit (replay/list/inspection prove retention) |
| **+ 1 case** in `dispatch.test.ts` | STATE-01 freeze replacement live through dispatch (three-level frozen, edits throw, redelivery identical, inspection agrees) |
| **~ 0 retired** | No regression retired. All 172 C6 cases intact (176 total) |

Kernel cases 172 → 176 (+4). Full suite 2,230 → 2,234 (+4). No other suite count moves, as expected:
conformance 1,949, architecture 362, SDK 22 unchanged.

**Compatibility, refusal and baseline impact.** Zone stays private/unadvertised; no consumer routed
through it; SDK host path unchanged (`test:sdk` green). Baseline `002` untouched. No export-surface
change (17 runtime exports, 10 `src` files, `canonicalize` exact): K1.0 inventory and both
export-surface controls unchanged and green. No new refusal classification: VAL-03 reuses
`unsupported_form`/`malformed_value`; STATE-01 adds no new refusal (retention now cannot fail that
way). `lifecycle.ts` behaviour is identical (loop over the same vocabulary).

### Prior findings

| Finding | Disposition at C7 | Evidence |
|---|---|---|
| **K11-R5-STATE-01 (P1)** | **Corrected by reconstruction** (above). | 2 new witness cases; ablations S1/S2 |
| **K11-R5-VAL-03 (P1)** | **Corrected** (above + `in`-operator re-audit). | 2 new cases; ablation V3 |
| K11-R2-VAL-02 (family) | Named H5/H6 witnesses remain corrected and **re-proved** (environment + clone layers). | ablations N1 + P6 (disjoint rejection sets, rerun on C7) |
| K11-R4-DISP-01 | Closed, **re-proved** (single-observation + envelope guard intact). | ablation N3 (rerun on C7) |
| K11-R4-PROC-01 | Closed, stands (readiness claimed only after clean-C7 validation). | this report + validation-07 |
| K11-R3-ID-03 | Closed, untouched block verified by diff. | full suite |
| K11-R3-LIMIT-01 | Closed, **re-proved** (traversal ablation aborts after ~16s vs ~1ms bounded refusal). | ablation P5 (rerun on C7) |
| K11-R3-DOC-02 | Closed, untouched, suites green. | architecture + boundary suites |
| K11-R3-PROC-02 | Closed, **re-proved** (`validation-07/` force-added; every manifest-named file verified at H7 — see Handoff). | MANIFEST + ten `.log` files |
| K11-R2-EVID-01 | Closed; mint files byte-identical H6→C7 (verified by diff). | full suite |
| K11-R1-VAL-01 | Closed, **re-proved** (agreement-check ablation rejected). | ablation P1 (rerun on C7) |
| K11-R1-JCS-01 | Closed as dependency decision, **re-proved** (exact `3.0.0` pin/lockfile/guard unchanged). | ablation P4 (rerun on C7) |
| K11-R1-ID-01/SCOPE-01/PROC-01/DOC-01, K11-R3-ID-02 | Closed, untouched, re-verified on ancestry. | full + conformance suites |

**H6 corrections preserved** (per the handoff): exact unmodified `canonicalize@3.0.0`, safe
serialization clone, restored serializer environment, encode-failure containment, primordial
evidence minting, loop-built identity packing, single-observation dispatch bound, bounded over-limit
rejection, scope ordering — none weakened; the ablations above re-prove the load-bearing ones on
the reconstructed tree.

**Cumulative re-review.** C1–C10 were re-derived against the cumulative `B..C7` tree; no prior PASS
was carried forward without its guard re-proven or verified untouched. Per-criterion implementer
assessment is under [Validation](#validation-and-interpretation).

### Additional self-found defects (separate provenance)

Two, both found during the 012 re-audit and recorded here rather than attributed to the reviewer:
(1) the seven `"value" in descriptor` prototype-chain reads (VAL-03 family, fixed via `hasOwnValue`);
(2) `String.prototype.startsWith` in refusal relocation and the `for...of`/spread/`new Map(entries)`
forms in views and listing (STATE-01 family, fixed via index reads/loops and `mapSet`/`forEach`).
A third self-found item is methodological, not semantic: the first version of the freeze-witness
test restored `Object.freeze` before dispatch and therefore could not distinguish the dispatch-time
freeze path — the S2 ablation run exposed this *before handoff*, and the test was strengthened
(keeping the replacement live through dispatch) while C7 was still local-only; see the amendment
note under Identity. No additional in-scope defect was found that is not covered above.

### Unresolved obligations

`K1.1-OPEN-3` (accepted progress trivially absent until K1.2), `OPEN-4` (empty batch unreachable),
`OPEN-5` (published never-expires key policy), `OPEN-6` (no durability/isolation/Driver-fidelity claim)
and `OPEN-7` (unbounded delivery-attempt log) stand exactly as contract revision 4 states them. None is a
defect in this packet's claim. `OPEN-1`/`OPEN-2` remain closed. **No owner blocker is open, and no owned
semantic case is left for the reviewer to decide.**

## Validation and interpretation

Every command ran in the detached worktree `/tmp/k11-c7-validation` at exactly
C7 `e59bd312373ca7afacd507a73717b16dfaa0a8f0` (`node_modules` symlinked; otherwise clean), on
Node v25.2.1 / npm 11.6.2 / TypeScript 5.9.3 / Darwin 25.6.0 arm64, from the repository root of that
worktree. Exit codes, counts, raw paths and SHA-256 digests are in
[`validation-07/MANIFEST.md`](validation-07/MANIFEST.md) (force-added raw logs; hashes verified
against the files).

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 2,234 tests, 332 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1,949 tests, 283 suites, 0 fail |
| `npm run test:kernel` | 0 | 176 tests, 31 suites, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |
| `npm run check:builder-docs` | 0 | 26 files, 286 links/anchors, 38 imports |
| architecture suite (TAP) | 0 | 362 tests, 37 suites, 0 fail |
| packet case inventory (TAP) | 0 | 176 tests, 31 suites, 0 fail, every case named |
| control + 9 one-behaviour ablations | 0 | control clean; **9 of 9 rejected** by named cases |

**Cumulative re-check (not only new tests).** The full surface re-proves the whole packet after the
reconstruction: atomic creation/retry identity, ingress identity, replay vs conflict,
capacity-before-ack, reservation vs acknowledgement, single-observation bound selection,
asynchronous dispatch, redelivery identity, frozen receipts/refusals/dispositions, hidden/missing
scope work, unsupported surfaces, inspection purity/scoping, and target-zone imports/exports.

**External fixture / gate / decision:** none prepared, none executed, none claimed. E0–E6 are the
benchmark repository's.

**Checks not run, and the resulting limits.** `npm run test:evals` was not run: 006 requires it for
Agent behaviour, and this correction adds no Agent, no model path and no eval fixture. No process-kill
run: this packet makes no persistence or process-failure claim. No native Driver or packaging check.
So nothing here supports a durability, isolation, native-fidelity, release or E-gate claim.

### Why the evidence supports each criterion — implementer assessment, not acceptance

| Criterion | Assessment | Why, and what would have failed |
|---|---|---|
| **C1** | met | Atomic bind, `READY`, lost-response rows, conflict, fresh key, cross-caller text, principal-not-from-payload hold. The Map witness proves the commit is actually retained (replay/list/inspection); VAL-03 creation case proves foreign prototypes refuse. Without the fix, success-without-retention and prototype-passing both reproduce. |
| **C2** | met | Triple identity, replay/conflict, cross-producer/destination, unknown-vs-invisible, capacity-before-ack (loop-counted), per-root limits hold; same primordial commit path as C1. |
| **C3** | met | Rules 1–6 byte-for-byte, four limits at/one-over, per-root measurement, no repair. Plain-object acceptance no longer reads a live binding; `in`-operator reads are own-checks. V3 ablation rejected by exactly the new cases. |
| **C4** | met | Intent-before-send, pinned fields, reservation-acknowledges-nothing, single-observation bound, non-blocking dispatch, one unresolved Activation. The intent is frozen through the load-time reference with loop-built members; the freeze witness (pollution live through dispatch) proves it. S2 ablation rejected. |
| **C5** | met | Redelivery preserves ID/epoch/base/batch/receipt and re-sends the same frozen Activation; late Events stay out. A Driver edit now throws instead of sticking (witness case). |
| **C6** | met | Three boundaries/three receipts, replay returns original, refusals mint none, reads authenticate/scope first with hidden==missing. Mint sites unchanged and byte-identical; retention behind the receipt now proven (Map case). |
| **C7** | met | Outcome/takeover/recovery refuse as K1.2, cancellation as K1.3, state untouched. Untouched, re-proved. |
| **C8** | met | No Agent/Workflow discriminator in code or exports; JCS pin structurally held. Re-scanned. |
| **C9** | met | Inspection is inert/scoped; views are loop-built from retained state with no ambient collection or iteration; reservation membership needs no `Set`. S1/S2/V3 witnesses all end in agreeing inspection. |
| **C10** | met | Zone imports only in-zone + `node:` + exact `canonicalize`; leaf list empty; private; no legacy. No new files; export surface unchanged (17); inventory/guard green. |

### Design choices, assumptions and the strongest remaining risk

Routine choices under 007: (a) load-time-reference discipline rather than a wider restore window —
no host state is ever mutated by this design (unlike the JCS sandbox, which must restore because the
dependency resolves globals internally and cannot be rewritten); (b) neutralization-over-refusal
where correct results stay computable is unchanged from round 6; (c) linear reservation scan instead
of a primordial `Set` (bounded tiny batches; one fewer protocol to audit); (d) `Map.forEach` for
listing (no iterator protocol); (e) generic refusal messages where interpolated values could be
attacker-influenced.

Trust boundaries stated plainly: the host-authenticated caller object, the host-provided Driver
object (failures contained by `#deliver`'s try/catch and total formatter), and module-load host
integrity for the primordial capture itself are trusted; everything crossing the request/value
boundary is not. `describeFailure`'s `instanceof`/`String` and `isThenable`'s `.then` read operate on
Driver-supplied values inside a total try/catch (they cannot throw out), and the exported
`TERMINAL_STATES` vocabulary is a load-time literal. Persistent cross-call pollution is covered to
the same extent as same-tick pollution for every path above, because no path consults live ambient
state at any time — there is no "restore" that a later call could miss.

**Strongest remaining risk:** five correction rounds have each found a deeper layer of the same
family (reads → snapshot → prototype hooks → serializer environment → commit/projection +
acceptance-pass bindings). The closure argument is now structural (the source contains no other
operation to steer) rather than witness-based, and the static check is reproducible from the
validation logs' method. What it cannot prove: a future edit reintroducing a live reference (a
one-line guard test asserting the grep would mitigate this; it is not added here to avoid inventing
new conformance machinery inside a correction round), and channels outside JavaScript semantics
entirely (host module-registry or loader subversion), which no in-language discipline addresses.

### Third-party review under AGENTS.md

**No new third-party code, test, script, asset, dependency or service was copied, adapted, vendored
or added this round.** `packages/kernel/package.json` still declares exactly `"canonicalize": "3.0.0"`
and `package-lock.json` still pins the same registry tarball and integrity
`sha512-yYLfHyDMIXRyRqsKBRLX023riFLpXY2YOfdtqKXZRZy9qsfOJ9U+4F9YZL7MEzL5+ziN2x2nlBvY/Voi3EBljA==`;
neither file is in the `H6..C7` delta. The Apache-2.0 record and round-3 owner approval in the
contract's Third-party review section stand unchanged and are not reopened. `node:` builtins
referenced as load-time values introduce no new package. No legal-clearance claim beyond that record
is made.

## Handoff

- **Ready for independent review** on the corrected candidate: both mandatory defects are corrected
  with distinguishing tests, the clean payload is fully revalidated with accessible raw evidence,
  and no owned semantic case is left for the reviewer.
- Base B, payload C7 and candidate H7 with the verified advertised remote SHA are supplied in the
  external owner handoff after the push. The reviewer should bind to the cumulative `B..H7` diff and the
  exact `C7..H7` administrative allowlist above, and re-check C1–C10 cumulatively. All prior
  review records are preserved and unmodified.
- Before handoff, the H7 tree is inspected with `git ls-tree -r --name-only H7 -- <validation-07>/`
  to confirm every raw file the manifest names actually exists at H7.
- **No self-acceptance.** No criterion is accepted here. Nothing is merged. `main` is untouched
  (`05f48c2`). Successor release stays owner-controlled; `next_release: none`.
