/**
 * Shared fixtures for the Slice E.0 child-Execution conformance suite.
 *
 * Every test here drives child creation through the ordinary Effect path: a scripted controller
 * proposes a `SpawnExecution` (via the `spawn` / `call` steps), and the Harness mediates. Nothing
 * constructs a child runtime record directly, and there is no second spawn path.
 */

import type { EffectAuthorizer } from "@agent-sdk/core/ports";
import { createAllowListAuthorizer, InMemoryRuntimeStore } from "@agent-sdk/core/reference";
import { createTestHarness } from "@agent-sdk/core/testing";
import type { ScriptedControllerStep } from "@agent-sdk/core/testing";
import { scriptedAgentDefinition } from "@agent-sdk/core/testing";

export const STRING_RESULT = { schemaId: "answer", schemaVersion: 1, schema: { kind: "string" } } as const;

/** A policy that permits spawning any child Definition and (optionally) some capability grants. */
export function permissive(): EffectAuthorizer {
  return createAllowListAuthorizer({ grants: [{ capability: "knowledge.query" }, { capability: "mail.send" }], spawn: true });
}

/** A policy that permits capabilities but denies every spawn. */
export function noSpawn(): EffectAuthorizer {
  return createAllowListAuthorizer({ grants: [{ capability: "knowledge.query" }] });
}

export interface Rig {
  readonly harness: ReturnType<typeof createTestHarness>["harness"];
  readonly definitions: ReturnType<typeof createTestHarness>["definitions"];
  readonly store: InMemoryRuntimeStore;
}

export function rig(authorizer: EffectAuthorizer = permissive()): Rig {
  const store = new InMemoryRuntimeStore();
  const { harness, definitions } = createTestHarness({ store, authorizer });
  return { harness, definitions, store };
}

export function agent(id: string, program: readonly ScriptedControllerStep[], version = 1) {
  return scriptedAgentDefinition({ id, version, program });
}

/** An Agent that returns a string terminal result. */
export function resultAgent(id: string, value: string, version = 1) {
  return scriptedAgentDefinition({ id, version, terminalResult: STRING_RESULT, program: [{ do: "complete", result: value }] });
}

/** Count the Executions the store currently holds. */
export async function executionCount(store: InMemoryRuntimeStore): Promise<number> {
  return (await store.listExecutions()).length;
}
