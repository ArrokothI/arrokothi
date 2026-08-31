/**
 * The capability execution port.
 *
 * One method, one shape, for every mediated operation: knowledge retrieval, a database query, a
 * browser action, an outbound email, a remote job. It is deliberately not retrieval-shaped,
 * tool-shaped, or provider-shaped, because the moment the kernel's external boundary knows what a
 * "tool call" looks like, every non-tool capability has to be disguised as one.
 *
 * Read the request type in `effects/capability.ts` for what an executor receives; read it also for
 * what it does not. There is no Harness, no store, no ExecutionContext, no tenant, no user object,
 * no credential, and no provider client. An executor therefore *cannot* mutate Execution memory or
 * lifecycle - not by policy, but because it has nothing to mutate them with. It returns an
 * observation and the Harness decides what that observation means.
 *
 * The one subtlety is timing. `execute` returns a promise, and how long that promise takes is not a
 * semantic property: the same authorized request may settle inside the current Activation or hours
 * later, and the Execution's observation must be identical either way. An executor therefore does
 * not need to know, and is never told, whether the Harness intends to wait for it inline.
 */

import type { AuthorizedCapabilityRequest, CapabilityExecutionEnvironment } from "../effects/capability.ts";
import type { CapabilityOutcome } from "../effects/outcome.ts";

export interface CapabilityExecutor {
  execute(
    request: AuthorizedCapabilityRequest,
    environment: CapabilityExecutionEnvironment,
  ): Promise<CapabilityOutcome>;
}

/** Raised when an authorized capability has no registered executor. Never silently succeeds. */
export class UnknownCapabilityError extends Error {
  readonly capability: string;
  constructor(capability: string) {
    super(`no executor is registered for capability "${capability}"`);
    this.name = "UnknownCapabilityError";
    this.capability = capability;
  }
}
