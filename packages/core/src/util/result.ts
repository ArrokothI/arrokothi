/**
 * Explicit result type. Core avoids throwing for expected outcomes - a rejected memory proposal or
 * a refused tool call is data that gets recorded in the event stream, not an exception.
 */
export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E> = Ok<T> | Err<E>;

export const ok = <T>(value: T): Ok<T> => ({ ok: true, value });
export const err = <E>(error: E): Err<E> => ({ ok: false, error });
