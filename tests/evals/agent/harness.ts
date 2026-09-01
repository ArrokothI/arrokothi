/**
 * A behavioural eval harness for the reference Agent.
 *
 * `tests/conformance/` answers one question: does an implementation preserve ArrokothI semantics and
 * the boundaries it claims? This directory answers a different one:
 *
 * > Does this Agent configuration actually accomplish the task?
 *
 * They are not the same feedback loop and must not become one. Nothing here is a kernel primitive,
 * nothing here is imported by `packages/`, and a case failing means a *configuration* is worse than
 * it should be - not that the runtime is broken.
 *
 * ```text
 * conformance suite   != behavioural eval suite
 * Agent runtime       != eval harness
 * trajectory          != outcome
 * ```
 *
 * ## Grading the world, not the claim
 *
 * Every case here owns a small deterministic world - a record store, an outbox - and is graded on
 * what happened to it. An Agent that says "I sent the email" and sent nothing fails, because the
 * outbox is empty; an Agent that says nothing useful but left the world correct passes the outcome
 * check and fails the quality one. Those are different measurements and are reported separately.
 *
 * ## Determinism
 *
 * The model is scripted and the world is in-memory, so a case is a *reproducible* trajectory rather
 * than a sample. That is deliberately less than a real eval and deliberately enough to be a
 * baseline: it makes the metrics real, the trial abstraction real, and the cost zero. `runTrials`
 * takes a trial count so a stochastic provider can be dropped in later without reshaping anything;
 * a deterministic script runs one trial and says so.
 */

import type {
  AgentModelInvocation,
  AgentSpecInput,
  ExecutionId,
  JsonObject,
  OperationRef,
} from "@agent-sdk/core/execution";
import { defineAgent, formatModelActionTarget } from "@agent-sdk/core/execution";
import type { CapabilityExecutor, CapabilityOutcome } from "@agent-sdk/core/ports";
import type { ScriptedModelStep } from "@agent-sdk/core/reference";
import {
  createAllowListAuthorizer,
  createCapabilityCatalog,
  createScriptedCapabilityExecutor,
  ScriptedModelProvider,
} from "@agent-sdk/core/reference";
import type { CapabilityOperationDescriptorInput } from "@agent-sdk/core/reference";
import { agentModelAccess, createAgentTestHarness, referenceAgentExecutor } from "@agent-sdk/core/testing";
import { StaticModelResolver, portableModelFeatures } from "@agent-sdk/core/reference";

/** One capability operation the world implements, with the handler that changes it. */
export interface WorldOperation extends CapabilityOperationDescriptorInput {
  handle(input: JsonObject): CapabilityOutcome;
}

/**
 * The environment a case is graded on.
 *
 * `state` is read *after* the run and compared against what the task required. It is the only
 * source of truth about whether the task was accomplished.
 */
export interface EvalWorld {
  readonly operations: readonly WorldOperation[];
  state(): JsonObject;
}

/** One operation the Agent asked the runtime to perform, and what became of it. */
export interface AttemptedOperation {
  readonly capability: string;
  readonly operation: string;
  readonly input: JsonObject;
  /** `executed` means the capability implementation actually ran. */
  readonly outcome: "executed" | "denied" | "rejected";
}

export interface TrialResult {
  readonly lifecycle: string;
  readonly failureCode: string | null;
  /** Everything the Agent said, in order. Text is evidence about quality, never about outcome. */
  readonly responses: readonly string[];
  readonly attempted: readonly AttemptedOperation[];
  readonly executed: readonly AttemptedOperation[];
  readonly modelCalls: number;
  readonly tokens: { readonly input: number; readonly output: number; readonly total: number };
  /** Summed provider latency across the trial's model calls. Wall clock, honestly measured. */
  readonly latencyMs: number;
  /** True when the Agent ran out of permitted model calls without concluding. */
  readonly boundedProgressionFailure: boolean;
  /** The world as it ended up. What "did it work" is decided from. */
  readonly world: JsonObject;
  readonly invocations: readonly AgentModelInvocation[];
}

export interface TrialSpec {
  readonly id: string;
  readonly instructions: string;
  readonly prompt: string;
  /** What the deployment granted this Execution. The hard ceiling. */
  readonly authority: readonly OperationRef[];
  /** What the definition asks to show the model. Intersected with the ceiling. */
  readonly expose: readonly OperationRef[];
  readonly limits?: AgentSpecInput["limits"];
  /** Policy narrowing inside the ceiling. Absent means every granted operation is allowed. */
  readonly policy?: readonly { readonly capability: string; readonly operations?: readonly string[] }[];
  /** The model's behaviour, per trial index, so a stochastic provider can replace this later. */
  script(trial: number): readonly ScriptedModelStep[];
  world(): EvalWorld;
}

function catalogFor(world: EvalWorld) {
  return createCapabilityCatalog(
    world.operations.map(({ handle: _handle, ...descriptor }) => descriptor),
  );
}

function executorFor(world: EvalWorld): CapabilityExecutor {
  const handlers: Record<string, (request: { readonly input: JsonObject }) => CapabilityOutcome> = {};
  for (const operation of world.operations) {
    handlers[`${operation.capability}:${operation.operation}`] = (request) => operation.handle(request.input);
  }
  return createScriptedCapabilityExecutor({ handlers });
}

/** Runs one trial to a standstill and reports what the world and the trace say about it. */
export async function runTrial(spec: TrialSpec, trial = 0): Promise<TrialResult> {
  const world = spec.world();
  const provider = new ScriptedModelProvider({ id: "eval", steps: spec.script(trial) });
  const bundle = createAgentTestHarness({
    catalog: catalogFor(world),
    models: agentModelAccess(
      new StaticModelResolver({
        primary: { provider: "eval", model: "scripted", portableFeatures: portableModelFeatures({ capabilityCalls: true, usageMetadata: true }) },
      }),
    ),
    executor: referenceAgentExecutor([provider]),
    authorizer: createAllowListAuthorizer({
      grants: (spec.policy ?? spec.authority.map((ref) => ({ capability: ref.capability, operations: [ref.operation] }))).map(
        (grant) => ({ capability: grant.capability, ...(grant.operations ? { operations: [...grant.operations] } : {}) }),
      ),
    }),
    capabilities: executorFor(world),
  });

  const definition = defineAgent({
    id: `${spec.id}-t${trial}`,
    spec: {
      model: { logicalRef: "primary", requirements: { text: true, capabilityCalls: "required" } },
      instructions: spec.instructions,
      operations: { refs: [...spec.expose] },
      ...(spec.limits ? { limits: spec.limits } : {}),
    } satisfies AgentSpecInput,
  });
  const ref = await bundle.definitions.save(definition);
  const agent = await bundle.createAgent({ definition: ref, authority: [...spec.authority] });
  await bundle.harness.deliverExternalInput({ destination: agent.executionId, label: "task", payload: spec.prompt });

  // Bounded: an Agent that never settles is a result, not a hang.
  for (let step = 0; step < 24; step++) {
    await bundle.harness.runUntilIdle();
    await bundle.harness.drainResumptions();
    const context = await bundle.harness.inspect(agent.executionId);
    if (context && context.lifecycle !== "READY") break;
  }

  return report(bundle, agent.executionId, world);
}

/** Runs a case `count` times. A deterministic script produces `count` identical trials. */
export async function runTrials(spec: TrialSpec, count = 1): Promise<readonly TrialResult[]> {
  const results: TrialResult[] = [];
  for (let trial = 0; trial < count; trial++) results.push(await runTrial(spec, trial));
  return results;
}

async function report(
  bundle: ReturnType<typeof createAgentTestHarness>,
  executionId: ExecutionId,
  world: EvalWorld,
): Promise<TrialResult> {
  const context = await bundle.harness.inspect(executionId);
  const emissions = await bundle.harness.emissionsOf(executionId);
  const journal = await bundle.harness.effectJournalOf(executionId);

  // What was attempted, and what actually happened to each attempt, read from the journal rather
  // than from anything the Agent said about itself.
  const attempted: AttemptedOperation[] = [];
  for (const entry of journal) {
    if (entry.phase !== "requested") continue;
    const proposal = (entry.detail["proposal"] ?? {}) as { capability?: string; operation?: string; input?: JsonObject };
    const later = journal.filter((candidate) => candidate.effectId === entry.effectId).map((candidate) => candidate.phase);
    attempted.push({
      capability: proposal.capability ?? "?",
      operation: proposal.operation ?? "?",
      input: proposal.input ?? {},
      outcome: later.includes("dispatch_started") ? "executed" : later.includes("denied") ? "denied" : "rejected",
    });
  }

  const invocations = bundle.trace.modelInvocations;
  const tokens = invocations.reduce(
    (total, invocation) => ({
      input: total.input + (invocation.metadata?.usage?.inputTokens ?? 0),
      output: total.output + (invocation.metadata?.usage?.outputTokens ?? 0),
      total: total.total + (invocation.metadata?.usage?.totalTokens ?? 0),
    }),
    { input: 0, output: 0, total: 0 },
  );

  const failureCode = context?.failure?.code ?? null;
  return {
    lifecycle: context?.lifecycle ?? "MISSING",
    failureCode,
    responses: emissions
      .map((emission) => emission.body as { kind?: string; text?: string })
      .filter((body) => body.kind === "text")
      .map((body) => body.text ?? ""),
    attempted,
    executed: attempted.filter((operation) => operation.outcome === "executed"),
    modelCalls: invocations.length,
    tokens,
    latencyMs: invocations.reduce((total, invocation) => total + (invocation.metadata?.latencyMs ?? 0), 0),
    boundedProgressionFailure: failureCode === "agent_model_call_budget_exhausted",
    world: world.state(),
    invocations: [...invocations],
  };
}

/** The comparable numbers for one case. Deliberately small, and every field is measured. */
export interface TrialMetrics {
  readonly taskSuccess: boolean;
  /** Every executed operation was one the task actually needed. */
  readonly operationSelectionCorrect: boolean;
  /** Every executed operation carried the arguments the task required. */
  readonly argumentsCorrect: boolean;
  readonly unnecessaryCalls: number;
  readonly modelCalls: number;
  readonly operationCalls: number;
  readonly boundedProgressionFailure: boolean;
  readonly tokens: number;
  readonly latencyMs: number;
  /** Whether the final response reflects what actually happened. Graded against the world. */
  readonly finalResultTruthful: boolean;
}

export interface Expectation {
  /** Decided from the world alone. */
  succeeded(world: JsonObject): boolean;
  /** The operations this task genuinely needs, as `capability/operation`. */
  readonly required: readonly string[];
  /** Per-operation argument check, keyed by `capability/operation`. */
  readonly arguments?: Readonly<Record<string, (input: JsonObject) => boolean>>;
  /** Whether the Agent's last word is consistent with the world it left behind. */
  truthful?(responses: readonly string[], world: JsonObject): boolean;
}

export function measure(result: TrialResult, expectation: Expectation): TrialMetrics {
  const executed = result.executed.map((operation) => `${operation.capability}/${operation.operation}`);
  const required = new Set(expectation.required);
  const unnecessary = executed.filter((name) => !required.has(name)).length;
  const missing = [...required].filter((name) => !executed.includes(name)).length;
  return {
    taskSuccess: expectation.succeeded(result.world),
    operationSelectionCorrect: unnecessary === 0 && missing === 0,
    argumentsCorrect: result.executed.every((operation) => {
      const check = expectation.arguments?.[`${operation.capability}/${operation.operation}`];
      return check ? check(operation.input) : true;
    }),
    unnecessaryCalls: unnecessary,
    modelCalls: result.modelCalls,
    operationCalls: result.executed.length,
    boundedProgressionFailure: result.boundedProgressionFailure,
    tokens: result.tokens.total,
    latencyMs: result.latencyMs,
    finalResultTruthful: expectation.truthful ? expectation.truthful(result.responses, result.world) : true,
  };
}

/** What the model was shown to have selected, in the vocabulary a case reads most easily. */
export function selectedTargets(result: TrialResult): readonly string[] {
  return result.invocations.flatMap((invocation) =>
    invocation.proposals.map((proposal) => formatModelActionTarget(proposal.target)),
  );
}

/** A scripted step: the model calls one operation. */
export function callsOperation(alias: string, input: JsonObject, id = "c1"): ScriptedModelStep {
  return {
    output: { capabilityCalls: [{ id, capability: alias, input }] },
    metadata: { usage: { inputTokens: 100, outputTokens: 20, totalTokens: 120 }, finishReason: "TOOL_USE" },
  };
}

/** A scripted step: the model answers. */
export function answers(text: string): ScriptedModelStep {
  return {
    output: { text },
    metadata: { usage: { inputTokens: 140, outputTokens: 30, totalTokens: 170 }, finishReason: "STOP" },
  };
}
