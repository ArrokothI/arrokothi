/**
 * The bridge's wire shapes (K1.4 design 01 §5; design 02 D01-CHK-04, -05, -10, EMIT-01).
 *
 * Every value the bridge hands the Kernel goes through the SDK capture (`captureCanonicalBytes`),
 * so the Kernel only ever sees canonical bytes the wrapper produced. Values the Kernel hands back
 * (`acceptedProgress`, Event payloads) are plain boundary values and are read defensively: a shape
 * this module did not write is a protocol defect, reported by name.
 */

import type { BoundaryValue } from "@arrokothi/kernel";
import { captureCanonicalBytes } from "../internal/value-capture.ts";
import type { ValueIssue } from "../internal/value-capture.ts";

export const RUNTIME_CONTRACT_REVISION = "arrokothi.legacy-harness/0.8.1";
export const PROGRESS_CODEC = "arrokothi.legacy-bridge.progress/1";

/** Kernel input kinds; each `subscriptionClass` equals its kind. */
export const INPUT_KINDS = {
  start: "arrokothi.legacy.start",
  input: "arrokothi.legacy.input",
  confirmation: "arrokothi.legacy.confirmation",
} as const;
export const TIMEOUT_KIND = "kernel.wait.timeout";

/** Emission value kinds. */
export const EMISSION_KINDS = {
  ingress: "arrokothi.bridge.ingress_result",
  pause: "arrokothi.bridge.pause",
  native: "arrokothi.legacy.emission",
} as const;

/** Named failure codes the Driver itself originates. */
export const FAILURE_CODES = {
  nativeError: "arrokothi.bridge.native_error",
  nativeSessionMissing: "arrokothi.bridge.native_session_missing",
  valueUnrepresentable: "arrokothi.bridge.value_unrepresentable",
  initialInputRejected: "arrokothi.bridge.initial_input_rejected",
  waitDeadlineExpired: "arrokothi.bridge.wait_deadline_expired",
  nativeCancelled: "arrokothi.bridge.native_cancelled",
} as const;

/** Codes `start` throws with after it cancelled E (owner choice A). */
export const START_CODES = {
  nativeRootExists: "arrokothi.bridge.native_root_exists",
  nativeCreationFailed: "arrokothi.bridge.native_creation_failed",
} as const;

export const MAX_FAILURE_MESSAGE = 4_096;

export class UnrepresentableValueError extends Error {
  readonly issues: readonly ValueIssue[];
  constructor(what: string, issues: readonly ValueIssue[]) {
    super(`${what} is not a representable boundary value: ${issues.map(issue => `${issue.path || "(root)"} ${issue.code}`).join(", ")}`);
    this.name = "UnrepresentableValueError";
    this.issues = issues;
  }
}

/** Canonical bytes for `value`, or a named refusal carrying the wrapper's issues. */
export function encode(value: unknown, what: string): Uint8Array {
  const captured = captureCanonicalBytes(value);
  if (!captured.ok) throw new UnrepresentableValueError(what, captured.issues);
  return captured.value;
}

/** The issues capture finds in `value`, without encoding it for use. */
export function valueIssues(value: unknown): readonly ValueIssue[] {
  const captured = captureCanonicalBytes(value);
  return captured.ok ? [] : captured.issues;
}

// -- Progress ----------------------------------------------------------------

export interface PauseDeadline {
  readonly id: string;
  readonly deadline: number | null;
}

export interface BridgeProgress {
  readonly v: 1;
  readonly root: string;
  readonly emissionCursor: number;
  readonly pauses: readonly PauseDeadline[];
}

export class ProtocolShapeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolShapeError";
  }
}

const isObject = (value: unknown): value is { readonly [key: string]: BoundaryValue } =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Reads progress the Driver wrote earlier; `null` means the first exchange. */
export function readProgress(value: BoundaryValue | null, executionId: string): BridgeProgress {
  if (value === null) return { v: 1, root: executionId, emissionCursor: 0, pauses: [] };
  if (!isObject(value) || value["v"] !== 1 || typeof value["root"] !== "string" ||
    typeof value["emissionCursor"] !== "number" || !Array.isArray(value["pauses"])) {
    throw new ProtocolShapeError(`accepted progress for ${executionId} is not ${PROGRESS_CODEC}`);
  }
  const pauses: PauseDeadline[] = [];
  for (const pause of value["pauses"] as readonly BoundaryValue[]) {
    if (!isObject(pause) || typeof pause["id"] !== "string" || (pause["deadline"] !== null && typeof pause["deadline"] !== "number")) {
      throw new ProtocolShapeError(`accepted progress for ${executionId} has a malformed pause`);
    }
    pauses.push({ id: pause["id"], deadline: pause["deadline"] as number | null });
  }
  return { v: 1, root: value["root"], emissionCursor: value["emissionCursor"], pauses };
}

// -- Input payloads ----------------------------------------------------------

export interface LegacyInput {
  readonly label: string;
  readonly payload?: BoundaryValue;
  readonly destination?: string;
  readonly correlationId?: string | null;
  readonly causationId?: string | null;
}

export interface ConfirmationDecision {
  readonly confirmationId: string;
  readonly decision: "approve" | "decline";
}

const optionalText = (value: BoundaryValue | undefined): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string";

/** The `input` field of a start payload: `null`, or a legacy input. */
export function readStartPayload(payload: BoundaryValue): LegacyInput | null {
  if (!isObject(payload) || !("input" in payload)) throw new ProtocolShapeError("start payload has no input field");
  const input = payload["input"];
  return input === null ? null : readInputPayload(input);
}

export function readInputPayload(payload: BoundaryValue): LegacyInput {
  if (!isObject(payload) || typeof payload["label"] !== "string" ||
    (payload["destination"] !== undefined && typeof payload["destination"] !== "string") ||
    !optionalText(payload["correlationId"]) || !optionalText(payload["causationId"])) {
    throw new ProtocolShapeError("input payload is not a legacy input");
  }
  return payload as unknown as LegacyInput;
}

export function readConfirmationPayload(payload: BoundaryValue): ConfirmationDecision {
  if (!isObject(payload) || typeof payload["confirmationId"] !== "string" ||
    (payload["decision"] !== "approve" && payload["decision"] !== "decline")) {
    throw new ProtocolShapeError("confirmation payload is not a decision");
  }
  return { confirmationId: payload["confirmationId"], decision: payload["decision"] };
}

// -- Emissions ---------------------------------------------------------------

/** One forwarded or discarded Kernel Event, as the native side answered it. */
export interface IngressResult {
  readonly eventId: string;
  readonly kind: string;
  readonly status: string;
  readonly reason?: string;
  readonly detail?: string;
}

export type PauseKind = "confirmation" | "input";

export interface Pause {
  readonly kind: PauseKind;
  readonly executionId: string;
  readonly confirmationId?: string;
}

/** Caps a native failure so its code always survives the core limits (D01-CHK-05). */
export function failureValue(failure: { readonly code: string; readonly message: string; readonly details?: unknown }): Record<string, BoundaryValue> {
  const message = failure.message.length > MAX_FAILURE_MESSAGE ? failure.message.slice(0, MAX_FAILURE_MESSAGE) : failure.message;
  const base: Record<string, BoundaryValue> = { code: failure.code, message };
  if (failure.details === undefined) return base;
  return valueIssues({ ...base, details: failure.details }).length === 0
    ? { ...base, details: failure.details as BoundaryValue }
    : { ...base, detailsOmitted: true };
}
