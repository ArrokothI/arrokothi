/**
 * K1.3 design 03 (revised): an independent reference for the owner's successor check, for the
 * bounded search (`owner-successor-search.test.ts`) and the named controls (`owner-guards.test.ts`).
 *
 * Nothing here is imported from `state.ts`. The reference reads an Execution through the owner's public
 * readers and its inspection view (`referenceRecord`), applies a plan to that reading the way design 03
 * says each arm commits it (`referenceDecision`), and judges the result with its own statement of the
 * rules: the stale-plan checks the arms keep, successor construction, T1–T6 against the old record,
 * then P1–P9 over the whole next record. It names the first rule a plan breaks, in the owner's order, so
 * a search can compare the owner's refusal clause with it.
 *
 * `preservationViolations` is a second, simpler oracle: the guards design 02 stated directly over plan
 * fields and the result. It does not share the reference's predicates, so an omission both the owner and
 * the reference make (design check 03's one-way readiness clause) still shows.
 */

import type { ExecutionView, MailboxDisposition } from "../src/index.ts";
import type { ExecutionState } from "../src/lifecycle.ts";
import type { LiveWait, Plan, Readiness, RetiredWait } from "../src/plan.ts";
import type { ExecutionReader } from "../src/state.ts";
import type { SourceCategory } from "../src/waits.ts";

/** One mailbox entry as the rules see it. */
export interface ReferenceEntry {
  readonly eventId: string;
  readonly sourceCategory: SourceCategory;
  readonly disposition: MailboxDisposition;
  readonly waitGeneration: number | null;
  readonly deadline: number | null;
}

/** The governed part of one Execution record. */
export interface ReferenceRecord {
  readonly state: ExecutionState;
  readonly registrations: number;
  readonly wait: LiveWait | null;
  readonly readiness: Readiness | null;
  readonly exchange: { readonly activationId: string; readonly batch: readonly string[] } | null;
  readonly cancelled: boolean;
  readonly retiredWaits: readonly RetiredWait[];
  readonly mailbox: readonly ReferenceEntry[];
}

/** Reads the governed part of an Execution through its reader and a fresh inspection view. */
export function referenceRecord(reader: ExecutionReader): ReferenceRecord {
  const view: ExecutionView = reader.inspection();
  return {
    state: view.state,
    registrations: reader.registrations,
    wait: reader.wait,
    readiness: reader.readiness,
    exchange: view.activation === null ? null : { activationId: view.activation.activationId, batch: [...view.activation.batch] },
    cancelled: view.cancellation !== null,
    retiredWaits: [...view.retiredWaits],
    mailbox: view.mailbox.map((entry) => ({
      eventId: entry.eventId,
      sourceCategory: entry.sourceCategory,
      disposition: entry.disposition,
      waitGeneration: entry.sourceCategory === "kernel_timeout" ? entry.waitGeneration : null,
      deadline: entry.sourceCategory === "kernel_timeout" ? entry.deadline : null,
    })),
  };
}

/** The reference's judgement of one plan: the next record, or the first rule it breaks. */
export type ReferenceDecision =
  | { readonly accepted: true; readonly next: ReferenceRecord; readonly transition: null; readonly post: null }
  | { readonly accepted: false; readonly clause: string; readonly transition: string | null; readonly post: string | null };

type Arm = "input" | "dispatch" | "outcome" | "expiry" | "cancellation";

/** What a plan asks an arm to change, before positions are resolved. */
interface Requested {
  readonly arm: Arm;
  readonly state: ExecutionState;
  readonly registrations: number;
  readonly wait: LiveWait | null;
  readonly readiness: Readiness | null;
  readonly exchange: ReferenceRecord["exchange"];
  readonly cancelled: boolean;
  readonly retired: RetiredWait | null;
  readonly appended: ReferenceEntry | null;
  readonly acknowledgeAt: readonly number[];
  readonly acknowledgment: MailboxDisposition;
  readonly endAt: readonly number[];
  readonly ending: MailboxDisposition;
}

const QUEUED: MailboxDisposition = { kind: "queued" };
const TERMINAL: ReadonlySet<ExecutionState> = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

/** How each arm turns its plan into requested changes (design 03 Q1, each arm's change literal). */
function requested(old: ReferenceRecord, plan: Plan): Requested | "stale" | "not a successor arm" {
  const keep = { registrations: old.registrations, wait: old.wait, readiness: old.readiness, exchange: old.exchange, cancelled: old.cancelled };
  const none = { retired: null, appended: null, acknowledgeAt: [], acknowledgment: QUEUED, endAt: [], ending: QUEUED };
  switch (plan.kind) {
    case "input": {
      const woken = plan.woken;
      return {
        ...keep,
        ...none,
        arm: "input",
        state: woken === null ? old.state : "READY",
        wait: woken === null ? old.wait : null,
        readiness: plan.readiness === null ? old.readiness : plan.readiness,
        retired: woken,
        appended: { eventId: plan.entry.eventId, sourceCategory: "application_input", disposition: QUEUED, waitGeneration: null, deadline: null },
      };
    }
    case "dispatch":
      return { ...keep, ...none, arm: "dispatch", state: "RUNNING", readiness: null, exchange: { activationId: plan.activation.activationId, batch: [...plan.batch] } };
    case "outcome": {
      if (old.exchange === null || old.exchange.activationId !== plan.resolved.activationId) return "stale";
      const timeout = plan.timeout;
      return {
        ...keep,
        arm: "outcome",
        state: plan.nextState,
        registrations: plan.registrations,
        wait: plan.liveWait,
        readiness: plan.readiness,
        exchange: null,
        retired: plan.retired,
        appended: timeout === null ? null : { eventId: timeout.eventId, sourceCategory: "kernel_timeout", disposition: QUEUED, waitGeneration: timeout.generation, deadline: timeout.deadline },
        acknowledgeAt: plan.acknowledgeAt,
        acknowledgment: plan.acknowledgment,
        endAt: plan.endAt,
        ending: plan.ending,
      };
    }
    case "expiry": {
      const timeout = plan.timeout;
      return {
        ...keep,
        ...none,
        arm: "expiry",
        state: "READY",
        wait: null,
        readiness: plan.readiness,
        retired: plan.retired,
        appended: { eventId: timeout.eventId, sourceCategory: "kernel_timeout", disposition: QUEUED, waitGeneration: timeout.generation, deadline: timeout.deadline },
      };
    }
    case "cancellation": {
      const ended = plan.record.endedExchange;
      if ((old.exchange === null) !== (ended === null) || (old.exchange !== null && ended !== null && old.exchange.activationId !== ended.activationId)) return "stale";
      return { ...keep, ...none, arm: "cancellation", state: "CANCELLED", wait: null, readiness: null, exchange: null, cancelled: true, retired: plan.retired, endAt: plan.endAt, ending: plan.ending };
    }
    default:
      return "not a successor arm";
  }
}

/** The mailbox index a position names, as an own array index does: `-0` is 0; anything else must be an integer in range. */
function indexOf(old: ReferenceRecord, position: number): number | null {
  const key = String(position);
  if (!/^(0|[1-9][0-9]*)$/.test(key)) return null;
  const index = Number(key);
  return index < old.mailbox.length ? index : null;
}

/**
 * Applies a plan to the reading `old` and judges it. A stale plan or one that is not a successor arm's
 * is reported as `stale`; the search uses neither for anything else.
 */
export function referenceDecision(old: ReferenceRecord, plan: Plan): ReferenceDecision {
  const asked = requested(old, plan);
  const refused = (clause: string, transition: string | null = null, post: string | null = null): ReferenceDecision => ({ accepted: false, clause, transition, post });
  if (asked === "stale" || asked === "not a successor arm") return refused("stale");
  if (TERMINAL.has(old.state)) return refused("T1", "T1");
  // Construction: each position names an entry, and no entry is written twice.
  const writes = new Map<number, MailboxDisposition>();
  const acknowledged: number[] = [];
  const ended: number[] = [];
  for (const [positions, disposition, into] of [[asked.acknowledgeAt, asked.acknowledgment, acknowledged], [asked.endAt, asked.ending, ended]] as const) {
    for (const position of positions) {
      const index = indexOf(old, position);
      if (index === null || writes.has(index)) return refused("T2", "T2");
      writes.set(index, disposition);
      into.push(index);
    }
  }
  const next: ReferenceRecord = {
    state: asked.state,
    registrations: asked.registrations,
    wait: asked.wait,
    readiness: asked.readiness,
    exchange: asked.exchange,
    cancelled: asked.cancelled,
    retiredWaits: asked.retired === null ? old.retiredWaits : [...old.retiredWaits, asked.retired],
    mailbox: [...old.mailbox.map((entry, index) => (writes.has(index) ? { ...entry, disposition: writes.get(index)! } : entry)), ...(asked.appended === null ? [] : [asked.appended])],
  };
  const transition = transitionRule(old, asked, acknowledged, ended);
  const post = postStateRule(next);
  if (transition !== null) return refused(transition, transition, post);
  if (post !== null) return refused(post, null, post);
  return { accepted: true, next, transition: null, post: null };
}

/** T1–T6, written from design 03 Q3 and its revision: the first rule broken, or `null`. */
function transitionRule(old: ReferenceRecord, asked: Requested, acknowledged: readonly number[], ended: readonly number[]): string | null {
  const { arm } = asked;
  const appended = asked.appended;
  const retired = asked.retired;
  const sameExchange = (asked.exchange === null) === (old.exchange === null) && (asked.exchange === null || asked.exchange.activationId === old.exchange!.activationId);
  // T1: each arm's states and the fields it may change.
  const t1: Record<Arm, () => boolean> = {
    input: () =>
      sameExchange &&
      asked.cancelled === old.cancelled &&
      ended.length === 0 &&
      appended?.sourceCategory === "application_input" &&
      (retired === null ? asked.state === old.state && asked.wait === old.wait : old.state === "WAITING" && asked.state === "READY" && asked.wait === null),
    dispatch: () => old.state === "READY" && old.exchange === null && asked.state === "RUNNING" && asked.exchange !== null && asked.wait === old.wait && retired === null && appended === null && ended.length === 0,
    outcome: () => old.state === "RUNNING" && old.exchange !== null && asked.exchange === null && ["READY", "WAITING", "COMPLETED", "FAILED"].includes(asked.state) && (appended === null || appended.sourceCategory === "kernel_timeout"),
    expiry: () => old.state === "WAITING" && old.wait !== null && asked.state === "READY" && asked.wait === null && sameExchange && retired !== null && ended.length === 0 && appended?.sourceCategory === "kernel_timeout",
    cancellation: () => asked.state === "CANCELLED" && !old.cancelled && asked.wait === null && asked.readiness === null && asked.exchange === null && appended === null,
  };
  if (!t1[arm]()) return "T1";
  // T2: only queued entries are written, never back to queued; an appended entry is queued.
  const written = [...acknowledged.map((index) => [index, asked.acknowledgment] as const), ...ended.map((index) => [index, asked.ending] as const)];
  if (written.some(([index, disposition]) => old.mailbox[index]!.disposition.kind !== "queued" || disposition.kind === "queued")) return "T2";
  if (appended !== null && appended.disposition.kind !== "queued") return "T2";
  // T3: only the resolving Outcome acknowledges, the whole batch, by its Activation.
  if (ended.length > 0 && asked.ending.kind === "acknowledged") return "T3";
  if (arm === "outcome") {
    // Only batch entries, by the resolving Activation; afterwards the whole batch is acknowledged by it.
    const batch = old.exchange!.batch;
    const activationId = old.exchange!.activationId;
    const acknowledgment = asked.acknowledgment;
    if (acknowledged.length > 0 && !(acknowledgment.kind === "acknowledged" && acknowledgment.activationId === activationId)) return "T3";
    if (!acknowledged.every((index) => batch.includes(old.mailbox[index]!.eventId))) return "T3";
    const after = (eventId: string): MailboxDisposition | undefined => {
      const index = old.mailbox.findIndex((entry) => entry.eventId === eventId);
      return index === -1 ? undefined : acknowledged.includes(index) ? acknowledgment : ended.includes(index) ? asked.ending : old.mailbox[index]!.disposition;
    };
    if (!batch.every((eventId) => { const disposition = after(eventId); return disposition?.kind === "acknowledged" && disposition.activationId === activationId; })) return "T3";
  } else if (acknowledged.length > 0) {
    return "T3";
  }
  // T4: a retirement copies its wait's facts and takes the arm's cause.
  const live = old.wait;
  const retiresLive = (cause: RetiredWait["retiredBy"], endingEventId: string | null): boolean =>
    live !== null &&
    retired !== null &&
    retired.generation === live.generation &&
    retired.registeredBy === live.registeredBy &&
    retired.declaration === live.declaration &&
    retired.deadline === live.deadline &&
    retired.retiredBy === cause &&
    retired.endingEventId === endingEventId;
  const t4: Record<Arm, () => boolean> = {
    input: () => retired === null || retiresLive("event", appended!.eventId),
    dispatch: () => retired === null,
    expiry: () => retiresLive("deadline", appended!.eventId),
    cancellation: () => (live === null ? retired === null : retiresLive("cancellation", null)),
    outcome: () => {
      const resolver = old.exchange!.activationId;
      return (asked.wait === null || asked.wait.registeredBy === resolver) && (retired === null || (retired.registeredBy === resolver && retired.retiredBy !== "cancellation"));
    },
  };
  if (!t4[arm]()) return "T4";
  // T5: Event and deadline retirements install readiness; dispatch and cancellation clear it; the rest keep it.
  if (retired !== null && retired.retiredBy !== "cancellation") {
    if (asked.readiness === null) return "T5";
  } else if (arm === "dispatch" || arm === "cancellation") {
    if (asked.readiness !== null) return "T5";
  } else if (asked.readiness !== old.readiness) {
    return "T5";
  }
  // T6: one more registration exactly when one is created; never two.
  const creates = old.wait === null && (asked.wait !== null || retired !== null);
  if ((asked.wait !== null && retired !== null) || asked.registrations !== old.registrations + (creates ? 1 : 0)) return "T6";
  return null;
}

/** P1–P9 over one whole record, written from design 03 Q2: the first clause broken, or `null`. */
export function postStateRule(record: ReferenceRecord): string | null {
  const terminal = TERMINAL.has(record.state);
  const { wait, readiness, mailbox, retiredWaits } = record;
  if (terminal && (wait !== null || readiness !== null || record.exchange !== null)) return "P1";
  if ((record.state === "WAITING") !== (wait !== null)) return "P2";
  if ((record.state === "RUNNING") !== (record.exchange !== null)) return "P3";
  if ((record.state === "CANCELLED") !== record.cancelled) return "P4";
  for (const entry of mailbox) {
    if (terminal && entry.disposition.kind === "queued") return "P1";
    if (!terminal && entry.disposition.kind === "terminal") return "P5";
  }
  const ledger = wait === null ? retiredWaits : [...retiredWaits, wait];
  if (ledger.length !== record.registrations || ledger.some((each, index) => each.generation !== index + 1 || each.deadline !== each.declaration.deadline)) return "P6";
  const timeouts = mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout");
  const deadlines = retiredWaits.filter((each) => each.retiredBy === "deadline");
  const matches = (each: RetiredWait, entry: ReferenceEntry): boolean => each.endingEventId === entry.eventId && each.generation === entry.waitGeneration && each.deadline === entry.deadline;
  if (timeouts.length !== deadlines.length || !timeouts.every((entry) => deadlines.filter((each) => matches(each, entry)).length === 1) || !deadlines.every((each) => timeouts.filter((entry) => matches(each, entry)).length === 1)) return "P7";
  for (const [index, each] of retiredWaits.entries()) {
    if (each.retiredBy === "cancellation" && !(index === retiredWaits.length - 1 && record.state === "CANCELLED" && each.endingEventId === null)) return "P8";
    if (each.retiredBy === "event" && !mailbox.some((entry) => entry.eventId === each.endingEventId && entry.sourceCategory !== "kernel_timeout")) return "P8";
    if (!["event", "deadline", "cancellation"].includes(each.retiredBy)) return "P8";
  }
  if (readiness !== null) {
    const last = retiredWaits.at(-1);
    if (record.state !== "READY" || last === undefined) return "P9";
    if (readiness.generation !== last.generation || readiness.species !== last.retiredBy || readiness.selector !== last.declaration || readiness.timeoutEventId !== (last.retiredBy === "deadline" ? last.endingEventId : null)) return "P9";
    if (mailbox.find((entry) => entry.eventId === last.endingEventId)?.disposition.kind !== "queued") return "P9";
  }
  return null;
}

/** The governed parts of two readings that must agree once a plan is accepted. */
export function governedDifferences(actual: ReferenceRecord, expected: ReferenceRecord): string[] {
  const out: string[] = [];
  for (const field of ["state", "registrations", "wait", "readiness", "cancelled"] as const) if (actual[field] !== expected[field]) out.push(field);
  if (JSON.stringify(actual.exchange) !== JSON.stringify(expected.exchange)) out.push("exchange");
  if (actual.retiredWaits.length !== expected.retiredWaits.length || actual.retiredWaits.some((each, index) => each !== expected.retiredWaits[index])) out.push("retiredWaits");
  if (JSON.stringify(actual.mailbox) !== JSON.stringify(expected.mailbox)) out.push("mailbox");
  return out;
}

/**
 * Design 02's guards stated directly over an accepted plan and the record it left: an independent check
 * of what the reference also claims. Each line names the guard it restates.
 */
export function preservationViolations(before: ReferenceRecord, plan: Plan, after: ReferenceRecord): string[] {
  const out: string[] = [];
  const queued = after.mailbox.filter((entry) => entry.disposition.kind === "queued").length;
  if (TERMINAL.has(after.state) && (queued > 0 || after.wait !== null || after.readiness !== null)) out.push("S2: a terminal record holds nothing queued, no wait and no readiness");
  if (after.retiredWaits.some((each, index) => each.generation !== index + 1)) out.push("S4: retired generations run 1, 2, …");
  if (after.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout").length !== after.retiredWaits.filter((each) => each.retiredBy === "deadline").length) out.push("S4: one timeout per deadline retirement");
  if (plan.kind === "outcome") {
    if ((plan.retired === null) !== (plan.readiness === null)) out.push("S5: an Outcome's retirement and readiness come together");
    if ((plan.nextState === "WAITING") !== (plan.liveWait !== null)) out.push("S3: WAITING exactly with a live wait");
    if (plan.liveWait !== null && plan.retired !== null) out.push("S3: never both a live and a retired wait");
    if ((plan.retired !== null && plan.retired.retiredBy === "deadline") !== (plan.timeout !== null)) out.push("S4: a timeout exactly for a deadline retirement");
    const batch = before.exchange?.batch ?? [];
    const acknowledged = after.mailbox.filter((entry, index) => before.mailbox[index]?.disposition.kind === "queued" && entry.disposition.kind === "acknowledged").map((entry) => entry.eventId);
    if (JSON.stringify([...acknowledged].sort()) !== JSON.stringify([...batch].sort())) out.push("B-5: the whole reserved batch is acknowledged");
  }
  if (plan.kind === "input" && (plan.woken === null) !== (plan.readiness === null)) out.push("S5: a wake and its readiness come together");
  if (plan.kind === "expiry" && (after.readiness === null || after.retiredWaits.at(-1)?.retiredBy !== "deadline")) out.push("S5: an expiry leaves deadline readiness");
  if (plan.kind === "dispatch" && after.readiness !== null) out.push("B-8: dispatch consumes readiness");
  if (plan.kind === "cancellation" && (after.state !== "CANCELLED" || queued > 0 || after.readiness !== null)) out.push("S2: a cancellation ends everything");
  return out;
}

/** The clause an owner refusal names (`P1`–`P9`, `T1`–`T6`), or `stale` for a refusal that names none. */
export function refusalClause(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.startsWith("plan refused")) throw error;
  const named = /\(([PT][0-9]), S[1-5]:/.exec(message);
  return named === null ? "stale" : named[1]!;
}
