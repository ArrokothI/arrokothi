# DRAFT owner decision — Own-array and serializer environment (brief b; F09, F10)

Not adopted. No hold is lifted and no packet is released by this draft.

## Proposed adoption

After adopting A, simplify owned-list traversal and remove shared-realm serializer repair obligations from the cooperative profile, preserving ordinary capture/equality/refusal invariants.

## Options, evidence, claims and closure


The capture stack's `isOpen`/`closeContainer` in `values.ts:492–521` scans depth using descriptor-based `readAt`; the serializer window at `values.ts:1334–1409` saves, resets and restores intrinsics/prototype shape on each successful encode. The direct root cause of the held depth case is repeated uncharged work on refused containers, not just a slow primitive. A direct index read would reduce overhead without proving a bound. A constant-time active-path membership structure could remove repeated scans, but its construction/access must satisfy the chosen profile and meter.

The [controlled ablation](../probes/mechanism-cost.json) executes the same small cooperative value with the serializer window removed, internal reads simplified, or both, only in disposable copies. Every result is checked for equality. Sequential runs show the window dominates this sample; this does not measure a general speedup, safety or accepted-domain equivalence. The [line manifest](../measurements.json) counts the whole modules and explicit spans. The serializer dependency remains approved unmodified `canonicalize@3.0.0`; no dependency replacement was tested or authorized here.

| Option | Benefit and cost | Claims affected | Finishable follow-up |
|---|---|---|---|
| Keep current discipline | Preserves the current hostile profile; carries global save/restore and descriptor work and its review burden. | Existing coherent observation and canonical snapshot invariants; V-D1 hold still needs closure. | Meter all value-dependent operations; bound active-path work; mutation-test iterator.next, descriptor conversion, index shadows and restoration failures; exact same accepted canonical bytes. |
| **Recommend simplify internal traversal under A's cooperative profile** | Use owned dense arrays and an explicit stack/membership mechanism; retain safe arbitrary object-key writes and immutable snapshots. Reduce global environment mutation. Cost is an owner-approved promise change plus broad differential corpus validation. | Removes active realm-poisoning guarantee, not ordinary getters/cycles/aliases/undefined rejection or own `__proto__` fidelity. | Compare accepted values, bytes and diagnostic weights over maintained/generated ordinary corpus; prove progress/budget; retained views stay unchanged after caller mutation; no dependency hook observes caller objects. |
| Move encoding/capture behind bytes adapter | Kernel sees only decoded owned records; serializer executes in a stable isolated realm if needed. Cost belongs to the binding/parser change and adapter maintenance. | Binding capture observations become adapter claims; Kernel equality remains canonical. | Exact wrapper-to-bytes-to-Kernel round trips, bounded parser, malformed framing and mutable-buffer controls; no implicit silent object coercion. |

The owner may retain the keep option or select the listed alternative. A future acceptance is independent of this recommendation.
