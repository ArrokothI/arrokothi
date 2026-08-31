/**
 * Port contract suites.
 *
 * Each suite is a factory taking a way to construct the implementation under test and returning
 * named cases. External packages instantiate the same suites, so "my SQLite store passes" means the
 * same thing as "the in-memory reference passes", rather than "I wrote a test that looks similar".
 */

export type { ContractCase } from "./expect.ts";
export { capabilityExecutorContract } from "./capability-executor.ts";
export type { CapabilityExecutorSubject } from "./capability-executor.ts";
export { definitionStoreContract } from "./definition-store.ts";
export { runtimeStoreContract } from "./runtime-store.ts";
export { schedulerContract } from "./scheduler.ts";
