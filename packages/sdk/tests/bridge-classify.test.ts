/**
 * K1.4 bridge corpus, unit level: the lineage classifier (B-QUIESCE-CELLS, B-MAP, B-ENQUEUE-WINDOW),
 * the native-timer argument it rests on (B-NATIVE-TIMERS), the lineage scheduler (B-SCHED,
 * B-LINEAGE) and the root identity scope (B-ROOTID one-shot).
 */
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { ChildExecutionLink, ConfirmationRequest, ControllerResumption, ExecutionContext, ExecutionId, ExecutionWait, PendingOperation } from "@arrokothi/core";
import { schedulerContract } from "@arrokothi/core/testing";
import { classifyLineage } from "../src/legacy-bridge/classify.ts";
import type { LineageDecision, MemberRecords } from "../src/legacy-bridge/classify.ts";
import { LineageScheduler, lineageWorker } from "../src/legacy-bridge/lineage-scheduler.ts";
import { RootIdentityError, RootIdentityScope } from "../src/legacy-bridge/root-ids.ts";

const LIFECYCLES = ["CREATED", "READY", "RUNNING", "WAITING", "COMPLETED", "FAILED", "CANCELLED"] as const;
const WAITS: Record<string, ExecutionWait | null> = {
  none: null,
  input: { kind: "event", wake: { eventKinds: ["external.input"], correlationId: null } } as unknown as ExecutionWait,
  other: { kind: "event", wake: { eventKinds: ["effect.result"], correlationId: "c" } } as unknown as ExecutionWait,
  resumption: { kind: "controller_resumption", resumptionId: "r1" } as unknown as ExecutionWait,
  dependencies: { kind: "dependencies", event: { eventKinds: ["external.input"], correlationId: null }, resumptions: ["r1"] } as unknown as ExecutionWait,
};
const EFFECT_KINDS = ["use_capability", "write_memory", "spawn_execution", "send_message", "request_user_input"] as const;
type Operation = null | { readonly effectKind: (typeof EFFECT_KINDS)[number]; readonly dispatch: "not_dispatched" | "dispatched"; readonly confirmation: boolean };
const OPERATIONS: Operation[] = [null];
for (const effectKind of EFFECT_KINDS) {
  for (const dispatch of ["not_dispatched", "dispatched"] as const) for (const confirmation of [false, true]) OPERATIONS.push({ effectKind, dispatch, confirmation });
}
const RESUMPTIONS = ["none", "pending", "settled"] as const;

interface Cell {
  readonly lifecycle: (typeof LIFECYCLES)[number];
  readonly wait: string;
  readonly operation: Operation;
  readonly resumption: (typeof RESUMPTIONS)[number];
}

function member(id: string, cell: Cell, children: readonly ChildExecutionLink[] = []): MemberRecords {
  const op = cell.operation;
  const pendingOperations = op === null ? [] : [{
    pendingOperationId: `${id}.op`, executionId: id, effectKind: op.effectKind, status: "pending", dispatch: op.dispatch, outcome: null,
  } as unknown as PendingOperation];
  const confirmations = op?.confirmation ? [{ confirmationId: `${id}.cf`, executionId: id, pendingOperationId: `${id}.op`, state: "pending" } as unknown as ConfirmationRequest] : [];
  const resumptions = cell.resumption === "none" ? [] : [{ resumptionId: "r1", executionId: id, state: cell.resumption } as unknown as ControllerResumption];
  const context = { executionId: id as ExecutionId, rootExecutionId: "root" as ExecutionId, lifecycle: cell.lifecycle, waitingFor: WAITS[cell.wait] } as unknown as ExecutionContext;
  return { context, pendingOperations, confirmations, resumptions, children };
}

const cells = (): Cell[] => {
  const out: Cell[] = [];
  for (const lifecycle of LIFECYCLES) for (const wait of Object.keys(WAITS)) for (const operation of OPERATIONS) for (const resumption of RESUMPTIONS) {
    out.push({ lifecycle, wait, operation, resumption });
  }
  return out;
};

/**
 * The expected decision for a single member, stated from design 02 D01-CHK-02's table rather than
 * from the implementation: terminal root states map to their steps, a READY member is `continue`,
 * and `await` needs a WAITING member with no pending resumption, no in-flight operation, and a
 * human pause of its own (an input wait, or a confirmation not yet dispatched).
 */
function expectedSingle(cell: Cell): { kind: LineageDecision["kind"]; pauses?: string[] } {
  if (cell.lifecycle === "COMPLETED") return { kind: "complete" };
  if (cell.lifecycle === "FAILED") return { kind: "fail" };
  if (cell.lifecycle === "CANCELLED") return { kind: "native_cancelled" };
  if (cell.lifecycle === "READY") return { kind: "continue" };
  if (cell.lifecycle !== "WAITING" || cell.resumption === "pending") return { kind: "open" };
  const input = cell.wait === "input" || cell.wait === "dependencies";
  const op = cell.operation;
  if (op !== null) {
    const confirmable = (op.effectKind === "use_capability" || op.effectKind === "write_memory") && op.dispatch === "not_dispatched" && op.confirmation;
    if (!confirmable) return { kind: "open" };
    return { kind: "await", pauses: ["confirmation", ...(input ? ["input"] : [])] };
  }
  return input ? { kind: "await", pauses: ["input"] } : { kind: "open" };
}

const shape = (decision: LineageDecision) =>
  decision.kind === "await" ? { kind: decision.kind, pauses: decision.pauses.map(pause => pause.kind) } : { kind: decision.kind };

describe("B-QUIESCE-CELLS: the classifier is a total function over the enumerated product", () => {
  test("one member: every cell of lifecycle x wait x operation x resumption", () => {
    let count = 0;
    for (const cell of cells()) {
      const decision = classifyLineage({ rootExecutionId: "root", members: new Map([["root", member("root", cell)]]) });
      assert.deepEqual(shape(decision), expectedSingle(cell), JSON.stringify(cell));
      count++;
    }
    assert.equal(count, LIFECYCLES.length * Object.keys(WAITS).length * OPERATIONS.length * RESUMPTIONS.length);
  });

  test("a parent waiting only on a call child takes the child's decision; a settling child keeps it open", () => {
    let count = 0;
    for (const cell of cells()) {
      const link = { childExecutionId: "child" as ExecutionId, parentExecutionId: "root" as ExecutionId, pendingOperationId: "root.op", state: "active" } as unknown as ChildExecutionLink;
      const parent = member("root", { lifecycle: "WAITING", wait: "other", operation: { effectKind: "spawn_execution", dispatch: "dispatched", confirmation: false }, resumption: "none" }, [link]);
      const decision = classifyLineage({ rootExecutionId: "root", members: new Map([["root", parent], ["child", member("child", cell)]]) });
      const child = expectedSingle(cell);
      const expected = ["complete", "fail", "native_cancelled"].includes(child.kind) ? { kind: "open" } : child;
      assert.deepEqual(shape(decision), expected, JSON.stringify(cell));
      if (decision.kind === "await") assert.ok(decision.pauses.every(pause => pause.executionId === "child"), "B-CHILD: the pause names the child");
      count++;
    }
    assert.ok(count > 2000);
  });

  test("B-ENQUEUE-WINDOW: a member READY in the store is runnable whatever the FIFO holds", () => {
    const ready = member("root", { lifecycle: "READY", wait: "none", operation: null, resumption: "none" });
    assert.equal(classifyLineage({ rootExecutionId: "root", members: new Map([["root", ready]]) }).kind, "continue");
  });

  test("B-RUN-REASON (both classes): own confirmation precedes own input, which precedes a child's pause", () => {
    const link = { childExecutionId: "child" as ExecutionId, parentExecutionId: "root" as ExecutionId, pendingOperationId: "root.spawn", state: "active" } as unknown as ChildExecutionLink;
    const root = member("root", { lifecycle: "WAITING", wait: "input", operation: { effectKind: "use_capability", dispatch: "not_dispatched", confirmation: true }, resumption: "none" }, [link]);
    const withSpawn: MemberRecords = { ...root, pendingOperations: [...root.pendingOperations, { pendingOperationId: "root.spawn", executionId: "root", effectKind: "spawn_execution", status: "pending", dispatch: "dispatched", outcome: null } as unknown as PendingOperation] };
    const child = member("child", { lifecycle: "WAITING", wait: "input", operation: null, resumption: "none" });
    const decision = classifyLineage({ rootExecutionId: "root", members: new Map([["root", withSpawn], ["child", child]]) });
    assert.equal(decision.kind, "await");
    assert.deepEqual(decision.kind === "await" && decision.pauses, [
      { kind: "confirmation", executionId: "root", confirmationId: "root.cf" },
      { kind: "input", executionId: "root" },
      { kind: "input", executionId: "child" },
    ]);
  });
});

test("B-NATIVE-TIMERS: the legacy core has exactly one native timer, the inline-wait yield", async () => {
  const root = resolve(import.meta.dirname, "../../core/src");
  const hits: string[] = [];
  for (const file of (await readdir(root, { recursive: true })).filter(name => name.endsWith(".ts")).sort()) {
    const lines = (await readFile(resolve(root, file), "utf8")).split("\n");
    lines.forEach((line, index) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      if (/\b(setTimeout|setInterval|setImmediate)\s*\(|timers\/promises/.test(line)) hits.push(`${file.split("\\").join("/")}:${index + 1}`);
    });
  }
  assert.deepEqual(hits, ["reference/inline-wait.ts:44"], "a new native wake source would let a lineage advance while the Kernel records WAITING");
});

describe("B-SCHED: the published Scheduler contract, unchanged, against the lineage scheduler", () => {
  for (const contractCase of schedulerContract(() => new LineageScheduler())) test(contractCase.name, contractCase.run);
});

describe("B-LINEAGE: a lineage worker claims only its own lineage", () => {
  const store = (roots: Record<string, string>) => ({ readExecution: async (id: string) => (roots[id] ? { rootExecutionId: roots[id] } : undefined) }) as never;
  test("claims are filtered by the root the store names, in enqueue order", async () => {
    const scheduler = new LineageScheduler(store({ a: "a", a1: "a", b: "b" }));
    for (const id of ["a", "b", "a1"]) await scheduler.enqueue(id as ExecutionId);
    assert.equal((await scheduler.claim(lineageWorker("b")))?.executionId, "b");
    assert.equal((await scheduler.claim(lineageWorker("b"))), undefined);
    const first = await scheduler.claim(lineageWorker("a"));
    assert.equal(first?.executionId, "a");
    assert.equal((await scheduler.claim(lineageWorker("a")))?.executionId, "a1");
    assert.equal(scheduler.hasQueued("a"), false);
  });
  test("an enqueue wakes only its lineage's waiter, including one requeued after its claim ends", async () => {
    const scheduler = new LineageScheduler(store({ a: "a", b: "b" }));
    let woke = "";
    void scheduler.nextWork("a").then(() => { woke += "a"; });
    void scheduler.nextWork("b").then(() => { woke += "b"; });
    await scheduler.enqueue("b" as ExecutionId);
    await Promise.resolve();
    assert.equal(woke, "b");
    const claim = await scheduler.claim(lineageWorker("b"));
    await scheduler.enqueue("b" as ExecutionId);
    await scheduler.ack(claim!);
    assert.equal(scheduler.hasQueued("b"), true, "work that arrived mid-claim is not lost");
  });
});

test("B-ROOTID: the root identity scope answers one exe request with E and throws on a second", async () => {
  const minted: string[] = [];
  const scope = new RootIdentityScope({ next: prefix => { minted.push(prefix); return `${prefix}_x`; } });
  assert.equal(scope.next("exe"), "exe_x", "outside a scope the configured generator answers");
  const ids = await scope.withRoot("E", async () => [scope.next("mbx"), scope.next("exe")]);
  assert.deepEqual(ids, ["mbx_x", "E"]);
  await assert.rejects(scope.withRoot("E2", async () => { scope.next("exe"); scope.next("exe"); }), RootIdentityError);
  assert.deepEqual(minted, ["exe", "mbx"]);
});

// -- B-QUIESCE-CELLS, extended (design 03 §2.7; review 01 K14-R1-01; D01-CHK-02) ------------------
// Record model: these cells forge native records to walk the classifier's whole input space. Real
// native settlements under the Driver's gates are B-OBSERVE-SCHEDULES in bridge-observe.test.ts.

const STATUSES = ["pending", "settled", "abandoned"] as const;
const DISPATCHES = ["not_dispatched", "dispatched"] as const;
const OUTCOMES = [null, "success", "failure", "unknown", "cancelled"] as const;
const CONFIRMATIONS = ["none", "pending", "approved", "declined", "abandoned"] as const;
const RESUMPTION_STATES = ["none", "pending", "settled", "invalidated"] as const;

interface RecordOp {
  readonly effectKind: (typeof EFFECT_KINDS)[number];
  readonly status: (typeof STATUSES)[number];
  readonly dispatch: (typeof DISPATCHES)[number];
  readonly outcome: (typeof OUTCOMES)[number];
  readonly confirmation: (typeof CONFIRMATIONS)[number];
}

function recordMember(id: string, lifecycle: string, wait: string, resumption: string, ops: readonly (RecordOp & { readonly key: string })[], children: readonly ChildExecutionLink[] = []): MemberRecords {
  return {
    context: { executionId: id as ExecutionId, rootExecutionId: "root" as ExecutionId, lifecycle, waitingFor: WAITS[wait], revision: 1 } as unknown as ExecutionContext,
    pendingOperations: ops.map(op => ({ pendingOperationId: `${id}.${op.key}`, executionId: id, effectKind: op.effectKind, status: op.status, dispatch: op.dispatch, outcome: op.outcome } as unknown as PendingOperation)),
    confirmations: ops.filter(op => op.confirmation !== "none").map(op => ({ confirmationId: `${id}.${op.key}.cf`, executionId: id, pendingOperationId: `${id}.${op.key}`, state: op.confirmation } as unknown as ConfirmationRequest)),
    resumptions: resumption === "none" ? [] : [{ resumptionId: `${id}.r`, executionId: id, state: resumption } as unknown as ControllerResumption],
    children,
  };
}

/** One operation's verdict, from design 03 §2.4: human-gated, inert, or blocking (in flight, settling, unsupported). */
function verdict(op: RecordOp, childAwaitable: boolean | null): "human" | "inert" | "blocking" {
  if (op.status !== "pending") return "inert";
  if ((op.effectKind === "use_capability" || op.effectKind === "write_memory") && op.dispatch === "not_dispatched" && op.confirmation === "pending") return "human";
  if (op.effectKind === "spawn_execution") return childAwaitable === true ? "human" : "blocking";
  return "blocking";
}

/** The spec oracle for one WAITING-capable member with no children. */
function expectedRecord(lifecycle: string, wait: string, resumption: string, op: RecordOp | null): { kind: string; pauses?: string[] } {
  if (lifecycle === "COMPLETED") return { kind: "complete" };
  if (lifecycle === "FAILED") return { kind: "fail" };
  if (lifecycle === "CANCELLED") return { kind: "native_cancelled" };
  if (lifecycle === "READY") return { kind: "continue" };
  if (lifecycle !== "WAITING" || resumption === "pending") return { kind: "open" };
  const input = wait === "input" || wait === "dependencies";
  const v = op === null ? null : verdict(op, null);
  if (v === "blocking") return { kind: "open" };
  if (v !== "human" && !input) return { kind: "open" };
  const pauses = [...(op?.confirmation === "pending" ? ["confirmation"] : []), ...(input ? ["input"] : [])];
  return { kind: "await", pauses };
}

describe("B-QUIESCE-CELLS (record model): operation status and outcome, confirmation and resumption states", () => {
  test("one member, one operation: kind x status x dispatch x outcome x confirmation x lifecycle x wait x resumption", () => {
    let count = 0;
    const ops: (RecordOp | null)[] = [null];
    for (const effectKind of EFFECT_KINDS) for (const status of STATUSES) for (const dispatch of DISPATCHES) for (const outcome of OUTCOMES) for (const confirmation of CONFIRMATIONS) {
      ops.push({ effectKind, status, dispatch, outcome, confirmation });
    }
    for (const lifecycle of LIFECYCLES) for (const wait of Object.keys(WAITS)) for (const resumption of RESUMPTION_STATES) for (const op of ops) {
      const root = recordMember("root", lifecycle, wait, resumption, op === null ? [] : [{ ...op, key: "op" }]);
      const decision = classifyLineage({ rootExecutionId: "root", members: new Map([["root", root]]) });
      assert.deepEqual(shape(decision), expectedRecord(lifecycle, wait, resumption, op), JSON.stringify({ lifecycle, wait, resumption, op }));
      count++;
    }
    assert.equal(count, LIFECYCLES.length * Object.keys(WAITS).length * RESUMPTION_STATES.length * (1 + EFFECT_KINDS.length * 3 * 2 * 5 * 5));
  });

  test("mixed operations: two operations per member over every pair of verdict classes, with a called child where one is a call", () => {
    type Class = "human" | "in-flight" | "inert" | "child-awaitable" | "child-settling" | "unsupported";
    const CLASSES: Class[] = ["human", "in-flight", "inert", "child-awaitable", "child-settling", "unsupported"];
    const opOf = (cls: Class): RecordOp => {
      switch (cls) {
        case "human": return { effectKind: "use_capability", status: "pending", dispatch: "not_dispatched", outcome: null, confirmation: "pending" };
        case "in-flight": return { effectKind: "use_capability", status: "pending", dispatch: "dispatched", outcome: null, confirmation: "none" };
        case "inert": return { effectKind: "use_capability", status: "settled", dispatch: "dispatched", outcome: "success", confirmation: "none" };
        case "unsupported": return { effectKind: "send_message", status: "pending", dispatch: "dispatched", outcome: null, confirmation: "none" };
        default: return { effectKind: "spawn_execution", status: "pending", dispatch: "dispatched", outcome: null, confirmation: "none" };
      }
    };
    let count = 0;
    for (const first of CLASSES) for (const second of CLASSES) for (const wait of ["input", "other"]) for (const resumption of ["none", "pending"]) {
      const members = new Map<string, MemberRecords>();
      const links: ChildExecutionLink[] = [];
      const ops = [first, second].map((cls, index) => ({ ...opOf(cls), key: `op${index}` }));
      [first, second].forEach((cls, index) => {
        if (!cls.startsWith("child")) return;
        const child = `child${index}`;
        links.push({ childExecutionId: child as ExecutionId, parentExecutionId: "root" as ExecutionId, pendingOperationId: `root.op${index}`, state: "active" } as unknown as ChildExecutionLink);
        members.set(child, recordMember(child, cls === "child-awaitable" ? "WAITING" : "COMPLETED", "input", "none", []));
      });
      members.set("root", recordMember("root", "WAITING", wait, resumption, ops, links));
      const ordered = new Map([["root", members.get("root")!], ...[...members].filter(([id]) => id !== "root")]);
      const decision = classifyLineage({ rootExecutionId: "root", members: ordered });
      const verdicts = [first, second].map(cls => cls === "human" || cls === "child-awaitable" ? "human" : cls === "inert" ? "inert" : "blocking");
      const blocked = resumption === "pending" || verdicts.includes("blocking");
      const human = verdicts.includes("human") || wait === "input";
      const expected = blocked || !human ? { kind: "open" } : {
        kind: "await",
        pauses: [
          ...[first, second].filter(cls => cls === "human").map(() => "confirmation"),
          ...(wait === "input" ? ["input"] : []),
          ...[first, second].filter(cls => cls === "child-awaitable").map(() => "input"),
        ],
      };
      assert.deepEqual(shape(decision), expected, JSON.stringify({ first, second, wait, resumption }));
      count++;
    }
    assert.equal(count, 6 * 6 * 2 * 2);
  });
});
