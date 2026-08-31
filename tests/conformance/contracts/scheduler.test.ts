/** Runs the published Scheduler contract against the dependency-free reference implementation. */

import { test, describe } from "node:test";
import { FifoScheduler } from "@agent-sdk/core/reference";
import { schedulerContract } from "@agent-sdk/core/testing";

describe("Scheduler contract: FifoScheduler", () => {
  for (const contractCase of schedulerContract(() => new FifoScheduler())) {
    test(contractCase.name, contractCase.run);
  }
});
