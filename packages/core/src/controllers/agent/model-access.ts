/**
 * How an Agent controller reaches a model, and what it deliberately cannot reach.
 *
 * ```text
 * LogicalModelRequest -> ModelResolver -> ResolvedModel -> AgentExecutor -> provider
 * ```
 *
 * Resolution and invocation are split across the boundary. The controller resolves - a definition
 * names a *logical* model and the portable features it needs, and deployment configuration decides
 * what that means - and the executor invokes. Nothing here reads a credential, nothing here lets a
 * definition name a provider, and the controller never holds a provider client.
 *
 * Model inference is **local computation**. It is not an Effect, not authorized, not journaled, and
 * it never enters a mailbox - which is why a controller may hold a resolver at all: it is a local
 * semantic dependency in the same sense as a parser.
 *
 * Local does not mean synchronous. A provider call may take tens of seconds, and an Activation that
 * held its scheduler claim for that long would stop every other Execution for no semantic reason.
 * So one executor step runs inside a controller-local resumption: if it settles within the inline
 * budget the value comes straight back, and if it does not, the Activation yields, the Execution
 * waits on the resumption record, and a later Activation reconstructing the same key is handed the
 * stored outcome instead of dispatching a second call.
 *
 * ```text
 * local to the Execution   no independent Execution identity, authority, or mailbox
 * NOT                      must finish inside the Activation that started it
 * ```
 *
 * Both paths cross the same JSON boundary and normalize failure identically, so which one happened
 * is invisible to Agent semantics.
 */

import type { ControllerResumptionId } from "../../execution/ids.ts";
import type { LogicalModelRequest, ResolvedModel } from "../../model/types.ts";
import type { ModelActionTarget } from "../../operations/action-target.ts";
import type {
  AgentExecutor,
  AgentExecutorOutcome,
  AgentExecutorRequest,
  AgentModelInvocationMetadata,
} from "../../ports/agent-executor.ts";
import type { ControllerResumptionScope } from "../../ports/controller-resumption.ts";
import type { ModelResolver } from "../../ports/model-resolver.ts";
import type { JsonObject } from "../../util/json.ts";

/**
 * The model services an AgentController may hold.
 *
 * A resolver and opaque deployment policy. There is no provider lookup here: invoking a provider is
 * the executor's job, and a controller holding one would be a controller that could call a model
 * outside the step boundary the Harness budgets.
 */
export interface AgentModelAccess {
  readonly resolver: ModelResolver;
  /** Opaque, serializable deployment/policy facts forwarded to resolution. */
  readonly policy?: JsonObject;
}

/** What the controller decided after reading one semantic outcome. */
export type AgentControllerDecision =
  | "respond"
  | "call_operations"
  | "continue"
  | "complete"
  | "fail";

/** One binding as a trace record: which name meant what, without the schema it was shown with. */
export interface AgentProjectedBindingRecord {
  readonly bindingId: string;
  readonly alias: string;
  readonly target: ModelActionTarget;
}

export interface AgentActionProposalRecord {
  readonly step: number;
  readonly correlationId: string;
  readonly bindingId: string;
  readonly alias: string;
  readonly target: ModelActionTarget;
}

/**
 * One Agent model step, as a trace record.
 *
 * Ephemeral observation, deliberately not persisted alongside Agent progress and deliberately not an
 * Event. Recording it changes nothing: no mailbox append, no journal entry, no lifecycle transition,
 * no authority. Turning a model result into an Event so that it could be observed would have made
 * observability a semantic feature, which is exactly the mistake this seam exists to avoid.
 *
 * What it carries is what an evaluation or debug deployment needs to reconstruct the invocation
 * boundary without retaining raw prompts or whole provider payloads:
 *
 * ```text
 * which Execution, which Activation, which step
 * which logical model, and which deployment answered it
 * which information selection it saw          (a digest, not the prompt)
 * which projection it was shown, and what the bindings meant
 * what the model produced, semantically
 * what the controller then decided, and what it proposed
 * provider usage, finish reason, diagnostics, latency
 * ```
 *
 * `reentered` says whether this step's answer came back through a ControllerResumption rather than
 * inside the Activation that issued it. The two paths report identical semantics; the flag is how a
 * run can prove that rather than assume it.
 */
export interface AgentModelInvocation {
  readonly executionId: string;
  /** The Activation that interpreted this invocation. A stable link to the runtime's own record. */
  readonly activationId: string;
  /** 1-based Agent step. The controller's own revision coordinate for this progression. */
  readonly step: number;
  /** True when a previous Activation issued this call and this one was handed the stored outcome. */
  readonly reentered: boolean;
  readonly logicalRef: string;
  readonly provider: string;
  readonly model: string;
  /** Serializable, non-secret deployment diagnostics, when resolution reported any. */
  readonly deployment?: JsonObject;
  /** Content-derived identity of the compiled information this call saw. Not the prompt. */
  readonly informationSelectionId: string;
  readonly projectionId: string;
  readonly viewId: string;
  readonly exposedActions: number;
  readonly bindings: readonly AgentProjectedBindingRecord[];
  readonly outcome: AgentExecutorOutcome["kind"];
  readonly decision: AgentControllerDecision;
  /** The Effect proposals this step produced, with the correlations their results will carry. */
  readonly proposals: readonly AgentActionProposalRecord[];
  /** Provider evidence. Absent when the executor reported none; never invented. */
  readonly metadata?: AgentModelInvocationMetadata;
}

/**
 * Optional local observation sink.
 *
 * Holding one grants nothing, persists nothing, and decides nothing. A deployment that samples,
 * redacts, or simply does not install one loses evidence and loses no semantics.
 */
export interface AgentTrace {
  modelInvoked?(record: AgentModelInvocation): void;
  actionProposed?(record: AgentActionProposalRecord): void;
}

/** What one executor step produced, before the controller interprets it. */
export interface AgentStepInvocation {
  readonly resolved: ResolvedModel;
  readonly outcome: AgentExecutorOutcome;
  /** Non-semantic provider evidence carried alongside the outcome. Plain JSON on both paths. */
  readonly metadata?: AgentModelInvocationMetadata;
}

/**
 * A model step that either produced its outcome or yielded the Activation.
 *
 * There is no third arm for failure: a failed resolution or executor step throws, so the caller's
 * ordinary failure path applies unchanged and a rejection reads the same fast or slow.
 */
export type AgentStepAttempt =
  | { readonly status: "invoked"; readonly invocation: AgentStepInvocation }
  | { readonly status: "suspended"; readonly resumptionId: ControllerResumptionId };

/**
 * Wiring that cannot run a model step.
 *
 * A distinct error rather than a silent no-op: an Agent whose model access or executor is missing
 * has no way to progress, and answering "the model said nothing" would hide a deployment mistake
 * behind what looks like a quiet model.
 */
export class AgentModelUnavailableError extends Error {
  constructor(detail: string) {
    super(`this AgentController cannot run a model step: ${detail}`);
    this.name = "AgentModelUnavailableError";
  }
}

export interface RunAgentStepInput {
  readonly resumptions: ControllerResumptionScope;
  /** Derived from persisted Agent coordinates only, so a resumed Activation rebuilds it exactly. */
  readonly key: string;
  readonly access: AgentModelAccess | undefined;
  readonly executor: AgentExecutor | undefined;
  readonly model: LogicalModelRequest;
  /** Everything except the resolved model, which resolution supplies inside the thunk. */
  readonly request: Omit<AgentExecutorRequest, "model">;
}

/**
 * Runs one executor step as controller-local work that may outlive its Activation.
 *
 * Resolution happens inside the thunk alongside invocation, so a deployment that cannot satisfy a
 * required portable feature fails the step in exactly the same shape whichever path it took.
 */
export async function runAgentStep(input: RunAgentStepInput): Promise<AgentStepAttempt> {
  const attempt = await input.resumptions.run(input.key, async () => {
    if (!input.access) {
      throw new AgentModelUnavailableError(`no model access is wired, so logical model "${input.model.logicalRef}" cannot be resolved`);
    }
    if (!input.executor) throw new AgentModelUnavailableError("no executor is wired");
    const resolved = await input.access.resolver.resolve({
      logicalRef: input.model.logicalRef,
      requirements: input.model.requirements,
      ...(input.access.policy ? { policy: input.access.policy } : {}),
    });
    const result = await input.executor.step({ ...input.request, model: resolved });
    // Crosses the runtime's JSON boundary on both paths, so an outcome that could not be persisted
    // fails identically whether it settled inside this Activation or an hour later. The metadata
    // travels the same way, which is what makes a slow invocation report the facts a fast one did.
    return {
      resolved,
      outcome: result.outcome,
      ...(result.metadata !== undefined ? { metadata: result.metadata } : {}),
    };
  });

  switch (attempt.status) {
    case "settled":
      return { status: "invoked", invocation: attempt.value as unknown as AgentStepInvocation };
    case "failed":
      throw new Error(attempt.failure.message);
    case "suspended":
      return { status: "suspended", resumptionId: attempt.resumptionId };
  }
}
