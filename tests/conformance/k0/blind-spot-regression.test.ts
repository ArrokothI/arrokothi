/**
 * Round-3 review finding K02-R3-01: proof that the repaired blind spots were genuinely blind.
 *
 * Adding a counterexample proves the oracle rejects it *now*. It does not prove the oracle failed to
 * reject it *before*, and that is the claim a correction to a coverage defect actually has to make.
 * The review asked for the repaired cases to be mutation-checked, so this file reconstructs the
 * pre-correction oracle and shows each named blind spot passing it.
 *
 * The reconstruction is mechanical rather than a copy of the old source, which keeps it honest. The
 * C3 oracle differed from this one in exactly two ways:
 *
 *   1. `Observation` had no `waitEndedReadiness` and no `effectIntents`, so any difference confined to
 *      those fields was invisible: `deepStrictEqual` never saw them. Simulated by deleting both fields
 *      from the expected and the mutated observation and comparing what is left.
 *   2. Several scenario steps did not exist at all — the W-1 grammar submissions, the inert-wait
 *      registration and the superseded-epoch submission — so no candidate could be failed at them
 *      whatever it did. Simulated by pinning C3's step labels for the affected scenarios and
 *      asserting the step each counterexample fails at is not among them. Labels rather than indices,
 *      because the new steps were inserted in the middle: an index that existed in C3 named a
 *      different step there, so index arithmetic would prove nothing. The pinned lists below are
 *      transcribed from `acb5e01` (C3) and a reviewer can check them against it directly.
 *
 * A case that survives its reconstruction is one the corrected fixture genuinely added, not one that
 * was already caught and has now been restated.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  CONFORMING_EPOCH_POLICIES,
  VIOLATIONS,
  VIOLATING_EPOCH_POLICIES,
  emptyDependencyShortcutCandidate,
  epochPolicyCandidate,
  violatingCandidate,
  waitEndedLateTruncationCandidate,
  waitEndedTopUpCandidate,
} from "./candidate.ts";
import { checkWaitWellFormed, isEligibleUnderWait } from "./protocol-vocabulary.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";
import { runScenario } from "./fixture.ts";
import { createOperationSink } from "./operation-sink.ts";
import type { Observation } from "./fixture.ts";

/** The two fields C3's observation surface did not have. */
const ROUND_3_FIELDS = ["waitEndedReadiness", "effectIntents"] as const;

function withoutRound3Fields(observation: Observation): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...observation };
  for (const field of ROUND_3_FIELDS) delete copy[field];
  return copy;
}

function violation(id: string) {
  const found = VIOLATIONS.find((entry) => entry.id === id);
  assert.ok(found, `unknown violation ${id}`);
  return found;
}

function scenario(id: string) {
  const found = ALL_SCENARIOS.find((entry) => entry.id === id);
  assert.ok(found, `unknown scenario ${id}`);
  return found;
}

/**
 * Blind spots closed by the new observation fields. Each entry is a counterexample whose entire
 * difference from the expected trace lives in a field C3 did not observe.
 *
 * The first two are the review's own worked example: a phantom readiness arming behind the first,
 * which the stale-timer control walks straight through and which its `forbids` prose claimed to
 * forbid while nothing could fail a candidate for it.
 */
const INVISIBLE_UNDER_C3: readonly { readonly id: string; readonly why: string }[] = [
  { id: "control-stale-timer/late-result-arms-a-second-readiness", why: "B-8's no-second-readiness rule, named in review-03.md as blind spot 2" },
  { id: "control-stale-timer/duplicate-timer-arms-a-second-readiness", why: "W-9's 'no second readiness' clause, prose-only under the C3 surface" },
  { id: "control-stale-timer/event-accepted-while-running-arms-a-readiness", why: "B-8's RUNNING arm: no readiness where no generation is live" },
  { id: "effect-refusal/intent-and-proposal-key-bound-before-refusal", why: "EF-2's 'no Effect ID is minted, no proposal key is bound', blind spot 3" },
  { id: "control-cancel/losing-outcome-mints-an-effect-intent", why: "§11 row 7's zero-Effect-intents clause on the losing Outcome" },
];

/**
 * Blind spots closed by new scenario steps. C3's scenario stopped short of the step these fail at, so
 * no candidate reached the assertion at all.
 */
/** Step labels as they stood in C3 (`acb5e01c80f015ebf715f4de3e7fdb10f05f1a33`). */
const C3_STEP_LABELS: Readonly<Record<string, readonly string[]>> = {
  "control-whole-envelope-validation": [
    "X created",
    "X dispatched",
    "a duplicate emission key rejects the whole envelope, and the valid first emission is not kept",
    "a structurally empty wait declaration is refused at envelope validation, deadline notwithstanding",
    "a well-formed envelope is still accepted afterwards: rejection is inert, not a wedge",
  ],
  "identity-create-and-activation": [
    "X created",
    "same key, same content: the original Execution and receipt come back",
    "same key, different content: a conflict, never a silent edit",
    "the first exchange opens as act-1",
    "ID-9: an authorized takeover of a still-unresolved exchange keeps the Activation ID and advances the epoch",
    "the taken-over exchange resolves under the advanced epoch",
    "a semantically different dispatch after the prior exchange resolved gets a new Activation ID",
  ],
  // The scenario itself is new in this correction, so C3 had none of its steps.
  "wait-structure-not-satisfiability": [],
};

const UNREACHABLE_UNDER_C3: readonly { readonly id: string; readonly why: string }[] = [
  { id: "envelope/match-everything-alternative-registered", why: "W-1 rule 2 was enforced only by the fixture's own helper, blind spot 1" },
  { id: "envelope/empty-kind-set-treated-as-matches-nothing", why: "W-1's empty-kind-set rule, likewise helper-only" },
  { id: "wait-structure/inert-alternative-refused-as-unsatisfiable", why: "W-1's structure-not-satisfiability promise had no positive case anywhere in the corpus" },
  { id: "wait-structure/unmatched-kernel-event-wakes-the-wait", why: "the category rule's non-application arm was never submitted to a candidate" },
  { id: "wait-structure/re-registered-dependency-treated-as-already-satisfied", why: "W-1(d)'s 'no per-alternative satisfied flag' had no re-registration to observe" },
  { id: "identity-activation/superseded-writer-epoch-accepted-from-a-stale-read", why: "LP-1 had no submission from a superseded epoch anywhere in the corpus, blind spot 4" },
];

describe("round-3 blind spots: invisible under C3's observation surface", () => {
  for (const { id, why } of INVISIBLE_UNDER_C3) {
    test(`${id} passed the C3 oracle (${why})`, () => {
      const entry = violation(id);
      const target = scenario(entry.scenarioId);
      const step = target.steps[entry.stepIndex];
      assert.ok(step, `${id} names step ${entry.stepIndex}, which does not exist`);

      const expected = step.expect.observation;
      const mutated = entry.mutate(expected);

      // Today's oracle rejects it.
      assert.notDeepStrictEqual(mutated, expected, `${id} does not differ from the expected trace at all`);

      // C3's did not: strip the fields C3 lacked and nothing remains to see.
      assert.deepStrictEqual(
        withoutRound3Fields(mutated),
        withoutRound3Fields(expected),
        `${id} also differs in a field C3 already observed, so it was not blind there and this entry overstates the repair`,
      );

      // And the difference is confined to fields the round-3 correction added, not merely hidden by
      // the stripping above.
      const changed = ROUND_3_FIELDS.filter(
        (field) => JSON.stringify(mutated[field]) !== JSON.stringify(expected[field]),
      );
      assert.ok(changed.length > 0, `${id} changes no round-3 field, so it cannot be a round-3 repair`);
    });
  }
});

describe("round-3 blind spots: unreachable under C3's scenario corpus", () => {
  for (const { id, why } of UNREACHABLE_UNDER_C3) {
    test(`${id} had no step to fail at in C3 (${why})`, () => {
      const entry = violation(id);
      const target = scenario(entry.scenarioId);
      const c3Labels = C3_STEP_LABELS[target.id];
      assert.ok(c3Labels, `no C3 label list pinned for ${target.id}`);

      const label = target.steps[entry.stepIndex]?.expect.label;
      assert.ok(label, `${id} names step ${entry.stepIndex}, which does not exist`);
      assert.ok(
        !c3Labels.includes(label),
        `${id} fails at "${label}", a step C3's ${target.id} already had, so this entry overstates the repair`,
      );
    });
  }

  test("the pinned C3 label lists are a prefix-free subset of today's, so they name real steps", () => {
    // Guards the transcription: every label claimed to have existed in C3 must still exist today,
    // otherwise the list is describing a scenario neither revision has and proves nothing.
    for (const [scenarioId, labels] of Object.entries(C3_STEP_LABELS)) {
      const today = scenario(scenarioId).steps.map((step) => step.expect.label);
      for (const label of labels) {
        assert.ok(today.includes(label), `C3 label "${label}" no longer exists in ${scenarioId}; the pinned list is stale`);
      }
    }
  });
});

describe("round-3 blind spots: the reconstruction itself discriminates", () => {
  test("a counterexample C3 already caught is not accepted as a blind spot", () => {
    // Without this the first suite above would pass vacuously for any violation whose mutation
    // happened to leave the round-3 fields alone — including ones C3 rejected perfectly well. A
    // pre-existing counterexample must fail the invisibility test.
    const alreadyCaught = violation("k0-trace/backlog-displaces-the-wake");
    const target = scenario(alreadyCaught.scenarioId);
    const expected = target.steps[alreadyCaught.stepIndex]!.expect.observation;
    const mutated = alreadyCaught.mutate(expected);
    assert.notDeepStrictEqual(
      withoutRound3Fields(mutated),
      withoutRound3Fields(expected),
      "a violation C3 caught through dispatchedBatch must not look invisible under the C3 surface",
    );
  });
});

// ---------------------------------------------------------------------------
// Round 4: what the split transcripts used to carry
// ---------------------------------------------------------------------------

/**
 * Round-4 review finding K02-R4-02 is a different kind of defect from round 3's, and the difference
 * matters for what can honestly be claimed here.
 *
 * Round 3's blind spots were **invisible**: the required fact had no observation field, or the step did
 * not exist, so the old oracle genuinely passed a violating candidate. Round 4's were **visible but
 * unattributed**: the complete expected observation would have rejected many of these candidates, but
 * the coverage map claimed a counterexample per assertion and did not have one — one transcript was
 * standing in for two or three. The review says so directly ("The runner would reject some such
 * candidates because the complete expected observation contains those fields").
 *
 * So the claim made here is not "C4 passed these". It is the narrower, checkable one: **each of these
 * transcripts used to carry more than one assertion's worth of difference, and now carries one.** The
 * field sets below are transcribed from C4 (`e2721ddf30416454ddba73a10ae509190e68cbc4`) and a reviewer
 * can check them against it directly. `coverage.test.ts` separately enforces, corpus-wide, that no two
 * transcripts at one step move the same fields — so a split cannot be cosmetic.
 */
const C4_BUNDLED_FIELDS: readonly {
  readonly narrowed: string;
  readonly splitOut: string;
  readonly c4Fields: readonly string[];
  readonly assertions: string;
}[] = [
  {
    narrowed: "control-duplicate/replay-re-runs-acceptance",
    splitOut: "control-duplicate/replay-republishes-the-emission",
    c4Fields: ["progressRevision", "emissions"],
    assertions: "R3-a2 (the acceptance transaction does not re-run) and R3-a3 (the emission is not re-published)",
  },
  {
    narrowed: "envelope/valid-prefix-kept-when-a-later-member-is-malformed",
    splitOut: "envelope/valid-prefix-emission-kept-when-a-later-member-is-malformed",
    c4Fields: ["progressRevision", "progress", "emissions"],
    assertions: "R3-c1 (no progress) and R3-c1b (no emissions) — the review's own first example",
  },
  {
    narrowed: "control-stale-timer/stale-generation-wakes-the-replacement-wait",
    splitOut: "control-stale-timer/stale-generation-retires-the-live-registration",
    c4Fields: ["state", "liveWaitGeneration"],
    assertions: "R5-f1a (wakes nothing) and R5-f1a2 (retires nothing) — the review's second example",
  },
  {
    narrowed: "control-cancel/exact-retry-manufactures-a-receipt",
    splitOut: "control-cancel/exact-retry-loses-the-recorded-rejection",
    c4Fields: ["receipt", "rejection"],
    assertions: "R7-b (no manufactured receipt) and R7-b2 (the recorded rejection is returned)",
  },
  {
    narrowed: "completion/refused-envelope-partly-committed",
    splitOut: "completion/refused-envelope-acknowledges-its-batch",
    c4Fields: ["progressRevision", "progress", "acknowledged"],
    assertions: "R8-a3 (no progress) and R8-a4 (no acknowledgment) — part of the review's third example",
  },
  {
    narrowed: "delayed-runtime/unresolved-activation-reported-as-waiting",
    splitOut: "delayed-runtime/runtime-local-work-gets-a-waitingFor-record",
    c4Fields: ["state", "liveWaitGeneration"],
    assertions: "R5-g (stays RUNNING) and R5-g2 (no waitingFor record exists at all)",
  },
  {
    narrowed: "control-cancel/losing-progress-installed-with-next-state-suppressed",
    splitOut: "control-cancel/losing-progress-installed",
    c4Fields: ["progressRevision", "progress", "emissions", "acknowledged", "terminalDispositions"],
    assertions: "R7-a8 (Decision M-1's named composite variant, which stays composite because M-1 names it) and R7-a2 (progress alone)",
  },
];

function changedFields(before: Observation, after: Observation): string[] {
  return (Object.keys(before) as (keyof Observation)[]).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
}

describe("round-4 splits: each transcript used to carry more than one assertion", () => {
  for (const entry of C4_BUNDLED_FIELDS) {
    test(`${entry.narrowed} was bundled; now ${entry.assertions}`, () => {
      const narrowed = violation(entry.narrowed);
      const splitOut = violation(entry.splitOut);
      assert.equal(
        narrowed.scenarioId,
        splitOut.scenarioId,
        "a split pair must run against the same scenario, or they are not two halves of one entry",
      );
      assert.equal(narrowed.stepIndex, splitOut.stepIndex, "a split pair must fail at the same step");

      const target = scenario(narrowed.scenarioId);
      const expected = target.steps[narrowed.stepIndex]!.expect.observation;
      const narrowedFields = changedFields(expected, narrowed.mutate(expected));
      const splitFields = changedFields(expected, splitOut.mutate(expected));

      // Everything both halves now move was moved by the single C4 transcript. This is the transcribed
      // claim: one transcript's worth of difference is now two transcripts' worth.
      for (const field of [...narrowedFields, ...splitFields]) {
        assert.ok(
          entry.c4Fields.includes(field),
          `${field} is moved today but is not in the transcribed C4 field set for ${entry.narrowed}; the transcription is stale or the split drifted`,
        );
      }

      // And neither half alone is still the whole thing, or nothing was actually split.
      assert.notDeepStrictEqual(
        [...narrowedFields].sort(),
        [...splitFields].sort(),
        `${entry.narrowed} and ${entry.splitOut} move the same fields, so the split is cosmetic`,
      );
      assert.ok(
        narrowedFields.length < entry.c4Fields.length || splitFields.length < entry.c4Fields.length,
        `neither half of ${entry.narrowed} is narrower than what C4 carried`,
      );
    });
  }
});

// ---------------------------------------------------------------------------
// Round 5: what the assertion reconstruction and the deadline schedule added
// ---------------------------------------------------------------------------

/**
 * Round-5 review finding K02-R5-01 coupled two independent token families in one bijection, and
 * K02-R5-02 left the duplicate-conflict partial writer and the CX-6 deadline clause without
 * discriminating candidates. Unlike round 3 (invisible) and round 4 (visible but unattributed),
 * these are over-constraint and unobservable-clause defects: the first rejected a conforming
 * representation, the others counted clauses covered with no candidate that could be failed for
 * breaking them. The guards below pin the repairs so they cannot be silently recombined.
 */
describe("round-5: receipt and Activation-ID namespaces stay separate", () => {
  test("cross-family reuse of one raw spelling passes while same-family collapse still fails", () => {
    // Transcribed from the oracle-discrimination probe: receipts map to opaque-1/opaque-2 distinctly
    // and Activation IDs map to the same two spellings distinctly. Under C5's single TokenRelation
    // the second family's first use collided (verified against C5 logic: 'opaque-1 already
    // receipt:create:req-x for act-1'); with separate per-family bijections it passes, while
    // collapsing two receipts or two Activation IDs within their own family still fails.
    // The discrimination itself is asserted in oracle-discrimination.test.ts; this pins the shape so
    // a future edit cannot recouple the namespaces without failing here too.
    const identity = scenario("identity-create-and-activation");
    const receiptValues = new Set(identity.steps.map((step) => step.expect.observation.receipt).filter((r): r is string => r !== null));
    const activationValues = new Set(identity.steps.map((step) => step.expect.observation.activationId).filter((a): a is string => a !== null));
    assert.ok(receiptValues.size >= 2, "the probe scenario needs two distinct receipts to show within-family distinctness");
    assert.ok(activationValues.size >= 2, "the probe scenario needs two distinct Activation IDs to show within-family distinctness");
  });
});

describe("round-5 splits: the duplicate conflict is two assertions", () => {
  test("rejection-recorded-but-merged and silently-absorbed divide C5's bundled fields", () => {
    // C5's `control-duplicate/conflict-merged-into-accepted-state` moved progress, progressRevision
    // and rejection together with a note claiming record-and-merge is "not plausible". Round-5
    // finding K02-R5-02 calls that note false: OA-5 exists to prohibit exactly that partial writer.
    const c5Fields = ["progress", "progressRevision", "rejection"];
    const merged = violation("control-duplicate/conflict-merged-into-accepted-state");
    const absorbed = violation("control-duplicate/conflict-silently-absorbed-without-rejection");
    assert.equal(merged.scenarioId, absorbed.scenarioId, "a split pair must run against the same scenario");
    assert.equal(merged.stepIndex, absorbed.stepIndex, "a split pair must fail at the same step");

    const target = scenario(merged.scenarioId);
    const expected = target.steps[merged.stepIndex]!.expect.observation;
    const mergedFields = changedFields(expected, merged.mutate(expected));
    const absorbedFields = changedFields(expected, absorbed.mutate(expected));

    for (const field of [...mergedFields, ...absorbedFields]) {
      assert.ok(c5Fields.includes(field), `${field} is moved today but was not in C5's bundled set; the transcription is stale or the split drifted`);
    }
    // The merge half keeps the rejection correctly recorded and leaks only accepted state; the
    // absorption half drops only the rejection. Neither half alone is the whole bundled thing.
    assert.deepEqual([...mergedFields].sort(), ["progress", "progressRevision"]);
    assert.deepEqual(absorbedFields, ["rejection"]);
  });
});

describe("round-5: the CX-6 deadline clause is a schedule plus an observation, not an inference", () => {
  test("a cancellation-losing `await` carrying a wait with a deadline is submitted", () => {
    const target = scenario("control-cancel-versus-complete");
    const losingAwaits = target.steps.filter(
      (step) =>
        step.command.kind === "submit_outcome" &&
        step.command.outcome.executionId === "exec-x" &&
        step.command.outcome.next.step === "await",
    );
    assert.ok(losingAwaits.length > 0, "no losing `await` is submitted for the cancelled Execution; CX-6's zero-deadline clause has no schedule exercising it");
    for (const step of losingAwaits) {
      assert.ok(step.command.kind === "submit_outcome" && step.command.outcome.next.step === "await");
      assert.ok(step.command.outcome.next.wait.deadline !== undefined, "the losing `await` must carry a deadline, or it does not exercise the deadline clause");
      assert.equal(step.expect.observation.state, "CANCELLED");
      assert.equal(step.expect.observation.liveWaitGeneration, null);
      assert.equal(step.expect.observation.acceptedDeadline, null);
      assert.deepEqual(step.expect.observation.waitEndedReadiness, []);
      assert.equal(step.expect.observation.rejection?.classification, "cancellation_terminal_conflict");
    }
  });

  test("leaking only the accepted deadline is a different transcript from registering the wait or arming readiness", () => {
    const deadlineLeak = violation("control-cancel/losing-await-accepts-a-deadline");
    const waitLeak = violation("control-cancel/losing-await-registers-a-wait");
    const readinessLeak = violation("control-cancel/losing-await-arms-a-readiness");
    const target = scenario(deadlineLeak.scenarioId);
    const expected = target.steps[deadlineLeak.stepIndex]!.expect.observation;
    assert.deepEqual(changedFields(expected, deadlineLeak.mutate(expected)), ["acceptedDeadline"]);
    assert.deepEqual(changedFields(expected, waitLeak.mutate(expected)), ["liveWaitGeneration"]);
    assert.deepEqual(changedFields(expected, readinessLeak.mutate(expected)), ["waitEndedReadiness"]);
    // The sharp case: an accepted deadline fact leaks while CANCELLED, rejection correct, live
    // generation null. Inferring deadline absence from terminal state or `liveWaitGeneration` alone
    // would pass this candidate.
    const leaked = deadlineLeak.mutate(expected);
    assert.equal(leaked.state, "CANCELLED");
    assert.equal(leaked.liveWaitGeneration, null);
    assert.equal(leaked.rejection?.classification, "cancellation_terminal_conflict");
  });
});

// ---------------------------------------------------------------------------
// Round 6: the deadline observation is semantic state, not scheduler mechanism
// ---------------------------------------------------------------------------

/**
 * Round-6 review finding K02-R6-01: C6's `pendingTimers` observed persisted timer registrations and
 * pinned their lifetime to the logical wait ("timers live exactly while a deadline wait is live").
 * That silently chooses an eager timer-cancellation design W-9 leaves implementation-owned: a
 * conforming implementation may retain a physical timer after the logical wait retires and fence its
 * late delivery as stale under W-3. The observation is now `acceptedDeadline` — the accepted logical
 * deadline fact — and these guards pin the redefinition so the mechanism reading cannot come back.
 */
describe("round-6: no observation constrains physical timer lifetime", () => {
  test("observations carry no timer-registration, scheduler or cancellation field", () => {
    // A mechanism field reintroduced under any name would recouple the oracle to W-9's open design
    // space. Timeout Events in `queued` are mailbox facts, not scheduler state, so values are not
    // scanned — only the observation's keys. (`waitEndedReadiness` matches none of these patterns;
    // it is readiness semantic state under B-8, not a timer handle.)
    for (const target of ALL_SCENARIOS) {
      for (const [index, step] of target.steps.entries()) {
        for (const key of Object.keys(step.expect.observation)) {
          assert.ok(
            !/timer|scheduler|registration/i.test(key),
            `${target.id} step ${index}: observation key ${key} constrains timer/scheduler mechanism, which W-9 leaves implementation-owned`,
          );
        }
      }
    }
  });

  test("retirement is observable as a gone logical deadline beside a still-permitted stale delivery", () => {
    // The positive half of the same distinction: after g2's logical deadline retires (READY, deadline
    // null), the schedule still delivers g2's timer and requires a harmless no-op. If retirement
    // meant physical cancellation, that delivery could not arrive — yet W-3 requires it to be
    // fenceable, not absent.
    const target = scenario("control-stale-timer-and-lost-wake");
    const retired = target.steps[7]!;
    assert.equal(retired.expect.observation.state, "READY");
    assert.equal(retired.expect.observation.acceptedDeadline, null);
    const stale = target.steps[8]!;
    assert.equal(stale.command.kind, "deliver_timer");
    assert.ok(stale.command.kind === "deliver_timer" && stale.command.generation === "g2");
    assert.equal(stale.expect.observation.state, "READY");
    assert.equal(stale.expect.observation.acceptedDeadline, null);
  });
});

// ---------------------------------------------------------------------------
// Round 7: every accepted-deadline transition owns a transcript
// ---------------------------------------------------------------------------

/**
 * Round-7 review finding K02-R7-01: the neutral `acceptedDeadline` field could see five lifecycle
 * transitions no assertion owned — the visible-but-unattributed failure mode round 4 corrected.
 * The complete structural observation would incidentally reject these transcripts, but C7/C9 require
 * one owned violating transcript per independently distinguishable assertion, and `forbids` prose
 * or corpus invariants do not substitute. Each entry below moves *only* `acceptedDeadline` at its
 * step, so none is a rebundling; the D-vs-R5-c3 pair additionally pins a proper narrowing.
 */
describe("round-7: accepted-deadline lifecycle transitions each move only the deadline fact", () => {
  const NEW_DEADLINE_TRANSCRIPTS: readonly { readonly id: string; readonly value: unknown }[] = [
    { id: "subscription-deadline/registered-wait-drops-the-accepted-deadline", value: null },
    { id: "subscription-deadline/path-A-retirement-leaves-the-accepted-deadline", value: 1 },
    { id: "control-stale-timer/immediate-retirement-leaves-the-accepted-deadline", value: 1_000 },
    { id: "control-stale-timer/expiry-retirement-leaves-the-accepted-deadline", value: 2_000 },
    { id: "control-stale-timer/stale-delivery-clears-the-live-deadline", value: null },
  ];

  test("the five new transcripts each move exactly acceptedDeadline, at five distinct steps", () => {
    const points = new Set<string>();
    for (const { id, value } of NEW_DEADLINE_TRANSCRIPTS) {
      const entry = violation(id);
      const target = scenario(entry.scenarioId);
      const expected = target.steps[entry.stepIndex]!.expect.observation;
      assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["acceptedDeadline"]);
      assert.deepEqual(entry.mutate(expected).acceptedDeadline, value);
      const point = `${entry.scenarioId}#${entry.stepIndex}`;
      assert.ok(!points.has(point), `${id} shares its step with another new deadline transcript; one of them is redundant`);
      points.add(point);
    }
    assert.equal(points.size, 5);
  });

  test("the path-A leftover narrows R5-c3's ordering-swap transcript rather than restating it", () => {
    // R5-c3's swap persists WAITING outright (five moved fields); the new transcript at the same
    // step keeps the correct immediate retirement and leaks only the deadline fact (one field).
    // A future edit that rebundles them fails here before it can weaken the split.
    const broad = violation("subscription-deadline/past-deadline-persisted-as-a-live-wait");
    const narrow = violation("subscription-deadline/path-A-retirement-leaves-the-accepted-deadline");
    assert.equal(broad.scenarioId, narrow.scenarioId);
    assert.equal(broad.stepIndex, narrow.stepIndex);
    const target = scenario(broad.scenarioId);
    const expected = target.steps[broad.stepIndex]!.expect.observation;
    const broadFields = changedFields(expected, broad.mutate(expected));
    const narrowFields = changedFields(expected, narrow.mutate(expected));
    assert.deepEqual(narrowFields, ["acceptedDeadline"]);
    for (const field of narrowFields) {
      assert.ok(broadFields.includes(field), `${field} is moved by the narrow transcript but was not in the bundled set`);
    }
    assert.ok(broadFields.length > narrowFields.length, "the narrow transcript is not narrower than the bundled one");
  });
});

// ---------------------------------------------------------------------------
// Round 8: both B-6 entry boundaries own the deadline, not just path A
// ---------------------------------------------------------------------------

/**
 * Round-8 review finding K02-R8-01: round 7 closed "the eligible-wake cleanup" with a path-A
 * transcript only. B-6 states two entry boundaries into one state — path A retires a wait the
 * Outcome-acceptance transaction has just created, path B retires a wait that is already durably
 * `WAITING` at a later Event's own acceptance boundary with no Outcome in the transaction — and the
 * corpus's only path-B wake registered a wait with no deadline, so a candidate whose path-B handler
 * retires lifecycle, generation and readiness but forgets the deadline passed everything.
 *
 * These guards pin the discriminating schedule and its transcript so neither can be quietly reduced
 * back to path A.
 */
describe("round-8: the B-6 path-B wake owns the deadline it retires", () => {
  const PATH_B = "control-stale-timer/path-B-wake-leaves-the-accepted-deadline";

  test("the schedule parks a live accepted deadline and then ends it with an Event, not a timer", () => {
    const entry = violation(PATH_B);
    const target = scenario(entry.scenarioId);
    const parked = target.steps[entry.stepIndex - 1]!;
    const woken = target.steps[entry.stepIndex]!;

    // Durably WAITING with a *live* accepted deadline first. Without this the step below could not
    // tell a forgotten cleanup apart from a deadline that was never accepted at all.
    assert.equal(parked.expect.observation.state, "WAITING");
    assert.equal(parked.expect.observation.liveWaitGeneration, "g3");
    assert.equal(parked.expect.observation.acceptedDeadline, 3_000);

    // Ended at an Event's own acceptance with no Outcome in the transaction: that is what makes it
    // path B rather than path A (Outcome acceptance) or B-7 (the expiry handler).
    assert.equal(woken.command.kind, "accept_event");
    assert.equal(woken.expect.observation.progressRevision, parked.expect.observation.progressRevision);
    assert.deepEqual(woken.expect.observation.acknowledged, parked.expect.observation.acknowledged);

    // And the conforming result: READY, generation retired, Event-triggered readiness, deadline gone,
    // the waking Event retained as an unacknowledged mailbox fact.
    assert.equal(woken.expect.observation.state, "READY");
    assert.equal(woken.expect.observation.liveWaitGeneration, null);
    assert.deepEqual(woken.expect.observation.waitEndedReadiness, [{ generation: "g3", species: "event" }]);
    assert.equal(woken.expect.observation.acceptedDeadline, null);
    assert.deepEqual(woken.expect.observation.queued, ["res-3"]);
  });

  test("the path-B transcript moves exactly acceptedDeadline, and at a step no other transcript owns", () => {
    const entry = violation(PATH_B);
    const target = scenario(entry.scenarioId);
    const expected = target.steps[entry.stepIndex]!.expect.observation;
    assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["acceptedDeadline"]);
    assert.equal(entry.mutate(expected).acceptedDeadline, 3_000, "the leftover must be the retired wait's own deadline");

    const sharing = VIOLATIONS.filter(
      (other) => other.id !== entry.id && other.scenarioId === entry.scenarioId && other.stepIndex === entry.stepIndex,
    );
    assert.deepEqual(sharing, [], "another transcript already lives at this step; the path-B assertion must not share one");
  });

  test("path A and path B are distinct boundaries, so neither transcript stands in for the other", () => {
    const pathA = violation("control-stale-timer/immediate-retirement-leaves-the-accepted-deadline");
    const pathB = violation(PATH_B);
    assert.notEqual(`${pathA.scenarioId}#${pathA.stepIndex}`, `${pathB.scenarioId}#${pathB.stepIndex}`);

    // Path A's step is an Outcome submission and path B's is an Event acceptance. If a later edit
    // moved either onto the other's boundary the split would become cosmetic, and this fails first.
    assert.equal(scenario(pathA.scenarioId).steps[pathA.stepIndex]!.command.kind, "submit_outcome");
    assert.equal(scenario(pathB.scenarioId).steps[pathB.stepIndex]!.command.kind, "accept_event");

    // Both are single-field moves of the same fact, so the pair discriminates the boundary rather
    // than the observation.
    for (const entry of [pathA, pathB]) {
      const expected = scenario(entry.scenarioId).steps[entry.stepIndex]!.expect.observation;
      assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["acceptedDeadline"]);
    }
  });

  test("the corpus's deadline-less path-B wake stays deadline-less, so it cannot absorb this assertion", () => {
    // `k0-trace`'s wake remains the evidence for R5-d1 (retiring the registration and its generation).
    // It has no deadline to retire, which is precisely why it could not own R5-d6.
    const trace = scenario("k0-trace");
    const wake = trace.steps[6]!;
    assert.equal(wake.command.kind, "accept_event");
    assert.deepEqual(wake.expect.observation.waitEndedReadiness, [{ generation: "g1", species: "event" }]);
    assert.equal(trace.steps[4]!.expect.observation.acceptedDeadline, null, "the wait it retires never carried a deadline");
  });
});

// ---------------------------------------------------------------------------
// Round 9: a correct rejection can still leak the deadline it refused
// ---------------------------------------------------------------------------

/**
 * Round-9 review finding K02-R9-01: round 9's sweep saw this transition and declined to own it,
 * reading §11 row 3's parenthetical (`progress`, `Effect intent`, `acknowledgment`) as exhaustive and
 * leaving the zero-deadline clause to row 7. The decision row 3 cites says otherwise — OA-5 forbids a
 * rejected Outcome from creating any wait, deadline, readiness or next-state transition, and a
 * malformed envelope is a rejected Outcome — so the assertion was stated all along and simply had no
 * owner.
 *
 * These guards pin what makes the new transcript evidence rather than a restatement of the acceptance
 * failure that already lived at this step.
 */
describe("round-9: the malformed-envelope rejection owns the deadline it refuses", () => {
  const LEAK = "envelope/malformed-wait-leaks-its-accepted-deadline";
  const ACCEPTED = "envelope/structurally-empty-wait-registered-because-it-has-a-deadline";

  test("the step already submits a deadline-bearing malformed wait and refuses it with no deadline fact", () => {
    // No schedule was added for this finding: the observation and the submission already existed.
    const entry = violation(LEAK);
    const target = scenario(entry.scenarioId);
    const step = target.steps[entry.stepIndex]!;

    assert.equal(step.command.kind, "submit_outcome");
    assert.ok(step.command.kind === "submit_outcome" && step.command.outcome.next.step === "await");
    const wait = step.command.kind === "submit_outcome" && step.command.outcome.next.step === "await" ? step.command.outcome.next.wait : null;
    assert.equal(wait?.deadline, 5_000, "the refused envelope must actually carry a deadline, or nothing could leak");

    const observation = step.expect.observation;
    assert.equal(observation.rejection?.classification, "malformed_envelope");
    assert.equal(observation.state, "RUNNING");
    assert.equal(observation.liveWaitGeneration, null);
    assert.equal(observation.acceptedDeadline, null);
  });

  test("the leak transcript moves exactly acceptedDeadline, to the value the refused envelope supplied", () => {
    const entry = violation(LEAK);
    const target = scenario(entry.scenarioId);
    const expected = target.steps[entry.stepIndex]!.expect.observation;
    assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["acceptedDeadline"]);
    assert.equal(entry.mutate(expected).acceptedDeadline, 5_000);
  });

  test("it is a partial under a correct refusal, not the acceptance failure already at this step", () => {
    // The pre-existing transcript turns the malformed submission into an accepted registration: it
    // moves the lifecycle and *removes* the rejection. The new one keeps every one of those facts
    // right. If a later edit collapsed them the split would be cosmetic, and this fails first.
    const leak = violation(LEAK);
    const accepted = violation(ACCEPTED);
    assert.equal(leak.scenarioId, accepted.scenarioId);
    assert.equal(leak.stepIndex, accepted.stepIndex);

    const expected = scenario(leak.scenarioId).steps[leak.stepIndex]!.expect.observation;
    const leaked = leak.mutate(expected);
    const registered = accepted.mutate(expected);

    assert.equal(leaked.rejection, expected.rejection, "the leak transcript must keep the correct rejection");
    assert.equal(leaked.state, "RUNNING");
    assert.equal(leaked.liveWaitGeneration, null);
    assert.deepEqual(leaked.dispatchedBatch, expected.dispatchedBatch);
    assert.equal(registered.rejection, null, "the acceptance failure must not be a partial under a correct refusal");
    assert.notEqual(registered.state, expected.state);

    const leakFields = changedFields(expected, leaked);
    const registerFields = changedFields(expected, registered);
    assert.deepEqual(leakFields, ["acceptedDeadline"]);
    assert.ok(!registerFields.includes("acceptedDeadline"), "the two transcripts must not both move the deadline fact");
  });

  test("the two rejection writers stay separate: whole-envelope validation is not the cancellation fence", () => {
    // R7-a6c owns the same fact at CX-6's terminal-conflict fence. Different scenario, different
    // rejection classification, different boundary — which is why one cannot stand in for the other.
    const envelope = violation(LEAK);
    const fence = violation("control-cancel/losing-await-accepts-a-deadline");
    assert.notEqual(envelope.scenarioId, fence.scenarioId);

    const envelopeObs = scenario(envelope.scenarioId).steps[envelope.stepIndex]!.expect.observation;
    const fenceObs = scenario(fence.scenarioId).steps[fence.stepIndex]!.expect.observation;
    assert.equal(envelopeObs.rejection?.classification, "malformed_envelope");
    assert.equal(fenceObs.rejection?.classification, "cancellation_terminal_conflict");

    // Both are single-field moves of the same fact, so the pair discriminates the writer.
    for (const [entry, observation] of [[envelope, envelopeObs], [fence, fenceObs]] as const) {
      assert.deepEqual(changedFields(observation, entry.mutate(observation)), ["acceptedDeadline"]);
    }
  });
});

describe("round-10: the whole-envelope-validation writer owns wait, readiness and next-state — not only the deadline", () => {
  test("the wait half moves lifecycle together under a correct malformed rejection, distinct from the acceptance failure and the deadline half", () => {
    const waitLeak = violation("envelope/malformed-await-installs-a-wait");
    const deadlineLeak = violation("envelope/malformed-wait-leaks-its-accepted-deadline");
    const accepted = violation("envelope/structurally-empty-wait-registered-because-it-has-a-deadline");
    assert.equal(waitLeak.scenarioId, deadlineLeak.scenarioId);
    assert.equal(waitLeak.stepIndex, deadlineLeak.stepIndex);
    assert.equal(waitLeak.stepIndex, accepted.stepIndex);

    const expected = scenario(waitLeak.scenarioId).steps[waitLeak.stepIndex]!.expect.observation;
    assert.deepEqual(changedFields(expected, waitLeak.mutate(expected)).sort(), ["liveWaitGeneration", "state"]);
    assert.deepEqual(changedFields(expected, deadlineLeak.mutate(expected)), ["acceptedDeadline"]);

    const leaked = waitLeak.mutate(expected);
    assert.deepEqual(leaked.rejection, expected.rejection, "the wait leak must keep the correct malformed_envelope rejection");
    assert.equal(leaked.acceptedDeadline, null, "the wait half must not also leak the deadline fact");
    assert.deepEqual(leaked.waitEndedReadiness, [], "the wait half must not also arm readiness");
    assert.deepEqual(leaked.dispatchedBatch, expected.dispatchedBatch, "the exchange stays pinned");
    assert.equal(leaked.activationId, expected.activationId);
  });

  test("the next-state half moves only RUNNING to READY at the duplicate-emission step, distinct from progress, emissions and acknowledgment", () => {
    const nextLeak = violation("envelope/rejected-continue-commits-its-next-state");
    const target = scenario(nextLeak.scenarioId);
    const step = target.steps[nextLeak.stepIndex]!;
    assert.equal(step.command.kind, "submit_outcome");
    assert.ok(step.command.kind === "submit_outcome" && step.command.outcome.next.step === "continue", "the next-state schedule must carry a valid next: continue");

    const expected = step.expect.observation;
    assert.deepEqual(changedFields(expected, nextLeak.mutate(expected)), ["state"]);
    assert.equal(nextLeak.mutate(expected).state, "READY");
    assert.equal(expected.state, "RUNNING");
    assert.equal(expected.rejection?.classification, "malformed_envelope");
  });

  test("the readiness half has its own valid-wait schedule and moves only readiness under a correct refusal", () => {
    const readinessLeak = violation("envelope/valid-wait-in-malformed-envelope-arms-readiness");
    const target = scenario(readinessLeak.scenarioId);
    const step = target.steps[readinessLeak.stepIndex]!;
    assert.equal(step.command.kind, "submit_outcome");
    assert.ok(step.command.kind === "submit_outcome" && step.command.outcome.next.step === "await");
    const wait = step.command.kind === "submit_outcome" && step.command.outcome.next.step === "await" ? step.command.outcome.next.wait : null;
    assert.ok(wait && checkWaitWellFormed(wait).wellFormed, "the readiness schedule must submit a valid wait, or the leak models a doubly-wrong candidate");
    assert.ok((step.command.kind === "submit_outcome" ? step.command.outcome.emissions.length : 0) > 1, "the envelope must be malformed for an unrelated reason (duplicate emission)");

    const expected = step.expect.observation;
    assert.equal(expected.rejection?.classification, "malformed_envelope");
    assert.equal(expected.state, "RUNNING");
    assert.equal(expected.liveWaitGeneration, null);
    assert.equal(expected.acceptedDeadline, null);
    assert.deepEqual(changedFields(expected, readinessLeak.mutate(expected)), ["waitEndedReadiness"]);
    assert.deepEqual(readinessLeak.mutate(expected).waitEndedReadiness, [{ generation: "g-good", species: "event" }]);
    // W-2 acknowledges the pinned batch first. A mere valid wait is insufficient (R11-01).
    const before = target.steps[readinessLeak.stepIndex - 1]!;
    assert.equal(before.command.kind, "accept_event");
    assert.ok(before.command.kind === "accept_event");
    const eligible = before.command.event;
    assert.ok(before.expect.observation.queued.includes(eligible.eventId));
    assert.ok(!before.expect.observation.dispatchedBatch!.includes(eligible.eventId));
    assert.ok(wait && isEligibleUnderWait(wait, eligible), "correct W-2 step 2 must actually end this wait under B-6 path A");
    assert.deepEqual(expected.queued, before.expect.observation.queued);
    assert.deepEqual(expected.dispatchedBatch, before.expect.observation.dispatchedBatch);
    assert.deepEqual(expected.acknowledged, []);
    assert.deepEqual(expected.emissions, []);
    assert.equal(expected.progressRevision, 0);
    const emissions = step.command.outcome.emissions;
    assert.ok(new Set(emissions.map((e) => e.emissionId)).size < emissions.length);

  });

  test("none of the three reuses the CX-6 fence: different scenarios and classifications", () => {
    for (const [envelopeId, fenceId] of [
      ["envelope/malformed-await-installs-a-wait", "control-cancel/losing-await-registers-a-wait"],
      ["envelope/valid-wait-in-malformed-envelope-arms-readiness", "control-cancel/losing-await-arms-a-readiness"],
      ["envelope/rejected-continue-commits-its-next-state", "control-cancel/losing-outcome-moves-the-execution-off-terminal"],
    ] as const) {
      const envelope = violation(envelopeId);
      const fence = violation(fenceId);
      assert.notEqual(envelope.scenarioId, fence.scenarioId, `${envelopeId} must not borrow the CX-6 writer`);
    }
    const envelopeNext = scenario("control-whole-envelope-validation").steps[2]!.expect.observation;
    const fenceNext = scenario("control-cancel-versus-complete").steps[3]!.expect.observation;
    assert.equal(envelopeNext.rejection?.classification, "malformed_envelope");
    assert.equal(fenceNext.rejection?.classification, "cancellation_terminal_conflict");
  });
});

describe("round-10: takeover keeps the pinned input, redelivery is representable, and the stale case has a row-2 owner", () => {
  test("takeover and redelivery preserve in-1 despite a later arrival, and each half moves a different field", () => {
    const target = scenario("identity-create-and-activation");
    const late = target.steps[4]!;
    assert.equal(late.command.kind, "accept_event");
    assert.deepEqual(late.expect.observation.queued, ["in-1", "in-2"]);
    assert.deepEqual(late.expect.observation.dispatchedBatch, ["in-1"]);

    // The epoch assertions here are relational on purpose (round-13 review finding K02-R13-01): what
    // the schedule states is that redelivery names the *same* attempt the dispatch did and the
    // takeover names a *later* one in the same exchange, which is what ID-9 cases 1 and 2 fix. The
    // ordinals themselves are laboratory names bound to whatever a candidate reports.
    const dispatched = target.steps[3]!.expect.observation;
    const redelivered = target.steps[5]!;
    assert.equal(redelivered.command.kind, "redeliver_dispatch");
    assert.deepEqual(redelivered.expect.observation.dispatchedBatch, ["in-1"]);
    assert.equal(redelivered.expect.observation.activationId, "act-1");
    assert.equal(redelivered.expect.observation.activationId, dispatched.activationId);
    assert.equal(redelivered.expect.observation.writerEpoch, dispatched.writerEpoch);

    const takenOver = target.steps[6]!;
    assert.equal(takenOver.command.kind, "takeover");
    assert.deepEqual(takenOver.expect.observation.dispatchedBatch, ["in-1"]);
    assert.equal(takenOver.expect.observation.activationId, "act-1");
    assert.ok(takenOver.expect.observation.writerEpoch > redelivered.expect.observation.writerEpoch);

    const repin = violation("identity-activation/takeover-repins-the-pinned-batch");
    const redeliveryRepin = violation("identity-activation/redelivery-repins-the-pinned-batch");
    const redeliveryId = violation("identity-activation/redelivery-mints-a-new-activation-id");
    const redeliveryEpoch = violation("identity-activation/redelivery-advances-the-writer-epoch");
    const redeliveredObs = redelivered.expect.observation;
    const takenOverObs = takenOver.expect.observation;
    assert.deepEqual(changedFields(takenOverObs, repin.mutate(takenOverObs)), ["dispatchedBatch"]);
    assert.deepEqual(repin.mutate(takenOverObs).dispatchedBatch, ["in-1", "in-2"]);
    assert.deepEqual(changedFields(redeliveredObs, redeliveryRepin.mutate(redeliveredObs)), ["dispatchedBatch"]);
    assert.deepEqual(changedFields(redeliveredObs, redeliveryId.mutate(redeliveredObs)), ["activationId"]);
    assert.deepEqual(changedFields(redeliveredObs, redeliveryEpoch.mutate(redeliveredObs)), ["writerEpoch"]);
  });

  test("row 2's stale case shares R10-a's transcript rather than restating it", () => {
    const target = scenario("identity-create-and-activation");
    const stale = target.steps[7]!;
    assert.equal(stale.expect.observation.rejection?.classification, "stale_exchange");
    assert.equal(stale.expect.observation.writerEpoch, target.steps[6]!.expect.observation.writerEpoch);
  });
});

describe("round-10: producer scope is representable and receipts are re-derived without overloading", () => {
  test("two producers reuse one raw key without colliding, and same-producer replay still works", () => {
    const target = scenario("identity-producer-scope");
    assert.equal(target.steps.length, 12);
    const first = target.steps[0]!.expect.observation;
    const second = target.steps[1]!.expect.observation;
    const retry = target.steps[2]!.expect.observation;
    assert.notEqual(first.executionId, second.executionId, "different producers same raw key must not share an Execution ID");
    assert.notEqual(first.receipt, second.receipt, "different accepted creates must not share a receipt");
    assert.equal(retry.executionId, first.executionId, "same producer same key same content returns the same Execution");
    assert.equal(retry.receipt, first.receipt, "same-producer replay returns the same receipt");

    const collapseId = violation("identity-producer/global-dedup-collapses-execution-id");
    const collapseReceipt = violation("identity-producer/global-dedup-collapses-receipt");
    assert.deepEqual(changedFields(second, collapseId.mutate(second)), ["executionId"]);
    assert.deepEqual(changedFields(second, collapseReceipt.mutate(second)), ["receipt"]);
  });

  test("rejected operations mint no receipt at every K0.2 opaque writer, each moving only receipt", () => {
    for (const id of [
      "identity-create/conflict-mints-a-fresh-receipt",
      "control-duplicate/conflict-mints-a-fresh-receipt",
      "envelope/malformed-envelope-mints-a-fresh-receipt",
      "control-cancel/losing-outcome-mints-a-receipt",
      "identity-activation/stale-rejection-mints-a-receipt",
    ] as const) {
      const entry = violation(id);
      const expected = scenario(entry.scenarioId).steps[entry.stepIndex]!.expect.observation;
      assert.ok(expected.rejection !== null, `${id} must run at a correctly rejected step`);
      assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["receipt"], `${id} must move only the receipt fact`);
    }
  });

  test("distinct accepted requests never collapse, each moving only receipt at its own step", () => {
    for (const id of [
      "identity-producer/global-dedup-collapses-receipt",
      "identity-create/different-keys-collapse-onto-one-receipt",
      "k0-trace/second-acceptance-collapses-onto-the-first-receipt",
    ] as const) {
      const entry = violation(id);
      const expected = scenario(entry.scenarioId).steps[entry.stepIndex]!.expect.observation;
      assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["receipt"], `${id} must move only the receipt fact`);
    }
  });
});

describe("round-4: the withdrawn subscription rule stays withdrawn", () => {
  test("an empty declared subscription identity is well formed, because W-1 leaves the spelling to K1.3", () => {
    // Round-4 review finding K02-R4-01. This is a regression guard in the opposite direction from the
    // rest of this file: it asserts that a rule the fixture *used to* enforce is gone and must not
    // come back. W-9's closing note assigns the spelling of a declared subscription identity to K1.3,
    // and W-1 constrains only that it is finite, declarative and compared by equality — all of which
    // the empty string satisfies.
    const verdict = checkWaitWellFormed({ dependencies: [], subscriptions: [{ subscriptionClass: "" }], generation: "g" });
    assert.equal(
      verdict.wellFormed,
      true,
      "the empty subscription identity is being rejected again; that is a spelling decision K1.3 owns, not a W-1 rule",
    );
  });

  test("and no scenario requires a candidate to reject one", () => {
    for (const target of ALL_SCENARIOS) {
      for (const [index, step] of target.steps.entries()) {
        if (step.command.kind !== "submit_outcome") continue;
        const next = step.command.outcome.next;
        if (next.step !== "await") continue;
        const hasEmptyIdentity = next.wait.subscriptions.some((subscription) => subscription.subscriptionClass.length === 0);
        if (!hasEmptyIdentity) continue;
        assert.equal(
          step.expect.observation.rejection,
          null,
          `${target.id} step ${index} submits an empty subscription identity and requires rejection; W-1 does not forbid that spelling`,
        );
      }
    }
  });
});


describe("round-11 input identity discrimination", () => {
  test("producer alone varies in the ID-2 triple, with exact replay and changed-content conflict", () => {
    const target = scenario("identity-producer-scope");
    const events = [4, 5, 6, 7].map((i) => {
      const command = target.steps[i]!.command;
      assert.ok(command.kind === "accept_event" && command.event.category === "application_input");
      return command.event;
    });
    const [a, b, replay, conflict] = events;
    assert.equal(a!.destination, b!.destination);
    assert.equal(a!.requestKey, b!.requestKey);
    assert.notEqual(a!.producer, b!.producer);
    assert.notEqual(a!.eventId, b!.eventId);
    assert.notEqual(a!.subscriptionClass, conflict!.subscriptionClass);
    assert.deepEqual(a, replay);
    assert.deepEqual([a!.producer, a!.destination, a!.requestKey], [conflict!.producer, conflict!.destination, conflict!.requestKey]);
    for (const entry of VIOLATIONS.filter((v) => v.id.startsWith("input-identity/"))) {
      const expected = target.steps[entry.stepIndex]!.expect.observation;
      assert.deepEqual(changedFields(expected, entry.mutate(expected)), entry.mustNameFields);
    }
  });
});

describe("round-13: the epoch oracle fixes what ID-4 fixes, and nothing it leaves open", () => {
  // K02-R13-01. The pre-round-13 oracle compared `writerEpoch` literally, which decided the one
  // question ID-4 explicitly leaves to the implementation — "whether the counter is reset or
  // continues across a later, genuinely new Activation ID". Because six scenarios advanced the epoch
  // at a new Activation ID with no takeover anywhere and `identity-producer-scope` held it fixed
  // across the same transition, the corpus did not merely over-constrain: it was unsatisfiable. These
  // tests are the evidence the finding asked for, one case per relation.

  for (const policy of CONFORMING_EPOCH_POLICIES) {
    test(`a candidate whose epochs follow the ${policy.name} policy passes every scenario`, () => {
      // Reset and continue are ID-4's two named options; advance-per-exchange is the policy the
      // pre-correction corpus accidentally made normative; the opaque ascending fence is §2's "integer
      // vs. fencing token" freedom and shares no value with the schedule's ordinals, so it also proves
      // the runner resolves a submitted epoch into the candidate's own namespace rather than handing
      // over the laboratory's number.
      for (const target of ALL_SCENARIOS) {
        const result = runScenario(epochPolicyCandidate(policy), target, createOperationSink());
        assert.equal(
          result.outcome,
          "PASS",
          `${policy.name} was rejected on ${target.id}: ${result.outcome === "FAIL" ? result.failures.map((f) => `#${f.stepIndex} ${f.detail}`).join(" | ") : result.outcome}`,
        );
      }
    });
  }

  for (const policy of VIOLATING_EPOCH_POLICIES) {
    test(`and the ${policy.name} policy is still rejected at the takeover it breaks`, () => {
      // Acceptance alone would be vacuous. These break what ID-4 does fix — a takeover advances
      // authority for the still-unresolved exchange, and the order is monotone — so the same relational
      // oracle must reject them, at the takeover step.
      const target = ALL_SCENARIOS.find((entry) => entry.id === "identity-create-and-activation")!;
      const takeoverStep = target.steps.findIndex((step) => step.command.kind === "takeover");
      const result = runScenario(epochPolicyCandidate(policy), target, createOperationSink());
      assert.equal(result.outcome, "FAIL", `${policy.name} was accepted by the oracle`);
      if (result.outcome !== "FAIL") return;
      assert.ok(
        result.failures.some((failure) => failure.stepIndex === takeoverStep && failure.detail.includes("writerEpoch")),
        `${policy.name} failed at ${result.failures.map((f) => f.stepIndex).join(",")}, not at the takeover step ${takeoverStep}`,
      );
    });
  }

  test("ordinary redelivery keeping the epoch, and takeover advancing it, each still fail their own way", () => {
    // The two within-exchange relations ID-9 states as cases 1 and 2, kept as single-field transcripts
    // so the relational oracle is shown to discriminate them separately rather than as one epoch rule.
    const target = ALL_SCENARIOS.find((entry) => entry.id === "identity-create-and-activation")!;
    for (const [id, stepIndex] of [
      ["identity-activation/redelivery-advances-the-writer-epoch", 5],
      ["identity-activation/takeover-leaves-the-writer-epoch-unchanged", 6],
    ] as const) {
      const result = runScenario(violatingCandidate(violation(id)), target, createOperationSink());
      assert.equal(result.outcome, "FAIL", `${id} was accepted`);
      if (result.outcome !== "FAIL") return;
      const failure = result.failures.find((entry) => entry.stepIndex === stepIndex);
      assert.ok(failure, `${id} did not fail at step ${stepIndex}`);
      assert.ok(failure.detail.includes("writerEpoch"), `${id} failed at the right step for the wrong reason: ${failure.detail}`);
    }
  });

  test("a stale old-epoch submission is still rejected, and that rejection is what the schedule asserts", () => {
    // ID-9 case 3 / LP-1. The stale submission is the one place a schedule names an attempt the
    // exchange has already superseded; the adapted command carries the candidate's own epoch for that
    // superseded attempt, so a candidate is judged on rejecting it rather than on arithmetic.
    const target = ALL_SCENARIOS.find((entry) => entry.id === "identity-create-and-activation")!;
    const stale = target.steps[7]!;
    assert.equal(stale.command.kind, "submit_outcome");
    assert.ok(stale.command.kind === "submit_outcome");
    assert.equal(stale.command.outcome.writerEpoch, 1, "the stale submission names the superseded attempt");
    assert.equal(stale.expect.observation.writerEpoch, 2, "while the exchange's current attempt has advanced");
    assert.equal(stale.expect.observation.rejection?.classification, "stale_exchange");
    const result = runScenario(
      violatingCandidate(violation("identity-activation/superseded-writer-epoch-accepted-from-a-stale-read")),
      target,
      createOperationSink(),
    );
    assert.equal(result.outcome, "FAIL");
    if (result.outcome !== "FAIL") return;
    assert.ok(result.failures.some((failure) => failure.stepIndex === 7));
  });

  test("and where no exchange is unresolved the epoch is asserted nowhere", () => {
    // C7(b): "the writer epoch of the current exchange" has no meaning when there is no current
    // exchange, and ID-4 fixes no representation for that. Each conforming policy above answers that
    // case differently — 0, a retained value, a distant base — and all of them pass, which is the
    // evidence that the residual value is documentation rather than a pinned claim.
    const answers = new Set(CONFORMING_EPOCH_POLICIES.map((policy) => policy.whenNoExchange(null)));
    assert.ok(answers.size > 1, "the policies must disagree about the residual value for this to prove anything");
    const trace = ALL_SCENARIOS.find((entry) => entry.id === "k0-trace")!;
    assert.equal(trace.steps[8]!.expect.observation.activationId, null);
  });
});

describe("round-13: the empty-dependency clause of W-2 step 2 has an owner that actually exercises it", () => {
  // K02-R13-02. R5-c2 claimed both that step 2 runs and that it "is not skipped for an empty
  // dependency list", while its only evidence was `control-stale-timer-and-lost-wake` step 3 — whose
  // wait declares a dependency alternative and no subscription. These tests establish the three
  // things the split needs: the new owner's schedule really does supply the condition, the shortcut
  // candidate really is caught there, and it really is invisible to the old owner.

  test("the owning schedule has an empty dependency list, a valid subscription and an already-accepted eligible input", () => {
    const target = scenario("identity-producer-scope");
    const registration = target.steps[8]!;
    assert.equal(registration.command.kind, "submit_outcome");
    assert.ok(registration.command.kind === "submit_outcome");
    const next = registration.command.outcome.next;
    assert.equal(next.step, "await");
    assert.ok(next.step === "await");
    const wait = next.wait;

    // (a) an empty dependency-alternative list, which is the condition the clause is about, and a
    // structurally valid subscription-only declaration, which is what keeps the wait well formed.
    assert.deepEqual(wait.dependencies, []);
    assert.equal(wait.subscriptions.length, 1);
    assert.deepEqual(checkWaitWellFormed(wait), { wellFormed: true });

    // (b) at least one already-accepted, still-unacknowledged Event that is eligible under it, accepted
    // before the registering Outcome and still queued at the step before.
    const before = target.steps[7]!.expect.observation;
    const eligible = target.steps
      .slice(0, 8)
      .flatMap((step) => (step.command.kind === "accept_event" ? [step.command.event] : []))
      .filter((event) => isEligibleUnderWait(wait, event) && before.queued.includes(event.eventId));
    assert.ok(eligible.length > 0, "the mailbox must already hold an eligible Event for step 2 to find");
    assert.ok(!before.acknowledged.some((id) => eligible.some((event) => event.eventId === id)));
    assert.equal(before.state, "RUNNING", "and the wait must not already be live: this is a registration, not a path-B wake");

    // (c) the conforming answer is immediate B-6 path-A readiness, not durable WAITING.
    const after = registration.expect.observation;
    assert.equal(after.state, "READY");
    assert.equal(after.liveWaitGeneration, null);
    assert.deepEqual(after.waitEndedReadiness, [{ generation: wait.generation, species: "event" }]);

    // And the entry it replaces genuinely does not supply the condition, which is the defect itself.
    const oldOwner = scenario("control-stale-timer-and-lost-wake").steps[3]!;
    assert.ok(oldOwner.command.kind === "submit_outcome");
    const oldNext = oldOwner.command.outcome.next;
    assert.ok(oldNext.step === "await");
    assert.ok(oldNext.wait.dependencies.length > 0, "R5-c2's schedule has a dependency alternative, which is why it cannot own the empty-dependency clause");
  });

  test("the shortcut candidate fails at the registration that has the empty list", () => {
    const target = scenario("identity-producer-scope");
    const result = runScenario(emptyDependencyShortcutCandidate, target, createOperationSink());
    assert.equal(result.outcome, "FAIL", "a candidate skipping W-2 step 2 for an empty dependency list must be rejected");
    if (result.outcome !== "FAIL") return;
    assert.deepEqual(result.failures.map((failure) => failure.stepIndex), [8]);
    const detail = result.failures[0]!.detail;
    for (const field of ["state", "liveWaitGeneration", "waitEndedReadiness"]) {
      assert.ok(detail.includes(field), `the failure must name ${field}: ${detail}`);
    }
  });

  test("and it is accepted by every other scenario, including the one R5-c2 still owns", () => {
    // The half a scenario-scoped transcript cannot state. This bug is correct everywhere a dependency
    // alternative carries the wait, so the old owner cannot be the empty-dependency clause's evidence.
    for (const target of ALL_SCENARIOS) {
      if (target.id === "identity-producer-scope") continue;
      const result = runScenario(emptyDependencyShortcutCandidate, target, createOperationSink());
      assert.equal(
        result.outcome,
        "PASS",
        `${target.id} rejected the shortcut candidate, so it is not the independent owner it claims to be`,
      );
    }
  });

  test("while the general lost-wake transcript still fails at R5-c2's own step", () => {
    const target = scenario("control-stale-timer-and-lost-wake");
    const result = runScenario(violatingCandidate(violation("control-stale-timer/lost-wake-at-registration")), target, createOperationSink());
    assert.equal(result.outcome, "FAIL");
    if (result.outcome !== "FAIL") return;
    assert.ok(result.failures.some((failure) => failure.stepIndex === 3));
  });
});

describe("round-16: B-2's wait-ended facts are separated where the schedules used to make them coincide", () => {
  // K02-R16-01. B-2 fixes four facts about a wait-ended batch that a plausible implementation can
  // fail one at a time: retain the species' mandatory member; for B-6, retain the *earliest-accepted*
  // eligible one when the bound truncates; treat ineligible Events as candidates for nothing; and fill
  // what remains only with eligible Events, in acceptance order. Every wait-ended reservation in the
  // corpus used to be at bound 1 with a single candidate, or had no ineligible Event queued, so the
  // first three collapsed into one observation. These tests establish that the schedules now present
  // the separating conditions, that each new counterexample is caught where its clause lives, and —
  // the half a scenario-scoped transcript cannot state — that it is invisible everywhere else.

  /** Candidates for a wait-ended batch, derived from the retired wait rather than from the expectation. */
  function waitEndedCandidates(target: (typeof ALL_SCENARIOS)[number], stepIndex: number) {
    const events = new Map<string, import("./protocol-vocabulary.ts").FixtureEvent>();
    for (const step of target.steps) {
      const command = step.command;
      if (command.kind === "accept_event") events.set(command.event.eventId, command.event);
      if (command.kind === "create" || command.kind === "create_retry") events.set(command.initialInput.eventId, command.initialInput);
      if (command.kind === "deliver_timer") events.set(command.timeoutEvent.eventId, command.timeoutEvent);
    }
    const dispatch = target.steps[stepIndex]!;
    assert.equal(dispatch.command.kind, "dispatch");
    assert.ok(dispatch.command.kind === "dispatch");
    const before = target.steps[stepIndex - 1]!.expect.observation;
    assert.equal(before.waitEndedReadiness.length, 1, "this must be a wait-ended reservation");
    const readiness = before.waitEndedReadiness[0]!;
    const wait = Object.values(target.waits ?? {}).find((entry) => entry.generation === readiness.generation);
    assert.ok(wait, `no submitted wait declares generation ${readiness.generation}`);
    const eligible = before.queued.filter((id) => events.get(id) !== undefined && isEligibleUnderWait(wait, events.get(id)!));
    const mandatory = readiness.species === "deadline"
      ? before.queued.filter((id) => events.get(id)?.waitGeneration === readiness.generation)
      : eligible.slice(0, 1);
    const candidates = [...new Set([...mandatory, ...eligible])];
    return {
      bound: dispatch.command.bound,
      species: readiness.species,
      queued: before.queued,
      candidates,
      ineligible: before.queued.filter((id) => !candidates.includes(id)),
      batch: dispatch.expect.observation.dispatchedBatch ?? [],
    };
  }

  test("the corpus now has a wait-ended reservation with room to spare and ineligible backlog queued, in each species", () => {
    // The precondition the finding turns on. Without spare capacity, "retain the mandatory member" and
    // "exclude ineligible backlog" cannot be told apart by any observation of the batch.
    for (const [scenarioId, stepIndex, species] of [
      ["control-stale-timer-and-lost-wake", 14, "event"],
      ["control-stale-timer-and-lost-wake", 17, "deadline"],
    ] as const) {
      const shape = waitEndedCandidates(scenario(scenarioId), stepIndex);
      assert.equal(shape.species, species);
      assert.ok(shape.ineligible.length > 0, `${scenarioId}#${stepIndex}: no ineligible Event is queued, so exclusion is unobservable`);
      assert.ok(
        shape.bound > shape.candidates.length,
        `${scenarioId}#${stepIndex}: bound ${shape.bound} leaves no slot spare beyond ${shape.candidates.length} candidates, so nothing distinguishes exclusion from displacement`,
      );
      assert.deepEqual(shape.batch, shape.candidates, `${scenarioId}#${stepIndex}: the batch must be exactly the candidates`);
    }
  });

  test("and the older-backlog direction is real: the deadline species' mandatory member is younger than the Event it must not admit", () => {
    // B-2 says ineligible backlog is excluded "however old it is". A timeout Event is minted at expiry,
    // so it can never be the older member; this is the shape that reads the phrase in the direction
    // that can actually fail, with the ineligible Event ahead of the mandatory one in acceptance order.
    const shape = waitEndedCandidates(scenario("control-stale-timer-and-lost-wake"), 17);
    assert.deepEqual(shape.queued, ["res-off", "to-g4"]);
    assert.deepEqual(shape.batch, ["to-g4"]);
  });

  test("a B-6 reservation that must truncate is offered more eligible candidates than its bound holds", () => {
    // The other separating condition: B-2's truncation rule only says something when there is a choice.
    const shape = waitEndedCandidates(scenario("identity-producer-scope"), 9);
    assert.equal(shape.species, "event");
    assert.deepEqual(shape.ineligible, [], "this schedule separates the truncation choice, not exclusion");
    const eligible = shape.queued;
    assert.ok(eligible.length > shape.bound, "truncation is only observable when more candidates exist than fit");
    assert.deepEqual(shape.batch, [eligible[0]], "the retained member must be the earliest accepted of them");
  });

  for (const [violationId, scenarioId, stepIndex] of [
    ["control-stale-timer/spare-capacity-admits-ineligible-backlog", "control-stale-timer-and-lost-wake", 14],
    ["control-stale-timer/deadline-batch-appends-older-ineligible-backlog", "control-stale-timer-and-lost-wake", 17],
    ["identity-producer/wait-ended-bound-1-takes-the-later-eligible-member", "identity-producer-scope", 9],
  ] as const) {
    test(`${violationId} is rejected at its own step, moving only the batch`, () => {
      const target = scenario(scenarioId);
      const entry = violation(violationId);
      const expected = target.steps[stepIndex]!.expect.observation;
      assert.deepEqual(changedFields(expected, entry.mutate(expected)), ["dispatchedBatch"]);
      const result = runScenario(violatingCandidate(entry), target, createOperationSink());
      assert.equal(result.outcome, "FAIL", `${violationId} was accepted by the oracle`);
      if (result.outcome !== "FAIL") return;
      assert.deepEqual(result.failures.map((failure) => failure.stepIndex), [stepIndex]);
      assert.ok(result.failures[0]!.detail.includes("dispatchedBatch"));
    });
  }

  test("the top-up selector fails exactly where candidacy is observable, and is accepted by both displacement owners", () => {
    // Ownership by exclusion, the half a scenario-scoped transcript cannot state. The bug is written
    // once as a rule over any schedule — keep what the conforming batch keeps, then fill the remaining
    // slots from the whole mailbox in acceptance order — and run across the corpus. It must fail at the
    // two reservations with room to spare and be **accepted** everywhere the bound is already full,
    // including `k0-trace` step 7 and `control-subscription-wait-deadline` step 5. If it failed there,
    // R5-e1c/R5-e2b would be restatements of R5-e1/R5-e2 rather than independent assertions.
    const failures = new Map<string, readonly number[]>();
    for (const target of ALL_SCENARIOS) {
      const result = runScenario(waitEndedTopUpCandidate, target, createOperationSink());
      if (result.outcome === "FAIL") failures.set(target.id, result.failures.map((failure) => failure.stepIndex));
    }
    assert.deepEqual([...failures.keys()], ["control-stale-timer-and-lost-wake"]);
    assert.deepEqual(failures.get("control-stale-timer-and-lost-wake"), [14, 17]);
  });

  test("the wrong-end truncation selector fails exactly where a choice exists, and nowhere else", () => {
    // The same construction for B-2's truncation rule. Keeping the latest candidates instead of the
    // earliest changes nothing wherever the bound already holds every candidate, which is every
    // wait-ended reservation in the corpus except the one this entry owns.
    const failures = new Map<string, readonly number[]>();
    for (const target of ALL_SCENARIOS) {
      const result = runScenario(waitEndedLateTruncationCandidate, target, createOperationSink());
      if (result.outcome === "FAIL") failures.set(target.id, result.failures.map((failure) => failure.stepIndex));
    }
    assert.deepEqual([...failures.keys()], ["identity-producer-scope"]);
    assert.deepEqual(failures.get("identity-producer-scope"), [9]);
  });

  test("and the two selector defects are different defects: neither candidate reproduces the other's failures", () => {
    // C9's split test, applied to the constructions themselves rather than to the prose. One selector
    // can top up from the mailbox while truncating correctly, and the other can truncate from the wrong
    // end while excluding ineligible Events perfectly; the corpus must be able to tell them apart.
    const stale = scenario("control-stale-timer-and-lost-wake");
    const producer = scenario("identity-producer-scope");
    assert.equal(runScenario(waitEndedLateTruncationCandidate, stale, createOperationSink()).outcome, "PASS");
    assert.equal(runScenario(waitEndedTopUpCandidate, producer, createOperationSink()).outcome, "PASS");
  });
});
