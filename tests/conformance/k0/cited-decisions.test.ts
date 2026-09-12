/** Reviewable clause reconciliation, not a prose-to-semantics parser. */
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { CLAUSE_REFINEMENTS } from "./clause-refinements.ts";
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
  assert.equal(sha(JSON.stringify(decisions)), "fd3f9d703461ea177ccc4c093220d907abfba2a31ca821f516dfb7de1160514e", "clause inventory changed: reconcile the source assertions and review the new seal; labels alone are insufficient");
}

function checkRefinements(decisions = CITED_DECISIONS): void {
  const clauses = new Map(decisions.flatMap(d => d.clauses.map(c => [c.id, c] as const)));
  for (const group of CLAUSE_REFINEMENTS) {
    assert.ok(group.reason.length > 40, group.priorOwner);
    assert.ok(group.owners.length > 1, group.priorOwner);
    assert.equal(new Set(group.owners).size, group.owners.length, "independent owners collapsed");
    for (const owner of group.owners) {
      assert.ok(K0_OBLIGATIONS.some(o => o.id === owner), `missing refined owner ${owner}`);
      assert.ok(group.clauses.some(c => c.obligation === owner), `unreconciled refined owner ${owner}`);
    }
    for (const expected of group.clauses)
      assert.equal(clauses.get(expected.id)?.obligation, expected.obligation, `independent clause rebound: ${expected.id}`);
  }
}

describe("cited decisions: explicit inventory and reconciliation", () => {
  test("source and all clause dispositions match the reviewed inventory", async () => {
    const source = (await readFile(worksheet, "utf8")).split("## 12.")[0]!;
    assert.equal(sha(source), "6a395a88c4f421c8cc71f2b585787c7dff09498e04c188fde49441f1b31d939f", "accepted source changed; re-audit clauses before updating the seal");
    checkReconciliation();
    checkRefinements();
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
  test("re-bundling independent clauses fails without consulting the inventory seal", () => {
    const broken = CITED_DECISIONS.map(d => ({ ...d, clauses: d.clauses.map(c =>
      c.obligation === "R5-j1-2" ? { ...c, obligation: "R5-j1" } : c) }));
    assert.throws(() => checkRefinements(broken), /independent clause rebound/);
  });
  test("timeout envelope fields cannot silently share one owner again", () => {
    const broken = CITED_DECISIONS.map(d => ({ ...d, clauses: d.clauses.map(c =>
      c.obligation.startsWith("R5-k6-") ? { ...c, obligation: "R5-k6" } : c) }));
    assert.throws(() => checkRefinements(broken), /independent clause rebound/);
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
  test("batches contain only accepted Events", () => {
    for (const s of ALL_SCENARIOS) {
      const accepted = new Set<string>();
      for (const step of s.steps) {
        // Expected mailbox/disposition facts identify accepted Events, including immediate timeout.
        for (const id of [...step.expect.observation.queued, ...step.expect.observation.acknowledged, ...step.expect.observation.terminalDispositions]) accepted.add(id);
        if (step.command.kind !== "dispatch") continue;
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
  test("live generation exactly while WAITING", () => {
    for (const s of ALL_SCENARIOS) for (const { expect: { observation: o } } of s.steps)
      assert.equal(o.liveWaitGeneration !== null, o.state === "WAITING", s.id);
  });
  test("readiness only in READY", () => {
    for (const s of ALL_SCENARIOS) for (const { expect: { observation: o } } of s.steps)
      if (o.state !== "READY") assert.deepEqual(o.waitEndedReadiness, [], s.id);
  });
  test("readiness requires retirement", () => {
    for (const s of ALL_SCENARIOS) {
      const registered = new Set<string>();
      for (const { command: c, expect: { observation: o } } of s.steps) {
        if (c.kind === "submit_outcome" && c.outcome.next.step === "await" && o.rejection === null)
          registered.add(`${o.executionId}/${c.outcome.next.wait.generation}`);
        for (const r of o.waitEndedReadiness) {
          assert.ok(registered.has(`${o.executionId}/${r.generation}`), `${s.id}: unregistered readiness`);
          assert.notEqual(r.generation, o.liveWaitGeneration, s.id);
        }
      }
    }
  });
  test("consumed readiness never reappears", () => {
    for (const s of ALL_SCENARIOS) {
      const prior = new Map<string, readonly { generation: string }[]>();
      const consumed = new Set<string>();
      for (const { command: c, expect: { observation: o } } of s.steps) {
        if (c.kind === "dispatch") for (const r of prior.get(o.executionId) ?? []) consumed.add(`${o.executionId}/${r.generation}`);
        for (const r of o.waitEndedReadiness) assert.ok(!consumed.has(`${o.executionId}/${r.generation}`), s.id);
        prior.set(o.executionId, o.waitEndedReadiness);
      }
    }
  });
  test("dispatch bounds are positive", () => {
    for (const s of ALL_SCENARIOS) for (const { command: c } of s.steps)
      if (c.kind === "dispatch") assert.ok(c.bound >= 1, s.id);
  });
  test("batches respect their bounds", () => {
    for (const s of ALL_SCENARIOS) for (const { command: c, expect: { observation: o } } of s.steps)
      if (c.kind === "dispatch") assert.ok((o.dispatchedBatch?.length ?? 0) <= c.bound, s.id);
  });
  test("batches are explicit reference lists", () => {
    for (const s of ALL_SCENARIOS) for (const { expect: { observation: o } } of s.steps) {
      if (o.dispatchedBatch === null) continue;
      assert.ok(Array.isArray(o.dispatchedBatch), s.id);
      assert.ok(o.dispatchedBatch.every(id => typeof id === "string"), s.id);
    }
  });
  test("wait-ended batches are nonempty", () => {
    for (const s of ALL_SCENARIOS) {
      const prior = new Map<string, number>();
      for (const { command: c, expect: { observation: o } } of s.steps) {
        if (c.kind === "dispatch" && (prior.get(o.executionId) ?? 0) > 0) assert.ok((o.dispatchedBatch?.length ?? 0) > 0, s.id);
        prior.set(o.executionId, o.waitEndedReadiness.length);
      }
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
  for (const forbidden of ["callback", "payload selector", "interleave field", "native work identity", "Runtime-local arm"]) test(`wait grammar excludes ${forbidden}`, async () => {
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
