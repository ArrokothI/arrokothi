/**
 * The reasoned inventory the zone analysis is checked against (correction DEC-8/DEC-9, contract
 * revision 8). Every site `zone-analysis.ts` reports must appear here with its reason, at its exact
 * count; a new site fails until it is classified or removed. `ambient-reads.test.ts` and
 * `control-commits.test.ts` both read this file.
 */

import type { AccessKind, AccessMode } from "./zone-analysis.ts";

export interface InventoryEntry {
  readonly file: string;
  readonly kind: AccessKind;
  readonly mode: AccessMode;
  readonly text: string;
  readonly count: number;
  readonly reason: string;
  /** A receiver whose `hasOwnValue(...)` check must precede the read in its function. */
  readonly guard?: string;
  /** The index read sits in a `for (let i = n; i < X.length; i += 1)` loop that leaves `i` and `X` unchanged. */
  readonly bounded?: true;
  /** The read may run caller code (an own accessor or a Proxy trap): the effect analysis treats it as foreign. */
  readonly getter?: true;
}

const DESCRIPTOR = "engine-built property descriptor; `value` is read only after `hasOwnValue` proves the descriptor owns it";
const KERNEL_LIST = "a Kernel-built dense list (appendOwn/literal), read below its own length";
const STRING = "a string, read below its own length: an own character position, no prototype consulted";

export const ACCESS_INVENTORY: readonly InventoryEntry[] = [
  // coordinator.ts
  { file: "coordinator.ts", kind: "assertion", mode: "introduce", text: "initialObserved as InputContent", count: 1, reason: "an observed caller value already checked to be a non-null object; acceptInputContent reads it only through observeField (its parameter is an envelope seed below)" },
  { file: "coordinator.ts", kind: "envelope", mode: "read", text: "captured.available.definitionRevisions", count: 1, reason: "CapturedRecovery.available is captureRecovery's frozen Kernel copy, which reuses the CodeAvailability interface" },
  { file: "coordinator.ts", kind: "envelope", mode: "read", text: "captured.available.runtimeContractRevisions", count: 1, reason: "the same frozen Kernel copy of the availability lists" },
  { file: "coordinator.ts", kind: "envelope", mode: "read", text: "captured.available.progressCodecs", count: 1, reason: "the same frozen Kernel copy of the availability lists" },
  { file: "coordinator.ts", kind: "index", mode: "read", text: "controls[index]", count: 1, bounded: true, reason: "the trusted host's controlScopes list (DEC-8 host contract), read below its own length" },
  { file: "coordinator.ts", kind: "index", mode: "read", text: "scalars[scalarIndex]", count: 1, bounded: true, reason: KERNEL_LIST },
  { file: "coordinator.ts", kind: "spread", mode: "read", text: "...already.decision", count: 1, reason: "the frozen Kernel-built decision retained for replay" },
  { file: "coordinator.ts", kind: "spread", mode: "read", text: "...base", count: 1, reason: "a view literal built immediately above" },
  { file: "coordinator.ts", kind: "spread", mode: "read", text: "...decision", count: 1, reason: "#accept's frozen Kernel-built decision" },
  { file: "coordinator.ts", kind: "spread", mode: "read", text: "...entry.inputId", count: 1, reason: "the frozen Kernel copy of an accepted Input ID" },
  { file: "coordinator.ts", kind: "spread", mode: "read", text: "...exchange.activation", count: 1, reason: "the frozen Kernel-built Activation (takeover copies it with a new epoch)" },
  // envelope.ts
  { file: "envelope.ts", kind: "dynamic", mode: "read", text: "(holder as Record<string, unknown>)[key]", count: 1, getter: true, reason: "observeOwn: the single own observation, reached only after the holder's own descriptor was found" },
  { file: "envelope.ts", kind: "envelope", mode: "read", text: "(holder as Record<string, unknown>)[key]", count: 1, reason: "the same observation: the one member access the envelope rule permits on a caller-owned value" },
  { file: "envelope.ts", kind: "index", mode: "read", text: "issue.path[0]", count: 1, reason: "first code unit of a Kernel-built path, read only when the path is non-empty" },
  { file: "envelope.ts", kind: "index", mode: "read", text: "projected.path[0]", count: 1, reason: "first code unit of a projected path, read only when it is not empty" },
  { file: "envelope.ts", kind: "index", mode: "read", text: "text[index]", count: 2, bounded: true, reason: STRING },
  { file: "envelope.ts", kind: "optional", mode: "read", text: 'PrimordialGetOwnPropertyDescriptor(issue, "occurrences")?.value', count: 3, reason: "descriptor of a Kernel-built issue's own data field (or none): a data descriptor owns `value`" },
  { file: "envelope.ts", kind: "optional", mode: "read", text: 'PrimordialGetOwnPropertyDescriptor(issue, "root")?.value', count: 1, reason: "same: Kernel-built issue, data field" },
  { file: "envelope.ts", kind: "spread", mode: "read", text: "...issue", count: 1, reason: "a Kernel-built issue record" },
  // identity.ts
  { file: "identity.ts", kind: "dynamic", mode: "read", text: "BOUNDARY_PREFIX[boundary]", count: 1, reason: "module-private literal owning every ReceiptBoundary key; `boundary` is always a Kernel literal" },
  { file: "identity.ts", kind: "index", mode: "read", text: "caller.scopes[index]", count: 1, bounded: true, reason: "the trusted host's scopes list (host contract), read below its own length" },
  { file: "identity.ts", kind: "index", mode: "read", text: "parts[index]", count: 1, bounded: true, reason: "a Kernel array literal of identity parts, read below its length" },
  // lifecycle.ts
  { file: "lifecycle.ts", kind: "index", mode: "read", text: "TERMINAL_STATES[index]", count: 1, bounded: true, reason: "a module-private frozen literal, read below its length" },
  // outcome.ts
  { file: "outcome.ts", kind: "index", mode: "read", text: "allowed[position]", count: 1, bounded: true, reason: "a Kernel literal list of known field names, read below its length" },
  { file: "outcome.ts", kind: "index", mode: "read", text: "key[index]", count: 2, bounded: true, reason: STRING },
  { file: "outcome.ts", kind: "index", mode: "read", text: "keys[index]", count: 1, bounded: true, reason: "the engine-built own-keys list, read below its length" },
  // own-array.ts
  { file: "own-array.ts", kind: "assertion", mode: "introduce", text: "PrimordialObjectCreate(null) as { value: unknown; writable: boolean; enumerable: boolean; configurable: boolean; }", count: 1, reason: "the null-prototype descriptor under construction in defineData" },
  { file: "own-array.ts", kind: "assertion", mode: "introduce", text: "PrimordialObjectCreate(null) as { value?: unknown; writable?: unknown; enumerable?: unknown; configurable?: unknown; get?: unknown; set?: unknown; }", count: 1, reason: "the null-prototype descriptor under construction in restoreDescriptor" },
  { file: "own-array.ts", kind: "dynamic", mode: "delete", text: "(holder as Record<string | symbol, unknown>)[key]", count: 1, reason: "restoreDescriptor removing a slot that did not exist when saved: [[Delete]] of an own property, no prototype consulted" },
  { file: "own-array.ts", kind: "optional", mode: "read", text: "(fieldDescriptor as { readonly value?: unknown }).value", count: 1, guard: "fieldDescriptor", reason: DESCRIPTOR },
  { file: "own-array.ts", kind: "optional", mode: "read", text: "descriptor.value", count: 1, guard: "descriptor", reason: "readAt: " + DESCRIPTOR },
  ...(["value", "writable", "enumerable", "configurable", "get", "set"] as const).map((field): InventoryEntry => ({
    file: "own-array.ts", kind: "optional", mode: "write", text: `safe.${field}`, count: 1, reason: "a null-prototype descriptor under construction: no chain to consult",
  })),
  // values.ts
  { file: "values.ts", kind: "assertion", mode: "introduce", text: "PrimordialArrayIteratorPrototype as { readonly next: unknown }", count: 1, reason: "load-time capture of %ArrayIteratorPrototype%.next, an own member, before any caller code runs" },
  { file: "values.ts", kind: "assertion", mode: "introduce", text: "container as { length: unknown }", count: 1, getter: true, reason: "observeArrayLength: the ordinary read of `length` on a value capture already classified as a non-Proxy Array exotic object, which owns `length` as data by construction; its own descriptor is read and compared first (K1.1-correction-03 moved this read out of captureArray)" },
  { file: "values.ts", kind: "assertion", mode: "strengthen", text: "entry as { occurrences: number }", count: 1, reason: "a suffix entry (index 8 or more), which only pushIssue appends, always with an own `occurrences`; control-commits.test.ts verifies that pushIssue is the only mutator of these lists" },
  { file: "values.ts", kind: "builtin", mode: "read", text: "PrimordialSymbol.iterator", count: 1, reason: "a non-writable, non-configurable own property of the load-time Symbol constructor" },
  { file: "values.ts", kind: "dynamic", mode: "delete", text: "(entry.holder as Record<string | symbol, unknown>)[entry.key]", count: 2, reason: "the serializer environment removing and restoring saved own slots: [[Delete]] of an own property" },
  { file: "values.ts", kind: "dynamic", mode: "read", text: "(container as Record<string, unknown>)[key]", count: 2, getter: true, reason: "observeElement and readMember: the one ordinary read of a position, only after its own descriptor proved own data, on a value capture already found not to be a Proxy (K1.1-correction-03 moved it out of describedValue)" },
  { file: "values.ts", kind: "index", mode: "read", text: "Array.prototype[Symbol.iterator]", count: 1, reason: "load-time primordial capture, before any caller code runs" },
  { file: "values.ts", kind: "index", mode: "read", text: "holders[holderIndex]", count: 2, bounded: true, reason: "a module-private literal list of primordial holders, read below its length" },
  { file: "values.ts", kind: "index", mode: "read", text: "keys[keyIndex]", count: 1, bounded: true, reason: "the engine-built own-keys list, read below its length" },
  { file: "values.ts", kind: "index", mode: "read", text: "name[0]", count: 1, reason: "first code unit of a member name of length above 1" },
  { file: "values.ts", kind: "index", mode: "read", text: "name[index]", count: 1, bounded: true, reason: STRING },
  { file: "values.ts", kind: "index", mode: "read", text: "names[nameIndex]", count: 6, bounded: true, reason: "the engine-built own-names list, read below its length" },
  { file: "values.ts", kind: "index", mode: "read", text: "text[index]", count: 2, bounded: true, reason: STRING },
  { file: "values.ts", kind: "optional", mode: "read", text: "descriptor.enumerable", count: 1, reason: "every engine-built descriptor owns `enumerable`" },
  { file: "values.ts", kind: "optional", mode: "read", text: "descriptor.value", count: 4, guard: "descriptor", reason: DESCRIPTOR },
  { file: "values.ts", kind: "optional", mode: "read", text: "innerDescriptor.value", count: 1, guard: "innerDescriptor", reason: DESCRIPTOR },
  { file: "values.ts", kind: "optional", mode: "read", text: "lengthDescriptor.value", count: 3, guard: "lengthDescriptor", reason: DESCRIPTOR },
  { file: "values.ts", kind: "optional", mode: "read", text: "lengthDescriptorInner.value", count: 2, guard: "lengthDescriptorInner", reason: DESCRIPTOR },
];

/**
 * Parameters that receive caller-owned envelopes although they are not public-method parameters,
 * because an inventoried assertion hands them one: `name#index`.
 */
export const EXTRA_ENVELOPE_PARAMETERS: readonly string[] = ["acceptInputContent#0"];

/** Calls into code outside the zone, by `foreignCallKey`. Each may run arbitrary code and reenter. */
export const FOREIGN_CALLS: ReadonlyMap<string, string> = new Map([
  ["#deliver this.#driver.deliver(intent.activation, settlement, intent.submission)", "the Driver's delivery of the frozen Activation, a fresh settlement capability and the frozen grant, after the decision is recorded (post-commit)"],
  ["encode canonicalizeJcs(toSerializationSafe(value))", "the approved JCS dependency on the frozen serialization clone, inside the restored serializer environment"],
  ["hostMember PrimordialReflectApply(getter, holder, [])", "a trusted host object's own accessor for an optional member, with the host as receiver"],
  ["requestTakeover PrimordialReflectApply(establish, this.#driver, [exchange.activation])", "the Driver's safe-replacement callback on the frozen current Activation; K1.2-DEC-19 revalidates after it"],
]);

/**
 * Functions whose effect summary is declared rather than derived. The serializer environment installs
 * load-time primordials over built-in slots and restores every saved slot in `finally`, so it changes
 * no pre-existing object on normal or exceptional exit; it runs the dependency (foreign) and the
 * work callback it is given.
 */
export const EFFECT_OVERRIDES: ReadonlyMap<string, { readonly foreign: boolean; readonly mutates: boolean; readonly callsParameters: readonly number[]; readonly reason: string }> = new Map([
  ["withSerializerEnvironment", { foreign: true, mutates: false, callsParameters: [0], reason: "install-and-restore of built-in slots around the serializer call (K1.1 serializer boundary)" }],
]);

export const getterReads = (): Set<string> =>
  new Set(ACCESS_INVENTORY.filter((entry) => entry.getter === true).map((entry) => `${entry.file} ${entry.text}`));

/**
 * The fields whose writers are fixed (DEC-9), with the element type of the list a field holds when
 * it holds one, and the only functions allowed to write or mutate it.
 */
export const WRITE_SITES: ReadonlyMap<string, { readonly element?: string; readonly owners: readonly string[] }> = new Map([
  ["codeHold", { owners: ["applyControlCommit"] }],
  ["protocolFailureHold", { owners: ["applyControlCommit", "requestTakeover"] }],
  ["nextAcceptancePosition", { owners: ["#accept", "#mint", "requestTakeover"] }],
  ["recoveryHistory", { element: "RecoveryHistoryRecord", owners: ["#accept", "applyControlCommit", "requestTakeover"] }],
  ["receipts", { element: "Receipt", owners: ["#accept", "dispatch", "requestTakeover", "submitInput"] }],
]);
