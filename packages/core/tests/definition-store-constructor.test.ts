import assert from "node:assert/strict";
import { test } from "node:test";
import { defineWorkflow, definitionRef } from "@arrokothi/core";
import { InMemoryDefinitionStore } from "@arrokothi/core/reference";

const definition = () => defineWorkflow({ id: "seed", spec: { entryStage: "done", stages: [
  { id: "done", kind: "function", implementationRef: "done", transitions: { kind: "always", next: { to: "complete" } } },
] } });

test("DefinitionStore constructor throws synchronously for invalid or duplicate seeds", () => {
  const d = definition();
  assert.throws(() => new InMemoryDefinitionStore([d, d]), /already|version|immutable/i);
  assert.throws(() => new InMemoryDefinitionStore([{ ...d, version: 0 }]), /version/);
});

test("DefinitionStore constructor seeds cloned valid definitions; save still rejects asynchronously", async () => {
  const d = definition();
  const ref = definitionRef(d);
  const store = new InMemoryDefinitionStore([d]);
  assert.deepEqual(await store.get(ref), d);
  await assert.rejects(store.save(d), /already|version|immutable/i);
});
