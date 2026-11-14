# K1.4 — final Layer-3 check 01

Owner-delegated Prompt C check, 2026-11-14, by the cleanup session identified in
[cleanup 01](cleanup-01.md). Subject: accepted H `e307943d6b315e724e49107c3b26a1100ef4916c` over C
`72d452bb39e0ae0f846d85e273441d06a9cd22fb`, base B `608f9ece44dbe42b78974bdac9e7ddcd33697705`. This is
a maintenance check of the independently accepted candidate. It makes no semantic decision and is not an
independent acceptance of anything. Its one finding, CLEANUP-K14-01, is the cleanup agent's own. No
reviewer raised it.

## Accepted sources and ownership

The check starts at [roadmap K1.4](../../../../mental-model/roadmap.md#k14), which lists integration,
evidence and execution-cycle, and at the [reference index](../../../../mental-model/reference.md). It then
follows the actual B..H delta beyond those owners. Accepted sources: [brief 01](brief-01.md) with the
owner's answers; owner choices [01](owner-choices-01.md), [02](owner-choices-02.md), [03](owner-choice-03.md)
to [06](owner-choice-06.md); designs [01](design-01.md) to [04](design-04.md) with design checks
[01](design-check-01.md), [03](design-check-03.md) and [04](design-check-04.md) and [attack 01](attack-01.md);
reviews [01](review-01.md) to [05](review-05.md), ending in review 05's ACCEPT.

K1.4 is Driver and SDK-host work. B..H leaves `packages/kernel/src` and `packages/core/src` unchanged; the
only Kernel-package change is one test, `binding-surface.test.ts`. So no Kernel semantics changed. The
Layer-3 maintenance concerns how a Driver integrates and how an in-process host drives the coordinator.
H changes three Layer-3 pages: `integration.md`, `execution-cycle.md` and `reference.md`.

| Definition or mechanism | Maintenance already in H | Dependency check |
|---|---|---|
| [Integration](../../../../mental-model/mechanisms/integration.md) | The status line names the managed-native-job shape for the legacy bridge. A new paragraph says how an in-process adapter with its own session store accounts for a reserved Event: forwarded, discarded by a terminal decision, or unknown when forwarding failed before the native side answered | The managed-native-job row exists in the shape table. The paragraph agrees with [core](../../../../mental-model/concepts/core.md#batch-reservation-and-acknowledgment): an accepted Outcome acknowledges the whole batch, acknowledgment is accounting rather than compliance, and the native fate of an Event is Runtime output, not a Kernel disposition. It matches L-29 as amended by owner choice 04: an unknown Event is never forwarded again. Consistent |
| [Execution cycle](../../../../mental-model/mechanisms/execution-cycle.md) | A new paragraph after "Sending proceeds through the Driver": the Kernel has no scheduler of its own; the host decides when to dispatch and when to fire due timers; deadlines take effect only when the host fires them | Its first two sentences agree with [core](../../../../mental-model/concepts/core.md#kernel) (the Kernel owns scheduling *semantics*) and [Kernel](../../../../mental-model/kernel.md) (it may build on a substrate's timers and dispatch). The third sentence contradicts [waits § Registering a wait](../../../../mental-model/mechanisms/waits.md#registering-a-wait) step 3, the K1.3 binding note under [three clocks](../../../../mental-model/concepts/operations.md#three-clocks) and BASELINE's timer path 1. **CLEANUP-K14-01** below |
| [Reference index](../../../../mental-model/reference.md#common-search-terms), legacy row | The `ControllerResumption`/`Harness` row says this machinery now runs as the native Runtime of the SDK's legacy Driver and links the conformance mapping | `tests/conformance/legacy-mapping.json` exists and is K14-6's mapping. The row keeps "replaced, not renamed" and routes current behaviour to BASELINE. Consistent |
| [Lifecycle](../../../../mental-model/mechanisms/lifecycle.md#cancellation-order) | None needed | The Kernel requests native interrupt "without waiting for cooperation", and physical stop "may never come". L-36's request-only native cleanup is an instance of that, not an exception. Consistent |
| [Recovery](../../../../mental-model/mechanisms/recovery.md) | None needed | Takeover needs native exclusion or a refusal. The bridge has no `isSafeToReplace` and refuses every takeover as `unsafe_replacement` (design 01 §2). Consistent |
| [Evidence](../../../../mental-model/mechanisms/evidence.md#attribution-and-gates) | None needed | K14-G is deferred to K1.4-gate, and K1.4 claims no E1 result. Attribution and structural-evidence rules are unchanged. See owner item O-3 on the rewrite schedule |
| [Values § In-process value capture](../../../../mental-model/concepts/values.md#in-process-value-capture) | None in H | Line 323 says the wrapper module "is not a public SDK entry; K1.4 owns that bridge". The capture module (`internal/value-capture.ts`) is still not an entry, but K14-5 now re-exports `toCanonicalBytes` through `wrapper.ts` from the SDK's entry. Observation O-2 below |
| [Core](../../../../mental-model/concepts/core.md) and [three clocks](../../../../mental-model/concepts/operations.md#three-clocks) | None needed | No new canonical term. "A Driver is an adapter, not a second scheduler" fits an SDK host that pumps the coordinator. The three clocks stay distinct |
| Layer 1/2: [overview](../../../../mental-model/README.md), [Kernel](../../../../mental-model/kernel.md), [Driver](../../../../mental-model/driver.md) | None needed | The overview's orientation is "which gate owns what rather than what has shipped". The Kernel package stays private, and the guides still describe the 0.8.x SDK surface, now driven through the bridge. No major abstraction changed |

The bridge's names (`BatchLedger`, `TerminateSite`, `UnschedulableReadyError`, lineage, reconcile, the
protocol-failure report) are implementation names. BASELINE §16 and 017 L-29 to L-37 describe them, and
none needs a Layer-3 definition. No `OPEN(implementation)` or gate marker names K1.4. K1.4 settles none.

## Finding and observations

**CLEANUP-K14-01 (P2, Layer-3 contradiction).**
- **Affected revision:** H `e307943d6b315e724e49107c3b26a1100ef4916c`. The sentence entered at
  `789e8c35` (K1.4 range B) under brief 01's Layer-3 obligation and is unchanged through H.
- **Location:** `mental-model/mechanisms/execution-cycle.md:17`, third sentence: "A wait deadline or an
  Execution deadline takes effect only when the host fires it, so a host that never pumps timers never
  expires anything."
- **Governing sources:** [waits § Registering a wait](../../../../mental-model/mechanisms/waits.md#registering-a-wait)
  step 3; the K1.3 in-process binding note at `mental-model/concepts/operations.md:126`;
  [BASELINE timers](../../002-implemented-kernel-baseline.md#waits-timers-and-cancellation-api), path 1
  ("Due at registration … with no host fire").
- **Counterexample:** an Outcome declares `await` with a deadline already due at its one clock reading,
  and no eligible Event is queued. The accepting decision retires the wait, mints its timeout Event and
  records deadline readiness, so the Execution is `READY`. The host has fired nothing and may never pump
  timers, yet the wait expired. K1.3's accepted test `packages/kernel/tests/owner-guards.test.ts:362`
  ("due at registration: the Outcome's own reading expires the wait, with no host fire and no pending
  timer") pins exactly this behaviour.
- **Impact:** documentation only. The code follows `waits.md` (K1.3, accepted), and K14-1..K14-6 do not
  depend on the sentence. A reader of the execution-cycle page would wrongly conclude that a host that
  never fires timers sees no wait expire. The rule's owner is `waits.md`; the execution-cycle page
  restates it and gets one of its three paths wrong.
- **Required outcome:** scope the sentence to the two host-fired paths and point the due-at-registration
  case at `waits.md`. A scoped documentation correction (new C/H and an independent review) does this.
  [Brief 06](cleanup-01/brief-06.md) proposes the text.
- **Validation:** `waits.md`, the operations binding note, BASELINE timer paths 1–3 and the
  execution-cycle paragraph state the same three paths. A grep for "never pumps" and
  "take(s) effect only when" finds no unqualified copy. Local links and anchors resolve, and no other
  Layer-3 text changes.

**O-2 (observation, not a finding).** `values.md:323` describes the wrapper module as "not a public SDK
entry" and says that "K1.4 owns that bridge". The first claim is literally true of the internal capture
module. The second is true as attribution. Read together after K14-5, though, they imply that applications
cannot reach the wrapper, while BASELINE's opening section records the public `toCanonicalBytes` export. Status belongs
to BASELINE, not a concept page. A one-clause correction can ride with CLEANUP-K14-01 at the owner's
choice. Nothing requires it.

**O-3 (owner item).** The [rewrite index](../../../../mental-model/rewrite-index.md#mechanism-rewrite-schedule)
schedules the `evidence.md` rewrite "after K1.4". That row predates the owner's 2026-11-03 split, which
moved the K1/E1 gate, and with it the evidence attribution, to K1.4-gate. The schedule's owner decides
whether K1.4 or K1.4-gate triggers it. This check starts no rewrite.

## Reference disposition

Layer-3 text is payload under 006/008, so cleanup changes no text under `concepts/` or `mechanisms/`. It
also makes no navigation edit: the roadmap's K1.4 entry already routes K1.4-gate through 007, and the
index needs no new label. CLEANUP-K14-01 is a documentation dependency. It does not invalidate the
accepted implementation, and K1.4 stays ACCEPTED at H. It must be corrected and independently reviewed
before the branch is merge-ready, unless the owner decides otherwise ([cleanup 01](cleanup-01.md)).

## Validation

A local Markdown path/anchor check covered `mental-model/`, `docs/development/*.md` and
`docs/development/work/K1.4/` (including the imported review records and this record). The cleanup record
gives counts. A control with a planted missing path and anchor fails as expected. `waits.md`, the
operations binding note and BASELINE were read at H. No probe was needed: K1.3's accepted test cited
under CLEANUP-K14-01 already pins the counterexample's behaviour.
