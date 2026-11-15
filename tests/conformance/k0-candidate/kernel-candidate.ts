/**
 * K1.4-candidate — the real-Kernel candidate for the K0 public fixture.
 *
 * `kernelCandidate` implements the fixture's `K0Candidate` port by driving `ExecutionCoordinator`
 * through the `@arrokothi/kernel` package root, with a deterministic fake Driver and an injected clock.
 * It is test-side adapter code: it is not Kernel code and it changes no Kernel semantics.
 *
 * Design: `docs/development/work/K1.4-candidate/design-01.md`, as changed by
 * `design-01-addendum-01.md` and owner choice 02. Section numbers below (§A2 …) are the addendum's.
 *
 * ## What this module may and may not do
 *
 * 1. **The Kernel decides.** Nothing here classifies, selects, deduplicates or compares content.
 *    `create` and `create_retry` make the same call, and so do `submit_outcome` and `resubmit_outcome`.
 * 2. **Bytes in.** Every laboratory value reaches the Kernel as canonical bytes (`canonical-json.ts`).
 * 3. **Fail visible.** A Kernel-minted ID with no laboratory name is reported in the Kernel's own
 *    spelling, marked `kernel-…:`. A Kernel answer this module has no rule for makes `apply` throw,
 *    which the runner records as FAIL. The one declared exception to "never a guessed fixture name" is
 *    the unnamed timeout Event (§A4, owner choice 02 Q2 b).
 * 4. **Blind.** `begin` reads the scenario's `id` and each step's `command`, to check that the Kernel has
 *    a surface for it (§A2). It never reads an expectation, and it keeps nothing from that scan.
 *
 * ## Conventions the owner adopted (they are the fixture's, not the Kernel's)
 *
 * - **`rejection`** (§A5): the most recent reportable Kernel refusal for an Execution, dropped when that
 *   Execution's episode key `(state, activationId, writerEpoch)` changes.
 * - **Unnamed timeout Event** (§A4): reported as `to-<laboratory name of its own generation>`. Only a
 *   timeout no `deliver_timer` command has named takes the label; a name or label that already denotes
 *   another timeout ID exposes the new ID in the Kernel's spelling (`TimeoutNames`, review 01).
 * - **Clock** (§A9): starts at 1 and moves only to a listed pending deadline when `deliver_timer` fires it.
 *
 * ## Recorded limits (`docs/development/017-known-limitations.md`)
 *
 * `effectIntents` is a constant `[]`: the K1 Kernel has no Effect record to read. The operation sink is
 * never called: K1 has no Kernel-mediated operation. `acknowledged` is the Kernel's acceptance order.
 * `waitEndedReadiness` has length 0 or 1, `recoveryHold` shows the first of at most two holds, and
 * `emissions` lists Emission keys.
 */

import { ExecutionCoordinator } from "@arrokothi/kernel";
import type {
  AuthenticatedCaller,
  CoordinatorOptions,
  ExecutionView,
  KernelClock,
  OutcomeEnvelope as KernelOutcomeEnvelope,
  OutcomeNext as KernelOutcomeNext,
  RefusalRecord,
  SubmissionGrant,
} from "@arrokothi/kernel";

import { FIXTURE_VERSION } from "../k0/fixture.ts";
import type { CandidateRefusal, CandidateRun, Command, K0Candidate, Observation, Scenario } from "../k0/fixture.ts";
import type { OperationSink } from "../k0/operation-sink.ts";
import type { FixtureEvent, OutcomeEnvelope, OutcomeNext, OutcomeRejection } from "../k0/protocol-vocabulary.ts";

import { canonicalBytes, plainCopy } from "./canonical-json.ts";
import { createFakeDriver } from "./fake-driver.ts";

/** The candidate's own version. E1 pins it beside `FIXTURE_VERSION`. */
export const KERNEL_CANDIDATE_VERSION = "arrokothi-k0-kernel-candidate/1";

/** The fixture version this candidate was built for. Any other version is refused by name. */
export const BUILT_FOR_FIXTURE_VERSION = "arrokothi-k0-public-fixture/1";

/** The one authority scope every laboratory Execution is created in. */
const SCOPE = "k0-fixture";
/** The Runtime contract revision and progress codec this fake Runtime declares. Always available at recovery. */
const RUNTIME_CONTRACT_REVISION = "k0-candidate-runtime-contract/1";
const PROGRESS_CODEC = "k0-candidate-progress-json/1";
/** Where the laboratory clock starts: a reproducibility convention, not something the corpus needs (§A9). */
const CLOCK_START = 1;

/** Dispatch, redelivery, Outcome submission, inspection and the control commands. */
const LABORATORY: AuthenticatedCaller = Object.freeze({
  namespace: "k0-laboratory",
  scopes: Object.freeze([SCOPE]),
  controlScopes: Object.freeze([SCOPE]),
  cancelScopes: Object.freeze([SCOPE]),
});

/** A producer is the authenticated namespace its creation and input identities are scoped by (ID-2). */
const producerCaller = (producer: string): AuthenticatedCaller => ({ namespace: producer, scopes: [SCOPE] });

/** Presented when the Driver was never handed the named attempt. It is no grant, so the Kernel decides. */
const NO_GRANT: SubmissionGrant = Object.freeze({ executionId: "", activationId: "", writerEpoch: 0 });

type CoordinatorConstructor = new (options: CoordinatorOptions) => ExecutionCoordinator;

export interface KernelCandidateOptions {
  /** The fixture version the loaded fixture declares. Defaults to the imported `FIXTURE_VERSION`. */
  readonly fixtureVersion?: string;
  /**
   * The coordinator class to drive. Defaults to the package root's. The ablation tests pass the same
   * class loaded from an edited copy of the Kernel source, to show the verdicts depend on the Kernel.
   */
  readonly Coordinator?: CoordinatorConstructor;
}

// -- Capability preflight (§A2) -----------------------------------------------

/**
 * Why the K1 Kernel has no surface for `command`, or `null` when it has one.
 *
 * Reads the command's kind and an Event's source category, and nothing else. It decides no selector
 * match, envelope validity, replay or acceptance.
 */
function unsupportedCommand(command: Command): string | null {
  const noTrustedIngress = (category: string): string =>
    `an Event of category ${category}, and the K1 Kernel has no ingress for a trusted non-timeout Event ` +
    `(docs/development/017-known-limitations.md L-21); application input is its only ingress`;
  switch (command.kind) {
    case "create":
    case "create_retry":
      return command.initialInput.category === "application_input" ? null : `${command.kind} carries ${noTrustedIngress(command.initialInput.category)}`;
    case "accept_event":
      return command.event.category === "application_input" ? null : `accept_event carries ${noTrustedIngress(command.event.category)}`;
    case "dispatch":
    case "redeliver_dispatch":
    case "submit_outcome":
    case "resubmit_outcome":
    case "accept_cancellation":
    case "deliver_timer":
    case "recover":
    case "takeover":
    case "inspect":
      return null;
    default:
      return `command kind ${JSON.stringify((command as { readonly kind: unknown }).kind)} is not one this candidate has a Kernel call for`;
  }
}

// -- Aliases (§A3) ------------------------------------------------------------

/**
 * Laboratory names for Kernel-minted IDs of one family.
 *
 * A pair is bound only when the name and the ID are both unbound, and it is never overwritten. So an ID
 * that already has a name keeps it, and a name that already has an ID keeps that: either way a wrong
 * identity shows as a literal difference in the Observation instead of being repaired here.
 *
 * This table is for the families whose unnamed ID has exactly one spelling, the Kernel's own: Executions
 * and wait generations. A refused pair therefore needs no record. Timeout Events have a second source of
 * names and use `TimeoutNames`.
 */
class Aliases {
  readonly #idByName = new Map<string, string>();
  readonly #nameById = new Map<string, string>();

  bind(name: string, id: string): void {
    if (this.#idByName.has(name) || this.#nameById.has(id)) return;
    this.#idByName.set(name, id);
    this.#nameById.set(id, name);
  }

  idOf(name: string): string | null {
    return this.#idByName.get(name) ?? null;
  }

  nameOf(id: string): string | null {
    return this.#nameById.get(id) ?? null;
  }
}

/**
 * How one Kernel timeout Event ID is shown, and where that came from.
 *
 * - `command`: a `deliver_timer` command named it.
 * - `convention`: no command has named it, and it carries the owner-adopted label of its own generation
 *   (§A4, owner choice 02 Q2 b).
 * - `exposed`: a name was offered for it that already denotes another ID. It is shown in the Kernel's own
 *   spelling from then on, so the identity difference is a literal difference in the Observation.
 */
type TimeoutShown =
  | { readonly source: "command"; readonly name: string }
  | { readonly source: "convention"; readonly name: string }
  | { readonly source: "exposed" };

/**
 * Laboratory names for one Execution's timeout Events, with the provenance of every binding.
 *
 * The plain alias table above is not enough for this family, because it is the only one with a second
 * source of names: the `to-<generation>` label. A table that answers only "this ID has no name" cannot
 * tell a timeout no command named from one whose offered name was refused, and the label would then
 * cover an identity conflict (review 01 K14C-R01-01). So this table keeps three facts apart, and the
 * label is one of its bindings, made and checked like any other.
 *
 * Invariants, for one Execution and one run:
 * 1. A name denotes at most one ID, for good. `#idByName` only grows, and it holds labels as well as
 *    command names, so a label and a command name can never show two IDs as one.
 * 2. An ID is shown under one name at a time. That name changes at most once: from its label to the
 *    first name a command gives it (§A4). A later command's different name does not rebind it.
 * 3. An offered name that would break rule 1 is not bound. The ID it was offered for becomes `exposed`
 *    and stays so. Nothing here chooses which identity is right.
 */
class TimeoutNames {
  readonly #idByName = new Map<string, string>();
  readonly #shownById = new Map<string, TimeoutShown>();

  /** A `deliver_timer` command named the timeout Event the Kernel answered with. */
  nameByCommand(name: string, id: string): void {
    const shown = this.#shownById.get(id);
    if (shown !== undefined && shown.source !== "convention") return;
    const denoted = this.#idByName.get(name);
    if (denoted !== undefined && denoted !== id) {
      this.#shownById.set(id, { source: "exposed" });
      return;
    }
    this.#idByName.set(name, id);
    this.#shownById.set(id, { source: "command", name });
  }

  /**
   * The name to report for a timeout mailbox entry. `label` is the entry's `to-<generation>` label, or
   * `null` when its generation has no laboratory name. An entry no command has named takes the label
   * here, as a binding; if the label already denotes another ID, the entry is exposed instead.
   */
  show(id: string, label: string | null): string {
    let shown = this.#shownById.get(id);
    if (shown === undefined && label !== null) {
      const denoted = this.#idByName.get(label);
      if (denoted !== undefined && denoted !== id) {
        shown = { source: "exposed" };
      } else {
        this.#idByName.set(label, id);
        shown = { source: "convention", name: label };
      }
      this.#shownById.set(id, shown);
    }
    return shown === undefined || shown.source === "exposed" ? `kernel-event:${id}` : shown.name;
  }
}

/** One table per Execution, created on first use. */
class ByExecution<Table> {
  readonly #tables = new Map<string, Table>();
  readonly #create: () => Table;

  constructor(create: () => Table) {
    this.#create = create;
  }

  of(executionId: string): Table {
    let table = this.#tables.get(executionId);
    if (table === undefined) {
      table = this.#create();
      this.#tables.set(executionId, table);
    }
    return table;
  }
}

// -- The candidate ------------------------------------------------------------

/** What one command's Kernel answer adds to the view-derived Observation. */
interface AnswerFacts {
  /** The receipt of a creation or Outcome acceptance this command returned, fresh or replayed. */
  readonly receiptToken?: string;
  /** A reportable refusal this command received (§A5). */
  readonly refusal?: RefusalRecord;
  /** The Event name of an input the Kernel refused because its destination had ended. */
  readonly ingressRefused?: string;
}

interface RejectionMemory {
  key: string;
  refusal: OutcomeRejection | null;
}

function begin(options: KernelCandidateOptions, scenario: Scenario, _sink: OperationSink): CandidateRun | CandidateRefusal {
  const loadedFixtureVersion = options.fixtureVersion ?? FIXTURE_VERSION;
  if (loadedFixtureVersion !== BUILT_FOR_FIXTURE_VERSION) {
    return {
      refused: true,
      reason:
        `${KERNEL_CANDIDATE_VERSION} was built for fixture ${BUILT_FOR_FIXTURE_VERSION}; ` +
        `the loaded fixture declares ${loadedFixtureVersion}, so nothing is run`,
    };
  }
  for (let index = 0; index < scenario.steps.length; index += 1) {
    const problem = unsupportedCommand((scenario.steps[index] as { readonly command: Command }).command);
    if (problem !== null) {
      return {
        refused: true,
        reason:
          `${KERNEL_CANDIDATE_VERSION} refuses scenario ${scenario.id} before any command runs: ` +
          `step ${index} is not supported, because ${problem}`,
      };
    }
  }

  const Coordinator = options.Coordinator ?? ExecutionCoordinator;
  const driver = createFakeDriver();
  let now = CLOCK_START;
  const clock: KernelClock = { now: () => now };
  const coordinator = new Coordinator({ driver, clock });

  const executions = new Aliases();
  const generations = new ByExecution(() => new Aliases());
  const timeouts = new ByExecution(() => new TimeoutNames());
  const rejections = new Map<string, RejectionMemory>();

  /** The Kernel's ID for a laboratory Execution name. A name the Kernel never created has nothing to address. */
  const kernelExecution = (name: string): string => {
    const id = executions.idOf(name);
    if (id === null) throw new Error(`the command names Execution ${JSON.stringify(name)}, which the Kernel has not created in this run`);
    return id;
  };

  const viewOf = (executionId: string): ExecutionView => {
    const answer = coordinator.inspect(LABORATORY, executionId);
    if (!answer.ok) throw new Error(`inspect was refused (${answer.error.classification}): ${answer.error.reason}`);
    return answer.value;
  };

  const generationName = (executionId: string, generation: number): string =>
    generations.of(executionId).nameOf(String(generation)) ?? `kernel-generation:${generation}`;

  /** The laboratory name of each mailbox entry, by Kernel Event ID. */
  const eventNames = (view: ExecutionView): Map<string, string> => {
    const names = new Map<string, string>();
    for (const entry of view.mailbox) {
      if (entry.sourceCategory === "application_input") {
        // The laboratory name travels as the payload, so it is read back from what the Kernel holds.
        const payload = entry.payload as { readonly eventId?: unknown } | null;
        const carried = payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload.eventId : undefined;
        names.set(entry.eventId, typeof carried === "string" ? carried : `kernel-event:${entry.eventId}`);
        continue;
      }
      // A timeout Event is Kernel-minted and has no payload. A `deliver_timer` command names it; one
      // minted at registration has no command, and takes the owner-adopted `to-<generation>` label from
      // its own generation (§A4). The table decides which applies, and exposes an ID whose offered name
      // or label already denotes another ID. A generation with no laboratory name has no label.
      const generation = generations.of(view.executionId).nameOf(String(entry.waitGeneration));
      names.set(entry.eventId, timeouts.of(view.executionId).show(entry.eventId, generation === null ? null : `to-${generation}`));
    }
    return names;
  };

  /** One inspection after the command, joined with what the command's own answer said. */
  const observe = (executionId: string, facts: AnswerFacts = {}): Observation => {
    const view = viewOf(executionId);
    const names = eventNames(view);
    const name = (eventId: string): string => names.get(eventId) ?? `kernel-event:${eventId}`;
    const activation = view.activation;

    // §A5: drop the stored refusal when the episode key changed, then store this command's, then report.
    const key = JSON.stringify([view.state, activation?.activationId ?? null, activation?.writerEpoch ?? null]);
    let memory = rejections.get(view.executionId);
    if (memory === undefined) {
      memory = { key, refusal: null };
      rejections.set(view.executionId, memory);
    }
    if (memory.key !== key) {
      memory.key = key;
      memory.refusal = null;
    }
    if (facts.refusal !== undefined) {
      memory.refusal = { classification: facts.refusal.classification as OutcomeRejection["classification"], reason: facts.refusal.reason };
    }

    let receipt: string | null = facts.receiptToken ?? null;
    if (receipt === null) {
      for (const candidate of view.receipts) {
        if (candidate.boundary === "creation" || candidate.boundary === "outcome_acceptance") receipt = candidate.token;
      }
    }

    const hold = view.recoveryHolds[0];
    return {
      executionId: executions.nameOf(view.executionId) ?? `kernel-execution:${view.executionId}`,
      state: view.state,
      progressRevision: view.progressRevision,
      progress: plainCopy(view.acceptedProgress),
      emissions: view.emissions.map((emission) => emission.emissionKey),
      acknowledged: view.acknowledged.map(name),
      queued: view.queued.map(name),
      terminalDispositions: view.terminalDispositions.map(name),
      liveWaitGeneration: view.wait === null ? null : generationName(view.executionId, view.wait.generation),
      waitEndedReadiness:
        view.waitEndedReadiness === null
          ? []
          : [{ generation: generationName(view.executionId, view.waitEndedReadiness.generation), species: view.waitEndedReadiness.species }],
      acceptedDeadline: view.wait === null ? null : view.wait.deadline,
      dispatchedBatch: activation === null ? null : activation.batch.map(name),
      activationId: activation === null ? null : activation.activationId,
      ingressRefused: facts.ingressRefused ?? null,
      receipt,
      rejection: memory.refusal === null ? null : { ...memory.refusal },
      writerEpoch: activation === null ? 0 : activation.writerEpoch,
      recoveryHold: hold === undefined ? null : { reason: hold.reason },
      // The K1 Kernel has no Effect record and `ExecutionView` no Effect field: a constant (017).
      effectIntents: [],
    };
  };

  /** A refusal to a create, input or Outcome command: reported for the Execution it names (§A5, §A8). */
  const observeRefusal = (refusal: RefusalRecord, what: string): Observation => {
    if (refusal.executionId === null) {
      throw new Error(`${what} was refused without naming an Execution (${refusal.classification}): ${refusal.reason}`);
    }
    return observe(refusal.executionId, { refusal });
  };

  /** A control command's refusal has no Observation field, so it is never projected as unchanged state (§A8). */
  const unexpected = (what: string, refusal: RefusalRecord): Error =>
    new Error(`${what} was refused (${refusal.classification}): ${refusal.reason}`);

  const inputContent = (event: FixtureEvent): { kind: string; payload: Uint8Array; subscriptionClass?: string } => {
    const name: { eventId: string; correlation?: string } = { eventId: event.eventId };
    if (event.correlation !== undefined) name.correlation = event.correlation;
    const content: { kind: string; payload: Uint8Array; subscriptionClass?: string } = { kind: event.kind, payload: canonicalBytes(name) };
    if (event.subscriptionClass !== undefined) content.subscriptionClass = event.subscriptionClass;
    return content;
  };

  const producerOf = (event: FixtureEvent): string => {
    if (event.category !== "application_input") throw new Error(`Event ${JSON.stringify(event.eventId)} is not application input and has no producer`);
    return event.producer;
  };

  const kernelNext = (next: OutcomeNext): KernelOutcomeNext => {
    switch (next.step) {
      case "continue":
        return { step: "continue" };
      case "await": {
        // The Kernel mints the generation; the laboratory's name for it is not part of the declaration.
        const declaration: { dependencies: unknown; subscriptions: unknown; deadline?: number } = {
          dependencies: next.wait.dependencies,
          subscriptions: next.wait.subscriptions,
        };
        if (next.wait.deadline !== undefined) declaration.deadline = next.wait.deadline;
        return { step: "await", wait: plainCopy(declaration) as Extract<KernelOutcomeNext, { step: "await" }>["wait"] };
      }
      case "complete":
        return { step: "complete", result: canonicalBytes(next.result) };
      case "fail":
        return { step: "fail", error: canonicalBytes(next.error) };
    }
  };

  const submit = (outcome: OutcomeEnvelope): Observation => {
    const executionId = kernelExecution(outcome.executionId);
    // The proposal keeps the coordinates it was given and presents the grant delivered for that attempt.
    const grant = driver.grantFor(executionId, outcome.activationId, outcome.writerEpoch) ?? NO_GRANT;
    const envelope: KernelOutcomeEnvelope = {
      executionId,
      activationId: outcome.activationId,
      writerEpoch: outcome.writerEpoch,
      baseProgressRevision: outcome.baseProgressRevision,
      progress: canonicalBytes(outcome.progress),
      emissions: outcome.emissions.map((emission) => ({ emissionKey: emission.emissionId, value: canonicalBytes(emission.value) })),
      effects: outcome.effects.map((proposal) => canonicalBytes(proposal)),
      next: kernelNext(outcome.next),
    };
    const answer = coordinator.submitOutcome(LABORATORY, envelope, grant);
    if (!answer.ok) return observeRefusal(answer.error, "the Outcome");
    if (outcome.next.step === "await" && answer.value.wait !== null) {
      generations.of(executionId).bind(outcome.next.wait.generation, String(answer.value.wait.generation));
    }
    return observe(executionId, { receiptToken: answer.value.receipt.token });
  };

  const openExchange = (executionId: string, what: string): { activationId: string; writerEpoch: number } => {
    const activation = viewOf(executionId).activation;
    if (activation === null) throw new Error(`${what} needs an open exchange to name, and the Execution has none`);
    return { activationId: activation.activationId, writerEpoch: activation.writerEpoch };
  };

  return {
    apply(command: Command): Observation {
      const problem = unsupportedCommand(command);
      if (problem !== null) throw new Error(`unsupported command reached apply: ${problem}`);
      switch (command.kind) {
        case "create":
        case "create_retry": {
          const answer = coordinator.createExecution(producerCaller(command.producer ?? producerOf(command.initialInput)), {
            creationKey: command.requestKey,
            scope: SCOPE,
            definitionRevision: command.definitionRevision,
            runtimeContractRevision: RUNTIME_CONTRACT_REVISION,
            progressCodec: PROGRESS_CODEC,
            authorityContext: canonicalBytes(null),
            initialInput: inputContent(command.initialInput),
          });
          if (!answer.ok) return observeRefusal(answer.error, "the create");
          executions.bind(command.executionId, answer.value.executionId);
          return observe(answer.value.executionId, { receiptToken: answer.value.receipt.token });
        }
        case "accept_event": {
          const event = command.event;
          const executionId = kernelExecution(event.destination);
          const content = inputContent(event);
          const answer = coordinator.submitInput(producerCaller(producerOf(event)), {
            destination: executionId,
            requestKey: (event as Extract<FixtureEvent, { category: "application_input" }>).requestKey,
            ...content,
          });
          if (answer.ok) return observe(executionId);
          if (answer.error.classification === "terminal_destination" && answer.error.executionId === executionId) {
            return observe(executionId, { ingressRefused: event.eventId });
          }
          return observeRefusal(answer.error, "the input");
        }
        case "dispatch": {
          const executionId = kernelExecution(command.executionId);
          const answer = coordinator.dispatch(LABORATORY, executionId, { bound: command.bound });
          if (!answer.ok) throw unexpected("dispatch", answer.error);
          return observe(executionId);
        }
        case "redeliver_dispatch": {
          const executionId = kernelExecution(command.executionId);
          const answer = coordinator.redeliver(LABORATORY, executionId);
          if (!answer.ok) throw unexpected("redelivery", answer.error);
          return observe(executionId);
        }
        case "submit_outcome":
        case "resubmit_outcome":
          return submit(command.outcome);
        case "accept_cancellation": {
          const executionId = kernelExecution(command.executionId);
          const answer = coordinator.cancelExecution(LABORATORY, executionId);
          if (!answer.ok) throw unexpected("cancellation", answer.error);
          return observe(executionId);
        }
        case "deliver_timer": {
          const executionId = kernelExecution(command.executionId);
          const minted = generations.of(executionId).idOf(command.generation);
          if (minted === null) {
            throw new Error(`deliver_timer names wait generation ${JSON.stringify(command.generation)}, which the Kernel never issued for this Execution`);
          }
          const generation = Number(minted);
          // Laboratory scheduling only: move the clock to this timer's own persisted deadline when the
          // Kernel lists it. The Kernel decides whether the fire does anything.
          for (const timer of coordinator.pendingTimers()) {
            if (timer.executionId === executionId && timer.kind === "wait_deadline" && timer.generation === generation) {
              now = Math.max(now, timer.deadline);
            }
          }
          const answer = coordinator.fireTimer({ executionId, kind: "wait_deadline", generation });
          if (answer.result !== "expired" && answer.result !== "duplicate" && answer.result !== "stale" && answer.result !== "not_due") {
            throw new Error(`the timer fire answered ${answer.result}: ${answer.reason}`);
          }
          if (answer.timeoutEventId !== null) timeouts.of(executionId).nameByCommand(command.timeoutEvent.eventId, answer.timeoutEventId);
          return observe(executionId);
        }
        case "recover": {
          const executionId = kernelExecution(command.executionId);
          const exchange = openExchange(executionId, "recover");
          const answer = coordinator.recoverExecution(LABORATORY, executionId, {
            activationId: exchange.activationId,
            available: {
              definitionRevisions: canonicalBytes([...command.availableDefinitionRevisions]),
              runtimeContractRevisions: canonicalBytes([RUNTIME_CONTRACT_REVISION]),
              progressCodecs: canonicalBytes([PROGRESS_CODEC]),
            },
          });
          if (!answer.ok) throw unexpected("recovery", answer.error);
          return observe(executionId);
        }
        case "takeover": {
          const executionId = kernelExecution(command.executionId);
          const exchange = openExchange(executionId, "takeover");
          const answer = coordinator.requestTakeover(LABORATORY, executionId, exchange);
          if (!answer.ok) throw unexpected("takeover", answer.error);
          return observe(executionId);
        }
        case "inspect":
          return observe(kernelExecution(command.executionId));
      }
    },
  };
}

/** Builds a candidate. Tests use the options; E1 uses `kernelCandidate`. */
export function createKernelCandidate(options: KernelCandidateOptions = {}): K0Candidate {
  return {
    name: "arrokothi-kernel-coordinator",
    begin: (scenario: Scenario, sink: OperationSink) => begin(options, scenario, sink),
  };
}

/** The candidate E1 pins: the real `ExecutionCoordinator` from the `@arrokothi/kernel` package root. */
export const kernelCandidate: K0Candidate = createKernelCandidate();
