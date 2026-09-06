/**
 * The local retrieval surface.
 *
 * Both halves of the retrieval rule are implemented here, and they are deliberately different
 * objects rather than one object with a flag:
 *
 *   `createLocalCorpusResource` / `createLocalRecordsResource`
 *     already-materialized read-only data a Stage may compute over directly
 *
 *   `createLocalRetrievalExecutor`
 *     the mediated path, reached only through an authorized UseCapability Effect
 *
 * These tests exercise the implementations directly, without a Harness, because a retrieval backend
 * should be testable as a backend.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import type { AuthorizedCapabilityRequest, CapabilityExecutionEnvironment } from "@arrokothi/core/ports";
import { capabilityExecutorContract } from "@arrokothi/core/testing";
import {
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_CHUNK_SIZE,
  LOCAL_RETRIEVAL_CAPABILITY,
  LOCAL_RETRIEVAL_OPERATIONS,
  LexicalIndex,
  createLocalCorpusResource,
  createLocalRecordsResource,
  createLocalRetrievalExecutor,
  queryRecords,
  splitSource,
  tokenize,
} from "../src/index.ts";

const PET_POLICY = {
  id: "pet-policies",
  title: "Pet policies",
  text: "Harbor View allows two cats or one dog under 40 pounds. Cedar Court does not allow pets of any kind.",
};

const LISTINGS = {
  id: "listings",
  fields: {
    id: { kind: "string" as const },
    title: { kind: "string" as const },
    price: { kind: "number" as const },
    location: { kind: "string" as const },
  },
  records: [
    { id: "p1", title: "The Azure Vista", price: 12_500_000, location: "Malibu" },
    { id: "p2", title: "Skyline Penthouse", price: 18_900_000, location: "Upper West Side" },
    { id: "p3", title: "The TriBeCa Loft", price: 7_250_000, location: "TriBeCa" },
  ],
};

const ENVIRONMENT: CapabilityExecutionEnvironment = { profile: "trusted-local", dispatchedAt: "2026-01-01T00:00:00.000Z" };

function authorizedRequest(overrides: Partial<AuthorizedCapabilityRequest> = {}): AuthorizedCapabilityRequest {
  return {
    executionId: "exe_1" as AuthorizedCapabilityRequest["executionId"],
    effectId: "eff_1" as AuthorizedCapabilityRequest["effectId"],
    pendingOperationId: "pop_1" as AuthorizedCapabilityRequest["pendingOperationId"],
    correlationId: "wf/lookup#1/retrieval",
    causationId: "act_1",
    capability: LOCAL_RETRIEVAL_CAPABILITY as AuthorizedCapabilityRequest["capability"],
    operation: LOCAL_RETRIEVAL_OPERATIONS.search as AuthorizedCapabilityRequest["operation"],
    input: { query: "dog weight limit" },
    resources: [],
    deadline: "2026-01-01T00:00:30.000Z",
    idempotencyKey: "effect:eff_1" as AuthorizedCapabilityRequest["idempotencyKey"],
    authorization: {
      grantId: "grant_1",
      resources: [{ bindingId: "pet-policies" as AuthorizedCapabilityRequest["resources"][number]["bindingId"], mode: "read" }],
      consequential: false,
    },
    cancellation: { cancelled: false, reason: null },
    ...overrides,
  } as AuthorizedCapabilityRequest;
}

describe("lexical retrieval", () => {
  test("tokenizing drops stopwords and short tokens", () => {
    assert.deepEqual(tokenize("The dog is on a leash"), ["dog", "leash"]);
  });

  test("a small document stays one chunk under the default splitter settings", async () => {
    assert.equal(DEFAULT_CHUNK_SIZE, 1000);
    assert.equal(DEFAULT_CHUNK_OVERLAP, 200);
    const chunks = await splitSource(PET_POLICY);
    assert.equal(chunks.length, 1);
    assert.equal(chunks[0]?.chunkId, "pet-policies#0");
  });

  test("a long document splits with overlap when the source configures it", async () => {
    const chunks = await splitSource({
      id: "manual",
      title: "Manual",
      text: Array.from({ length: 40 }, (_, index) => `Paragraph ${index} about building maintenance schedules.`).join("\n\n"),
      chunking: { chunkSize: 200, chunkOverlap: 50 },
    });
    assert.ok(chunks.length > 1, "a long document produces several chunks");
    assert.deepEqual(chunks.map((chunk) => chunk.chunkId).slice(0, 2), ["manual#0", "manual#1"]);
  });

  test("search ranks by IDF-weighted overlap and ignores queries with no signal", async () => {
    const index = new LexicalIndex({
      id: "policies",
      title: "Policies",
      text: "Harbor View allows one dog under 40 pounds.\n\nCedar Court does not allow pets.\n\nParking is assigned per unit.",
      chunking: { chunkSize: 60, chunkOverlap: 0 },
    });
    const hits = await index.search("dog pounds", 5);
    assert.ok(hits.length >= 1);
    assert.match(hits[0]!.text, /dog under 40 pounds/);
    assert.equal(hits[0]!.rank, 1);
    assert.ok(hits[0]!.score > 0);

    assert.deepEqual(await index.search("the a of", 5), [], "a query of pure stopwords retrieves nothing");
  });
});

describe("materialized local resources", () => {
  test("a corpus resource answers a read with ranked chunks and no side effects", async () => {
    const corpus = createLocalCorpusResource(PET_POLICY);
    assert.equal(corpus.kind, "corpus");
    const result = (await corpus.read({ query: "dog weight limit", topK: 1 })) as { chunks: { text: string }[] };
    assert.equal(result.chunks.length, 1);
    assert.match(result.chunks[0]!.text, /dog under 40 pounds/);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), result, "a read answers with plain data");
  });

  test("a records resource runs the deterministic evaluator", async () => {
    const records = createLocalRecordsResource(LISTINGS);
    const result = (await records.read({ filters: [{ field: "price", op: "lte", value: 13_000_000 }], sort: [{ field: "price", direction: "asc" }] })) as {
      matches: { id: string }[];
      totalMatched: number;
      totalRecords: number;
    };
    assert.deepEqual(result.matches.map((match) => match.id), ["p3", "p1"]);
    assert.equal(result.totalMatched, 2);
    assert.equal(result.totalRecords, 3);
  });

  test("an unknown field is an error, never a misleading empty result", async () => {
    const records = createLocalRecordsResource(LISTINGS);
    await assert.rejects(
      async () => records.read({ filters: [{ field: "has_pool", op: "eq", value: true }] }),
      /unknown_field/,
    );
    const direct = queryRecords(LISTINGS, { filters: [{ field: "has_pool", op: "eq", value: true }] });
    assert.equal(direct.ok, false);
    assert.equal(direct.ok === false ? direct.error.code : null, "unknown_field");
  });
});

describe("local retrieval capability executor", () => {
  test("searching a bound corpus succeeds and reports its source", async () => {
    const executor = createLocalRetrievalExecutor({ documents: [PET_POLICY] });
    const outcome = await executor.execute(authorizedRequest(), ENVIRONMENT);
    assert.equal(outcome.status, "success");
    const observation = outcome.status === "success" ? (outcome.observation as { sourceId: string; chunks: { text: string }[] }) : null;
    assert.equal(observation?.sourceId, "pet-policies");
    assert.match(observation!.chunks[0]!.text, /dog under 40 pounds/);
  });

  test("querying a bound record set runs the deterministic evaluator", async () => {
    const executor = createLocalRetrievalExecutor({ recordSets: [LISTINGS] });
    const outcome = await executor.execute(
      authorizedRequest({
        operation: LOCAL_RETRIEVAL_OPERATIONS.queryRecords as AuthorizedCapabilityRequest["operation"],
        input: { filters: [{ field: "location", op: "eq", value: "tribeca" }] },
        authorization: {
          grantId: "grant_1",
          resources: [{ bindingId: "listings" as AuthorizedCapabilityRequest["resources"][number]["bindingId"], mode: "read" }],
          consequential: false,
        },
      }),
      ENVIRONMENT,
    );
    assert.equal(outcome.status, "success");
    const observation = outcome.status === "success" ? (outcome.observation as { matches: { id: string }[] }) : null;
    assert.deepEqual(observation?.matches.map((match) => match.id), ["p3"], "string matching is case-insensitive");
  });

  test("a request naming no bound resource is refused rather than guessed at", async () => {
    const executor = createLocalRetrievalExecutor({ documents: [PET_POLICY] });
    const outcome = await executor.execute(
      authorizedRequest({ authorization: { grantId: "grant_1", resources: [], consequential: false } }),
      ENVIRONMENT,
    );
    assert.equal(outcome.status, "failure");
    assert.equal(outcome.status === "failure" ? outcome.error.code : null, "resource_binding_required");
  });

  test("a binding the executor does not hold is an honest failure, not an empty result", async () => {
    const executor = createLocalRetrievalExecutor({ documents: [PET_POLICY] });
    const outcome = await executor.execute(
      authorizedRequest({
        authorization: {
          grantId: "grant_1",
          resources: [{ bindingId: "salary-bands" as AuthorizedCapabilityRequest["resources"][number]["bindingId"], mode: "read" }],
          consequential: false,
        },
      }),
      ENVIRONMENT,
    );
    assert.equal(outcome.status, "failure");
    assert.equal(outcome.status === "failure" ? outcome.error.code : null, "unknown_resource");
  });

  test("an operation this backend does not implement is refused", async () => {
    const executor = createLocalRetrievalExecutor({ documents: [PET_POLICY] });
    const outcome = await executor.execute(
      authorizedRequest({ operation: "embed" as AuthorizedCapabilityRequest["operation"] }),
      ENVIRONMENT,
    );
    assert.equal(outcome.status, "failure");
    assert.equal(outcome.status === "failure" ? outcome.error.code : null, "unknown_operation");
  });
});

describe("CapabilityExecutor contract: local retrieval", () => {
  for (const contractCase of capabilityExecutorContract(() => ({
    executor: {
      execute(request, environment) {
        // The published contract builds a request with no resource bindings; local retrieval acts
        // on exactly one, so the subject supplies the binding this backend is registered for.
        return createLocalRetrievalExecutor({ documents: [PET_POLICY] }).execute(
          {
            ...request,
            authorization: {
              ...request.authorization,
              resources: [{ bindingId: "pet-policies" as AuthorizedCapabilityRequest["resources"][number]["bindingId"], mode: "read" }],
            },
          },
          environment,
        );
      },
    },
    capability: LOCAL_RETRIEVAL_CAPABILITY,
    operation: LOCAL_RETRIEVAL_OPERATIONS.search,
    input: { query: "dog weight limit" },
  }))) {
    test(contractCase.name, contractCase.run);
  }
});
