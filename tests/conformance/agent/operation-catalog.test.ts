/**
 * One operation ontology, enriched rather than duplicated.
 *
 * Model-facing projections need descriptions and schemas. A second
 * descriptor type - an "AgentTool", a protocol tool, a provider tool spec treated as truth - and
 * taking it would have given one operation two identities, two descriptions, and eventually two
 * consequentiality baselines that could disagree.
 *
 * So the catalog stays the single source, and these cases check the consequences: identity is still
 * `(capability, operation)`, descriptive metadata comes from the same descriptor the gateway
 * classifies from, an earlier consequentiality behaviour is untouched, and no parallel registry
 * exists for anything to drift into.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CapabilityId, OperationId } from "@arrokothi/core/execution";
import { createCapabilityCatalog } from "@arrokothi/core/reference";
import { SEARCH_INPUT, testCatalog } from "./fixtures.ts";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const CORE_SRC = resolve(REPO_ROOT, "packages/core/src");

describe("capability-operation descriptors stay the one operation ontology", () => {
  test("identity remains capability plus operation", () => {
    const catalog = testCatalog();
    const descriptor = catalog.describe("docs" as CapabilityId, "search" as OperationId);
    assert.ok(descriptor);
    assert.equal(descriptor!.capability, "docs");
    assert.equal(descriptor!.operation, "search");
    assert.equal(catalog.describe("docs" as CapabilityId, "unknown" as OperationId), undefined);
    assert.equal(catalog.describe("unknown" as CapabilityId, "search" as OperationId), undefined);
  });

  test("descriptive and schema metadata share the descriptor the gateway classifies", () => {
    const catalog = testCatalog();
    const descriptor = catalog.describe("docs" as CapabilityId, "search" as OperationId)!;
    assert.equal(descriptor.title, "Search documents");
    assert.match(descriptor.description!, /project corpus/);
    assert.deepEqual(descriptor.input, SEARCH_INPUT);
    assert.deepEqual(descriptor.groups, ["research"]);
    // The same object carries the dispatch-time baseline, so exposure and authorization cannot
    // disagree about what an operation is.
    assert.equal(descriptor.consequential, false);
    assert.equal(catalog.describe("mail" as CapabilityId, "send" as OperationId)!.consequential, true);
  });

  test("consequentiality classification is unchanged, including its conservative gaps", () => {
    // A catalog that classifies only consequentiality is still a valid catalog: the descriptive
    // fields are additive, so nothing that worked before this field was added needs rewriting.
    const minimal = createCapabilityCatalog([{ capability: "weather", operation: "get", consequential: false }]);
    const descriptor = minimal.describe("weather" as CapabilityId, "get" as OperationId)!;
    assert.equal(descriptor.consequential, false);
    assert.equal(descriptor.description, undefined);
    assert.equal(descriptor.input, undefined);
    // And an unclassified operation is still not classified, which the gateway reads as
    // consequential rather than as safe.
    assert.equal(minimal.describe("payment" as CapabilityId, "charge" as OperationId), undefined);
  });

  test("enumeration is deterministic and says nothing about permission", () => {
    const forward = createCapabilityCatalog([
      { capability: "b", operation: "x", consequential: false },
      { capability: "a", operation: "y", consequential: true },
    ]);
    const reverse = createCapabilityCatalog([
      { capability: "a", operation: "y", consequential: true },
      { capability: "b", operation: "x", consequential: false },
    ]);
    assert.deepEqual(
      forward.list().map((entry) => `${entry.capability}:${entry.operation}`),
      ["a:y", "b:x"],
      "enumeration is ordered by identity, not by declaration order",
    );
    assert.deepEqual(forward.list(), reverse.list(), "two catalogs configured with the same descriptors enumerate identically");
  });

  test("no Agent-specific second operation ontology was introduced", async () => {
    // Declarations, not prose: `ports/capability-catalog.ts` names the ontologies it refuses to
    // become, so the check has to look for something being *declared*, not merely mentioned. The
    // scan covers the Agent, operation, port, reference, and model surfaces.
    const owned = ["agent/", "operations/", "controllers/agent/", "ports/", "reference/", "model/"];
    const files = (await readdir(CORE_SRC, { recursive: true }))
      .filter((path) => path.endsWith(".ts"))
      .filter((path) => owned.some((prefix) => path.startsWith(prefix)));

    const violations: string[] = [];
    for (const path of files) {
      const source = await readFile(resolve(CORE_SRC, path), "utf8");
      for (const forbidden of [
        "AgentToolDescriptor",
        "AgentTool",
        "McpToolDescriptor",
        "McpTool",
        "ToolDescriptor",
        "OperationRegistry",
        "ToolRegistry",
      ]) {
        if (new RegExp(`(?:interface|type|class|const)\\s+${forbidden}\\b`).test(source)) {
          violations.push(`${path} declares ${forbidden}`);
        }
      }
      // One descriptive descriptor type, in the module that already owned operation identity.
      if (path !== "ports/capability-catalog.ts" && /interface\s+CapabilityOperationDescriptor\b/.test(source)) {
        violations.push(`${path} redeclares CapabilityOperationDescriptor`);
      }
    }
    assert.deepEqual(violations, []);
  });
});
