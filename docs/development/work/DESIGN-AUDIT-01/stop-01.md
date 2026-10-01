# Owner question 01 — O-R8-4 survives on current main

2026-10-01, Codex implementer. This is an audit stop record, not an invalidation,
independent verdict, adopted decision, or completed implementation report.

## Evidence

The advertised GitHub `refs/heads/main` was observed at
`66bc041175e6fc191c2e7cf88de198111e7d97c9`, identical to the owner-released audit base.
The original [review-08 probe](../K1.2-correction-01/review-08/p-reprototyped-exotics.ts)
was rerun with only its import relocated. The [wrapper](probes/reverify-exotics.py)
checks the original probe and all Kernel source files against the pinned base and
prints SHA-256 identities and environment. The [output](probes/reverify-exotics.txt)
records successful execution on Node v26.8.1 with existing canonicalize@3.0.0.
The existing dependency was linked into ignored `node_modules`; no dependency,
product source, test or historical probe was changed.

Observed cases relevant to O-R8-4:

| Review-08 case | Current-main result |
|---|---|
| Map with null prototype and an entry | `ACCEPT {}` |
| Date with null prototype | `ACCEPT {}` |
| Set with Object.prototype | `ACCEPT {}` |
| Uint8Array with null prototype | `ACCEPT {"0":7,"1":8,"2":9}` |
| ArrayBuffer with null prototype | `ACCEPT {}` |
| Boolean wrapper with null prototype | `ACCEPT {}` |
| WeakMap with null prototype | `ACCEPT {}` |

The same probe refuses its RegExp, Error and String-wrapper cases for
`unrepresentable_member`; the output retains these controls rather than presenting
all re-prototyped objects as accepted.

## Claim and current disposition

The reference index routes this obligation to
[values / in-process value capture](../../../../mental-model/concepts/values.md#in-process-value-capture).
That owner says forms such as Maps, Dates and typed arrays are refused rather than
silently dropped. The observed Map/Date/Set behavior discards internal content;
the typed-array case changes its representation to an ordinary indexed object.

This is a re-verification of O-R8-4, not a newly discovered defect attributed to this
session. [Review 08](../K1.2-correction-01/review-08.md) called it an owner-triage item
under 006's invalidation path. [007](../../007-work-packets.md) excludes it from
K1.1-correction-03 and says it awaits owner triage. Existing invalidation-02 holds
V-D1 refusal cost, not this classification claim. The audit release does not specify
whether a classification invalidation notice is now required.

## Smallest owner decision

The audit [brief's stop conditions](brief-01.md#stop-conditions) require stopping and
asking if evidence suggests an accepted claim is false in a way that needs an
invalidation notice. [006](../../006-development-process.md#review-rules-and-failure-handling)
requires retaining historical acceptance and recording any invalidation separately.
No accepted status, integrated claim, or governing rule has been changed here.

Question sent to the owner:

> Should I prepare a scoped invalidation/claim-hold draft for your approval before
> resuming, or do you explicitly authorize continuing this read-only audit with
> O-R8-4 pending your decision and no claim/status changes outside the audit row?

The first option permits drafting a reviewable notice here; it does not authorize
self-acceptance, semantic implementation, or changes outside the packet. The second
would permit the audit to finish its evidence-backed alternatives without treating
this claim as resolved. Threat-model selection and the accepted value domain remain
owner decisions under either option.

## Work state

The first commit records the verbatim owner release in 007. The pre-probe
[design note](design-01.md) records DA-1 enumeration, planned probes, closing methods
and bounds. Execution stopped at this early claim check. DA-1 enumeration, the full
register and decisions, remaining probes, complete report and C/H handoff have **not**
been completed. No independent review readiness is claimed. No successor is released.

## Owner reply and resulting draft

The owner answered **“Prepare an invalidation draft first”** through the question
response in this chat. The implementer prepared
[draft invalidation 01](decision-drafts/invalidation-01.md). That is draft-only
authority, not adoption or permission to resume. The audit remains stopped pending
review of the concrete draft. The added source trace scopes consumers; it does not
claim end-to-end probes beyond the retained review-08 reproduction.
