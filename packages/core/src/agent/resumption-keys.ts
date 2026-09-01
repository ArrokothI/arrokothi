/**
 * Stable keys and correlations for one Agent's asynchronous work.
 *
 * Both kinds are derived entirely from persisted Agent coordinates - a step counter and a call
 * index - so an Activation that resumes reconstructs exactly the same string. Nothing here is
 * derived from an object identity, a timestamp, or anything else process-local, because a key that
 * drifted across Activations would silently dispatch a second model call or leave a result nothing
 * could claim.
 *
 * ```text
 * ag/step3/model            the model invocation for step 3
 * ag/step3/call2            the second operation that step 3 requested
 * ```
 *
 * Neither is a credential. A resumption key names controller-local work that only the runtime can
 * settle; a correlation names the result an Effect will eventually carry back. Knowing either
 * authorizes nothing, and the step number is what stops an old step's result from satisfying a new
 * step's requirement.
 */

export function agentModelResumptionKey(step: number): string {
  return `ag/step${step}/model`;
}

export function agentCallCorrelationId(step: number, index: number): string {
  return `ag/step${step}/call${index}`;
}
