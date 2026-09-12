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
 * does not count.
 *
 * `coverage.test.ts` enforces all of it mechanically, including that the named step exists and that
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
 * Observation fields that one accepted transaction necessarily writes together, so moving several of
 * them is one act rather than several independently violable ones.
 *
 * This table is the thing a reviewer should disagree with if they disagree with the atomicity guard
 * below: it is a claim about the protocol's writers, and it is stated once here rather than repeated
 * in thirty entries. Every grouping cites the decision that couples the fields.
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
    fields: ["state", "liveWaitGeneration", "waitEndedReadiness"],
    because:
      "W-2/W-3 and B-6/B-7/B-8: a live generation exists exactly while WAITING, and the transaction that retires one commits the readiness and the new lifecycle state together. §3's table lists them as one row's worth of accepted facts.",
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
    id: "R1-b2",
    row: 1,
    obligation: "It is never silently accepted as an edit: the accepted content is unchanged by the conflicting request.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 2, counterexamples: ["identity-create/same-key-different-content-applied-as-an-edit"] },
  },

  // == Row 2: Activation dispatch intent =====================================
  {
    id: "R2-a",
    row: 2,
    obligation: "Two semantically different dispatches never carry the same Activation ID.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 7, counterexamples: ["identity-activation/new-exchange-reuses-the-resolved-activation-id"] },
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
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 7, counterexamples: ["envelope/accepted-outcome-leaves-its-batch-unacknowledged"] },
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
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 4, counterexamples: ["identity-activation/takeover-mints-a-new-activation-id"] },
  },
  {
    id: "R2-c2",
    row: 2,
    obligation: "That takeover advances the writer epoch, which is the other half of ID-9 and is what fences the superseded writer.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 4, counterexamples: ["identity-activation/takeover-leaves-the-writer-epoch-unchanged"] },
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
    id: "R3-b",
    row: 3,
    obligation: "A same-identity, different-content submission is rejected, not merged.",
    atomicity:
      "One bug, not two: the conflicting Outcome is patched into accepted state instead of being rejected. Committing its progress and failing to record a conflict are the same decision — an implementation that deduplicates on identity without comparing content does both by construction. A candidate that records the conflict *and* merges it is not plausible: the merge is what happens instead of the rejection.",
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
      "One bug: the Effect is stripped and the remainder of the envelope accepted, and the remainder here is the progress and the emission together. Whether a candidate can accept only part of that remainder is a different assertion, and it has its own entries — R3-c1 and R3-c1b observe partial acceptance of a refused envelope directly.",
    evidence: { kind: "scenario", scenario: "effect-refusal-and-sink-attribution", stepIndex: 2, counterexamples: ["effect-refusal/rest-of-the-outcome-silently-split"] },
  },
  {
    id: "R4-a4",
    row: 4,
    obligation: "Nothing is physically attempted against the outside world, independently of what the candidate reports about itself.",
    evidence: { kind: "scenario", scenario: "effect-refusal-and-sink-attribution", stepIndex: 2, counterexamples: ["effect-refusal/refusal-claimed-while-the-sink-was-called"] },
  },

  // == Row 5(a): wait record shape and structural well-formedness ============
  {
    id: "R5-a1",
    row: 5,
    obligation: "(a) Rule 1: a declaration with both lists empty is malformed.",
    atomicity:
      "One bug: the malformed declaration registers. Registering *is* all three groups at once — the Execution moves to WAITING under the generation (lifecycle), the accepted Outcome resolves the exchange (activation), and there is no rejection to record (answer). No plausible implementation registers the wait while also recording the refusal.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 3, counterexamples: ["envelope/bare-empty-wait-registered"] },
  },
  {
    id: "R5-a1b",
    row: 5,
    obligation: "(a) Rule 1: a deadline does not rescue it — the case worksheet revision 9 answered two ways, where well-formedness is read as 'can this wait end'.",
    atomicity:
      "One bug, as in R5-a1: the declaration registers because well-formedness was read as 'can this wait end', and registering moves the lifecycle, resolves the exchange and produces no rejection together. What distinguishes this entry from R5-a1 is the *record submitted*, not the fields observed.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 4, counterexamples: ["envelope/structurally-empty-wait-registered-because-it-has-a-deadline"] },
  },
  {
    id: "R5-a2",
    row: 5,
    obligation: "(a) Rule 2: every present alternative must supply at least one of the three selector fields; a match-everything alternative is invalid, not a shorthand.",
    atomicity:
      "One bug, as in R5-a1: a match-everything alternative passes validation, and the wait then registers — lifecycle, exchange resolution and the absent rejection are the single consequence of that one acceptance.",
    evidence: { kind: "scenario", scenario: "control-whole-envelope-validation", stepIndex: 5, counterexamples: ["envelope/match-everything-alternative-registered"] },
  },
  {
    id: "R5-a3",
    row: 5,
    obligation: "(a) Rule 2: an empty supplied kind set is malformed, neither a selector that matches nothing nor a spelling of an absent field.",
    atomicity:
      "One bug, as in R5-a1: an empty supplied kind set is read as a selector matching nothing rather than as malformed, so the wait registers, with the same single consequence across the three groups.",
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
      "One bug: the candidate refuses a structurally valid declaration as unsatisfiable. A refusal commits nothing and leaves the exchange open, so the progress, disposition, lifecycle and activation groups all sit where the *previous* step left them and the answer group carries a rejection instead of acceptance. Every field difference follows from the single decision to refuse.",
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 2, counterexamples: ["wait-structure/inert-alternative-refused-as-unsatisfiable"] },
  },
  {
    id: "R5-a6",
    row: 5,
    obligation: "(a) A subscription-only input wait — 001's own K0 trace — is first-class: an empty dependency list is not an empty declaration.",
    atomicity:
      "One bug, as in R5-a5: the candidate refuses a subscription-only wait because it reads the dependency list as the wait. Refusing is one act whose consequence spans every group, since nothing in the submitted Outcome is accepted.",
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
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 4, counterexamples: ["wait-structure/unmatched-kernel-event-wakes-the-wait"] },
  },
  {
    id: "R5-b4",
    row: 5,
    obligation: "(b) The timeout Event is eligible through neither list and arrives by construction (W-9).",
    atomicity:
      "One bug: the timeout Event is routed through the ordinary eligibility test and so is never minted for a wait that declares nothing matching it. The Event's absence from the mailbox (disposition) and the wait staying live (lifecycle) are the same non-event — there is no implementation that mints the timeout and still fails to end the wait, because B-7 commits them in one transaction.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 4, counterexamples: ["subscription-deadline/timeout-withheld-because-nothing-declared-it"] },
  },

  // == Row 5(c): W-2's ordered registration transaction ======================
  {
    id: "R5-c1",
    row: 5,
    obligation: "(c) Step 1 first: this Outcome's own reserved batch is acknowledged before the mailbox check, so a wait is never woken by the batch that registered it.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 4, counterexamples: ["k0-trace/wait-woken-by-its-own-acknowledged-batch"] },
  },
  {
    id: "R5-c2",
    row: 5,
    obligation: "(c) Step 2 runs, and is not skipped for an empty dependency list: an already-accepted eligible Event is found rather than lost.",
    evidence: { kind: "scenario", scenario: "control-stale-timer-and-lost-wake", stepIndex: 3, counterexamples: ["control-stale-timer/lost-wake-on-empty-dependency-list"] },
  },
  {
    id: "R5-c3",
    row: 5,
    obligation: "(c) Step 3 evaluates an already-due deadline before persisting, so a past deadline is never persisted as live (B-7 path A).",
    atomicity:
      "One bug: registration persists WAITING before evaluating the deadline, so B-7 path A never runs. The generation staying live and the timeout Event never being created are the two halves of that one skipped step, committed together or not at all.",
    evidence: { kind: "scenario", scenario: "control-subscription-wait-deadline", stepIndex: 6, counterexamples: ["subscription-deadline/past-deadline-persisted-as-a-live-wait"] },
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
    evidence: { kind: "scenario", scenario: "wait-structure-not-satisfiability", stepIndex: 7, counterexamples: ["wait-structure/re-registered-dependency-treated-as-already-satisfied"] },
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
    id: "R7-a6",
    row: 7,
    obligation: "It produces no wait, deadline or next-state change: a rejected Outcome cannot move the Execution off its terminal state.",
    evidence: { kind: "scenario", scenario: "control-cancel-versus-complete", stepIndex: 3, counterexamples: ["control-cancel/losing-outcome-moves-the-execution-off-terminal"] },
  },
  {
    id: "R7-a7",
    row: 7,
    obligation: "The fence does not depend on the loser's next step: a `complete` submitted after cancellation acceptance loses identically to a `continue`. Decision M-1 requires the control to assert both.",
    atomicity:
      "One bug: the loser's `complete` is accepted. Reaching COMPLETED, committing its progress and returning a receipt instead of the recorded rejection are all consequences of that single acceptance, not independently reachable states.",
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
      "One bug: cancellation is recorded as a request and applied only when the in-flight Activation answers. The Execution therefore stays RUNNING with its Activation and pinned batch still live, and no terminal dispositions are written — one deferral, observed in three groups.",
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
      "One bug: the completion check runs as a later cleanup pass, so the envelope is accepted outright. Terminal state, committed progress, acknowledged batch, resolved exchange and the acceptance receipt all follow from that one acceptance. The clauses that *are* independently violable under a correct refusal — the recorded reason, the progress, the acknowledgment, the Effect intent — are split out as R8-a2 through R8-a5, each with its own transcript.",
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
    obligation: "A *previously owned* required Effect or child obligation must be settled, or explicitly transferred or abandoned under policy, before completion is accepted.",
    evidence: {
      kind: "assigned",
      packet: "K2.4",
      reason:
        "No previously owned obligation can exist while K1 refuses Effects outright (EF-1/EF-2), so this clause has no observable K0 case. CX-3 says so in terms: 'K1 without Effects satisfies this trivially (no Effects exist yet to be unaccounted-for); K2 is where the check becomes non-trivial.' R8-a observes the clause that *is* reachable now — work proposed in the completing Outcome itself. Fabricating owned work at K0 would require inventing state the protocol says cannot exist.",
    },
  },

  // == Row 9: progress compatibility =========================================
  {
    id: "R9-a1",
    row: 9,
    obligation: "Resuming against unavailable compatible code or resources yields an *explicit* hold/refusal: an inspectable record, not merely the absence of a restart.",
    evidence: { kind: "scenario", scenario: "control-missing-checkpoint-code", stepIndex: 4, counterexamples: ["control-missing-checkpoint/refused-without-an-inspectable-hold"] },
  },
  {
    id: "R9-a2",
    row: 9,
    obligation: "It is never a state that looks like normal restored computation.",
    atomicity:
      "One bug: recovery cannot load the pinned revision and silently starts over, presenting empty state as restored. Fabricating the progress and reporting no hold are the same act — the fabrication is what replaces the hold.",
    evidence: { kind: "scenario", scenario: "control-missing-checkpoint-code", stepIndex: 4, counterexamples: ["control-missing-checkpoint/fresh-state-presented-as-restored"] },
  },

  // == Row 10: local policy ordering and freshness ===========================
  {
    id: "R10-a",
    row: 10,
    obligation: "A policy check against just-accepted local state reads that exact write with no staleness window (LP-1).",
    atomicity:
      "One bug: the authority check reads a cached exchange, so the superseded writer's Outcome is admitted. Its progress commit and the acceptance receipt replacing the rejection are both consequences of that single admission.",
    evidence: { kind: "scenario", scenario: "identity-create-and-activation", stepIndex: 5, counterexamples: ["identity-activation/superseded-writer-epoch-accepted-from-a-stale-read"] },
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
      "One bug: arriving input is treated as superseding whatever the Runtime last said, so the accepted Outcome is rolled back whole. Its progress and its emissions are retracted by the same retraction; an implementation that retracts one and not the other is not a plausible reading of 'the correction supersedes'.",
    evidence: { kind: "scenario", scenario: "k0-trace", stepIndex: 5, counterexamples: ["k0-trace/late-input-retracts-accepted-progress"] },
  },
];
