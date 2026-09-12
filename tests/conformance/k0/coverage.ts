/**
 * K0.2 public fixture — the K0 exit coverage map, at obligation granularity.
 *
 * 001's K0 exit requires that "each input/Outcome/Effect/wake/cancel boundary has one authoritative
 * owner and an observable acceptance/rejection result". K0.1 discharged the *owner* half in its §11
 * "001 K0 boundary → assertion map". K0.2 owes the *observable* half.
 *
 * **Why this file has been rebuilt twice.** Round-1 review finding K02-R1-01 found that mapping whole
 * §11 rows was not coverage at all: the test proved only that each row number pointed at a scenario
 * that existed, so a row could be marked covered while most of what it requires went untested.
 * Round-3 finding K02-R3-01 reopened that finding against the replacement, on a subtler version of the
 * same defect — the unit had become much finer but was still, in places, a prose grouping standing in
 * for several assertions that one counterexample could not all discriminate.
 *
 * The unit is now the **independently distinguishable assertion**, and the inventory below states the
 * test it was built with. See `K0_OBLIGATIONS` for what each evidence kind means and what deliberately
 * does not count. Round 14 adds `cited-decisions.ts`: every clause of every cited decision
 * reconciles to one owner here. Its source/inventory seals detect drift, not semantic completeness.
 *
 * `coverage.test.ts` checks the declared evidence mechanically, including that the named step exists and that
 * the named counterexamples exist, target the right scenario and step, and are actually rejected.
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
      /**
       * This assertion and another entry's are the same observable fact, named by two §11 rows that
       * approach it from different boundaries. The reference must name an entry carrying `scenario`
       * evidence, and `coverage.test.ts` enforces that.
       *
       * This is not a licence to reuse a neighbouring rule's transcript — round-3 review finding
       * K02-R3-01 rejected exactly that, where LP-1's freshness assertion was evidenced by a
       * cancellation-atomicity failure. The test is whether one implementation bug produces both
       * failures. Where it does, two transcripts differing only in prose would be worse evidence, not
       * better; where it does not, this kind must not be used.
       */
      readonly kind: "shared";
      readonly obligation: string;
      readonly reason: string;
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
  /** Stable ID: the §11 row, then a letter and index per independently distinguishable assertion. */
  readonly id: string;
  readonly row: number;
  /** The distinguishing obligation, as §11 states it. */
  readonly obligation: string;
  /**
   * Required when this entry's counterexamples move **more than one coupled field group** (see
   * `COUPLED_FIELD_GROUPS`): the written reason why one plausible bug produces all of them, so the
   * entry is one assertion rather than several sharing a transcript.
   *
   * Round-4 review finding K02-R4-02 is why this exists. The guard added in round 3 checks that no
   * counterexample defends two entries; it cannot see the opposite failure — one entry still holding
   * two independently violable assertions — and the review found four such entries. A field-group
   * signal catches that mechanically, and where the grouping is genuinely one act, saying so in
   * writing is what makes the claim reviewable instead of assumed.
   */
  readonly atomicity?: string;
  readonly evidence: ObligationEvidence;
}

/**
 * Observation fields that one accepted transaction *usually* writes together, used only as a review
 * heuristic to prompt a written justification — never as proof that within-group partial failures
 * are impossible.
 *
 * Round-5 review finding K02-R5-02: the prior revision presented this table as normative coupling
 * ("necessarily writes together") and used it as evidence that a broken implementation cannot
 * partially write one fact. That is circular: the entire purpose of these counterexamples is to
 * model implementations whose atomicity is broken, and a normative rule saying two facts commit
 * together is evidence that a partial-write candidate is *wrong*, not evidence that such a wrong
 * implementation is implausible. Statements like "that candidate is not plausible" need support
 * from the implementation boundary/writer model, not from the fact that the protocol requires an
 * atomic result.
 *
 * In particular, `waitEndedReadiness` and `acceptedDeadline` are deliberately *not* grouped with
 * `state`/`liveWaitGeneration`: earlier review rounds already proved candidates can violate those
 * facts separately (wake without retirement, retirement without wake, phantom readiness, accepted
 * deadline without a live wait), so grouping them would suppress exactly the field-crossing signal
 * that exposed those defects. `state` and `liveWaitGeneration` stay grouped only for W-3's
 * definitional link ("a live generation exists exactly while WAITING"): persisting WAITING *is*
 * persisting a live generation via the same wait-registration writer, and retiring one *is*
 * clearing the other via the same Event-acceptance/expiry writer (B-7 path B's canonical handling
 * of a current expiry, not scheduler storage). Even there, wake-vs-retire halves
 * are split wherever the writers differ (R5-f1a/f1a2, R5-d1/d2, R6-b1/b2, R7-a6b/c/d), and any entry
 * moving readiness or the accepted deadline alongside lifecycle must still justify why one specific
 * bug construction moves all of them. `waitEndedReadiness` and `acceptedDeadline` are each their
 * own group (via the `groupOf` fallback), so any entry moving them with anything else needs a note
 * or a split.
 *
 * Round-6 review finding K02-R6-01: the accepted deadline is Kernel semantic state (W-2 step 4
 * persists the live registration with its generation *and its deadline*; OA-4 commits it; OA-5/CX-6
 * forbid it for rejected Outcomes), never scheduler mechanism. A physical timer retained after the
 * logical wait retires is conforming W-3 behavior fenced as stale on arrival, and no observation
 * here may require its cancellation or removal.
 *
 * This table is still the thing a reviewer should disagree with if they disagree with the guard
 * below, but disagreeing with it now makes the guard *more* sensitive (more notes required), never
 * less. Every grouping cites the decision that couples the fields in conforming code.
 */
export const COUPLED_FIELD_GROUPS: readonly { readonly name: string; readonly fields: readonly string[]; readonly because: string }[] = [
  {
    name: "progress",
    fields: ["progress", "progressRevision"],
    because: "OA-4: accepted progress and the revision naming it are one commit. No boundary writes one without the other.",
  },
  {
    name: "disposition",
    fields: ["acknowledged", "queued", "terminalDispositions", "ingressRefused"],
    because:
      "B-1/B-4/B-5 give every accepted Event exactly one disposition at a time — queued, acknowledged, terminally disposed — and ingress refusal is the fourth answer for an Event never accepted at all. Moving an Event between them is one act; a transcript that acknowledges an Event necessarily also removes it from the queue.",
  },
  {
    name: "lifecycle",
    fields: ["state", "liveWaitGeneration"],
    because:
      "W-3: a live generation exists exactly while WAITING, via the same registration/retirement writer that moves the lifecycle. This groups only the definitional link, never readiness or the accepted deadline: B-6/B-7/B-8 commit readiness beside retirement via a separable writer, and W-2 step 4 persists the accepted deadline beside registration via another, so those stay ungrouped and any joint movement needs its own justification.",
  },
  {
    name: "activation",
    fields: ["activationId", "dispatchedBatch"],
    because: "ID-3 and B-1: an unresolved Activation and the batch it pinned exist together and are cleared together when the exchange resolves.",
  },
  {
    name: "answer",
    fields: ["receipt", "rejection"],
    because: "OA-2/OA-5: one submission yields exactly one of an acceptance receipt or a recorded rejection, so a transcript that manufactures one generally clears the other.",
  },
];

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


/**
 * The §11 assertion inventory.
 *
 * **One entry is one independently distinguishable assertion**, which is a stricter unit than either
 * of the two this file has used before. Round 1 mapped whole rows and could mark a row covered while
 * most of it went untested. Round 2 moved to "obligations", which was much finer but still sometimes
 * bundled several canonical clauses behind a single counterexample that exercised one of them.
 *
 * Round-3 review finding K02-R3-01 reopened K02-R1-01 on exactly that point, and the worksheet is
 * explicit about the unit: §11 row 5 opens "Each of these is **separately** observable". The test
 * applied here is therefore behavioural rather than editorial — **two clauses are separate assertions
 * when a plausible implementation can get one right and the other wrong**, because that is precisely
 * the candidate the oracle has to be able to fail. A takeover that keeps the Activation ID but does
 * not advance the epoch, a create that returns the right identity but ingests the input twice, a
 * duplicate timer whose Event creation is idempotent but whose readiness commit is not: each is one
 * real implementation getting half a cell right, and each now has its own evidence.
 *
 * Every entry carries exactly one of:
 *
 *   - `scenario` — a scenario, a step index, and at least one **counterexample**: a violating
 *     transcript a candidate breaking *this* assertion would produce, which the oracle must reject at
 *     that step. This is the only kind that counts as candidate-level evidence.
 *   - `shared` — this assertion and another entry's are the same observable fact reached from two §11
 *     rows. The reference must name an entry that itself carries scenario evidence. Used sparingly and
 *     only where the identity is real, never to borrow a neighbouring rule's transcript.
 *   - `corpus` — a negative obligation about the fixture as a whole, enforced by scanning it.
 *   - `assigned` — deferred to a named packet, with the governing source that permits the deferral.
 *
 * **What does not count**, each because round 1, 2 or 3 found it standing in for real evidence:
 * `forbids` prose (it fails no candidate), a green test of the fixture's own helper functions (it
 * shows the fixture agrees with the worksheet, not that a candidate is held to it), and a
 * counterexample belonging to a neighbouring rule (it fails candidates for something else).
 *
 * `coverage.test.ts` enforces all of that mechanically.
 */
export const K0_OBLIGATIONS: readonly BoundaryObligation[] = [
  // == Row 1: creation and input ingress =====================================
  {
    id: "R1-a1",
    row: 1,
    obligation: "A create replayed with the same request key returns the same Execution ID.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 1, counterexamples: ["identity-create/retry-mints-a-second-execution-id"] },
  },
  {
    id: "R1-a2",
    row: 1,
    obligation: "That replay returns the same receipt, rather than minting a second one for the same accepted create.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 1, counterexamples: ["identity-create/retry-mints-a-second-receipt"] },
  },
  {
    id: "R1-a3",
    row: 1,
    obligation: "That replay is one accepted create, not one identity with the initial input ingested twice.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 1, counterexamples: ["identity-create/retry-queues-the-initial-input-twice"] },
  },
  {
    id: "R1-b1",
    row: 1,
    obligation: "A create with the same key but different content is rejected as a conflict, with the conflict recorded rather than silently absorbed as a replay.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 2, counterexamples: ["identity-create/same-key-different-content-silently-treated-as-a-replay"] },
  },
  {
    "id": "R1-b2",
    "row": 1,
    "obligation": "ID-2: a rejected create conflict leaves the accepted input-reference sequence unchanged.",
    "evidence": {
      "kind": "scenario",
      "scenario": "identity-create-and-activation",
      "stepIndex": 2,
      "counterexamples": [
        "identity-create/same-key-different-content-applied-as-an-edit"
      ]
    }
  },
  {
    // Added by round-10 review finding K02-R10-03. ID-2 scopes input identity by authenticated
    // producer namespace + destination + producer request key. The prior fixture carried no
    // producer/caller dimension, so a candidate globally deduplicating raw key text passed everything.
    // Two different producers (`prod-a`, `prod-b`) reuse one raw key text (`req-shared`) for different
    // Executions; conformingly each is a fresh accepted create. Each half below is independently
    // violable — a global index can return the first Execution's ID while minting a fresh receipt, or
    // mint no fresh ID while reusing the first receipt — so ID and receipt get separate single-field
    // transcripts at the same step with distinct field sets. Preserves K02-R5-01: both collapse within
    // their own family (Execution ID is fixture-supplied laboratory data compared literally; receipts
    // use the receipt-family bijection), never across families.
    id: "R1-c1",
    row: 1,
    obligation: "Two different producers reusing the same raw request-key text do not collide: each gets its own Execution ID (ID-2).",
    evidence: { kind: "scenario", scenario: "identity-producer-scope", stepIndex: 1, counterexamples: ["identity-producer/global-dedup-collapses-execution-id"] },
  },
  {
    id: "R1-c2",
    row: 1,
    obligation: "Those two distinct accepted creates get distinct receipts: exact replay alone returns the same receipt, and distinct requests never collapse (ID-6/ID-7).",
    evidence: { kind: "scenario", scenario: "identity-producer-scope", stepIndex: 1, counterexamples: ["identity-producer/global-dedup-collapses-receipt"] },
  },
  {
    // Added by round-10 review finding K02-R10-03, re-deriving ID-6/ID-7 at the create boundary beyond
    // same-key replay (R1-a2) and cross-producer same-text distinctness (R1-c2). Different request keys
    // are different requests and never collapse onto one receipt, even when the Executions are otherwise
    // unrelated. The delayed-Runtime scenario already creates X (req-x) and Y (req-y) with distinct
    // receipts; the violating transcript collapses Y's onto X's while keeping its Execution ID correct.
    // Single answer-group field, so no atomicity note is owed.
    id: "R1-d1",
    row: 1,
    obligation: "Two creates under different request keys get different receipts: distinct accepted requests never collapse (ID-6/ID-7).",
    evidence: { kind: "scenario", scenario: "delayed-runtime-non-blocking", stepIndex: 1, counterexamples: ["identity-create/different-keys-collapse-onto-one-receipt"] },
  },
  {
    // The third half of the create receipt relation: a rejected conflict mints no new receipt (the field
    // retains the prior accepted receipt). R1-b1 owns the recorded rejection and R1-b2 owns no edit;
    // this owns the answer half — a candidate correctly recording the conflict while minting a fresh
    // receipt for the refused request. Single receipt-only move beside a correct `duplicate_conflict`
    // rejection, distinct from both halves above.
    id: "R1-b3",
    row: 1,
    obligation: "A same-key/different-content conflict mints no new receipt: the field retains the original accepted receipt beside the recorded rejection (ID-6).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 2, counterexamples: ["identity-create/conflict-mints-a-fresh-receipt"] },
  },

  {
    id: "R1-e1",
    row: 1,
    obligation: "Distinct producers at the same destination under the same raw request key have distinct input acceptance positions (ID-2).",
    evidence: { kind: "scenario", scenario: "identity-producer-scope", stepIndex: 5, counterexamples: ["input-identity/producer-omitted-drops-second-input"] },
  },
  {
    id: "R1-e2",
    row: 1,
    obligation: "Exact full-identity/content application replay retains one original acceptance position (ID-2, ID-6).",
    evidence: { kind: "scenario", scenario: "identity-producer-scope", stepIndex: 6, counterexamples: ["input-identity/exact-replay-appends-again"] },
  },
  {
    id: "R1-e3",
    row: 1,
    obligation: "Same application input identity with different content records a conflict (ID-2), never a successful replay.",
    evidence: { kind: "scenario", scenario: "identity-producer-scope", stepIndex: 7, counterexamples: ["input-identity/conflict-silently-replayed"] },
  },
  {
    "id": "R1-e4",
    "row": 1,
    "obligation": "ID-2: a rejected subsequent input conflict leaves the accepted input-reference sequence unchanged.",
    "evidence": {
      "kind": "scenario",
      "scenario": "identity-producer-scope",
      "stepIndex": 7,
      "counterexamples": [
        "input-identity/conflict-appends-input"
      ]
    }
  },
  {
    // Self-found while re-auditing row 1's cited decisions under round-13 review finding K02-R13-02's
    // reconstruction requirement, which asks that every cited-decision clause be owned, assigned or
    // explained rather than silently omitted. Rows are read from the decisions they cite (round-9
    // finding K02-R9-01), and row 1 cites ID-1, whose clause is about identity *after deletion*. Every
    // other row-1 entry comes from ID-2/ID-6/ID-7; this one had no entry at all, in either direction.
    // It is assigned rather than added: K0.2's command vocabulary has no deletion or garbage-collection
    // command, and inventing one to observe the clause would fabricate a boundary the released contract
    // does not have.
    id: "R1-f",
    row: 1,
    obligation: "ID-1: an Execution ID is never reissued to a new logical Execution even after the original is deleted or garbage-collected, so a store recycling primary keys must remap through a separate never-reused logical ID.",
    evidence: {
      kind: "assigned",
      packet: "K5.2",
      reason:
        "The clause is only observable across a deletion, and no K0.2 command deletes or garbage-collects an Execution: the vocabulary is create/ingress, dispatch/redelivery/takeover, Outcome submission, cancellation, timer delivery, recovery and inspection. A terminal Execution is not a deleted one — B-5 keeps its Events with recorded dispositions and terminal ingress refuses new input, both of which the corpus already observes — so nothing here reaches the state ID-1 constrains. 007 assigns deletion to K5.2 (Operations, upgrade and deletion: 'privacy deletion', 'deleted data explicitly disables affected recovery'), which is where a reissue could first be attempted and therefore first refused.",
    },
  },
  // == Row 2: Activation dispatch intent =====================================
  {
    id: "R2-a",
    row: 2,
    obligation: "Two semantically different dispatches never carry the same Activation ID.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 9, counterexamples: ["identity-activation/new-exchange-reuses-the-resolved-activation-id"] },
  },
  {
    id: "R2-b1",
    row: 2,
    obligation: "A dispatch pins one finite, enumerable Event batch: an Event accepted afterwards cannot join it.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 3, counterexamples: ["k0-trace/late-arrival-joins-the-pinned-batch"] },
  },
  {
    id: "R2-b2",
    row: 2,
    obligation: "A later Outcome can be checked against that batch exactly — no less: an accepted Outcome acknowledges the entire pinned batch, not the subset it happened to reference.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 9, counterexamples: ["envelope/accepted-outcome-leaves-its-batch-unacknowledged"] },
  },
  {
    id: "R2-b3",
    row: 2,
    obligation: "And no more: acknowledgment stops at the pinned batch and does not run past it into Events that were never reserved.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 4, counterexamples: ["k0-trace/acknowledgment-runs-past-the-pinned-batch"] },
  },
  {
    id: "R2-c1",
    row: 2,
    obligation: "An authorized takeover of a still-unresolved exchange keeps the Activation ID rather than minting a new one (ID-9 cases 2-3).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 6, counterexamples: ["identity-activation/takeover-mints-a-new-activation-id"] },
  },
  {
    id: "R2-c2",
    row: 2,
    obligation: "That takeover advances the writer epoch, which is the other half of ID-9 and is what fences the superseded writer.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 6, counterexamples: ["identity-activation/takeover-leaves-the-writer-epoch-unchanged"] },
  },
  {
    // Added by round-10 review finding K02-R10-02. ID-3's takeover rule is three facts, not two:
    // same Activation ID (R2-c1), advanced writer epoch (R2-c2), and the same immutable exchange
    // input — "it does not invent new mailbox content under it" (execution-protocol.md). The prior
    // schedule had no deterministic new mailbox content for a wrong repin to include, so a candidate
    // keeping the ID and advancing the epoch correctly while repinning the batch to cover in-2 passed.
    // `in-2` is accepted after dispatch but before takeover and stays queued-but-never-reserved, so the
    // conforming takeover keeps `dispatchedBatch: ["in-1"]` and the violating transcript keeps the
    // correct ID and epoch while moving only the batch to include it. Single activation-group field,
    // so no atomicity note is owed.
    id: "R2-c3",
    row: 2,
    obligation: "That takeover keeps the same immutable exchange input: the pinned batch stays ['in-1'] and cannot be repinned to include mailbox content (in-2) accepted after dispatch (ID-3).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 6, counterexamples: ["identity-activation/takeover-repins-the-pinned-batch"] },
  },
  {
    // Added by round-10 review finding K02-R10-02. §11 row 2 explicitly invokes ID-9 cases 2-3, so
    // row 2 needs an honest owner for case 3's stale old-epoch rejection — the same observable fact
    // R10-a/LP-1 already evidences at the next step (old epoch submitted immediately after takeover is
    // rejected as `stale_exchange` with no progress, because the epoch no longer matches, not because
    // the Activation ID is wrong). One implementation bug (a stale read admitting the superseded epoch)
    // produces both failures: accepting the stale writer violates LP-1's no-staleness-window rule and
    // ID-9 case 3's epoch-fencing rule at once. Two transcripts differing only in prose would be worse
    // evidence, not better, and a second transcript moving the same fields at the same step is
    // forbidden by the no-shared-field-set guard — so this is a justified `shared` link, not a reuse
    // of a neighbouring rule's transcript.
    id: "R2-c4",
    row: 2,
    obligation: "A stale old-epoch Outcome submitted after takeover is rejected as a stale-writer conflict because the epoch no longer matches, not because the Activation ID is wrong (ID-9 case 3).",
    evidence: {
      kind: "shared",
      obligation: "R10-a",
      reason:
        "The same observable fact as LP-1's freshness assertion, reached from row 2's identity boundary: the old writer's Outcome for the still-correct Activation ID at its superseded epoch must be rejected with `stale_exchange` and commit nothing, with the epoch staying advanced. The takeover write in the previous step is the write both rows read; admitting the stale epoch violates both decisions at once, so one transcript is the honest evidence for both.",
    },
  },
  {
    // Added by round-10 review finding K02-R10-02. ID-9 case 1 / ID-3 ordinary dispatch redelivery was
    // unrepresentable: the vocabulary had `dispatch` (a new exchange) and `takeover` (a new attempt at
    // the same exchange) but no "the same attempt delivered again". `redeliver_dispatch` is the
    // smallest command that can say it, and the schedule places it after a late arrival (in-2) so a
    // wrong repin has deterministic content to include. Each of the three preserved facts is
    // independently violable — a redelivery can mint a new ID while keeping the epoch and batch, bump
    // the epoch while keeping the ID and batch, or repin the batch while keeping the ID and epoch —
    // so each gets its own single-field transcript at the same step, with distinct field sets.
    id: "R2-d1",
    row: 2,
    obligation: "Ordinary redelivery of the same unresolved dispatch preserves the Activation ID: it is the identical in-flight exchange, not a new one (ID-9 case 1 / ID-3).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 5, counterexamples: ["identity-activation/redelivery-mints-a-new-activation-id"] },
  },
  {
    id: "R2-d2",
    row: 2,
    obligation: "That redelivery preserves the writer epoch as well: only an authenticated takeover advances it, never an ordinary retry (ID-4).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 5, counterexamples: ["identity-activation/redelivery-advances-the-writer-epoch"] },
  },
  {
    id: "R2-d3",
    row: 2,
    obligation: "That redelivery preserves the pinned immutable input too: delivery retries preserve dispatched input and cannot pick up later mailbox content (in-2).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 5, counterexamples: ["identity-activation/redelivery-repins-the-pinned-batch"] },
  },

  // == Row 3: Outcome acceptance, duplicates and conflicts ===================
  {
    id: "R3-a1",
    row: 3,
    obligation: "An exact duplicate of an already-accepted Outcome returns the original receipt.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 3, counterexamples: ["control-duplicate/replay-returns-a-fresh-receipt"] },
  },
  {
    id: "R3-a2",
    row: 3,
    obligation: "That duplicate re-runs no part of the acceptance transaction: the accepted progress revision does not advance.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 3, counterexamples: ["control-duplicate/replay-re-runs-acceptance"] },
  },
  {
    id: "R3-a3",
    row: 3,
    obligation: "Nor does it re-publish what the original accepted: an emission accepted once is emitted once, however many times the Outcome is delivered.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 3, counterexamples: ["control-duplicate/replay-republishes-the-emission"] },
  },
  {
    // Split by round-5 review finding K02-R5-02. The prior entry bundled "rejected" and "not merged"
    // behind one transcript that did both, with a note claiming a candidate recording the conflict
    // *and* merging it is "not plausible". That note is false: OA-5 exists precisely to prohibit
    // rejected Outcomes leaking partial state, and this packet already models the same partial-writer
    // shape for malformed envelopes, cancellation and completion. The conflict check (record the
    // rejection) and the progress writer (install accepted state) are different writers; a progress
    // writer that ran too early leaves the conflicting progress installed while the rejection is
    // correctly recorded. Each half now has its own transcript.
    id: "R3-b",
    row: 3,
    obligation: "A same-identity, different-content submission is rejected with a recorded duplicate_conflict rejection, not silently absorbed as a replay.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 4, counterexamples: ["control-duplicate/conflict-silently-absorbed-without-rejection"] },
  },
  {
    id: "R3-b2",
    row: 3,
    obligation: "Even when that conflict rejection is correctly recorded, none of the conflicting content is merged into accepted state.",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 4, counterexamples: ["control-duplicate/conflict-merged-into-accepted-state"] },
  },
  {
    id: "R3-c1",
    row: 3,
    obligation: "A failure partway through acceptance leaves no progress, including progress that was itself valid in the refused envelope.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 2, counterexamples: ["envelope/valid-prefix-kept-when-a-later-member-is-malformed"] },
  },
  {
    id: "R3-c1b",
    row: 3,
    obligation: "It leaves no accepted emissions either, including a valid prefix of the emission list.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 2, counterexamples: ["envelope/valid-prefix-emission-kept-when-a-later-member-is-malformed"] },
  },
  {
    id: "R3-c2",
    row: 3,
    obligation: "It leaves no acknowledgment: a rejected envelope does not consume its reserved batch.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 2, counterexamples: ["envelope/rejected-envelope-acknowledges-its-batch"] },
  },
  {
    // Added by round-9 review finding K02-R9-01, which correctly overrode this packet's round-9
    // reading. §11 row 3's parenthetical lists progress, Effect intent and acknowledgment, and C9
    // treated that list as exhaustive, leaving the deadline clause to row 7 alone. The governing
    // decision the row cites is broader: OA-5 states that a rejected Outcome creates no Effects,
    // acknowledges no Events, commits no progress, accepts no emissions and creates **no
    // wait/deadline/readiness/next-state transition**, and a malformed envelope is a rejected
    // Outcome. So the deadline clause is stated for this boundary too, and it is independently
    // violable: the transcript at step 4 keeps the correct `malformed_envelope` rejection, RUNNING,
    // the null live generation and the pinned Activation/batch, and moves only `acceptedDeadline`.
    //
    // R7-a6c is *not* this assertion. It is the same fact at the CX-6 cancellation/terminal-conflict
    // fence, a different rejection writer — which is exactly the writer/boundary test round 8 applied
    // to B-6's two paths. A candidate ordering its deadline commit after envelope validation but
    // before the terminal-conflict check gets this one right and R7-a6c's wrong.
    id: "R3-c4",
    row: 3,
    obligation: "It leaves no accepted deadline either (OA-5): a malformed `await` carrying a deadline is a rejected Outcome, so no deadline fact survives it even when the rejection, the lifecycle, the live generation and the pinned Activation are all correct.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 4, counterexamples: ["envelope/malformed-wait-leaks-its-accepted-deadline"] },
  },
  {
    // Added by round-10 review finding K02-R10-01, completing OA-5's whole-envelope-validation family
    // beyond R3-c4's deadline member. OA-5 forbids not only progress/emissions/acknowledgment/Effect
    // intent/deadline but also wait, readiness and next-state transitions at a correctly rejected
    // Outcome. Each remaining partial is independently plausible via its own writer running before or
    // outside whole-envelope validation, so each gets its own candidate-level owner at the schedule
    // that discriminates it honestly. None reuses the CX-6 cancellation writer (R7-a6/a6b/a6d), which
    // is a different fence: a candidate ordering its commit between the two fences gets exactly one
    // of each pair right.
    id: "R3-c5",
    row: 3,
    obligation: "It installs no wait/lifecycle transition either (OA-5): a malformed `await` correctly refused with `malformed_envelope` leaves the Execution RUNNING with no live generation, even though the refused declaration names one.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 4, counterexamples: ["envelope/malformed-await-installs-a-wait"] },
  },
  {
    id: "R3-c6",
    row: 3,
    obligation: "It commits no next-state transition either (OA-5): a `continue` envelope correctly refused for a duplicate emission key leaves the Execution RUNNING with its Activation still pinned, rather than moving to READY.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 2, counterexamples: ["envelope/rejected-continue-commits-its-next-state"] },
  },
  {
    // The readiness-only half needs its own schedule because every other rejected await in this
    // scenario is malformed or absent: arming a readiness for g-bad/g-bad-2/g-bad-3 or for no wait at
    // all would model a doubly-wrong candidate (readiness for a generation that never existed) rather
    // than the independently plausible partial — a readiness writer leaking for a valid generation
    // while registration, deadline and lifecycle correctly stay refused. The new step submits a valid
    // subscription-only wait (g-good) inside an envelope malformed for an unrelated reason (duplicate
    // emission). Round 11 inserts cont-1 outside the reserved batch: correct W-2 step 2
    // would find that eligible Event and end g-good under B-6 path A, so only readiness leaks. `waitEndedReadiness` is deliberately ungrouped, so no
    // atomicity note is owed; bundling it with lifecycle or deadline to avoid another schedule is
    // exactly what this entry exists to forbid.
    id: "R3-c7",
    row: 3,
    obligation: "It leaves no wait-ended readiness behind either (OA-5): even a valid wait named in a refused envelope creates no readiness, so a correct `malformed_envelope` refusal with no wait, no deadline and RUNNING still has empty readiness.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 8, counterexamples: ["envelope/valid-wait-in-malformed-envelope-arms-readiness"] },
  },
  {
    // Added by round-10 review finding K02-R10-03, re-deriving ID-6/ID-7 at the Outcome boundary. Exact
    // replay returns the same receipt (R3-a1); distinct accepted Outcomes never collapse (this entry);
    // rejected Outcomes mint none (R3-b3/R3-c8 below). The K0 trace already accepts act-1 (receipt
    // outcome:act-1) and later act-2 (receipt outcome:act-2) with distinct tokens; the violating
    // transcript collapses the second onto the first while keeping everything else correct. Single
    // answer-group field, distinct from R8-b's disposition pair and R8-b1b's disposition singleton at
    // the same step.
    id: "R3-d1",
    row: 3,
    obligation: "Two different accepted Outcomes get different receipts: distinct accepted boundaries never collapse onto one receipt (ID-6/ID-7).",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 8, counterexamples: ["k0-trace/second-acceptance-collapses-onto-the-first-receipt"] },
  },
  {
    // The rejected-mints-none half for the duplicate-conflict writer: the conflict is correctly recorded
    // as `duplicate_conflict` with no progress merged (R3-b/R3-b2), but the answer writer mints a fresh
    // receipt for the refused request beside it. Single receipt-only move, distinct from the rejection
    // half (rejection) and the merge half (progress group) at the same step.
    id: "R3-b3",
    row: 3,
    obligation: "A same-identity/different-content conflict mints no new receipt: the field retains the original accepted receipt beside the recorded rejection (ID-6).",
    evidence: { kind: "scenario", scenario: "control-duplicate-conflicting-outcome", stepIndex: 4, counterexamples: ["control-duplicate/conflict-mints-a-fresh-receipt"] },
  },
  {
    // The rejected-mints-none half for the whole-envelope-validation writer (different writer from the
    // conflict check above): a malformed envelope correctly refused with `malformed_envelope`, no
    // progress, no emissions and no acknowledgment, but a fresh Outcome receipt minted beside it.
    // Single receipt-only move at step 2, distinct from progress/emissions/acknowledgment/next-state
    // halves there. The cancellation fence's receipt half (R7-a9) and the stale writer's (R10-a2) are
    // different fences and get their own owners below.
    id: "R3-c8",
    row: 3,
    obligation: "A malformed envelope mints no new receipt either: the field retains the prior accepted receipt beside the recorded `malformed_envelope` rejection (ID-6).",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 2, counterexamples: ["envelope/malformed-envelope-mints-a-fresh-receipt"] },
  },
  {
    id: "R3-c3",
    row: 3,
    obligation: "It leaves no Effect intent: a partway acceptance failure creates no accepted intent or proposal-key binding.",
    evidence: {
      kind: "shared",
      obligation: "R4-a2",
      reason:
        "The same assertion as row 4's, reached from the other row. At K1 the only envelope that could leave an Effect intent behind is one that proposed an Effect, and that envelope is row 4's subject — EF-1/EF-2 refuse every such Outcome at validation, and no other Outcome field can mint an intent. Giving this a separate transcript would mean inventing an envelope whose partway failure creates an intent the protocol says cannot be created, so the evidence lives where the case is real.",
    },
  },

  // == Row 4: Effect intents =================================================
  {
    id: "R4-a1",
    row: 4,
    obligation: "An Outcome proposing an Effect is rejected at whole-envelope validation with a recorded, inspectable reason, rather than dropped silently.",
    evidence: { kind: "scenario", scenario: "effect-refusal-and-sink-attribution", stepIndex: 2, counterexamples: ["effect-refusal/refused-without-a-recorded-reason"] },
  },
  {
    id: "R4-a2",
    row: 4,
    obligation: "That rejection happens before any Effect intent, Effect ID or proposal-key binding exists, and none is left behind.",
    evidence: { kind: "scenario", scenario: "effect-refusal-and-sink-attribution", stepIndex: 2, counterexamples: ["effect-refusal/intent-and-proposal-key-bound-before-refusal"] },
  },
  {
    id: "R4-a3",
    row: 4,
    obligation: "The rest of that Outcome is rejected too, never silently split into the part K1 supports and the part it does not.",
    atomicity:
      "One bug construction: an envelope splitter strips the Effect array before validation and hands the remainder to the Outcome-acceptance writer, which then commits progress and emission together via the one OA-4 transaction it runs for any accepted envelope. The two moves are one downstream commit after one upstream strip. A splitter that strips and then partially commits the remainder (progress without emission or vice versa) would be splitter plus committer-atomicity failures combined; committer partials for the shared OA-3 writer are separately evidenced by R3-c1/R3-c1b at the whole-envelope step.",
    evidence: { kind: "scenario", scenario: "effect-refusal-and-sink-attribution", stepIndex: 2, counterexamples: ["effect-refusal/rest-of-the-outcome-silently-split"] },
  },
  {
    id: "R4-a4",
    row: 4,
    obligation: "Nothing is physically attempted against the outside world, independently of what the candidate reports about itself.",
    evidence: { kind: "scenario", scenario: "effect-refusal-and-sink-attribution", stepIndex: 2, counterexamples: ["effect-refusal/refusal-claimed-while-the-sink-was-called"] },
  },
  {
    "id": "R4-b1",
    "row": 4,
    "obligation": "ID-6/ID-7: Effect admission receipt identifies its own acceptance boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "EF-1/EF-2 refuse every K1 Outcome proposing an Effect at whole-envelope validation (OA-3) before any intent, ID or proposal-key binding exists, so no Effect intent is ever created for admission to accept. Admission (kernel.md Acceptance/atomicity: current policy/consent decision and attempt intent under current dispatch ownership) is a K2-introduced boundary that does not exist yet. 007 assigns concrete admission to K2.2."
    }
  },
  {
    "id": "R4-b2",
    "row": 4,
    "obligation": "ID-6/ID-7: Effect settlement receipt identifies its own acceptance boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "Same K1 refusal as R4-b1: with no admitted intent there is nothing to settle, and settlement (authenticated evidence, action state, result Event and recoverable readiness) never runs. 007 assigns trusted attempt evidence, settlement and required-work accounting to K2.3. Fabricating a settlement receipt in K0.2 would require inventing the admitted intent it settles."
    }
  },
  {
    "id": "R4-b3",
    "row": 4,
    "obligation": "ID-6/ID-7: child operation receipt identifies its own acceptance boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.1",
      "reason": "K1 has no child delegation or addressed-messaging surface; composition (child-link, structural budget, event router, input requests) is owned by K4, starting with durable children/delegation in K4.1 and addressed messages/replies in K4.2. Minting a child/message receipt in K0.2 would fabricate the composition operation it evidences. Row 8 separately assigns required child accounting to R8-d/K4.1; R8-c/K2.3 owns required Effects. Neither has an observable owned-work surface in K0.2."
    }
  },

  // == Row 5(a): wait record shape and structural well-formedness ============
  {
    id: "R5-a1",
    row: 5,
    obligation: "(a) Rule 1: a declaration with both lists empty is malformed.",
    atomicity:
      "One bug construction: the well-formedness writer misclassifies the empty declaration as well-formed, and then the correct Outcome-acceptance writer runs — persisting WAITING with its live generation via the registration writer, resolving the exchange (clearing activation/batch) via the dispatch writer, and returning a receipt instead of a rejection via the answer writer in the one OA-4 commit. Recording a rejection *and* registering would require the validator to say malformed and well-formed in the same step (two opposite decisions, not one). Committer partials that record correctly but leak progress are a different writer (commit ordering) evidenced for the shared OA-3 writer by R3-c1/R3-c1b.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 3, counterexamples: ["envelope/bare-empty-wait-registered"] },
  },
  {
    id: "R5-a1b",
    row: 5,
    obligation: "(a) Rule 1: a deadline does not rescue it — the case worksheet revision 9 answered two ways, where well-formedness is read as 'can this wait end'.",
    atomicity:
      "One bug construction, as in R5-a1: the validator reads well-formedness as 'can this wait end', accepts the empty declaration because it carries a deadline, and the same downstream acceptance writer persists WAITING, resolves the exchange and returns a receipt. What distinguishes this entry from R5-a1 is the *record submitted* (deadline-bearing empty), not the downstream writers, which are the same validation-plus-acceptance pair.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 4, counterexamples: ["envelope/structurally-empty-wait-registered-because-it-has-a-deadline"] },
  },
  {
    id: "R5-a2",
    row: 5,
    obligation: "(a) Rule 2: every present alternative must supply at least one of the three selector fields; a match-everything alternative is invalid, not a shorthand.",
    atomicity:
      "One bug construction, as in R5-a1: the grammar writer checks only rule 1 (list counts) and passes the selector-less alternative, then the same downstream acceptance writer persists, resolves and receipts. A validator that passes *and* rejects in one step would be two decisions; committer partials are the separate OA-3 writer covered by R3-c1/R3-c1b.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 5, counterexamples: ["envelope/match-everything-alternative-registered"] },
  },
  {
    id: "R5-a3",
    row: 5,
    obligation: "(a) Rule 2: an empty supplied kind set is malformed, neither a selector that matches nothing nor a spelling of an absent field.",
    atomicity:
      "One bug construction, as in R5-a1: the kind-set writer applies set-membership vacuously and reads `kinds: []` as valid-but-inert, then the same downstream acceptance writer persists, resolves and receipts. The empty-set-vs-absent distinction is the validator's; once it misclassifies, the downstream moves follow from that one decision.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 6, counterexamples: ["envelope/empty-kind-set-treated-as-matches-nothing"] },
  },
  {
    id: "R5-a4",
    row: 5,
    obligation: "(a) Rule 3: every present declared subscription must be a declared subscription identity — the property, not any particular spelling of it.",
    evidence: {
      kind: "assigned",
      packet: "K1.3",
      reason:
        "W-9's closing *Left open* note assigns this by name: 'the exact spelling of a declared subscription identity (whether a subscription names the input label directly or an application-declared subscription name that resolves to one) — K1.3 owns that, and W-1 constrains only that it is finite, declarative and compared by equality.' W-1 rule 3 likewise 'fixes only that the entry *is* such an identity'. In this fixture's representation a subscription identity is a `string`, so every submittable value is finite, declarative and equality-compared by construction, and no value can fail the property W-1 actually states. Round-4 review finding K02-R4-01: C4 manufactured a negative case by declaring the empty string invalid, which is a spelling decision K1.3 owns and which would have failed a conforming candidate whose representation admits it. Writing a real negative case requires first choosing the representation, which is the assigned work. Note this is an assignment of the *concrete representation*, not of the property: R5-a5 and R5-a6 still observe what W-1 fixes about subscriptions independently of spelling — that a subscription-only wait is first-class, and that eligibility runs through the declared subscription rather than through a dependency alternative.",
    },
  },
  {
    id: "R5-a5",
    row: 5,
    obligation: "(a) The test proves structure, never satisfiability: a structurally valid but inert alternative is accepted and counts toward non-emptiness, so a well-formed wait may never be woken.",
    atomicity:
      "One bug construction: a satisfiability-auditing writer refuses the structurally valid declaration as undischargeable. A refusal commits nothing via any writer (progress, disposition, lifecycle and activation writers all idle, exchange stays open) and records a rejection via the answer writer instead of a receipt. The multi-field difference is the absence of the one acceptance, not multiple moves. A refuser that additionally leaks progress would be auditor plus committer failures combined; committer partials for the shared OA-3 writer are evidenced by R3-c1/R3-c1b.",
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 2, counterexamples: ["wait-structure/inert-alternative-refused-as-unsatisfiable"] },
  },
  {
    id: "R5-a6",
    row: 5,
    obligation: "(a) A subscription-only input wait — 001's own K0 trace — is first-class: an empty dependency list is not an empty declaration.",
    atomicity:
      "One bug construction, as in R5-a5: the list-counting writer reads the dependency list as the wait and refuses the subscription-only declaration as empty. The same idle-writers-plus-rejection shape follows from that one misread; a refuser that also commits would be two writers failing, covered for commits by R3-c1/R3-c1b.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 4, counterexamples: ["k0-trace/subscription-only-wait-refused-for-an-empty-dependency-list"] },
  },

  // == Row 5(b): the eligibility category rule ===============================
  {
    id: "R5-b1",
    row: 5,
    obligation: "(b) Ordinary application input is eligible only through a declared input subscription.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 5, counterexamples: ["k0-trace/unsubscribed-input-wakes-the-execution"] },
  },
  {
    id: "R5-b2",
    row: 5,
    obligation: "(b) A dependency alternative that matches application input is inert: matching it does not wake the Execution (W-7 cases 6-7).",
    atomicity:
      "One bug construction: the eligibility writer runs the selector grammar before the source-category check, so it misclassifies the input as eligible, and then the correct B-6 Event-acceptance writer runs — retiring the generation, creating event-readiness and moving to READY in the one transaction §3 row 2 fixes for a truly eligible Event. The three moves are one downstream transaction triggered by one upstream misclassification, not three independent decisions. Partial writers that retire without readiness (timer handler clearing without waking) or arm readiness without retiring (ingress path while READY/RUNNING) are different writers with their own entries R5-f1a/f1a2, R6-b1/b2 and R7-a6d.",
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 3, counterexamples: ["wait-structure/inert-alternative-wakes-matching-input"] },
  },
  {
    id: "R5-b2b",
    row: 5,
    obligation: "(b) Nor does matching it acknowledge the Event: W-7's 'neither wakes nor acknowledges' is two rules, and only an accepted Outcome acknowledges (B-3).",
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 3, counterexamples: ["wait-structure/inert-alternative-acknowledges-matching-input"] },
  },
  {
    id: "R5-b3",
    row: 5,
    obligation: "(b) Every other ordinary Kernel Event is eligible only through a dependency alternative it actually matches under the grammar.",
    atomicity:
      "One bug construction, as in R5-b2: the matcher compares kind without correlation, misclassifies the Event as eligible, and then the correct B-6 writer retires, creates readiness and moves to READY in one transaction. The moves are one downstream transaction after one upstream miscomparison. A matcher that wakes without readiness, or readiness without a wake, would be a B-6 atomicity failure by a different writer, separately covered by R5-f1a/f1a2 and R6-b2.",
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 4, counterexamples: ["wait-structure/unmatched-kernel-event-wakes-the-wait"] },
  },
  {
    id: "R5-b4",
    row: 5,
    obligation: "(b) The timeout Event is eligible through neither list and arrives by construction (W-9).",
    atomicity:
      "One bug construction: an ingress-routing writer sends the timeout through the ordinary eligibility test, so for a wait declaring nothing matching it the B-7 path-B transaction never runs — no timeout minted by the Kernel-mint writer, no retirement by the wait writer, no deadline-readiness by the readiness writer, and the accepted deadline stays live. The moves are one upstream routing decision plus the absence of the one downstream B-7 transaction. A partial that mints the timeout but fails to retire would be B-7 atomicity failure by the expiry-handler writer, separately evidenced by R5-d2 (expiry leaves generation live). Nothing here constrains physical timer handles: the logical deadline staying live is the violation, not any scheduler registration lifetime.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 4, counterexamples: ["subscription-deadline/timeout-withheld-because-nothing-declared-it"] },
  },

  // == Row 5(c): W-2's ordered registration transaction ======================
  {
    id: "R5-c1",
    row: 5,
    obligation: "(c) Step 1 first: this Outcome's own reserved batch is acknowledged before the mailbox check, so a wait is never woken by the batch that registered it.",
    atomicity:
      "One bug construction: W-2 steps 1 and 2 run in the wrong order (mailbox check before own-batch acknowledgment), so the just-acknowledged input is still a mailbox candidate and the correct B-6 writer retires, creates readiness and moves to READY on it. The moves are one downstream B-6 transaction after one upstream ordering swap. A reordering that wakes without readiness would additionally break B-6 atomicity by a different writer, covered by the split halves R5-f1a/f1a2.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 4, counterexamples: ["k0-trace/wait-woken-by-its-own-acknowledged-batch"] },
  },
  {
    // Split by round-13 review finding K02-R13-02. The entry used to state both that step 2 runs and
    // that it "is not skipped for an empty dependency list", while its only evidence was
    // `control-stale-timer-and-lost-wake` step 3 — whose `waitOnCorr1` declares a dependency
    // alternative for `effect.result`/`corr-1` and no subscription at all. That transcript
    // discriminates a candidate that skips the mailbox check *generally*; it cannot see a candidate
    // that runs it for dependency waits and skips it only when `dependencies.length === 0`, which is
    // a separate line of code and exactly the shortcut W-8 case 1 names. This entry keeps the general
    // clause, on the schedule that genuinely exercises it; R5-c2b below owns the empty-dependency one.
    id: "R5-c2",
    row: 5,
    obligation: "(c) Step 2 runs at all: for a wait whose eligibility rule a dependency alternative carries, an already-accepted still-unacknowledged Event is found at registration rather than lost.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 3, counterexamples: ["control-stale-timer/lost-wake-at-registration"] },
  },
  {
    // The other half of that split, owned where the condition actually exists. `identity-producer-scope`
    // step 8 registers `producerIngressWait` — `dependencies: []`, one `continue` subscription — after
    // two eligible `continue` inputs have been accepted and left unacknowledged, and its conforming
    // result is immediate B-6 path-A readiness. That is W-8 case 1 in full: "W-2's mailbox check
    // applies to a subscription-only wait exactly as it does to a dependency wait, and there is no
    // 'no dependencies, so nothing to check' shortcut." The schedule already existed for row 1's
    // producer-scoped ingress obligations, and round 13 attributes row 5 to it rather than building a
    // duplicate scenario; `blind-spot-regression.test.ts` checks the preconditions are real and that
    // the shortcut candidate this entry describes is invisible to R5-c2's own scenario.
    id: "R5-c2b",
    row: 5,
    obligation: "(c) Step 2 is not skipped for an empty dependency list: a subscription-only wait's registration checks the mailbox too, so an already-accepted eligible application input still ends it immediately (W-8 case 1).",
    atomicity:
      "One bug construction, and it is a single upstream branch: the registration writer tests `dependencies.length === 0` and takes W-2 step 4 instead of step 2. Everything downstream is then the one persist-WAITING transaction W-2 step 4 specifies — the live generation is written beside the lifecycle by the same writer W-3's definitional link couples, and the B-6 path-A readiness that step 2 would have committed is simply never created because that branch never ran. The absence of readiness here is the absent alternative branch, not a second independent decision: a candidate that both persisted WAITING and armed readiness for the same generation would be a different failure, and the corpus already owns wake-without-readiness and readiness-without-wake separately at R5-f1a/f1a2 and R6-b1/b2.",
    evidence: { kind: "scenario", scenario: "identity-producer-scope", stepIndex: 8, counterexamples: ["identity-producer/empty-dependency-list-skips-the-mailbox-check"] },
  },
  {
    // Self-found in the same re-audit. W-2 step 2 ends with a clause of its own — "**No timeout Event
    // is created** for that generation, and a timer scheduled for it is stale on arrival (W-3)" — and
    // §3 makes the same contrast structurally: row 1 commits the readiness with no timeout, and row 3
    // is "as row 1, **plus exactly one timeout Event**". Row 5(c) requires the transaction to produce
    // "exactly one of §3's rows 1, 3 or a durable WAITING", so producing row 1 *with* row 3's timeout
    // is a distinguishable failure. Nothing owned it. R5-c3's transcript moves `queued` at the step-3
    // branch, but in the opposite direction and by a different writer: its declared bug withholds a
    // timeout the deadline branch owed, while this one mints a timeout the mailbox branch never owed.
    // The bug construction is a registration writer that mints the timeout Event when it installs the
    // deadline, before the mailbox check decides the branch, and then retires the generation without
    // retracting the Event it already committed — leaving an otherwise perfect path-A result with a
    // timeout in the mailbox for a wait that never timed out. Single-field move on `queued`.
    id: "R5-c2c",
    row: 5,
    obligation: "(c) Step 2's retirement mints no timeout Event: the B-6 path-A transaction commits §3 row 1, so a deadline-bearing wait ended by an already-accepted Event leaves no timeout for the generation it just retired.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 3, counterexamples: ["control-stale-timer/path-A-retirement-mints-a-timeout"] },
  },
  {
    id: "R5-c3",
    row: 5,
    obligation: "(c) Step 3 evaluates an already-due deadline before persisting, so a past deadline is never persisted as live (B-7 path A).",
    atomicity:
      "One bug construction: the Outcome-acceptance writer persists WAITING with its accepted deadline before the deadline-evaluator runs, so the W-2 step-3 branch that would mint the timeout, retire immediately and create deadline-readiness never executes. The live generation, live accepted deadline, absent timeout and absent readiness are one ordering swap plus the absence of the one path-A transaction. A persister that writes the live generation without its deadline is now owned separately as R5-c4, and retirement-time deadline leftovers as R5-c5/R5-d4/R5-d5/R5-d6/R5-f4; the live-generation field alone already discriminates this entry's ordering swap, and the cancellation-loser leak is separately R7-a6c. Nothing here constrains physical timer handles.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 6, counterexamples: ["subscription-deadline/past-deadline-persisted-as-a-live-wait"] },
  },
  {
    // Split by round-7 review finding K02-R7-01. R5-c3 owns the ordering swap that persists WAITING
    // outright; these own the accepted-deadline halves a candidate can get right and wrong
    // separately: persisting the wait without its deadline, and retiring immediately without
    // clearing it. Each transcript moves only `acceptedDeadline`, so no atomicity note is owed.
    id: "R5-c4",
    row: 5,
    obligation: "(c) Step 4 persists the accepted deadline with the live registration: a future-deadline wait that registers durably carries its deadline as an accepted fact.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 3, counterexamples: ["subscription-deadline/registered-wait-drops-the-accepted-deadline"] },
  },
  {
    id: "R5-c5",
    row: 5,
    obligation: "(c) Step 3 leaves no accepted deadline behind: an already-due deadline retires immediately via B-7 path A with no durable deadline fact, even though the retirement is otherwise correct.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 6, counterexamples: ["subscription-deadline/path-A-retirement-leaves-the-accepted-deadline"] },
  },

  {
    // Self-found in round-13's re-audit of W-2, and assigned rather than added. C9 requires an
    // assertion with no observation surface to be assigned explicitly, never counted covered and never
    // silently dropped; these two are the clauses of W-2 step 3 that turn on a clock this laboratory
    // does not have. K0.2's command vocabulary supplies deadlines as schedule data and never supplies
    // an accepted-time observation, so a schedule expresses "already due" by giving the wait a small
    // deadline and "not yet due" by giving it a large one. That is enough for the branch (R5-c3/c5 own
    // it) and structurally incapable of addressing either clause below.
    id: "R5-c6",
    row: 5,
    obligation: "(c) Step 3 evaluates the deadline against **one** accepted-time observation taken in that transaction, so two reads inside one transaction cannot disagree and make the outcome depend on which line of code asked.",
    evidence: {
      kind: "assigned",
      packet: "K1.3",
      reason:
        "The clause distinguishes one clock read from two, and W-2 states in terms that nothing between its steps is externally observable: both readings commit the same transaction and differ only in which instant decided it. No K0.2 command supplies or advances an accepted-time observation, so no schedule can present a candidate with two instants to read; adding a clock command to observe it would extend the released fixture vocabulary rather than evidence the contract as written. 007 assigns the wait-registration races to K1.3, which is where a real registration transaction reads a real clock and can be driven at a pinned instant.",
    },
  },
  {
    id: "R5-c7",
    row: 5,
    obligation: "(c) Step 3's comparison is non-strict — the deadline is due iff the accepted-time observation is at or after the deadline instant, so equal instants are due rather than one tick short.",
    evidence: {
      kind: "assigned",
      packet: "K1.3",
      reason:
        "This is an exact limit edge, and 012's normative method is right that limit edges need the at-limit and one-over cases rather than a value comfortably on one side. Expressing it needs a deadline and an accepted-time observation the schedule can make exactly equal, and K0.2 has no command that supplies the second: the corpus can only place a deadline plainly in the past (deadline 1) or plainly in the future (deadline 1000, 3000). E-6's at-limit/one-over matrix is already assigned to K1 for the same reason (`rule-agreement.test.ts`), and this edge belongs with the K1.3 registration transaction that owns the comparison.",
    },
  },

  // == Row 5(d): retirement ==================================================
  {
    id: "R5-d1",
    row: 5,
    obligation: "(d) Any eligible wake retires the registration and its generation in the same transaction.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 6, counterexamples: ["k0-trace/wake-leaves-the-generation-live"] },
  },
  {
    id: "R5-d2",
    row: 5,
    obligation: "(d) A current-generation deadline expiry retires them likewise, in the transaction that mints the timeout Event.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 4, counterexamples: ["subscription-deadline/deadline-expiry-leaves-the-generation-live"] },
  },
  {
    id: "R5-d3",
    row: 5,
    obligation: "(d) The Kernel keeps no per-alternative satisfied flag: a Runtime that still needs a dependency re-registers it, and the re-registration waits.",
    atomicity:
      "One bug construction: retirement records which alternative settled and carries that flag across generations, so the re-registration is judged already satisfied before it persists and the correct B-6 writer immediately retires it with readiness. The moves are one flag-read plus one downstream retirement transaction. A flag that arms readiness without retiring, or retires without readiness, would be a different writer failure, separately covered by R5-f1a2 and R6-b2.",
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 7, counterexamples: ["wait-structure/re-registered-dependency-treated-as-already-satisfied"] },
  },
  {
    // Both retirement species of row 5(d), for the deadline fact: R5-d1/d2 own retiring the
    // registration and generation; these own retiring the accepted deadline beside them. Each moves
    // only `acceptedDeadline`.
    //
    // Round-8 review finding K02-R8-01 split the eligible-wake half again, because row 5(d)'s "any
    // eligible wake" reaches one state through two entry boundaries and B-6 states them separately:
    // path A is found during W-2 step 2 and retires inside the **Outcome-acceptance** transaction,
    // while path B retires a wait that is already durably `WAITING` at the **Event's own acceptance
    // boundary**, with no Outcome in the transaction at all. Those are different writers, so a
    // candidate can clear the deadline in one and leave it behind in the other. R5-d4 owns path A and
    // R5-d6 owns path B.
    id: "R5-d4",
    row: 5,
    obligation: "(d) A registration-time eligible wake retires the accepted deadline inside the Outcome-acceptance transaction (B-6 path A): a deadline-bearing wait retired by an already-accepted Event leaves no accepted deadline fact.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 3, counterexamples: ["control-stale-timer/immediate-retirement-leaves-the-accepted-deadline"] },
  },
  {
    id: "R5-d5",
    row: 5,
    obligation: "(d) A current-generation deadline expiry retires the accepted deadline with the generation: timeout minted, generation retired, no deadline fact left live.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 7, counterexamples: ["control-stale-timer/expiry-retirement-leaves-the-accepted-deadline"] },
  },
  {
    // Round-8 review finding K02-R8-01. R5-d1 already owns "any eligible wake retires the
    // registration and generation" and its evidence *is* a path-B wake — but on a wait with no
    // deadline, so it cannot see a path-B handler that retires lifecycle, generation and readiness
    // correctly and forgets the deadline. This entry is that one fact, on a schedule where the wait
    // parks durably with a live accepted deadline first.
    id: "R5-d6",
    row: 5,
    obligation: "(d) A later eligible Event retires the accepted deadline at that Event's own acceptance boundary (B-6 path B): a live deadline-bearing wait ended with no Outcome in the transaction leaves no accepted deadline fact behind, while its lifecycle, generation, readiness species and mailbox results stay correct.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 12, counterexamples: ["control-stale-timer/path-B-wake-leaves-the-accepted-deadline"] },
  },

  // == Row 5(e): next-batch selection, both species ==========================
  {
    id: "R5-e1",
    row: 5,
    obligation: "(e) Older ineligible backlog can never displace what the Execution was woken for, at any bound including 1 — the B-6 species.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 7, counterexamples: ["k0-trace/backlog-displaces-the-wake"] },
  },
  {
    id: "R5-e2",
    row: 5,
    obligation: "(e) The same holds for the B-7 species, where the generation-correlated timeout Event is the mandatory member (W-8 case 6).",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 5, counterexamples: ["subscription-deadline/backlog-takes-the-slot-from-the-timeout"] },
  },

  // == Row 5(f): fencing =====================================================
  {
    id: "R5-f1a",
    row: 5,
    obligation: "(f) A timer naming a superseded generation wakes nothing: it cannot make the replacement wait READY.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 6, counterexamples: ["control-stale-timer/stale-generation-wakes-the-replacement-wait"] },
  },
  {
    id: "R5-f1a2",
    row: 5,
    obligation: "(f) And it retires nothing: the live registration survives a timer that names a generation it has superseded.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 6, counterexamples: ["control-stale-timer/stale-generation-retires-the-live-registration"] },
  },
  {
    id: "R5-f1b",
    row: 5,
    obligation: "(f) It also creates no timeout Event, which is a separable half: a candidate can fence the wake and still mint the Event.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 6, counterexamples: ["control-stale-timer/stale-timer-mints-a-timeout-for-a-retired-generation"] },
  },
  {
    id: "R5-f2a",
    row: 5,
    obligation: "(f) A duplicate timer for an already-accepted expiry creates no second timeout Event.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 8, counterexamples: ["control-stale-timer/duplicate-timer-mints-a-second-timeout"] },
  },
  {
    id: "R5-f2b",
    row: 5,
    obligation: "(f) It creates no second readiness or logical timeout either — separable from the Event, since the two are committed by different writers.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 8, counterexamples: ["control-stale-timer/duplicate-timer-arms-a-second-readiness"] },
  },
  {
    id: "R5-f3",
    row: 5,
    obligation: "(f) An authenticated result Event is never generation-fenced and remains observable by a later wait that correlates to it (W-6).",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 9, counterexamples: ["control-stale-timer/late-result-discarded-as-stale"] },
  },
  {
    // The fencing counterpart for the deadline fact, completing R5-f1a/f1a2/f1b: wake fenced,
    // retirement fenced, Event fenced — and the live deadline untouched. Moves only
    // `acceptedDeadline`.
    id: "R5-f4",
    row: 5,
    obligation: "(f) A stale timer clears no accepted fact either: the live generation's accepted deadline survives a fenced delivery for a retired generation.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 6, counterexamples: ["control-stale-timer/stale-delivery-clears-the-live-deadline"] },
  },

  // == Row 5(g): Runtime-local work ==========================================
  {
    id: "R5-g",
    row: 5,
    obligation: "(g) An Activation with only Runtime-local work outstanding simply stays RUNNING: WAITING means an accepted Outcome declared a Kernel-visible dependency.",
    evidence: { kind: "scenario", scenario: "delayed-runtime-non-blocking", stepIndex: 4, counterexamples: ["delayed-runtime/unresolved-activation-reported-as-waiting"] },
  },
  {
    id: "R5-g2",
    row: 5,
    obligation: "(g) And it creates no waitingFor record at all — not a record the lifecycle merely declines to report.",
    evidence: { kind: "scenario", scenario: "delayed-runtime-non-blocking", stepIndex: 4, counterexamples: ["delayed-runtime/runtime-local-work-gets-a-waitingFor-record"] },
  },

  // == Row 6: Event acceptance during computation ============================
  {
    id: "R6-a1",
    row: 6,
    obligation: "An Event accepted while an Activation is in flight does not alter that Activation's already-pinned batch.",
    evidence: {
      kind: "shared",
      obligation: "R2-b1",
      reason:
        "Row 2 states this as a property of the dispatch (it pins a batch) and row 6 as a property of the acceptance (it does not alter one). There is one observable fact and one boundary at which it fails, so one transcript is the honest evidence for both; splitting it would mean writing two transcripts that differ only in prose.",
    },
  },
  {
    id: "R6-a2",
    row: 6,
    obligation: "That Event remains queued for later B-2 selection or B-5 disposition; it is never silently dropped.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 3, counterexamples: ["k0-trace/late-arrival-dropped-instead-of-queued"] },
  },
  {
    id: "R6-b1",
    row: 6,
    obligation: "An Event accepted while RUNNING — no generation live (W-3) — creates no readiness.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 2, counterexamples: ["control-stale-timer/event-accepted-while-running-arms-a-readiness"] },
  },
  {
    id: "R6-b2",
    row: 6,
    obligation: "An Event accepted while READY creates no readiness either, so a second readiness can never arm behind the first and re-select an already-reserved batch.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 9, counterexamples: ["control-stale-timer/late-result-arms-a-second-readiness"] },
  },
  {
    id: "R6-b3",
    row: 6,
    obligation: "Terminal ingress refuses new ordinary input rather than queueing it on an Execution that can never read it.",
    evidence: { kind: "scenario", scenario: "control-completion-obligations", stepIndex: 4, counterexamples: ["terminal-ingress/late-input-queued-on-a-terminal-execution"] },
  },

  // == Row 7: cancellation ordering ==========================================
  {
    id: "R7-a1",
    row: 7,
    obligation: "Cancellation acceptance first: the later in-flight Outcome is rejected with CX-6's cancellation/terminal-conflict classification, which the worksheet fixes by name.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-outcome-rejected-with-the-wrong-classification"] },
  },
  {
    id: "R7-a2",
    row: 7,
    obligation: "That losing Outcome installs zero progress.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-progress-installed"] },
  },
  {
    id: "R7-a8",
    row: 7,
    obligation: "Decision M-1's named failing variant: suppressing only the loser's next state while installing its progress, emissions and batch acknowledgment is a failing control, not a conforming one.",
    atomicity:
      "The composite is the assertion here, and it is canonical rather than a bundle of convenience: Decision M-1 names this exact variant — 'Suppressing only next state while installing losing progress is a failing control, not a conforming variant' — as something the row-7 control must reject. Its individually violable parts are separately covered by R7-a2 (progress), R7-a3 (emissions) and R7-a4 (acknowledgment); this entry exists because M-1 requires the combination to be rejected under a correct-looking CANCELLED headline, which is the shape that makes it hard to see.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-progress-installed-with-next-state-suppressed"] },
  },
  {
    id: "R7-a3",
    row: 7,
    obligation: "It accepts zero emissions, separately from progress: emissions are published by their own writer and can escape a fence that covers the progress commit.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-emissions-published"] },
  },
  {
    id: "R7-a4",
    row: 7,
    obligation: "It acknowledges none of its reserved batch, which reservation alone never constitutes (B-3).",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-outcome-acknowledges-its-batch"] },
  },
  {
    id: "R7-a5",
    row: 7,
    obligation: "It creates zero Effect intents, which the observation surface can now see rather than infer from the absence of a physical attempt.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-outcome-mints-an-effect-intent"] },
  },
  {
    // Split by round-5 review finding K02-R5-02 and redefined by round-6 finding K02-R6-01.
    // The prior entry bundled wait, deadline, readiness and next-state behind one transcript moving
    // only the lifecycle state, so the wait and deadline clauses had no discriminating candidate and
    // the deadline clause had no observation that could see it. Each now has its own schedule and
    // transcript. The losing `await` with a deadline at step 11 exercises the wait/deadline path the
    // prior schedule (losing `continue`/`complete` only) never submitted; `acceptedDeadline` observes
    // the accepted logical deadline fact — never a physical timer registration — rather than
    // inferring deadline absence from terminal state or `liveWaitGeneration`.
    id: "R7-a6",
    row: 7,
    obligation: "It produces no next-state change: a rejected losing Outcome cannot move the Execution off its terminal CANCELLED state.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-outcome-moves-the-execution-off-terminal"] },
  },
  {
    id: "R7-a6b",
    row: 7,
    obligation: "A losing `await` registers no wait: `liveWaitGeneration` stays null even when the loser's next step carries a well-formed wait.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 11, counterexamples: ["control-cancel/losing-await-registers-a-wait"] },
  },
  {
    id: "R7-a6c",
    row: 7,
    obligation: "A losing `await` carrying a deadline accepts no deadline fact: `acceptedDeadline` stays null even when the Execution correctly stays CANCELLED with the correct CX-6 rejection. A physical timer retained after logical retirement is conforming W-3 behavior and is not observed here. This is the CX-6 fence's own writer; the OA-3/OA-5 whole-envelope rejection writer is R3-c4 (round-9 finding K02-R9-01), and a candidate can order its deadline commit to get exactly one of them right.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 11, counterexamples: ["control-cancel/losing-await-accepts-a-deadline"] },
  },
  {
    id: "R7-a6d",
    row: 7,
    obligation: "A losing `await` creates no wait-ended readiness: `waitEndedReadiness` stays empty.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 11, counterexamples: ["control-cancel/losing-await-arms-a-readiness"] },
  },
  {
    // Added by round-10 review finding K02-R10-03, re-deriving ID-6 at the cancellation fence. The
    // losing Outcome's progress/emissions/acknowledgment/intent/wait/deadline/readiness/next-state
    // halves (R7-a2/a3/a4/a5/a6/a6b/a6c/a6d) leave the answer half unowned: a candidate correctly staying
    // CANCELLED with the correct CX-6 rejection, no progress, no emissions and no acknowledgment, but
    // minting a fresh acceptance receipt for the refused submission beside it. R7-b owns the same fact
    // for the *retry* (exact resubmission manufactures none); this owns it for the losing submission
    // itself — different steps, different writers (initial answer vs. replay lookup), so no shared link.
    // Single receipt-only move at step 3, distinct from every other half there.
    id: "R7-a9",
    row: 7,
    obligation: "The losing Outcome itself mints no acceptance receipt either: the field retains the prior accepted receipt beside the recorded CX-6 rejection (ID-6).",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-outcome-mints-a-receipt"] },
  },
  {
    id: "R7-a7",
    row: 7,
    obligation: "The fence does not depend on the loser's next step: a `complete` submitted after cancellation acceptance loses identically to a `continue`. Decision M-1 requires the control to assert both.",
    atomicity:
      "One bug construction: the fence-placement writer checks `continue` paths but the terminal-decision writer for `complete` checks only 'already terminal in the way I am about to make it', so the loser's `complete` is admitted and then the correct completion-commit writer runs — COMPLETED via lifecycle, progress via progress writer, receipt via answer writer in the one OA-4 commit. A fence bypass that reaches COMPLETED without progress (or progress without COMPLETED) would be bypass plus commit-atomicity failures combined; commit partials under correct refusal are separately evidenced by R8-a3/R8-a4.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 5, counterexamples: ["control-cancel/complete-loser-escapes-the-fence"] },
  },
  {
    id: "R7-b",
    row: 7,
    obligation: "An exact retry manufactures no acceptance receipt: OA-2's receipt rule does not apply, because no Outcome was accepted.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 4, counterexamples: ["control-cancel/exact-retry-manufactures-a-receipt"] },
  },
  {
    id: "R7-b2",
    row: 7,
    obligation: "And it returns the same recorded rejection: the decision is durably bound to the submitted identity and content, not recomputed or forgotten.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 4, counterexamples: ["control-cancel/exact-retry-loses-the-recorded-rejection"] },
  },
  {
    id: "R7-c1",
    row: 7,
    obligation: "The cancellation control path reaches CANCELLED on its own, without depending on the in-flight Runtime answering.",
    atomicity:
      "One bug construction: the cancellation-control writer records the request as pending and defers the semantic fence to the next safe-boundary/Activation answer, so the control path never transitions — lifecycle stays RUNNING via the lifecycle writer, activation/batch stay live via the dispatch writer, and the B-5 disposition writer never runs because there is no terminal to dispose for. The three observations are one deferred fence plus the absence of the one control transaction. A control that reaches CANCELLED without dispositions would be fence plus B-5 failures combined, separately evidenced by R7-c2 (batch acknowledged instead of disposed).",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 2, counterexamples: ["control-cancel/cancellation-leaves-the-execution-running"] },
  },
  {
    id: "R7-c2",
    row: 7,
    obligation: "Its reserved Events receive B-5 terminal disposition rather than acknowledgment.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 2, counterexamples: ["control-cancel/reserved-batch-acknowledged-instead-of-disposed"] },
  },
  {
    id: "R7-d",
    row: 7,
    obligation: "Outcome acceptance first: a later cancellation orders against that state and cannot reopen accepted completion or failure.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 9, counterexamples: ["control-cancel/late-cancel-reopens-a-completed-execution"] },
  },

  // == Row 8: terminal obligations ===========================================
  {
    id: "R8-a",
    row: 8,
    // Round-2 finding K02-R2-01 narrowed this to what the protocol actually makes observable. The
    // obligation is that the completing envelope is not *accepted*; it is not that the Kernel expose a
    // completion-specific rejection reason. EF-1/EF-2 already mandate a whole-envelope refusal for any
    // K1 Outcome proposing an Effect, and §11 row 4 requires "a recorded, inspectable reason" without
    // fixing which one, so a candidate refusing on those grounds is conforming.
    obligation: "A completing Outcome carrying newly proposed Effects is not accepted: the Execution reaches no terminal state.",
    atomicity:
      "One bug construction: the completion-check writer runs as a later cleanup pass rather than at Outcome acceptance, so the envelope is admitted and then the correct acceptance-commit writer runs — terminal via lifecycle, progress via progress writer, acknowledgment via disposition writer, exchange resolution via dispatch writer and receipt via answer writer in the one OA-4 commit. A checker bypass that reaches terminal without progress (or progress without terminal) would be bypass plus commit-atomicity failures combined. The clauses independently violable under a *correct* refusal — recorded reason, progress, acknowledgment, Effect intent — are split out as R8-a2 through R8-a5, each with its own transcript by its own writer (reason recorder, progress committer, batch acknowledger, intent minter).",
    evidence: {
      kind: "scenario",
      scenario: "control-completion-obligations",
      stepIndex: 2,
      counterexamples: ["completion/owned-work-proposed-in-the-completing-outcome-is-accepted"],
    },
  },
  {
    id: "R8-a2",
    row: 8,
    obligation: "That refusal is recorded with an inspectable reason, rather than being a dropped return value.",
    evidence: { kind: "scenario", scenario: "control-completion-obligations", stepIndex: 2, counterexamples: ["completion/refused-without-a-recorded-reason"] },
  },
  {
    id: "R8-a3",
    row: 8,
    obligation: "No progress from the refused completing envelope is committed.",
    evidence: { kind: "scenario", scenario: "control-completion-obligations", stepIndex: 2, counterexamples: ["completion/refused-envelope-partly-committed"] },
  },
  {
    id: "R8-a4",
    row: 8,
    obligation: "No part of its reserved batch is acknowledged, which is a different writer from the progress commit.",
    evidence: { kind: "scenario", scenario: "control-completion-obligations", stepIndex: 2, counterexamples: ["completion/refused-envelope-acknowledges-its-batch"] },
  },
  {
    id: "R8-a5",
    row: 8,
    obligation: "And no Effect intent or proposal-key binding is left behind by the envelope that proposed it.",
    evidence: { kind: "scenario", scenario: "control-completion-obligations", stepIndex: 2, counterexamples: ["completion/refused-envelope-leaves-an-effect-intent"] },
  },
  {
    id: "R8-b",
    row: 8,
    obligation: "A terminal Execution never treats an unacknowledged Event as processed: it is not acknowledged on the way to the terminal state.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 8, counterexamples: ["k0-trace/global-cursor-acknowledges-unmatched-input"] },
  },
  {
    id: "R8-b1b",
    row: 8,
    obligation: "Nor is it deleted without record: each unacknowledged Event gets an explicit recorded B-5 disposition, which is a different failure from being treated as processed.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 8, counterexamples: ["k0-trace/unacknowledged-event-deleted-without-a-disposition"] },
  },
  {
    id: "R8-b2",
    row: 8,
    obligation: "That disposition includes the reserved batch of a cancellation loser under CX-6.",
    evidence: {
      kind: "shared",
      obligation: "R7-c2",
      reason:
        "Row 8 names the cancellation loser's reserved batch as an instance of its own disposition rule, and row 7 names the same batch as part of the cancellation fence. One transcript — acknowledging the reserved batch instead of disposing of it — is the failure for both readings.",
    },
  },
  {
    id: "R8-c",
    row: 8,
    obligation: "A *previously owned* required Effect must be settled, or explicitly transferred or abandoned under policy, before completion is accepted.",
    evidence: {
      kind: "assigned",
      packet: "K2.3",
      reason:
        "No previously owned obligation can exist while K1 refuses Effects outright (EF-1/EF-2), so this clause has no observable K0 case. CX-3 says so in terms: 'K1 without Effects satisfies this trivially (no Effects exist yet to be unaccounted-for); K2 is where the check becomes non-trivial.' R8-a observes the clause that *is* reachable now — work proposed in the completing Outcome itself. 007 K2.3 first implements required-work accounting; K2.4 is the aggregate gate, not its first owner. Child obligations are separately assigned in R8-d. Fabricating owned work at K0 would require inventing state the protocol says cannot exist.",
    },
  },

  // == Row 9: progress compatibility =========================================
  {
    id: "R9-a1",
    row: 9,
    obligation: "Resuming against unavailable compatible code yields an *explicit* hold/refusal: an inspectable record, not merely the absence of a restart. Missing checkpoint/resource triggers are separately assigned in R9-f1/f2.",
    evidence: { kind: "scenario", scenario: "control-missing-checkpoint-code", stepIndex: 4, counterexamples: ["control-missing-checkpoint/refused-without-an-inspectable-hold"] },
  },
  {
    id: "R9-a2",
    row: 9,
    obligation: "It is never a state that looks like normal restored computation.",
    atomicity:
      "One bug construction: the recovery-path writer cannot load the pinned revision and takes the fresh-start branch, which fabricates empty progress via the progress writer and takes the no-hold branch via the hold writer because fresh-start has no hold to report. The two moves are one path selection plus the two branch writers on that path. A fresh start that *also* reports a hold would require taking both branches (two path selections); a silent failure that neither fabricates nor holds is the different bug covered by R9-a1 (refused without inspectable hold, correctly not fabricated).",
    evidence: { kind: "scenario", scenario: "control-missing-checkpoint-code", stepIndex: 4, counterexamples: ["control-missing-checkpoint/fresh-state-presented-as-restored"] },
  },

  // == Row 10: local policy ordering and freshness ===========================
  {
    id: "R10-a",
    row: 10,
    obligation: "A policy check against just-accepted local state reads that exact write with no staleness window (LP-1).",
    atomicity:
      "One bug construction: the authority-check reader sits outside the acceptance transaction and reads a cached exchange, so the epoch the takeover just superseded is still readable as current and the old writer's Outcome is admitted; then the correct acceptance-commit writer runs — progress via progress writer and receipt replacing rejection via answer writer in the one OA-4 commit. An admission that commits progress without receipt (or receipt without progress) would be admission plus commit-atomicity failures combined, by the commit writer split further.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 7, counterexamples: ["identity-activation/superseded-writer-epoch-accepted-from-a-stale-read"] },
  },
  {
    // Added by round-10 review finding K02-R10-03, re-deriving ID-6 at the stale-writer fence. R10-a
    // owns the full admission (progress commit + receipt replacing rejection); R2-c4 shares that same
    // observable fact for row 2. This owns the narrower answer half a candidate can get wrong alone: the
    // stale submission is correctly rejected as `stale_exchange` with no progress, but a fresh acceptance
    // receipt is minted beside it. Single receipt-only move at step 7, distinct from R10-a's four-field
    // admission and from R7-a9/R3-b3/R3-c8 at other fences (different classifications, different steps).
    id: "R10-a2",
    row: 10,
    obligation: "A stale old-epoch rejection mints no acceptance receipt either: the field retains the prior accepted receipt beside the recorded `stale_exchange` rejection (ID-6).",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 7, counterexamples: ["identity-activation/stale-rejection-mints-a-receipt"] },
  },
  {
    id: "R10-b",
    row: 10,
    obligation: "No K0/K1 document or test asserts an instantaneous remote-revocation guarantee (LP-2).",
    evidence: {
      kind: "corpus",
      test: "coverage.test.ts: 'no part of the fixture claims a remote-revocation freshness guarantee'",
      note: "This is a negative obligation about the corpus, so it is enforced by scanning the fixture and its specification rather than by a scenario step. LP-2 makes the negative the whole decision at K0/K1: there is no remote-mediated action to revoke yet.",
    },
  },
  {
    id: "R10-c",
    row: 10,
    obligation: "Ordinary corrective input never itself withdraws or invalidates an already-accepted Outcome (LP-3).",
    atomicity:
      "One bug construction: an input handler misreads 'correction' as withdrawal authority and invokes the retraction writer, which reverses the one OA-4 commit whole — progress and revision via the progress writer together with emissions via the emission publisher in the one reverse transaction. A retraction that removes progress but republishes emissions (or vice versa) would be handler plus retraction-atomicity failures combined; the emission publisher sits outside the progress transaction (as row 7 already recognises for R7-a2/a3), so half-retraction is a second writer failing, not the single handler misread this transcript demonstrates.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 5, counterexamples: ["k0-trace/late-input-retracts-accepted-progress"] },
  },

  // Round 14: cited clauses with no truthful observation surface in this port.
  {
    "id": "R1-g",
    "row": 1,
    "obligation": "ID-6/ID-7: dispatch-intent receipt names its own acceptance boundary, separate from ingress and Outcome.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The port observes Activation identity and batch but exposes no dispatch receipt or dispatch acceptance position. 007 K1.1 first implements reservation/dispatch intent and its minimum inspection; an Activation token cannot substitute for this receipt."
    }
  },
  {
    "id": "R3-e1",
    "row": 3,
    "obligation": "OA-1: authenticate the Outcome submitter before inspecting content.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "OutcomeEnvelope and submit_outcome carry no submitting principal or authentication result, and Observation cannot reveal inspection order. 007 K1.2 first implements the Outcome validation/receipt boundary that must authenticate before parsing its content."
    }
  },
  {
    "id": "R3-e2",
    "row": 3,
    "obligation": "OA-1: scope authenticated Outcome access to the named Execution before inspecting content.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "A destination string is not an access grant. The K0 port supplies no caller-access relation or denied-access inspection trace. K1.2 owns Outcome acceptance and receipt lookup; that is the first implementing boundary able to discriminate this separate scope check."
    }
  },
  {
    "id": "R3-f1",
    "row": 3,
    "obligation": "OA-2: replay an accepted receipt before validation even when updated policy would now reject the envelope.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "The fixture has no policy-change command or policy version observation. Ordinary duplicate replay already has R3-a1/a2/a3; those cannot establish validation ordering against changed policy. 007 K1.2 first owns receipt replay/conflict and whole-envelope validation."
    }
  },
  {
    "id": "R3-f2",
    "row": 3,
    "obligation": "OA-2: exact accepted replay must not dispatch an Effect again.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.1",
      "reason": "No accepted Effect can exist under K0/K1 whole-envelope refusal. R3-a2/a3 cover progress/publication replay, not an accepted Effect dispatch. K2.1 first introduces accepted intents and dispatch only from accepted records, including replay safety."
    }
  },
  {
    "id": "R3-g1",
    "row": 3,
    "obligation": "OA-3: same-Outcome Effect references must resolve and bind during whole-envelope validation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.1",
      "reason": "K0 has no accepted Effect or proposal binding surface: every Effect-bearing envelope is refused. K2.1 explicitly owns same-Outcome keys and atomic intents, so it is the first place to test resolution without substituting K1 unsupported-field refusal."
    }
  },
  {
    "id": "R3-g2",
    "row": 3,
    "obligation": "OA-4: accepted Effect intents commit atomically with progress, input acknowledgment, emissions and next state.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.1",
      "reason": "The K0 intent observation can see a forbidden leaked intent, but cannot observe successful intent acceptance because K1 refuses all Effects. K2.1 explicitly commits all intents with the other accepted facts; a no-intent refusal is not evidence for positive atomic intent acceptance."
    }
  },
  {
    "id": "R3-h1",
    "row": 3,
    "obligation": "OA-6: an unclassifiable invalid Runtime response ends or holds the exchange under an explicit inspectable recovery decision.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "The typed OutcomeEnvelope surface cannot represent an unclassifiable Runtime response; missing-code recovery is a different trigger. K1.2 owns malformed Outcome acceptance/refusal and is the first executable acceptance boundary to provide a protocol-failure decision."
    }
  },
  {
    "id": "R3-h2",
    "row": 3,
    "obligation": "OA-6: an unclassifiable response must never cause an infinite silent retry of the same dispatch.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "The scheduled port neither produces unclassifiable responses nor observes an autonomous retry loop. K1.2 must handle this failure at its new Outcome boundary; K0 refusal of a typed malformed envelope cannot demonstrate that retry policy."
    }
  },
  {
    "id": "R4-c1",
    "row": 4,
    "obligation": "EF-3: request disposition remains distinct from attempt evidence, result validity and responsibility.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.2 first owns concrete admission and consent/withdrawal decisions. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-c2",
    "row": 4,
    "obligation": "EF-3: attempt evidence remains distinct from request disposition, result validity and responsibility.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.1",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.1 first owns accepted intents with separately recorded attempts. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-c3",
    "row": 4,
    "obligation": "EF-3: result contract validity or partial/missing evidence remains distinct from outcome certainty.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.3 first owns trusted evidence, result validity versus certainty, safe retry/refusal and required-work accounting. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-c4",
    "row": 4,
    "obligation": "EF-3: responsibility remains required, transferred to a named durable owner, or abandoned under policy independently of action success.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.3 first owns trusted evidence, result validity versus certainty, safe retry/refusal and required-work accounting. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-d1",
    "row": 4,
    "obligation": "EF-4: denial/refusal before a physical attempt is not evidence of external failure.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.2 first owns concrete admission and consent/withdrawal decisions. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-d2",
    "row": 4,
    "obligation": "EF-4: waiting for consent consumes no physical attempt.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.2 first owns concrete admission and consent/withdrawal decisions. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-d3",
    "row": 4,
    "obligation": "EF-4: admitted work without confirming evidence is unknown, never guessed successful or failed.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.3 first owns trusted evidence, result validity versus certainty, safe retry/refusal and required-work accounting. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-d4",
    "row": 4,
    "obligation": "EF-4: acknowledging an unknown Event does not discharge required work for completion.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.3 first owns trusted evidence, result validity versus certainty, safe retry/refusal and required-work accounting. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R4-d5",
    "row": 4,
    "obligation": "EF-4: stopping retries changes disposition/responsibility, not proof of external failure.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects before intent creation, so it has no admitted action, consent, result-contract or responsibility observation on which this assertion could be tested. 007 K2.3 first owns trusted evidence, result validity versus certainty, safe retry/refusal and required-work accounting. EF-3/EF-4 preserve this future distinction without selecting its representation."
    }
  },
  {
    "id": "R5-h1",
    "row": 5,
    "obligation": "CL-1: a wait deadline is distinct from an Execution deadline.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "K0 supplies no Execution-deadline identity or expiry. K1.3 first owns wait and cancellation races and their expiry-to-control mapping."
    }
  },
  {
    "id": "R5-h2",
    "row": 5,
    "obligation": "CL-1: Execution deadline expiry initiates ordered logical cancellation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The port can accept cancellation but cannot deliver an Execution-deadline expiry or observe its mapping. K1.3 owns out-of-band cancellation and wait/cancel races, the first truthful owner of this logical expiry-to-control mapping; physical interruption remains Driver work."
    }
  },
  {
    "id": "R5-h3",
    "row": 5,
    "obligation": "CL-1: scheduler lease expiry triggers recovery inspection/reassignment eligibility.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 takeover is an already-authorized command and supplies no lease, worker liveness or recovery inspection. K3.2 first implements persistent dispatch/lifecycle recovery under the real K3.1 kill harness; K3.3 subsequently tests native stale-host exclusion, which Kernel fencing alone cannot prove."
    }
  },
  {
    "id": "R5-h4",
    "row": 5,
    "obligation": "CL-2/W-9: timeout is not proof of external action failure.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "R5-f3 already preserves a generic later result Event. The port has no admitted action or outcome-certainty record whose evidence a timeout could corrupt. K2.3 first implements settlement/uncertainty and required-work accounting, so it owns the separate action-evidence assertion."
    }
  },
  {
    "id": "R5-h5",
    "row": 5,
    "obligation": "CL-3: the wait clock is evaluated only at registration and current-generation expiry while WAITING.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "R5-c3 and R5-f1a/f1a2/f1b/f4 observe the accepted consequences. The port exposes no clock-read instrumentation, so it cannot discriminate an extra read producing no accepted mutation. K1.3 owns the actual registration/deadline evaluator and can inspect its reading points without imposing a timer mechanism here."
    }
  },
  {
    "id": "R5-i1",
    "row": 5,
    "obligation": "B-6 path A: accepted Event-triggered readiness survives a crash after Outcome acceptance before reservation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 has no process-death or surviving-store command: scheduled observations cannot demonstrate persistence. K3.2 first implements persistent accepted truth and readiness reconstruction with K3.1 real worker/host kills, for both Outcome and Event acceptance windows."
    }
  },
  {
    "id": "R5-i2",
    "row": 5,
    "obligation": "B-6: Effect settlement atomically accepts its result Event and applicable destination readiness without a later Runtime Outcome.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "Generic kernel_event ingress can illustrate Event wake but no admitted Effect or settlement record exists in K0. K2.3 first owns trusted settlement and result publication; the source action evidence and destination wake must be accepted together there."
    }
  },
  {
    "id": "R5-i3",
    "row": 5,
    "obligation": "B-6: child routing obligation alone never fabricates parent readiness before destination Event acceptance.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.1",
      "reason": "K0 has no child, parent link or pending routing intent. K4.1 first implements durable children, terminal routing and result accounting; it must distinguish the source obligation from actual parent mailbox acceptance, with one-transaction profiles still allowed."
    }
  },
  {
    "id": "R5-i4",
    "row": 5,
    "obligation": "B-6: child routing recovery fulfils the same durable obligation idempotently.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.1",
      "reason": "No K0 command can create or replay a child routing obligation independently of accepting an Event. K4.1 owns the first child/result-route crash tests and hence both fulfilment identity and destination wake; K0 synthetic ingress is not that evidence."
    }
  },
  {
    "id": "R5-i5",
    "row": 5,
    "obligation": "B-6: message destination readiness commits at destination mailbox acceptance, not source intent creation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.2",
      "reason": "The fixture has no sender operation, delivery acknowledgment or source routing record. K4.2 first implements mediated destination acceptance and recoverable sender settlement; this assignment preserves both single-transaction and split-transaction profiles."
    }
  },
  {
    "id": "R5-i6",
    "row": 5,
    "obligation": "W-9: Kernel timeout minting requires trusted timer provenance.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies an already-categorized timeoutEvent on deliver_timer, with no authenticated submitter or ingress authority decision. K1.3 first implements deadline minting and separately scoped Event ingress; category typing is not authentication evidence."
    }
  },
  {
    "id": "R5-i7",
    "row": 5,
    "obligation": "W-9: timeout acceptance issues no external caller receipt and creates no seventh caller-facing boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "K0 receipt is a most-recent create/Outcome token, not a timer-ingress receipt stream. K1.3 first implements Kernel-owned timeout acceptance and can prove the absence of an external receipt without interpreting a stale displayed token as one."
    }
  },
  {
    "id": "R7-e1",
    "row": 7,
    "obligation": "CX-1: cancellation acceptance blocks new Effect admissions even before physical interruption.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "No K0 command admits an Effect, and K1 refuses every proposal before admission. K2.2 first implements concrete admission ordered with withdrawal/revocation and dispatch ownership, where the cancellation fence can actually block a new admission."
    }
  },
  {
    "id": "R7-e2",
    "row": 7,
    "obligation": "CX-1: Kernel requests Driver cancellation without waiting for Runtime cooperation; physical interruption may occur later.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "R7-c1 owns independent logical cancellation, but the port has no Driver cancellation callback or physical-interruption observation. K1.3 first implements out-of-band cancellation and its Driver request; R1.1 later probes real native interruption fidelity."
    }
  },
  {
    "id": "R7-f1",
    "row": 7,
    "obligation": "CX-5: late authenticated settlement retains the original Effect identity.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 cannot admit or settle Effects, so neither original attempt identity nor a late settlement is present. Ordinary input refusal on a terminal Execution is a different boundary. 007 K2.3 explicitly requires late authenticated evidence to survive cancellation and first supplies that settlement surface."
    }
  },
  {
    "id": "R7-f2",
    "row": 7,
    "obligation": "CX-5: Late settlement after cancellation never reopens the terminal Execution.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 cannot admit or settle Effects, so neither original attempt identity nor a late settlement is present. Ordinary input refusal on a terminal Execution is a different boundary. 007 K2.3 explicitly requires late authenticated evidence to survive cancellation and first supplies that settlement surface."
    }
  },
  {
    "id": "R7-f3",
    "row": 7,
    "obligation": "CX-5: Late settlement after cancellation never becomes a new unrelated Effect.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 cannot admit or settle Effects, so neither original attempt identity nor a late settlement is present. Ordinary input refusal on a terminal Execution is a different boundary. 007 K2.3 explicitly requires late authenticated evidence to survive cancellation and first supplies that settlement surface."
    }
  },
  {
    "id": "R7-g1",
    "row": 7,
    "obligation": "CX-6: the cancellation fence survives persistent recovery.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "The port replays a rejection in one process but has no persistent-store restart or record-expiration control. K3.2 first implements persistent receipts and terminal recovery; K5.1 later exercises finite retention limits without weakening that fence."
    }
  },

  {
    "id": "R8-d",
    "row": 8,
    "obligation": "CX-3: required child work must be accounted for by settlement or explicit policy-governed transfer/abandonment before completion.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.1",
      "reason": "K0 has no child creation, link, result or responsibility record. K2.3 can account for Effects but cannot prove child responsibility. 007 K4.1 first implements durable children and required result accounting, so this cannot truthfully be assigned to the K2.4 gate."
    }
  },
  {
    "id": "R8-e1",
    "row": 8,
    "obligation": "CX-4: Unresolved/unknown external work bars completion.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects and therefore cannot establish admitted unknown work. Completing-envelope refusal R8-a has no previously admitted uncertainty and cannot defend this clause. K2.3 first implements uncertainty, safe refusal and required-work accounting; K5.2 later exercises deletion/operations without replacing this first semantic owner."
    }
  },
  {
    "id": "R8-e2",
    "row": 8,
    "obligation": "CX-4: Unresolved/unknown external work does not bar cancellation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects and therefore cannot establish admitted unknown work. Completing-envelope refusal R8-a has no previously admitted uncertainty and cannot defend this clause. K2.3 first implements uncertainty, safe refusal and required-work accounting; K5.2 later exercises deletion/operations without replacing this first semantic owner."
    }
  },
  {
    "id": "R8-e3",
    "row": 8,
    "obligation": "CX-4: cancellation retains unresolved evidence for later reconciliation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects and therefore cannot establish admitted unknown work. Completing-envelope refusal R8-a has no previously admitted uncertainty and cannot defend this clause. K2.3 first implements uncertainty, safe refusal and required-work accounting; K5.2 later exercises deletion/operations without replacing this first semantic owner."
    }
  },
  {
    "id": "R9-b1",
    "row": 9,
    "obligation": "PC-1: inline continuation data is stored unchanged under the opaque Runtime contract.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "Observation can report accepted progress, but the fixture has no Runtime-side observation of the continuation payload delivered back by dispatch. K1.1 explicitly owns opaque pinned progress and asynchronous dispatch, the first implementation of this store-and-return contract."
    }
  },
  {
    "id": "R9-b2",
    "row": 9,
    "obligation": "PC-1: immutable resumable checkpoint references and references to still-running native jobs retain their different recovery guarantees.",
    "evidence": {
      "kind": "assigned",
      "packet": "R1.1",
      "reason": "The fixture progress is ordinary structured data; no native job or checkpoint-form declaration crosses its port. 007 R1.1 first requires a real native boundary to declare identity/resources/lost-submit and unsupported recovery; K1 only requires inline form, so K1.1 must not pretend to implement the native guarantees."
    }
  },
  {
    "id": "R9-b3",
    "row": 9,
    "obligation": "PC-1: progress compatibility uses the pinned definition identity.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The K0 port has no legacy wrapper or Runtime-definition identity negotiation, and missing-code hold cannot discriminate how compatibility was chosen. K1.1 explicitly owns opaque pinned progress and acceptance with no Agent/Workflow discriminator; this is the first actual boundary, following K1.0 structural preparation."
    }
  },
  {
    "id": "R9-c1",
    "row": 9,
    "obligation": "PC-2: Driver publishes a candidate checkpoint before proposing its reference.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R9-c2",
    "row": 9,
    "obligation": "PC-2: Outcome acceptance pins the proposed checkpoint.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R9-c3",
    "row": 9,
    "obligation": "PC-2: Outcome rejection does not pin a candidate checkpoint.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R9-c4",
    "row": 9,
    "obligation": "PC-2: a checkpoint reference identifies its codec.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R9-d1",
    "row": 9,
    "obligation": "PC-3: a mutable session locator must not be advertised as an immutable resumable checkpoint.",
    "evidence": {
      "kind": "assigned",
      "packet": "R1.1",
      "reason": "K0 takeover operates only on a fake immutable exchange and has no native session or Driver recovery capability declaration. R1.1 first declares the native identity/resources/lost-submit and recovery/refusal profile. K3.3 later proves actual stale-host and two-store safety; a declaration here earns none of that durable proof."
    }
  },
  {
    "id": "R9-d2",
    "row": 9,
    "obligation": "PC-3: Locator recovery requires an explicit Driver exclusive-ownership or reconciliation declaration.",
    "evidence": {
      "kind": "assigned",
      "packet": "R1.1",
      "reason": "K0 takeover operates only on a fake immutable exchange and has no native session or Driver recovery capability declaration. R1.1 first declares the native identity/resources/lost-submit and recovery/refusal profile. K3.3 later proves actual stale-host and two-store safety; a declaration here earns none of that durable proof."
    }
  },
  {
    "id": "R9-d3",
    "row": 9,
    "obligation": "PC-3: Absent that declaration, automatic takeover over a locator is refused.",
    "evidence": {
      "kind": "assigned",
      "packet": "R1.1",
      "reason": "K0 takeover operates only on a fake immutable exchange and has no native session or Driver recovery capability declaration. R1.1 first declares the native identity/resources/lost-submit and recovery/refusal profile. K3.3 later proves actual stale-host and two-store safety; a declaration here earns none of that durable proof."
    }
  },
  {
    "id": "R9-e",
    "row": 9,
    "obligation": "PC-4: persisted progress is pinned to the exact compatible Runtime revision.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The control toggles compatible-code availability but exposes no definition/codec identity to distinguish wrong-version acceptance from right-version acceptance. K1.1 first owns opaque pinned progress at create/reserve/dispatch; K3.3 later proves checkpoint-specific persistent version windows."
    }
  },
  {
    "id": "R10-d1",
    "row": 10,
    "obligation": "LP-3: ordinary corrective input cannot withdraw an already-accepted Effect intent.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.1",
      "reason": "R10-c observes accepted Outcome progress, but K0 has no accepted Effect intent to retract. K2.1 first introduces immutable accepted intents and their relation to later input, so the same wording cannot be counted as tested by Outcome-only evidence."
    }
  },
  {
    "id": "R10-d2",
    "row": 10,
    "obligation": "LP-3: ordinary corrective input cannot invalidate an already-accepted action admission; explicit withdrawal is a separate mechanism.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "K0 has no admission or withdrawal command, and Effect refusal precedes both. K2.2 first orders concrete admission and withdrawal/revocation, so this separate admission assertion belongs there, not in the K0 progress-retraction transcript."
    }
  },

  {
    "id": "R4-b4",
    "row": 4,
    "obligation": "ID-6/ID-7: message operation receipt identifies its own acceptance boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.2",
      "reason": "K0 has no mediated message operation or destination acknowledgment. K4.1 introduces child/link receipts, but 007 K4.2 first owns addressed messages, durable destination acceptance and recoverable sender settlement, so a child receipt cannot cover this boundary instance."
    }
  },
  {
    "id": "R1-h",
    "row": 1,
    "obligation": "ID-6: a receipt proves only its own acceptance boundary and never later Effect success.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "The K0 port carries create/Outcome receipt tokens but no Effect success/certainty evidence against which an over-claim could be discriminated. K2.3 first implements result certainty and settlement, where admission/Outcome receipts must not be consumed as proof of action success."
    }
  },
  {
    "id": "R2-e1",
    "row": 2,
    "obligation": "ID-3: the dispatched Runtime input remains pinned for the unresolved exchange beyond the observed Event batch.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "K0 observes the Event IDs in dispatchedBatch and accepted progress, but has no Runtime-side dispatched progress/input observation. K1.1 first implements opaque pinned progress and Driver dispatch; unchanged stored progress alone cannot prove the delivered payload stayed pinned."
    }
  },
  {
    "id": "R2-e2",
    "row": 2,
    "obligation": "ID-3/ID-4: takeover authenticates its requesting principal.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The port takeover command is already authorized by its contract, with no caller principal, recovery-permission proof or denied takeover observation. K1.1 first implements scoped dispatch ownership and retries; K3.2 later supplies lease/crash recovery, rather than turning K0 command naming into authentication evidence."
    }
  },
  {
    "id": "R2-e3",
    "row": 2,
    "obligation": "ID-4: no cross-exchange epoch relation is imposed by the fixture.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: epoch representation remains exchange-local",
      "note": "Schedule ordinals start within each exchange; the preserved relational policy controls exercise legal resets and continuations."
    }
  },
  {
    "id": "R5-j1",
    "row": 5,
    "obligation": "B-1: every fixture batch member refers to an accepted Event.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: batches contain only accepted Events",
      "note": "Checks published batches against accepted mailbox/disposition identities, not an implementation validator."
    }
  },
  {
    "id": "R5-j4",
    "row": 5,
    "obligation": "B-2: the fixture never dispatches directly from WAITING.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: no dispatch while WAITING",
      "note": "The whole-corpus invariant forbids a schedule that selects a batch while still waiting; an Event or deadline acceptance must retire it first. This is fixture protocol consistency, not a claim that a candidate could never run unscheduled internal work."
    }
  },
  {
    "id": "R5-j6",
    "row": 5,
    "obligation": "B-3: the fixture exposes no Kernel semantic-obedience judgment.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: no semantic-obedience protocol field",
      "note": "The published protocol shape exposes accounting and no obedience judgment; this does not prove what a future implementation parses."
    }
  },
  {
    "id": "R5-j7",
    "row": 5,
    "obligation": "B-3: a Runtime intentionally ignoring an acknowledged Event records that choice in its own progress.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.4",
      "reason": "K0 has opaque scripted progress and no Runtime semantic decision/ignore observation. K1.4 first bridges real existing controller behavior as private Runtime machinery and ports its useful conformance; the Kernel must not inspect that content to certify obedience."
    }
  },
  {
    "id": "R5-j8",
    "row": 5,
    "obligation": "W-3: live wait generation exists exactly while WAITING in the fixture.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: live generation exactly while WAITING",
      "note": "Checks both directions of the lifecycle/generation relation on every expected observation."
    }
  },
  {
    "id": "R5-j9",
    "row": 5,
    "obligation": "B-8: fixture reservation consumes wait-ended readiness.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: reservation consumes readiness",
      "note": "Checks the reservation observation independently of subsequent readiness resurrection."
    }
  },
  {
    "id": "R5-k3",
    "row": 5,
    "obligation": "W-1: the target fixture wait has no callback.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: wait grammar excludes callback",
      "note": "Checks this forbidden semantic shape independently against the closed declarative WaitRecord/DependencyAlternative vocabulary."
    }
  },
  {
    "id": "R5-k4",
    "row": 5,
    "obligation": "W-3: each registration allocates an independent generation identity, distinct in role from Execution and Activation identity.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "K0 supplies generation strings in its wait commands, so it can test fencing but not a Kernel generation allocator or namespace adapter. K1.3 first owns wait generation creation and the concrete representation; equal token spellings across independent namespaces are not forbidden here."
    }
  },
  {
    "id": "R5-k5",
    "row": 5,
    "obligation": "W-4: legacy resumption bookkeeping remains private to the compatibility Runtime.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.4",
      "reason": "K0 imports no legacy bridge and observes no private resumption machinery. K1.4 explicitly integrates the legacy bridge as Runtime-private machinery, preserving supported behavior or documenting migration/refusal, and is the first truthful behavior owner after K1.0 structural preparation."
    }
  },
  {
    "id": "R5-k6",
    "row": 5,
    "obligation": "W-9: the Kernel-minted timeout Event has a stable identity across delivery attempts.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies a fully formed timeoutEvent and observes only Event IDs in the mailbox/batch; it cannot inspect the candidate-minted envelope or detect a wrong payload/class behind the same ID. K1.3 first implements Kernel timeout minting and its concrete Event schema; identity retention itself is already R5-f2a."
    }
  },
  {
    "id": "R7-g2",
    "row": 7,
    "obligation": "CX-6: an accepted nonterminal Outcome replays its original accepted answer after cancellation, rather than being reclassified as a loser.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 20,
      "counterexamples": [
        "clauses/r7-g2"
      ]
    }
  },
  {
    "id": "R2-e4",
    "row": 2,
    "obligation": "ID-9 case 4: submitting changed content for an old accepted exchange never revives its progress.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 16,
      "counterexamples": [
        "clauses/r2-e4"
      ]
    }
  },
  {
    "id": "R3-i1",
    "row": 3,
    "obligation": "OA-3: a current Activation and epoch cannot accept progress from an envelope with the wrong base revision.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 13,
      "counterexamples": [
        "clauses/r3-i1"
      ]
    }
  },
  {
    "id": "R5-j2",
    "row": 5,
    "obligation": "B-2/B-4: ordinary readiness after a consumed wait selects retained backlog in bounded acceptance order.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 12,
      "counterexamples": [
        "clauses/r5-j2"
      ]
    }
  },
  {
    "id": "R5-j2b",
    "row": 5,
    "atomicity": "One empty-list branch declines reservation altogether. The ordinary no-dispatch branch keeps READY and creates neither Activation nor batch. This isolates the permission to dispatch an empty ordinary batch while preserving the independent Activation/batch existence relation.",
    "obligation": "B-2: an ordinary READY Execution with an empty mailbox may dispatch an empty batch.",
    "evidence": {
      "kind": "scenario",
      "scenario": "control-missing-checkpoint-code",
      "stepIndex": 3,
      "counterexamples": [
        "clauses/r5-j2b"
      ]
    }
  },
  {
    "id": "R5-j3",
    "row": 5,
    "obligation": "B-2/W-9 case 3: a wait-ended batch with room includes both its mandatory timeout and the later eligible result.",
    "evidence": {
      "kind": "scenario",
      "scenario": "control-stale-timer-and-lost-wake",
      "stepIndex": 10,
      "counterexamples": [
        "clauses/r5-j3"
      ]
    }
  },
  {
    "id": "R5-j3b",
    "row": 5,
    "obligation": "B-2: the selected wait-ended batch is presented in per-Execution acceptance order, including Events accepted after the wake.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 6,
      "counterexamples": [
        "clauses/r5-j3b"
      ]
    }
  },
  {
    "id": "R5-j5",
    "row": 5,
    "obligation": "B-3: reservation itself acknowledges no Event from the pinned batch.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 6,
      "counterexamples": [
        "clauses/r5-j5"
      ]
    }
  },
  {
    "id": "R5-k1",
    "row": 5,
    "obligation": "W-1: an exact Event-identity selector cannot be ignored when kind and correlation match.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 8,
      "counterexamples": [
        "clauses/r5-k1"
      ]
    },
    "atomicity": "One selector predicate is wrong; the ordinary B-6 branch consumes its Boolean result and consistently writes lifecycle, live generation and readiness. This transcript isolates eligibility, so both W-3 directions and readiness lifecycle still hold. Independent partial-write failures remain separate obligations."
  },
  {
    "id": "R5-k1b",
    "row": 5,
    "obligation": "W-1: membership in the non-first member of a finite kind set can make an Event eligible.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 9,
      "counterexamples": [
        "clauses/r5-k1b"
      ]
    },
    "atomicity": "One selector predicate is wrong; the ordinary B-6 branch consumes its Boolean result and consistently writes lifecycle, live generation and readiness. This transcript isolates eligibility, so both W-3 directions and readiness lifecycle still hold. Independent partial-write failures remain separate obligations."
  },
  {
    "id": "R5-k2",
    "row": 5,
    "obligation": "W-7 case 2: an already-accepted Event matching only the second alternative is found at registration.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 4,
      "counterexamples": [
        "clauses/r5-k2"
      ]
    },
    "atomicity": "One selector predicate is wrong; the ordinary B-6 branch consumes its Boolean result and consistently writes lifecycle, live generation and readiness. This transcript isolates eligibility, so both W-3 directions and readiness lifecycle still hold. Independent partial-write failures remain separate obligations."
  },
  {
    "id": "R5-k7",
    "row": 5,
    "obligation": "W-9/CX-6: terminal cancellation after timeout retirement before reservation explicitly disposes the timeout Event.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 19,
      "counterexamples": [
        "clauses/r5-k7"
      ]
    }
  },
  {
    "id": "R5-k7b",
    "row": 5,
    "obligation": "W-9/CX-6: terminal cancellation before reservation suppresses the pending timeout readiness.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 19,
      "counterexamples": [
        "clauses/r5-k7b"
      ]
    }
  },

  {
    "id": "R9-f1",
    "row": 9,
    "obligation": "PC-5: missing checkpoint recovery produces an explicit inspectable hold/refusal.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "The K0 recover command varies availableDefinitionRevisions only: it cannot remove a checkpoint or required resource independently of code availability. R9-a1/a2 discriminate the compatible-code case. 007 K3.3 explicitly owns unavailable code/checkpoint/resource recovery and two-store windows, the first truthful owner for this separate missing-state trigger."
    }
  },
  {
    "id": "R9-f2",
    "row": 9,
    "obligation": "PC-5: missing required resource recovery produces an explicit inspectable hold/refusal.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "The K0 recover command varies availableDefinitionRevisions only: it cannot remove a checkpoint or required resource independently of code availability. R9-a1/a2 discriminate the compatible-code case. 007 K3.3 explicitly owns unavailable code/checkpoint/resource recovery and two-store windows, the first truthful owner for this separate missing-state trigger."
    }
  },

  {
    "id": "R1-i",
    "row": 1,
    "obligation": "ID-2: the destination participates in subsequent input identity; the same producer and raw key at another Execution accepts a distinct input.",
    "evidence": {
      "kind": "scenario",
      "scenario": "cited-decision-edges",
      "stepIndex": 24,
      "counterexamples": [
        "clauses/r1-i"
      ]
    }
  },
  {
    "id": "R3-i2",
    "row": 3,
    "obligation": "OA-5: a rejected classified Outcome is not silently retried automatically by the Kernel.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "The fixture supplies every dispatch/submission command and exposes no autonomous retry count or internal Driver invocation. An unchanged observation cannot distinguish a hidden repeated dispatch. K1.2 first implements classified Outcome rejection and its dispatch/receipt integration; OA-6 unclassifiable failure is separately R3-h2."
    }
  },

  {
    "id": "R5-j1-2",
    "row": 5,
    "obligation": "B-1: every fixture dispatch bound is at least one.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: dispatch bounds are positive",
      "note": "Checks scheduled bound values independently of batch membership; concrete bound validation belongs to K1.1."
    }
  },
  {
    "id": "R5-k6-2",
    "row": 5,
    "obligation": "W-9: the minted timeout Event addresses the Execution whose wait expired.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies a fully formed timeoutEvent and observes only Event IDs in the mailbox/batch; it cannot inspect the candidate-minted envelope or detect a wrong payload/class behind the same ID. K1.3 first implements Kernel timeout minting and its concrete Event schema; identity retention itself is already R5-f2a."
    }
  },
  {
    "id": "R5-k6-3",
    "row": 5,
    "obligation": "W-9: the minted timeout Event carries the semantic timeout class.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies a fully formed timeoutEvent and observes only Event IDs in the mailbox/batch; it cannot inspect the candidate-minted envelope or detect a wrong payload/class behind the same ID. K1.3 first implements Kernel timeout minting and its concrete Event schema; identity retention itself is already R5-f2a."
    }
  },
  {
    "id": "R5-k6-4",
    "row": 5,
    "obligation": "W-9: the minted timeout Event correlates to the exact expired wait generation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies a fully formed timeoutEvent and observes only Event IDs in the mailbox/batch; it cannot inspect the candidate-minted envelope or detect a wrong payload/class behind the same ID. K1.3 first implements Kernel timeout minting and its concrete Event schema; identity retention itself is already R5-f2a."
    }
  },
  {
    "id": "R2-e1-2",
    "row": 2,
    "obligation": "ID-3: the base accepted progress revision delivered to the Runtime remains pinned for the unresolved exchange.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "K0 observes the Event IDs in dispatchedBatch and accepted progress, but has no Runtime-side dispatched progress/input observation. K1.1 first implements opaque pinned progress and Driver dispatch; unchanged stored progress alone cannot prove the delivered payload stayed pinned."
    }
  },
  {
    "id": "R2-e2-2",
    "row": 2,
    "obligation": "ID-3/ID-9: takeover requires an affirmative recovery permission decision.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The port takeover command is already authorized by its contract, with no caller principal, recovery-permission proof or denied takeover observation. K1.1 first implements scoped dispatch ownership and retries; K3.2 later supplies lease/crash recovery, rather than turning K0 command naming into authentication evidence."
    }
  },
  {
    "id": "R2-e2-3",
    "row": 2,
    "obligation": "ID-9: an epoch value alone is never a takeover credential.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The port takeover command is already authorized by its contract, with no caller principal, recovery-permission proof or denied takeover observation. K1.1 first implements scoped dispatch ownership and retries; K3.2 later supplies lease/crash recovery, rather than turning K0 command naming into authentication evidence."
    }
  },
  {
    "id": "R2-e2-4",
    "row": 2,
    "obligation": "ID-9: host liveness alone is never proof of write ownership.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The port takeover command is already authorized by its contract, with no caller principal, recovery-permission proof or denied takeover observation. K1.1 first implements scoped dispatch ownership and retries; K3.2 later supplies lease/crash recovery, rather than turning K0 command naming into authentication evidence."
    }
  },
  {
    "id": "R5-h1-2",
    "row": 5,
    "obligation": "CL-1: a scheduler lease is distinct from a wait deadline.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 exposes only a wait deadline and an authorized takeover command, not Execution deadline or lease identity/expiry. K1.3 first owns wait and cancellation clocks, but the three-way operational distinction first becomes testable in K3.2 persistent lifecycle/dispatch recovery on a worker claim; K3.1 prepares its fault harness, not the implementation."
    }
  },
  {
    "id": "R5-h1-3",
    "row": 5,
    "obligation": "CL-1: a scheduler lease is distinct from an Execution deadline.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 exposes only a wait deadline and an authorized takeover command, not Execution deadline or lease identity/expiry. K1.3 first owns wait and cancellation clocks, but the three-way operational distinction first becomes testable in K3.2 persistent lifecycle/dispatch recovery on a worker claim; K3.1 prepares its fault harness, not the implementation."
    }
  },
  {
    "id": "R5-h2-2",
    "row": 5,
    "obligation": "CL-1: logical Execution deadline cancellation is not proof of native interruption.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The port can accept cancellation but cannot deliver an Execution-deadline expiry or observe its mapping. K1.3 owns out-of-band cancellation and wait/cancel races, the first truthful owner of this logical expiry-to-control mapping; physical interruption remains Driver work."
    }
  },
  {
    "id": "R5-h3-2",
    "row": 5,
    "obligation": "CL-1: lease expiry does not prove the previous host died.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 takeover is an already-authorized command and supplies no lease, worker liveness or recovery inspection. K3.2 first implements persistent dispatch/lifecycle recovery under the real K3.1 kill harness; K3.3 subsequently tests native stale-host exclusion, which Kernel fencing alone cannot prove."
    }
  },
  {
    "id": "R5-h3-3",
    "row": 5,
    "obligation": "CL-1: lease expiry grants no unchecked write authority.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 takeover is an already-authorized command and supplies no lease, worker liveness or recovery inspection. K3.2 first implements persistent dispatch/lifecycle recovery under the real K3.1 kill harness; K3.3 subsequently tests native stale-host exclusion, which Kernel fencing alone cannot prove."
    }
  },
  {
    "id": "R5-h4-2",
    "row": 5,
    "obligation": "CL-2/W-9: timeout is not proof that an external action never executed.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "R5-f3 already preserves a generic later result Event. The port has no admitted action or outcome-certainty record whose evidence a timeout could corrupt. K2.3 first implements settlement/uncertainty and required-work accounting, so it owns the separate action-evidence assertion."
    }
  },
  {
    "id": "R5-i4-2",
    "row": 5,
    "obligation": "B-6: child destination readiness commits at actual destination Event acceptance.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.1",
      "reason": "No K0 command can create or replay a child routing obligation independently of accepting an Event. K4.1 owns the first child/result-route crash tests and hence both fulfilment identity and destination wake; K0 synthetic ingress is not that evidence."
    }
  },
  {
    "id": "R5-i5-2",
    "row": 5,
    "obligation": "B-6: a profile may combine source routing and destination acceptance in one transaction.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.2",
      "reason": "The fixture has no sender operation, delivery acknowledgment or source routing record. K4.2 first implements mediated destination acceptance and recoverable sender settlement; this assignment preserves both single-transaction and split-transaction profiles."
    }
  },
  {
    "id": "R7-f1-2",
    "row": 7,
    "obligation": "CX-5: late authenticated settlement retains the original physical attempt identity.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 cannot admit or settle Effects, so neither original attempt identity nor a late settlement is present. Ordinary input refusal on a terminal Execution is a different boundary. 007 K2.3 explicitly requires late authenticated evidence to survive cancellation and first supplies that settlement surface."
    }
  },
  {
    "id": "R7-g1-2",
    "row": 7,
    "obligation": "CX-6: the recorded cancellation rejection survives persistent recovery.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "The port replays a rejection in one process but has no persistent-store restart or record-expiration control. K3.2 first implements persistent receipts and terminal recovery; K5.1 later exercises finite retention limits without weakening that fence."
    }
  },
  {
    "id": "R7-g1-3",
    "row": 7,
    "obligation": "CX-6: record expiration never permits the cancellation loser to be accepted.",
    "evidence": {
      "kind": "assigned",
      "packet": "K5.1",
      "reason": "K0 has no record-expiration control. K3.2 owns persistent fence/rejection recovery; 007 K5.1 first introduces finite retention/expiration while preserving accepted truth."
    }
  },
  {
    "id": "R8-e3-2",
    "row": 8,
    "obligation": "CX-4: cancellation never converts unknown evidence into a resolved result.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "K0 refuses Effects and therefore cannot establish admitted unknown work. Completing-envelope refusal R8-a has no previously admitted uncertainty and cannot defend this clause. K2.3 first implements uncertainty, safe refusal and required-work accounting; K5.2 later exercises deletion/operations without replacing this first semantic owner."
    }
  },
  {
    "id": "R9-b1-2",
    "row": 9,
    "obligation": "PC-1: dispatch returns the stored inline continuation data unchanged to the Runtime.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "Observation can report accepted progress, but the fixture has no Runtime-side observation of the continuation payload delivered back by dispatch. K1.1 explicitly owns opaque pinned progress and asynchronous dispatch, the first implementation of this store-and-return contract."
    }
  },
  {
    "id": "R9-b3-2",
    "row": 9,
    "obligation": "PC-1: progress compatibility uses the pinned Runtime identity.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The K0 port has no legacy wrapper or Runtime-definition identity negotiation, and missing-code hold cannot discriminate how compatibility was chosen. K1.1 explicitly owns opaque pinned progress and acceptance with no Agent/Workflow discriminator; this is the first actual boundary, following K1.0 structural preparation."
    }
  },
  {
    "id": "R9-b3-3",
    "row": 9,
    "obligation": "PC-1: progress compatibility uses the pinned codec identity.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The K0 port has no legacy wrapper or Runtime-definition identity negotiation, and missing-code hold cannot discriminate how compatibility was chosen. K1.1 explicitly owns opaque pinned progress and acceptance with no Agent/Workflow discriminator; this is the first actual boundary, following K1.0 structural preparation."
    }
  },
  {
    "id": "R9-b3-4",
    "row": 9,
    "obligation": "PC-1: compatibility is never selected from a legacy Agent/Workflow wrapper tag.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The K0 port has no legacy wrapper or Runtime-definition identity negotiation, and missing-code hold cannot discriminate how compatibility was chosen. K1.1 explicitly owns opaque pinned progress and acceptance with no Agent/Workflow discriminator; this is the first actual boundary, following K1.0 structural preparation."
    }
  },
  {
    "id": "R9-c4-2",
    "row": 9,
    "obligation": "PC-2: a checkpoint reference identifies the codec version.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R9-c4-3",
    "row": 9,
    "obligation": "PC-2: a checkpoint reference identifies required resource versions.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R9-d1-2",
    "row": 9,
    "obligation": "PC-3: Kernel CAS alone must not be advertised as preventing native-session mutation.",
    "evidence": {
      "kind": "assigned",
      "packet": "R1.1",
      "reason": "K0 takeover operates only on a fake immutable exchange and has no native session or Driver recovery capability declaration. R1.1 first declares the native identity/resources/lost-submit and recovery/refusal profile. K3.3 later proves actual stale-host and two-store safety; a declaration here earns none of that durable proof."
    }
  },
  {
    "id": "R9-e-2",
    "row": 9,
    "obligation": "PC-4: persisted progress is pinned to the exact compatible definition revision.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The control toggles compatible-code availability but exposes no definition/codec identity to distinguish wrong-version acceptance from right-version acceptance. K1.1 first owns opaque pinned progress at create/reserve/dispatch; K3.3 later proves checkpoint-specific persistent version windows."
    }
  },
  {
    "id": "R9-f1-2",
    "row": 9,
    "obligation": "PC-5: missing checkpoint recovery never fabricates empty restored progress.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "The K0 recover command varies availableDefinitionRevisions only: it cannot remove a checkpoint or required resource independently of code availability. R9-a1/a2 discriminate the compatible-code case. 007 K3.3 explicitly owns unavailable code/checkpoint/resource recovery and two-store windows, the first truthful owner for this separate missing-state trigger."
    }
  },
  {
    "id": "R9-f2-2",
    "row": 9,
    "obligation": "PC-5: missing required resource recovery never fabricates empty restored progress.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "The K0 recover command varies availableDefinitionRevisions only: it cannot remove a checkpoint or required resource independently of code availability. R9-a1/a2 discriminate the compatible-code case. 007 K3.3 explicitly owns unavailable code/checkpoint/resource recovery and two-store windows, the first truthful owner for this separate missing-state trigger."
    }
  },
  {
    "id": "R5-j8-2",
    "row": 5,
    "obligation": "B-8: fixture readiness exists only in READY.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: readiness only in READY",
      "note": "Checks readiness presence against lifecycle separately from registration retirement."
    }
  },
  {
    "id": "R5-j8-3",
    "row": 5,
    "obligation": "B-8: fixture readiness names an actually retired registration.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: readiness requires retirement",
      "note": "Tracks proposed and live registrations by Execution and requires readiness to name a registration no longer live."
    }
  },
  {
    "id": "R5-j9-2",
    "row": 5,
    "obligation": "B-8: consumed fixture readiness never re-arms or spans another exchange.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: consumed readiness never reappears",
      "note": "Tracks generation identities consumed at reservation and forbids their later reappearance."
    }
  },
  {
    "id": "R5-k3-2",
    "row": 5,
    "obligation": "W-1: the target fixture wait has no payload selector.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: wait grammar excludes payload selector",
      "note": "Checks this forbidden semantic shape independently against the closed declarative WaitRecord/DependencyAlternative vocabulary."
    }
  },
  {
    "id": "R5-k3-3",
    "row": 5,
    "obligation": "W-5: the target fixture wait has no interleave field.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: wait grammar excludes interleave field",
      "note": "Checks this forbidden semantic shape independently against the closed declarative WaitRecord/DependencyAlternative vocabulary."
    }
  },
  {
    "id": "R5-k3-4",
    "row": 5,
    "obligation": "W-4: the target fixture wait has no native work identity.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: wait grammar excludes native work identity",
      "note": "Checks this forbidden semantic shape independently against the closed declarative WaitRecord/DependencyAlternative vocabulary."
    }
  },
  {
    "id": "R5-k3-5",
    "row": 5,
    "obligation": "W-4: the target fixture wait has no Runtime-local arm.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: wait grammar excludes Runtime-local arm",
      "note": "Checks this forbidden semantic shape independently against the closed declarative WaitRecord/DependencyAlternative vocabulary."
    }
  },
  {
    "id": "R2-e3-2",
    "row": 2,
    "obligation": "ID-4: no concrete epoch token spelling is imposed by the fixture.",
    "evidence": {
      "kind": "corpus",
      "test": "blind-spot-regression.test.ts: round-13 conforming epoch policies",
      "note": "Preserved C13 relational policy controls include opaque token adaptation. This claim is independent of cross-exchange ordering."
    }
  },

  {
    "id": "R1-g-2",
    "row": 1,
    "obligation": "ID-6: dispatch-intent receipt names its specific accepted position within that boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "The port observes Activation identity and batch but exposes no dispatch receipt or dispatch acceptance position. 007 K1.1 first implements reservation/dispatch intent and its minimum inspection; an Activation token cannot substitute for this receipt."
    }
  },
  {
    "id": "R5-i1-2",
    "row": 5,
    "obligation": "B-6 path B: accepted Event-triggered readiness survives a crash after Event acceptance before reservation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 has no process-death or surviving-store command: scheduled observations cannot demonstrate persistence. K3.2 first implements persistent accepted truth and readiness reconstruction with K3.1 real worker/host kills, for both Outcome and Event acceptance windows."
    }
  },
  {
    "id": "R5-i1-3",
    "row": 5,
    "obligation": "B-7 path A: accepted deadline readiness survives a crash after Outcome acceptance before reservation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 has no process-death or surviving-store command: scheduled observations cannot demonstrate persistence. K3.2 first implements persistent accepted truth and readiness reconstruction with K3.1 real worker/host kills, for both Outcome and Event acceptance windows."
    }
  },
  {
    "id": "R5-i1-4",
    "row": 5,
    "obligation": "B-7 path B: accepted deadline readiness survives a crash after Kernel timeout acceptance before reservation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 has no process-death or surviving-store command: scheduled observations cannot demonstrate persistence. K3.2 first implements persistent accepted truth and readiness reconstruction with K3.1 real worker/host kills, for both Outcome and Event acceptance windows."
    }
  },
  {
    "id": "R5-i1-5",
    "row": 5,
    "obligation": "B-2/B-6: accepted mailbox facts survive a crash before reservation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 has no process-death or surviving-store command: scheduled observations cannot demonstrate persistence. K3.2 first implements persistent accepted truth and readiness reconstruction with K3.1 real worker/host kills, for both Outcome and Event acceptance windows."
    }
  },
  {
    "id": "R5-i1-6",
    "row": 5,
    "obligation": "B-7: the accepted timeout Event survives a crash before reservation.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 has no process-death or surviving-store command: scheduled observations cannot demonstrate persistence. K3.2 first implements persistent accepted truth and readiness reconstruction with K3.1 real worker/host kills, for both Outcome and Event acceptance windows."
    }
  },
  {
    "id": "R1-j1",
    "row": 1,
    "obligation": "ID-2: rejected create conflict never edits the stored content behind the original Event reference.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "K0 observes queued/acknowledged Event IDs, not the stored input envelope behind an unchanged ID. K1.1 first implements atomic create/input scoped identity with minimum inspection, where unchanged content can be observed separately from retained reference/order."
    }
  },
  {
    "id": "R1-j2",
    "row": 1,
    "obligation": "ID-2: rejected subsequent input conflict never edits the stored content behind the original Event reference.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.1",
      "reason": "K0 observes queued/acknowledged Event IDs, not the stored input envelope behind an unchanged ID. K1.1 first implements atomic create/input scoped identity with minimum inspection, where unchanged content can be observed separately from retained reference/order."
    }
  },
  {
    "id": "R2-f1",
    "row": 2,
    "obligation": "B-1: fixture batches use explicit finite enumerable Event references, never a global cursor.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: batches are explicit reference lists",
      "note": "Checks the published batch representation independently of pinning across later mailbox arrivals."
    }
  },
  {
    "id": "R5-j10",
    "row": 5,
    "obligation": "B-2: no fixture batch exceeds its dispatch command bound.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: batches respect their bounds",
      "note": "Checks selected size independently of accepted membership and presentation order."
    }
  },
  {
    "id": "R5-j11",
    "row": 5,
    "obligation": "B-2: a fixture wait-ended dispatch never reserves an empty batch.",
    "evidence": {
      "kind": "corpus",
      "test": "cited-decisions.test.ts: wait-ended batches are nonempty",
      "note": "Checks readiness-consuming reservations independently of ordinary empty-batch permission."
    }
  },
  {
    "id": "R7-h1",
    "row": 7,
    "obligation": "OA-5/CX-6: replay of a cancellation loser cannot install proposed progress.",
    "evidence": {
      "kind": "scenario",
      "scenario": "control-cancel-versus-complete",
      "stepIndex": 4,
      "counterexamples": [
        "clauses/r7-h1"
      ]
    }
  },
  {
    "id": "R2-f2",
    "row": 2,
    "obligation": "ID-9 case 1: ordinary redelivery alone cannot make the subsequent current Outcome stale.",
    "evidence": {
      "kind": "scenario",
      "scenario": "redelivery-acceptance",
      "stepIndex": 3,
      "counterexamples": [
        "clauses/r2-f2"
      ]
    },
    "atomicity": "The stale classifier incorrectly treats repeated delivery as supersession. Taking its rejection branch retains the unresolved exchange, progress and input, returns no accepted receipt, and records stale_exchange. This is one wrong admission predicate followed by the ordinary no-commit branch, not unrelated partial writers."
  },
  {
    "id": "R3-j1",
    "row": 3,
    "obligation": "OA-4/W-2: Outcome acceptance survives crash recovery as one all-or-none boundary across progress, acknowledgment, emissions, intents and next state.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.2",
      "reason": "K0 cannot crash or restart an authoritative store. K3.2 first implements the transactional persistent accepted boundary under real process kills; a scheduled in-memory observation proves none of that all-or-none recovery relation."
    }
  },

  {
    "id": "R4-b1-2",
    "row": 4,
    "obligation": "ID-6: Effect admission receipt identifies the specific accepted position inside that boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.2",
      "reason": "EF-1/EF-2 refuse every K1 Outcome proposing an Effect at whole-envelope validation (OA-3) before any intent, ID or proposal-key binding exists, so no Effect intent is ever created for admission to accept. Admission (kernel.md Acceptance/atomicity: current policy/consent decision and attempt intent under current dispatch ownership) is a K2-introduced boundary that does not exist yet. 007 assigns concrete admission to K2.2."
    }
  },
  {
    "id": "R4-b2-2",
    "row": 4,
    "obligation": "ID-6: Effect settlement receipt identifies the specific accepted position inside that boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K2.3",
      "reason": "Same K1 refusal as R4-b1: with no admitted intent there is nothing to settle, and settlement (authenticated evidence, action state, result Event and recoverable readiness) never runs. 007 assigns trusted attempt evidence, settlement and required-work accounting to K2.3. Fabricating a settlement receipt in K0.2 would require inventing the admitted intent it settles."
    }
  },
  {
    "id": "R4-b3-2",
    "row": 4,
    "obligation": "ID-6: child operation receipt identifies the specific accepted position inside that boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.1",
      "reason": "K1 has no child delegation or addressed-messaging surface; composition (child-link, structural budget, event router, input requests) is owned by K4, starting with durable children/delegation in K4.1 and addressed messages/replies in K4.2. Minting a child/message receipt in K0.2 would fabricate the composition operation it evidences. Row 8 separately assigns required child accounting to R8-d/K4.1; R8-c/K2.3 owns required Effects. Neither has an observable owned-work surface in K0.2."
    }
  },
  {
    "id": "R4-b4-2",
    "row": 4,
    "obligation": "ID-6: message operation receipt identifies the specific accepted position inside that boundary.",
    "evidence": {
      "kind": "assigned",
      "packet": "K4.2",
      "reason": "K0 has no mediated message operation or destination acknowledgment. K4.1 introduces child/link receipts, but 007 K4.2 first owns addressed messages, durable destination acceptance and recoverable sender settlement, so a child receipt cannot cover this boundary instance."
    }
  },
  {
    "id": "R5-j6-2",
    "row": 5,
    "obligation": "B-3: Kernel acknowledgment never parses Runtime progress to establish semantic compliance.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.2",
      "reason": "K0 reports opaque scripted progress and has no candidate-internal parser observation. K1.2 first implements progress acceptance and whole-batch acknowledgment; its Kernel implementation must preserve opacity rather than inspect Runtime choices."
    }
  },
  {
    "id": "R9-c1-2",
    "row": 9,
    "obligation": "PC-2: the published candidate checkpoint is immutable.",
    "evidence": {
      "kind": "assigned",
      "packet": "K3.3",
      "reason": "K0 has no checkpoint publication, pin, rejection-pin or resource-version observation; its missing-code control only sees hold/refusal. 007 K3.3 explicitly owns checkpoint pin/delete and native two-store windows, the first truthful implementation/evidence owner after the R1 capability declarations."
    }
  },
  {
    "id": "R5-k5-2",
    "row": 5,
    "obligation": "W-5: legacy interleave behavior is preserved privately until explicit migration/refusal.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.4",
      "reason": "K0 imports no legacy bridge and observes no private resumption machinery. K1.4 explicitly integrates the legacy bridge as Runtime-private machinery, preserving supported behavior or documenting migration/refusal, and is the first truthful behavior owner after K1.0 structural preparation."
    }
  },
  {
    "id": "R5-i6-2",
    "row": 5,
    "obligation": "W-9: a Runtime cannot assert authority to mint a Kernel timeout.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies an already-categorized timeoutEvent on deliver_timer, with no authenticated submitter or ingress authority decision. K1.3 first implements deadline minting and separately scoped Event ingress; category typing is not authentication evidence."
    }
  },
  {
    "id": "R5-i6-3",
    "row": 5,
    "obligation": "W-9: an application producer cannot assert authority to mint a Kernel timeout.",
    "evidence": {
      "kind": "assigned",
      "packet": "K1.3",
      "reason": "The laboratory supplies an already-categorized timeoutEvent on deliver_timer, with no authenticated submitter or ingress authority decision. K1.3 first implements deadline minting and separately scoped Event ingress; category typing is not authentication evidence."
    }
  },
];
