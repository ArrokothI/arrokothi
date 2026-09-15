/**
 * Kernel-owned lists: constructed and read from **own data only**.
 *
 * This module exists because of one fact about JavaScript that the previous round's reconstruction
 * assumed away. Ordinary indexed assignment is not a structural write. `list[index] = value` is
 * `[[Set]]`, and `[[Set]]` on a position the object does not own walks the prototype chain: if
 * `Array.prototype` (or `Object.prototype`) carries an accessor at that index name, the setter runs
 * *instead of* creating the Kernel's element, and a later ordinary read of the same position
 * resolves to the inherited getter. `Array.prototype.push` is not an escape: it performs the same
 * `Set(O, ToString(len), E, true)` and then sets `length`, so a captured, load-time `push` still
 * leaves a hole under an inherited setter while advertising a longer list (K11-R6-STATE-02,
 * K11-R6-VAL-04).
 *
 * A caller can install exactly that accessor from inside a boundary observation — a `getPrototypeOf`
 * trap, a payload getter, or the `options.bound` getter — and `Array.prototype`'s own *properties*
 * are mutable even though the binding is not. Capturing more method references does not help: the
 * defect is in the operation, not in which function object performs it.
 *
 * ## The rule
 *
 * From the first caller observation through every commit, replay, redelivery and projection, a
 * Kernel-owned list element is installed with `[[DefineOwnProperty]]` and read back from its own
 * property descriptor. Neither operation consults a prototype, so neither is droppable,
 * substitutable or executable by a caller-installed inherited indexed accessor.
 *
 * Two things are deliberately *not* wrapped, because they are already own-data operations:
 *
 * - **`list.length`.** Every Array exotic object has an own `length`, so an ordinary read resolves
 *   it without ever reaching a prototype. `defineAt` at `list.length` also updates `length` through
 *   the array's own `[[DefineOwnProperty]]`, which is why appending needs no `push`.
 * - **Lists that are complete at their literal construction** (`[a, b, c]`, and engine-built lists
 *   such as `Object.getOwnPropertyNames`/`Object.keys` results). Array literals install their
 *   elements with `CreateDataPropertyOrThrow`, never `[[Set]]`, so they are dense own data the
 *   moment they exist and an ordinary element read below `length` is an own read.
 *
 * Everything else — every list the Kernel appends to or writes into after construction — goes
 * through this module. That is a mechanical rule rather than a judgement call, and
 * `tests/../boundary.test.ts` enforces it over the zone's executable text: no ordinary indexed
 * assignment and no array-mutator method survive outside this file.
 *
 * ## Why reads are safe once writes are
 *
 * Because every element write here is `[[DefineOwnProperty]]`, a list this module builds is dense
 * own data over `[0, length)`. `readAt` does not depend on that invariant — it reads the own
 * descriptor directly and answers `undefined` for a position the list does not own, which is a
 * fact about the list rather than about the ambient prototype chain.
 */

const PrimordialArray = Array;
const PrimordialDefineProperty = Object.defineProperty;
const PrimordialGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const PrimordialReflectApply = Reflect.apply;
const PrimordialHasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * Whether a descriptor is a data descriptor, without the `in` operator.
 *
 * `"value" in descriptor` consults the prototype chain, so ambient pollution carrying a `value`
 * member would make an accessor descriptor look like data and its `descriptor.value` read would
 * return the pollution. Descriptors this module reads come from `getOwnPropertyDescriptor` and are
 * ordinary objects, but the check is written the same way as the rest of the zone so the discipline
 * is uniform rather than conditional on where the descriptor came from.
 */
const hasOwnValue = (holder: object): boolean =>
  PrimordialReflectApply(PrimordialHasOwnProperty, holder, ["value"]) as boolean;

/**
 * A fresh list with `length` positions and no elements yet.
 *
 * `new Array(n)` sets `length` and writes no element, so it performs no `[[Set]]` and is unaffected
 * by an inherited indexed accessor. The positions stay unowned until `defineAt` installs them.
 */
export const sizedList = <T>(length: number): T[] => new PrimordialArray<T>(length);

/**
 * Installs one element as the list's **own** data property.
 *
 * `[[DefineOwnProperty]]`, never `[[Set]]`: an inherited accessor at this index name is not on the
 * path at all. Defining at `index === list.length` extends the array through its own exotic
 * `[[DefineOwnProperty]]`, so this is also how a list grows.
 *
 * The attributes are the ordinary mutable ones. Lists that must end up immutable are frozen by
 * their owner once they are complete, which reduces every element to the same non-writable,
 * non-configurable form the previous explicit attributes produced.
 */
export const defineAt = <T>(list: T[], index: number, value: T): void => {
  PrimordialDefineProperty(list, `${index}`, { value, writable: true, enumerable: true, configurable: true });
};

/**
 * Appends one element.
 *
 * Deliberately not `push`: `Array.prototype.push` performs `[[Set]]` on the new position and then
 * raises `length` regardless, so under an inherited setter it produces a longer list with a hole
 * where the Kernel's element should be — the exact shape that let an accepted dispatch carry an
 * empty batch and an accepted input go unretained.
 */
export const appendOwn = <T>(list: T[], value: T): void => {
  defineAt(list, list.length, value);
};

/**
 * One element, read from the list's own property descriptor.
 *
 * `undefined` means the list does not own that position — never that a prototype happens to answer
 * for it. Callers that hold the density invariant cast the result; callers that do not can branch
 * on the absence.
 */
export const readAt = <T>(list: readonly T[], index: number): T | undefined => {
  const descriptor = PrimordialGetOwnPropertyDescriptor(list, `${index}`);
  if (descriptor === undefined || !hasOwnValue(descriptor)) return undefined;
  return descriptor.value as T;
};

/** Appends every element of `extra`, in order, without spread iteration or a mutator method. */
export const appendAllOwn = <T>(target: T[], extra: readonly T[]): void => {
  for (let index = 0; index < extra.length; index += 1) {
    appendOwn(target, readAt(extra, index) as T);
  }
};

/**
 * Drops the positions at and above `length`.
 *
 * `length` is an own property of every array, so this assignment is an own write and the deletion
 * it performs is the array's own exotic `[[DefineOwnProperty]]` behaviour. Nothing here reaches a
 * prototype.
 */
export const truncateOwn = (list: unknown[], length: number): void => {
  list.length = length;
};

/** A detached copy, built element by element as own data. */
export const copyOwn = <T>(source: readonly T[]): T[] => {
  const out: T[] = [];
  for (let index = 0; index < source.length; index += 1) appendOwn(out, readAt(source, index) as T);
  return out;
};

/**
 * A projection, built element by element as own data.
 *
 * Not `Array.prototype.map`: `map` is a live prototype method a capture-time side effect can
 * replace, and its result would then be whatever the replacement returned.
 */
export const mapOwn = <T, U>(source: readonly T[], project: (item: T) => U): U[] => {
  const out: U[] = [];
  for (let index = 0; index < source.length; index += 1) appendOwn(out, project(readAt(source, index) as T));
  return out;
};
