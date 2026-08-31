/** Runs the published RuntimeStore contract against the dependency-free reference implementation. */

import { test, describe } from "node:test";
import { InMemoryRuntimeStore } from "@agent-sdk/core/reference";
import { runtimeStoreContract } from "@agent-sdk/core/testing";

describe("RuntimeStore contract: InMemoryRuntimeStore", () => {
  for (const contractCase of runtimeStoreContract(() => new InMemoryRuntimeStore())) {
    test(contractCase.name, contractCase.run);
  }
});
