/**
 * K0.2 public fixture — the K0 exit coverage map.
 *
 * 001's K0 exit requires that "each input/Outcome/Effect/wake/cancel boundary has one authoritative
 * owner and an observable acceptance/rejection result". K0.1 discharged the *owner* half in its §11
 * "001 K0 boundary → assertion map", which enumerates ten boundaries. K0.2 owes the *observable*
 * half: every one of those ten rows must be watched by at least one scenario in this fixture.
 *
 * This table is checked mechanically by `coverage.test.ts`, so a scenario cannot be deleted or
 * renarrowed without the gap becoming a test failure.
 */

export interface BoundaryRow {
  readonly row: number;
  readonly boundary: string;
  readonly owner: "Kernel" | "Kernel + Runtime/Driver";
  /** Scenario IDs that make this boundary observable. */
  readonly observedBy: readonly string[];
  /** How this fixture makes the acceptance/rejection result observable, rather than merely asserted. */
  readonly observable: string;
}

export const K0_BOUNDARY_COVERAGE: readonly BoundaryRow[] = [
  {
    row: 1,
    boundary: "Creation/input ingress accepted IDs and receipts",
    owner: "Kernel",
    observedBy: ["k0-trace"],
    observable: "a create retried under the same caller-scoped request key returns the original Execution and receipt, adds no second queued input and advances no revision",
  },
  {
    row: 2,
    boundary: "Activation dispatch intent",
    owner: "Kernel",
    observedBy: ["k0-trace", "delayed-runtime-non-blocking"],
    observable: "dispatch pins a finite enumerable batch that a later arrival cannot join, and a delayed unresolved Activation neither blocks another Execution nor becomes a Kernel-visible wait",
  },
  {
    row: 3,
    boundary: "Outcome acceptance; duplicate and conflicting Outcome behavior",
    owner: "Kernel",
    observedBy: ["control-duplicate-conflicting-outcome"],
    observable: "exact duplicate replays the original receipt with no second revision or emission; a same-identity different-content submission is a recorded rejection with zero mutation",
  },
  {
    row: 4,
    boundary: "Effect intents",
    owner: "Kernel",
    observedBy: ["effect-refusal-and-sink-attribution"],
    observable: "an Outcome proposing an Effect is rejected whole at envelope validation, and the independent sink ledger records zero attempts",
  },
  {
    row: 5,
    boundary: "Any-of wait correlation, subscription-only input wait, wait-generation identity, eligible batch accounting, wait deadlines",
    owner: "Kernel",
    observedBy: ["k0-trace", "control-stale-timer-and-lost-wake"],
    observable: "a subscription-only wait is registered, unrelated input stays inert and queued, the subscribed input wakes, backlog cannot displace the wake at bound 1, an already-accepted eligible result is found at registration, and a superseded generation's timer is a no-op",
  },
  {
    row: 6,
    boundary: "Wake and Event acceptance during computation",
    owner: "Kernel",
    observedBy: ["k0-trace", "control-stale-timer-and-lost-wake"],
    observable: "an Event accepted while an Activation is unresolved leaves the pinned batch unchanged and creates no readiness",
  },
  {
    row: 7,
    boundary: "Cancellation ordering",
    owner: "Kernel",
    observedBy: ["control-cancel-versus-complete"],
    observable: "both orders are run: a fenced Outcome loses entirely and replays its recorded rejection, and an accepted completion stays terminal and replays its accepted receipt",
  },
  {
    row: 8,
    boundary: "Terminal obligations; completion responsibility",
    owner: "Kernel",
    observedBy: ["k0-trace", "control-cancel-versus-complete"],
    observable: "completion acknowledges only its reserved batch and every remaining unacknowledged Event receives an explicit terminal disposition, including a cancellation loser's reserved batch",
  },
  {
    row: 9,
    boundary: "Checkpoint forms; progress compatibility",
    owner: "Kernel + Runtime/Driver",
    observedBy: ["control-missing-checkpoint-code"],
    observable: "resuming with the pinned definition revision unavailable exposes an inspectable recovery hold while accepted progress and its revision survive unchanged",
  },
  {
    row: 10,
    boundary: "Local policy ordering and freshness profile",
    owner: "Kernel",
    observedBy: ["control-cancel-versus-complete"],
    observable: "the cancellation fence is enforced against the immediately preceding accepted local write, with no staleness window; no scenario asserts any remote-revocation freshness guarantee",
  },
];
