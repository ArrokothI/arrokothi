/**
 * The positive human-wait predicate (K1.4 design 02, D01-CHK-02).
 *
 * A total function of native store records. It never reads the Effect or resumption processors'
 * private in-flight sets, and "runnable" reads the store's `READY`, never the scheduler FIFO, so
 * the window between a settlement's commit and its enqueue classifies as `continue`.
 *
 * `await` is declared only when every non-terminal lineage member is in an awaitable human pause:
 * nothing else can then wake the lineage, because the stock controllers have no native timer
 * (B-NATIVE-TIMERS), so only Kernel input can advance it. Every other non-terminal case is `open`:
 * the exchange stays `RUNNING` with no Outcome until the lineage changes.
 */

import type {
  ChildExecutionLink, ConfirmationRequest, ControllerResumption, ExecutionContext, ExecutionWait, PendingOperation,
} from "@arrokothi/core";
import type { Pause } from "./codec.ts";

export interface MemberRecords {
  readonly context: ExecutionContext;
  readonly pendingOperations: readonly PendingOperation[];
  readonly confirmations: readonly ConfirmationRequest[];
  readonly resumptions: readonly ControllerResumption[];
  /** Links where this member is the parent, in creation order. */
  readonly children: readonly ChildExecutionLink[];
}

export interface LineageRecords {
  readonly rootExecutionId: string;
  readonly members: ReadonlyMap<string, MemberRecords>;
}

export type LineageDecision =
  | { readonly kind: "complete" }
  | { readonly kind: "fail" }
  | { readonly kind: "native_cancelled" }
  | { readonly kind: "continue" }
  | { readonly kind: "await"; readonly pauses: readonly Pause[] }
  | { readonly kind: "open"; readonly reason: string };

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export const isTerminalLifecycle = (lifecycle: string): boolean => TERMINAL.has(lifecycle);

/** Whether the member's own wait accepts an application `external.input` Event. */
export function waitsForInput(wait: ExecutionWait | null): boolean {
  if (wait === null) return false;
  if (wait.kind === "event") return wait.wake.eventKinds.includes("external.input");
  if (wait.kind === "dependencies") return wait.event?.eventKinds.includes("external.input") ?? false;
  return false;
}

const pendingConfirmationFor = (member: MemberRecords, operation: PendingOperation): ConfirmationRequest | undefined =>
  member.confirmations.find(request => request.state === "pending" && request.pendingOperationId === operation.pendingOperationId);

/**
 * Why `member` is not in an awaitable human pause, or `null` when it is.
 *
 * `member` is `WAITING`, and the caller has already checked that no lineage member is runnable or
 * running and no resumption is pending.
 */
function notAwaitable(lineage: LineageRecords, member: MemberRecords, seen: Set<string>): string | null {
  const id = member.context.executionId;
  if (seen.has(id)) return `cycle at ${id}`;
  seen.add(id);
  let human = waitsForInput(member.context.waitingFor);
  for (const operation of member.pendingOperations) {
    if (operation.status !== "pending") continue;
    switch (operation.effectKind) {
      case "use_capability":
      case "write_memory":
        if (operation.dispatch === "not_dispatched" && pendingConfirmationFor(member, operation)) {
          human = true;
          break;
        }
        return `${operation.effectKind} ${operation.pendingOperationId} is in flight`;
      case "spawn_execution": {
        const link = member.children.find(candidate => candidate.pendingOperationId === operation.pendingOperationId);
        const child = link && lineage.members.get(link.childExecutionId);
        if (!child || isTerminalLifecycle(child.context.lifecycle)) return `child of ${operation.pendingOperationId} is settling`;
        const why = notAwaitable(lineage, child, seen);
        if (why !== null) return why;
        human = true;
        break;
      }
      default:
        return `${operation.effectKind} ${operation.pendingOperationId} has no Kernel-visible human pause`;
    }
  }
  return human ? null : `${id} waits on nothing a human can answer`;
}

/** The pauses in the legacy host priority order: own confirmation, own input, then required-call children. */
function pausesOf(lineage: LineageRecords, member: MemberRecords, out: Pause[], seen: Set<string>): void {
  const id = member.context.executionId;
  if (seen.has(id)) return;
  seen.add(id);
  for (const request of member.confirmations) {
    if (request.state === "pending") out.push({ kind: "confirmation", executionId: id, confirmationId: request.confirmationId });
  }
  if (waitsForInput(member.context.waitingFor)) out.push({ kind: "input", executionId: id });
  for (const link of member.children) {
    if (link.state !== "active" || link.pendingOperationId === null) continue;
    const child = lineage.members.get(link.childExecutionId);
    if (child && !isTerminalLifecycle(child.context.lifecycle)) pausesOf(lineage, child, out, seen);
  }
}

export function classifyLineage(lineage: LineageRecords): LineageDecision {
  const root = lineage.members.get(lineage.rootExecutionId);
  if (!root) throw new Error(`native root ${lineage.rootExecutionId} is missing from its own lineage`);
  if (root.context.lifecycle === "COMPLETED") return { kind: "complete" };
  if (root.context.lifecycle === "FAILED") return { kind: "fail" };
  if (root.context.lifecycle === "CANCELLED") return { kind: "native_cancelled" };
  const live = [...lineage.members.values()].filter(member => !isTerminalLifecycle(member.context.lifecycle));
  if (live.some(member => member.context.lifecycle === "READY")) return { kind: "continue" };
  const busy = live.find(member => member.context.lifecycle !== "WAITING");
  if (busy) return { kind: "open", reason: `${busy.context.executionId} is ${busy.context.lifecycle}` };
  const resuming = live.find(member => member.resumptions.some(resumption => resumption.state === "pending"));
  if (resuming) return { kind: "open", reason: `${resuming.context.executionId} has a pending controller resumption` };
  for (const member of live) {
    const why = notAwaitable(lineage, member, new Set());
    if (why !== null) return { kind: "open", reason: why };
  }
  const pauses: Pause[] = [];
  pausesOf(lineage, root, pauses, new Set());
  return pauses.length > 0 ? { kind: "await", pauses } : { kind: "open", reason: "no human pause is open" };
}
