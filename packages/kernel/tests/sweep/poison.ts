/**
 * Poisoned built-in prototypes for the DEC-8 runtime sweep (contract revision 9, amendment 03).
 *
 * While a Kernel boundary call runs, every name of the sweep's name set is installed on
 * `Object.prototype` and `Function.prototype` as an accessor. The zone reads no member its object
 * may not own (correction DEC-8), so a correct zone never resolves any of these accessors: every
 * member it reads is found on the object itself, or on a host or class prototype below the two
 * built-in roots. An accessor that does run was reached by walking past the object, and the sweep
 * attributes it:
 *
 * - **Zone.** The first non-built-in stack frame above the accessor is a zone source file (or the
 *   `canonicalize` dependency the zone calls): a Kernel read of a member its object does not own.
 *   The mode decides what happens next. `count` records it and answers as the prototype would have;
 *   `throw` records it and throws; `reenter` records it, re-enters the Kernel through the window's
 *   reentry hook, then answers as the prototype would have.
 * - **Caller.** Any other frame (test code, a fake Driver, a caller getter): the accessor records a
 *   liveness count and answers exactly as the prototype would have, so caller code sees no change.
 * - **Proxy handler.** The receiver is a registered Proxy handler: the engine looking up a trap the
 *   caller's handler does not define. That is Proxy semantics of a caller-owned object, induced by an
 *   observation the zone is allowed to make, not a Kernel read; it is counted separately.
 *
 * The accessors are present only between the outermost `enter` and its `exit`, so everything
 * outside Kernel calls (the test runner, fixtures, assertions) runs against untouched prototypes. An
 * installed name that a caller replaces during the window (a hostile getter installing its own
 * pollution) is left as the caller installed it; only accessors still installed are removed.
 *
 * Everything this module does while a window is open goes through references captured when it
 * loaded and null-prototype descriptors, so the sweep does not trip its own poison.
 */

import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

const ObjectDefineProperty = Object.defineProperty;
const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const ObjectCreate = Object.create;
const ObjectIsExtensible = Object.isExtensible;
const ObjectIsFrozen = Object.isFrozen;
const ObjectGetPrototypeOf = Object.getPrototypeOf;
const ReflectApply = Reflect.apply;
const ReflectOwnKeys = Reflect.ownKeys;
const HasOwn = Object.prototype.hasOwnProperty;
const ErrorCaptureStackTrace = Error.captureStackTrace;
const WeakSetHas = WeakSet.prototype.has;
const WeakSetAdd = WeakSet.prototype.add;
const StringStartsWith = String.prototype.startsWith;
const StringIncludes = String.prototype.includes;
const OriginalProxy = Proxy;
const OriginalProxyRevocable = Proxy.revocable;
const ArrayIsArray = Array.isArray;
const ObjectIs = Object.is;
const NativeMap = Map;
const MapGet = Map.prototype.get;
const MapSet = Map.prototype.set;
const NativeError = Error;
const NativeTypeError = TypeError;
const ReflectConstruct = Reflect.construct;
const ReflectGet = Reflect.get;

const hasOwn = (holder: object, key: PropertyKey): boolean => ReflectApply(HasOwn, holder, [key]) as boolean;
const startsWith = (text: string, prefix: string): boolean => ReflectApply(StringStartsWith, text, [prefix]) as boolean;
const includes = (text: string, part: string): boolean => ReflectApply(StringIncludes, text, [part]) as boolean;

export type PoisonMode = "off" | "count" | "throw" | "reenter";

/**
 * The built-in prototypes the sweep poisons. Amendment 03 names the first two; every object and
 * function the zone reads inherits from one of them. The last two are where Kernel lists and strings
 * find the live methods C13 forbids after the first observation (`push`, `map`, `startsWith`, …), so
 * poisoning them as well catches a zone read of such a method, which the first two cannot see
 * because the array or string prototype answers first. Index names are not installed on
 * `Array.prototype`: a hole read already walks on to `Object.prototype`.
 */
export type HolderName = "Object.prototype" | "Function.prototype" | "Array.prototype" | "String.prototype";
export const HOLDERS: readonly (readonly [object, HolderName])[] = [
  [Object.prototype, "Object.prototype"],
  [Function.prototype, "Function.prototype"],
  [Array.prototype, "Array.prototype"],
  [String.prototype, "String.prototype"],
];
const INDEX_LIKE = /^(0|[1-9][0-9]*)$/;

/** A saved property position, read field by field from its own descriptor. */
interface Saved {
  readonly kind: "absent" | "data" | "accessor";
  readonly value: unknown;
  readonly writable: boolean;
  readonly enumerable: boolean;
  readonly configurable: boolean;
  readonly get: unknown;
  readonly set: unknown;
}

const ownField = (descriptor: object, key: string): unknown => {
  if (!hasOwn(descriptor, key)) return undefined;
  const field = ObjectGetOwnPropertyDescriptor(descriptor, key) as PropertyDescriptor;
  return hasOwn(field, "value") ? field.value : undefined;
};

const snapshot = (holder: object, name: PropertyKey): Saved => {
  const descriptor = ObjectGetOwnPropertyDescriptor(holder, name);
  const saved = ObjectCreate(null) as { -readonly [K in keyof Saved]: Saved[K] };
  if (descriptor === undefined) {
    saved.kind = "absent";
    saved.value = undefined;
    saved.writable = true;
    saved.enumerable = false;
    saved.configurable = true;
    saved.get = undefined;
    saved.set = undefined;
    return saved;
  }
  saved.kind = hasOwn(descriptor, "value") || hasOwn(descriptor, "writable") ? "data" : "accessor";
  saved.value = ownField(descriptor, "value");
  saved.writable = ownField(descriptor, "writable") === true;
  saved.enumerable = ownField(descriptor, "enumerable") === true;
  saved.configurable = ownField(descriptor, "configurable") === true;
  saved.get = ownField(descriptor, "get");
  saved.set = ownField(descriptor, "set");
  return saved;
};

/** A writable, enumerable, configurable data descriptor on a null-prototype object. */
const dataDescriptor = (value: unknown): PropertyDescriptor => {
  const descriptor = ObjectCreate(null) as Record<string, unknown>;
  descriptor.value = value;
  descriptor.writable = true;
  descriptor.enumerable = true;
  descriptor.configurable = true;
  return descriptor as PropertyDescriptor;
};

/** Appends as own data: an ordinary indexed write would walk to the poisoned index names. */
const append = <T>(list: T[], item: T): void => {
  ObjectDefineProperty(list, `${list.length}`, dataDescriptor(item));
};

const restore = (holder: object, name: PropertyKey, saved: Saved): void => {
  if (saved.kind === "absent") {
    delete (holder as Record<PropertyKey, unknown>)[name];
    return;
  }
  const descriptor = ObjectCreate(null) as Record<string, unknown>;
  descriptor.enumerable = saved.enumerable;
  descriptor.configurable = saved.configurable;
  if (saved.kind === "data") {
    descriptor.value = saved.value;
    descriptor.writable = saved.writable;
  } else {
    descriptor.get = saved.get;
    descriptor.set = saved.set;
  }
  ObjectDefineProperty(holder, name, descriptor as PropertyDescriptor);
};

/** What the prototype would have answered for an ordinary `[[Get]]` that reached it. */
const answerGet = (saved: Saved, receiver: unknown): unknown => {
  if (saved.kind === "absent") return undefined;
  if (saved.kind === "data") return saved.value;
  return typeof saved.get === "function" ? ReflectApply(saved.get as (...args: unknown[]) => unknown, receiver, []) : undefined;
};

/** What an ordinary `[[Set]]` that reached the prototype would have done (strict code). */
const answerSet = (saved: Saved, receiver: unknown, name: PropertyKey, value: unknown): void => {
  if (saved.kind === "accessor") {
    if (typeof saved.set !== "function") throw new NativeTypeError(`Cannot set property ${String(name)} which has only a getter`);
    ReflectApply(saved.set as (...args: unknown[]) => unknown, receiver, [value]);
    return;
  }
  if (saved.kind === "data" && !saved.writable) throw new NativeTypeError(`Cannot assign to read only property '${String(name)}'`);
  if ((typeof receiver !== "object" && typeof receiver !== "function") || receiver === null) {
    throw new NativeTypeError(`Cannot create property '${String(name)}' on ${typeof receiver}`);
  }
  if (!ObjectIsExtensible(receiver)) throw new NativeTypeError(`Cannot add property ${String(name)}, object is not extensible`);
  ObjectDefineProperty(receiver, name, dataDescriptor(value));
};

/** One accessor that ran because a zone read walked past its object. */
export interface ZoneFiring {
  readonly holder: HolderName;
  readonly name: string;
  readonly operation: "get" | "set";
  /** The zone frame that performed the access, as `file:line:column`. */
  readonly site: string;
  /** The boundary window it happened in. */
  readonly window: string;
}

/** Raised by `throw` mode at a zone firing. */
export class PoisonedMemberError extends NativeError {
  constructor(name: string) {
    super(`poisoned member ${name} read by the Kernel`);
  }
}

export interface PoisonOptions {
  readonly mode: PoisonMode;
  readonly names: readonly (string | symbol)[];
  /** Directory of the zone sources: frames there are Kernel frames. */
  readonly zoneRoot: string;
  /** The prototypes to poison; all four of `HOLDERS` when omitted. */
  readonly holders?: readonly (readonly [object, HolderName])[];
}

/** What a window may do when `reenter` mode meets a zone firing. */
export type Reentry = (() => void) | undefined;

export interface PoisonController {
  readonly mode: PoisonMode;
  /** Opens a window; the accessors are installed only by the outermost one. */
  enter(window: string, reentry?: Reentry): void;
  /** Closes the window opened last. */
  exit(): void;
  /** Runs `work` inside a window. */
  within<T>(window: string, work: () => T, reentry?: Reentry): T;
  /** Registers a Proxy handler, so the engine's trap lookups on it are attributed to the caller. */
  registerHandler(handler: object): void;
  readonly zoneFirings: ZoneFiring[];
  readonly counts: { windows: number; installed: number; skipped: number; callerFirings: number; handlerFirings: number; reentries: number; liveProbes: number };
}

/** One poisoned position: a name on one of the poisoned built-in prototypes. */
interface Slot {
  readonly holder: object;
  readonly holderName: HolderName;
  readonly name: string | symbol;
  /** The accessor this window installed, or undefined when the position was not poisonable. */
  installed: Installation | undefined;
}

/**
 * One installation of the accessor pair at one position. Each carries the state it replaced, so an
 * accessor a caller saved inside a window and reinstalled later still answers as the prototype did
 * before the sweep touched it, and is recognised (and unwrapped) by later windows.
 */
interface Installation {
  readonly slot: Slot;
  readonly saved: Saved;
  readonly getter: () => unknown;
  readonly setter: (value: unknown) => void;
}

const siteOf = (site: NodeJS.CallSite): string | undefined => {
  const file = site.getFileName();
  if (typeof file !== "string" || file === "" || file === "<anonymous>" || startsWith(file, "node:") || site.isNative()) return undefined;
  return `${file}:${site.getLineNumber() ?? 0}:${site.getColumnNumber() ?? 0}`;
};

export function createPoison(options: PoisonOptions): PoisonController {
  const zoneUrl = `${pathToFileURL(options.zoneRoot).href}/`;
  const zonePath = `${options.zoneRoot}/`;
  const ownFile = fileURLToPath(import.meta.url);
  const ownUrl = import.meta.url;
  const handlers = new WeakSet<object>();
  const zoneFirings: ZoneFiring[] = [];
  const counts = { windows: 0, installed: 0, skipped: 0, callerFirings: 0, handlerFirings: 0, reentries: 0, liveProbes: 0 };
  // The liveness probe: at every outermost window, one ordinary read of an installed name on a fresh
  // ordinary object must reach the accessor. It is counted apart from every attribution class.
  let probing = false;
  let depth = 0;
  let windowName = "";
  let reentry: Reentry;
  let busy = false;
  let reentering = false;

  /** The first non-built-in frame above the accessor, or undefined. */
  const accessingFrame = (accessor: (...args: never[]) => unknown): string | undefined => {
    const holder = ObjectCreate(null) as { stack?: unknown };
    const prepare = (NativeError as unknown as { prepareStackTrace?: unknown }).prepareStackTrace;
    const limit = NativeError.stackTraceLimit;
    (NativeError as unknown as { prepareStackTrace?: unknown }).prepareStackTrace = (_error: unknown, sites: NodeJS.CallSite[]) => sites;
    NativeError.stackTraceLimit = 32;
    let sites: NodeJS.CallSite[] = [];
    try {
      ErrorCaptureStackTrace(holder, accessor);
      const captured = ObjectGetOwnPropertyDescriptor(holder, "stack");
      const value = captured === undefined ? undefined : hasOwn(captured, "value") ? captured.value : typeof captured.get === "function" ? ReflectApply(captured.get, holder, []) : undefined;
      if (ArrayIsArray(value)) sites = value as NodeJS.CallSite[];
    } finally {
      (NativeError as unknown as { prepareStackTrace?: unknown }).prepareStackTrace = prepare;
      NativeError.stackTraceLimit = limit;
    }
    for (let index = 0; index < sites.length; index += 1) {
      const site = siteOf(sites[index] as NodeJS.CallSite);
      if (site === undefined) continue;
      if (startsWith(site, ownFile) || startsWith(site, ownUrl)) continue;
      return site;
    }
    return undefined;
  };

  const isZone = (site: string): boolean =>
    startsWith(site, zoneUrl) || startsWith(site, zonePath) || includes(site, "/node_modules/canonicalize/");

  /** Every accessor this controller ever installed, by getter and by setter. */
  const installations = new WeakMap<object, Installation>();
  const WeakMapGet = WeakMap.prototype.get;
  const WeakMapSet = WeakMap.prototype.set;
  const installationOf = (fn: unknown): Installation | undefined =>
    typeof fn === "function" ? (ReflectApply(WeakMapGet, installations, [fn]) as Installation | undefined) : undefined;

  /**
   * The state a position had before the sweep: its current descriptor, unless that descriptor is one
   * of the sweep's own accessors (reinstalled by a caller that saved it), which stands for the state
   * it replaced.
   */
  const unpoisoned = (holder: object, name: string | symbol): Saved => {
    const current = snapshot(holder, name);
    const own = current.kind === "accessor" ? installationOf(current.get) : undefined;
    return own === undefined ? current : own.saved;
  };

  const makeInstallation = (slot: Slot, saved: Saved): Installation => {
    const installation: Installation = {
      slot,
      saved,
      getter: function poisonedGet(this: unknown): unknown {
        return fire(installation, "get", this, undefined, getterRef);
      },
      setter: function poisonedSet(this: unknown, value: unknown): void {
        fire(installation, "set", this, value, setterRef);
      },
    };
    const getterRef = installation.getter as (...args: never[]) => unknown;
    const setterRef = installation.setter as (...args: never[]) => unknown;
    ReflectApply(WeakMapSet, installations, [installation.getter, installation]);
    ReflectApply(WeakMapSet, installations, [installation.setter, installation]);
    return installation;
  };

  const answer = (installation: Installation, operation: "get" | "set", receiver: unknown, value: unknown): unknown => {
    if (operation === "get") return answerGet(installation.saved, receiver);
    answerSet(installation.saved, receiver, installation.slot.name, value);
    return undefined;
  };

  const fire = (installation: Installation, operation: "get" | "set", receiver: unknown, value: unknown, accessor: (...args: never[]) => unknown): unknown => {
    const slot = installation.slot;
    if (probing) {
      counts.liveProbes += 1;
      return answer(installation, operation, receiver, value);
    }
    // Outside a window (a caller reinstalled a saved accessor) or inside the sweep's own work.
    if (busy || depth === 0) return answer(installation, operation, receiver, value);
    busy = true;
    let site: string | undefined;
    let handler = false;
    try {
      handler = typeof receiver === "object" && receiver !== null && (ReflectApply(WeakSetHas, handlers, [receiver]) as boolean);
      if (!handler) site = accessingFrame(accessor);
    } finally {
      busy = false;
    }
    if (handler) {
      counts.handlerFirings += 1;
      return answer(installation, operation, receiver, value);
    }
    if (site === undefined || !isZone(site)) {
      counts.callerFirings += 1;
      return answer(installation, operation, receiver, value);
    }
    const name = typeof slot.name === "symbol" ? slot.name.toString() : slot.name;
    append(zoneFirings, { holder: slot.holderName, name, operation, site, window: windowName });
    if (options.mode === "throw") throw new PoisonedMemberError(name);
    if (options.mode === "reenter" && reentry !== undefined && !reentering) {
      reentering = true;
      counts.reentries += 1;
      try {
        reentry();
      } finally {
        reentering = false;
      }
    }
    return answer(installation, operation, receiver, value);
  };

  const slots: Slot[] = [];
  for (const [holder, holderName] of options.holders ?? HOLDERS) {
    for (const name of options.names) {
      if (holderName === "Array.prototype" && typeof name === "string" && INDEX_LIKE.test(name)) continue;
      append(slots, { holder, holderName, name, installed: undefined });
    }
  }

  const install = (): void => {
    for (let index = 0; index < slots.length; index += 1) {
      const slot = slots[index] as Slot;
      const saved = unpoisoned(slot.holder, slot.name);
      const current = ObjectGetOwnPropertyDescriptor(slot.holder, slot.name);
      if (current !== undefined && !current.configurable) {
        slot.installed = undefined;
        counts.skipped += 1;
        continue;
      }
      const installation = makeInstallation(slot, saved);
      const descriptor = ObjectCreate(null) as Record<string, unknown>;
      descriptor.get = installation.getter;
      descriptor.set = installation.setter;
      descriptor.enumerable = false;
      descriptor.configurable = true;
      ObjectDefineProperty(slot.holder, slot.name, descriptor as PropertyDescriptor);
      slot.installed = installation;
      counts.installed += 1;
    }
  };

  const uninstall = (): void => {
    for (let index = slots.length - 1; index >= 0; index -= 1) {
      const slot = slots[index] as Slot;
      if (slot.installed === undefined) continue;
      slot.installed = undefined;
      const current = snapshot(slot.holder, slot.name);
      // A caller that replaced the accessor during the window keeps what it installed; one of the
      // sweep's own accessors (this window's, or an older one a caller reinstalled) is unwrapped.
      const own = current.kind === "accessor" ? installationOf(current.get) : undefined;
      if (own !== undefined) restore(slot.holder, slot.name, own.saved);
    }
  };

  const controller: PoisonController = {
    mode: options.mode,
    enter(window: string, hook?: Reentry): void {
      depth += 1;
      if (depth > 1) return;
      counts.windows += 1;
      windowName = window;
      reentry = hook;
      if (options.mode !== "off") {
        install();
        const probeName = (slots[0] as Slot).name;
        if ((slots[0] as Slot).installed === undefined) throw new NativeError(`poison probe name ${String(probeName)} is not installable`);
        const before = counts.liveProbes;
        probing = true;
        try {
          void (ObjectCreate(Object.prototype) as Record<PropertyKey, unknown>)[probeName];
        } finally {
          probing = false;
        }
        if (counts.liveProbes !== before + 1) throw new NativeError(`poison is not live in window ${window}`);
      }
    },
    exit(): void {
      depth -= 1;
      if (depth > 0) return;
      if (options.mode !== "off") uninstall();
      windowName = "";
      reentry = undefined;
    },
    within<T>(window: string, work: () => T, hook?: Reentry): T {
      controller.enter(window, hook);
      try {
        return work();
      } finally {
        controller.exit();
      }
    },
    registerHandler(handler: object): void {
      ReflectApply(WeakSetAdd, handlers, [handler]);
    },
    zoneFirings,
    counts,
  };
  return controller;
}

/**
 * Replaces the global `Proxy` so that every handler a caller creates is registered with `poison`.
 * The zone never constructs a Proxy; only caller and test code do.
 */
export function registerProxyHandlers(poison: PoisonController): void {
  const wrapped = new OriginalProxy(OriginalProxy, {
    construct(target, args, newTarget) {
      if (typeof args[1] === "object" && args[1] !== null) poison.registerHandler(args[1] as object);
      return ReflectConstruct(target, args, newTarget) as object;
    },
    get(target, key, receiver) {
      if (key === "revocable") {
        return (proxyTarget: object, handler: ProxyHandler<object>) => {
          if (typeof handler === "object" && handler !== null) poison.registerHandler(handler);
          return OriginalProxyRevocable(proxyTarget, handler);
        };
      }
      return ReflectGet(target, key, receiver) as unknown;
    },
  });
  globalThis.Proxy = wrapped;
}

/**
 * A structural digest of a boundary result: own properties only, through their descriptors (so no
 * getter runs and no prototype is consulted), with frozen-ness and shared references recorded.
 */
export function digest(value: unknown): string {
  const hash = createHash("sha256");
  const seen = new NativeMap<object, number>();
  let objects = 0;
  const walk = (current: unknown): void => {
    if (current === null) return void hash.update("n;");
    switch (typeof current) {
      case "undefined":
        return void hash.update("u;");
      case "boolean":
        return void hash.update(current ? "t;" : "f;");
      case "number":
        return void hash.update(`d${ObjectIs(current, -0) ? "-0" : `${current}`};`);
      case "bigint":
        return void hash.update(`b${current};`);
      case "string":
        return void hash.update(`s${current.length}:`).update(current);
      case "symbol":
        return void hash.update("y;");
      case "function":
        return void hash.update("F;");
      default:
        break;
    }
    const object = current as object;
    const previous = ReflectApply(MapGet, seen, [object]) as number | undefined;
    if (previous !== undefined) return void hash.update(`r${previous};`);
    ReflectApply(MapSet, seen, [object, objects]);
    objects += 1;
    const proto = ObjectGetPrototypeOf(object);
    hash.update(`${ArrayIsArray(object) ? "A" : proto === null ? "N" : "O"}${ObjectIsFrozen(object) ? "z" : "m"}{`);
    const keys = ReflectOwnKeys(object);
    for (let index = 0; index < keys.length; index += 1) {
      const key = keys[index] as string | symbol;
      const descriptor = ObjectGetOwnPropertyDescriptor(object, key) as PropertyDescriptor;
      hash.update(typeof key === "symbol" ? "y=" : `k${key.length}:${key}=`);
      if (hasOwn(descriptor, "value")) walk(descriptor.value);
      else hash.update("accessor;");
    }
    hash.update("}");
  };
  walk(value);
  return hash.digest("hex");
}
