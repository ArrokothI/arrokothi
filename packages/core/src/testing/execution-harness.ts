/**
 * One-call wiring of a Harness over the dependency-free reference components.
 *
 * Conformance tests should spend their words on semantics, not construction. Note what this
 * returns: the same single `harness` regardless of how many definitions are later registered. A
 * helper that handed back one Harness per definition would quietly contradict the architecture it
 * is supposed to be testing.
 */

import { ControllerRegistry } from "../runtime/controller-registry.ts";
import { Harness } from "../runtime/harness.ts";
import type { HarnessOptions } from "../runtime/harness.ts";
import type { Clock } from "../ports/clock.ts";
import type { DefinitionStore } from "../ports/definition-store.ts";
import type { IdGenerator } from "../ports/ids.ts";
import type { ExecutionController } from "../ports/controller.ts";
import type { CapabilityExecutor } from "../ports/capability-executor.ts";
import type { CapabilityCatalog } from "../ports/capability-catalog.ts";
import type { EffectAuthorizer } from "../ports/effect-authorizer.ts";
import type { ConfirmationPolicy } from "../ports/confirmation-policy.ts";
import type { InlineWaitBudget } from "../ports/inline-wait.ts";
import { createDeterministicIds, createFixedClock } from "../reference/deterministic.ts";
import { FifoScheduler } from "../reference/fifo-scheduler.ts";
import { InMemoryDefinitionStore } from "../reference/in-memory-definition-store.ts";
import { InMemoryRuntimeStore } from "../reference/in-memory-runtime-store.ts";
import { createScriptedAgentController, createScriptedWorkflowController } from "./scripted-controllers.ts";

export interface TestHarnessBundle {
  readonly harness: Harness;
  readonly definitions: DefinitionStore;
  readonly store: InMemoryRuntimeStore;
  readonly scheduler: FifoScheduler;
  readonly controllers: ControllerRegistry;
  readonly clock: Clock;
  readonly ids: IdGenerator;
}

export interface TestHarnessOptions {
  /** Replaces the default scripted Agent/Workflow pair when a test needs its own controllers. */
  readonly controllers?: readonly ExecutionController[];
  /**
   * Reuses a store the caller already built.
   *
   * Needed when something wired *into a controller* must read runtime-owned state through a narrow
   * port - Agent exposure resolution reads the effective-authority record this way - and therefore
   * has to exist before the Harness does.
   */
  readonly store?: InMemoryRuntimeStore;
  /**
   * Reuses a DefinitionStore the caller already built - e.g. a counting/instrumented wrapper over
   * `InMemoryDefinitionStore`, so a test can assert the store was or was not queried.
   */
  readonly definitions?: DefinitionStore;
  readonly activationBudget?: HarnessOptions["activationBudget"];
  readonly maxActivationsPerRun?: number;
  /**
   * Effect policy. Left unset, the Harness denies every Effect - which is the default a test
   * asserting "requesting is not permission" wants.
   */
  readonly authorizer?: EffectAuthorizer;
  /** The exact-payload confirmation gate. Left unset, no Effect requires confirmation. */
  readonly confirmationPolicy?: ConfirmationPolicy;
  /** Where an operation's baseline consequentiality is declared. Left unset, nothing is classified. */
  readonly capabilityCatalog?: CapabilityCatalog;
  readonly capabilities?: CapabilityExecutor;
  /** Swap in `createNoInlineWaitBudget()` to force the slow path for work that could settle inline. */
  readonly inlineWait?: InlineWaitBudget;
  readonly defaultEffectDeadlineMs?: number;
}

export function createTestHarness(options: TestHarnessOptions = {}): TestHarnessBundle {
  const definitions = options.definitions ?? new InMemoryDefinitionStore();
  const store = options.store ?? new InMemoryRuntimeStore();
  const scheduler = new FifoScheduler();
  const controllers = new ControllerRegistry(
    options.controllers ?? [createScriptedAgentController(), createScriptedWorkflowController()],
  );
  const clock = createFixedClock();
  const ids = createDeterministicIds();

  const harness = new Harness({
    definitions,
    store,
    scheduler,
    controllers,
    clock,
    ids,
    ...(options.activationBudget !== undefined ? { activationBudget: options.activationBudget } : {}),
    ...(options.maxActivationsPerRun !== undefined ? { maxActivationsPerRun: options.maxActivationsPerRun } : {}),
    ...(options.authorizer !== undefined ? { authorizer: options.authorizer } : {}),
    ...(options.confirmationPolicy !== undefined ? { confirmationPolicy: options.confirmationPolicy } : {}),
    ...(options.capabilityCatalog !== undefined ? { capabilityCatalog: options.capabilityCatalog } : {}),
    ...(options.capabilities !== undefined ? { capabilities: options.capabilities } : {}),
    ...(options.inlineWait !== undefined ? { inlineWait: options.inlineWait } : {}),
    ...(options.defaultEffectDeadlineMs !== undefined ? { defaultEffectDeadlineMs: options.defaultEffectDeadlineMs } : {}),
  });

  return { harness, definitions, store, scheduler, controllers, clock, ids };
}
