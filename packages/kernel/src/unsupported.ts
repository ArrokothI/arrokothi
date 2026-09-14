/**
 * Explicit refusal for target Kernel surfaces that no accepted packet has implemented yet.
 *
 * K1.0 establishes where target Kernel code will live; it implements no protocol. A caller that
 * reaches for a surface this package does not have yet gets a refusal naming the packet that owns
 * it, never a silent no-op that could be mistaken for working behaviour.
 */

/** Thrown when a target Kernel surface exists as a plan rather than as an implementation. */
export class UnsupportedKernelSurfaceError extends Error {
  /** The surface that was asked for, e.g. `createExecution`. */
  readonly surface: string;
  /** The development packet that owns implementing it, e.g. `K1.1`. */
  readonly owner: string;

  constructor(surface: string, owner: string) {
    super(
      `${surface} is not implemented in @arrokothi/kernel. The target Activation/Outcome protocol ` +
        `is unimplemented at this revision; ${owner} owns this surface. The current 0.8.x behaviour ` +
        `remains available from @arrokothi/core, which is explicitly legacy.`,
    );
    this.name = "UnsupportedKernelSurfaceError";
    this.surface = surface;
    this.owner = owner;
  }
}

/** Refuses an unimplemented target Kernel surface. Never returns. */
export function refuseUnsupportedSurface(surface: string, owner: string): never {
  throw new UnsupportedKernelSurfaceError(surface, owner);
}
