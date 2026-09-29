/**
 * Explicit refusal for target Kernel surfaces that no packet has implemented yet.
 *
 * K1.0 established where target Kernel code will live; K1.1 implemented its first protocol
 * boundaries there (creation, input ingress, reservation/dispatch/redelivery and inspection), and
 * K1.2 Outcome acceptance, takeover and the recovery holds. A caller that reaches for a surface this
 * package does not have yet gets a refusal naming the packet that owns it, never a silent no-op that
 * could be mistaken for working behaviour.
 */

/** Thrown when a target Kernel surface exists as a plan rather than as an implementation. */
export class UnsupportedKernelSurfaceError extends Error {
  /**
   * Defined as this error's own field, not assigned. `this.name = …` was `[[Set]]` on a member only
   * `Error.prototype` supplies, so an accessor that caller code installed there would have received
   * the write and left the error without its own name (correction DEC-8, SELF-R7-UNSUPPORTED-01).
   */
  override readonly name = "UnsupportedKernelSurfaceError";
  /** The surface that was asked for, e.g. `createExecution`. */
  readonly surface: string;
  /** The development packet that owns implementing it, e.g. `K1.1`. */
  readonly owner: string;

  constructor(surface: string, owner: string) {
    super(
      `${surface} is not implemented in @arrokothi/kernel at this revision. It implements creation, ` +
        `input ingress, reservation/dispatch/redelivery, inspection, Outcome acceptance, takeover and the ` +
        `recovery holds only; ${owner} owns this surface. ` +
        `The current 0.8.x behaviour remains available from @arrokothi/core, which is explicitly legacy.`,
    );
    this.surface = surface;
    this.owner = owner;
  }
}

/** Refuses an unimplemented target Kernel surface. Never returns. */
export function refuseUnsupportedSurface(surface: string, owner: string): never {
  throw new UnsupportedKernelSurfaceError(surface, owner);
}
