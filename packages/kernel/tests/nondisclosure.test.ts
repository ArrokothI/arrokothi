/**
 * K11-R12-ID-01 - scoped non-disclosure across the complete accepted-evidence path.
 *
 * Canonical owners: `mental-model/concepts/identity.md` ("an acceptance position orders accepted
 * facts within the owning record/domain; it is not a global clock"; "refusal shape/timing must
 * not distinguish another principal's hidden record from a missing one") and
 * `mental-model/mechanisms/evidence.md` ("order is per accepting domain"; "scope both field
 * visibility and existence disclosure to what the principal is authorized to see").
 *
 * The defect class: any externally observable value that is a function of decisions taken in
 * authority scopes the observer cannot reach. A previous revision kept one coordinator-wide
 * acceptance counter incremented by every accepted boundary and every refusal, exposed it as
 * `Receipt.position`, embedded it in `Receipt.token`, and minted `execution-N` / `event-N`
 * identities off shared counters — so caller A could count hidden caller B's activity from A's
 * own authorized receipts, tokens, positions, identifiers, replay results and inspection.
 *
 * The oracle below is a pair of indistinguishable A schedules. Both arms run the same A
 * operations with the same arguments in the same order on fresh coordinators; only one arm
 * interposes B-only activity in a scope A cannot observe. Every A-observable value must compare
 * equal across arms. This detects the class — any shared cross-scope sequence, counter, clock
 * or identifier — not one historical token spelling. Absolute values are asserted only for
 * per-Execution contiguity (creation is 1, the next acceptance on that Execution is 2, ...),
 * which hidden activity must never shift.
 *
 * What is deliberately outside this oracle: the shared Driver's delivery log is host-observable
 * infrastructure, not caller evidence, so it is not compared. Timing is not compared either;
 * `identity.md` normalizes application-level lookup work, not hash-table or string-compare
 * timing, and `visibleExecutions` documents linear-in-corpus listing work.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ExecutionCoordinator } from "../src/index.ts";
import { accepted, caller, createRequest, recordingDriver, refused } from "./harness.ts";

const scopeA = "tenant-a";
const scopeB = "tenant-b";
const authorA = caller("app-a", scopeA);
const authorB = caller("app-b", scopeB);
/** Same producer namespace as A, but holding only the hidden scope: shares key text, never state. */
const authorBinAClothing = caller("app-a", scopeB);

const kernel = (): ExecutionCoordinator => new ExecutionCoordinator({ driver: recordingDriver() });

const bCreate = (creationKey: string) =>
  createRequest({
    creationKey,
    scope: scopeB,
    authorityContext: { tenant: "b" },
    initialInput: { kind: "application.request", payload: { text: `hidden ${creationKey}` } },
  });

/** Same key as `bCreate`, different content: a genuine duplicate_conflict, not a replay. */
const bConflict = (creationKey: string) =>
  createRequest({
    creationKey,
    scope: scopeB,
    authorityContext: { tenant: "b" },
    initialInput: { kind: "application.request", payload: { text: `changed ${creationKey}` } },
  });

/** The fixed A schedule. Hidden windows run at the marked points and must change nothing below. */
interface ArmTranscript {
  create: unknown;
  createReplay: unknown;
  input: unknown;
  inputReplay: unknown;
  conflict: unknown;
  dispatch: unknown;
  redeliver: unknown;
  view: unknown;
  visible: readonly string[];
  serialized: string[];
}

function runArm(hidden: (kernel: ExecutionCoordinator, hiddenExecutions: string[], round: number) => void): ArmTranscript {
  const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
  const hiddenExecutions: string[] = [];

  const create = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-report" })));
  const createReplay = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-report" })));

  hidden(kernel, hiddenExecutions, 0);

  const input = accepted(
    kernel.submitInput(authorA, { destination: create.executionId, requestKey: "a-fix", kind: "k", payload: { a: 1 } }),
  );
  const inputReplay = accepted(
    kernel.submitInput(authorA, { destination: create.executionId, requestKey: "a-fix", kind: "k", payload: { a: 1 } }),
  );
  const conflict = refused(
    kernel.submitInput(authorA, { destination: create.executionId, requestKey: "a-fix", kind: "k", payload: { a: 2 } }),
  );

  hidden(kernel, hiddenExecutions, 1);

  const dispatch = accepted(kernel.dispatch(authorA, create.executionId, { bound: 2 }));
  const redeliver = accepted(kernel.redeliver(authorA, create.executionId));

  // The hidden setup is only a valid oracle arm if B stayed hidden throughout: A must be
  // unable to see any of B's Executions, exactly as it cannot see a missing one.
  for (const hiddenId of hiddenExecutions) {
    const probe = refused(kernel.inspect(authorA, hiddenId));
    assert.equal(probe.classification, "unknown_destination");
    assert.equal(probe.executionId, null);
  }
  const visible = kernel.visibleExecutions(authorA);
  for (const hiddenId of hiddenExecutions) {
    assert.ok(!visible.includes(hiddenId), "B's Executions never appear in A's listing");
  }

  const view = accepted(kernel.inspect(authorA, create.executionId));
  const serialized = [
    JSON.stringify(create),
    JSON.stringify(createReplay),
    JSON.stringify(input),
    JSON.stringify(inputReplay),
    JSON.stringify(dispatch),
    JSON.stringify(redeliver),
    JSON.stringify(conflict),
    JSON.stringify(view),
    JSON.stringify(visible),
  ];
  return { create, createReplay, input, inputReplay, conflict, dispatch, redeliver, view, visible, serialized };
}

/** The invariant itself: identical A schedules observe identical A evidence. */
function assertIndistinguishable(first: ArmTranscript, second: ArmTranscript): void {
  assert.deepEqual(second, first, "A's observable evidence must not reveal hidden B activity");
}

/** Per-Execution contiguity: authorized ordering survives inside the owning record. */
function assertOwnOrder(transcript: ArmTranscript): void {
  const created = transcript.create as { receipt: { boundary: string; position: number; token: string } };
  const input = transcript.input as { receipt: { position: number }; acceptancePosition: number };
  const dispatch = transcript.dispatch as { receipt: { position: number } };
  const view = transcript.view as {
    receipts: { position: number }[];
    mailbox: { acceptancePosition: number }[];
    refusals: { position: number }[];
  };
  const conflict = transcript.conflict as { classification: string; position: number; executionId: string | null };

  assert.equal(created.receipt.boundary, "creation");
  assert.equal(created.receipt.position, 1, "creation is its Execution's first acceptance");
  assert.equal(input.receipt.position, 2, "the next acceptance on that Execution is 2");
  assert.equal(input.acceptancePosition, 2, "the mailbox entry shares its decision's number");
  assert.equal(dispatch.receipt.position, 3, "dispatch intent consumes the next number on that Execution");
  assert.deepEqual(
    view.receipts.map((receipt) => receipt.position),
    [1, 2, 3],
    "inspection reports the Execution's own acceptance order",
  );
  assert.deepEqual(
    view.mailbox.map((entry) => entry.acceptancePosition),
    [1, 2],
    "mailbox order is the same per-Execution order",
  );
  assert.equal(conflict.classification, "duplicate_conflict");
  assert.equal(conflict.position, 1, "A's Execution records its own first refusal at 1");
  assert.equal(conflict.executionId, (transcript.create as { executionId: string }).executionId);

  const tokens = new Set([
    created.receipt.token,
    (transcript.input as { receipt: { token: string } }).receipt.token,
    (transcript.dispatch as { receipt: { token: string } }).receipt.token,
  ]);
  assert.equal(tokens.size, 3, "three accepted decisions, three distinct tokens");
  assert.match(created.receipt.token, /^crt:/);
  assert.match((transcript.input as { receipt: { token: string } }).receipt.token, /^inp:/);
  assert.match((transcript.dispatch as { receipt: { token: string } }).receipt.token, /^dsp:/);
}

const noHidden = (): void => {
  // Control arm: no interposed activity at all.
};

describe("K11-R12-ID-01 scoped non-disclosure across the accepted-evidence path", () => {
  test("the oracle is deterministic: two control arms agree exactly", () => {
    const first = runArm(noHidden);
    const second = runArm(noHidden);
    assertIndistinguishable(first, second);
    assertOwnOrder(first);
  });

  test("one hidden accepted creation discloses nothing to A", () => {
    const interleaved = runArm((kernel, hiddenExecutions, round) => {
      const hidden = accepted(kernel.createExecution(authorB, bCreate(`r${round}-h-1`)));
      hiddenExecutions.push(hidden.executionId);
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("hidden activity before A's first operation discloses nothing to A", () => {
    const early = runArm((kernel, hiddenExecutions, round) => {
      if (round !== 0) return;
      const hidden = accepted(kernel.createExecution(authorB, bCreate("h-early")));
      hiddenExecutions.push(hidden.executionId);
      accepted(
        kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c1", kind: "k", payload: { h: 1 } }),
      );
    });
    assertIndistinguishable(runArm(noHidden), early);
    assertOwnOrder(early);
  });

  test("several hidden accepts across hidden Executions discloses nothing to A", () => {
    const interleaved = runArm((kernel, hiddenExecutions, round) => {
      for (const key of [`r${round}-h-1`, `r${round}-h-2`, `r${round}-h-3`]) {
        const hidden = accepted(kernel.createExecution(authorB, bCreate(key)));
        hiddenExecutions.push(hidden.executionId);
        accepted(
          kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c1", kind: "k", payload: { h: 1 } }),
        );
        accepted(
          kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c2", kind: "k", payload: { h: 2 } }),
        );
        accepted(kernel.dispatch(authorB, hidden.executionId, { bound: 2 }));
        accepted(kernel.redeliver(authorB, hidden.executionId));
      }
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("hidden refusals attached to hidden Executions disclose nothing to A", () => {
    const interleaved = runArm((kernel, hiddenExecutions, round) => {
      const key = `r${round}-h-1`;
      const hidden = accepted(kernel.createExecution(authorB, bCreate(key)));
      hiddenExecutions.push(hidden.executionId);
      // Same key, different content: a recorded duplicate_conflict against B's Execution.
      const conflict = refused(kernel.createExecution(authorB, bConflict(key)));
      void conflict;
      const badKind = refused(
        kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c1", kind: "k", payload: { h: Number.NaN } as never }),
      );
      void badKind;
      const overBound = refused(kernel.dispatch(authorB, hidden.executionId, { bound: 0 }));
      void overBound;
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("hidden refusals naming no Execution disclose nothing to A", () => {
    const interleaved = runArm((kernel) => {
      // Probes that concern no record: missing destinations, malformed content, a scope the
      // hidden caller does not hold — including a probe aimed at A's own scope, a malformed
      // creation key under an authorized scope, and an inspection of A's own Execution.
      refused(kernel.inspect(authorB, "execution-404"));
      refused(kernel.submitInput(authorB, { destination: "execution-404", requestKey: "k", kind: "k", payload: null }));
      refused(kernel.dispatch(authorB, "execution-404", { bound: 1 }));
      refused(kernel.redeliver(authorB, "execution-404"));
      refused(
        kernel.submitInput(authorB, { destination: "execution-404", requestKey: "k", kind: "k", payload: { h: Number.NaN } as never }),
      );
      refused(kernel.createExecution(authorB, createRequest({ creationKey: "h-x", scope: scopeA })));
      refused(kernel.createExecution(authorB, { ...bCreate("h-y"), scope: 17 as unknown as string }));
      refused(kernel.createExecution(authorB, { ...bCreate("h-z"), creationKey: 17 as unknown as string }));
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("mixed hidden accepts and refusals disclose nothing to A", () => {
    const interleaved = runArm((kernel, hiddenExecutions, round) => {
      const first = accepted(kernel.createExecution(authorB, bCreate(`r${round}-h-1`)));
      hiddenExecutions.push(first.executionId);
      refused(kernel.createExecution(authorB, bConflict(`r${round}-h-1`)));
      const second = accepted(kernel.createExecution(authorB, bCreate(`r${round}-h-2`)));
      hiddenExecutions.push(second.executionId);
      refused(kernel.dispatch(authorB, second.executionId, { bound: 0 }));
      accepted(
        kernel.submitInput(authorB, { destination: first.executionId, requestKey: "h-c1", kind: "k", payload: { h: 1 } }),
      );
      refused(kernel.inspect(authorB, "execution-404"));
      accepted(kernel.dispatch(authorB, first.executionId, { bound: 1 }));
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("the same producer namespace in a hidden scope neither collides nor discloses", () => {
    let seenHidden = "";
    const interleaved = runArm((kernel, hiddenExecutions) => {
      // Same namespace as A, disjoint scope, identical key text: a different creation key that
      // must name a different Execution without moving any of A's evidence.
      const hidden = accepted(
        kernel.createExecution(authorBinAClothing, { ...bCreate("a-report"), creationKey: "a-report" }),
      );
      hiddenExecutions.push(hidden.executionId);
      seenHidden = hidden.executionId;
    });
    const control = runArm(noHidden);
    assertIndistinguishable(control, interleaved);
    assertOwnOrder(interleaved);
    const controlCreate = control.create as { executionId: string };
    const hiddenCreate = interleaved.create as { executionId: string };
    assert.equal(hiddenCreate.executionId, controlCreate.executionId, "A's Execution identity is its own");
    assert.notEqual(seenHidden, "", "the hidden Execution exists under its own identity");
    assert.notEqual(seenHidden, controlCreate.executionId, "and it is not A's Execution");
  });

  test("hidden work striped across several hidden Executions discloses nothing to A", () => {
    const interleaved = runArm((kernel, hiddenExecutions, round) => {
      const ids: string[] = [];
      for (const key of [`r${round}-h-1`, `r${round}-h-2`]) {
        const hidden = accepted(kernel.createExecution(authorB, bCreate(key)));
        ids.push(hidden.executionId);
        hiddenExecutions.push(hidden.executionId);
      }
      accepted(kernel.submitInput(authorB, { destination: ids[0] as string, requestKey: "s", kind: "k", payload: { n: 1 } }));
      refused(kernel.submitInput(authorB, { destination: ids[1] as string, requestKey: "s", kind: "k", payload: { n: Number.NaN } as never }));
      accepted(kernel.submitInput(authorB, { destination: ids[1] as string, requestKey: "s", kind: "k", payload: { n: 2 } }));
      accepted(kernel.dispatch(authorB, ids[0] as string, { bound: 1 }));
      refused(kernel.dispatch(authorB, ids[1] as string, { bound: 0 }));
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("A's own several Executions stay mutually ordered and undisclosing", () => {
    const multi = (hidden: (kernel: ExecutionCoordinator, hiddenExecutions: string[], round: number) => void): unknown => {
      const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
      const hiddenExecutions: string[] = [];
      const first = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-one" })));
      hidden(kernel, hiddenExecutions, 0);
      const second = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-two" })));
      hidden(kernel, hiddenExecutions, 1);
      const firstInput = accepted(
        kernel.submitInput(authorA, { destination: first.executionId, requestKey: "k", kind: "k", payload: { n: 1 } }),
      );
      for (const hiddenId of hiddenExecutions) {
        assert.equal(refused(kernel.inspect(authorA, hiddenId)).classification, "unknown_destination");
      }
      return {
        first,
        second,
        firstInput,
        firstReplay: accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-one" }))),
        secondView: accepted(kernel.inspect(authorA, second.executionId)),
        visible: kernel.visibleExecutions(authorA),
      };
    };
    const hiddenBurst = (kernel: ExecutionCoordinator, hiddenExecutions: string[], round: number): void => {
      const key = `r${round}-h-${hiddenExecutions.length}`;
      const hidden = accepted(kernel.createExecution(authorB, bCreate(key)));
      hiddenExecutions.push(hidden.executionId);
      refused(kernel.createExecution(authorB, bConflict(key)));
    };
    const control = multi(noHidden);
    const interleaved = multi(hiddenBurst);
    assert.deepEqual(interleaved, control, "A's Executions observe only their own record order");
    const second = (interleaved as { second: { receipt: { position: number } } }).second;
    assert.equal(second.receipt.position, 1, "each Execution's acceptance index starts at 1");
  });

  test("refusal order is per Execution, not per scope: same-scope Executions do not share it", () => {
    // K11-R12-ID-01: a per-scope refusal counter would still let one Execution's evidence count
    // another Execution's refusals. Two callers holding the same scope but owning different
    // Executions must each observe their own refusal index starting at 1.
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const sibling = caller("app-b", scopeA);
    const first = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-one" })));
    const second = accepted(kernel.createExecution(sibling, createRequest({ creationKey: "b-one" })));

    const firstInput = accepted(
      kernel.submitInput(authorA, { destination: first.executionId, requestKey: "k", kind: "k", payload: { n: 1 } }),
    );
    void firstInput;
    const refusalOnFirst = refused(
      kernel.submitInput(authorA, { destination: first.executionId, requestKey: "k", kind: "k", payload: { n: 2 } }),
    );
    const secondInput = accepted(
      kernel.submitInput(sibling, { destination: second.executionId, requestKey: "k", kind: "k", payload: { n: 1 } }),
    );
    void secondInput;
    const refusalOnSecond = refused(
      kernel.submitInput(sibling, { destination: second.executionId, requestKey: "k", kind: "k", payload: { n: 3 } }),
    );

    assert.equal(refusalOnFirst.position, 1, "the first Execution's own first refusal is 1");
    assert.equal(refusalOnSecond.position, 1, "the second Execution's own first refusal is 1, not 2");
    assert.equal(refusalOnFirst.executionId, first.executionId);
    assert.equal(refusalOnSecond.executionId, second.executionId);
    assert.deepEqual(
      accepted(kernel.inspect(sibling, second.executionId)).refusals.map((refusal) => refusal.position),
      [1],
    );
  });

  test("hidden attached refusals on every remaining path disclose nothing to A", () => {
    const interleaved = runArm((kernel, hiddenExecutions, round) => {
      const hidden = accepted(kernel.createExecution(authorB, bCreate(`r${round}-h-1`)));
      hiddenExecutions.push(hidden.executionId);
      // Input duplicate_conflict against the hidden Execution (replay would accept; different
      // content records a refusal).
      accepted(
        kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "dup", kind: "k", payload: { n: 1 } }),
      );
      refused(
        kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "dup", kind: "k", payload: { n: 2 } }),
      );
      // Exchange states: dispatch once, then a second dispatch is unresolved-exchange and a
      // redelivery on a never-dispatched Execution is no-unresolved-exchange.
      accepted(kernel.dispatch(authorB, hidden.executionId, { bound: 1 }));
      refused(kernel.dispatch(authorB, hidden.executionId, { bound: 1 }));
      const other = accepted(kernel.createExecution(authorB, bCreate(`r${round}-h-2`)));
      hiddenExecutions.push(other.executionId);
      refused(kernel.redeliver(authorB, other.executionId));
      // A hidden caller inspecting A's Execution learns nothing and moves nothing of A's.
      const probe = refused(kernel.inspect(authorB, (kernel.visibleExecutions(authorA)[0] ?? "execution-404") as string));
      void probe;
    });
    assertIndistinguishable(runArm(noHidden), interleaved);
    assertOwnOrder(interleaved);
  });

  test("hidden capacity exhaustion discloses nothing to A", () => {
    const runSmall = (hidden: (kernel: ExecutionCoordinator) => void): unknown => {
      const kernel = new ExecutionCoordinator({ driver: recordingDriver(), mailboxCapacity: 2 });
      const created = accepted(kernel.createExecution(authorA, createRequest({ creationKey: "a-report" })));
      hidden(kernel);
      const input = accepted(
        kernel.submitInput(authorA, { destination: created.executionId, requestKey: "a-fix", kind: "k", payload: { a: 1 } }),
      );
      const overCapacity = refused(
        kernel.submitInput(authorA, { destination: created.executionId, requestKey: "a-more", kind: "k", payload: { a: 2 } }),
      );
      return {
        created,
        input,
        overCapacity,
        view: accepted(kernel.inspect(authorA, created.executionId)),
        visible: kernel.visibleExecutions(authorA),
      };
    };
    const control = runSmall(noHidden);
    const interleaved = runSmall((kernel) => {
      // The hidden Execution lives under the same capacity limit but its own mailbox: filling
      // it — and being refused for it — must not move any of A's evidence.
      const hidden = accepted(kernel.createExecution(authorB, bCreate("h-full")));
      accepted(
        kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c1", kind: "k", payload: { h: 1 } }),
      );
      const exhausted = refused(
        kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c2", kind: "k", payload: { h: 2 } }),
      );
      assert.equal(exhausted.classification, "capacity_exhausted");
      assert.equal(exhausted.position, 1, "the hidden Execution's own first refusal is 1");
    });
    assert.deepEqual(interleaved, control, "hidden capacity state does not reach A's evidence");
    const overCapacity = (interleaved as { overCapacity: { classification: string; position: number } }).overCapacity;
    assert.equal(overCapacity.classification, "capacity_exhausted");
    assert.equal(overCapacity.position, 1, "A's own first refusal is 1 despite hidden refusals");
  });

  test("a hidden Execution and a missing one stay indistinguishable, including position", () => {
    const kernel = new ExecutionCoordinator({ driver: recordingDriver() });
    const hidden = accepted(kernel.createExecution(authorB, bCreate("h-1")));

    const hiddenProbe = refused(kernel.inspect(authorA, hidden.executionId));
    const missingProbe = refused(kernel.inspect(authorA, "execution-404"));
    assert.deepEqual({ ...hiddenProbe }, { ...missingProbe });
    assert.equal(hiddenProbe.position, 0);
    assert.equal(hiddenProbe.executionId, null);

    // Repeating the probes interleaved with hidden accepts still advances nothing.
    accepted(
      kernel.submitInput(authorB, { destination: hidden.executionId, requestKey: "h-c1", kind: "k", payload: { h: 1 } }),
    );
    const hiddenAgain = refused(kernel.inspect(authorA, hidden.executionId));
    assert.deepEqual({ ...hiddenAgain }, { ...missingProbe });
  });
});
