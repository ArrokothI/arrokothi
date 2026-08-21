import type { ToolExecutor } from "@agent-sdk/core";
import type { BenchmarkAgent, ProjectionInput } from "../shared/runner.ts";
import {
  estateAgent,
  ESTATE_PROPERTIES,
  sendEstateLead,
} from "../../examples/p02-estate/agent.ts";

export {
  ESTATE_PROPERTIES,
  ESTATE_ROOMS as ROOMS,
  sendEstateLead as sendToTeam,
} from "../../examples/p02-estate/agent.ts";

/**
 * Thin benchmark projection over the standalone Agent_SDK P02 build.
 * Product behavior lives in examples/p02-estate; this file contains only evaluation adaptation.
 */

/** Benchmark-only injected transport; no production email or external state is touched. */
export function makeTransport(mode: "success" | "fail"): { executor: ToolExecutor; calls: Record<string, unknown>[] } {
  const calls: Record<string, unknown>[] = [];
  return {
    calls,
    executor: {
      async execute(args) {
        calls.push(args);
        if (mode === "fail") {
          return {
            ok: false,
            error: { code: "transport_unavailable", message: "the handoff could not be transmitted to the team" },
            retryable: true,
          };
        }
        return {
          ok: true,
          output: { delivered: true, transport: "benchmark_dry_run", reference: `bench-${calls.length}` },
          facts: [
            {
              key: "handoff_transmitted",
              value: true,
              description: "The runtime transport recorded a successful handoff dispatch.",
            },
          ],
        };
      },
    },
  };
}

/** Project Agent_SDK state into the frozen P02 evaluation field names. */
export function projectEstateFields(state: ProjectionInput): Record<string, string | number | boolean | undefined> {
  const raw = (key: string) => state.memory[key]?.value;
  const asString = (key: string) => {
    const value = raw(key);
    return value === undefined ? undefined : Array.isArray(value) ? value.join(", ") : String(value);
  };
  const budget = raw("budget");
  return {
    intent: asString("intent"),
    target_location: asString("target_location"),
    budget: typeof budget === "number" ? `$${budget / 1_000_000}M` : asString("budget"),
    budget_numeric: typeof budget === "number" ? budget : undefined,
    bedrooms_needed: asString("bedrooms_needed"),
    timeline: asString("timeline"),
    financing: asString("financing"),
    contact_name: asString("contact_name"),
    phone: asString("phone"),
    email: asString("email"),
    contact_preference: asString("contact_preference"),
    seller_zip: asString("seller_zip"),
  };
}

export function makeEstateBenchmarkAgent(): BenchmarkAgent & { lastCalls: () => Record<string, unknown>[] } {
  let calls: Record<string, unknown>[] = [];
  return {
    definition: estateAgent,
    executors: (mode) => {
      const transport = makeTransport(mode);
      calls = transport.calls;
      return { [sendEstateLead.name]: transport.executor };
    },
    project: projectEstateFields,
    canonicalAction: (toolName) => (toolName === sendEstateLead.name ? "send_email" : null),
    lastCalls: () => calls,
  };
}

/** Retained export used by the frozen P02 scenario detectors. */
export const PROPERTIES = ESTATE_PROPERTIES;
