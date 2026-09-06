/**
 * Two retrieval paths, and why they are different.
 *
 * ```text
 * already materialized read-only corpus
 *     -> Stage-local computation
 *     -> no Effect
 *
 * live/external resource
 *     -> UseCapability Effect
 *     -> Harness authorization
 *     -> CapabilityExecutor
 *     -> capability.completed Event
 *     -> Stage barrier collection
 * ```
 *
 * The first is not a loophole. A Stage may compute freely over what has been *deliberately exposed*
 * to it, and manufacturing an Effect for each query over data the Stage is already holding would be
 * theatre. Expanding the environment is the act that crosses the Harness.
 *
 * So the boundary that matters is exposure, and it is observable: a corpus the Stage's definition
 * did not declare is unreachable, not merely unmentioned. These cases prove that by asking for one.
 *
 * Both paths run against `@arrokothi/retrieval-local`, which is where the local retrieval
 * implementation and its LangChain dependency now live. Core owns the contracts; this package
 * implements them.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { defineWorkflow, readWorkflowControlState } from "@arrokothi/core/execution";
import type { FunctionStageOutcome, StageExecutionContext } from "@arrokothi/core/ports";
import { UnexposedLocalResourceError } from "@arrokothi/core/ports";
import {
  createAllowListAuthorizer,
  createDeferredCapabilityExecutor,
  createFunctionStageRegistry,
  createLocalResourceEnvironment,
} from "@arrokothi/core/reference";
import { createWorkflowTestHarness } from "@arrokothi/core/testing";
import {
  LOCAL_RETRIEVAL_CAPABILITY,
  LOCAL_RETRIEVAL_OPERATIONS,
  createLocalCorpusResource,
  createLocalRetrievalExecutor,
} from "@arrokothi/retrieval-local";

/**
 * What this Execution is permitted to use at all.
 *
 * The runtime-owned ceiling, supplied when the Execution is created. It is checked again at dispatch
 * from current state, so an Execution created without one can reach no capability implementation
 * whatever a controller proposes and whatever policy would have said.
 */
const AUTHORITY = {
  operations: [{ capability: LOCAL_RETRIEVAL_CAPABILITY, operation: LOCAL_RETRIEVAL_OPERATIONS.search }],
};

const PET_POLICY = {
  id: "pet-policies",
  title: "Pet policies",
  text: "Harbor View allows two cats or one dog under 40 pounds. Cedar Court does not allow pets of any kind.",
};

const SALARY_BANDS = {
  id: "salary-bands",
  title: "Confidential salary bands",
  text: "Band 7 compensation ranges from 210000 to 260000 with an annual review in March.",
};

/** Reads an exposed corpus directly. No Effect: the data is already inside the Stage environment. */
async function localSearch(context: StageExecutionContext): Promise<FunctionStageOutcome> {
  const corpus = context.resources.open(String(context.config["corpus"]));
  const result = (await corpus.read({ query: String(context.config["query"]), topK: 1 })) as {
    chunks: { text: string }[];
  };
  return { status: "completed", result: result.chunks[0]?.text ?? null };
}

/** Reaches for a corpus this Stage's definition did not expose. */
async function reachForUnexposed(context: StageExecutionContext): Promise<FunctionStageOutcome> {
  try {
    context.resources.open(String(context.config["corpus"]));
    return { status: "completed", result: "reached an unexposed resource" };
  } catch (error) {
    return {
      status: "completed",
      result: error instanceof UnexposedLocalResourceError ? `denied:${error.resourceId}` : `unexpected:${String(error)}`,
    };
  }
}

/** Requires live retrieval through the Effect gateway; it cannot call the retriever directly. */
function liveSearch(context: StageExecutionContext): FunctionStageOutcome {
  if (context.progress["requested"] !== true) {
    return {
      status: "awaitEffects",
      progress: { requested: true },
      effects: [
        {
          key: "retrieval",
          capability: LOCAL_RETRIEVAL_CAPABILITY,
          operation: LOCAL_RETRIEVAL_OPERATIONS.search,
          input: { query: String(context.config["query"]), topK: 1 },
          resources: [String(context.config["corpus"])],
        },
      ],
    };
  }
  const observation = context.observations[0];
  if (!observation || observation.outcome !== "completed") {
    return { status: "completed", result: `retrieval ${observation?.outcome ?? "missing"}` };
  }
  const payload = observation.observation as { chunks: { text: string }[] };
  return { status: "completed", result: payload.chunks[0]?.text ?? null };
}

const functions = createFunctionStageRegistry({ localSearch, reachForUnexposed, liveSearch });

const resources = () =>
  createLocalResourceEnvironment([
    createLocalCorpusResource(PET_POLICY),
    createLocalCorpusResource(SALARY_BANDS),
  ]);

describe("local and live retrieval", () => {
  test("retrieval over an exposed local corpus is Stage computation and produces no Effect", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions, resources: resources() });
    const ref = await definitions.save(
      defineWorkflow({
        id: "local-rag",
        spec: {
          entryStage: "lookup",
          stages: [
            {
              id: "lookup",
              kind: "function",
              implementationRef: "localSearch",
              config: { corpus: "pet-policies", query: "dog weight limit" },
              resourceViews: ["pet-policies"],
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.match(readWorkflowControlState(context!.control.progress)!.provisionalResult!, /dog under 40 pounds/);
    assert.deepEqual(await harness.effectJournalOf(handle.executionId), [], "no Effect: the corpus was already exposed");
    assert.deepEqual(await harness.pendingOperationsOf(handle.executionId), []);
  });

  test("a local corpus the Stage did not expose is unreachable, not merely unmentioned", async () => {
    const { harness, definitions } = createWorkflowTestHarness({ functions, resources: resources() });
    const ref = await definitions.save(
      defineWorkflow({
        id: "unexposed",
        spec: {
          entryStage: "peek",
          stages: [
            {
              id: "peek",
              kind: "function",
              // The environment holds this corpus; this Stage was not authored to see it.
              config: { corpus: "salary-bands" },
              implementationRef: "reachForUnexposed",
              resourceViews: ["pet-policies"],
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.equal(
      readWorkflowControlState(context!.control.progress)!.provisionalResult,
      "denied:salary-bands",
      "the denial is observable to Stage code, which is what makes the exposure boundary testable",
    );
  });

  test("live retrieval crosses the Effect gateway and reaches the Stage only as an Event", async () => {
    const executor = createLocalRetrievalExecutor({ documents: [PET_POLICY, SALARY_BANDS] });
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      // No local resource environment at all: this Stage holds nothing it could read.
      authorizer: createAllowListAuthorizer({
        grants: [
          {
            capability: LOCAL_RETRIEVAL_CAPABILITY,
            operations: [LOCAL_RETRIEVAL_OPERATIONS.search],
            resources: [{ bindingId: "pet-policies", mode: "read" }],
          },
        ],
      }),
      capabilities: executor,
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "live-rag",
        spec: {
          entryStage: "lookup",
          stages: [
            {
              id: "lookup",
              kind: "function",
              implementationRef: "liveSearch",
              config: { corpus: "pet-policies", query: "dog weight limit" },
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.match(readWorkflowControlState(context!.control.progress)!.provisionalResult!, /dog under 40 pounds/);

    // The truth crossed the boundary: authorized, dispatched, and observed as an Event.
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "authorized", "dispatch_started", "completed"]);
    const pending = await harness.pendingOperationsOf(handle.executionId);
    assert.equal(pending.length, 1);
    assert.equal(pending[0]?.correlationId, "wf/lookup#1/retrieval");
  });

  test("a live retrieval the policy does not permit is denied, and the Stage sees the denial", async () => {
    const executor = createLocalRetrievalExecutor({ documents: [SALARY_BANDS] });
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: createAllowListAuthorizer({
        grants: [
          {
            capability: LOCAL_RETRIEVAL_CAPABILITY,
            operations: [LOCAL_RETRIEVAL_OPERATIONS.search],
            resources: [{ bindingId: "pet-policies", mode: "read" }],
          },
        ],
      }),
      capabilities: executor,
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "denied-rag",
        spec: {
          entryStage: "lookup",
          stages: [
            {
              id: "lookup",
              kind: "function",
              implementationRef: "liveSearch",
              config: { corpus: "salary-bands", query: "band 7" },
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(readWorkflowControlState(context!.control.progress)!.provisionalResult, "retrieval denied");
    const journal = await harness.effectJournalOf(handle.executionId);
    assert.deepEqual(journal.map((entry) => entry.phase), ["requested", "denied"], "nothing was dispatched");
  });

  test("live retrieval settles the same way whether it is fast or slow", async () => {
    const deferred = createDeferredCapabilityExecutor();
    const { harness, definitions } = createWorkflowTestHarness({
      functions,
      authorizer: createAllowListAuthorizer({
        grants: [
          {
            capability: LOCAL_RETRIEVAL_CAPABILITY,
            operations: [LOCAL_RETRIEVAL_OPERATIONS.search],
            resources: [{ bindingId: "pet-policies", mode: "read" }],
          },
        ],
      }),
      capabilities: deferred,
    });
    const ref = await definitions.save(
      defineWorkflow({
        id: "slow-rag",
        spec: {
          entryStage: "lookup",
          stages: [
            {
              id: "lookup",
              kind: "function",
              implementationRef: "liveSearch",
              config: { corpus: "pet-policies", query: "dog weight limit" },
              transitions: { kind: "always", next: { to: "complete" } },
            },
          ],
        },
      }),
    );
    const handle = await harness.createExecution({ definition: ref, operationAuthority: AUTHORITY });
    await harness.runUntilIdle();
    assert.equal((await harness.inspect(handle.executionId))?.lifecycle, "WAITING");

    deferred.completeAll({ chunks: [{ text: "Harbor View allows one dog under 40 pounds." }] });
    await harness.drainEffects();
    await harness.runUntilIdle();

    const context = await harness.inspect(handle.executionId);
    assert.equal(context?.lifecycle, "COMPLETED");
    assert.match(readWorkflowControlState(context!.control.progress)!.provisionalResult!, /dog under 40 pounds/);
  });
});
