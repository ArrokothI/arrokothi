/**
 * `Application.harness` after K1.4: a deprecated view over the Driver's native Runtime (owner
 * decision 3; owner choices 01 Q2; owner choices 02 B).
 *
 * Every reader passes through unchanged, so code such as `app.harness.emissionsOf(executionId)`
 * keeps working: the native root ID is the Kernel ID. Its answers are native diagnostics (017);
 * `app.inspect` is authoritative. Every mutator refuses by name and has no native effect, so each
 * native pause keeps one resume owner: the Kernel-routed host methods.
 */

import type { Harness } from "@arrokothi/core";

export const LEGACY_HARNESS_READERS = [
  "inspect", "emissionsOf", "transitionsOf",
  "userInputRequestsOf", "userInputRequest", "openUserInputRequests",
  "confirmationRequestsOf", "confirmationRequest", "pendingConfirmations",
  "controllerResumptionsOf", "controllerResumption",
  "effectiveOperationAuthorityOf", "pendingOperationsOf", "pendingOperation", "effectJournalOf", "structuredMemoryOf",
  "lineageSpawnBudgetOf", "childExecutionLinksOf", "childExecutionLink",
  "peerRequestLink", "peerRequestLinksOf", "peerRequestLinksTo", "waitForEdgesFrom", "cancellationRequestOf",
] as const;

/** Each refused mutator and what replaces it; `null` means no supported replacement. */
export const LEGACY_HARNESS_MUTATORS = {
  createExecution: "app.start",
  deliverExternalInput: "app.input",
  deliverEnvelope: "app.input",
  settleEffect: null,
  submitUserInput: null,
  resolveConfirmation: "app.resolveConfirmation",
  cancelExecution: "app.cancel",
  runOnce: "app.runUntilBlocked",
  runUntilIdle: "app.runUntilIdle",
  drainEffects: "app.runUntilBlocked",
  drainResumptions: "app.runUntilBlocked",
} as const;

export type LegacyHarnessView = Pick<Harness, (typeof LEGACY_HARNESS_READERS)[number]>;

export class LegacyHarnessMutationRefused extends Error {
  readonly method: string;
  readonly replacement: string | null;
  constructor(method: string, replacement: string | null) {
    super(replacement === null
      ? `Application.harness.${method} is refused: the native Runtime is owned by the legacy Driver, and this operation has no supported replacement`
      : `Application.harness.${method} is refused: the native Runtime is owned by the legacy Driver; use ${replacement}`);
    this.name = "LegacyHarnessMutationRefused";
    this.method = method;
    this.replacement = replacement;
  }
}

/** Builds the frozen view. Mutators exist at runtime only to refuse JavaScript callers by name. */
export function legacyHarnessView(harness: Harness): LegacyHarnessView {
  const view: Record<string, unknown> = {};
  for (const name of LEGACY_HARNESS_READERS) {
    const reader = harness[name] as (...args: unknown[]) => unknown;
    view[name] = (...args: unknown[]) => reader.apply(harness, args);
  }
  for (const [name, replacement] of Object.entries(LEGACY_HARNESS_MUTATORS)) {
    view[name] = async () => { throw new LegacyHarnessMutationRefused(name, replacement); };
  }
  return Object.freeze(view) as unknown as LegacyHarnessView;
}
