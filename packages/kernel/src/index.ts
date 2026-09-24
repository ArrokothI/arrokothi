/**
 * `@arrokothi/kernel` - the target Kernel.
 *
 * This package is the enforced location for Kernel work under the target
 * [Activation/Outcome protocol](../../../mental-model/mechanisms/execution-cycle.md). K1.0 created it
 * as a refusal-only landing zone. K1.1 implemented its first protocol boundaries: atomic creation
 * with initial input, post-creation input ingress under the Input ID triple, batch reservation and
 * asynchronous Driver dispatch, ordinary redelivery, and the inspection that makes those facts
 * observable. K1.2 adds Outcome acceptance: replay and conflict, whole-envelope validation, the
 * atomic commit of acknowledgment, progress, Emissions and the next step, `continue`/`complete`/
 * `fail` with the terminal disposition of unprocessed input, authorized takeover, and the
 * inspectable recovery holds for unavailable pinned code and for unclassifiable responses.
 *
 * **It is not a working Kernel yet.** Out-of-band cancellation, waits and deadlines are K1.3's;
 * Effects are K2's; the legacy bridge, the SDK host entry and the E1 gate are K1.4's. Every surface
 * those packets own refuses by name rather than answering with a no-op, and an Outcome proposing an
 * Effect or a wait is refused whole. The boundary this package is held to is recorded in
 * `docs/development/kernel-ownership.md` and enforced by
 * `tests/conformance/architecture/kernel-landing-zone.test.ts`: nothing here may import
 * `@arrokothi/core`, any provider or Runtime integration, or the SDK. External reach is `node:`
 * builtins plus exactly the single owner-approved third-party specifier `canonicalize` (exact
 * `canonicalize@3.0.0`, K11-R1-JCS-01) — no other third-party package is permitted.
 *
 * The current, supported, explicitly legacy implementation remains `@arrokothi/core`. Nothing here
 * replaces it, and no existing consumer is routed through this package.
 */

export { UnsupportedKernelSurfaceError, refuseUnsupportedSurface } from "./unsupported.ts";

export { ExecutionCoordinator } from "./coordinator.ts";
export type {
  CoordinatorOptions,
  CreateExecutionRequest,
  CreationAccepted,
  DispatchAccepted,
  DispatchOptions,
  InputAccepted,
  InputContent,
  OutcomeAccepted,
  RecoveryDecision,
  SubmitInputRequest,
  TakeoverAccepted,
} from "./coordinator.ts";

export type {
  CodeAvailability,
  EmissionProposal,
  OutcomeEnvelope,
  OutcomeNext,
  ProtocolFailureReport,
  RecoveryRequest,
  TakeoverRequest,
} from "./outcome.ts";

export type { Activation, ActivationEvent, DeliverySettlement, ExecutionDriver } from "./driver.ts";

export { creationRequestIdKey, inputIdKey, mayReachScope, mintReceipt } from "./identity.ts";
export type { AuthenticatedCaller, CreationRequestId, InputId, Receipt, ReceiptBoundary } from "./identity.ts";

export type {
  ActivationView,
  DeliveryAttemptView,
  EmissionView,
  ExchangeView,
  ExecutionView,
  MailboxDisposition,
  MailboxEntryView,
  RecoveryHistoryRecord,
  RecoveryHoldView,
  TerminalResultView,
} from "./inspection.ts";

export { TERMINAL_STATES, isTerminal } from "./lifecycle.ts";
export type { ExecutionState } from "./lifecycle.ts";

export { UNKNOWN_DESTINATION_REASON } from "./refusal.ts";
export type { RefusalClassification, RefusalRecord } from "./refusal.ts";

export { err, ok } from "./result.ts";
export type { Err, Ok, Result } from "./result.ts";

export { BOUNDARY_LIMITS, boundaryValueIssues, canonicalize, isBoundaryValue, sameLogicalValue } from "./values.ts";
export type { BoundaryValue, CanonicalValue, ValueIssue, ValueIssueCode } from "./values.ts";
