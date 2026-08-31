/**
 * Controller selection.
 *
 * One controller per Definition kind, resolved from the *pinned definition*, never from anything a
 * controller or an Event said. This is what makes "an AgentDefinition creates an Agent Execution"
 * a mechanical fact rather than a convention.
 */

import type { DefinitionKind } from "../definitions/types.ts";
import type { ExecutionController } from "../ports/controller.ts";

export class UnknownControllerKindError extends Error {
  constructor(kind: string) {
    super(`no controller registered for definition kind "${kind}"`);
    this.name = "UnknownControllerKindError";
  }
}

export class ControllerRegistry {
  private readonly byKind = new Map<DefinitionKind, ExecutionController>();

  constructor(controllers: readonly ExecutionController[] = []) {
    for (const controller of controllers) this.register(controller);
  }

  register(controller: ExecutionController): this {
    if (this.byKind.has(controller.kind)) {
      throw new Error(`a controller for definition kind "${controller.kind}" is already registered`);
    }
    this.byKind.set(controller.kind, controller);
    return this;
  }

  has(kind: DefinitionKind): boolean {
    return this.byKind.has(kind);
  }

  resolve(kind: DefinitionKind): ExecutionController {
    const controller = this.byKind.get(kind);
    if (!controller) throw new UnknownControllerKindError(kind);
    return controller;
  }

  kinds(): readonly DefinitionKind[] {
    return [...this.byKind.keys()];
  }
}
