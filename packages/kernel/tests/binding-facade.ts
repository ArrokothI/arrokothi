/** Test-only compatibility for accepted live-value fixtures. No state/authority/replay emulation.
 * Envelope proxies defer conversion until the core's own-field observation; each original getter
 * is forwarded once. Wrapper-only refusal witnesses call capture directly, before any core call.
 */
import { ExecutionCoordinator as CoreCoordinator } from "../src/index.ts";
import type { AuthenticatedCaller, SubmissionGrant, CreateExecutionRequest as CoreCreate, SubmitInputRequest as CoreInput, OutcomeEnvelope as CoreOutcome, RecoveryRequest as CoreRecovery } from "../src/index.ts";
import { captureCanonicalBytes, type BoundaryValue } from "../../sdk/src/internal/value-capture.ts";

export type { BoundaryValue } from "../../sdk/src/internal/value-capture.ts";
export interface InputContent { readonly kind: string; readonly payload: BoundaryValue; readonly subscriptionClass?: string }
export type CreateExecutionRequest = Omit<CoreCreate, "authorityContext" | "initialInput"> & { readonly authorityContext: BoundaryValue; readonly initialInput: InputContent };
export type SubmitInputRequest = Omit<CoreInput, "payload"> & { readonly payload: BoundaryValue };
export interface EmissionProposal { readonly emissionKey: string; readonly value: BoundaryValue }
export type OutcomeNext = { readonly step: "continue" } | { readonly step: "await"; readonly wait: unknown } | { readonly step: "complete"; readonly result: BoundaryValue } | { readonly step: "fail"; readonly error: BoundaryValue };
export type OutcomeEnvelope = Omit<CoreOutcome, "progress" | "emissions" | "next"> & { readonly progress: BoundaryValue; readonly emissions?: readonly EmissionProposal[]; readonly next: OutcomeNext };
export interface CodeAvailability { readonly definitionRevisions: readonly string[]; readonly runtimeContractRevisions: readonly string[]; readonly progressCodecs: readonly string[] }
export type RecoveryRequest = Omit<CoreRecovery, "available"> & { readonly available: CodeAvailability };

const CapturedProxy = Proxy;
const ownDescriptor = Object.getOwnPropertyDescriptor;
const ownKeys = Reflect.ownKeys;
const get = Reflect.get;
const isArray = Array.isArray;
const create = Object.create;
const apply = Reflect.apply;
const weakHas = WeakSet.prototype.has;
const weakAdd = WeakSet.prototype.add;
const raw = new WeakSet<object>();
const Encoder = TextEncoder;
const encoder = new Encoder();
const encode = Encoder.prototype.encode;
const Failure = Error;

/** Explicit byte-domain fixture, including deliberately malformed UTF-8/JSON. */
export function rawBytes(input: string | Uint8Array): never {
  const bytes = typeof input === "string" ? apply(encode, encoder, [input]) as Uint8Array : input;
  apply(weakAdd, raw, [bytes]);
  return bytes as never;
}

function root(value: unknown): unknown {
  if (value !== null && (typeof value === "object" || typeof value === "function") && apply(weakHas, raw, [value])) return value;
  // Preserve missing-field semantics; a missing root is an envelope error rather than a value.
  if (value === undefined) return undefined;
  const encoded = captureCanonicalBytes(value);
  if (!encoded.ok) throw new Failure("Wrapper-only refusal fixture must be split from the core consumer: " + encoded.issues[0]?.code);
  return encoded.value;
}

type Shape = "create" | "input" | "outcome" | "emissions" | "emission" | "next" | "recovery" | "available";
function field(shape: Shape, key: PropertyKey, value: unknown): unknown {
  if ((shape === "create" && key === "authorityContext") || (shape === "input" && key === "payload") ||
      (shape === "outcome" && key === "progress") || (shape === "emission" && key === "value") ||
      (shape === "next" && (key === "result" || key === "error")) ||
      (shape === "available" && (key === "definitionRevisions" || key === "runtimeContractRevisions" || key === "progressCodecs"))) return root(value);
  if (shape === "create" && key === "initialInput") return envelope(value, "input");
  if (shape === "outcome" && key === "emissions") return envelope(value, "emissions");
  if (shape === "outcome" && key === "next") return envelope(value, "next");
  if (shape === "recovery" && key === "available") return envelope(value, "available");
  if (shape === "emissions" && key !== "length" && typeof key === "string") return envelope(value, "emission");
  return value;
}
function envelope(original: unknown, shape: Shape): unknown {
  if (original === null || typeof original !== "object") return original;
  let list: boolean;
  try { list = isArray(original); } catch { return original; }
  const target = list ? [] : {};
  return new CapturedProxy(target, {
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = ownDescriptor(original, key);
      if (descriptor === undefined) return undefined;
      if (list && key === "length") return ownDescriptor(target, key);
      // Descriptors only establish own-field presence in observeOwn. Reading is deferred to get.
      const forwarded = create(null);
      forwarded.value = undefined; forwarded.writable = true;
      forwarded.enumerable = true; forwarded.configurable = true;
      return forwarded;
    },
    get(_target, key) { return field(shape, key, get(original, key)); },
    ownKeys() { return ownKeys(original); },
  });
}

export class ExecutionCoordinator extends CoreCoordinator {
  override createExecution(caller: AuthenticatedCaller, request: unknown) {
    return super.createExecution(caller, envelope(request, "create") as CoreCreate);
  }
  override submitInput(caller: AuthenticatedCaller, request: unknown) {
    return super.submitInput(caller, envelope(request, "input") as CoreInput);
  }
  override submitOutcome(caller: AuthenticatedCaller, proposal: unknown, submission: SubmissionGrant) {
    return super.submitOutcome(caller, envelope(proposal, "outcome") as CoreOutcome, submission);
  }
  override recoverExecution(caller: AuthenticatedCaller, executionId: string, request: unknown) {
    return super.recoverExecution(caller, executionId, envelope(request, "recovery") as CoreRecovery);
  }
}
