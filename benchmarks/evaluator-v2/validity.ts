import type { ExperimentPlan, NeutralRawRunV2, RunInvalidReason } from "./schema.ts";

export interface RunValidity {
  valid: boolean;
  reason?: RunInvalidReason;
  detail?: string;
}

function providerReportedValues(run: NeutralRawRunV2): string[] {
  const reported = run.reportedModel?.providerReported ?? run.requestedModel?.providerReported;
  if (!reported) return [];
  return Array.isArray(reported) ? reported : [reported];
}

export function classifyRunValidity(run: NeutralRawRunV2, plan: ExperimentPlan = {}): RunValidity {
  if (run.invalidReason) return { valid: false, reason: run.invalidReason, detail: "raw artifact already marked invalid" };

  if (!run.schemaVersion || run.schemaVersion !== "neutral-raw-run-v2") {
    return { valid: false, reason: "corrupted_raw_artifact", detail: `schemaVersion=${String(run.schemaVersion)}` };
  }

  if (!Array.isArray(run.conversation)) {
    return { valid: false, reason: "corrupted_raw_artifact", detail: "conversation is not an array" };
  }

  const requested = run.requestedModel?.requested ?? run.reportedModel?.requested;
  if (plan.expectedRequestedModel && requested !== plan.expectedRequestedModel) {
    return {
      valid: false,
      reason: "wrong_requested_model",
      detail: `requested=${String(requested)} expected=${plan.expectedRequestedModel}`,
    };
  }

  if (plan.requireProviderReportedModelMatch && requested) {
    const reported = providerReportedValues(run);
    if (reported.length > 0 && reported.some((model) => model !== requested)) {
      return {
        valid: false,
        reason: "silent_model_substitution",
        detail: `requested=${requested} reported=${reported.join(",")}`,
      };
    }
  }

  for (const key of plan.requiredSetupKeys ?? []) {
    if (run.deterministicComputations?.[key] === undefined && run.canonicalFinalState?.[key] === undefined) {
      return { valid: false, reason: "missing_required_benchmark_setup", detail: `missing setup key ${key}` };
    }
  }

  const earlyErrors = (run.runtimeErrors ?? []).filter((error) => error.beforeSubjectBehavior);
  const providerSchema = earlyErrors.find((error) => error.code === "provider_schema_rejection");
  if (providerSchema) {
    return {
      valid: false,
      reason: "provider_schema_rejection_before_subject_behavior",
      detail: providerSchema.message,
    };
  }

  const providerOutage = earlyErrors.find((error) => error.code === "provider_outage" || error.code === "transport_failure");
  if (providerOutage && run.conversation.length === 0) {
    return {
      valid: false,
      reason: "provider_outage_or_transport_failure",
      detail: providerOutage.message,
    };
  }

  return { valid: true };
}

export function withValidity(run: NeutralRawRunV2, plan: ExperimentPlan = {}): NeutralRawRunV2 {
  const validity = classifyRunValidity(run, plan);
  return validity.valid ? { ...run, invalidReason: undefined } : { ...run, invalidReason: validity.reason };
}
