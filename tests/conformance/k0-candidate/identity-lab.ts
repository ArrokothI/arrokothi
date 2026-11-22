/**
 * K1.4-candidate: a laboratory for the candidate's identity rendering, and an independent oracle
 * (design 03 and its addendum 01 §A3; the joins of design 04, design 05 and design 05 addendum 01).
 *
 * The **lab** drives `kernelCandidate` through the coordinator class it hands the candidate. That subclass
 * records, for every command and in the order each began (design 05 §3):
 * - every call of one of the coordinator's own methods, at any depth, with its arguments and, at return, the
 *   answer the candidate received;
 * - every delivery the Kernel makes to the Driver: the subclass's constructor wraps the Driver the candidate
 *   constructs it with, and the wrapper forwards to it;
 * - every settlement report the Driver makes on a delivery's settlement capability, attributed to the delivery
 *   whose capability it is, the delivery open at the time, and the call open at the time.
 * It can inject a fault into an answer or an inspection, and make the candidate or the Driver misbehave in one
 * declared way (`Tamper`), so the oracle's own rejections can be tested.
 *
 * The **oracle** judges those records. It never calls the candidate, its name ledger or its translation
 * helpers; from the adapter it uses only the two declared error classes. From the recorded commands, calls,
 * answers and reports alone it keeps its own relation between native IDs and shown strings, and checks each
 * command in a fixed order (design 05 §2): the unknown-reference exit (B); each answer at its slot (B2, Table 3);
 * the method list (C); each call's target and the final inspection's (D, Table 1); the settlement reports (D2);
 * the exit (E); the five copied fields (F); and the shape, the one-to-one relation and the first-naming rule (G).
 * Problems are `<code>: step <n>: <detail>`. The first failing record stops judgment of its run; the records
 * after it are counted as `unjudged` (design 05 §6).
 *
 * **What it does not judge** (design 05 §8), and what does: caller namespaces, keys, encoded content and the
 * dispatch bound (the encoder tests and the fifteen whole-result comparisons); the submission grant (ABL-2 and the
 * latest-grant witness); Observation fields other than the five copied ones and the identity positions (the
 * fixture's whole-result comparison and design 03's paired fault runs); whether, where and what the Kernel
 * delivers, and its other Driver calls (the Kernel's own tests and the fake Driver's unit tests). A call that
 * bypasses the wrapped methods, on another coordinator or through an unwrapped base method, is not observed.
 *
 * Test-side only. The candidate does not import this file.
 */

import { ExecutionCoordinator } from "@arrokothi/kernel";
import type { Activation, AuthenticatedCaller, CoordinatorOptions, DeliverySettlement, ExecutionDriver, ExecutionView, MailboxEntryView, SubmissionGrant, WaitOutcome } from "@arrokothi/kernel";

import type { CandidateRefusal, CandidateRun, Command, Observation } from "../k0/fixture.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import type { FixtureEvent, OutcomeEnvelope, OutcomeNext, WaitRecord } from "../k0/protocol-vocabulary.ts";
import { AnswerContradiction, createKernelCandidate, UnknownLaboratoryReference } from "./kernel-candidate.ts";

export { AnswerContradiction, UnknownLaboratoryReference };
export type { AuthenticatedCaller, DeliverySettlement, ExecutionView };

// -- Records ------------------------------------------------------------------

export interface CallRecord {
  readonly method: string;
  readonly args: readonly unknown[];
  /** The answer as the candidate received it, after any injected fault. Filled in when the call returns. */
  readonly answer: unknown;
}

/** One delivery of an Activation to the Driver. */
export interface DeliveryRecord {
  /** Run-wide, from 1, in the order the Kernel delivered. */
  readonly number: number;
  readonly executionId: string;
  readonly activationId: string;
  readonly writerEpoch: number;
  /** The index in this record's `calls` of the innermost call open when the Kernel delivered, or `null`. */
  readonly inCall: number | null;
}

/** One settlement report the Driver made. */
export interface ReportRecord {
  readonly method: "delivered" | "failed";
  readonly args: readonly unknown[];
  /** The delivery whose settlement capability received the report. */
  readonly owner: number;
  /** The innermost delivery open when the report was made, or `null`. */
  readonly during: number | null;
  /** The index in this record's `calls` of the innermost call open when the report was made, or `null`. */
  readonly inCall: number | null;
}

/** The record's entries in the order each began. */
export type TraceEntry =
  | { readonly kind: "call"; readonly index: number }
  | { readonly kind: "delivery"; readonly number: number }
  | { readonly kind: "report"; readonly index: number };

export interface StepRecord {
  /** The command as the laboratory issued it. */
  readonly command: Command;
  readonly calls: readonly CallRecord[];
  readonly deliveries: readonly DeliveryRecord[];
  readonly reports: readonly ReportRecord[];
  readonly trace: readonly TraceEntry[];
  /** The last successful inspection of this command, for tests. The oracle reads the recorded answers instead. */
  readonly view: ExecutionView | null;
  readonly observation: Observation | null;
  /** The error `apply` threw, or `undefined`. */
  readonly thrown: unknown;
}

/** A fault in the Kernel's public answers. Each hook returns what the candidate is to receive. */
export interface Faults {
  readonly answer?: (method: string, args: readonly unknown[], answer: unknown) => unknown;
  readonly view?: (view: ExecutionView) => ExecutionView;
}

/** What a `Tamper.delivery` hook receives, inside the delivery, beneath the recorder. */
export interface DeliveryContext {
  readonly number: number;
  readonly activation: Activation;
  /** The coordinator the candidate drives, so a hook can reenter it. */
  readonly coordinator: ExecutionCoordinator;
  /** This command's calls so far. */
  readonly calls: readonly CallRecord[];
  /** The recording settlement of this delivery, and of every earlier one in the run. */
  readonly recording: DeliverySettlement;
  readonly earlier: readonly DeliverySettlement[];
  /** Hands the fake Driver this delivery, with `settlement` as its capability. */
  forward(settlement: DeliverySettlement): void;
}

/** One declared misbehavior of the candidate or the Driver, for the oracle's rejection controls. */
export interface Tamper {
  /** The command actually given to the candidate; the record keeps the laboratory's. */
  readonly command?: (command: Command) => Command;
  /** An error to throw instead of running the command. */
  readonly refuse?: (command: Command) => Error | null;
  readonly observation?: (observation: Observation, previous: Observation | null) => Observation;
  /** An Observation to return instead of the error the candidate threw. */
  readonly recover?: (error: unknown, previous: Observation | null) => Observation | null;
  /** Replaces the forwarding of a delivery to the fake Driver. By default it forwards the recording settlement. */
  readonly delivery?: (context: DeliveryContext) => void;
}

export interface Lab {
  /** Runs one command and returns its record. Never throws for an error `apply` threw. */
  attempt(command: Command): StepRecord;
  /** Runs one command and returns its Observation; throws what `apply` threw. */
  apply(command: Command): Observation;
  readonly records: readonly StepRecord[];
}

/** Every own method of the coordinator's prototype but the constructor, enumerated when this module loads. */
export const COORDINATOR_METHODS: readonly string[] = Object.freeze(
  Object.getOwnPropertyNames(ExecutionCoordinator.prototype).filter(
    (name) => name !== "constructor" && typeof Object.getOwnPropertyDescriptor(ExecutionCoordinator.prototype, name)?.value === "function",
  ),
);

export function startLab(options: { readonly faults?: Faults; readonly tamper?: Tamper } = {}): Lab {
  const faults = options.faults ?? {};
  const tamper = options.tamper ?? {};
  let calls: { method: string; args: readonly unknown[]; answer: unknown }[] = [];
  let deliveries: DeliveryRecord[] = [];
  let reports: ReportRecord[] = [];
  let trace: TraceEntry[] = [];
  /** The calls and deliveries open now, innermost last. Restored on every exit, normal or not. */
  const openCalls: number[] = [];
  const openDeliveries: number[] = [];
  const recordings: DeliverySettlement[] = [];
  let delivered = 0;
  let coordinator: ExecutionCoordinator | null = null;

  /** A settlement that records each report on delivery `owner`, then forwards it, arguments and all. */
  const recordingSettlement = (owner: number, settlement: DeliverySettlement): DeliverySettlement => {
    const report = (method: "delivered" | "failed") => (...args: unknown[]): void => {
      reports.push({ method, args, owner, during: openDeliveries.at(-1) ?? null, inCall: openCalls.at(-1) ?? null });
      trace.push({ kind: "report", index: reports.length - 1 });
      Reflect.apply(settlement[method], settlement, args);
    };
    return Object.freeze({ delivered: report("delivered"), failed: report("failed") });
  };

  /** Forwards to the Driver the candidate created, recording each delivery and wrapping its settlement. */
  const forwardingDriver = (inner: ExecutionDriver): ExecutionDriver => {
    const driver: ExecutionDriver = {
      driverId: inner.driverId,
      deliver(activation: Activation, settlement: DeliverySettlement, submission: SubmissionGrant): undefined {
        delivered += 1;
        const number = delivered;
        deliveries.push({ number, executionId: activation.executionId, activationId: activation.activationId, writerEpoch: activation.writerEpoch, inCall: openCalls.at(-1) ?? null });
        trace.push({ kind: "delivery", number });
        const recording = recordingSettlement(number, settlement);
        const earlier = [...recordings];
        recordings.push(recording);
        openDeliveries.push(number);
        try {
          const forward = (handed: DeliverySettlement): void => void inner.deliver(activation, handed, submission);
          if (tamper.delivery === undefined) forward(recording);
          else tamper.delivery({ number, activation, coordinator: coordinator as ExecutionCoordinator, calls: [...calls], recording, earlier, forward });
        } finally {
          openDeliveries.pop();
        }
        return undefined;
      },
    };
    if (typeof inner.isSafeToReplace === "function") {
      const ask = inner.isSafeToReplace;
      driver.isSafeToReplace = (activation: Activation): boolean => ask.call(inner, activation);
    }
    if (typeof inner.requestCancellation === "function") {
      const ask = inner.requestCancellation;
      driver.requestCancellation = (request) => ask.call(inner, request);
    }
    return driver;
  };

  class Recording extends ExecutionCoordinator {
    constructor(coordinatorOptions: CoordinatorOptions) {
      super({ ...coordinatorOptions, driver: forwardingDriver(coordinatorOptions.driver) });
      coordinator = this;
    }
  }
  for (const method of COORDINATOR_METHODS) {
    const original = (ExecutionCoordinator.prototype as unknown as Record<string, (...args: unknown[]) => unknown>)[method] as (...args: unknown[]) => unknown;
    Object.defineProperty(Recording.prototype, method, {
      configurable: true,
      writable: true,
      value(this: ExecutionCoordinator, ...args: unknown[]): unknown {
        const index = calls.length;
        const entry: { method: string; args: readonly unknown[]; answer: unknown } = { method, args, answer: undefined };
        calls.push(entry);
        trace.push({ kind: "call", index });
        openCalls.push(index);
        let answer: unknown;
        try {
          answer = original.apply(this, args);
        } finally {
          openCalls.pop();
        }
        if (method === "inspect" && faults.view !== undefined) {
          const inspected = answer as { readonly ok: boolean; readonly value?: ExecutionView };
          if (inspected.ok && inspected.value !== undefined) answer = { ...inspected, value: faults.view(inspected.value) };
        }
        if (faults.answer !== undefined) answer = faults.answer(method, args, answer);
        entry.answer = answer;
        return answer;
      },
    });
  }

  const started = createKernelCandidate({ Coordinator: Recording }).begin(
    { id: "k14-candidate-identity-lab", title: "identity lab", sources: [], k0BoundaryRows: [], isUnsafeControl: false, steps: [] },
    createOperationSink().sink,
  );
  if ((started as CandidateRefusal).refused === true) throw new Error(`unexpected refusal: ${(started as CandidateRefusal).reason}`);
  const run = started as CandidateRun;
  const records: StepRecord[] = [];
  let previous: Observation | null = null;

  const attempt = (command: Command): StepRecord => {
    calls = [];
    deliveries = [];
    reports = [];
    trace = [];
    let observation: Observation | null = null;
    let thrown: unknown = undefined;
    try {
      const refused = tamper.refuse?.(command) ?? null;
      if (refused !== null) throw refused;
      observation = run.apply(tamper.command === undefined ? command : tamper.command(command));
      if (tamper.observation !== undefined) observation = tamper.observation(observation, previous);
    } catch (error) {
      const recovered = tamper.recover?.(error, previous) ?? null;
      if (recovered === null) thrown = error;
      else observation = recovered;
    }
    let view: ExecutionView | null = null;
    for (const call of calls) {
      const inspected = call.answer as { readonly ok?: boolean; readonly value?: ExecutionView } | null | undefined;
      if (call.method === "inspect" && inspected?.ok === true && inspected.value !== undefined && inspected.value !== null) view = inspected.value;
    }
    const record: StepRecord = { command, calls, deliveries, reports, trace, view, observation, thrown };
    records.push(record);
    if (observation !== null) previous = observation;
    return record;
  };

  return {
    attempt,
    apply(command: Command): Observation {
      const record = attempt(command);
      if (record.observation === null) throw record.thrown;
      return record.observation;
    },
    records,
  };
}

// -- Commands -----------------------------------------------------------------

export const inputEvent = (eventId: string, destination: string, requestKey: string, subscriptionClass = "other"): FixtureEvent => ({
  eventId,
  destination,
  kind: "external.input",
  category: "application_input",
  subscriptionClass,
  producer: "identity-lab",
  requestKey,
});

export const createCommand = (executionId: string, requestKey: string, kind: "create" | "create_retry" = "create", initialName = "initial"): Command => ({
  kind,
  executionId,
  requestKey,
  definitionRevision: "identity-lab@1",
  initialInput: inputEvent(initialName, executionId, "initial", "initial"),
});

export const acceptCommand = (eventId: string, destination: string, requestKey: string, subscriptionClass = "other"): Command => ({
  kind: "accept_event",
  event: inputEvent(eventId, destination, requestKey, subscriptionClass),
});

export const dispatchCommand = (executionId: string): Command => ({ kind: "dispatch", executionId, bound: 1 });

/** An Outcome for the exchange `open` shows. */
export const outcomeOf = (open: Observation, next: OutcomeNext): OutcomeEnvelope => ({
  executionId: open.executionId,
  activationId: open.activationId as string,
  writerEpoch: open.writerEpoch,
  baseProgressRevision: open.progressRevision,
  progress: null,
  emissions: [],
  effects: [],
  next,
});

export const waitDeclaration = (generation: string, deadline: number): WaitRecord => ({
  dependencies: [],
  subscriptions: [{ subscriptionClass: "continue" }],
  deadline,
  generation,
});

export const timerCommand = (executionId: string, generation: string, name: string): Command => ({
  kind: "deliver_timer",
  executionId,
  generation,
  timeoutEvent: { eventId: name, destination: executionId, kind: "kernel.wait.timeout", category: "kernel_timeout", waitGeneration: generation },
});

/** Dispatches and submits an `await`: the two commands that register a wait. Returns the second Observation. */
export function registerWait(lab: Lab, executionId: string, generation: string, deadline: number): Observation {
  const open = lab.apply(dispatchCommand(executionId));
  return lab.apply({ kind: "submit_outcome", outcome: outcomeOf(open, { step: "await", wait: waitDeclaration(generation, deadline) }) });
}

/** The string an Observation shows for the wait generation it has live or just ended. */
export function shownGeneration(observation: Observation): string {
  const shown = observation.liveWaitGeneration ?? observation.waitEndedReadiness[0]?.generation;
  if (shown === undefined) throw new Error("the Observation shows no wait generation");
  return shown;
}

// -- The oracle ---------------------------------------------------------------

const OBSERVATION_FIELDS: readonly string[] = [
  "acceptedDeadline",
  "acknowledged",
  "activationId",
  "dispatchedBatch",
  "effectIntents",
  "emissions",
  "executionId",
  "ingressRefused",
  "liveWaitGeneration",
  "progress",
  "progressRevision",
  "queued",
  "receipt",
  "recoveryHold",
  "rejection",
  "state",
  "terminalDispositions",
  "waitEndedReadiness",
  "writerEpoch",
];

interface Answer<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly error?: { readonly executionId?: unknown } | null;
}

const carriedName = (entry: MailboxEntryView): unknown => {
  const payload = entry.payload as { readonly eventId?: unknown } | null;
  return payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload.eventId : undefined;
};

/** A slot's part in its row. */
export type SlotRole = "preliminary" | "timers" | "operation" | "final" | "operation+final";
export interface Slot {
  readonly method: string;
  readonly role: SlotRole;
}

/**
 * Design 04 Table 1: for each command kind, the calls of a command that reaches its final inspection, in order.
 * The last slot is always the final inspection; for `inspect` it is also the operation. 26 slots in all.
 */
export const ROWS: Readonly<Record<Command["kind"], readonly Slot[]>> = {
  create: [{ method: "createExecution", role: "operation" }, { method: "inspect", role: "final" }],
  create_retry: [{ method: "createExecution", role: "operation" }, { method: "inspect", role: "final" }],
  accept_event: [{ method: "submitInput", role: "operation" }, { method: "inspect", role: "final" }],
  dispatch: [{ method: "dispatch", role: "operation" }, { method: "inspect", role: "final" }],
  redeliver_dispatch: [{ method: "redeliver", role: "operation" }, { method: "inspect", role: "final" }],
  submit_outcome: [{ method: "submitOutcome", role: "operation" }, { method: "inspect", role: "final" }],
  resubmit_outcome: [{ method: "submitOutcome", role: "operation" }, { method: "inspect", role: "final" }],
  accept_cancellation: [{ method: "cancelExecution", role: "operation" }, { method: "inspect", role: "final" }],
  deliver_timer: [{ method: "pendingTimers", role: "timers" }, { method: "fireTimer", role: "operation" }, { method: "inspect", role: "final" }],
  recover: [{ method: "inspect", role: "preliminary" }, { method: "recoverExecution", role: "operation" }, { method: "inspect", role: "final" }],
  takeover: [{ method: "inspect", role: "preliminary" }, { method: "requestTakeover", role: "operation" }, { method: "inspect", role: "final" }],
  inspect: [{ method: "inspect", role: "operation+final" }],
};

/** The four fire results a row continues on (design 05 Table 3). */
const CONTINUING_FIRES: readonly unknown[] = ["expired", "duplicate", "stale", "not_due"];

/**
 * Design 05 Table 3: what the recorded answer at its slot allows. `continue`, a legal `early` exit (a preliminary
 * view of another Execution), or the reason the answer is unprojectable. It reads the answer's discriminant only.
 */
export function classifyAnswer(slot: Slot, call: CallRecord, R: string | null): "continue" | "early" | string {
  const answer = call.answer as { readonly ok?: unknown; readonly value?: unknown; readonly error?: { readonly executionId?: unknown } | null; readonly result?: unknown } | null | undefined;
  const object = answer !== null && answer !== undefined && typeof answer === "object";
  switch (slot.method) {
    case "createExecution":
    case "submitInput":
    case "submitOutcome":
      if (object && answer.ok === true && answer.value !== undefined && answer.value !== null) return "continue";
      if (object && answer.ok === false && typeof answer.error?.executionId === "string") return "continue";
      return "neither a value nor a refusal that names an Execution";
    case "dispatch":
    case "redeliver":
    case "cancelExecution":
    case "recoverExecution":
    case "requestTakeover":
      return object && answer.ok === true ? "continue" : "a control command not accepted";
    case "pendingTimers":
      return Array.isArray(answer) ? "continue" : "no list of timers";
    case "fireTimer":
      return object && CONTINUING_FIRES.includes(answer.result) ? "continue" : `the fire answered ${object ? String(answer.result) : String(answer)}`;
    case "inspect": {
      if (!object || answer.ok !== true || answer.value === undefined || answer.value === null) return "no view";
      if (slot.role !== "preliminary") return "continue";
      const view = answer.value as ExecutionView;
      if (view.executionId !== R) return "early";
      return view.activation === null ? "no open exchange to name" : "continue";
    }
    default:
      return `no answer rule for ${slot.method}`;
  }
}

/** The Execution string and, for a fire, the generation string a command refers to. */
function referencesOf(command: Command): { readonly execution: string | null; readonly generation: string | null } {
  switch (command.kind) {
    case "create":
    case "create_retry":
      return { execution: null, generation: null };
    case "accept_event":
      return { execution: command.event.destination, generation: null };
    case "submit_outcome":
    case "resubmit_outcome":
      return { execution: command.outcome.executionId, generation: null };
    case "deliver_timer":
      return { execution: command.executionId, generation: command.generation };
    default:
      return { execution: command.executionId, generation: null };
  }
}

/** Whether `small` is a proper subsequence of `large`. */
function properSubsequence(small: readonly string[], large: readonly string[]): boolean {
  if (small.length >= large.length) return false;
  let index = 0;
  for (const item of large) if (index < small.length && item === small[index]) index += 1;
  return index === small.length;
}

export interface OracleCounts {
  /** Records judged, the failing one included. */
  commands: number;
  observations: number;
  unknownReferences: number;
  contradictions: number;
  /** Identity positions paired with a native ID. */
  pairs: number;
  /** Coordinator calls, each compared with one slot. */
  calls: number;
  deliveries: number;
  /** Settlement reports, each compared with one delivery. */
  reports: number;
  /** Records after the first failing one, which are not judged. */
  unjudged: number;
}

type Exit = { readonly kind: "observation" } | { readonly kind: "unknown" } | { readonly kind: "contradiction"; readonly code: string };

const describeThrown = (thrown: unknown): string => String((thrown as Error | undefined)?.message ?? thrown);

export class Oracle {
  readonly problems: string[] = [];
  readonly counts: OracleCounts = { commands: 0, observations: 0, unknownReferences: 0, contradictions: 0, pairs: 0, calls: 0, deliveries: 0, reports: 0, unjudged: 0 };
  /** Per scope, native ID to the string shown, and its inverse. Built from records only. */
  readonly #stringOf = new Map<string, Map<string, string>>();
  readonly #nativeOf = new Map<string, Map<string, string>>();
  /** Per native Execution, the name each input Event was first offered, from the raw answers. */
  readonly #offeredInputs = new Map<string, Map<string, string>>();
  #stopped = false;

  /** The native ID a string denotes in a scope, by this oracle's own relation. */
  denoted(scope: string, text: string): string | undefined {
    return this.#nativeOf.get(scope)?.get(text);
  }

  /** The string this oracle has seen for a native ID in a scope. */
  shown(scope: string, native: string): string | undefined {
    return this.#stringOf.get(scope)?.get(native);
  }

  /** Records the run's one problem; judgment stops after this record (design 05 §6). */
  #fail(code: string, step: number, detail: string): void {
    if (!this.#stopped) this.problems.push(`${code}: step ${step}: ${detail}`);
    this.#stopped = true;
  }

  check(record: StepRecord): void {
    if (this.#stopped) {
      this.counts.unjudged += 1;
      return;
    }
    const step = this.counts.commands;
    this.counts.commands += 1;
    const { command, calls } = record;
    const row = ROWS[command.kind];

    // A. The references, through this oracle's relation as it stood before the command.
    const references = referencesOf(command);
    const R = references.execution === null ? null : this.denoted("execution", references.execution);
    const G = references.generation === null || R === null || R === undefined ? null : this.denoted(`generation|${R}`, references.generation);
    const unknown = R === undefined || G === undefined;

    // B. An unknown reference throws UnknownLaboratoryReference, and a known one does not. C still runs.
    if (unknown !== record.thrown instanceof UnknownLaboratoryReference) {
      this.#fail("exit", step, unknown ? "a reference that denotes nothing must throw UnknownLaboratoryReference" : "a known reference was refused as unknown");
      return;
    }

    // B2. Each answer at its slot, while the recorded method is the slot's (Table 3).
    let expected: readonly Slot[] = row;
    let early: Exit | null = null;
    if (unknown) {
      expected = [];
      early = { kind: "unknown" };
    } else {
      for (const [index, slot] of row.entries()) {
        const call = calls[index];
        if (call === undefined || call.method !== slot.method) break;
        const verdict = classifyAnswer(slot, call, R ?? null);
        if (verdict === "continue") continue;
        if (verdict === "early") {
          expected = row.slice(0, index + 1);
          early = { kind: "contradiction", code: "execution" };
          break;
        }
        this.#fail("answer", step, `${command.kind} call ${index} (${call.method}): ${verdict}`);
        return;
      }
    }

    // C. The method list equals the expected list.
    const want = expected.map((slot) => slot.method);
    const got = calls.map((call) => call.method);
    if (want.length !== got.length || want.some((method, index) => method !== got[index])) {
      const code = properSubsequence(got, want) ? "call-missing" : properSubsequence(want, got) ? "call-extra" : "call-method";
      this.#fail(code, step, `${command.kind}: the calls are [${got.join(", ")}], and the row is [${want.join(", ")}]`);
      return;
    }

    // D. Each call's target, from the command, the relation and this command's earlier answers (Table 1).
    let T: string | null = R ?? null;
    let preliminary: ExecutionView | null = null;
    for (const [index, slot] of expected.entries()) {
      const call = calls[index] as CallRecord;
      const problem = this.#target(slot, call, R ?? null, G ?? null, preliminary, T);
      if (problem !== null) {
        this.#fail(slot.role === "final" ? "inspection" : "target", step, `${command.kind} call ${index} (${call.method}): ${problem}`);
        return;
      }
      if (slot.role === "operation" && (command.kind === "create" || command.kind === "create_retry")) {
        const answer = call.answer as Answer<{ readonly executionId: string }>;
        T = answer.ok ? (answer.value?.executionId ?? null) : ((answer.error?.executionId as string | undefined) ?? null);
      }
      if (slot.role === "preliminary") preliminary = (call.answer as Answer<ExecutionView>).value ?? null;
    }

    // D2. Settlement reports: each inside its own delivery, a bare delivered(), one per delivery.
    for (const report of record.reports) {
      if (report.during === null) {
        this.#fail("report-extra", step, `a ${report.method} report on delivery ${report.owner} outside any delivery`);
        return;
      }
      if (report.owner !== report.during) {
        this.#fail("report-delivery", step, `during delivery ${report.during}, a report on delivery ${report.owner}'s settlement`);
        return;
      }
      if (report.method !== "delivered" || report.args.length !== 0) {
        this.#fail("report-method", step, `delivery ${report.owner} reported ${report.method} with ${report.args.length} argument(s)`);
        return;
      }
    }
    for (const delivery of record.deliveries) {
      const made = record.reports.filter((report) => report.during === delivery.number).length;
      if (made !== 1) {
        this.#fail(made === 0 ? "report-missing" : "report-extra", step, `delivery ${delivery.number} has ${made} reports`);
        return;
      }
    }
    this.counts.calls += calls.length;
    this.counts.deliveries += record.deliveries.length;
    this.counts.reports += record.reports.length;

    // E. The legal exit, from the answers and the final inspection (Table 2).
    let exit: Exit;
    let view: ExecutionView | null = null;
    let operation: CallRecord | null = null;
    if (early !== null) exit = early;
    else {
      view = (calls[calls.length - 1]?.answer as Answer<ExecutionView>).value as ExecutionView;
      operation = calls[expected.findIndex((slot) => slot.role === "operation" || slot.role === "operation+final")] as CallRecord;
      this.#rememberInputs(command, operation);
      const code = this.#contradiction(command, operation, T, view);
      exit = code === null ? { kind: "observation" } : { kind: "contradiction", code };
    }
    if (exit.kind === "unknown") {
      this.counts.unknownReferences += 1;
      return;
    }
    if (exit.kind === "contradiction") {
      if (!(record.thrown instanceof AnswerContradiction)) this.#fail("exit", step, `the answer contradicts the inspection (${exit.code}) and the command did not throw AnswerContradiction`);
      else if (record.thrown.code !== exit.code) this.#fail("exit", step, `the contradiction is ${exit.code}, and the command threw ${record.thrown.code}`);
      else this.counts.contradictions += 1;
      return;
    }
    if (record.observation === null || view === null || operation === null) {
      this.#fail("exit", step, `no legal throw applies, and the command threw: ${describeThrown(record.thrown)}`);
      return;
    }
    const observation = record.observation;

    // F. The Observation copies the final inspection's five fields (design 05 §7, J-2).
    const copied: [string, unknown, unknown][] = [
      ["state", observation.state, view.state],
      ["progressRevision", observation.progressRevision, view.progressRevision],
      ["activationId", observation.activationId, view.activation === null ? null : view.activation.activationId],
      ["writerEpoch", observation.writerEpoch, view.activation === null ? 0 : view.activation.writerEpoch],
      ["acceptedDeadline", observation.acceptedDeadline, view.wait === null ? null : view.wait.deadline],
    ];
    for (const [field, shown, inspected] of copied) {
      if (!Object.is(shown, inspected)) {
        this.#fail("inspection", step, `the Observation's ${field} is ${JSON.stringify(shown)}, and the final inspection's is ${JSON.stringify(inspected)}`);
        return;
      }
    }
    this.counts.observations += 1;

    // G. Shape, the one-to-one relation and first naming.
    this.#identities(step, command, operation, observation, view);
  }

  /** Step D for one slot: the problem with its target, or `null`. */
  #target(slot: Slot, call: CallRecord, R: string | null, G: string | null, preliminary: ExecutionView | null, T: string | null): string | null {
    const args = call.args;
    switch (slot.role) {
      case "timers":
        return args.length === 0 ? null : "pendingTimers takes no argument";
      case "preliminary":
        return args[1] === R ? null : `the preliminary inspection addressed ${String(args[1])}, and the reference denotes ${String(R)}`;
      case "final":
        return args[1] === T ? null : `the final inspection addressed ${String(args[1])}, and the command's Execution is ${String(T)}`;
      case "operation+final":
        return args[1] === R ? null : `the inspection addressed ${String(args[1])}, and the reference denotes ${String(R)}`;
      case "operation":
        break;
    }
    switch (call.method) {
      case "createExecution":
        return null;
      case "submitInput": {
        const destination = (args[1] as { readonly destination?: unknown } | undefined)?.destination;
        return destination === R ? null : `the input went to ${String(destination)}, and the reference denotes ${String(R)}`;
      }
      case "submitOutcome": {
        const executionId = (args[1] as { readonly executionId?: unknown } | undefined)?.executionId;
        return executionId === R ? null : `the Outcome went to ${String(executionId)}, and the reference denotes ${String(R)}`;
      }
      case "fireTimer": {
        const key = args[0] as { readonly executionId?: unknown; readonly kind?: unknown; readonly generation?: unknown } | undefined;
        if (key?.executionId !== R) return `the fire went to ${String(key?.executionId)}, and the reference denotes ${String(R)}`;
        if (key.kind !== "wait_deadline" || String(key.generation) !== G) return `the fire named ${String(key.kind)} ${String(key.generation)}, and the generation reference denotes ${String(G)}`;
        return null;
      }
      case "recoverExecution":
      case "requestTakeover": {
        if (args[1] !== R) return `${call.method} went to ${String(args[1])}, and the reference denotes ${String(R)}`;
        const exchange = args[2] as { readonly activationId?: unknown; readonly writerEpoch?: unknown } | undefined;
        const open = preliminary?.activation ?? null;
        if (open === null) return "the preliminary inspection shows no open exchange";
        if (exchange?.activationId !== open.activationId) return `${call.method} named Activation ${String(exchange?.activationId)}, and the preliminary inspection shows ${open.activationId}`;
        if (call.method === "requestTakeover" && exchange.writerEpoch !== open.writerEpoch) return `the takeover named epoch ${String(exchange.writerEpoch)}, and the preliminary inspection shows ${open.writerEpoch}`;
        return null;
      }
      default:
        return args[1] === R ? null : `${call.method} went to ${String(args[1])}, and the reference denotes ${String(R)}`;
    }
  }

  /** Step G: the Observation's shape, the one-to-one relation over the run, and the first-naming rule. */
  #identities(step: number, command: Command, operation: CallRecord, observation: Observation, view: ExecutionView): void {
    const offers = this.#offers(command, operation);
    const fields = Object.keys(observation).sort();
    if (fields.length !== OBSERVATION_FIELDS.length || fields.some((field, index) => field !== OBSERVATION_FIELDS[index])) {
      this.#fail("shape", step, `the Observation's fields are ${fields.join(",")}`);
      return;
    }
    const eventScope = `event|${view.executionId}`;
    const generationScope = `generation|${view.executionId}`;
    const pairs: [scope: string, native: string, text: unknown, where: string][] = [["execution", view.executionId, observation.executionId, "executionId"]];
    const list = (where: string, shown: readonly string[] | null, native: readonly string[] | null): void => {
      if ((shown === null) !== (native === null)) {
        this.#fail("shape", step, `${where} is ${shown === null ? "null" : "a list"}, and the view's is ${native === null ? "null" : "a list"}`);
        return;
      }
      if (shown === null || native === null) return;
      if (!Array.isArray(shown) || shown.length !== native.length) {
        this.#fail("shape", step, `${where} has ${Array.isArray(shown) ? shown.length : "no"} members, and the view's has ${native.length}`);
        return;
      }
      native.forEach((id, index) => pairs.push([eventScope, id, shown[index], `${where}[${index}]`]));
    };
    // Generations first: a timeout's label is read from its generation's string.
    if ((observation.liveWaitGeneration === null) !== (view.wait === null)) this.#fail("shape", step, "liveWaitGeneration and the view's live wait disagree on presence");
    else if (view.wait !== null) pairs.push([generationScope, String(view.wait.generation), observation.liveWaitGeneration, "liveWaitGeneration"]);
    const readiness = observation.waitEndedReadiness;
    if (!Array.isArray(readiness) || readiness.length !== (view.waitEndedReadiness === null ? 0 : 1)) this.#fail("shape", step, "waitEndedReadiness and the view's readiness disagree on presence");
    else if (view.waitEndedReadiness !== null) pairs.push([generationScope, String(view.waitEndedReadiness.generation), readiness[0]?.generation, "waitEndedReadiness[0].generation"]);
    list("acknowledged", observation.acknowledged, view.acknowledged);
    list("queued", observation.queued, view.queued);
    list("terminalDispositions", observation.terminalDispositions, view.terminalDispositions);
    list("dispatchedBatch", observation.dispatchedBatch, view.activation === null ? null : view.activation.batch);
    if (this.#stopped) return;

    const before = new Map<string, Set<string>>();
    const denotedBefore = (scope: string, text: string): boolean => {
      let known = before.get(scope);
      if (known === undefined) {
        known = new Set(this.#nativeOf.get(scope)?.keys() ?? []);
        before.set(scope, known);
      }
      return known.has(text);
    };
    for (const [scope] of pairs) denotedBefore(scope, "");
    for (const [scope, native, text, where] of pairs) {
      if (this.#stopped) return;
      this.counts.pairs += 1;
      if (typeof text !== "string") {
        this.#fail("shape", step, `${where} is not a string`);
        return;
      }
      const strings = this.#stringOf.get(scope) ?? new Map<string, string>();
      const natives = this.#nativeOf.get(scope) ?? new Map<string, string>();
      this.#stringOf.set(scope, strings);
      this.#nativeOf.set(scope, natives);
      const known = strings.get(native);
      if (known !== undefined) {
        if (known !== text) this.#fail("relation", step, `${where}: ${native} was shown as ${JSON.stringify(known)} and is now ${JSON.stringify(text)}`);
        continue;
      }
      const holder = natives.get(text);
      if (holder !== undefined && holder !== native) {
        this.#fail("relation", step, `${where}: ${JSON.stringify(text)} denotes ${holder} and is now shown for ${native}`);
        continue;
      }
      strings.set(native, text);
      natives.set(text, native);
      // A first naming: the offered name if it denoted nothing before this command, otherwise something new.
      const direct = offers.get(`${scope}|${native}`);
      let preferred: string | null = typeof direct === "string" ? direct : null;
      const labelled = offers.get(`label|${scope}|${native}`);
      if (preferred === null && labelled !== undefined && typeof labelled !== "string") {
        // Q2 b: the label is offered only when the generation took the name it was offered.
        const generationText = this.#stringOf.get(generationScope)?.get(labelled.generation);
        if (generationText === labelled.offeredName) preferred = `to-${generationText}`;
      }
      if (preferred !== null && !denotedBefore(scope, preferred)) {
        if (text !== preferred) this.#fail("naming", step, `${where}: ${native} was offered the free name ${JSON.stringify(preferred)} and is shown as ${JSON.stringify(text)}`);
      } else if (denotedBefore(scope, text)) {
        this.#fail("naming", step, `${where}: ${native} is new and is shown under ${JSON.stringify(text)}, which already denoted an ID`);
      }
    }
  }

  /** The names this command offered, keyed by scope and native ID, from the command and the raw answer. */
  #offers(command: Command, operation: CallRecord): Map<string, string | { readonly generation: string; readonly offeredName: string }> {
    const offers = new Map<string, string | { readonly generation: string; readonly offeredName: string }>();
    if (command.kind === "create" || command.kind === "create_retry") {
      const answer = operation.answer as Answer<{ readonly executionId: string; readonly initialEventId: string }>;
      if (answer.ok && answer.value !== undefined) {
        offers.set(`execution|${answer.value.executionId}`, command.executionId);
        offers.set(`event|${answer.value.executionId}|${answer.value.initialEventId}`, command.initialInput.eventId);
      }
    } else if (command.kind === "accept_event") {
      const answer = operation.answer as Answer<{ readonly eventId: string }>;
      const execution = (operation.args[1] as { readonly destination: string }).destination;
      if (answer.ok && answer.value !== undefined) offers.set(`event|${execution}|${answer.value.eventId}`, command.event.eventId);
    } else if (command.kind === "submit_outcome" || command.kind === "resubmit_outcome") {
      const answer = operation.answer as Answer<{ readonly wait: WaitOutcome | null }>;
      const execution = (operation.args[1] as { readonly executionId: string }).executionId;
      const next = command.outcome.next;
      if (answer.ok && answer.value !== undefined && next.step === "await" && answer.value.wait !== null) {
        const wait = answer.value.wait;
        offers.set(`generation|${execution}|${wait.generation}`, next.wait.generation);
        if (wait.timeoutEventId !== null) offers.set(`label|event|${execution}|${wait.timeoutEventId}`, { generation: String(wait.generation), offeredName: next.wait.generation });
      }
    } else if (command.kind === "deliver_timer") {
      const answer = operation.answer as { readonly timeoutEventId: string | null };
      const execution = (operation.args[0] as { readonly executionId: string }).executionId;
      if (answer.timeoutEventId !== null) offers.set(`event|${execution}|${answer.timeoutEventId}`, command.timeoutEvent.eventId);
    }
    return offers;
  }

  /** Rule 5's record: the name an accepted create or input answer offered for its input Event, kept from the first offer. */
  #rememberInputs(command: Command, operation: CallRecord): void {
    if (command.kind === "create" || command.kind === "create_retry") {
      const answer = operation.answer as Answer<{ readonly executionId: string; readonly initialEventId: string }>;
      if (answer.ok && answer.value !== undefined) this.#rememberInput(answer.value.executionId, answer.value.initialEventId, command.initialInput.eventId);
    } else if (command.kind === "accept_event") {
      const answer = operation.answer as Answer<{ readonly eventId: string }>;
      if (answer.ok && answer.value !== undefined) this.#rememberInput((operation.args[1] as { readonly destination: string }).destination, answer.value.eventId, command.event.eventId);
    }
  }

  #rememberInput(execution: string, eventId: string, name: string): void {
    const offered = this.#offeredInputs.get(execution) ?? new Map<string, string>();
    this.#offeredInputs.set(execution, offered);
    if (!offered.has(eventId)) offered.set(eventId, name);
  }

  /**
   * Addendum 01 §A1, written again here from the table: the code of the first row that fails, or `null`. The
   * view is the final inspection's recorded answer; it must describe `T`.
   */
  #contradiction(command: Command, operation: CallRecord, T: string | null, view: ExecutionView): string | null {
    if (view.executionId !== T) return "execution";
    const entryOf = (eventId: string): MailboxEntryView | undefined => view.mailbox.find((entry) => entry.eventId === eventId);
    const inputClaim = (eventId: string, name: string): string | null => {
      const entry = entryOf(eventId);
      if (entry === undefined || entry.sourceCategory !== "application_input") return "input_entry";
      return carriedName(entry) === name ? null : "input_payload";
    };
    let claimed: string | null = null;
    if (command.kind === "create" || command.kind === "create_retry") {
      const answer = operation.answer as Answer<{ readonly initialEventId: string }>;
      if (answer.ok && answer.value !== undefined) claimed = inputClaim(answer.value.initialEventId, command.initialInput.eventId);
    } else if (command.kind === "accept_event") {
      const answer = operation.answer as Answer<{ readonly eventId: string }>;
      if (answer.ok && answer.value !== undefined) claimed = inputClaim(answer.value.eventId, command.event.eventId);
    } else if (command.kind === "submit_outcome" || command.kind === "resubmit_outcome") {
      const answer = operation.answer as Answer<{ readonly wait: WaitOutcome | null }>;
      if (answer.ok && answer.value !== undefined) {
        const wait = answer.value.wait;
        if ((wait !== null) !== (command.outcome.next.step === "await")) claimed = "wait_presence";
        else if (wait !== null) {
          const retired = view.retiredWaits.find((candidate) => candidate.generation === wait.generation);
          const registeredBy = view.wait !== null && view.wait.generation === wait.generation ? view.wait.registeredBy : retired?.registeredBy;
          if (registeredBy !== command.outcome.activationId) claimed = "wait_activation";
          else if (wait.result === "expired" && wait.timeoutEventId === null) claimed = "wait_timeout";
          else if (wait.timeoutEventId !== null) {
            const entry = entryOf(wait.timeoutEventId);
            const belongs = entry !== undefined && entry.sourceCategory === "kernel_timeout" && entry.waitGeneration === wait.generation && retired?.endingEventId === wait.timeoutEventId;
            if (!belongs) claimed = "timeout_generation";
          }
        }
      }
    } else if (command.kind === "deliver_timer") {
      const answer = operation.answer as { readonly timeoutEventId: string | null };
      const generation = (operation.args[0] as { readonly generation: number }).generation;
      const held = view.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout" && entry.waitGeneration === generation);
      const agrees = answer.timeoutEventId === null ? held.length === 0 : held.length === 1 && held[0]?.eventId === answer.timeoutEventId;
      if (!agrees) claimed = "timeout_generation";
    }
    if (claimed !== null) return claimed;
    // Rule 5 at printing: every input entry carries the name it was first offered.
    const offered = this.#offeredInputs.get(view.executionId);
    for (const entry of view.mailbox) {
      if (entry.sourceCategory !== "application_input") continue;
      const name = offered?.get(entry.eventId);
      if (name === undefined) return "input_unoffered";
      if (carriedName(entry) !== name) return "input_payload";
    }
    return null;
  }
}

/** Runs the oracle over a run's records and returns its problems and counts. */
export function judge(run: { readonly records: readonly StepRecord[] }): { readonly problems: readonly string[]; readonly counts: OracleCounts; readonly oracle: Oracle } {
  const oracle = new Oracle();
  for (const record of run.records) oracle.check(record);
  return { problems: oracle.problems, counts: oracle.counts, oracle };
}
