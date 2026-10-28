/**
 * K13-9's reference model (design 01 § K13-9; addendum 01 §§ A2, A3).
 *
 * Written from the governing sources, not from the Kernel: it imports nothing from `src/`. Each letter
 * of the alphabet is one transition, and each rule cites its owner:
 *
 * - W: `waits.md` (Declare, Eligibility, Registering, Ending, Selecting) and worksheet W-1–W-9, B-1–B-8;
 * - C: `lifecycle.md` § Cancellation order and CX-1–CX-6;
 * - O: `execution-cycle.md` § Outcome acceptance and OA-1–OA-5;
 * - D: `execution-cycle.md` § Delivery reporting boundary;
 * - T: `operations.md` § Three clocks, CL-1–CL-3; owner choice 01 (fire-only Execution deadlines);
 * - I: `creation.md`, owner decision 1.
 *
 * The model names Events `I0`, `in1`, `in2`… in acceptance order of the harness's inputs, timeouts `T<g>`,
 * and Activations `A<n>`; the harness keeps one injective map from Kernel IDs to these names. It holds
 * every input's payload independently, so a transition that erased retained input is detected (A05).
 */

export type Letter = "i" | "e" | "d" | "c" | "w" | "z" | "k" | "r" | "t" | "s" | "x" | "q" | "p";
export const ALPHABET: readonly Letter[] = ["i", "e", "d", "c", "w", "z", "k", "r", "t", "s", "x", "q", "p"];

export type State = "READY" | "RUNNING" | "WAITING" | "COMPLETED" | "CANCELLED";
export type Disposition = { readonly kind: "queued" } | { readonly kind: "acknowledged"; readonly activation: string } | { readonly kind: "terminal"; readonly reason: string };

export interface Entry {
  readonly name: string;
  readonly category: "application_input" | "kernel_timeout";
  /** The subscription class: `x` never matches, `s` matches the script's waits. */
  readonly cls: "x" | "s" | null;
  readonly payload: unknown;
  readonly generation: number | null;
  readonly deadline: number | null;
  readonly position: number;
  disposition: Disposition;
}

export interface Delivery {
  readonly activation: string;
  readonly attempt: number;
  status: "pending" | "delivered";
}

export interface Exchange {
  readonly activation: string;
  readonly base: number;
  readonly batch: readonly string[];
  readonly receiptPosition: number;
  readonly deliveries: Delivery[];
}

export interface Retired {
  readonly generation: number;
  readonly by: "event" | "deadline" | "cancellation";
  readonly ending: string | null;
  readonly deadline: number;
}

export interface Fire {
  readonly timer: "wait_deadline" | "execution_deadline";
  readonly generation: number | null;
  readonly observedAt: number;
  readonly result: string;
  readonly timeout: string | null;
}

/** The content of one proposal, as far as the alphabet varies it. */
export interface Proposal {
  readonly letter: "c" | "w" | "z" | "k";
  readonly activation: string;
  /** The wait deadline an `await` carries, fixed when the proposal was made. */
  readonly deadline: number | null;
}

export interface AcceptedDecision {
  readonly proposal: Proposal;
  readonly receiptPosition: number;
  readonly nextState: State;
  readonly acknowledged: readonly string[];
  readonly terminal: readonly string[];
  readonly wait: { readonly generation: number; readonly result: string; readonly timeout: string | null } | null;
}

export interface Model {
  state: State;
  clock: number;
  readonly executionDeadline: number | null;
  readonly mailbox: Entry[];
  nextPosition: number;
  nextRefusal: number;
  readonly receipts: { readonly boundary: string; readonly position: number }[];
  readonly refusals: { readonly classification: string; readonly position: number }[];
  exchange: Exchange | null;
  readonly exchanges: Exchange[];
  activationsMinted: number;
  progressRevision: number;
  registrations: number;
  wait: { readonly generation: number; readonly deadline: number } | null;
  readiness: { readonly species: "event" | "deadline"; readonly generation: number; readonly timeout: string | null } | null;
  readonly retired: Retired[];
  readonly fires: Fire[];
  cancellation: { readonly cause: "explicit" | "execution_deadline"; readonly position: number; readonly ended: Exchange | null; readonly retiredGeneration: number | null; readonly terminal: readonly string[] } | null;
  /** Losing proposals, by their exact-retry key, in insertion order. */
  readonly losing: Map<string, { readonly activation: string; readonly refusalPosition: number }>;
  readonly accepted: Map<string, AcceptedDecision>;
  completed: boolean;
  last: Proposal | null;
  /** The wait timer keys the host holds: generation and deadline, in the order learned. */
  readonly held: { readonly generation: number; readonly deadline: number }[];
  readonly requests: { readonly cause: string; readonly attempt: string | null }[];
  /** Activations the Driver received, newest last. */
  readonly delivered: string[];
  /** Delivery capabilities in delivery order, and whether the harness has reported each. */
  readonly capabilities: { readonly activation: string; readonly attempt: number; reported: boolean }[];
  inputs: number;
}

export const EXPLICIT_REASON = "Execution ended as CANCELLED before this Event was acknowledged";
export const DEADLINE_REASON = "Execution ended as CANCELLED (its Execution deadline expired) before this Event was acknowledged";
export const COMPLETED_REASON = "Execution ended as COMPLETED before this Event was acknowledged";

/** The model just after creation: `READY`, the initial input `I0` (class `x`) queued at position 1. */
export function initial(executionDeadline: number | null): Model {
  return {
    state: "READY",
    clock: 0,
    executionDeadline,
    mailbox: [{ name: "I0", category: "application_input", cls: "x", payload: { n: 0 }, generation: null, deadline: null, position: 1, disposition: { kind: "queued" } }],
    nextPosition: 2,
    nextRefusal: 1,
    receipts: [{ boundary: "creation", position: 1 }],
    refusals: [],
    exchange: null,
    exchanges: [],
    activationsMinted: 0,
    progressRevision: 0,
    registrations: 0,
    wait: null,
    readiness: null,
    retired: [],
    fires: [],
    cancellation: null,
    losing: new Map(),
    accepted: new Map(),
    completed: false,
    last: null,
    held: [],
    requests: [],
    delivered: [],
    capabilities: [],
    inputs: 0,
  };
}

const terminal = (m: Model): boolean => m.state === "COMPLETED" || m.state === "CANCELLED";
const queued = (m: Model): Entry[] => m.mailbox.filter((entry) => entry.disposition.kind === "queued");
/** W-7: application input is eligible only by an equal subscription class; a timeout never is. */
export const eligible = (entry: Pick<Entry, "category" | "cls">): boolean => entry.category === "application_input" && entry.cls === "s";

/** What a step expects at the boundary: an accepted answer's decision, a refusal, or a skip. */
export type Expected =
  | { readonly kind: "skip" }
  | { readonly kind: "refused"; readonly classification: string; readonly recorded: boolean; readonly retry?: string }
  | { readonly kind: "accepted"; readonly answer: unknown };

const refuse = (m: Model, classification: string): Expected => {
  m.refusals.push({ classification, position: m.nextRefusal });
  m.nextRefusal += 1;
  return { kind: "refused", classification, recorded: true };
};

/** Accepts one input (I; W § Ending row 2, B-6 path B, B-8). */
export function stepInput(m: Model, cls: "x" | "s", payload: unknown): Expected {
  if (terminal(m)) return refuse(m, "terminal_destination");
  m.inputs += 1;
  const name = `in${m.inputs}`;
  const position = m.nextPosition;
  m.mailbox.push({ name, category: "application_input", cls, payload, generation: null, deadline: null, position, disposition: { kind: "queued" } });
  m.receipts.push({ boundary: "input_ingress", position });
  m.nextPosition += 1;
  if (m.state === "WAITING" && m.wait !== null && cls === "s") {
    m.retired.push({ generation: m.wait.generation, by: "event", ending: name, deadline: m.wait.deadline });
    m.readiness = { species: "event", generation: m.wait.generation, timeout: null };
    m.wait = null;
    m.state = "READY";
  }
  return { kind: "accepted", answer: { event: name, position } };
}

/** Selects the batch at reservation (W § Selecting; B-2, B-4, B-6, B-7). */
export function selectBatch(m: Model, bound: number): string[] {
  const candidates = queued(m);
  const readiness = m.readiness;
  if (readiness === null) return candidates.slice(0, bound).map((entry) => entry.name);
  const eligibleNow = candidates.filter(eligible);
  const mandatory = readiness.species === "deadline" ? readiness.timeout! : eligibleNow[0]!.name;
  const chosen = new Set([mandatory]);
  for (const entry of eligibleNow) if (chosen.size < bound) chosen.add(entry.name);
  return candidates.filter((entry) => chosen.has(entry.name)).map((entry) => entry.name);
}

/** Dispatch (W § Selecting; lifecycle). */
export function stepDispatch(m: Model, bound: number): Expected {
  if (terminal(m)) return refuse(m, "terminal_destination");
  if (m.exchange !== null) return refuse(m, "exchange_unresolved");
  if (m.state === "WAITING") return refuse(m, "not_ready");
  const batch = selectBatch(m, bound);
  m.activationsMinted += 1;
  const activation = `A${m.activationsMinted}`;
  const position = m.nextPosition;
  m.receipts.push({ boundary: "dispatch_intent", position });
  m.nextPosition += 1;
  const exchange: Exchange = { activation, base: m.progressRevision, batch, receiptPosition: position, deliveries: [{ activation, attempt: 1, status: "pending" }] };
  m.exchange = exchange;
  m.readiness = null;
  m.state = "RUNNING";
  m.delivered.push(activation);
  m.capabilities.push({ activation, attempt: 1, reported: false });
  return { kind: "accepted", answer: { activation, batch } };
}

/**
 * A proposal's content, as OA-2 and CX-6 compare it: the step and the wait's deadline. `w` and `z` both
 * propose `await`; `w` at reading 0 and `z` at reading 10 propose the same content.
 */
const proposalKey = (proposal: Proposal): string =>
  `${proposal.activation}|${proposal.letter === "w" || proposal.letter === "z" ? "await" : proposal.letter}|${proposal.deadline ?? "-"}`;

/** One Outcome proposal for the newest Activation the Driver received (O; W § Registering; C/CX-6). */
export function stepOutcome(m: Model, proposal: Proposal): Expected {
  const prior = m.accepted.get(proposal.activation);
  m.last = proposal;
  if (prior !== undefined) {
    if (proposalKey(prior.proposal) === proposalKey(proposal)) return { kind: "accepted", answer: { replayOf: proposal.activation } };
    return refuse(m, "duplicate_conflict");
  }
  if (m.state === "CANCELLED") {
    const key = proposalKey(proposal);
    const indexed = m.losing.get(key);
    if (indexed !== undefined) return { kind: "refused", classification: "cancellation_terminal_conflict", recorded: false, retry: key };
    m.losing.set(key, { activation: proposal.activation, refusalPosition: m.nextRefusal });
    refuse(m, "cancellation_terminal_conflict");
    return { kind: "refused", classification: "cancellation_terminal_conflict", recorded: true, retry: key };
  }
  if (m.state === "COMPLETED") return refuse(m, "terminal_destination");
  const exchange = m.exchange;
  if (exchange === null || exchange.activation !== proposal.activation) return refuse(m, "stale_exchange");

  const position = m.nextPosition;
  m.receipts.push({ boundary: "outcome_acceptance", position });
  m.nextPosition += 1;
  m.progressRevision += 1;
  const acknowledged: string[] = [];
  for (const entry of m.mailbox) {
    if (entry.disposition.kind === "queued" && exchange.batch.includes(entry.name)) {
      entry.disposition = { kind: "acknowledged", activation: exchange.activation };
      acknowledged.push(entry.name);
    }
  }
  m.exchanges.push(exchange);
  m.exchange = null;
  const ended: string[] = [];
  let wait: AcceptedDecision["wait"] = null;
  let nextState: State;
  if (proposal.letter === "c") {
    nextState = "READY";
  } else if (proposal.letter === "k") {
    nextState = "COMPLETED";
    for (const entry of queued(m)) {
      entry.disposition = { kind: "terminal", reason: COMPLETED_REASON };
      ended.push(entry.name);
    }
    m.completed = true;
  } else {
    const generation = m.registrations + 1;
    m.registrations = generation;
    const deadline = proposal.deadline!;
    const waking = queued(m).find(eligible);
    if (waking !== undefined) {
      m.retired.push({ generation, by: "event", ending: waking.name, deadline });
      m.readiness = { species: "event", generation, timeout: null };
      // Never listed: the host holds the key the decision names (addendum 01 § A2).
      m.held.push({ generation, deadline });
      wait = { generation, result: "woken", timeout: null };
      nextState = "READY";
    } else if (m.clock >= deadline) {
      const timeout = `T${generation}`;
      m.mailbox.push({ name: timeout, category: "kernel_timeout", cls: null, payload: null, generation, deadline, position, disposition: { kind: "queued" } });
      m.retired.push({ generation, by: "deadline", ending: timeout, deadline });
      m.readiness = { species: "deadline", generation, timeout };
      m.held.push({ generation, deadline });
      wait = { generation, result: "expired", timeout };
      nextState = "READY";
    } else {
      m.wait = { generation, deadline };
      wait = { generation, result: "waiting", timeout: null };
      nextState = "WAITING";
    }
  }
  m.state = nextState;
  m.accepted.set(proposal.activation, { proposal, receiptPosition: position, nextState, acknowledged, terminal: ended, wait });
  return { kind: "accepted", answer: { activation: proposal.activation, nextState, acknowledged, terminal: ended, wait, receiptPosition: position } };
}

/** A wait timer fire (W-3, W-9; design 01 § 7). The host has already advanced the clock to its deadline. */
export function stepWaitFire(m: Model, generation: number): Expected {
  const retired = m.retired.find((record) => record.generation === generation) ?? null;
  const live = m.wait !== null && m.wait.generation === generation ? m.wait : null;
  let fire: Fire;
  let answer: { result: string; timeout: string | null };
  if (generation > m.registrations) answer = { result: "stale", timeout: null };
  else if (retired !== null && retired.by === "deadline") answer = { result: "duplicate", timeout: retired.ending };
  else if (live !== null && m.state === "WAITING") {
    if (m.clock < live.deadline) answer = { result: "not_due", timeout: null };
    else {
      const timeout = `T${generation}`;
      m.mailbox.push({ name: timeout, category: "kernel_timeout", cls: null, payload: null, generation, deadline: live.deadline, position: m.nextPosition, disposition: { kind: "queued" } });
      m.nextPosition += 1;
      m.retired.push({ generation, by: "deadline", ending: timeout, deadline: live.deadline });
      m.readiness = { species: "deadline", generation, timeout };
      m.wait = null;
      m.state = "READY";
      answer = { result: "expired", timeout };
    }
  } else answer = { result: "stale", timeout: null };
  fire = { timer: "wait_deadline", generation, observedAt: m.clock, result: answer.result, timeout: answer.timeout };
  m.fires.push(fire);
  return { kind: "accepted", answer };
}

/** One cancellation decision for either cause (C; CX-6; B-5). */
function cancel(m: Model, cause: "explicit" | "execution_deadline"): void {
  const reason = cause === "explicit" ? EXPLICIT_REASON : DEADLINE_REASON;
  const ended: string[] = [];
  for (const entry of queued(m)) {
    entry.disposition = { kind: "terminal", reason };
    ended.push(entry.name);
  }
  const live = m.wait;
  if (live !== null) m.retired.push({ generation: live.generation, by: "cancellation", ending: null, deadline: live.deadline });
  m.cancellation = { cause, position: m.nextPosition, ended: m.exchange, retiredGeneration: live === null ? null : live.generation, terminal: ended };
  m.requests.push({ cause, attempt: m.exchange === null ? null : m.exchange.activation });
  m.nextPosition += 1;
  m.exchange = null;
  m.wait = null;
  m.readiness = null;
  m.state = "CANCELLED";
}

/** The Execution-deadline fire (T, CL-1; owner choice 01: fire-only). */
export function stepExecutionFire(m: Model): Expected {
  let result: string;
  if (m.executionDeadline === null) result = "stale";
  else if (terminal(m)) result = m.cancellation !== null && m.cancellation.cause === "execution_deadline" ? "duplicate" : "stale";
  else if (m.clock < m.executionDeadline) result = "not_due";
  else {
    cancel(m, "execution_deadline");
    result = "cancelled";
  }
  m.fires.push({ timer: "execution_deadline", generation: null, observedAt: m.clock, result, timeout: null });
  return { kind: "accepted", answer: { result, timeout: null } };
}

/** Explicit cancellation (C; CX-2 for a terminal Execution). */
export function stepCancel(m: Model): Expected {
  if (terminal(m)) return { kind: "accepted", answer: { changed: false, state: m.state } };
  cancel(m, "explicit");
  return { kind: "accepted", answer: { changed: true, state: "CANCELLED" } };
}

/** The Driver reports its oldest unreported capability delivered (D: only that row changes). */
export function stepReport(m: Model): Expected {
  const capability = m.capabilities.find((candidate) => !candidate.reported);
  if (capability === undefined) return { kind: "skip" };
  capability.reported = true;
  const rows = [...m.exchanges.flatMap((exchange) => exchange.deliveries), ...(m.exchange?.deliveries ?? []), ...(m.cancellation?.ended?.deliveries ?? [])];
  const row = rows.find((candidate) => candidate.activation === capability.activation && candidate.attempt === capability.attempt);
  if (row !== undefined && row.status === "pending") row.status = "delivered";
  return { kind: "accepted", answer: null };
}

/** The pending-timer listing the model derives from its own state (addendum 01 § A2). */
export function pendingTimers(m: Model): { readonly kind: string; readonly generation: number | null; readonly deadline: number }[] {
  const listed: { kind: string; generation: number | null; deadline: number }[] = [];
  if (m.state === "WAITING" && m.wait !== null) listed.push({ kind: "wait_deadline", generation: m.wait.generation, deadline: m.wait.deadline });
  if (!terminal(m) && m.executionDeadline !== null) listed.push({ kind: "execution_deadline", generation: null, deadline: m.executionDeadline });
  return listed;
}

/** Learns the wait keys a listing names, keeping every key ever held, in the order learned. */
export function learn(m: Model): void {
  for (const timer of pendingTimers(m)) {
    if (timer.kind === "wait_deadline" && !m.held.some((key) => key.generation === timer.generation)) m.held.push({ generation: timer.generation!, deadline: timer.deadline });
  }
}
