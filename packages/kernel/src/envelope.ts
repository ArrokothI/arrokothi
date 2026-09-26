/**
 * Reading a caller-owned request envelope: own fields only, each observed once.
 *
 * These helpers were written for K1.1's creation, ingress and dispatch boundaries and moved here
 * unchanged in behavior when K1.2 added the Outcome envelope (`outcome.ts`), so both boundaries hold
 * one rule rather than two copies of it. The issue type they append is widened from `ValueIssue` to
 * `LocatedIssue` for the same reason: an Outcome envelope can be wrong in ways that are not
 * boundary-value codes (an unknown field, a duplicate Emission key), and those issues share the
 * list and the rendering.
 *
 * Everything here runs after caller-owned state may have been observed in the same tick, so it
 * follows the zone's rule (see `coordinator.ts`): load-time references and own-data lists only.
 */

import { appendAllOwn, appendOwn, readAt } from "./own-array.ts";
import { canonicalize, type ValueIssue } from "./values.ts";

const PrimordialArrayIsArray = Array.isArray;
/**
 * Load-time descriptor observation for own-only envelope reads (R3-BLOCKING): an ordinary
 * field read consults the whole prototype chain for a key the envelope does not own, so ambient
 * `Object.prototype`/`Array.prototype` pollution would answer missing fields into acceptances the
 * caller never spelled. The envelope's own data is what was sent; anything above it reads as
 * missing.
 */
const PrimordialGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;

/**
 * One located reason a request envelope was refused.
 *
 * `ValueIssue` is the boundary-value case of this shape; envelope-level issues add codes of their
 * own. `path` is dotted/bracketed from the envelope, `""` being the envelope itself.
 */
export interface LocatedIssue {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

/** One refusal issue, appended as own data. */
export const appendIssue = (target: LocatedIssue[], issue: LocatedIssue): void => {
  appendOwn(target, issue);
};

/** Every issue of another list, appended as own data and in order. */
export const appendIssues = (target: LocatedIssue[], extra: readonly LocatedIssue[]): void => {
  appendAllOwn(target, extra);
};

/** Re-locates a root's issues under the field name the caller used. */
export const located = (issues: readonly ValueIssue[], label: string): ValueIssue[] => {
  const out: ValueIssue[] = [];
  for (let index = 0; index < issues.length; index += 1) {
    const issue = readAt(issues, index) as ValueIssue;
    // Index read, not `String.prototype.startsWith`: refusal formatting runs after caller
    // observation in the same tick, and the method is caller-replaceable. String indexing is a
    // read of the string's own character position, not an array position, so no prototype is
    // consulted for it.
    const bracketed = issue.path.length > 0 && (issue.path[0] as string) === "[";
    const path = issue.path === "" ? label : bracketed ? `${label}${issue.path}` : `${label}.${issue.path}`;
    appendOwn(out, { ...issue, path });
  }
  return out;
};

/** Renders issues into one reason a person can act on. */
export const explain = (issues: readonly LocatedIssue[]): string => {
  let out = "";
  for (let index = 0; index < issues.length; index += 1) {
    const issue = readAt(issues, index) as LocatedIssue;
    if (index > 0) out += "; ";
    out += `${issue.path} ${issue.code}`;
  }
  return out;
};

/**
 * One identity-bearing request field, which has to be text before it can name anything.
 *
 * `identity.md` requires that two different requests never name one identity. This package gets that
 * from `packIdentity`'s length-prefixed packing, which is injective **over text**. A field that is
 * not text defeats it: every object stringifies to `[object Object]` with no length, so two
 * genuinely different creation keys, request keys or input kinds pack identically — and the Kernel
 * then answers a second, different request with the first one's retained decision, or refuses an
 * unrelated request as its conflict.
 *
 * TypeScript declares these fields `string`, but a request envelope crossing a Kernel boundary is
 * caller-supplied data, not a compile-time guarantee. So the boundary checks it, and refuses a
 * non-text identity field as a malformed value with the field named — the same answer, and the same
 * located reason, as any other unacceptable request content (K11-R3-ID-02).
 *
 * Text is then held to the ordinary boundary-value rules as well, so a lone surrogate or an
 * over-limit name is refused here rather than becoming part of a stored key.
 */
export function acceptIdentityText(value: unknown, label: string, issues: LocatedIssue[]): value is string {
  if (typeof value !== "string") {
    // Total classification (K11-R16-ID-01): `Array.isArray` performs `IsArray`, which throws a
    // `TypeError` on a revoked Proxy. The classifier runs on caller-owned values, so that throw
    // must become the same located refusal — never an exception escaping the boundary.
    let received: string;
    try {
      received = value === null ? "null" : PrimordialArrayIsArray(value) ? "array" : typeof value;
    } catch {
      received = "an uninspectable value";
    }
    appendIssue(issues, { path: label, code: "unsupported_form", message: `expected text that can name a request, received ${received}` });
    return false;
  }
  const checked = canonicalize(value);
  if (!checked.ok) {
    appendIssues(issues, located(checked.issues, label));
    return false;
  }
  return true;
}

/**
 * Activation IDs are opaque Kernel-issued strings, not caller-selected boundary-value text.
 *
 * Creation packs the trusted namespace, scope and key into an Execution ID; dispatch extends it.
 * Their composition can exceed a value string limit and the trusted namespace can contain any
 * UTF-16 code units. Accept every primitive string unchanged so every producer result is usable
 * for replay, currency and controls. Equality is exact; shape alone grants no authority and says
 * nothing about whether an exchange exists. No coercion, normalization or value capture belongs
 * here. See identity.md#runtime-attempt and BASELINE #outcome-acceptance-api.
 */
export function acceptActivationIdentity(value: unknown, label: string, issues: LocatedIssue[]): value is string {
  if (typeof value === "string") return true;
  appendIssue(issues, { path: label, code: "unsupported_form", message: "expected a primitive string naming an Activation" });
  return false;
}

/**
 * One caller-owned envelope field, observed from the envelope's own data only.
 *
 * The envelope is caller-owned state: on a revoked Proxy, or under a throwing getter, the read
 * itself throws. That failure is a fact *about this field*, so it is recorded as a located
 * `unstable_representation` issue rather than thrown out of the boundary (K11-R16-ID-01).
 *
 * A field the envelope does not own itself is missing — even when a prototype above it would
 * answer. Ordinary reads consult the whole chain, so ambient `Object.prototype`/`Array.prototype`
 * pollution (residue or same-tick trap-installed) would otherwise steer missing fields into
 * acceptances the caller never spelled: `dispatch({})` accepted by an ambient `bound`,
 * `create({})` accepted by ambient identity text, `dispatch([])` answered through the
 * `Array.prototype` chain (R3-BLOCKING). An envelope that carries a field only by inheritance
 * therefore reads exactly as one that omits it (KC1-DEC-6).
 *
 * A `null`/`undefined` holder owns no fields and observes as `undefined`, so the field validator
 * refuses it as malformed rather than the boundary throwing a `TypeError`. A primitive holder
 * likewise owns no text field. An own accessor still runs — a `get bound()` is the allowed caller
 * observation the single-observation rule already accounts for — and its throw maps the same way.
 */
export function observeOwn(holder: unknown, key: string): { readonly observed: unknown; readonly threw: boolean } {
  try {
    if (holder === null || holder === undefined) return { observed: undefined, threw: false };
    if (typeof holder !== "object" && typeof holder !== "function") return { observed: undefined, threw: false };
    // Own-descriptor first, never an ordinary read for the existence question: the descriptor
    // reports without invoking anything, and only an owned position may proceed to the read.
    // A Proxy's traps may throw here; that is the same observation failure as a throwing getter.
    if (PrimordialGetOwnPropertyDescriptor(holder, key) === undefined) return { observed: undefined, threw: false };
    // Owned, so the prototype chain is no longer on the path: own data answers directly and an
    // own accessor runs with the holder as receiver — the same single observation as before.
    return { observed: (holder as Record<string, unknown>)[key], threw: false };
  } catch {
    return { observed: undefined, threw: true };
  }
}

export function observeField(holder: unknown, key: string, label: string, issues: LocatedIssue[]): { readonly observed: unknown; readonly ok: boolean } {
  const seen = observeOwn(holder, key);
  if (seen.threw) {
    appendIssue(issues, { path: label, code: "unstable_representation", message: `request field ${label} could not be observed` });
    return { observed: undefined, ok: false };
  }
  return { observed: seen.observed, ok: true };
}

/**
 * `String.prototype.slice`, from load time: diagnostics are bounded after caller-owned state has
 * been observed in the same tick, when the live method may already have been replaced.
 */
const PrimordialStringSlice = String.prototype.slice;
const PrimordialReflectApply = Reflect.apply;

/** The most UTF-16 code units of a caller-supplied diagnostic string the Kernel retains. */
export const DIAGNOSTIC_LIMIT = 1_024;

/**
 * A bounded, total diagnostic from caller-supplied data (`execution-cycle.md`, delivery reporting).
 *
 * A primitive string keeps at most its first 1,024 UTF-16 code units, sliced through the load-time
 * reference; every other value - an object, a string object, a number, an accessor, a revoked Proxy,
 * a thenable - collapses to `fallback`. Nothing caller-owned is invoked: no `message` read, no
 * `String()` coercion, no `then` assimilation. The result is a fresh primitive, so a later caller
 * mutation cannot alter what the Kernel retained. Delivery failures (K1.1) and protocol-failure
 * reports (K1.2-DEC-8) share this rule.
 */
export const boundDiagnostic = (reason: unknown, fallback: string): string => {
  try {
    if (typeof reason === "string") {
      return PrimordialReflectApply(PrimordialStringSlice, reason, [0, DIAGNOSTIC_LIMIT]) as string;
    }
    return fallback;
  } catch {
    return fallback;
  }
};
