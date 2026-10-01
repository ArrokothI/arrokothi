/**
 * The scenarios of the DEC-9 fault-injection sweep (contract revision 10): its declared scope.
 *
 * One scenario per exit of `recoverExecution`, `reportProtocolFailure`, `requestTakeover` and
 * `submitOutcome`, with a second scenario where an exit is reached from a materially different state
 * (a hold beside another hold, a hidden versus an unknown Execution, a missing versus a usable
 * Activation identity). Each names the exit its uninjected call must take: the method whose `return`
 * it executes and a snippet unique to that return among the method's returns, as `fault-oracle.ts`'s
 * exit inventory renders them (the enclosing `if` conditions, then the returned expression). The
 * sweep checks that the call takes it, and that each exit the inventory finds is taken by some
 * scenario.
 *
 * The five `takeover: refused, the safety callback …` scenarios are review 12's reentry exits: the
 * Driver's `isSafeToReplace` makes a nested decision and then returns true, and the takeover's
 * revalidation refuses. The callback is trusted Driver code, not part of the call under test:
 * `Hooks` lets the sweep suspend fault injection and exit coverage while it runs, so the swept
 * operations are the takeover's own, and each nested decision is itself a scenario of its own control.
 *
 * The module imports no Kernel code at load: `faultKit` receives the Kernel and the harness, so
 * `fault-child.ts` can import them only after it has wrapped the built-ins.
 */

import type * as KernelModule from "../../src/index.ts";
import type * as HarnessModule from "../harness.ts";
import type { Control, Expect, State } from "./fault-oracle.ts";

type Kernel = InstanceType<typeof KernelModule.ExecutionCoordinator>;

export interface Env {
  readonly kernel: Kernel;
  readonly driver: ReturnType<typeof HarnessModule.recordingDriver>;
  readonly who: ReturnType<typeof HarnessModule.caller>;
  readonly executionId: string;
  readonly open: { readonly activationId: string; readonly writerEpoch: number; readonly baseProgressRevision: number };
  /** The answer of an Outcome the setup accepted, for the exact replay. */
  setupAnswer: unknown;
}

export type Call = () => { ok: boolean; value?: unknown; error?: unknown };

export interface Scenario {
  readonly name: string;
  readonly control: Control;
  readonly expect: Expect;
  /** The method whose `return` the uninjected call executes, and a snippet unique to it. */
  readonly exit: readonly [method: string, snippet: string];
  readonly setup: (env: Env) => void;
  /** Builds the call's arguments (outside the swept call) and returns the call itself. */
  readonly call: (env: Env) => Call;
  /** A request the same call may legitimately be answered as when a contained fault makes a field unreadable. */
  readonly alternate?: (env: Env) => Call;
  /** The nested decision the Driver's safety callback makes before it returns true. */
  readonly callback?: (env: Env) => void;
  readonly unsafeDriver?: boolean;
  readonly emissionsPerOutcome?: number;
  /** Review 11's exact setup: no input accepted after the reservation. */
  readonly bare?: boolean;
}

/** Suspends the sweep around the Driver's safety callback. */
export interface Hooks {
  enterCallback(): void;
  exitCallback(): void;
}

const AVAILABLE = { definitionRevisions: ["weekly-report@3"], runtimeContractRevisions: ["runtime-contract@1"], progressCodecs: ["inline-json@1"] };
const MISSING_DEFINITION = { ...AVAILABLE, definitionRevisions: [] as string[] };
const MISSING_CODEC = { ...AVAILABLE, progressCodecs: [] as string[] };
const refused = (classification: string): Expect => ({ refused: classification });

export function faultKit(kernel: typeof KernelModule, harness: typeof HarnessModule, hooks: Hooks) {
  const { ExecutionCoordinator } = kernel;

  const codeHold = (env: Env, available = MISSING_DEFINITION): void => {
    harness.accepted(env.kernel.recoverExecution(env.who, env.executionId, { activationId: env.open.activationId, available }));
  };
  const protocolHold = (env: Env): void => {
    harness.accepted(env.kernel.reportProtocolFailure(env.who, env.executionId, { activationId: env.open.activationId, writerEpoch: 1, diagnostic: "setup" }));
  };
  const outcome = (env: Env, overrides: Record<string, unknown> = {}) => harness.outcomeFor(env.executionId, env.open, overrides);
  const grant = (env: Env) => harness.submissionFor(env.driver, env.open.activationId);
  const answerOutcome = (env: Env, overrides: Record<string, unknown> = {}): void => {
    env.setupAnswer = harness.accepted(env.kernel.submitOutcome(env.who, outcome(env, overrides), grant(env)));
  };
  const complete = (env: Env): void => answerOutcome(env, { next: { step: "complete", result: { done: true } } });
  const nothing = (): void => {};

  const hidden = () => harness.caller("hidden", "other-scope");
  const recover = (available: typeof AVAILABLE, activationId?: string) => (env: Env): Call => {
    const request = { activationId: activationId ?? env.open.activationId, available };
    return () => env.kernel.recoverExecution(env.who, env.executionId, request);
  };
  const report = (fields: Record<string, unknown> = { diagnostic: "unclassifiable" }, activationId?: string) => (env: Env): Call => {
    const request = { activationId: activationId ?? env.open.activationId, writerEpoch: 1, ...fields } as never;
    return () => env.kernel.reportProtocolFailure(env.who, env.executionId, request);
  };
  const takeover = (writerEpoch = 1, activationId?: string) => (env: Env): Call => {
    const request = { activationId: activationId ?? env.open.activationId, writerEpoch };
    return () => env.kernel.requestTakeover(env.who, env.executionId, request);
  };
  /** An Outcome submission whose envelope and grant are built before the call. */
  const submit = (overrides: Record<string, unknown> = {}, copyGrant = false) => (env: Env): Call => {
    const envelope = outcome(env, overrides);
    const presented = copyGrant ? { ...grant(env) } : grant(env);
    return () => env.kernel.submitOutcome(env.who, envelope, presented);
  };
  /** A control call from a caller that cannot see the Execution (`hidden`) or naming none (`unknown`). */
  const unseen = (control: Control, how: "hidden" | "unknown") => (env: Env): Call => {
    const who = how === "hidden" ? hidden() : env.who;
    const executionId = how === "hidden" ? env.executionId : "no-such-execution";
    const activationId = env.open.activationId;
    if (control === "recoverExecution") return () => env.kernel.recoverExecution(who, executionId, { activationId, available: MISSING_DEFINITION });
    if (control === "reportProtocolFailure") return () => env.kernel.reportProtocolFailure(who, executionId, { activationId, writerEpoch: 1, diagnostic: "x" });
    if (control === "requestTakeover") return () => env.kernel.requestTakeover(who, executionId, { activationId, writerEpoch: 1 });
    const envelope = outcome(env, { executionId });
    const presented = grant(env);
    return () => env.kernel.submitOutcome(who, envelope, presented);
  };
  /** A control call from a caller that can see the Execution but holds no control power. */
  const asObserver = (control: "recoverExecution" | "reportProtocolFailure" | "requestTakeover") => (env: Env): Call => {
    const who = harness.observer("fault");
    const activationId = env.open.activationId;
    if (control === "recoverExecution") return () => env.kernel.recoverExecution(who, env.executionId, { activationId, available: MISSING_DEFINITION });
    if (control === "reportProtocolFailure") return () => env.kernel.reportProtocolFailure(who, env.executionId, { activationId, writerEpoch: 1, diagnostic: "x" });
    return () => env.kernel.requestTakeover(who, env.executionId, { activationId, writerEpoch: 1 });
  };

  const UNNAMED = "record === null → return err(this.#refusal(\"unknown_destination\"";
  const NOT_THE_OPEN = "is not the unresolved exchange of Execution";
  const NO_OPEN = "has no unresolved Activation to";
  const ENDED = "there is no exchange to ${verb}";
  const NO_CONTROL = "holds no control power over its scope";
  const UNUSABLE = "The proposal's Activation identity was not usable;";
  const USABLE = "`Outcome for Activation ${diagnosticIdentity(activationId)}";

  const SCENARIOS: readonly Scenario[] = [
    // -- recoverExecution: 14 --------------------------------------------------------------------
    { name: "recover: enter a code hold", control: "recoverExecution", expect: "accepted", exit: ["recoverExecution", "return answer;"], setup: nothing, call: recover(MISSING_DEFINITION) },
    { name: "recover: update a code hold", control: "recoverExecution", expect: "accepted", exit: ["recoverExecution", "return answer;"], setup: (env) => codeHold(env), call: recover(MISSING_CODEC) },
    { name: "recover: clear a code hold", control: "recoverExecution", expect: "accepted", exit: ["recoverExecution", "return answer;"], setup: (env) => codeHold(env), call: recover(AVAILABLE) },
    { name: "recover: nothing to change", control: "recoverExecution", expect: "unchanged", exit: ["recoverExecution", "changed: false"], setup: nothing, call: recover(AVAILABLE) },
    { name: "recover: the same hold again (idempotent)", control: "recoverExecution", expect: "unchanged", exit: ["recoverExecution", "changed: false"], setup: (env) => codeHold(env), call: recover(MISSING_DEFINITION) },
    { name: "recover: enter a code hold beside a protocol hold", control: "recoverExecution", expect: "accepted", exit: ["recoverExecution", "return answer;"], setup: protocolHold, call: recover(MISSING_DEFINITION) },
    { name: "recover: clear a code hold beside a protocol hold", control: "recoverExecution", expect: "accepted", exit: ["recoverExecution", "return answer;"], setup: (env) => { protocolHold(env); codeHold(env); }, call: recover(AVAILABLE) },
    { name: "recover: refused, unknown Execution", control: "recoverExecution", expect: "unnamed", exit: ["recoverExecution", UNNAMED], setup: nothing, call: unseen("recoverExecution", "unknown") },
    { name: "recover: refused, Execution hidden from the caller", control: "recoverExecution", expect: "unnamed", exit: ["recoverExecution", UNNAMED], setup: nothing, call: unseen("recoverExecution", "hidden") },
    { name: "recover: refused without control power", control: "recoverExecution", expect: refused("unauthorized_control"), exit: ["#requireControl", NO_CONTROL], setup: nothing, call: asObserver("recoverExecution") },
    { name: "recover: refused malformed request", control: "recoverExecution", expect: refused("malformed_value"), exit: ["recoverExecution", "recovery request is not acceptable"], setup: nothing, call: (env) => { const request = { activationId: env.open.activationId } as never; return () => env.kernel.recoverExecution(env.who, env.executionId, request); } },
    { name: "recover: refused stale Activation", control: "recoverExecution", expect: refused("stale_exchange"), exit: ["#openExchange", NOT_THE_OPEN], setup: nothing, call: recover(MISSING_DEFINITION, "no-such-activation") },
    { name: "recover: refused with no unresolved exchange", control: "recoverExecution", expect: refused("no_unresolved_exchange"), exit: ["#openExchange", NO_OPEN], setup: (env) => answerOutcome(env), call: recover(MISSING_DEFINITION) },
    { name: "recover: refused after the Execution ended", control: "recoverExecution", expect: refused("terminal_destination"), exit: ["#openExchange", ENDED], setup: complete, call: recover(MISSING_DEFINITION) },

    // -- reportProtocolFailure: 12 ---------------------------------------------------------------
    { name: "report: enter a protocol hold", control: "reportProtocolFailure", expect: "accepted", exit: ["reportProtocolFailure", "return answer;"], setup: nothing, call: report(), alternate: report({ diagnostic: 0 }) },
    { name: "report: enter a protocol hold without a diagnostic", control: "reportProtocolFailure", expect: "accepted", exit: ["reportProtocolFailure", "return answer;"], setup: nothing, call: report({}) },
    { name: "report: enter a protocol hold beside a code hold", control: "reportProtocolFailure", expect: "accepted", exit: ["reportProtocolFailure", "return answer;"], setup: (env) => codeHold(env), call: report(), alternate: report({ diagnostic: 0 }) },
    { name: "report: the same hold again (idempotent)", control: "reportProtocolFailure", expect: "unchanged", exit: ["reportProtocolFailure", "changed: false"], setup: protocolHold, call: report() },
    { name: "report: refused, unknown Execution", control: "reportProtocolFailure", expect: "unnamed", exit: ["reportProtocolFailure", UNNAMED], setup: nothing, call: unseen("reportProtocolFailure", "unknown") },
    { name: "report: refused, Execution hidden from the caller", control: "reportProtocolFailure", expect: "unnamed", exit: ["reportProtocolFailure", UNNAMED], setup: nothing, call: unseen("reportProtocolFailure", "hidden") },
    { name: "report: refused without control power", control: "reportProtocolFailure", expect: refused("unauthorized_control"), exit: ["#requireControl", NO_CONTROL], setup: nothing, call: asObserver("reportProtocolFailure") },
    { name: "report: refused malformed report", control: "reportProtocolFailure", expect: refused("malformed_value"), exit: ["reportProtocolFailure", "protocol-failure report is not acceptable"], setup: nothing, call: report({ writerEpoch: "one" }) },
    { name: "report: refused stale Activation", control: "reportProtocolFailure", expect: refused("stale_exchange"), exit: ["#openExchange", NOT_THE_OPEN], setup: nothing, call: report(undefined, "no-such-activation") },
    { name: "report: refused with no unresolved exchange", control: "reportProtocolFailure", expect: refused("no_unresolved_exchange"), exit: ["#openExchange", NO_OPEN], setup: (env) => answerOutcome(env), call: report() },
    { name: "report: refused after the Execution ended", control: "reportProtocolFailure", expect: refused("terminal_destination"), exit: ["#openExchange", ENDED], setup: complete, call: report() },
    { name: "report: refused stale writer epoch", control: "reportProtocolFailure", expect: refused("stale_exchange"), exit: ["reportProtocolFailure", "a superseded attempt cannot hold the exchange"], setup: nothing, call: report({ writerEpoch: 2, diagnostic: "stale" }) },

    // -- requestTakeover: 17 ---------------------------------------------------------------------
    { name: "takeover: accepted (review 11's seed)", control: "requestTakeover", expect: "accepted", exit: ["requestTakeover", "return answer;"], setup: nothing, call: takeover(), bare: true },
    { name: "takeover: accepted, clearing a protocol hold", control: "requestTakeover", expect: "accepted", exit: ["requestTakeover", "return answer;"], setup: protocolHold, call: takeover() },
    { name: "takeover: refused, unknown Execution", control: "requestTakeover", expect: "unnamed", exit: ["requestTakeover", UNNAMED], setup: nothing, call: unseen("requestTakeover", "unknown") },
    { name: "takeover: refused, Execution hidden from the caller", control: "requestTakeover", expect: "unnamed", exit: ["requestTakeover", UNNAMED], setup: nothing, call: unseen("requestTakeover", "hidden") },
    { name: "takeover: refused without control power", control: "requestTakeover", expect: refused("unauthorized_control"), exit: ["#requireControl", NO_CONTROL], setup: nothing, call: asObserver("requestTakeover") },
    { name: "takeover: refused malformed request", control: "requestTakeover", expect: refused("malformed_value"), exit: ["requestTakeover", "takeover request is not acceptable"], setup: nothing, call: (env) => { const request = { activationId: env.open.activationId } as never; return () => env.kernel.requestTakeover(env.who, env.executionId, request); } },
    { name: "takeover: refused stale Activation", control: "requestTakeover", expect: refused("stale_exchange"), exit: ["#openExchange", NOT_THE_OPEN], setup: nothing, call: takeover(1, "no-such-activation") },
    { name: "takeover: refused with no unresolved exchange", control: "requestTakeover", expect: refused("no_unresolved_exchange"), exit: ["#openExchange", NO_OPEN], setup: (env) => answerOutcome(env), call: takeover() },
    { name: "takeover: refused after the Execution ended", control: "requestTakeover", expect: refused("terminal_destination"), exit: ["#openExchange", ENDED], setup: complete, call: takeover() },
    { name: "takeover: refused stale writer epoch", control: "requestTakeover", expect: refused("stale_exchange"), exit: ["requestTakeover", "is not the current epoch ${currentEpoch} of Activation"], setup: nothing, call: takeover(2) },
    { name: "takeover: refused while a code hold stands", control: "requestTakeover", expect: refused("recovery_held"), exit: ["requestTakeover", "${exchange.codeHold.reason}"], setup: (env) => codeHold(env), call: takeover() },
    { name: "takeover: refused by a Driver that cannot replace safely", control: "requestTakeover", expect: refused("unsafe_replacement"), exit: ["requestTakeover", "the Driver did not establish"], setup: nothing, call: takeover(), unsafeDriver: true },
    // Review 12's five reentry exits: the safety callback decides, then the revalidation refuses.
    { name: "takeover: refused, the safety callback ended the Execution", control: "requestTakeover", expect: refused("terminal_destination"), exit: ["requestTakeover", "there is no exchange to take over"], setup: nothing, call: takeover(), callback: (env) => answerOutcome(env, { next: { step: "complete", result: null } }) },
    { name: "takeover: refused, the safety callback resolved the exchange", control: "requestTakeover", expect: refused("no_unresolved_exchange"), exit: ["requestTakeover", "resolved while establishing safe replacement"], setup: nothing, call: takeover(), callback: (env) => answerOutcome(env) },
    { name: "takeover: refused, the safety callback dispatched a different exchange", control: "requestTakeover", expect: refused("stale_exchange"), exit: ["requestTakeover", NOT_THE_OPEN], setup: nothing, call: takeover(), callback: (env) => { answerOutcome(env); harness.accepted(env.kernel.dispatch(env.who, env.executionId, { bound: 1 })); } },
    { name: "takeover: refused, the safety callback took the exchange over itself", control: "requestTakeover", expect: refused("stale_exchange"), exit: ["requestTakeover", "is not the current epoch ${exchange.activation.writerEpoch}"], setup: nothing, call: takeover(), callback: (env) => { harness.accepted(env.kernel.requestTakeover(env.who, env.executionId, { activationId: env.open.activationId, writerEpoch: 1 })); } },
    { name: "takeover: refused, the safety callback held the exchange's code", control: "requestTakeover", expect: refused("recovery_held"), exit: ["requestTakeover", "${postCallbackHold.reason}"], setup: nothing, call: takeover(), callback: (env) => codeHold(env) },

    // -- submitOutcome: 23 -----------------------------------------------------------------------
    { name: "outcome: continue", control: "submitOutcome", expect: "accepted", exit: ["submitOutcome", "return ok(this.#accept("], setup: nothing, call: submit() },
    { name: "outcome: complete with an Emission and a queued outside-batch input", control: "submitOutcome", expect: "accepted", exit: ["submitOutcome", "return ok(this.#accept("], setup: nothing, call: submit({ next: { step: "complete", result: { done: true } }, emissions: [{ emissionKey: "e", value: { output: true } }] }) },
    { name: "outcome: fail", control: "submitOutcome", expect: "accepted", exit: ["submitOutcome", "return ok(this.#accept("], setup: nothing, call: submit({ next: { step: "fail", error: { reason: "x" } } }) },
    { name: "outcome: continue, ending a code and a protocol hold", control: "submitOutcome", expect: "accepted", exit: ["submitOutcome", "return ok(this.#accept("], setup: (env) => { codeHold(env); protocolHold(env); }, call: submit() },
    { name: "outcome: exact replay", control: "submitOutcome", expect: "replayed", exit: ["submitOutcome", "replayed: true"], setup: (env) => answerOutcome(env), call: submit() },
    { name: "outcome: refused conflicting replay", control: "submitOutcome", expect: refused("duplicate_conflict"), exit: ["submitOutcome", "was already accepted with different content"], setup: (env) => answerOutcome(env), call: submit({ progress: { phase: "other" } }) },
    { name: "outcome: refused, the destination cannot be read", control: "submitOutcome", expect: "unnamed", exit: ["submitOutcome", "executionSeen.threw →"], setup: nothing, call: (env) => {
      const envelope = outcome(env);
      Object.defineProperty(envelope, "executionId", { get(): never { throw new Error("unreadable destination"); }, enumerable: true });
      const presented = grant(env);
      return () => env.kernel.submitOutcome(env.who, envelope, presented);
    } },
    { name: "outcome: refused, unknown Execution", control: "submitOutcome", expect: "unnamed", exit: ["submitOutcome", UNNAMED], setup: nothing, call: unseen("submitOutcome", "unknown") },
    { name: "outcome: refused, Execution hidden from the caller", control: "submitOutcome", expect: "unnamed", exit: ["submitOutcome", UNNAMED], setup: nothing, call: unseen("submitOutcome", "hidden") },
    { name: "outcome: refused after the Execution ended", control: "submitOutcome", expect: refused("terminal_destination"), exit: ["submitOutcome", "no further Outcome can be accepted for it"], setup: complete, call: submit({ activationId: "no-such-activation" }) },
    { name: "outcome: refused with no unresolved exchange", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", "intent === null && identityUsable →"], setup: (env) => answerOutcome(env), call: submit({ activationId: "no-such-activation" }) },
    { name: "outcome: refused with no unresolved exchange, identity unusable", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", `${UNUSABLE} it is not the unresolved exchange`], setup: (env) => answerOutcome(env), call: submit({ activationId: 42 }) },
    { name: "outcome: refused stale Activation", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", "intent.activation.activationId !== activationId →"], setup: nothing, call: submit({ activationId: "no-such-activation" }) },
    { name: "outcome: refused stale writer epoch", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", `${USABLE}: writer epoch`], setup: nothing, call: submit({ writerEpoch: 2 }) },
    { name: "outcome: refused stale writer epoch, identity unusable", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", `${UNUSABLE} writer epoch`], setup: nothing, call: submit({ activationId: 42, writerEpoch: 2 }) },
    { name: "outcome: refused stale base revision", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", `${USABLE}: base progress revision`], setup: nothing, call: submit({ baseProgressRevision: 99 }) },
    { name: "outcome: refused stale base revision, identity unusable", control: "submitOutcome", expect: refused("stale_exchange"), exit: ["submitOutcome", `${UNUSABLE} base progress revision`], setup: nothing, call: submit({ activationId: 42, baseProgressRevision: 99 }) },
    { name: "outcome: refused without the attempt's grant", control: "submitOutcome", expect: refused("unauthorized_submission"), exit: ["submitOutcome", `${USABLE} presents no submission authority`], setup: nothing, call: submit({}, true) },
    { name: "outcome: refused without the attempt's grant, identity unusable", control: "submitOutcome", expect: refused("unauthorized_submission"), exit: ["submitOutcome", `${UNUSABLE} the proposal presents no submission authority`], setup: nothing, call: submit({ activationId: 42 }, true) },
    { name: "outcome: refused over the Emission capacity", control: "submitOutcome", expect: refused("capacity_exhausted"), exit: ["submitOutcome", "`the Outcome for Activation ${diagnosticIdentity(activationId)} carries"], setup: nothing, emissionsPerOutcome: 1, call: submit({ emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }] }) },
    { name: "outcome: refused over the Emission capacity, identity unusable", control: "submitOutcome", expect: refused("capacity_exhausted"), exit: ["submitOutcome", `${UNUSABLE} the Outcome carries`], setup: nothing, emissionsPerOutcome: 1, call: submit({ activationId: 42, emissions: [{ emissionKey: "a", value: 1 }, { emissionKey: "b", value: 2 }] }) },
    { name: "outcome: refused malformed content", control: "submitOutcome", expect: refused("malformed_envelope"), exit: ["submitOutcome", `${USABLE} refused whole`], setup: nothing, call: submit({ progress: Number.NaN }) },
    { name: "outcome: refused malformed content, identity unusable", control: "submitOutcome", expect: refused("malformed_envelope"), exit: ["submitOutcome", `${UNUSABLE} the Outcome is refused whole`], setup: nothing, call: submit({ activationId: 42 }) },
  ];

  /**
   * A fresh coordinator with one dispatched exchange (and, unless `bare`, an input accepted after the
   * reservation, so a terminal Outcome has an outside-batch Event to dispose), after the scenario's
   * setup. With `hook`, the scenario's safety callback is installed on the Driver.
   */
  const fresh = (scenario: Scenario, hook = true): Env => {
    const driver = scenario.unsafeDriver === true ? (harness.unsafeDriver() as unknown as ReturnType<typeof harness.recordingDriver>) : harness.recordingDriver();
    const coordinator = new ExecutionCoordinator(scenario.emissionsPerOutcome === undefined ? { driver } : { driver, emissionsPerOutcome: scenario.emissionsPerOutcome });
    const who = harness.caller("fault", "tenant-a");
    const { executionId } = harness.accepted(coordinator.createExecution(who, harness.createRequest()));
    const open = harness.accepted(coordinator.dispatch(who, executionId, { bound: 1 }));
    if (scenario.bare !== true) {
      harness.accepted(coordinator.submitInput(who, { destination: executionId, requestKey: "outside-batch", kind: "update", payload: { newer: true } }));
    }
    const env: Env = { kernel: coordinator, driver, who, executionId, open, setupAnswer: null };
    scenario.setup(env);
    const decide = scenario.callback;
    if (decide !== undefined && hook) {
      const host = driver as { isSafeToReplace?: () => boolean };
      host.isSafeToReplace = () => {
        hooks.enterCallback();
        try {
          host.isSafeToReplace = () => true;
          decide(env);
        } finally {
          hooks.exitCallback();
        }
        return true;
      };
    }
    return env;
  };

  /**
   * The Execution's retained state as far as the boundary can show it: the whole view; the positions
   * the next refusal and the next accepted input receive (neither index is in the view); and what the
   * grant the Driver received at setup can still do (a `continue` Outcome for the setup exchange at its
   * first epoch, presented with that grant), since no grant is in the view either.
   */
  const observe = (env: Env, setupGrant: KernelModule.SubmissionGrant | undefined): State => {
    const view = harness.accepted(env.kernel.inspect(env.who, env.executionId));
    const refusal = env.kernel.submitInput(env.who, { destination: env.executionId, requestKey: "probe-refusal", kind: 42 as never, payload: null });
    if (refusal.ok) throw new Error("the refusal probe was accepted");
    const acceptance = env.kernel.submitInput(env.who, { destination: env.executionId, requestKey: "probe-acceptance", kind: "probe", payload: null });
    let grantAnswer = "no setup grant";
    if (setupGrant !== undefined) {
      const answer = env.kernel.submitOutcome(env.who, harness.outcomeFor(env.executionId, env.open, { progress: { probe: true } }), setupGrant);
      grantAnswer = answer.ok ? `accepted at ${answer.value.receipt.position}` : answer.error.classification;
    }
    return {
      view,
      nextRefusal: refusal.error.position,
      nextAcceptance: acceptance.ok ? acceptance.value.receipt.position : acceptance.error.classification,
      setupGrant: grantAnswer,
    };
  };

  /** The grant the Driver received with the setup exchange's first attempt. */
  const setupGrantOf = (env: Env) => env.driver.submissions[0];

  /** The no-call baseline of a safety-callback scenario: the callback's own decision, with no outer call. */
  const callbackBaseline = (scenario: Scenario): State => {
    const env = fresh(scenario, false);
    const decide = scenario.callback;
    if (decide === undefined) throw new Error(`${scenario.name} has no safety callback`);
    (env.driver as { isSafeToReplace?: () => boolean }).isSafeToReplace = () => true;
    decide(env);
    return observe(env, setupGrantOf(env));
  };

  /** The refusal a request naming no visible Execution receives, from a clean call. */
  const unnamedRefusal = (): KernelModule.RefusalRecord => {
    const coordinator = new ExecutionCoordinator({ driver: harness.recordingDriver() });
    return harness.refused(coordinator.inspect(harness.caller("fault", "tenant-a"), "no-such-execution"));
  };

  /** The failure reason the Kernel records when a Driver throws a non-string, from a clean call. */
  const deliveryFailure = (): string => {
    const coordinator = new ExecutionCoordinator({ driver: harness.throwingDriver() });
    const who = harness.caller("fault", "tenant-a");
    const { executionId } = harness.accepted(coordinator.createExecution(who, harness.createRequest()));
    harness.accepted(coordinator.dispatch(who, executionId, { bound: 1 }));
    const failure = harness.accepted(coordinator.inspect(who, executionId)).activation?.deliveries[0]?.failure;
    if (typeof failure !== "string") throw new Error("a throwing Driver left no failure reason");
    return failure;
  };

  return { SCENARIOS, fresh, observe, setupGrantOf, callbackBaseline, unnamedRefusal, deliveryFailure };
}
