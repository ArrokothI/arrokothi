/**
 * Dependency-free reference implementations of kernel ports.
 *
 * These exist so the semantics can be executed and tested with no database, network, provider, or
 * sandbox. They are replaceable: a durable store, a distributed queue, or a real clock must satisfy
 * the same ports and pass the same contract suites. Reference behaviour is never the definition of
 * a semantic - if a conformance test does not require it, it is an implementation detail.
 */

export { createDeterministicIds, createFixedClock, createSystemClock } from "./deterministic.ts";
export { InMemoryDefinitionStore } from "./in-memory-definition-store.ts";
export { InMemoryRuntimeStore } from "./in-memory-runtime-store.ts";
export { FifoScheduler } from "./fifo-scheduler.ts";
