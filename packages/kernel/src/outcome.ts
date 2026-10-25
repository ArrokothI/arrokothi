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
 * trace. Unknown own fields on the envelope, on `next`, on an Emission and anywhere in a wait are
 * therefore refused, not ignored (K1.2-DEC-1). An Effect list is never read beyond its length: any
 * Effect is refused whole before K2.
 *
 * ## The wait
 *
 * An `await` carries a wait declaration (`waits.ts`), read here once with the rest of the envelope,
 * because an exact duplicate must compare the wait too (K1.2-DEC-10's single reading). Its rules are
 * W-1's grammar and nothing else: at least one entry across dependency alternatives and input
 * subscriptions, even with a deadline; each alternative supplies at least one of its three fields; a
 * supplied kind set is non-empty; text is identity text; a deadline is a safe integer of at least 0 and
 * needs a coordinator with a clock. Well-formedness is structural, never satisfiability: duplicate
 * entries, empty-string text and alternatives no Event can match are accepted. One operational bound
 * applies: at most 256 selector strings per wait, counted across subscription classes, kinds, event
 * identities and correlations, with each list's length read before its elements. A wait issue is a
 * content issue like any other: it decides a refusal only after the exchange checks and submission
 * authority pass.
 *
 * ## The zone's rule
 *
 * Everything here runs after caller-owned state has been observed in the same tick, so it follows
 * the rule `coordinator.ts` states: load-time references, own-data lists through `own-array.ts`, no
 * iteration protocol and no live prototype method.
 */

import {
  acceptActivationIdentity,
  diagnosticIdentity,
  appendRootIssues,
  appendIssues,
  explainDiagnosticIssues,
  acceptIdentityText,
  appendIssue,
  observeField,
  observeOwn,
  type LocatedIssue,
} from "./envelope.ts";
import { packIdentity } from "./identity.ts";
import { appendOwn, readAt } from "./own-array.ts";
import { acceptCanonicalBytes, type BoundaryValue, type CanonicalValue } from "./values.ts";
import type { AcceptedAlternative, AcceptedSubscription, AcceptedWait, WaitDeclaration } from "./waits.ts";

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
  readonly value: Uint8Array;
}

/** The one next step an Outcome proposes. */
export type OutcomeNext =
  | { readonly step: "continue" }
  /** Registers the declared wait in this Outcome's acceptance (`waits.md` § Registering a wait). */
  | { readonly step: "await"; readonly wait: WaitDeclaration }
  | { readonly step: "complete"; readonly result: Uint8Array }
  | { readonly step: "fail"; readonly error: Uint8Array };

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
  readonly progress: Uint8Array;
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
const AWAIT_FIELDS: readonly string[] = PrimordialObjectFreeze(["step", "wait"]);
const WAIT_FIELDS: readonly string[] = PrimordialObjectFreeze(["dependencies", "subscriptions", "deadline"]);
const ALTERNATIVE_FIELDS: readonly string[] = PrimordialObjectFreeze(["eventIdentity", "kinds", "correlation"]);
const SUBSCRIPTION_FIELDS: readonly string[] = PrimordialObjectFreeze(["subscriptionClass"]);

/**
 * The declared operational bound on one wait: selector strings across all its lists.
 *
 * Like the Emission limit, it bounds the work one proposal can ask of validation; it says nothing about
 * which waits are meaningful. 256 strings are accepted and 257 refused as `too_many_selectors`.
 */
export const WAIT_SELECTOR_LIMIT = 256;

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

/** An accepted wait plus its injective packing, which joins the Outcome's content identity. */
export interface CapturedWait extends AcceptedWait {
  readonly identity: string;
}

export type CapturedNext =
  | { readonly step: "continue" }
  | { readonly step: "await"; readonly wait: CapturedWait }
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
  const captured = acceptCanonicalBytes(observed);
  if (!captured.ok) {
    appendRootIssues(issues, captured.issues, label);
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
    const rootIssues: LocatedIssue[] = [];
    const value = valueField.ok ? acceptRoot(valueField.observed, `${label}.value`, rootIssues) : null;
    refuseUnknownFields(element as object, EMISSION_FIELDS, label, issues);
    if (!keyField.ok || !valueField.ok) continue;
    const keyOk = acceptIdentityText(keyField.observed, `${label}.emissionKey`, issues);
    appendIssues(issues, rootIssues);
    if (!keyOk || value === null) continue;
    const emissionKey = keyField.observed as string;
    let duplicate = false;
    for (let position = 0; position < keys.length; position += 1) {
      if ((readAt(keys, position) as string) === emissionKey) duplicate = true;
    }
    if (duplicate) {
      appendIssue(issues, { path: `${label}.emissionKey`, code: "duplicate_key", message: `Emission key "${diagnosticIdentity(emissionKey)}" appears more than once in this Outcome` });
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

/** One optional identity-text field of a wait entry: absent is `null`. `undefined` when it is unusable. */
function optionalText(holder: object, key: string, label: string, issues: LocatedIssue[]): string | null | undefined {
  const field = observeField(holder, key, label, issues);
  if (!field.ok) return undefined;
  if (field.observed === undefined) return null;
  return acceptIdentityText(field.observed, label, issues) ? (field.observed as string) : undefined;
}

/**
 * One wait list field: absent means empty. Its elements are not read here, only its own length.
 * `null` when the field is present but not a list whose length can be observed.
 */
function waitList(observed: unknown, label: string, issues: LocatedIssue[]): { readonly list: unknown; readonly length: number } | null {
  if (observed === undefined) return { list: undefined, length: 0 };
  if (!isListLike(observed)) {
    appendIssue(issues, { path: label, code: "unsupported_form", message: `expected a list for ${label}` });
    return null;
  }
  const length = observeLength(observed, label, issues);
  return length === null ? null : { list: observed, length };
}

/** The `too_many_selectors` issue, raised as soon as the running count passes the bound. */
function tooManySelectors(issues: LocatedIssue[]): void {
  appendIssue(issues, {
    path: "next.wait",
    code: "too_many_selectors",
    message: `a wait may name at most ${WAIT_SELECTOR_LIMIT} selector strings across its subscription classes, kinds, event identities and correlations`,
  });
}

/**
 * Reads one wait declaration (W-1), each field once, own fields only.
 *
 * `selectors` counts selector strings as they are found, and every list's length is checked against
 * the bound before its elements are read, so an over-bound wait costs a bounded amount of reading.
 * The lists' combined length is checked first: every valid alternative supplies at least one string.
 */
function captureWait(observed: unknown, deadlineSupported: boolean, issues: LocatedIssue[]): CapturedWait | null {
  if (observed === undefined) {
    appendIssue(issues, { path: "next.wait", code: "missing_field", message: "next.wait is required for await" });
    return null;
  }
  if (!isRecordLike(observed)) {
    appendIssue(issues, { path: "next.wait", code: "unsupported_form", message: "expected a wait declaration" });
    return null;
  }
  const wait = observed as object;
  const dependenciesField = observeField(wait, "dependencies", "next.wait.dependencies", issues);
  const subscriptionsField = observeField(wait, "subscriptions", "next.wait.subscriptions", issues);
  const deadlineField = observeField(wait, "deadline", "next.wait.deadline", issues);
  refuseUnknownFields(wait, WAIT_FIELDS, "next.wait", issues);
  if (!dependenciesField.ok || !subscriptionsField.ok || !deadlineField.ok) return null;

  let deadline: number | null = null;
  let deadlineOk = true;
  const deadlineObserved: unknown = deadlineField.observed;
  if (deadlineObserved !== undefined) {
    if (typeof deadlineObserved !== "number" || !PrimordialNumberIsSafeInteger(deadlineObserved) || deadlineObserved < 0) {
      const received = typeof deadlineObserved === "number" ? `${deadlineObserved}` : deadlineObserved === null ? "null" : typeof deadlineObserved;
      appendIssue(issues, { path: "next.wait.deadline", code: "unsupported_form", message: `expected a safe integer of at least 0, received ${received}` });
      deadlineOk = false;
    } else if (!deadlineSupported) {
      appendIssue(issues, {
        path: "next.wait.deadline",
        code: "deadline_unsupported",
        message: "this coordinator has no clock, so it cannot honour a deadline; the Outcome is refused whole",
      });
      deadlineOk = false;
    } else {
      deadline = deadlineObserved;
    }
  }

  const dependencies = waitList(dependenciesField.observed, "next.wait.dependencies", issues);
  const subscriptions = waitList(subscriptionsField.observed, "next.wait.subscriptions", issues);
  if (dependencies === null || subscriptions === null) return null;
  if (dependencies.length === 0 && subscriptions.length === 0) {
    appendIssue(issues, {
      path: "next.wait",
      code: "empty_wait",
      message: "a wait needs at least one dependency alternative or input subscription, even with a deadline",
    });
    return null;
  }
  if (dependencies.length + subscriptions.length > WAIT_SELECTOR_LIMIT) {
    tooManySelectors(issues);
    return null;
  }

  let selectors = 0;
  let entriesOk = true;
  const alternatives: AcceptedAlternative[] = [];
  for (let index = 0; index < dependencies.length; index += 1) {
    const label = `next.wait.dependencies[${index}]`;
    const elementSeen = observeOwn(dependencies.list, `${index}`);
    if (elementSeen.threw) {
      appendIssue(issues, { path: label, code: "unstable_representation", message: `${label} could not be observed` });
      entriesOk = false;
      continue;
    }
    const element = elementSeen.observed;
    if (!isRecordLike(element)) {
      appendIssue(issues, { path: label, code: "unsupported_form", message: "expected a dependency alternative" });
      entriesOk = false;
      continue;
    }
    const alternative = element as object;
    const eventIdentity = optionalText(alternative, "eventIdentity", `${label}.eventIdentity`, issues);
    const kindsField = observeField(alternative, "kinds", `${label}.kinds`, issues);
    const correlation = optionalText(alternative, "correlation", `${label}.correlation`, issues);
    refuseUnknownFields(alternative, ALTERNATIVE_FIELDS, label, issues);
    if (eventIdentity === undefined || correlation === undefined || !kindsField.ok) {
      entriesOk = false;
      continue;
    }
    if (eventIdentity !== null) selectors += 1;
    if (correlation !== null) selectors += 1;
    let kinds: readonly string[] | null = null;
    if (kindsField.observed !== undefined) {
      const kindList = waitList(kindsField.observed, `${label}.kinds`, issues);
      if (kindList === null) {
        entriesOk = false;
        continue;
      }
      if (kindList.length === 0) {
        appendIssue(issues, { path: `${label}.kinds`, code: "empty_kind_set", message: "a supplied kind set needs at least one kind" });
        entriesOk = false;
        continue;
      }
      if (selectors + kindList.length > WAIT_SELECTOR_LIMIT) {
        tooManySelectors(issues);
        return null;
      }
      const accepted: string[] = [];
      for (let position = 0; position < kindList.length; position += 1) {
        const kindLabel = `${label}.kinds[${position}]`;
        const kindSeen = observeOwn(kindList.list, `${position}`);
        if (kindSeen.threw) {
          appendIssue(issues, { path: kindLabel, code: "unstable_representation", message: `${kindLabel} could not be observed` });
          entriesOk = false;
          continue;
        }
        if (acceptIdentityText(kindSeen.observed, kindLabel, issues)) appendOwn(accepted, kindSeen.observed as string);
        else entriesOk = false;
      }
      selectors += kindList.length;
      kinds = PrimordialObjectFreeze(accepted);
    }
    if (selectors > WAIT_SELECTOR_LIMIT) {
      tooManySelectors(issues);
      return null;
    }
    if (eventIdentity === null && kinds === null && correlation === null) {
      appendIssue(issues, { path: label, code: "empty_alternative", message: "an alternative supplies at least one of eventIdentity, kinds and correlation" });
      entriesOk = false;
      continue;
    }
    appendOwn(alternatives, PrimordialObjectFreeze({ eventIdentity, kinds, correlation }));
  }

  if (selectors + subscriptions.length > WAIT_SELECTOR_LIMIT) {
    tooManySelectors(issues);
    return null;
  }
  const classes: AcceptedSubscription[] = [];
  for (let index = 0; index < subscriptions.length; index += 1) {
    const label = `next.wait.subscriptions[${index}]`;
    const elementSeen = observeOwn(subscriptions.list, `${index}`);
    if (elementSeen.threw) {
      appendIssue(issues, { path: label, code: "unstable_representation", message: `${label} could not be observed` });
      entriesOk = false;
      continue;
    }
    const element = elementSeen.observed;
    if (!isRecordLike(element)) {
      appendIssue(issues, { path: label, code: "unsupported_form", message: "expected an input subscription" });
      entriesOk = false;
      continue;
    }
    const subscription = element as object;
    const classField = observeField(subscription, "subscriptionClass", `${label}.subscriptionClass`, issues);
    refuseUnknownFields(subscription, SUBSCRIPTION_FIELDS, label, issues);
    if (!classField.ok) {
      entriesOk = false;
      continue;
    }
    if (classField.observed === undefined) {
      appendIssue(issues, { path: `${label}.subscriptionClass`, code: "missing_field", message: "an input subscription names its subscriptionClass" });
      entriesOk = false;
      continue;
    }
    if (!acceptIdentityText(classField.observed, `${label}.subscriptionClass`, issues)) {
      entriesOk = false;
      continue;
    }
    appendOwn(classes, PrimordialObjectFreeze({ subscriptionClass: classField.observed as string }));
  }

  if (!entriesOk || !deadlineOk) return null;
  // The injective packing: every variable-length part is preceded by its count, every part is
  // length-prefixed by `packIdentity`, and absence is its own part. Absent and empty lists pack alike.
  const parts: string[] = [`${alternatives.length}`];
  for (let index = 0; index < alternatives.length; index += 1) {
    const alternative = readAt(alternatives, index) as AcceptedAlternative;
    appendOwn(parts, alternative.eventIdentity === null ? "absent" : "present");
    appendOwn(parts, alternative.eventIdentity ?? "");
    appendOwn(parts, alternative.kinds === null ? "absent" : "present");
    appendOwn(parts, `${alternative.kinds === null ? 0 : alternative.kinds.length}`);
    if (alternative.kinds !== null) {
      for (let position = 0; position < alternative.kinds.length; position += 1) appendOwn(parts, readAt(alternative.kinds, position) as string);
    }
    appendOwn(parts, alternative.correlation === null ? "absent" : "present");
    appendOwn(parts, alternative.correlation ?? "");
  }
  appendOwn(parts, `${classes.length}`);
  for (let index = 0; index < classes.length; index += 1) appendOwn(parts, (readAt(classes, index) as AcceptedSubscription).subscriptionClass);
  appendOwn(parts, deadline === null ? "absent" : "present");
  appendOwn(parts, deadline === null ? "" : `${deadline}`);
  return PrimordialObjectFreeze({
    dependencies: PrimordialObjectFreeze(alternatives),
    subscriptions: PrimordialObjectFreeze(classes),
    deadline,
    identity: packIdentity(parts),
  });
}

function captureNext(observed: unknown, deadlineSupported: boolean, issues: LocatedIssue[]): CapturedNext | null {
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
    const rootIssues: LocatedIssue[] = [];
    const result = resultField.ok ? acceptRoot(resultField.observed, "next.result", rootIssues) : null;
    refuseUnknownFields(next, COMPLETE_FIELDS, "next", issues);
    if (!resultField.ok) return null;
    appendIssues(issues, rootIssues);
    return result === null ? null : PrimordialObjectFreeze({ step: "complete" as const, result });
  }
  if (step === "fail") {
    const errorField = observeField(next, "error", "next.error", issues);
    const rootIssues: LocatedIssue[] = [];
    const error = errorField.ok ? acceptRoot(errorField.observed, "next.error", rootIssues) : null;
    refuseUnknownFields(next, FAIL_FIELDS, "next", issues);
    if (!errorField.ok) return null;
    appendIssues(issues, rootIssues);
    return error === null ? null : PrimordialObjectFreeze({ step: "fail" as const, error });
  }
  if (step === "await") {
    const waitField = observeField(next, "wait", "next.wait", issues);
    const waitIssues: LocatedIssue[] = [];
    const wait = waitField.ok ? captureWait(waitField.observed, deadlineSupported, waitIssues) : null;
    refuseUnknownFields(next, AWAIT_FIELDS, "next", issues);
    if (!waitField.ok) return null;
    appendIssues(issues, waitIssues);
    return wait === null ? null : PrimordialObjectFreeze({ step: "await" as const, wait });
  }
  appendIssue(issues, { path: "next.step", code: "unsupported_form", message: "expected continue, await, complete or fail" });
  return null;
}

/**
 * Reads everything in an Outcome envelope except the two identities the coordinator reads first.
 *
 * Fields are observed in a fixed order, each once. Value roots carry bounded details and exact
 * suffix counts (DEC-7); DEC-5 composes them with envelope issues into one bounded refusal.
 * `deadlineSupported` says whether the coordinator has a clock: without one a wait deadline is refused.
 */
export function captureOutcome(envelope: object, emissionLimit: number, deadlineSupported: boolean): OutcomeCapture {
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
  const next = nextField.ok ? captureNext(nextField.observed, deadlineSupported, issues) : null;

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
  const nextPayload =
    next.step === "complete" ? next.result.canonical : next.step === "fail" ? next.error.canonical : next.step === "await" ? next.wait.identity : "";
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
export const explainOutcomeIssues = (issues: readonly LocatedIssue[]): string => explainDiagnosticIssues(issues, true);

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
  readonly definitionRevisions: Uint8Array;
  readonly runtimeContractRevisions: Uint8Array;
  readonly progressCodecs: Uint8Array;
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
  readonly available: {
    readonly definitionRevisions: readonly string[];
    readonly runtimeContractRevisions: readonly string[];
    readonly progressCodecs: readonly string[];
  };
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
