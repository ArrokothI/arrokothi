/**
 * Explicit accept/refuse results at the target Kernel's boundaries.
 *
 * The Kernel's refusals are *data*: a conflicting creation retry, a refused ingress and a rejected
 * dispatch are recorded facts a caller and an inspector must be able to read, not exceptional
 * control flow. Exceptions are reserved for surfaces that do not exist yet
 * (`UnsupportedKernelSurfaceError`), where there is no accepted state to report.
 *
 * K1.0 assigned `packages/core/src/util/result.ts` to this packet as `DX-3` (migratable). It is not
 * extracted: the legacy file is ten lines of the same shape, and copying a dependency edge across
 * the boundary to save them would freeze an import the zone does not need. See the K1.1 disposition
 * section of `docs/development/work/K1.0/ownership-inventory.md`.
 */

export type Ok<T> = { readonly ok: true; readonly value: T };
export type Err<E> = { readonly ok: false; readonly error: E };

/** One boundary decision: the request was accepted with a value, or refused with a reason. */
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
