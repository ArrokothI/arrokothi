/**
 * K1.4-candidate — test-side helpers. Not part of the candidate: `boundary.test.ts` keeps this file
 * outside the implementation closure, so nothing here can reach `kernel-candidate.ts`.
 */

import type { CandidateRefusal, CandidateRun, Command, K0Candidate, Observation, Scenario } from "../k0/fixture.ts";
import type { OperationSink } from "../k0/operation-sink.ts";
import { createOperationSink } from "../k0/operation-sink.ts";
import type { FixtureEvent, OutcomeEnvelope, OutcomeNext } from "../k0/protocol-vocabulary.ts";

/** What a wrapped candidate did during one run. */
export interface Recording {
  /** The observations `apply` returned, in order. */
  readonly observations: Observation[];
  /** Every scenario member the candidate read that the tripwire does not allow. */
  readonly forbiddenReads: string[];
  refusal: string | null;
}

export function newRecording(): Recording {
  return { observations: [], forbiddenReads: [], refusal: null };
}

/**
 * A scenario as the candidate is allowed to see it (addendum §A2, §A11): `id`, traversal of `steps`,
 * and each step's `command`. Reading anything else is recorded and throws.
 */
export function tripwire(scenario: Scenario, recording: Recording): Scenario {
  const forbid = (where: string): never => {
    recording.forbiddenReads.push(where);
    throw new Error(`the candidate read ${where}, which it may not`);
  };
  const steps = scenario.steps.map((step, index) =>
    new Proxy(step, {
      get(target, key) {
        if (key === "command") return target.command;
        return forbid(`steps[${index}].${String(key)}`);
      },
      has: (_target, key) => forbid(`"${String(key)}" in steps[${index}]`),
      ownKeys: () => forbid(`the keys of steps[${index}]`),
      getOwnPropertyDescriptor: (_target, key) => forbid(`the descriptor of steps[${index}].${String(key)}`),
    }),
  );
  return new Proxy(scenario, {
    get(target, key) {
      if (key === "id") return target.id;
      if (key === "steps") return steps;
      return forbid(`scenario.${String(key)}`);
    },
    has: (_target, key) => forbid(`"${String(key)}" in scenario`),
    ownKeys: () => forbid("the scenario's keys"),
    getOwnPropertyDescriptor: (_target, key) => forbid(`the descriptor of scenario.${String(key)}`),
  });
}

/**
 * Wraps a candidate so a test can see the observations it returned, and can hand `begin` a different
 * scenario object from the one the runner judges with.
 */
export function recordingCandidate(inner: K0Candidate, recording: Recording, seen: (scenario: Scenario) => Scenario = (scenario) => scenario): K0Candidate {
  return {
    name: inner.name,
    begin(scenario: Scenario, sink: OperationSink): CandidateRun | CandidateRefusal {
      const started = inner.begin(seen(scenario), sink);
      if ((started as CandidateRefusal).refused === true) {
        recording.refusal = (started as CandidateRefusal).reason;
        return started;
      }
      const run = started as CandidateRun;
      return {
        apply(command: Command): Observation {
          const observation = run.apply(command);
          recording.observations.push(structuredClone(observation));
          return observation;
        },
      };
    },
  };
}

/** A scenario with no steps, for tests that drive `apply` with their own commands. */
export function emptyScenario(id: string): Scenario {
  return { id, title: id, sources: [], k0BoundaryRows: [], isUnsafeControl: false, steps: [] };
}

/** Starts one run of `candidate` outside the runner and returns its `apply`. */
export function startRun(candidate: K0Candidate, id = "k14-candidate-witness"): (command: Command) => Observation {
  const started = candidate.begin(emptyScenario(id), createOperationSink().sink);
  if ((started as CandidateRefusal).refused === true) throw new Error(`unexpected refusal: ${(started as CandidateRefusal).reason}`);
  const run = started as CandidateRun;
  return (command) => run.apply(command);
}

export function input(eventId: string, destination: string, subscriptionClass: string, producer = "prod-default", requestKey = eventId): FixtureEvent {
  return { eventId, destination, kind: "external.input", category: "application_input", subscriptionClass, producer, requestKey };
}

export function create(executionId: string, requestKey: string, initialInput: FixtureEvent, kind: "create" | "create_retry" = "create"): Command {
  return { kind, executionId, requestKey, initialInput, definitionRevision: "fake-runtime@1" };
}

/** An Outcome for the exchange an earlier observation showed open, in the candidate's own coordinates. */
export function outcomeFor(open: Observation, next: OutcomeNext, overrides: Partial<OutcomeEnvelope> = {}): OutcomeEnvelope {
  if (open.activationId === null) throw new Error("the observation shows no open exchange to answer");
  return {
    executionId: open.executionId,
    activationId: open.activationId,
    writerEpoch: open.writerEpoch,
    baseProgressRevision: open.progressRevision,
    progress: null,
    emissions: [],
    effects: [],
    next,
    ...overrides,
  };
}
