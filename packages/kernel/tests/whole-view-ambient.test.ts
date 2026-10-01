/**
 * Review 10's 30 whole-view comparisons, maintained (correction DEC-8/DEC-9, amendment 03).
 *
 * Review 10 (K1.2-correction-01) compared complete observable views across six recovery transitions,
 * each run five ways: with no ambient state, and with an inherited `resultingEpoch` installed on
 * `Object.prototype` during the request's own observation as data, as a mutable caller-owned object,
 * as a throwing accessor and as a reentrant accessor that submits a valid terminal Outcome. A queued
 * input outside the reserved batch is present in every run. The assertions below are the review's,
 * unchanged (`docs/development/work/K1.2-correction-01/review-10/probe-whole-view.mjs`); only the
 * sealed probe's output file is not written.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator, type ExecutionView } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, submissionFor } from "./harness.ts";

const who = caller("review10", "tenant-a");
const available = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
const missing = { ...available, definitionRevisions: [] as string[] };

const TRANSITIONS = ["protocol-enter", "code-enter", "code-update", "code-clear", "takeover-clear", "outcome-end"] as const;
const MODES = ["control", "data", "mutable", "throw", "reenter"] as const;
type Transition = (typeof TRANSITIONS)[number];
type Mode = (typeof MODES)[number];

interface Observation {
  readonly before: ExecutionView;
  readonly answer: unknown;
  readonly after: ExecutionView;
}

function compare(transition: Transition, mode: Mode): { observation: Observation; reads: number; nested: number } {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const executionId = accepted(kernel.createExecution(who, createRequest({ creationKey: transition }))).executionId;
  const open = accepted(kernel.dispatch(who, executionId, { bound: 1 }));
  const grant = submissionFor(driver, open.activationId);
  accepted(kernel.submitInput(who, { destination: executionId, requestKey: "outside-batch", kind: "update", payload: { newer: true } }));
  const code = (av: typeof available) => kernel.recoverExecution(who, executionId, { activationId: open.activationId, available: av });
  if (transition === "code-update" || transition === "code-clear") accepted(code(missing));
  if (transition === "takeover-clear" || transition === "outcome-end") {
    accepted(kernel.reportProtocolFailure(who, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "initial" }));
  }
  const before = accepted(kernel.inspect(who, executionId));
  const complete = outcomeFor(executionId, open, { next: { step: "complete", result: { done: true } }, emissions: [{ emissionKey: "e", value: { output: true } }] });
  let reads = 0;
  let nested = 0;
  const foreign = { epoch: 777 };
  const saved = Object.getOwnPropertyDescriptor(Object.prototype, "resultingEpoch");
  const install = (): void => {
    if (mode === "control") return;
    const descriptor = Object.create(null) as PropertyDescriptor;
    descriptor.configurable = true;
    if (mode === "data" || mode === "mutable") descriptor.value = mode === "data" ? 777 : foreign;
    else {
      descriptor.get = () => {
        reads++;
        if (mode === "throw") throw Error("review10 inherited read");
        delete (Object.prototype as Record<string, unknown>).resultingEpoch;
        nested++;
        return kernel.submitOutcome(who, complete, grant);
      };
    }
    Object.defineProperty(Object.prototype, "resultingEpoch", descriptor);
  };
  const request = {
    get activationId() {
      install();
      return open.activationId;
    },
    writerEpoch: 1,
    diagnostic: "unclassifiable",
    available: transition === "code-clear" ? available : transition === "code-update" ? { ...available, progressCodecs: [] as string[] } : missing,
  };
  let answer: { ok: boolean };
  try {
    if (transition === "protocol-enter") answer = kernel.reportProtocolFailure(who, executionId, request);
    else if (transition === "takeover-clear") answer = kernel.requestTakeover(who, executionId, request);
    else if (transition === "outcome-end") {
      Object.defineProperty(complete, "activationId", {
        get() {
          install();
          return open.activationId;
        },
        configurable: true,
      });
      answer = kernel.submitOutcome(who, complete, grant);
    } else answer = kernel.recoverExecution(who, executionId, request);
    assert.equal(answer.ok, true);
  } finally {
    if (saved) Object.defineProperty(Object.prototype, "resultingEpoch", saved);
    else delete (Object.prototype as Record<string, unknown>).resultingEpoch;
  }
  const after = accepted(kernel.inspect(who, executionId));
  foreign.epoch = 999;
  assert.deepEqual(accepted(kernel.inspect(who, executionId)), after, "a foreign mutation changes no retained/projection field");
  assert.equal(reads, 0);
  assert.equal(nested, 0);
  assert.equal(after.recoveryHistory.length, before.recoveryHistory.length + 1);
  assert.equal(after.progressRevision, transition === "outcome-end" ? 1 : 0);
  assert.equal(after.state, transition === "outcome-end" ? "COMPLETED" : "RUNNING");
  assert.equal(after.receipts.length, before.receipts.length + (transition === "takeover-clear" || transition === "outcome-end" ? 1 : 0));
  if (transition === "outcome-end") {
    assert.equal(after.acknowledged.length, 1);
    assert.equal(after.terminalDispositions.length, 1);
    assert.equal(after.emissions.length, 1);
  } else {
    assert.deepEqual(after.mailbox, before.mailbox);
    assert.deepEqual(after.emissions, before.emissions);
    assert.deepEqual(after.result, before.result);
    assert.equal(after.activation?.writerEpoch, transition === "takeover-clear" ? 2 : 1);
  }
  return { observation: { before, answer, after }, reads, nested };
}

describe("review 10: whole views under an inherited resultingEpoch equal the view without it", () => {
  let comparisons = 0;
  for (const transition of TRANSITIONS) {
    let control: Observation | undefined;
    for (const mode of MODES) {
      comparisons += 1;
      test(`${transition} / ${mode}`, () => {
        const { observation } = compare(transition, mode);
        if (mode === "control") control = observation;
        else assert.deepEqual(observation, control, "pollution must change no answer or field of either whole view");
      });
    }
  }
  test("the comparison set is review 10's 30", () => {
    assert.equal(comparisons, 30);
  });
});
