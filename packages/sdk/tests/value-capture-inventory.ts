/** BINDING-01: unchanged live-object capture inventory, now owned by the SDK wrapper. */
import type { InventoryEntry } from '../../kernel/tests/zone-inventory.ts';
const DESCRIPTOR = "engine-built descriptor; own-value check precedes value access";
const STRING = "primitive string position below its own length";
export const ACCESS_INVENTORY: readonly InventoryEntry[] = [
  // own-array.ts
  { file: "own-array.ts", kind: "assertion", mode: "introduce", text: "PrimordialObjectCreate(null) as { value: unknown; writable: boolean; enumerable: boolean; configurable: boolean; }", count: 1, reason: "the null-prototype descriptor under construction in defineData" },
  { file: "own-array.ts", kind: "assertion", mode: "introduce", text: "PrimordialObjectCreate(null) as { value?: unknown; writable?: unknown; enumerable?: unknown; configurable?: unknown; get?: unknown; set?: unknown; }", count: 1, reason: "the null-prototype descriptor under construction in restoreDescriptor" },
  { file: "own-array.ts", kind: "dynamic", mode: "delete", text: "(holder as Record<string | symbol, unknown>)[key]", count: 1, reason: "restoreDescriptor removing a slot that did not exist when saved: [[Delete]] of an own property, no prototype consulted" },
  { file: "own-array.ts", kind: "optional", mode: "read", text: "(fieldDescriptor as { readonly value?: unknown }).value", count: 1, guard: "fieldDescriptor", reason: DESCRIPTOR },
  { file: "own-array.ts", kind: "optional", mode: "read", text: "descriptor.value", count: 1, guard: "descriptor", reason: "readAt: " + DESCRIPTOR },
  ...(["value", "writable", "enumerable", "configurable", "get", "set"] as const).map((field): InventoryEntry => ({
    file: "own-array.ts", kind: "optional", mode: "write", text: `safe.${field}`, count: 1, reason: "a null-prototype descriptor under construction: no chain to consult",
  })),
  // value-capture.ts
  { file: "value-capture.ts", kind: "assertion", mode: "introduce", text: "PrimordialArrayIteratorPrototype as { readonly next: unknown }", count: 1, reason: "load-time capture of %ArrayIteratorPrototype%.next, an own member, before any caller code runs" },
  { file: "value-capture.ts", kind: "assertion", mode: "introduce", text: "container as { length: unknown }", count: 1, getter: true, reason: "observeArrayLength: the ordinary read of `length` on a value capture already classified as a non-Proxy Array exotic object, which owns `length` as data by construction; its own descriptor is read and compared first (K1.1-correction-03 moved this read out of captureArray)" },
  { file: "value-capture.ts", kind: "assertion", mode: "strengthen", text: "entry as { occurrences: number }", count: 1, reason: "a suffix entry (index 8 or more), which only pushIssue appends, always with an own `occurrences`; control-commits.test.ts verifies that pushIssue is the only mutator of these lists" },
  { file: "value-capture.ts", kind: "builtin", mode: "read", text: "PrimordialSymbol.iterator", count: 1, reason: "a non-writable, non-configurable own property of the load-time Symbol constructor" },
  { file: "value-capture.ts", kind: "dynamic", mode: "delete", text: "(entry.holder as Record<string | symbol, unknown>)[entry.key]", count: 2, reason: "the serializer environment removing and restoring saved own slots: [[Delete]] of an own property" },
  { file: "value-capture.ts", kind: "dynamic", mode: "read", text: "(container as Record<string, unknown>)[key]", count: 2, getter: true, reason: "observeElement and readMember: the one ordinary read of a position, only after its own descriptor proved own data, on a value capture already found not to be a Proxy (K1.1-correction-03 moved it out of describedValue)" },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "Array.prototype[Symbol.iterator]", count: 1, reason: "load-time primordial capture, before any caller code runs" },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "holders[holderIndex]", count: 2, bounded: true, reason: "a module-private literal list of primordial holders, read below its length" },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "keys[keyIndex]", count: 1, bounded: true, reason: "the engine-built own-keys list, read below its length" },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "name[0]", count: 1, reason: "first code unit of a member name of length above 1" },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "name[index]", count: 1, bounded: true, reason: STRING },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "names[nameIndex]", count: 6, bounded: true, reason: "the engine-built own-names list, read below its length" },
  { file: "value-capture.ts", kind: "index", mode: "read", text: "text[index]", count: 2, bounded: true, reason: STRING },
  { file: "value-capture.ts", kind: "optional", mode: "read", text: "descriptor.enumerable", count: 1, reason: "every engine-built descriptor owns `enumerable`" },
  { file: "value-capture.ts", kind: "optional", mode: "read", text: "descriptor.value", count: 4, guard: "descriptor", reason: DESCRIPTOR },
  { file: "value-capture.ts", kind: "optional", mode: "read", text: "innerDescriptor.value", count: 1, guard: "innerDescriptor", reason: DESCRIPTOR },
  { file: "value-capture.ts", kind: "optional", mode: "read", text: "lengthDescriptor.value", count: 3, guard: "lengthDescriptor", reason: DESCRIPTOR },
  { file: "value-capture.ts", kind: "optional", mode: "read", text: "lengthDescriptorInner.value", count: 2, guard: "lengthDescriptorInner", reason: DESCRIPTOR },
];
export const EXTRA_ENVELOPE_PARAMETERS: readonly string[] = [];
export const FOREIGN_CALLS = new Map([["encode canonicalizeJcs(toSerializationSafe(value))", "SDK JCS dependency on the frozen serialization clone inside restored serializer environment"]]);
export const EFFECT_OVERRIDES = new Map([["withSerializerEnvironment", { foreign: true, mutates: false, callsParameters: [0], reason: "SDK install-and-restore around the serializer" }]]);
export const getterReads = () => new Set(ACCESS_INVENTORY.filter(entry => entry.getter).map(entry => `${entry.file} ${entry.text}`));
