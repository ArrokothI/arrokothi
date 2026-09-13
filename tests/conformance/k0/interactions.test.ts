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
import { isDeepStrictEqual } from "node:util";
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
          // Round-5 review finding K02-R5-02: the fence is zero wait/deadline/readiness/next-state, not
          // merely zero lifecycle. A losing `await` with a deadline must leave no accepted deadline
          // fact and no readiness either — inferred absence from CANCELLED or live generation alone is
          // not evidence. Round-6 finding K02-R6-01: the deadline half observes accepted logical
          // state, never physical timer handles.
          assert.equal(after.acceptedDeadline, null, `${scenario.id}: a fenced submission accepted a deadline fact`);
          assert.deepEqual(after.waitEndedReadiness, [], `${scenario.id}: a fenced submission created a readiness`);
          // OA-2 lookup precedes CX-6: an Outcome accepted before cancellation replays its
          // accepted answer. The new clause-edge schedule makes this exception observable.
          const submitted = later.command;
          const wasAccepted = (submitted.kind === "submit_outcome" || submitted.kind === "resubmit_outcome") &&
            scenario.steps.slice(0, index).some(prior => prior.command.kind === "submit_outcome" &&
              isDeepStrictEqual(prior.command.outcome, submitted.outcome) &&
              prior.expect.observation.rejection === null);
          if (wasAccepted) assert.equal(after.rejection, null, `${scenario.id}: accepted replay reclassified as loser`);
          else assert.equal(after.rejection?.classification, "cancellation_terminal_conflict", `${scenario.id}: wrong rejection classification after the fence`);
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

describe("interaction: the accepted deadline is live exactly while a deadline wait is live", () => {
  // Added for round-5 review finding K02-R5-02 and redefined for round-6 finding K02-R6-01.
  // `acceptedDeadline` observes Kernel semantic state — the deadline fact W-2 step 4 persists with
  // the live registration ("with the live registration, its generation and its deadline") — never
  // scheduler mechanism. A new observable is only as good as the invariants held over it, otherwise
  // a later scenario author can assert a deadline the protocol says cannot exist and nothing notices.
  // The rule is the smallest truthful one: a non-null accepted deadline belongs to the live wait.
  // Crucially, retirement clears the logical fact while saying nothing about physical timers: W-3
  // permits a timer scheduled for a retired generation to arrive later as a stale no-op, and W-9/§4
  // leave timer mechanism, storage layout, units/precision and the instant source
  // implementation-owned. No invariant here may require a physical timer to be cancelled or removed
  // when the logical wait retires.
  test("a non-null accepted deadline is carried only while WAITING with that wait live", () => {
    for (const scenario of ALL_SCENARIOS) {
      for (const [index, step] of scenario.steps.entries()) {
        const { state, liveWaitGeneration, acceptedDeadline } = step.expect.observation;
        if (acceptedDeadline === null) continue;
        assert.equal(state, "WAITING", `${scenario.id} step ${index} carries accepted deadline ${acceptedDeadline} while ${state}`);
        assert.ok(liveWaitGeneration !== null, `${scenario.id} step ${index} carries accepted deadline ${acceptedDeadline} with no live wait`);
      }
    }
  });

  test("every accepted deadline is one some submitted wait actually declared, beside the live generation", () => {
    // The converse, stopping a deadline being asserted out of nowhere: the (generation, deadline)
    // pair must be one the same scenario submitted, and the generation must be the live one — the
    // pair is the "record keyed by generation" the protocol fixes, without any scheduler handle.
    for (const scenario of ALL_SCENARIOS) {
      const declared = new Map<string, number>();
      for (const step of scenario.steps) {
        if (step.command.kind !== "submit_outcome") continue;
        const next = step.command.outcome.next;
        if (next.step !== "await") continue;
        if (next.wait.deadline !== undefined) declared.set(next.wait.generation, next.wait.deadline);
      }
      for (const wait of Object.values(scenario.waits ?? {})) {
        if (wait.deadline !== undefined) declared.set(wait.generation, wait.deadline);
      }
      for (const [index, step] of scenario.steps.entries()) {
        const { liveWaitGeneration, acceptedDeadline } = step.expect.observation;
        if (acceptedDeadline === null) continue;
        assert.ok(liveWaitGeneration !== null && declared.get(liveWaitGeneration) === acceptedDeadline, `${scenario.id} step ${index} carries accepted deadline ${acceptedDeadline} beside live generation ${liveWaitGeneration}, a pair this scenario never submitted`);
      }
    }
  });

  test("a stale timer delivery after logical retirement is still scheduled and still a no-op (W-3)", () => {
    // Round-6 review finding K02-R6-01's required regression. Logical retirement must not be read as
    // physical timer cancellation: the schedule deliberately delivers a timer for a generation whose
    // logical wait/deadline has already retired, and the expectation is a harmless no-op with the
    // accepted deadline still null. An implementation that retains the physical timer and fences the
    // late delivery as stale satisfies this; one that required eager cancellation would too — the
    // fixture cannot and must not tell them apart.
    let checked = 0;
    for (const scenario of ALL_SCENARIOS) {
      const retired = new Set<string>();
      for (const [index, step] of scenario.steps.entries()) {
        const observation = step.expect.observation;
        // Only generations retired by *previous* steps count: the current delivery's own readiness
        // (B-7 path B creates it here) must not qualify its own generation as stale.
        if (step.command.kind === "deliver_timer" && retired.has(step.command.generation)) {
          checked += 1;
          const previous = previousObservationFor(scenario, index, step.command.executionId);
          assert.ok(previous, `${scenario.id} step ${index}: no previous observation to compare the stale delivery against`);
          assert.equal(observation.state, previous.state, `${scenario.id} step ${index}: a stale delivery for a retired generation moved the lifecycle`);
          assert.equal(observation.liveWaitGeneration, previous.liveWaitGeneration, `${scenario.id} step ${index}: a stale delivery for a retired generation retired a generation`);
          // The stale delivery changes no logical deadline fact either: where no deadline is live
          // it stays null, and where another generation's deadline is live it is untouched. Either
          // way the late delivery is fenced by generation, and no physical-timer state is consulted.
          assert.equal(observation.acceptedDeadline, previous.acceptedDeadline, `${scenario.id} step ${index}: a stale delivery for a retired generation changed the accepted deadline`);
        }
        for (const readiness of observation.waitEndedReadiness) retired.add(readiness.generation);
      }
    }
    assert.ok(checked >= 2, `expected stale-after-retirement deliveries across the corpus, found ${checked}`);
  });

  test("and at least one live accepted deadline and one fenced losing await exist, so the rule is exercised rather than vacuous", () => {
    const liveDeadline = ALL_SCENARIOS.some((scenario) => scenario.steps.some((step) => step.expect.observation.acceptedDeadline !== null));
    assert.ok(liveDeadline, "no step carries an accepted deadline, so the deadline invariant proves nothing");
    const losingAwait = ALL_SCENARIOS.some((scenario) =>
      scenario.steps.some(
        (step) =>
          step.command.kind === "submit_outcome" &&
          step.command.outcome.next.step === "await" &&
          step.command.outcome.next.wait.deadline !== undefined &&
          step.expect.observation.rejection?.classification === "cancellation_terminal_conflict" &&
          step.expect.observation.acceptedDeadline === null,
      ),
    );
    assert.ok(losingAwait, "no fenced losing `await` with a deadline exists, so CX-6's zero-deadline clause has no schedule exercising it");
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


describe("interaction: ID-2 application ingress across receipts, waits, batches and terminal paths", () => {
  test("every application ingress preserves the exchange and opaque receipt; only fresh accepted identities append", () => {
    let fresh = 0, replay = 0, conflict = 0, terminal = 0, running = 0, waiting = 0;
    for (const scenario of ALL_SCENARIOS) {
      const accepted = new Map<string, FixtureEvent>();
      for (const [index, step] of scenario.steps.entries()) {
        const command = step.command;
        if (command.kind === "create" || command.kind === "create_retry") {
          const input = command.initialInput;
          assert.ok(input.category === "application_input");
          assert.equal(input.producer, command.producer ?? "prod-default");
          assert.equal(input.requestKey, command.requestKey);
          if (step.expect.observation.rejection === null) accepted.set(JSON.stringify([input.producer, input.destination, input.requestKey]), input);
        }
        if (command.kind !== "accept_event" || command.event.category !== "application_input") continue;
        const event = command.event;
        assert.ok(event.producer.length && event.requestKey.length);
        const before = previousObservationFor(scenario, index, event.destination);
        assert.ok(before);
        const after = step.expect.observation;
        // Rows 1/6: neither identity validation nor mailbox acceptance resolves the current exchange.
        for (const field of ["activationId", "dispatchedBatch", "acknowledged", "progress", "progressRevision", "emissions", "receipt", "terminalDispositions"] as const) {
          assert.deepEqual(after[field], before[field], `${scenario.id} ${index}: ingress changed ${field}`);
        }
        const key = JSON.stringify([event.producer, event.destination, event.requestKey]);
        const prior = accepted.get(key);
        if (prior) {
          assert.deepEqual(after.queued, before.queued);
          if (JSON.stringify(prior) === JSON.stringify(event)) {
            replay++;
            assert.deepEqual(after.rejection, before.rejection);
          } else {
            conflict++;
            assert.equal(after.rejection?.classification, "duplicate_conflict");
          }
        } else if (["COMPLETED", "FAILED", "CANCELLED"].includes(before.state)) {
          terminal++;
          assert.equal(after.ingressRefused, event.eventId);
          assert.deepEqual(after.queued, before.queued);
        } else {
          fresh++;
          accepted.set(key, event);
          assert.equal(after.ingressRefused, null);
          assert.deepEqual(after.queued, [...before.queued, event.eventId]);
          if (before.state === "RUNNING") running++;
          if (before.state === "WAITING") waiting++;
        }
        // Rows 5/6: producer keys are identity metadata, never a fourth wait selector.
        if (before.liveWaitGeneration === null) {
          assert.deepEqual(after.waitEndedReadiness, before.waitEndedReadiness);
          assert.equal(after.state, before.state);
          assert.equal(after.acceptedDeadline, before.acceptedDeadline);
        } else {
          const wait = Object.values(scenario.waits ?? {}).find((w) => w.generation === before.liveWaitGeneration);
          assert.ok(wait);
          if (prior || !isEligibleUnderWait(wait, event)) {
            assert.equal(after.liveWaitGeneration, before.liveWaitGeneration);
            assert.equal(after.acceptedDeadline, before.acceptedDeadline);
          } else {
            assert.equal(after.state, "READY");
            assert.equal(after.liveWaitGeneration, null);
            assert.equal(after.acceptedDeadline, null);
            assert.deepEqual(after.waitEndedReadiness, [{ generation: wait.generation, species: "event" }]);
          }
        }
      }
    }
    assert.ok(fresh > 0 && replay > 0 && conflict > 0 && terminal > 0 && running > 0 && waiting > 0);
  });

  test("same-destination producers survive W-2, B-6 bound 1, B-3 acknowledgment and B-5 disposal", () => {
    const target = ALL_SCENARIOS.find((s) => s.id === "identity-producer-scope")!;
    const registered = target.steps[8]!.expect.observation;
    assert.deepEqual(registered.queued, ["input-a", "input-b"]);
    assert.deepEqual(registered.acknowledged, ["in-pa"]);
    assert.deepEqual(registered.waitEndedReadiness, [{ generation: "g-input", species: "event" }]);
    assert.deepEqual(target.steps[9]!.expect.observation.dispatchedBatch, ["input-a"]);
    const completed = target.steps[10]!.expect.observation;
    assert.deepEqual(completed.acknowledged, ["in-pa", "input-a"]);
    assert.deepEqual(completed.terminalDispositions, ["input-b"]);
    assert.deepEqual(completed.queued, []);
  });
});

describe("interaction: the writer epoch is an exchange-local relation, never a cross-exchange counter", () => {
  // Round-13 review finding K02-R13-01, as a corpus invariant rather than a per-scenario assertion.
  // The defect was corpus-shaped: six scenarios advanced the epoch at a new Activation ID with no
  // takeover anywhere, `identity-producer-scope` held it fixed across the same transition, and no
  // conforming implementation could satisfy both. A per-scenario check would have found neither half.
  // `blind-spot-regression.test.ts` owns the other direction — that four different conforming policies
  // are accepted and two non-conforming ones rejected.

  test("the corpus itself no longer states a cross-exchange epoch relation", () => {
    // The structural half. Every exchange's first observed attempt is ordinal 1, so the numbers in
    // the schedules cannot be read as an absolute counter even before the runner ignores them.
    let takeovers = 0;
    for (const target of ALL_SCENARIOS) {
      const seen = new Map<string, number>();
      for (const [index, step] of target.steps.entries()) {
        const observation = step.expect.observation;
        if (observation.activationId === null) continue;
        const previous = seen.get(observation.activationId);
        if (previous === undefined) {
          assert.equal(
            observation.writerEpoch,
            1,
            `${target.id} step ${index}: exchange ${observation.activationId} opens at attempt ${observation.writerEpoch}; attempts are exchange-local ordinals starting at 1 so no schedule can relate two exchanges`,
          );
          seen.set(observation.activationId, observation.writerEpoch);
          continue;
        }
        if (observation.writerEpoch === previous) continue;
        assert.ok(
          observation.writerEpoch > previous,
          `${target.id} step ${index}: the attempt ordinal moved backwards inside one exchange, which ID-4's total order forbids`,
        );
        assert.equal(
          step.command.kind,
          "takeover",
          `${target.id} step ${index}: the attempt ordinal advanced at a ${step.command.kind} command; ID-4 bumps the epoch only by an authenticated takeover`,
        );
        takeovers += 1;
        seen.set(observation.activationId, observation.writerEpoch);
      }
    }
    assert.equal(takeovers, 1, "exactly one authenticated takeover exists in the corpus, and it is the only advance");
  });

  test("every submitted Outcome names an attempt its own exchange actually observed first", () => {
    // The other half of the port question. An envelope naming an attempt no step observed could not be
    // resolved into a candidate's namespace, so `adaptCommandToCandidate` would fail the step closed;
    // this checks the corpus never relies on that path.
    for (const target of ALL_SCENARIOS) {
      const seen = new Map<string, Set<number>>();
      for (const [index, step] of target.steps.entries()) {
        const command = step.command;
        if (command.kind === "submit_outcome" || command.kind === "resubmit_outcome") {
          const known = seen.get(command.outcome.activationId);
          assert.ok(
            known?.has(command.outcome.writerEpoch),
            `${target.id} step ${index}: submits ${command.outcome.activationId} at attempt ${command.outcome.writerEpoch}, which no earlier step observed`,
          );
        }
        const observation = step.expect.observation;
        if (observation.activationId === null) continue;
        const bucket = seen.get(observation.activationId) ?? new Set<number>();
        bucket.add(observation.writerEpoch);
        seen.set(observation.activationId, bucket);
      }
    }
  });
});
