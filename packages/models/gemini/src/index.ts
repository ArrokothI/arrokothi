import { toJsonSchema } from "@arrokothi/core";
import type { ObjectSchema, ValueSchema } from "@arrokothi/core";
import type {
  ModelCapabilityCall as PortableModelCapabilityCall,
  ModelMessage as PortableModelMessage,
  ModelProvider as PortableModelProvider,
  ModelProviderRequest as PortableModelProviderRequest,
  ModelProviderResponse as PortableModelProviderResponse,
} from "@arrokothi/core/ports";
import {
  ModelInvocationError,
  assertModelProviderRequest,
  validateModelProviderResponse,
} from "@arrokothi/core/ports";

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

interface GeminiTransportConfig {
  readonly apiKey: string;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxRetries: number;
  readonly fetchImpl: typeof fetch;
}

class GeminiTransportError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  constructor(code: string, message: string, retryable: boolean) {
    super(message);
    this.name = "GeminiTransportError";
    this.code = code;
    this.retryable = retryable;
  }
}

/** Validated HTTP and retry mechanism used by the provider adapter. */
async function postGemini(
  config: GeminiTransportConfig,
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<GeminiResponseBody> {
  let lastError: GeminiTransportError | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    const timer = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await config.fetchImpl(`${config.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": config.apiKey },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        const { code, retryable } = classify(response.status, text);
        const error = new GeminiTransportError(code, `Gemini ${response.status}: ${text.slice(0, 400)}`, retryable);
        // Rate limits remain visible to application pacing instead of disappearing into retries.
        if (!retryable || code === "HTTP_429_RATE_LIMIT" || attempt === config.maxRetries) throw error;
        lastError = error;
      } else {
        return (await response.json()) as GeminiResponseBody;
      }
    } catch (error) {
      if (error instanceof GeminiTransportError) throw error;
      if (signal?.aborted) throw new GeminiTransportError("CANCELLED", "Gemini request was cancelled", false);
      const { code, retryable } = classifyNetwork(error);
      const wrapped = new GeminiTransportError(code, error instanceof Error ? error.message : String(error), retryable);
      if (!retryable || attempt === config.maxRetries) throw wrapped;
      lastError = wrapped;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
    }
    await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
  }

  throw lastError ?? new GeminiTransportError("OTHER_PROVIDER_FAILURE", "request failed with no recorded cause", true);
}

/**
 * Gemini implementation for the provider-neutral model port.
 *
 * The provider receives an already-resolved model, uses capability terminology, validates
 * structured output at the boundary, and normalizes failures into the kernel taxonomy.
 */
export interface GeminiModelProviderOptions {
  readonly apiKey: string;
  readonly id?: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly maxRetries?: number;
  readonly fetchImpl?: typeof fetch;
  /** Deployment-level defaults, not semantic Definition fields. */
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
}

function toPortableGeminiContents(messages: readonly PortableModelMessage[]): { role: string; parts: GeminiPart[] }[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{
      text: message.role === "capability"
        ? `Result from ${message.capability ?? "capability"}${message.capabilityCallId ? ` (${message.capabilityCallId})` : ""}: ${message.content}`
        : message.content,
    }],
  }));
}

function normalizeGeminiInvocationError(error: unknown, provider: string, model: string): ModelInvocationError {
  if (error instanceof ModelInvocationError) return error;
  if (error instanceof GeminiTransportError) {
    if (error.code === "CANCELLED") {
      return new ModelInvocationError("cancelled", error.message, { provider, model, cause: error });
    }
    if (error.code === "PROVIDER_AUTH_FAILED") {
      return new ModelInvocationError("authentication", error.message, { provider, model, cause: error });
    }
    if (error.code === "HTTP_429_RATE_LIMIT" || error.code === "DAILY_QUOTA_EXHAUSTED") {
      return new ModelInvocationError("rate_limit", error.message, {
        provider,
        model,
        retryable: error.retryable,
        cause: error,
      });
    }
    if (error.code === "PROVIDER_5XX" || error.code.startsWith("NETWORK_") || error.code === "OTHER_PROVIDER_FAILURE") {
      return new ModelInvocationError("transport", error.message, {
        provider,
        model,
        retryable: error.retryable,
        cause: error,
      });
    }
    return new ModelInvocationError("provider_rejected", error.message, { provider, model, cause: error });
  }
  return new ModelInvocationError("transport", error instanceof Error ? error.message : String(error), {
    provider,
    model,
    retryable: true,
    cause: error,
  });
}

export class GeminiModelProvider implements PortableModelProvider {
  readonly id: string;
  private readonly transport: GeminiTransportConfig;
  private readonly temperature: number;
  private readonly maxOutputTokens: number;

  constructor(options: GeminiModelProviderOptions) {
    if (!options.apiKey) throw new Error("GeminiModelProvider requires an apiKey supplied by deployment wiring");
    this.id = options.id ?? "gemini";
    this.transport = {
      apiKey: options.apiKey,
      baseUrl: options.baseUrl ?? DEFAULT_BASE_URL,
      timeoutMs: options.timeoutMs ?? 60_000,
      maxRetries: options.maxRetries ?? 2,
      fetchImpl: options.fetchImpl ?? fetch,
    };
    this.temperature = options.temperature ?? 0;
    this.maxOutputTokens = options.maxOutputTokens ?? 2_048;
  }

  async generate(request: PortableModelProviderRequest): Promise<PortableModelProviderResponse> {
    assertModelProviderRequest(request, this.id);
    if (request.signal?.aborted) {
      throw new ModelInvocationError("cancelled", "Gemini request was cancelled before invocation", {
        provider: this.id,
        model: request.model.model,
      });
    }

    const structuredProjection = request.structuredOutput
      ? projectGeminiStructuredOutput(request.structuredOutput.schema)
      : undefined;
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: request.system }] },
      contents: toPortableGeminiContents(request.messages),
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxOutputTokens,
        ...(structuredProjection ? {
          responseMimeType: "application/json",
          responseJsonSchema: structuredProjection.schema,
        } : {}),
      },
    };
    if (request.capabilities?.length) {
      body["tools"] = [{
        functionDeclarations: request.capabilities.map((capability) => ({
          name: capability.name,
          description: capability.description,
          parameters: projectGeminiFunctionSchema(capability.input),
        })),
      }];
    }
    if ((body["contents"] as unknown[]).length === 0) {
      body["contents"] = [{ role: "user", parts: [{ text: "(start of conversation)" }] }];
    }

    let payload: GeminiResponseBody;
    try {
      payload = await postGemini(
        this.transport,
        `/models/${encodeURIComponent(request.model.model)}:generateContent`,
        body,
        request.signal,
      );
    } catch (error) {
      throw normalizeGeminiInvocationError(error, this.id, request.model.model);
    }

    if (payload.error) {
      throw new ModelInvocationError("provider_rejected", payload.error.message ?? "Gemini rejected the request", {
        provider: this.id,
        model: request.model.model,
      });
    }
    const candidate = payload.candidates?.[0];
    const parts = candidate?.content?.parts ?? [];
    const text = parts.map((part) => part.text ?? "").join("").trim();
    const capabilityCalls: PortableModelCapabilityCall[] = parts
      .filter((part) => part.functionCall)
      .map((part) => ({
        capability: part.functionCall!.name,
        // The core validator below remains authoritative; the transport type is intentionally loose.
        input: (part.functionCall!.args ?? {}) as PortableModelCapabilityCall["input"],
      }));

    let structured: unknown;
    if (structuredProjection) {
      try {
        structured = structuredProjection.normalize(JSON.parse(text) as unknown);
      } catch (error) {
        throw new ModelInvocationError("invalid_response", "Gemini returned malformed structured JSON", {
          provider: this.id,
          model: request.model.model,
          cause: error,
        });
      }
    }

    const inputTokens = payload.usageMetadata?.promptTokenCount;
    const outputTokens = payload.usageMetadata?.candidatesTokenCount;
    const usage = inputTokens !== undefined || outputTokens !== undefined
      ? {
          ...(inputTokens !== undefined ? { inputTokens } : {}),
          ...(outputTokens !== undefined ? { outputTokens } : {}),
          ...(inputTokens !== undefined && outputTokens !== undefined ? { totalTokens: inputTokens + outputTokens } : {}),
        }
      : undefined;
    const response = {
      output: {
        ...(!structuredProjection && text ? { text } : {}),
        ...(capabilityCalls.length ? { capabilityCalls } : {}),
        ...(structured !== undefined ? { structured } : {}),
      },
      metadata: {
        provider: this.id,
        model: payload.modelVersion ?? request.model.model,
        ...(usage ? { usage } : {}),
        ...(candidate?.finishReason ? { finishReason: candidate.finishReason } : {}),
      },
    };
    return validateModelProviderResponse(request, response);
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

/**
 * Gemini's function-declaration dialect rejects `additionalProperties` (confirmed by the live MCP
 * canary with HTTP 400 INVALID_ARGUMENT). Omit that keyword only on this provider-facing surface;
 * the descriptor and Harness validation retain the exact strict/permissive ObjectSchema contract.
 */
function projectGeminiFunctionSchema(schema: ValueSchema): Record<string, unknown> {
  return projectGeminiSchema(schema, false);
}

function projectGeminiSchema(schema: ValueSchema, includeAdditionalProperties = true): Record<string, unknown> {
  if (schema.kind === "any") {
    return {
      type: "string",
      description: "JSON-encoded string, number, boolean, or array of those primitive values.",
    };
  }
  if (schema.kind === "array") {
    const out: Record<string, unknown> = {
      type: "array",
      items: projectGeminiSchema(schema.items, includeAdditionalProperties),
    };
    if (schema.maxItems !== undefined) out["maxItems"] = schema.maxItems;
    return out;
  }
  if (schema.kind === "object") {
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [name, field] of Object.entries(schema.fields)) {
      const child = projectGeminiSchema(field.schema, includeAdditionalProperties);
      if (field.description) child["description"] = field.description;
      properties[name] = child;
      if (field.required) required.push(name);
    }
    return {
      type: "object",
      properties,
      ...(required.length ? { required } : {}),
      ...(includeAdditionalProperties
        ? { additionalProperties: schema.additionalProperties === true }
        : {}),
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

/** Deployment helper; credentials remain outside semantic definitions and resolved metadata. */
export function createGeminiModelProviderFromEnv(
  options: Omit<GeminiModelProviderOptions, "apiKey"> = {},
): GeminiModelProvider {
  const apiKey = geminiApiKeyFromEnv();
  if (!apiKey) {
    throw new Error("No Gemini API key found. Set GEMINI_API_KEY (or GOOGLE_API_KEY) in deployment configuration.");
  }
  return new GeminiModelProvider({ ...options, apiKey });
}
