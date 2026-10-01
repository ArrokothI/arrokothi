# Draft owner notice — O-R8-4 classification claim hold

**DRAFT — NOT ADOPTED.** Prepared on 2026-10-01 by the DESIGN-AUDIT-01 Codex
implementer after the owner's instruction: “Prepare an invalidation draft first”.
That instruction authorizes this draft; it does not adopt the notice, change accepted
claims, or authorize resuming the audit. This is not an independent review verdict.

## Recommended decision

Hold the claim that the current in-process Kernel binding refuses re-prototyped
exotic objects rather than accepting a plain-object projection that omits or changes
their content. Preserve historical ACCEPT records and existing integrations. Permit
DESIGN-AUDIT-01 to resume its read-only comparison of root fixes, with this claim
explicitly held and O-R8-4 open. Select the corrective packet after that comparison;
no implementation or successor is released by this notice.

This recommendation concerns a demonstrated value-classification defect. It does not
select an adversarial-caller model, cooperative-caller model, or bytes/text intake.

## Evidence and the claim affected

- **Current tree verified:** audit base and advertised main
  `66bc041175e6fc191c2e7cf88de198111e7d97c9`.
- **Original provenance:** K1.2-correction-01
  [review 08, O-R8-4](../../K1.2-correction-01/review-08.md), explicitly identified there
  as pre-existing K1.1 behavior requiring owner triage, outside that correction's scope.
- **Current reproduction:** [script](../probes/reverify-exotics.py) and
  [output](../probes/reverify-exotics.txt). The wrapper executes the original review-08
  cases with import relocation only, checks their source identity, and verifies the
  entire Kernel source tree against the base. Environment and hashes are in the output.
- **Governing owner:** [values / in-process value capture](../../../../../mental-model/concepts/values.md#in-process-value-capture),
  reached through [reference](../../../../../mental-model/reference.md). It requires
  refusal rather than silent dropping for unsupported forms, expressly including Maps,
  Dates and typed arrays.
- **Contradiction:** a Map with a stored entry and null prototype is accepted as `{}`;
  a re-prototyped Date and Set are also accepted as `{}`; a null-prototype typed array
  is accepted as `{"0":7,"1":8,"2":9}`. The output also records the other accepted and
  refused controls. These are ordinary built-ins, with no Proxy in the reproduced cases.

The defect is in deciding which input forms are valid. The serializer is then faithfully
encoding the captured projection. This is not evidence that JCS itself produces wrong
bytes for its snapshot, or that every ordinary plain object is misclassified.

## Mechanism and affected consumers

At the pinned base, `packages/kernel/src/values.ts:866` (`captureObject`) accepts
an object whose observed prototype is null or the captured Object.prototype, then
captures its own enumerable data properties. It has no internal-slot brand rejection
before that path. Altering a built-in's prototype leaves its internal content in place
while satisfying the prototype test. That content does not enter the snapshot.

| Surface at the pinned base | Effect supported by the current evidence |
|---|---|
| Exported `canonicalize`, `boundaryValueIssues`, `isBoundaryValue` (`values.ts`) | Direct classification path; the canonicalize probe demonstrates the defect. |
| Creation authorityContext and initial-input payload; ingress payload (`coordinator.ts:724,793`) | Source trace reaches the same capture. These values feed retained content and request identity. Acceptance of an exotic projection can lose content before identity comparison. End-to-end request witnesses are still follow-up work, not claimed as executed here. |
| Outcome progress, Emission values, completed result and failed error (`outcome.ts:191,319,374,381,415`) | Source trace reaches the same capture. The projected value can pass this boundary; other Outcome validation and authorization still apply. No grant bypass or unauthorized commit is established by this probe. |
| Recovery text lists (`outcome.ts:520`) | Reaches capture, then separately requires an array of strings. The directly probed object projections fail that later schema; do not claim they become accepted availability lists. |
| Identity text (`envelope.ts:175`) | Requires a primitive string before capture; the directly probed exotic objects do not pass this path. |

Logical equality of the captured snapshots can remain internally consistent while
being wrong about the input domain: content ignored during classification cannot
contribute to a later replay/conflict comparison. The audit must trace and probe the
relevant consumers after the owner authorizes continuation.

## Historical acceptance retained

The following are provenance anchors, not assertions that the present probe was run
against every historical H:

- K1.1's cumulative accepted H is
  `52b1600f3b42e3a360fdc3395178f1d147edf304`; its accepted reference H is
  `644dfffc7904176ee3a4f9943310cf926408a113`; integrated at
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`, as recorded in
  [007](../../../007-work-packets.md).
- K1.2-correction-01 revision 10 was accepted at
  `b7191dbf630defeff7756122a6798e15d0b73dd3`, payload
  `e19d8e7f14bfe3fd661c22b3796a1eca365c3ec0`, and integrated at `ed509e11dc39`.
  Its [independent review](../../K1.2-correction-01/review-revision-10-independent-2026-09-30/review.md)
  and integration remain historical evidence for their stated scope.

This notice would qualify the current integrated classification claim. It would not
rewrite those verdicts, undo their integrations, or assert that all their criteria
failed. The existing [invalidation-02 V-D1 hold](../../K1.2/invalidation-02.md) remains
separate. This notice would not reinstate the superseded K1.2 integration hold from
invalidation-01.

## Proposed consequences, effective only if the owner adopts

1. Record an active hold on the affected re-prototyped-exotic refusal claim. Dependent
   descriptions and releases must not assert that it is implemented correctly until
   corrected or deliberately changed through an owner-approved semantic decision.
2. Keep O-R8-4 open with this reproducer. Preserve the original observation and this
   re-verification as separate provenance. No historical evidence is edited.
3. Resume DESIGN-AUDIT-01 under its existing read-only scope to finish the threat-model
   comparison, classification alternatives, downstream consequences and decision drafts.
4. Route the correction through an owner-selected corrective packet after the audit.
   K1.1-correction-03 currently excludes O-R8-4; adding it requires an explicit owner
   amendment, or the owner must name a separate packet. This draft names neither.
5. Keep K1.1-correction-03, K1.3 and every other successor unreleased. No product change,
   merge, acceptance or successor release follows from adopting a claim hold.

If adopted, the owner must explicitly authorize where the operative notice and claim
cross-references are recorded. The audit's DA-7 scope presently permits only this
packet directory and its own 007 row. This draft does not grant permission to edit
other ledger rows, the baseline, Layer 3, 006, 009 or 012. An owner recording step can
maintain the affected-claim cross-references separately from this audit's candidate.

## Alternatives and finishable closure

| Option | Benefit / cost | Follow-up closure |
|---|---|---|
| **Recommended: adopt the narrow claim hold and resume the read-only audit** | Makes the demonstrated gap explicit while retaining unrelated accepted work; requires an owner recording step and later corrective disposition. | Owner adoption identifies the exact held claim and operative record; audit carries O-R8-4 into the register and decision draft. Hold removal requires a separately authorized correction or semantic amendment and independent acceptance, with the original cases plus declared brand/prototype variants and whole-result consumer checks. |
| Keep the present recorded owner-triage disposition; explicitly authorize audit continuation without a new notice | Avoids another notice while the audit evaluates policy; leaves the classification discrepancy without a dedicated active claim hold. The owner would need to state why existing records satisfy 006 and prevent use of the unsupported claim. | Written owner disposition names the affected claim, reason no new notice is required, and the audit's continuation authority. This is not closure of the defect. |
| Adopt the narrow hold but keep the audit stopped for a classification decision first | Settles the applicable value domain before further audit work; delays the requested comparative evidence and risks selecting a policy before its costs are measured. | Owner states the accepted input domain and separately authorizes further audit or a corrective brief. The eventual implementation criterion must match that domain and include the reproduced cases. |

Changing the value domain to structural projection, keeping exotic refusal, or moving
intake to bytes are later semantic choices. This administrative notice cannot make any
of those choices implicitly. Bytes intake also cannot contain hostile code that still
shares the Kernel process; AGENTS.md's trust/isolation distinction remains binding.

## Owner response required

**Adopt the recommended narrow claim hold and authorize the read-only audit to resume,
or request changes to this draft.** Adoption must identify the operative notice/location
or authorize recording this artifact as that notice. Until then the draft is pending
and the audit stays stopped.
