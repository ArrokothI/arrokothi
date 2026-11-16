/**
 * K1.4-candidate — the real-Kernel candidate for the K0 public fixture.
 *
 * `kernelCandidate` implements the fixture's `K0Candidate` port by driving `ExecutionCoordinator`
 * through the `@arrokothi/kernel` package root, with a deterministic fake Driver and an injected clock.
 * It is test-side adapter code: it is not Kernel code and it changes no Kernel semantics.
 *
 * Design: `docs/development/work/K1.4-candidate/design-01.md`, as changed by
 * `design-01-addendum-01.md` and owner choice 02. Section numbers below (§A2 …) are that addendum's.
 * Identity rendering follows `design-03.md` and `design-03-addendum-01.md` (owner choice 04); "rule n"
 * below is design 03 §4's, with rules 4 and 5 as addendum 01 §A1 restates them.
 *
 * ## What this module may and may not do
 *
 * 1. **The Kernel decides.** Nothing here classifies, selects, deduplicates or compares content.
 *    `create` and `create_retry` make the same call, and so do `submit_outcome` and `resubmit_outcome`.
 * 2. **Bytes in.** Every laboratory value reaches the Kernel as canonical bytes (`canonical-json.ts`).
 * 3. **Fail visible.** A Kernel answer this module has no rule for makes `apply` throw, which the runner
 *    records as FAIL. So does an answer that contradicts the inspection made after it
 *    (`AnswerContradiction`), and a reference that denotes nothing (`UnknownLaboratoryReference`).
 * 4. **Blind.** `begin` reads the scenario's `id` and each step's `command`, to check that the Kernel has
 *    a surface for it (§A2). It never reads an expectation, and it keeps nothing from that scan.
 *
 * ## Conventions the owner adopted (they are the fixture's, not the Kernel's)
 *
 * - **`rejection`** (§A5): the most recent reportable Kernel refusal for an Execution, dropped when that
 *   Execution's episode key `(state, activationId, writerEpoch)` changes.
 * - **Unnamed timeout Event** (owner choice 02 Q2 b): a timeout the Kernel mints when a wait registers
 *   already due is offered the name `to-<laboratory name of its own generation>`, at that answer.
 * - **Clock** (§A9): starts at 1 and moves only to a listed pending deadline when `deliver_timer` fires it.
 *
 * ## Identity strings (design 03)
 *
 * The translated identity positions are `executionId`; `liveWaitGeneration` and
 * `waitEndedReadiness[].generation`; and every member of `acknowledged`, `queued`, `terminalDispositions`
 * and `dispatchedBatch`. Each is the value of a name ledger: one for Executions over the run, and for
 * each native Execution one for wait generations and one for Events, input and timeout alike.
 *
 * - A ledger's map from native ID to string is injective and never changes during a run. So within a
 *   run the same string means the same Kernel ID, and different strings mean different ones.
 * - A laboratory name attaches only when the Kernel answers the command that carries it, to the ID
 *   that answer names. An ID no answer announced, or whose offered name already denotes another ID,
 *   gets a fresh string: `kernel-<family>:<id>`, or its first free `~n` variant.
 * - A later command's reference resolves through the same ledger, so it addresses the ID every
 *   Observation shows under that string.
 *
 * Outside this: `ingressRefused` echoes the command's own name for an input the Kernel refused, since
 * no Event exists; Activation IDs, receipts and epochs pass through verbatim; `emissions` lists keys.
 * The claim is about IDs within one run. A wrong ID that is consistent from its first appearance takes
 * the offered name like any other.
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
  MailboxEntryView,
  RefusalRecord,
  SubmissionGrant,
  WaitOutcome,
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

// -- Declared failures --------------------------------------------------------

/** A command referred to an Execution or a wait generation by a string that denotes nothing in this run. */
export class UnknownLaboratoryReference extends Error {
  override readonly name = "UnknownLaboratoryReference";
}

/** Which row of design 03 addendum 01 §A1 a Kernel answer and the inspection after it disagree on. */
export type AnswerContradictionCode =
  | "execution"
  | "input_entry"
  | "input_payload"
  | "input_unoffered"
  | "wait_presence"
  | "wait_activation"
  | "wait_timeout"
  | "timeout_generation";

/**
 * A Kernel answer and the inspection made after it disagree. Thrown after the Kernel answered; nothing
 * is repaired and no other command is sent.
 */
export class AnswerContradiction extends Error {
  override readonly name = "AnswerContradiction";
  readonly code: AnswerContradictionCode;

  constructor(code: AnswerContradictionCode, detail: string) {
    super(`answer contradiction (${code}): ${detail}`);
    this.code = code;
  }
}

// -- Capability preflight (§A2) -----------------------------------------------

/**
 * Why the K1 Kernel has no surface for `command`, or `null` when it has one.
 *
 * Reads the command's kind, an Event's source category, and whether an `await` selects an Event by
 * identity (owner choice 04, OQ-2). It decides no selector match, envelope validity, replay or
 * acceptance.
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
    case "submit_outcome":
    case "resubmit_outcome": {
      // An Event's Kernel ID does not exist before the Kernel mints it, so this candidate has no way to
      // name an Event to the Kernel inside a declaration. K1 also has no Event such an alternative
      // could match (017 L-21). The string is never passed on untranslated.
      const next = command.outcome.next as { readonly step?: unknown; readonly wait?: { readonly dependencies?: unknown } | null };
      const alternatives: readonly unknown[] = next.step === "await" && Array.isArray(next.wait?.dependencies) ? next.wait.dependencies : [];
      const byIdentity = alternatives.some((alternative) => alternative !== null && typeof alternative === "object" && Object.hasOwn(alternative, "eventIdentity"));
      return byIdentity
        ? `${command.kind} declares a dependency alternative that selects an Event by identity, and this candidate cannot name an Event ` +
            `to the K1 Kernel before the Kernel has minted its ID (docs/development/017-known-limitations.md L-21, L-38)`
        : null;
    }
    case "dispatch":
    case "redeliver_dispatch":
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

// -- The name ledger (design 03 §3) ----------------------------------------------

/**
 * For one scope, the one-to-one map between Kernel-minted IDs and the strings Observations show.
 *
 * `assign` is the only writer. It records a pair only after finding that the string denotes nothing, and
 * no pair is ever changed or removed. So `#shown` is one injective function for the whole run, and
 * `#denotes` is its inverse. That holds whatever the strings look like: a laboratory name, a label and a
 * fresh string are all ordinary entries, checked the same way, in either arrival order.
 */
class Ledger {
  readonly #family: string;
  readonly #shown = new Map<string, string>();
  readonly #denotes = new Map<string, string>();
  /** The IDs shown under the name that was offered for them. */
  readonly #tookOffer = new Set<string>();

  constructor(family: string) {
    this.#family = family;
  }

  /**
   * The string for `id`. An ID that already has one keeps it, whatever is offered. Otherwise it takes
   * `preferred` if that string denotes nothing, and a fresh string if not.
   */
  assign(id: string, preferred: string | null): string {
    const already = this.#shown.get(id);
    if (already !== undefined) return already;
    const fresh = preferred === null || this.#denotes.has(preferred);
    const text = fresh ? this.#freshFor(id) : preferred;
    if (!fresh) this.#tookOffer.add(id);
    this.#shown.set(id, text);
    this.#denotes.set(text, id);
    return text;
  }

  /** The ID a string denotes: the inverse of what Observations show. */
  resolve(text: string): string | null {
    return this.#denotes.get(text) ?? null;
  }

  /** Whether `id` is shown under the name offered for it, and not under a fresh string. */
  tookOffer(id: string): boolean {
    return this.#tookOffer.has(id);
  }

  /** The Kernel's own spelling, or its first variant that denotes nothing. The ledger is finite, so this ends. */
  #freshFor(id: string): string {
    const base = `kernel-${this.#family}:${id}`;
    let text = base;
    for (let variant = 2; this.#denotes.has(text); variant += 1) text = `${base}~${variant}`;
    return text;
  }
}

/** One table per native Execution, created on first use. */
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

/** The laboratory name an input Event's payload carries, or `undefined` when it carries none. */
function carriedName(entry: MailboxEntryView): unknown {
  const payload = entry.payload as { readonly eventId?: unknown } | null;
  return payload !== null && typeof payload === "object" && !Array.isArray(payload) ? payload.eventId : undefined;
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

  const executions = new Ledger("execution");
  const generations = new ByExecution(() => new Ledger("generation"));
  /** Input and timeout Events share one ledger: they fill the same lists. */
  const events = new ByExecution(() => new Ledger("event"));
  /** Rule 5: the name each input Event was first offered, by Event ID. Kept apart from the shown string. */
  const offeredInputNames = new ByExecution(() => new Map<string, string>());
  /** Rule 4: what this command's Kernel answer claims, to be checked against the inspection after it. */
  let claims: ((view: ExecutionView) => void)[] = [];
  const rejections = new Map<string, RejectionMemory>();

  /** The Kernel ID an Execution string denotes (rule 6). A string that denotes nothing has nothing to address. */
  const kernelExecution = (name: string): string => {
    const id = executions.resolve(name);
    if (id === null) throw new UnknownLaboratoryReference(`the command names Execution ${JSON.stringify(name)}, which the Kernel has not created in this run`);
    return id;
  };

  const viewOf = (executionId: string): ExecutionView => {
    const answer = coordinator.inspect(LABORATORY, executionId);
    if (!answer.ok) throw new Error(`inspect was refused (${answer.error.classification}): ${answer.error.reason}`);
    if (answer.value.executionId !== executionId) {
      throw new AnswerContradiction("execution", `the inspection of ${executionId} describes ${answer.value.executionId}`);
    }
    return answer.value;
  };

  // -- Rule 4: one answer against one inspection (addendum 01 §A1) ------------------------------------------

  /** An accepted input answer named `eventId` for a command whose Event name is `name`. */
  const claimInput = (eventId: string, name: string) => (view: ExecutionView): void => {
    const entry = view.mailbox.find((candidate) => candidate.eventId === eventId);
    if (entry === undefined || entry.sourceCategory !== "application_input") {
      throw new AnswerContradiction("input_entry", `the answer names input Event ${eventId}, which the inspection does not hold as application input`);
    }
    if (carriedName(entry) !== name) {
      throw new AnswerContradiction("input_payload", `the answer names Event ${eventId} for the command's ${JSON.stringify(name)}, and its payload carries another name`);
    }
  };

  /** A fire of `generation` answered with `answered`: that generation's one timeout entry, or none. */
  const claimTimer = (generation: number, answered: string | null) => (view: ExecutionView): void => {
    const held = view.mailbox.filter((entry) => entry.sourceCategory === "kernel_timeout" && entry.waitGeneration === generation);
    const agrees = answered === null ? held.length === 0 : held.length === 1 && held[0]?.eventId === answered;
    if (!agrees) {
      throw new AnswerContradiction(
        "timeout_generation",
        `the fire of generation ${generation} answered ${answered === null ? "no timeout Event" : answered}, and the inspection holds ` +
          `${held.length === 0 ? "no timeout Event" : held.map((entry) => entry.eventId).join(", ")} for that generation`,
      );
    }
  };

  /** An accepted Outcome of `activationId` answered with `wait`. */
  const claimWait = (activationId: string, declaredAwait: boolean, wait: WaitOutcome | null) => (view: ExecutionView): void => {
    if ((wait !== null) !== declaredAwait) {
      throw new AnswerContradiction("wait_presence", `the accepted Outcome ${declaredAwait ? "declared a wait and the answer has none" : "declared no wait and the answer has one"}`);
    }
    if (wait === null) return;
    const live = view.wait !== null && view.wait.generation === wait.generation ? view.wait : null;
    const retired = view.retiredWaits.find((candidate) => candidate.generation === wait.generation) ?? null;
    const registeredBy = live !== null ? live.registeredBy : retired !== null ? retired.registeredBy : null;
    if (registeredBy !== activationId) {
      throw new AnswerContradiction(
        "wait_activation",
        `the answer names wait generation ${wait.generation} for Activation ${activationId}, and the inspection records it as registered by ${registeredBy ?? "nobody"}`,
      );
    }
    if (wait.result === "expired" && wait.timeoutEventId === null) {
      throw new AnswerContradiction("wait_timeout", `the answer says generation ${wait.generation} expired at registration and names no timeout Event`);
    }
    if (wait.timeoutEventId !== null) {
      const timeoutEventId = wait.timeoutEventId;
      const entry = view.mailbox.find((candidate) => candidate.eventId === timeoutEventId);
      const belongs =
        entry !== undefined &&
        entry.sourceCategory === "kernel_timeout" &&
        entry.waitGeneration === wait.generation &&
        retired !== null &&
        retired.endingEventId === timeoutEventId;
      if (!belongs) {
        throw new AnswerContradiction("timeout_generation", `the answer names timeout Event ${timeoutEventId} for generation ${wait.generation}, and the inspection does not hold it as that generation's`);
      }
    }
  };

  /** The string of a wait generation (rule 3: printing offers nothing). */
  const generationName = (executionId: string, generation: number): string => generations.of(executionId).assign(String(generation), null);

  /** The string of each mailbox entry, by Kernel Event ID, in mailbox order (rules 3 and 5). */
  const eventNames = (view: ExecutionView): Map<string, string> => {
    const names = new Map<string, string>();
    const ledger = events.of(view.executionId);
    const offered = offeredInputNames.of(view.executionId);
    for (const entry of view.mailbox) {
      if (entry.sourceCategory === "application_input") {
        // The name travels in the payload so that "same content" means what the fixture means. It is
        // checked against the name that was offered, and never read as the Event's name.
        const name = offered.get(entry.eventId);
        if (name === undefined) throw new AnswerContradiction("input_unoffered", `the inspection holds input Event ${entry.eventId}, which no answer named`);
        if (carriedName(entry) !== name) throw new AnswerContradiction("input_payload", `the payload of Event ${entry.eventId} no longer carries the name it was offered`);
      }
      const text = ledger.assign(entry.eventId, null);
      names.set(entry.eventId, text);
    }
    return names;
  };

  /** One inspection after the command, joined with what the command's own answer said. */
  const observe = (executionId: string, facts: AnswerFacts = {}): Observation => {
    const view = viewOf(executionId);
    for (const claim of claims) claim(view);
    const names = eventNames(view);
    const name = (eventId: string): string => names.get(eventId) ?? events.of(view.executionId).assign(eventId, null);
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
      executionId: executions.assign(view.executionId, null),
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
    const wait = answer.value.wait;
    claims.push(claimWait(outcome.activationId, outcome.next.step === "await", wait));
    if (outcome.next.step === "await" && wait !== null) {
      const generationLedger = generations.of(executionId);
      const key = String(wait.generation);
      const shownGeneration = generationLedger.assign(key, outcome.next.wait.generation);
      if (wait.timeoutEventId !== null) {
        // Owner choice 02 Q2 b: a timeout minted at registration is offered its generation's label,
        // here, at the answer that announces it, and only if the generation took its laboratory name.
        const eventLedger = events.of(executionId);
        const label = generationLedger.tookOffer(key) ? `to-${shownGeneration}` : null;
        eventLedger.assign(wait.timeoutEventId, label);
      }
    }
    return observe(executionId, { receiptToken: answer.value.receipt.token });
  };

  const openExchange = (executionId: string, what: string): { activationId: string; writerEpoch: number } => {
    const activation = viewOf(executionId).activation;
    if (activation === null) throw new Error(`${what} needs an open exchange to name, and the Execution has none`);
    return { activationId: activation.activationId, writerEpoch: activation.writerEpoch };
  };

  /** An accepted input answer: the offer (rule 2), the retained offered name (rule 5) and the claim (rule 4). */
  const offerInput = (executionId: string, eventId: string, name: string): void => {
    events.of(executionId).assign(eventId, name);
    const offered = offeredInputNames.of(executionId);
    if (!offered.has(eventId)) offered.set(eventId, name);
    claims.push(claimInput(eventId, name));
  };

  return {
    apply(command: Command): Observation {
      const problem = unsupportedCommand(command);
      if (problem !== null) throw new Error(`unsupported command reached apply: ${problem}`);
      claims = [];
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
          executions.assign(answer.value.executionId, command.executionId);
          offerInput(answer.value.executionId, answer.value.initialEventId, command.initialInput.eventId);
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
          if (answer.ok) {
            offerInput(executionId, answer.value.eventId, event.eventId);
            return observe(executionId);
          }
          if (answer.error.classification === "terminal_destination" && answer.error.executionId === executionId) {
            // No Event was accepted, so there is no Kernel ID and no ledger entry: the command's own name is echoed.
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
          const minted = generations.of(executionId).resolve(command.generation);
          if (minted === null) {
            throw new UnknownLaboratoryReference(`deliver_timer names wait generation ${JSON.stringify(command.generation)}, which the Kernel never issued for this Execution`);
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
          claims.push(claimTimer(generation, answer.timeoutEventId));
          if (answer.timeoutEventId !== null) events.of(executionId).assign(answer.timeoutEventId, command.timeoutEvent.eventId);
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
