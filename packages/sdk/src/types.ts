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
  /** In-memory defaults. Replacing a port alone does not establish crash recovery. */
  readonly runtime?: Partial<Pick<HarnessOptions,
    "store" | "definitions" | "scheduler" | "clock" | "ids" | "inlineWait" |
    "activationBudget" | "maxActivationsPerRun" | "defaultEffectDeadlineMs" | "securityProfile"
  >>;
  /** Advanced stock-controller strategies. Omitted properties retain the SDK composition. */
  readonly controllers?: (services: ApplicationServices) => {
    readonly agent?: AgentControllerOptions;
    readonly workflow?: WorkflowControllerOptions;
  };
}

export interface StartExecutionInput extends Omit<CreateExecutionInput, "definition"> {
  /** A definition is registered idempotently; a ref must already exist and match its integrity. */
  readonly definition: ExecutionDefinition | ExecutionDefinitionRef;
  /** Delivered before any SDK-driven Activation. Omit to deliberately start without external input. */
  readonly input?: Omit<DeliverExternalInputInput, "destination">;
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
