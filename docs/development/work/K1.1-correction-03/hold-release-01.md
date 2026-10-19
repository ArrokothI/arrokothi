# K1.1-correction-03 — owner hold release 01

**Record type:** owner decision. It releases the two claim holds that K1.1-correction-03's acceptance
requested. It is not a review, an acceptance or an integration record.

**Provenance:** recorded on 2026-10-19 by the owner's Claude Code desktop session (`claude-opus-5-5`). That
session had checked [review 03](review-03.md) and transcribed its ACCEPT of H
`4b121d7ba665182b22857f049c05f019f25d0c65` into 007 as acceptance record A `0137dc0d`. It then recommended
releasing both holds. The owner's reply, verbatim:

```text
yes, release both holds and do the cleanup.
```

## Released

1. **[Invalidation-02](../K1.2/invalidation-02.md)'s V-D1 claim hold.** It held the claim that refusing a
   value costs no more than accepting one at the limits. The claim is restored **in its metered meaning**:
   - It is [decision-05](../K1.2/decision-05.md)'s meaning: work units per root, within budget
     B = 3 × 1,048,576 = 3,145,728.
   - It covers no wall-clock bound.
   - Residuals R1–R4 are stated exceptions. They are recorded in
     [values.md](../../../../mental-model/concepts/values.md#fixed-semantic-limits) and in 017 as L-04 to L-07.
   - Each root has its own budget, with no request-wide budget (L-13).
2. **[DESIGN-AUDIT-01 invalidation-01](../DESIGN-AUDIT-01/invalidation-01.md)'s classification hold.** It
   held the claim that the in-process binding refuses re-prototyped built-ins instead of accepting a plain
   projection. The claim is restored **for the detectable kinds**: Map, Set, WeakMap, WeakSet, Date, RegExp,
   array buffers and views, boxed primitives, errors, promises, generators, Map/Set iterators, arguments
   objects, module namespaces, raw JSON objects and native `External` values. Every Proxy is refused as well. The undetectable kinds
   stay a declared limit (017 L-08).

## Not released

- **[Invalidation-03](../DESIGN-AUDIT-01/invalidation-03.md)'s V-ENV hold** ("ambient safety") stays in force
  for BINDING-01 (017 L-01).

Historical ACCEPT records, invalidation notices and integrations are unchanged. This record supersedes the
holds only from its date. Integration of K1.1-correction-03 remains pending the owner's merge, and no
successor is released.
