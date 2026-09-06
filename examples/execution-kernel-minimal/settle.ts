import type { Harness, ExecutionId } from "@arrokothi/core/execution";

/** Only for these finite offline scripts. Drains can wait indefinitely on real network work. */
export async function settleOffline(harness: Harness, executionId: ExecutionId) {
  for (let round = 0; round < 32; round++) {
    await harness.runUntilIdle();
    await harness.drainResumptions();
    await harness.drainEffects();
    // A settled resumption/effect may just have scheduled the next Activation.
    await harness.runUntilIdle();
    const context = await harness.inspect(executionId);
    if (!context) throw new Error(`Unknown Execution ${executionId}`);
    if (["COMPLETED", "FAILED", "CANCELLED"].includes(context.lifecycle)) return context;
    if ((await harness.pendingConfirmations()).some((request) => request.executionId === executionId)) return context;
    if (context.lifecycle === "WAITING" && context.waitingFor?.kind === "event" && context.waitingFor.wake.eventKinds.includes("external.input")) return context;
  }
  throw new Error(`Offline example did not settle: ${JSON.stringify(await harness.inspect(executionId))}`);
}
