/**
 * K1.4-candidate — a narrow canonical-JSON encoder for laboratory values.
 *
 * The Kernel accepts values only as canonical UTF-8 bytes (`values.md` § Canonical form, RFC 8785).
 * The fixture hands the candidate plain JavaScript values, so every one of them crosses here first.
 *
 * **This is not a general wrapper.** It supports exactly the values a K0 schedule can hold and throws
 * on anything else. It never repairs a value: Kernel validation checks the bytes it receives, not the
 * value an encoder lost, so a lossy encoding would be accepted as a different value (design check 01
 * D01-CHK-06). Two things keep that from happening silently:
 *
 * - the domain is closed: `null`, booleans, finite numbers, well-formed strings, dense arrays, and
 *   objects whose prototype is `Object.prototype` or `null` with only own enumerable string-keyed data
 *   members. `NaN`, infinities, `undefined`, a hole, a lone surrogate, an accessor, a symbol key and any
 *   other prototype are refused;
 * - every encoding is decoded again and compared with its input, and a difference throws.
 *
 * Written for this candidate. No third-party code is copied or adapted, and the SDK wrapper is not used:
 * the candidate may depend on the Kernel package root only.
 */

/** A value this encoder accepts. */
export type LaboratoryValue = null | boolean | number | string | readonly LaboratoryValue[] | { readonly [key: string]: LaboratoryValue };

/** Raised for a value outside the declared domain. Never caught inside the candidate. */
export class UnsupportedLaboratoryValue extends Error {
  constructor(path: string, problem: string) {
    super(`laboratory value at ${path} is outside the candidate encoder's domain: ${problem}`);
    this.name = "UnsupportedLaboratoryValue";
  }
}

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

/** Whether every surrogate code unit in `text` is half of a pair. The repository's TypeScript lib predates `isWellFormed`. */
function wellFormed(text: string): boolean {
  for (let index = 0; index < text.length; index += 1) {
    const unit = text.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const low = text.charCodeAt(index + 1);
      if (!(low >= 0xdc00 && low <= 0xdfff)) return false;
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return false;
    }
  }
  return true;
}

function serialize(value: unknown, path: string): string {
  if (value === null) return "null";
  if (value === true) return "true";
  if (value === false) return "false";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new UnsupportedLaboratoryValue(path, "a number that is not finite");
    // RFC 8785 uses ECMAScript number serialization, which is what JSON.stringify applies; -0 is "0".
    return JSON.stringify(value);
  }
  if (typeof value === "string") {
    if (!wellFormed(value)) throw new UnsupportedLaboratoryValue(path, "a string with a lone surrogate");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const parts: string[] = [];
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new UnsupportedLaboratoryValue(`${path}[${index}]`, "an array hole");
      parts.push(serialize(value[index], `${path}[${index}]`));
    }
    if (Reflect.ownKeys(value).length !== value.length + 1) {
      throw new UnsupportedLaboratoryValue(path, "an array with members other than its elements");
    }
    return `[${parts.join(",")}]`;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new UnsupportedLaboratoryValue(path, "an object that is not a plain record");
    }
    const names: string[] = [];
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") throw new UnsupportedLaboratoryValue(path, "a symbol-keyed member");
      names.push(key);
    }
    // Default string order compares UTF-16 code units, which is RFC 8785's member order.
    names.sort();
    const parts: string[] = [];
    for (const name of names) {
      const descriptor = Object.getOwnPropertyDescriptor(value, name) as PropertyDescriptor;
      const memberPath = `${path}.${name}`;
      if (!wellFormed(name)) throw new UnsupportedLaboratoryValue(path, "a member name with a lone surrogate");
      if (!("value" in descriptor)) throw new UnsupportedLaboratoryValue(memberPath, "an accessor member");
      if (descriptor.enumerable !== true) throw new UnsupportedLaboratoryValue(memberPath, "a non-enumerable member");
      parts.push(`${JSON.stringify(name)}:${serialize(descriptor.value, memberPath)}`);
    }
    return `{${parts.join(",")}}`;
  }
  throw new UnsupportedLaboratoryValue(path, value === undefined ? "undefined" : `a ${typeof value}`);
}

/** Structural equality over the encoder's domain. Own members only, so an own `__proto__` member counts. */
function same(left: unknown, right: unknown): boolean {
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return Object.is(left, right) || (left === 0 && right === 0);
  }
  if (Array.isArray(left) !== Array.isArray(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  for (let index = 0; index < leftKeys.length; index += 1) {
    const key = leftKeys[index] as string;
    if (key !== rightKeys[index]) return false;
    const leftMember = (Object.getOwnPropertyDescriptor(left, key) as PropertyDescriptor).value as unknown;
    const rightMember = (Object.getOwnPropertyDescriptor(right, key) as PropertyDescriptor).value as unknown;
    if (!same(leftMember, rightMember)) return false;
  }
  return true;
}

/** The canonical JSON text of `value`, or a throw when it is outside the domain. */
export function canonicalText(value: unknown): string {
  const text = serialize(value, "$");
  if (!same(JSON.parse(text) as unknown, value)) {
    throw new UnsupportedLaboratoryValue("$", "its canonical text does not decode to the same value");
  }
  return text;
}

/** The canonical UTF-8 bytes of `value`: one fresh byte root per call. */
export function canonicalBytes(value: unknown): Uint8Array {
  return encoder.encode(canonicalText(value));
}

/**
 * A plain mutable copy of a Kernel-owned boundary value, for structural comparison by the runner.
 *
 * The Kernel returns deeply frozen values. The runner compares with `deepStrictEqual`, which also
 * compares prototypes, so the copy is rebuilt through canonical text and `JSON.parse`.
 */
export function plainCopy(value: unknown): unknown {
  return JSON.parse(canonicalText(value)) as unknown;
}

/** Decodes canonical bytes for tests. */
export function decodeBytes(bytes: Uint8Array): unknown {
  return JSON.parse(decoder.decode(bytes)) as unknown;
}
