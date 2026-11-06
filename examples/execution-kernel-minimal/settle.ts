import type { ExecutionId } from "@arrokothi/core";
import type { Application } from "@arrokothi/sdk";

/** Only for these finite offline scripts: runs until a host boundary, through the Kernel. */
export async function settleOffline(application: Application, executionId: ExecutionId) {
  const result = await application.runUntilBlocked(executionId);
  if (["timeout", "activation_limit", "aborted"].includes(result.reason)) {
    throw new Error(`Offline example did not settle (${result.reason}): ${JSON.stringify(result.execution)}`);
  }
  return result.execution;
}

/** What the native side answered for each accepted host input, in acceptance order. */
export function ingressStatuses(application: Application, executionId: ExecutionId): string[] {
  return application.inspect(executionId).emissions
    .map((emission) => emission.value as { kind?: string; results?: { kind: string; status: string }[] })
    .filter((value) => value.kind === "arrokothi.bridge.ingress_result")
    .flatMap((value) => value.results ?? [])
    .map((result) => result.status);
}
