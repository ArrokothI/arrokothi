/**
 * The closed EffectRequest vocabulary.
 *
 * An Effect is a *request to interact with the runtime or the outside world*. It is not permission,
 * and it is not a claim that anything happened. A controller returns proposals as plain data; the
 * Harness assigns identity, authorizes, journals, dispatches, and eventually delivers an Event.
 *
 * The union is closed at the five accepted v0.4 kinds. The dispatchable subset is explicit; an
 * accepted but unimplemented kind is answered with a refusal rather than becoming a silent no-op.
 *
 * What is not an Effect: a function call, a parse, a local rerank over an already-exposed corpus, a
 * model inference that returns to the controller inside the same Activation, or a Stage computation.
 * Work is not an Effect merely because it is work - an Effect is work that crosses the Harness.
 */

import type { EventId } from "../interaction/event-envelope.ts";
import type { OperationRef, OperationRefInput } from "../operations/refs.ts";
import { isOperationRef, operationRef } from "../operations/refs.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";
import { isJsonObject, jsonIssues } from "../util/json.ts";
import type { EffectIdempotencyScope } from "./fingerprint.ts";
import { isEffectIdempotencyScope } from "./fingerprint.ts";
import type { CapabilityId, EffectId, OperationId, ResourceBindingId } from "./ids.ts";
import { capabilityId, isCapabilityId, isOperationId, isResourceBindingId, operationId, resourceBindingId } from "./ids.ts";

export type EffectKind =
  | "use_capability"
  | "write_memory"
  | "spawn_execution"
  | "send_message"
  | "request_user_input";

export const EFFECT_KINDS: readonly EffectKind[] = [
  "use_capability",
  "write_memory",
  "spawn_execution",
  "send_message",
  "request_user_input",
];

/** The kinds the runtime actually dispatches. Everything else is answered, never silently dropped. */
export const DISPATCHABLE_EFFECT_KINDS: readonly EffectKind[] = [
  "use_capability",
  "spawn_execution",
  "send_message",
];

export function isEffectKind(value: unknown): value is EffectKind {
  return typeof value === "string" && (EFFECT_KINDS as readonly string[]).includes(value);
}

/**
 * Evidence that an earlier observation appears to authorize this Effect.
 *
 * References, never conclusions. A controller may point at the Events it believes justify the
 * request; it may not assert `userConfirmed: true`, because that would let a model author its own
 * consent. Policy reads the evidence and decides.
 */
export interface AuthorizationEvidence {
  readonly eventIds?: readonly EventId[];
  readonly note?: string;
}

interface ProposalBase {
  /**
   * Controller-chosen label for the result.
   *
   * Becomes the `correlationId` of the resulting Event, so a controller can report
   * `await_event { correlationId: requestKey }` without ever learning the runtime's EffectId. When
   * omitted the Harness correlates on the EffectId instead, and the controller can only wait by
   * Event kind.
   */
  readonly requestKey?: string;
  readonly authorizationEvidence?: AuthorizationEvidence;
}

/**
 * Use a mediated capability against zero or more bound resources.
 *
 * `deadlineMs` is the *operation* deadline: how long this Effect may remain unresolved. It has
 * nothing to do with how long the current Activation is willing to stay occupied waiting for it.
 */
export interface UseCapabilityProposal extends ProposalBase {
  readonly kind: "use_capability";
  readonly capability: CapabilityId;
  readonly operation: OperationId;
  readonly input: JsonObject;
  readonly resources?: readonly ResourceBindingId[];
  readonly deadlineMs?: number;
  readonly idempotency?: EffectIdempotencyScope;
}

export interface WriteMemoryProposal extends ProposalBase {
  readonly kind: "write_memory";
  readonly key: string;
  readonly value: JsonValue;
}

export interface SpawnExecutionProposal extends ProposalBase {
  readonly kind: "spawn_execution";
  readonly definitionId: string;
  readonly definitionVersion: number;
  /** Delivered to the child as an `external.input` Event labelled `"spawn"` once it is READY. */
  readonly input?: JsonValue;
  /**
   * Operations the child is requested to receive.
   *
   * The child's effective operation authority is `requestedOperations ∩ the spawning Execution's
   * CURRENT effective operation authority` - an attenuation, never a grant. An **absent** request
   * means the child receives no operation authority; it is never read as "inherit everything". A
   * child Definition that declares operations does not change this: a Definition requirement is not
   * a grant.
   */
  readonly requestedOperations?: readonly OperationRef[];
  /**
   * `call` semantics.
   *
   * When `true`, the spawning Execution registers a `PendingOperation` on the child's terminal
   * result and is woken by a correlated `child.completed` / `child.failed` Event. When `false` or
   * absent (`spawn`), the child is created and runs independently and the parent observes only
   * `child.spawned`. Either way the child is the same independently managed Execution.
   */
  readonly awaitTerminalResult?: boolean;
}

/**
 * Communicate with an already-existing peer Execution.
 *
 * `send`, `ask`, and `reply` are the *same* Effect kind - there is no `AskMessage` or `ReplyMessage`.
 * They differ only in the completion dependency they create:
 *
 * ```text
 * send   awaitReply absent/false, inReplyToMessageId absent
 *        -> the sender's Effect settles as soon as the runtime admits the message; a `message.sent`
 *           acknowledgement Event tells the sender it was persisted for the destination (not that
 *           the recipient processed it)
 *
 * ask    awaitReply: true
 *        -> the sender's PendingOperation stays pending; a runtime-minted PeerRequestLink correlates
 *           it; the exact original PendingOperation settles only when the intended peer replies
 *
 * reply  to + inReplyToMessageId set, awaitReply absent/false
 *        -> an outbound send that also settles the asker's original `ask` PendingOperation. It must
 *           pass the responder's own current messaging policy, and it can settle only the exact
 *           request it names, only from the Execution that request expected.
 * ```
 *
 * The sender never names its own identity: `peer.message` carries a runtime-owned `fromExecutionId`.
 * A message/correlation id is integrity data, never a capability - holding one does not authorize a
 * reply or let a third Execution settle someone else's `ask`.
 */
export interface SendMessageProposal extends ProposalBase {
  readonly kind: "send_message";
  /**
   * The concrete destination Execution id. A reply names the original requester here as well as
   * naming the request link; policy can therefore authorize the actual outbound target before the
   * runtime resolves the link. The runtime later verifies the two agree and never redirects.
   */
  readonly to?: string;
  readonly body: JsonValue;
  /** `ask`: keep the sender's PendingOperation pending until the intended peer replies. */
  readonly awaitReply?: boolean;
  /**
   * `reply`: the runtime-minted message id of the peer request this message answers.
   *
   * The runtime checks that a matching open `PeerRequestLink` exists and that this Execution is the
   * peer it expected a reply from. A guessed id settles nothing.
   */
  readonly inReplyToMessageId?: string;
}

export interface RequestUserInputProposal extends ProposalBase {
  readonly kind: "request_user_input";
  readonly prompt: string;
  readonly schema?: JsonObject;
}

/** What a controller returns. Data only - no handles, no callbacks, no executor. */
export type EffectProposal =
  | UseCapabilityProposal
  | WriteMemoryProposal
  | SpawnExecutionProposal
  | SendMessageProposal
  | RequestUserInputProposal;

/**
 * What the Harness records: the validated proposal plus runtime-assigned identity and provenance.
 *
 * The proposal is preserved verbatim so the persisted request is exactly what was asked for, and a
 * later reviewer can tell the difference between "this is what the controller wanted" and "this is
 * what policy allowed".
 */
export interface EffectRequest {
  readonly effectId: EffectId;
  readonly kind: EffectKind;
  readonly proposal: EffectProposal;
  readonly correlationId: string;
  /** The Activation that produced the proposal. */
  readonly causationId: string | null;
  readonly requestedAt: string;
}

export interface EffectProposalIssue {
  readonly path: string;
  readonly message: string;
}

function issue(path: string, message: string): EffectProposalIssue {
  return { path, message };
}

/**
 * Structural validation of one proposal.
 *
 * Runs before identity is assigned and before any authorization is consulted: a malformed request
 * is refused as data, not denied as policy, and the two must stay distinguishable in the journal.
 */
export function effectProposalIssues(proposal: unknown, path: string): readonly EffectProposalIssue[] {
  if (proposal === null || typeof proposal !== "object" || Array.isArray(proposal)) {
    return [issue(path, "expected an effect proposal object")];
  }
  const candidate = proposal as Record<string, unknown>;
  if (!isEffectKind(candidate["kind"])) {
    return [
      issue(
        `${path}.kind`,
        `unknown effect kind ${JSON.stringify(candidate["kind"])}; expected one of ${EFFECT_KINDS.join(", ")}`,
      ),
    ];
  }

  const issues: EffectProposalIssue[] = [];
  const requestKey = candidate["requestKey"];
  if (requestKey !== undefined && (typeof requestKey !== "string" || requestKey.length === 0)) {
    issues.push(issue(`${path}.requestKey`, "expected a non-empty string when present"));
  }
  const evidence = candidate["authorizationEvidence"];
  if (evidence !== undefined) {
    if (evidence === null || typeof evidence !== "object" || Array.isArray(evidence)) {
      issues.push(issue(`${path}.authorizationEvidence`, "expected an object when present"));
    } else {
      const eventIds = (evidence as Record<string, unknown>)["eventIds"];
      if (eventIds !== undefined && (!Array.isArray(eventIds) || eventIds.some((id) => typeof id !== "string"))) {
        issues.push(issue(`${path}.authorizationEvidence.eventIds`, "expected an array of event ids"));
      }
    }
  }

  switch (candidate["kind"] as EffectKind) {
    case "use_capability": {
      if (!isCapabilityId(candidate["capability"])) {
        issues.push(issue(`${path}.capability`, "expected a capability id"));
      }
      if (!isOperationId(candidate["operation"])) {
        issues.push(issue(`${path}.operation`, "expected an operation id"));
      }
      if (!isJsonObject(candidate["input"])) {
        issues.push(issue(`${path}.input`, "expected a serializable JSON object"));
      }
      const resources = candidate["resources"];
      if (resources !== undefined) {
        if (!Array.isArray(resources) || !resources.every(isResourceBindingId)) {
          issues.push(issue(`${path}.resources`, "expected an array of resource binding ids"));
        }
      }
      const deadlineMs = candidate["deadlineMs"];
      if (deadlineMs !== undefined && (typeof deadlineMs !== "number" || !Number.isFinite(deadlineMs) || deadlineMs <= 0)) {
        issues.push(issue(`${path}.deadlineMs`, "expected a positive number of milliseconds when present"));
      }
      const idempotency = candidate["idempotency"];
      if (idempotency !== undefined && !isEffectIdempotencyScope(idempotency)) {
        issues.push(issue(`${path}.idempotency`, `expected "none" or "per_input"`));
      }
      break;
    }
    case "write_memory": {
      if (typeof candidate["key"] !== "string" || candidate["key"].length === 0) {
        issues.push(issue(`${path}.key`, "expected a non-empty memory key"));
      }
      issues.push(...jsonIssues(candidate["value"], `${path}.value`).map((i) => issue(i.path, i.message)));
      break;
    }
    case "spawn_execution": {
      if (typeof candidate["definitionId"] !== "string" || candidate["definitionId"].length === 0) {
        issues.push(issue(`${path}.definitionId`, "expected a definition id"));
      }
      if (typeof candidate["definitionVersion"] !== "number" || !Number.isInteger(candidate["definitionVersion"])) {
        issues.push(issue(`${path}.definitionVersion`, "expected an integer definition version"));
      }
      const requestedOperations = candidate["requestedOperations"];
      if (requestedOperations !== undefined) {
        if (!Array.isArray(requestedOperations) || !requestedOperations.every(isOperationRef)) {
          // Fail closed: an ambiguous authority request is refused as malformed data rather than
          // silently treated as "no operations" or "all operations".
          issues.push(issue(`${path}.requestedOperations`, "expected an array of { capability, operation } refs"));
        }
      }
      const awaitTerminalResult = candidate["awaitTerminalResult"];
      if (awaitTerminalResult !== undefined && typeof awaitTerminalResult !== "boolean") {
        issues.push(issue(`${path}.awaitTerminalResult`, "expected a boolean when present"));
      }
      break;
    }
    case "send_message": {
      const to = candidate["to"];
      const inReplyTo = candidate["inReplyToMessageId"];
      const hasTo = to !== undefined;
      const hasReply = inReplyTo !== undefined;
      if (hasTo && (typeof to !== "string" || to.length === 0)) {
        issues.push(issue(`${path}.to`, "expected a destination"));
      }
      if (hasReply && (typeof inReplyTo !== "string" || inReplyTo.length === 0)) {
        issues.push(issue(`${path}.inReplyToMessageId`, "expected a non-empty message id when present"));
      }
      if (!hasTo) {
        issues.push(issue(`${path}.to`, "expected a concrete destination for send, ask, or reply"));
      }
      issues.push(...jsonIssues(candidate["body"], `${path}.body`).map((i) => issue(i.path, i.message)));
      const awaitReply = candidate["awaitReply"];
      if (awaitReply !== undefined && typeof awaitReply !== "boolean") {
        issues.push(issue(`${path}.awaitReply`, "expected a boolean when present"));
      }
      if (hasReply && awaitReply === true) {
        issues.push(issue(`${path}.awaitReply`, "a reply answers one existing ask and cannot itself await another reply"));
      }
      break;
    }
    case "request_user_input": {
      if (typeof candidate["prompt"] !== "string" || candidate["prompt"].length === 0) {
        issues.push(issue(`${path}.prompt`, "expected a prompt"));
      }
      break;
    }
  }

  issues.push(...jsonIssues(proposal, path).map((i) => issue(i.path, i.message)));
  return issues;
}

export function isUseCapabilityProposal(proposal: EffectProposal): proposal is UseCapabilityProposal {
  return proposal.kind === "use_capability";
}

export function isSpawnExecutionProposal(proposal: EffectProposal): proposal is SpawnExecutionProposal {
  return proposal.kind === "spawn_execution";
}

export function isSendMessageProposal(proposal: EffectProposal): proposal is SendMessageProposal {
  return proposal.kind === "send_message";
}

export interface SendMessageInput {
  readonly to: string;
  readonly body?: JsonValue;
  readonly requestKey?: string;
  readonly authorizationEvidence?: AuthorizationEvidence;
}

/**
 * `send`: deliver a message to a peer and do not wait for a reply.
 *
 * The sender's Effect settles as soon as the runtime admits the message for the destination; a
 * `message.sent` Event carries the acknowledgement. "sent" means persisted for that destination,
 * never that the recipient processed it.
 */
export function send(input: SendMessageInput): SendMessageProposal {
  return {
    kind: "send_message",
    to: input.to,
    body: input.body ?? null,
    ...(input.requestKey !== undefined ? { requestKey: input.requestKey } : {}),
    ...(input.authorizationEvidence !== undefined ? { authorizationEvidence: input.authorizationEvidence } : {}),
  };
}

/**
 * `ask`: deliver a message and keep the sender's PendingOperation pending until the peer replies.
 *
 * Not a child call: the destination Execution need not terminate. The exact original PendingOperation
 * settles when - and only when - the intended peer replies to this exact request.
 */
export function ask(input: SendMessageInput): SendMessageProposal {
  return { ...send(input), awaitReply: true };
}

export interface ReplyMessageInput {
  /** The original requester, taken from the runtime-owned incoming `peer.message`. */
  readonly to: string;
  /** The runtime-minted message id of the peer request being answered. */
  readonly inReplyToMessageId: string;
  readonly body?: JsonValue;
  readonly requestKey?: string;
  readonly authorizationEvidence?: AuthorizationEvidence;
}

/**
 * `reply`: an outbound send that also settles the asker's original `ask`.
 *
 * Resolves to the same `SendMessage` Effect. Policy authorizes the concrete `to` before the runtime
 * resolves `inReplyToMessageId`; the runtime then requires that link to name the same requester and
 * this Execution as responder. A reply answers one ask and never opens another one.
 */
export function reply(input: ReplyMessageInput): SendMessageProposal {
  return {
    kind: "send_message",
    to: input.to,
    body: input.body ?? null,
    inReplyToMessageId: input.inReplyToMessageId,
    ...(input.requestKey !== undefined ? { requestKey: input.requestKey } : {}),
    ...(input.authorizationEvidence !== undefined ? { authorizationEvidence: input.authorizationEvidence } : {}),
  };
}

export interface SpawnExecutionInput {
  readonly definitionId: string;
  readonly definitionVersion: number;
  readonly input?: JsonValue;
  readonly requestedOperations?: readonly OperationRefInput[];
  readonly requestKey?: string;
  readonly authorizationEvidence?: AuthorizationEvidence;
}

function spawnProposal(input: SpawnExecutionInput, awaitTerminalResult: boolean): SpawnExecutionProposal {
  return {
    kind: "spawn_execution",
    definitionId: input.definitionId,
    definitionVersion: input.definitionVersion,
    ...(input.input !== undefined ? { input: input.input } : {}),
    ...(input.requestedOperations !== undefined
      ? { requestedOperations: input.requestedOperations.map((ref) => operationRef(ref.capability, ref.operation)) }
      : {}),
    ...(awaitTerminalResult ? { awaitTerminalResult: true } : {}),
    ...(input.requestKey !== undefined ? { requestKey: input.requestKey } : {}),
    ...(input.authorizationEvidence !== undefined ? { authorizationEvidence: input.authorizationEvidence } : {}),
  };
}

/**
 * `spawn`: create an independent child Execution and do not wait for its terminal result.
 *
 * A request, like every proposal: the Harness resolves the Definition, attenuates authority against
 * this Execution's current ceiling, spends one lineage structural-budget credit, and creates the
 * child - or refuses, and nothing is created.
 */
export function spawnExecution(input: SpawnExecutionInput): SpawnExecutionProposal {
  return spawnProposal(input, false);
}

/**
 * `call`: `spawn` plus a required dependency on the child's terminal result.
 *
 * The child is the same independently managed Execution a `spawn` would create; the only difference
 * is that the spawning Execution registers a `PendingOperation` and is woken by the correlated
 * `child.completed` / `child.failed` Event. It is not another kind of Execution.
 */
export function callExecution(input: SpawnExecutionInput): SpawnExecutionProposal {
  return spawnProposal(input, true);
}

export interface UseCapabilityInput {
  readonly capability: string;
  readonly operation: string;
  readonly input?: JsonObject;
  readonly requestKey?: string;
  readonly resources?: readonly string[];
  /** The *operation* deadline. Nothing to do with how long an Activation waits for it. */
  readonly deadlineMs?: number;
  readonly idempotency?: EffectIdempotencyScope;
  readonly authorizationEvidence?: AuthorizationEvidence;
}

/**
 * Builds a `UseCapability` proposal from plain strings, validating the logical names.
 *
 * Authoring convenience only. A proposal built here has exactly the same standing as one written
 * out by hand: it is a request, and the Harness still decides everything that follows.
 */
export function useCapability(input: UseCapabilityInput): UseCapabilityProposal {
  return {
    kind: "use_capability",
    capability: capabilityId(input.capability),
    operation: operationId(input.operation),
    input: input.input ?? {},
    ...(input.requestKey !== undefined ? { requestKey: input.requestKey } : {}),
    ...(input.resources !== undefined ? { resources: input.resources.map(resourceBindingId) } : {}),
    ...(input.deadlineMs !== undefined ? { deadlineMs: input.deadlineMs } : {}),
    ...(input.idempotency !== undefined ? { idempotency: input.idempotency } : {}),
    ...(input.authorizationEvidence !== undefined ? { authorizationEvidence: input.authorizationEvidence } : {}),
  };
}
