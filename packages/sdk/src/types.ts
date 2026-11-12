import type {
  AgentControllerOptions, CreateExecutionInput, DeliverExternalInputInput, ExecutionDefinition,
  ExecutionDefinitionRef, HarnessOptions, WorkflowControllerOptions,
} from "@arrokothi/core";
import type {
  CapabilityCatalog, CapabilityExecutor, ModelProvider, ModelProviderLookup, ModelResolver,
  RuntimeStore, DefinitionStore, Scheduler,
} from "@arrokothi/core/ports";
import type {
  AdapterHandler, FunctionStageHandler, StaticModelMapping,
  StructuredMemoryReadGrantRule, StructuredMemoryWriteExposureGrantRule,
} from "@arrokothi/core/reference";

/** Deployment mappings, never portable Definition fields. Resolution never grants Effect authority. */
export type ApplicationModels = {
  readonly providers: readonly ModelProvider[] | ModelProviderLookup;
} & (
  | { readonly bindings: Readonly<Record<string, StaticModelMapping>>; readonly resolver?: never }
  | { readonly resolver: ModelResolver; readonly bindings?: never }
);

/** The actual shared services; hooks can build narrow resolvers against this exact runtime store. */
export interface ApplicationServices {
  readonly store: RuntimeStore;
  readonly definitions: DefinitionStore;
  readonly scheduler: Scheduler;
  readonly catalog: CapabilityCatalog;
  readonly models?: { readonly resolver: ModelResolver; readonly providers: ModelProviderLookup };
}

export interface ApplicationOptions {
  readonly models?: ApplicationModels;
  readonly capabilities?: { readonly catalog: CapabilityCatalog; readonly executor: CapabilityExecutor };
  readonly functions?: Readonly<Record<string, FunctionStageHandler>>;
  readonly adapters?: Readonly<Record<string, AdapterHandler>>;
  /** These are deployment grants, independent from authored keys and final WriteMemory permission. */
  readonly memory?: {
    readonly read?: StructuredMemoryReadGrantRule;
    readonly writeExposure?: StructuredMemoryWriteExposureGrantRule;
    /** Omission applies these explicitly configured grants to all Executions. */
    readonly executions?: readonly string[];
  };
  readonly authorizer?: HarnessOptions["authorizer"];
  readonly confirmationPolicy?: HarnessOptions["confirmationPolicy"];
  /**
   * In-memory defaults. Replacing a port alone does not establish crash recovery.
   *
   * `scheduler` is refused by name: Kernel dispatch and the bridge's lineage scheduler own native
   * scheduling (K1.4). `maxActivationsPerRun` is accepted and ignored; preflight warns.
   */
  readonly runtime?: Partial<Pick<HarnessOptions,
    "store" | "definitions" | "scheduler" | "clock" | "ids" | "inlineWait" |
    "activationBudget" | "maxActivationsPerRun" | "defaultEffectDeadlineMs" | "securityProfile"
  >>;
  /**
   * When set, each human pause the bridge declares as a Kernel wait carries a deadline this many
   * milliseconds after the pause was first observed. On expiry the bridge requests cancellation of
   * the native lineage and the Execution fails with `arrokothi.bridge.wait_deadline_expired`.
   * Deadlines take effect at the next host call.
   */
  readonly humanWaitDeadlineMs?: number;
  /** Advanced stock-controller strategies. Omitted properties retain the SDK composition. */
  readonly controllers?: (services: ApplicationServices) => {
    readonly agent?: AgentControllerOptions;
    readonly workflow?: WorkflowControllerOptions;
  };
}

export interface StartExecutionInput extends Omit<CreateExecutionInput, "definition" | "ownerExecutionId"> {
  /** A definition is registered idempotently; a ref must already exist and match its integrity. */
  readonly definition: ExecutionDefinition | ExecutionDefinitionRef;
  /** Accepted atomically with creation, before any Activation. Omit to start without external input. */
  readonly input?: Omit<DeliverExternalInputInput, "destination">;
  /**
   * Retry key. Only a caller-supplied key makes a retry exact: the same key and content replay the
   * creation. At most 64 characters from `[A-Za-z0-9._:-]`. Defaults to a fresh UUID.
   */
  readonly creationKey?: string;
  /** An absolute instant on the `runtime.clock` scale; the Execution is cancelled once it passes. */
  readonly executionDeadline?: Date;
}

/** A host input to a running Execution: the next conversation turn. */
export interface ApplicationInput {
  /** Retry key; only a caller-supplied key makes a retry exact. Defaults to a fresh UUID. */
  readonly requestKey?: string;
  readonly label: string;
  readonly payload?: DeliverExternalInputInput["payload"];
  /**
   * The native Execution that receives it. Defaults to the one input-waiting member the latest
   * pause names, or the Execution itself; required when several members wait for input.
   */
  readonly destination?: string;
  readonly correlationId?: string | null;
  readonly causationId?: string | null;
}

/** A host decision for a pending confirmation in the Execution's native lineage. */
export interface ApplicationConfirmation {
  readonly requestKey?: string;
  readonly confirmationId: string;
  readonly decision: "approve" | "decline";
}

export interface PreflightDiagnostic {
  readonly severity: "error" | "warning" | "info";
  /** Stable machine-readable identifier. Messages and paths provide actionable context. */
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface PreflightReport {
  readonly ok: boolean;
  readonly diagnostics: readonly PreflightDiagnostic[];
}

export class ApplicationConfigurationError extends Error {
  readonly diagnostics: readonly PreflightDiagnostic[];
  constructor(report: PreflightReport) {
    super(report.diagnostics.filter(d => d.severity === "error").map(d => `${d.path}: ${d.message}`).join("\n"));
    this.name = "ApplicationConfigurationError";
    this.diagnostics = report.diagnostics;
  }
}

/** `start` cancelled the Execution it created because its native root could not be created. */
export class ApplicationStartError extends Error {
  readonly code: string;
  readonly executionId: string | null;
  readonly refusal?: unknown;
  constructor(code: string, message: string, options: { readonly executionId?: string | null; readonly refusal?: unknown; readonly cause?: unknown } = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "ApplicationStartError";
    this.code = code;
    this.executionId = options.executionId ?? null;
    if (options.refusal !== undefined) this.refusal = options.refusal;
  }
}

/** A host input, confirmation, cancellation or read was refused before any record was written. */
export class ApplicationInputError extends Error {
  readonly code: string;
  readonly issues?: readonly unknown[];
  readonly refusal?: unknown;
  constructor(code: string, message: string, details: { readonly issues?: readonly unknown[]; readonly refusal?: unknown } = {}) {
    super(message);
    this.name = "ApplicationInputError";
    this.code = code;
    if (details.issues !== undefined) this.issues = details.issues;
    if (details.refusal !== undefined) this.refusal = details.refusal;
  }
}
