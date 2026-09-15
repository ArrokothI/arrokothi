# KC1-ARCH-1 — Kernel-owned delivery reporting

**Date:** 2026-09-15. **Role:** owner-delegated architecture decision, not independent acceptance.
**Authority:** the owner explicitly authorized this session to decide and unblock K1.1,
with implementation to be performed by another coding agent.
**Inspected head:** `d43f2a97daca2f911e92e975222e66b58c31c142`.
**Original review base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (unchanged).
**Decision:** adopted target; correction contract revision 2; implementation outstanding.

## Decision and ownership

Adopt the callback/capability boundary recommended in [review-02](review-02.md) §6:
Kernel-owned delivery reporting, with no Driver-returned Promise observation. The exact
normative rule is owned by
[execution-cycle: delivery reporting boundary](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary).
For TypeScript, the selected method is
`deliver(activation: Activation, settlement: DeliverySettlement): undefined`.
The stronger `undefined` return annotation prevents the ordinary `void` assignability
loophole that would otherwise admit an async method. Runtime correctness does not depend
on trusting that annotation: Kernel code never observes the returned value.

This belongs to the Kernel/Driver operational boundary. The Kernel owns attempt identity,
report authority and retained delivery evidence; the Driver owns asynchronous computation
and internal Promise rejection handling. This introduces no Runtime algorithm, Outcome
variant, portable provider type, scheduler, persistence layer or isolation claim.

## Why this resolves the block

[Blocker-01](blocker-01.md) and [review-02](review-02.md) identify a contradictory requirement:
an unrestricted Promise-return API plus a guarantee to observe every rejection safely after
return. The existing source and dispatch tests confirm that this is the governing H1 API,
and that H1 permits an unhandled escape in its supposedly passing oracle.

An exact-native-Promise restriction or observability precondition would still make safe
subscription to a mutable Driver-owned object part of Kernel correctness. Selecting a
Kernel-created reporting capability removes that dependency while retaining delivery
failure evidence. Void-only delivery without reporting loses that evidence. A counted
unhandled exception accepts the defect as success; it is rejected.

This decision changes the boundary and guarantee explicitly. It does not prove H1 correct,
make an already-unhandled Promise safe, or promise that arbitrary trusted same-process code
cannot crash its host. A conforming Driver reports failures and handles its own promises.
The Kernel does not manufacture or observe promises on the reporting path. There is no
Promise-return compatibility shim and no process-level unhandled-rejection suppression.

The configurable-subclass fix from blocker-01 is no longer a required Kernel implementation
strategy because the Promise-return API is removed. Preserve it as historical diagnosis.
Replace its active regression with boundary-removal and Driver-ownership coverage, rather
than leaving a green assertion that an unhandled rejection is expected.

## Acceptance mapping

K1.1's original revision-5 contract and all historical review verdicts remain unchanged.
Revision 2 explicitly replaces correction item 4 and KC1-DEC-5. C4/C5 keep their intent,
reservation, asynchronous dispatch and exact redelivery invariants; the following cases
are mandatory evidence for their revised delivery binding:

| Case | Required distinguishing observation | Owner |
|---|---|---|
| Report during invocation | Intent and pending attempt already exist; delivered/failed report changes only that attempt | K1.1-correction-01, C4 |
| Delayed or absent report | Attempt stays pending after normal return; another Execution dispatches; later report settles the original attempt | K1.1-correction-01, C4 |
| Synchronous throw | Pending becomes failed with total bounded diagnostic; no accepted-state/receipt change | K1.1-correction-01, C4/C5 |
| Duplicate/conflicting reports | delivered→failed, failed→delivered and duplicates are inert after the first report; report→throw and throw→late-report obey the same rule | K1.1-correction-01, C4/C5 |
| Capability integrity | Frozen capability, detached methods and cross-Execution tests cannot redirect writes or expose mutable records | K1.1-correction-01, C4/C9 |
| Hostile failure reason | Accessors, coercions, revoked Proxies and thenables are never invoked; fallback is stable, bounded and nonthrowing; later mutation cannot alter inspection | K1.1-correction-01, C4/C9 |
| Redelivery overlap | New report capability, identical Activation; out-of-order reports settle only their respective attempts, including old failure after newer delivery success | K1.1-correction-01, C5 |
| Promise independence | Initial dispatch and redelivery with hostile ambient constructor/species slots still report correctly; descriptors are unchanged by Kernel reporting; no return-object property is read | K1.1-correction-01, C4/C5 |
| Return misuse | A cast fake returning an inert hostile thenable/object triggers no getter/subscription or implicit success; an absent explicit report remains pending | K1.1-correction-01, C4/C5 |
| Driver-internal asynchronous failure | A conforming fake handles its own ordinary internal rejection and calls failed; strict child process exits 0, zero unhandled events, on dispatch and redelivery | K1.1-correction-01, C4/C5 |
| Type boundary | Async/Promise-returning Driver fails a type assertion; a synchronous undefined-returning Driver compiles | K1.1-correction-01, C4/C10 |
| Later lifecycle/retention | Late report cannot revive resolved/cancelled/fenced work; retired record cannot be recreated | K1.2/K1.3 and K5, at their existing gates |

Do not generate a known-unhandled Promise in the return-misuse test and call its crash a
passing Kernel safety result. An inert hostile object proves no observation without adding
an unrelated unhandled promise. The Driver-internal rejection test separately proves correct
conforming failure handling. Keep process fixtures deterministic and independent of models.

C1/C2/C3/C6–C10 and the seven previously closed findings retain cumulative review coverage.
No Outcome, cancellation, takeover, wait, persistence or retirement implementation is
required here. Those remain explicitly refused/deferred under existing packet ownership.

Replace obsolete Promise-sanitation ablations with mutations that (1) interpret normal
return as delivered, (2) permit a second report to overwrite the first, (3) target the latest
attempt instead of the capability's bound attempt, and (4) observe a returned thenable.
Each must be rejected by its mapped oracle. Preserve unrelated identity/value/diagnostic
ablations and their evidence obligations. Reconcile the full case inventory after migration.

## Authorized payload and migration handoff

Only these four mental-model paths are authorized to differ from B for this decision:

- `mental-model/mechanisms/execution-cycle.md`: canonical delivery rule.
- `mental-model/mechanisms/integration.md`: link the Driver authoring obligation.
- `mental-model/roadmap.md`: assign correction and later lifecycle acceptance cases.
- `mental-model/sources.md`: record decision provenance.

All other mental-model paths must be byte-identical to B in C2. The decision-session
cumulative check found one pre-existing exception: `mental-model/deployment.md`, introduced
by `66be0ca` (`doc-up`) and present at inspected head `d43f2a9`. It is outside this
correction's authorized maintenance. Restore that page to B in the next payload, preserving
its commit/history; do not extend the allowlist or claim the current tree already passes
the C2 scope guard. This is an authorized concrete cleanup, not another architecture blocker.
This session leaves that pre-existing page untouched for the implementation handoff.
Enumerate and inspect the exact
hunks in these four paths; a path allowance is not permission to revive unrelated historical
drift. The B-anchored scope guard must enforce this explicit allowlist and retain the
restoration check for the remaining tree. This replaces revision 1's zero-reference-payload
assertion prospectively; H1's scope/evidence is not rewritten.

The next implementer updates `packages/kernel/src/driver.ts`, coordinator delivery and all
fake Drivers/tests/consumer declarations, exported-type and structural inventories as needed.
Remove observation/sanitation helpers made dead by this change; preserve shared helpers
needed by value acceptance and total diagnostics. Update live source comments, baseline,
case inventory and any delivery examples. Do not retain a hidden Promise-return fallback.
Any structural guard changes must preserve relational inventory checks and be declared.

Current source still declares `void | Promise<void>`, uses Promise sanitation/observation,
and marks normal return as delivered. No executable behavior was changed in this decision
session. The new contract is therefore a target with a known implementation gap.

Use a fresh C2 containing this decision's documentation and the implementation, then fresh
validation-02 and H2/report under 006/008/012/015. Run the contract's full command plan,
strict rejection probes, type assertions, link/anchor and revised scope checks, and
sensitive ablations. Bind review to original B → H2 and contract revision 2; historical
validation-01 is not evidence for the new boundary. No third-party material or dependency
is introduced by this decision; keep the approved exact canonicalize dependency unchanged.

## Status and dependency revalidation

The same correction branch and original B remain the review anchors. K1.0 prerequisites,
including corrections 01–02, retain the integrated disposition recorded in 007 and the
existing correction contract; this API decision creates no new prerequisite. K1.2 remains
held and `next_release: none`.

The architecture blocker is resolved and the correction returns to **CHANGES_REQUESTED**,
as required by 006 for an unblocked corrective packet. `K11-R16-DISP-01` remains open pending
implementation and independent review against revision 2. C4/C5 are not marked PASS.
The seven findings closed in review-01 remain historical closure evidence, subject to
cumulative revalidation. The contradictory current-status claim identified as
`KC1-R2-PROC-01` is repaired in 007; the next reviewer verifies that repair.

Preserve blocker-01, review-01/review-02, H1 and all prior K1.1 records byte-for-byte. This
ruling supplies the missing architecture authority; it grants no acceptance, integration,
release or permission to begin a successor packet.

## Decision-session verification

- `npm run check:builder-docs`: PASS, 57 Markdown files, 795 local links/anchors,
  38 public package imports.
- Additional changed-document link/anchor check: PASS (514 links before this final
  record-only verification section).
- `git diff --check`: PASS.
- Session delta: documentation only; no package, test or script edits; historical
  blocker/reviews/implementation/evidence unchanged.
- Cumulative B-based scope check: identified the pre-existing deployment-page deviation
  above; C2 must restore it. The four newly changed mental-model paths match the decision
  allowlist exactly. No claim of a passing C2 scope gate is made.
- No runtime/typecheck/conformance suite rerun: no implementation was performed. Their
  fresh execution remains mandatory on C2 under the acceptance mapping and command plan.

## Superseding note — documentation payload allowlist withdrawn (2026-09-15, round 5)

**Everything above is the record as decided, and is not edited.** This note is appended under
006's rule that corrections to a sealed decision are new, explicitly superseding records rather
than rewrites. It changes exactly one provision.

**Superseded:** the "Authorized payload and migration handoff" section's four-path mental-model
allowlist, its requirement that "All other mental-model paths must be byte-identical to B in C2",
and its instruction to restore `mental-model/deployment.md` to B in the next payload.

**Replaced by:** [contract](contract.md) revision 3, `KC1-DEC-7`. After H3 the owner completed and
froze a Layer-1/2 documentation rewrite at `0ee13f8138af52107d86967043bcc460faba8893` and
instructed that the resulting tree is authoritative. That commit is the documentation anchor **D**.
The scope guard is re-anchored from B to D and tightened from a four-path allowlist to whole-tree
byte identity: `git diff --name-only D HEAD -- mental-model/` must be empty. `deployment.md` is not
restored to B; it is held byte-identical to D like every other page.

**Unchanged by this note:** `KC1-ARCH-1` itself — the delivery reporting boundary, the
`deliver(activation, settlement): undefined` signature, every acceptance-mapping row, the rejected
alternatives, the mutation requirements and the ownership analysis all stand exactly as decided.
The canonical rule remains owned by
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary).
This note authorizes no architecture change, no acceptance, no integration and no successor
release, and it does not revise any historical review verdict.

**Why the earlier provision was right when written and wrong to keep.** It was written against
*unreviewed historical drift* that had leaked onto the branch and made a validated tree stop
matching its candidate. Reverting that was correct. The tree at D is a different thing: deliberate,
completed owner work whose Layer-3 pages are word-for-word identical to B outside the four paths
this decision already authorized. Holding it to an anchor written for the other situation is what
produced the contradiction [review-05](review-05.md) records as `KC1-R4-PROC-01`.
