/**
 * The dry-run lead-handoff transport.
 *
 * The historical app POSTed the lead to a Gmail-backed endpoint. Here the external Effect is a fake
 * with a selectable outcome, so a benchmark run never contacts a real person and never needs a
 * credential. It exercises the three outcomes the kernel keeps strictly apart:
 *
 *   success   the team received the lead
 *   failure   it definitely was not delivered (safe to retry)
 *   unknown   the response was lost; it may have been delivered (must NOT be retried, must NOT be
 *             reported as a confirmed success)
 *
 * It also owns *external* idempotency (guide §4.3 point 2): once a dispatch has settled as success
 * or unknown, a repeat call replays that same outcome and sends nothing further. A prior `failure`
 * did not deliver, so a retry proceeds. This is deterministic at the transport and does not depend
 * on the runtime journal.
 *
 * `AuthorizedCapabilityRequest` gives an executor no memory handle by design, so the model-supplied
 * arguments are not trusted for lead content. The authorizer stages the authoritative committed
 * lead with `setPendingLead` before it allows the dispatch; only the free-text `analysis` comes
 * from the model, and it is not consequential.
 */

import type { CapabilityExecutor } from "@arrokothi/core/ports";
import type { CapabilityOutcome } from "@arrokothi/core/execution";
import type { LeadRecord } from "./lead.ts";

export type FakeEmailMode = "success" | "failure" | "unknown";

export interface FakeEmailProvider extends CapabilityExecutor {
  /** Stage the authoritative lead the next dispatch will actually send. */
  setPendingLead(lead: LeadRecord): void;
  /** True once a dispatch has settled as success or unknown — a further send must not happen. */
  hasSettled(): boolean;
  /** Payloads actually handed to the transport, in order. Replays do not append. */
  readonly sent: ReadonlyArray<Record<string, unknown>>;
}

export interface FakeEmailOptions {
  readonly mode?: FakeEmailMode;
  readonly recipient?: string;
}

export function createFakeEmailProvider(options: FakeEmailOptions = {}): FakeEmailProvider {
  const mode: FakeEmailMode = options.mode ?? "success";
  const recipient = options.recipient ?? "estatepro-team@dry-run.invalid";
  const sent: Array<Record<string, unknown>> = [];
  let pendingLead: LeadRecord = {};
  let settled: CapabilityOutcome | null = null;

  return {
    sent,
    setPendingLead(lead: LeadRecord): void {
      pendingLead = { ...lead };
    },
    hasSettled(): boolean {
      return settled !== null;
    },
    async execute(request): Promise<CapabilityOutcome> {
      if (settled !== null) return settled;

      const analysis = String((request.input as { analysis?: unknown }).analysis ?? "").trim();
      sent.push({
        recipient,
        lead: { ...pendingLead },
        analysis: analysis || "(no analysis supplied)",
        idempotencyKey: request.idempotencyKey,
      });

      if (mode === "failure") {
        return {
          status: "failure",
          error: { code: "transport_failed", message: "the lead transport rejected the message; nothing was delivered" },
          retryable: true,
        };
      }
      if (mode === "unknown") {
        settled = {
          status: "unknown",
          error: { code: "response_lost", message: "the lead transport accepted the request but the confirmation was lost" },
        };
        return settled;
      }
      settled = {
        status: "success",
        observation: { delivered: true, transport: "dry_run", recipient, reference: request.idempotencyKey },
      };
      return settled;
    },
  };
}
