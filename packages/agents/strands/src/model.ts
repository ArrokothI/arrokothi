/**
 * A Strands `Model` backed by an ArrokothI `ModelProvider`.
 *
 * The bridge exists so that a Strands-driven Agent step still resolves its model the ArrokothI way.
 * The definition names a *logical* model, deployment configuration resolves it, and this class
 * invokes whatever provider that resolution named. Nothing here inspects an Agent definition,
 * guesses a vendor, reads an environment variable, or constructs a first-party provider - the
 * previous integration did the last of those, and it is exactly the coupling this replaces.
 *
 * ```text
 * AgentSpec logical ref -> ModelResolver -> ResolvedModel -> ModelProvider
 *                                                              ↓ this class
 *                                                    Strands agent loop
 * ```
 *
 * The operations the model sees come from the ArrokothI invocation projection, not from Strands'
 * tool registry: the specs are handed in at construction, and `options.toolSpecs` is deliberately
 * ignored. Strands' registry exists so the framework can route a tool use; what the *model* is
 * shown has one source, and it is the projection.
 */

import type {
  ModelCapabilitySpec,
  ModelMessage,
  ModelProvider,
  ModelRequirements,
  ResolvedModel,
} from "@arrokothi/core/ports";
import { Model, type BaseModelConfig, type StreamOptions } from "@strands-agents/sdk";
import type { Message, ModelStreamEvent } from "@strands-agents/sdk";

export interface ArrokothIModelOptions {
  readonly provider: ModelProvider;
  /** Already resolved by the controller. This class performs no application routing. */
  readonly resolved: ResolvedModel;
  readonly requirements: ModelRequirements;
  /** Derived from the invocation projection, never from a framework tool registry. */
  readonly capabilities: readonly ModelCapabilitySpec[];
  readonly system: string;
  readonly purpose?: string;
}

interface BlockLike {
  readonly type?: string;
  readonly text?: string;
  readonly name?: string;
  readonly toolUseId?: string;
  readonly input?: unknown;
  readonly content?: readonly unknown[];
}

/** Renders one Strands content block into the portable message vocabulary. */
function renderBlock(block: BlockLike): string {
  if (block.type === "textBlock") return block.text ?? "";
  if (block.type === "toolUseBlock") return JSON.stringify({ tool: block.name, input: block.input ?? {} });
  if (block.type === "toolResultBlock") {
    return (block.content ?? []).map((inner) => renderBlock(inner as BlockLike)).join("\n");
  }
  if (block.type === "jsonBlock") return JSON.stringify((block as { json?: unknown }).json ?? null);
  return "";
}

/**
 * Projects Strands conversation state onto portable messages.
 *
 * A tool result becomes a `capability` message carrying the tool-use id it answers, so a provider
 * that reconstructs a transcript sees the same correlation the framework does.
 */
function toPortableMessages(messages: readonly Message[]): readonly ModelMessage[] {
  const portable: ModelMessage[] = [];
  for (const message of messages) {
    const blocks = (message.content ?? []) as unknown as BlockLike[];
    const results = blocks.filter((block) => block.type === "toolResultBlock");
    const rest = blocks.filter((block) => block.type !== "toolResultBlock");

    for (const result of results) {
      portable.push({
        role: "capability",
        content: renderBlock(result),
        ...(result.toolUseId ? { capabilityCallId: result.toolUseId } : {}),
      });
    }
    const content = rest.map(renderBlock).filter((text) => text.length > 0).join("\n");
    if (content.length === 0) continue;
    portable.push({ role: message.role === "assistant" ? "assistant" : "user", content });
  }
  return portable;
}

export class ArrokothIStrandsModel extends Model<BaseModelConfig> {
  private readonly options: ArrokothIModelOptions;
  private config: BaseModelConfig;

  constructor(options: ArrokothIModelOptions) {
    super();
    this.options = options;
    this.config = { modelId: options.resolved.model };
  }

  override updateConfig(modelConfig: BaseModelConfig): void {
    this.config = { ...this.config, ...modelConfig };
  }

  override getConfig(): BaseModelConfig {
    return this.config;
  }

  /**
   * One provider round trip, projected into the framework's streaming vocabulary.
   *
   * Not a stream in any real sense - the portable provider contract returns a whole response - so
   * this emits the aggregate as the events the framework's aggregator expects. That is honest: the
   * bridge does not pretend to a capability the portable contract does not have.
   */
  override async *stream(messages: Message[], options?: StreamOptions): AsyncIterable<ModelStreamEvent> {
    const system = typeof options?.systemPrompt === "string" ? options.systemPrompt : this.options.system;
    const response = await this.options.provider.generate({
      model: this.options.resolved,
      requirements: this.options.requirements,
      system,
      messages: toPortableMessages(messages),
      ...(this.options.capabilities.length > 0 ? { capabilities: this.options.capabilities } : {}),
      ...(this.options.purpose ? { purpose: this.options.purpose } : {}),
      // Forwarded only when the resolved deployment actually negotiated cancellation. The framework
      // supplies a signal on every invocation; the portable contract treats cancellation as a
      // declared feature, and handing one to a model that does not support it is a request error
      // rather than a harmless extra.
      ...(options?.cancelSignal && this.options.resolved.portableFeatures.cancellation
        ? { signal: options.cancelSignal }
        : {}),
    });

    yield { type: "modelMessageStartEvent", role: "assistant" };

    const text = response.output.text ?? "";
    if (text.length > 0) {
      yield { type: "modelContentBlockStartEvent" };
      yield { type: "modelContentBlockDeltaEvent", delta: { type: "textDelta", text } };
      yield { type: "modelContentBlockStopEvent" };
    }

    const calls = response.output.capabilityCalls ?? [];
    for (const [index, call] of calls.entries()) {
      const toolUseId = call.id ?? `${this.options.purpose ?? "call"}-${index + 1}`;
      yield { type: "modelContentBlockStartEvent", start: { type: "toolUseStart", name: call.capability, toolUseId } };
      yield { type: "modelContentBlockDeltaEvent", delta: { type: "toolUseInputDelta", input: JSON.stringify(call.input) } };
      yield { type: "modelContentBlockStopEvent" };
    }

    yield { type: "modelMessageStopEvent", stopReason: calls.length > 0 ? "toolUse" : "endTurn" };

    const usage = response.metadata.usage;
    if (usage) {
      yield {
        type: "modelMetadataEvent",
        usage: {
          inputTokens: usage.inputTokens ?? 0,
          outputTokens: usage.outputTokens ?? 0,
          totalTokens: usage.totalTokens ?? (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        },
      };
    }
  }
}
