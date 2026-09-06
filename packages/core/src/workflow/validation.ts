/**
 * Workflow topology validation.
 *
 * Topology is statically knowable, so it is rejected statically. A Workflow whose entry Stage does
 * not exist, whose transition names a Stage nobody declared, or whose Stage ids collide is not a
 * program that should be discovered to be broken three Activations into a run - it is a definition
 * that must never be publishable. Everything checkable without executing anything is checked here,
 * and `validateDefinition` calls it, so the rejection happens at authoring, at deserialization, and
 * at store time alike.
 *
 * Two rules are less obvious than the graph checks and matter more:
 *
 * **Declared requirements must match declared behaviour.** An LLM Stage that exposes callables must
 * genuinely require `capabilityCalls`, and one whose transitions are labeled must genuinely require
 * `structuredOutput`, because that is how the Stage parses which branch to take. Marking every
 * portable feature required "just in case" is the opposite failure - it makes a Workflow
 * unnecessarily unportable - so only the features a Stage actually uses are enforced.
 *
 * **A bounded Stage must be bounded by construction.** `maxModelPhases` is validated as a small
 * positive integer, and a Stage that exposes callables must allow at least two phases, because the
 * final phase never exposes callables. There is no authored value that produces an open-ended loop.
 *
 * **A parallel fork is a narrow, statically-checked shape.** `forkTopologyIssues`
 * rejects everything statically knowable about the deliberately small fork topology: fork/branch id
 * validity and uniqueness, at least two branches, single-Stage Adapter-free branch bodies, a branch
 * Stage reached only through its fork, a branch Stage whose only transition is to its own fork's
 * join, and a join with one existing Function successor that is not itself a branch Stage. A branch
 * body may use any adapter-free Stage kind (`function` / `llm` / `agent` / `workflow`); branch
 * Adapters, multi-Stage branch subgraphs, branch loops, and nested forks stay rejected here.
 */

import { objectSchemaIssues } from "../schema/value-schema.ts";
import type { LogicalModelRequest, ModelRequirementLevel } from "../model/types.ts";
import { jsonIssues } from "../util/json.ts";
import { isAdapterKind } from "./adapters.ts";
import type { WorkflowSpec } from "./spec.ts";
import { isBranchId, isForkId, isImplementationRef, isStageId, isStageKind } from "./spec.ts";

/** The largest number of predetermined model phases one LLM Stage may declare. */
export const MAX_MODEL_PHASES = 8;

export type WorkflowSpecIssueCode =
  | "invalid_spec"
  | "missing_entry_stage"
  | "unknown_stage"
  | "duplicate_stage_id"
  | "invalid_stage_id"
  | "invalid_stage_kind"
  | "invalid_implementation_ref"
  | "invalid_model_request"
  | "invalid_transition"
  | "invalid_adapter"
  | "invalid_child_ref"
  | "invalid_callable"
  | "invalid_resource_view"
  | "invalid_fork"
  | "invalid_branch"
  | "not_serializable";

export interface WorkflowSpecIssue {
  readonly path: string;
  readonly code: WorkflowSpecIssueCode;
  readonly message: string;
}

export type WorkflowSpecValidation =
  | { readonly ok: true; readonly spec: WorkflowSpec }
  | { readonly ok: false; readonly issues: readonly WorkflowSpecIssue[] };

function issue(path: string, code: WorkflowSpecIssueCode, message: string): WorkflowSpecIssue {
  return { path, code, message };
}

const CAPABILITY_NAME = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,191}$/;

function requirementLevelValid(value: unknown): value is ModelRequirementLevel | undefined {
  return value === undefined || value === "required" || value === "optional";
}

function modelRequestIssues(request: unknown, path: string): WorkflowSpecIssue[] {
  if (request === null || typeof request !== "object" || Array.isArray(request)) {
    return [issue(path, "invalid_model_request", "expected a logical model request object")];
  }
  const candidate = request as Partial<LogicalModelRequest> & Record<string, unknown>;
  const issues: WorkflowSpecIssue[] = [];
  if (typeof candidate["logicalRef"] !== "string" || (candidate["logicalRef"] as string).trim().length === 0) {
    issues.push(issue(`${path}.logicalRef`, "invalid_model_request", "expected a non-empty logical model reference"));
  }
  // A concrete provider or model identity in a definition would make the Workflow unportable, and
  // deployment configuration is the only place that answers "which model".
  for (const forbidden of ["provider", "model", "apiKey", "providerId"]) {
    if (candidate[forbidden] !== undefined) {
      issues.push(issue(
        `${path}.${forbidden}`,
        "invalid_model_request",
        `a Workflow definition names a logical model, never a concrete "${forbidden}"; deployment resolution decides that`,
      ));
    }
  }
  const requirements = candidate["requirements"];
  if (requirements === null || typeof requirements !== "object" || Array.isArray(requirements)) {
    issues.push(issue(`${path}.requirements`, "invalid_model_request", "expected a requirements object"));
    return issues;
  }
  const declared = requirements as unknown as Record<string, unknown>;
  if (declared["text"] !== true) {
    issues.push(issue(`${path}.requirements.text`, "invalid_model_request", "portable text generation is the required baseline"));
  }
  for (const feature of ["capabilityCalls", "structuredOutput", "cancellation", "usageMetadata"]) {
    if (!requirementLevelValid(declared[feature])) {
      issues.push(issue(
        `${path}.requirements.${feature}`,
        "invalid_model_request",
        `expected "required", "optional", or absent`,
      ));
    }
  }
  return issues;
}

function adapterIssues(declaration: unknown, path: string): WorkflowSpecIssue[] {
  if (declaration === null || typeof declaration !== "object" || Array.isArray(declaration)) {
    return [issue(path, "invalid_adapter", "expected an adapter declaration object")];
  }
  const candidate = declaration as Record<string, unknown>;
  if (!isAdapterKind(candidate["kind"])) {
    return [issue(`${path}.kind`, "invalid_adapter", `expected "function" or "llm"`)];
  }
  const issues: WorkflowSpecIssue[] = [];
  // An Adapter that could request an Effect would stop being a boundary transformation. There is no
  // field for one, and a declaration that invents one is rejected rather than ignored.
  for (const forbidden of ["capabilities", "callables", "effects", "resources"]) {
    if (candidate[forbidden] !== undefined) {
      issues.push(issue(
        `${path}.${forbidden}`,
        "invalid_adapter",
        `an Adapter transforms a boundary value; it cannot declare "${forbidden}"`,
      ));
    }
  }
  if (candidate["kind"] === "function") {
    if (!isImplementationRef(candidate["implementationRef"])) {
      issues.push(issue(`${path}.implementationRef`, "invalid_adapter", "expected a logical implementation reference"));
    }
    const config = candidate["config"];
    if (config !== undefined && (config === null || typeof config !== "object" || Array.isArray(config))) {
      issues.push(issue(`${path}.config`, "invalid_adapter", "expected an object when present"));
    }
    return issues;
  }
  issues.push(...modelRequestIssues(candidate["model"], `${path}.model`));
  if (typeof candidate["system"] !== "string") {
    issues.push(issue(`${path}.system`, "invalid_adapter", "expected a system instruction string"));
  }
  if (typeof candidate["prompt"] !== "string") {
    issues.push(issue(`${path}.prompt`, "invalid_adapter", "expected a prompt string"));
  }
  return issues;
}

/**
 * The fork-topology facts every transition check needs.
 *
 * `forkIds` is the set of declared fork ids; `branchStageToFork` maps each parallel branch Stage to
 * the one fork that owns it. Both are empty for a Workflow that declares no `forks`, and every rule
 * below then reduces to ordinary non-fork behavior.
 */
interface ForkContext {
  readonly forkIds: ReadonlySet<string>;
  readonly branchStageToFork: ReadonlyMap<string, string>;
}

const EMPTY_FORK_CONTEXT: ForkContext = { forkIds: new Set(), branchStageToFork: new Map() };

function targetIssues(
  target: unknown,
  path: string,
  known: ReadonlySet<string>,
  forks: ForkContext,
  ownerForkId: string | null,
): WorkflowSpecIssue[] {
  if (target === null || typeof target !== "object" || Array.isArray(target)) {
    return [issue(path, "invalid_transition", "expected a transition target object")];
  }
  const candidate = target as Record<string, unknown>;
  if (candidate["to"] === "stage") {
    const stage = candidate["stage"];
    if (!isStageId(stage)) {
      return [issue(`${path}.stage`, "invalid_transition", `invalid stage id ${JSON.stringify(stage)}`)];
    }
    if (!known.has(stage)) {
      return [issue(`${path}.stage`, "unknown_stage", `transition targets stage "${stage}", which this Workflow does not declare`)];
    }
    if (forks.branchStageToFork.has(stage)) {
      // A branch Stage is reached only through its fork. An ordinary edge into one would give it a
      // second, non-parallel entry, which the narrow topology does not support.
      return [issue(
        `${path}.stage`,
        "invalid_transition",
        `stage "${stage}" is a parallel branch Stage; it is reached through fork "${forks.branchStageToFork.get(stage)!}", not an ordinary transition`,
      )];
    }
    return [];
  }
  if (candidate["to"] === "complete") {
    const terminal = candidate["terminal"];
    if (terminal === undefined) return [];
    if (terminal === null || typeof terminal !== "object" || Array.isArray(terminal)) {
      return [issue(`${path}.terminal`, "invalid_transition", "expected a terminal proposal object when present")];
    }
    const kind = (terminal as Record<string, unknown>)["kind"];
    if (kind !== "none" && kind !== "value") {
      return [issue(`${path}.terminal.kind`, "invalid_transition", `expected "none" or "value"`)];
    }
    if (kind === "value" && !("value" in (terminal as Record<string, unknown>))) {
      return [issue(`${path}.terminal.value`, "invalid_transition", "a value proposal requires a value")];
    }
    return [];
  }
  if (candidate["to"] === "fork") {
    const fork = candidate["fork"];
    if (typeof fork !== "string" || !forks.forkIds.has(fork)) {
      return [issue(`${path}.fork`, "invalid_transition", `transition targets fork ${JSON.stringify(fork)}, which this Workflow does not declare`)];
    }
    return [];
  }
  if (candidate["to"] === "join") {
    const fork = candidate["fork"];
    if (ownerForkId === null) {
      // Only a parallel branch Stage transitions to a join. An ordinary Stage that named one would
      // be pretending to be inside a fork it never entered.
      return [issue(`${path}`, "invalid_transition", `only a parallel branch Stage transitions to a join`)];
    }
    if (typeof fork !== "string" || fork !== ownerForkId) {
      return [issue(`${path}.fork`, "invalid_transition", `a branch Stage joins its own fork "${ownerForkId}", not ${JSON.stringify(fork)}`)];
    }
    return [];
  }
  return [issue(`${path}.to`, "invalid_transition", `expected "stage", "complete", "fork", or "join", received ${JSON.stringify(candidate["to"])}`)];
}

function transitionsIssues(
  transitions: unknown,
  path: string,
  known: ReadonlySet<string>,
  forks: ForkContext,
  ownerForkId: string | null,
): WorkflowSpecIssue[] {
  if (transitions === null || typeof transitions !== "object" || Array.isArray(transitions)) {
    return [issue(path, "invalid_transition", "every Stage declares its predefined transitions")];
  }
  const candidate = transitions as Record<string, unknown>;

  if (ownerForkId !== null) {
    // A branch Stage's topology is fixed: one unconditional transition to its own fork's join,
    // and nothing else. No labelled routing, no loop, no nested fork, no other fork's join.
    if (candidate["kind"] !== "always") {
      return [issue(`${path}.kind`, "invalid_branch", `a parallel branch Stage has exactly one unconditional transition to fork "${ownerForkId}" join`)];
    }
    const next = candidate["next"];
    const nextIssues = targetIssues(next, `${path}.next`, known, forks, ownerForkId);
    if (nextIssues.length > 0) return nextIssues;
    if ((next as Record<string, unknown>)["to"] !== "join") {
      return [issue(`${path}.next`, "invalid_branch", `a parallel branch Stage transitions only to fork "${ownerForkId}" join`)];
    }
    return [];
  }

  if (candidate["kind"] === "always") {
    return targetIssues(candidate["next"], `${path}.next`, known, forks, ownerForkId);
  }
  if (candidate["kind"] === "labeled") {
    const cases = candidate["cases"];
    if (!Array.isArray(cases) || cases.length === 0) {
      return [issue(`${path}.cases`, "invalid_transition", "a labeled transition requires at least one case")];
    }
    const issues: WorkflowSpecIssue[] = [];
    const labels = new Set<string>();
    for (const [index, entry] of cases.entries()) {
      if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
        issues.push(issue(`${path}.cases[${index}]`, "invalid_transition", "expected a transition case object"));
        continue;
      }
      const label = (entry as Record<string, unknown>)["label"];
      if (typeof label !== "string" || label.length === 0) {
        issues.push(issue(`${path}.cases[${index}].label`, "invalid_transition", "expected a non-empty label"));
      } else if (labels.has(label)) {
        // Two cases sharing a label make the chosen branch depend on evaluation order rather than
        // on the definition, which is exactly the ambiguity system-defined topology forbids.
        issues.push(issue(`${path}.cases[${index}].label`, "invalid_transition", `transition label "${label}" is declared twice`));
      } else {
        labels.add(label);
      }
      issues.push(...targetIssues((entry as Record<string, unknown>)["next"], `${path}.cases[${index}].next`, known, forks, ownerForkId));
    }
    return issues;
  }
  return [issue(`${path}.kind`, "invalid_transition", `expected "always" or "labeled"`)];
}

/**
 * Validates the `forks` block and returns the `ForkContext` the transition checks need.
 *
 * Everything statically knowable about this deliberately narrow topology is rejected here: fork id
 * validity and uniqueness, at least two branches, branch id validity and uniqueness, branch Stage
 * existence, a Stage in at most one branch, a Function-only branch body with no Adapters, no branch
 * on the entry Stage, and a join whose single successor exists, is a Function Stage, and is not one
 * of the fork's own branch Stages.
 */
function forkTopologyIssues(
  forksRaw: unknown,
  known: ReadonlySet<string>,
  entryStage: unknown,
  stagesById: ReadonlyMap<string, Record<string, unknown>>,
): { readonly issues: readonly WorkflowSpecIssue[]; readonly context: ForkContext } {
  if (forksRaw === undefined) return { issues: [], context: EMPTY_FORK_CONTEXT };

  const issues: WorkflowSpecIssue[] = [];
  const forkIds = new Set<string>();
  const branchStageToFork = new Map<string, string>();
  const context: ForkContext = { forkIds, branchStageToFork };

  if (!Array.isArray(forksRaw)) {
    issues.push(issue("spec.forks", "invalid_fork", "expected an array of fork definitions when present"));
    return { issues, context };
  }

  const hasAdapters = (stage: Record<string, unknown> | undefined): boolean =>
    stage !== undefined &&
    ((Array.isArray(stage["inputAdapters"]) && stage["inputAdapters"].length > 0) ||
      (Array.isArray(stage["outputAdapters"]) && stage["outputAdapters"].length > 0));

  forksRaw.forEach((forkRaw, fi) => {
    const at = `spec.forks[${fi}]`;
    if (forkRaw === null || typeof forkRaw !== "object" || Array.isArray(forkRaw)) {
      issues.push(issue(at, "invalid_fork", "expected a fork definition object"));
      return;
    }
    const fork = forkRaw as Record<string, unknown>;

    const id = fork["id"];
    let forkId: string | null = null;
    if (!isForkId(id)) {
      issues.push(issue(`${at}.id`, "invalid_fork", `invalid fork id ${JSON.stringify(id)}`));
    } else if (forkIds.has(id)) {
      issues.push(issue(`${at}.id`, "invalid_fork", `fork id "${id}" is declared more than once`));
    } else {
      forkIds.add(id);
      forkId = id;
    }

    const branches = fork["branches"];
    if (!Array.isArray(branches) || branches.length < 2) {
      issues.push(issue(`${at}.branches`, "invalid_fork", "a fork declares at least two branches"));
    } else {
      const branchIds = new Set<string>();
      branches.forEach((branchRaw, bi) => {
        const bat = `${at}.branches[${bi}]`;
        if (branchRaw === null || typeof branchRaw !== "object" || Array.isArray(branchRaw)) {
          issues.push(issue(bat, "invalid_branch", "expected a branch object"));
          return;
        }
        const branch = branchRaw as Record<string, unknown>;
        const bid = branch["id"];
        if (!isBranchId(bid)) {
          issues.push(issue(`${bat}.id`, "invalid_branch", `invalid branch id ${JSON.stringify(bid)}`));
        } else if (branchIds.has(bid)) {
          issues.push(issue(`${bat}.id`, "invalid_branch", `branch id "${bid}" is declared twice in fork "${forkId ?? String(id)}"`));
        } else {
          branchIds.add(bid);
        }

        const stage = branch["stage"];
        if (!isStageId(stage) || !known.has(stage)) {
          issues.push(issue(`${bat}.stage`, "invalid_branch", `branch stage ${JSON.stringify(stage)} is not a declared Stage`));
          return;
        }
        if (stage === entryStage) {
          issues.push(issue(`${bat}.stage`, "invalid_branch", `the entry Stage "${stage}" cannot be a parallel branch Stage`));
        }
        if (branchStageToFork.has(stage)) {
          issues.push(issue(`${bat}.stage`, "invalid_branch", `stage "${stage}" is already a branch of fork "${branchStageToFork.get(stage)!}"`));
        } else if (forkId !== null) {
          branchStageToFork.set(stage, forkId);
        }
        const stageDef = stagesById.get(stage);
        // a branch Stage body is any adapter-free Stage kind. `stageIssues` still validates
        // the Stage's own `kind` against the closed `STAGE_KINDS` set - this only enforces that a
        // branch is not something outside that set masquerading as one.
        if (stageDef !== undefined && !isStageKind(stageDef["kind"])) {
          issues.push(issue(`${bat}.stage`, "invalid_branch", `a branch Stage is one of the declared Stage kinds; "${stage}" is "${String(stageDef["kind"])}"`));
        }
        if (hasAdapters(stageDef)) {
          issues.push(issue(`${bat}.stage`, "invalid_branch", `a parallel branch Stage ("${stage}") cannot declare input or output Adapters`));
        }
        // Adapters declared on the branch entry itself are equally unsupported.
        if (
          (Array.isArray(branch["inputAdapters"]) && branch["inputAdapters"].length > 0) ||
          (Array.isArray(branch["outputAdapters"]) && branch["outputAdapters"].length > 0)
        ) {
          issues.push(issue(`${bat}`, "invalid_branch", `a parallel branch declares no Adapters`));
        }
      });
    }

    const join = fork["join"];
    if (join === null || typeof join !== "object" || Array.isArray(join)) {
      issues.push(issue(`${at}.join`, "invalid_fork", "a fork declares an explicit join with one downstream Stage"));
      return;
    }
    const next = (join as Record<string, unknown>)["next"];
    if (!isStageId(next) || !known.has(next)) {
      issues.push(issue(`${at}.join.next`, "invalid_fork", `the join successor ${JSON.stringify(next)} is not a declared Stage`));
      return;
    }
    const nextDef = stagesById.get(next);
    if (nextDef !== undefined && nextDef["kind"] !== "function") {
      issues.push(issue(`${at}.join.next`, "invalid_fork", `the join successor "${next}" must be a function Stage so the join snapshot is consumable`));
    }
    if (
      Array.isArray(branches) &&
      branches.some((b) => (b === null || typeof b !== "object" ? false : (b as Record<string, unknown>)["stage"] === next))
    ) {
      issues.push(issue(`${at}.join.next`, "invalid_fork", `the join successor "${next}" cannot also be one of this fork's branch Stages`));
    }
  });

  return { issues, context };
}

function callableIssues(callable: unknown, path: string): WorkflowSpecIssue[] {
  if (callable === null || typeof callable !== "object" || Array.isArray(callable)) {
    return [issue(path, "invalid_callable", "expected a model callable declaration object")];
  }
  const candidate = callable as Record<string, unknown>;
  const issues: WorkflowSpecIssue[] = [];
  if (typeof candidate["name"] !== "string" || (candidate["name"] as string).length === 0) {
    issues.push(issue(`${path}.name`, "invalid_callable", "expected a model-facing name"));
  }
  if (typeof candidate["description"] !== "string") {
    issues.push(issue(`${path}.description`, "invalid_callable", "expected a description for the model"));
  }
  for (const key of ["capability", "operation"] as const) {
    const value = candidate[key];
    if (typeof value !== "string" || !CAPABILITY_NAME.test(value)) {
      issues.push(issue(`${path}.${key}`, "invalid_callable", `expected a logical ${key} name`));
    }
  }
  issues.push(...objectSchemaIssues(candidate["input"], `${path}.input`).map((i) => issue(i.path, "invalid_callable", i.message)));
  const resources = candidate["resources"];
  if (resources !== undefined && (!Array.isArray(resources) || resources.some((r) => typeof r !== "string"))) {
    issues.push(issue(`${path}.resources`, "invalid_callable", "expected an array of logical resource binding names"));
  }
  const deadlineMs = candidate["deadlineMs"];
  if (deadlineMs !== undefined && (typeof deadlineMs !== "number" || !Number.isFinite(deadlineMs) || deadlineMs <= 0)) {
    issues.push(issue(`${path}.deadlineMs`, "invalid_callable", "expected a positive number of milliseconds when present"));
  }
  return issues;
}

function stageIssues(stage: unknown, path: string, known: ReadonlySet<string>, forks: ForkContext): WorkflowSpecIssue[] {
  if (stage === null || typeof stage !== "object" || Array.isArray(stage)) {
    return [issue(path, "invalid_spec", "expected a stage definition object")];
  }
  const candidate = stage as Record<string, unknown>;
  const issues: WorkflowSpecIssue[] = [];

  const rawId = candidate["id"];
  const ownerForkId = typeof rawId === "string" ? (forks.branchStageToFork.get(rawId) ?? null) : null;

  if (!isStageId(candidate["id"])) {
    issues.push(issue(`${path}.id`, "invalid_stage_id", `invalid stage id ${JSON.stringify(candidate["id"])}`));
  }
  if (!isStageKind(candidate["kind"])) {
    issues.push(issue(
      `${path}.kind`,
      "invalid_stage_kind",
      `expected one of function, llm, agent, workflow; router/classifier/retriever/aggregator/gate/guard are compositions of these, not kernel Stage kinds`,
    ));
    return issues;
  }

  issues.push(...transitionsIssues(candidate["transitions"], `${path}.transitions`, known, forks, ownerForkId));
  if (candidate["onAdapterReject"] !== undefined) {
    issues.push(...targetIssues(candidate["onAdapterReject"], `${path}.onAdapterReject`, known, forks, ownerForkId));
  }

  for (const position of ["inputAdapters", "outputAdapters"] as const) {
    const declared = candidate[position];
    if (declared === undefined) continue;
    if (!Array.isArray(declared)) {
      issues.push(issue(`${path}.${position}`, "invalid_adapter", "expected an array of adapter declarations"));
      continue;
    }
    declared.forEach((declaration, index) => {
      issues.push(...adapterIssues(declaration, `${path}.${position}[${index}]`));
    });
  }

  const resourceViews = candidate["resourceViews"];
  if (resourceViews !== undefined) {
    if (!Array.isArray(resourceViews) || resourceViews.some((view) => typeof view !== "string" || view.length === 0)) {
      issues.push(issue(`${path}.resourceViews`, "invalid_resource_view", "expected an array of local resource view names"));
    }
  }

  switch (candidate["kind"]) {
    case "function": {
      if (!isImplementationRef(candidate["implementationRef"])) {
        issues.push(issue(
          `${path}.implementationRef`,
          "invalid_implementation_ref",
          "a Function Stage names application-wired code by logical reference; a definition cannot contain the function itself",
        ));
      }
      const config = candidate["config"];
      if (config !== undefined && (config === null || typeof config !== "object" || Array.isArray(config))) {
        issues.push(issue(`${path}.config`, "invalid_spec", "expected an object when present"));
      }
      break;
    }
    case "llm": {
      issues.push(...modelRequestIssues(candidate["model"], `${path}.model`));
      if (typeof candidate["system"] !== "string") {
        issues.push(issue(`${path}.system`, "invalid_spec", "expected a system instruction string"));
      }
      if (typeof candidate["prompt"] !== "string") {
        issues.push(issue(`${path}.prompt`, "invalid_spec", "expected a prompt string"));
      }

      const phases = candidate["maxModelPhases"];
      if (phases !== undefined && (!Number.isInteger(phases) || (phases as number) < 1 || (phases as number) > MAX_MODEL_PHASES)) {
        issues.push(issue(
          `${path}.maxModelPhases`,
          "invalid_spec",
          `expected an integer between 1 and ${MAX_MODEL_PHASES}; an LLM Stage is bounded by construction`,
        ));
      }

      const callables = candidate["callables"];
      const requirements = (candidate["model"] as { requirements?: Record<string, unknown> } | undefined)?.requirements;
      if (callables !== undefined) {
        if (!Array.isArray(callables)) {
          issues.push(issue(`${path}.callables`, "invalid_callable", "expected an array of model callable declarations"));
        } else {
          const names = new Set<string>();
          callables.forEach((callable, index) => {
            issues.push(...callableIssues(callable, `${path}.callables[${index}]`));
            const name = (callable as Record<string, unknown> | null)?.["name"];
            if (typeof name === "string") {
              if (names.has(name)) {
                issues.push(issue(`${path}.callables[${index}].name`, "invalid_callable", `callable name "${name}" is declared twice`));
              }
              names.add(name);
            }
          });
          if (callables.length > 0) {
            if (requirements?.["capabilityCalls"] !== "required") {
              issues.push(issue(
                `${path}.model.requirements.capabilityCalls`,
                "invalid_model_request",
                "a Stage that exposes model-callable operations genuinely requires capability calls; declare it rather than hoping the model has them",
              ));
            }
            const allowed = (phases as number | undefined) ?? 1;
            if (allowed < 2) {
              issues.push(issue(
                `${path}.maxModelPhases`,
                "invalid_spec",
                "callables are exposed only while phases remain, so a Stage that exposes them needs at least two predetermined phases",
              ));
            }
          }
        }
      }

      const transitions = candidate["transitions"] as { kind?: unknown } | undefined;
      if (transitions?.kind === "labeled" && requirements?.["structuredOutput"] !== "required") {
        issues.push(issue(
          `${path}.model.requirements.structuredOutput`,
          "invalid_model_request",
          "a branching LLM Stage parses its transition from structured output, so structured output is genuinely required",
        ));
      }
      break;
    }
    case "agent":
    case "workflow": {
      const child = candidate["child"];
      if (child === null || typeof child !== "object" || Array.isArray(child)) {
        issues.push(issue(`${path}.child`, "invalid_child_ref", "expected a child definition reference"));
        break;
      }
      const ref = child as Record<string, unknown>;
      if (typeof ref["definitionId"] !== "string" || (ref["definitionId"] as string).length === 0) {
        issues.push(issue(`${path}.child.definitionId`, "invalid_child_ref", "expected a child definition id"));
      }
      if (!Number.isInteger(ref["definitionVersion"]) || (ref["definitionVersion"] as number) < 1) {
        issues.push(issue(`${path}.child.definitionVersion`, "invalid_child_ref", "expected an integer definition version >= 1"));
      }
      // A child Stage refers to a definition. Inlining the child's own spec here would flatten its
      // topology into the parent graph, which is the thing the Stage boundary exists to prevent.
      if (ref["spec"] !== undefined || ref["definition"] !== undefined) {
        issues.push(issue(
          `${path}.child`,
          "invalid_child_ref",
          "a child Stage references a definition; it never inlines one",
        ));
      }
      if (candidate["childInput"] !== undefined) {
        // The Stage's adapted `StageResult` is the child's semantic input; a static `childInput`
        // object would make merge/precedence semantics an architecture accident.
        issues.push(issue(
          `${path}.childInput`,
          "invalid_spec",
          "childInput is not supported; the Stage's adapted StageResult is the child's input",
        ));
      }
      const requestedOperations = candidate["requestedOperations"];
      if (requestedOperations !== undefined) {
        if (!Array.isArray(requestedOperations)) {
          issues.push(issue(`${path}.requestedOperations`, "invalid_spec", "expected an array of { capability, operation } refs"));
        } else {
          requestedOperations.forEach((requested, index) => {
            const at = `${path}.requestedOperations[${index}]`;
            if (requested === null || typeof requested !== "object" || Array.isArray(requested)) {
              issues.push(issue(at, "invalid_spec", "expected an operation ref object"));
              return;
            }
            const op = requested as Record<string, unknown>;
            for (const key of ["capability", "operation"] as const) {
              if (typeof op[key] !== "string" || !CAPABILITY_NAME.test(op[key] as string)) {
                issues.push(issue(`${at}.${key}`, "invalid_spec", `expected a logical ${key} name`));
              }
            }
          });
        }
      }
      break;
    }
  }

  return issues;
}

/**
 * Validates one Workflow spec.
 *
 * Returns the spec unchanged on success: validation brands ids, it does not rewrite topology, so
 * the bytes that were checked are the bytes that get digested and pinned.
 */
export function validateWorkflowSpec(input: unknown): WorkflowSpecValidation {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, issues: [issue("spec", "invalid_spec", "expected a workflow spec object")] };
  }
  const candidate = input as Record<string, unknown>;
  const issues: WorkflowSpecIssue[] = [];

  const stages = candidate["stages"];
  if (!Array.isArray(stages) || stages.length === 0) {
    return { ok: false, issues: [issue("spec.stages", "invalid_spec", "a Workflow declares at least one Stage")] };
  }

  const known = new Set<string>();
  const stagesById = new Map<string, Record<string, unknown>>();
  for (const [index, stage] of stages.entries()) {
    const id = (stage as { id?: unknown } | null)?.["id"];
    if (typeof id !== "string") continue;
    if (known.has(id)) {
      issues.push(issue(`spec.stages[${index}].id`, "duplicate_stage_id", `stage id "${id}" is declared more than once`));
    }
    known.add(id);
    if (stage !== null && typeof stage === "object" && !Array.isArray(stage)) {
      stagesById.set(id, stage as Record<string, unknown>);
    }
  }

  const entry = candidate["entryStage"];
  if (!isStageId(entry)) {
    issues.push(issue("spec.entryStage", "missing_entry_stage", `invalid entry stage id ${JSON.stringify(entry)}`));
  } else if (!known.has(entry)) {
    issues.push(issue("spec.entryStage", "missing_entry_stage", `entry stage "${entry}" is not declared by this Workflow`));
  }

  // Parallel fork/join topology. Absent `forks` means an empty fork context.
  const forkResult = forkTopologyIssues(candidate["forks"], known, entry, stagesById);
  issues.push(...forkResult.issues);

  stages.forEach((stage, index) => {
    issues.push(...stageIssues(stage, `spec.stages[${index}]`, known, forkResult.context));
  });

  for (const problem of jsonIssues(candidate, "spec")) {
    issues.push(issue(problem.path, "not_serializable", problem.message));
  }

  if (issues.length > 0) return { ok: false, issues };
  return { ok: true, spec: candidate as unknown as WorkflowSpec };
}
