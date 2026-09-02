/**
 * PeerRequestLink: the runtime's record correlating one `ask` to the reply that settles it.
 *
 * It exists so a reply can settle *exactly* the request it answers, and nothing else:
 *
 * ```text
 * only the intended peer can answer         responderExecutionId is checked against the replier
 * a third Execution cannot settle it        the reply is authorized as that Execution's own send,
 *                                           and the link names who may answer
 * a raw correlation id is not a credential  the reply carries a runtime-minted messageId; guessing
 *                                           one settles nothing without an open matching link
 * a duplicate reply cannot settle twice     `state` moves open -> settled once
 * ```
 *
 * It is runtime state, not controller state. A controller never receives one; it learns an `ask` was
 * answered only by being handed the correlated `peer.message` reply Event, and it replies to an
 * incoming request using the `messageId` in that Event's body - never a link handle.
 *
 * This is deliberately not a general conversation/session ontology. One `ask`, one expected
 * responder, one reply.
 */

import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { ExecutionId } from "./ids.ts";

export type PeerRequestLinkState = "open" | "settled" | "abandoned";

export interface PeerRequestLink {
  /** Runtime-minted identity of the request message. A reply names this; it is not a credential. */
  readonly messageId: string;
  /** The Execution that sent the `ask`. */
  readonly requesterExecutionId: ExecutionId;
  /** The only Execution whose reply may settle this request. */
  readonly responderExecutionId: ExecutionId;
  /** The requester's `SendMessage` Effect. */
  readonly requestEffectId: EffectId;
  /** The requester's PendingOperation that a reply settles. */
  readonly requestPendingOperationId: PendingOperationId;
  /** The correlation the reply Event must carry so that exact PendingOperation settles. */
  readonly requestCorrelationId: string;
  readonly state: PeerRequestLinkState;
  readonly createdAt: string;
  /** Set when the request is answered or abandoned by a terminal requester. */
  readonly settledAt: string | null;
}

export interface CreatePeerRequestLinkInput {
  readonly messageId: string;
  readonly requesterExecutionId: ExecutionId;
  readonly responderExecutionId: ExecutionId;
  readonly requestEffectId: EffectId;
  readonly requestPendingOperationId: PendingOperationId;
  readonly requestCorrelationId: string;
  readonly createdAt: string;
}

export function createPeerRequestLink(input: CreatePeerRequestLinkInput): PeerRequestLink {
  return {
    messageId: input.messageId,
    requesterExecutionId: input.requesterExecutionId,
    responderExecutionId: input.responderExecutionId,
    requestEffectId: input.requestEffectId,
    requestPendingOperationId: input.requestPendingOperationId,
    requestCorrelationId: input.requestCorrelationId,
    state: "open",
    createdAt: input.createdAt,
    settledAt: null,
  };
}

/** Marks the request answered. Idempotent, so a duplicate reply cannot settle it a second time. */
export function markPeerRequestLinkSettled(link: PeerRequestLink, at: string): PeerRequestLink {
  if (link.state !== "open") return link;
  return { ...link, state: "settled", settledAt: at };
}

/** The requester became terminal before it could observe a reply. */
export function markPeerRequestLinkAbandoned(link: PeerRequestLink, at: string): PeerRequestLink {
  if (link.state !== "open") return link;
  return { ...link, state: "abandoned", settledAt: at };
}

export function isOpenPeerRequest(link: PeerRequestLink): boolean {
  return link.state === "open";
}
