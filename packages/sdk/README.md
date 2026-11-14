# @arrokothi/sdk

Application bootstrap over the Kernel (`@arrokothi/kernel`) and the 0.8.x `@arrokothi/core` Runtime.
Start with the repository's
[single builder guide](../../docs/guides/execution/native/README.md), then the
[SDK quick start and lifecycle](../../docs/guides/deployment/quick-start.md).

`createApplication` assembles one Kernel coordinator and one legacy Execution Driver. The Driver owns a
private 0.8.x Harness, both stock controllers, reference runtime services, shared model services and
store-backed operation/memory views as its native Runtime. `defineAgent` and `defineWorkflow` are the
existing definition functions, re-exported unchanged.

Use `register` for reusable child definitions, `preflight` to inspect composition, `start` to create
an Execution with its initial input, and `runUntilBlocked` to drive a bounded host request. Use
`input`, `resolveConfirmation` and `cancel` for host actions, and `inspect` for the Kernel's view.
`application.harness` is a deprecated read-only view of native evidence; its mutators refuse by name.
`toCanonicalBytes` is the value wrapper the SDK uses at the boundary
([values at the boundary](../../docs/guides/deployment/values-at-the-boundary.md)). No permission is
inferred from a definition, catalog entry, memory binding, or provider.

Public types and defaults live in [src/types.ts](src/types.ts) and
[src/application.ts](src/application.ts); the [API map](../../docs/guides/execution/native/current-authoring-surface.md)
links to the underlying kernel ports. This README routes to those owners rather than maintaining a
second builder manual.

The package is `"private": true`: it depends on the private Kernel package, and a release packet decides
how to publish them. It follows this workspace's ESM TypeScript source distribution. Workspace examples run
with Node's type stripping. A published tarball needs a TypeScript-aware build/bundler in the consumer;
stock Node does not strip TypeScript inside `node_modules`. The package version is experimental
0.8.1; no registry publication or durable/isolated deployment guarantee follows from its name.

From the repository root: `npm run test:sdk`, `npm run typecheck`, `npm run check:builder-docs`.
