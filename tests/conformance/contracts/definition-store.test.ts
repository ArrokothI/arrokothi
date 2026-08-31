/**
 * Runs the published DefinitionStore contract against the dependency-free reference implementation.
 * A durable store must instantiate this same suite rather than writing a lookalike test.
 */

import { test, describe } from "node:test";
import { InMemoryDefinitionStore } from "@agent-sdk/core/reference";
import { definitionStoreContract } from "@agent-sdk/core/testing";

describe("DefinitionStore contract: InMemoryDefinitionStore", () => {
  for (const contractCase of definitionStoreContract(() => new InMemoryDefinitionStore())) {
    test(contractCase.name, contractCase.run);
  }
});
