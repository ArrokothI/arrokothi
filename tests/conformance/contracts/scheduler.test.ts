/** Runs the published Scheduler contract against the dependency-free reference implementation. */

import { test, describe } from "node:test";
import { FifoScheduler } from "@arrokothi/core/reference";
import { schedulerContract } from "@arrokothi/core/testing";

describe("Scheduler contract: FifoScheduler", () => {
  for (const contractCase of schedulerContract(() => new FifoScheduler())) {
    test(contractCase.name, contractCase.run);
  }
});
