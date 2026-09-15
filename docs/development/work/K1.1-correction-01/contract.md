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
**Documentation anchor D:** `0ee13f8138af52107d86967043bcc460faba8893` (see
[KC1-DEC-7](#decisions-taken-within-this-contract)).
**Branch:** `codex/k1.1-correction-01-review-findings`. **Revision 3 (round-5: the owner's
completed Layer-1/2 documentation rewrite becomes authorized retained payload under KC1-DEC-7,
which supersedes KC1-DEC-2 and decision-01's deployment-page restoration item; the documentation
scope guard is re-anchored from B to D and strengthened from a four-path allowlist to
whole-tree byte identity. No acceptance criterion, limit, refusal, receipt boundary, evidence
obligation or delivery-boundary rule changes, and every revision-2 requirement other than the
two named above stands verbatim.)**

## What this packet is, and what it is not

It corrects K1.1 and releases no successor. [Decision 01](decision-01.md), authorized by
the owner on 2026-09-15, changes the delivery API and replaces revision 1's absolute
Promise-observation obligation with explicit operational reporting. This is a deliberate
contract change, not a claim that H1 satisfied revision 1.

Revision 3 is a second deliberate contract change, of the same kind and for the same reason:
the owner completed a Layer-1/2 documentation rewrite on this branch after H2, and revision 2
required that tree to be reverted. Rather than leave the delivered candidate contradicting its
own contract — the defect [review-05](review-05.md) records as `KC1-R4-PROC-01` — the contract
now states the rule the owner actually decided. It is not a claim that H3 satisfied revision 2,
and it relaxes no acceptance criterion.

The acceptance criteria are **K1.1-C1 … K1.1-C10 exactly as
[K1.1's contract](../K1.1/contract.md#acceptance-criteria) states them**, at revision 5. This
packet retains those ten criterion IDs and their coordination invariants. For C4/C5,
the delivery API and corrective acceptance mapping in [decision-01](decision-01.md#acceptance-mapping)
supersede revision 1's Promise-specific requirement. A reviewer judges the ten obligations
the released packet is judged against, over the whole cumulative interval. It may add coverage,
provenance, tests, validation, structural evidence and clarifying documentation required by the
findings; it must not weaken C1…C10, relax receipt boundaries, alter approved value limits,
replace or reinterpret the approved `canonicalize@3.0.0`, weaken identity/replay/conflict/refusal
rules, implement persistence, or expand into K1.2.

## Authority and preserved identities

The reopening is required by [review-16](../K1.1/review-16.md) §§4–5 under 006's
"If later evidence invalidates accepted work" rule: historical ACCEPT retained, affected
claims/integration on hold, linked corrective packet before any new candidate. The later
[blocker](blocker-01.md) and [review-02](review-02.md) established a real API conflict.
[Decision 01](decision-01.md) resolves it under the owner's explicit delegation; implementation
resumes in this correction only. No K1.2 release is authorized.

| Identity | Value | Disposition |
|---|---|---|
| Original K1.1 base B | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` | Unchanged; cumulative review anchor |
| Reviewed payload C13 | `98d6cebcd5861e42c843fab65516829c8818bff8` | Preserved |
| Reviewed candidate H17 | `d93d7d2a0a59b31b3d74ceebfb036837150f729e` | Preserved |
| Historical ACCEPT record | [review-14](../K1.1/review-14.md), recorded at `4309c3bd87380ad965fb7096c4f20da7e85f0ec8` | ACCEPT of exact H17 preserved byte-unchanged; claims/integration on hold |
| Contrary review (Opus) | [review-15](../K1.1/review-15.md) | `CHANGES REQUIRED`; open findings below |
| Reconciliation review | [review-16](../K1.1/review-16.md) | `CHANGES REQUIRED`; invalidation + handoff |
| Correction starting point | `a8ac787b2a766d897c7bd85311c1b2aee53a1ca8` | Preserved history containing review-16 |
| K1.1 contract at correction | revision 5 | Historical text preserved; C4/C5 correction mapping governed by revision 2 and decision-01 |
| Round-4 payload C3 / candidate H3 | `90dec32040aeaf067dcaadca8f918dce6bdb86c4` / `b883f291d83060b360b419e2a58b771f9abbc74b` | Preserved; the executable tree this packet still carries |
| Round-4 reviews of exact H3 | [review-04](review-04.md) `ACCEPT` at `484beb07fe150646631985d5e9ce7b2754da7475`; [review-05](review-05.md) `CHANGES REQUIRED` | Both preserved byte-unchanged; neither edited to agree with the other |
| Documentation anchor D | `0ee13f8138af52107d86967043bcc460faba8893` | Owner's frozen Layer-1/2 rewrite; KC1-DEC-7 scope-guard anchor |

Review records 14, 15 and 16 are immutable and are not edited. Post-H17 documentation commits
on the preserved line (`9893376`, `1aa2de1`, `7af27bd`) are treated as declared payload in this
correction — reverted, not smuggled into any administrative window — and remain in history
untouched.

Two independent reviews reached opposite verdicts on exact H3 and both stand. 006 requires one
accountable full cumulative review for acceptance, not a majority: the disagreement is resolved
by correcting the defect review-05 found and obtaining a fresh review, not by counting verdicts.
Review-05's author implemented revision 3, so that session cannot supply acceptance for it.

## Finding coverage

Review-01 closed seven findings. `K11-R16-DISP-01` remains open; review-02 also
identified the 007 contradiction `KC1-R2-PROC-01`, repaired by decision-01 and awaiting
reviewer verification. The original eight findings below remain cumulative coverage:


`K11-R15-ID-01`, `K11-R15-DOC-01`, `K11-R15-DOC-02`, `K11-R15-PROC-01`,
`K11-R16-VAL-01`, `K11-R16-ID-01`, `K11-R16-DISP-01`, `K11-R16-DOC-01`.
Required outcomes and counterexamples are in review-15 and review-16. These are manifestations
of seven affected semantic families, fixed at their semantic source — never one probe string,
one Proxy spelling, one link, or one historical diff window:

1. creation provenance vs post-creation ingress identity (R15-ID-01);
2. accepted value snapshot → JCS abstract-operation graph → canonical bytes/size → all dependent
   identity/evidence (R16-VAL-01);
3. total diagnostics over arbitrary caller-owned malformed values (R16-ID-01);
4. explicit delivery reporting replacing Promise observation (R16-DISP-01; decision-01);
5. cumulative B→new-C documentation ownership and provenance (R15-DOC-01, R15-PROC-01);
6. canonical documentation correctness and mechanical link validation
   (R15-DOC-02, R16-DOC-01);
7. accepted-work invalidation and C/H/status/evidence process discipline (R15-PROC-01).

Later rounds added findings against this correction's own candidates. Open at revision 3, all
from [review-05](review-05.md) against exact H3, all in family 5 or 7 and none semantic:
`KC1-R4-PROC-01` (the contract's documentation scope guard was disabled with no artifact
authorizing it), `KC1-R4-PROC-02` (007's packet scope section contradicted its own ledger row),
`KC1-R4-DOC-01` (the report did not enumerate or classify the cumulative documentation change it
carried). `KC1-R2-PROC-01` is reopened as `KC1-R4-PROC-02`: same family, new location.
Review-05 also records K1.1-C1…C10 PASS on exact H3 under independent rerun, reproduced
ablations and reviewer-authored counterexamples; revision 3 changes nothing those criteria
depend on.

## Scope

**In scope.** The seven families above with all dependent producer/consumer paths; distinguishing
regressions for each concrete counterexample plus nearby-family cases; the decision-01 reporting mutations and retained unrelated
ablations proving oracle sensitivity; cumulative B→new-C documentation accounting with the
mechanical scope guard anchored at D; the mental-model link/anchor check; truthful 007
status/provenance repair; full 006/008/012/015 validation and evidence. Any defect of the same
family found while reconstructing those paths, recorded with its own self-found provenance.

**Out of scope.** Any change to K1.1-C1…C10 outside the delivery-boundary change explicitly
authorized by decision-01; any K1.2/K1.3/K1.4 semantics; persistence, schedulers
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
4. **Driver delivery reporting (C4, C5).** Implement the canonical
   [delivery reporting boundary](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary)
   and all [decision-01 acceptance cases](decision-01.md#acceptance-mapping). Preserve intent,
   Activation, epoch, base, batch, receipt and no-acknowledgment guarantees. Remove the
   Promise-return path and replace the counted-unhandled oracle; no compatibility fallback.
5. **Cumulative documentation/provenance (006/008).** Every non-record documentation path B→new-C is
   enumerated and classified in the report, by path, layer and disposition (authorized payload,
   owner-retained, or reverted), stating for each whether any K1.1 governing semantics moved.
   Undeclared payload is still reverted rather than justified after the fact; what counts as
   declared is now fixed by KC1-DEC-7 rather than KC1-DEC-2. The mental-model tree retains a
   mechanical link/anchor check covering the class, not one string. **Every `mental-model/**`
   path must be byte-identical to D in the payload commit** — no allowlist, no exception, no
   per-path argument. A change any later packet needs there is a fresh owner decision that moves
   D, recorded in this contract before the payload, never an edit justified inside a report.
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
- **KC1-DEC-2 — superseded by KC1-DEC-7 at revision 3.** Revisions 1 and 2 required all 31
  `mental-model/**` paths that drifted between B and the correction's starting point to be
  returned to their B state, authorizing only decision-01's four named delivery-boundary paths.
  That rule governed H1 and H2 and is preserved here as the reasoning those candidates were
  judged against. It does not govern revision 3: the drift it was written about was unreviewed
  historical drift, whereas the tree at D is the owner's completed and deliberate rewrite.
  The rejected alternative — reverting the owner's finished work to B and asking for it again
  as a separate packet — destroys reviewed-and-correct prose to satisfy an anchor rather than
  a semantic obligation, and would have left the same collision waiting for the next round.
- **KC1-DEC-7 — the documentation anchor moves from B to D, and the guard covers the whole tree.**
  On 2026-09-15, after H3, the owner completed and froze the Layer-1/2 documentation rewrite at
  `0ee13f8138af52107d86967043bcc460faba8893` (`finish-all-second-layer-doc`) and instructed that
  the resulting tree is authoritative and is not to be reverted. That commit is **D**, this
  packet's documentation anchor. Its provenance is the owner's instruction in the round-5
  implementation session, recorded in [implementation-04](implementation-04.md); the four earlier
  owner commits it builds on (`55389aa`, `4c2f0a5`, `b548e17`, `462ae3f`) remain in ancestry
  untouched.

  Two consequences, and they are deliberately in opposite directions. The tree at D is authorized
  retained payload: the Layer-1/2 rewrite of `README.md`, `kernel.md`, `runtime.md`, `driver.md`
  and `deployment.md` stands, decision-01's instruction to restore `deployment.md` to B is
  withdrawn, and no `mental-model/**` path is reverted by this packet. But the guard that failed
  is not relaxed to accommodate that — it is **tightened**. A four-path allowlist measured from B
  becomes whole-tree byte identity measured from D. Under revision 2 a reviewer had to reason
  about which of 31 differing paths were authorized; under revision 3 the check is
  `git diff --name-only D HEAD -- mental-model/` and the only passing answer is empty output.

  This decision changes documentation scope only. It moves no acceptance criterion, no canonical
  Layer-3 semantics, and nothing in `KC1-ARCH-1`. The Layer-3 pages are unaffected in substance:
  every `concepts/**` and `mechanisms/**` page except the four decision-01 authorizes is
  word-for-word identical between B and D, differing only in line wrapping — established by the
  word-level comparison in [review-05](review-05.md) and reproduced in this round's evidence.
  `concepts/` and `mechanisms/` remain unrewritten; when the owner does rewrite them, that is a
  change to the governing sources the K1.1 criteria are judged against and belongs to its own
  packet with its own review, not to a branch commit while a candidate is open.
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
- **KC1-DEC-5 — superseded by owner-delegated decision KC1-ARCH-1.** H1's Promise sanitation
  strategy and counted-unhandled exception do not govern revision 2. The configurable
  subclass was fixable, but the unrestricted return domain was not. Implement the canonical
  [reporting boundary](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary)
  under [decision-01](decision-01.md); preserve H1 and its reviews as history.
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
regressions, the retained unrelated ablation/mutation checks plus the four reporting-boundary
mutations in decision-01, and the 015 structural gates. `npm run test:evals`
is not run: this correction reaches no Agent behaviour and no model path.

The KC1-DEC-7 documentation scope guard is part of this plan and its raw output is recorded:

```bash
git diff --name-only 0ee13f8138af52107d86967043bcc460faba8893 HEAD -- mental-model/   # must be empty
git diff --stat 777b9955fb3a443f700b4f3d1f4f2aef1869345b 0ee13f8138af52107d86967043bcc460faba8893 -- mental-model/
```

The first line is the gate. The second is the B→D accounting the report classifies, together with
the word-level comparison that shows which of those paths changed in substance rather than in line
wrapping. A non-empty first result fails the packet; it is never explained away in a report.

## Evidence and closure

006/008 lifecycle: a new clean payload C, final validation run against the committed C, an 008
report, immutable raw evidence with recorded digests, and an administrative H over that C. The
implementer marks review-ready and never self-certifies. Closure requires a **fresh, separate
independent review of the cumulative interval from the original base B to the new H**; no prior
PASS exempts any dependency. Integration and any dependent release stay held until that review
returns ACCEPT and the owner acts on it.

- Next report: `implementation-04.md` in this directory.
- Fresh raw evidence: `validation-04/`, with a MANIFEST recording digests.
- Rounds 1–4's implementation-01…03 and validation-01…03 remain historical. They validate the
  trees they name and are not evidence for revision 3's documentation scope.
- [Review-01](review-01.md), [review-02](review-02.md), [review-03](review-03.md),
  [review-04](review-04.md) and [review-05](review-05.md) are immutable and are not edited.
  Review-04 (ACCEPT) and review-05 (CHANGES REQUIRED) bind the same candidate H3 and disagree;
  both stand as recorded, and neither is amended to match the other.

Both are administrative records that belong to the candidate H rather than to the clean payload C,
so they are named here rather than linked: at C they do not yet exist, and a contract that linked
them would be wrong about its own tree.

## Limits

This packet is accepted by nobody. `next_release: none`. K1.2 is not begun and not released.
Third-party status: exact unmodified `canonicalize@3.0.0` only; no new reuse (record in report).
Checks not run and resulting claim limits are stated in the report, never silently omitted.
