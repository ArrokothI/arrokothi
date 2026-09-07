import type { LogicalModelRequest } from "@arrokothi/core/ports";
import {
  definitionRef, operationAuthorityGrantIssues, structuredMemoryBindingIssues,
  spawnBudgetCapacityIssues, validateDefinition, jsonIssues, modelOperationAlias, modelStructuredMemoryWriteAlias,
} from "@arrokothi/core";
import type {
  AgentControllerOptions, ExecutionDefinition, OperationRef,
  WorkflowControllerOptions,
} from "@arrokothi/core";
import { StaticModelResolver } from "@arrokothi/core/reference";
import type { ApplicationOptions, ApplicationServices, PreflightDiagnostic, PreflightReport, StartExecutionInput } from "./types.ts";

export interface PreflightContext {
  readonly options: ApplicationOptions;
  readonly services: ApplicationServices;
  readonly agent: AgentControllerOptions;
  readonly workflow: WorkflowControllerOptions;
  /** Only SDK-owned static resolution is safe to inspect without invoking application code. */
  readonly staticResolver?: StaticModelResolver;
  readonly overrides?: { readonly agent?: AgentControllerOptions; readonly workflow?: WorkflowControllerOptions };
}

/** Reads configuration/store only. Never calls a model, policy, handler, executor, or custom resolver. */
export async function preflight(context: PreflightContext, input: StartExecutionInput): Promise<PreflightReport> {
  const { options, services, agent, workflow } = context;
  const diagnostics: PreflightDiagnostic[] = [];
  const add = (severity: PreflightDiagnostic["severity"], code: string, path: string, message: string) =>
    diagnostics.push({ severity, code, path, message });
  const warn = (code: string, path: string, message: string) => add("warning", code, path, message);
  const error = (code: string, path: string, message: string) => add("error", code, path, message);
  const seen = new Set<string>();
  let hasEffects = false;
  let rootDefinition: ExecutionDefinition | undefined;

  function checkModel(request: LogicalModelRequest, path: string, kind: "agent" | "workflow") {
    const access = kind === "agent" ? agent.models : workflow.models;
    if (!access || (kind === "agent" && !agent.executor)) {
      error("model_services_missing", path, `Configure models for this ${kind}; a logical reference alone cannot run inference.`);
      return;
    }
    if (access.resolver !== context.staticResolver || !context.staticResolver) {
      add("info", "model_resolution_deferred", path, "Custom model resolution is checked at invocation, not called by preflight.");
      return;
    }
    try {
      const resolved = context.staticResolver.resolve(request);
      // Do not probe custom lookups/executors. They may own remote routing or side effects.
      if (Array.isArray(options.models?.providers) && (kind === "workflow" ? !context.overrides?.workflow?.models : !context.overrides?.agent?.executor)) {
        if (!options.models.providers.some(p => p.id === resolved.provider)) {
          error("provider_missing", path, `Register ModelProvider ${resolved.provider} for ${request.logicalRef}.`);
        }
      }
    } catch (cause) {
      error("model_unavailable", path, cause instanceof Error ? cause.message : String(cause));
    }
  }

  function checkOperations(refs: readonly OperationRef[], path: string, ceiling: readonly OperationRef[] | undefined) {
    if (refs.length) hasEffects = true;
    const catalog = services.catalog.list();
    for (const ref of refs) {
      const display = JSON.stringify([ref.capability, ref.operation]);
      const descriptor = catalog.find(d => d.capability === ref.capability && d.operation === ref.operation);
      if (descriptor && (!descriptor.description || !descriptor.input)) warn("operation_not_projectable", path, `${display} needs a description and input schema for Agent exposure.`);
      if (!descriptor) {
        warn("operation_not_catalogued", path, `${display} is not enumerated by the catalog. Agent exposure may omit it; unclassified Effects remain consequential.`);
      }
      if (!ceiling?.some(d => d.capability === ref.capability && d.operation === ref.operation)) {
        warn("operation_not_granted", path, `${display} is outside this Execution's operation ceiling. Preflight does not grant it.`);
      }
    }
    if (refs.length && !options.capabilities) warn("capability_executor_missing", path, "No capability executor is configured; capability dispatch will be refused.");
  }

  async function visit(definition: ExecutionDefinition, path: string, ceiling: readonly OperationRef[] | undefined, root: boolean) {
    const valid = validateDefinition(definition);
    if (!valid.ok) {
      for (const issue of valid.issues) error("invalid_definition", `${path}.${issue.path}`, issue.message);
      return;
    }
    // Include authority and root/child context so shared definitions are checked on each distinct path.
    const key = JSON.stringify([definition.id, definition.version, root, ceiling ?? []]);
    if (seen.has(key)) return;
    seen.add(key);
    if (definition.kind === "agent") {
      const spec = definition.spec;
      checkModel(spec.model, `${path}.spec.model`, "agent");
      const groups = spec.operations?.groups ?? [];
      const refs = [...(spec.operations?.refs ?? []), ...services.catalog.list().filter(d => d.groups?.some(g => groups.includes(g)))];
      for (const group of groups) {
        if (!services.catalog.list().some(d => d.groups?.includes(group))) warn("operation_group_empty", path, `Operation group ${group} has no catalog entries.`);
      }
      checkOperations(refs, `${path}.spec.operations`, ceiling);
      const aliases = new Map<string, string>();
      const checkAlias = (alias: string, identity: string) => {
        if (aliases.has(alias) && aliases.get(alias) !== identity) warn("model_alias_collision", path, `Requested actions can share model alias ${alias}; narrow exposure or use distinct operation names. Runtime refuses ambiguous projections.`);
        aliases.set(alias, identity);
      };
      for (const ref of refs) checkAlias(modelOperationAlias(ref), JSON.stringify([ref.capability, ref.operation]));
      for (const key of spec.structuredMemory?.write?.keys ?? []) checkAlias(modelStructuredMemoryWriteAlias(key), JSON.stringify(["memory", key]));
      if (spec.completion === "complete_on_response" && definition.terminalResult && definition.terminalResult.schema.kind !== "string") {
        warn("agent_text_terminal_schema", path, "Stock Agent completion proposes response text; this terminal schema does not parse it into structured data.");
      }
      if (spec.completion !== "complete_on_response") add("info", "cumulative_agent_budget", path, `Conversation model-call budget is cumulative across the Execution (configured: ${spec.limits?.maxModelCalls ?? 8}).`);
      for (const direction of ["read", "write"] as const) {
        const keys = spec.structuredMemory?.[direction]?.keys ?? [];
        if (direction === "write" && keys.length) hasEffects = true;
        const custom = direction === "read" ? context.overrides?.agent?.structuredMemoryReadView !== undefined : context.overrides?.agent?.structuredMemoryWriteView !== undefined;
        const rule = direction === "read" ? options.memory?.read : options.memory?.writeExposure;
        const view = direction === "read" ? agent.structuredMemoryReadView : agent.structuredMemoryWriteView;
        if (keys.length && !view) warn("memory_resolver_missing", `${path}.spec.structuredMemory.${direction}`, `No structured-memory ${direction} view resolver is configured.`);
        for (const memoryKey of keys) {
          if (!root || !input.structuredMemory?.fields.some(f => f.key === memoryKey)) {
            warn("memory_binding_missing", `${path}.spec.structuredMemory.${direction}`, `${memoryKey} has no bound field${root ? "" : "; stock child calls do not bind Structured Memory"}.`);
          }
          const granted = rule === true || (typeof rule === "object" && ("readableKeys" in rule ? rule.readableKeys : rule.writableKeys).includes(memoryKey));
          if (!granted && !custom) warn("memory_grant_missing", `${path}.spec.structuredMemory.${direction}`, `${memoryKey} has no ${direction === "read" ? "read" : "write-exposure"} grant. Authored keys are not grants.`);
        }
      }
      if (spec.derivedMemory?.read && !agent.derivedSemanticMemoryReadView) warn("derived_memory_resolver_missing", path, "Derived memory was requested without a read resolver; no claims will reach the model.");
      return;
    }
    for (const stage of definition.spec.stages) {
      const at = `${path}.stages[${stage.id}]`;
      if (stage.kind === "function") {
        // Function registries are synchronous lookup ports, but custom lookup can execute arbitrary code.
        if (!workflow.functions || (!context.overrides?.workflow?.functions && !Object.hasOwn(options.functions ?? {}, stage.implementationRef))) error("function_missing", at, `Register functions[${JSON.stringify(stage.implementationRef)}] and retain a Function registry in controller overrides.`);
        else if (context.overrides?.workflow?.functions) add("info", "function_lookup_deferred", at, "Custom controller wiring: Function registry lookup is checked at runtime.");
      } else if (stage.kind === "llm") {
        checkModel(stage.model, `${at}.model`, "workflow");
        checkOperations(stage.callables ?? [], `${at}.callables`, ceiling);
      } else {
        hasEffects = true;
        if ((input.structuralSpawnBudget === undefined && input.ownerExecutionId === undefined) || input.structuralSpawnBudget === 0) warn("spawn_budget_missing", at, "Child calls need lineage spawn credits as well as Effect authorization.");
        const child = rootDefinition?.id === stage.child.definitionId && rootDefinition.version === stage.child.definitionVersion
          ? rootDefinition
          : await services.definitions.getVersion(stage.child.definitionId as ExecutionDefinition["id"], stage.child.definitionVersion);
        if (!child) { error("child_definition_missing", at, `Register ${stage.child.definitionId}@${stage.child.definitionVersion} before starting this Workflow.`); continue; }
        if (child.kind !== stage.kind) { error("child_kind_mismatch", at, `The ${stage.kind} Stage references a ${child.kind} definition.`); continue; }
        if (child.kind === "agent" && child.spec.completion !== "complete_on_response") warn("child_waits_for_input", at, "This Agent child responds and waits; its parent awaits completion. Use complete_on_response for a finite child.");
        if (!child.terminalResult) warn("child_returns_no_value", at, "This child declares no terminal result. Its emissions will not become the Stage result.");
        const delegated = (stage.requestedOperations ?? []).filter(r => ceiling?.some(c => c.capability === r.capability && c.operation === r.operation));
        await visit(child, `${at}.child`, delegated, false);
      }
      for (const adapter of [...(stage.inputAdapters ?? []), ...(stage.outputAdapters ?? [])]) {
        if (adapter.kind === "llm") checkModel(adapter.model, `${at}.adapter.model`, "workflow");
        else if (!workflow.adapters || (!context.overrides?.workflow?.adapters && !Object.hasOwn(options.adapters ?? {}, adapter.implementationRef))) error("adapter_missing", at, `Register adapters[${JSON.stringify(adapter.implementationRef)}] and retain an Adapter registry in controller overrides.`);
      }
      if (stage.resourceViews?.length && !workflow.resources) warn("resource_environment_missing", at, "Declared local resource views have no materialized resource environment.");
    }
  }

  for (const issue of jsonIssues(input, "start")) error("invalid_start_data", issue.path, issue.message);
  for (const key of ["correlationId", "causationId"] as const) {
    const value = input.input?.[key];
    if (value !== undefined && value !== null && typeof value !== "string") error("invalid_input_correlation", `input.${key}`, "Expected a string or null.");
  }
  if (input.input && (typeof input.input.label !== "string" || input.input.label.length === 0)) error("invalid_input_label", "input.label", "Initial input needs a non-empty label.");
  if (diagnostics.some(d => d.severity === "error")) return { ok: false, diagnostics };
  try {
    const definition = "kind" in input.definition ? input.definition : await services.definitions.get(input.definition);
    if (!definition) error("definition_missing", "definition", "Register the exact definition version before starting by reference.");
    else {
      rootDefinition = definition;
      const existing = await services.definitions.getVersion(definition.id, definition.version);
      if (existing && definitionRef(existing).integrity !== definitionRef(definition).integrity) error("definition_version_conflict", "definition", "Stored definition bytes differ. Publish a new version; existing Executions stay pinned.");
      await visit(definition, "definition", input.operationAuthority?.operations, true);
    }
  } catch (cause) {
    error("definition_unavailable", "definition", cause instanceof Error ? cause.message : String(cause));
  }
  if (input.operationAuthority !== undefined) for (const issue of operationAuthorityGrantIssues(input.operationAuthority)) error("invalid_operation_authority", issue.path, issue.message);
  if (input.structuredMemory !== undefined) for (const issue of structuredMemoryBindingIssues(input.structuredMemory)) error("invalid_memory_binding", issue.path, issue.message);
  if (input.structuralSpawnBudget !== undefined) for (const issue of spawnBudgetCapacityIssues(input.structuralSpawnBudget)) error("invalid_spawn_budget", "structuralSpawnBudget", issue.message);
  if (hasEffects && !options.authorizer) warn("effects_denied_by_default", "authorizer", "No EffectAuthorizer is configured. Every proposed Effect is denied, including writes and child calls.");
  if (input.ownerExecutionId !== undefined && !await services.store.readExecution(input.ownerExecutionId)) error("owner_missing", "ownerExecutionId", "The trusted host ownership parent does not exist.");
  if (options.memory?.executions) add("info", "memory_execution_scope", "memory.executions", "Memory grants are restricted to named Execution IDs; preflight does not allocate an ID or promise that this new Execution matches.");
  if (options.controllers) add("info", "custom_wiring_scope", "controllers", "Custom controller ports are trusted extension points; preflight cannot prove their wiring, exposure, policy, or handler behavior.");
  return { ok: !diagnostics.some(d => d.severity === "error"), diagnostics };
}
