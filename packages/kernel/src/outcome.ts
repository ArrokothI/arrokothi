/**
 * The Outcome envelope and the exchange controls, read once from caller-owned data.
 *
 * `mental-model/mechanisms/execution-cycle.md` owns Outcome acceptance: authenticate and scope,
 * look for an already accepted matching Outcome, validate the whole envelope, then commit all of it
 * in one decision. The coordinator performs the scope check, the lookup, the currency and terminal
 * checks and the commit, because each needs accepted state. This module performs only the reading
 * those steps rely on. It decides nothing about replay, currency or terminal state, and it commits
 * nothing.
 *
 * ## One reading of the proposal
 *
 * The envelope is caller-owned. Each field is observed once, from the envelope's own data
 * (`envelope.ts`); each value root - progress, every Emission value, the result or error - is
 * captured once by `values.ts`. Everything later uses that capture: the replay comparison, the
 * validation, the commit, the next Activation that carries accepted progress, and inspection. The
 * content identity is the injective packing of the captured parts, so an exact duplicate is
 * recognized by equal canonical bytes and never by reading the caller's object a second time.
 *
 * Each root is measured on its own. `values.md`: "Two sibling roots of about 700 KiB each, in one
 * Outcome, both pass. The Outcome is not refused merely because the whole thing exceeds 1 MiB."
 *
 * ## Nothing silently stripped
 *
 * EF-1 forbids accepting an Outcome minus the Effect it proposed. The same reasoning covers any field
 * this binding does not know: accepting the rest of the proposal would drop that field without a
 * trace. Unknown own fields on the envelope, on `next` and on an Emission are therefore refused, not
 * ignored (K1.2-DEC-1). An Effect list is never read beyond its length, and a wait is never read at
 * all: both are refused whole before K2 and K1.3 respectively.
 *
 * ## The zone's rule
 *
 * Everything here runs after caller-owned state has been observed in the same tick, so it follows
 * the rule `coordinator.ts` states: load-time references, own-data lists through `own-array.ts`, no
 * iteration protocol and no live prototype method.
 */

import {
  acceptActivationIdentity,
  acceptIdentityText,
  appendIssue,
  appendIssues,
  located,
  observeField,
  observeOwn,
  type LocatedIssue,
} from "./envelope.ts";
import { packIdentity } from "./identity.ts";
import { appendOwn, readAt } from "./own-array.ts";
import { canonicalize, type BoundaryValue, type CanonicalValue } from "./values.ts";

const PrimordialArrayIsArray = Array.isArray;
const PrimordialNumberIsSafeInteger = Number.isSafeInteger;
const PrimordialObjectFreeze = Object.freeze;
/**
 * `Reflect.ownKeys`, from load time: the unknown-field check lists a caller object's own keys after
 * other fields of the same envelope were observed. The result is an engine-built list, own data by
 * construction, so its elements are read ordinarily (`own-array.ts`).
 */
const PrimordialReflectOwnKeys = Reflect.ownKeys;

// -- The envelope as a Runtime submits it ------------------------------------

/** One output the Runtime produced, under its local name within this Outcome. */
export interface EmissionProposal {
  readonly emissionKey: string;
  readonly value: BoundaryValue;
}

/** The one next step an Outcome proposes. */
export type OutcomeNext =
  | { readonly step: "continue" }
  /** Refused whole until K1.3 implements wait registration; the wait is never read here. */
  | { readonly step: "await"; readonly wait: unknown }
  | { readonly step: "complete"; readonly result: BoundaryValue }
  | { readonly step: "fail"; readonly error: BoundaryValue };

/**
 * A Runtime's proposal ending one Activation.
 *
 * It names the exchange and the attempt it answers - the Activation ID, the writer epoch and the
 * base progress revision it was computed from. No submission path resolves "the current
 * Activation" or the current epoch on the caller's behalf (owner amendment PLAN-01), so none of
 * the three is optional.
 */
export interface OutcomeEnvelope {
  readonly executionId: string;
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  /** The Runtime's new saved state, in inline form. Stored and handed back unchanged. */
  readonly progress: BoundaryValue;
  /** Absent and empty mean the same thing. */
  readonly emissions?: readonly EmissionProposal[];
  /** Must be absent or empty before K2: any Effect refuses the whole Outcome (EF-2). */
  readonly effects?: readonly unknown[];
  readonly next: OutcomeNext;
}

/** The fields an Outcome envelope may own. `executionId` and `activationId` are read by the coordinator. */
const ENVELOPE_FIELDS: readonly string[] = PrimordialObjectFreeze([
  "executionId",
  "activationId",
  "writerEpoch",
  "baseProgressRevision",
  "progress",
  "emissions",
  "effects",
  "next",
]);
const EMISSION_FIELDS: readonly string[] = PrimordialObjectFreeze(["emissionKey", "value"]);
const CONTINUE_FIELDS: readonly string[] = PrimordialObjectFreeze(["step"]);
const COMPLETE_FIELDS: readonly string[] = PrimordialObjectFreeze(["step", "result"]);
const FAIL_FIELDS: readonly string[] = PrimordialObjectFreeze(["step", "error"]);

/**
 * How many unknown-field issues one object reports before the scan stops.
 *
 * A caller can own any number of fields, and listing them is the engine's work, but reporting each
 * one would let the refusal grow with the caller's object. A handful names the problem.
 */
const UNKNOWN_FIELD_REPORT_LIMIT = 8;

// -- What one reading produces ----------------------------------------------

export interface CapturedEmission {
  readonly emissionKey: string;
  readonly value: CanonicalValue;
}

export type CapturedNext =
  | { readonly step: "continue" }
  | { readonly step: "complete"; readonly result: CanonicalValue }
  | { readonly step: "fail"; readonly error: CanonicalValue };

/** A proposal whose every field was acceptable, captured and frozen. */
export interface CapturedOutcome {
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
  readonly progress: CanonicalValue;
  readonly emissions: readonly CapturedEmission[];
  readonly next: CapturedNext;
  /** The injective packing of every content part; equal identity means an exact duplicate. */
  readonly identity: string;
}

/** The attempt an envelope claims to answer, when both numbers are well formed. */
export interface ExchangeClaim {
  readonly writerEpoch: number;
  readonly baseProgressRevision: number;
}

/**
 * Everything one reading of an Outcome envelope established.
 *
 * `outcome` is present exactly when `issues` is empty, `overCapacity` is `null` and `claim` is
 * present. The claim is reported separately so the coordinator can tell a stale attempt that it is
 * stale even when its content is also wrong (K1.2-DEC-2).
 *
 * `epochForCurrency` and `baseForCurrency` carry each number independently: the well-formed value
 * when that coordinate passed its count check, otherwise `null`. The coordinator checks each
 * non-null coordinate against the unresolved exchange before submission authority, so a well-formed
 * stale half refuses as `stale_exchange` whatever the other half or the grant presents
 * (K12-R11-ORDER-01). A `null` half is a content-group refusal after authority, never an
 * exchange-group bypass that leaks content validation to a non-entitled caller.
 */
export interface OutcomeCapture {
  readonly claim: ExchangeClaim | null;
  readonly epochForCurrency: number | null;
  readonly baseForCurrency: number | null;
  readonly issues: readonly LocatedIssue[];
  /** Set when the Emission count exceeded the declared limit; no Emission was then read. */
  readonly overCapacity: { readonly count: number; readonly limit: number } | null;
  readonly outcome: CapturedOutcome | null;
}

// -- Small readers -----------------------------------------------------------

/** A non-negative or positive safe integer, or a located issue. */
function acceptCount(observed: unknown, label: string, minimum: number, issues: LocatedIssue[]): number | null {
  if (typeof observed !== "number" || !PrimordialNumberIsSafeInteger(observed) || observed < minimum) {
    const received = typeof observed === "number" ? `${observed}` : observed === undefined ? "nothing" : typeof observed;
    appendIssue(issues, { path: label, code: "not_a_count", message: `expected an integer of at least ${minimum}, received ${received}` });
    return null;
  }
  return observed;
}

/** One required value root, captured once and located under its field. `undefined` is missing. */
function acceptRoot(observed: unknown, label: string, issues: LocatedIssue[]): CanonicalValue | null {
  if (observed === undefined) {
    appendIssue(issues, { path: label, code: "missing_field", message: `${label} is required` });
    return null;
  }
  const captured = canonicalize(observed);
  if (!captured.ok) {
    appendIssues(issues, located(captured.issues, label));
    return null;
  }
  return captured.value;
}

/** Whether a caller value is a plain record rather than a list, a primitive or nothing. */
function isRecordLike(observed: unknown): boolean {
  if (observed === null || typeof observed !== "object") return false;
  try {
    return !PrimordialArrayIsArray(observed);
  } catch {
    // A revoked Proxy throws from `IsArray`; it is not a record the Kernel can read.
    return false;
  }
}

/** Whether a caller value is a list, totally: a throwing `IsArray` answers "no". */
function isListLike(observed: unknown): boolean {
  try {
    return PrimordialArrayIsArray(observed);
  } catch {
    return false;
  }
}

/** Unknown field names are diagnostics, not retained proposal data. Keep normal short ASCII
 * names locatable; omit long or non-printable/non-ASCII names rather than retaining arbitrary
 * caller text (review-14 O3). String indexing consults no ambient method or iterator. */
function diagnosticFieldName(key: string): string {
  if (key.length > 128) return "<unknown field name omitted>";
  for (let index = 0; index < key.length; index += 1) {
    if (key[index]! < " " || key[index]! > "~") return "<unknown field name omitted>";
  }
  return key;
}

const childPath = (label: string, key: string): string => (label === "" ? key : `${label}.${key}`);

/**
 * Refuses own fields the binding does not know, rather than ignoring them (K1.2-DEC-1).
 *
 * The listing is one observation of the object's own keys; a trap that throws is a located issue.
 * The fields the binding does know are read separately, each once, from their own descriptors.
 */
function refuseUnknownFields(holder: object, allowed: readonly string[], label: string, issues: LocatedIssue[]): void {
  let keys: readonly (string | symbol)[];
  try {
    keys = PrimordialReflectOwnKeys(holder);
  } catch {
    appendIssue(issues, { path: label, code: "unstable_representation", message: `the fields of ${label === "" ? "the envelope" : label} could not be listed` });
    return;
  }
  let reported = 0;
  for (let index = 0; index < keys.length && reported < UNKNOWN_FIELD_REPORT_LIMIT; index += 1) {
    // Engine-built list: own data, read ordinarily (see `own-array.ts`).
    const key = keys[index] as string | symbol;
    if (typeof key !== "string") {
      appendIssue(issues, { path: label, code: "unknown_field", message: "a symbol-keyed field is not part of an Outcome" });
      reported += 1;
      continue;
    }
    let known = false;
    for (let position = 0; position < allowed.length; position += 1) {
      if (allowed[position] === key) known = true;
    }
    if (!known) {
      const name = diagnosticFieldName(key);
      appendIssue(issues, { path: childPath(label, name), code: "unknown_field", message: `${name} is not a field this binding accepts; it is refused rather than ignored` });
      reported += 1;
    }
  }
}

/** The own `length` of a caller list, observed once; `null` when it is not a count. */
function observeLength(list: unknown, label: string, issues: LocatedIssue[]): number | null {
  const seen = observeOwn(list, "length");
  if (seen.threw) {
    appendIssue(issues, { path: label, code: "unstable_representation", message: `the length of ${label} could not be observed` });
    return null;
  }
  return acceptCount(seen.observed, `${label}.length`, 0, issues);
}

// -- Reading the Outcome -----------------------------------------------------

function captureEmissions(
  observed: unknown,
  limit: number,
  issues: LocatedIssue[],
): { readonly emissions: CapturedEmission[]; readonly overCapacity: { count: number; limit: number } | null } {
  const emissions: CapturedEmission[] = [];
  if (observed === undefined) return { emissions, overCapacity: null };
  if (!isListLike(observed)) {
    appendIssue(issues, { path: "emissions", code: "unsupported_form", message: "expected a list of Emissions" });
    return { emissions, overCapacity: null };
  }
  const length = observeLength(observed, "emissions", issues);
  if (length === null) return { emissions, overCapacity: null };
  // Checked before any element is read: refusing an over-capacity list costs one read, not one
  // capture per element (K1.2-DEC-9).
  if (length > limit) return { emissions, overCapacity: { count: length, limit } };

  const keys: string[] = [];
  for (let index = 0; index < length; index += 1) {
    const label = `emissions[${index}]`;
    const elementSeen = observeOwn(observed, `${index}`);
    if (elementSeen.threw) {
      appendIssue(issues, { path: label, code: "unstable_representation", message: `${label} could not be observed` });
      continue;
    }
    const element = elementSeen.observed;
    if (!isRecordLike(element)) {
      appendIssue(issues, { path: label, code: "unsupported_form", message: "expected an Emission with emissionKey and value" });
      continue;
    }
    const keyField = observeField(element, "emissionKey", `${label}.emissionKey`, issues);
    const valueField = observeField(element, "value", `${label}.value`, issues);
    refuseUnknownFields(element as object, EMISSION_FIELDS, label, issues);
    if (!keyField.ok || !valueField.ok) continue;
    const keyOk = acceptIdentityText(keyField.observed, `${label}.emissionKey`, issues);
    const value = acceptRoot(valueField.observed, `${label}.value`, issues);
    if (!keyOk || value === null) continue;
    const emissionKey = keyField.observed as string;
    let duplicate = false;
    for (let position = 0; position < keys.length; position += 1) {
      if ((readAt(keys, position) as string) === emissionKey) duplicate = true;
    }
    if (duplicate) {
      appendIssue(issues, { path: `${label}.emissionKey`, code: "duplicate_key", message: `Emission key "${emissionKey}" appears more than once in this Outcome` });
      continue;
    }
    appendOwn(keys, emissionKey);
    appendOwn(emissions, PrimordialObjectFreeze({ emissionKey, value }));
  }
  return { emissions, overCapacity: null };
}

/** Refuses any proposed Effect whole, reading nothing but the list's length (EF-1, EF-2). */
function refuseEffects(observed: unknown, issues: LocatedIssue[]): void {
  if (observed === undefined) return;
  if (!isListLike(observed)) {
    appendIssue(issues, { path: "effects", code: "unsupported_form", message: "expected a list of Effect proposals" });
    return;
  }
  const length = observeLength(observed, "effects", issues);
  if (length !== null && length > 0) {
    appendIssue(issues, {
      path: "effects",
      code: "effects_unsupported",
      message: "Effect proposals are not supported before K2; the whole Outcome is refused and no Effect is recorded",
    });
  }
}

function captureNext(observed: unknown, issues: LocatedIssue[]): CapturedNext | null {
  if (observed === undefined) {
    appendIssue(issues, { path: "next", code: "missing_field", message: "next is required" });
    return null;
  }
  if (!isRecordLike(observed)) {
    appendIssue(issues, { path: "next", code: "unsupported_form", message: "expected a next step" });
    return null;
  }
  const next = observed as object;
  const stepField = observeField(next, "step", "next.step", issues);
  if (!stepField.ok) return null;
  const step = stepField.observed;
  if (step === "continue") {
    refuseUnknownFields(next, CONTINUE_FIELDS, "next", issues);
    return PrimordialObjectFreeze({ step: "continue" as const });
  }
  if (step === "complete") {
    const resultField = observeField(next, "result", "next.result", issues);
    refuseUnknownFields(next, COMPLETE_FIELDS, "next", issues);
    if (!resultField.ok) return null;
    const result = acceptRoot(resultField.observed, "next.result", issues);
    return result === null ? null : PrimordialObjectFreeze({ step: "complete" as const, result });
  }
  if (step === "fail") {
    const errorField = observeField(next, "error", "next.error", issues);
    refuseUnknownFields(next, FAIL_FIELDS, "next", issues);
    if (!errorField.ok) return null;
    const error = acceptRoot(errorField.observed, "next.error", issues);
    return error === null ? null : PrimordialObjectFreeze({ step: "fail" as const, error });
  }
  if (step === "await") {
    // The wait is not read: its grammar, eligibility and registration are K1.3's, and a
    // well-formedness verdict here would be a K1.3 decision taken early.
    appendIssue(issues, {
      path: "next.step",
      code: "wait_unsupported",
      message: "wait registration is not supported before K1.3; an Outcome proposing await is refused whole",
    });
    return null;
  }
  appendIssue(issues, { path: "next.step", code: "unsupported_form", message: "expected continue, await, complete or fail" });
  return null;
}

/**
 * Reads everything in an Outcome envelope except the two identities the coordinator reads first.
 *
 * Fields are observed in a fixed order, each once. Every issue is collected, so one refusal names
 * every reason the content was not acceptable.
 */
export function captureOutcome(envelope: object, emissionLimit: number): OutcomeCapture {
  const issues: LocatedIssue[] = [];

  const epochField = observeField(envelope, "writerEpoch", "writerEpoch", issues);
  const baseField = observeField(envelope, "baseProgressRevision", "baseProgressRevision", issues);
  const writerEpoch = epochField.ok ? acceptCount(epochField.observed, "writerEpoch", 1, issues) : null;
  const baseProgressRevision = baseField.ok ? acceptCount(baseField.observed, "baseProgressRevision", 0, issues) : null;
  const claim: ExchangeClaim | null =
    writerEpoch === null || baseProgressRevision === null ? null : PrimordialObjectFreeze({ writerEpoch, baseProgressRevision });

  const progressField = observeField(envelope, "progress", "progress", issues);
  const progress = progressField.ok ? acceptRoot(progressField.observed, "progress", issues) : null;

  const emissionsField = observeField(envelope, "emissions", "emissions", issues);
  const captured = emissionsField.ok ? captureEmissions(emissionsField.observed, emissionLimit, issues) : { emissions: [] as CapturedEmission[], overCapacity: null };

  const effectsField = observeField(envelope, "effects", "effects", issues);
  if (effectsField.ok) refuseEffects(effectsField.observed, issues);

  const nextField = observeField(envelope, "next", "next", issues);
  const next = nextField.ok ? captureNext(nextField.observed, issues) : null;

  refuseUnknownFields(envelope, ENVELOPE_FIELDS, "", issues);

  if (claim === null || progress === null || next === null || captured.overCapacity !== null || issues.length > 0) {
    return PrimordialObjectFreeze({ claim, epochForCurrency: writerEpoch, baseForCurrency: baseProgressRevision, issues, overCapacity: captured.overCapacity, outcome: null });
  }

  const emissions = PrimordialObjectFreeze(captured.emissions);
  const emissionParts: string[] = [];
  for (let index = 0; index < emissions.length; index += 1) {
    const emission = readAt(emissions, index) as CapturedEmission;
    appendOwn(emissionParts, emission.emissionKey);
    appendOwn(emissionParts, emission.value.canonical);
  }
  const nextPayload = next.step === "complete" ? next.result.canonical : next.step === "fail" ? next.error.canonical : "";
  const identity = packIdentity([
    "outcome",
    `${claim.writerEpoch}`,
    `${claim.baseProgressRevision}`,
    progress.canonical,
    `${emissions.length}`,
    packIdentity(emissionParts),
    next.step,
    nextPayload,
  ]);
  const outcome: CapturedOutcome = PrimordialObjectFreeze({
    writerEpoch: claim.writerEpoch,
    baseProgressRevision: claim.baseProgressRevision,
    progress,
    emissions,
    next,
    identity,
  });
  return PrimordialObjectFreeze({ claim, epochForCurrency: writerEpoch, baseForCurrency: baseProgressRevision, issues, overCapacity: null, outcome });
}

/** Renders Outcome issues with their messages, since several are not boundary-value codes. */
export const explainOutcomeIssues = (issues: readonly LocatedIssue[]): string => {
  let out = "";
  for (let index = 0; index < issues.length; index += 1) {
    const issue = readAt(issues, index) as LocatedIssue;
    if (index > 0) out += "; ";
    out += `${issue.path === "" ? "envelope" : issue.path} ${issue.code} (${issue.message})`;
  }
  return out;
};

// -- Controls on the unresolved exchange -------------------------------------

/**
 * An authorized takeover: replace the Runtime attempt that may answer this exchange.
 *
 * It names the exchange and the epoch it supersedes, so a takeover decided against one attempt can
 * never advance past another, and a repeated request cannot advance twice (K1.2-DEC-6).
 */
export interface TakeoverRequest {
  readonly activationId: string;
  readonly writerEpoch: number;
}

/**
 * Which code this deployment can run now, for one unresolved exchange (K1.2-DEC-7).
 *
 * The Kernel compares the exchange's three pins against these lists; it never infers availability.
 */
export interface CodeAvailability {
  readonly definitionRevisions: readonly string[];
  readonly runtimeContractRevisions: readonly string[];
  readonly progressCodecs: readonly string[];
}

export interface RecoveryRequest {
  readonly activationId: string;
  readonly available: CodeAvailability;
}

/**
 * A Driver's report that the current attempt's response could not be classified as an Outcome (OA-6).
 *
 * It names the exchange and attempt it concerns. `diagnostic` is bounded like a delivery failure.
 */
export interface ProtocolFailureReport {
  readonly activationId: string;
  readonly writerEpoch: number;
  readonly diagnostic?: string;
}

/** A named attempt, as a control request states it. */
export interface CapturedAttempt {
  readonly activationId: string;
  readonly writerEpoch: number;
}

/** Reads the Activation ID and writer epoch a control names, each once. */
export function captureAttempt(request: unknown, issues: LocatedIssue[]): CapturedAttempt | null {
  const activationField = observeField(request, "activationId", "activationId", issues);
  const epochField = observeField(request, "writerEpoch", "writerEpoch", issues);
  const activationOk = activationField.ok && acceptActivationIdentity(activationField.observed, "activationId", issues);
  const writerEpoch = epochField.ok ? acceptCount(epochField.observed, "writerEpoch", 1, issues) : null;
  if (!activationOk || writerEpoch === null) return null;
  return PrimordialObjectFreeze({ activationId: activationField.observed as string, writerEpoch });
}

/** One captured availability list: frozen text, read once. */
function captureTextList(holder: unknown, key: string, label: string, issues: LocatedIssue[]): readonly string[] | null {
  const field = observeField(holder, key, label, issues);
  if (!field.ok) return null;
  const root = acceptRoot(field.observed, label, issues);
  if (root === null) return null;
  const snapshot = root.value;
  if (!isListLike(snapshot)) {
    appendIssue(issues, { path: label, code: "unsupported_form", message: "expected a list of text" });
    return null;
  }
  // The snapshot is the Kernel's own frozen capture, so its elements are own data.
  const list = snapshot as readonly BoundaryValue[];
  for (let index = 0; index < list.length; index += 1) {
    if (typeof readAt(list, index) !== "string") {
      appendIssue(issues, { path: `${label}[${index}]`, code: "unsupported_form", message: "expected text" });
      return null;
    }
  }
  return list as readonly string[];
}

export interface CapturedRecovery {
  readonly activationId: string;
  readonly available: CodeAvailability;
}

/** Reads a recovery request: the exchange it names and the three availability lists. */
export function captureRecovery(request: unknown, issues: LocatedIssue[]): CapturedRecovery | null {
  const activationField = observeField(request, "activationId", "activationId", issues);
  const activationOk = activationField.ok && acceptActivationIdentity(activationField.observed, "activationId", issues);
  const availableField = observeField(request, "available", "available", issues);
  if (!availableField.ok) return null;
  const available = availableField.observed;
  if (!isRecordLike(available)) {
    appendIssue(issues, { path: "available", code: "unsupported_form", message: "expected the lists of available code" });
    return null;
  }
  const definitionRevisions = captureTextList(available, "definitionRevisions", "available.definitionRevisions", issues);
  const runtimeContractRevisions = captureTextList(available, "runtimeContractRevisions", "available.runtimeContractRevisions", issues);
  const progressCodecs = captureTextList(available, "progressCodecs", "available.progressCodecs", issues);
  if (!activationOk || definitionRevisions === null || runtimeContractRevisions === null || progressCodecs === null) return null;
  return PrimordialObjectFreeze({
    activationId: activationField.observed as string,
    available: PrimordialObjectFreeze({ definitionRevisions, runtimeContractRevisions, progressCodecs }),
  });
}

/** Whether `value` appears in a captured list, by an index loop over own data. */
export const listed = (list: readonly string[], value: string): boolean => {
  let found = false;
  for (let index = 0; index < list.length; index += 1) {
    if ((readAt(list, index) as string) === value) found = true;
  }
  return found;
};
