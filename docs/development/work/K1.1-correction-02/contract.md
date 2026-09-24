# K1.1-correction-02 — Bounded refusal cost in in-process value capture

**Owner release:** explicit owner instruction, 2026-09-23, to make this change reviewable before K1.2
proceeds. **Parent:** K1.1 (accepted H `52b1600f3b42e3a360fdc3395178f1d147edf304`, integrated
`b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`). **Governing process baseline:** integrated main
`70467f4cf76896529486499db24fcaa953292491` (006/008/012 as of that commit). This packet does not
change K1.1's historical ACCEPT; it asks for a separate acceptance of the change below.

## Why this packet exists after its payload merged

The owner's values rewrite adopted obligation V-D1 ([decision 01](decision-01.md)): refusing a value
must cost no more than accepting one at the limits. Accepted K1.1 capture did not meet it. A live
object that repeats one shared member stands for a value far larger than the object graph — 32
nested arrays, each holding the next twice, stand for more than four billion arrays — and capture
expanded it in full before the finished-bytes size check could refuse it. The measured cost doubled
per level (21 levels took about 10.6 s during diagnosis on the owner's machine).

The fix was committed as `66e9e84` ("value-debug") on `document-rewrite` and integrated with PR #35
(`70467f4`) before any review. Under 006 a change to accepted code needs an independent review; this
packet supplies the missing record and adds one comment correction. Integration before review is a
recorded process departure, not a precedent.

## Candidate

- Code payload under review: `git diff 227cd05373f5c5f2d4dbb3e8a6d9ff3cd6c23b3f <H> -- packages/kernel/`.
  `227cd05` is the parent of `66e9e84`; `packages/kernel/` did not change between `66e9e84` and
  `70467f4`. The same range also contains the values rewrite's documentation, which is not this
  packet's payload except where listed below.
- Documentation payload: this contract, [decision 01](decision-01.md), one baseline sentence in
  [002](../../002-implemented-kernel-baseline.md), and one provenance paragraph in
  [`mental-model/sources.md`](../../../../mental-model/sources.md).

## Criteria

| ID | Criterion | Governing source | Evidence |
|---|---|---|---|
| KC2-1 | Capture keeps a running canonical byte count per root while it reads, counting every occurrence of a shared member in full, and stops reading once the count passes 1,048,576 bytes. Refusal work is bounded by the limits, not by the caller's input, both across visits and within one visit: a string or member name is read only until its answer is settled (at most one scalar value past the length limit), and an own-names listing is classified only until it exceeds what an accepted container owns. The engine's own-key enumeration is the one step outside Kernel control. | [values: fixed semantic limits](../../../../mental-model/concepts/values.md#fixed-semantic-limits), V-D1; review finding KC2-R1-01 | Tests "thirty-two arrays standing for four billion…", "one long string shared across shared arrays…", "one oversized string…", "one oversized member name…", "a shared oversized string…", "an oversized own-names listing…", "an array listing more names…" |
| KC2-2 | The running count is exact for accepted content: a value exactly at the limit, built from every byte kind (escapes, multi-byte UTF-8, surrogate pairs, numbers, literals, punctuation), passes, and one byte more is refused by the running count. No value the finished-bytes check would accept is refused. | E-6 with K01-O12-03; [canonical form rules](../../../../mental-model/concepts/values.md#the-rules) | Test "the running count is exact…"; retained finished-bytes check |
| KC2-3 | A shared member that is accepted is counted in full at every place it appears, and a shared member refused for another reason is not re-read without bound. | V-D1 | Tests "a shared member is accepted…", "a shared member refused for another reason…" |
| KC2-4 | No accepted K1.1 behavior changes: every pre-existing kernel test passes unchanged; the capture discipline (primordials, no ambient prototype reads, own-data snapshot) is preserved in the new code. | K1.1 C3, KC1-DEC-3/4/6 | Full kernel suite; review of the new helpers against the module's stated discipline |
| KC2-5 | Code comments that quote `values.md` quote its current text. | [values](../../../../mental-model/concepts/values.md) | `values.ts` header item 3; `values.test.ts` "sibling roots are not summed" |
| KC2-6 | V-D1–V-D3 are recorded with their relation to accepted material, and the baseline states the implemented behavior without claiming more. | 006 decision-artifact rule | [decision 01](decision-01.md), 002, `sources.md` |

## Proof methods (012)

Deterministic execution for KC2-1–KC2-4, including a plausible broken implementation the oracle
rejects: the pre-fix `values.ts` from `227cd05`. Run against the new tests, it makes the same
accept/refuse decision at 1,048,576/1,048,577 bytes but reports it through the finished-bytes check,
so the exactness test fails only on which check refused; the three amplifying cases each hit the
60-second child-process kill; the accepted shared-member case passes. The ablation output is
attached to the report. The new tests run the amplifying cases in child processes with that kill,
so a regression fails instead of hanging.
Normative examination for KC2-6. Race/fault and native methods do not apply.

## Exclusions

Tombstones (V-D2) and any wire decoder: not implemented; assigned to K5 retention work and to a
future wire binding. No change to limits, error codes or public API shape: the running-count stop reuses the existing
`too_many_bytes` code, with a message stating that the rest of the value was not read. No successor release.

## Third-party material

None. `canonicalize@3.0.0` remains the approved JCS implementation; this change computes byte counts
without new dependencies.
