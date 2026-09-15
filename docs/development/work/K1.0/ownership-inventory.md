# K1.0 ownership inventory and dependency policy

This is the human-readable half of K1.0's boundary. The executable half is
[`tests/conformance/architecture/boundary-policy.ts`](../../../../tests/conformance/architecture/boundary-policy.ts),
and [`kernel-landing-zone.test.ts`](../../../../tests/conformance/architecture/kernel-landing-zone.test.ts)
asserts that the two agree, so neither can describe a boundary the other does not enforce.

Nothing here is Kernel semantics. [Kernel](../../../../mental-model/kernel.md) and [Runtime](../../../../mental-model/runtime.md)
own what the Kernel means. This file owns only *where code lives and what it may import*.

## Zones

Four owners, by repo-relative path prefix. A path in no zone (tests, examples, scripts, docs) is
unzoned and carries no new rule from this packet.

| Zone id | Roots | Owner and status |
|---|---|---|
| `target-kernel` | `packages/kernel/src` | New Kernel work under the target Activation/Outcome protocol. **K1.1 implements creation, input ingress, reservation and dispatch; every later boundary refuses by name.** |
| `legacy-core` | `packages/core/src` | The current 0.8.x `Harness`/controller implementation. Explicitly legacy, fully supported, unchanged by this packet. |
| `runtime-integrations` | `packages/agents/strands/src`, `packages/models/gemini/src`, `packages/retrieval/local/src`, `packages/interoperability/mcp/src` | Provider and Runtime adapters. Depend inward on `legacy-core` today. |
| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |

`packages/kernel` is a new directory rather than a rename of `packages/core`. A rename would carry
the existing Harness/controller graph into the target name, and [structural evidence](../../../../mental-model/mechanisms/evidence.md#structural-evidence)
is explicit that moving code is not migrating it: a new directory or package name decides where
future work lands and changes nothing about what the code does. The target zone is
`private` in its manifest, so an unimplemented Kernel cannot be published by accident.

## Current cross-boundary dependencies

Measured over the candidate tree (the payload commit named in the implementation report) by the
same analyzer the guards use, over every `.ts` file in each zone, following relative paths,
package roots and package subpaths.

This table is maintained by whichever packet changes the tree it measures; it is not a K1.0
historical record. K1.0 created the `target-kernel` row, which did not exist at its base
`c9a9ed7e6e538ab0542fc6a999426264abb6212a`, and left the other three unchanged from it. **K1.1**
raised `target-kernel` from 2 `.ts` files to 10 by implementing creation, input ingress, reservation
and dispatch in that zone, and to 11 in its round-8 correction, which gives the rule for building and
reading a Kernel-owned list one owning module (`own-array.ts`, K11-R6-STATE-02); that module is
internal to the zone and adds no exported name. Its base is `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
and its own row is true only of its candidate tree. The other three zones are unchanged by K1.1 as well: it moves and
edits no source in them (base→payload touches none of their files, verified by
`git diff --name-only`), so those rows reproduce at either tree. What has **not** changed across
either packet is the target zone's legacy column: it still reaches no legacy code. Its third-party
column gains exactly one entry in K1.1 round 3: the owner-approved JCS implementation
`canonicalize` (see below).

| Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party |
|---|---|---|---|
| `target-kernel` | 11 | nothing | `canonicalize` |
| `legacy-core` | 143 | — | nothing |
| `runtime-integrations` | 16 | `@arrokothi/core`, `@arrokothi/core/execution`, `@arrokothi/core/ports`, `@arrokothi/core/reference` | `@langchain/core/documents`, `@langchain/textsplitters`, `@modelcontextprotocol/client`, `@modelcontextprotocol/server`, `@strands-agents/sdk` |
| `host-sdk` | 4 | `@arrokothi/core`, `@arrokothi/core/ports`, `@arrokothi/core/reference` | nothing |

Every zone reaches `node:` builtins; those are omitted above. `legacy-core` reaching no third-party
package is the existing vendor-neutrality property, retained and re-attributed to the legacy zone by
[`legacy-core-boundaries.test.ts`](../../../../tests/conformance/architecture/legacy-core-boundaries.test.ts).

## Export ownership

One row per package, with a normalised `Published?` value, so the agreement oracle can compare the
row relation against the manifests rather than checking that each name occurs somewhere on the page.

| Package | Exported subpaths | Published? |
|---|---|---|
| `@arrokothi/kernel` | `.` | No (private) |
| `@arrokothi/core` | `.`, `./execution`, `./ports`, `./reference`, `./testing` | Yes |
| `@arrokothi/sdk` | `.` | Yes |
| `@arrokothi/integration-strands` | `.` | Yes |
| `@arrokothi/provider-gemini` | `.` | Yes |
| `@arrokothi/retrieval-local` | `.` | Yes |
| `@arrokothi/integration-mcp` | `.` | Yes |

Only `@arrokothi/kernel` is new, and only it is private. Every other row is unchanged by this packet.

`@arrokothi/core`'s five subpaths export 227 / 227 / 44 / 33 / 21 runtime names. K1.0 moves no legacy
source, so those counts and the digests over their sorted name lists are pinned in the guard; a later
packet that intends to change a public surface changes them deliberately.

## What the target zone may import

1. Modules inside `packages/kernel/src`.
2. `node:` builtins.
3. Exactly one third-party specifier: `canonicalize` (exact `canonicalize@3.0.0`), owner-approved
   for K1.1 round 3 under [AGENTS.md's third-party review](../../../../AGENTS.md) as the unmodified
   conforming JCS implementation `values.md` requires (K11-R1-JCS-01). The executable rule holds this
   as an exact-specifier allowance, not a prefix: similarly-named packages and subpaths stay refused.
4. Nothing else.

There is **no approved portable leaf** at K1.0. `packages/core/src/util/{hash,json,result}.ts` and
`packages/core/src/schema/value-schema.ts` are the plausible candidates, and the guard demonstrates
that an explicitly approved leaf would be accepted while its unaudited sibling in the same directory
would still be rejected. None is approved here, because K1.0 implements no target module that needs
one, and approving a leaf without a consumer would freeze a dependency nobody has audited against a
real use. Adding an entry is a reviewed decision in the packet that needs it, not a convenience edit.

A further third-party package for the target zone needs a new owner decision under
[AGENTS.md's third-party review](../../../../AGENTS.md), not an allowlist edit in a test. The
`canonicalize` approval above is that decision for this one specifier; its source, version, license,
reuse method and obligations are recorded in [K1.1's round-3 report](../K1.1/implementation-03.md).

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

## K1.1 disposition of its assigned rows

K1.1 owns four of the deferred rows above. An assignment is an owner, not a promise to preserve the
behaviour, and this is that owner's decision. No entry was added to `TARGET_KERNEL_ALLOWED_LEAVES`:
the approved-leaf list is still empty. The target zone imports nothing outside itself except `node:`
builtins and, since round 3, the single owner-approved third-party specifier `canonicalize`
(exact `canonicalize@3.0.0`; see "What the target zone may import" above).

- **DX-1** (`util/hash.ts`, migratable) — **not extracted, and not needed.** K1.1 compares logical
  values by their canonical bytes directly, so no content hash takes part in any identity decision.
  A receipt token is minted from its boundary and an acceptance position, not from a digest. The row
  stays open for the first packet that genuinely needs hashing; it is not this one.
- **DX-2** (`util/json.ts`, migratable) — **not extracted; canonical bytes delegated to the
  owner-approved third-party JCS implementation.** The legacy canonical encoder (`canonicalJson` in
  `util/hash.ts`, alongside `util/json.ts`'s validity walk) maps `undefined` to `null`, admits
  non-finite numbers through `JSON.stringify`, enforces none of the four semantic limits and rejects
  no invalid value. Extracting it would import exactly the repair-on-encode behaviour
  [values](../../../../mental-model/concepts/values.md) forbids. `packages/kernel/src/values.ts` keeps
  ArrokothI's own boundary validation, limits and single capture pass, and calls unmodified
  `canonicalize@3.0.0` only to serialize the immutable snapshot that capture produced. Owner approval
  and the AGENTS.md third-party record are in [K1.1's round-3 report](../K1.1/implementation-03.md);
  the former K1.1-OPEN-2 question is closed by that decision. K1.1 round 4 removed the separately
  callable seal from the zone's export surface: validation, canonical bytes and retained content come
  from one capture, so there is no supported way to seal a value the zone has not validated
  ([K11-R2-VAL-02](../K1.1/implementation-04.md)).
- **DX-3** (`util/result.ts`, migratable) — **not extracted; implemented in-zone.** The legacy file
  is ten lines of the same shape. Crossing the boundary to reuse them would freeze a dependency edge
  for no behaviour.
- **DX-12** (`ports/controller.ts`, refused) — **refused, as assigned.** The target Driver boundary
  carries no `DefinitionKind` and no Agent/Workflow discriminator; which code can interpret an
  Execution's progress is answered by the pinned Definition revision, Runtime contract revision and
  progress codec. `packages/kernel/tests/boundary.test.ts` holds the zone's sources to that.
