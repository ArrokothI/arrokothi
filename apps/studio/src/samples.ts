import type { AgentDefinition } from "@arrokothi/core";
import { minimalAgent } from "@arrokothi/example-minimal-agent";

/**
 * Definitions the Studio can seed itself with.
 *
 * This is the SAME object the example runs, imported rather than copied - so a change to the
 * example is immediately visible in the Studio, and neither can drift from the other.
 */
export const SAMPLE_DEFINITIONS: AgentDefinition[] = [minimalAgent];
