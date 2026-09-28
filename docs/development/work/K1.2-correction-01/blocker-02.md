# Owner clarification needed — engine entry work for live Proxies

2026-09-28, Codex cumulative implementer audit; **SELF-R4-HANDLER-01**. Same released
K1.2-correction-01. This finding is implementer provenance, not a review-06 finding. No production
code, accepted-value rule, exclusion or acceptance status is changed by this record.

## What decision-03 settled, and what this adds

[Decision-03](../K1.2/decision-03.md) resolves [blocker-01](blocker-01.md): engine processing of
values returned by required caller code, including a Proxy-returned descriptor, is outside V-D1.
The owner kept Kernel-chosen lookups, all ordinary data work, observation/trap bounds, exact
accepted values, byte stops, ambient safety and diagnostic weights binding. Coherent Proxy
acceptance cannot be removed.

The new counterexample is **before** the trap runs. The engine discovers the handler method
through a caller-built prototype chain. No returned value is being processed at that point.
The audit therefore cannot silently apply decision-03's returned-value exemption to it.

## Concrete witness

[probe-handler-chain-04.mjs](probe-handler-chain-04.mjs) wraps a 4,096-element array of `undefined`
in one Proxy and visits that array eight times. Its handler is a chain of D empty ordinary objects;
the four trap methods are ordinary data properties at the tail. Each trap does fixed work or
returns the target's normal own descriptor/list/prototype. Returned descriptors have no added
prototype chain. The measured variable is discovery of those methods inside the engine.

The exploratory probe gave these Node v25.2.1 / Darwin arm64 observations:

| D | Direct capture time | Element descriptors / reads / own-key calls / prototype calls |
|---|---:|---:|
| 0 | 32 ms | 32,768 / 32,776 / 16 / 8 |
| 1,000 | 704 ms | 32,768 / 32,776 / 16 / 8 |
| 10,000 | 5,606 ms | 32,768 / 32,776 / 16 / 8 |

There are also eight descriptors for `length`. All arms refuse with 32,768 `undefined_member`
occurrences represented by the same nine diagnostic records. The maintained probe asserts all
counts and weights and also runs the root through a visible Outcome caller without submission
authority. That arm must append only one immutable `unauthorized_submission` refusal, disclose
no content diagnostic, cause no delivery and leave the exchange answerable. These timing numbers
identify the mechanism; the final report supplies raw clean-payload runs and their identities.

## Reconstructed engine entry boundary

The cost question reaches all the required operations below. They are grouped here so the owner
can define one boundary rather than grant an exception for each intrinsic separately.

| Kernel entry | Current source locations | Engine dependency before a caller result exists |
|---|---|---|
| Array classification | `values.ts capture`; `envelope.ts acceptIdentityText`; `outcome.ts isRecordLike/isListLike` | `IsArray` follows nested Proxy targets without invoking a trap. |
| Prototype observation | `values.ts captureArray/captureObject` | `getPrototypeOf` method discovery; absent-trap forwarding through nested Proxy targets. |
| Own descriptor observation | `values.ts` length/member/phantom-name observations; `envelope.ts observeOwn` | `getOwnPropertyDescriptor` discovery and absent-trap forwarding before the descriptor-return processing decision-03 covers. |
| Own-key observation | `values.ts` names/symbols; `outcome.ts refuseUnknownFields` | `ownKeys` discovery and target forwarding. Own-key enumeration already has a qualification; that qualification cannot silently exempt the other entries. |
| Ordinary field/member read | `values.ts describedValue` and array length; `envelope.ts observeOwn` | `get` discovery and absent-trap forwarding. Own-data prechecks do not expose or bound the Proxy's handler chain. |

ECMAScript's Proxy algorithms obtain a handler method before calling it; when absent, they can
delegate to the target, which can itself be a Proxy. This is a source-based dependency trace,
distinct from the measured single-Proxy handler witness. See the primary
[Proxy internal methods](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-proxy-object-internal-methods-and-internal-slots).
`IsArray` separately follows Proxy targets recursively; it does not need a trap result. See
[IsArray](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-isarray).

The same engine operations also enforce target invariants. Nested targets or Proxy handlers can
cause engine-internal calls beyond the direct observation the Kernel requested. The required
count boundary needs to say whether those internally induced invocations are included, rather
than silently treating the direct-call count as a count of every callback an engine may perform.
No extra benchmark is claimed for these adjacent mechanisms; they are included in the authority
question because the documented engine procedure establishes the dependency.

For ordinary data with ordinary prototypes, the Kernel's own source still performs bounded
observations. Its descriptions are type-only; no diagnostic `constructor`, `name`, `message` or
coercion lookup remains. Required operations on caller Proxies cannot be made independent of
hidden handler/target structure by inspecting their already-normalized answers. Rejecting all
Proxies or reusing observations would change the guarantees the owner explicitly preserved.

## Smallest owner clarification

Does the caller-code boundary also exclude the engine's required **entry and dispatch machinery
for a live exotic value**: trap discovery, absent-trap forwarding, Proxy-target classification and
internally induced target/handler operations? If yes, define the count obligation as the bounded
observations and invocations selected by Kernel code, while retaining the owner's full bound on
ordinary data and every optional Kernel lookup. If no, identify the authorized boundary or
accepted-value change that can enforce the stronger engine-work/count promise without violating
the preserved coherent-Proxy contract.

This asks for one boundary clarification, not authority to add arbitrary diagnostic lookups or
weaken plain-data V-D1. Decision-03's descriptor-return resolution remains intact. Until this
question is resolved, the cumulative C3/KC2-1/V-D1 disposition cannot be unqualified completion;
unaffected diagnostics and exact-coordinate work can proceed under 006. No successor is released.

## Third-party use

The ECMAScript specification was consulted as primary explanatory reference. No specification
text, implementation source, dependency or service was copied or incorporated. The probe was
written independently for this packet.
