# Activation-identity reconstruction and cumulative audit

Implementer: Codex (GPT-6), 2026-09-26. This is a self-review, not independent acceptance.
Governing B `a20d278185eaffc7f8b7489345a3624231ff6e6d`; release
`6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`; requirements are the correction contract
revision 1 carrying forward K1.2 revision 9. Final command results belong in implementation-01.

## The reconstructed subsystem

The invariant is producer/consumer closure: every ID the Kernel mints must remain a usable
Activation coordinate. The architecture owns the identity and exchange; a binding chooses its
representation. Review-14 exposed the 65,536-scalar caller-key maximum and the exchange-10 suffix
transition. Both were accepted creation inputs; neither authorized tightening creation later.

| Producer or consumer | Actual source behavior and consequence |
|---|---|
| `createExecution`, `acceptCreationContent`, `acceptIdentityText` | Scope and creation key are separately validated, including Unicode and scalar limits. The trusted host namespace is passed to `creationRequestIdKey`; only its string type is checked by `packIdentity`. No aggregate identity root exists. |
| `creationRequestIdKey` → Execution ID | Length-prefixed namespace/scope/key are injectively packed; `execution-` is prepended. Concatenation can exceed any individual part's bound. Namespace can itself be arbitrarily long or contain unmatched surrogates. Execution ID is unchanged by this correction. |
| `dispatch` | Extends the Execution ID with `/activation-` and the per-Execution exchange counter. A new decimal digit changes length without any new creation request. A fixed consumer length cap is not closed under this producer. |
| redelivery / takeover | Redelivery keeps the exact Activation and grant. Takeover copies the same ID and pinned input, advances epoch, replaces grant, and records one dispatch receipt. No ID parsing or value capture here. |
| `submitOutcome` scope and observation | Destination resolves before all other fields; identity observed once before eager content capture. The new classifier only tests primitive-string type, invokes no caller code and allocates no copy of a string. |
| replay | Exact string selects `acceptedOutcomes`; captured content selects replay vs conflict. All minted strings address their record even at a later exchange/terminal state. No grant is required for replay. |
| currency / authority / content | A different primitive string establishes staleness. An unusable identity does not. Epoch/base each remain independently checked, then grant, capacity, combined content diagnostics. No early identity refusal or content leak is reintroduced. |
| `captureAttempt` | The same helper classifies takeover and protocol-report IDs. Control power is checked first; malformed capture still precedes `#openExchange`. No decision-02 reordering of controls. |
| `captureRecovery` | Same identity helper, unchanged boundary-value capture of availability lists; same terminal/open checks and pinned-code comparison. |
| retained consumers | `#accept` stores exact IDs in replay, Emissions/results, acknowledgment, resolved exchanges, receipt identities and hold-ending History. Inspection copies/freezes records without revalidating identity; delivery settlement captures only its own operational row. |
| specification and factual maps | identity.md owns representation/closure; cycle owns order; BASELINE and corrective DEC-1/2/3 record the binding; rewrite-index marker and provenance point there. No changes to creation, transport, boundary-value limits, authority or grant lifetime. |

Names and conceptual aliases checked: Activation/attempt/exchange, creation key/request identity,
packed lookup key, namespace/scope, current/usable/malformed/stale, receipt/replay/conflict,
claim/currency/base/epoch, grant/control/visibility, recovery/hold/takeover/redelivery, diagnostics,
retained evidence/output/dispositions. Search results were followed into source, not treated as proof.

**Choice:** any primitive JavaScript string, with exact code-unit equality, is a structurally
well-formed Activation identity. No parser, normalization, truncation or value validator. Empty and
surrogate strings not minted by this Execution simply fail equality as stale. Boxed strings,
objects (including revoked proxies), missing and throwing fields stay unusable. The first proposal
to remove only the length cap was rejected during reconstruction because it would leave trusted
namespace surrogates unanswerable. No semantic code implementing that incomplete choice was kept.
No finite longest minted ID exists; the test deliberately uses maximal bounded caller parts and a
131,072-unit namespace. That is a large witness, not a claim of a universal maximum.

## Why the previous thirteen rounds missed it

This explanation is inferred from retained reports/reviews and tests, not a claim about reviewers'
private reasoning. Review-14 identifies the old check as present since the first K1.2 candidate.
The reused K1.1 helper was appropriate to caller-selected text but was assumed appropriate to a
Kernel-composed ID. E-6 matrices covered progress, Emission, result and error roots; they did not
walk the composition from creation into identity consumers. Later order repairs focused on grant
placement (R3/R9), partial numeric claims (R11), then malformed identity placement (decision-02,
R12/R13). The identity variants were missing/number/object/throwing, all with ordinary short
creation identities. Therefore a large matrix and 36 rejected mutations could still share one
unexamined assumption about the domain of strings. X24 surviving demonstrated that gap.

The prior closure links are [review-13](../K1.2/review-13.md#prior-findings),
[review-11](../K1.2/review-11.md#prior-findings), and
[review-09](../K1.2/review-09.md#prior-findings); owner decisions remain authoritative over the
historical implementation proposals. Historical ACCEPT is preserved unchanged.

## Correction closure, including adjacent paths

- **ID-01 / EVID-01 (reviewer):** one helper for all consumers; test both review schedules, wrong
  text at old limit/one past, high/low surrogate, empty, astral, boxed and unobservable/non-text
  classes. Match minted long/surrogate IDs across current/stale coordinates and all grants, with
  valid/invalid content. Replay after next dispatch and terminal, without authority, returns the
  same decision/receipt. Controls retain their own precedence.
- **SELF-ID-01 (implementer):** trusted namespace surrogates and unbounded namespace size are
  additional producer counterexamples found while reading integrated creation. Same remedy;
  no K1.1 change or amendment. Dedicated mint → controls → Outcome → replay schedules.
- **O1 / O2 (reviewer P3):** add decision-02 provenance and align the preamble/comment with eager
  capture's actual diagnostic guarantee; restore “after” in the replay-order sentence.
- **O3 (reviewer P3):** unknown field names on the envelope, next and each Emission are diagnostic
  fragments. Retain short printable ASCII names through 128 units; longer/non-ASCII/control names
  become a fixed marker. The value is not read, the proposal is refused whole, and no key/content
  is altered and accepted. Eight issues per holder remains the existing bound. Test each holder
  with 1,000,000 units, surrogates, controls, 128 and 129 units, entitled and unentitled. This bounds
  name rendering, not the whole reason: legitimate IDs and other bounded content can be larger.

Every losing test compares the whole ExecutionView except the one appended immutable refusal,
checks returned = retained evidence, and (for live Outcome matrices) demonstrates a later valid
answer. No progress/revision, acknowledgment, B-5 disposition, Emission/result, receipt, epoch,
reservation, hold, recovery history or delivery may change on that refusal. Positive long-ID
schedules check code-hold entry/clear, redelivery grant preservation, protocol hold, takeover
clear/epoch+1/new grant, stale old attempt, Outcome clear/base+1/ack/output/history, new exchange,
replay and conflict. Existing reentrant capture, synchronous Driver and safety-callback tests cover
operation ordering; type-only identity classification introduces no new callback window.

## Whole cumulative packet re-audit against B

This pass covers all C1–C15, including unchanged paths reached by the corrected assumption. It
reads the cumulative production changes, canonical changes and contract, follows selected relevant
existing assertion bodies, and reruns every existing test and mutation. It is not a claim that all
642 pre-existing test bodies were independently read line by line.

| Criterion | Source trace and distinguishing existing evidence rechecked |
|---|---|
| C1 | `#visible` before `observeField`/capture on four surfaces; hidden/missing same null refusal with position 0. Nondisclosure and read-count tests, plus four new hidden-scope cases. |
| C2 | replay Map lookup before terminal/current/grant; `capture.outcome.identity` determines exact content; conflict adds only refusal. Existing acceptance/partial-claim/terminal assertions and new long/surrogate replay. |
| C3 | captureOutcome collects independent epoch/base; terminal, wrong usable ID, epoch, base, grant, capacity, combined issues; no automatic retry. Existing partial-claim and all-root E-6 matrix; old 36 mutations plus seven new ones. |
| C4 | `#accept` prebuilds receipt, output, acknowledgment/terminal lists, resolved exchange, history and replay wrapper; then commits only Kernel data. Batch membership ignores opaque progress. Transaction, capture pollution, synchronous delivery and capacity-interaction tests. |
| C5 | state derives solely from accepted next; dispatch pins accepted progress and a new ID/epoch; terminal fences fresh submissions and controls. Terminal and next-exchange tests. |
| C6 | inBatch branch precedes terminal branch; queued non-batch entries become terminal only for complete/fail. Ingress replay precedes terminal refusal. Both terminal variants and early/late non-batch Events checked. |
| C7 | Effects read only length, await does not read wait, complete's unknown obligations refuse; nothing creates an Effect record. Existing refusal/corrected-answer tests and unread-wait witness. |
| C8 | compare current attempt, code hold, Driver safety then revalidate terminal/exchange/epoch/hold; same ID, new grant, one receipt; `#deliver` sees committed attempt. Existing safe/unsafe and reentrancy suites, old-grant and redelivery-lifetime oracles. |
| C9 | availability roots captured once; compare all pins; holds/history remain distinct from lifecycle. Clearing code hold makes redelivery possible; accepted Outcome may end either hold. Recovery/hold-permitted/history suites and new long-ID schedule. |
| C10 | scope/control before report capture, current epoch before hold; bounded diagnostic, repeated report inert; Outcome records attempt_submission, takeover records control. Submission-authority/history and new matrices. |
| C11 | settlement closes over one retained delivery row; late report cannot touch current exchange; replay indexes old exchange. Late-reports and delivery-attribution assertion bodies, including pending reports after resolution/terminal/takeover. |
| C12 | #refusal appends frozen identical object; per-Execution counters; prebuilt receipt retained on replay; viewOf freezes copies while retaining immutable payloads. Evidence/nondisclosure/transaction suites and whole-view comparisons. |
| C13 | own-field readers observe once; primitives + captured methods/own-array helpers after observation; no live string methods introduced. Hostile tests, read-count tests and revoked-proxy case; retained original suites unchanged. |
| C14 | 13 source files remain; no exports/dependencies added, envelope helper is internal; architecture inventory/guard unchanged in correction. Cumulative original inventory additions inspected and conformance rerun. |
| C15 | Layer-3 identity/cycle updates, implementation marker/baseline and rewrite-index agree; reference map already routes Activation ID correctly. Creation, values, state/recovery, lifecycle, output, authority, evidence and integration dependencies checked; no Layer-1/2 change. |

No required semantic obligation is knowingly unresolved. Optional carried P3 notes about old 007
introductory narrative and historical OPEN-5 prose are left untouched: they neither control release
(the status row does) nor supersede decision-02. No new third-party code/dependency, native Driver,
persistent profile, paid/live run, benchmark gate or supported public package claim is introduced.
