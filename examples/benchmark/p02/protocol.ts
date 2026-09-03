/**
 * The benchmark stdin/stdout contract for P02.
 *
 * Input: one JSON object with an ordered `turns` array (the conversation so far) and an injected
 * `generation` config the application must respect rather than substitute.
 * Output: one JSON object with at least `protocolVersion`, `subject`, and `conversation`.
 */

import type { P02SessionResult } from "./subject.ts";

export interface P02GenerationConfig {
  readonly provider: "gemini";
  readonly model: string;
  readonly temperature?: number;
  readonly maxOutputTokens?: number;
}

export interface P02CliRequest {
  readonly protocolVersion: "1";
  readonly sessionId?: string;
  readonly generation?: P02GenerationConfig;
  readonly turns: ReadonlyArray<{ readonly message: string }>;
}

export interface P02CliResponse {
  readonly protocolVersion: "1";
  readonly subject: "p02";
  readonly sessionId: string;
  readonly conversation: P02SessionResult["conversation"];
  readonly turns: P02SessionResult["turns"];
  readonly lead: P02SessionResult["lead"];
  readonly handoff: P02SessionResult["handoff"];
  /** BENCHMARK-DIAGNOSTIC. Runtime-derived model-call accounting; not part of the conversation. */
  readonly diagnostics: P02SessionResult["diagnostics"];
}

function asObject(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`P02 ${label} must be a JSON object.`);
  }
  return value as Record<string, unknown>;
}

function parseGeneration(value: unknown): P02GenerationConfig | undefined {
  if (value === undefined) return undefined;
  const input = asObject(value, "generation");
  if (input["provider"] !== undefined && input["provider"] !== "gemini") {
    throw new Error('P02 generation.provider must be "gemini".');
  }
  if (typeof input["model"] !== "string" || !input["model"].trim()) {
    throw new Error("P02 generation.model must be a non-empty string.");
  }
  for (const key of ["temperature", "maxOutputTokens"] as const) {
    if (input[key] !== undefined && (typeof input[key] !== "number" || !Number.isFinite(input[key]))) {
      throw new Error(`P02 generation.${key} must be a finite number.`);
    }
  }
  if (
    input["maxOutputTokens"] !== undefined &&
    (!Number.isInteger(input["maxOutputTokens"]) || (input["maxOutputTokens"] as number) < 1)
  ) {
    throw new Error("P02 generation.maxOutputTokens must be a positive integer.");
  }
  return {
    provider: "gemini",
    model: input["model"] as string,
    ...(input["temperature"] !== undefined ? { temperature: input["temperature"] as number } : {}),
    ...(input["maxOutputTokens"] !== undefined ? { maxOutputTokens: input["maxOutputTokens"] as number } : {}),
  };
}

export function parseP02CliRequest(value: unknown): P02CliRequest {
  const input = asObject(value, "input");
  if (input["protocolVersion"] !== undefined && input["protocolVersion"] !== "1") {
    throw new Error('P02 protocolVersion must be "1".');
  }
  if (
    input["sessionId"] !== undefined &&
    (typeof input["sessionId"] !== "string" || !input["sessionId"].trim())
  ) {
    throw new Error("P02 sessionId must be a non-empty string when supplied.");
  }
  const rawTurns = input["turns"];
  if (!Array.isArray(rawTurns) || rawTurns.length === 0) {
    throw new Error("P02 turns must be a non-empty array.");
  }
  const turns = rawTurns.map((turn, index) => {
    const message =
      typeof turn === "string"
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
    ...(typeof input["sessionId"] === "string" ? { sessionId: input["sessionId"] } : {}),
    generation: parseGeneration(input["generation"]),
    turns,
  };
}

export function formatP02Response(result: P02SessionResult): P02CliResponse {
  return {
    protocolVersion: "1",
    subject: "p02",
    sessionId: result.sessionId,
    conversation: result.conversation,
    turns: result.turns,
    lead: result.lead,
    handoff: result.handoff,
    diagnostics: result.diagnostics,
  };
}
