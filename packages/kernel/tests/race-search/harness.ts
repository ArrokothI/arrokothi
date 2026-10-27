/**
 * K13-9's harness: runs one word of the declared alphabet against a real coordinator and against the
 * reference model (`model.ts`), and compares them after every step (design 01 § K13-9; addendum 01
 * §§ A2, A3).
 *
 * After each step it compares, from independent expectations:
 * - the answer: its kind, classification and decision fields; an exact retry's receipt or refusal by
 *   reference (`===`) to the one first returned;
 * - the whole inspection view, projected onto model names through one injective map from Kernel IDs to
 *   names, built when each ID is first seen and never rebuilt; payloads against the copies the harness
 *   submitted; receipts by boundary and position; every operational delivery row;
 * - the pending-timer listing, against the model's own derivation;
 * - every Activation the Driver received, its carried Events and their payloads;
 * - the Driver cancellation requests;
 * - invariants INV-1–INV-12, checked on the observed view alone;
 * - design 03's post-state witness: after every plan the owner accepts, its full post-state predicate on
 *   the record the commit left (K1.3, owner choice 05).
 *
 * It drives the core coordinator with canonical bytes, not the live-value facade, so the search spends
 * its time in the Kernel. A failure is a string naming the step and the mismatch.
 */

import {
  ExecutionCoordinator,
  type Activation,
  type AuthenticatedCaller,
  type DeliverySettlement,
  type ExecutionView,
  type OutcomeEnvelope,
  type Receipt,
  type RefusalRecord,
  type SubmissionGrant,
} from "../../src/index.ts";
import type { Plan } from "../../src/plan.ts";
import { KernelState } from "../../src/state.ts";
import {
  ALPHABET,
  eligible,
  initial,
  learn,
  pendingTimers,
  stepCancel,
  stepDispatch,
  stepExecutionFire,
  stepInput,
  stepOutcome,
  stepReport,
  stepWaitFire,
  type Expected,
  type Letter,
  type Model,
  type Proposal,
} from "./model.ts";

/** The first post-state violation an accepted plan's committed record showed in the current run, or `null`. */
let witnessed: string | null = null;
const originalApply = KernelState.prototype.apply;
const postStateViolation = KernelState.prototype.postStateViolation;
KernelState.prototype.apply = function (this: KernelState, plan: Plan): void {
  Reflect.apply(originalApply, this, [plan]);
  if (witnessed !== null) return;
  const violation = Reflect.apply(postStateViolation, this, [plan.executionId]) as string | null;
  if (violation !== null) witnessed = `${plan.kind}: ${violation}`;
};

const encoder = new TextEncoder();
const bytes = (json: string): Uint8Array => encoder.encode(json);
const PROGRESS = '{"phase":"x"}';

export interface Seed {
  readonly name: string;
  readonly executionDeadline: number | null;
  readonly prefix: readonly Letter[];
  /** Checks the state the prefix must reach (addendum 01 § A3: seed prefixes are validated). */
  readonly check: (view: ExecutionView, model: Model) => string | null;
}

export const SEEDS: readonly Seed[] = [
  { name: "S0", executionDeadline: null, prefix: [], check: (v) => (v.state === "READY" && v.queued.length === 1 ? null : "S0 is READY with I0 queued") },
  { name: "S1", executionDeadline: 25, prefix: [], check: (v) => (v.state === "READY" && v.executionDeadline === 25 ? null : "S1 is READY with Execution deadline 25") },
  { name: "S2", executionDeadline: null, prefix: ["d", "w"], check: (v) => (v.state === "WAITING" && v.wait?.generation === 1 && v.wait.deadline === 10 ? null : "S2 is WAITING on g1, deadline 10") },
  { name: "S3", executionDeadline: null, prefix: ["d", "w", "e"], check: (v, m) => (v.state === "READY" && v.waitEndedReadiness?.species === "event" && m.held.length === 1 ? null : "S3 is READY with Event readiness, holding the stale g1 key") },
  { name: "S4", executionDeadline: null, prefix: ["d", "w", "e", "d", "w"], check: (v, m) => (v.state === "WAITING" && v.wait?.generation === 2 && m.held.length === 2 ? null : "S4 is WAITING on g2, holding g1 and g2") },
  { name: "S5", executionDeadline: null, prefix: ["d", "w", "t"], check: (v) => (v.state === "READY" && v.waitEndedReadiness?.species === "deadline" && v.queued.length === 1 ? null : "S5 is READY with deadline readiness, T1 queued") },
  { name: "S6", executionDeadline: 25, prefix: ["d", "w"], check: (v) => (v.state === "WAITING" && v.wait?.deadline === 10 && v.executionDeadline === 25 ? null : "S6 is WAITING with both deadlines") },
  { name: "S7", executionDeadline: null, prefix: ["d"], check: (v) => (v.state === "RUNNING" && v.activation?.batch.length === 1 ? null : "S7 is RUNNING with batch [I0]") },
];

export interface StepRecord {
  readonly letter: Letter;
  readonly stateBefore: string;
  readonly skipped: boolean;
  readonly answer: unknown;
}

export interface RunResult {
  readonly failure: string | null;
  readonly steps: readonly StepRecord[];
  /** The final view, with Kernel IDs readable through `name`; `null` when the run failed. */
  readonly view: ExecutionView | null;
  readonly name: (id: string) => string;
}

/** Corruptions the oracle must reject (addendum 01 § A2's negative controls). */
export type Corruption =
  | "null-payload-after-cancel"
  | "omit-pending-timer"
  | "rename-event"
  | "retry-receipt-copy"
  | "corrupt-cancellation";

interface Kept {
  readonly activation: Activation;
  readonly grant: SubmissionGrant;
  readonly settlement: DeliverySettlement;
  reported: boolean;
}

/** One run of `seed`'s prefix followed by `word`, at batch bound `bound`. */
export function runWord(seed: Seed, word: readonly Letter[], bound: number, corruption: Corruption | null = null): RunResult {
  const kept: Kept[] = [];
  const requests: { cause: string; attempt: string | null }[] = [];
  let reading = 0;
  witnessed = null;
  const kernel = new ExecutionCoordinator({
    driver: {
      driverId: "race-search",
      deliver(activation: Activation, settlement: DeliverySettlement, grant: SubmissionGrant): undefined {
        kept.push({ activation, grant, settlement, reported: false });
        return undefined;
      },
      requestCancellation(request: { readonly cause: string; readonly attempt: { readonly activationId: string } | null }): undefined {
        requests.push({ cause: request.cause, attempt: request.attempt === null ? null : request.attempt.activationId });
        return undefined;
      },
    } as never,
    clock: { now: () => reading },
  });
  const who: AuthenticatedCaller = { namespace: "search", scopes: ["tenant"], cancelScopes: ["tenant"] };
  const created = kernel.createExecution(who, {
    creationKey: "search",
    scope: "tenant",
    definitionRevision: "d@1",
    runtimeContractRevision: "r@1",
    progressCodec: "c@1",
    authorityContext: bytes("null"),
    initialInput: { kind: "application.request", payload: bytes('{"n":0}'), subscriptionClass: "x" },
    ...(seed.executionDeadline === null ? {} : { executionDeadline: seed.executionDeadline }),
  });
  if (!created.ok) return { failure: `creation refused: ${created.error.reason}`, steps: [], view: null, name: (id) => id };
  const executionId = created.value.executionId;
  const model = initial(seed.executionDeadline);

  // One injective map from Kernel IDs to model names, never rebuilt (A21).
  const nameOf = new Map<string, string>();
  const idOf = new Map<string, string>();
  const bind = (id: string, name: string): string | null => {
    const known = nameOf.get(id);
    if (known !== undefined) return known === name ? null : `ID ${id} was ${known}, now named ${name}`;
    if (idOf.has(name)) return `name ${name} already belongs to ${idOf.get(name)}, not ${id}`;
    nameOf.set(id, name);
    idOf.set(name, id);
    return null;
  };
  const mapped = (id: string): string => nameOf.get(id) ?? `<unmapped ${id}>`;
  bind(created.value.initialEventId, "I0");

  const acceptedReceipts = new Map<string, Receipt>();
  const loserRefusals = new Map<string, RefusalRecord>();
  let lastCall: { envelope: OutcomeEnvelope; grant: SubmissionGrant; proposal: Proposal } | null = null;
  let previous: ExecutionView | null = null;
  const steps: StepRecord[] = [];
  if (seed.prefix.length === 0) {
    const start = (kernel.inspect(who, executionId) as { ok: true; value: ExecutionView }).value;
    const seedProblem = seed.check(start, model);
    if (seedProblem !== null) return { failure: `${seed.name}: seed state invalid: ${seedProblem}`, steps, view: null, name: mapped };
    previous = start;
  }

  const letters = [...seed.prefix, ...word];
  for (let index = 0; index < letters.length; index += 1) {
    const letter = letters[index]!;
    const where = `${seed.name}${seed.prefix.length > 0 ? ` (${seed.prefix.join(" ")})` : ""} | ${word.join(" ")} | B=${bound} | step ${index + 1} '${letter}'`;
    const stateBefore = model.state;
    let expected: Expected;
    let observed: unknown;
    let skipped = false;
    let problem: string | null = null;

    if (letter === "i" || letter === "e") {
      const cls = letter === "e" ? "s" : "x";
      const n = model.inputs + 100 * (index + 1);
      const payload = { n };
      expected = stepInput(model, cls, payload);
      const answer = kernel.submitInput(who, { destination: executionId, requestKey: `k${index}`, kind: "application.note", payload: bytes(JSON.stringify(payload)), subscriptionClass: cls });
      observed = answer;
      if (expected.kind === "accepted") {
        const want = expected.answer as { event: string; position: number };
        if (!answer.ok) problem = `input refused as ${answer.error.classification}; expected acceptance`;
        else problem = bind(answer.value.eventId, want.event) ?? (answer.value.acceptancePosition === want.position ? null : `input position ${answer.value.acceptancePosition}, expected ${want.position}`);
      } else problem = compareRefusal(answer, expected);
    } else if (letter === "d") {
      expected = stepDispatch(model, bound);
      const answer = kernel.dispatch(who, executionId, { bound });
      observed = answer;
      if (expected.kind === "accepted") {
        const want = expected.answer as { activation: string; batch: string[] };
        if (!answer.ok) problem = `dispatch refused as ${answer.error.classification}; expected acceptance`;
        else problem = bind(answer.value.activationId, want.activation) ?? sameList(answer.value.batch.map(mapped), want.batch, "dispatch batch");
      } else problem = compareRefusal(answer, expected);
    } else if (letter === "c" || letter === "w" || letter === "z" || letter === "k" || letter === "r") {
      let call: { envelope: OutcomeEnvelope; grant: SubmissionGrant; proposal: Proposal } | null = null;
      if (letter === "r") call = lastCall;
      else {
        const newest = kept.at(-1);
        if (newest !== undefined) {
          const deadline = letter === "w" ? model.clock + 10 : letter === "z" ? model.clock : null;
          const next =
            letter === "c"
              ? { step: "continue" as const }
              : letter === "k"
                ? { step: "complete" as const, result: bytes("true") }
                : { step: "await" as const, wait: { subscriptions: [{ subscriptionClass: "s" }], deadline: deadline! } };
          const activation = newest.activation;
          call = {
            envelope: { executionId, activationId: activation.activationId, writerEpoch: activation.writerEpoch, baseProgressRevision: activation.baseProgressRevision, progress: bytes(PROGRESS), next } as OutcomeEnvelope,
            grant: newest.grant,
            proposal: { letter, activation: mapped(activation.activationId), deadline },
          };
        }
      }
      if (call === null) {
        expected = { kind: "skip" };
        skipped = true;
        observed = null;
      } else {
        lastCall = call;
        expected = stepOutcome(model, call.proposal);
        let answer = kernel.submitOutcome(who, call.envelope, call.grant) as AnyResult;
        // A21's negative control: a retry answered with an equal copy of the receipt, not the original.
        if (corruption === "retry-receipt-copy" && answer.ok && (answer.value as { replayed: boolean }).replayed) {
          const value = answer.value as { receipt: Receipt };
          answer = { ok: true, value: { ...value, receipt: { ...value.receipt } } };
        }
        observed = answer;
        problem = compareOutcome(answer, expected, call.proposal, mapped, bind, acceptedReceipts, loserRefusals);
      }
    } else if (letter === "t" || letter === "s") {
      const key = letter === "t" ? model.held.at(-1) : model.held[0];
      if (key === undefined) {
        expected = { kind: "skip" };
        skipped = true;
        observed = null;
      } else {
        model.clock = Math.max(model.clock, key.deadline);
        reading = model.clock;
        expected = stepWaitFire(model, key.generation);
        const answer = kernel.fireTimer({ executionId, kind: "wait_deadline", generation: key.generation });
        observed = answer;
        problem = compareFire(answer, expected, mapped, bind, executionId);
      }
    } else if (letter === "x") {
      // Addendum 01 § A3: with no Execution deadline, fire without advancing the clock.
      if (model.executionDeadline !== null) model.clock = Math.max(model.clock, model.executionDeadline);
      reading = model.clock;
      expected = stepExecutionFire(model);
      const answer = kernel.fireTimer({ executionId, kind: "execution_deadline", generation: null });
      observed = answer;
      problem = compareFire(answer, expected, mapped, bind, executionId);
    } else if (letter === "q") {
      expected = stepCancel(model);
      const answer = kernel.cancelExecution(who, executionId);
      observed = answer;
      const want = expected.kind === "accepted" ? (expected.answer as { changed: boolean; state: string }) : null;
      if (!answer.ok) problem = `cancellation refused as ${answer.error.classification}`;
      else if (want !== null && (answer.value.changed !== want.changed || answer.value.state !== want.state)) problem = `cancellation answered changed=${answer.value.changed} ${answer.value.state}; expected changed=${want.changed} ${want.state}`;
    } else {
      expected = stepReport(model);
      const capability = kept.find((candidate) => !candidate.reported);
      if (expected.kind === "skip" || capability === undefined) {
        skipped = true;
        observed = null;
        if ((expected.kind === "skip") !== (capability === undefined)) problem = "the model and the Driver disagree about unreported capabilities";
      } else {
        capability.reported = true;
        capability.settlement.delivered();
        observed = null;
      }
    }
    if (problem !== null) return { failure: `${where}: ${problem}`, steps, view: null, name: mapped };
    learn(model);

    let view = (kernel.inspect(who, executionId) as { ok: true; value: ExecutionView }).value;
    let listing = kernel.pendingTimers();
    // The negative controls corrupt one observation; the comparisons below must reject it.
    if (corruption !== null) ({ view, listing } = corrupt(corruption, view, listing, observed, letter, lastCall, acceptedReceipts));
    for (const entry of view.mailbox) {
      if (entry.sourceCategory === "kernel_timeout" && !nameOf.has(entry.eventId)) {
        const bound2 = bind(entry.eventId, `T${entry.waitGeneration}`);
        if (bound2 !== null) return { failure: `${where}: ${bound2}`, steps, view: null, name: mapped };
      }
    }
    const projected = project(view, mapped);
    const modelled = projectModel(model);
    const a = JSON.stringify(projected);
    const b = JSON.stringify(modelled);
    if (a !== b) return { failure: `${where}: the view differs from the model\n  observed ${a}\n  expected ${b}`, steps, view: null, name: mapped };
    const listed = JSON.stringify(listing.map((timer) => ({ kind: timer.kind, generation: timer.generation, deadline: timer.deadline })));
    if (listed !== JSON.stringify(pendingTimers(model))) return { failure: `${where}: pendingTimers listed ${listed}, expected ${JSON.stringify(pendingTimers(model))}`, steps, view: null, name: mapped };
    const carried = carriedProblem(kept, model, mapped);
    if (carried !== null) return { failure: `${where}: ${carried}`, steps, view: null, name: mapped };
    const named = requests.map((request) => ({ cause: request.cause, attempt: request.attempt === null ? null : mapped(request.attempt) }));
    if (JSON.stringify(named) !== JSON.stringify(model.requests)) return { failure: `${where}: cancellation requests ${JSON.stringify(named)}, expected ${JSON.stringify(model.requests)}`, steps, view: null, name: mapped };
    const invariant = invariants(view, previous, letter, observed, bound, mapped);
    if (invariant !== null) return { failure: `${where}: ${invariant}`, steps, view: null, name: mapped };
    if (witnessed !== null) return { failure: `${where}: the post-state witness finds ${witnessed}`, steps, view: null, name: mapped };
    if (index === seed.prefix.length - 1) {
      const seedProblem = seed.check(view, model);
      if (seedProblem !== null) return { failure: `${where}: seed prefix invalid: ${seedProblem}`, steps, view: null, name: mapped };
    }
    previous = view;
    if (index >= seed.prefix.length) steps.push({ letter, stateBefore, skipped, answer: observed });
  }
  return { failure: null, steps, view: previous, name: mapped };
}

// -- Answer comparisons -----------------------------------------------------------------------------

type AnyResult = { ok: true; value: unknown } | { ok: false; error: RefusalRecord };

function compareRefusal(answer: AnyResult, expected: Expected): string | null {
  if (expected.kind !== "refused") return "unexpected answer shape";
  if (answer.ok) return `accepted; expected refusal ${expected.classification}`;
  if (answer.error.classification !== expected.classification) return `refused as ${answer.error.classification}; expected ${expected.classification}`;
  return null;
}

function sameList(observed: readonly string[], expected: readonly string[], what: string): string | null {
  return JSON.stringify(observed) === JSON.stringify(expected) ? null : `${what} ${JSON.stringify(observed)}, expected ${JSON.stringify(expected)}`;
}

function compareOutcome(
  answer: AnyResult,
  expected: Expected,
  proposal: Proposal,
  mapped: (id: string) => string,
  bind: (id: string, name: string) => string | null,
  acceptedReceipts: Map<string, Receipt>,
  loserRefusals: Map<string, RefusalRecord>,
): string | null {
  if (expected.kind === "refused") {
    const problem = compareRefusal(answer, expected);
    if (problem !== null) return problem;
    const refusal = (answer as { ok: false; error: RefusalRecord }).error;
    if (expected.classification === "cancellation_terminal_conflict") {
      if (refusal.reason !== "cancellation accepted before Outcome acceptance") return `CX-6 reason "${refusal.reason}"`;
      const key = expected.retry!;
      const earlier = loserRefusals.get(key);
      if (expected.recorded) {
        if (earlier !== undefined) return "a losing proposal was recorded twice";
        loserRefusals.set(key, refusal);
      } else if (earlier !== refusal) return "an exact losing retry did not return the same retained refusal object";
    }
    return null;
  }
  if (expected.kind !== "accepted") return "unexpected expectation";
  if (!answer.ok) return `refused as ${answer.error.classification}: ${answer.error.reason}; expected acceptance`;
  const value = answer.value as { receipt: Receipt; replayed: boolean; nextState: string; acknowledged: readonly string[]; terminalDispositions: readonly string[]; wait: { generation: number; result: string; timeoutEventId: string | null } | null };
  const want = expected.answer as { replayOf?: string; nextState: string; acknowledged: string[]; terminal: string[]; wait: { generation: number; result: string; timeout: string | null } | null; receiptPosition: number };
  if (want.replayOf !== undefined) {
    if (!value.replayed) return "an exact Outcome retry was not answered as a replay";
    if (value.receipt !== acceptedReceipts.get(proposal.activation)) return "a replay did not return the original receipt object (A21)";
    return null;
  }
  if (value.replayed) return "a fresh Outcome answered as a replay";
  acceptedReceipts.set(proposal.activation, value.receipt);
  if (value.wait !== null && value.wait.timeoutEventId !== null && want.wait?.timeout != null) {
    const problem = bind(value.wait.timeoutEventId, want.wait.timeout);
    if (problem !== null) return problem;
  }
  const got = {
    nextState: value.nextState,
    acknowledged: value.acknowledged.map(mapped),
    terminal: value.terminalDispositions.map(mapped),
    wait: value.wait === null ? null : { generation: value.wait.generation, result: value.wait.result, timeout: value.wait.timeoutEventId === null ? null : mapped(value.wait.timeoutEventId) },
    receiptPosition: value.receipt.position,
  };
  const wanted = { nextState: want.nextState, acknowledged: want.acknowledged, terminal: want.terminal, wait: want.wait, receiptPosition: want.receiptPosition };
  return JSON.stringify(got) === JSON.stringify(wanted) ? null : `Outcome decision ${JSON.stringify(got)}, expected ${JSON.stringify(wanted)}`;
}

function compareFire(answer: { result: string; timeoutEventId: string | null }, expected: Expected, mapped: (id: string) => string, bind: (id: string, name: string) => string | null, _executionId: string): string | null {
  const want = (expected as { answer: { result: string; timeout: string | null } }).answer;
  if (answer.result !== want.result) return `fire answered ${answer.result} (${(answer as { reason?: string }).reason ?? ""}); expected ${want.result}`;
  if ((answer.timeoutEventId === null) !== (want.timeout === null)) return `fire named timeout ${answer.timeoutEventId}; expected ${want.timeout}`;
  if (answer.timeoutEventId !== null && want.timeout !== null) {
    const problem = bind(answer.timeoutEventId, want.timeout);
    if (problem !== null) return problem;
    if (mapped(answer.timeoutEventId) !== want.timeout) return `fire named ${mapped(answer.timeoutEventId)}, expected ${want.timeout}`;
  }
  return null;
}

// -- Projections ------------------------------------------------------------------------------------

const dispositionOf = (disposition: { kind: string; activationId?: string; reason?: string }, mapped: (id: string) => string): string =>
  disposition.kind === "queued" ? "queued" : disposition.kind === "acknowledged" ? `ack:${mapped(disposition.activationId!)}` : `term:${disposition.reason}`;

/** The observed view in model terms. Receipts by boundary and position; delivery rows by status. */
export function project(view: ExecutionView, mapped: (id: string) => string): unknown {
  const batch = view.activation === null ? [] : view.activation.batch;
  return {
    state: view.state,
    executionDeadline: view.executionDeadline,
    mailbox: view.mailbox.map((entry) => [
      mapped(entry.eventId),
      entry.sourceCategory,
      entry.subscriptionClass,
      JSON.stringify(entry.payload),
      entry.sourceCategory === "kernel_timeout" ? entry.waitGeneration : null,
      entry.sourceCategory === "kernel_timeout" ? entry.deadline : null,
      entry.acceptancePosition,
      dispositionOf(entry.disposition as never, mapped),
      batch.includes(entry.eventId),
    ]),
    activation: view.activation === null ? null : [mapped(view.activation.activationId), view.activation.baseProgressRevision, view.activation.batch.map(mapped), view.activation.receipt.position, view.activation.deliveries.map((row) => row.status)],
    exchanges: view.exchanges.map((exchange) => [mapped(exchange.activationId), exchange.baseProgressRevision, exchange.batch.map(mapped), exchange.dispatchReceipt.position, exchange.deliveries.map((row) => row.status)]),
    progressRevision: view.progressRevision,
    wait: view.wait === null ? null : [view.wait.generation, view.wait.deadline],
    readiness: view.waitEndedReadiness === null ? null : [view.waitEndedReadiness.species, view.waitEndedReadiness.generation, view.waitEndedReadiness.timeoutEventId === null ? null : mapped(view.waitEndedReadiness.timeoutEventId)],
    retired: view.retiredWaits.map((retired) => [retired.generation, retired.retiredBy, retired.endingEventId === null ? null : mapped(retired.endingEventId), retired.deadline]),
    fires: view.timerFires.map((fire) => [fire.timer, fire.generation, fire.observedAt, fire.result, fire.timeoutEventId === null ? null : mapped(fire.timeoutEventId)]),
    cancellation:
      view.cancellation === null
        ? null
        : [
            view.cancellation.cause,
            view.cancellation.position,
            view.cancellation.endedExchange === null ? null : mapped(view.cancellation.endedExchange.activationId),
            view.cancellation.endedExchange === null ? [] : view.cancellation.endedExchange.batch.map(mapped),
            view.cancellation.retiredGeneration,
            view.cancellation.terminalDispositions.map(mapped),
            view.cancellation.deliveries.map((row) => row.status),
          ],
    losing: view.losingOutcomes.map((loser) => [mapped(loser.activationId), loser.writerEpoch, loser.baseProgressRevision, loser.refusal.position]),
    refusals: view.refusals.map((refusal) => [refusal.classification, refusal.position]),
    receipts: view.receipts.map((receipt) => [receipt.boundary, receipt.position]),
    result: view.result === null ? null : view.result.kind,
  };
}

/** The model in the same terms. */
export function projectModel(m: Model): unknown {
  const batch = m.exchange === null ? [] : m.exchange.batch;
  const disposition = (d: Model["mailbox"][number]["disposition"]): string => (d.kind === "queued" ? "queued" : d.kind === "acknowledged" ? `ack:${d.activation}` : `term:${d.reason}`);
  const base = (activation: string): number => m.exchanges.find((exchange) => exchange.activation === activation)?.base ?? m.exchange?.base ?? m.cancellation?.ended?.base ?? 0;
  return {
    state: m.state,
    executionDeadline: m.executionDeadline,
    mailbox: m.mailbox.map((entry) => [entry.name, entry.category, entry.cls, JSON.stringify(entry.payload), entry.generation, entry.deadline, entry.position, disposition(entry.disposition), batch.includes(entry.name)]),
    activation: m.exchange === null ? null : [m.exchange.activation, m.exchange.base, m.exchange.batch, m.exchange.receiptPosition, m.exchange.deliveries.map((row) => row.status)],
    exchanges: m.exchanges.map((exchange) => [exchange.activation, exchange.base, exchange.batch, exchange.receiptPosition, exchange.deliveries.map((row) => row.status)]),
    progressRevision: m.progressRevision,
    wait: m.wait === null ? null : [m.wait.generation, m.wait.deadline],
    readiness: m.readiness === null ? null : [m.readiness.species, m.readiness.generation, m.readiness.timeout],
    retired: m.retired.map((retired) => [retired.generation, retired.by, retired.ending, retired.deadline]),
    fires: m.fires.map((fire) => [fire.timer, fire.generation, fire.observedAt, fire.result, fire.timeout]),
    cancellation:
      m.cancellation === null
        ? null
        : [
            m.cancellation.cause,
            m.cancellation.position,
            m.cancellation.ended === null ? null : m.cancellation.ended.activation,
            m.cancellation.ended === null ? [] : m.cancellation.ended.batch,
            m.cancellation.retiredGeneration,
            m.cancellation.terminal,
            m.cancellation.ended === null ? [] : m.cancellation.ended.deliveries.map((row) => row.status),
          ],
    losing: [...m.losing.values()].map((loser) => [loser.activation, 1, base(loser.activation), loser.refusalPosition]),
    refusals: m.refusals.map((refusal) => [refusal.classification, refusal.position]),
    receipts: m.receipts.map((receipt) => [receipt.boundary, receipt.position]),
    result: m.completed ? "completed" : null,
  };
}

/** Every Activation the Driver received carries the model's batch with the payloads the harness submitted. */
function carriedProblem(kept: readonly Kept[], m: Model, mapped: (id: string) => string): string | null {
  for (const { activation } of kept) {
    const name = mapped(activation.activationId);
    const exchange = m.exchanges.find((candidate) => candidate.activation === name) ?? (m.exchange?.activation === name ? m.exchange : null) ?? (m.cancellation?.ended?.activation === name ? m.cancellation.ended : null);
    if (exchange === null) return `the Driver holds ${name}, which the model never dispatched`;
    const carried = activation.events.map((event) => [mapped(event.eventId), event.sourceCategory, JSON.stringify(event.payload)]);
    const expected = exchange.batch.map((entryName) => {
      const entry = m.mailbox.find((candidate) => candidate.name === entryName)!;
      return [entry.name, entry.category, JSON.stringify(entry.payload)];
    });
    if (JSON.stringify(carried) !== JSON.stringify(expected)) return `${name} carried ${JSON.stringify(carried)}, expected ${JSON.stringify(expected)}`;
  }
  return null;
}

// -- Invariants (INV-1–INV-12), on the observed view alone --------------------------------------------

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

function invariants(view: ExecutionView, previous: ExecutionView | null, letter: Letter, observed: unknown, bound: number, mapped: (id: string) => string): string | null {
  const ids = view.mailbox.map((entry) => entry.eventId);
  if (new Set(ids).size !== ids.length) return "INV-1: an Event appears twice in the mailbox";
  const terminalNow = TERMINAL.has(view.state);
  if (previous !== null) {
    for (const before of previous.mailbox) {
      const now = view.mailbox.find((entry) => entry.eventId === before.eventId);
      if (now === undefined) return `INV-1: ${mapped(before.eventId)} was lost from the mailbox`;
      if (before.disposition.kind !== "queued" && JSON.stringify(now.disposition) !== JSON.stringify(before.disposition)) return `INV-1: ${mapped(before.eventId)}'s final disposition changed`;
      if (JSON.stringify(now.payload) !== JSON.stringify(before.payload)) return `INV-1: ${mapped(before.eventId)}'s retained payload changed`;
      if (before.disposition.kind === "queued" && now.disposition.kind === "acknowledged") {
        const by = view.exchanges.find((exchange) => exchange.activationId === (now.disposition as { activationId: string }).activationId);
        if (by === undefined || !by.batch.includes(now.eventId)) return `INV-1: ${mapped(now.eventId)} acknowledged by an Outcome whose batch did not hold it`;
      }
      if (before.disposition.kind === "queued" && now.disposition.kind === "terminal" && !terminalNow) return `INV-1: ${mapped(now.eventId)} terminal-disposed without a terminal decision`;
    }
    if (TERMINAL.has(previous.state)) {
      const frozen = (v: ExecutionView) => JSON.stringify([v.state, v.result, v.cancellation && { ...v.cancellation, deliveries: [] }, v.progressRevision, v.emissions, v.mailbox.map((entry) => entry.disposition), v.wait, v.retiredWaits, v.waitEndedReadiness, v.receipts]);
      if (frozen(view) !== frozen(previous)) return "INV-2: a terminal Execution changed";
    }
    if (letter === "p") {
      const strip = (v: ExecutionView) => JSON.stringify({ ...v, activation: v.activation && { ...v.activation, deliveries: [] }, exchanges: v.exchanges.map((exchange) => ({ ...exchange, deliveries: [] })), cancellation: v.cancellation && { ...v.cancellation, deliveries: [] } });
      if (strip(view) !== strip(previous)) return "INV-11: a delivery report changed something besides its own row";
    }
    if (view.progressRevision !== previous.progressRevision && letter !== "c" && letter !== "w" && letter !== "z" && letter !== "k" && letter !== "r") return "INV-10: progress changed outside an accepted Outcome";
    if (letter === "q" && previous.activation !== null && view.state === "CANCELLED" && previous.state !== "CANCELLED") {
      for (const id of previous.activation.batch) {
        if (view.mailbox.find((entry) => entry.eventId === id)?.disposition.kind !== "terminal") return `INV-12: the open exchange's ${mapped(id)} was not terminal-disposed at cancellation`;
      }
    }
    if (letter === "d" && previous.waitEndedReadiness !== null && view.activation !== null && previous.activation === null) {
      const inv7 = waitEndedBatchProblem(view, previous, bound, mapped);
      if (inv7 !== null) return inv7;
    }
  }
  if (terminalNow && (view.queued.length > 0 || view.wait !== null || view.waitEndedReadiness !== null || view.activation !== null)) return "INV-3: a terminal Execution keeps queued input, a wait, readiness or an exchange";
  if ((view.wait !== null) !== (view.state === "WAITING")) return "INV-4: a live generation exists exactly while WAITING";
  const timeouts = view.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout");
  const generations = timeouts.map((entry) => (entry.sourceCategory === "kernel_timeout" ? entry.waitGeneration : -1));
  if (new Set(generations).size !== generations.length) return "INV-5: two timeout Events for one generation";
  const byDeadline = view.retiredWaits.filter((retired) => retired.retiredBy === "deadline").map((retired) => retired.generation).sort();
  if (JSON.stringify([...generations].sort()) !== JSON.stringify(byDeadline)) return "INV-5: a timeout Event exists exactly for a generation retired by its deadline";
  if (view.waitEndedReadiness !== null) {
    if (view.state !== "READY") return "INV-6: readiness outside READY";
    if (!view.retiredWaits.some((retired) => retired.generation === view.waitEndedReadiness!.generation)) return "INV-6: readiness names a generation that is not retired";
  }
  if (view.state === "WAITING" && view.mailbox.some((entry) => entry.disposition.kind === "queued" && eligible({ category: entry.sourceCategory, cls: entry.subscriptionClass as "s" | "x" | null }))) return "INV-8: WAITING while a queued Event is eligible";
  if ((view.activation !== null) !== (view.state === "RUNNING")) return "INV-9: RUNNING exactly while one exchange is open";
  const positions = view.mailbox.map((entry) => entry.acceptancePosition);
  for (let index = 1; index < positions.length; index += 1) if (positions[index]! <= positions[index - 1]!) return "INV-10: mailbox positions do not strictly increase";
  const receiptPositions = view.receipts.map((receipt) => receipt.position);
  for (let index = 1; index < receiptPositions.length; index += 1) if (receiptPositions[index]! <= receiptPositions[index - 1]!) return "INV-10: receipt positions do not strictly increase";
  void observed;
  return null;
}

/** INV-7, restated by addendum 01 § A2. */
function waitEndedBatchProblem(view: ExecutionView, previous: ExecutionView, bound: number, mapped: (id: string) => string): string | null {
  const readiness = previous.waitEndedReadiness!;
  const batch = view.activation!.batch;
  if (batch.length === 0 || batch.length > bound) return `INV-7: a wait-ended batch of ${batch.length} at bound ${bound}`;
  const positions = batch.map((id) => view.mailbox.find((entry) => entry.eventId === id)!.acceptancePosition);
  for (let index = 1; index < positions.length; index += 1) if (positions[index]! <= positions[index - 1]!) return "INV-7: a wait-ended batch out of acceptance order";
  if (readiness.species === "deadline" && !batch.includes(readiness.timeoutEventId!)) return "INV-7: the mandatory timeout is missing";
  for (const id of batch) {
    const entry = view.mailbox.find((candidate) => candidate.eventId === id)!;
    if (id === readiness.timeoutEventId) continue;
    if (!eligible({ category: entry.sourceCategory, cls: entry.subscriptionClass as "s" | "x" | null })) return `INV-7: ${mapped(id)} is ineligible under the retired selector`;
  }
  if (readiness.species === "event") {
    const earliest = previous.mailbox.find((entry) => entry.disposition.kind === "queued" && eligible({ category: entry.sourceCategory, cls: entry.subscriptionClass as "s" | "x" | null }));
    if (earliest === undefined || !batch.includes(earliest.eventId)) return "INV-7: the mandatory earliest eligible Event is missing";
  }
  return null;
}

// -- Negative controls ----------------------------------------------------------------------------------

function corrupt(
  corruption: Corruption,
  view: ExecutionView,
  listing: ReturnType<ExecutionCoordinator["pendingTimers"]>,
  observed: unknown,
  letter: Letter,
  lastCall: unknown,
  acceptedReceipts: Map<string, Receipt>,
): { view: ExecutionView; listing: ReturnType<ExecutionCoordinator["pendingTimers"]> } {
  void lastCall;
  void acceptedReceipts;
  if (corruption === "null-payload-after-cancel" && view.state === "CANCELLED") {
    return { view: { ...view, mailbox: view.mailbox.map((entry) => (entry.sourceCategory === "application_input" ? { ...entry, payload: null } : entry)) as never }, listing };
  }
  if (corruption === "omit-pending-timer" && listing.length > 0) return { view, listing: listing.slice(1) };
  if (corruption === "rename-event" && view.mailbox.length > 1) {
    return { view: { ...view, mailbox: view.mailbox.map((entry, index) => (index === 1 ? { ...entry, eventId: `${entry.eventId}-renamed` } : entry)) as never }, listing };
  }
  if (corruption === "corrupt-cancellation" && view.cancellation !== null) {
    return { view: { ...view, cancellation: { ...view.cancellation, retiredGeneration: (view.cancellation.retiredGeneration ?? 0) + 7 } }, listing };
  }
  void observed;
  void letter;
  return { view, listing };
}

export { ALPHABET };
