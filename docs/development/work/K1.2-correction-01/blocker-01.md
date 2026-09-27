# Owner decision needed — engine descriptor normalization and V-D1

2026-09-27, Codex implementation self-audit; **SELF-R4-DESCRIPTOR-01**. This is an additional
implementer-found dependency of the refusal-cost correction, not a review-06 finding. Same
released K1.2-correction-01, contract revision 4; no successor or integration permission follows.

## Concrete counterexample

The diagnostic `describe` correction removes all constructor/name/array inspection from type
labels. During the wider audit, a different chain walk remains in the required structural
observation: `captureArray` calls the captured `Object.getOwnPropertyDescriptor(container, key)`.
For a Proxy, the engine calls its `getOwnPropertyDescriptor` trap and converts the returned object
into a descriptor **before the Kernel receives it**. That conversion checks descriptor fields,
including absent `get` and `set`, through the returned object's prototype chain.

[probe-descriptor-chain-04.mjs](probe-descriptor-chain-04.mjs) returns prebuilt descriptors with
own data `value`, `writable`, `enumerable` and `configurable` fields. Their prototypes are D empty
ordinary objects. Each trap only increments a counter and returns one prebuilt descriptor. Eight
occurrences of a 4,096-element array produce exactly 32,768 descriptor calls, 32,776 reads and
32,768 `undefined_member` issues, compressed to nine records. Increasing D adds engine work after
the constant-work trap. No diagnostic property is read, and the root is far below the byte stop.

Initial local observations after the describe fix, Node v25.2.1, Darwin arm64:

| D | Direct capture time | Descriptor calls / ordinary reads |
|---|---:|---:|
| 0 | 28 ms | 32,768 / 32,776 |
| 1,000 | 793 ms | 32,768 / 32,776 |
| 10,000 | 5,451 ms | 32,768 / 32,776 |

These observations establish a depth-dependent mechanism, not a universal timing threshold.
The maintained probe also runs the same root through a visible caller's Outcome without a
submission grant, verifies `unauthorized_submission`, checks every retained field except its
single appended refusal, and accepts a subsequent valid answer. Clean-payload reruns and raw
outputs are attached to implementation-04; the temporary exploratory measurements above are not
substituted for those records.

## Why implementation cannot choose the answer

[values V-D1](../../../../mental-model/concepts/values.md#fixed-semantic-limits),
[invalidation-02](../K1.2/invalidation-02.md) and the contract keep the four limits, exact accepted
values, single observation and byte stops binding. KC2-1 says work is bounded by the limits and
names engine own-key enumeration as the exception. The baseline also excludes executing caller
traps. This probe's chain walk is engine conversion after a constant-work trap. Treating it as
another exception would be the engine-lookup exclusion the owner's launch instruction reserves
to the owner. This record does not make that exclusion.

There is no standard JavaScript hook between the trap's return and descriptor conversion. A
check of the normalized descriptor happens too late. Reusing another position's descriptor or
stopping after the first refused position changes the preserved observation/weight guarantees.
Rejecting all Proxies changes currently accepted coherent values. Moving live objects to another
process is not a bounded implementation of the present in-process API.

## Smallest owner decision

Choose the contract for engine-internal work needed to observe live exotic objects:

1. Keep it inside V-D1 and authorize a revised accepted-value/boundary mechanism that can enforce
   the bound. Specify how current coherent Proxy acceptance and single observation should migrate.
2. Explicitly exclude the engine's conversion/lookup work at the live-object observation boundary,
   with a precise boundary and limitations. Update values.md, the implemented baseline, KC2-1's
   claim and this packet's contract through an owner decision. Diagnostic property lookups in
   Kernel code remain eliminated; no exemption is needed for those.

Both require owner authority. Neither is selected here. The dependent V-D1 closure and C3 stay
unresolved under 006's architecture blocker path. Unaffected diagnostic and exact-coordinate
corrections can be validated and handed off, but the packet cannot be WAITING_FOR_REVIEW or
accepted while this obligation is open. The invalidation holds remain.
