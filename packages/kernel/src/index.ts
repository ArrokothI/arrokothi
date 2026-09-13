/**
 * `@arrokothi/kernel` - the target Kernel landing zone.
 *
 * This package is the enforced location for new Kernel work under the target
 * [Activation/Outcome protocol](../../../docs/kernel.md#activation-and-outcome). At this revision it
 * implements none of that protocol. It exists so that the first protocol packet cannot quietly
 * inherit the current 0.8.x `Harness`/controller vocabulary, and so that the dependency rule which
 * prevents that inheritance is executable rather than aspirational.
 *
 * What the boundary means is recorded in `README.md` and enforced by
 * `tests/conformance/architecture/kernel-landing-zone.test.ts`. In short: nothing in this package
 * may import `@arrokothi/core`, any provider or Runtime integration, the SDK, or any third-party
 * package. `node:` builtins are the only external dependency permitted, and the list of approved
 * portable leaves from the legacy tree is currently empty by decision.
 *
 * The current, supported, explicitly legacy implementation remains `@arrokothi/core`. Nothing here
 * replaces it, and no existing consumer is routed through this package.
 */

export { UnsupportedKernelSurfaceError, refuseUnsupportedSurface } from "./unsupported.ts";
