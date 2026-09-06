/**
 * Strands integration for the ArrokothI Execution kernel.
 *
 * The executor stops Strands tool calls before native dispatch and returns them to the Agent
 * controller as semantic operation requests. The Harness remains the only authorization and
 * dispatch gateway.
 */

export { createStrandsAgentExecutor } from "./agent-executor.ts";
export type { StrandsAgentExecutorOptions } from "./agent-executor.ts";
export { ArrokothIStrandsModel } from "./model.ts";
export type { ArrokothIModelOptions } from "./model.ts";
