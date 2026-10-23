/** Test-only compatibility for accepted live-value fixtures. No state/authority/replay emulation.
 * Envelope proxies defer conversion until the core's own-field observation; each original getter
 * is forwarded once. Wrapper-only refusal witnesses call capture directly, before any core call.
 */
import assert from "node:assert/strict";
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

/** Explicit byte-domain fixture, including deliberately malformed UTF-8/JSON. */
export function rawBytes(input: string | Uint8Array): never {
  const bytes = typeof input === "string" ? apply(encode, encoder, [input]) as Uint8Array : input;
  apply(weakAdd, raw, [bytes]);
  return bytes as never;
}

interface CaptureContext { failure: Error | null }
function root(value: unknown, context: CaptureContext): unknown {
  if (value !== null && (typeof value === "object" || typeof value === "function") && apply(weakHas, raw, [value])) return value;
  // Preserve missing-field semantics; a missing root is an envelope error rather than a value.
  if (value === undefined) return undefined;
  const encoded = captureCanonicalBytes(value);
  if (!encoded.ok) {
    // The fixture's own precondition, like harness `accepted()`: a consumer value the wrapper refuses is
    // an assertion failure of the consumer test, never a harness error.
    try { assert.fail("Wrapper-only refusal fixture must be split from the core consumer: " + encoded.issues[0]?.code); }
    catch (failure) { context.failure = failure as Error; throw failure; }
  }
  return encoded.value;
}

type Shape = "create" | "input" | "outcome" | "emissions" | "emission" | "next" | "recovery" | "available";
function field(shape: Shape, key: PropertyKey, value: unknown, context: CaptureContext): unknown {
  if ((shape === "create" && key === "authorityContext") || (shape === "input" && key === "payload") ||
      (shape === "outcome" && key === "progress") || (shape === "emission" && key === "value") ||
      (shape === "next" && (key === "result" || key === "error")) ||
      (shape === "available" && (key === "definitionRevisions" || key === "runtimeContractRevisions" || key === "progressCodecs"))) return root(value, context);
  if (shape === "create" && key === "initialInput") return envelope(value, "input", context);
  if (shape === "outcome" && key === "emissions") return envelope(value, "emissions", context);
  if (shape === "outcome" && key === "next") return envelope(value, "next", context);
  if (shape === "recovery" && key === "available") return envelope(value, "available", context);
  if (shape === "emissions" && key !== "length" && typeof key === "string") return envelope(value, "emission", context);
  return value;
}
function envelope(original: unknown, shape: Shape, context: CaptureContext): unknown {
  if (original === null || typeof original !== "object") return original;
  let list: boolean;
  try { list = isArray(original); } catch { return original; }
  const target = list ? [] : {};
  return new CapturedProxy(target, {
    getOwnPropertyDescriptor(_target, key) {
      const descriptor = ownDescriptor(original, key);
      if (descriptor === undefined) return undefined;
      if (list && key === "length") {
        const lengthDescriptor = create(null);
        lengthDescriptor.value = 0; lengthDescriptor.writable = true;
        lengthDescriptor.enumerable = false; lengthDescriptor.configurable = false;
        return lengthDescriptor;
      }
      // Descriptors only establish own-field presence in observeOwn. Reading is deferred to get.
      const forwarded = create(null);
      forwarded.value = undefined; forwarded.writable = true;
      forwarded.enumerable = true; forwarded.configurable = true;
      return forwarded;
    },
    get(_target, key) { return field(shape, key, get(original, key), context); },
    ownKeys() { return ownKeys(original); },
  });
}

/** Do not let observeField's catch hide an unmigrated wrapper refusal in a passing core test. */
function invoke<T>(request: unknown, shape: Shape, submit: (envelope: unknown) => T): T {
  const context: CaptureContext = { failure: null };
  const answer = submit(envelope(request, shape, context));
  if (context.failure !== null) throw context.failure;
  return answer;
}

export class ExecutionCoordinator extends CoreCoordinator {
  override createExecution(caller: AuthenticatedCaller, request: unknown) {
    return invoke(request, "create", prepared => super.createExecution(caller, prepared as CoreCreate));
  }
  override submitInput(caller: AuthenticatedCaller, request: unknown) {
    return invoke(request, "input", prepared => super.submitInput(caller, prepared as CoreInput));
  }
  override submitOutcome(caller: AuthenticatedCaller, proposal: unknown, submission: SubmissionGrant) {
    return invoke(proposal, "outcome", prepared => super.submitOutcome(caller, prepared as CoreOutcome, submission));
  }
  override recoverExecution(caller: AuthenticatedCaller, executionId: string, request: unknown) {
    return invoke(request, "recovery", prepared => super.recoverExecution(caller, executionId, prepared as CoreRecovery));
  }
}

/** Deliberately unvalidated JSON fixture for byte-representable semantic-limit/number refusals.
 * It never normalizes non-finite numbers to null; 1e400 is valid JSON with a non-finite decode.
 * Wrapper-only object forms must instead be tested directly in SDK tests.
 */
export function jsonBytes(value: unknown): never {
  const encodeFixture = (item: unknown): string => {
    if (typeof item === 'number') return Number.isFinite(item) ? `${item}` : item < 0 ? '-1e400' : '1e400';
    if (item === null || typeof item === 'boolean' || typeof item === 'string') return JSON.stringify(item);
    if (Array.isArray(item)) return '[' + item.map(encodeFixture).join(',') + ']';
    if (typeof item === 'object') return '{' + Object.keys(item!).sort().map(key => JSON.stringify(key) + ':' + encodeFixture((item as Record<string,unknown>)[key])).join(',') + '}';
    throw new Error('fixture is not byte-representable; test its SDK refusal directly');
  };
  return rawBytes(encodeFixture(value));
}
