# @arrokothi/sdk

Application bootstrap over `@arrokothi/core`. Start with the repository's
[single builder guide](../../docs/guides/agent-workflow-composition/README.md), then the
[SDK quick start and lifecycle](../../docs/guides/agent-workflow-composition/quick-start.md).

`createApplication` assembles one Harness, both stock controllers, reference runtime services,
shared model services and store-backed operation/memory views. `defineAgent` and `defineWorkflow`
are the kernel's existing definition functions, re-exported unchanged.

Use `register` for reusable child definitions, `preflight` to inspect composition, `start` to create
an Execution and deliver its initial input, and `runUntilBlocked` to drive a bounded host request.
Use `application.harness` for input, confirmation, cancellation and evidence. No permission is inferred
from a definition, catalog entry, memory binding, or provider.

Public types and defaults live in [src/types.ts](src/types.ts) and
[src/application.ts](src/application.ts); the [API map](../../docs/guides/agent-workflow-composition/current-authoring-surface.md)
links to the underlying kernel ports. This README routes to those owners rather than maintaining a
second builder manual.

The package follows this workspace's ESM TypeScript source distribution. Workspace examples run
with Node's type stripping. A published tarball needs a TypeScript-aware build/bundler in the consumer;
stock Node does not strip TypeScript inside `node_modules`. The package version is experimental
0.8.1; no registry publication or durable/isolated deployment guarantee follows from its name.

From the repository root: `npm run test:sdk`, `npm run typecheck`, `npm run check:builder-docs`.
