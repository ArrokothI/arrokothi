/**
 * Seeding committed Structured Memory for conformance tests.
 *
 * Structured Memory is "state the application intentionally asserts" (`docs/memory.md` §3). A test
 * that wants to observe *reads* needs a committed value to read, and how it got there is not the
 * point of that test. This helper commits one through the same RuntimeStore facet and the same pure
 * `commitStructuredMemoryWrite` the Effect processor uses - so the seeded value carries a real
 * revision and real provenance - without routing through a `WriteMemory` Effect.
 *
 * It is deliberately test-only. Applications assert Structured Memory through the `WriteMemory`
 * Effect (from a Workflow Function Stage today); nothing here is a shortcut around that.
 */

import type { ExecutionId } from "../execution/ids.ts";
import type { EffectId } from "../effects/ids.ts";
import { commitStructuredMemoryWrite } from "../execution/structured-memory.ts";
import type { JsonValue } from "../util/json.ts";
import type { InMemoryRuntimeStore } from "../reference/in-memory-runtime-store.ts";

export interface SeedStructuredMemoryWrite {
  readonly key: string;
  readonly value: JsonValue;
}

/**
 * Commits the given field writes into the Execution's bound Structured Memory view, in order,
 * advancing the view revision once per write. Throws when the Execution has no memory binding.
 */
export async function seedStructuredMemory(
  store: InMemoryRuntimeStore,
  executionId: ExecutionId,
  writes: readonly SeedStructuredMemoryWrite[],
): Promise<void> {
  await store.transact(executionId, async (tx) => {
    const context = await tx.executions.get(executionId);
    const ref = context?.slots.memoryView;
    if (!ref) throw new Error(`Execution ${executionId} has no Structured Memory binding to seed`);
    let view = await tx.structuredMemory.get(ref.memoryViewId);
    if (!view) throw new Error(`Structured Memory view ${ref.memoryViewId} does not exist`);
    for (const [index, write] of writes.entries()) {
      const expectedRevision = view.revision;
      view = commitStructuredMemoryWrite(view, {
        key: write.key,
        value: write.value,
        writerExecutionId: executionId,
        effectId: `eff_seed_${index + 1}` as EffectId,
        activationId: null,
        writtenAt: view.updatedAt,
      });
      await tx.structuredMemory.update(view, expectedRevision);
    }
  });
}
