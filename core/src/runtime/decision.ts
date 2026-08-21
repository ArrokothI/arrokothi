/**
 * Provider-neutral runtime decisions.
 *
 * Agent_SDK defines what these decisions mean. An execution-engine integration may adapt them to
 * its own hook/intervention vocabulary, but it may not reinterpret or bypass them.
 */
export type RuntimeDecision =
  | { kind: "proceed" }
  | { kind: "deny"; code: string; reason: string }
  | { kind: "guide"; code: string; feedback: string }
  | { kind: "confirm"; requestId: string; promptText: string }
  | {
      kind: "transform";
      reason: string;
      input: Record<string, unknown>;
      /** Consequential transformed payloads always require validation and fresh consent. */
      requiresFreshConfirmation: boolean;
    };

