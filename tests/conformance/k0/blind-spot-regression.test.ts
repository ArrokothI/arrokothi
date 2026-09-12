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
import { VIOLATIONS } from "./candidate.ts";
import { checkWaitWellFormed } from "./protocol-vocabulary.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";
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
