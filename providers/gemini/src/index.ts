import type {
  ModelMessage,
  ModelProvider,
  ModelRequest,
  ModelResponse,
  ModelToolCall,
  ModelToolSpec,
} from "@agent-sdk/core";
import { ModelProviderError, toJsonSchema } from "@agent-sdk/core";
import type { ObjectSchema, ValueSchema } from "@agent-sdk/core";

/**
 * Gemini adapter.
 *
 * This lives OUTSIDE core on purpose. Core defines `ModelProvider` and knows nothing about HTTP,
 * environment variables, or any vendor's request shape. Everything vendor-specific - credentials,
 * the REST envelope, the tool-call encoding, the failure taxonomy - is here.
 *
 * Zero dependencies: `fetch` is built into Node.
 */

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export interface GeminiProviderOptions {
  /**
   * API key. The CALLER reads this from its own environment and passes it in - core never reads a
   * credential, and neither does this constructor by default.
   */
  apiKey: string;
  /** Default model when a request does not name one. */
  model?: string;
  baseUrl?: string;
  /** Provider id, matched against `AgentDefinition.model.providerId`. */
  id?: string;
  timeoutMs?: number;
  /** Retries for transient transport failures. Rate limits are NOT silently retried here. */
  maxRetries?: number;
  fetchImpl?: typeof fetch;
}

/**
 * Reads the key from the environment, at the application boundary.
 *
 * Kept as an explicit, separately-called helper rather than something the constructor does, so it
 * is obvious in a stack trace where a credential entered the process.
 */
export function geminiApiKeyFromEnv(env: Record<string, string | undefined> = process.env): string | undefined {
  return env["GEMINI_API_KEY"] ?? env["GOOGLE_API_KEY"] ?? env["GOOGLE_GENERATIVE_AI_API_KEY"];
}

interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[]; role?: string };
  finishReason?: string;
}

interface GeminiResponseBody {
  candidates?: GeminiCandidate[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  modelVersion?: string;
  error?: { code?: number; message?: string; status?: string };
}

/** Core roles map onto Gemini's two, with tool output carried as a user-role observation. */
function toGeminiContents(messages: ModelMessage[]): { role: string; parts: GeminiPart[] }[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.role === "tool" ? `Result from ${m.toolName ?? "tool"}: ${m.content}` : m.content }],
  }));
}

function toGeminiTools(tools: ModelToolSpec[]): unknown {
  return [
    {
      functionDeclarations: tools.map((t) => ({
        name: t.name,
        description: t.description,
        parameters: toJsonSchema(t.input),
      })),
    },
  ];
}

/**
 * Classifies a failure into the taxonomy the benchmark protocol expects.
 *
 * The distinction that matters: a rate limit is not a daily quota wall, and neither is a generic
 * local fallback. Mislabelling them makes an operational problem look like a model behaviour.
 */
function classify(status: number, body: string): { code: string; retryable: boolean } {
  if (status === 429) return { code: "HTTP_429_RATE_LIMIT", retryable: true };
  if (status === 401 || status === 403) return { code: "PROVIDER_AUTH_FAILED", retryable: false };
  if (status >= 500) return { code: "PROVIDER_5XX", retryable: true };
  if (/quota/i.test(body) && /exceed|exhaust/i.test(body)) return { code: "DAILY_QUOTA_EXHAUSTED", retryable: false };
  return { code: `PROVIDER_HTTP_${status}`, retryable: false };
}

function classifyNetwork(error: unknown): { code: string; retryable: boolean } {
  const message = error instanceof Error ? error.message : String(error);
  if (/ENOTFOUND|EAI_AGAIN|dns/i.test(message)) return { code: "NETWORK_DNS", retryable: true };
  if (/timeout|ETIMEDOUT|aborted/i.test(message)) return { code: "NETWORK_TIMEOUT", retryable: true };
  return { code: "OTHER_PROVIDER_FAILURE", retryable: true };
}

export class GeminiProvider implements ModelProvider {
  readonly id: string;
  private readonly apiKey: string;
  private readonly defaultModel: string;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly fetchImpl: typeof fetch;

  constructor(options: GeminiProviderOptions) {
    if (!options.apiKey) throw new Error("GeminiProvider requires an apiKey; the caller reads it from its own environment");
    this.id = options.id ?? "gemini";
    this.apiKey = options.apiKey;
    this.defaultModel = options.model ?? "gemini-3.5-flash-lite";
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.timeoutMs = options.timeoutMs ?? 60_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async generate(request: ModelRequest): Promise<ModelResponse> {
    const model = request.model || this.defaultModel;
    const structuredProjection = request.responseSchema
      ? projectGeminiStructuredOutput(request.responseSchema)
      : undefined;
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: toGeminiContents(request.messages),
      generationConfig: {
        temperature: request.temperature ?? 0,
        maxOutputTokens: request.maxOutputTokens ?? 2048,
        ...(request.responseSchema
          ? {
              responseMimeType: "application/json",
              responseJsonSchema: structuredProjection!.schema,
            }
          : {}),
      },
    };
    if (request.tools?.length) body["tools"] = toGeminiTools(request.tools);

    // A message list can legitimately be empty on the first turn; Gemini requires at least one.
    if ((body["contents"] as unknown[]).length === 0) {
      body["contents"] = [{ role: "user", parts: [{ text: "(start of conversation)" }] }];
    }

    const payload = await this.post(`/models/${encodeURIComponent(model)}:generateContent`, body, request.signal);
    const response = this.toModelResponse(payload, model);
    return structuredProjection && response.json !== undefined
      ? { ...response, json: structuredProjection.normalize(response.json) }
      : response;
  }

  private async post(path: string, body: unknown, signal?: AbortSignal): Promise<GeminiResponseBody> {
    let lastError: ModelProviderError | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal?.addEventListener("abort", abort, { once: true });
      if (signal?.aborted) controller.abort();
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": this.apiKey },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          const { code, retryable } = classify(response.status, text);
          const error = new ModelProviderError(code, `Gemini ${response.status}: ${text.slice(0, 400)}`, retryable);
          // A rate limit is surfaced to the caller rather than absorbed here: the benchmark protocol
          // needs to pace and count 429s itself, not have them hidden inside a retry loop.
          if (!retryable || code === "HTTP_429_RATE_LIMIT" || attempt === this.maxRetries) throw error;
          lastError = error;
        } else {
          return (await response.json()) as GeminiResponseBody;
        }
      } catch (error) {
        if (error instanceof ModelProviderError) throw error;
        if (signal?.aborted) throw new ModelProviderError("CANCELLED", "Gemini request was cancelled", false);
        const { code, retryable } = classifyNetwork(error);
        const wrapped = new ModelProviderError(code, error instanceof Error ? error.message : String(error), retryable);
        if (!retryable || attempt === this.maxRetries) throw wrapped;
        lastError = wrapped;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }

    throw lastError ?? new ModelProviderError("OTHER_PROVIDER_FAILURE", "request failed with no recorded cause");
  }

  private toModelResponse(payload: GeminiResponseBody, requestedModel: string): ModelResponse {
    if (payload.error) {
      throw new ModelProviderError(payload.error.status ?? "PROVIDER_ERROR", payload.error.message ?? "unknown provider error");
    }
    const candidate = payload.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];

    const text = parts.map((p) => p.text ?? "").join("").trim();
    const toolCalls: ModelToolCall[] = parts
      .filter((p) => p.functionCall)
      .map((p) => ({ name: p.functionCall!.name, args: p.functionCall!.args ?? {} }));

    let json: unknown;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
      json = undefined; // The harness safely rejects malformed structured output.
      }
    }

    return {
      text: text || undefined,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      json,
      providerId: this.id,
      // The model the provider REPORTS, which is not always the one requested. Recorded as-is so a
      // silent substitution is visible in the trace rather than assumed away.
      model: payload.modelVersion ?? requestedModel,
      finishReason: candidate?.finishReason,
      usage: {
        inputTokens: payload.usageMetadata?.promptTokenCount,
        outputTokens: payload.usageMetadata?.candidatesTokenCount,
      },
      raw: payload,
    };
  }
}

export interface GeminiStructuredOutputProjection {
  /** Gemini-compatible JSON Schema sent on the wire. */
  schema: Record<string, unknown>;
  /** Deterministically restores provider-neutral values before core validation. */
  normalize(value: unknown): unknown;
}

/**
 * Gemini's structured-output subset has rejected nested polymorphic `anyOf` shapes on some model
 * versions. Provider-neutral `ValueSchema.any` is therefore represented on this provider's wire as
 * JSON text and restored before core performs its complete authoritative validation.
 */
export function projectGeminiStructuredOutput(schema: ObjectSchema): GeminiStructuredOutputProjection {
  return {
    schema: projectGeminiSchema(schema),
    normalize: (value) => normalizeGeminiWireValue(schema, value),
  };
}

function projectGeminiSchema(schema: ValueSchema): Record<string, unknown> {
  if (schema.kind === "any") {
    return {
      type: "string",
      description: "JSON-encoded string, number, boolean, or array of those primitive values.",
    };
  }
  if (schema.kind === "array") {
    const out: Record<string, unknown> = { type: "array", items: projectGeminiSchema(schema.items) };
    if (schema.maxItems !== undefined) out["maxItems"] = schema.maxItems;
    return out;
  }
  if (schema.kind === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [name, field] of Object.entries(schema.fields)) {
      const child = projectGeminiSchema(field.schema);
      if (field.description) child["description"] = field.description;
      properties[name] = child;
      if (field.required) required.push(name);
    }
    return {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
      ...(schema.additionalProperties ? { additionalProperties: true } : {}),
    };
  }
  return toGeminiResponseJsonSchema(toJsonSchema(schema)) as Record<string, unknown>;
}

function normalizeGeminiWireValue(schema: ValueSchema, value: unknown): unknown {
  if (schema.kind === "any") {
    if (typeof value !== "string") return value;
    try {
      const parsed = JSON.parse(value) as unknown;
      const primitive = typeof parsed === "string" || typeof parsed === "number" || typeof parsed === "boolean";
      const primitiveArray = Array.isArray(parsed)
        && parsed.every((item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean");
      return primitive || primitiveArray ? parsed : value;
    } catch {
      // A plain string remains a string. Complete core validation still decides whether it is valid
      // for the record field selected by the model.
      return value;
    }
  }
  if (schema.kind === "array") {
    return Array.isArray(value) ? value.map((item) => normalizeGeminiWireValue(schema.items, item)) : value;
  }
  if (schema.kind === "object" && value && typeof value === "object" && !Array.isArray(value)) {
    const input = value as Record<string, unknown>;
    return Object.fromEntries(Object.entries(input).map(([name, child]) => [
      name,
      schema.fields[name] ? normalizeGeminiWireValue(schema.fields[name]!.schema, child) : child,
    ]));
  }
  return value;
}

/**
 * Gemini structured output accepts a documented subset of JSON Schema. Core performs the complete
 * validation after parsing, so unsupported advisory constraints are omitted at this provider
 * boundary instead of turning a valid provider-neutral schema into HTTP 400 INVALID_ARGUMENT.
 */
function toGeminiResponseJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiResponseJsonSchema);
  if (!value || typeof value !== "object") return value;
  const unsupported = new Set(["minLength", "maxLength", "pattern"]);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !unsupported.has(key))
      .map(([key, child]) => [key, toGeminiResponseJsonSchema(child)]),
  );
}

/** Convenience for applications: build a provider from the environment, or explain what is missing. */
export function createGeminiProviderFromEnv(options: Omit<GeminiProviderOptions, "apiKey"> = {}): GeminiProvider {
  const apiKey = geminiApiKeyFromEnv();
  if (!apiKey) {
    throw new Error("No Gemini API key found. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in the environment of the app that constructs the provider.");
  }
  return new GeminiProvider({ ...options, apiKey });
}
