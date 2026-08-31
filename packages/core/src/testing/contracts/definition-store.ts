/**
 * DefinitionStore contract.
 *
 * The behaviour every implementation owes the kernel: published versions are immutable, refs pin
 * exact content, integrity mismatches are loud, and stored definitions are data that survives a
 * JSON round trip.
 */

import type { DefinitionId, ExecutionDefinitionRef } from "../../definitions/ids.ts";
import { definitionIntegrity } from "../../definitions/validation.ts";
import type { DefinitionStore } from "../../ports/definition-store.ts";
import { scriptedAgentDefinition, scriptedWorkflowDefinition } from "../scripted-controllers.ts";
import type { ContractCase } from "./expect.ts";
import { assertDeepEqual, assertEqual, assertRejects, assertTrue } from "./expect.ts";

export function definitionStoreContract(factory: () => DefinitionStore): readonly ContractCase[] {
  const agent = (version: number) =>
    scriptedAgentDefinition({ id: "contract-agent", version, program: [{ do: "complete" }] });

  return [
    {
      name: "a saved definition resolves back through its pinned ref",
      async run() {
        const store = factory();
        const definition = agent(1);
        const ref = await store.save(definition);
        assertEqual(ref.id, definition.id, "ref keeps the definition id");
        assertEqual(ref.version, 1, "ref keeps the version");
        assertEqual(ref.integrity, definitionIntegrity(definition), "ref carries the content digest");
        assertDeepEqual(await store.get(ref), definition, "the pinned ref resolves to the exact definition");
      },
    },
    {
      name: "a published version is immutable",
      async run() {
        const store = factory();
        await store.save(agent(1));
        await assertRejects(
          () => store.save(scriptedAgentDefinition({ id: "contract-agent", version: 1, program: [{ do: "fail", code: "x", message: "y" }] })),
          "DefinitionVersionConflictError",
          "republishing an existing version is refused",
        );
      },
    },
    {
      name: "versions coexist and the latest is the highest",
      async run() {
        const store = factory();
        await store.save(agent(1));
        await store.save(agent(3));
        await store.save(agent(2));
        assertDeepEqual(await store.listVersions("contract-agent" as DefinitionId), [1, 2, 3], "versions are listed in order");
        const latest = await store.getLatest("contract-agent" as DefinitionId);
        assertEqual(latest?.version, 3, "the latest version is the highest published one");
      },
    },
    {
      name: "a ref whose integrity no longer matches is refused",
      async run() {
        const store = factory();
        const ref = await store.save(agent(1));
        const tampered: ExecutionDefinitionRef = { ...ref, integrity: "0000000000000000" };
        await assertRejects(() => store.get(tampered), "DefinitionIntegrityError", "an integrity mismatch is not silently ignored");
      },
    },
    {
      name: "an unknown ref resolves to undefined rather than throwing",
      async run() {
        const store = factory();
        const ref = { id: "absent" as DefinitionId, version: 1, integrity: "abc" };
        assertEqual(await store.get(ref), undefined, "an unknown definition is absent, not an error");
      },
    },
    {
      name: "stored definitions are data, not aliases of the caller's object",
      async run() {
        const store = factory();
        const definition = scriptedWorkflowDefinition({ id: "contract-workflow", program: [{ do: "complete" }] });
        const ref = await store.save(definition);
        const loaded = await store.get(ref);
        assertTrue(loaded !== definition, "the store returns its own copy");
        assertDeepEqual(JSON.parse(JSON.stringify(loaded)), definition, "the definition survives a JSON round trip unchanged");
      },
    },
  ];
}
