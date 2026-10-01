/**
 * K12C1-R9-HISTORY-01: recovery-control decisions and their history under ambient pollution.
 *
 * Review 09 (K1.2-correction-01) showed that recovery history was built from an options object whose
 * optional `resultingEpoch` field the Kernel read back after changing the hold. An own getter on an
 * authorized control request could install that field on `Object.prototype` during permitted
 * envelope observation, and the read then retained an invented number or a caller-owned object,
 * ran a throwing accessor after the hold had changed, or ran a reentrant Outcome between the hold
 * change and its history record. These cases keep the review's 22-case matrix, its mutable foreign
 * reference and both safe clear paths as maintained oracles (amendment 02, contract revision 7).
 *
 * The expected facts are derived from `state.md` (recovery decisions are Execution History),
 * `evidence.md` (authenticated recorded commands; immutable retained evidence), K1.2-DEC-18 and
 * C13 (no prototype consulted after the first caller observation), never from the implementation.
 */

import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ExecutionCoordinator, type ExecutionView, type OutcomeEnvelope, type RecoveryHistoryRecord } from "../src/index.ts";
import { accepted, caller, createRequest, outcomeFor, recordingDriver, submissionFor } from "./harness.ts";

const author = caller("reviewer", "tenant-a");
const AVAILABLE = {
  definitionRevisions: ["weekly-report@3"],
  runtimeContractRevisions: ["runtime-contract@1"],
  progressCodecs: ["inline-json@1"],
};
const MISSING_DEFINITION = { ...AVAILABLE, definitionRevisions: [] as string[] };
const MISSING_CODEC = { ...AVAILABLE, progressCodecs: [] as string[] };

type Transition = "protocol-enter" | "code-enter" | "code-update" | "code-clear" | "takeover-clear" | "outcome-end";
type Mode = "control" | "data" | "throw" | "reenter";

/** The exact own keys of a history record without a resulting epoch, in retained order. */
const HOLD_KEYS = ["activationId", "writerEpoch", "cause", "transition", "reason", "authority", "actorNamespace", "actorScope"];
/** The exact own keys of an `ended_by_outcome` record, which K1.2-DEC-18/DEC-10 prebuilt in this order. */
const OUTCOME_KEYS = ["activationId", "writerEpoch", "cause", "transition", "authority", "reason", "actorNamespace", "actorScope"];

const PROTOCOL_REASON = (diagnostic: string): string =>
  `the response of the attempt at writer epoch 1 could not be classified as an Outcome: ${diagnostic}`;

interface Expected {
  readonly keys: readonly string[];
  readonly record: Omit<RecoveryHistoryRecord, "activationId">;
  readonly state: ExecutionView["state"];
  readonly holds: readonly string[];
  readonly writerEpoch: number | null;
}

/** What each transition must leave behind, independent of any pollution (review 09's control arm). */
const EXPECTED: Record<Transition, Expected> = {
  "protocol-enter": {
    keys: HOLD_KEYS,
    record: { writerEpoch: 1, cause: "protocol_failure", transition: "entered", reason: PROTOCOL_REASON("unclassifiable"), authority: "control", actorNamespace: "reviewer", actorScope: "tenant-a" },
    state: "RUNNING",
    holds: ["protocol_failure"],
    writerEpoch: 1,
  },
  "code-enter": {
    keys: HOLD_KEYS,
    record: { writerEpoch: 1, cause: "pinned_code_unavailable", transition: "entered", reason: "pinned Definition revision weekly-report@3 is unavailable", authority: "control", actorNamespace: "reviewer", actorScope: "tenant-a" },
    state: "RUNNING",
    holds: ["pinned_code_unavailable"],
    writerEpoch: 1,
  },
  "code-update": {
    keys: HOLD_KEYS,
    record: { writerEpoch: 1, cause: "pinned_code_unavailable", transition: "updated", reason: "pinned progress codec inline-json@1 is unavailable", authority: "control", actorNamespace: "reviewer", actorScope: "tenant-a" },
    state: "RUNNING",
    holds: ["pinned_code_unavailable"],
    writerEpoch: 1,
  },
  "code-clear": {
    keys: HOLD_KEYS,
    record: {
      writerEpoch: 1,
      cause: "pinned_code_unavailable",
      transition: "cleared_by_declaration",
      reason: "compatible code declared available; cleared hold that had reported: pinned Definition revision weekly-report@3 is unavailable",
      authority: "control",
      actorNamespace: "reviewer",
      actorScope: "tenant-a",
    },
    state: "RUNNING",
    holds: [],
    writerEpoch: 1,
  },
  "takeover-clear": {
    keys: [...HOLD_KEYS, "resultingEpoch"],
    record: {
      writerEpoch: 1,
      cause: "protocol_failure",
      transition: "cleared_by_takeover",
      reason: `takeover to writer epoch 2 cleared the protocol-failure hold: ${PROTOCOL_REASON("initial")}`,
      authority: "control",
      actorNamespace: "reviewer",
      actorScope: "tenant-a",
      resultingEpoch: 2,
    },
    state: "RUNNING",
    holds: [],
    writerEpoch: 2,
  },
  "outcome-end": {
    keys: OUTCOME_KEYS,
    record: {
      writerEpoch: 1,
      cause: "protocol_failure",
      transition: "ended_by_outcome",
      authority: "attempt_submission",
      reason: `accepted Outcome at writer epoch 1 resolved the exchange and ended the protocol-failure hold that had reported: ${PROTOCOL_REASON("initial")}`,
      actorNamespace: "reviewer",
      actorScope: "tenant-a",
    },
    state: "COMPLETED",
    holds: [],
    writerEpoch: null,
  },
};

interface Row {
  readonly thrown: unknown;
  readonly answer: { ok: boolean; value?: unknown; error?: unknown } | undefined;
  readonly before: ExecutionView;
  readonly after: ExecutionView;
  readonly activationId: string;
}

interface Hooks {
  /** Runs inside the observed `activationId` getter: permitted caller code during observation. */
  readonly duringObservation?: (kernel: ExecutionCoordinator, retry: () => unknown) => void;
  /** Runs immediately before the control call: residue left behind by an earlier observation. */
  readonly beforeCall?: () => void;
  /** Always runs after the call, whatever happened. */
  readonly cleanup: () => void;
}

/**
 * Drives one transition on a fresh coordinator. The pollution comes from the control request's own
 * `activationId` getter (or the Outcome envelope's), exactly as review 09 installed it, or is left in
 * place beforehand as residue. The caller's cleanup always runs.
 */
function drive(transition: Transition, label: string, hooks: Hooks): Row {
  const driver = recordingDriver();
  const kernel = new ExecutionCoordinator({ driver });
  const { executionId } = accepted(kernel.createExecution(author, createRequest({ creationKey: `${transition}/${label}` })));
  const open = accepted(kernel.dispatch(author, executionId, { bound: 1 }));
  if (transition === "code-update" || transition === "code-clear") {
    accepted(kernel.recoverExecution(author, executionId, { activationId: open.activationId, available: MISSING_DEFINITION }));
  }
  if (transition === "takeover-clear" || transition === "outcome-end") {
    accepted(kernel.reportProtocolFailure(author, executionId, { activationId: open.activationId, writerEpoch: 1, diagnostic: "initial" }));
  }
  const before = accepted(kernel.inspect(author, executionId));
  const grant = submissionFor(driver, open.activationId);
  const valid: OutcomeEnvelope = outcomeFor(executionId, open, { next: { step: "complete", result: { done: true } } });
  // The review's reentrant arm: a valid terminal Outcome from the current attempt.
  const retry = (): unknown => kernel.submitOutcome(author, valid, grant);
  const observe = (): string => {
    hooks.duringObservation?.(kernel, retry);
    return open.activationId;
  };
  const available = transition === "code-clear" ? AVAILABLE : transition === "code-update" ? MISSING_CODEC : MISSING_DEFINITION;
  const request = {
    get activationId(): string {
      return observe();
    },
    writerEpoch: 1,
    diagnostic: "unclassifiable",
    available,
  };
  let answer: Row["answer"];
  let thrown: unknown;
  try {
    hooks.beforeCall?.();
    if (transition === "protocol-enter") answer = kernel.reportProtocolFailure(author, executionId, request);
    else if (transition === "takeover-clear") answer = kernel.requestTakeover(author, executionId, request);
    else if (transition === "outcome-end") {
      Object.defineProperty(valid, "activationId", { get: observe, configurable: true, enumerable: true });
      answer = kernel.submitOutcome(author, valid, grant);
    } else answer = kernel.recoverExecution(author, executionId, request);
  } catch (error) {
    thrown = error;
  } finally {
    hooks.cleanup();
  }
  const after = accepted(kernel.inspect(author, executionId));
  return { thrown, answer, before, after, activationId: open.activationId };
}

/** Review 09's four arms over the inherited `resultingEpoch`: none, data, throwing and reentrant. */
function runCase(transition: Transition, mode: Mode, value: unknown = 777): Row & { readonly reads: number; readonly nested: unknown } {
  let reads = 0;
  let nested: unknown;
  const remove = (): void => {
    delete (Object.prototype as Record<string, unknown>)["resultingEpoch"];
  };
  const row = drive(transition, mode, {
    duringObservation: (_kernel, retry) => {
      if (mode === "control") return;
      const descriptor = Object.create(null) as PropertyDescriptor;
      descriptor.configurable = true;
      if (mode === "data") descriptor.value = value;
      else {
        descriptor.get = (): unknown => {
          reads += 1;
          if (mode === "throw") throw new Error("ambient history callback");
          remove();
          nested = retry();
          return undefined;
        };
      }
      Object.defineProperty(Object.prototype, "resultingEpoch", descriptor);
    },
    cleanup: remove,
  });
  return { ...row, reads, nested };
}

/** The whole-result oracle every row must meet, whatever the pollution tried to do. */
function assertIntended(transition: Transition, row: Row & { readonly reads?: number; readonly nested?: unknown }): void {
  const expected = EXPECTED[transition];
  assert.equal(row.thrown, undefined, "no exception escapes the boundary");
  assert.equal(row.reads ?? 0, 0, "no Kernel read reached the inherited accessor");
  assert.equal(row.nested, undefined, "no caller code ran inside the decision");
  assert.equal(row.answer?.ok, true, "the decision is accepted as in the control arm");
  const added = row.after.recoveryHistory.slice(row.before.recoveryHistory.length);
  assert.equal(added.length, 1, "exactly one history record for the one decision");
  const record = added[0] as RecoveryHistoryRecord;
  assert.ok(Object.isFrozen(record), "retained history is frozen");
  assert.deepEqual(Reflect.ownKeys(record), expected.keys, "the record owns exactly its declared fields");
  assert.deepStrictEqual({ ...record }, { activationId: row.activationId, ...expected.record });
  assert.deepEqual(row.before.recoveryHistory, row.after.recoveryHistory.slice(0, row.before.recoveryHistory.length), "earlier history is unchanged");
  assert.equal(row.after.state, expected.state);
  assert.deepEqual(row.after.recoveryHolds.map((hold) => hold.cause), expected.holds);
  assert.equal(row.after.activation?.writerEpoch ?? null, expected.writerEpoch);
  if (transition !== "outcome-end" && transition !== "takeover-clear") {
    const answer = row.answer as { ok: true; value: { recoveryHolds: unknown; changed: boolean } };
    assert.equal(answer.value.changed, true);
    assert.deepEqual(answer.value.recoveryHolds, row.after.recoveryHolds, "the answer describes the committed holds");
  }
  // Causal order: every record names this exchange and the history reads oldest first.
  for (const entry of row.after.recoveryHistory) assert.equal(entry.activationId, row.activationId);
  if (transition === "outcome-end" || transition === "takeover-clear") {
    assert.deepEqual(row.after.recoveryHistory.map((entry) => entry.transition), ["entered", expected.record.transition]);
  }
}

const TRANSITIONS: readonly Transition[] = ["protocol-enter", "code-enter", "code-update", "code-clear", "takeover-clear", "outcome-end"];
const MODES: readonly Mode[] = ["control", "data", "throw", "reenter"];

describe("K12C1-R9-HISTORY-01 review-09 matrix: inherited resultingEpoch during control observation", () => {
  let cases = 0;
  for (const transition of TRANSITIONS) {
    for (const mode of MODES) {
      // The review ran no reentrant arm for the two clears that already owned their fields.
      if (mode === "reenter" && (transition === "takeover-clear" || transition === "outcome-end")) continue;
      cases += 1;
      test(`${transition} / ${mode}`, () => {
        assertIntended(transition, runCase(transition, mode));
      });
    }
  }
  test("the matrix is review 09's 22 cases", () => {
    assert.equal(cases, 22);
  });
});

describe("K12C1-R9-HISTORY-01 retained evidence holds no caller object", () => {
  for (const transition of TRANSITIONS) {
    test(`${transition}: an inherited caller object never enters, and later mutation changes nothing`, () => {
      const foreign = { value: 777 };
      const row = runCase(transition, "data", foreign);
      assertIntended(transition, row);
      const snapshot = JSON.stringify(row.after);
      foreign.value = 888;
      assert.equal(JSON.stringify(row.after), snapshot, "caller mutation after return changes no retained evidence");
      for (const entry of row.after.recoveryHistory) {
        assert.notEqual(Object.getOwnPropertyDescriptor(entry, "resultingEpoch")?.value, foreign);
      }
    });
  }
});

describe("K12C1-R9-HISTORY-01 both safe clear paths keep their own fields under pollution", () => {
  test("takeover clear owns resultingEpoch = the new epoch, not the inherited 777", () => {
    const row = runCase("takeover-clear", "data");
    assertIntended("takeover-clear", row);
    const record = row.after.recoveryHistory[1] as RecoveryHistoryRecord;
    assert.equal(Object.getOwnPropertyDescriptor(record, "resultingEpoch")?.value, 2);
    assert.equal(row.after.activation?.writerEpoch, 2);
  });
  test("Outcome end owns no resultingEpoch at all, even while one is inherited", () => {
    const row = runCase("outcome-end", "data");
    assertIntended("outcome-end", row);
    const record = row.after.recoveryHistory[1] as RecoveryHistoryRecord;
    assert.equal(Object.hasOwn(record, "resultingEpoch"), false);
  });
});

/**
 * Every field name a history record, a hold, a planned control decision or the answer carries,
 * installed as a counting inherited accessor on `Object.prototype`. A Kernel record that owns all
 * its fields is never answered by any of them, so the count stays at zero on every path.
 */
const RECORD_FIELD_NAMES = [
  "activationId",
  "writerEpoch",
  "cause",
  "transition",
  "reason",
  "authority",
  "actorNamespace",
  "actorScope",
  "resultingEpoch",
  "codeHold",
  "protocolFailureHold",
  "history",
  "recoveryHolds",
  "changed",
  "permittedNextActions",
];

describe("K12C1-R9-HISTORY-01 no record field name is answered by Object.prototype", () => {
  for (const transition of TRANSITIONS) {
    for (const timing of ["during observation", "left behind as residue"] as const) {
      test(`${transition}: counting inherited accessors ${timing}`, () => {
        const saved = RECORD_FIELD_NAMES.map((name) => [name, Object.getOwnPropertyDescriptor(Object.prototype, name)] as const);
        let reads = 0;
        const installAll = (): void => {
          for (const name of RECORD_FIELD_NAMES) {
            const descriptor = Object.create(null) as PropertyDescriptor;
            descriptor.configurable = true;
            descriptor.get = (): unknown => {
              reads += 1;
              return 999;
            };
            Object.defineProperty(Object.prototype, name, descriptor);
          }
        };
        const removeAll = (): void => {
          for (const [name, descriptor] of saved) {
            if (descriptor === undefined) delete (Object.prototype as Record<string, unknown>)[name];
            else Object.defineProperty(Object.prototype, name, descriptor);
          }
        };
        let installed = false;
        const row = drive(transition, `every-field/${timing}`, {
          ...(timing === "during observation"
            ? { duringObservation: () => {
                if (!installed) installAll();
                installed = true;
              } }
            : { beforeCall: () => {
                installAll();
                installed = true;
              } }),
          cleanup: removeAll,
        });
        assert.ok(installed, "the pollution was really installed");
        assert.equal(reads, 0, "no Kernel read reached any inherited record field");
        assertIntended(transition, row);
      });
    }
  }
});
