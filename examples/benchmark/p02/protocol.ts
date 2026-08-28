import type { P02GenerationConfig } from "./agent.ts";

export interface P02CliRequest {
  protocolVersion?: "1";
  sessionId?: string;
  generation?: P02GenerationConfig & { provider?: "gemini" };
  turns: Array<{ message: string }>;
}

export function parseP02CliRequest(value: unknown): P02CliRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("P02 input must be a JSON object.");
  }
  const input = value as Record<string, unknown>;
  if (input["protocolVersion"] !== undefined && input["protocolVersion"] !== "1") {
    throw new Error('P02 protocolVersion must be "1".');
  }
  if (input["sessionId"] !== undefined && (typeof input["sessionId"] !== "string" || !input["sessionId"].trim())) {
    throw new Error("P02 sessionId must be a non-empty string when supplied.");
  }
  const generation = parseGeneration(input["generation"]);
  const rawTurns = input["turns"];
  if (!Array.isArray(rawTurns) || !rawTurns.length) {
    throw new Error("P02 turns must be a non-empty array.");
  }
  const turns = rawTurns.map((turn, index) => {
    const message = typeof turn === "string"
      ? turn
      : turn && typeof turn === "object" && !Array.isArray(turn)
        ? (turn as Record<string, unknown>)["message"]
        : undefined;
    if (typeof message !== "string" || !message.trim()) {
      throw new Error(`P02 turn ${index + 1} requires a non-empty message.`);
    }
    return { message };
  });
  return {
    protocolVersion: "1",
    sessionId: input["sessionId"] as string | undefined,
    generation,
    turns,
  };
}

function parseGeneration(value: unknown): P02CliRequest["generation"] {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("P02 generation must be an object when supplied.");
  }
  const input = value as Record<string, unknown>;
  if (input["provider"] !== undefined && input["provider"] !== "gemini") {
    throw new Error('P02 generation.provider must be "gemini".');
  }
  if (input["model"] !== undefined && (typeof input["model"] !== "string" || !input["model"].trim())) {
    throw new Error("P02 generation.model must be a non-empty string.");
  }
  for (const key of ["temperature", "maxOutputTokens"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "number" || !Number.isFinite(input[key]))) {
      throw new Error(`P02 generation.${key} must be a finite number.`);
    }
  }
  if (typeof input["maxOutputTokens"] === "number" && (!Number.isInteger(input["maxOutputTokens"]) || input["maxOutputTokens"] < 1)) {
    throw new Error("P02 generation.maxOutputTokens must be a positive integer.");
  }
  return {
    provider: "gemini",
    model: input["model"] as string | undefined,
    temperature: input["temperature"] as number | undefined,
    maxOutputTokens: input["maxOutputTokens"] as number | undefined,
  };
}
