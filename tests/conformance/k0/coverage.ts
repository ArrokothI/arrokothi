/**
 * K0.2 public fixture — the K0 exit coverage map, at obligation granularity.
 *
 * 001's K0 exit requires that "each input/Outcome/Effect/wake/cancel boundary has one authoritative
 * owner and an observable acceptance/rejection result". K0.1 discharged the *owner* half in its §11
 * "001 K0 boundary → assertion map". K0.2 owes the *observable* half.
 *
 * **Why this file was rebuilt.** Round-1 review finding K02-R1-01: the previous version mapped one
 * row to a list of scenarios, and its test proved only that each row number pointed at a scenario
 * that existed. That is not coverage. Several §11 rows state *several* distinguishing obligations in
 * one cell — row 1 has a replay half and a conflict half, row 2 has three separate identity claims,
 * row 5 has seven lettered sub-parts — and a row could be marked covered while most of what it
 * requires went untested. Exactly that happened.
 *
 * So the unit here is the **obligation**, not the row, and every obligation must carry either:
 *   - a scenario, a specific step, and at least one *counterexample* — a violating transcript that a
 *     candidate getting this obligation wrong would produce, which the oracle must reject; or
 *   - a corpus-level check, for the negative obligations that are about the fixture as a whole; or
 *   - an explicit assignment to another packet, with the reason it cannot be observed at K0.
 *
 * `coverage.test.ts` enforces all of that mechanically, including that the named step exists and that
 * the named counterexamples exist, target the right scenario, and are actually rejected.
 */

/** Where an obligation's observability comes from. */
export type ObligationEvidence =
  | {
      readonly kind: "scenario";
      readonly scenario: string;
      /** Index into that scenario's steps — the step at which the obligation becomes observable. */
      readonly stepIndex: number;
      /** Violation IDs from `candidate.ts` that a candidate violating this obligation would produce. */
      readonly counterexamples: readonly string[];
    }
  | {
      readonly kind: "corpus";
      /** The test that enforces it across the whole fixture corpus. */
      readonly test: string;
      readonly note: string;
    }
  | {
      readonly kind: "assigned";
      readonly packet: string;
      readonly reason: string;
    };

export interface BoundaryObligation {
  /** Stable ID: the §11 row, then a letter per distinguishing obligation within it. */
  readonly id: string;
  readonly row: number;
  /** The distinguishing obligation, as §11 states it. */
  readonly obligation: string;
  readonly evidence: ObligationEvidence;
}

export const BOUNDARY_ROWS: readonly { readonly row: number; readonly boundary: string; readonly owner: "Kernel" | "Kernel + Runtime/Driver" }[] = [
  { row: 1, boundary: "Creation/input ingress accepted IDs and receipts", owner: "Kernel" },
  { row: 2, boundary: "Activation dispatch intent", owner: "Kernel" },
  { row: 3, boundary: "Outcome acceptance; duplicate and conflicting Outcome behavior", owner: "Kernel" },
  { row: 4, boundary: "Effect intents", owner: "Kernel" },
  { row: 5, boundary: "Any-of wait correlation, subscription-only input wait, wait-generation identity, eligible batch accounting, wait deadlines", owner: "Kernel" },
  { row: 6, boundary: "Wake and Event acceptance during computation", owner: "Kernel" },
  { row: 7, boundary: "Cancellation ordering", owner: "Kernel" },
  { row: 8, boundary: "Terminal obligations; completion responsibility", owner: "Kernel" },
  { row: 9, boundary: "Checkpoint forms; progress compatibility", owner: "Kernel + Runtime/Driver" },
  { row: 10, boundary: "Local policy ordering and freshness profile", owner: "Kernel" },
];

export const K0_OBLIGATIONS: readonly BoundaryObligation[] = [
  // -- Row 1: creation/input ingress ----------------------------------------
  {
    id: "R1-a",
    row: 1,
    obligation: "A create replayed with the same request key returns the same Execution ID and receipt.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 1, counterexamples: ["identity-create/retry-mints-a-second-receipt"] },
  },
  {
    id: "R1-b",
    row: 1,
    obligation: "A create with the same key but different content is rejected as a conflict, never silently accepted as an edit.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 2, counterexamples: ["identity-create/same-key-different-content-applied-as-an-edit"] },
  },

  // -- Row 2: Activation dispatch intent ------------------------------------
  {
    id: "R2-a",
    row: 2,
    obligation: "Two semantically different dispatches never carry the same Activation ID.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 6, counterexamples: ["identity-activation/new-exchange-reuses-the-resolved-activation-id"] },
  },
  {
    id: "R2-b",
    row: 2,
    obligation: "A dispatch pins one finite, enumerable Event batch that a later Outcome can be checked against exactly.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 3, counterexamples: ["k0-trace/late-arrival-joins-the-pinned-batch"] },
  },
  {
    id: "R2-c",
    row: 2,
    obligation: "An authorized takeover of a still-unresolved exchange advances the writer epoch under the same Activation ID rather than minting a new one (ID-9 cases 2-3).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 4, counterexamples: ["identity-activation/takeover-mints-a-new-activation-id"] },
  },

  // -- Row 3: Outcome acceptance --------------------------------------------
  {
    id: "R3-a",
    row: 3,
    obligation: "An exact duplicate of an already-accepted Outcome returns the original receipt with no re-dispatch of anything.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 3, counterexamples: ["control-duplicate/replay-re-runs-acceptance"] },
  },
  {
    id: "R3-b",
    row: 3,
    obligation: "A same-identity, different-content submission is rejected, not merged.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 4, counterexamples: ["control-duplicate/conflict-merged-into-accepted-state"] },
  },
  {
    id: "R3-c",
    row: 3,
    obligation: "A failure partway through acceptance leaves zero partial state: no progress, no Effect intent, no acknowledgment.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 2, counterexamples: ["envelope/valid-prefix-kept-when-a-later-member-is-malformed"] },
  },

  // -- Row 4: Effect intents -------------------------------------------------
  {
    id: "R4-a",
    row: 4,
    obligation: "An Outcome proposing an Effect is rejected at whole-envelope validation with a recorded reason, before any Effect intent, ID or proposal-key binding exists; the rest of that Outcome is also rejected, not silently split.",
    evidence: {
      kind: "scenario",
      scenario: "effect-refusal-and-sink-attribution",
      stepIndex: 2,
      counterexamples: ["effect-refusal/rest-of-the-outcome-silently-split", "effect-refusal/refusal-claimed-while-the-sink-was-called"],
    },
  },

  // -- Row 5: waits, generations, batch accounting, deadlines ----------------
  {
    id: "R5-a",
    row: 5,
    obligation: "(a) Well-formedness is structural: a declaration with both lists empty is malformed, and a deadline does not rescue it.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 3, counterexamples: ["envelope/structurally-empty-wait-registered-because-it-has-a-deadline"] },
  },
  {
    id: "R5-b",
    row: 5,
    obligation: "(b) Ordinary application input is eligible only through a declared subscription; a dependency alternative matching it is inert.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 5, counterexamples: ["k0-trace/unsubscribed-input-wakes-the-execution"] },
  },
  {
    id: "R5-c",
    row: 5,
    obligation: "(c) Registration checks already-accepted unacknowledged Events, and is not skipped for an empty dependency list: no lost wake.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 3, counterexamples: ["control-stale-timer/lost-wake-on-empty-dependency-list"] },
  },
  {
    id: "R5-c2",
    row: 5,
    obligation: "(c) An already-due deadline is evaluated before persisting, so a past deadline is never persisted as live (B-7 path A).",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 6, counterexamples: ["subscription-deadline/past-deadline-persisted-as-a-live-wait"] },
  },
  {
    id: "R5-d",
    row: 5,
    obligation: "(d) Any eligible wake retires the registration and its generation; the Kernel keeps no per-alternative satisfied flag.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 6, counterexamples: ["k0-trace/wake-leaves-the-generation-live"] },
  },
  {
    id: "R5-e1",
    row: 5,
    obligation: "(e) Older ineligible backlog can never displace what the Execution was woken for, at any bound including 1 — B-6 species.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 7, counterexamples: ["k0-trace/backlog-displaces-the-wake"] },
  },
  {
    id: "R5-e2",
    row: 5,
    obligation: "(e) The same holds for the B-7 species, where the generation-correlated timeout Event is the mandatory member (W-8 case 6).",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 5, counterexamples: ["subscription-deadline/backlog-takes-the-slot-from-the-timeout"] },
  },
  {
    id: "R5-f1",
    row: 5,
    obligation: "(f) A timer naming a superseded generation is a no-op that retires nothing and creates no timeout Event.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 6, counterexamples: ["control-stale-timer/stale-generation-wakes-the-replacement-wait"] },
  },
  {
    id: "R5-f2",
    row: 5,
    obligation: "(f) A duplicate timer for an already-accepted expiry creates no second timeout Event, readiness or logical timeout.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 8, counterexamples: ["control-stale-timer/duplicate-timer-mints-a-second-timeout"] },
  },
  {
    id: "R5-f3",
    row: 5,
    obligation: "(f) An authenticated result Event is never generation-fenced and remains observable by a later wait that explicitly correlates to it.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 9, counterexamples: ["control-stale-timer/late-result-discarded-as-stale"] },
  },
  {
    id: "R5-g",
    row: 5,
    obligation: "(g) An Activation with only Runtime-local work outstanding creates no waitingFor record at all and simply stays RUNNING.",
    evidence: { kind: "scenario", scenario: "delayed-runtime-non-blocking", stepIndex: 4, counterexamples: ["delayed-runtime/unresolved-activation-reported-as-waiting"] },
  },

  // -- Row 6: Event acceptance during computation ----------------------------
  {
    id: "R6-a",
    row: 6,
    obligation: "An Event accepted while an Activation is in flight does not alter that Activation's already-pinned batch.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 3, counterexamples: ["k0-trace/late-arrival-joins-the-pinned-batch"] },
  },
  {
    id: "R6-b",
    row: 6,
    obligation: "An Event accepted while no wait generation is live — READY, RUNNING or terminal — creates no readiness; terminal ingress refuses new ordinary input.",
    evidence: { kind: "scenario", scenario: "control-completion-obligations", stepIndex: 4, counterexamples: ["terminal-ingress/late-input-queued-on-a-terminal-execution"] },
  },

  // -- Row 7: cancellation ordering ------------------------------------------
  {
    id: "R7-a",
    row: 7,
    obligation: "Cancellation acceptance first: the later Outcome is rejected with the cancellation/terminal-conflict reason; zero acknowledgment, progress, emissions, Effect intents or wait/deadline/next-state changes.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-progress-installed-with-next-state-suppressed"] },
  },
  {
    id: "R7-b",
    row: 7,
    obligation: "Exact retry returns the recorded rejection, never a manufactured acceptance receipt.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 4, counterexamples: ["control-cancel/exact-retry-manufactures-a-receipt"] },
  },
  {
    id: "R7-c",
    row: 7,
    obligation: "The cancellation control path reaches CANCELLED and its reserved Events receive B-5 disposition rather than acknowledgment.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 2, counterexamples: ["control-cancel/reserved-batch-acknowledged-instead-of-disposed"] },
  },
  {
    id: "R7-d",
    row: 7,
    obligation: "Outcome acceptance first: later cancellation orders against that state and cannot reopen accepted completion or failure.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 9, counterexamples: ["control-cancel/late-cancel-reopens-a-completed-execution"] },
  },

  // -- Row 8: terminal obligations -------------------------------------------
  {
    id: "R8-a",
    row: 8,
    // Round-2 finding K02-R2-01 narrowed this to what the protocol actually makes observable. The
    // obligation is that the completing envelope is not *accepted*; it is not that the Kernel expose a
    // completion-specific rejection reason. EF-1/EF-2 already mandate a whole-envelope refusal for any
    // K1 Outcome proposing an Effect, and §11 row 4 requires "a recorded, inspectable reason" without
    // fixing which one, so a candidate refusing on those grounds is conforming.
    obligation: "A completing Outcome carrying newly proposed Effects is not accepted: the Execution reaches no terminal state, the envelope is refused whole with a recorded reason, and nothing in it is committed.",
    evidence: {
      kind: "scenario",
      scenario: "control-completion-obligations",
      stepIndex: 2,
      counterexamples: ["completion/owned-work-proposed-in-the-completing-outcome-is-accepted", "completion/refused-envelope-partly-committed"],
    },
  },
  {
    id: "R8-b",
    row: 8,
    obligation: "A terminal Execution exposes B-5 disposition for every unacknowledged Event, rather than deleting it or treating it as processed.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 8, counterexamples: ["k0-trace/global-cursor-acknowledges-unmatched-input"] },
  },
  {
    id: "R8-b2",
    row: 8,
    obligation: "That disposition includes the reserved batch of a cancellation loser under CX-6; a rejected losing Outcome never acknowledges that batch.",
    evidence: {
      kind: "scenario",
      scenario: "control-cancel-versus-complete",
      stepIndex: 2,
      counterexamples: ["control-cancel/reserved-batch-acknowledged-instead-of-disposed"],
    },
  },
  {
    id: "R8-c",
    row: 8,
    obligation: "A *previously owned* required Effect or child obligation must be settled, or explicitly transferred or abandoned under policy, before completion is accepted.",
    evidence: {
      kind: "assigned",
      packet: "K2.4",
      reason:
        "No previously owned obligation can exist while K1 refuses Effects outright (EF-1/EF-2), so this clause has no observable K0 case. CX-3 says so in terms: 'K1 without Effects satisfies this trivially (no Effects exist yet to be unaccounted-for); K2 is where the check becomes non-trivial.' R8-a observes the clause that *is* reachable now — work proposed in the completing Outcome itself. Fabricating owned work at K0 would require inventing state the protocol says cannot exist.",
    },
  },

  // -- Row 9: progress compatibility -----------------------------------------
  {
    id: "R9-a",
    row: 9,
    obligation: "Resuming against unavailable compatible code or resources yields an explicit hold/refusal, never a state that looks like normal restored computation.",
    evidence: { kind: "scenario", scenario: "control-missing-checkpoint-code", stepIndex: 4, counterexamples: ["control-missing-checkpoint/fresh-state-presented-as-restored"] },
  },

  // -- Row 10: local policy ordering -----------------------------------------
  {
    id: "R10-a",
    row: 10,
    obligation: "A policy check against just-accepted local state reads that exact write with no staleness window.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-progress-installed-with-next-state-suppressed"] },
  },
  {
    id: "R10-b",
    row: 10,
    obligation: "No K0/K1 document or test asserts an instantaneous remote-revocation guarantee.",
    evidence: {
      kind: "corpus",
      test: "coverage.test.ts: 'no part of the fixture claims a remote-revocation freshness guarantee'",
      note: "This is a negative obligation about the corpus, so it is enforced by scanning the fixture and its specification rather than by a scenario step. LP-2 makes the negative the whole decision at K0/K1: there is no remote-mediated action to revoke yet.",
    },
  },
];
