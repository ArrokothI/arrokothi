/**
 * Architecture boundaries for Slice E.0 child composition.
 *
 * The stated risk is a child implemented as an in-process call between controllers, or a controller
 * that reaches past the Effect gateway to construct runtime state directly. These walk the real
 * import graph and grep the real sources to prove neither happened:
 *
 *   controllers propose a `SpawnExecution`; they never construct a child, a delegated authority
 *   record, a lineage budget, or a child link
 *   the structural spawn budget is written in exactly two runtime modules and nowhere else
 *   child creation is mediated by the Effect gateway, which the controller boundary cannot reach
 *   the `SpawnExecution` proposal is plain data
 *   no provider, protocol, or storage package entered core with this slice
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { callExecution, spawnExecution } from "@agent-sdk/core/execution";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");
const IMPORT_SPECIFIER = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([^"']+)["']/g;

function specifiersIn(source: string): string[] {
  return [...source.matchAll(IMPORT_SPECIFIER)].map((match) => match[1]!);
}

async function walkGraph(entries: readonly string[]): Promise<{ files: Set<string>; bare: Set<string> }> {
  const files = new Set<string>();
  const bare = new Set<string>();
  const queue = [...entries];
  while (queue.length > 0) {
    const rel = queue.pop()!;
    if (files.has(rel)) continue;
    files.add(rel);
    const absolute = resolve(CORE_SRC, rel);
    const source = await readFile(absolute, "utf8");
    for (const specifier of specifiersIn(source)) {
      if (!specifier.startsWith(".")) {
        bare.add(specifier);
        continue;
      }
      queue.push(relative(CORE_SRC, resolve(dirname(absolute), specifier)));
    }
  }
  return { files, bare };
}

async function coreSourceFiles(): Promise<string[]> {
  return (await readdir(CORE_SRC, { recursive: true })).filter((path) => path.endsWith(".ts"));
}

describe("Slice E.0 composition boundaries", () => {
  test("no controller module constructs a child, a delegated ceiling, a budget, or a link", async () => {
    const files = (await coreSourceFiles()).filter((path) => path.startsWith("controllers/"));
    const forbidden = [
      "createExecutionContext",
      "createDelegatedOperationAuthority",
      "createChildExecutionLink",
      "createLineageSpawnBudget",
      "consumeSpawnCredit",
      "lineageSpawnBudgets",
      "childExecutionLinks",
      "operationAuthorities",
      "attenuateChildOperations",
    ];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const name of forbidden) {
        assert.equal(source.includes(name), false, `${path} mentions ${name}; a controller proposes a spawn, it does not perform one`);
      }
    }
  });

  test("the controller boundary cannot reach the child-creation machinery", async () => {
    const { files } = await walkGraph(["ports/controller.ts"]);
    const forbidden = [
      "ports/runtime-store.ts",
      "runtime/harness.ts",
      "runtime/effect-processor.ts",
      "execution/child-link.ts",
      "execution/structural-budget.ts",
    ];
    assert.deepEqual(
      [...files].filter((path) => forbidden.includes(path)),
      [],
      "a controller is handed nothing that resolves a Definition, attenuates authority, spends a budget, or inserts an Execution",
    );
  });

  test("the lineage structural spawn budget is written in exactly the runtime gateway and the Harness", async () => {
    const writers: string[] = [];
    for (const path of await coreSourceFiles()) {
      if (path.startsWith("reference/") || path.startsWith("testing/")) continue;
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (/lineageSpawnBudgets\.(insert|update)\b/.test(source)) writers.push(path);
    }
    assert.deepEqual(
      writers.sort(),
      ["runtime/effect-processor.ts", "runtime/harness.ts"],
      "capacity is fixed by the Harness at the root; only the gateway spends a credit; a Definition can reach neither",
    );
  });

  test("child Execution records are inserted only by the Harness and the Effect gateway", async () => {
    const inserters: string[] = [];
    for (const path of await coreSourceFiles()) {
      if (path.startsWith("reference/") || path.startsWith("testing/")) continue;
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (/\.executions\.insert\(/.test(source)) inserters.push(path);
    }
    assert.deepEqual(
      inserters.sort(),
      ["runtime/effect-processor.ts", "runtime/harness.ts"],
      "an Execution is created in one of two mediated places, never by a controller or an executor",
    );
  });

  test("the child-composition modules import no package and no builtin", async () => {
    const { bare } = await walkGraph([
      "execution/child-link.ts",
      "execution/structural-budget.ts",
      "runtime/effect-processor.ts",
    ]);
    assert.deepEqual([...bare].sort(), [], `child composition pulled in ${[...bare].join(", ")}`);
  });

  test("no MCP, provider, or storage package name appears in the child-composition sources", async () => {
    const { files } = await walkGraph([
      "execution/child-link.ts",
      "execution/structural-budget.ts",
      "runtime/effect-processor.ts",
      "runtime/harness.ts",
    ]);
    const forbidden = ["@modelcontextprotocol", "@agent-sdk/integration-mcp", "@agent-sdk/provider-gemini", "@agent-sdk/storage-sqlite", "mcp", "Mcp", "MCP", "A2A"];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const name of forbidden) {
        assert.equal(source.includes(name), false, `${path} mentions ${name}`);
      }
    }
  });

  test("the SpawnExecution proposal is plain data", () => {
    for (const proposal of [
      spawnExecution({ definitionId: "child", definitionVersion: 1, requestedOperations: [{ capability: "a", operation: "b" }], input: { x: 1 } }),
      callExecution({ definitionId: "child", definitionVersion: 1 }),
    ]) {
      assert.equal(JSON.stringify(proposal), JSON.stringify(JSON.parse(JSON.stringify(proposal))), "round-trips JSON");
      for (const value of Object.values(proposal)) {
        assert.notEqual(typeof value, "function", "no field is a function");
      }
    }
  });

  test("an Agent/Workflow Stage proposes a child call - it never creates the child or routes its result", async () => {
    const source = await readFile(resolve(CORE_SRC, "controllers/workflow/controller.ts"), "utf8");
    // Slice E.2: the Stage is implemented by a child `call` the controller *proposes*.
    assert.ok(source.includes("callExecution"), "an Agent/Workflow Stage proposes a child call");
    assert.equal(source.includes("stage_kind_unsupported"), false, "no longer a gap");
    // But it still may not perform the spawn itself or touch child-result machinery.
    for (const forbidden of ["createExecutionContext", "createChildExecutionLink", "settleOwnerOnChildTerminal", "routeEvent", ".executions.insert("]) {
      assert.equal(source.includes(forbidden), false, `the controller must not ${forbidden}`);
    }
  });

  test("the Workflow controller's import graph still cannot reach the child-creation machinery", async () => {
    const { files } = await walkGraph(["controllers/workflow/controller.ts"]);
    const forbidden = ["ports/runtime-store.ts", "runtime/harness.ts", "runtime/effect-processor.ts", "execution/child-link.ts", "execution/structural-budget.ts"];
    assert.deepEqual([...files].filter((path) => forbidden.includes(path)), [], "it proposes a spawn; it does not perform one");
  });
});

describe("Slice E.1 interleaving / peer / cancellation boundaries", () => {
  test("the Effect vocabulary gained no sixth kind for messaging or cancellation", async () => {
    const source = await readFile(resolve(CORE_SRC, "effects/types.ts"), "utf8");
    const declared = source.slice(source.indexOf("export type EffectKind"));
    const kinds = [...declared.slice(0, declared.indexOf(";")).matchAll(/"([a-z_]+)"/g)].map((m) => m[1]!);
    assert.deepEqual(
      [...kinds].sort(),
      ["request_user_input", "send_message", "spawn_execution", "use_capability", "write_memory"],
      "send/ask/reply are all SendMessage; cancellation is not an Effect at all",
    );
  });

  test("no controller module reaches messaging, peer-link, or cancellation runtime machinery", async () => {
    const files = (await coreSourceFiles()).filter((path) => path.startsWith("controllers/"));
    const forbidden = [
      "createPeerRequestLink",
      "markPeerRequestLinkSettled",
      "peerRequestLinks",
      "createCancellationRequest",
      "cancellationRequests",
      "cancelExecution",
      "invalidateControllerResumption",
      "routeEvent",
      "settleOwnerOnChildTerminal",
    ];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const name of forbidden) {
        assert.equal(source.includes(name), false, `${path} mentions ${name}; a controller proposes, it does not route or cancel`);
      }
    }
  });

  test("the controller boundary cannot reach the message gateway or the cancellation entry point", async () => {
    const { files } = await walkGraph(["ports/controller.ts"]);
    const forbidden = [
      "execution/peer-request-link.ts",
      "execution/cancellation-request.ts",
      "execution/wait-for.ts",
      "runtime/effect-processor.ts",
      "runtime/harness.ts",
    ];
    assert.deepEqual([...files].filter((path) => forbidden.includes(path)), []);
  });

  test("SendMessage is dispatched only from the Effect gateway; peer.message is routed only through routeEvent", async () => {
    const dispatchers: string[] = [];
    const routers: string[] = [];
    for (const path of await coreSourceFiles()) {
      if (path.startsWith("reference/") || path.startsWith("testing/")) continue;
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      if (/dispatchSendMessage\s*\(/.test(source)) dispatchers.push(path);
      if (/kind:\s*"peer\.message"/.test(source)) routers.push(path);
    }
    assert.deepEqual(dispatchers.sort(), ["runtime/effect-processor.ts"], "one mediated place a peer message is admitted");
    assert.deepEqual(routers.sort(), ["runtime/effect-processor.ts"], "and it is minted only there, always via routeEvent");
  });

  test("the peer message source identity is runtime-owned, never a controller field", async () => {
    const events = await readFile(resolve(CORE_SRC, "interaction/events.ts"), "utf8");
    assert.match(events, /fromExecutionId[\s\S]{0,200}runtime-owned/, "PeerMessageBody documents fromExecutionId as runtime-owned");
    const gateway = await readFile(resolve(CORE_SRC, "runtime/effect-processor.ts"), "utf8");
    assert.match(gateway, /fromExecutionId:\s*\n?\s*\/\/ Runtime-owned|fromExecutionId: senderId/, "the gateway sets it from the sending Execution's id");
  });

  test("ControllerResumption invalidation is runtime state, and never becomes an Event", async () => {
    const events = await readFile(resolve(CORE_SRC, "interaction/events.ts"), "utf8");
    assert.equal(events.includes("controller_resumption.invalidated"), false, "no Event kind for invalidation");
    const { bare } = await walkGraph(["execution/resumption.ts"]);
    assert.deepEqual([...bare].sort(), [], "the resumption record still imports nothing");
    const resumption = await readFile(resolve(CORE_SRC, "execution/resumption.ts"), "utf8");
    // `invalidatedByEventId` names an Event for provenance, but the record carries no Event
    // machinery: no envelope import, no mailbox facet, no routing.
    for (const specifier of specifiersIn(resumption)) {
      assert.equal(
        /event-envelope|events\.ts|runtime-store|event-router/.test(specifier),
        false,
        `resumption.ts must not import ${specifier}`,
      );
    }
  });
});
