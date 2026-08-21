import type { AgentDefinition } from "@agent-sdk/core";
import { minimalAgent } from "@agent-sdk/example-minimal-agent";
import { estateAgent } from "@agent-sdk/example-estate-like";

/**
 * Definitions the Studio can seed itself with.
 *
 * These are the SAME objects the examples run, imported rather than copied - so a change to an
 * example is immediately visible in the Studio, and neither can drift from the other.
 */
export const SAMPLE_DEFINITIONS: AgentDefinition[] = [minimalAgent, estateAgent];
