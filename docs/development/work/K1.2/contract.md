# K1.2 contract — Outcome acceptance and receipts

**Packet:** K1.2. **Parent milestone:** K1 ([001 K1](../../001-current-status-and-roadmap.md#k1--one-asynchronous-execution-with-opaque-progress)).
**Packet seed:** [007 K1.2](../../007-work-packets.md#k12--outcome-acceptance-and-receipts), including the
PLAN-01 amendment and the owner's 2026-09-24 B-5 scope amendment.
**Layer-3 maintenance:** [roadmap mapping K1.2](../../../../mental-model/roadmap.md#k12).
**Governing process baseline and base commit:** `a20d278185eaffc7f8b7489345a3624231ff6e6d`
(integrated `main`, including 006/007/008/012 as they stand there).
**Dependency:** K1.1 with correction-01 and reference-01, accepted at H
`52b1600f3b42e3a360fdc3395178f1d147edf304` and integrated in `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`;
K1.1-correction-02 accepted at H `719abbf9e55e7489b6255a08cbb9e97a1e960a5e` and integrated in
`954d31b00eb7f2412c22ccf7d4d079699f0c4032`. All are ancestors of the base.
**Branch:** `claude/k1.2-outcome-acceptance-receipts`. **Contract revision 7.**
**Implementer:** Claude Code session (Claude Opus 5.5), 2026-09-24; round-3 correction by Muse Spark, 2026-09-24/25; round-4 correction by Muse Spark, 2026-09-25; round-5 wording correction and round-6 evidence correction/architecture blocker by Codex (GPT-6), 2026-09-25; round-7 canonical correction under the 2026-09-25 owner carrier decision by Muse Spark, 2026-09-25.

## Entry and owner release

The owner released K1.2 on 2026-09-16, held its start on 2026-09-23, and lifted the hold on
2026-09-24 after the three independent reviews, the `creation.md` rewrite and the owner's final check
(007 status row; owner instruction of 2026-09-24 delivered through Prompt A). The same day's owner
amendment adds B-5 terminal disposition for `complete`/`fail` to this packet. No correction to an
earlier packet is open, so nothing takes priority over this work.

This is K1 implementation. Nothing here closes an E1 criterion or the K1 milestone; K1.4 owns both.

## Scope, and what stays with siblings

In scope, as 007 states it: whole-envelope validation; receipt replay and conflict; epoch and
revision checks; whole-batch acknowledgment; progress recording; `continue`/`complete`/`fail`;
authorized takeover; the recovery hold for unavailable pinned progress code; Emission identities and
the typed terminal result at acceptance; Effect refusal; refusal of `complete` proposing any
obligation and of `await` until K1.3; the late-report cases the delivery reporting boundary assigns
to K1.2; the next exchange after `continue`; B-5 terminal disposition for `complete`/`fail`; live
exercise of the K1.1 terminal-ingress rule. The K0.2 fixture assigns seven more obligations here
(R3-e1, R3-e2, R3-f1, R3-h1, R3-h2, R3-i2, R5-j6-2), and K1.1's contract assigns the E-6
at-limit/one-past matrix at the Outcome boundary; both are mapped below.

Out of scope and assigned elsewhere: wait registration, matching, wait-ended readiness, deadlines,
cancellation and their terminal dispositions (K1.3); the legacy bridge, SDK host entry and E1 gate
(K1.4); Effect intents, admission, settlement and completion accounting over real obligations (K2);
output reads, replay, cursors and retention windows (K4.4, K5.1); persistence and process-fault
recovery (K3); real Drivers and their phase contracts (R1).

## Governing sources

| Obligation area | Canonical owner |
|---|---|
| Outcome acceptance order, retry versus takeover, delivery reporting, atomic decisions | [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) |
| Outcome, Activation, Event, mailbox, batch, acknowledgment, terminal disposition | [core](../../../../mental-model/concepts/core.md) |
| Activation ID, Runtime attempt, writer epoch, revision, receipt | [identity](../../../../mental-model/concepts/identity.md) |
| Transitions, completion accounting, terminal states never reopen | [lifecycle](../../../../mental-model/mechanisms/lifecycle.md) |
| Emission, terminal result, output obligation, Effect | [actions (concept)](../../../../mental-model/concepts/actions.md#emission-result-and-output-obligation), [output](../../../../mental-model/mechanisms/output.md#acceptance-makes-output-observable) |
| Progress, pinned codec, recovery-held | [state (concept)](../../../../mental-model/concepts/state.md#progress), [recovery](../../../../mental-model/mechanisms/recovery.md#compatibility-and-migration) |
| Recovery permission before replacement, Driver safe-replacement, Kernel fencing vs native exclusion | [recovery](../../../../mental-model/mechanisms/recovery.md#decide-permission-before-replacing-work), [identity](../../../../mental-model/concepts/identity.md#writer-epoch), [driver](../../../../mental-model/driver.md), [kernel](../../../../mental-model/kernel.md) |
| Inspection, permitted next actions, authenticated recorded commands, control vs inspection privilege, retention | [evidence](../../../../mental-model/mechanisms/evidence.md) |
| Separate powers (inspect vs control) | [authority](../../../../mental-model/mechanisms/authority.md) |
| Execution History including recovery decisions | [state (concept)](../../../../mental-model/concepts/state.md#execution-history) |
| Dispatch and delivery attribution (what was delivered and to whom) | [identity](../../../../mental-model/concepts/identity.md#dispatch-and-delivery), [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary) |
| Boundary values, per-root limits, one observation | [values](../../../../mental-model/concepts/values.md) |
| Terminal ingress | [creation](../../../../mental-model/mechanisms/creation.md#when-the-destination-cannot-take-the-input) |

Accepted K0.1 decisions those owners restate and this packet implements: OA-1–OA-6, EF-1/EF-2,
ID-3/ID-4/ID-6/ID-7/ID-9, B-3/B-5, CX-3, PC-4/PC-5 and E-6. The worksheet is sealed evidence; the
Layer-3 owners are the authority. [Rewrite index](../../../../mental-model/rewrite-index.md) §4 items
touched: writer-epoch representation, receipt representation, the Outcome-acceptance transaction
mechanism and per-entry disposition storage. §5 inferences guarded against: 1, 2, 3, 4, 5, 6, 7, 13,
26 and 28.

## Selected proof methods ([012](../../012-review-methods.md))

- **Deterministic execution** — primary. Every criterion is driven through `ExecutionCoordinator`
  with controlled fake Drivers and explicit barriers; each assertion accounts for the whole
  observable result and the forbidden mutations, not only the next state.
- **Normative decisions** — for the acceptance order, identity/replay rules and every rejection
  path: both orders of interacting operations, absent/empty cases, exact limit edges, duplicate,
  conflicting and stale submissions.
- **Race and fault** — narrowly: the orders between Outcome acceptance, takeover, redelivery,
  recovery holds and late delivery reports on one in-memory coordinator. This packet makes no
  persistence or process-death claim, so no process-kill evidence is offered.
- **Process/documentation** — the K1.0 inventory and guard maintenance, BASELINE records and the
  Layer-3 markers (C14, C15).

Excluded: native Runtime/Driver fidelity (no real Driver exists; R1), external evidence gates (no E
gate is claimed; K1.4), packaging/release (the zone stays private).

## Acceptance criteria

**K1.2-C1 — authenticate and scope before content (OA-1; K0 R3-e1, R3-e2).** Every K1.2 surface —
Outcome submission, takeover, recovery and protocol-failure reports — resolves the named Execution for
the authenticated caller before reading any other request field. A hidden Execution and a missing one
are refused identically (`unknown_destination`, position 0, no Execution named), and the refusal
records nothing on the hidden Execution. A counterexample that reads envelope content before scoping
is rejected by a read-counting envelope.

**K1.2-C2 — exact replay and conflict precede fresh validation (OA-2; K0 R3-f1).** An accepted
Outcome is identified by its Execution and Activation ID. An exact duplicate returns the original
receipt and the original decision without any mutation, receipt or refusal record — also after the
exchange resolved, after the next exchange started and after the Execution became terminal. Any other
submission under an accepted Activation ID is refused as `duplicate_conflict` with no mutation,
including one whose content would now fail validation or whose epoch differs. The lookup precedes the
terminal and currency checks.

**K1.2-C3 — whole-envelope validation, all or nothing (OA-3, OA-5; K0 R3-i2; E-6).** A new proposal is
refused whole unless it names the current unresolved Activation, its current writer epoch and its
pinned base progress revision (`stale_exchange` otherwise), the Execution is not terminal, and its
content is valid: explicit `executionId`, `activationId`, `writerEpoch`, `baseProgressRevision`,
`progress` and `next`; each root (progress, each Emission value, result, error) a boundary value
within the four limits measured separately — at the limit passes and one past is refused, and two
sibling roots of about 700 KiB both pass; unique Emission keys; a supported next step; no unknown own
field; Emission count within the coordinator's declared limit (`capacity_exhausted`). A refused
proposal acknowledges nothing, installs no progress or revision, records no Emission or result,
disposes no Event, changes no state, epoch or reservation, mints no receipt and leaves the exchange
open for a corrected submission. The refusal is recorded with its reason. The Kernel never redelivers
or retries on its own after a refusal.

**K1.2-C4 — atomic acceptance and one progress writer (OA-4, B-3; K0 R5-j6-2).** Accepting an
Outcome, in one decision: acknowledges the entire reserved batch (and nothing outside it, even when
the progress names other Events), installs the proposed progress unchanged under accepted revision
base+1, records each Emission under a stable Kernel-derived identity, records the next state and
resolves the exchange. At most one Outcome is accepted per exchange. The Kernel never reads progress
to decide acknowledgment: a progress value claiming to refuse or defer an Event changes nothing about
whole-batch acknowledgment.

**K1.2-C5 — `continue`, `complete`, `fail` and the next exchange (lifecycle; retry-versus-takeover).**
`continue` makes the Execution `READY`; the next dispatch is a new exchange with a new Activation ID,
a newly selected batch (empty when nothing is queued), base revision equal to the accepted revision,
the accepted progress carried unchanged, and a starting epoch per the recorded in-process choice
(K1.2-DEC-5). `complete` records a typed terminal result and makes the Execution `COMPLETED`; `fail`
records a typed error and makes it `FAILED`. A terminal Execution never reopens: dispatch, a new
Outcome, takeover, recovery and protocol-failure reports are refused.

**K1.2-C6 — B-5 terminal disposition and live terminal ingress (owner amendment 2026-09-24).** When an
accepted `complete` or `fail` ends the Execution, every Event still unacknowledged at that moment —
after the batch acknowledgment — receives an explicit recorded terminal disposition in the same
decision, never an acknowledgment, deletion or silent drop, and inspection reports it. New ordinary
input to the `COMPLETED`/`FAILED` destination is refused as `terminal_destination` and is not
queued; an exact retry of input accepted before the end replays with its current disposition; a
changed retry conflicts.

**K1.2-C7 — Effects, obligations and waits refused (EF-1, EF-2, CX-3; K1.3 boundary).** An Outcome
proposing any Effect is refused whole at envelope validation: no Effect ID, no denied-action,
admission or settlement record, nothing an E2 attribution could read as a denial, and the Activation
stays open. `complete` proposing any obligation is refused whole; with every obligation kind
unsupported before K2.3, the completion accounting check at acceptance has nothing outstanding to find
and is exercised on its refusal side. `await` is refused naming K1.3, without reading the wait.

**K1.2-C8 — authorized takeover and fencing (ID-3, ID-4, ID-9).** A takeover names the exchange and
the epoch it supersedes. When both are current, one accepted decision advances the epoch by one under
the same Activation ID and pinned input, re-records the dispatch intent's current attempt with a
dispatch-intent receipt, and delivers the same exchange at the new epoch through a fresh capability.
The superseded epoch is fenced at once: its Outcome is `stale_exchange` with no staleness window,
while the new epoch's Outcome commits. A takeover naming a superseded epoch is refused, never a second
advance. Ordinary redelivery never advances the epoch, and a retry-only schedule shows no epoch
change. New mailbox arrivals never join the pinned batch.

**K1.2-C9 — recovery hold for unavailable pinned code (PC-4, PC-5; state.md recovery-held).** A recovery
request names the unresolved exchange and declares which Definition revisions, Runtime contract
revisions and progress codecs are available. When a pinned one is missing, the Execution stays
`RUNNING` with the same exchange, progress and revision, under an inspectable hold naming what is
missing; redelivery and takeover are refused while it holds. When the declaration covers every pin,
the hold clears and ordinary progress resumes — redelivery, then acceptance at base+1 — without any
new revision from holding or clearing. The hold is distinguishable by inspection from `FAILED` and
from `WAITING`. No persistence is claimed.

**K1.2-C10 — protocol failure is an inspectable hold, never a silent retry (OA-6; K0 R3-h1, R3-h2).**
A report that the current attempt's response could not be classified names the exchange and epoch;
when current, it holds the exchange under an inspectable protocol-failure reason with a bounded
diagnostic, without changing state, progress, epoch, batch or receipts. Redelivery is refused while
held. The hold ends only through an explicit recovery decision — an authorized takeover — or through
acceptance of a valid Outcome from the current attempt. A stale report is refused.

**K1.2-C11 — late reports and late Outcomes (delivery reporting boundary).** After the exchange
resolves, is taken over, or the next exchange starts, a late delivery report settles only its own
retained pending attempt record: no receipt, epoch, reservation, acknowledgment, lifecycle or newer
attempt changes. A late Outcome for a resolved Activation returns its original receipt when it is an
exact duplicate and is otherwise refused with no state change; it never commits into the new
exchange.

**K1.2-C12 — receipts, retained evidence and inspection.** Outcome acceptance mints its own
`outcome_acceptance` receipt at the owning Execution's next acceptance position; no receipt from one
boundary is returned for another; refusals mint none. Receipts, refusal records, dispositions,
Emission, result and exchange records exposed by the Kernel are immutable, and no caller mutation
changes a later replay or inspection. Inspection reports acknowledgments, terminal dispositions,
Emissions, the terminal result, resolved exchanges with their delivery attempts, and recovery holds;
reading acknowledges and mutates nothing. No observable value depends on activity in a scope the
caller cannot reach.

**K1.2-C13 — one observation of a caller-owned envelope (K1.1 C3, KC1-DEC-3/4/6, K1.1-DEC-6).** Every
envelope field is read from the envelope's own data, once; an inherited-only field reads as missing;
an unobservable field is a located refusal, never an exception escaping the boundary. Every value root
is captured once and what is retained, dispatched and inspected is that capture. After the first
caller observation, no live global, prototype method, iteration protocol or ordinary indexed write
is consulted: the accepted decision survives ambient pollution installed during observation.
`boundary.test.ts`'s text rules hold over the zone.

**K1.2-C14 — structural boundary and inventory (K1.0, 015).** The target zone still imports nothing
outside itself except `node:` builtins and `canonicalize`, approves no portable leaf and stays
private. The ownership inventory and guard match the measured candidate tree, and the DX-4 row K1.0
assigned here receives its owner's written disposition.

**K1.2-C15 — reference and baseline maintenance (006 §Maintaining the mental-model reference).** The
implemented baseline states the K1.2 surface and records each `OPEN(implementation)` choice this
packet settles; each such marker points at that record and stays in place; §4 of the rewrite index
agrees. The canonical delivery, retry/takeover-lifetime, and Outcome-acceptance order live in
[execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md) under owner decision
[decision-01](decision-01.md) (2026-09-25), which supersedes only KC1-ARCH-1's two-argument carrier
signature; no other Layer-3 page owns a competing rule. No Layer-3 page gains build or acceptance status, and no open choice is settled in
specification prose. Acceptance criteria are unchanged by that provenance update.

## Obligation/interaction coverage map

| Obligation and source | Input or schedule, including the negative case | Expected facts and forbidden changes | Evidence |
|---|---|---|---|
| C1 scope before content (OA-1) | outsider submits Outcome/takeover/recover/protocol report with read-counting getters; missing ID | identical refusals; zero reads past `executionId`; nothing recorded on the hidden Execution | `outcome-acceptance.test.ts`, `nondisclosure.test.ts` |
| C1 revoked scope | accepted Outcome, then the same caller without the scope replays it | refused as unknown, not replayed | `outcome-acceptance.test.ts` |
| C2 exact replay (OA-2) | accept; resubmit identical after resolution, after the next dispatch, after `complete` | same receipt object and decision; no new receipt, refusal, revision, Emission or disposition | `outcome-acceptance.test.ts`, `terminal.test.ts` |
| C2 conflict before validation | resubmit under an accepted Activation ID with changed progress, changed epoch, invalid value | `duplicate_conflict`, recorded; accepted state unchanged | `outcome-acceptance.test.ts` |
| C3 currency (OA-3) | wrong Activation ID, epoch below and above current, base revision stale, Outcome with no unresolved exchange | `stale_exchange`, recorded; exchange still open and answerable | `outcome-acceptance.test.ts` |
| C3 explicit identity (PLAN-01) | envelope omitting `writerEpoch`, `baseProgressRevision` or `activationId` | refused; never defaulted to the current exchange | `outcome-acceptance.test.ts` |
| C3 content | missing progress, bad next step, duplicate Emission keys, unknown field on envelope/next/Emission, non-array emissions | `malformed_envelope` naming each issue; whole refusal | `outcome-acceptance.test.ts` |
| C3 E-6 matrix at the Outcome boundary | at-limit and one-past for string length, entries, depth, bytes in progress; bytes and depth in an Emission and a result; two ~700 KiB siblings | at-limit accepted, one-past refused whole with a located path; siblings pass; the envelope adds no level | `outcome-limits.test.ts` |
| C3 Emission capacity | limit+1 Emissions; configuration below 1 | `capacity_exhausted` before commit; configuration error | `outcome-acceptance.test.ts` |
| C3 no Kernel retry (OA-5, R3-i2) | a refused Outcome, then inspect the Driver log and delivery attempts | no new delivery, no new attempt | `outcome-acceptance.test.ts` |
| C4 atomic set (OA-4, B-3) | batch of two plus a queued Event outside it; accept `continue` | both batch members acknowledged, the other queued; progress and revision+1; Emissions with IDs; READY; receipt | `outcome-acceptance.test.ts` |
| C4 progress opacity (R5-j6-2) | progress naming a batch Event as refused and a non-batch Event as handled | acknowledgment unchanged by what progress says | `outcome-acceptance.test.ts` |
| C4 one writer | second new Outcome for the same Activation after acceptance | conflict; one acceptance per exchange | `outcome-acceptance.test.ts` |
| C4 capacity interaction (creation.md capacity) | mailbox at its declared capacity with a reserved batch; accept the batch's Outcome | reservation still counts; acknowledgment frees the room | `outcome-acceptance.test.ts` |
| C4 synchronous in-process Runtime | a Driver that submits the Outcome from inside `deliver` | the intent is already open; the Outcome is accepted; the dispatch answer describes its own exchange | `outcome-acceptance.test.ts` |
| C5 next exchange | `continue` then dispatch with and without queued input | new Activation ID; new batch; empty batch when nothing queued; base = accepted revision; progress carried unchanged; epoch 1 under DEC-5 | `outcome-acceptance.test.ts` |
| C5 terminal never reopens | after `complete`/`fail`: dispatch, redeliver, new Outcome, takeover, recover, protocol report | each refused; state unchanged | `terminal.test.ts` |
| C5 typed result | `complete(result)` versus `fail(error)` | `result.kind` distinguishes them; values retained as captured | `terminal.test.ts` |
| C6 B-5 | Events queued outside the batch when `complete`/`fail` is accepted | each has a terminal disposition, none is acknowledged, none deleted; same decision | `terminal.test.ts` |
| C6 live terminal ingress | new input after the end; exact retry of earlier input; changed retry | refused and not queued; replay with current disposition; conflict | `terminal.test.ts` |
| C7 Effects (EF-1/EF-2) | Effect-bearing `continue` and `complete` | whole refusal; no Effect field anywhere in inspection; exchange open; a corrected Outcome then accepted | `outcome-acceptance.test.ts` |
| C7 waits | `await` with any wait | refused naming K1.3; the wait is never read | `outcome-acceptance.test.ts` |
| C8 takeover (ID-3/ID-4/ID-9) | takeover naming the current epoch; old-epoch Outcome; new-epoch Outcome | same Activation ID and batch, epoch+1, dispatch-intent receipt, delivery at the new epoch; old Outcome `stale_exchange`; new one accepted | `takeover.test.ts` |
| C8 retry-only | redeliver several times, then accept | epoch unchanged throughout | `takeover.test.ts` |
| C8 attempt authority lifetime (DEC-20) | capture the first delivery's grant before ordinary redeliveries; repeat with the grant captured at takeover before redelivering that attempt | accept with the saved reference in both schedules; takeover's grant differs from the retired grant; each delivery has a distinct reporting capability; retired authority stays fenced; hold-ending History distinguishes attempt submission from control | `submission-lifetime.test.ts`; B10/B11 in `ablations.mjs` |
| C8 repeated takeover | the same takeover sent twice | the second refused as stale; epoch advanced once | `takeover.test.ts` |
| C8 pinned input | input accepted before takeover | stays queued and outside the batch | `takeover.test.ts` |
| C8 reentrant takeover | a Driver that takes over from inside dispatch or redelivery | each answer describes the attempt that call delivered; the takeover stands and fences epoch 1 | `takeover.test.ts` |
| C8 control privilege (evidence.md; DEC-14) | visible principal lacking control authority vs control-authorized principal on takeover; outsider hidden vs missing | caller lacking control authority refused by the command as `unauthorized_control` with no epoch/receipt/delivery change; outsider `unknown_destination` identical hidden/missing | `control-authority.test.ts`, `outcome-acceptance.test.ts` |
| C8 safe replacement (identity.md writer-epoch; recovery.md; DEC-15) | takeover with safe Driver vs unsafe/absent/throwing Driver | safe advances epoch; unsafe/absent/throwing refused `unsafe_replacement` with no epoch/receipt/delivery change; fencing alone does not imply native exclusion | `control-authority.test.ts` |
| C8 revalidation after safety callback (DEC-19) | `isSafeToReplace` reentering nested takeover for same Activation/epoch then `true`; submitting valid current Outcome (incl. terminal `complete`/`fail`) then `true`; establishing a code hold then `true` | at most one takeover commits; outer stale arm refused (`stale_exchange` / `no_unresolved_exchange` / `terminal_destination` / `recovery_held`) with no orphan receipt, extra delivery, or overwritten evidence; whole result asserted | `takeover-reentrancy.test.ts` |
| C9 code hold | recover with a pinned revision or codec missing, then with all present | RUNNING, hold reason, same exchange/progress/revision; redeliver and takeover refused; then cleared; redeliver and accept at base+1 | `recovery.test.ts` |
| C9 distinguishability | held versus FAILED versus waiting | state and hold differ | `recovery.test.ts` |
| C9 permitted actions (evidence.md; DEC-17) | code hold, protocol hold, both; inspect permitted vs attempt redeliver/takeover/declare/Outcome | code `["declare_code_availability","submit_outcome"]`; protocol alone `["request_takeover","submit_outcome"]`; both `["declare_code_availability","submit_outcome"]`; inspected list predicts actual accept/refuse without probing | `hold-permitted.test.ts`, `recovery.test.ts` |
| C9/C10 recorded recovery commands (evidence.md, state.md History; DEC-18) | enter code hold, change reason, clear by declaration, clear protocol by takeover, end by Outcome; idempotent duplicates | each accepted decision appends one frozen history record with `authority` (`control` vs `attempt_submission`), actor, and exchange/epoch causation; history survives hold clearing, resolution, next dispatch and terminal; duplicates append nothing | `recovery-history.test.ts`, `history-attribution.test.ts`, `recovery.test.ts`, `hold-permitted.test.ts` |
| C10 protocol failure (OA-6) | report for the current attempt; stale report; redeliver while held; takeover; grant-authorized valid Outcome | hold with bounded diagnostic; stale refused; redeliver refused; takeover clears; Outcome clears | `recovery.test.ts` |
| C10 control privilege | visible caller lacking control authority vs control-authorized on recover and protocol report | caller lacking control authority refused by the command as `unauthorized_control` with no hold/history change | `control-authority.test.ts` |
| C10 submission authority (DEC-20) | visible caller without a current attempt grant submits `continue`, terminal `complete`/`fail`, and hold-ending Outcomes with forged/absent grants; same Outcomes with the attempt grant; old grant after takeover; hidden/missing callers | grant-less refused `unauthorized_submission` with zero accepted-state mutation (lifecycle, holds, history, receipts, B-5 unchanged; attempt still answerable); grant-holding proposal accepted; retired grant cannot commit (`stale_exchange` fencing preserved); hidden≡missing `unknown_destination`; views expose no grant | `submission-authority.test.ts` |
| C11 late delivery report | delayed capability settled after resolution, after takeover, after the next dispatch | only its own attempt record changes | `late-reports.test.ts` |
| C11 late Outcome | exact and changed Outcome for resolved A while B is unresolved | replay / conflict; B untouched | `late-reports.test.ts` |
| C11 exact delivery attribution (identity.md dispatch-and-delivery; DEC-16) | multiple redeliveries before and after takeover (1,2 at epoch1; 3,4 at epoch2) plus late reports from both epochs, out of order | each row names its activationId/writerEpoch `[1,1,2,2]`; late reports settle only their own row; resolved exchange retains epochs; new exchange has its own ID/epoch1 | `delivery-attribution.test.ts`, `late-reports.test.ts` |
| C12 receipts | create → dispatch → Outcome → dispatch → takeover → Outcome | each boundary its own receipt and position; frozen; refusals mint none | `outcome-acceptance.test.ts`, `takeover.test.ts`, `transaction.test.ts` |
| C12 retained evidence immutable | mutate returned receipts, answers, views, dispositions, holds/history/deliveries/refusals | replay and inspection unchanged | `outcome-evidence.test.ts`, `recovery-history.test.ts`, `recovery-evidence.test.ts`, `history-attribution.test.ts` |
| C12 nondisclosure | hidden-scope Outcome/takeover/recover activity interposed between A's operations | every A-observable value equal across arms, including holds/history/deliveries/control refusals | `nondisclosure.test.ts`, `recovery-evidence.test.ts` |
| C12 transaction contiguity (DEC-10) | refused Outcomes, replays, redeliveries, then acceptances; Outcomes ending one hold and both holds | refusals/replays/redeliveries consume no acceptance position; positions contiguous per Execution; hold-ending history committed atomically in the same decision | `transaction.test.ts` |
| C13 own-only, single observation | inherited envelope fields; throwing/revoked fields; getters counting reads; value root read once | missing, located refusal, one read per field | `outcome-hostile.test.ts` |
| C13 ambient pollution during observation | a getter installing an inherited indexed accessor or descriptor-field pollution, or replacing a builtin, before commit | the accepted decision, acknowledgment list, Emission list and receipt are retained exactly | `outcome-hostile.test.ts` |
| C14 zone rules | the import graph and inventory | no violation; document and policy agree | `tests/conformance/architecture/kernel-landing-zone.test.ts` |
| C15 records | BASELINE, identity.md markers, rewrite-index §4, execution-cycle delivery/acceptance owner and K1.2 decision-01 | choices recorded; markers kept; no status on Layer-3 pages; no stale two-argument binding description where it purports to specify the current in-process call | report checklist; link check |
| All: distinguishing power | 27 plausible broken implementations applied to a copy of the package (A1–A16 as before, plus B1 authority falls back to visibility, B2 history dropped, B3 permitted desynchronized, B4 delivery pinned to epoch 1, B5 acceptance-index gaps, B6 post-callback revalidation removed, B7 Outcome hold-ending history dropped, B8 Outcome submission without attempt grant, B9 hold-ending History claims control power, B10 every redelivery rotates the submission grant, B11 only post-takeover redelivery rotates it) | each rejected by at least one test, with a clean unablated control | `ablations.mjs` (payload) and its output in the report |

## Command plan

On the payload commit C, from the repository root:

```bash
npm run typecheck
npm test
npm run test:kernel
npm run test:conformance
npm run test:sdk
npm run check:builder-docs
```

`npm test` is the superset. The kernel and conformance suites are recorded separately because the
packet's cases and the K1.0 guard are where a change shows first; `test:sdk` shows the supported path
unchanged. `check:builder-docs` runs because documentation changes. `npm run test:evals` is not run:
there is no Agent behavior or model path. A distinguishing ablation (a plausible broken
implementation the new tests must reject) is run and attached with the report.

## Third-party review ([AGENTS.md](../../../../AGENTS.md))

None planned. `canonicalize@3.0.0` stays the only third-party specifier in the zone. The K0 fixture's
vocabulary is repository material, not third-party.

## Decisions taken within this contract

Routine implementation choices under 007, recorded so a reviewer can rule on them.

- **K1.2-DEC-1 — the Outcome envelope.** `submitOutcome(caller, envelope, submission)` (DEC-20) takes
  an envelope with `executionId`, `activationId`, `writerEpoch`, `baseProgressRevision`, `progress`, optional `emissions`
  (`{ emissionKey, value }` each), optional `effects` and `next` (`continue`, `await`,
  `complete` with `result`, `fail` with `error`). Absent and empty `emissions`/`effects` mean the same
  thing. An unknown own field on the envelope, on `next` or on an Emission is refused rather than
  ignored, because ignoring it would silently strip part of a proposal (EF-1's rule, generalized).
  Nothing is defaulted from the current exchange (PLAN-01).
- **K1.2-DEC-2 — order inside validation.** After scope (OA-1) and the replay lookup (OA-2): terminal
  state, then exchange currency (Activation, epoch, base revision), then the separate current-attempt
  submission grant (DEC-20), then content. Every group rejects the whole proposal; the classification names the first failing group, and content issues are
  reported together. A submission that no longer answers the current exchange is told so first,
  because that is what its sender can act on.
- **K1.2-DEC-3 — accepted-Outcome identity.** An accepted Outcome is found by (Execution, Activation
  ID); its content is epoch, base revision, progress, the ordered Emissions and the next step. Content
  that cannot be captured cannot equal accepted content, so under an accepted Activation ID it is a
  conflict, as OA-2's order requires.
- **K1.2-DEC-4 — Emission and result identity.** An Emission's ID is derived from its Execution,
  Activation and Emission key; a terminal result's from its Execution and Activation. Both are pure
  functions of accepted identities, so a replay cannot mint another. Output positions, reads and
  cursors are K4.4's and are not introduced.
- **K1.2-DEC-5 — writer-epoch representation.** An integer, 1 at each new exchange (carrying
  K1.1-DEC-2), advanced by exactly 1 per accepted takeover. This settles the in-process binding's
  answer to the `OPEN(implementation)` item in `identity.md#writer-epoch`; it is recorded in BASELINE
  and at the marker, which stays.
- **K1.2-DEC-6 — takeover.** A compare-and-advance on the named Activation ID and current epoch; a
  repeat naming the superseded epoch is refused as stale. Because the dispatch intent records the
  exchange's current attempt before sending (`execution-cycle.md#before-sending`), a takeover
  re-records it and mints a dispatch-intent receipt, not a new receipt kind. It then delivers through
  a fresh capability.
- **K1.2-DEC-7 — holds.** A hold attaches to the unresolved exchange, at most one per cause
  (`pinned_code_unavailable`, `protocol_failure`). Redelivery is refused while any hold exists;
  takeover is refused while a code hold exists and clears a protocol-failure hold. A hold is not a
  fence: only the epoch and terminal state fence acceptance, so a valid Outcome from the current
  attempt is accepted and, by resolving the exchange, ends its holds. Recovery requires an explicit
  availability declaration naming the exchange; the in-memory profile keeps no standing registry of
  available code.
- **K1.2-DEC-8 — protocol-failure report.** `reportProtocolFailure(caller, executionId, report)` is the
  in-process binding's way for a Driver to say that the current attempt's response could not be
  classified. The diagnostic is bounded like a delivery failure (first 1,024 UTF-16 code units of a
  primitive string, else fixed text). A repeated report while a protocol-failure hold exists changes
  nothing.
- **K1.2-DEC-9 — Emission capacity.** `CoordinatorOptions.emissionsPerOutcome`, an integer of at
  least 1, default 256. An Outcome over it is refused as `capacity_exhausted` before commit
  (`output.md`: reject before commit, never accept then drop). This is an operational bound of the
  in-process binding, not a fifth semantic limit.
- **K1.2-DEC-10 — transaction mechanism.** Validation and commit run in one synchronous call on the
  single-threaded in-memory coordinator; every caller-owned field is observed first, every retained
  decision record the acceptance needs is then built from Kernel data only — receipt, Emissions,
  result, dispositions, resolved exchange, Outcome decision, hold-ending history records, and the
  retained accepted-Outcome wrapper binding the captured identity to the decision for replay — and
  only then is accepted state mutated by inserting those prebuilt records
  (the Outcome-acceptance receipt's position is read while building and committed with the rest of
  the decision; no acceptance index advances before the records are complete), through load-time
  primitives with no caller code between first check and last mutation. The apply phase constructs
  no retained record; the only post-mutation construction is the returned answer projection
  (`{ ...decision, replayed: false }`), which is not retained state. This settles the §4
  transaction-mechanism item for this binding and claims no durability.
- **K1.2-DEC-11 — per-entry disposition storage.** Each mailbox entry holds its own frozen disposition:
  queued, acknowledged (naming the acknowledging Activation) or terminal (with its reason).
- **K1.2-DEC-12 — retention.** Accepted-Outcome records, resolved exchanges, Emissions and results are
  retained for the coordinator's lifetime, like K1.1's keys; nothing survives it.
- **K1.2-DEC-13 — DX-4.** Not extracted and not needed: the Outcome envelope is a fixed shape
  validated in-zone, and the legacy value-schema language normalizes values, which `values.md`
  forbids. The row stays open for K2.2's operation schemas.
- **K1.2-DEC-14 — control authority distinct from inspection (correction, K12-R1-AUTH-01).**
  `AuthenticatedCaller.controlScopes` is the separate control power `evidence.md` requires
  ("inspection privilege does not grant re-execution or settlement privilege"; `authority.md` lists
  send/inspect/cancel/delegate/read/write/impersonate as separate powers). Visibility (`scopes`)
  answers hidden-vs-missing identically; the three exchange controls (`requestTakeover`,
  `recoverExecution`, `reportProtocolFailure`) additionally require the Execution's scope in
  `controlScopes`, else `unauthorized_control` with no control-state mutation through those commands.
  Absent `controlScopes` (or absence of the Execution's scope from it) denies these explicit controls;
  it does not make the principal globally read-only. For a fresh Outcome, visibility is necessary
  but insufficient: DEC-20 requires the separate current-attempt `SubmissionGrant`, without requiring
  `controlScopes`. A visible grant holder may therefore submit a valid Outcome that resolves the
  exchange and ends its holds despite lacking general control authority. Exact replay/conflict still
  precede fresh authority checks under DEC-20. This is the binding's Kernel-enforced distinction,
  not a universal token format (which stays K2's).
- **K1.2-DEC-15 — Driver safe-replacement owner for takeover (correction, K12-R1-AUTH-01).**
  `ExecutionDriver.isSafeToReplace(activation)` is the Driver's phase-specific determination that
  native continuation is exclusive or otherwise safe to replace (`identity.md#writer-epoch`,
  `recovery.md#decide-permission-before-replacing-work`, `driver.md`, `kernel.md`). The Kernel
  advances the writer epoch only when it returns exactly `true`; absent, `false`, or throwing means
  `unsafe_replacement` rather than assumption. Kernel fencing of stale writes does not itself stop
  superseded native work. Fake Drivers in tests declare `true` when the phase is safe and `false`
  when it is not.
- **K1.2-DEC-16 — delivery-attempt attribution (correction, K12-R1-DELIVERY-01).** Each retained
  delivery row names the `activationId` and `writerEpoch` it carried when sent
  (`identity.md#dispatch-and-delivery`: always say what was delivered and to whom). Ordinary
  redelivery preserves both; takeover preserves the Activation ID and advances the epoch. Late
  reports still settle only their own row. No seventh receipt is introduced.
- **K1.2-DEC-17 — held-exchange permitted actions (correction, K12-R1-HOLD-01).** Each standing hold
  exposes `permittedNextActions` computed from the same rules that refuse the controls (one normative
  owner): a code hold `["declare_code_availability","submit_outcome"]`; a protocol hold alone
  `["request_takeover","submit_outcome"]`; either hold when a code hold stands
  `["declare_code_availability","submit_outcome"]`. The vocabulary names existing K1.2 operations only,
  not a universal recovery API.
- **K1.2-DEC-18 — retained recovery history (correction, K12-R1-HISTORY-01; attribution corrected for K12-R3-HISTORY-02).**
  Each accepted decision that enters, updates (`updated` when the code-hold reason changes), or ends
  a hold appends one frozen `RecoveryHistoryRecord` to the owning Execution's `recoveryHistory`
  (activationId, writerEpoch at decision, cause, transition `entered`/`updated`/
  `cleared_by_declaration`/`cleared_by_takeover`/`ended_by_outcome`, reason, `authority`,
  `actorNamespace`/`actorScope`, and `resultingEpoch` for takeover clears). `authority` is `control`
  when the Kernel checked control power over the Execution's scope (declarations, protocol reports,
  takeovers) and `attempt_submission` when the accepted Outcome presented the current attempt's
  submission grant — a valid Runtime proposal that is not by itself general control power; the two
  are never conflated, and `actorScope` factually names the Execution's scope in both cases. History
  survives hold clearing, exchange resolution, next dispatch, and terminal state; idempotent
  duplicates (`changed:false`) append nothing. No seventh receipt boundary is introduced.
- **K1.2-DEC-20 — attempt-bound Outcome-submission authority (correction, K12-R3-AUTH-02).**
  `submitOutcome(caller, envelope, submission)` requires the `SubmissionGrant` the Kernel minted for
  the current writer-epoch attempt and handed to the Driver with the Activation
  (`execution-cycle.md`: the Kernel sends an Activation through the Driver; the Runtime returns the
  Outcome). Authority is reference identity against the exchange's current grant — never field
  comparison — so inspected coordinates authorize nothing and forged look-alikes fail. Scope
  (OA-1) is still required and still precedes everything; exact replay and conflict (OA-2) precede
  authority because they return or refuse on retained evidence without accepting anything; terminal
  and currency (stale/terminal vocabulary, so takeover fencing is unchanged) precede authority, so
  only a current-yet-grant-less proposal is refused as `unauthorized_submission` with no
  accepted-state mutation beyond the recorded refusal. Redelivery preserves the attempt and its
  grant; takeover mints a fresh grant and retires the old one, so a superseded attempt cannot regain
  proposal power. Grants are frozen at mint and never exposed through inspection. This is not K2
  policy: no token format, grant language, or remote backend — one unforgeable reference per
  attempt, which is all K1.2 needs to establish who may validly answer the current Activation.
  The in-process carrier `deliver(activation, settlement, submission)` is authorized by owner
  decision [decision-01](decision-01.md) (2026-09-25), which supersedes only KC1-ARCH-1's exact
  two-argument signature; canonical lifetimes and the acceptance order live in
  [execution-cycle](../../../../mental-model/mechanisms/execution-cycle.md). Acceptance criteria
  are unchanged by that provenance update.
- **K1.2-DEC-19 — takeover commit revalidation after the safety callback (correction, K12-R2-TAKEOVER-01).**
  `isSafeToReplace` is trusted same-process Driver/host code that can synchronously reenter the
  coordinator, so state validated before the callback (unresolved exchange, current epoch, no code
  hold) is re-established immediately before commit with no further reentrant code between that final
  validation and the mutations. A nested takeover advancing the epoch makes the outer arm
  `stale_exchange`; an Outcome resolving the exchange makes it `no_unresolved_exchange` (or
  `terminal_destination` when terminal); a newly established code hold makes it `recovery_held`.
  At most one takeover decision commits per request; no orphan receipt, extra delivery, or overwrite
  of accepted evidence. The classifications reuse the existing refusal vocabulary; no new receipt
  boundary is introduced.

## Unresolved obligations and limits

- **K1.2-OPEN-1 — policy-change replay.** K0 R3-f1 asks for replay before validation "even when
  updated policy would now reject the envelope". The in-process binding has no mutable acceptance
  policy; C2 evidences the order through state that fresh validation would now reject (resolved
  exchange, next exchange, terminal state). A policy surface arrives with K2.
- **K1.2-OPEN-2 — whole-message cost.** Each root is bounded, and the Emission count is bounded, but a
  maximal in-process Outcome can still cost about (2 + 256) MiB of capture work. `values.md` assigns
  whole-message bounds to a deployment's transport; a remote binding for untrusted Runtimes owns them.
- **K1.2-OPEN-3 — unbounded logs.** The delivery-attempt log (K1.1-OPEN-7), the refusal list and the
  retained output grow without trimming in this profile. Retention windows are K4.4/K5.1's.
- **K1.2-OPEN-4 — no durability, isolation or Driver fidelity.** The coordinator is in-memory.

## Interacting boundaries

- **K1.3** reuses this packet's terminal disposition shape for cancellation and Execution-deadline
  expiry, adds `await`, and orders cancellation against the acceptance implemented here.
- **K1.4** ports the K0.2 fixture onto this boundary; this packet uses its vocabulary
  (`malformed_envelope`, `stale_exchange`, `duplicate_conflict`, `recoveryHold`) so the port is wiring.
- **K2.1** replaces Effect refusal with atomic intents inside the same acceptance.
- **K4.4** turns the retained Emission and result records into authorized reads and replay.
