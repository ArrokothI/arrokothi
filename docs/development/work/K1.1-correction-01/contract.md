# K1.1-correction-01 contract — accepted-work correction for K1.1 review findings

**Packet:** K1.1-correction-01, a bounded corrective packet for the released packet
[K1.1](../K1.1/contract.md). **Parent milestone:** K1.
**Ledger row:** [007 K1.1-correction-01](../../007-work-packets.md#k11-correction-01--accepted-work-correction-for-k11-review-findings).
**Administrative origin:** [review-16](../K1.1/review-16.md) (reconciliation review recording
accepted-work invalidation and this corrective handoff), preserved at
`a8ac787b2a766d897c7bd85311c1b2aee53a1ca8` under 006's invalidated-acceptance rule.
**Governing process baseline:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (K1.1's own base;
correction closure is reviewed over the cumulative base-to-H interval, not over the
correction delta alone).
**Base commit:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (K1.1's original base B).
**Branch:** `codex/k1.1-correction-01-review-findings`. **Revision 1.**

## What this packet is, and what it is not

It corrects K1.1. It releases no successor, opens no new criterion and weakens none.

The acceptance criteria are **K1.1-C1 … K1.1-C10 exactly as
[K1.1's contract](../K1.1/contract.md#acceptance-criteria) states them**, at revision 5. This
packet adds no criterion of its own, so a reviewer judges it against the same ten obligations
the released packet is judged against, over the whole cumulative interval. It may add coverage,
provenance, tests, validation, structural evidence and clarifying documentation required by the
findings; it must not weaken C1…C10, relax receipt boundaries, alter approved value limits,
replace or reinterpret the approved `canonicalize@3.0.0`, weaken identity/replay/conflict/refusal
rules, implement persistence, or expand into K1.2.

## Authority and preserved identities

The reopening is required by [review-16](../K1.1/review-16.md) §§4–5 under 006's
"If later evidence invalidates accepted work" rule: historical ACCEPT retained, affected
claims/integration on hold, linked corrective packet before any new candidate. No unresolved
architecture decision is identified for these findings, so no blocker state applies. No K1.2
release is authorized by this packet.

| Identity | Value | Disposition |
|---|---|---|
| Original K1.1 base B | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` | Unchanged; cumulative review anchor |
| Reviewed payload C13 | `98d6cebcd5861e42c843fab65516829c8818bff8` | Preserved |
| Reviewed candidate H17 | `d93d7d2a0a59b31b3d74ceebfb036837150f729e` | Preserved |
| Historical ACCEPT record | [review-14](../K1.1/review-14.md), recorded at `4309c3bd87380ad965fb7096c4f20da7e85f0ec8` | ACCEPT of exact H17 preserved byte-unchanged; claims/integration on hold |
| Contrary review (Opus) | [review-15](../K1.1/review-15.md) | `CHANGES REQUIRED`; open findings below |
| Reconciliation review | [review-16](../K1.1/review-16.md) | `CHANGES REQUIRED`; invalidation + handoff |
| Correction starting point | `a8ac787b2a766d897c7bd85311c1b2aee53a1ca8` | Preserved history containing review-16 |
| K1.1 contract at correction | revision 5 | Inherited unchanged |

Review records 14, 15 and 16 are immutable and are not edited. Post-H17 documentation commits
on the preserved line (`9893376`, `1aa2de1`, `7af27bd`) are treated as declared payload in this
correction — reverted, not smuggled into any administrative window — and remain in history
untouched.

## Open findings

`K11-R15-ID-01`, `K11-R15-DOC-01`, `K11-R15-DOC-02`, `K11-R15-PROC-01`,
`K11-R16-VAL-01`, `K11-R16-ID-01`, `K11-R16-DISP-01`, `K11-R16-DOC-01`.
Required outcomes and counterexamples are in review-15 and review-16. These are manifestations
of seven affected semantic families, fixed at their semantic source — never one probe string,
one Proxy spelling, one link, or one historical diff window:

1. creation provenance vs post-creation ingress identity (R15-ID-01);
2. accepted value snapshot → JCS abstract-operation graph → canonical bytes/size → all dependent
   identity/evidence (R16-VAL-01);
3. total diagnostics over arbitrary caller-owned malformed values (R16-ID-01);
4. promise/rejection observation under mutable ambient Promise machinery (R16-DISP-01);
5. cumulative B→new-C documentation ownership and provenance (R15-DOC-01, R15-PROC-01);
6. canonical documentation correctness and mechanical link validation
   (R15-DOC-02, R16-DOC-01);
7. accepted-work invalidation and C/H/status/evidence process discipline (R15-PROC-01).

## Scope

**In scope.** The seven families above with all dependent producer/consumer paths; distinguishing
regressions for each concrete counterexample plus nearby-family cases; the four executable
ablations proving oracle sensitivity; cumulative B→new-C documentation accounting with the
mechanical scope guard anchored at B; the mental-model link/anchor check; truthful 007
status/provenance repair; full 006/008/012/015 validation and evidence. Any defect of the same
family found while reconstructing those paths, recorded with its own self-found provenance.

**Out of scope.** Any change to K1.1-C1…C10; any K1.2/K1.3/K1.4 semantics; persistence, schedulers
or leases (K3); real Drivers (R1); durability/isolation/Driver-fidelity claims; E1 or any
benchmark gate; K1 milestone closure; successor release.

## Required correction

Derived from the criteria's own obligations, not from probe strings:

1. **Creation/ingress identity separation (C2, C6).** The initial creation Event must not occupy a
   caller-constructible post-creation Input-ID triple (KC1-DEC-1). After creation the creating
   producer can submit `requestKey === creationKeyText` as genuine ingress: equal content is fresh
   ingress with its own identity and receipt (never a creation-boundary replay); different content
   follows normal ingress semantics (never a conflict against an Event never submitted).
2. **JCS abstract-operation closure (C3).** Canonical bytes/size depend only on the accepted
   immutable snapshot under the fully audited operation graph, including indirect iterator
   machinery (KC1-DEC-3). The approved exact unmodified `canonicalize@3.0.0` is preserved; host-state
   neutralization/restoration is extended; safe refusal where a slot cannot be neutralized.
3. **Total malformed-identity diagnostics (C1, C2, C6).** Every classification/description path over
   caller-owned identity/request fields is total: no exception escapes merely while diagnosing
   malformed input; each returns the located contract-defined refusal with scope-before-authorization,
   nondisclosure, and zero accepted-state/receipt mutation preserved (KC1-DEC-4).
4. **Driver rejection observation (C4, C5).** Dispatch and redelivery stay safe under
   caller-observable mutation of ambient Promise machinery, including species construction before
   rejection-continuation installation; no rejected Driver promise escapes as unhandled; intent,
   Activation, epoch, base, batch, receipt and no-acknowledgment guarantees preserved (KC1-DEC-5).
5. **Cumulative documentation/provenance (006/008).** Every non-record documentation path B→new-C is
   enumerated and classified; undeclared Layer-1/2/3 payload is reverted to base rather than
   justified after the fact (KC1-DEC-2). Post-H17 documentation is payload, reverted here. The
   mental-model tree gains a mechanical link/anchor check covering the class, not one string.
6. **Status/process discipline (006/007/008).** 007 truthfully records the historical ACCEPT, its
   invalidation/hold, and this corrective packet. C/H/A scope rules hold: docs are payload in C,
   never in H..A; H carries only the report, status transcription and declared C-outputs.

## Decisions taken within this contract

- **KC1-DEC-1 — the initial Event lives outside the ingress identity domain.** Creation records the
  mailbox entry at position 1 with the creation receipt but does not index it in `byInputId`, and
  its Event ID derives from the creation-key domain under a prefix no ingress Event ID can carry.
  The rejected alternative — reserving the creation-key text inside the producer's ingress key
  space — permanently burns one ingress key per Execution for input never submitted, and would
  require qualifying C6's receipt-boundary sentence; separation keeps C2/C6 verbatim.
- **KC1-DEC-2 — the mental-model tree is restored to base.** All 31 `mental-model/**` paths that
  drifted between B and the preserved starting point are returned to their B state in the correction
  payload. None of that drift is K1.1 packet maintenance: the contract's governing owners are B's
  pages, the drift was never reviewed, and B is already clean on the broken-link and
  atomicity-vs-durability findings. The trimmed tree remains available in preserved history
  (`ddf24de`, `7af27bd`) for a future docs packet; this packet carries zero reference payload.
- **KC1-DEC-3 — the serializer window covers the iterator-protocol graph.** The sandbox restores the
  primordial Array-iterator-prototype `next` and removes caller-installable `next`/`value`/`done`
  shadows above the iterator holder for the call window; the audit table names the
  `GetV(iterator, "next")` chain. Fresh adversarial review (R2) then showed removal is not enough:
  `Object.setPrototypeOf(Array.prototype, hostile)` inserts a hostile object *between* the cleaned
  holders, and the dependency's `[[Set]]`/`[[Get]]` walks land in it — so the window additionally
  resets every prototype link on the dependency's paths to its load-time shape for the exact call
  (refusing, never binding wrong bytes, where a link cannot be reset). The dependency is not
  forked, patched or wrapped in behaviour.
- **KC1-DEC-4 — diagnostics observe caller state through total operations only.** Non-text
  classification never lets a throwing observation (e.g. `Array.isArray` on a revoked Proxy) escape;
  envelope and field reads map observation failure to the located refusal for that field. Refusal
  shape, ordering, nondisclosure and retention semantics are unchanged — only the throw becomes the
  refusal the contract already requires.
- **KC1-DEC-5 — delivery sanitizes before sending, classifies without invoking, and states its
  limit.** `#deliver` runs the Driver invocation itself inside the sanitized window
  (`Promise[Symbol.species]` / `Promise.prototype.constructor` reinstalled, caller-installed
  `Object.prototype[Symbol.species]` removed): when the host cannot be sanitized at all
  (non-configurable slot) the Driver is never called, so no Driver promise comes into existence
  to escape — the attempt records the operational failure with intent, reservation and redelivery
  intact (R4-F1). Thenable classification reads descriptors without invoking a throwing `then`
  getter (R4-F3), and the returned promise's own construction slots fall through to the sanitized
  ambient for the attach (R4-F2). What remains is the fundamental JavaScript limit, locked by an
  explicit regression rather than claimed away: a Driver-authored subclass (or non-configurable
  own slot, or Proxy-trapped descriptor) whose species cannot be sanitized from outside makes
  every native subscription throw before any continuation attaches, so the attempt records failed
  while the original rejection escapes as process-level unhandled (R4-F4). No false delivery
  evidence, acknowledgment, or intent/batch/receipt alteration occurs on any of these paths.
- **KC1-DEC-6 — envelope fields are own fields; inherited-only reads as missing.** Fresh adversarial
  review (R3) showed ordinary reads let ambient `Object.prototype`/`Array.prototype` state answer
  *missing* envelope fields into acceptances the caller never spelled (`dispatch({})` accepted by
  an ambient `bound`, `create({})` by ambient identity text, `dispatch([])` through the array
  chain, same-tick trap steering of a later field). Every envelope observation therefore goes
  through an own-descriptor check first; a field carried only by inheritance — including a benign
  one — reads exactly as an omitted field. Own accessors still run as the allowed caller
  observation; only the chain above the envelope is cut off. No refusal shape, ordering, or
  retention rule changes — only what counts as "the field was supplied".

## Command plan

Run on the payload commit C, from the repository root, Node 22.9+:

```bash
npm run typecheck
npm test
npm run test:conformance
npm run test:kernel
npm run test:sdk
npm run check:builder-docs
node --test --test-reporter=tap "tests/conformance/architecture/*.test.ts"
```

plus the packet case inventory, the new mental-model link/anchor check, all correction
regressions, the four ablation/mutation checks, and the 015 structural gates. `npm run test:evals`
is not run: this correction reaches no Agent behaviour and no model path.

## Evidence and closure

006/008 lifecycle: a new clean payload C, final validation run against the committed C, an 008
report, immutable raw evidence with recorded digests, and an administrative H over that C. The
implementer marks review-ready and never self-certifies. Closure requires a **fresh, separate
independent review of the cumulative interval from the original base B to the new H**; no prior
PASS exempts any dependency. Integration and any dependent release stay held until that review
returns ACCEPT and the owner acts on it.

- Report: `implementation-01.md` in this directory.
- Raw evidence: `validation-01/` in this directory, with a MANIFEST recording digests.

Both are administrative records that belong to the candidate H rather than to the clean payload C,
so they are named here rather than linked: at C they do not yet exist, and a contract that linked
them would be wrong about its own tree.

## Limits

This packet is accepted by nobody. `next_release: none`. K1.2 is not begun and not released.
Third-party status: exact unmodified `canonicalize@3.0.0` only; no new reuse (record in report).
Checks not run and resulting claim limits are stated in the report, never silently omitted.
