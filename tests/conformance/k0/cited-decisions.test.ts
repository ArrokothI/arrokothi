/** Reviewable clause reconciliation, not a prose-to-semantics parser. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CITED_DECISIONS } from "./cited-decisions.ts";
import { K0_OBLIGATIONS } from "./coverage.ts";
import { ALL_SCENARIOS } from "./scenarios.ts";

const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const worksheet = new URL("../../../docs/development/work/K0.1/protocol-worksheet.md", import.meta.url);
const ledger = new URL("../../../docs/development/007-work-packets.md", import.meta.url);

/** Call on copies too: a removed clause/owner must fail, even though its decision label remains. */
function checkReconciliation(decisions = CITED_DECISIONS, obligations = K0_OBLIGATIONS): void {
  const ids = new Set<string>();
  for (const decision of decisions) {
    assert.ok(decision.clauses.length > 0, decision.decision);
    for (const clause of decision.clauses) {
      assert.ok(!ids.has(clause.id), `duplicate clause ${clause.id}`);
      ids.add(clause.id);
      assert.ok(clause.assertion.length > 15, `missing assertion ${clause.id}`);
      const owner = obligations.find(entry => entry.id === clause.obligation);
      assert.ok(owner, `${clause.id} has no obligation owner ${clause.obligation}`);
      // Actual scenario/shared/corpus/assigned evidence remains checked by coverage.test.ts.
      assert.ok(owner.evidence, `${clause.id} has no evidence disposition`);
    }
  }
  assert.equal(sha(JSON.stringify(decisions)), "08ba975cc032d62b02dfa35d9c16d7b6a20f78d92f30a0bb48aae224e834369f", "clause inventory changed: reconcile the source assertions and review the new seal; labels alone are insufficient");
}

describe("cited decisions: explicit inventory and reconciliation", () => {
  test("source and all clause dispositions match the reviewed inventory", async () => {
    const source = (await readFile(worksheet, "utf8")).split("## 12.")[0]!;
    assert.equal(sha(source), "6a395a88c4f421c8cc71f2b585787c7dff09498e04c188fde49441f1b31d939f", "accepted source changed; re-audit clauses before updating the seal");
    checkReconciliation();
    const referenced = new Set(CITED_DECISIONS.flatMap(d => d.clauses.map(c => c.obligation)));
    assert.deepEqual(K0_OBLIGATIONS.filter(o => !referenced.has(o.id)).map(o => o.id), [], "obligations must also be reconciled back to source clauses");
    // Parse only the explicit decision citations in the ten table cells. No semantic decomposition.
    for (let row = 1; row <= 10; row++) {
      const cell = source.split("## 11.")[1]!.split("\n").find(line => line.startsWith(`| ${row} |`))!.split("|")[4]!;
      const cited: string[] = [];
      for (const match of cell.matchAll(/([A-Z]+)-(\d+)(?:–(?:[A-Z]+-)?(\d+))?/g)) {
        for (let n = Number(match[2]); n <= Number(match[3] ?? match[2]); n++) cited.push(`${match[1]}-${n}`);
      }
      assert.deepEqual(CITED_DECISIONS.filter(d => d.rows.includes(row)).map(d => d.decision).sort(), cited.sort(), `row ${row} citations`);
    }
  });
  test("removing a clause while retaining the decision label is detected", () => {
    const broken = CITED_DECISIONS.map(d => d.decision === "OA-1" ? { ...d, clauses: d.clauses.slice(1) } : d);
    assert.throws(() => checkReconciliation(broken), /inventory changed/);
  });
  test("a dangling clause owner is detected independently of the inventory seal", () => {
    assert.throws(() => checkReconciliation(CITED_DECISIONS, K0_OBLIGATIONS.filter(o => o.id !== "R3-e1")), /has no obligation owner/);
  });
  test("assignments name an actual implementing packet from 007", async () => {
    const source = await readFile(ledger, "utf8");
    for (const entry of K0_OBLIGATIONS) {
      if (entry.evidence.kind !== "assigned") continue;
      assert.ok(source.includes(`### ${entry.evidence.packet} —`), `${entry.id}: no actual 007 owner`);
    }
  });
});

describe("cited decisions: negative corpus invariants", () => {
  test("batches contain accepted Events under positive bounds", () => {
    for (const s of ALL_SCENARIOS) {
      const accepted = new Set<string>();
      for (const step of s.steps) {
        // Expected mailbox/disposition facts identify accepted Events, including immediate timeout.
        for (const id of [...step.expect.observation.queued, ...step.expect.observation.acknowledged, ...step.expect.observation.terminalDispositions]) accepted.add(id);
        if (step.command.kind !== "dispatch") continue;
        assert.ok(step.command.bound >= 1);
        for (const id of step.expect.observation.dispatchedBatch ?? []) assert.ok(accepted.has(id), `${s.id}: unaccepted ${id}`);
      }
    }
  });
  test("no dispatch while WAITING", () => {
    for (const s of ALL_SCENARIOS) {
      const states = new Map<string, string>();
      for (const step of s.steps) {
        if (step.command.kind === "dispatch") assert.notEqual(states.get(step.command.executionId), "WAITING", s.id);
        states.set(step.expect.observation.executionId, step.expect.observation.state);
      }
    }
  });
  test("generation and readiness lifecycle", () => {
    for (const s of ALL_SCENARIOS) for (const step of s.steps) {
      const o = step.expect.observation;
      if (o.state !== "WAITING") assert.equal(o.liveWaitGeneration, null, s.id);
      if (o.state !== "READY") assert.deepEqual(o.waitEndedReadiness, [], s.id);
      for (const r of o.waitEndedReadiness) assert.notEqual(r.generation, o.liveWaitGeneration, s.id);
    }
  });
  test("reservation consumes readiness", () => {
    for (const s of ALL_SCENARIOS) for (const step of s.steps) {
      if (step.command.kind === "dispatch") assert.deepEqual(step.expect.observation.waitEndedReadiness, [], s.id);
    }
  });
  test("epoch representation remains exchange-local", () => {
    for (const s of ALL_SCENARIOS) {
      const exchanges = new Set<string>();
      for (const step of s.steps) {
        const o = step.expect.observation;
        if (o.activationId === null || exchanges.has(o.activationId)) continue;
        assert.equal(o.writerEpoch, 1, s.id);
        exchanges.add(o.activationId);
      }
    }
  });
  test("wait grammar remains declarative", async () => {
    const vocabulary = await readFile(new URL("./protocol-vocabulary.ts", import.meta.url), "utf8");
    const members = (name: string) => [...vocabulary.match(new RegExp(`export interface ${name} \\{([\\s\\S]*?)\\n\\}`))![1]!.matchAll(/readonly (\w+)\??:/g)].map(m => m[1]);
    assert.deepEqual(members("WaitRecord"), ["dependencies", "subscriptions", "deadline", "generation"]);
    assert.deepEqual(members("DependencyAlternative"), ["eventIdentity", "kinds", "correlation"]);
  });
  test("no semantic-obedience protocol field", async () => {
    const fixture = await readFile(new URL("./fixture.ts", import.meta.url), "utf8");
    const members = [...fixture.matchAll(/readonly (\w+)\??:/g)].map(m => m[1]);
    assert.ok(!members.some(name => /obey|obedience|semanticCompliance/i.test(name!)));
  });
});
