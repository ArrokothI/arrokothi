/**
 * The Workflow spec: system-defined semantic topology, as authored data.
 *
 * Slice A kept `WorkflowSpec = JsonObject` so the substrate would not guess at this slice. This is
 * the replacement, and every shape in this file is chosen by what it *cannot* contain. A Stage
 * definition holds an id, a kind, logical references, authored configuration, adapter declarations,
 * and its predefined transitions. It never holds a function value, a provider client, a
 * `ModelProvider`, an API key, a `RuntimeStore`, a Harness, a `CapabilityExecutor`, resource
 * contents, a LangChain object, or an application tenant/user model - `definitions/validation.ts`
 * enforces the structural half of that rule (plain JSON only), and the type shapes here enforce the
 * rest by simply having nowhere to put them.
 *
 * Executable behaviour is reached through *logical implementation refs*. A Function Stage says
 * `implementationRef: "parse-document"`; application wiring maps that name to trusted code. The
 * definition therefore stays portable, diffable, and digestible while the code stays out of it.
 *
 * The Stage union is closed at exactly four kinds:
 *
 * ```text
 * FunctionStageDefinition
 * LLMStageDefinition
 * AgentStageDefinition      // definition-valid, runtime unsupported until Slice E
 * WorkflowStageDefinition   // definition-valid, runtime unsupported until Slice E
 * ```
 *
 * Router, classifier, retriever, aggregator, gate, and guard are *compositions* of these plus
 * transitions, not new kernel kinds. Adding one would grow the semantic vocabulary without adding
 * semantics.
 */

import type { ObjectSchema } from "../schema/value-schema.ts";
import type { JsonObject, JsonValue } from "../util/json.ts";
import type { LogicalModelRequest } from "../model/types.ts";
import type { AdapterDeclaration } from "./adapters.ts";

/**
 * Workflow-local semantic topology identity.
 *
 * A Stage id names a node in one Workflow's graph and nothing else. It is deliberately *not* an
 * `ExecutionId`, an `ActivationId`, a mailbox identity, an authority principal, or a scheduler
 * identity, and it is never minted by the runtime id generator - it is authored, it lives inside
 * the pinned definition, and it means nothing outside that definition. Branding it keeps a runtime
 * identity from ever being passed where topology identity is expected.
 *
 * A Workflow may revisit the same Stage through a loop, so a Stage id identifies a *StageDefinition*,
 * not one invocation of it. Invocation identity is Workflow controller progress and lives in
 * `control-state.ts`.
 */
export type StageId = string & { readonly __brand: "StageId" };

const STAGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export function isStageId(value: unknown): value is StageId {
  return typeof value === "string" && STAGE_ID_PATTERN.test(value);
}

export function stageId(value: string): StageId {
  if (!isStageId(value)) {
    throw new TypeError(`invalid stage id ${JSON.stringify(value)}; expected ${STAGE_ID_PATTERN}`);
  }
  return value;
}

/** Logical name of application-wired executable behaviour. Never the behaviour itself. */
export type ImplementationRef = string;

const IMPLEMENTATION_REF_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/;

export function isImplementationRef(value: unknown): value is ImplementationRef {
  return typeof value === "string" && IMPLEMENTATION_REF_PATTERN.test(value);
}

export type StageKind = "function" | "llm" | "agent" | "workflow";

export const STAGE_KINDS: readonly StageKind[] = ["function", "llm", "agent", "workflow"];

export function isStageKind(value: unknown): value is StageKind {
  return typeof value === "string" && (STAGE_KINDS as readonly string[]).includes(value);
}

// -- transitions -------------------------------------------------------------

/**
 * An explicit terminal-result proposal attached to a completion transition.
 *
 * Kept separate from `StageResult` on purpose. A Stage producing text has produced a value for the
 * *next Stage*; whether the Execution returns anything, and what, is a different contract that the
 * definition declares and the Harness validates. The only two forms here are "no value" and "this
 * authored value", which is enough for Slice C and leaves no path by which a Stage's text silently
 * becomes an Execution's terminal result.
 */
export type TerminalProposal =
  | { readonly kind: "none" }
  | { readonly kind: "value"; readonly value: JsonValue };

/** Where a resolved transition goes. Both targets are declared in the definition. */
export type TransitionTarget =
  | { readonly to: "stage"; readonly stage: StageId }
  | { readonly to: "complete"; readonly terminal?: TerminalProposal };

/**
 * The predefined transition set for one Stage.
 *
 * `always` is the honest representation of "this Stage has exactly one successor": requiring an
 * artificial label there would make every linear Workflow carry ceremony that proves nothing. A
 * Stage declared `always` that nevertheless names a label is rejected, because under `always` every
 * label is an undeclared one.
 *
 * `labeled` is the branch form. The Stage names a label; the definition decides where that label
 * goes. A model may choose *among these labels*; it can never return a Stage id, invent a label, or
 * otherwise reach past the declared cases.
 */
export type StageTransitions =
  | { readonly kind: "always"; readonly next: TransitionTarget }
  | { readonly kind: "labeled"; readonly cases: readonly StageTransitionCase[] };

export interface StageTransitionCase {
  readonly label: string;
  readonly next: TransitionTarget;
}

/** Every transition label this Stage may legally produce. Empty for `always`. */
export function transitionLabels(transitions: StageTransitions): readonly string[] {
  return transitions.kind === "labeled" ? transitions.cases.map((entry) => entry.label) : [];
}

// -- model-callable exposure -------------------------------------------------

/**
 * One operation an LLM Stage exposes to its model.
 *
 * The `name` is model-facing vocabulary and is never treated as an authority-bearing identifier:
 * the Stage maps it to a capability/operation pair here, in the definition, so a provider that
 * echoes back an unexpected name resolves to nothing rather than to whatever capability happens to
 * share that string.
 *
 * ```text
 * exposure != authority
 * ```
 *
 * Declaring a callable makes it *visible* to the model. Whether the resulting Effect is permitted
 * is still decided by the Harness against this Execution's policy, after the controller proposes it.
 */
export interface ModelCallableDeclaration {
  /** Model-facing name. Vocabulary, not identity. */
  readonly name: string;
  readonly description: string;
  readonly input: ObjectSchema;
  /** The capability this callable actually resolves to. */
  readonly capability: string;
  readonly operation: string;
  /** Logical resource bindings the resulting Effect may name. Never resource contents. */
  readonly resources?: readonly string[];
  /** Operation deadline for the resulting Effect. Unrelated to any Activation's wait budget. */
  readonly deadlineMs?: number;
}

// -- stage definitions -------------------------------------------------------

export interface StageDefinitionBase {
  readonly id: StageId;
  readonly kind: StageKind;
  readonly name?: string;
  readonly description?: string;
  /** Run on the incoming Stage result, before the Stage body. Effect-free by contract. */
  readonly inputAdapters?: readonly AdapterDeclaration[];
  /** Run on the Stage's own result, before the transition is resolved. */
  readonly outputAdapters?: readonly AdapterDeclaration[];
  readonly transitions: StageTransitions;
  /**
   * Where an Adapter rejection goes.
   *
   * Predefined Workflow policy, not Adapter-owned topology: an Adapter reports a rejection and the
   * controller applies *this*. Absent means the Workflow fails, which is the deterministic default.
   */
  readonly onAdapterReject?: TransitionTarget;
  /**
   * Local materialized resource views this Stage may read.
   *
   * A name here exposes an already-materialized read-only view to Stage-local computation. Anything
   * not named is unreachable - not merely unmentioned - and reaching a live or external resource
   * still requires a `UseCapability` Effect through the Harness.
   */
  readonly resourceViews?: readonly string[];
}

/** Application code, reached by logical ref. Bodies are wired by the application, never authored here. */
export interface FunctionStageDefinition extends StageDefinitionBase {
  readonly kind: "function";
  readonly implementationRef: ImplementationRef;
  /** Authored configuration handed to the implementation. Data only. */
  readonly config?: JsonObject;
}

/**
 * Bounded, program-defined model work.
 *
 * `maxModelPhases` is the bound, and it is enforced structurally rather than by hoping the model
 * stops: callables are exposed only while phases remain, so the final phase is guaranteed to be one
 * that cannot ask for more work. One phase is one model call; two phases is
 * `model -> required Effect -> collect -> bounded follow-up`. There is no phase count that turns
 * this into "keep going until the model is satisfied" - that is Agent semantics and it belongs to a
 * different Execution kind.
 */
export interface LLMStageDefinition extends StageDefinitionBase {
  readonly kind: "llm";
  /** Logical model reference plus the portable features this Stage genuinely needs. */
  readonly model: LogicalModelRequest;
  readonly system: string;
  /** `{{input}}` is substituted with the incoming Stage result. */
  readonly prompt: string;
  /** Predetermined model phases. Defaults to 1. */
  readonly maxModelPhases?: number;
  /** The predefined set of model-callable operations. Absent means the model may call nothing. */
  readonly callables?: readonly ModelCallableDeclaration[];
}

/**
 * A child Agent Execution behind one Stage boundary.
 *
 * Definition-valid now, unsupported at runtime until Slice E supplies child composition. It carries
 * only what a future child call needs: which definition, and how the Stage adapts around it. It
 * does not carry the child's spec, because flattening a child's topology into the parent is exactly
 * the mistake the Stage boundary exists to prevent.
 */
export interface AgentStageDefinition extends StageDefinitionBase {
  readonly kind: "agent";
  readonly child: ChildDefinitionRef;
  /** Authored input adaptation for the future child call. Data only. */
  readonly childInput?: JsonObject;
}

export interface WorkflowStageDefinition extends StageDefinitionBase {
  readonly kind: "workflow";
  readonly child: ChildDefinitionRef;
  readonly childInput?: JsonObject;
}

/** Which definition a child Stage would instantiate. A reference, never an inlined definition. */
export interface ChildDefinitionRef {
  readonly definitionId: string;
  readonly definitionVersion: number;
}

export type StageDefinition =
  | FunctionStageDefinition
  | LLMStageDefinition
  | AgentStageDefinition
  | WorkflowStageDefinition;

/**
 * One Workflow's complete topology.
 *
 * `stages` is an array rather than a record so that a duplicate Stage id is *representable* and can
 * therefore be rejected. A record silently keeps the last one, which is the difference between a
 * definition that fails loudly and a Workflow that runs a program its author did not write.
 */
export interface WorkflowSpec {
  readonly entryStage: StageId;
  readonly stages: readonly StageDefinition[];
}

export function findStage(spec: WorkflowSpec, id: StageId): StageDefinition | undefined {
  return spec.stages.find((stage) => stage.id === id);
}

// -- authoring input ---------------------------------------------------------

/**
 * The authoring shapes.
 *
 * Identical to the definition types except that ids are plain strings: `defineWorkflow` validates
 * and brands them, in the same way `useCapability` brands capability names. Authors write
 * `"research"`; the stored definition carries a checked `StageId`.
 */
export interface StageIdentityInput {
  readonly id: string;
  readonly transitions: StageTransitionsInput;
  readonly onAdapterReject?: TransitionTargetInput;
}

export type TransitionTargetInput =
  | { readonly to: "stage"; readonly stage: string }
  | { readonly to: "complete"; readonly terminal?: TerminalProposal };

export type StageTransitionsInput =
  | { readonly kind: "always"; readonly next: TransitionTargetInput }
  | { readonly kind: "labeled"; readonly cases: readonly { readonly label: string; readonly next: TransitionTargetInput }[] };

type Authorable<T extends StageDefinitionBase> = Omit<T, "id" | "transitions" | "onAdapterReject"> & StageIdentityInput;

export type StageDefinitionInput =
  | Authorable<FunctionStageDefinition>
  | Authorable<LLMStageDefinition>
  | Authorable<AgentStageDefinition>
  | Authorable<WorkflowStageDefinition>;

export interface WorkflowSpecInput {
  readonly entryStage: string;
  readonly stages: readonly StageDefinitionInput[];
}
