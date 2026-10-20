/** Strict JSON/JCS machinery. Only owned buffers and parse data reach the decoder/encoder.
 * Intrinsics are captured once at trusted initialization. No caller object graph is traversed.
 * This file also supplies the separate transport adapter's parser; core admission is always strict.
 */
import { types as UtilTypes } from "node:util";
import { defineData, readAt } from "./own-array.ts";
import { BOUNDARY_LIMITS, type BoundaryValue, type CanonicalValue, type ValueAcceptance, type ValueIssue, type ValueIssueCode } from "./value-types.ts";

const PrimordialApply = Reflect.apply;
const PrimordialUint8Array = Uint8Array;
const PrimordialIsUint8Array = UtilTypes.isUint8Array;
const PrimordialIsSharedArrayBuffer = UtilTypes.isSharedArrayBuffer;
const PrimordialIsProxy = UtilTypes.isProxy;
const PrimordialTypedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
const PrimordialLength = Object.getOwnPropertyDescriptor(PrimordialTypedArrayPrototype, "length")!.get!;
const PrimordialBuffer = Object.getOwnPropertyDescriptor(PrimordialTypedArrayPrototype, "buffer")!.get!;
const PrimordialSet = Uint8Array.prototype.set;
const PrimordialFreeze = Object.freeze;
const PrimordialKeys = Object.keys;
const PrimordialOwn = Object.prototype.hasOwnProperty;
const PrimordialArrayIsArray = Array.isArray;
const PrimordialSort = Array.prototype.sort;
const PrimordialCharAt = String.prototype.charAt;
const PrimordialCharCode = String.prototype.charCodeAt;
const PrimordialFromCharCode = String.fromCharCode;
const PrimordialSlice = String.prototype.slice;
const PrimordialNumber = Number;
const PrimordialFinite = Number.isFinite;
const PrimordialNumberText = Number.prototype.toString;

export const isProxyValue = PrimordialIsProxy;
const at = (text: string, index: number): string => PrimordialApply(PrimordialCharAt, text, [index]) as string;
const byteLength = (bytes: Uint8Array): number => PrimordialApply(PrimordialLength, bytes, []) as number;
const unitAt = (text: string, index: number): number => PrimordialApply(PrimordialCharCode, text, [index]) as number;
const slice = (text: string, start: number, end: number): string => PrimordialApply(PrimordialSlice, text, [start, end]) as string;
const issue = (code: ValueIssueCode, message: string): ValueIssue => PrimordialFreeze({ path: "", code, message });
const refusal = <T>(problem: ValueIssue): ValueAcceptance<T> => PrimordialFreeze({ ok: false, issues: PrimordialFreeze([problem]) });

/** Primitive identity text shares the historical string rules, but never JSON encoding/capture. */
export function identityTextIssue(text: string): ValueIssue | null {
  if (text.length > 2 * BOUNDARY_LIMITS.stringScalarValues) return issue("string_too_long", `string cannot fit within the limit of ${BOUNDARY_LIMITS.stringScalarValues} Unicode scalar values`);
  let scalars = 0;
  for (let index = 0; index < text.length; index += 1) {
    scalars += 1;
    if (scalars > BOUNDARY_LIMITS.stringScalarValues) return issue("string_too_long", `string cannot fit within the limit of ${BOUNDARY_LIMITS.stringScalarValues} Unicode scalar values`);
    const unit = unitAt(text, index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = index + 1 < text.length ? unitAt(text, index + 1) : -1;
      if (next < 0xdc00 || next > 0xdfff) return issue("lone_surrogate", "string contains an unpaired surrogate and has no UTF-8 encoding");
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return issue("lone_surrogate", "string contains an unpaired surrogate and has no UTF-8 encoding");
  }
  return null;
}

/** Preflight uses internal slots only; copy uses native typed-array set, never caller methods. */
export function copyByteInput(input: unknown, limit: number, transport = false): ValueAcceptance<Uint8Array> {
  if (!PrimordialIsUint8Array(input)) return refusal(issue("unsupported_form", "expected a Uint8Array of canonical UTF-8 bytes"));
  try {
    const length = PrimordialApply(PrimordialLength, input, []) as number;
    if (length > limit) return refusal(issue(transport ? "transport_too_large" : "too_many_bytes", transport ? "JSON transport exceeds its wire-byte cap" : `canonical form exceeds the limit of ${BOUNDARY_LIMITS.canonicalBytes} bytes`));
    const backing = PrimordialApply(PrimordialBuffer, input, []);
    if (PrimordialIsSharedArrayBuffer(backing)) return refusal(issue("unsupported_form", "shared backing memory cannot supply a stable byte snapshot"));
    const bytes = new PrimordialUint8Array(length);
    PrimordialApply(PrimordialSet, bytes, [input]); // Also refuses a detached source, including length zero.
    return { ok: true, value: bytes };
  } catch {
    return refusal(issue("unstable_representation", "byte view could not be copied"));
  }
}

/** UTF-8 is decoded explicitly: fatal, shortest forms only, no surrogate scalars or BOM removal. */
function decodeUtf8(bytes: Uint8Array): ValueAcceptance<string> {
  let text = "";
  for (let index = 0; index < byteLength(bytes);) {
    const first = bytes[index++]!;
    let scalar: number;
    let continuation: number;
    let minimum: number;
    if (first < 0x80) { scalar = first; continuation = 0; minimum = 0; }
    else if (first >= 0xc2 && first <= 0xdf) { scalar = first & 0x1f; continuation = 1; minimum = 0x80; }
    else if (first >= 0xe0 && first <= 0xef) { scalar = first & 0x0f; continuation = 2; minimum = 0x800; }
    else if (first >= 0xf0 && first <= 0xf4) { scalar = first & 7; continuation = 3; minimum = 0x10000; }
    else return refusal(issue("invalid_utf8", "expected well-formed UTF-8"));
    if (index + continuation > byteLength(bytes)) return refusal(issue("invalid_utf8", "truncated UTF-8 sequence"));
    for (let count = 0; count < continuation; count += 1) {
      const next = bytes[index++]!;
      if (next < 0x80 || next > 0xbf) return refusal(issue("invalid_utf8", "expected UTF-8 continuation byte"));
      scalar = (scalar << 6) | (next & 0x3f);
    }
    if (scalar < minimum || scalar > 0x10ffff || (scalar >= 0xd800 && scalar <= 0xdfff)) return refusal(issue("invalid_utf8", "invalid Unicode scalar encoding"));
    text += scalar <= 0xffff ? PrimordialFromCharCode(scalar) : PrimordialFromCharCode(0xd800 + ((scalar - 0x10000) >> 10), 0xdc00 + ((scalar - 0x10000) & 0x3ff));
  }
  return { ok: true, value: text };
}

/** Input is owned well-formed text; allocation is bounded before it is made. */
export function encodeUtf8(text: string): Uint8Array {
  let count = 0;
  for (let index = 0; index < text.length; index += 1) {
    const unit = unitAt(text, index);
    if (unit < 0x80) count += 1;
    else if (unit < 0x800) count += 2;
    else if (unit >= 0xd800 && unit <= 0xdbff) { count += 4; index += 1; }
    else count += 3;
  }
  const bytes = new PrimordialUint8Array(count);
  let offset = 0;
  for (let index = 0; index < text.length; index += 1) {
    let unit = unitAt(text, index);
    if (unit < 0x80) bytes[offset++] = unit;
    else if (unit < 0x800) { bytes[offset++] = 0xc0 | (unit >> 6); bytes[offset++] = 0x80 | (unit & 63); }
    else if (unit >= 0xd800 && unit <= 0xdbff) {
      unit = 0x10000 + ((unit - 0xd800) << 10) + unitAt(text, ++index) - 0xdc00;
      bytes[offset++] = 0xf0 | (unit >> 18); bytes[offset++] = 0x80 | ((unit >> 12) & 63);
      bytes[offset++] = 0x80 | ((unit >> 6) & 63); bytes[offset++] = 0x80 | (unit & 63);
    } else { bytes[offset++] = 0xe0 | (unit >> 12); bytes[offset++] = 0x80 | ((unit >> 6) & 63); bytes[offset++] = 0x80 | (unit & 63); }
  }
  return bytes;
}

interface ParseState { text: string; position: number; problem: ValueIssue | null }
const fail = (state: ParseState, code: ValueIssueCode, message: string): null => {
  if (state.problem === null) state.problem = issue(code, message);
  return null;
};
const space = (state: ParseState): void => {
  while (state.position < state.text.length) {
    const ch = at(state.text, state.position);
    if (ch !== " " && ch !== "\t" && ch !== "\r" && ch !== "\n") break;
    state.position += 1;
  }
};
const hex = (unit: number): number => unit >= 48 && unit <= 57 ? unit - 48 : unit >= 65 && unit <= 70 ? unit - 55 : unit >= 97 && unit <= 102 ? unit - 87 : -1;
const digit = (ch: string | undefined): boolean => ch !== undefined && ch !== "" && ch >= "0" && ch <= "9";

function stringValue(state: ParseState): string | null {
  state.position += 1; // opening quote
  let text = "";
  // Count scalar values as decoded; a high surrogate remains pending until the following unit.
  let scalars = 0;
  let high = false;
  while (state.position < state.text.length) {
    let unit = unitAt(state.text, state.position++);
    if (unit === 34) {
      if (high) return fail(state, "lone_surrogate", "string contains an unpaired surrogate and has no UTF-8 encoding");
      return text;
    }
    if (unit < 32) return fail(state, "invalid_json", "unescaped control character in string");
    if (unit === 92) {
      if (state.position >= state.text.length) return fail(state, "invalid_json", "truncated string escape");
      const escape = at(state.text, state.position++);
      if (escape === '"') unit = 34;
      else if (escape === "\\") unit = 92;
      else if (escape === "/") unit = 47;
      else if (escape === "b") unit = 8;
      else if (escape === "f") unit = 12;
      else if (escape === "n") unit = 10;
      else if (escape === "r") unit = 13;
      else if (escape === "t") unit = 9;
      else if (escape === "u") {
        unit = 0;
        for (let count = 0; count < 4; count += 1) {
          if (state.position >= state.text.length) return fail(state, "invalid_json", "truncated Unicode escape");
          const nibble = hex(unitAt(state.text, state.position++));
          if (nibble < 0) return fail(state, "invalid_json", "invalid Unicode escape");
          unit = (unit << 4) | nibble;
        }
      } else return fail(state, "invalid_json", "invalid string escape");
    }
    if (high) {
      if (unit < 0xdc00 || unit > 0xdfff) return fail(state, "lone_surrogate", "string contains an unpaired surrogate and has no UTF-8 encoding");
      high = false;
    } else {
      scalars += 1;
      if (scalars > BOUNDARY_LIMITS.stringScalarValues) return fail(state, "string_too_long", `string cannot fit within the limit of ${BOUNDARY_LIMITS.stringScalarValues} Unicode scalar values`);
      if (unit >= 0xdc00 && unit <= 0xdfff) return fail(state, "lone_surrogate", "string contains an unpaired surrogate and has no UTF-8 encoding");
      high = unit >= 0xd800 && unit <= 0xdbff;
    }
    text += PrimordialFromCharCode(unit);
  }
  return fail(state, "invalid_json", "unterminated string");
}

function numberValue(state: ParseState): number | null {
  const start = state.position;
  if (at(state.text, state.position) === "-") state.position += 1;
  if (at(state.text, state.position) === "0") state.position += 1;
  else {
    const first = at(state.text, state.position);
    if (first === undefined || first < "1" || first > "9") return fail(state, "invalid_json", "invalid number");
    while (digit(at(state.text, state.position))) state.position += 1;
  }
  if (at(state.text, state.position) === ".") {
    state.position += 1;
    if (!digit(at(state.text, state.position))) return fail(state, "invalid_json", "missing fraction digits");
    while (digit(at(state.text, state.position))) state.position += 1;
  }
  if (at(state.text, state.position) === "e" || at(state.text, state.position) === "E") {
    state.position += 1;
    if (at(state.text, state.position) === "+" || at(state.text, state.position) === "-") state.position += 1;
    if (!digit(at(state.text, state.position))) return fail(state, "invalid_json", "missing exponent digits");
    while (digit(at(state.text, state.position))) state.position += 1;
  }
  const value = PrimordialNumber(slice(state.text, start, state.position));
  if (!PrimordialFinite(value)) return fail(state, "non_finite_number", "expected a finite number, received a non-finite number");
  return value;
}

function parseValue(state: ParseState, level: number): BoundaryValue {
  space(state);
  const ch = at(state.text, state.position);
  if (ch === '"') return stringValue(state);
  if (ch === "-" || digit(ch)) return numberValue(state);
  if (ch === "t" && slice(state.text, state.position, state.position + 4) === "true") { state.position += 4; return true; }
  if (ch === "f" && slice(state.text, state.position, state.position + 5) === "false") { state.position += 5; return false; }
  if (ch === "n" && slice(state.text, state.position, state.position + 4) === "null") { state.position += 4; return null; }
  if (ch !== "[" && ch !== "{") return fail(state, "invalid_json", "expected a JSON value");
  if (level >= BOUNDARY_LIMITS.containerDepth) return fail(state, "too_deep", `container nesting passes the depth limit of ${BOUNDARY_LIMITS.containerDepth}`);
  const array = ch === "[";
  const value: BoundaryValue[] | { [key: string]: BoundaryValue } = array ? [] : {};
  const closing = array ? "]" : "}";
  state.position += 1;
  space(state);
  if (at(state.text, state.position) === closing) { state.position += 1; return PrimordialFreeze(value); }
  let count = 0;
  while (state.problem === null) {
    if (count >= BOUNDARY_LIMITS.containerEntries) return fail(state, "too_many_entries", `container exceeds the limit of ${BOUNDARY_LIMITS.containerEntries} entries`);
    let key = `${count}`;
    if (!array) {
      if (at(state.text, state.position) !== '"') return fail(state, "invalid_json", "expected an object member name");
      const name = stringValue(state);
      if (name === null) return null;
      key = name;
      if (PrimordialApply(PrimordialOwn, value, [key])) return fail(state, "duplicate_key", "decoded object member name appears more than once");
      space(state);
      if (at(state.text, state.position++) !== ":") return fail(state, "invalid_json", "expected a colon after member name");
    }
    const entry = parseValue(state, level + 1);
    if (state.problem !== null) return null;
    defineData(value, key, entry, false, true, false);
    count += 1;
    space(state);
    const separator = at(state.text, state.position++);
    if (separator === closing) return PrimordialFreeze(value);
    if (separator !== ",") return fail(state, "invalid_json", "expected comma or closing delimiter");
    space(state);
  }
  return null;
}

const HEX = "0123456789abcdef";
function quote(text: string): string {
  let out = '"';
  for (let index = 0; index < text.length; index += 1) {
    const unit = unitAt(text, index);
    if (unit === 34) out += '\\"';
    else if (unit === 92) out += "\\\\";
    else if (unit === 8) out += "\\b";
    else if (unit === 9) out += "\\t";
    else if (unit === 10) out += "\\n";
    else if (unit === 12) out += "\\f";
    else if (unit === 13) out += "\\r";
    else if (unit < 32) out += `\\u00${at(HEX, unit >> 4)}${at(HEX, unit & 15)}`;
    else out += at(text, index);
  }
  return out + '"';
}

/** Called only on this module's owned parse; never an object-intake API or package export. */
function encode(value: BoundaryValue): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return PrimordialApply(PrimordialNumberText, value, [10]) as string;
  if (typeof value === "string") return quote(value);
  if (PrimordialArrayIsArray(value)) {
    let out = "[";
    for (let index = 0; index < value.length; index += 1) out += (index === 0 ? "" : ",") + encode(readAt(value, index) as BoundaryValue);
    return out + "]";
  }
  const keys = PrimordialKeys(value);
  PrimordialApply(PrimordialSort, keys, []); // Dense own strings, lexicographic UTF-16 order.
  let out = "{";
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index]!;
    out += (index === 0 ? "" : ",") + quote(key) + ":" + encode((value as { readonly [key: string]: BoundaryValue })[key]!);
  }
  return out + "}";
}

/** The boolean is private to core/transport plumbing; no public core entry accepts lenient text. */
export function parseOwnedBytes(bytes: Uint8Array, strict: boolean): ValueAcceptance<CanonicalValue> {
  const decoded = decodeUtf8(bytes);
  if (!decoded.ok) return decoded;
  const text = decoded.value;
  if (text.length > 0 && unitAt(text, 0) === 0xfeff) return refusal(issue("invalid_json", "a JSON root must not start with a byte order mark"));
  const state: ParseState = { text, position: 0, problem: null };
  const value = parseValue(state, 0);
  if (state.problem !== null) return refusal(state.problem);
  space(state);
  if (state.position !== text.length) return refusal(issue("invalid_json", "data follows the JSON root"));
  const canonical = encode(value);
  if (strict && canonical !== text) return refusal(issue("non_canonical", "input is not the exact canonical encoding of its value"));
  // A lenient JSON root can expand under canonical escaping; cap encoded size as well as wire size.
  if (canonical.length > BOUNDARY_LIMITS.canonicalBytes) return refusal(issue("too_many_bytes", `canonical form exceeds the limit of ${BOUNDARY_LIMITS.canonicalBytes} bytes`));
  const encoded = strict ? bytes : encodeUtf8(canonical);
  if (byteLength(encoded) > BOUNDARY_LIMITS.canonicalBytes) return refusal(issue("too_many_bytes", `canonical form exceeds the limit of ${BOUNDARY_LIMITS.canonicalBytes} bytes`));
  return PrimordialFreeze({ ok: true, value: PrimordialFreeze({ bytes: encoded, value, canonical, canonicalBytes: byteLength(encoded) }) });
}
