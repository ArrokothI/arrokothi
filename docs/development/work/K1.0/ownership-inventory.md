# K1.0 ownership inventory and dependency policy

This is the human-readable half of K1.0's boundary. The executable half is
[`tests/conformance/architecture/boundary-policy.ts`](../../../../tests/conformance/architecture/boundary-policy.ts),
and [`kernel-landing-zone.test.ts`](../../../../tests/conformance/architecture/kernel-landing-zone.test.ts)
asserts that the two agree, so neither can describe a boundary the other does not enforce.

Nothing here is Kernel semantics. [Kernel](../../../kernel.md) and [Execution](../../../execution.md)
own what the Kernel means. This file owns only *where code lives and what it may import*.

## Zones

Four owners, by repo-relative path prefix. A path in no zone (tests, examples, scripts, docs) is
unzoned and carries no new rule from this packet.

| Zone id | Roots | Owner and status |
|---|---|---|
| `target-kernel` | `packages/kernel/src` | New Kernel work under the target Activation/Outcome protocol. **Contains no protocol implementation at this revision.** |
| `legacy-core` | `packages/core/src` | The current 0.8.x `Harness`/controller implementation. Explicitly legacy, fully supported, unchanged by this packet. |
| `runtime-integrations` | `packages/agents/strands/src`, `packages/models/gemini/src`, `packages/retrieval/local/src`, `packages/interoperability/mcp/src` | Provider and Runtime adapters. Depend inward on `legacy-core` today. |
| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |

`packages/kernel` is a new directory rather than a rename of `packages/core`. A rename would carry
the existing Harness/controller graph into the target name, which [Execution](../../../execution.md#migration-and-tests)
rejects directly: "Do not rename files and call that an asynchronous migration." The target zone is
`private` in its manifest, so an unimplemented Kernel cannot be published by accident.

## Current cross-boundary dependencies

Measured at base `c9a9ed7e6e538ab0542fc6a999426264abb6212a` by the same analyzer the guards use,
over every `.ts` file in each zone, following relative paths, package roots and package subpaths.

| Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party |
|---|---|---|---|
| `target-kernel` | 2 | nothing | nothing |
| `legacy-core` | 143 | — | nothing |
| `runtime-integrations` | 16 | `@arrokothi/core`, `@arrokothi/core/execution`, `@arrokothi/core/ports`, `@arrokothi/core/reference` | `@langchain/core/documents`, `@langchain/textsplitters`, `@modelcontextprotocol/client`, `@modelcontextprotocol/server`, `@strands-agents/sdk` |
| `host-sdk` | 4 | `@arrokothi/core`, `@arrokothi/core/ports`, `@arrokothi/core/reference` | nothing |

Every zone reaches `node:` builtins; those are omitted above. `legacy-core` reaching no third-party
package is the existing vendor-neutrality property, retained and re-attributed to the legacy zone by
[`legacy-core-boundaries.test.ts`](../../../../tests/conformance/architecture/legacy-core-boundaries.test.ts).

## Export ownership

| Package | Exported subpaths | Published? |
|---|---|---|
| `@arrokothi/kernel` | `.` | No - `private: true` |
| `@arrokothi/core` | `.`, `./execution`, `./ports`, `./reference`, `./testing` | Yes, unchanged |
| `@arrokothi/sdk` | `.` | Yes, unchanged |
| `@arrokothi/integration-strands`, `@arrokothi/provider-gemini`, `@arrokothi/retrieval-local`, `@arrokothi/integration-mcp` | `.` | Unchanged |

`@arrokothi/core`'s five subpaths export 227 / 227 / 44 / 33 / 21 runtime names. K1.0 moves no legacy
source, so those counts and the digests over their sorted name lists are pinned in the guard; a later
packet that intends to change a public surface changes them deliberately.

## What the target zone may import

1. Modules inside `packages/kernel/src`.
2. `node:` builtins.
3. Nothing else.

There is **no approved portable leaf** at K1.0. `packages/core/src/util/{hash,json,result}.ts` and
`packages/core/src/schema/value-schema.ts` are the plausible candidates, and the guard demonstrates
that an explicitly approved leaf would be accepted while its unaudited sibling in the same directory
would still be rejected. None is approved here, because K1.0 implements no target module that needs
one, and approving a leaf without a consumer would freeze a dependency nobody has audited against a
real use. Adding an entry is a reviewed decision in the packet that needs it, not a convenience edit.

A third-party package for the target zone needs an owner decision under
[AGENTS.md's third-party review](../../../../AGENTS.md), not an allowlist edit in a test.

## Deferred extraction and bridge owners

What the target zone cannot reach yet, and who owns changing that. `migratable` means the behaviour
is a plausible portable leaf, still subject to that packet's own audit. `legacy-only` means it stays
behind a legacy bridge. `refused` means the contract is not carried forward in this shape.

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/hash.ts` | migratable | K1.1 | First packet that needs stable identity/receipt hashing. |
| DX-2 | `packages/core/src/util/json.ts` | migratable | K1.1 | Same packet: canonical value encoding for pinned progress. |
| DX-3 | `packages/core/src/util/result.ts` | migratable | K1.1 | Same packet: accept/reject results at the dispatch boundary. |
| DX-4 | `packages/core/src/schema/value-schema.ts` | migratable | K1.2 | Whole-envelope Outcome validation is where a value schema first earns its place. |
| DX-5 | `packages/core/src/runtime/harness.ts` | legacy-only | K1.4 | The synchronous Harness is the legacy Runtime bridge, not target Kernel code. |
| DX-6 | `packages/core/src/runtime/resumption-processor.ts` | legacy-only | K1.4 | `ControllerResumption` may survive privately inside a legacy Runtime adapter; it must stop driving Kernel wait types. |
| DX-7 | `packages/core/src/runtime/effect-processor.ts` | legacy-only | K2.1 | Effect mediation is K2's responsibility; K1 refuses Effects. |
| DX-8 | `packages/core/src/ports/runtime-store.ts` | legacy-only | K3.1 | Persistence profile work owns the store contract. |
| DX-9 | `packages/core/src/ports/scheduler.ts` | legacy-only | K3.1 | Same packet: scheduling belongs with the persistent profile. |
| DX-10 | `packages/core/src/controllers` | legacy-only | R2.1 | Stock Agent/Workflow controllers are Runtime behaviour, not Kernel semantics. |
| DX-11 | `packages/agents/strands/src/agent-executor.ts` | legacy-only | R1.1 | A step adapter whose fidelity is R1's claim to test, not a whole-native-Runtime Driver. |
| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | The closed `DefinitionKind` controller port is replaced by the Driver boundary; it is not carried forward in this shape. |

An assignment is an owner, not a promise that the named packet will preserve the behaviour.

## What this packet does not establish

K1.0 is structural. It implements no protocol handler, freezes no target semantics, introduces no
no-op target API, moves no legacy source file and rewrites no native Runtime. A passing guard is
evidence about dependency direction only. It is not an E1 result, not a K1 acceptance, not a package
release, and not evidence of durability, isolation or Driver fidelity. K1.4 rechecks these structural
obligations against actual behaviour.
