/**
 * K1.4-candidate: the identity rule of design 03 and its addendum 01, tested on the candidate itself.
 *
 * Review 02 K14C-R02-01 found that a generated fallback string was outside the collision check. The
 * candidate now renders every translated identity position through one name ledger per scope. This
 * file holds:
 * - the mechanism witnesses, and each mechanism mutant failing its witness (addendum §A4);
 * - the transitions of design 03 §5, and every review 01, review 02 and design 03 counterexample with
 *   the approved outcome (R03-2);
 * - the association checks and their fault traces (addendum §A1, design check 03 D03-CHK-01);
 * - the first-exposure control (addendum §A2, D03-CHK-02);
 * - the oracle's own rejection controls (addendum §A3, D03-CHK-03);
 * - the oracle's joins (designs 04 and 05): review 03's four probes, the swallowed-refusal trace, the J-1
 *   refusal controls, the failed-record policy, the live settlement-report controls, the recorder's entry order
 *   and nesting, its census of coordinator methods, and the one-coordinator structure guard;
 * - the census controls: `ingressRefused`, and the `eventIdentity` capability refusal (addendum §A5).
 *
 * The bounded search is `identity-search.test.ts`; the oracle's declared matrix and design 05 addendum 01's
 * controls are `identity-oracle.test.ts`. Faults here are injected into the Kernel's public
 * answers for the test; none is a claim about the Kernel.
 */

import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import type { CandidateRefusal, Command, Observation, Scenario } from "../k0/fixture.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import {
  acceptCommand,
  AnswerContradiction,
  COORDINATOR_METHODS,
  createCommand,
  dispatchCommand,
  judge,
  outcomeOf,
  registerWait,
  ROWS,
  startLab,
  timerCommand,
  UnknownLaboratoryReference,
  waitDeclaration,
} from "./identity-lab.ts";
import type { AuthenticatedCaller, CallRecord, DeliverySettlement, ExecutionView, Faults, Lab, StepRecord, Tamper } from "./identity-lab.ts";
import { MUTANT_FILE, MUTANTS } from "./identity-mutants.ts";
import type { MechanismMutant } from "./identity-mutants.ts";
import { answerOnly, changedEverywhere, lastFiredGeneration, lastView, nativeTimeouts, WITNESSES } from "./identity-witnesses.ts";
import { kernelCandidate } from "./kernel-candidate.ts";

const HERE = import.meta.dirname;
const REPO_ROOT = resolve(HERE, "../../..");
const REGISTRY = "tests/fixtures/packet-tools/mutations.json";
const COVERAGE = "tests/fixtures/packet-tools/coverage.json";
const PROBE = "tests/conformance/k0-candidate/identity-probe.mjs";

/** A lab with one Execution `x` created. */
const started = (faults?: Faults): Lab => {
  const lab = faults === undefined ? startLab() : startLab({ faults });
  lab.apply(createCommand("x", "kx"));
  return lab;
};
const fire = (lab: Lab, generation: string, name: string, executionId = "x"): Observation => lab.apply(timerCommand(executionId, generation, name));
const codeOf = (run: () => unknown): string => {
  try {
    run();
  } catch (error) {
    if (error instanceof AnswerContradiction) return error.code;
    throw error;
  }
  return "no throw";
};
const clean = (lab: Lab): void => assert.deepEqual(judge(lab).problems, [], "the oracle has no problem with this run");

describe("K1.4-candidate identity: the mechanism witnesses (addendum §A4)", () => {
  for (const mutant of MUTANTS) {
    test(`${mutant.id} witness passes on the candidate: ${mutant.obligation}`, () => {
      assert.deepEqual((WITNESSES[mutant.id] as () => string[])(), []);
    });
  }
});

describe("K1.4-candidate identity: transitions (design 03 §5)", () => {
  test("a new ID answered with a free name is shown under it, in every family", () => {
    const lab = started();
    const waiting = registerWait(lab, "x", "g1", 10);
    assert.deepEqual([waiting.executionId, waiting.liveWaitGeneration, waiting.acknowledged], ["x", "g1", ["initial"]]);
    assert.deepEqual(fire(lab, "g1", "t1").queued, ["t1"]);
    assert.deepEqual(lab.apply(acceptCommand("in-1", "x", "k1")).queued, ["t1", "in-1"]);
    clean(lab);
  });

  test("a duplicate answer changes nothing, under the same name or another, and the other name stays free", () => {
    const lab = started();
    registerWait(lab, "x", "g1", 10);
    const fired = fire(lab, "g1", "t1");
    assert.deepEqual(fire(lab, "g1", "t1"), fired);
    assert.deepEqual(fire(lab, "g1", "another"), fired);
    registerWait(lab, "x", "g2", 20);
    assert.deepEqual(fire(lab, "g2", "another").queued, ["another"], "the name a duplicate offered was never taken");
    clean(lab);
  });

  test("a fire of an ended generation, and a fire that is not due, answer no ID and change nothing", () => {
    const lab = started();
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "t1");
    const waiting = registerWait(lab, "x", "g2", 40);
    lab.apply(acceptCommand("wake", "x", "k1", "continue"));
    const woken = lab.apply({ kind: "inspect", executionId: "x" });
    assert.equal(woken.state, "READY", "the input ended generation 2 without a timeout");
    assert.deepEqual(fire(lab, "g2", "late"), woken);
    assert.equal(nativeTimeouts(lab).length, 1);
    assert.equal(waiting.liveWaitGeneration, "g2");
    clean(lab);
  });

  test("a wait already due is announced by its registration answer and takes its label there (Q2 b)", () => {
    const lab = started();
    const due = registerWait(lab, "x", "g1", 1);
    assert.deepEqual([due.state, due.queued, due.waitEndedReadiness], ["READY", ["to-g1"], [{ generation: "g1", species: "deadline" }]]);
    clean(lab);
  });

  test("a labelled timeout keeps its label when a command names it (owner choice 04 OQ-1)", () => {
    const lab = started();
    const due = registerWait(lab, "x", "g1", 1);
    assert.deepEqual(fire(lab, "g1", "first-name"), due);
    assert.deepEqual(fire(lab, "g1", "to-g1"), due);
    clean(lab);
  });

  test("a timeout the view holds and no answer announced gets a fresh string, not the label", () => {
    // Fault: the registration answer says the wait is still waiting, although the Kernel expired it.
    const lab = started({
      answer(method, _args, answer) {
        const accepted = answer as { readonly ok?: boolean; readonly value?: { readonly wait?: { readonly result: string } | null } };
        if (method !== "submitOutcome" || accepted.ok !== true || accepted.value?.wait?.result !== "expired") return answer;
        return { ...accepted, value: { ...accepted.value, wait: { ...accepted.value.wait, result: "waiting", timeoutEventId: null } } };
      },
    });
    const due = registerWait(lab, "x", "g1", 1);
    assert.deepEqual(due.queued, [`kernel-event:${nativeTimeouts(lab)[0]}`]);
    clean(lab);
  });

  test("a generation offered a used name is shown fresh, and its already-due timeout gets no label", () => {
    const lab = started();
    registerWait(lab, "x", "g", 10);
    fire(lab, "g", "t1");
    const second = registerWait(lab, "x", "g", 5);
    assert.deepEqual(second.waitEndedReadiness, [{ generation: "kernel-generation:2", species: "deadline" }]);
    assert.deepEqual(second.queued, [`kernel-event:${nativeTimeouts(lab)[1]}`]);
    clean(lab);
  });

  test("the same names in two Executions do not conflict", () => {
    const lab = startLab();
    lab.apply(createCommand("x", "kx"));
    lab.apply(createCommand("y", "ky"));
    // One laboratory clock serves both Executions, so the second deadline is later than the first.
    for (const [executionId, deadline] of [["x", 10], ["y", 20]] as const) {
      registerWait(lab, executionId, "g", deadline);
      assert.deepEqual(fire(lab, "g", "__proto__", executionId).queued, ["__proto__"]);
      assert.deepEqual(lab.apply(acceptCommand("雪", executionId, "k1")).queued, ["__proto__", "雪"]);
    }
    clean(lab);
  });
});

describe("K1.4-candidate identity: review 02 K14C-R02-01's counterexamples (R03-2)", () => {
  test("exposed, then a command reuses the exposed string: three timeouts, three strings, in every list", () => {
    const lab = started();
    registerWait(lab, "x", "alpha", 10);
    fire(lab, "alpha", "taken");
    registerWait(lab, "x", "beta", 20);
    const exposed = fire(lab, "beta", "taken").queued[0] as string;
    registerWait(lab, "x", "gamma", 30);
    const third = fire(lab, "gamma", exposed);
    const [, second, last] = nativeTimeouts(lab);
    assert.deepEqual([third.acknowledged, third.queued], [["initial", "taken", `kernel-event:${second}`], [`kernel-event:${last}`]]);
    assert.deepEqual(lab.apply(dispatchCommand("x")).dispatchedBatch, [`kernel-event:${last}`]);
    const cancelled = lab.apply({ kind: "accept_cancellation", executionId: "x" });
    assert.deepEqual([cancelled.acknowledged, cancelled.terminalDispositions], [["initial", "taken", `kernel-event:${second}`], [`kernel-event:${last}`]]);
    clean(lab);
  });

  test("a command name equal to the later fresh string: the later ID takes the next variant", () => {
    const calibration = started();
    registerWait(calibration, "x", "alpha", 10);
    fire(calibration, "alpha", "first");
    registerWait(calibration, "x", "beta", 20);
    fire(calibration, "beta", "second");
    const name = `kernel-event:${nativeTimeouts(calibration)[1]}`;

    const lab = started();
    registerWait(lab, "x", "alpha", 10);
    fire(lab, "alpha", name);
    registerWait(lab, "x", "beta", 20);
    const second = fire(lab, "beta", name);
    assert.deepEqual(nativeTimeouts(lab), nativeTimeouts(calibration));
    assert.deepEqual([second.acknowledged, second.queued], [["initial", name], [`${name}~2`]]);
    clean(lab);
  });

  for (const name of ["ordinary-name", "kernel-event:review-drift", "to-g1"]) {
    test(`an already-shown timeout whose ID changes on a duplicate fire, named ${name}: the new ID gets a new string`, () => {
      const faults = changedEverywhere(() => "review-drift");
      const lab = started(faults);
      registerWait(lab, "x", "g1", 10);
      const shown = fire(lab, "g1", name);
      const drifted = fire(lab, "g1", name);
      assert.ok(faults.changed() !== null, "the fault fired");
      const expected = name === "kernel-event:review-drift" ? "kernel-event:review-drift~2" : "kernel-event:review-drift";
      assert.deepEqual(drifted.queued, [expected]);
      assert.deepEqual({ ...drifted, queued: shown.queued }, shown, "nothing but the changed ID's string moved");
      clean(lab);
    });

    test(`the same change in the answer only, named ${name}: the run ends on the contradiction`, () => {
      const lab = started(answerOnly(() => "review-drift"));
      registerWait(lab, "x", "g1", 10);
      fire(lab, "g1", name);
      assert.equal(codeOf(() => fire(lab, "g1", name)), "timeout_generation");
      clean(lab);
    });
  }

  test("a generation named like the next one's fresh string: two strings, and each fire reaches what its string shows", () => {
    const lab = started();
    const first = registerWait(lab, "x", "kernel-generation:2", 10);
    fire(lab, "kernel-generation:2", "first");
    const second = registerWait(lab, "x", "kernel-generation:2", 20);
    assert.deepEqual([first.liveWaitGeneration, second.liveWaitGeneration], ["kernel-generation:2", "kernel-generation:2~2"]);
    assert.equal(fire(lab, "kernel-generation:2", "second").state, "WAITING");
    assert.equal(lastFiredGeneration(lab), 1);
    assert.equal(fire(lab, "kernel-generation:2~2", "third").state, "READY");
    assert.equal(lastFiredGeneration(lab), 2);
    clean(lab);
  });

  test("two Executions under a name equal to the second's fresh string: two strings, each a working reference", () => {
    const calibration = startLab();
    calibration.apply(createCommand("calibration", "second-key"));
    const name = `kernel-execution:${lastView(calibration).executionId}`;

    const lab = startLab();
    const first = lab.apply(createCommand(name, "first-key"));
    const second = lab.apply(createCommand(name, "second-key"));
    assert.deepEqual([first.executionId, second.executionId], [name, `${name}~2`]);
    assert.equal(lab.apply({ kind: "inspect", executionId: name }).executionId, name);
    assert.equal(lastView(lab).creationKey, "first-key");
    assert.equal(lab.apply({ kind: "inspect", executionId: `${name}~2` }).executionId, `${name}~2`);
    assert.equal(lastView(lab).creationKey, "second-key");
    clean(lab);
  });

  test("review 02's preserved controls: non-ASCII and `__proto__` names, duplicate and ended fires, the old label", () => {
    const lab = started();
    const due = registerWait(lab, "x", "雪", 1);
    assert.deepEqual(due.queued, ["to-雪"]);
    assert.deepEqual(fire(lab, "雪", "__proto__"), due, "OQ-1: the label stays");
    const next = registerWait(lab, "x", "later", 50);
    assert.deepEqual(fire(lab, "雪", "late-name"), next);
    const offered = fire(lab, "later", "to-雪");
    assert.deepEqual([offered.acknowledged, offered.queued], [["initial", "to-雪"], [`kernel-event:${nativeTimeouts(lab)[1]}`]]);
    clean(lab);
  });
});

describe("K1.4-candidate identity: the collisions design 03 §2.6 added (rows 6 to 11)", () => {
  test("6: two input Events offered one name", () => {
    const lab = started();
    lab.apply(acceptCommand("same", "x", "k1"));
    const second = lab.apply(acceptCommand("same", "x", "k2"));
    assert.deepEqual(second.queued, ["initial", "same", `kernel-event:${lastView(lab).queued[2]}`]);
    clean(lab);
  });

  test("7: an input Event named like a due wait's label, in both orders", () => {
    const inputFirst = started();
    inputFirst.apply(acceptCommand("to-g1", "x", "k1"));
    const due = registerWait(inputFirst, "x", "g1", 1);
    assert.deepEqual(due.queued, ["to-g1", `kernel-event:${nativeTimeouts(inputFirst)[0]}`]);
    clean(inputFirst);

    const labelFirst = started();
    registerWait(labelFirst, "x", "g1", 1);
    const accepted = labelFirst.apply(acceptCommand("to-g1", "x", "k1"));
    assert.deepEqual(accepted.queued, ["to-g1", `kernel-event:${lastView(labelFirst).queued[1]}`]);
    clean(labelFirst);
  });

  test("8: an input Event and a command-named timeout under one name, in both orders", () => {
    const timeoutFirst = started();
    registerWait(timeoutFirst, "x", "g1", 10);
    fire(timeoutFirst, "g1", "shared");
    assert.deepEqual(timeoutFirst.apply(acceptCommand("shared", "x", "k1")).queued, ["shared", `kernel-event:${lastView(timeoutFirst).queued[1]}`]);
    clean(timeoutFirst);

    const inputFirst = started();
    inputFirst.apply(acceptCommand("shared", "x", "k1"));
    registerWait(inputFirst, "x", "g1", 10);
    assert.deepEqual(fire(inputFirst, "g1", "shared").queued, ["shared", `kernel-event:${nativeTimeouts(inputFirst)[0]}`]);
    clean(inputFirst);
  });

  test("9: an answer names a timeout ID the inspection does not hold", () => {
    const lab = started(answerOnly((id) => `${id}-other`));
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "named");
    assert.equal(codeOf(() => fire(lab, "g1", "named")), "timeout_generation");
    clean(lab);
  });

  test("10: a labelled timeout's ID changes at its first explicit name: the honest and the faulted run differ", () => {
    const honest = started();
    registerWait(honest, "x", "g1", 1);
    const kept = fire(honest, "g1", "first-name");
    const faults = changedEverywhere((id) => `${id}-other`);
    const faulted = started(faults);
    registerWait(faulted, "x", "g1", 1);
    const moved = fire(faulted, "g1", "first-name");
    assert.deepEqual([kept.queued, moved.queued], [["to-g1"], ["first-name"]]);
    clean(honest);
    clean(faulted);
  });

  test("11: an answer names an old timeout while the state holds the new one: the run ends on the contradiction", () => {
    // Fault: the second generation's first fire is answered with the first generation's timeout.
    let firstTimeout = "";
    const lab = started({
      answer(method, args, answer) {
        const fired = answer as { readonly result?: string };
        if (method !== "fireTimer" || fired.result !== "expired" || (args[0] as { readonly generation: number }).generation !== 2) return answer;
        return { ...fired, timeoutEventId: firstTimeout };
      },
    });
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "to-g1");
    firstTimeout = nativeTimeouts(lab)[0] as string;
    registerWait(lab, "x", "g2", 20);
    assert.equal(codeOf(() => fire(lab, "g2", "to-g2")), "timeout_generation");
    clean(lab);
  });
});

describe("K1.4-candidate identity: an answer is checked against what it claims to name (addendum §A1)", () => {
  /** Two generations, each expired by its fire and shown. Returns the two native timeout IDs. */
  const twoExpired = (lab: Lab): string[] => {
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "t1");
    registerWait(lab, "x", "g2", 20);
    fire(lab, "g2", "t2");
    return nativeTimeouts(lab);
  };

  for (const [faulted, other] of [[2, 1], [1, 2]] as const) {
    test(`check trace 1: a duplicate fire of g${faulted} answers with g${other}'s timeout, in the answer only`, () => {
      let wrong = "";
      const lab = started(answerOnly(() => wrong, (generation) => generation === faulted));
      const timeouts = twoExpired(lab);
      wrong = timeouts[other - 1] as string;
      assert.equal(codeOf(() => fire(lab, `g${faulted}`, `t${faulted}`)), "timeout_generation");
      clean(lab);
    });
  }

  test("check trace 2: a due-at-registration timeout's mailbox entry carries another generation", () => {
    const lab = started({
      view: (view) => ({ ...view, mailbox: view.mailbox.map((entry) => (entry.sourceCategory === "kernel_timeout" && entry.waitGeneration === 2 ? { ...entry, waitGeneration: 1 } : entry)) }) as ExecutionView,
    });
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "t1");
    assert.equal(codeOf(() => registerWait(lab, "x", "g2", 5)), "timeout_generation");
    clean(lab);
  });

  test("check trace 3: a replayed Outcome's answer names another retired generation", () => {
    let replayedGeneration: number | null = null;
    const lab = started({
      answer(method, _args, answer) {
        const accepted = answer as { readonly ok?: boolean; readonly value?: { readonly replayed: boolean; readonly wait: { readonly generation: number } | null } };
        if (method !== "submitOutcome" || accepted.ok !== true || accepted.value?.replayed !== true || accepted.value.wait === null || replayedGeneration === null) return answer;
        return { ...accepted, value: { ...accepted.value, wait: { ...accepted.value.wait, generation: replayedGeneration } } };
      },
    });
    const open = lab.apply(dispatchCommand("x"));
    const first = outcomeOf(open, { step: "await", wait: waitDeclaration("g1", 10) });
    lab.apply({ kind: "submit_outcome", outcome: first });
    fire(lab, "g1", "t1");
    registerWait(lab, "x", "g2", 20);
    fire(lab, "g2", "t2");
    // Honest control first: the replay of g1's Outcome, after both generations retired, completes.
    const honest = lab.apply({ kind: "resubmit_outcome", outcome: first });
    assert.deepEqual(honest.acknowledged, ["initial", "t1"]);
    replayedGeneration = 2;
    assert.equal(codeOf(() => lab.apply({ kind: "resubmit_outcome", outcome: first })), "wait_activation");
    clean(lab);
  });

  test("a missing answer field: a duplicate fire answered with no ID; a replayed await answered with no wait", () => {
    const noId = started(answerOnly(() => null));
    registerWait(noId, "x", "g1", 10);
    fire(noId, "g1", "t1");
    assert.equal(codeOf(() => fire(noId, "g1", "t1")), "timeout_generation");
    clean(noId);

    const noWait = started({
      answer(method, _args, answer) {
        const accepted = answer as { readonly ok?: boolean; readonly value?: { readonly replayed: boolean } };
        return method === "submitOutcome" && accepted.ok === true && accepted.value?.replayed === true ? { ...accepted, value: { ...accepted.value, wait: null } } : answer;
      },
    });
    const open = noWait.apply(dispatchCommand("x"));
    const outcome = outcomeOf(open, { step: "await", wait: waitDeclaration("g1", 10) });
    noWait.apply({ kind: "submit_outcome", outcome });
    assert.equal(codeOf(() => noWait.apply({ kind: "resubmit_outcome", outcome })), "wait_presence");
    clean(noWait);
  });

  test("an already-due registration answered as expired with no timeout ID", () => {
    const lab = started({
      answer(method, _args, answer) {
        const accepted = answer as { readonly ok?: boolean; readonly value?: { readonly wait?: { readonly result: string } | null } };
        if (method !== "submitOutcome" || accepted.ok !== true || accepted.value?.wait?.result !== "expired") return answer;
        return { ...accepted, value: { ...accepted.value, wait: { ...accepted.value.wait, timeoutEventId: null } } };
      },
    });
    assert.equal(codeOf(() => registerWait(lab, "x", "g1", 1)), "wait_timeout");
    clean(lab);
  });

  test("a wrong category: an accepted input's answer names a timeout entry", () => {
    let timeout = "";
    const lab = started({
      answer(method, _args, answer) {
        const accepted = answer as { readonly ok?: boolean; readonly value?: object };
        return method === "submitInput" && accepted.ok === true && timeout !== "" ? { ...accepted, value: { ...accepted.value, eventId: timeout } } : answer;
      },
    });
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "t1");
    timeout = nativeTimeouts(lab)[0] as string;
    assert.equal(codeOf(() => lab.apply(acceptCommand("in-1", "x", "k1"))), "input_entry");
    clean(lab);
  });

  test("payload drift: an input entry stops carrying the name it was offered", () => {
    let drift = false;
    const lab = started({
      view: (view) => (drift ? ({ ...view, mailbox: view.mailbox.map((entry) => (entry.sourceCategory === "application_input" && entry.acceptancePosition > 1 ? { ...entry, payload: { eventId: "other" } } : entry)) } as ExecutionView) : view),
    });
    lab.apply(acceptCommand("in-1", "x", "k1"));
    assert.deepEqual(lab.apply({ kind: "inspect", executionId: "x" }).queued, ["initial", "in-1"]);
    drift = true;
    assert.equal(codeOf(() => lab.apply({ kind: "inspect", executionId: "x" })), "input_payload");
    clean(lab);
  });

  test("a replay answered for a command with another name is a contradiction, and the kept name is not overwritten", () => {
    let first = "";
    const lab = started({
      answer(method, _args, answer) {
        const accepted = answer as { readonly ok?: boolean; readonly value?: object };
        return method === "submitInput" && accepted.ok === true && first !== "" ? { ...accepted, value: { ...accepted.value, eventId: first } } : answer;
      },
    });
    lab.apply(acceptCommand("in-1", "x", "k1"));
    first = lastView(lab).queued[1] as string;
    assert.equal(codeOf(() => lab.apply(acceptCommand("in-2", "x", "k2"))), "input_payload");
    clean(lab);
  });

  test("an input entry no answer named fails; it never takes a name from its payload", () => {
    let extra = false;
    const lab = started({
      view: (view) => (extra ? ({ ...view, mailbox: [...view.mailbox, { ...(view.mailbox[0] as object), eventId: "unannounced", payload: { eventId: "looks-named" } }] } as ExecutionView) : view),
    });
    extra = true;
    assert.equal(codeOf(() => lab.apply({ kind: "inspect", executionId: "x" })), "input_unoffered");
    clean(lab);
  });

  test("an inspection that describes another Execution", () => {
    let other = false;
    const lab = started({ view: (view) => (other ? ({ ...view, executionId: `${view.executionId}-other` } as ExecutionView) : view) });
    other = true;
    assert.equal(codeOf(() => lab.apply({ kind: "inspect", executionId: "x" })), "execution");
    clean(lab);
  });

  test("honest neighbours complete: duplicate and replayed answers after the readiness was consumed and after cancellation", () => {
    const lab = started();
    const open = lab.apply(dispatchCommand("x"));
    const outcome = outcomeOf(open, { step: "await", wait: waitDeclaration("g1", 10) });
    const waiting = lab.apply({ kind: "submit_outcome", outcome });
    const fired = fire(lab, "g1", "t1");
    const running = lab.apply(dispatchCommand("x"));
    assert.deepEqual(running.dispatchedBatch, ["t1"], "the readiness was consumed by this reservation");
    assert.deepEqual(fire(lab, "g1", "t1").queued, fired.queued);
    assert.equal(lab.apply({ kind: "resubmit_outcome", outcome }).receipt, waiting.receipt);
    const cancelled = lab.apply({ kind: "accept_cancellation", executionId: "x" });
    assert.equal(cancelled.state, "CANCELLED");
    assert.deepEqual(fire(lab, "g1", "t1"), cancelled);
    assert.equal(lab.apply({ kind: "resubmit_outcome", outcome }).receipt, waiting.receipt);
    clean(lab);
  });

  test("honest neighbours complete: two inputs offered one name both carry it, in one Execution and in two", () => {
    const lab = startLab();
    lab.apply(createCommand("x", "kx"));
    lab.apply(createCommand("y", "ky"));
    lab.apply(acceptCommand("n", "x", "k1"));
    lab.apply(acceptCommand("n", "x", "k2"));
    assert.equal(lab.apply(acceptCommand("n", "x", "k2")).queued.length, 3, "an exact replay of the second input");
    assert.deepEqual(lab.apply(acceptCommand("n", "y", "k1")).queued, ["initial", "n"]);
    clean(lab);
  });
});

describe("K1.4-candidate identity: what a changed ID cannot show (addendum §A2)", () => {
  test("first-exposure control: a timeout whose ID differs from its first appearance on looks the same", () => {
    // The fault replaces the timeout's ID at its first fire, in the answer and in every inspection.
    // No Observation ever showed the honest ID, so the offered name attaches to the other one. The
    // ledger cannot know which opaque ID a correct Kernel would have minted, and it does not derive
    // one. This is the limit of the claim, not a defect it hides: 017 L-39.
    const run = (faulted: boolean): { observations: Observation[]; timeouts: string[] } => {
      let from = "";
      const rename = (id: string): string => (faulted && id === from ? `${id}-other` : id);
      const lab = started({
        answer(method, _args, answer) {
          const fired = answer as { readonly result?: string; readonly timeoutEventId?: string | null };
          if (method !== "fireTimer" || typeof fired.timeoutEventId !== "string") return answer;
          if (fired.result === "expired") from = fired.timeoutEventId;
          return { ...fired, timeoutEventId: rename(fired.timeoutEventId) };
        },
        view: (view) =>
          ({
            ...view,
            mailbox: view.mailbox.map((entry) => ({ ...entry, eventId: rename(entry.eventId) })),
            queued: view.queued.map(rename),
            acknowledged: view.acknowledged.map(rename),
            terminalDispositions: view.terminalDispositions.map(rename),
          }) as ExecutionView,
      });
      const observations = [registerWait(lab, "x", "g1", 10), fire(lab, "g1", "t1"), fire(lab, "g1", "t1"), lab.apply({ kind: "accept_cancellation", executionId: "x" })];
      clean(lab);
      return { observations, timeouts: nativeTimeouts(lab) };
    };
    const honest = run(false);
    const faulted = run(true);
    assert.notDeepEqual(faulted.timeouts, honest.timeouts, "the two runs hold different native timeout IDs");
    assert.deepEqual(faulted.observations, honest.observations, "and their Observations are equal");
  });
});

describe("K1.4-candidate identity: the oracle rejects what it must (addendum §A3)", () => {
  /** One run under a tamper, and the codes of the oracle's problems. */
  const codes = (body: (lab: Lab) => void, tamper?: Tamper, faults?: Faults): string[] => {
    const lab = startLab({ ...(tamper === undefined ? {} : { tamper }), ...(faults === undefined ? {} : { faults }) });
    body(lab);
    return [...new Set(judge(lab).problems.map((problem) => problem.split(":")[0] as string))];
  };
  const attemptAll = (lab: Lab, commands: readonly Command[]): void => {
    for (const command of commands) lab.attempt(command);
  };

  test("an omitted last member of an Event list: shape", () => {
    const body = (lab: Lab): void => attemptAll(lab, [createCommand("x", "kx"), acceptCommand("in-1", "x", "k1")]);
    assert.deepEqual(codes(body), []);
    assert.deepEqual(codes(body, { observation: (observation) => ({ ...observation, queued: observation.queued.slice(0, -1) }) }), ["shape"]);
  });

  test("a reference sent to another Execution: target", () => {
    const body = (lab: Lab): void => attemptAll(lab, [createCommand("x", "kx"), createCommand("y", "ky"), { kind: "inspect", executionId: "x" }]);
    assert.deepEqual(codes(body), []);
    assert.deepEqual(codes(body, { command: (command) => (command.kind === "inspect" ? { ...command, executionId: "y" } : command) }), ["target"]);
  });

  test("a known displayed fresh string refused as unknown: exit", () => {
    const body = (lab: Lab): void => {
      lab.attempt(createCommand("dup", "k1"));
      const second = lab.attempt(createCommand("dup", "k2")).observation as Observation;
      lab.attempt({ kind: "inspect", executionId: second.executionId });
    };
    assert.deepEqual(codes(body), []);
    const refuse = (command: Command): Error | null => (command.kind === "inspect" && command.executionId.startsWith("kernel-") ? new UnknownLaboratoryReference("refused by the tamper") : null);
    assert.deepEqual(codes(body, { refuse }), ["exit"]);
  });

  test("a changed, already-shown ID printed under its old string: relation", () => {
    const body = (lab: Lab): void => {
      lab.attempt(createCommand("x", "kx"));
      registerWait(lab, "x", "g1", 10);
      lab.attempt(timerCommand("x", "g1", "t1"));
      lab.attempt(timerCommand("x", "g1", "t1"));
    };
    const drift = (): Faults => changedEverywhere((id) => `${id}-other`);
    assert.deepEqual(codes(body, undefined, drift()), [], "the candidate itself shows the changed ID under a new string");
    const hide: Tamper = { observation: (observation) => ({ ...observation, queued: observation.queued.map((text) => (text.startsWith("kernel-event:") ? "t1" : text)) }) };
    assert.deepEqual(codes(body, hide, drift()), ["relation"]);
  });

  test("an answer-only contradiction that returns the previous Observation: exit", () => {
    const body = (lab: Lab): void => {
      lab.attempt(createCommand("x", "kx"));
      registerWait(lab, "x", "g1", 10);
      lab.attempt(timerCommand("x", "g1", "t1"));
      lab.attempt(timerCommand("x", "g1", "t1"));
    };
    const fault = (): Faults => answerOnly((id) => `${id}-other`);
    assert.deepEqual(codes(body, undefined, fault()), [], "the candidate itself throws, which is the legal exit");
    assert.deepEqual(codes(body, { recover: (error, previous) => (error instanceof AnswerContradiction ? previous : null) }, fault()), ["exit"]);
  });

  test("the oracle counts what it judged, so an empty or truncated run cannot pass as a full one", () => {
    const lab = started();
    registerWait(lab, "x", "g1", 10);
    fire(lab, "g1", "t1");
    lab.attempt({ kind: "inspect", executionId: "nobody" });
    const { counts, problems } = judge(lab);
    assert.deepEqual(problems, []);
    assert.deepEqual(counts, { commands: 5, observations: 4, unknownReferences: 1, contradictions: 0, pairs: 12, calls: 9, deliveries: 1, reports: 1, unjudged: 0 });
  });
});

describe("K1.4-candidate identity: the oracle joins each command to its calls, answers and reports (designs 04 and 05)", () => {
  const codesOf = (records: readonly StepRecord[]): string[] => judge({ records }).problems.map((problem) => problem.split(":")[0] as string);
  const last = (lab: Lab): StepRecord => lab.records.at(-1) as StepRecord;
  const finalOnly = (record: StepRecord): CallRecord[] => record.calls.filter((call) => call.method !== "inspect");

  // -- Review 03's four oracle probes (oracle-probes.mjs at 3e86a8c0), now rejected ---------------------------

  test("review 03 probe dispatch-x-observe-y: the Observation of another Execution's inspection is inspection", () => {
    const lab = startLab();
    lab.apply(createCommand("x", "kx"));
    lab.apply(createCommand("y", "ky"));
    lab.apply(dispatchCommand("y"));
    const prefix = [...lab.records];
    lab.apply(dispatchCommand("x"));
    const x = last(lab);
    lab.apply({ kind: "inspect", executionId: "y" });
    const y = last(lab);
    const wrong: StepRecord = { ...x, calls: [...finalOnly(x), ...y.calls], view: y.view, observation: y.observation };
    assert.deepEqual(codesOf([...prefix, x]), []);
    assert.deepEqual(codesOf([...prefix, wrong]), ["inspection"]);
  });

  test("review 03 probes wrong-primary-method and extra-cancellation-after-dispatch: call-method and call-extra", () => {
    const lab = startLab();
    lab.apply(createCommand("x", "kx"));
    const prefix = [...lab.records];
    lab.apply(dispatchCommand("x"));
    const dispatched = last(lab);
    lab.apply({ kind: "accept_cancellation", executionId: "x" });
    const cancelled = last(lab);
    assert.deepEqual(codesOf([...prefix, dispatched]), []);
    assert.deepEqual(codesOf([...prefix, { ...cancelled, command: dispatchCommand("x") }]), ["call-method"]);
    const extra: StepRecord = { ...dispatched, calls: [...finalOnly(dispatched), ...cancelled.calls], view: cancelled.view, observation: cancelled.observation };
    assert.deepEqual(codesOf([...prefix, extra]), ["call-extra"]);
  });

  test("review 03 probe extra-cancellation-before-declared-throw: call-extra, before the legal contradiction", () => {
    let inject = false;
    const lab = startLab({ faults: { answer: (method, _args, answer) => (inject && method === "fireTimer" ? { ...(answer as object), timeoutEventId: "absent" } : answer) } });
    lab.apply(createCommand("x", "kx"));
    registerWait(lab, "x", "g", 10);
    lab.apply(timerCommand("x", "g", "t"));
    const prefix = [...lab.records];
    inject = true;
    const contradiction = lab.attempt(timerCommand("x", "g", "t"));
    assert.equal((contradiction.thrown as AnswerContradiction).code, "timeout_generation");
    inject = false;
    lab.apply({ kind: "accept_cancellation", executionId: "x" });
    const cancelled = last(lab);
    const wrong: StepRecord = { ...contradiction, calls: [...contradiction.calls, ...cancelled.calls], view: cancelled.view };
    assert.deepEqual(codesOf([...prefix, contradiction]), []);
    assert.deepEqual(codesOf([...prefix, wrong]), ["call-extra"]);
  });

  // -- Answers decide the exit (design 05 §2) ------------------------------------------------------------------

  test("the swallowed-refusal trace: a refused dispatch with an inspection and an Observation is answer; the accepted dispatch passes", () => {
    const lab = startLab();
    lab.apply(createCommand("x", "kx"));
    lab.apply(dispatchCommand("x"));
    const prefix = [...lab.records];
    const refused = lab.attempt(dispatchCommand("x"));
    assert.equal((refused.calls[0]?.answer as { ok: boolean }).ok, false, "the Kernel refused the second dispatch");
    const inspected = lab.attempt({ kind: "inspect", executionId: "x" });
    const swallowed: StepRecord = { ...refused, calls: [...refused.calls, ...inspected.calls], view: inspected.view, observation: inspected.observation, thrown: undefined };
    assert.deepEqual(codesOf(prefix), [], "the accepted dispatch passes");
    assert.deepEqual(codesOf([...prefix, refused]), ["answer"], "the genuine refusal is a reported failure");
    assert.deepEqual(codesOf([...prefix, swallowed]), ["answer"], "and swallowing it does not make it pass");
    const counts = judge({ records: [...prefix, swallowed] }).counts;
    assert.deepEqual([counts.observations, counts.contradictions], [2, 0], "it adds no Observation and no contradiction");
  });

  test("J-1: an input or Outcome refusal that names another Execution is inspected there and rejected; the genuine refusals pass", () => {
    const run = (kind: "input" | "outcome", redirect: boolean): string[] => {
      let armed = false;
      let other = "";
      const faults: Faults = {
        answer: (method, _args, answer) => {
          const refusal = answer as { readonly ok?: boolean; readonly error?: object };
          if (armed && redirect && (method === "submitInput" || method === "submitOutcome") && refusal.ok === false) return { ...refusal, error: { ...refusal.error, executionId: other } };
          return answer;
        },
      };
      const lab = startLab({ faults });
      lab.apply(createCommand("x", "kx"));
      lab.apply(createCommand("y", "ky"));
      other = lastView(lab).executionId;
      const open = lab.apply(dispatchCommand("x"));
      armed = true;
      if (kind === "input") {
        lab.apply(acceptCommand("a", "x", "ka"));
        lab.attempt(acceptCommand("a-other", "x", "ka"));
      } else {
        lab.attempt({ kind: "submit_outcome", outcome: { ...outcomeOf(open, { step: "continue" }), baseProgressRevision: -1 } });
      }
      assert.equal((last(lab).calls[0]?.answer as { ok: boolean }).ok, false, `${kind}: the Kernel refused`);
      return codesOf(lab.records);
    };
    assert.deepEqual(run("input", false), []);
    assert.deepEqual(run("input", true), ["inspection"]);
    assert.deepEqual(run("outcome", false), []);
    assert.deepEqual(run("outcome", true), ["inspection"]);
  });

  test("after a failed record judgment stops, and the records after it are counted unjudged (design 05 §6)", () => {
    const lab = startLab({ tamper: { observation: (observation) => ({ ...observation, queued: observation.queued.slice(0, -1) }) } });
    lab.attempt(createCommand("x", "kx"));
    lab.attempt(acceptCommand("in-1", "x", "k1"));
    const judged = judge(lab);
    assert.deepEqual(judged.problems.map((problem) => problem.split(":")[0]), ["shape"]);
    assert.deepEqual([judged.counts.commands, judged.counts.unjudged], [1, 1]);
  });

  // -- Settlement reports (design 05 §3, owner choice 06) --------------------------------------------------------

  test("settlement reports, live: missing, extra, wrong method and wrong delivery are rejected; the honest neighbor passes", () => {
    const run = (delivery?: Tamper["delivery"]): string[] => {
      const lab = startLab(delivery === undefined ? {} : { tamper: { delivery } });
      lab.apply(createCommand("x", "kx"));
      lab.attempt(dispatchCommand("x"));
      lab.attempt({ kind: "redeliver_dispatch", executionId: "x" });
      return codesOf(lab.records);
    };
    const quiet: DeliverySettlement = Object.freeze({ delivered(): void {}, failed(): void {} });
    assert.deepEqual(run(), []);
    assert.deepEqual(run((context) => context.forward(context.recording)), [], "forwarding the recording settlement is the default");
    assert.deepEqual(run((context) => context.forward(quiet)), ["report-missing"]);
    assert.deepEqual(
      run((context) => context.forward({ delivered: () => { context.recording.delivered(); context.recording.delivered(); }, failed: context.recording.failed })),
      ["report-extra"],
    );
    assert.deepEqual(run((context) => context.forward({ delivered: () => context.recording.failed("lab"), failed: context.recording.failed })), ["report-method"]);
    assert.deepEqual(run((context) => context.forward(context.number === 2 ? (context.earlier[0] as DeliverySettlement) : context.recording)), ["report-delivery"]);
  });

  test("the recorder keeps entry order: a delivery inside its call, a report inside its delivery", () => {
    const lab = started();
    const record = lab.attempt(dispatchCommand("x"));
    assert.deepEqual(record.trace, [{ kind: "call", index: 0 }, { kind: "delivery", number: 1 }, { kind: "report", index: 0 }, { kind: "call", index: 1 }]);
    assert.deepEqual(record.deliveries.map((delivery) => [delivery.number, delivery.inCall, delivery.executionId === lastView(lab).executionId]), [[1, 0, true]]);
    assert.deepEqual(record.reports, [{ method: "delivered", args: [], owner: 1, during: 1, inCall: 0 }]);
  });

  test("the recorder attributes a reentrant call and an inner delivery that throws, and restores both stacks (addendum 01 §A3)", () => {
    const delivery: Tamper["delivery"] = (context) => {
      if (context.number === 1) {
        const caller = (context.calls[0] as CallRecord).args[0] as AuthenticatedCaller;
        context.coordinator.redeliver(caller, context.activation.executionId);
        context.forward(context.recording);
      } else if (context.number === 2) {
        throw new Error("lab: the Driver throws inside the inner delivery");
      } else context.forward(context.recording);
    };
    const lab = startLab({ tamper: { delivery } });
    lab.apply(createCommand("x", "kx"));
    const record = lab.attempt(dispatchCommand("x"));
    assert.deepEqual(record.calls.map((call) => [call.method, (call.answer as { ok?: boolean }).ok]), [["dispatch", true], ["redeliver", true], ["inspect", true]]);
    assert.deepEqual(record.trace, [
      { kind: "call", index: 0 },
      { kind: "delivery", number: 1 },
      { kind: "call", index: 1 },
      { kind: "delivery", number: 2 },
      { kind: "report", index: 0 },
      { kind: "call", index: 2 },
    ]);
    assert.deepEqual(record.deliveries.map((entry) => [entry.number, entry.inCall]), [[1, 0], [2, 1]]);
    assert.deepEqual(record.reports, [{ method: "delivered", args: [], owner: 1, during: 1, inCall: 0 }], "after the inner delivery's throw, the report is the outer one's");
    assert.deepEqual(codesOf(lab.records), ["call-extra"], "the oracle's verdict is separate: the reentrant redeliver is an extra call");
    // The stacks are empty again for the next command.
    const next = lab.attempt({ kind: "redeliver_dispatch", executionId: "x" });
    assert.deepEqual([next.deliveries.map((entry) => [entry.number, entry.inCall]), next.reports.map((report) => [report.owner, report.during, report.inCall])], [[[3, 0]], [[3, 3, 0]]]);
  });

  test("census: the recorder wraps the coordinator's 13 own methods, and Table 1 uses 11 of them", () => {
    assert.deepEqual([...COORDINATOR_METHODS].sort(), [
      "cancelExecution",
      "createExecution",
      "dispatch",
      "fireTimer",
      "inspect",
      "pendingTimers",
      "recoverExecution",
      "redeliver",
      "reportProtocolFailure",
      "requestTakeover",
      "submitInput",
      "submitOutcome",
      "visibleExecutions",
    ]);
    const used = new Set(Object.values(ROWS).flatMap((row) => row.map((slot) => slot.method)));
    assert.deepEqual([...COORDINATOR_METHODS].filter((method) => !used.has(method)).sort(), ["reportProtocolFailure", "visibleExecutions"]);
    assert.equal(Object.values(ROWS).reduce((total, row) => total + row.length, 0), 26);
  });

  test("structure, a regression guard (012) and not a proof: the candidate constructs one coordinator, from the class it is given", () => {
    const code = readFileSync(join(HERE, "kernel-candidate.ts"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.equal([...code.matchAll(/\bnew\s+Coordinator\s*\(/g)].length, 1);
    assert.match(code, /const Coordinator = options\.Coordinator \?\? ExecutionCoordinator;/);
    assert.equal([...code.matchAll(/\bnew\s+ExecutionCoordinator\b|ExecutionCoordinator\s*\.\s*prototype/g)].length, 0);
  });
});

describe("K1.4-candidate identity: outside the invariant (addendum §A5)", () => {
  test("J-3: a new input under a used name after the end is echoed in ingressRefused, and no Event is added", () => {
    const lab = started();
    lab.apply(acceptCommand("n", "x", "k1"));
    lab.apply({ kind: "accept_cancellation", executionId: "x" });
    const refused = lab.apply(acceptCommand("n", "x", "fresh-key"));
    assert.deepEqual([refused.ingressRefused, refused.terminalDispositions], ["n", ["initial", "n"]]);
    assert.equal(lastView(lab).mailbox.length, 2);
    clean(lab);
  });

  test("J-3: an exact retry of an accepted input after the end is the Kernel's replay, not a refusal", () => {
    const lab = started();
    lab.apply(acceptCommand("n", "x", "k1"));
    const cancelled = lab.apply({ kind: "accept_cancellation", executionId: "x" });
    const retried = lab.apply(acceptCommand("n", "x", "k1"));
    assert.deepEqual(retried, cancelled);
    assert.equal(retried.ingressRefused, null);
    clean(lab);
  });

  test("OQ-2: an await that selects an Event by identity is refused in begin, for both Outcome commands, and in apply", () => {
    const outcome = (kind: "submit_outcome" | "resubmit_outcome"): Command => ({
      kind,
      outcome: {
        executionId: "x",
        activationId: "a",
        writerEpoch: 1,
        baseProgressRevision: 0,
        progress: null,
        emissions: [],
        effects: [],
        next: { step: "await", wait: { dependencies: [{ kinds: ["k"] }, { eventIdentity: "early" }], subscriptions: [], generation: "g" } },
      },
    });
    for (const kind of ["submit_outcome", "resubmit_outcome"] as const) {
      const scenario = { id: "by-identity", title: "", sources: [], k0BoundaryRows: [], isUnsafeControl: false, steps: [{ command: createCommand("x", "kx") }, { command: outcome(kind) }] } as unknown as Scenario;
      const begun = kernelCandidate.begin(scenario, createOperationSink().sink) as CandidateRefusal;
      assert.equal(begun.refused, true);
      assert.match(begun.reason, new RegExp(`step 1 is not supported, because ${kind} declares a dependency alternative that selects an Event by identity`));
      const lab = started();
      assert.throws(() => lab.apply(outcome(kind)), /unsupported command reached apply: .* selects an Event by identity/);
    }
    // An alternative without `eventIdentity` is not refused here: the Kernel decides it.
    const lab = started();
    const open = lab.apply(dispatchCommand("x"));
    const accepted = lab.apply({ kind: "submit_outcome", outcome: outcomeOf(open, { step: "await", wait: { dependencies: [{ kinds: ["k"] }], subscriptions: [], generation: "g" } }) });
    assert.equal(accepted.liveWaitGeneration, "g");
  });

  test("a reference that denotes nothing throws UnknownLaboratoryReference, before any Kernel call", () => {
    const lab = started();
    for (const command of [{ kind: "inspect", executionId: "nobody" }, timerCommand("x", "never", "t"), acceptCommand("e", "nobody", "k")] as Command[]) {
      const record = lab.attempt(command);
      assert.ok(record.thrown instanceof UnknownLaboratoryReference);
      assert.equal(record.calls.length, 0);
    }
    clean(lab);
  });

  test("structure: the fresh spelling is built in one place, and the identity fields come from the ledgers", () => {
    const source = readFileSync(join(HERE, "kernel-candidate.ts"), "utf8");
    const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    assert.equal([...code.matchAll(/kernel-\$\{/g)].length, 1, "one template builds every fresh string");
    assert.match(code, /#freshFor\(id: string\): string \{\s*const base = `kernel-\$\{this\.#family\}:\$\{id\}`;/);
    assert.equal([...code.matchAll(/kernel-(event|execution|generation):/g)].length, 0, "no fresh spelling is written out anywhere else");
    for (const field of ["executionId: executions.assign(view.executionId, null)", "acknowledged: view.acknowledged.map(name)", "queued: view.queued.map(name)", "terminalDispositions: view.terminalDispositions.map(name)", "activation.batch.map(name)", "generationName(view.executionId, view.wait.generation)", "generationName(view.executionId, view.waitEndedReadiness.generation)"]) {
      assert.ok(code.includes(field), `the Observation builds ${field}`);
    }
    // Four in printing (Execution, generation, mailbox entry, a listed ID the mailbox lacks) and five offers
    // (Execution, input Event, generation, the Q2 b label, a fired timeout).
    assert.equal([...code.matchAll(/\.assign\(/g)].length, 9, "every assignment site is one this test's author has read");
  });
});

describe("K1.4-candidate identity: each mechanism mutant fails its witness (addendum §A4)", () => {
  let workspace = "";
  let copies = 0;

  before(() => {
    workspace = mkdtempSync(join(tmpdir(), "k14-candidate-identity-"));
  });
  after(() => {
    if (workspace !== "") rmSync(workspace, { recursive: true, force: true });
  });

  /**
   * Copies the candidate, the lab and the witnesses into a fresh tree, applying the row's edits to the
   * candidate, and runs the registry's probe there. The tree links this checkout's Kernel package, which
   * these edits do not touch. Returns the probe's observation; a probe that crashes throws here.
   */
  function probeOver(mutant: MechanismMutant | null, id: string): { readonly passed: boolean; readonly failures?: readonly string[] } {
    copies += 1;
    const root = join(workspace, `copy-${copies}`);
    mkdirSync(join(root, "tests/conformance/k0"), { recursive: true });
    mkdirSync(join(root, "tests/conformance/k0-candidate"), { recursive: true });
    mkdirSync(join(root, "node_modules/@arrokothi"), { recursive: true });
    symlinkSync(join(REPO_ROOT, "packages"), join(root, "packages"), "dir");
    symlinkSync(join(REPO_ROOT, "packages/kernel"), join(root, "node_modules/@arrokothi/kernel"), "dir");
    for (const name of ["fixture.ts", "operation-sink.ts", "protocol-vocabulary.ts"]) cpSync(join(HERE, "../k0", name), join(root, "tests/conformance/k0", name));
    for (const name of ["canonical-json.ts", "fake-driver.ts", "identity-lab.ts", "identity-witnesses.ts", "identity-mutants.ts", "identity-probe.mjs"]) {
      cpSync(join(HERE, name), join(root, "tests/conformance/k0-candidate", name));
    }
    let text = readFileSync(join(HERE, "kernel-candidate.ts"), "utf8");
    for (const edit of mutant?.edits ?? []) {
      assert.equal(text.split(edit.anchor).length - 1, 1, `${mutant?.id}: the anchor occurs exactly once: ${edit.anchor.slice(0, 60)}`);
      text = text.replace(edit.anchor, () => edit.edit);
    }
    writeFileSync(join(root, "tests/conformance/k0-candidate/kernel-candidate.ts"), text);
    let printed: string;
    try {
      printed = execFileSync(process.execPath, ["--no-warnings", "--experimental-strip-types", PROBE, id], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      const failed = error as { readonly status?: number; readonly stdout?: string; readonly stderr?: string };
      // Exit 17 is the probe's "a named assertion failed". Anything else is a crash: an invalid run.
      assert.equal(failed.status, 17, `the probe crashed: ${failed.stderr ?? ""}`);
      printed = failed.stdout ?? "";
    }
    const observation = JSON.parse(printed) as { readonly case: string; readonly reached: boolean; readonly passed: boolean; readonly failures?: readonly string[] };
    assert.equal(observation.case, `k14-candidate.identity-${id.toLowerCase()}`);
    assert.equal(observation.reached, true);
    return observation;
  }

  test("an unedited copy passes every witness", () => {
    for (const mutant of MUTANTS) assert.deepEqual(probeOver(null, mutant.id), { case: `k14-candidate.identity-${mutant.id.toLowerCase()}`, assertion: `k14-candidate.identity-${mutant.id.toLowerCase()}.killed`, reached: true, passed: true });
  });

  for (const mutant of MUTANTS) {
    test(`${mutant.id}: without "${mutant.obligation}", its witness fails by a named assertion`, () => {
      const observation = probeOver(mutant, mutant.id);
      assert.equal(observation.passed, false, `${mutant.id} must be seen`);
      const failures = observation.failures ?? [];
      assert.ok(failures.some((failure) => mutant.rejects.test(failure)), `${mutant.id}: the witness names the assertion the row expects: ${JSON.stringify(failures)}`);
    });
  }

  // -- The registry runs the same rows (owner choice 04; D03-CHK-04) ---------------------------------------

  test("the mutation registry holds exactly these seven rows, each with its row's edits and rejecting test", () => {
    interface RegistryCase {
      readonly id: string;
      readonly category?: string;
      readonly assertion: string;
      readonly argv?: readonly string[];
      readonly files: readonly string[];
      readonly failure_exit?: number;
      readonly input: Record<string, unknown>;
      readonly claim?: { readonly kind: string; readonly owner: string };
      readonly mutants: readonly { readonly path?: string; readonly before?: string; readonly after?: string; readonly edits?: readonly { readonly path: string; readonly before: string; readonly after: string }[]; readonly obligation?: string }[];
    }
    const cases = (JSON.parse(readFileSync(join(REPO_ROOT, REGISTRY), "utf8")) as { cases: RegistryCase[] }).cases.filter((entry) => entry.id.startsWith("k14-candidate.identity-"));
    const caseId = (mutant: MechanismMutant): string => `k14-candidate.identity-${mutant.id.toLowerCase()}`;
    assert.deepEqual(cases.map((entry) => entry.id), MUTANTS.map(caseId));
    for (const [index, mutant] of MUTANTS.entries()) {
      const entry = cases[index] as RegistryCase;
      assert.equal(entry.category, "k14-candidate-identity");
      assert.equal(entry.assertion, `${caseId(mutant)}.killed`);
      assert.deepEqual(entry.argv, ["node", "--no-warnings", "--experimental-strip-types", PROBE, mutant.id, "--link-workspace-kernel"]);
      assert.equal(entry.failure_exit, 17);
      assert.equal(entry.mutants.length, 1);
      const registered = entry.mutants[0] as RegistryCase["mutants"][number];
      const edits = registered.edits ?? [{ path: registered.path as string, before: registered.before as string, after: registered.after as string }];
      assert.deepEqual(edits, mutant.edits.map((edit) => ({ path: MUTANT_FILE, before: edit.anchor, after: edit.edit })), `${mutant.id}: the registered mutant is the row's edits`);
      assert.equal(registered.obligation, mutant.obligation);
      assert.deepEqual(entry.input, {
        row: mutant.id,
        site: MUTANT_FILE,
        obligation: mutant.obligation,
        witness: `tests/conformance/k0-candidate/identity-witnesses.ts > WITNESSES.${mutant.id}`,
        rejects: mutant.rejects.source,
        rejecting_test: `tests/conformance/k0-candidate/identity.test.ts > K1.4-candidate identity: each mechanism mutant fails its witness (addendum §A4) > ${mutant.id}: without "${mutant.obligation}", its witness fails by a named assertion`,
      });
      assert.deepEqual([entry.claim?.kind, entry.claim?.owner], ["mechanism_witness", "K1.4-candidate"]);
      for (const name of [MUTANT_FILE, PROBE, "packages/kernel/package.json", "tests/conformance/k0/fixture.ts", "tests/conformance/k0/operation-sink.ts"]) assert.ok(entry.files.includes(name), `${mutant.id}: the case lists ${name}`);
      for (const name of ["canonical-json.ts", "fake-driver.ts", "identity-lab.ts", "identity-mutants.ts", "identity-witnesses.ts"]) assert.ok(entry.files.includes(`tests/conformance/k0-candidate/${name}`), `${mutant.id}: the case lists ${name}`);
    }
    const coverage = JSON.parse(readFileSync(join(REPO_ROOT, COVERAGE), "utf8")) as { negative_categories: string[]; families: { id: string; cases: { case: string }[] }[] };
    assert.ok(coverage.negative_categories.includes("k14-candidate-identity"));
    assert.deepEqual(coverage.families.find((family) => family.id === "k14-candidate-identity")?.cases.map((entry) => entry.case), MUTANTS.map(caseId));
  });

  test("the probe refuses a row it does not know", () => {
    assert.throws(
      () => execFileSync(process.execPath, ["--no-warnings", "--experimental-strip-types", PROBE, "M0"], { cwd: REPO_ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }),
      (error: { status?: number; stderr?: string }) => error.status === 1 && /Unknown identity row/.test(error.stderr ?? ""),
    );
  });
});
