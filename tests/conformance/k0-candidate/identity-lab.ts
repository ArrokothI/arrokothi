/**
 * K1.4-candidate: a laboratory for the candidate's identity rendering, and an independent oracle
 * (design 03; addendum 01 §A3).
 *
 * The **lab** drives `kernelCandidate` over a coordinator subclass that records, for every command:
 * each coordinator call with its arguments and the answer the candidate received, the last inspection
 * of that command (the one its Observation was built from), and the Observation or the error thrown.
 * It can inject a fault into an answer or an inspection, and it can make the candidate misbehave in one
 * declared way (`Tamper`) so the oracle's own rejections can be tested.
 *
 * The **oracle** judges those records. It never calls the candidate's name ledger and reads none of its
 * state. From the recorded answers and inspections alone it keeps its own relation between native IDs
 * and the strings Observations showed, and checks, per command and in this order: the one legal exit;
 * the Kernel call's target; the Observation's shape; that the relation stays one-to-one for the whole
 * run; and the first-naming rule. Problems are returned as `<code>: <detail>`.
 *
 * Test-side only. The candidate does not import this file.
 */

import { ExecutionCoordinator } from "@arrokothi/kernel";
import type { AuthenticatedCaller, ExecutionView, MailboxEntryView, WaitOutcome } from "@arrokothi/kernel";

import type { CandidateRefusal, CandidateRun, Command, Observation } from "../k0/fixture.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import type { FixtureEvent, OutcomeEnvelope, OutcomeNext, WaitRecord } from "../k0/protocol-vocabulary.ts";
import { AnswerContradiction, createKernelCandidate, UnknownLaboratoryReference } from "./kernel-candidate.ts";

export { AnswerContradiction, UnknownLaboratoryReference };
export type { ExecutionView };

// -- Records ------------------------------------------------------------------

export interface CallRecord {
  readonly method: string;
  readonly args: readonly unknown[];
  /** The answer as the candidate received it, after any injected fault. */
  readonly answer: unknown;
}

export interface StepRecord {
  /** The command as the laboratory issued it. */
  readonly command: Command;
  readonly calls: readonly CallRecord[];
  /** The last successful inspection of this command: the one its Observation was built from. */
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

/** One declared misbehavior of the candidate, for the oracle's rejection controls. */
export interface Tamper {
  /** The command actually given to the candidate; the record keeps the laboratory's. */
  readonly command?: (command: Command) => Command;
  /** An error to throw instead of running the command. */
  readonly refuse?: (command: Command) => Error | null;
  readonly observation?: (observation: Observation, previous: Observation | null) => Observation;
  /** An Observation to return instead of the error the candidate threw. */
  readonly recover?: (error: unknown, previous: Observation | null) => Observation | null;
}

export interface Lab {
  /** Runs one command and returns its record. Never throws for an error `apply` threw. */
  attempt(command: Command): StepRecord;
  /** Runs one command and returns its Observation; throws what `apply` threw. */
  apply(command: Command): Observation;
  readonly records: readonly StepRecord[];
}

type Method = "createExecution" | "submitInput" | "dispatch" | "redeliver" | "submitOutcome" | "requestTakeover" | "recoverExecution" | "cancelExecution" | "inspect" | "pendingTimers" | "fireTimer";
const METHODS: readonly Method[] = ["createExecution", "submitInput", "dispatch", "redeliver", "submitOutcome", "requestTakeover", "recoverExecution", "cancelExecution", "inspect", "pendingTimers", "fireTimer"];

export function startLab(options: { readonly faults?: Faults; readonly tamper?: Tamper } = {}): Lab {
  const faults = options.faults ?? {};
  const tamper = options.tamper ?? {};
  let calls: CallRecord[] = [];

  class Recording extends ExecutionCoordinator {}
  for (const method of METHODS) {
    const original = (ExecutionCoordinator.prototype as unknown as Record<string, (...args: unknown[]) => unknown>)[method] as (...args: unknown[]) => unknown;
    Object.defineProperty(Recording.prototype, method, {
      configurable: true,
      writable: true,
      value(this: ExecutionCoordinator, ...args: unknown[]): unknown {
        let answer = original.apply(this, args);
        if (method === "inspect" && faults.view !== undefined) {
          const inspected = answer as { readonly ok: boolean; readonly value?: ExecutionView };
          if (inspected.ok && inspected.value !== undefined) answer = { ...inspected, value: faults.view(inspected.value) };
        }
        if (faults.answer !== undefined) answer = faults.answer(method, args, answer);
        calls.push({ method, args, answer });
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
      const inspected = call.answer as { readonly ok?: boolean; readonly value?: ExecutionView };
      if (call.method === "inspect" && inspected.ok === true && inspected.value !== undefined) view = inspected.value;
    }
    const record: StepRecord = { command, calls, view, observation, thrown };
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
}

const carriedName = (entry: MailboxEntryView): unknown => {
  const payload = entry.payload as { readonly eventId?: unknown } | null;
  return payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload.eventId : undefined;
};

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

/** The native Execution, and for a fire the native generation, a recorded coordinator call addressed. */
function targetOf(call: CallRecord): { readonly execution: string | null; readonly generation: number | null } {
  const second = call.args[1] as { readonly destination?: string; readonly executionId?: string } | string | undefined;
  switch (call.method) {
    case "submitInput":
      return { execution: (second as { destination: string }).destination, generation: null };
    case "submitOutcome":
      return { execution: (second as { executionId: string }).executionId, generation: null };
    case "fireTimer": {
      const key = call.args[0] as { readonly executionId: string; readonly generation: number };
      return { execution: key.executionId, generation: key.generation };
    }
    case "dispatch":
    case "redeliver":
    case "requestTakeover":
    case "recoverExecution":
    case "cancelExecution":
    case "inspect":
      return { execution: second as string, generation: null };
    default:
      return { execution: null, generation: null };
  }
}

export interface OracleCounts {
  commands: number;
  observations: number;
  unknownReferences: number;
  contradictions: number;
  /** Identity positions paired with a native ID. */
  pairs: number;
}

export class Oracle {
  readonly problems: string[] = [];
  readonly counts: OracleCounts = { commands: 0, observations: 0, unknownReferences: 0, contradictions: 0, pairs: 0 };
  /** Per scope, native ID to the string shown, and its inverse. Built from records only. */
  readonly #stringOf = new Map<string, Map<string, string>>();
  readonly #nativeOf = new Map<string, Map<string, string>>();
  /** Per native Execution, the name each input Event was first offered, from the raw answers. */
  readonly #offeredInputs = new Map<string, Map<string, string>>();

  /** The native ID a string denotes in a scope, by this oracle's own relation. */
  denoted(scope: string, text: string): string | undefined {
    return this.#nativeOf.get(scope)?.get(text);
  }

  /** The string this oracle has seen for a native ID in a scope. */
  shown(scope: string, native: string): string | undefined {
    return this.#stringOf.get(scope)?.get(native);
  }

  #fail(code: string, step: number, detail: string): void {
    this.problems.push(`${code}: step ${step}: ${detail}`);
  }

  check(record: StepRecord): void {
    const step = this.counts.commands;
    this.counts.commands += 1;
    const { command } = record;

    // 1a. A reference whose string the relation does not hold must be refused, before any Kernel call.
    const references = referencesOf(command);
    const nativeExecution = references.execution === null ? null : this.denoted("execution", references.execution);
    const nativeGeneration =
      references.generation === null || nativeExecution === null || nativeExecution === undefined
        ? null
        : this.denoted(`generation|${nativeExecution}`, references.generation);
    if (nativeExecution === undefined || nativeGeneration === undefined) {
      if (!(record.thrown instanceof UnknownLaboratoryReference)) this.#fail("exit", step, "a reference that denotes nothing must throw UnknownLaboratoryReference");
      else if (record.calls.length !== 0) this.#fail("exit", step, "an unknown reference must be refused before any Kernel call");
      else this.counts.unknownReferences += 1;
      return;
    }

    // 2. The command's Kernel call went where the relation, as it stood before this command, points.
    const primary = command.kind === "inspect" ? record.calls.findLast((call) => call.method === "inspect") : record.calls.find((call) => call.method !== "inspect" && call.method !== "pendingTimers");
    if (primary === undefined) {
      if (record.thrown !== undefined) this.#fail("exit", step, `the command made no Kernel call and threw: ${String((record.thrown as Error)?.message ?? record.thrown)}`);
      else this.#fail("target", step, "the command made no Kernel call");
      return;
    }
    const target = targetOf(primary);
    if (nativeExecution !== null && target.execution !== nativeExecution) {
      this.#fail("target", step, `the call went to Execution ${String(target.execution)}, and ${JSON.stringify(references.execution)} denotes ${nativeExecution}`);
    }
    if (nativeGeneration !== null && String(target.generation) !== nativeGeneration) {
      this.#fail("target", step, `the fire named generation ${String(target.generation)}, and ${JSON.stringify(references.generation)} denotes ${nativeGeneration}`);
    }
    const inspection = record.calls.findLast((call) => call.method === "inspect");

    // 1b. An answer that contradicts the inspection must throw AnswerContradiction, with the same code.
    const offers = this.#offers(command, primary);
    const contradiction = record.view === null || inspection === undefined ? null : this.#contradiction(command, primary, inspection, record.view);
    if (contradiction !== null) {
      if (!(record.thrown instanceof AnswerContradiction)) this.#fail("exit", step, `the answer contradicts the inspection (${contradiction}) and the command did not throw AnswerContradiction`);
      else if (record.thrown.code !== contradiction) this.#fail("exit", step, `the contradiction is ${contradiction}, and the command threw ${record.thrown.code}`);
      else this.counts.contradictions += 1;
      return;
    }

    // 1c. Otherwise the command returns an Observation.
    if (record.observation === null || record.view === null) {
      this.#fail("exit", step, `no legal throw applies, and the command threw: ${String((record.thrown as Error)?.message ?? record.thrown)}`);
      return;
    }
    this.counts.observations += 1;
    const observation = record.observation;
    const view = record.view;

    // 3. Shape: the fixture's fields, and every identity list as long as the view's.
    const fields = Object.keys(observation).sort();
    if (fields.length !== OBSERVATION_FIELDS.length || fields.some((field, index) => field !== OBSERVATION_FIELDS[index])) {
      this.#fail("shape", step, `the Observation's fields are ${fields.join(",")}`);
      return;
    }
    const executionScope = "execution";
    const eventScope = `event|${view.executionId}`;
    const generationScope = `generation|${view.executionId}`;
    const pairs: [scope: string, native: string, text: unknown, where: string][] = [[executionScope, view.executionId, observation.executionId, "executionId"]];
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

    // 4 and 5. The relation stays one-to-one, and a first naming follows the rule.
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
      this.counts.pairs += 1;
      if (typeof text !== "string") {
        this.#fail("shape", step, `${where} is not a string`);
        continue;
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
  #offers(command: Command, primary: CallRecord): Map<string, string | { readonly generation: string; readonly offeredName: string }> {
    const offers = new Map<string, string | { readonly generation: string; readonly offeredName: string }>();
    if (command.kind === "create" || command.kind === "create_retry") {
      const answer = primary.answer as Answer<{ readonly executionId: string; readonly initialEventId: string }>;
      if (answer.ok && answer.value !== undefined) {
        offers.set(`execution|${answer.value.executionId}`, command.executionId);
        offers.set(`event|${answer.value.executionId}|${answer.value.initialEventId}`, command.initialInput.eventId);
        this.#rememberInput(answer.value.executionId, answer.value.initialEventId, command.initialInput.eventId);
      }
    } else if (command.kind === "accept_event") {
      const answer = primary.answer as Answer<{ readonly eventId: string }>;
      const execution = targetOf(primary).execution as string;
      if (answer.ok && answer.value !== undefined) {
        offers.set(`event|${execution}|${answer.value.eventId}`, command.event.eventId);
        this.#rememberInput(execution, answer.value.eventId, command.event.eventId);
      }
    } else if (command.kind === "submit_outcome" || command.kind === "resubmit_outcome") {
      const answer = primary.answer as Answer<{ readonly wait: WaitOutcome | null }>;
      const execution = targetOf(primary).execution as string;
      const next = command.outcome.next;
      if (answer.ok && answer.value !== undefined && next.step === "await" && answer.value.wait !== null) {
        const wait = answer.value.wait;
        offers.set(`generation|${execution}|${wait.generation}`, next.wait.generation);
        if (wait.timeoutEventId !== null) offers.set(`label|event|${execution}|${wait.timeoutEventId}`, { generation: String(wait.generation), offeredName: next.wait.generation });
      }
    } else if (command.kind === "deliver_timer") {
      const answer = primary.answer as { readonly timeoutEventId: string | null };
      const execution = targetOf(primary).execution as string;
      if (answer.timeoutEventId !== null) offers.set(`event|${execution}|${answer.timeoutEventId}`, command.timeoutEvent.eventId);
    }
    return offers;
  }

  #rememberInput(execution: string, eventId: string, name: string): void {
    const offered = this.#offeredInputs.get(execution) ?? new Map<string, string>();
    this.#offeredInputs.set(execution, offered);
    if (!offered.has(eventId)) offered.set(eventId, name);
  }

  /** Addendum 01 §A1, written again here from the table: the code of the first row that fails, or `null`. */
  #contradiction(command: Command, primary: CallRecord, inspection: CallRecord, view: ExecutionView): string | null {
    if (view.executionId !== inspection.args[1]) return "execution";
    const entryOf = (eventId: string): MailboxEntryView | undefined => view.mailbox.find((entry) => entry.eventId === eventId);
    const inputClaim = (eventId: string, name: string): string | null => {
      const entry = entryOf(eventId);
      if (entry === undefined || entry.sourceCategory !== "application_input") return "input_entry";
      return carriedName(entry) === name ? null : "input_payload";
    };
    let claimed: string | null = null;
    if (command.kind === "create" || command.kind === "create_retry") {
      const answer = primary.answer as Answer<{ readonly initialEventId: string }>;
      if (answer.ok && answer.value !== undefined) claimed = inputClaim(answer.value.initialEventId, command.initialInput.eventId);
    } else if (command.kind === "accept_event") {
      const answer = primary.answer as Answer<{ readonly eventId: string }>;
      if (answer.ok && answer.value !== undefined) claimed = inputClaim(answer.value.eventId, command.event.eventId);
    } else if (command.kind === "submit_outcome" || command.kind === "resubmit_outcome") {
      const answer = primary.answer as Answer<{ readonly wait: WaitOutcome | null }>;
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
      const answer = primary.answer as { readonly timeoutEventId: string | null };
      const generation = targetOf(primary).generation;
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

/** Runs the oracle over a lab's records and returns its problems and counts. */
export function judge(lab: Lab): { readonly problems: readonly string[]; readonly counts: OracleCounts; readonly oracle: Oracle } {
  const oracle = new Oracle();
  for (const record of lab.records) oracle.check(record);
  return { problems: oracle.problems, counts: oracle.counts, oracle };
}
