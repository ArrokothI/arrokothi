/**
 * A Strands-backed `AgentExecutor` that cannot dispatch anything.
 *
 * Strands has a native tool loop: the model emits a tool use, the framework runs the callback, and
 * the result goes back to the model. That loop is a second gateway, and letting it run would mean
 * an operation happened without ArrokothI authorizing it. So the bridge stops it one step earlier:
 *
 * ```text
 * ArrokothI invocation projection
 *        ↓ FunctionTool specs, built only from the projection's bindings
 * the model emits a tool use
 *        ↓ BeforeToolCall, BEFORE any native execution
 * event.interrupt() halts the agent and captures name + input + tool-use id
 *        ↓ a JSON snapshot is taken
 * the executor returns a semantic operation call
 *        ↓ AgentController resolves the binding and proposes UseCapability
 *        ↓ Harness authorizes, dispatches, and delivers a result Event
 * the snapshot is reloaded and resumed with that observation
 *        ↓ the interrupt returns the observation instead of throwing
 * an observation-only callback hands it to the model, and the loop continues
 * ```
 *
 * The FunctionTool callbacks are the part worth reading twice. They call nothing: they look up an
 * observation the Harness already established and return it. They hold no gateway, no capability
 * dispatcher, no HTTP or protocol client, and no settlement path - and if one is somehow reached
 * without an observation, it returns an error rather than performing the operation itself.
 *
 * `BeforeToolCallEvent.interrupt()` plus `takeSnapshot`/`loadSnapshot` are used deliberately in
 * preference to the experimental checkpoint boundary, whose JavaScript resume path may re-invoke
 * the model and regenerate the tool call - which would mean a second model turn the Agent's budget
 * never accounted for.
 */

import { toJsonSchema } from "@agent-sdk/core/execution";
import type {
  AgentExecutor,
  AgentExecutorOutcome,
  AgentExecutorRequest,
  ModelOperationCall,
  ModelProviderLookup,
} from "@agent-sdk/core/ports";
import { Agent, BeforeToolCallEvent, FunctionTool, InterruptResponseContent } from "@strands-agents/sdk";
import type { JSONValue, MessageData, Snapshot } from "@strands-agents/sdk";
import { ArrokothStrandsModel } from "./model.ts";

/** One interrupt name for the whole bridge, so an interrupt id is reconstructible from a tool-use id. */
const INTERRUPT_NAME = "arrokoth_operation";

export interface StrandsAgentExecutorOptions {
  /** Resolves the provider that ArrokothI's own model resolution named. Never a vendor guess. */
  readonly providers: ModelProviderLookup;
  /**
   * Cancellation, where the framework supports it.
   *
   * v0.4 has no Agent cancellation to plumb, so this is how a deployment supplies one today. It is
   * a scope-level concern, not something an executor request may carry: the request is plain data.
   */
  readonly cancelSignal?: AbortSignal;
}

/** What the executor carries between steps. Plain JSON; the kernel stores it and never reads it. */
interface StrandsContinuation {
  readonly snapshot: Snapshot;
  readonly pending: readonly { readonly interruptId: string; readonly toolUseId: string; readonly alias: string }[];
}

interface CapturedCall {
  readonly interruptId: string;
  readonly toolUseId: string;
  readonly alias: string;
  readonly input: JSONValue;
}

/** The id the framework derives for a `BeforeToolCall` interrupt, rebuilt from persisted state. */
function interruptIdFor(toolUseId: string): string {
  return `hook:beforeToolCall:${toolUseId}:${INTERRUPT_NAME}`;
}

function readContinuation(value: unknown): StrandsContinuation | null {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as { snapshot?: unknown; pending?: unknown };
  if (!candidate.snapshot || !Array.isArray(candidate.pending)) return null;
  return candidate as unknown as StrandsContinuation;
}

/** The messages a fresh Strands agent starts from, projected from the information branch. */
function initialMessages(request: AgentExecutorRequest): MessageData[] {
  return request.information.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(0, -1)
    .map((message) => ({ role: message.role as "user" | "assistant", content: [{ text: message.content }] }));
}

function invocationPrompt(request: AgentExecutorRequest): string {
  const latest = [...request.information.messages].reverse().find((message) => message.role === "user");
  return latest?.content ?? "Continue.";
}

/** What the Harness established, in the shape a tool callback may hand back to the model. */
function observationValue(request: AgentExecutorRequest, toolUseId: string): JSONValue | undefined {
  const observation = request.observations.find((candidate) => candidate.callId === toolUseId);
  if (!observation) return undefined;
  if (observation.outcome === "completed") return (observation.observation ?? null) as JSONValue;
  return {
    error: {
      outcome: observation.outcome,
      code: observation.error?.code ?? observation.outcome,
      message: observation.error?.message ?? observation.outcome,
    },
  } as JSONValue;
}

export function createStrandsAgentExecutor(options: StrandsAgentExecutorOptions): AgentExecutor {
  return {
    async step(request: AgentExecutorRequest): Promise<AgentExecutorOutcome> {
      if (request.capabilities.length > 0 && !request.model.portableFeatures.capabilityCalls) {
        return {
          kind: "fail",
          code: "model_cannot_receive_operations",
          message:
            `logical model "${request.model.logicalRef}" resolved to ${request.model.provider}/${request.model.model}, ` +
            `which cannot receive operation calls`,
        };
      }

      const model = new ArrokothStrandsModel({
        provider: options.providers.providerFor(request.model),
        resolved: request.model,
        requirements: request.requirements,
        capabilities: request.capabilities,
        system: request.information.system,
        purpose: `agent:step${request.step}`,
      });

      /** Observations the Harness established, keyed by the tool use they answer. */
      const observations = new Map<string, JSONValue>();
      const captured: CapturedCall[] = [];

      // Built only from the invocation projection. A name the projection did not expose has no
      // FunctionTool, so the framework cannot route to it and the model was never shown it.
      const tools = request.projection.bindings.map(
        (binding) =>
          new FunctionTool({
            name: binding.alias,
            description: binding.description,
            inputSchema: toJsonSchema(binding.input) as never,
            /**
             * Observation-only.
             *
             * It performs nothing and reaches nothing. Every operation this callback could describe
             * has already been through the Harness, and if that is somehow untrue the honest answer
             * is an error rather than doing the work here.
             */
            callback: (_input, context) => {
              const observed = observations.get(context.toolUse.toolUseId);
              if (observed === undefined) {
                return { error: "no ArrokothI observation is available for this operation" } as JSONValue;
              }
              return observed;
            },
          }),
      );

      const agent = new Agent({
        model,
        printer: false,
        systemPrompt: request.information.system,
        tools,
        messages: initialMessages(request),
      });

      // The interrupt is raised in `BeforeToolCall`, which is strictly before the framework runs
      // any callback. On resume it returns the observation instead of throwing, and only then is
      // the (observation-only) callback allowed to run.
      agent.addHook(BeforeToolCallEvent, (event) => {
        const toolUseId = event.toolUse.toolUseId;
        try {
          const response = event.interrupt<JSONValue>({
            name: INTERRUPT_NAME,
            reason: { alias: event.toolUse.name } as JSONValue,
          });
          observations.set(toolUseId, response);
        } catch (error) {
          captured.push({
            interruptId: interruptIdFor(toolUseId),
            toolUseId,
            alias: event.toolUse.name,
            input: event.toolUse.input,
          });
          throw error;
        }
      });

      const continuation = readContinuation(request.continuation);
      let result;
      try {
        if (continuation) {
          agent.loadSnapshot(continuation.snapshot);
          const responses = continuation.pending.map((pending) => {
            const observed = observationValue(request, pending.toolUseId);
            return new InterruptResponseContent({
              interruptId: pending.interruptId,
              response: observed === undefined ? ({ error: "no observation" } as JSONValue) : observed,
            });
          });
          result = await agent.invoke(responses, {
            ...(options.cancelSignal ? { cancelSignal: options.cancelSignal } : {}),
          });
        } else {
          result = await agent.invoke(invocationPrompt(request), {
            ...(options.cancelSignal ? { cancelSignal: options.cancelSignal } : {}),
          });
        }
      } catch (error) {
        return {
          kind: "fail",
          code: "strands_invocation_failed",
          message: error instanceof Error ? error.message : String(error),
        };
      }

      if (result.stopReason === "interrupt") {
        // Paused before any native execution. The snapshot is plain JSON and travels back through
        // Agent control state; the ArrokothI binding snapshot remains the resolver of record.
        const snapshot = agent.takeSnapshot({ preset: "session" });
        const calls: ModelOperationCall[] = captured.map((call) => ({
          callId: call.toolUseId,
          alias: call.alias,
          input: (call.input ?? {}) as never,
        }));
        if (calls.length === 0) {
          return { kind: "fail", code: "strands_interrupt_without_call", message: "the framework paused with no captured tool use" };
        }
        const carried: StrandsContinuation = {
          snapshot,
          pending: captured.map((call) => ({ interruptId: call.interruptId, toolUseId: call.toolUseId, alias: call.alias })),
        };
        return { kind: "call_operations", calls, continuation: JSON.parse(JSON.stringify(carried)) };
      }

      if (result.stopReason === "cancelled") {
        return { kind: "fail", code: "strands_cancelled", message: "the agent invocation was cancelled" };
      }

      const text = result.toString().trim();
      if (text.length === 0) {
        return { kind: "fail", code: "strands_empty_output", message: `the agent stopped with reason "${result.stopReason}" and no text` };
      }
      return { kind: "respond", text };
    },
  };
}
