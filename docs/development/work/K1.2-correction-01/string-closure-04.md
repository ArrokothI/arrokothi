# Plain-string refusal cost — round 4

## Finding and authority

**SELF-R4-STRING-01 — implementer-found, 2026-09-28.** The final plain-data audit after owner
[decision-04](../K1.2/decision-04.md) found that a bounded number of `charCodeAt` calls did not
bound the work inside the first call on a large primitive string. V8 can keep repeated text as
a compact rope; the first character read flattens the whole string before the scanner can refuse
it. This is a primitive string with no Proxy and remains inside
[V-D1](../../../../mental-model/concepts/values.md#fixed-semantic-limits).

On Node v25.2.1, a fresh 268,435,456-unit `"x".repeat(...)` consumed about 256.2 MiB additional
heap during the old refusal. Flattening that same text before measurement reduced refusal heap
growth to about 1.0 MiB. Earlier sizes 1,048,576 / 16,777,216 / 134,217,728 used about
1.2 / 16.7 / 128.0 MiB. These are exploratory observations from this implementation session,
not benchmark thresholds or independent acceptance. They identify allocation proportional to
the full caller string despite the fixed scan count. The maintained probe below records new
candidate observations in fresh child processes.

The owner amendment in [invalidation-02](../K1.2/invalidation-02.md) already brings integrated
value refusal cost into this packet while preserving accepted values, four limits, single
observation, ambient safety and read-count guarantees. This correction reduces reads after
invalidity is already provable. It introduces no exemption, new semantic limit, Proxy restriction
or transport boundary. It is separate provenance from review 06's constructor-chain finding.

## Correction and compatibility

At the start of `scanBoundaryString`, read only the primitive string's UTF-16 length. A valid
Unicode scalar occupies at most two UTF-16 units, so any string above `2 × 65,536 = 131,072`
units cannot be an accepted boundary string. Return the existing `too_long` scan result before
any character access. At or below that extent, retain the original scalar/Unicode scan and
canonical byte accounting. Both string values and object member names use this one scanner.

Accepted BMP and astral strings retain their exact contents and bytes, including 65,536 astral
characters occupying 131,072 units. A 131,073-unit string is refused with zero character reads.
The existing full-length charge still applies to each refused occurrence, so repetition and the
root byte stop behave as before. The bounded diagnostic message now says the string/member name
cannot fit within the scalar limit; it does not claim an exact scan of malformed contents.

There is one explicit diagnostic difference: a string longer than 131,072 units with an early
lone surrogate now reports `string_too_long` before Unicode inspection. It still refuses whole.
At or below 131,072 units, lone-surrogate detection and its ordering remain unchanged. The
canonical rules require refusal of both invalid forms, with no prescribed precedence between
these two reasons on text already too large to be valid. KC2-1 requires reading only until the
answer is settled and gives an upper read bound; zero character reads meet that obligation.

## Dependency and proof map

| Path / obligation | Distinguishing oracle |
|---|---|
| Scanner's possible UTF-16 extent | 131,072 units still scan; 131,073 units do not. BMP/astral at scalar limit preserve exact accepted value/canonical text; one over refuses |
| No hidden full-string character read | Child process wraps `charCodeAt` before the Kernel captures it, restores the ambient method after imports, and requires zero captured calls on oversized values and names |
| Mixed invalid text | Leading high/low surrogate on oversized text returns `string_too_long` without a character read; malformed text at the possible extent still returns `lone_surrogate` |
| Full charge and byte stop | A 16,777,216-unit string plus outer punctuation is charged exactly; six occurrences of a 200,000-unit string reach 1,200,008 bytes in the seven-member test root; the later undefined member is not diagnosed |
| Creation and ingress | Same scanner, zero oversized-string reads, malformed creation reserves no identity/receipt, ingress changes only one refusal, valid retries still accept |
| Eager Outcome capture | Eight roots without/with a grant do zero oversized-string reads; authority classification and exact combined issue counts stay correct; only one refusal changes the view; valid follow-up accepts |
| Existing KC2 and exact coordinates | Original string/key read upper bounds and all accepted-value limits remain; exact-coordinate schedules retain their independent receipt/answer/view checks |

The three added tests in
[`value-diagnostic-work.test.ts`](../../../../packages/kernel/tests/value-diagnostic-work.test.ts)
distinguish removal of the guard by actual character-read assertions, without timing gates.
The wrapped primitive is checked live on accepted strings; a test cannot pass because its
instrument failed to observe the Kernel. Counts distinguish oversized strings from short array
index spellings that the existing structural scan intentionally reads.

[`probe-string-work-04.mjs`](probe-string-work-04.mjs) runs large direct strings, a pre-flattened
control, creation, ingress, one/eight eager Outcome roots and three near-limit accepted shapes
in fresh processes. It verifies logical results and zero oversized-string reads; heap/time/RSS
are observations without pass thresholds. Run from the repository root:

```sh
node --expose-gc docs/development/work/K1.2-correction-01/probe-string-work-04.mjs
```

## Adjacent explicit diagnostic text

`envelope.boundDiagnostic` uses captured `String.prototype.slice(0, 1,024)` for caller-supplied
protocol and delivery diagnostics. DEC-6 intentionally retains the first 1,024 UTF-16 units,
including its existing surrogate behavior. These explicit diagnostic payloads are not boundary
value roots and do not inherit the four scalar/byte semantic limits or this V-D1 root-cost proof.
A bounded retained prefix does **not** establish bounded processing/allocation for an arbitrary
live primitive string. This correction preserves DEC-6 rather than silently changing its accepted
text. It makes no time/allocation claim for processing arbitrarily large explicit diagnostics.

Identity fragments and value-issue text take a different path: `diagnosticText`,
`diagnosticIdentity` and `issueText` test fixed length bounds before character access, so their
bounded-output claims do not trigger this oversized-root scan. The original review-06
constructor/thrown-value diagnostics now use only `null`/`typeof` and read no string property.
These dependencies were inspected; no additional mandatory in-scope defect was found in them.

## Validation and handoff

Focused validation and the new probe are run during implementation; final clean-C commands,
exact counts, raw outputs and digests belong to the round-4 report. T4 removes only the preflight
line and must be rejected by the maintained zero-read oracle. No third-party material, dependency
or service was added. This implementer closure note does not grant independent acceptance.
