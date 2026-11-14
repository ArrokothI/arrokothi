/**
 * A Driver-level rig for the K1.4 bridge corpus: the real `LegacyDriver`, the SDK host and the
 * in-process Kernel, with scripted native controllers. It reaches shapes the SDK's stock controllers
 * never produce (a root that ends while a detached child lives, a settlement that wakes nothing), and
 * the tests that use it say so in their names.
 */
import assert from "node:assert/strict";
import type { ExecutionId } from "@arrokothi/sdk";
import { ControllerRegistry, definitionRef } from "@arrokothi/core";
import type { ActivationRecord } from "@arrokothi/core";
import type { CapabilityExecutor } from "@arrokothi/core/ports";
import {
  InMemoryDefinitionStore, InMemoryRuntimeStore, createAllowListAuthorizer, createCapabilityCatalog, createNoInlineWaitBudget, createSystemClock,
} from "@arrokothi/core/reference";
import { createScriptedAgentController, scriptedAgentDefinition } from "@arrokothi/core/testing";
import { INPUT_KINDS, PROGRESS_CODEC, RUNTIME_CONTRACT_REVISION, encode } from "../src/legacy-bridge/codec.ts";
import { LegacyDriver } from "../src/legacy-bridge/driver.ts";
import { LineageScheduler } from "../src/legacy-bridge/lineage-scheduler.ts";
import { ApplicationHost } from "../src/host.ts";

export type Program = Parameters<typeof scriptedAgentDefinition>[0]["program"];

export const rigAuthority = { operations: ["slow", "human"].map(operation => ({ capability: "test", operation })) };

export interface RigOptions {
  /** The native store; a subclass injects faults or holds a write. */
  readonly store?: InMemoryRuntimeStore;
  /** The start Event's legacy input; `null`, the default, is the no-input start. */
  readonly startInput?: { readonly label: string; readonly payload?: unknown } | null;
  /** Leave native root creation to the caller, through the returned `createRoot`. */
  readonly deferRoot?: boolean;
}

/** A rig whose root runs `programs.root`; every other entry is a definition a step may spawn. */
export async function scriptedRig(programs: Record<string, Program>, executor?: CapabilityExecutor, options: RigOptions = {}) {
  const store = options.store ?? new InMemoryRuntimeStore();
  const definitions = new InMemoryDefinitionStore();
  const scheduler = new LineageScheduler(store);
  let host: ApplicationHost | undefined;
  const driver = new LegacyDriver({
    native: {
      store, definitions, clock: createSystemClock(), inlineWait: createNoInlineWaitBudget(),
      controllers: new ControllerRegistry([createScriptedAgentController()]),
      capabilityCatalog: createCapabilityCatalog(["slow", "human"].map(operation => ({
        capability: "test", operation, consequential: false, description: operation, input: { kind: "object", fields: {} },
      }))),
      capabilities: executor,
      authorizer: createAllowListAuthorizer({ grants: [{ capability: "test" }], spawn: { definitions: Object.keys(programs) } }),
    },
    scheduler, ids: { next: prefix => `${prefix}_${Math.random().toString(36).slice(2)}` },
    now: () => Date.now(), onChange: report => host?.noteExchange(report),
  });
  const caller = Object.freeze({ namespace: "arrokothi.sdk", scopes: Object.freeze(["application"]), cancelScopes: Object.freeze(["application"]) });
  const control = Object.freeze({ namespace: "arrokothi.sdk", scopes: Object.freeze(["application"]), controlScopes: Object.freeze(["application"]) });
  host = new ApplicationHost(driver, () => Date.now(), caller as never, control as never);
  for (const [id, program] of Object.entries(programs)) await definitions.save(scriptedAgentDefinition({ id, program }));
  const stored = await definitions.getVersion("root" as never, 1);
  assert.ok(stored);
  const created = host.coordinator.createExecution(host.caller, {
    creationKey: "scripted", scope: "application", definitionRevision: "scripted-root",
    runtimeContractRevision: RUNTIME_CONTRACT_REVISION, progressCodec: PROGRESS_CODEC,
    authorityContext: encode({ operationAuthority: rigAuthority }, "creation parameters"),
    initialInput: { kind: INPUT_KINDS.start, payload: encode({ input: options.startInput ?? null }, "initial input") },
  });
  assert.ok(created.ok);
  const executionId = created.value.executionId;
  host.setKnown(executionId, "READY");
  const createRoot = () => driver.createRoot(executionId, { definition: definitionRef(stored), operationAuthority: rigAuthority, structuralSpawnBudget: 4 } as never);
  if (!options.deferRoot) await createRoot();
  const h = host;
  /** Drives until E's Kernel state is not RUNNING or READY, or the budget ends; returns the state. */
  const drive = async (budgetMs: number) => {
    const until = Date.now() + budgetMs;
    for (;;) {
      h.pump();
      const state = h.state(executionId);
      if ((state !== "READY" && state !== "RUNNING") || Date.now() > until) return state;
      h.dispatchReady();
      await h.idle(2);
    }
  };
  /** Kernel input for the root, as `app.input` would submit it. */
  const input = (requestKey: string, payload: string) => {
    const answer = h.coordinator.submitInput(h.caller, {
      destination: executionId, requestKey, kind: INPUT_KINDS.input, subscriptionClass: INPUT_KINDS.input,
      payload: encode({ label: "user", destination: executionId, payload }, "input"),
    });
    assert.ok(answer.ok);
    h.setKnown(executionId, "unknown");
    return answer.value;
  };
  /** Every native member of E's lineage, root first. */
  const members = async () => {
    const ids = [executionId];
    for (let index = 0; index < ids.length; index++) {
      for (const link of await driver.harness.childExecutionLinksOf(ids[index]! as ExecutionId)) ids.push(link.childExecutionId);
    }
    return Promise.all(ids.map(async id => ({ id, lifecycle: (await driver.harness.inspect(id as ExecutionId))?.lifecycle ?? "missing" })));
  };
  /** Native steps a later host run starts. */
  const laterSteps = async (): Promise<readonly ActivationRecord[]> => {
    await drive(20);
    return h.runUntilIdle();
  };
  return { driver, host: h, executionId, drive, input, members, laterSteps, store, createRoot };
}
