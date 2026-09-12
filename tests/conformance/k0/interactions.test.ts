/**
 * K0.2 whole-packet re-audit: the interactions, checked across the corpus.
 *
 * Individual scenarios each assert their own steps. That is not enough, and 012 says why: "a collection
 * of individually correct sections or unit tests does not establish a coherent packet." The obligations
 * below span scenarios, so they are checked here as corpus-level invariants — every scenario is swept
 * for the shape, and any scenario exhibiting it must satisfy the rule. A later edit that adds a
 * scenario getting one of these wrong fails here even if its own file passes.
 *
 * Where a rule can be derived, it is derived from `protocol-vocabulary.ts` rather than restated, so
 * this file cross-checks the literal expectations against the independent coding a second time and
 * across every scenario at once.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isEligibleUnderWait } from "./protocol-vocabulary.ts";
import type { FixtureEvent, WaitRecord } from "./protocol-vocabulary.ts";
import type { Command, Observation, Scenario } from "./fixture.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";

/** Which Execution a command acts on, for scenarios that drive more than one. */
function targetOf(command: Command): string {
  switch (command.kind) {
    case "submit_outcome":
    case "resubmit_outcome":
      return command.outcome.executionId;
    case "accept_event":
      return command.event.destination;
    default:
      return command.executionId;
  }
}

/** Events a scenario ever accepts, by ID, so an expectation's Event IDs can be resolved to envelopes. */
function eventIndex(scenario: Scenario): Map<string, FixtureEvent> {
  const index = new Map<string, FixtureEvent>();
  for (const step of scenario.steps) {
    if (step.command.kind === "create" || step.command.kind === "create_retry") index.set(step.command.initialInput.eventId, step.command.initialInput);
    if (step.command.kind === "accept_event") index.set(step.command.event.eventId, step.command.event);
    if (step.command.kind === "deliver_timer") index.set(step.command.timeoutEvent.eventId, step.command.timeoutEvent);
  }
  return index;
}

describe("interaction: wait registration × wait-ended batch selection × terminal disposition", () => {
  test("across every scenario, an Event ineligible under a registered wait never enters the batch that wait's ending produced", () => {
    let checked = 0;
    for (const scenario of ALL_SCENARIOS) {
      const events = eventIndex(scenario);
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "submit_outcome" || step.command.outcome.next.step !== "await") continue;
        const wait: WaitRecord = step.command.outcome.next.wait;
        const execution = targetOf(step.command);

        // The next dispatch for this Execution consumes whatever readiness that wait's ending created.
        const nextDispatch = scenario.steps.slice(index + 1).find((later) => later.command.kind === "dispatch" && targetOf(later.command) === execution);
        if (!nextDispatch) continue;
        const batch = nextDispatch.expect.observation.dispatchedBatch ?? [];
        checked += 1;

        for (const eventId of batch) {
          const event = events.get(eventId);
          assert.ok(event, `${scenario.id}: batch names unknown Event ${eventId}`);
          // A timeout Event is the mandatory member by construction and is eligible via neither list,
          // so it is the one member the eligibility rule does not have to admit.
          if (event.category === "kernel_timeout") continue;
          assert.ok(
            isEligibleUnderWait(wait, event),
            `${scenario.id}: ${eventId} is ineligible under the wait registered at step ${index}, but appears in the wait-ended batch`,
          );
        }
      }
    }
    assert.ok(checked >= 4, `expected several wait-then-dispatch pairs across the corpus, found ${checked}`);
  });

  test("across every scenario, an Event is never both acknowledged and terminally disposed", () => {
    // The two are different answers to "what happened to this input", and B-3/B-5 keep them disjoint.
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        const { acknowledged, terminalDispositions } = step.expect.observation;
        const overlap = acknowledged.filter((id) => terminalDispositions.includes(id));
        assert.deepEqual(overlap, [], `${scenario.id} step ${index}: ${overlap.join(",")} is both acknowledged and disposed`);
      }
    }
  });

  test("across every scenario, a terminal state leaves no Event merely queued", () => {
    // B-5: every unacknowledged Event gets an explicit disposition rather than sitting in limbo.
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        const observation = step.expect.observation;
        if (!["COMPLETED", "FAILED", "CANCELLED"].includes(observation.state)) continue;
        assert.deepEqual(
          observation.queued,
          [],
          `${scenario.id} step ${index}: terminal but ${observation.queued.join(",")} is still merely queued`,
        );
      }
    }
  });
});

describe("interaction: duplicate and conflict × receipt replay", () => {
  test("every exact resubmission replays exactly one of the two answers, never both and never neither", () => {
    // OA-2 and CX-6 are the same submitted-identity lookup with opposite answers: an accepted identity
    // replays its receipt with no rejection; a never-accepted one replays its recorded rejection and
    // mints no receipt. A candidate implementing only one rule must not be able to pass.
    let checked = 0;
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "resubmit_outcome") continue;
        checked += 1;
        const observation = step.expect.observation;
        const replaysReceipt = observation.rejection === null;

        if (replaysReceipt) {
          assert.ok(
            observation.receipt !== null && observation.receipt.startsWith("receipt:outcome:"),
            `${scenario.id} step ${index}: an accepted-identity replay must return the original Outcome receipt`,
          );
        } else {
          assert.ok(
            observation.receipt === null || !observation.receipt.startsWith("receipt:outcome:"),
            `${scenario.id} step ${index}: a rejected-identity replay must not carry an Outcome receipt`,
          );
        }
      }
    }
    assert.ok(checked >= 3, `expected several resubmissions across the corpus, found ${checked}`);
  });

  test("an exact resubmission never advances the accepted revision", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "resubmit_outcome") continue;
        const previous = previousObservationFor(scenario, index, targetOf(step.command));
        if (!previous) continue;
        assert.equal(
          step.expect.observation.progressRevision,
          previous.progressRevision,
          `${scenario.id} step ${index}: a replay advanced the progress revision`,
        );
        assert.deepEqual(step.expect.observation.emissions, previous.emissions, `${scenario.id} step ${index}: a replay re-published emissions`);
      }
    }
  });
});

describe("interaction: cancellation × whole-envelope rejection", () => {
  test("after a cancellation is accepted, no later submission for that Execution changes any accepted fact", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "accept_cancellation") continue;
        const execution = step.command.executionId;
        const fenced = step.expect.observation;
        if (fenced.state !== "CANCELLED") continue; // the Outcome-first order is a different rule

        for (const later of scenario.steps.slice(index + 1)) {
          if (!["submit_outcome", "resubmit_outcome"].includes(later.command.kind)) continue;
          if (targetOf(later.command) !== execution) continue;
          const after = later.expect.observation;

          assert.equal(after.state, "CANCELLED", `${scenario.id}: a fenced submission moved the lifecycle`);
          assert.equal(after.progressRevision, fenced.progressRevision, `${scenario.id}: a fenced submission advanced the revision`);
          assert.deepEqual(after.progress, fenced.progress, `${scenario.id}: a fenced submission installed progress`);
          assert.deepEqual(after.emissions, fenced.emissions, `${scenario.id}: a fenced submission accepted emissions`);
          assert.deepEqual(after.acknowledged, fenced.acknowledged, `${scenario.id}: a fenced submission acknowledged its batch`);
          assert.deepEqual(after.terminalDispositions, fenced.terminalDispositions, `${scenario.id}: a fenced submission changed dispositions`);
          assert.equal(after.liveWaitGeneration, null, `${scenario.id}: a fenced submission created a wait`);
          assert.equal(after.rejection?.classification, "cancellation_terminal_conflict", `${scenario.id}: wrong rejection classification after the fence`);
        }
      }
    }
  });

  test("a rejected Outcome anywhere in the corpus leaves the accepted revision where it was", () => {
    // OA-5: rejection is inert. Swept across every scenario, not only the cancellation control.
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.expect.observation.rejection === null) continue;
        if (!["submit_outcome", "resubmit_outcome", "create_retry"].includes(step.command.kind)) continue;
        const previous = previousObservationFor(scenario, index, targetOf(step.command));
        if (!previous) continue;
        assert.equal(
          step.expect.observation.progressRevision,
          previous.progressRevision,
          `${scenario.id} step ${index}: a rejected submission advanced the accepted revision`,
        );
        assert.deepEqual(step.expect.observation.progress, previous.progress, `${scenario.id} step ${index}: a rejected submission installed progress`);
        assert.deepEqual(step.expect.observation.emissions, previous.emissions, `${scenario.id} step ${index}: a rejected submission accepted emissions`);
        assert.deepEqual(step.expect.observation.acknowledged, previous.acknowledged, `${scenario.id} step ${index}: a rejected submission acknowledged input`);
      }
    }
  });
});

describe("interaction: timeout generation × authenticated result handling", () => {
  test("a timeout never removes a previously accepted Event from the mailbox", () => {
    // CL-2: preserve both facts. A timeout ends one dependency wait; it is not proof of non-execution
    // and must not be implemented as a mailbox sweep.
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "deliver_timer") continue;
        const previous = previousObservationFor(scenario, index, step.command.executionId);
        if (!previous) continue;
        for (const eventId of previous.queued) {
          assert.ok(
            step.expect.observation.queued.includes(eventId),
            `${scenario.id} step ${index}: delivering a timer dropped ${eventId} from the mailbox`,
          );
        }
      }
    }
  });

  test("a timeout Event is only ever minted for the generation that was live", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "deliver_timer") continue;
        const previous = previousObservationFor(scenario, index, step.command.executionId);
        if (!previous) continue;
        const minted = step.expect.observation.queued.filter((id) => !previous.queued.includes(id));
        if (previous.liveWaitGeneration === step.command.generation) {
          assert.ok(minted.length <= 1, `${scenario.id} step ${index}: more than one timeout Event for one expiry`);
        } else {
          assert.deepEqual(minted, [], `${scenario.id} step ${index}: a timer for generation ${step.command.generation} minted an Event while ${previous.liveWaitGeneration} was live`);
          assert.equal(
            step.expect.observation.liveWaitGeneration,
            previous.liveWaitGeneration,
            `${scenario.id} step ${index}: a non-current timer retired a generation`,
          );
        }
      }
    }
  });
});

describe("interaction: sink attribution × candidate self-report", () => {
  test("every Outcome proposing an Effect is asserted against the independent ledger, not only against its own rejection", () => {
    // A refusal with no independent observation behind it is an unsupported claim. Wherever the corpus
    // proposes an Effect, the same step must pin what the ledger recorded.
    let checked = 0;
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "submit_outcome" || step.command.outcome.effects.length === 0) continue;
        checked += 1;
        assert.notEqual(
          step.expect.ledgerCount,
          undefined,
          `${scenario.id} step ${index}: proposes an Effect but asserts nothing about the independent ledger`,
        );
        assert.equal(step.expect.ledgerCount, 0, `${scenario.id} step ${index}: K1 refuses Effects, so no dispatch may be recorded`);
      }
    }
    assert.ok(checked >= 2, `expected Effect-proposing steps across the corpus, found ${checked}`);
  });

  test("a scenario that asserts the ledger anywhere asserts it at every step, so a gap cannot hide a dispatch", () => {
    for (const scenario of ALL_SCENARIOS) {
      const declaring = scenario.steps.filter((step) => step.expect.ledgerCount !== undefined);
      if (declaring.length === 0) continue;
      assert.equal(
        declaring.length,
        scenario.steps.length,
        `${scenario.id}: asserts the ledger at ${declaring.length} of ${scenario.steps.length} steps; an unasserted step is a window for an unattributed dispatch`,
      );
    }
  });
});

/** The last expected observation for this Execution before `index`, or null if this is its first. */
function previousObservationFor(scenario: Scenario, index: number, execution: string): Observation | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const candidate = scenario.steps[cursor];
    if (candidate && candidate.expect.observation.executionId === execution) return candidate.expect.observation;
  }
  return null;
}

describe("interaction: wait-ended readiness lifetime × reservation × B-8", () => {
  /**
   * Added for round-3 review finding K02-R3-01. `waitEndedReadiness` is a new observable, and a new
   * observable is only as good as the invariants held over it — otherwise a later scenario author can
   * assert a readiness that the protocol says cannot exist and nothing notices. `B-8` fixes the whole
   * lifetime, so the whole lifetime is swept.
   */
  test("no step ever shows two outstanding readinesses: a second can never arm behind the first", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        assert.ok(
          step.expect.observation.waitEndedReadiness.length <= 1,
          `${scenario.id} step ${index} expects ${step.expect.observation.waitEndedReadiness.length} outstanding readinesses; B-8 forbids a second arming behind the first`,
        );
      }
    }
  });

  test("a readiness never names the live generation: retirement is what created it", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        const { liveWaitGeneration, waitEndedReadiness } = step.expect.observation;
        for (const readiness of waitEndedReadiness) {
          assert.notEqual(
            readiness.generation,
            liveWaitGeneration,
            `${scenario.id} step ${index} shows a readiness for the still-live generation ${readiness.generation}`,
          );
        }
      }
    }
  });

  test("readiness exists only while READY: no other lifecycle state carries one", () => {
    // W-3 and §3: rows 1-4 all land on READY, and the contrast rows create none. A readiness surviving
    // into RUNNING would be the re-arming after reservation that B-8 forbids; one in WAITING or a
    // terminal state would mean a retirement that did not happen.
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        const { state, waitEndedReadiness } = step.expect.observation;
        if (waitEndedReadiness.length === 0) continue;
        assert.equal(state, "READY", `${scenario.id} step ${index} carries a wait-ended readiness while ${state}`);
      }
    }
  });

  test("a dispatch always consumes it: reservation is where it is spent", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        if (step.command.kind !== "dispatch") continue;
        assert.deepEqual(
          step.expect.observation.waitEndedReadiness,
          [],
          `${scenario.id} step ${index} reserves a batch but leaves a readiness outstanding; B-8 consumes it at durable reservation`,
        );
      }
    }
  });

  test("every readiness a scenario shows is one some step actually retired a generation to produce", () => {
    // The converse of the above, and the check that stops a readiness being asserted out of nowhere:
    // the generation it names must be one the same scenario had live at an earlier step.
    for (const scenario of ALL_SCENARIOS) {
      const liveSoFar = new Set<string>();
      for (const [index, step] of scenario.steps.entries()) {
        const observation = step.expect.observation;
        if (observation.liveWaitGeneration !== null) liveSoFar.add(observation.liveWaitGeneration);
        for (const readiness of observation.waitEndedReadiness) {
          const declared = Object.values(scenario.waits ?? {}).some((wait) => wait.generation === readiness.generation);
          assert.ok(
            liveSoFar.has(readiness.generation) || declared,
            `${scenario.id} step ${index} shows a readiness for ${readiness.generation}, a generation this scenario never registers`,
          );
        }
      }
    }
  });
});

describe("interaction: Effect intents do not exist at K1, anywhere in the corpus", () => {
  test("every step of every scenario expects an empty Effect-intent set (EF-1/EF-2)", () => {
    // Round-3 review finding K02-R3-01 added this observable precisely because "no Effect intent ever
    // exists" was unobservable. The corpus-wide form states the K1 rule once, rather than leaving it
    // implicit in eighty-nine separate expectations: at K1 the Kernel refuses Effects outright, so no
    // accepted intent or proposal-key binding can exist at any step, in any scenario, ever.
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        assert.deepEqual(
          step.expect.observation.effectIntents,
          [],
          `${scenario.id} step ${index} expects an accepted Effect intent, which EF-1/EF-2 say cannot exist before K2`,
        );
      }
    }
  });

  test("and at least one scenario actually proposes an Effect, so the rule above is exercised rather than vacuous", () => {
    const proposesAnEffect = ALL_SCENARIOS.some((scenario) =>
      scenario.steps.some((step) => step.command.kind === "submit_outcome" && step.command.outcome.effects.length > 0),
    );
    assert.ok(proposesAnEffect, "no scenario proposes an Effect, so the empty-intent invariant proves nothing");
  });
});
