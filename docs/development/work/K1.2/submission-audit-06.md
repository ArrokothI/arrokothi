# K1.2 round-6 attempt-submission reconstruction

Codex (GPT-6), 2026-09-25. Inspected starting tree:
`0a063aa418b449a7d0c07f16f0c82cb9a9c9bc8b`, containing review-06 over the owner's
`cbf3bdf5c814fe544d61038ec3b273426dddff00`. This is an implementer inspection record,
not independent acceptance or a canonical semantic owner. [Blocker-01](blocker-01.md) records the
unresolved ownership question. Runtime implementation has not been changed by this correction.
Final clean-payload commands and immutable evidence belong in implementation-06 when a candidate
can be completed; working-tree iteration results do not satisfy that gate.

## Reconstruction and dependent behavior

| Boundary inspected | Implementation trace and distinguishing observation |
|---|---|
| Minting and publication | `coordinator.ts`'s `mintSubmission` freezes a new coordinate object. `dispatch` stores it in the new exchange before publishing RUNNING and calling the Driver. The synchronous Outcome-during-delivery test exercises that publication order. Coordinate equality is not authority. |
| Driver hand-over | `ExecutionDriver.deliver` receives Activation, per-delivery `DeliverySettlement`, and the exchange's `SubmissionGrant`. `#deliver` allocates a new settlement closing over one delivery row and passes the stored grant separately from Activation; it does not mint a grant. Explicit first settlement wins; return values and Promises are not observed. KC1's exact canonical signature conflicts with this implemented binding; see the blocker, not a prose selection of architecture here. |
| Ordinary redelivery | `redeliver` requires visibility, an unresolved nonterminal exchange and no recovery hold; it captures the attempt/receipt before reentrant Driver code, then calls `#deliver` without replacing Activation, epoch or grant. New tests save the grant before either resend and submit with that same saved reference. This rejects a rotation that leaves all coordinates unchanged. |
| Takeover | `requestTakeover` checks visibility, explicit control authority, matching exchange/epoch, code hold and exact-true Driver safety guarantee. It revalidates after that reentrant callback before advancing the epoch, replacing Activation and minting a new grant. The replacement grant is installed before delivery. New tests save the replacement grant at its first delivery and use it after its resends; existing reentrancy suites cover nested takeover, Outcome resolution and newly established holds. |
| Fresh Outcome | `submitOutcome` scopes before content observation, captures once, looks up retained acceptance/conflict, checks terminal/currency, compares the grant by strict reference identity, then validates captured content and commits. Existing authority tests independently forge look-alikes, omit authority, mix old/current coordinates and grants, and assert refused-state preservation. B8 removes the authority check. |
| Inspection and nondisclosure | `viewOf` builds whitelisted snapshots and has no grant field; Activation has no grant field either. Existing hidden/missing and cross-scope control experiments inspect whole observable transcripts. New tests check that neither original nor replacement grant references appear in snapshots/Activation. New authority tests do not claim timing independence, durability or remote-token security. |
| Holds and History | Recovery declarations/protocol reports/takeover use `#requireControl`; grants confer no authority to those commands. An accepted current-attempt Outcome can end both holds without `controlScopes`. `#accept` prebuilds hold-ending records with `attempt_submission`; explicit control decisions use `control`. New first-attempt schedule ends both holds with the pre-redelivery grant and checks History and contiguous receipts. |
| Acceptance atomicity | `#accept` builds result, retained acceptance, output/dispositions, hold-ending History and wrapper before the mutation phase. Existing transaction and hostile-observation tests probe inherited array/descriptor traps, replaced builtins and reentry. The new schedules assert progress, batch acknowledgment, terminal state, receipt positions and no accepted-state mutation on refusal; they supplement those broader tests. |
| Late paths | Retained replay/conflict precedes fresh authority, including after terminal acceptance. The new replay arms intentionally pass missing or retired authority and require the same receipt and unchanged state. Settlement closures remain bound to original rows after takeover/resolution; late callbacks in both new schedules change only that row. Existing late-report suites cover the next exchange as well. |
| Canonical dependencies | Inspected execution-cycle's delivery-reporting and acceptance sections; identity's Runtime attempt/writer epoch; authority/evidence's separate powers; recovery/state's holds and History; Driver/Kernel native-exclusion boundary; BASELINE, rewrite-index and packet mapping. The two-argument canonical binding remains an open correction, pending the owner decision in blocker-01. No Layer-3 build or acceptance status is added. |

## Helper and oracle audit

Inventory: searched all repository tests (no grant-dependent matches outside kernel tests), then all kernel tests for `submitOutcome`, `submissionFor`, `SubmissionGrant`,
`submissions`, direct grant captures, `redeliver` and `requestTakeover`; followed helper definitions
and enclosing schedules. The table covers every grant-dependent test file, including the control
suite's deliberately missing grant. Call counts are not proof of semantic coverage.

`recordingDriver`, `delayedDriver`, unsafe/throwing/reentrant fakes record the exact third argument.
`submissionFor` scans those observations backwards by Activation ID. That is useful setup, but does
not validate current authority or lifetime: it returns a rotated grant after a broken resend and
can return a retired grant after resolution. Its comment now states that limitation. Its executable
logic, own-index access and all existing assertions are retained. No new lifetime assertion depends
on it. `outcomeFor` constructs explicit coordinates; it never derives authority. `accepted`/`refused`
assert the returned result arm instead of predicting the Kernel's decision.

| Test file (`packages/kernel/tests/`) | Grant use and oracle assessment |
|---|---|
| `control-authority.test.ts` | Deliberately supplies no grant to show that visibility is insufficient; control and Driver-safety cases assert refusal/whole-state preservation independently. No lifetime claim. |
| `submission-authority.test.ts` | Negative authority cases construct missing/forged references independently. Takeover cases save grant1 before takeover, compare grant2 afterwards and submit all relevant old/current combinations. This is meaningful retirement evidence; it never tested redelivery preservation. |
| `takeover.test.ts` | Latest grant supplies fresh proposals after takeover/retries; independent assertions test epochs, pinned input, receipts and reentrant return attribution. Retry-only acceptance could mask grant rotation. Retain it for epoch behavior; the new lifetime suite supplies the missing authority oracle. |
| `recovery.test.ts` | Latest grant supplies proposal after hold release and redelivery, and in hold-ending cases. Existing assertions distinguish hold/state/currency behavior but not preservation of an earlier grant. New lifetime case supplements this without weakening recovery assertions. |
| `delivery-attribution.test.ts` | Latest grant resolves exchanges after resend/takeover so retained delivery metadata can be inspected. Metadata assertions remain useful; do not count their acceptance as lifetime evidence. |
| `takeover-reentrancy.test.ts` | Direct Driver capture supplies current proposal inside the safety callback; replay uses that captured observation. Checks the outer takeover revalidation and absence of extra commit/delivery. No ordinary-redelivery lifetime oracle. |
| `outcome-acceptance.test.ts` | Latest grant is setup for scoping, replay/conflict, currency, atomic batch/progress/output, next exchange, refusals and receipt tests. Direct capture inside Driver delivery establishes synchronous acceptance after publication. No successful ordinary resend precedes a grant-preservation assertion. |
| `transaction.test.ts` | Captures grants before hostile observation or reentry and asserts atomic accepted state, no receipt gaps and hold-ending History. Replay-after-next-exchange/redelivery does not prove the first grant could authorize a fresh Outcome after its own resend. |
| `outcome-hostile.test.ts` | Hoists grant lookup before installing hostile envelopes/prototypes. Reentrant takeover changes currency while the outer proposal retains its original grant. This independently tests capture/order, not resend preservation. |
| `outcome-limits.test.ts` | Current grant is setup for at-limit/one-past roots and independent per-root bounds; no resend. |
| `outcome-evidence.test.ts` | Current grant sets up retained answers/progress/output; mutation-and-reinspection and replay assert capture/freeze behavior. Any resend exercises delivery evidence rather than earlier authority. |
| `history-attribution.test.ts` | Current grants enable non-control Runtime Outcomes; independently asserts `attempt_submission` versus `control`, replay non-append and no History on unauthorized submission. No resend. |
| `hold-permitted.test.ts` | Latest grants answer held attempts. Redelivery calls while held are refused; one case resends after declaration clears but does not submit with a pre-resend grant. These are permitted-action/hold-resolution oracles, not authority-lifetime evidence. |
| `recovery-history.test.ts` | Current grants establish progress, resolve holds and finish later exchanges; independent historical rows and immutable snapshots are the oracle. No resend lifetime claim. |
| `recovery-evidence.test.ts` | Grants drive hidden-scope activity and resolve exchanges for snapshot mutation probes. Paired control/hidden transcripts and frozen/fresh-copy assertions are independent of latest-grant selection; they do not prove lifetime. |
| `nondisclosure.test.ts` | Latest grants supply visible/hidden acceptance and takeover/terminal activity. Comparing full observable transcripts remains meaningful for disclosure; accepting latest grants cannot establish preservation across resend. |
| `late-reports.test.ts` | Current grants resolve/terminate exchanges before saved reporting callbacks are exercised. Assertions isolate original delivery records and leave accepted state/new exchange unchanged. Reports are a different capability lifetime. |
| `terminal.test.ts` | Grants establish terminal results and replay evidence. Terminal redelivery is refused, not a new send; no preservation claim follows. |
| `submission-lifetime.test.ts` (new) | Custom Driver records raw arguments. Saves epoch-1 grant before two resends; separately saves takeover grant before its two resends. Uses the saved references for fresh acceptance before asserting all recorded identities. Missing/retired-grant replay, hold History, old-grant fencing, separate settlement identities and late reports check dependent behavior. |

The earlier pass missed preservation because it read the correct `redeliver` implementation and
accepted retry-only tests whose proposal setup fetched the latest observed grant. That common
assumption did not discriminate unchanged authority from equal-coordinate rotation. B10 now rotates
on every resend; B11 rotates only when epoch > 1. Both leave Activation, epoch and receipt unchanged,
so only a reference saved before the transition can expose the defect. The first new test must reject
B10; the second must reject both B10 and B11. A passing control plus those expected failures is the
required distinguishing observation; green tests alone are insufficient.

## Additional correction provenance and remaining work

**K12-R6-SELF-COMMENT-01:** helper reconstruction found the harness introduction still described its
barrier as a held Promise. `delayedDriver` actually retains an explicit reporting capability under
KC1-ARCH-1. Corrected that comment only; no fake behavior, runtime behavior or historical report was
changed. This is separate from EVID-01's helper-lifetime clarification.

All prior A1–A16/B1–B9 ablations remain intact; B10/B11 are appended. Contract revision 6 adds their
evidence map without redefining DEC-20. R5's rewrite-draft removal remains in the starting tree;
this audit does not claim it has been packaged into a new report-bearing candidate. The report-bearing C6/H6 will retain BLOCKED_ARCHITECTURE if no owner decision arrives. Its report
must record the actual clean-C validation, cumulative self-review and external remote verification
without treating successful evidence packaging as resolution of the canonical blocker.
