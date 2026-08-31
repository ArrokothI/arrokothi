/**
 * A reference `LocalResourceEnvironment` over already-materialized read-only resources.
 *
 * The application registers what it has deliberately materialized; a Stage receives a view of the
 * names its definition declared, intersected with what was actually registered. Asking a view for
 * anything else throws `UnexposedLocalResourceError`, which is what makes the exposure boundary
 * *observable* rather than a convention that holds only while nobody writes down the wrong name.
 *
 * This is not a sandbox and makes no containment claim. It is the narrow read-only view boundary
 * Workflow Stage conformance needs; Slice H owns real isolation.
 */

import type { LocalResource, LocalResourceEnvironment, LocalResourceView } from "../ports/local-resource.ts";
import { UnexposedLocalResourceError } from "../ports/local-resource.ts";

export function createLocalResourceEnvironment(resources: readonly LocalResource[]): LocalResourceEnvironment {
  const registered = new Map<string, LocalResource>();
  for (const resource of resources) {
    if (!resource.id.trim()) throw new Error("a local resource id must be non-empty");
    if (registered.has(resource.id)) throw new Error(`local resource "${resource.id}" was registered more than once`);
    registered.set(resource.id, resource);
  }

  return {
    viewFor(resourceIds: readonly string[]): LocalResourceView {
      // Derived, never accumulated: a Stage cannot gain a resource by naming one that the
      // application never materialized, and it cannot see one it did not declare.
      const exposed = resourceIds.filter((id) => registered.has(id));
      return {
        exposed,
        open(resourceId: string): LocalResource {
          const resource = exposed.includes(resourceId) ? registered.get(resourceId) : undefined;
          if (!resource) throw new UnexposedLocalResourceError(resourceId, exposed);
          return resource;
        },
        tryOpen(resourceId: string): LocalResource | undefined {
          return exposed.includes(resourceId) ? registered.get(resourceId) : undefined;
        },
      };
    },
  };
}
