/**
 * CapabilityExecutor contract.
 *
 * The port is where external implementations attach - MCP, HTTP, a database adapter, a browser
 * service, a remote job system - so the contract is about what any of them must be true of, not
 * about what any one of them does.
 *
 * Three obligations, all of them about not lying to the runtime. Report one of the three outcomes
 * and not a fourth. Return data the runtime can persist, replay, and ship between workers, which no
 * provider object or stream can be. And treat the authorized request as read-only: it is the
 * runtime's record of what policy permitted, and an executor that edited it would be describing a
 * dispatch that was never authorized.
 */

import type { AuthorizedCapabilityRequest, CapabilityExecutionEnvironment } from "../../effects/capability.ts";
import { capabilityOutcomeIssues } from "../../effects/outcome.ts";
import type { CapabilityId, EffectId, IdempotencyKey, OperationId, PendingOperationId } from "../../effects/ids.ts";
import type { ExecutionId } from "../../execution/ids.ts";
import type { CapabilityExecutor } from "../../ports/capability-executor.ts";
import type { JsonObject } from "../../util/json.ts";
import type { ContractCase } from "./expect.ts";
import { assertDeepEqual, assertEqual, assertTrue } from "./expect.ts";

export interface CapabilityExecutorSubject {
  readonly executor: CapabilityExecutor;
  /** A capability and operation this implementation is expected to handle. */
  readonly capability: string;
  readonly operation: string;
  readonly input?: JsonObject;
}

const ENVIRONMENT: CapabilityExecutionEnvironment = {
  profile: "trusted-local",
  dispatchedAt: "2026-01-01T00:00:00.000Z",
};

function request(subject: CapabilityExecutorSubject): AuthorizedCapabilityRequest {
  return {
    executionId: "exe_contract" as ExecutionId,
    effectId: "eff_contract" as EffectId,
    pendingOperationId: "pop_contract" as PendingOperationId,
    correlationId: "contract-1",
    causationId: "act_contract",
    capability: subject.capability as CapabilityId,
    operation: subject.operation as OperationId,
    input: subject.input ?? {},
    resources: [],
    deadline: "2026-01-01T00:00:30.000Z",
    idempotencyKey: "effect:eff_contract" as IdempotencyKey,
    authorization: { grantId: "grant_contract", resources: [], consequential: false },
    cancellation: { cancelled: false, reason: null },
  };
}

export function capabilityExecutorContract(factory: () => CapabilityExecutorSubject): readonly ContractCase[] {
  return [
    {
      name: "reports one of success, definite failure, or unknown outcome",
      async run() {
        const subject = factory();
        const outcome = await subject.executor.execute(request(subject), ENVIRONMENT);
        const issues = capabilityOutcomeIssues(outcome);
        assertDeepEqual(issues, [], "the reply is a well-formed capability outcome");
        assertTrue(
          ["success", "failure", "unknown"].includes((outcome as { status: string }).status),
          "there is no fourth outcome; an ambiguous result must not be reported as a definite one",
        );
      },
    },
    {
      name: "returns observations the runtime can persist",
      async run() {
        const subject = factory();
        const outcome = await subject.executor.execute(request(subject), ENVIRONMENT);
        if ((outcome as { status: string }).status !== "success") return;
        const observation = (outcome as { observation: unknown }).observation;
        assertDeepEqual(
          JSON.parse(JSON.stringify(observation ?? null)),
          observation ?? null,
          "an observation survives a JSON round trip, which a provider client or stream would not",
        );
      },
    },
    {
      name: "treats the authorized request as read-only",
      async run() {
        const subject = factory();
        const authorized = request(subject);
        const before = JSON.stringify(authorized);
        await subject.executor.execute(authorized, ENVIRONMENT);
        assertEqual(
          JSON.stringify(authorized),
          before,
          "the request records what policy permitted; an executor that edits it describes a dispatch nobody authorized",
        );
      },
    },
  ];
}
