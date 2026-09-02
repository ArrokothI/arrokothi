/**
 * UserInputRequest: the runtime's record of one open `RequestUserInput` Effect.
 *
 * `RequestUserInput` asks the human/application for a piece of semantic data. The request is
 * runtime-mediated semantic work, so it settles through a `PendingOperation` and a correlated Event
 * - never a `ControllerResumption`. This record is what an application/UI reads to discover the
 * question, and what `Harness.submitUserInput` reads to settle the exact request a response answers.
 *
 * Read it as a list of things it is not:
 *
 * ```text
 * requestId is not a bearer credential  the trusted submit path authenticates the human/application
 *                                       *before* it is reached; knowing the id settles nothing
 * schema is not a second schema system  it is the existing serializable core ValueSchema, resolved
 *                                       (an absent proposal schema becomes { kind: "string" })
 * this record is not handed to a controller  a controller learns the answer only from the delivered
 *                                            `user.input` Event
 * ```
 *
 * There is deliberately no fabricated deadline. A `RequestUserInput` may legitimately remain
 * unresolved: `docs/execution-runtime.md` §16 says an Execution may intentionally wait indefinitely
 * for external input, and the PendingOperation's `deadline: null` is the honest representation of
 * that.
 */

import type { EffectId, PendingOperationId } from "../effects/ids.ts";
import type { ValueSchema } from "../schema/value-schema.ts";
import type { ExecutionId } from "./ids.ts";

export type UserInputRequestState = "open" | "responded" | "abandoned";

export interface UserInputRequest {
  /** Runtime-minted identity. Correlation/integrity data, never an authorization credential. */
  readonly requestId: string;
  /** The Execution that proposed the `RequestUserInput` Effect and is waiting for the answer. */
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  /** The exact PendingOperation a trusted response settles. */
  readonly pendingOperationId: PendingOperationId;
  /** The correlation the `user.input` Event carries so that exact PendingOperation settles. */
  readonly correlationId: string;
  readonly prompt: string;
  /** The resolved response schema. An absent proposal schema resolves to `{ kind: "string" }`. */
  readonly schema: ValueSchema;
  readonly state: UserInputRequestState;
  readonly createdAt: string;
  /** Set once a trusted response settled the request. */
  readonly respondedAt: string | null;
  /** Set once the requesting Execution terminalized before a response arrived. */
  readonly abandonedAt: string | null;
}

export interface CreateUserInputRequestInput {
  readonly requestId: string;
  readonly executionId: ExecutionId;
  readonly effectId: EffectId;
  readonly pendingOperationId: PendingOperationId;
  readonly correlationId: string;
  readonly prompt: string;
  readonly schema: ValueSchema;
  readonly createdAt: string;
}

export function createUserInputRequest(input: CreateUserInputRequestInput): UserInputRequest {
  return {
    requestId: input.requestId,
    executionId: input.executionId,
    effectId: input.effectId,
    pendingOperationId: input.pendingOperationId,
    correlationId: input.correlationId,
    prompt: input.prompt,
    schema: input.schema,
    state: "open",
    createdAt: input.createdAt,
    respondedAt: null,
    abandonedAt: null,
  };
}

/** Marks the request answered. Idempotent: a duplicate response settles nothing a second time. */
export function markUserInputResponded(request: UserInputRequest, at: string): UserInputRequest {
  if (request.state !== "open") return request;
  return { ...request, state: "responded", respondedAt: at };
}

/** The requesting Execution terminalized before a response arrived. Idempotent. */
export function markUserInputAbandoned(request: UserInputRequest, at: string): UserInputRequest {
  if (request.state !== "open") return request;
  return { ...request, state: "abandoned", abandonedAt: at };
}

export function isOpenUserInputRequest(request: UserInputRequest): boolean {
  return request.state === "open";
}
