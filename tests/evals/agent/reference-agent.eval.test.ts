/**
 * Ten deterministic behavioural cases for the reference Agent.
 *
 * The first feedback loop of the second kind. Conformance says the runtime is honest; these say
 * whether an Agent configuration actually gets the task done, and every one of them is graded on the
 * world the Agent left behind rather than on what it said about it.
 *
 * ```text
 * correct operation selected            correct semantic arguments
 * operation unnecessary -> no call      operation succeeds
 * operation fails -> reported           authority denial -> reported
 * unknown outcome -> not claimed done   wrong operation not selected
 * bounded-model-call exhaustion         world disagrees with the claim
 * ```
 *
 * Deliberately small and deliberately cheap: scripted models, in-memory worlds, one trial each.
 * That is a baseline, not a benchmark - what it establishes is the trial abstraction, the metrics,
 * and the habit of grading outcomes. A stochastic provider and repeated trials drop into `runTrials`
 * without reshaping anything here.
 */

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { JsonObject, ObjectSchema } from "@agent-sdk/core/execution";
import type { EvalWorld, TrialSpec } from "./harness.ts";
import { answers, callsOperation, measure, runTrial, runTrials, selectedTargets } from "./harness.ts";

const RECIPIENT: ObjectSchema = {
  kind: "object",
  fields: {
    to: { required: true, schema: { kind: "string" } },
    body: { required: true, schema: { kind: "string" } },
  },
};

const QUERY: ObjectSchema = {
  kind: "object",
  fields: { query: { required: true, schema: { kind: "string" } } },
};

const MAIL_SEND = { capability: "mail", operation: "send" } as const;
const DOCS_SEARCH = { capability: "docs", operation: "search" } as const;
const LEDGER_POST = { capability: "ledger", operation: "post" } as const;

/**
 * A world with an outbox and a small corpus.
 *
 * `behaviour` decides what `mail.send` does, which is how the failure and unknown-outcome cases are
 * expressed without a second world.
 */
function office(behaviour: "succeeds" | "fails" | "unknown" = "succeeds"): EvalWorld {
  const outbox: { to: string; body: string }[] = [];
  return {
    operations: [
      {
        capability: "docs",
        operation: "search",
        consequential: false,
        title: "Search documents",
        description: "Search the project corpus and return matching passages.",
        input: QUERY,
        handle: (input) => ({
          status: "success",
          observation: {
            hits: String(input["query"]).includes("pet")
              ? ["Harbor View allows dogs under 12kg."]
              : [],
          },
        }),
      },
      {
        capability: "mail",
        operation: "send",
        consequential: true,
        title: "Send mail",
        description: "Send an email to one recipient.",
        input: RECIPIENT,
        handle: (input) => {
          if (behaviour === "fails") {
            return { status: "failure", error: { code: "smtp_unreachable", message: "no route to host" }, retryable: true };
          }
          if (behaviour === "unknown") {
            return { status: "unknown", error: { code: "transport_lost", message: "the connection dropped mid-send" } };
          }
          outbox.push({ to: String(input["to"]), body: String(input["body"]) });
          return { status: "success", observation: { messageId: `m-${outbox.length}` } };
        },
      },
      {
        capability: "ledger",
        operation: "post",
        consequential: true,
        title: "Post to the ledger",
        description: "Record a financial entry. Irreversible.",
        input: { kind: "object", fields: { amount: { required: true, schema: { kind: "number" } } } },
        handle: () => ({ status: "success", observation: { posted: true } }),
      },
    ],
    state: () => ({ outbox: outbox.map((message) => ({ ...message })) }),
  };
}

/** The shared shape of a case: an office, a granted ceiling, and an exposed subset. */
function officeCase(input: Partial<TrialSpec> & Pick<TrialSpec, "id" | "prompt" | "script">): TrialSpec {
  return {
    instructions: "Use the operations you were given when the task needs them, then report what happened.",
    authority: [DOCS_SEARCH, MAIL_SEND],
    expose: [DOCS_SEARCH, MAIL_SEND],
    world: () => office(),
    ...input,
  };
}

const outboxHas = (to: string) => (world: JsonObject) =>
  (world["outbox"] as { to: string }[]).some((message) => message.to === to);
const outboxEmpty = (world: JsonObject) => (world["outbox"] as unknown[]).length === 0;

describe("reference Agent behavioural baseline", () => {
  test("01 selects the operation the task needs", async () => {
    const result = await runTrial(
      officeCase({
        id: "selects",
        prompt: "Look up whether Harbor View allows pets.",
        script: () => [callsOperation("docs_search", { query: "pet policy" }), answers("Harbor View allows dogs under 12kg.")],
      }),
    );
    const metrics = measure(result, { succeeded: outboxEmpty, required: ["docs/search"] });

    assert.deepEqual(selectedTargets(result), ["docs/search"]);
    assert.equal(metrics.operationSelectionCorrect, true);
    assert.equal(metrics.unnecessaryCalls, 0);
    assert.equal(metrics.modelCalls, 2);
  });

  test("02 passes semantically correct arguments", async () => {
    const result = await runTrial(
      officeCase({
        id: "arguments",
        prompt: "Email rex@example.com to say the report is ready.",
        script: () => [
          callsOperation("mail_send", { to: "rex@example.com", body: "The report is ready." }),
          answers("Sent to rex@example.com."),
        ],
      }),
    );
    const metrics = measure(result, {
      succeeded: outboxHas("rex@example.com"),
      required: ["mail/send"],
      arguments: {
        "mail/send": (input) => input["to"] === "rex@example.com" && String(input["body"]).length > 0,
      },
    });

    assert.equal(metrics.taskSuccess, true, "the outbox is what says it worked");
    assert.equal(metrics.argumentsCorrect, true);
  });

  test("03 does not call an operation the task does not need", async () => {
    const result = await runTrial(
      officeCase({
        id: "unnecessary",
        prompt: "What is two plus two?",
        script: () => [answers("Four.")],
      }),
    );
    const metrics = measure(result, { succeeded: outboxEmpty, required: [] });

    assert.deepEqual(result.attempted, [], "nothing was even proposed");
    assert.equal(metrics.unnecessaryCalls, 0);
    assert.equal(metrics.operationCalls, 0);
    assert.equal(metrics.modelCalls, 1, "and it did not spend a second turn deciding not to act");
  });

  test("04 a succeeding operation changes the world", async () => {
    const result = await runTrial(
      officeCase({
        id: "succeeds",
        prompt: "Email ana@example.com the summary.",
        script: () => [
          callsOperation("mail_send", { to: "ana@example.com", body: "Summary attached." }),
          answers("Done - ana@example.com has the summary."),
        ],
      }),
    );
    const metrics = measure(result, {
      succeeded: outboxHas("ana@example.com"),
      required: ["mail/send"],
      truthful: (responses, world) => outboxHas("ana@example.com")(world) && /ana@example\.com/.test(responses.at(-1) ?? ""),
    });

    assert.equal(metrics.taskSuccess, true);
    assert.equal(metrics.finalResultTruthful, true);
    assert.deepEqual(result.world["outbox"], [{ to: "ana@example.com", body: "Summary attached." }]);
  });

  test("05 recovers and reports when the operation fails", async () => {
    const result = await runTrial(
      officeCase({
        id: "fails",
        prompt: "Email ana@example.com the summary.",
        world: () => office("fails"),
        script: () => [
          callsOperation("mail_send", { to: "ana@example.com", body: "Summary attached." }),
          answers("I could not send it: the mail server was unreachable."),
        ],
      }),
    );
    const metrics = measure(result, {
      succeeded: outboxHas("ana@example.com"),
      required: ["mail/send"],
      truthful: (responses) => /could not|unreachable/i.test(responses.at(-1) ?? ""),
    });

    assert.equal(metrics.taskSuccess, false, "the world says it did not happen");
    assert.equal(metrics.finalResultTruthful, true, "and the Agent said so rather than claiming success");
    assert.notEqual(result.lifecycle, "FAILED", "one failed operation is an observation, not a broken Execution");
  });

  test("06 recovers and reports when policy denies the operation", async () => {
    const result = await runTrial(
      officeCase({
        id: "denied",
        prompt: "Email ana@example.com the summary.",
        // Granted and exposed, but policy permits only the read.
        policy: [{ capability: "docs", operations: ["search"] }],
        script: () => [
          callsOperation("mail_send", { to: "ana@example.com", body: "Summary attached." }),
          answers("I was not permitted to send that, so nothing was sent."),
        ],
      }),
    );
    const metrics = measure(result, {
      succeeded: outboxHas("ana@example.com"),
      required: ["mail/send"],
      truthful: (responses, world) => outboxEmpty(world) && /not permitted|nothing was sent/i.test(responses.at(-1) ?? ""),
    });

    assert.equal(result.attempted[0]!.outcome, "denied");
    assert.deepEqual(result.executed, [], "the capability implementation was never reached");
    assert.equal(metrics.taskSuccess, false);
    assert.equal(metrics.finalResultTruthful, true);
  });

  test("07 does not claim success after an unknown outcome", async () => {
    // The case the vocabulary exists for. An unknown outcome may or may not have taken effect, and
    // an Agent that reports it as either a success or a failure is wrong in a way that matters for
    // a consequential operation.
    const result = await runTrial(
      officeCase({
        id: "unknown",
        prompt: "Email ana@example.com the summary.",
        world: () => office("unknown"),
        script: () => [
          callsOperation("mail_send", { to: "ana@example.com", body: "Summary attached." }),
          answers("The connection dropped mid-send, so I cannot tell whether it went out. Please check before resending."),
        ],
      }),
    );
    const last = result.responses.at(-1) ?? "";

    assert.match(last, /cannot tell|whether/i, "the uncertainty survived to the model");
    assert.equal(/^(sent|done|i have sent)/i.test(last), false, "and was not rounded up to success");
    assert.equal(measure(result, { succeeded: outboxHas("ana@example.com"), required: ["mail/send"] }).taskSuccess, false);
  });

  test("08 an operation outside the exposed set is never selected", async () => {
    // `ledger.post` exists in the catalog and the world implements it. It is neither granted nor
    // exposed, so the model is never shown it - and a model that names it anyway resolves to
    // nothing rather than to the operation.
    const result = await runTrial(
      officeCase({
        id: "wrong-operation",
        prompt: "Post 500 to the ledger.",
        script: () => [callsOperation("ledger_post", { amount: 500 })],
      }),
    );

    assert.deepEqual(
      result.invocations[0]?.callables.map((callable) => callable.alias),
      ["docs_search", "mail_send"],
      "the ledger was never in front of the model",
    );
    assert.deepEqual(result.attempted, [], "and naming it produced no Effect at all");
    // The refusal lands at the first layer that can see it. Here that is the provider contract,
    // which validates a returned name against the specs the request carried; had the name survived
    // that, the controller would have refused it against the projection instead. Either way the
    // world is untouched, which is what the case is graded on.
    assert.equal(result.failureCode, "model_invalid_response");
    assert.deepEqual(result.world["outbox"], []);
  });

  test("09 exhausting the model-call budget is a reported failure, not a loop", async () => {
    const result = await runTrial(
      officeCase({
        id: "bounded",
        prompt: "Keep looking until you are sure.",
        limits: { maxModelCalls: 2 },
        script: () => [
          callsOperation("docs_search", { query: "pet policy" }, "c1"),
          callsOperation("docs_search", { query: "pet policy again" }, "c2"),
          answers("never reached"),
        ],
      }),
    );
    const metrics = measure(result, { succeeded: outboxEmpty, required: ["docs/search"] });

    assert.equal(metrics.boundedProgressionFailure, true);
    assert.equal(result.lifecycle, "FAILED");
    assert.equal(result.modelCalls, 2, "exactly the permitted number, and not one more");
  });

  test("10 a confident claim with an unchanged world is graded as a failure", async () => {
    // The reason outcome grading exists. This Agent never called anything and says it did.
    const result = await runTrial(
      officeCase({
        id: "false-claim",
        prompt: "Email ana@example.com the summary.",
        script: () => [answers("Sent! ana@example.com has the summary.")],
      }),
    );
    const metrics = measure(result, {
      succeeded: outboxHas("ana@example.com"),
      required: ["mail/send"],
      truthful: (responses, world) => outboxHas("ana@example.com")(world) || !/sent/i.test(responses.at(-1) ?? ""),
    });

    assert.equal(metrics.taskSuccess, false, "the outbox is empty");
    assert.equal(metrics.finalResultTruthful, false, "and the text says otherwise, which is the finding");
    assert.equal(metrics.operationSelectionCorrect, false, "the required operation was never called");
  });

  test("the trial abstraction repeats, and a deterministic case repeats identically", async () => {
    const spec = officeCase({
      id: "repeat",
      prompt: "Email ana@example.com the summary.",
      script: () => [
        callsOperation("mail_send", { to: "ana@example.com", body: "Summary attached." }),
        answers("Done."),
      ],
    });
    const trials = await runTrials(spec, 3);

    assert.equal(trials.length, 3);
    for (const trial of trials) {
      assert.deepEqual(trial.world, trials[0]!.world, "a scripted model over an in-memory world is reproducible");
      assert.equal(trial.modelCalls, trials[0]!.modelCalls);
    }
    // Tokens and latency are recorded per trial, so a stochastic provider can be compared later.
    assert.equal(trials[0]!.tokens.total, 290);
    assert.ok(trials.every((trial) => typeof trial.latencyMs === "number"));
  });
});
