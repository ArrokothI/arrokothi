# K0.1 protocol worksheet — equality, receipts, batches, clocks, cancellation, progress, policy

**Revision:** 12 — resolves [review-11.md](review-11.md)'s Claude Opus 5 findings
**K01-R11-01–04** and the separately **owner-supplied K01-O12-01–03**. Cancellation request
acceptance fences a losing Outcome in full (CX-6); B-8, ID-6 and B-4 wording is aligned with their
existing rules. E-6 defines total depth, bounds decoded member names as strings, and measures each
E-1 boundary-value root independently. See §13 and revision history for individual dispositions;
the round-12 report accompanies candidate H12. K0.2 remains unreleased.
Revision 10's structural well-formedness correction remains unchanged: K0.1 promises **structure,
never satisfiability** (W-1; [review-09.md](review-09.md), [implementation-10.md](implementation-10.md)).

Revision 9 was the consolidation revision: it reconstructed the whole wait / batch / clock protocol as
**one state machine** rather than patching four findings in place, because four of the preceding five
rounds had found a defect created by an earlier *correct* correction that a neighbouring rule still
contradicted. §3 and §5 were rewritten so that eligibility, wait-ended batch selection and wait
registration are each stated exactly once and cited everywhere else, with §3 carrying one normative
table covering every way a wait can end; eleven further internal defects the reconstruction exposed,
none named by any review, were fixed in that revision and are recorded in §13 as
implementer-discovered. See [review-08.md](review-08.md) and
[implementation-09.md](implementation-09.md) for that round, and
[review-07.md](review-07.md)/[implementation-08.md](implementation-08.md),
[review-06.md](review-06.md)/[implementation-07.md](implementation-07.md),
[review-05.md](review-05.md)/[implementation-06.md](implementation-06.md),
[review-04.md](review-04.md)/[implementation-05.md](implementation-05.md),
[review-03.md](review-03.md)/[implementation-04.md](implementation-04.md),
[review-02.md](review-02.md)/[implementation-03.md](implementation-03.md) and
[review-01.md](review-01.md)/[implementation-02.md](implementation-02.md) for the preceding rounds. **Status:** produced by packet K0.1, awaiting independent review of this revision
per [006](../../006-development-process.md). **Owner of this document:** Kernel, except where a row is
explicitly marked Runtime/Driver or deployment.

This worksheet is a **decision record**, not new architecture: every decision below already follows
from [kernel.md](../../../kernel.md), [execution-protocol.md](../../../detail-design/execution-protocol.md),
[recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md) and
[evidence-and-observability.md](../../../detail-design/evidence-and-observability.md). Where this
worksheet says more than those pages, it is resolving an explicit open question they left to K0
(004's "Open questions and decision points" section, K0/K1 bullet), not overriding them. If a future reader finds a conflict, the
canonical page wins and this worksheet needs a correction, not the reverse (AGENTS.md architecture
precedence). No wire codec, storage engine or scheduler algorithm is chosen here; those stay
replaceable per 001's K0 exit ("Keep the wire codec/store layout replaceable") and are explicitly
flagged "implementation-owned, not decided here" throughout.

Current-code references below are read-only evidence for the legacy classification in §12; this
packet changes no runtime file. Line numbers are as of base commit `6464be1`.

---

## 1. Equality and value limits

**Decision E-1 (canonical value model).** A **boundary-value root** is each individual
Activation/Outcome envelope value field governed by E-1, each Effect proposal value, each Event
payload value, or another logical value explicitly brought under E-1 by the protocol. Each such root
is checked independently under E-6; an enclosing Activation/Outcome is not an additional aggregate
size-accounting root. A boundary value is one of: `null`, boolean, finite JSON number, string, or an array/
object built only from these, recursively. `NaN`, `Infinity`, `-Infinity` and any non-finite number
are rejected before identity/equality is computed — never silently coerced to `null` or a string.
Strings must be well-formed Unicode: a lone surrogate has no UTF-8 encoding, so it is rejected at the
same boundary rather than being repaired into U+FFFD (E-7 rule 6 depends on this).

**Decision E-2 (duplicate object keys).** A boundary value containing a JSON object with a duplicate
key (a raw-wire concept, not a parsed-object concept, since a parsed object cannot itself hold a
duplicate key) is rejected at decode time. The Kernel's equality/identity computation therefore always
runs on an already-decoded, already-deduplicated value; it never has to define "the meaning of" a
duplicate key itself.

**Decision E-3 (key order is not semantic).** Two decoded objects with the same key/value pairs in
different insertion order are the same logical value. Content equality is computed over the canonical
form defined in **E-7**, not over transport bytes: two honest re-serializations of the same value are
not guaranteed byte-identical across codec versions, so a byte-for-byte transport comparison is never
used for logical identity.

**Decision E-4 (absent vs. null).** Where a schema declares a field optional, "the field is absent"
and "the field is present with value `null`" are different logical values and must not be normalized
into each other before comparison. A schema that wants them merged must say so explicitly per field;
the default is that they differ.

**Decision E-5 (hash is not authority).** A content hash (of a checkpoint blob, a payload, an
idempotency key) may be used to detect an *accidental* mismatch or to name a blob for storage, but
is never itself treated as proof of authenticity, consent, or permission — restates
[execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)
("Compare the full identity/content binding; a hash alone is neither authentication nor permission").

**Decision E-6 (bounded values — semantic limits stated with units, corrected in review round 1;
[K01-REV-04](implementation-02.md)).** Every boundary value has a declared, finite bound, stated here
at the semantic level so a K1 fixture can construct an exact pass/fail boundary case without waiting
for a wire codec:

| Bound | Unit / what is counted | K0.1 limit |
|---|---|---|
| Decoded string length (values and object member names) | Unicode scalar values of every decoded string, before E-7 escaping or UTF-8 serialization; not UTF-16 code units or wire bytes | ≤ 65,536 per individual string value or member name |
| Array/object entry count | direct children of one array or one object (not a recursive total across the whole value) | ≤ 4,096 entries |
| Container nesting depth | total recursive depth of each boundary-value root, defined below, including empty containers | ≤ 32 levels |
| Canonical boundary-value size | byte length of **each E-1 boundary-value root** canonicalized separately under E-7; no sum of sibling envelope fields and no wire-byte claim | ≤ 1,048,576 bytes (1 MiB) per root |

**Total depth definition.** For every E-1 value `v`:

- a scalar (`null`, boolean, number, string) has `depth(v) = 0`;
- an empty array or empty object has `depth(v) = 1`;
- a non-empty array has `depth(v) = 1 + max(depth(element))`;
- a non-empty object has `depth(v) = 1 + max(depth(member value))`.

Object member **names do not add a nesting level**. The root container counts as one; there is
no implicit envelope wrapper in this count. The limit is `depth(v) <= 32`.

**Independent size roots.** Canonicalize each root E-1 identifies and check its byte length against
1,048,576. Do **not** sum sibling Activation/Outcome fields or add envelope metadata to an Event
payload's size. An Outcome with progress of about 700 KiB and an emissions field of about 700 KiB
is **not rejected solely because the complete Outcome exceeds 1 MiB**: each root must pass
independently, together with all other structural/schema bounds. This is no aggregate message-size
guarantee. Transport framing and wire byte length remain implementation-owned. A deployment may
impose smaller transport/request limits, but those cannot change K0 semantic equality or value
validity unless versioned into the protocol.

**Exact boundary cases** (all four limits apply simultaneously):

| Value construction | Result |
|---|---|
| `A1 = []`; `A(n+1) = [An]`. Thus A32 is one empty innermost array wrapped in exactly 31 singleton arrays: 32 opening and 32 closing brackets, no scalar leaf | depth 32, **PASS** |
| A33: the empty innermost array wrapped in exactly 32 singleton arrays | depth 33, **REJECT** |
| `T1 = {}`; for n ≥ 1, wrap Tn as `[Tn]` when n is odd and as `{"x": Tn}` when n is even | depth(Tn) = n; T32 **PASS**, T33 **REJECT**; array/object spelling does not change counting |
| Object with one member whose name is exactly 65,536 repetitions of `a`, value `null` | decoded name length 65,536, **PASS** (65,545 canonical bytes) |
| Same, but name has 65,537 repetitions | **REJECT** for decoded string length |
| One Event payload whose canonical form is exactly 1,048,576 bytes and otherwise satisfies E-1/E-6/schema | **PASS** for size; envelope metadata is not added to this root |
| One Event payload whose canonical form is 1,048,577 bytes | **REJECT** before acceptance |

Two different Unicode units appear deliberately in this section and are not in tension: a **string's
length** is counted in Unicode scalar values (first row above), while **object key ordering** compares
UTF-16 code units (E-7 rule 4, aligned to RFC 8785). The first is a counting rule for a bound; the
second is a comparison rule for a total order. Neither follows from the other, and each is fixed here.

An over-limit value is rejected at the same "malformed envelope" boundary as a structurally invalid
one (§7), not truncated silently. The canonical-boundary-value-size bound is also E-6's operative definition
of "large" for the payload-reference rule below: large payloads (checkpoints, artifacts) never travel
as inline boundary values; they travel as application-owned references per kernel.md's Activation/
Outcome shape ("large payloads use application-owned references") once they would exceed it.

These four numbers are K0.1's semantic decision — a K1 fixture tests exactly at and one past each
bound — not placeholders; they are revisable only through an explicit versioned amendment to this
worksheet (recovery-and-compatibility.md's compatibility-dimensions table: "Protocol/codec | Supported
envelope fields and equality rules; refuse unknown required semantics"), the same way any other
protocol/codec compatibility dimension changes. The size bound is computable exactly because E-7
below fixes every byte-affecting rule; what remains implementation-owned is the **transport wire
codec and the storage layout**, which are a different kind of choice, not a softer version of the
same one.

**Decision E-7 (the K0.1 canonical form — added in review round 2, [K01-R2-01](implementation-03.md);
its profile alignment corrected in review round 3, [K01-R3-01](implementation-04.md)).**
Round 2 found that "canonical envelope size = UTF-8 bytes of the canonicalized form" was untestable
while canonicalization itself was left open. The canonical form is therefore fully specified here.

*Purpose and scope.* The canonical form exists for exactly two computations: **logical equality/
identity** (E-3, E-5, and the duplicate/conflict rules in §7) and the **size bound** in E-6. It is an
internal computation over the already-decoded logical value. **No transport is required to emit it.**
A transport may use pretty-printed JSON, a different key order, `\u`-escaped non-ASCII, a binary
codec, or anything else: it conforms as long as it decodes to the same logical value (E-1), and the
Kernel canonicalizes internally before comparing or measuring. Requiring the canonical form on the
wire is explicitly *not* a K0.1 decision.

*Precondition.* Canonicalization runs only on a value that already passed E-1 (finite numbers only),
E-2 (no duplicate object keys) and string well-formedness (rule 6 below). It is never a repair step:
a value failing any of those is rejected (§7), not canonicalized into validity.

*Rules (all byte-affecting rules, normative).*

1. **Output encoding.** The canonical form is a byte sequence: JSON text encoded as UTF-8, with no
   byte-order mark.
2. **No insignificant whitespace.** No space, tab, carriage return or line feed appears anywhere
   outside a string. Structural bytes are exactly `{` `}` `[` `]` `,` `:`, one byte each.
3. **Literals.** `null`, `true`, `false`, lowercase ASCII, exactly as spelled.
4. **Object member order — corrected in review round 3 ([K01-R3-01](implementation-04.md)).**
   Members are sorted ascending by key, comparing the keys as sequences of **UTF-16 code units**,
   each code unit treated as an unsigned 16-bit integer, compared lexicographically — not by Unicode
   code point, not by UTF-8 byte sequence, and not by locale collation. This is RFC 8785's rule
   adopted rather than paraphrased ("Property name strings to be sorted are formatted as arrays of
   UTF-16 code units", compared by "pure value comparisons, where code units are treated as unsigned
   integers, independent of locale settings", RFC 8785 §3.2.3), so that the canonical form and the
   published profile this worksheet cites cannot disagree.

   The recommended implementation follows from the rule rather than diverging from it. In
   JavaScript, `Object.keys(o).sort()` and the default `<` on strings already compare UTF-16 code
   units and are correct unchanged. In a language whose native string order is by code point or by
   UTF-8 byte (Go, Rust, Python 3), the key must be converted to its UTF-16 code-unit sequence before
   comparison; sorting those languages' native order is **wrong** for keys containing
   supplementary-plane characters, because a lead surrogate (U+D800–U+DBFF) compares *below* every
   BMP character from U+E000 upward even though the code point it encodes is far above them. The
   last boundary example below is exactly that case. Revision 3 stated this rule the other way round
   — code points, with UTF-8 byte order recommended — while simultaneously claiming to coincide with
   RFC 8785; both could not be true, and rule 4 is the half that changed.
5. **Array element order.** Preserved exactly as decoded. Array order is semantic; only object keys
   are reordered.
6. **Strings.** Emitted between `"` bytes as UTF-8. Escaping is minimal and fixed: escape `"` as
   `\"`, `\` as `\\`, and the C0 controls U+0000–U+001F — using the short forms `\b` (U+0008),
   `\t` (U+0009), `\n` (U+000A), `\f` (U+000C), `\r` (U+000D) where defined, and `\u00XX` with
   **lowercase** hex digits for every other C0 control. Nothing else is escaped: `/` is emitted raw,
   and every non-ASCII scalar value is emitted as raw UTF-8, never as `\uXXXX`. A string must be
   well-formed Unicode; an unpaired surrogate has no UTF-8 encoding and is **rejected at decode**,
   never silently replaced with U+FFFD.
7. **Numbers — reference pinned in review round 3 ([K01-R3-01](implementation-04.md)).** Finite
   IEEE-754 binary64 only (E-1). The canonical spelling is fixed by an external normative algorithm,
   not by this worksheet's prose and not by an observed implementation's behaviour: it is the
   ECMAScript Number-to-String conversion of **ECMA-262 §7.1.12.1 including its "Note 2" enhancement**
   — the variant requiring the *shortest* decimal string that round-trips to the same binary64 value.
   (Current ECMA-262 editions spell the same abstract operation `Number::toString`; RFC 8785 §3.2.2.3
   makes exactly this reference normative for JCS and names V8 and Ryū as compatible reference
   implementations.) K0.1 adopts that algorithm **by reference**: where this prose and the referenced
   algorithm could ever be read to differ, the referenced algorithm governs and the prose is the
   defect. The consequences below are stated for reviewability and were cross-checked against Node
   `v25.2.1` (`String(x)`, which implements that algorithm) as confirmation, not as the definition:
   - `-0` normalizes to `0` (`String(-0)` is `"0"`), so the two are one logical value;
   - integral magnitudes below 1e21 print with no fraction and no exponent — `1`, `1.0` and `1e0` all
     canonicalize to `1`, and `1e20` canonicalizes to `100000000000000000000`;
   - exponent form appears only at magnitude ≥ 1e21, or non-zero magnitude < 1e-6, and keeps
     ECMAScript's spelling exactly: lowercase `e`, an explicit **`+` for a positive exponent** and `-`
     for a negative one, no leading zeros in the exponent — `1e21` → `1e+21`, `1.5e300` → `1.5e+300`,
     `1e-7` → `1e-7`, `5e-324` → `5e-324`. The threshold is strict on the small side: `1e-6`
     canonicalizes to `0.000001`, with no exponent, and only magnitudes below it use exponent form;
   - no leading `+` on the significand, no leading zero before another integer digit, no trailing `.`.

   The `+` in a positive exponent is part of the canonical bytes. Dropping it — a natural-looking
   tidy-up, and what an earlier draft of this rule wrongly required — would make two implementations
   disagree on identity and size for the same logical value.
8. **Absent versus null (E-4) survives canonicalization.** An absent member is simply not emitted; a
   member present with value `null` emits `null`. Their canonical byte sequences therefore differ,
   which is exactly what makes E-4 testable rather than aspirational.
9. **Equality and size.** Two logical values are equal iff their canonical byte sequences are
   identical. The E-6 size bound is the byte length of that same sequence. Two conforming
   implementations produce identical canonical bytes for the same logical value; if they do not, one
   of them violates a rule above, and that is a defect rather than an allowed variation.

*Relationship to published profiles — corrected in review round 3
([K01-R3-01](implementation-04.md)).* Revision 3 defined rule 4 by Unicode code point and then claimed
rules 4, 6 and 7 "coincide with" RFC 8785. That was false for rule 4 — RFC 8785 sorts by unsigned
UTF-16 code units and explicitly notes that UTF-8/UTF-32 ordering differs — so the normative rule and
the guidance beside it named two different byte sequences. Rule 4 is now aligned, and the relationship
can be stated accurately:

With rule 4 aligned, this canonical form **follows RFC 8785, the JSON Canonicalization Scheme (JCS)**,
for property ordering (rule 4) and for primitive serialization — literals (rule 3), strings and their
escaping (rule 6) and numbers (rule 7) — and agrees with it on output encoding (rule 1), insignificant
whitespace (rule 2), array order (rule 5), and on rejecting lone surrogates, non-finite numbers and
duplicate object keys (E-1, E-2). A conforming, **unmodified** RFC-8785/JCS canonicalizer therefore
emits exactly these canonical bytes for any value that passed E-1/E-2. That is the point of the
alignment: it makes K1's "adopt an existing implementation" option real rather than notional, and it
removes the class of defect this rule has now produced once.

Two scope statements keep the claim honest. First, rules 8 and 9 are **not** JCS rules and are not
claimed to be: absent-versus-null (rule 8) is a property of the logical value E-4 defines, upstream of
any canonicalizer, and rule 9 is K0.1's own use of the resulting bytes for equality and for E-6's size
bound. Second, JCS is normally applied to canonicalize for signing or for wire transmission; **E-7 is
not.** It is an internal computation only, no transport is required to emit it (see *Purpose and scope*
above), and the transport wire codec stays replaceable and implementation-owned.

The rules are still written out in full here rather than incorporated by bare reference, so the
contract stays reviewable in one place — but the reference now genuinely governs rules 1–7, so a
divergence between this prose and RFC 8785 is a defect in this worksheet to be corrected, not an
ArrokothI variant. Adopting any specific library that implements JCS remains a separate K1
implementation decision and stays subject to AGENTS.md's third-party licence/terms review; this
worksheet adds no dependency.

*Deterministic boundary examples.* Each row shows two different but equally valid transport spellings
of one logical value, the single canonical form both produce, and the resulting size — so the
pass/fail result against E-6 is identical whichever spelling arrived:

| Transport spelling A | Transport spelling B | Canonical form (E-7) | Canonical size |
|---|---|---|---|
| `{"b":1,"a":2}` | `{ "a" : 2,⏎  "b" : 1 }` | `{"a":2,"b":1}` | 13 bytes |
| `{"n":1.0}` | `{"n":1e0}` | `{"n":1}` | 7 bytes |
| `{"n":-0}` | `{"n":0}` | `{"n":0}` | 7 bytes |
| `{"n":1e21}` | `{"n":1000000000000000000000}` | `{"n":1e+21}` — the `+` is canonical (rule 7) | 11 bytes |
| `{"s":"\u0041"}` | `{"s":"A"}` | `{"s":"A"}` — rule 6 never escapes what does not require it | 9 bytes |
| `{"s":"\u00e9"}` | `{"s":"é"}` (raw UTF-8) | `{"s":"é"}` — rule 6 emits raw UTF-8, never `\u` | 10 bytes (`é` is 2 UTF-8 bytes) |
| `{"a":null}` | a value that omits `a` entirely — a **different** logical value, not another spelling | `{"a":null}` versus `{}` | 10 bytes versus 2 bytes — E-4 preserved |
| `{"�":1,"😀":2}` | `{"😀":2,"�":1}` | `{"😀":2,"�":1}`, emitted raw: under rule 4's UTF-16 code-unit comparison U+1F600's lead surrogate 0xD83D sorts **before** U+FFFD, so the emoji key comes first whichever spelling arrived. An implementation sorting by code point or by UTF-8 byte emits U+FFFD first (U+FFFD < U+1F600 as code points) and computes a different identity for the same logical value — revision 3's rule 4 required exactly that wrong order | 18 bytes (1 + 1+4+1 + 1 + 1 + 1 + 1+3+1 + 1 + 1 + 1) |

**Left open (implementation-owned):** the **transport wire codec** (JSON text, a binary envelope
codec, framing, compression) and the **storage layout/engine**. Nothing about the canonical form's
rules, the equality computation or the four limits above is open: those are decided here.

---

## 2. Identities and scoped receipts

Restates and pins [execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)'s
identity table as binding decisions, with the "must not be used as" column treated as a refusal rule
an implementation must actively enforce, not merely avoid by convention:

| Identity | Scope | K0.1 decision |
|---|---|---|
| Execution ID | one logical lifetime, never reused after terminal deletion | **ID-1**: an Execution ID is never reissued to a new logical Execution even after the original is deleted/GC'd. A store that recycles primary keys must remap through a separate never-reused logical ID. |
| Input ID | authenticated producer namespace + destination + producer request key | **ID-2**: input identity is a triple (producer principal/namespace, destination Execution ID, producer-supplied request key), not a bare string. Two different producers may legitimately reuse the same request-key text without colliding. |
| Activation ID | one exchange against a pinned accepted progress revision + Event batch | **ID-3** (corrected in K0.1 review round 1 — see [implementation-02.md](implementation-02.md), K01-REV-01): an Activation ID identifies **one immutable semantic exchange** — its pinned accepted progress revision, Event batch and input — for as long as that exchange remains unresolved. Ordinary Driver redelivery of the same dispatch preserves **both** the Activation ID **and** the writer epoch: it is not a new attempt. An authorized takeover (recovery has decided the prior attempt may no longer commit) preserves the **same** Activation ID and the **same** immutable exchange input — it does not invent new mailbox content under it — but **advances the writer epoch**: this is a new attempt at the same exchange, not a new exchange. A **new** Activation ID is minted only when a genuinely new semantic exchange begins, i.e. after the preceding exchange is resolved (an Outcome was accepted for it, or the Execution reached a terminal state) and a fresh dispatch is created. Restates [execution-protocol.md](../../../detail-design/execution-protocol.md#identities-and-immutable-exchanges)'s "A takeover changes only the attempt envelope/epoch after recovery permission has been established; it cannot replace input with new mailbox content under the old Activation ID" precisely: the Activation ID does *not* change on takeover, only the epoch does. |
| Writer epoch | current attempt allowed to submit progress for that exchange | **ID-4**: the epoch is a monotonically increasing integer (or equivalent total order), bumped only by an authenticated takeover decision — including a takeover **within** the current unresolved Activation ID/exchange (ID-3) — never by ordinary retry of the same attempt. Whether the counter is reset or continues across a later, genuinely new Activation ID is an implementation choice (see this section's "Left open" note); either satisfies ID-3/ID-4 as long as a stale epoch for the *current* exchange is always rejected. |
| Effect ID | one immutable logical request; proposal key bound at acceptance | **ID-5 (K2-scoped, recorded here for completeness):** not allocated by K0/K1, since K1 refuses Effects (§8). K0.1 fixes only that when K2 introduces it, it must follow this same "immutable logical request, proposal key bound at acceptance" shape — no separate physical-attempt-numbered identity at this layer. |
| Receipt / acceptance position | evidence a specific request was accepted at a specific boundary | **ID-6**: a receipt names exactly one of the six atomic boundaries in kernel.md's Acceptance/atomicity table (the six atomic boundaries enumerated in ID-7 below) plus the accepted revision/position within it. A receipt is never evidence of anything past that boundary (e.g. an Outcome-acceptance receipt is not evidence any Effect in it succeeded). |

**Decision ID-7 (receipt scope is per-boundary, not per-Execution).** "The receipt" is not a single
value per Execution; each of the six boundaries (creation/input ingress, dispatch intent, Outcome
acceptance, Effect admission, Effect settlement, child/message operation) has its own receipt
identity, because they are accepted at different times by different authorities and a caller must be
able to ask "was *this specific* thing accepted" without it being confused with a different boundary
on the same Execution.

**Decision ID-8 (receipt lookup is principal-scoped).** Restates
[execution-protocol.md](../../../detail-design/execution-protocol.md#outcome-acceptance-algorithm)
step 1: a receipt lookup authenticates the caller and scopes to Executions/boundaries that caller may
see before returning anything, including a "not found" — a receipt lookup must not distinguish
"doesn't exist" from "exists but you can't see it" through response shape/timing in a way that leaks
existence to an unauthorized caller.

**Decision ID-9 (Activation-identity counterexamples, added in review round 1).** Deterministic
schedules ID-3/ID-4 must satisfy, coherent with the duplicate/conflicting-Outcome rules in §7 and the
stale-writer rule kernel.md states directly ("An epoch is not a credential and host liveness is not
proof of ownership; authenticated ingress and the authoritative store decide"):

1. **Ordinary redelivery.** The Driver resends the same dispatch (network retry, no takeover decided).
   Same Activation ID, same writer epoch. The Kernel treats it as the identical in-flight exchange —
   an Outcome later submitted for it is evaluated normally; no stale-writer rejection applies merely
   because delivery repeated.
2. **Lost-host takeover.** The scheduler/lease layer decides the original host may no longer commit
   (§4's scheduler-lease clock, not the wait/Execution deadlines) and authorizes a replacement attempt.
   Same Activation ID, same pinned input — the writer epoch advances. The replacement attempt may now
   submit an Outcome for that Activation ID at the new epoch.
3. **Stale old-epoch Outcome after takeover.** The original (now-superseded) host later submits an
   Outcome for that same Activation ID at its old epoch. It is rejected as a stale-writer conflict
   (OA-3/OA-5) *because the epoch no longer matches*, not because the Activation ID is wrong — the
   Activation ID is still correct; only that writer's authority to commit under it has lapsed. This is
   the case ID-3/ID-4's earlier (round-1) drafting got backwards by minting a new Activation ID on
   takeover instead of advancing the epoch under the same one.
4. **Next semantic Activation.** The prior exchange resolves (an Outcome is accepted, e.g. `continue`
   or a satisfied wait) and the Kernel dispatches again. This dispatch — pinning the newly accepted
   progress revision and a new Event batch — gets a **new** Activation ID. An Outcome submitted against
   the old Activation ID is now stale for a different reason (superseded exchange, not superseded
   epoch) and is rejected the same way: no partial acceptance, no silent revival of the old exchange.

**Left open (implementation-owned):** exact receipt serialization (opaque token vs. structured
tuple), exact epoch representation (integer vs. fencing token), exact request-key hashing.

---

## 3. Eligible batches and input accounting

**Decision B-1 (a batch is a finite set of accepted Event references, not a cursor).** The batch an
Activation is dispatched with is an explicit, finite, enumerable set of **accepted Event references**,
pinned at the Activation-dispatch-intent boundary ("reservation") — not "everything after global
position N." This directly fixes F20 (a single cursor can silently acknowledge unmatched input):
per-entry disposition, not a monotonic cursor, is the required representation.

Two consequences are normative and are relied on throughout §3 and §5:

- **Every member of a batch is an accepted Event.** There is no second kind of batch member. The
  **timeout Event** §5 W-9 defines is an Event precisely so that this stays true; `B-7`'s mandatory
  member is therefore an ordinary member of `B-1`'s set, acknowledged by B-3 and disposed by B-5 like
  any other. Revision 8 left the timeout's semantic home open and so had a mandatory batch member that
  `B-1` had no room for (§13, `K01-R8-02`).
- **The implementation-owned batch bound is at least 1.** A bound of 0 would make `B-6`'s and `B-7`'s
  mandatory members unsatisfiable and would dispatch a Runtime that cannot learn why it was activated.

**Decision B-2 (selection depends on lifecycle *and on how readiness arose*).** There are exactly
**two** selection cases, plus one state in which nothing is selected:

- **Ordinary readiness** — `READY` with no wait-ended readiness outstanding: select a bounded batch
  from all currently unacknowledged Events, in per-Execution acceptance order. This is
  execution-protocol.md's "While READY, select a bounded batch in acceptance order."
- **Wait-ended readiness** — `READY` because a registered wait ended: select by *The wait-ended batch*
  rule below. The genus has exactly two species, `B-6` (an eligible Event ended the wait) and `B-7`
  (the wait's own deadline ended it), differing only in what the batch **must** contain.
- **`WAITING` — no batch is selected at all.** A `WAITING` Execution is not dispatched, so there is
  nothing to select. What §5 W-1's source-category eligibility rule decides while `WAITING` is which
  accepted Events are **eligible**; an eligible Event *ends the wait* (`B-6` path B) rather than being
  selected into a batch from a `WAITING` state, and the resulting dispatch is the wait-ended case
  above. §3 therefore states no eligibility rule of its own: W-1 states it once and §3 cites it.
  Revision 8 paraphrased it here instead, in the superseded "matches a dependency alternative **or** is
  application input matching a subscription" form, which reopened exactly the application-input bypass
  W-1 had just closed — in the one section a K1.1 implementer reads for batch selection
  (§13, `K01-R8-01`).

**Where execution-protocol.md's `WAITING`-side sentence lands.** It reads "While WAITING, select only
Events eligible under the registered wait/subscriptions, **with an eligible wake included before
unrelated backlog**," which is phrased as a selection rule from the `WAITING` side because it predates
W-1's retire-on-wake refinement. Under W-1 the Execution is already `READY` by the time any dispatch
happens, so that guarantee has to **survive the retirement** rather than be applied before it — and
carrying it across is exactly what the wait-ended case does. Revision 5 lost the guarantee by having
only two cases and letting every wake fall into ordinary readiness; the canonical sentence is not
amended here, it is given the mechanism it needs.

**The wait-ended batch (normative).** For the one dispatch that consumes a wait-ended readiness, the
batch is

```text
{ the species' mandatory member, if it has one }  ∪  { Events eligible under the retired wait's rule }
```

selected over the Events **unacknowledged at reservation** — not at the moment the readiness was
created. "Eligible under the retired wait's rule" means W-1's rule as *that* wait spelled it.
Ineligible backlog is never a candidate at any bound, however old it is, and stays queued and
unacknowledged (B-4).

Three details make that rule deterministic rather than merely directional:

- **Truncation is defined.** Retain the species' mandatory member first, then fill the remaining slots
  with the earliest-accepted remaining candidates. So at bound 1 a `B-7` batch is exactly the timeout
  Event even if a result was accepted before it, and a `B-6` batch is the earliest-accepted eligible
  Event. Retaining the mandatory member is a **selection** rule, not an ordering rule: the batch is
  **presented** in per-Execution acceptance order regardless of which member was mandatory.
- **The mandatory member is always available at reservation.** Only an accepted Outcome acknowledges an
  Event (B-3), and no Outcome can intervene between a wait-ended readiness and the reservation it
  produces — there is no Activation in that interval. An accepted terminal decision produces no
  reservation at all. So a wait-ended batch can never be short of its mandatory member.
- **A wait-ended batch is never empty; an ordinary one may be.** `READY` after a `continue` Outcome
  with an empty mailbox dispatches an empty batch, which is correct — the Runtime was asked to
  continue, not to read something. A wait-ended batch always carries at least its mandatory member,
  which is exactly what tells the Runtime *why* it was activated.

The four ways a wait can end, and what each one commits, is the whole protocol in one table. Rows 5 and
6 are the contrast cases that stop the first four from being over-read.

| # | Trigger, and the boundary that accepts it | Accepted together in that one transaction | Lifecycle result | Readiness | Mandatory next-batch member | Other members | Consumed at | Crash before reservation (recovery-and-compatibility.md row) |
|---|---|---|---|---|---|---|---|---|
| 1 | **`B-6` path A** — `await(wait)` is accepted and W-2 step 2 finds an already-accepted, still-unacknowledged Event eligible under the wait just proposed. **Outcome acceptance.** | this Outcome's own batch acknowledgment, progress, emissions and Effect intents; creation **and immediate retirement** of the registration/generation; the readiness | `READY` — never `WAITING` | Event-triggered (`B-6`) | at least one Event eligible under the retired rule | further eligible Events, acceptance order, to the bound | reservation | *Outcome accepted before receipt* — the readiness is part of the accepted Outcome and replays with it |
| 2 | **`B-6` path B** — the Execution is `WAITING` and an Event eligible under the live wait is accepted. **That Event's own acceptance boundary**; there is **no Outcome**. | the Event/mailbox fact, retirement of the registration/generation, and the readiness | `READY` | Event-triggered (`B-6`) | at least one Event eligible under the retired rule | further eligible Events, acceptance order, to the bound | reservation | *Input commit before scheduler notification* / *Settlement committed before wake* — both facts are accepted truth and are reconstructed together |
| 3 | **`B-7` path A** — `await(wait)` is accepted, W-2 step 2 finds no eligible Event, and W-2 step 3 observes the wait's deadline **already due**. **Outcome acceptance.** | as row 1, plus **exactly one timeout Event** for the generation being retired | `READY` — durable `WAITING` is **never** persisted for this generation | deadline-triggered (`B-7`) | **that timeout Event** | Events eligible under the retired rule, acceptance order, to the bound | reservation | *Outcome accepted before receipt* |
| 4 | **`B-7` path B** — the Execution is `WAITING` and the **current** generation's deadline expires. **The Kernel's own Event-acceptance boundary** (Kernel timer provenance, W-9); there is **no Outcome**. | **exactly one timeout Event** for that generation, retirement of the registration/generation, and the readiness | `READY` | deadline-triggered (`B-7`) | **that timeout Event** | Events eligible under the retired rule, acceptance order, to the bound | reservation | *Input commit before scheduler notification*, read for an accepted **timeout** rather than an accepted input |
| 5 | *(contrast)* **Ordinary readiness** — `READY` with no wait-ended readiness outstanding | — | `READY` | ordinary | **none** | all unacknowledged Events, acceptance order, to the bound | n/a | readiness is derivable from the accepted input/lifecycle records |
| 6 | *(contrast)* **No wait was live** — an Event is accepted while the Execution is `READY`, `RUNNING` or terminal (W-3: no generation is live in those states) | the Event/mailbox fact **only** | unchanged | **none created** (`B-8`) | — | it remains queued for later selection under B-2/B-4, or takes a terminal disposition (B-5) | n/a | the accepted Event survives; nothing else was promised |

Rows 1–4 are exhaustive: W-2 fixes that a registration is retired in its own transaction only by row 1
or row 3, and W-3 fixes that a live generation exists only while `WAITING`, where only rows 2 and 4 can
retire it. An accepted terminal decision (§6 CX-2) can also end a live wait; it produces no readiness
and no next Activation, and every unacknowledged Event — a timeout Event included — takes a terminal
disposition under B-5.

**Decision B-3 (whole-batch acknowledgment).** An accepted Outcome acknowledges its *entire* pinned
batch at once, timeout Event included. "Acknowledged" means "the Runtime is on record as having
accounted for this Event", never "the Runtime obeyed it." A Runtime that intentionally ignores one
Event in an acknowledged batch must have recorded that choice in its own progress; the Kernel does not
parse the Outcome to verify semantic compliance (restates execution-protocol.md's input-reservation
section). A cancellation-fenced losing Outcome is rejected under CX-6 and acknowledges **none**
of that batch; reservation alone never constitutes acknowledgment.

**Decision B-4 (unmatched retention, not disappearance).** An Event not in the current batch — it
arrived during `RUNNING`, it arrived while the Execution was `READY` and the bound was already spent,
or it was ineligible during `WAITING` — remains queued with its own independent disposition. It is
a later ordinary candidate under B-2's ordinary-READY rule, or, when a wait-ended readiness is
being consumed, a candidate only if eligible under that retired wait's rule. It is never silently dropped,
never merged into
"the Runtime must have seen everything up to here," and never requires the Runtime to replay history to
notice it — restates B-1/F20's fix directly.

**Decision B-5 (terminal disposition of unconsumed input).** When an Execution reaches a terminal state
with Events still queued/unacknowledged, each of those Events gets an explicit recorded terminal
disposition ("Execution terminated before this Event was acknowledged") rather than being deleted
without record or silently treated as processed. This includes the still-unacknowledged reserved
batch of a losing Outcome rejected under CX-6: when cancellation reaches terminal `CANCELLED`,
those Events receive this disposition, not an acknowledgment. Rejection itself installs no Runtime
state, and retry cannot change the cancellation winner or these Event dispositions.

**Decision B-6 (Event-triggered wait-ended readiness).** An eligible Event ends a registered wait in
exactly two ways — rows 1 and 2 of the table above — and they differ only in **which boundary** commits
the readiness. In both, that boundary does all of the following **in one transaction**:

1. retires the wait registration and its generation, exactly as W-1 requires — no live wait remains;
2. sets the Execution `READY`;
3. records, as part of the **recoverable readiness** that boundary already commits, enough to re-apply
   **that retired wait's eligibility rule** at the next reservation.

**Path A** (row 1) is committed in the **Outcome-acceptance** boundary, which kernel.md's
Acceptance/atomicity table already defines as committing "progress, accepted emissions, all Effect
intents, next state and **recoverable readiness**", and which execution-protocol.md's acceptance step 4
spells the same way. Nothing is added to it.

**Path B** (row 2) has **no Outcome** — the Runtime is not running and submits nothing. The
authoritative boundary is **the one that accepts that Event**, and it must accept the Event/mailbox
fact and the readiness **atomically together**:

| Event that ends the wait | Authoritative acceptance boundary | What that boundary already commits together |
|---|---|---|
| Ordinary application input | **Creation/input ingress** | "subsequent input ID, payload and mailbox entry, **with readiness when applicable**" |
| Effect settlement (K2+; K1 refuses Effects, §8 `EF-1`) | **Effect settlement** | "Authenticated evidence, action state, **result Event and recoverable readiness**" |
| A **message** whose success *is* durable destination-mailbox acceptance | the **destination's Event-acceptance** boundary | that boundary may accept the destination Event and its readiness together, in one atomic decision ("Message send remains an Effect: its success means destination mailbox acceptance, not Runtime processing", kernel.md) |
| A **child terminal result** or any other **routed** Event | the **destination's Event-acceptance** boundary — which may or may not be the same transaction as the source-side terminal/routing commit; see *Routing obligation is not destination Event acceptance* below | the destination Event and its readiness, in one atomic decision at whichever boundary actually accepts that Event |

Two rules bind every row of that table:

- **Never accept the Event durably and then depend on a later unjournaled wake write.** That is the
  exact failure execution-protocol.md forbids — "Never rely on an unjournaled enqueue after commit" —
  and it is the difference between a crash losing a notification (recoverable) and a crash losing the
  *reason* the next batch must be selective (not recoverable).
- **No later Runtime Outcome is needed to make this `READY` state durable.** Path B completes without
  the Runtime being involved at all; the next Outcome is a *consequence* of the readiness, never a
  precondition for it.

**Routing obligation is not destination Event acceptance.** Obligation creation and destination Event
acceptance may be **two distinct accepted facts**:

- A child's terminal boundary may commit the terminal result **plus a durable Kernel-to-parent routing
  obligation** without yet accepting any Event into the parent's mailbox. kernel.md permits exactly
  this: "Kernel-to-parent result routing is committed with the terminal result **or a durable routing
  intent**." In that profile the parent is **not** `B-6`-ready merely because the obligation exists —
  no Event has been accepted for it, so there is nothing a batch could contain and nothing a selector
  could match.
- **Recovery replays or idempotently fulfils the obligation; it never fabricates readiness.**
  recovery-and-compatibility.md's *Terminal result before routing/delivery acknowledgment* requires
  "Replay durable routing/publication intent with the same identity," and *Parent intent before child
  creation/link* requires "Idempotent fulfillment binds one child and one budget debit."
- **`B-6` starts for the parent only when fulfilment actually accepts the resulting Event into the
  parent's mailbox**, and that destination-Event acceptance must atomically record the applicable
  readiness — the same rule as every other path-B row.
- **A single-transaction profile is equally conforming.** Committing the child's terminal result and
  the parent's Event acceptance together is **permitted, not required**. K0.1 mandates neither shape.
- **Never fabricate destination readiness before the destination Event exists.** This is the invariant,
  and it generalizes past children to *any* routed Event: readiness attaches to acceptance, never to
  the obligation. **K4 owns the mechanism** ([007](../../007-work-packets.md);
  composition-and-communication.md owns the interaction contracts), which is why the table above names
  a *boundary role* rather than a mechanism.

**Decision B-7 (deadline-triggered wait-ended readiness).** A wait can also end because its own
deadline ended it, and that must be as crash-safe and as undisplaceable as an Event wake. `B-7` is
`B-6`'s rule with one substitution: the mandatory member is **the timeout Event** (§5 W-9) for the
generation being retired, rather than an Event eligible under the retired rule. There are likewise two
paths, at two boundaries — rows 3 and 4 of the table above — and in both the accepting transaction
does **all four** of the following together:

1. retires that wait registration and its generation (W-1's retirement rule, reached through the other
   door);
2. creates **exactly one** timeout Event for that generation (W-9 fixes its identity, its generation
   correlation and its provenance);
3. sets the Execution `READY`;
4. records recoverable readiness sufficient to deliver that timeout Event in the **immediately
   resulting** Activation.

**Path A** (row 3) is W-2 step 3: the deadline was already due when the `await` registering it was
accepted, so the generation is retired inside the **Outcome-acceptance** boundary and durable `WAITING`
is never persisted for it. **Path B** (row 4) is the ordinary asynchronous case: the Execution reached
`WAITING` and the **current** generation's deadline later expired; the accepting boundary is the
Kernel's own (W-9). A timer naming a **superseded** generation is a no-op and reaches neither path
(W-3).

**Why the timeout Event is mandatory and not merely eligible.** It is the thing the Runtime is being
activated to learn; a batch without it would activate a Runtime that cannot tell why. It is **not**
selected by matching — it satisfies no dependency alternative and no declared subscription, and it does
not need to (W-1's category table, W-9). This is the point revision 8 could not state consistently: its
B-2 selected the wait-ended batch "**only** from Events eligible under the retired wait's rule" while
`B-7` made the timeout mandatory, and its W-1 listed the timeout among the Events that need a dependency
alternative — so for a **subscription-only** wait (W-8's `W₀`, whose dependency list is legitimately
empty) the mandatory member was, by the same document, ineligible. *The wait-ended batch* rule above
resolves it: the mandatory member is a union term, not a filter result (§13, `K01-R8-02`).

At bound 1 the timeout Event takes the slot, and any correlated result that also became eligible stays
queued, durable and unacknowledged (W-9 case 3). Neither fact is rewritten into the other: a timeout is
never proof the awaited action failed (§4 CL-2).

**Decision B-8 (readiness is created only by a wait ending).** No boundary creates wait-ended readiness
except one that retires a wait generation — either a live generation while `WAITING`, or a generation
created and retired within its own registration transaction — rows 1–4 above and nothing else.
In particular, an Event accepted while the Execution is `READY` (ordinarily or with a wait-ended readiness already
outstanding), `RUNNING`, or terminal creates **no** readiness: it is an accepted mailbox fact and
nothing more (row 6). Two failures this forecloses: a second readiness arming behind the first and
silently re-selecting a batch after reservation; and an implementation treating "an interesting Event
arrived" as a wake for an Execution that never asked to be woken.

**Lifetime, consumption and recovery of a wait-ended readiness (both species).**

- **It survives a crash before reservation.** It is committed by the authoritative acceptance boundary
  that creates it, so it is accepted truth and a restart reconstructs it rather than losing it — which
  is why point 3 (`B-6`) and point 4 (`B-7`) are inside the same transaction as the others, in **every**
  path, rather than a follow-up write in any of them. The governing crash window per row is in the
  table's last column; the common rule underneath all four is execution-protocol.md's "Readiness
  notifications may be rebuilt from accepted records. **Never rely on an unjournaled enqueue after
  commit**."
- **It is consumed when that Activation's batch is *durably reserved***, at the
  Activation-dispatch-intent boundary — not at Outcome acceptance and not at an in-memory hand-off.
- **It must not re-arm after reservation.** The pinned dispatch intent and its reserved batch are
  themselves sufficient for replay or takeover: recovery-and-compatibility.md's *Dispatch intent before
  send* window requires the "same immutable Activation," so a redelivery or an authorized takeover
  re-sends that batch rather than re-selecting one. Re-arming would let a takeover recompute a batch,
  which is precisely what that window forbids.
- **It never spans two exchanges.** Once that exchange's Outcome is accepted, the Execution is either
  `WAITING` again (that Outcome registered a new wait), terminal, or *ordinarily* `READY` — at which
  point B-2's first case resumes and previously ineligible backlog is an ordinary candidate again.
  Nothing re-arms a wait-ended readiness except a fresh eligible wake or a fresh deadline expiry of a
  fresh registration.

**What a wait-ended readiness is *not*.**

- **Not a revived wait, and not a second wait type.** The retired registration stays retired, the
  Execution is `READY` rather than `WAITING`, the retired generation is dead, and a timer naming it
  remains a no-op (W-3). No new lifecycle state, no new wait record and no new Kernel entity.
- **Not a per-alternative "satisfied" flag.** What survives is the **selector** — the retired wait's
  own eligibility rule — not a record of which alternative matched, and not any claim about whether
  external work settled (W-1).
- **Not an addressable record.** It is a property of readiness, which the acceptance boundary already
  commits and which recovery already rebuilds, not an object with its own identity and lifecycle.

**Left open (implementation-owned):** the exact bounded-batch max size (≥ 1, `B-1`); the exact per-entry
disposition storage shape (a per-Event flag vs. a set-difference against acknowledged IDs); and the
storage representation of a wait-ended readiness — a flag plus a copy of the retired selector, a pointer
to the retired registration retained for one exchange, or a materialized candidate set are all
conforming.

**A representation may not weaken the selector semantics.** Whichever is chosen, it must preserve *The
wait-ended batch* rule's exact observable result **through reservation**. The materialized-set option is
the one that can go wrong quietly: an eligible Event may be accepted *after* the readiness is created
and *before* the batch is reserved, and the rule is defined over the Events unacknowledged **at
reservation**. A set materialized once at wake and never updated would silently exclude that later
eligible Event and could, at a small bound, produce a different batch than the selector would. So a
materialized set must be maintained as further eligible Events are accepted, or the selector must simply
be re-evaluated at reservation; either is conforming, a stale snapshot is not, and no representation may
narrow the set, widen it, or drop the species' mandatory member.

---

## 4. The three clocks

Restates and pins [execution-protocol.md](../../../detail-design/execution-protocol.md#wait-registration-deadlines-and-liveness)'s
three-clocks paragraph as a binding distinction, since conflating them is the concrete race F20/004
flag:

| Clock | What it bounds | Expiry means | Expiry does **not** mean |
|---|---|---|---|
| **Wait deadline** | one specific `waitingFor` registration (§5) | that registration ends and exactly one **timeout Event** (W-9) is created for its generation; the Runtime receives that Event as the **mandatory** member of the immediately resulting Activation's batch (`B-7`) | the external action it was waiting on failed, or the Execution itself ends |
| **Execution deadline** | the whole Execution's permitted lifetime | ordered logical cancellation (§6) begins | native work is interrupted — cancellation still goes through the same Driver-mediated cancellation path as an explicit cancel |
| **Scheduler lease** | one worker's exclusive claim on a READY→RUNNING Execution | the claim is eligible for release/reassignment; a recovery inspection is triggered | that the previous holder's process is dead, that its native work stopped, or that a new attempt may write without checking accepted state |

**Decision CL-1.** These three are independent identities that must not share a single timer/field.
An implementation with one "deadline" field per Execution used for all three purposes cannot express
"the wait timed out but the Execution should keep running" or "the lease expired but the Execution's
own deadline has not," both of which are required outcomes.

**Decision CL-2 (wait timeout ≠ action failure).** A wait-deadline expiry is recorded as its own fact
alongside (not instead of) any later result for the same dependency, per execution-protocol.md's race
table ("Wait timeout versus action success: preserve both facts"). This is a K2+ concern for Effects
specifically, but the *clock* distinction is a K0/K1 boundary because `ExecutionWait` (§5) already
carries a deadline concept in the target design.

**Decision CL-3 (the wait clock is read at two points, and only two).** A wait deadline is evaluated
**at registration**, inside the Outcome-acceptance transaction that creates the generation (W-2 step 3,
`B-7` path A), and **while the Execution is `WAITING`**, when the current generation's deadline expires
(`B-7` path B). W-3 fixes that a generation is live only while `WAITING`, so there is no third reading
point and no window in which a deadline belongs to a generation that is not live. A superseded
generation's timer is a no-op at either point (W-3).

**Left open (implementation-owned):** exact deadline units/precision, the instant source, and whether
lease expiry uses a heartbeat-renewal or a fixed TTL. W-2 step 3 constrains only that a registration
transaction takes **one** accepted-time observation and that the due comparison is non-strict.

---

## 5. Wait registration, generations, and any-of correlation

**Decision W-1 (the target wait shape: dependency alternatives plus separately declared input
subscriptions).** A registered `waitingFor` carries exactly two declarative lists, plus the optional
wait deadline (§4) and the generation identity every registration has (W-3). Nothing else is part of
the record — in particular there is **no** third list, **no** separate `interleave` field (W-5) and
**no** Runtime-local-work arm (W-4).

1. **Dependency alternatives** — a finite, enumerable list, **possibly empty**. Each alternative is
   one independent declarative selector over an Event envelope, written in the exact grammar fixed
   under *The dependency-alternative selector grammar* below. **Any one** alternative matching an
   eligible Event makes the Execution `READY`; that is the only combinator — there is no boolean
   expression *between* alternatives, no all-of, no negation, no ordering requirement. An all-of join
   remains a Runtime-owned accumulation in its own progress (restates kernel.md's Events-and-waits
   section), never a second Kernel wait primitive.
2. **Declared input subscriptions** — a finite, enumerable list, **possibly empty**. Each entry names,
   by its declared subscription identity, one class of application input that may wake this Execution
   while this wait is registered. This is the "explicit input subscription" execution-protocol.md
   already requires ("A wait names a finite any-of set of correlated dependencies, with optional
   explicit input subscriptions and a deadline") and that kernel.md makes mandatory for input waits
   ("application-input waits require a declared subscription").

**Well-formedness: a structurally non-empty wait declaration.** Registration well-formedness is a
**structural** test over the submitted record, and nothing more. A registration is well formed iff all
three hold:

1. **The declaration is structurally non-empty:** `dependency alternatives + declared subscriptions ≥ 1`.
   Either list may individually be empty; they may not **both** be empty.
2. **Every dependency alternative that is present is itself valid** under *The dependency-alternative
   selector grammar* below — at least one supplied selector field, no supplied empty kind set, no
   selector outside the three fields.
3. **Every declared subscription that is present is structurally valid** — a declared subscription
   identity in the sense of W-1 item 2. This rule fixes only that the entry *is* such an identity;
   its exact spelling remains implementation-owned under W-9's closing *Left open* note, constrained
   there to be finite, declarative and compared by equality.

**This test does not prove that any Event will ever be eligible, and it is not trying to.** It checks
that the Runtime submitted a well-shaped declaration; *eligibility* is decided later and elsewhere, by
the source-category rule below, against Events that actually arrive. The two questions are deliberately
separate, and three consequences follow that a K1.1 implementer must not blur:

- **A structurally valid alternative that is inert still counts toward structural non-emptiness.** An
  alternative naming an application-input kind, or a timeout kind, can never make an Event eligible
  (the category table below), yet it is a valid alternative and it satisfies rule 1. The Kernel does
  **not** audit whether a declared source can in fact wake this Execution, and **no new intent or
  satisfiability checker is introduced** to make it do so.
- **A well-formed wait may therefore never be woken.** If nothing that can actually wake it ever
  arrives and it carries no deadline, the Execution remains `WAITING` until cancellation or another
  accepted terminal decision. That is the semantics the Runtime declared, and it is consistent with
  kernel.md: "Parent/peer cyclic waits can still deadlock: expose correlations and deadlines; do not
  promise general deadlock prevention." **K0.1 promises no general satisfiability or deadlock
  prevention**, here or anywhere else.
- **Requiring an *effective* wake source would break 001's own K0 trace in the other direction.**
  "accept input → delayed fake Runtime → typed output → **input wait** → completion" waits for one
  class of application input and for nothing else, so its dependency list is legitimately empty (W-8).
  Rule 1 exists so that trace is directly representable, not so that the Kernel can certify a wait is
  dischargeable.

**A deadline does not rescue a literally empty declaration.** A record with **both** lists empty is
malformed whether or not it carries a deadline — kernel.md's wait is "on any of a finite set of
correlated Events, **optionally** with a durable deadline," so the deadline *bounds* a wait rather than
being the thing waited for, and CL-1 keeps the three clocks separate identities rather than letting one
stand in for a dependency. A deadline on a **well-formed** wait is a different matter entirely: it can
end that wait through `B-7`, including a wait whose only declared sources happen to be inert.

*Deterministic cases.* Read with the source-category table below; each has exactly one answer.

| # | Submitted wait record | Well-formed? | What then happens |
|---|---|---|---|
| 1 | `dependencies = []`, `subscriptions = []` | **No** — rule 1 fails | Rejected at envelope validation (§7 OA-3); the whole Outcome is refused, no registration exists. **A deadline does not change this**: the same record with a deadline is still malformed. |
| 2 | `dependencies = [{kind: external.input}]`, `subscriptions = []`, no deadline | **Yes** — rule 1 satisfied by one alternative, which is itself grammar-valid | The alternative is **inert**: ordinary application input is eligible only through a declared subscription (category table), and there is none. Arriving input is accepted into the mailbox, produces no wake, is not acknowledged, and stays queued (B-4). The Execution stays `WAITING` — indefinitely, absent cancellation. The eligibility answer is W-7 case 6's; the difference is that `W′` there also carries `D1`/`D2`, which *can* wake it, whereas this record's only declared source is the inert one. |
| 3 | Case 2 **with a deadline** | **Yes** — same structural test | Same eligibility answer while `WAITING`. If nothing else can wake it, the **current-generation deadline** ends it through `B-7`: one timeout Event, `READY`, deadline-triggered readiness. A deadline is how a Runtime bounds a wait it is not certain can be woken; it is not what makes the record valid. |
| 4 | `dependencies = []`, `subscriptions = {continue}` | **Yes** — rule 1 satisfied by one subscription | The subscription-only input wait of W-8, behaving exactly as W-8 states: unrelated input stays queued, `continue` wakes, bound-1 backlog cannot displace it. |

Cases 2 and 3 are the ones revision 9 answered two ways. Its well-formedness rule was titled "one
**eligible** wake source across the two lists combined" and required the wait to "name at least one
Event class that **can end it**", while its selector-grammar paragraph simultaneously permitted exactly
such an alternative as valid-but-inert and "not rejected at registration". A K1.1 implementer could
read either as normative (§13, `K01-R9-01`). The rule above is the structural reading revision 9's
grammar paragraph already implied, stated in terminology that cannot be mistaken for eligibility.

### Eligibility while `WAITING` — by source category first

An Event's **source category** decides which matching rule, if any, can make it eligible. The category
is fixed by **trusted ingress/mint provenance**, never by how a kind happens to be spelled.

| Source category | How the category is fixed | Eligible while `WAITING` when | Never made eligible by |
|---|---|---|---|
| **Ordinary application input** | accepted through the application-input ingress path. In the current vocabulary `external.input` is the one kind in it ("an observation delivered from outside the kernel", `packages/core/src/interaction/events.ts:28`, and, at `:58-60`, "an application observation ... externally mintable through the generic delivery path - a `user.input` is not deliverable that way"); `user.input` is *not* in it (runtime-established, and it settles a specific Effect) | it matches at least one **declared input subscription** (item 2) of the live wait | a dependency alternative, however written. An alternative whose selector happens to match this Event's identity, kind or correlation is **inert** — it neither wakes nor acknowledges (W-7 cases 6–7) |
| **The Kernel timeout Event** (W-9) | minted by the Kernel from its own persisted deadline; no external party can supply it | **never** — it cannot exist while its own wait is live, because the same transaction that creates it retires that wait. It reaches the Runtime as the **mandatory member** of exactly one wait-ended batch (`B-7`), by construction rather than by matching | a dependency alternative **or** a declared subscription. A dependency alternative naming a timeout kind is **inert**, exactly as an alternative naming an application-input kind is |
| **Every other Kernel Event** — runtime-established results and settlements, child results, peer messages, memory observations | accepted through a trusted settlement, routing or runtime-established ingress | it matches at least one **dependency alternative** under the selector grammar below | a declared input subscription, which names application-input classes only (see *This rule is closed for K0/K1* below) |

**The rule.** While `WAITING`, an Event is eligible **iff**: it is ordinary application input **and**
matches at least one declared input subscription; **or** it is a Kernel Event of neither of the other
two categories **and** matches at least one dependency alternative. Nothing else is eligible. Every
other Event is accepted into the mailbox, stays queued with its own disposition (B-4), and neither
wakes nor is acknowledged — and that stays true of application input outside every declared
subscription **even when the wait also carries dependency alternatives** (W-7 cases 6–7).

This rule determines **eligibility**, not batch selection. Wait retirement and recoverable readiness
are governed by §3's `B-6`/`B-7`; **only once the Execution is `READY`** does `B-2` select the resulting
wait-ended batch. Wherever §3 refers to "the retired wait's eligibility rule", it means this rule as
that wait spelled it. `B-2` owns selection, including the timeout Event's mandatory membership.

**The two lists stay separate in both directions.** A subscription is not a fourth selector field on a
dependency alternative, and the source-category rule is not a back door for putting an application
label into the grammar: a subscription names a declared subscription identity (item 2), an alternative
names identity/kind/correlation (grammar below), and neither reaches into the other's category. This is
also why §12's `MIG-5`'s matcher is a *component* of target eligibility rather than the whole of it —
the category test happens around it, not inside it.

**This rule is closed for K0/K1; no part of it is conditional on a later packet.** The mapping above is
exact and complete for K0 and K1: application input → declared subscription; every other ordinary
Kernel Event → dependency alternative; timeout Event → neither. Nothing canonical is lost by that
closure. kernel.md's "An explicit input subscription can allow corrections/peer questions while
waiting" is satisfied under this rule as written, because the two classes it names arrive in different
categories: a **correction** is ordinary application input and is named by a subscription (W-7 case 4),
while a **peer question** is a `peer.message` — a non-application Kernel Event — and is named by a
dependency alternative on its kind and/or the asking correlation. Both can therefore wake a waiting
Execution today, which is the capability the canonical sentence asserts.

composition-and-communication.md's richer form — "A parent waiting for B can explicitly subscribe to
addressed clarification input from B" — sits on a page whose own status line reads **target K4**. If K4
decides that addressed clarification/peer input should *also* be nameable by a declared subscription,
that is a **versioned extension of the interaction contract**, introduced under
recovery-and-compatibility.md's *Protocol/codec* compatibility dimension ("Supported envelope fields and
equality rules; refuse unknown required semantics") with an explicit protocol revision and a refusal
path — not a reinterpretation of this rule and not a K1.3 option left open here. Any such extension
could only ever add a second path for a **non-application** category; it can never give ordinary
application input a path other than a declared subscription, because kernel.md forbids that outright.
Revision 8 left this open as a K1.3 choice, which made the supposedly exact current rule conditional on
a future decision (§13, `K01-R8-03`).

### The dependency-alternative selector grammar (exact)

One alternative supplies **any non-empty subset** of exactly three optional selector fields, each a
canonical dimension kernel.md already names ("Conditions use envelope identity/kind/correlation, not
arbitrary code or model-text predicates"):

| Selector field | Supplied value | The alternative matches a candidate Event when |
|---|---|---|
| **Event identity** | one exact Event/envelope identity | the candidate's envelope identity equals it |
| **Kind** | one Event kind, **or** a **non-empty** finite set of kinds | the candidate's kind equals it / is a member of that set |
| **Correlation** | one correlation identity | the candidate's correlation identity equals it |

- **Within one alternative, every supplied field must match: the combinator is conjunction (AND).** An
  alternative supplying kind *and* correlation matches only an Event having both. A field the
  alternative does not supply places no constraint.
- **At least one of the three must be supplied.** An alternative supplying none would match every
  Event addressed to the Execution; that match-everything alternative is **invalid**, not a shorthand
  for "anything." This is a **structural** rejection at registration (well-formedness rule 2 above),
  and it is the one over-matching spelling the grammar does refuse: accepting it would let a wait that
  means "any application input labelled `continue`" be spelled as "any Event at all." Note what it is
  *not*: it is not a judgement about whether the wait can be discharged. The grammar refuses a
  malformed selector, never a useless one.
- **An empty finite kind set is not a valid supplied Kind selector.** `[]` is rejected here, before any
  matching is attempted. It is neither "a Kind selector that matches nothing" nor a spelling of "Kind
  selector absent": the target grammar expresses absence by *not supplying the field*, and an empty set
  supplied as a value is simply malformed. This rule is normative **here**, in W-1, because W-1 is the
  grammar; §12's `MIG-5` describes only how the current 0.8.x encoding maps onto it and carries no
  validation rule of its own.
- **Between alternatives the only combinator is ANY-OF**, over the finite list in item 1.
- **Every comparison is equality**: identity equality, kind equality or finite-set membership,
  correlation equality. Nothing else — no ordering or range comparison, no prefix, glob or regular
  expression, no negation, no arbitrary predicate, callback, query language or model-text condition,
  and no field outside the three above. In particular an Event's **payload/body is not selectable at
  all** by a dependency alternative.
- **A well-formed alternative can still be inert, and it still counts.** Validity is structural;
  *eligibility* is decided by the category rule above. An alternative naming an application-input kind,
  or a timeout kind, is a valid alternative that matches nothing in those categories. It is **not**
  rejected at registration — the Kernel does not audit a Runtime's intent — it simply contributes
  nothing to eligibility (W-7 cases 6–7) while **still satisfying** well-formedness rule 1's
  structural non-emptiness. Those two statements are the same statement read at two different
  boundaries, and W-1's well-formedness cases 2 and 3 work the consequence through.

**Application-input subscriptions are not dependency alternatives and do not use this grammar.** A
subscription selects a class of application input by its declared subscription identity (item 2),
through the separate branch of the eligibility rule above. The label/name selection it performs is
**not** a fourth selector field, and putting a label into a dependency alternative is not a way to
spell a subscription. That separation is exactly what §12's `MIG-5` turns on: the current matcher
implements the kind and correlation dimensions of the grammar above and implements no part of
subscription matching.

Both lists therefore stay pure declarative, serializable data, compared only by the equalities this
grammar fixes (for alternatives) and by declared-subscription identity (for subscriptions) — restating
kernel.md as quoted above, and the current code's own rule that a wake condition "must stay
declarative, serializable runtime data, not a callback or a query language"
(`packages/core/src/interaction/event-envelope.ts:66-72`).

### Any eligible wake retires the registration; the Kernel keeps no "dependency satisfied" flag

Whichever eligible Event arrives first — a dependency match or a subscribed input — **that registration
and its generation are retired** and the Execution becomes `READY`. The authoritative acceptance
boundary that creates that readiness records exactly two things (`B-6`; the boundary is the
Outcome-acceptance transaction on path A, and the Event's own ingress/settlement/routing boundary on
path B, where no Outcome exists): that this registration ended, and — as **recoverable readiness** —
the *retired wait's own eligibility rule*, so that the next dispatch is selected by it (§3's wait-ended
batch rule) instead of by ordinary acceptance order. Carrying the selector is what makes "this Event is
eligible for the next batch" an enforceable statement rather than an aspiration.

The Kernel records **nothing** about whether any other alternative's external work has settled, and it
carries no partially-consumed wait forward — a wait-ended readiness preserves a *selector*, never a
satisfaction flag. If the Runtime still needs a dependency after processing the Event it woke for — the
ordinary case after a correction or a peer question — its **next Outcome registers that dependency
again**, as a new registration under a new generation (W-3). That re-registration, not a retained flag,
is how an outstanding need is carried forward, and it is what keeps the Kernel free of bookkeeping it
cannot verify: **waking through a subscription is never evidence that an unrelated external dependency
settled.**

**Decision W-2 (registering a wait: one ordered algorithm, inside one transaction).** Registering a
wait and deciding the Execution's next state is a single atomic step, and its internal order is fixed
here so that two implementers cannot reach different next states for the same accepted facts. The
Outcome has already passed §7's OA-1–OA-3, so the wait is well-formed under W-1.

The four steps below are ordered **evaluation** inside **one** transaction, not four commits. Nothing
between them is externally observable and nothing partially commits (OA-4, OA-5); "stop" means the
transaction's next state is decided, not that it ends early. Inside the Outcome-acceptance transaction,
in this order:

1. **Acknowledge this Outcome's own reserved batch first** (B-3). Those Events are now acknowledged and
   are therefore **not** candidates in step 2: a wait can never be woken by the batch the Outcome
   registering it just accounted for. The current code's own docstring already states this
   prospectivity — the condition "describes what is still needed *after* the controller's semantic
   work, so Events already delivered into the Activation that reported it can never satisfy it"
   (`packages/core/src/interaction/event-envelope.ts:57-60`). Without this ordering a wait would
   re-wake on its own input forever.
2. **Create the registration and its generation, then check the mailbox.** Test every
   **already-accepted, still-unacknowledged** Event against the new wait's eligibility rule (W-1). If
   at least one is eligible: retire the registration and its generation, set `READY`, and commit
   **Event-triggered** wait-ended readiness (`B-6` path A, §3 row 1). **No timeout Event is created**
   for that generation, and a timer scheduled for it is stale on arrival (W-3). Stop. This is the fix
   for the "result precedes wait" race in execution-protocol.md's race table; it must not be split into
   "register" then "separately notice," and it is not skipped merely because the dependency list is
   empty (W-8 case 1).
3. **Otherwise, if the wait carries a deadline, evaluate it now** against **one accepted-time
   observation taken in this transaction**. The deadline is **due** iff that observation is at or after
   the deadline instant (the comparison is non-strict: equal instants are due). If it is due: retire
   the registration and its generation, create **exactly one timeout Event** for it (W-9), set `READY`,
   and commit **deadline-triggered** wait-ended readiness (`B-7` path A, §3 row 3). **Durable
   `WAITING` is never persisted for this generation.** Stop.
4. **Otherwise persist `WAITING`** with the live registration, its generation and its deadline. A later
   expiry follows `B-7` path B (§3 row 4).

**Why this order, and why the alternative is refused.** Revision 8 stated the mailbox check itself and
nothing else about this transaction: it fixed neither the batch-acknowledgment ordering (step 1), nor
what a deadline does here (step 3), nor how the two interact. Three things are therefore decided here.

- **Step 2 precedes step 3** because the Event was an accepted fact *before* this wait existed, so
  treating it as the wake is the same "no lost wake" guarantee execution-protocol.md requires — and
  because minting a timeout for a wait that an already-accepted Event had ended would record a timeout
  that never semantically happened. Since step 3 runs only when step 2 found nothing, an Execution can
  never hold both an Event-triggered and a deadline-triggered readiness for one generation, and §3's
  four wait-ended rows stay mutually exclusive.
- **Step 3 collapses rather than persisting `WAITING`.** The alternative — persist `WAITING` and let
  the deadline machinery fire immediately as an ordinary `B-7` path B — reaches the same eventual state
  but makes the observable next state depend on timer latency: a K1 fixture registering an already-past
  deadline could see `WAITING` for an unbounded interval and could not assert an exact outcome, and an
  implementation whose timer only scans periodically would be conforming while visibly sitting past its
  own deadline. K0.1-C2/C6 need one answer, and this is it. Revision 8 left the case undecided with
  "two defensible answers" (§13, `K01-R8-04`).
- **This does not contradict execution-protocol.md.** Its "If one is already present, next state is
  READY; otherwise it is WAITING" resolves the *Event-presence* branch — which is exactly step 2 — and
  says nothing about a deadline, which CL-1 keeps as a separate identity evaluated at the same boundary.
  kernel.md's own lifecycle line already admits an `await` whose accepted next state is `READY`
  ("RUNNING + accepted await → WAITING (or READY if already satisfied)"). The invariant K0.1 states is
  the narrower and stronger one both are instances of: **a wait that cannot be live at the moment of
  its own registration is never persisted as live**, and steps 2 and 3 are the only two ways that
  happens.

**One clock reading per transaction.** Step 3 must use a single accepted-time observation for the whole
transaction; two reads inside one transaction could disagree and make the outcome depend on which line
of code asked. The units, precision and source of that observation stay implementation-owned (§4's
"Left open"), and nothing here makes the wait clock the Execution clock or the lease clock (CL-1).

**Decision W-3 (wait-generation identity is scoped to wait-*created artifacts*).** Every `waitingFor`
registration has its own generation identity, distinct from the Execution ID and from the Activation ID
that created it.

**Generation fencing applies to artifacts the wait registration itself created for its own bookkeeping
— concretely, a timer scheduled against that specific registration.** A timer naming a generation that
has since been replaced (the Execution moved on to a new wait, or resolved and re-entered `WAITING` on
a different dependency) is a no-op, never a wake of the current wait: this is exactly kernel.md's
"stale timers cannot wake a replacement wait."

**Generation fencing does *not* apply to authenticated Kernel Events.** An accepted result/settlement
Event is a durable mailbox fact the instant it is accepted, independent of which wait generation
happened to be live at that moment (the atomic mailbox check applies at *whatever* wait is current when
it runs, per W-2 step 2) — it is never discarded or treated as belonging to an obsolete generation
merely because an intervening wait replaced the one that was active when the Event arrived. Round 1
wrongly generalized generation fencing from "stale timers" to "a timer or a late settlement," which
would have let a currently-registered, explicitly correlated wait miss an Event it should be able to
observe (W-6 counterexamples 3–4).

**A generation is live exactly while the Execution is `WAITING`.** It is created inside an
Outcome-acceptance transaction and is either retired in that same transaction (W-2 step 2 or step 3) or
persisted together with `WAITING` (step 4) until it is retired by `B-6` path B, `B-7` path B, or an
accepted terminal decision (§6 CX-2). There is therefore **never** a live generation while the
Execution is `READY`, `RUNNING` or terminal, which is why §3 row 6 creates no readiness and why a
"current-generation deadline expiry" (`B-7` path B) can only be accepted while the Execution is
`WAITING`.

**Decision W-4 (the target Kernel `waitingFor` record has no Runtime-local-work arm at all).** The
target Kernel wait record is defined **only** in terms of a finite, enumerable set of correlated
**Kernel Events**, with optional explicit input subscriptions (kernel.md's Events-and-waits section:
"Start with a wait on any of a finite set of correlated Events... An explicit input subscription can
allow corrections/peer questions while waiting"). There is no second arm for "Runtime-local work" in
this record at all — not a Kernel-visible one, not a legacy-classified one, not a placeholder.
Runtime-local promises/jobs that have not crossed a Kernel dependency boundary (i.e. were never
proposed as a Kernel-mediated Effect) are **entirely Runtime/Driver-private**: the Kernel never learns
their identity and never fences a wait generation against them, because no `waitingFor` registration is
created for them in the first place.

The consequence for an Activation whose only outstanding work is such local work: it simply **does not
yet submit an Outcome**. From the Kernel's side that Activation remains `RUNNING` — "an Activation
remains unresolved, not that a process is currently making progress" (mental-model.md) — because
"Dispatch does not synchronously await native work in the coordinator loop. The Driver eventually
submits an Outcome" (kernel.md). There is no third lifecycle state and no Kernel-visible dependency
record for this case; it is exactly the same `RUNNING`-is-unresolved concept K3/recovery already uses
for a lost/slow attempt, applied here to an attempt that is merely slow rather than lost.

This is why the current `ExecutionWait` `controller_resumption`/`dependencies` arms and the backing
`ControllerResumption` record (§12, `LEG-1`) do not inform the target wait record's *shape* at all —
not even as a withdrawn/legacy-labeled arm. They may continue to exist, privately and unchanged, as
K1.4 compatibility-Runtime-internal bookkeeping that a legacy controller bridge uses to decide when it
has enough to finally produce an Outcome — but nothing about that bookkeeping is reflected in, or
constrains the shape of, the new Kernel `waitingFor` record.

**Decision W-5 (`interleave` is current-0.8.x legacy/compatibility semantics, not a target Kernel wait
field).** Current code carries an optional `interleave?: WakeCondition` on two `ExecutionWait` arms
(`packages/core/src/execution/context.ts:102-108`, with the "Controlled interleaving" docstring at
`:79-100` and the constructor at `:132-134`) and on the matching controller report
(`packages/core/src/ports/controller.ts:86-92`, `:109`). Its documented meaning is a second, separate
wake condition whose match "makes this Execution `READY` for another Activation, without the primary
dependency being satisfied" (`context.ts:88-89`).

**The target Kernel wait record has no `interleave` field.** W-1's two lists already express everything
it expressed, and more precisely: what `interleave` calls "Events I can safely process while my primary
dependency is unresolved" is, in the target record, either **another dependency alternative** (a
correlated Kernel Event the Runtime is willing to be woken by) or **a declared input subscription**
(application input). The one thing `interleave` adds beyond that — a Kernel-visible distinction between
a wake that satisfies the primary dependency and a wake that does not — is exactly the per-registration
"satisfied" state W-1 deliberately does not keep: any eligible wake retires the registration, and the
Runtime re-registers whatever it still needs.

The field is legacy: §12's `REF-5` refuses adoption of the current `ExecutionWait.event` shape
*including* this optional field as the target record, and `LC-1` keeps the current file working
unchanged for current 0.8.x paths until they migrate. What survives is the *principle*, which W-1
states independently: every wake source is declarative data the Runtime supplied in its own Outcome —
the Kernel never infers on its own that some Event is "probably safe to wake for."

**Decision W-6 (deterministic counterexamples: local work, generations and late results).**

1. **Local work alone creates no `WAITING`.** A controller has only Runtime-local (native/model) work
   outstanding and no Kernel-visible dependency to report. Its Activation stays unresolved (`RUNNING`);
   the Kernel never creates a `waitingFor` record, and no wait generation is ever allocated for it.
   Only once the Runtime produces an actual Outcome does the Kernel see anything — in the target's own
   vocabulary, `continue`, `await(wait)`, `complete(result)` or `fail(error)` (kernel.md's
   Activation/Outcome shape), not the 0.8.x controller status names.
2. **Stale timer G1 cannot wake G2.** A wait is registered with generation G1 and a persisted timer.
   Before G1's deadline, the wait resolves and the Execution re-enters `WAITING` on a different
   dependency under generation G2. G1's timer later fires; it is a no-op against G2 (W-3).
3. **Timeout/replacement, then a late result, retains the result.** G1 times out (or is replaced by G2
   as in case 2) and *afterward* an authenticated result Event correlated to G1's original dependency
   is accepted. That Event is retained as a durable mailbox fact (kernel.md: "Wait timeout versus
   action success: preserve both facts") — it is not deleted or invalidated merely because the wait
   that originally asked for it moved on. If the Execution is not `WAITING` when it arrives, its
   acceptance creates no readiness (§3 row 6, `B-8`).
4. **A later, explicitly correlated wait can make an already-accepted result eligible for a batch.**
   Continuing case 3: if a new wait (G2, or a still-later G3) explicitly correlates to that
   still-unacknowledged Event (same correlation ID/kind), W-2 step 2 finds it at registration and
   creates `B-6` path A readiness. `B-2` selects the resulting batch once `READY`; neither registration
   nor reservation acknowledges the Event (B-1, B-3). Generation fencing (W-3) never blocks this,
   because the Event itself was never generation-scoped; only the now-superseded G1 timer was.

**Decision W-7 (deterministic wait-shape examples).** One scenario throughout: Execution P has spawned
children C1 and C2 and registers wait `W` with dependency alternatives `D1` (kind `child.result`,
correlation `c1`) and `D2` (kind `child.result`, correlation `c2`), and declared input subscriptions
`{correction}`.

1. **Two differently correlated alternatives.** `D1` and `D2` are separate entries in one finite list;
   either one matching wakes P, and neither is privileged by list position. The current record shape
   cannot express this (`REF-5`): its single `wake` carries one `correlationId`, which must be `c1`, or
   `c2`, or `null` — and `null` over-matches, waking P for any `child.result` addressed to it,
   including an unrelated third child's. The *matcher* each alternative is written with does migrate
   (`MIG-5`); the single-condition record holding it does not.
2. **Result before wait, for either alternative.** If C2's result was accepted *before* `W` was
   registered, W-2 step 2 finds it and P is `READY`, never `WAITING` — and this must hold for whichever
   alternative the already-accepted Event matches, not only for the first one listed. Same outcome if
   C1's result is the early one.
3. **Ordinary input outside any subscription stays queued.** Application input labelled
   `billing.question` arrives while `W` is registered. It is ordinary application input, so W-1's
   source-category rule sends it down the **subscription** branch and nowhere else; `billing.question`
   is not in `{correction}`, so it matches no subscription and is **not eligible**. It is accepted into
   the mailbox, produces **no wake**, and is **not acknowledged**, remaining queued with its own
   disposition for later selection under B-2 (B-4). (That it also fails to be a `child.result` is true but
   no longer the operative reason — case 6 below is the same input against a wait that *does* have a
   matching alternative, and the answer is unchanged.)
4. **Subscribed correction input may wake.** Application input labelled `correction` arrives. It
   matches the declared subscription, so it is eligible: P becomes `READY` and the Runtime sees it in
   the next batch — and it is **`B-6` path B** that makes "the next batch" contain it rather than this
   example simply asserting so. The boundary that accepts the `correction` input — creation/input
   ingress, which commits "mailbox entry, **with readiness when applicable**", since P is `WAITING` and
   no Outcome is in flight — records `W`'s eligibility rule as wait-ended readiness in the same
   transaction, and §3's wait-ended batch rule selects that one dispatch by it. That wake **retires `W`
   and its generation** (W-1) — the Kernel does not hold `D1`/`D2` open behind the correction and
   asserts nothing about whether either child result arrived. Both are in fact still outstanding, so
   the Runtime's next Outcome **registers `D1` and `D2` again**, a new registration under a new
   generation (W-3). Waking through a subscription is eligibility to run, never evidence that an
   unrelated dependency settled. Note what this example does *not* need: no `interleave` field, because
   `correction` is a declared subscription in `W` itself (W-5).
5. **Unmatched backlog remains unacknowledged.** In the Activation that case 4 produced, the dispatched
   batch contains the `correction` input (and any other Event eligible under `W`'s retired rule), not
   the queued `billing.question` — by §3's wait-ended batch rule, not by assumption: `billing.question`
   matched no alternative and no subscription of `W`, so it is ineligible under the retired rule and
   cannot enter this batch however old it is. The accepted Outcome acknowledges its *whole reserved
   batch* (B-3) — which by construction excludes `billing.question`, so that input keeps its own
   per-entry disposition and is still pending afterwards. An implementation that advanced a single
   mailbox cursor past it instead would silently acknowledge input the Runtime never saw, which is
   exactly why `REF-4` refuses the current cursor mechanism for K1.
6. **Negative: a dependency alternative cannot make application input eligible.** Take a variant wait
   `W′` identical to `W` except that the Runtime also wrote a dependency alternative `D3` with
   `kind = external.input` and no correlation, and **left the subscription list empty**. Ordinary
   application input labelled anything at all now arrives. `D3` matches it on kind — and it is still
   **not eligible**: W-1's source-category rule routes ordinary application input through the
   subscription branch only, and `W′` declares no subscription. The input is accepted into the mailbox,
   produces **no wake**, is **not acknowledged**, and stays queued (B-4). `D3` is a structurally valid
   alternative that is simply inert.
7. **Positive: the same input with the matching subscription wakes.** Take `W″`, identical to `W′` but
   with declared input subscriptions `{correction}`. Application input labelled `correction` arrives.
   It is ordinary application input, it matches a declared subscription, so it **is** eligible: `W″`
   and its generation are retired, P becomes `READY` with `B-6` readiness, and `B-2` selects the
   resulting batch from Events eligible by `W″`'s rule (cases 4–5). Input labelled `billing.question`
   against the same `W″` is still ineligible and still queued. Note what `D3` contributed in either case: **nothing**. A
   dependency alternative naming an application-input kind is inert, and a Runtime that wants to wake
   on application input must say so with a subscription.

**Decision W-8 (the K0 trace's subscription-only input wait — deterministic counterexample).** This is
001's own K0 trace end to end — "accept input → delayed fake Runtime → typed output → input wait →
completion" — and it is the case a non-empty-dependency-list rule could not express. It is also the
fixture shape 007's K0.2 must build ("the smallest public delayed-Runtime/typed-output/input-wait
fixture"), so K0.1 owes it an unambiguous wait record.

Execution X is created with its initial input. Its Runtime computes, then submits an Outcome carrying
typed output and `await` with a wait `W₀` whose **dependency-alternatives list is empty** and whose
**declared input subscriptions are `{continue}`**: X waits for one class of application input and for
nothing else. `W₀` is well-formed under W-1 — its declaration is **structurally non-empty**, one
subscription being enough, and that subscription is structurally valid.

1. **Registration.** `W₀` is accepted and W-2 runs its ordered steps. If an eligible `continue` input
   was already accepted and unacknowledged, step 2 finds it and X is `READY` immediately — W-2's
   mailbox check applies to a subscription-only wait exactly as it does to a dependency wait, and there
   is no "no dependencies, so nothing to check" shortcut. That immediate-`READY` outcome is `B-6`
   **path A**: one transaction registers the wait, retires it and commits the readiness. If `W₀` also
   carried a deadline that was already due and step 2 found nothing, step 3 applies instead and X is
   `READY` with a timeout Event and no durable `WAITING` (`B-7` path A). Cases 2–4 take the remaining
   branch, where X did reach `WAITING`.
2. **Unrelated input stays queued.** Application input labelled `billing.question` arrives. It matches
   no dependency alternative (there are none) and `billing.question` is not in `{continue}`, so it is
   **not eligible**: it is accepted into the mailbox, produces **no wake**, is **not acknowledged**, and
   keeps its own per-entry disposition for later selection under B-2 (B-4). This is the property that
   makes the wait selective — an implementation that woke X here would be waking for every
   `external.input` regardless of label.
3. **Subscribed input wakes.** Application input labelled `continue` arrives. It matches the declared
   subscription, so it is eligible: `W₀` and its generation are retired and X becomes `READY` (W-1),
   and the same input-ingress transaction that accepts `continue` records `W₀`'s eligibility rule as
   wait-ended readiness (`B-6` path B — X is `WAITING`, so there is no Outcome to carry it, and the
   readiness must not be written afterwards). The next Activation's batch is therefore selected by §3's
   wait-ended batch rule: it contains the `continue` input and **not** the still-queued
   `billing.question`, which is ineligible under the retired rule.
4. **An older ineligible Event cannot displace the wake, even at batch bound 1.** Re-run case 3 with
   the implementation-owned batch bound set to its smallest legal value, **1** (`B-1`). Two Events are
   unacknowledged at reservation: `billing.question`, accepted **earlier**, and `continue`, accepted
   **later**. Under an ordinary `READY` selection — a bounded batch of all unacknowledged Events *in
   acceptance order* — the single slot would go to `billing.question`, and X would be activated without
   the Event that woke it while `continue` waited behind the very backlog it was supposed to jump. The
   wait-ended batch rule forbids exactly that: `billing.question` is ineligible under `W₀`'s retired
   rule and is not a candidate at any bound; the one slot goes to `continue`, which is also the batch's
   mandatory at-least-one eligible Event. `billing.question` stays queued and unacknowledged with its
   own per-entry disposition (B-4) — it is not dropped, and it is not acknowledged by the Outcome that
   ends this exchange (B-3). Once that exchange's batch is reserved the readiness is consumed; if X's
   next accepted Outcome registers no new wait, X is *ordinarily* `READY` again and normal
   acceptance-order handling resumes, at which point `billing.question` is an ordinary candidate like
   any other.
5. **Completion is permitted.** X's Runtime processes `continue`, and its next accepted Outcome may be
   `complete`. Nothing about having waited on a subscription rather than a dependency stands in the
   way: CX-3's completion check looks for unresolved *owned work*, and X has none — it proposed no
   Effects (K1 refuses them outright, §8/`EF-1`) and named no dependency alternative that could still
   be outstanding. The accepted Outcome acknowledges its whole reserved batch (B-3), which by
   construction excludes `billing.question`; that input therefore receives an explicit recorded
   terminal disposition when X reaches `COMPLETED` (B-5), rather than being silently treated as
   processed.
6. **The deadline case a subscription-only wait makes sharp.** Give `W₀` a deadline, let X reach
   `WAITING`, and let that deadline expire with `billing.question` still queued and the batch bound at
   **1**. `W₀` has **no dependency alternatives at all**, so nothing in it could ever "match" a timeout
   — and the timeout Event is still the batch's **mandatory** member (`B-7`), because it is a union
   term in §3's wait-ended batch rule rather than a filter result, and because W-1's category table
   puts the timeout Event outside the matching rules entirely. `billing.question` remains ineligible
   and queued. This is the exact shape revision 8 could not answer consistently: its B-2 selected the
   wait-ended batch "only from Events eligible under the retired wait's rule" while its W-1 required a
   dependency alternative for the timeout, which for `W₀` does not exist — so the same document made
   the mandatory member ineligible (§13, `K01-R8-02`).

**What this makes unnecessary — and what it deliberately does not police.** The target gives "wait for
application input `label=continue`" a **direct representation**, so neither defective spelling is
*required* any more: a Runtime need not **invent a fake dependency alternative** that nothing will ever
settle, and it need not **leave the subscription list empty** and let a catch-all dependency alternative
over-match, waking X for every `external.input` addressed to it regardless of label — which is precisely
the limitation the current matcher has (`MIG-5`). W-1's structural non-emptiness rule makes `W₀`
expressible as written: the dependency list is legitimately empty and the subscription carries the whole
wait.

**The Kernel does not, however, reject a useless wait.** A Runtime may still submit a structurally
valid but pointless declaration — a dependency alternative correlated to work it never started, or the
inert `{kind: external.input}` alternative of W-1's well-formedness case 2 — and the Kernel will accept
it and give the Runtime exactly the semantics it declared: no wake from that source, and `WAITING`
until a deadline, a genuinely eligible Event, or cancellation ends it. The Kernel proves **structure**,
never **satisfiability**; it audits neither a Runtime's intent nor whether the work an alternative names
exists. Revision 9's wording here claimed more than that — it read as though the protocol ruled the fake
dependency out — and that claim is withdrawn (§13, `K01-R9-01`). What the target removes is the
*necessity* of the workaround, not the Runtime's ability to write a bad wait.

**Decision W-9 (the timeout Event).**

*Semantic home — decided here, not left to K1.* **A wait-timeout observation is a Kernel Event.** `B-1`
makes an Activation batch a set of accepted Event references and `B-7` makes the timeout a mandatory
member of one; those two statements have exactly one consistent reading. Revision 8 left the home open
— "an Event of a dedicated kind in the mailbox, a distinct field on the Activation's accepted-input
contract, or another representation" — which left `B-7`'s mandatory member with no place in `B-1`'s
batch (§13, `K01-R8-02`).

Being an Event is also the **minimum-concept** answer, which is why it satisfies K0.1-C4 rather than
straining it. The alternative — a batch whose members are "Events **or** timeout facts" — would add a
second batch-member type to the Kernel and duplicate three rules behind it: B-3's whole-batch
acknowledgment, B-4's per-entry retention and B-5's terminal disposition would each need a second form.
execution-protocol.md already reads this way: "Timeout and a result may both be accepted facts; order
their acceptance and let the Runtime interpret **the eligible batch**."

*What it carries (normative).* A timeout Event has at least:

- **a stable Event identity** of its own, like any accepted Event;
- **a destination** — the Execution whose wait expired;
- **a semantic timeout class**, distinguishing it from every ordinary Kernel Event, so a Runtime can
  tell "my deadline expired" from an ordinary observation without inspecting a payload and without
  inferring it from an otherwise-empty batch;
- **exact wait-generation correlation** (W-3) — *which* wait ended. This is what lets a Runtime whose
  successive waits carry different deadlines tell them apart, and it is the same generation a timer
  delivery names;
- **trusted Kernel timer/deadline provenance.** It is minted by the Kernel from its own persisted
  deadline. No Runtime and no application-input producer can supply one — kernel.md's "The Runtime
  cannot mint Effect settlements, child completions or consent by submitting an Event-like payload"
  applies a fortiori, and its separately-scoped-ingress rule ("Application input, trusted adapter
  settlement and operator control have separately scoped ingress") is a rule about *who may supply
  which class*; a Kernel timer observation is the Kernel-only source in that same list.

*Exactly one per generation, and duplicate delivery is idempotent.* At most one timeout Event exists
for any wait generation, created by whichever of `B-7`'s two paths applies. A re-delivered or replayed
timer for a generation whose timeout Event has **already** been accepted creates **no second timeout
Event, no second readiness transition and no second logical timeout**; the already-accepted fact stands
and the redelivery is recorded as the duplicate it is. A timer naming a **superseded** generation is a
different matter entirely and is simply a no-op (W-3). Without this rule, an at-least-once timer
transport would manufacture repeat timeouts for one wait.

*It is not a dependency match.* The timeout Event does **not** have to satisfy any dependency
alternative, and it cannot be made eligible by one: it exists because the generation's own deadline
expired, and it reaches the Runtime as `B-7`'s mandatory member by construction. W-1's category table
states this positively; the corollary is that a dependency alternative naming a timeout kind is
**inert**, exactly as an alternative naming an application-input kind is. There is therefore no way to
spell "wait for a timeout" as a dependency, and no need for one.

*Which boundary accepts it.* `B-6` path B already names a **boundary role** — "the boundary that
durably accepts that Event into the destination mailbox" — rather than a new entry in kernel.md's
Acceptance/atomicity table; for ordinary input that role is filled by *Creation/input ingress*, for a
settlement by *Effect settlement*, for a routed Event by whichever boundary fulfils the routing
obligation. The Kernel's own deadline-expiry acceptance fills the same role with Kernel timer
provenance. It is **not a seventh caller-facing boundary** in §2 ID-6/ID-7's sense and issues no
external receipt, because no external submitter requested it: the Kernel is accepting a fact it minted
from its own persisted deadline, recorded with the Event's own identity and the Execution's acceptance
order.

*Mandatory delivery.* The timeout Event is delivered in the **immediately resulting** Activation's
batch (`B-7`), not "eventually" and not best-effort. A transition to `READY` that leaves the Runtime
unable to distinguish "my deadline expired" from ordinary readiness is **not conforming**. The one
thing that can intervene is an accepted terminal decision (§6 CX-2): if cancellation or another
terminal disposition is accepted before that Activation is reserved, there is no resulting Activation
and the timeout Event takes an explicit terminal disposition like any other unacknowledged Event (B-5).
It is never silently dropped.

*What an expiry is not.* It ends **one dependency wait** — not the external work, and not necessarily
the Execution (§4; execution-protocol.md: "A wait timeout ends a dependency wait, **not** the external
action and not necessarily the Execution"). It is never proof that the awaited action failed or did not
happen (CL-2; execution-protocol.md's race table: "Wait timeout versus action success: preserve both
facts; **never turn timeout into proof of non-execution**"). `B-7` delivers an observation that *this
wait ended on its deadline*, and nothing more.

**Left open (implementation-owned):** the concrete **wire kind token**, the TypeScript discriminant,
the encoded schema and the storage layout of the timeout Event, and the **timer mechanism** that
detects expiry. K1.3 chooses those. It may not reopen the five properties above, the exactly-one rule
or the idempotency rule, because each is load bearing for a K1 fixture. The current vocabulary has no
spelling for a timeout Event at all — `packages/core/src/interaction/events.ts` closes its Event-kind
docstring with "Timer kinds remain deliberately absent until the Effect/runtime work that establishes
them" (`:68`, with the shorter "Timers remain absent" at `:62`) — so K1 **adds** this kind as new work.
That is a current-code gap, recorded in §13, not a legacy record to dispose of in §12 and not a reason
to leave the semantic home open.

*Deterministic cases.*

1. **The timeout Event cannot be displaced, at batch bound 1.** Execution Y is `WAITING` under
   generation G1 with a deadline, and an older, ineligible application input `billing.question` is
   already queued. G1's deadline expires. The acceptance transaction retires G1, creates the timeout
   Event for G1, sets Y `READY` and commits the readiness (`B-7` path B). The immediately resulting
   Activation is dispatched with a bound of 1: the single slot holds **the timeout Event**, never
   `billing.question`, which is ineligible under G1's retired rule and stays queued and unacknowledged
   (B-4).
2. **A stale timer cannot wake the replacement wait.** G1 is registered with a persisted timer. Before
   G1's deadline the wait ends some other way and Y re-enters `WAITING` under a new generation G2. G1's
   timer later fires. It is a **no-op against G2** (W-3): no retirement, no timeout Event, no readiness,
   no wake — G2's own deadline is the only one that can expire for G2.
3. **Timeout first, then a correlated result before reservation — both facts survive.** G1 carries a
   dependency alternative correlated to `c1`. G1's deadline expires and is accepted (case 1's
   transaction). *Before* the resulting Activation's batch is reserved, an authenticated result Event
   correlated to `c1` is accepted — creating **no** second readiness, because no wait is live (`B-8`,
   §3 row 6). Both are accepted facts and **neither is rewritten into the other** (CL-2): the timeout is
   not retracted by the result's arrival, and the result is not reinterpreted as late or void because
   the wait timed out. The result *was* eligible under G1's retired rule, so it is an ordinary union
   term in §3's wait-ended batch rule: **at a bound of 2 or more** the batch contains the timeout Event
   *and* the result, in per-Execution acceptance order; **at a bound of 1** the mandatory timeout Event
   takes the slot and the result stays queued, durable and unacknowledged, an ordinary candidate for
   the next batch (B-4, and W-6 cases 3–4 for why a later explicitly correlated registration can still find
   it). What must not happen at either bound: the timeout being dropped because a result arrived, or
   the result being discarded because the wait it answered had already timed out.
4. **The reverse order: a result first, then the deadline.** Same G1. This time the `c1` result is
   accepted *first*, while Y is still `WAITING`. That is an eligible Event, so `B-6` path B applies:
   G1 is retired, Y is `READY` with Event-triggered readiness, and **no timeout Event is ever created
   for G1**. G1's timer then fires against a retired generation and is a no-op (case 2). The two orders
   therefore have different, fully determined outcomes, decided by Kernel acceptance order and nothing
   else.
5. **A deadline already due when the wait is registered.** The Runtime submits `await(W)` where `W`
   carries a deadline in the past. W-2 step 2 finds no eligible Event, so step 3 applies: in that same
   Outcome-acceptance transaction the generation is retired, **exactly one** timeout Event is created
   for it, the Execution is `READY` with deadline-triggered readiness, and durable `WAITING` is never
   persisted (`B-7` path A, §3 row 3). Change one fact — an eligible Event *was* already accepted and
   unacknowledged — and step 2 wins instead: the wait is retired as an Event wake, and **no timeout
   Event is created**, because the wait did not end on its deadline.
6. **Duplicate timer delivery is idempotent.** G1's timer fires, its timeout Event is accepted (case
   1), and the timer transport delivers the same expiry again — before reservation, after reservation,
   or after the resulting Outcome was accepted. In every case the redelivery creates no second timeout
   Event, no second readiness and no second logical timeout; Y is not activated twice for one expiry.

**Left open (implementation-owned):** exact generation representation (integer counter vs. new random
ID per registration — either satisfies W-3 as long as it is compared, never assumed monotonic across
process restarts unless explicitly persisted as such), and the exact spelling of a declared subscription
identity (whether a subscription names the input label directly or an application-declared subscription
name that resolves to one) — K1.3 owns that, and W-1 constrains only that it is finite, declarative and
compared by equality.

---

## 6. Cancellation and terminal obligations

**Decision CX-1 (cancel is a Kernel control operation, not a mailbox message).** Cancellation
**request acceptance** is the semantic ordering point, independent of the current Activation's batch.
At that boundary it fences further Runtime progress and blocks new Effect admissions. Driver/native
interruption may happen later at a safe boundary; it does not defer this semantic fence. The Kernel
requests Driver cancellation without waiting for Runtime cooperation. Current safe-boundary checks
are migration evidence only (§12 MIG-1), not permission to install a losing Outcome's progress (CX-6).

**Decision CX-2 (first accepted terminal decision wins).** Order cancellation **request acceptance**
against Outcome acceptance, never submission time or later physical application. If cancellation
acceptance is first, CX-6 rejects the later Outcome even while physical interruption is pending. If
Outcome acceptance commits first, it commits atomically under OA-4; later cancellation is ordered
against that resulting state. An accepted completion/failure remains terminal and cancellation reports
that terminal result without reopening it. For a nonterminal accepted Outcome, cancellation applies
to the resulting nonterminal state. Current code's terminal-no-outgoing-edges invariant
(`packages/core/src/execution/lifecycle.ts:51-53`) remains reusable (§12 MIG-2).

**Decision CX-3 (terminal completion obligations).** An Outcome proposing `complete` must have: no
newly proposed Effects in that same Outcome, and every previously-owned required Effect/child
obligation accounted for (settled, or explicitly transferred/abandoned under policy — K4-scoped
mechanism, but the *rule* "completion checks this" is a K0/K1 boundary because it gates whether
`complete` is even accepted). K1 without Effects (§8) satisfies this trivially (no Effects exist yet
to be unaccounted-for); K2 is where the check becomes non-trivial. K0.1 fixes that the *rule itself*
belongs at Outcome-acceptance time, not as a later cleanup pass.

**Decision CX-4 (uncertain work bars completion, but does not bar cancellation).** An Execution with
unresolved/unknown external work may not `complete`, but a cancel request against it is still
accepted — cancellation stops new progress and admission; it does not claim the unknown work is
resolved. The Kernel retains that evidence for reconciliation rather than deleting it with the
Execution (restates kernel.md's "Execution and lifecycle" section).

**Decision CX-5 (late external results after cancel).** A late, authenticated settlement for work
admitted before cancellation is still recorded as evidence against the original attempt/Effect record,
even though the owning Execution is terminal. It never reopens the Execution and never becomes a new
unrelated Effect.

**Decision CX-6 (cancellation-fenced Outcome rejection and exact retry).** After OA-1 authentication
and OA-2's check for an **already accepted** Outcome, cancellation acceptance preceding this new
Outcome's acceptance makes the **entire** Outcome lose, regardless of `continue`, `await`, `complete`
or `fail`. Record and return an inspectable rejection classification **cancellation/terminal-conflict**,
with reason **cancellation accepted before Outcome acceptance**, bound to the submitted
Execution/Activation/epoch/base revision and canonical content. The winning cancellation is recorded
at its accepted boundary; physical interruption and any pending/applied bookkeeping cannot postpone
or remove this fence.

The losing Outcome acknowledges **none** of its reserved Event batch, installs **no** Runtime
progress or progress revision, accepts **no** emissions and **no** Effect intents, and creates **no**
wait, deadline, readiness or next-state transition. It is never partly accepted with an overridden
next state and never reopens or alters the cancellation winner. The cancellation control path, not
the rejected Outcome, brings the Execution to `CANCELLED`; all still-unacknowledged reserved Events
then receive B-5 terminal disposition. Cancellation after wait retirement but before reservation
suppresses that Activation entirely, retaining the same B-5 rule.

An authenticated exact resubmission of this rejected identity/content returns the **same recorded
rejection classification and reason**, including after terminal cancellation. OA-2's accepted-receipt
rule does not apply: no Outcome was accepted. Record lookup remains scoped by OA-1/ID-8; E-7 equality
is used for content. Recovery preserves the fence and recorded rejection under the declared retention
profile; expiration never makes a cancelled Execution accept the Outcome. There is no automatic retry
and no acceptance receipt manufactured by replay. Conversely, an exact retry of an Outcome that
**was accepted first** still returns its original accepted receipt under OA-2, without new mutations,
even after a later cancellation of the resulting nonterminal state.

**Left open (implementation-owned):** cancellation-request storage, rejection encoding and physical
interruption mechanics. A pending/applied marker may track operational handling, but it cannot change
CX-1/CX-2/CX-6's semantic acceptance order, defer the fence, or add a lifecycle state.

---

## 7. Outcome acceptance algorithm, duplicates and conflicts

This section pins the five-step algorithm in
[execution-protocol.md](../../../detail-design/execution-protocol.md#outcome-acceptance-algorithm) as
binding, and calls out where current code deviates (full deviation detail in §12).

**Decision OA-1 (authenticate and scope first).** Before any content is inspected, the submitter is
authenticated and access is scoped to the named Execution. Restates step 1.

**Decision OA-2 (idempotent replay before validation).** An exact duplicate of an already-accepted
Outcome (same Activation ID, same content) returns the original receipt without re-running acceptance,
Effect dispatch, or publication. A same-identity Outcome with *different* content is a conflict and is
rejected, never merged/patched. This check happens *before* full envelope validation (step 2 precedes
step 3), so a duplicate of an Outcome that would now fail validation under updated policy still
replays its original (already-accepted) receipt rather than re-validating against current rules.
A never-accepted cancellation loser instead replays CX-6's recorded rejection, not this receipt rule.

**Decision OA-3 (whole-envelope validation, all-or-nothing).** Current Activation ID, writer epoch,
and base progress revision are checked together with the cancellation fence and terminal state
(CX-2/CX-6); any wait reference to a same-Outcome Effect proposal
is resolved and bound in the same pass. A failure anywhere in this step accepts nothing: no partial
progress commit, no partial Effect intent, no partial acknowledgment. This is the direct fix for F10
(`applyOutcome`'s current ordering, §12 `REF-1`, dispatches Effects in a step separate from — and
before — the transaction that commits next-state/progress, so a failure between them is not
"nothing accepted," it is "Effects already attempted, progress not yet committed").

**Decision OA-4 (atomic commit of the whole accepted set).** Acknowledgment of the batch, progress
installation, accepted emissions, all Effect *intents* (not their dispatch/settlement — see §8),
next-state and any wait/deadline are one atomic step. The cancellation-fence/terminal check and
this commit must be ordered atomically against cancellation acceptance: checking before a concurrent
cancel and committing afterward cannot evade CX-6. "All Effect intents" being committed together
with progress is what makes step 3 above enforceable — an implementation that dispatches Effects
before or outside this transaction (current code, §12 `REF-1`) cannot claim OA-3.

**When the next step is `await(wait)`, this transaction's internal order is fixed by §5 W-2** —
acknowledge this Outcome's own batch, then check the mailbox, then evaluate an already-due deadline,
then persist `WAITING` — and its three possible outcomes are §3's wait-ended rows 1 and 3 and a durable
`WAITING`. §7 does not restate that algorithm; W-2 owns it.

**Decision OA-5 (rejection is inert, never a partial mutation).** A rejected Outcome (malformed
envelope, stale epoch/revision, unresolvable wait reference, or cancellation/terminal conflict under
CX-2/CX-6) creates no Effects, acknowledges no Events, commits no progress, accepts no emissions and
creates no wait/deadline/readiness/next-state transition. It is recorded as a rejection with its reason,
not silently dropped or retried automatically by the Kernel. CX-6 owns exact replay of a recorded
cancellation rejection; it cannot mutate the cancellation winner.

**Decision OA-6 (protocol failure is inspectable, not a hidden retry loop).** An invalid response from
the current Runtime attempt (one that cannot even be classified as reject-with-reason) ends or holds
the exchange under an explicit, inspectable recovery decision. It is never an infinite silent retry of
the same dispatch.

**Left open (implementation-owned):** exact transaction mechanism (DB transaction, append-only log
with a compaction pass, in-memory CAS) — any of these can satisfy OA-3/OA-4 as long as the atomicity is
real, not merely "usually fast enough."

---

## 8. Effect admission: explicitly deferred, not silently absent

**Decision EF-1.** K1 (and therefore K0.1) does not implement Effect admission, dispatch or
settlement — 007's design table states this exclusion explicitly for K0/K1
("K1 initially refuses Effects until K2"). K0.1's obligation is narrower: an Outcome that proposes an
Effect during K1 must be **explicitly refused**, never silently accepted-and-ignored and never
silently stripped from an otherwise-accepted Outcome. Silently dropping a proposed Effect while
accepting the rest of the Outcome would let a controller believe it requested external work that
nothing recorded.

**Decision EF-2 (corrected in review round 1 — [K01-REV-04](implementation-02.md): K1's refusal is
envelope validation, not an admission decision).** Round 1 called K1's refusal "a placeholder rejection
*at the Effect-admission boundary*." That is wrong and is withdrawn: **there is no Effect-admission
boundary in K1 at all**, because admission (kernel.md's Acceptance/atomicity table) is something that
happens to an *already-accepted immutable Effect intent* — and in K1 no Effect intent is ever created,
because the whole Outcome containing it is rejected one step earlier, during whole-envelope validation
(§7, OA-3), precisely because K1's schema does not yet recognize Effect proposals as an acceptable
Outcome field. Concretely: an Outcome proposing an Effect fails OA-3's "valid next step"/structural
check before step 4 (OA-4's atomic commit) ever runs, so no Effect ID is minted, no proposal key is
bound, and nothing exists for a later admission decision to apply to. This is the same "envelope/
reference errors reject the entire proposal" path kernel.md already describes for any other malformed
Outcome field — proposing an Effect in K1 is treated as exactly that kind of malformed field, not as a
new kind of boundary event. The Effect-admission and Effect-settlement boundaries kernel.md's table
names remain real, but they are **K2-introduced** boundaries that do not exist yet, not boundaries K1
visits and declines.

**Decision EF-3 (naming the four action dimensions at K0 level, without deciding their mechanics —
added in review round 1, [K01-REV-04](implementation-02.md)).**
[action-lifecycle.md](../../../detail-design/action-lifecycle.md#one-request-several-kinds-of-fact)
already owns four distinct dimensions of an accepted action and warns against compressing them into
one ambiguous `status`:

| Dimension | Facts to distinguish (action-lifecycle.md's own wording) |
|---|---|
| Request disposition | Proposed/accepted; waiting for consent; eligible; denied/refused/declined/expired/withdrawn; no further attempts |
| Attempt evidence | No attempt admitted; admitted and may have run; observed success; definite failure; unknown |
| Result contract | Validated value; invalid/missing value; partial evidence |
| Responsibility | Still required by Execution; transferred to a named durable owner; deliberately abandoned under policy |

K0.1 does **not** decide how K2 represents or transitions these — that remains K2's admission/
settlement contract, unchanged as a non-goal here. What K0.1 fixes at the conceptual level, so K1's
design does not quietly foreclose them, is only this: **nothing in K1's Outcome-acceptance algorithm
(§7) may conflate these four dimensions into a single accepted/rejected boolean once Effects exist**,
and K1 itself produces none of these four facts (§8 has no Effects yet) — so K0/K1 correctly has
*nothing* to say about their mechanics, only an obligation not to build a boundary shape in K1 that
would make representing all four impossible in K2.

**Decision EF-4 (K0-level negative cases, named from action-lifecycle.md, not newly decided —
added in review round 1).** These restate action-lifecycle.md's own text; K0.1 does not implement or
test them (K2 does) — it records them so K1's Outcome/envelope boundary is not accidentally built in a
way that would contradict them later:

- Denial/refusal of an action **without a physical attempt** is not evidence of external failure —
  "Waiting for consent consumes no physical attempt" and a denial can happen before any attempt exists
  (action-lifecycle.md).
- Work that was **admitted but not yet confirmed one way or the other** is `unknown`, not a guess at
  success or failure — "Until proved otherwise, a lost admitted attempt may have executed"
  (action-lifecycle.md).
- An acknowledged `unknown` Event does **not** discharge the Execution's completion obligation for
  that work — restates action-lifecycle.md's "Evidence revisions and reconciliation" section directly.
- An operator or Runtime **choosing to stop retrying** is a responsibility/disposition decision, not
  proof that the external action failed — "An operator choosing 'stop trying' changes responsibility/
  disposition, not proof of external failure" (action-lifecycle.md).
- **K1-specific case, actually decided here:** an Outcome containing K1-unsupported Effect content
  causes whole-Outcome refusal at envelope validation (EF-2); it never creates an Effect intent, so
  none of the four dimensions above are ever instantiated for it — there is no "denied" or "unknown"
  action record for a K1-refused Effect, because no action record exists at all.

**Non-decision (explicitly K2-owned, not resolved here):** the concrete mechanics of consent binding
and policy freshness ordering for remote services. §10 addresses only the narrow "local policy
ordering" precondition 001 K0 explicitly asks for before K2 promises remote revocation; it does not
implement K2's admission/settlement contract, and EF-3/EF-4 above name dimensions/cases without
deciding their K2 representation.

---

## 9. Progress compatibility

Restates and pins [execution.md](../../../execution.md#progress-and-native-recovery) and
[recovery-and-compatibility.md](../../../detail-design/recovery-and-compatibility.md#compatibility-dimensions)'s
compatibility-dimensions table as binding for what "progress" must declare, independent of which
concrete Driver is used:

**Decision PC-1 (three progress forms, not one; form (a)'s current-code example corrected in review
round 4, [K01-R4-02](implementation-05.md)).** Runtime-owned continuation data is one of: (a) inline
structured data the Kernel stores and returns unchanged — current code's **nested
`ControllerProgress.progress: JsonObject` payload** (`packages/core/src/execution/context.ts:57-59`,
with the docstring "The kernel stores and returns `progress` unchanged" at `:53`) is an example of
exactly this form, and it is that nested payload, not its wrapper, which §12 `MIG-3` classifies
migratable; (b) an immutable checkpoint reference (a blob/pointer identifying a specific resumable
state plus compatible code version); or (c) a reference to a still-running native job. These have
different recovery guarantees and must not be normalized into one "opaque blob" type that hides which
guarantee applies.

**What form (a) does *not* claim about the current wrapper (corrected in review round 4).** Revision 4
said the current `ControllerProgress`/`context.control` *as a whole* "is exactly this form and is fully
compatible." That is wrong about the enclosing wrapper and is withdrawn. `ControllerProgress` is a
**closed two-arm union tagged `kind: "agent" | "workflow"`** (`context.ts:57-59`), and
`ExecutionContext.control` (`context.ts:200`) stores that tagged wrapper, not a bare payload. The tag
does **not** migrate unchanged: §12's `LEG-4` classifies it legacy-only; 001's K1 section requires
removing "controller resumptions and closed Agent/Workflow progress discriminators from the new Kernel
protocol"; and 007's K1.1 acceptance states plainly "no Agent/Workflow discriminator in the new
boundary." **K1 progress compatibility is determined through the pinned Runtime/definition/codec
contract (PC-4), never through that two-value tag.** So the three statements line up: the inner payload
pattern migrates (`MIG-3`), the enclosing discriminated wrapper does not (`LEG-4`), and the question
the tag was trying to answer — "which controller can understand this progress?" — is answered instead
by the pinned definition/Runtime revision `ExecutionContext.definition` already tracks per Execution,
kind-agnostically.

**Decision PC-2 (checkpoint publish-before-reference).** Where form (b) is used, the Driver writes the
immutable candidate checkpoint before proposing its reference in an Outcome; Kernel acceptance pins
it; rejection does not. A checkpoint is identified together with its codec/version and required
resource versions — never a bare locator with no version attached.

**Decision PC-3 (mutable session ⇒ locator, not checkpoint).** A mutable native session ID is a
locator, not a checkpoint: if the native Runtime can advance that session outside the Kernel's
accepted revision, Kernel-side compare-and-set does not protect it. Recovery over a locator requires
an explicit exclusive-ownership or reconciliation declaration from the Driver (execution.md's four
Driver questions); absent that declaration, automatic takeover over a locator is refused, not assumed
safe.

**Decision PC-4 (codec/version pinned, not inferred).** Every persisted progress value (any of the
three forms) is versioned to the exact Runtime/definition contract revision that can understand it.
Resuming an Execution when the pinned revision's code is unavailable is an explicit hold/refusal
outcome, never a silent "start over" that discards accepted progress.

**Decision PC-5 (missing-state is truthful, never a fresh-restored fabrication).** If a checkpoint,
required resource, or compatible code is unavailable at recovery time, the Kernel reports that
explicitly (an inspectable recovery-hold state) rather than presenting an empty/fresh Runtime state as
if it were the restored one.

**Left open (implementation-owned):** the concrete checkpoint storage/pinning mechanism (upload
ticket + grace period is the recovery-and-compatibility.md's suggested starting mechanism, not a
requirement), and which of forms (b)/(c) any given K1-era fake/compatibility Driver actually needs —
K1 itself only requires form (a), since it has no real native Driver yet.

---

## 10. Locally ordered policy (before promising remote freshness)

001 K0 asks specifically to "Define the local policy ordering/freshness profile before promising
remote revocation." This is deliberately narrow: it is not K2's full authority/consent contract
(authority-and-actions.md owns that), only the ordering precondition K0/K1 must not violate by
implication.

**Decision LP-1.** Any policy check the Kernel performs against **local, already-accepted, in-process
state** (e.g. "is this Execution's current epoch still current," "is this Activation ID still the live
one") is synchronous and immediately consistent with the last accepted write — there is no eventual-
consistency window for these checks, because they read the same store the acceptance algorithm just
wrote to.

**Decision LP-2.** Any policy check that depends on **external/remote state** (a revoked grant, an
updated allow-list served by another system) is *not* assumed instantaneously fresh merely because the
call to check it looks synchronous. K0/K1 makes no remote-revocation latency promise at all — it is
K2's authority-and-actions.md that must state the actual freshness contract when Effects exist to
revoke. K0.1's decision is only the negative one: nothing in K0/K1 may be built or documented in a way
that implies remote revocation is instantaneous, because K1 has no remote-mediated action to revoke
in the first place (§8).

**Decision LP-3.** Ordinary corrective input (a user or caller sending a new message) never itself
withdraws or invalidates an already-accepted Outcome, Effect intent, or admission — restates kernel.md's
"Ordinary correction input cannot itself withdraw an action" rule as a K0/K1-observable constraint:
even before K2's Effects exist, K1's Outcome-acceptance algorithm (§7) must not be built so that a
later, unrelated Event can retroactively alter an already-accepted Outcome's meaning. Explicit
withdrawal is its own K2-scoped mechanism (action-lifecycle.md), not implied by mere new input.

---

## 11. 001 K0 boundary → assertion map

Every boundary 001's K0 section names, mapped to the decisions above and to an observable pass/fail
assertion. "Owner" states which of Kernel / Runtime-Driver / deployment is accountable, per AGENTS.md's
boundary rule. This table is the direct answer to K0.1-C1.

| # | 001 K0 boundary | Owner | Decisions | Observable assertion |
|---|---|---|---|---|
| 1 | Creation/input ingress accepted IDs/receipts | Kernel | ID-1, ID-2, ID-6, ID-7 | A create request replayed with the same request key returns the same Execution ID and receipt; a create with the same key but different content is rejected as a conflict, never silently accepted as an edit. |
| 2 | Activation dispatch intent | Kernel | ID-3, ID-4, ID-9, B-1, B-2 | Two *semantically different* dispatches (a new exchange after the prior one resolved) never carry the same Activation ID; a dispatch pins one finite, enumerable Event batch that a later Outcome can be checked against exactly; an authorized takeover of a *still-unresolved* exchange advances the writer epoch under the **same** Activation ID rather than minting a new one (ID-9 cases 2–3). |
| 3 | Outcome acceptance; duplicate/conflicting Outcome behavior | Kernel | OA-1–OA-6, ID-6 | Exact duplicate submission of an already-accepted Outcome returns the original receipt with no re-dispatch of anything; a same-identity/different-content submission is rejected, not merged; a failure partway through acceptance leaves zero partial state (no progress, no Effect intent, no acknowledgment). |
| 4 | Effect intents | Kernel | EF-1–EF-4 | An Outcome proposing an Effect during K1 is rejected at whole-envelope validation (OA-3) with a recorded, inspectable reason, before any Effect intent, ID or proposal-key binding ever exists; the rest of that Outcome is also rejected, not silently split; this is envelope validation, not a K1 visit to the (K2-introduced) Effect-admission boundary. |
| 5 | Any-of wait correlation; subscription-only input wait; wait-generation identity; eligible batch accounting; wait deadlines | Kernel | W-1–W-9, B-1–B-8, CL-1–CL-3 | Each of these is separately observable, and each is stated once by the owner named beside it. **(a) Record shape and well-formedness (W-1):** a wait is exactly two finite declarative lists — dependency alternatives written in W-1's three-field selector grammar, and declared input subscriptions, which are not alternatives and do not use that grammar — plus an optional deadline and a generation. Well-formedness is **structural**: the declaration must be structurally non-empty (either list may be empty, not both, and a deadline does not rescue a record with both empty), every present alternative must satisfy the selector grammar, and every present subscription must be structurally valid. A **subscription-only input wait** (001's own K0 trace) is therefore first-class (W-8). The test proves **structure, never satisfiability**: a structurally valid but **inert** alternative still counts toward non-emptiness, so a well-formed wait may never be woken and may stay `WAITING` until a deadline or cancellation ends it — K0.1 promises no general satisfiability or deadlock prevention (W-1's well-formedness cases 1–4). **(b) Eligibility (W-1's category table):** ordinary application input is eligible only through a declared subscription and a dependency alternative matching it is inert (W-7 cases 6–7); every other ordinary Kernel Event is eligible only through a dependency alternative; the **timeout Event** is eligible through neither and arrives by construction (W-9). No other rule makes an Event eligible; eligibility does not select a batch. See `B-6`/`B-7` for wait retirement and recoverable readiness, and `B-2` for selection only once `READY`. **(c) Registration (W-2):** one ordered transaction — acknowledge this Outcome's own batch, then check already-accepted unacknowledged Events (no lost wake, and not skipped for an empty dependency list), then evaluate an already-due deadline, then persist `WAITING` — producing exactly one of §3's rows 1, 3 or a durable `WAITING`, with a past deadline **never** persisted as live. **(d) Retirement (W-1):** any eligible wake, and any current-generation deadline expiry, retires the registration and its generation; the Kernel keeps no per-alternative satisfied flag, and a Runtime that still needs a dependency re-registers it. **(e) Next batch (`B-2`, once `READY`):** older ineligible backlog can **never** displace what the Execution was woken for, at any bound including 1, in either way a wait can end — the batch is the species' mandatory member (≥ 1 Event eligible under the retired rule for `B-6`; the generation-correlated timeout Event for `B-7`) together with the other Events eligible under that retired rule, evaluated at reservation (W-8 case 4, W-8 case 6, W-9 cases 1 and 3). **(f) Fencing (W-3, W-9):** a timer naming a superseded generation is a no-op that retires nothing and creates no timeout Event; a duplicate timer for an already-accepted expiry creates no second timeout Event, readiness or logical timeout; an authenticated result Event is never generation-fenced and remains observable by a later wait that explicitly correlates to it (W-6). **(g) Runtime-local work (W-4):** an Activation with only Runtime-local work outstanding creates no `waitingFor` record at all and simply stays `RUNNING`. |
| 6 | Wake / Event acceptance during computation | Kernel | B-2, B-4, B-8, W-2, W-3 | An Event accepted while an Activation is in flight does not alter that Activation's already-pinned batch; it remains queued for later B-2 selection or B-5 terminal disposition. More generally, an Event accepted while **no wait generation is live** — the Execution is `READY`, `RUNNING` or terminal (W-3) — is an accepted mailbox fact and creates **no** readiness (`B-8`, §3 row 6), so a second readiness can never arm behind the first and re-select an already-reserved batch. |
| 7 | Cancellation ordering | Kernel | CX-1, CX-2, CX-5, CX-6, OA-3–OA-5 | Cancellation request acceptance first: the later in-flight Outcome is rejected with CX-6's cancellation/terminal-conflict reason; zero acknowledgment, progress, emissions, Effect intents or wait/deadline/next-state changes. The cancellation control path reaches `CANCELLED` and its reserved Events receive B-5 disposition. Exact retry returns the recorded rejection. Outcome acceptance first: normal atomic commit; later cancellation orders against that state and cannot reopen accepted completion/failure. |
| 8 | Terminal obligations; completion responsibility | Kernel | CX-3, CX-4, CX-6, B-3, B-5 | `complete` is rejected outright if unresolved owned work is not accounted for in the current or a previously acknowledged batch; a terminal Execution exposes B-5 disposition for every unacknowledged Event, including the reserved batch of a cancellation loser under CX-6. A rejected losing Outcome never acknowledges that batch. |
| 9 | Checkpoint forms; progress compatibility | Kernel + Runtime/Driver | PC-1–PC-5 | Resuming against unavailable compatible code/resources yields an explicit hold/refusal result, never a state that looks like normal restored computation. |
| 10 | Local policy ordering/freshness profile | Kernel | LP-1–LP-3 | A policy check against just-accepted local state reads that exact write with no staleness window; no K0/K1 document or test asserts an instantaneous remote-revocation guarantee. |

**Decision M-1 (E0's unsafe/lost-state controls, per 001's exit clause).** K0.2, not K0.1, builds the
actual fixture, but K0.1 fixes which controls that fixture must exercise, directly off this table:
row 3's duplicate/conflicting-Outcome case, row 5's stale-timer/lost-wake case, row 7's cancel-vs-
complete race, and row 9's missing-checkpoint-code case are the four **unsafe/state-loss controls**
K0.2's fixture must include as negative tests, matching execution-protocol.md's "Acceptance examples
for K0–K4" enumeration. Row 7's control must assert CX-6's full rejection for both `continue` and
`complete` submitted after cancellation acceptance, zero acknowledgment of the reserved batch and
no change to accepted progress/emissions, B-5 disposition at `CANCELLED`, and deterministic recorded rejection on
exact retry. It must also assert the reverse order: accepted completion remains terminal. Suppressing
only next state while installing losing progress is a failing control, not a conforming variant.

---

## 12. Legacy data classification: migratable / legacy-only / refused

Every current 0.8.x persisted record type the K0/K1 boundary touches, classified per 001's K0
requirement. "Current" = base commit `6464be1`, package `packages/core`. This is not an exhaustive
inventory of every field in the codebase — it covers exactly the record types the boundary table in
§11 depends on, **plus every record family the reviews named as required** (`ExecutionContext.control`
and its `kind` discriminator; `ExecutionWait`; the actual `ControllerResumption` record; the mailbox/
Event delivery representation; lifecycle transitions including `CREATED`; `PendingOperation`;
`CancellationRequest`; the `revision` counter versus the target's progress revision — corrected/
completed in review round 1, [K01-REV-03](implementation-02.md)). A record is **split** into more than
one row below wherever a single migratable/legacy-only/refused label would misrepresent part of it.

**The classification vocabulary is exactly K0.1-C3's three labels: migratable, legacy-only, refused.**
Every row in the table below carries exactly one of them, and a record is split across more than one
row wherever a single label would misrepresent part of it. There is no fourth label. Material that is
not a disposition of legacy data — a limitation of the reference implementation, for instance — is not
a row in this table at all; it is recorded in
[Reference-implementation limitations](#reference-implementation-limitations-not-a-legacy-disposition)
after it.

Review round 3 ([K01-R3-02](implementation-04.md)) enforced that vocabulary, because revision 3 had
broken it twice. Revision 3's `MIG-5` used a fourth label, "partially migratable"; it is split here
into **`MIG-5` (migratable)** — the declarative Event matching primitive and the envelope identity
fields — and **`REF-5` (refused)** — adoption of the existing single-`wake` `ExecutionWait.event`
record as the new K1 target wait record. Revision 3's `LIM-1` used a fifth label, "limitation"; its
reference-store analysis is preserved in substance and keeps its ID, but moves out of this
classification table into the subsection named above. §5's W-1/W-7 target semantics, which round 3
accepted, are unchanged by this correction.

Review round 4 ([K01-R4-01](implementation-05.md)) changed the *content* of two of those rows without
touching the vocabulary. `MIG-5`'s scope is narrowed: the kind/correlation matcher is migratable for
W-1's **dependency alternatives** only, and revision 4's claim that it is "exactly the primitive W-1
builds *both* of its lists from" is withdrawn — it reads `event.kind` and `event.correlationId` and
never `ExternalInputBody.label`, so it cannot build the declared-subscription list. `REF-5` is extended
to name explicitly what it always had to cover: the current `ExecutionWait.event` shape **including its
optional legacy `interleave` field**, whose adoption as a target field §5's W-5 has now withdrawn.

Review round 5 ([K01-R5-02](implementation-06.md)) refined the same two rows again, still without
touching the vocabulary: `MIG-5` is reconciled with W-1's now-exact three-field selector grammar — it
migrates unchanged as the **kind/correlation matching component**, is **not** the complete matcher when
an alternative constrains exact Event identity (an additional ordinary equality check, not a new
language), and must have its match-everything input rejected by K1 — while `REF-5` additionally records
that the current record has no Event-identity selector field at all.

Review round 2 ([K01-R2-02](implementation-03.md), [K01-R2-03](implementation-03.md),
[K01-R2-04](implementation-03.md)) had earlier corrected `PendingOperation` from an invalid
no-label row to **`LEG-5`, legacy-only** with its reusable facts split out; withdrawn an overreaching
concurrency claim from revision 2's `REF-2` (the entry now called `LIM-1`); and corrected `REF-4`'s
wording so the same mechanism is no longer described as both refused and retained.

| ID | Record / field (current file:line) | Classification | Reasoning |
|---|---|---|---|
| MIG-1 | Safe-boundary cancellation checks in `Harness.activate`/`applyOutcome` (`packages/core/src/runtime/harness.ts:747-757`, `:953-965`), backed by `CancellationRequest` (`packages/core/src/execution/cancellation-request.ts:26-33`, pending/applied states) | **Migratable** | Only the mechanism for recording pending control and checking cancellation before dispatch and at a safe boundary is reusable. Physical interruption may wait for safety; the target semantic fence starts at request acceptance (CX-1/CX-6). The current docstring's mid-Activation mutation concern (`cancellation-request.ts:5-7`) explains current mechanics, not target acceptance semantics. The losing-Outcome progress write is separately refused in REF-6; pending/applied storage alone does not satisfy §6. |
| REF-6 | Installing `outcome.control` despite a winning pending cancellation (`packages/core/src/runtime/harness.ts:953-965`, `:1112-1122`, especially `:1119`) | **Refused** | Current `applyOutcome` suppresses reported next state/emissions when cancellation is pending, yet carries `outcome.control` into the cancelled context. CX-6 rejects the entire losing Outcome, allowing no progress installation or batch acknowledgment. K1 must change that acceptance behavior; the MIG-1 safe-boundary mechanism is reusable only when it enforces the request-acceptance fence. |
| MIG-2 | `LifecycleState` transition table (`packages/core/src/execution/lifecycle.ts:46-54`), **excluding** `CREATED` (see `LEG-3` below) | **Migratable** | A pure, store-independent function already enforcing "terminal states have no outgoing edges" and "only `RUNNING` reaches `COMPLETED`/`FAILED`." This is exactly the target invariant (kernel.md's lifecycle diagram) and needs no semantic change for the `READY`/`RUNNING`/`WAITING`/`COMPLETED`/`FAILED`/`CANCELLED` states — only confirmation it stays store-independent in K1, and that `CREATED` is dropped from the state list it operates over. |
| MIG-3 | The **opaque progress payload** pattern: `ControllerProgress.progress: JsonObject`, Kernel-stored-and-returned-unchanged (`packages/core/src/execution/context.ts:57-63`) | **Migratable** | Matches PC-1 form (a) exactly: opaque data the Kernel never interprets. No format change needed for K1 beyond adding the codec/version pin PC-4 requires (see `LEG-4` immediately below for what does *not* migrate as-is). Review round 4 ([K01-R4-02](implementation-05.md)) sharpened PC-1 to agree with this row rather than overstate it: what migrates is this **nested payload**, not the enclosing `ControllerProgress` wrapper, whose closed `kind` tag is `LEG-4`. |
| MIG-4 | `revision` counter (`packages/core/src/execution/context.ts:220`) — **corrected in review round 1** ([K01-REV-03](implementation-02.md)): previously classified plainly "Migratable ... directly usable as the base progress revision," which is wrong | **Migratable as an optimistic-concurrency mechanism; NOT equivalent to the target's semantic `base_progress_revision` without redefinition** | The current field bumps on *every* persisted context change, including pure lifecycle bookkeeping that has nothing to do with an accepted Outcome's progress content: `Harness.activate` bumps it at dispatch-claim (`READY`→`RUNNING`, `harness.ts:759`, `transitionContext(context, "RUNNING", startedAt)`) and again for a pre-Activation cancellation (`harness.ts:751`, `transitionContext(context, "CANCELLED", ...)`) — neither is an Outcome being accepted. `execution/resumption.ts`'s own docstring admits exactly this conflation in its own words: "`observedRevision` records the `ExecutionContext.revision` the suspending Activation read... the runtime deliberately does **not** use a naive `current.revision !== observedRevision` equality to detect staleness: `ExecutionContext.revision` also advances for ordinary lifecycle bookkeeping (`READY -> RUNNING`, `RUNNING -> WAITING`, `WAITING -> READY`), so that comparison would classify a normal suspension as an intervening semantic mutation" (`packages/core/src/execution/resumption.ts:23-27`). kernel.md's Activation/Outcome shape needs a `base_progress_revision` that identifies *the progress an Activation was dispatched against* and advances only when an accepted Outcome installs new progress (execution-protocol.md's Outcome-acceptance algorithm step 4: "install opaque progress and its revision"). K1 may reuse a monotonic-counter *mechanism* like this one, but must not assume the *existing field*, unmodified, already carries that exact semantic — either define a separate progress-specific revision, or prove (not merely assert) that every non-progress bump this field currently takes is harmless to the target's staleness check, the way `resumption.ts` already had to prove it for its own unrelated purpose. |
| MIG-5 | The declarative kind/correlation **matcher**: `WakeCondition` (`packages/core/src/interaction/event-envelope.ts:74-80`) and its evaluator `eventSatisfiesWake` (`:82-86`), together with the `DeliveredEvent`/envelope identity fields it matches against (`event-envelope.ts:34-42`, `:50-54`). **Split out of revision 3's single `MIG-5` row in review round 3** ([K01-R3-02](implementation-04.md)), which had labelled the whole of it "partially migratable" — a label K0.1-C3 does not permit; **scope narrowed in review round 4** ([K01-R4-01](implementation-05.md)); **reconciled with W-1's exact selector grammar in review round 5** ([K01-R5-02](implementation-06.md)); **restated as a pure encoding mapping in review round 6** ([K01-R6-02](implementation-07.md)) | **Migratable** — unchanged, as the **kind/correlation matching component** of W-1's dependency-alternative grammar | **What migrates unchanged.** W-1's grammar has three optional selector fields — exact Event identity, kind (one kind or a **non-empty** finite set) and correlation — combined within one alternative by conjunction. `eventSatisfiesWake` implements precisely two of them, by exactly the right comparisons: `wake.eventKinds` is tested by membership and `wake.correlationId` by equality (`event-envelope.ts:82-86`). For any alternative that constrains only kind and/or correlation, this matcher is the complete target matcher and needs no redefinition. It is declarative and serializable, with no callback, closure or query language — the constraint W-1 keeps and the file states as its own rule (`:66-72`). The envelope's identity/provenance fields (`eventId`, `destination`, `kind`, `correlationId`, `causationId`, `occurredAt`, per-mailbox `sequence`) carry forward as the vocabulary alternatives are written against. **The encoding mapping (review round 6).** The current type encodes *absence* by sentinel values, and the target grammar encodes it by *not supplying the field*; this row states the translation and carries **no validation rule of its own** — validity is W-1's, exclusively. Legacy `eventKinds: []` means **Kind selector absent**, because the source says so explicitly ("Empty means 'any Event addressed to me'", `event-envelope.ts:75`); legacy `correlationId: null` means **Correlation selector absent** (`eventSatisfiesWake` skips the comparison when it is null, `:84`). Worked through: **(1)** `eventKinds: []` + `correlationId: null` → no selector field supplied → **invalid** target alternative under W-1's at-least-one rule; **(2)** `eventKinds: []` + `correlationId: c1` → a valid **correlation-only** alternative, matching correlation `c1` regardless of kind; **(3)** `eventKinds: ["child.result"]` + `correlationId: null` → a valid **kind-only** alternative; **(4)** `eventKinds: ["child.result"]` + `correlationId: c1` → a valid **conjunction** of both; **(5)** a *target* Kind-set field supplied as `[]` → **invalid before matching**, since the target grammar has no empty-set encoding (W-1) — case 5 is a target-side check, not a legacy encoding, and is listed here so the two spellings of `[]` are never confused. Case 1 is the only legacy shape with no valid target alternative, and it is the over-matching spelling W-8 rejects. **It is not by itself the target eligibility predicate (review round 6 narrowed its scope; review round 7 named the second, larger gap, [K01-R7-01](implementation-08.md)).** Target eligibility is W-1's **source-category rule** applied first, and only then the matching rule for that category. `eventSatisfiesWake` implements neither half of the category test: it never inspects an Event's trusted ingress provenance, and it is called with no knowledge of whether the condition it is evaluating came from a dependency alternative or from anywhere else. **The target caller must enforce the source-category rule before or around this matcher** — running the matcher alone over an arbitrary mailbox reproduces exactly the bypass W-7 case 6 rules out. Two consequences follow. First, a legacy `WakeCondition` that happens to match `external.input` (by listing that kind, or by listing nothing) does **not** become a target application-input subscription merely by migration: subscriptions are a separate list with a separate identity (W-1 item 2), and nothing in this record can be translated into one. Second, this row's classification is unchanged and still correct — the *matcher* migrates; what does not migrate is the assumption that the matcher is the whole predicate. **It performs no part of timeout handling (added in review round 9).** The **timeout Event** (W-9) is not created by this matcher, is not selected by it, and cannot be made eligible through it: it is minted by whichever `B-7` path applies and is delivered as that batch's mandatory member by construction. A migration that routed timeouts through `eventSatisfiesWake` — for instance by having a Runtime list a timeout kind in `eventKinds` — would be selecting an Event the target grammar treats as inert (W-1), and it would still leave `B-7`'s mandatory member unproduced. Timer support is absent from the current vocabulary altogether (`packages/core/src/interaction/events.ts:68`), so this is new K1 work beside the matcher, not a translation of it. **It is also not** the complete target dependency matcher when an alternative constrains **exact Event identity**: `WakeCondition` has no identity field and `eventSatisfiesWake` never compares `event.eventId`. That gap is closed by **an additional ordinary equality check** — one more supplied-field comparison in the same conjunction — **not** by a new matching language, a predicate or a query construct. **It does not build W-1's declared-input-subscription list** (stated in review round 4, unchanged): a subscription selects application input by its application-defined label, that label lives in the Event *body* — `ExternalInputBody.label` (`packages/core/src/interaction/events.ts:334-337`) — and `eventSatisfiesWake` never reads it, inspecting `event.kind` and `event.correlationId` and nothing else (`:82-86`). The source concedes this: "It cannot yet select `external.input` by its application-defined `label`, so an Execution waiting for one kind of application input still wakes for every other one addressed to it... Selective input matching is accepted future work and is deliberately deferred" (`event-envelope.ts:66-72`). Subscription matching is therefore **new work built beside this primitive**, not this primitive relabelled; what needs replacing outright is the record that holds it (`REF-5`). |
| LEG-1 | The actual `ControllerResumption` record (`packages/core/src/execution/resumption.ts:72-101`) and the `ExecutionWait` `controller_resumption`/`dependencies` arms that name its ID (`packages/core/src/execution/context.ts:104-130`); the port's own admission that the underlying work is ephemeral, `packages/core/src/ports/controller-resumption.ts:40-41` ("Work registered by an Activation that does not return the matching wait is abandoned and can never wake the Execution") and `:61-62` (`ControllerResumptionWork` is documented "Never persisted, never inspected, never re-created by the runtime"); and the processor's own comparison against `EffectProcessor`, `packages/core/src/runtime/resumption-processor.ts:1-56` (header), specifically `:10-16` ("has a public settlement ingress / has none, deliberately") | **Legacy-only — corrected framing in review round 1** ([K01-REV-02](implementation-02.md)) | This is exactly F09's finding: the *durable record* (`ControllerResumptionId`, its state, its `observedRevision` provenance field) is Kernel-persisted, but the actual work it names is an in-process `Promise`/thunk that is, by the port's own contract, never persisted and cannot be reconstructed after a process death. Per 001's K1 section ("Remove controller resumptions and closed Agent/Workflow progress discriminators from the new Kernel protocol") and 003's F09 disposition, this whole mechanism does not migrate into the K1 Kernel protocol. **Correction:** round 1 said this record's *shape* (a Kernel-visible "local work" wait arm) was worth preserving with only its referent reclassified. That is withdrawn (§5, W-4): the target Kernel `waitingFor` record has **no** arm analogous to this at all, Kernel-visible or otherwise — this record and its `ExecutionWait` arms are legacy-only in the stronger sense that *neither the data nor the shape* informs the new Kernel wait protocol. It may continue to exist unchanged **inside** a compatibility Runtime (K1.4's "bridge existing controllers... keep its live-promise resumption private", 001 K1) as purely Runtime-private bookkeeping — legacy-only means "not part of the new Kernel contract, in data or in shape," not "delete the file." |
| LEG-2 | `Harness.activate`'s mailbox consumption before `RUNNING`/before controller output exists (`packages/core/src/runtime/harness.ts:762`, `tx.mailboxes.consume(...)` inside the same transaction that writes `RUNNING`, prior to `runController` ever being called) | **Legacy-only** | This is F07: the current code treats "consumed from the mailbox" as equivalent to the target's "reserved in Activation," but does so as an unconditional side effect of claiming the Activation, not as part of accepting the resulting Outcome. It does not by itself satisfy B-3 (whole-batch acknowledgment tied to *Outcome acceptance*, not to dispatch). K1 must tie acknowledgment to accepted Outcome, not to the earlier consume-on-claim step, to satisfy OA-3/OA-4 and B-3 together (also connects to `REF-1`/`REF-4`). |
| LEG-3 | The `CREATED` lifecycle state (`packages/core/src/execution/lifecycle.ts:16`, `:24-32` `LIFECYCLE_STATES`/enumeration, `:47` `CREATED: ["READY", "CANCELLED"]`), and `CancellationRequest`'s own docstring naming it as a real current phase: "For a `CREATED`, `READY`, or `WAITING` Execution the runtime transitions straight to `CANCELLED`" (`cancellation-request.ts:4-6`) — **added in review round 1** ([K01-REV-03](implementation-02.md)) | **Legacy-only** | 004's architecture review explicitly retires this as a mandatory Kernel state: its decisions table names the decision "Remove separate CREATED state from target," reasoning "Create, initial input and readiness can be accepted together; partial allocation is an operation attempt." The target lifecycle (kernel.md's diagram) starts directly at `READY` from one atomic `create + initial input` decision (execution-protocol.md's "Identities and immutable exchanges": "Creation binds the Runtime contract and executable definition revision, authority context and initial input in one atomic decision"). Current code's separate, externally observable `CREATED` phase — with its own transition edges and its own cancellation handling — does not migrate as a distinct target phase; K1 folds it into the atomic creation boundary (§11 row 1). The transition-table *pattern* (`MIG-2`) still applies to whatever shorter state list K1 actually uses. |
| LEG-4 | `ControllerProgress`'s closed `kind: "agent" \| "workflow"` discriminator (`packages/core/src/execution/context.ts:57-59`), backed by the closed `DefinitionKind` union (`packages/core/src/definitions/types.ts:22`, `export type DefinitionKind = "agent" \| "workflow";`) — **added in review round 1** ([K01-REV-03](implementation-02.md)) | **Legacy-only** | 004's vocabulary-disposition table explicitly lists "closed Agent/Workflow union" under "Remove from mandatory Kernel model." A two-literal closed union cannot express a third Runtime kind without editing this type, which is exactly the closure 004 rejects as a Kernel concept — the opaque progress payload (`MIG-3`) is fine to keep opaque, but *tagging* it with this specific closed enum is not the target's compatibility mechanism. PC-4 already names the actual target mechanism: "versioned to the exact Runtime/definition contract revision that can understand it" — which `ExecutionContext.definition: ExecutionDefinitionRef` already tracks per Execution, kind-agnostically. K1's generic progress record should identify compatibility through that pinned Runtime/definition revision, not through a hardcoded two-value literal type; a compatibility-Runtime bridge may keep using `"agent"`/`"workflow"` as its own *internal* tag without that tag being part of the new Kernel protocol's progress-compatibility contract. **Concordant sources, checked together in review round 4** ([K01-R4-02](implementation-05.md)): 001's K1 section ("Remove controller resumptions and closed Agent/Workflow progress discriminators from the new Kernel protocol"), 007's K1.1 acceptance ("no Agent/Workflow discriminator in the new boundary"), PC-1's corrected form-(a) statement, and `MIG-3`'s nested-payload scope now say the same thing: the payload migrates, this tag does not, and compatibility is decided by the pinned contract (PC-4). |
| REF-1 | Effect dispatch happening in `applyOutcome` (`packages/core/src/runtime/harness.ts:890-911`, `this.effects.processActivationEffects(...)`) *before* the progress-committing transaction (`harness.ts:938` onward, `this.options.store.transact(...)`) | **Refused** | This is F10 exactly: Effects are processed and can partially fail *before* the transaction that commits next-state/progress/acknowledgment. The in-code comment at `harness.ts:904-906` ("nothing partial was committed") is not true of the whole boundary — it is true only of the effect-dispatch call itself. This ordering is refused for the target K1/K2 boundary: OA-3/OA-4 require Effect *intents* to be part of the same atomic commit as progress, with actual dispatch/settlement happening afterward from the accepted record. This is explicitly a K2-boundary pattern (Effects don't exist in K1 at all, §8) — it is listed here because the current code's *ordering pattern* (side-effect-before-commit) must not be carried forward into K1's non-Effect Outcome-acceptance path either. |
| REF-3 | `ExecutionWait`'s `dependencies` arm as currently defined (`packages/core/src/execution/context.ts:126-130`) treated as a **Kernel wait primitive at all** — **corrected framing in review round 1** ([K01-REV-02](implementation-02.md)) | **Refused outright as a target Kernel record shape; the Event half is separately migratable as `MIG-5`, the `resumptions` half is `LEG-1`** | Round 1 framed this as "the shape is worth keeping, only the referent needs reclassifying." That is withdrawn (§5, W-4): the target Kernel `waitingFor` record is not a union with an `event`-or-`resumptions` shape at all — it is Event-only. A K1 Kernel wait record must not itself carry any field naming a `ControllerResumptionId` or equivalent local-work identifier, full stop; there is no partial-credit "shape" to preserve. If a Runtime needs "wait for any of several local jobs plus one Event," that union is assembled **entirely Runtime-side**, privately, with only the Event surfacing to the Kernel as a real `waitingFor` registration once (and only once) something is actually ready to report (§5, W-4's "does not yet submit an Outcome" resolution) — restating kernel.md's "a Runtime can implement an all-of join by retaining observed results in progress and waiting for the remaining set," generalized to this any-of case. |
| REF-4 | The reference mailbox's single monotonic `consumed` cursor (`packages/core/src/reference/in-memory-runtime-store.ts:45-50`, `MailboxState.consumed: number`, doc-commented "How many of `events` an Activation has already consumed"; `consume()` at `:161-167` takes `box.events.slice(box.consumed)` then unconditionally sets `box.consumed = box.events.length`). **Wording corrected in review round 2** ([K01-R2-04](implementation-03.md)): revision 2 described the same mechanism as both "refused for K1+" and "retained as the K1 reference," which cannot both be true | **Refused as the mailbox mechanism of the new K1 reference; the existing file remains legacy/compatibility material for current 0.8.x paths until migration** | This cursor is F20's flagged problem in current code: one global count, not a per-entry disposition, so it cannot represent B-4's retained unmatched input (an Event not selected into a batch must stay independently accounted for, not merely "after the cursor") or B-5's per-Event terminal disposition. It also implements no eligibility filter: `consume()` takes *everything* past the cursor regardless of the registered wait's alternatives or declared subscriptions (§5, W-1), and it consumes at dispatch-claim time rather than acknowledging at Outcome acceptance (`LEG-2`, B-3). K1's reference mailbox must therefore be a **new mechanism** — per-Event disposition plus eligibility selection plus Outcome-time acknowledgment — not this one carried over. To be unambiguous about the two statements revision 2 conflated: the *cursor mechanism* does not become the K1 reference's mailbox; the *existing file* may keep running the current 0.8.x paths unchanged until those paths migrate. Being in memory is not what is refused here (see `LIM-1`) — this specific consumption mechanism is. |
| REF-5 | Adoption of the current `ExecutionWait.event` **shape** as the new target Kernel wait record — its single `wake: WakeCondition` **and its optional legacy `interleave?: WakeCondition`** (`packages/core/src/execution/context.ts:102-103` the arm itself; `:79-100` the "Controlled interleaving" docstring; `:132-134` `eventWait(wake, interleave?)`; mirrored on the controller report at `packages/core/src/ports/controller.ts:86-92`). **Split out of revision 3's `MIG-5` in review round 3** ([K01-R3-02](implementation-04.md)); **extended in review round 4** ([K01-R4-01](implementation-05.md)) to name the `interleave` field explicitly, which revision 4 omitted from this row while W-5 still carried it as a *target* field | **Refused** — the whole shape, `wake` and `interleave` together, is refused unchanged as the target K1 Kernel wait record; the dependency matcher inside it is separately classified `MIG-5` | **The `wake` half.** The record holds **one** condition with **one** `correlationId`, so it cannot express W-1's finite list of *differently correlated* alternatives: a single condition must either fix one correlation and miss the other alternative, or set `correlationId: null` and over-match every Event of that kind (§5, W-7 case 1). It also carries **no Event-identity selector field**, so it cannot express the identity dimension of W-1's selector grammar at all — an alternative pinned to one exact Event has no home here (added in review round 5, [K01-R5-02](implementation-06.md)). Its way of encoding an *absent* selector does not carry over either: the record uses in-band sentinels — `eventKinds: []` and `correlationId: null` — where the target grammar expresses absence by not supplying the field at all, which is why `MIG-5` states a translation rather than a straight adoption and why W-1 rejects a supplied empty kind set outright (added in review round 6, [K01-R6-02](implementation-07.md)). And it has **no declared-input-subscription concept at all**, which is why the current shape cannot express W-8's subscription-only wait: there is nowhere to put `{continue}`, and the matcher could not evaluate it if there were (`MIG-5`). Note the asymmetry the split records: the *matcher* inside this record is migratable for the two dimensions it does implement (`MIG-5`); the *record* is refused because a single condition with no identity field and no subscription list cannot hold W-1's two lists however good its matcher is. **The `interleave` half is refused with it.** `interleave` is a second singular `WakeCondition` whose documented meaning is a wake "without the primary dependency being satisfied" (`context.ts:88-89`) — a Kernel-visible distinction between two classes of wake, and with it an implied per-registration record of which dependency is still unsatisfied. The target record has neither: W-1 carries one list of dependency alternatives and one list of subscriptions, any eligible member of either retires the registration, and the Runtime re-registers what it still needs (W-5). Keeping the field would give the target two ways to spell one intent and would re-introduce the satisfied-flag semantics W-1 deliberately does not have. K1's wait record is therefore rebuilt from the `MIG-5` primitive plus new subscription matching, as two declarative lists plus the §4 deadline and the W-3 generation (§5, W-1). Refusing the shape is not a refusal of the file: it may keep serving current 0.8.x paths unchanged until they migrate (`LC-1`). |
| LEG-5 | `PendingOperation` (`packages/core/src/effects/pending.ts:73-106`) as a **single universal record covering every Effect kind alike** — one shape for spawn, message, user-input request, timer and capability call, carrying `PendingOperationStatus`, `PendingDispatchState`, `PendingOutcomeState`, `idempotencyKey`, `deadline` and `resultEventId` together (its own docstring: "Generic on purpose. Nothing here mentions capabilities, because `SpawnExecution`, `SendMessage`, `RequestUserInput`, and a timer all need the same runtime record", `pending.ts:4-8`). **Classification corrected in review round 2** ([K01-R2-02](implementation-03.md)); round 1 wrongly recorded this as out-of-scope with no label, which K0.1-C3 does not permit | **Legacy-only** (the universal abstraction); individual facts inside it are reusable input to K2's own records, as split below | The *universal hierarchy* is explicitly removed from the mandatory target Kernel model: 004's vocabulary-disposition table lists "universal PendingOperation hierarchy" under "Remove from mandatory Kernel model," kernel.md states "Pending action state is necessary; a separate universal `PendingOperation` abstraction is not required beyond these records," action-lifecycle.md opens with "This is not a new universal PendingOperation hierarchy," and 007's own K2 exclusions row forbids a "universal pending hierarchy." So the record as a *generic one-size abstraction* does not migrate. **Split — facts that remain necessary and may inform K2's logical-action/attempt/responsibility records without K0.1 deciding K2's mechanics:** (a) separating *dispatch* from *outcome* (`PendingDispatchState` versus `PendingOutcomeState`, `pending.ts:14-20`) so that "dispatched with no outcome" is representable rather than inferred — the same distinction action-lifecycle.md's "Attempt evidence" dimension requires (§8, EF-3); (b) retaining `unknown` as a first-class outcome value rather than collapsing it to failure; (c) correlating a settled request to the exact result Event that delivered it (`resultEventId`); (d) an explicitly nullable deadline meaning "no deadline was configured" rather than a sentinel far-future timestamp (`pending.ts:96-101`). **Facts that are not generic Kernel material:** `conflicted` is Structured-Memory-write-specific and `declined`/`denied`/`rejected` encode confirmation/authorization specifics (`pending.ts:38-71`) — whether K2 keeps, renames or restructures those belongs to K2's admission/settlement contract, which K0.1 does not decide. **Scope note (unchanged):** K1 still refuses all Effects (§8, `EF-1`/`EF-2`), so no pending record of any shape is created in K1's boundary; that is a scope fact about K1, not a substitute for this record's legacy classification. |

**Decision LC-1 (no legacy record is deleted by this packet).** Every classification above describes
what the **new K1 Kernel contract** may depend on; it is not an instruction to remove any file. `LEG-1`
material specifically is expected to keep working, unchanged, as private machinery inside the K1.4
compatibility Runtime (001 K0's own instruction: "Bridge existing controllers inside a compatibility
Runtime where feasible; keep its live-promise resumption private"). `LEG-3`/`LEG-4` similarly describe
what the *target Kernel protocol* does not need, not files to delete — a compatibility Runtime may keep
using an internal `CREATED`-like phase or an internal `"agent"`/`"workflow"` tag for its own bridging
purposes.

### Reference-implementation limitations (not a legacy disposition)

`LIM-1` is **not** a migratable / legacy-only / refused classification, and review round 3
([K01-R3-02](implementation-04.md)) moved it out of the table above for exactly that reason: it does
not dispose of a legacy *record*, it records what the current reference store's mechanism does and
does not prove. Review round 2 ([K01-R2-04](implementation-03.md)) had already reclassified it from
revision 2's `REF-2` refusal; round 3 keeps that substance intact and keeps the `LIM-1` ID — both
`REF-4` above and §13 below reference it — and simply stops presenting it as a fifth disposition
label. K0.1-C3's vocabulary is not expanded to accommodate it.

**`LIM-1` — `InMemoryRuntimeStore.transact`**
(`packages/core/src/reference/in-memory-runtime-store.ts:455-468`).

*What the source shows.* The scope parameter is named `_scope: ExecutionId` (leading underscore —
declared but unused); every transaction does `const draft = structuredClone(this.state)` (`:457`)
against the *entire* store's `RuntimeState` and installs the whole draft back (`:459`); and all
transactions are serialized through one `queue` (`:453`, `:462-466`).

*Status.* An **implementation/scalability limitation of the reference store** — not a semantic
classification of legacy data, and not a refusal of the in-memory reference itself.

*What follows.* Two facts are proven by source and stand: the store *accepts a scope argument and
ignores it*, and it clones and globally serializes the whole aggregate per transaction. The first
matters semantically: nothing here implements per-Execution scoping, so **no K0/K1 assertion may rest
on the store's global serialization as if it were a scope contract** — that is this entry's actual
obligation. The second is a cost/scalability property for K3 to measure (003's F13: "measure actual
cost and choose bounded persistent mechanism"), not a semantic defect.

*Correction carried forward from round 2.* Revision 2 further claimed this proves Runtime computations
cannot overlap. It does not. `Harness.activate` closes its claim transaction before any controller
runs — the `store.transact(...)` call spans `harness.ts:742-764` and `runController` is invoked
afterwards at `:779` — so controller computation happens entirely outside any store transaction, and
two Executions' computations can overlap in wall-clock time even with a globally serialized store.
Whether K1's "one delayed Runtime must not prevent the same coordinator loop dispatching another
Execution" requirement is met is therefore a **separate question about the coordinator loop, not the
store**, and K0.1 records no verdict on it without an actual counterexample; `runOnce`'s sequential
await (`harness.ts:683-690`) is the structure K1.1 should examine for that requirement. 001 K1
explicitly requires building this behavior "in an in-memory reference," so an in-memory store is
mandated, not refused; what must change for K1 is the ignored scope argument and the mailbox mechanism
(`REF-4`), not the decision to be in memory.

---

## 13. Contradictions found and how resolved

Per K0.1-C5, explicit call-outs rather than silent resolution:

- **Contradiction:** `harness.ts`'s own code comment ("nothing partial was committed") versus the
  actual multi-step, non-atomic sequence in `applyOutcome` (REF-1). **Resolution:** the canonical
  contract (kernel.md's Acceptance/atomicity table) wins; the comment is inaccurate about the current
  code's actual atomicity, not evidence the target requirement is already met. This is recorded as a
  finding (F10) in 003, not invented by this worksheet.
- **Contradiction:** the current `ExecutionWait.dependencies` arm reads, at first glance, like exactly
  the Kernel-owned "finite any-of set" W-1 asks for — but it names `ControllerResumptionId`s, which
  §12 classifies legacy-only. **Resolution, corrected in review round 1** ([K01-REV-02](implementation-02.md)):
  round 1 resolved this by keeping the union *shape* and reclassifying only the referent, i.e. "W-1's
  requirement is satisfied by the shape, not by this field's current referent." That resolution was
  itself wrong and is withdrawn: W-1's finite-any-of-set requirement is satisfied entirely by Kernel
  Events (kernel.md's Events-and-waits section), with no local-work arm in the target record at all
  (§5, W-4). The target Kernel `waitingFor` record simply does not have a shape for "local work" to
  occupy, reclassified or otherwise; any such union is assembled Runtime-side, privately (`REF-3`).
- **Contradiction (added in review round 2, [K01-R2-03](implementation-03.md)):** the current
  `WakeCondition` is documented as sufficient for waiting, yet the same docstring concedes it "cannot
  yet select `external.input` by its application-defined `label`, so an Execution waiting for one kind
  of application input still wakes for every other one addressed to it," while kernel.md requires that
  "application-input waits require a declared subscription." **Resolution:** the canonical requirement
  wins. This is a *code-versus-target gap*, not a conflict between canonical sources: the code already
  labels it "accepted future work... deliberately deferred," and §12 classifies the record shape as
  **refused** unchanged for exactly this reason (`REF-5`, split out of revision 3's `MIG-5` in review
  round 3, [K01-R3-02](implementation-04.md)), while the matching primitive it contains stays
  **migratable for dependency-alternative matching only** (`MIG-5`, scope narrowed in review round 4,
  [K01-R4-01](implementation-05.md): it reads `event.kind` and `event.correlationId` and never
  `ExternalInputBody.label`, so it cannot build the subscription list). K1 supplies declared-subscription
  matching as **new work beside** that primitive (§5, W-1, and W-8's counterexample); nothing in the
  canonical set needs changing.
- **Re-checked in review round 2 ([K01-R2-04](implementation-03.md)) and withdrawn as a contradiction:**
  revision 2 asserted that the reference store's global serialization contradicted mental-model.md's
  "Unrelated Executions can compute concurrently." Re-reading the source shows no such contradiction:
  controller computation runs outside the store transaction (`harness.ts:742-764` closes before `:779`
  invokes `runController`), so a globally serialized store does not by itself prevent overlapping
  computation. `LIM-1` records the store's real limitation — an ignored scope argument, and cost — without
  the overreaching concurrency claim, and K0.1 records no verdict on K1's delayed-A/B requirement
  absent an actual counterexample. Round 3 ([K01-R3-02](implementation-04.md)) moved that entry out of
  §12's classification table into its own
  [reference-implementation-limitations subsection](#reference-implementation-limitations-not-a-legacy-disposition),
  because a statement about a mechanism's fitness is not a migratable/legacy-only/refused disposition.
- **Contradiction internal to this worksheet (found in review round 2's output and resolved in review
  round 3, [K01-R3-01](implementation-04.md)):** revision 3's E-7 defined rule 4 by Unicode code point,
  recommended UTF-8 byte comparison as its equivalent, and then claimed rule 4 coincided with RFC 8785
  — which sorts by unsigned UTF-16 code units. Two implementations each following the document
  faithfully could therefore produce different canonical bytes. **Resolution:** rule 4 is realigned to
  RFC 8785's UTF-16-code-unit ordering and the profile claim is restated accurately. No canonical owner
  is overridden by this: none states an object-key ordering rule, and execution-protocol.md explicitly
  leaves the choice to this packet ("Object key ordering need not create a different logical payload.
  K0 selects one canonical value encoding and limits"). This was a defect in K0.1's own drafting, not a
  dispute between canonical sources.
- **Contradiction internal to this worksheet (found in review round 4,
  [K01-R4-01](implementation-05.md)):** revision 4 described **two** target wait records at once. W-1
  defined the registration as a list of dependency alternatives plus a list of declared input
  subscriptions; W-5 simultaneously defined a singular `wake` plus a separate target `interleave`
  field; and B-2 selected the `WAITING` batch by W-5's shape rather than W-1's. A K1.1 implementer
  reading §3 and §5 together could not tell which record to build. **Resolution:** W-1 is the single
  target record, B-2 selects by W-1's eligibility rule alone, and `interleave` is reclassified as
  current-0.8.x legacy/compatibility semantics (W-5) whose adoption §12 `REF-5` refuses. No canonical
  owner is overridden: kernel.md names exactly the two sources W-1 keeps — "a wait on **any of a
  finite set of correlated Events**" plus "an explicit input subscription [that] can allow
  corrections/peer questions while waiting" — and no canonical page contains an `interleave` concept
  at all. A second defect of the same drafting: W-1 required the dependency list to be non-empty,
  which contradicted 001's own K0 trace (an input wait) and 007's K0.2 fixture scope; W-1's
  combined-source well-formedness rule and W-8 resolve it in the canonical trace's favour. (**Renamed in
  revision 10**: that rule is now stated as W-1's *structurally non-empty wait declaration*, because the
  old name implied an eligibility guarantee it never made — see `K01-R9-01` below. The round-4
  resolution itself is unchanged.)
- **Contradiction internal to this worksheet (found in review round 5,
  [K01-R5-01](implementation-06.md)):** revision 5's B-2 had only two cases, so after W-1 retired a
  wait on an eligible wake the Execution was plainly `READY` and the ordinary rule applied — "select a
  bounded batch from all currently unacknowledged Events, in acceptance order." An older **ineligible**
  Event could therefore displace the very Event that caused the wake, certainly so at a batch bound of
  1. That contradicted §5's own W-7 case 5 and W-8 case 3, which asserted the correct batch with no
  rule behind it, and it contradicted execution-protocol.md's input-reservation rule directly: "While
  WAITING, select only Events eligible under the registered wait/subscriptions, **with an eligible wake
  included before unrelated backlog**." **Resolution in the Kernel's favour:** the canonical guarantee
  wins and is carried across the retirement rather than lost with it. `B-6` records the retired wait's
  eligibility rule as **recoverable readiness** — a field the relevant canonical acceptance boundary
  already commits, whichever boundary applies (round 6 made that per-path precision explicit; see the
  next entry) — and B-2 gains a third case that selects that one dispatch by it. No wait is revived, no satisfaction flag is introduced and no new Kernel
  entity is created; W-8 case 4 is the load-bearing counterexample. The canonical sentence is phrased
  from the `WAITING` side because it predates W-1's retire-on-wake refinement, so this is K0.1 owing
  the canonical rule a mechanism, not the canonical rule being amended.
- **Contradiction internal to this worksheet (found in review round 5,
  [K01-R5-02](implementation-06.md)):** revision 5's W-1 described a dependency alternative twice, and
  differently — "its kind (set membership) and/or its correlation identity" in item 1, then "compared
  by equality over envelope identity, kind, correlation and declared-subscription name" a few
  paragraphs later. A K1.1 implementer could not tell whether exact Event identity was a selectable
  dimension, nor whether a subscription name was a fourth field on an alternative. **Resolution:** one
  grammar is now stated in full (W-1, *The dependency-alternative selector grammar*), built from the
  three dimensions kernel.md already names — "Conditions use envelope identity/kind/correlation, not
  arbitrary code or model-text predicates" — with conjunction inside an alternative, ANY-OF between
  alternatives, at least one field supplied, equality-only comparison, no payload selection, and
  subscriptions kept on their own separate path. Neither reading was a canonical conflict; both were
  this worksheet under-specifying, and the resolution takes the canonical dimension list as given.
- **Contradiction internal to this worksheet (found in review round 6,
  [K01-R6-01](implementation-07.md)):** revision 6's `B-6` said its two creation paths "both create
  wake-triggered readiness identically" and that it is committed "with the accepted Outcome." That is
  true only of path A. On path B the Execution is already `WAITING`, the Runtime is not running, and
  **no Outcome exists** — so the text named a boundary that is not there, and the only obvious way to
  implement it was the one execution-protocol.md forbids: accept the Event, then write the readiness
  afterwards. It also conflated three boundaries kernel.md's Acceptance/atomicity table keeps
  distinct, each of which *already* carries readiness in its own right — Creation/input ingress
  ("mailbox entry, **with readiness when applicable**"), Effect settlement ("**result Event and
  recoverable readiness**") and Child/message operation ("fulfillment cannot lose the link") —
  alongside Outcome acceptance. **Resolution in the Kernel's favour:** the canonical table wins.
  `B-6` now states two paths with the boundary named for each, and its *Recovery* paragraph maps each
  path onto the governing row of recovery-and-compatibility.md's crash-window table ("Input commit
  before scheduler notification", "Settlement committed before wake", "Outcome accepted before
  receipt", "Dispatch intent before send"). No new boundary is invented and none is merged: K0.1 only
  names which existing one commits the readiness in which case.
- **Normativity misplaced rather than contradicted (found in review round 6,
  [K01-R6-02](implementation-07.md)):** revision 6 left W-1's Kind selector as "a finite set of kinds"
  without excluding the empty set, and put the rule that the empty set must be rejected in §12's
  `MIG-5` — a legacy-classification row carrying a pseudo-normative validation constraint. The two
  readings did not conflict, but a K1.1 implementer reading the grammar alone would not find the rule,
  and a reader of `MIG-5` could not tell whether it was describing the target or the legacy encoding.
  **Resolution:** W-1 states it normatively (an empty finite kind set is not a valid supplied Kind
  selector, rejected before matching), and `MIG-5` is restated as a pure **encoding mapping** carrying
  no validation rule of its own — legacy `eventKinds: []` means *Kind selector absent* because the
  source says so, legacy `correlationId: null` means *Correlation selector absent*, and the five
  worked cases show which legacy shapes map to which valid target alternatives and which map to none.
  This is a placement correction, not a change of rule.
- **Contradiction with a canonical owner (found in review round 6's output, resolved in review round
  7, [K01-R7-01](implementation-08.md)):** revision 7's W-1 eligibility rule made "matches a dependency
  alternative" and "is application input matching a declared subscription" two *independent sufficient*
  conditions. Once round 5 had made the selector grammar exact, that reading let a Runtime write a
  dependency alternative `kind = external.input`, declare **no** subscription, and be woken by ordinary
  application input — directly contradicting kernel.md's Events-and-waits section:
  "**application-input waits require a declared subscription**." **Resolution in the Kernel's
  favour:** eligibility is decided by **source category** first, and only then by that category's
  matching rule; ordinary application input has exactly one path (declared subscription) and a
  dependency alternative naming its kind is inert (W-7 cases 6–7). The canonical sentence is not
  softened, and the two lists stay separate in both directions. `MIG-5` gains the corresponding
  statement that the current matcher is a *component* of eligibility rather than the predicate itself.
- **Gap against this worksheet's own §4 (found in review round 7,
  [K01-R7-02](implementation-08.md)):** §4's three-clocks table already promised that a wait-deadline
  expiry means "the Runtime gets a timeout fact in its next eligible batch," and §5's W-3/W-6 already
  fenced stale timers — but revision 7 gave expiry no acceptance semantics, no observation identity and
  no batch guarantee. Because W-1 retires the wait on expiry too, the dispatch fell into B-2's
  *ordinary* `READY` case, where older unrelated backlog could displace the timeout at a small bound:
  the exact defect `B-6` was created to fix, surviving in the half of the problem `B-6` never reached.
  **Resolution:** B-2's middle case is generalized to "a registered wait **ended**", with `B-6` and new
  **`B-7`** as its two species, and new **W-9** fixes the timeout observation's logical identity,
  wait-generation correlation and mandatory delivery. W-3 and CL-2 are preserved unchanged: a
  superseded-generation timer is still a no-op, and a timeout and a later correlated result remain two
  accepted facts, neither rewritten into the other (W-9 cases 3–4). **Superseded in part by revision
  9:** round 7 also left the observation's *representation* open to K1.3, which the next entry shows was
  not a free choice — W-9 now fixes the semantic home (it **is** a Kernel Event) and leaves K1.3 only
  the wire token, discriminant, schema, storage layout and timer mechanism.
- **Over-reach corrected (found in review round 7, [K01-R7-03](implementation-08.md)):** revision 7's
  `B-6` path-B row collapsed child results, messages and other routed results into a single boundary
  that commits "the fulfillment/routing obligation and the resulting Event, with readiness, in one
  accepted decision." kernel.md explicitly permits the other profile — routing "committed with the
  terminal result **or a durable routing intent**" — so revision 7 stated one conforming shape as the
  rule and, in doing so, began freezing a mechanism K4 owns. Round 7's own report had flagged this
  reading as its likeliest error. **Resolution:** obligation creation and destination Event acceptance
  are allowed to be two distinct accepted facts; `B-6` starts for the destination only when fulfilment
  actually accepts the Event into its mailbox, and readiness attaches to *that* boundary; a
  single-transaction profile stays conforming but is not required; and recovery replays or idempotently
  fulfils the obligation rather than fabricating readiness. K0.1 now states only the cross-cutting
  invariant — **never fabricate destination readiness before the destination Event exists** — and names
  a boundary role rather than a mechanism.
- **Superseded rule left live in a second place (found in review round 8,
  [K01-R8-01](review-08.md)):** round 7 corrected W-1's eligibility rule to decide by source category,
  but B-2's `WAITING` bullet still carried the superseded "matches a dependency alternative **or** is
  application input matching a subscription" form. Two sections therefore answered W-7 case 6
  differently, and the section a K1.1 implementer reads for *batch selection* answered it the wrong
  way, reopening the application-input bypass in the one place selection actually happens.
  **Resolution:** §3 no longer states an eligibility rule at all. B-2's third bullet records that a
  `WAITING` Execution is not dispatched, so there is nothing to select there; eligibility while
  `WAITING` is W-1's rule, cited rather than restated, and the guarantee execution-protocol.md phrases
  from the `WAITING` side is carried across the retirement by the wait-ended case. The rule now lives
  in exactly one place. This is the
  fourth round in which a correct correction was not carried to a dependent decision, and it is why
  revision 9 replaces paraphrase with citation wherever one decision restated another's rule.
- **An open semantic choice that `B-1` had already closed (found in review round 8,
  [K01-R8-02](review-08.md); an additional live contradiction found by this round's own
  reconstruction):** W-9 left the timeout observation's representation open — "an Event of a dedicated
  kind in the mailbox, a distinct field on the Activation's accepted-input contract, or another
  representation" — while B-1 defines a batch as a set of **Event** references and `B-7` makes the
  timeout a **mandatory member** of one. Those three statements have no common model unless the timeout
  is an Event. Reconstructing the protocol as one state machine exposed a second, sharper form of the
  same defect that the review did not name: revision 8's B-2 selected the wait-ended batch "**only**
  from Events eligible under the retired wait's rule," and its W-1 listed the timeout among the Events
  that need a **dependency alternative** — so for W-8's subscription-only `W₀`, whose dependency list is
  legitimately empty, the mandatory member was by the same document **ineligible**. W-8 case 6 is that
  counterexample. **Resolution in the Kernel's favour:** W-9 fixes the semantic home — the timeout
  **is** a Kernel Event, which is also the minimum-concept answer, since the alternative would add a
  second batch-member type and duplicate B-3/B-4/B-5 behind it — and W-1's category table places it
  outside the matching rules entirely (it is never made eligible by an alternative or a subscription,
  and an alternative naming a timeout kind is inert). §3's wait-ended batch rule states the batch as a
  **union** of the mandatory member and the eligible Events rather than as a filter result, which is
  what makes `W₀` + deadline answerable at all. Only the wire token, discriminant, schema, storage
  layout and timer mechanism stay implementation-owned. execution-protocol.md already supports the
  reading: "order their acceptance and let the Runtime interpret **the eligible batch**."
- **A current rule made conditional on a future packet (found in review round 8,
  [K01-R8-03](review-08.md)):** W-1 stated the source-category rule exactly and then left open whether
  K1.3 might let a declared subscription name a non-input peer class — so the "exact" current rule was
  contingent on a decision nobody had made, and a K1.1 implementer could not tell which rule to build.
  **Resolution:** the K0/K1 rule is closed and unconditional. Nothing canonical is lost by closing it:
  kernel.md's "An explicit input subscription can allow corrections/peer questions while waiting" is
  satisfied as written, because a **correction** is ordinary application input (subscription) and a
  **peer question** is a `peer.message` (dependency alternative on kind and/or the asking correlation)
  — both can wake a waiting Execution today. composition-and-communication.md's richer "subscribe to
  addressed clarification input from B" sits on a page whose own status line reads **target K4**; if K4
  wants that, it is a **versioned extension** of the interaction contract under
  recovery-and-compatibility.md's *Protocol/codec* dimension, with an explicit revision and a refusal
  path — never a reinterpretation of this rule, and never a second path for application input, which
  kernel.md forbids outright.
- **A K0-owned clock case left undecided (found in review round 8,
  [K01-R8-04](review-08.md)):** a wait registered with an **already-due** deadline had no answer.
  Revision 8's own report named the gap and recorded "two defensible answers," which is precisely what
  K0.1-C2/C6 forbid this document to do about semantics it owns. **Resolution:** W-2 states one ordered
  registration algorithm — acknowledge this Outcome's batch, check the mailbox, evaluate an already-due
  deadline, otherwise persist `WAITING` — so the Event branch wins when both apply (no timeout is minted
  for a wait an accepted Event had already ended) and an already-due deadline collapses inside the same
  Outcome-acceptance transaction (`B-7` path A), with durable `WAITING` never persisted for that
  generation. The refused alternative — persist `WAITING` and let the timer fire — reaches the same
  eventual state but makes the observable next state depend on timer latency, so a K1 fixture could not
  assert an exact outcome. **This overrides no canonical owner:** execution-protocol.md's "If one is
  already present, next state is READY; otherwise it is WAITING" resolves the *Event-presence* branch,
  which is W-2 step 2; the deadline is a separate identity (CL-1) evaluated at the same boundary; and
  kernel.md's lifecycle line already admits an `await` accepted as `READY`. The invariant both are
  instances of is stated once: **a wait that cannot be live at the moment of its own registration is
  never persisted as live.**
- **Consistency defects found by this round's own reconstruction, not by the review.** These are
  recorded as **implementer-discovered**; none was named by [review-08.md](review-08.md), and none is
  attributed to it. Each was resolved in this same revision rather than deferred.

  1. **The subscription-only wait with a deadline** had two answers in one document — the counterexample
     above, folded into `K01-R8-02`'s resolution and written out as **W-8 case 6**.
  2. **No rule said what an Event acceptance does when no wait is live**, which left "accept an
     interesting Event and arm a readiness" available to an implementer and could have let a second
     readiness arm behind the first and re-select an already-reserved batch. Resolved by new **`B-8`**
     and §3 contrast row 6.
  3. **No ordering between a wait's registration check and the registering Outcome's own batch
     acknowledgment**, which would have let a wait be woken by the very Events the Outcome that
     registered it had just accounted for — a self-sustaining wake loop. Resolved by **W-2 step 1**;
     the current code's own prospectivity docstring already states the rule
     (`packages/core/src/interaction/event-envelope.ts:57-60`).
  4. **No "exactly one timeout Event per generation" and no idempotency rule**, which an at-least-once
     timer transport would have turned into repeat timeouts and repeat Activations. Resolved in **W-9**
     with **case 6**.
  5. **No statement of which acceptance boundary accepts a Kernel-minted timeout**, which sat awkwardly
     against §2 ID-6/ID-7's six caller-facing boundaries. Resolved in **W-9** (*Which boundary accepts
     it*) by naming the same **boundary role** `B-6` path B already used — no seventh boundary, no
     external receipt.
  6. **No terminal-race caveat on "mandatory delivery"**, which as written promised an Activation that
     a first-accepted cancellation makes impossible. Resolved in **W-9** (*Mandatory delivery*) and B-5.
  7. **No explicit minimum batch bound**, which would have made both species' mandatory members
     unsatisfiable at a bound of 0. Resolved in **`B-1`**.
  8. **No truncation rule**, so "subject to the bound" did not say *which* candidates survive it: with
     two eligible Events and a bound of 1, two implementations could dispatch different batches.
     Resolved in §3's wait-ended batch rule — retain the mandatory member, then fill with the
     earliest-accepted remaining candidates, and present in acceptance order.
  9. **No argument that the mandatory member is still available at reservation**, which the whole
     guarantee rests on. Resolved in the same rule: only an accepted Outcome acknowledges (B-3), no
     Outcome can intervene between a wait-ended readiness and its reservation, and a terminal decision
     produces no reservation at all.
  10. **No statement about empty batches**, leaving it unclear whether a `continue` with an empty
      mailbox is dispatchable. Resolved in the same rule: an ordinary-readiness batch **may** be empty,
      a wait-ended batch never is.
  11. **W-2's steps could be read as four commits**, which would reintroduce exactly the
      partial-acceptance failure OA-3/OA-5 forbid. Resolved by stating that they are ordered
      *evaluation* inside one transaction and that "stop" decides the next state rather than ending the
      transaction early.
- **Two answers for one wait record: structural validity versus effective wakeability (found in review
  round 9, [K01-R9-01](review-09.md)):** revision 9's W-1 stated well-formedness as "one **eligible**
  wake source across the two lists combined" and required a wait to "name at least one Event class that
  **can end it**", while the selector-grammar paragraph a few lines later said a structurally valid
  alternative may be **inert** under the source-category rule, "is not rejected at registration" and
  "simply contributes nothing". Both were normative and they disagree on the same record: for
  `dependencies = [{kind: external.input}]` with an empty subscription list, the first reading rejects
  the registration (that alternative can never end the wait) and the second accepts it (one valid
  alternative is present). A K1.1 implementer building the validator could read either.

  **Resolution — the structural reading, which revision 9's grammar paragraph already implied.**
  Well-formedness is now a purely **structural** test with three rules — the declaration is
  structurally non-empty (either list may be empty, not both), every present alternative satisfies the
  selector grammar, every present subscription is structurally valid — and it is stated in terminology
  that cannot be mistaken for eligibility. Three consequences are now explicit: an inert alternative
  **still counts** toward structural non-emptiness; a well-formed wait may therefore never be woken and
  may stay `WAITING` until a deadline or cancellation ends it; and **no new intent or satisfiability
  checker is introduced** to prevent that. Four deterministic cases pin it (both lists empty → rejected,
  with or without a deadline; the inert alternative alone → valid and never woken; the same with a
  deadline → valid and ended by `B-7`; subscription-only → valid and behaving exactly as W-8 states).
  W-8's *What this rules out* is correspondingly narrowed to *What this makes unnecessary*: the target
  removes the **necessity** of a fake dependency, not a Runtime's ability to write one.

  **This resolves toward the canonical owner rather than away from it.** kernel.md already declines the
  stronger promise — "Parent/peer cyclic waits can still deadlock: expose correlations and deadlines;
  do not promise general deadlock prevention" — and execution-protocol.md repeats it ("General deadlock
  prevention is not promised"). The rejected reading would have had K0.1 quietly promising a
  satisfiability guarantee two canonical pages disclaim. Actual Event eligibility stays exactly where
  revision 9 put it, in W-1's source-category table, and the round-9 wait-ended state machine — the
  timeout Event, `B-6`/`B-7`'s two paths, W-2's ordered registration, `B-8`, the timeout/result
  ordering and the cancellation-before-reservation disposition — is unchanged.

- **Eligibility confused with selection (review round 10, [K01-R10-01](review-10.md)).** Revision 10's
  W-1 source-category paragraph and §11 row 5(b) still said B-2 selected a `WAITING` batch, contrary
  to B-2's explicit no-selection state. **Resolution in revision 11:** both passages cite `B-6`/`B-7`
  for retirement/readiness and `B-2` for selection once `READY`. W-7 case 7's selection reference and
  §11 row 5(e) also name B-2. Eligibility remains W-1's rule; no selection algorithm changes, and
  B-2's mandatory-member and unrelated-backlog guarantees remain intact.

- **Early-result acknowledgment wording (implementer-discovered in revision 11, K01-I11-01).**
  W-6 case 4 said W-2 "finds and consumes" an early result at registration, allowing a reading that
  contradicted B-3's Outcome-time acknowledgment and W-2's distinction between the registering
  Outcome's batch and the still-unacknowledged mailbox. **Resolution:** W-6 now cites W-2 step 2 for
  readiness and B-2 for subsequent selection, explicitly retaining the Event's unacknowledged state
  through registration and reservation. W-9 case 3's reference to that example now says "find" rather
  than "consume". This corrects the example to the existing algorithm; it changes neither W-2 nor B-3.

- **Round 12 — Claude reviewer findings** ([review-11.md](review-11.md)):
  - **K01-R11-01 (P2):** CX-2's application wording, §11 row 7's discarded next state and OA-4/OA-5
    left whole-Outcome acceptance ambiguous; MIG-1 treated current code as the answer. CX-1/CX-2 now
    order by cancellation request acceptance. CX-6 states full rejection, inspectable reason, zero
    accepted Runtime mutations and recorded-rejection replay. OA-3/OA-4 fence atomically; OA-5,
    B-3/B-5, §11 rows 3/7/8 and M-1 agree. MIG-1 is narrowed to the safe-boundary mechanism and
    REF-6 refuses current losing-progress installation. Governing sources: kernel.md Recovery and
    cancellation/Acceptance and atomicity, recovery-and-compatibility.md Cancellation and operational
    recovery, and execution-protocol.md Outcome acceptance. Physical interruption timing does not
    decide the semantic winner.
  - **K01-R11-02 (P3):** B-8's live-only qualifier contradicted rows 1/3 and W-3. B-8 now includes
    generations created and retired in their own registration transaction; W-3 and rows 1–4 unchanged.
  - **K01-R11-03 (P3):** ID-6's bad §7 pointer now names ID-7's six atomic boundaries.
  - **K01-R11-04 (P3):** B-4's eligibility wording implied a gate on ordinary READY. B-4 now cites
    both B-2 selection cases; §3 contrast row 6, W-7 case 3, W-8 case 2 and §11 row 6 use the same
    distinction. Ordinary candidates need no wait eligibility; wait-ended candidates use the retired
    selector. No cursor or selection algorithm changes.

- **Round 12 — owner-supplied supplemental adversarial findings**, supplied after the independent
  review and resolved in the same round; **not Claude findings** ([review-11.md](review-11.md)):
  - **K01-O12-01 (P2):** deepest-scalar depth was undefined for empty-container trees. E-6 now gives
    total recursive depth over every E-1 value, with explicit 32/33 empty-array and alternating cases.
  - **K01-O12-02 (P2):** E-6 now bounds every decoded string value and object member name before
    escaping/serialization, with exact 65,536/65,537-name cases. E-7 key ordering is unchanged.
  - **K01-O12-03 (P2):** E-1/E-6 and contract C2 now identify canonical bytes of each E-1
    boundary-value root as the accounting unit. Sibling fields are not summed. The 700 KiB + 700 KiB
    Outcome is not rejected solely for its aggregate size; exactly 1 MiB Event payloads pass size,
    one byte more rejects. No canonical owner imposes a 1 MiB aggregate envelope cap. No wire-size
    guarantee or transport choice is added.

- **Round 12 implementer-discovered issues:** none separate from these seven findings. The broader
  duplicate assertion and retained-input examples were aligned as dependent occurrences of
  K01-R11-01 and K01-R11-04, respectively, rather than left with their old ambiguous wording.

- **No contradiction found *between canonical owners*** on any decision in §1–§10, re-checked
  cumulatively through every round and again in revision 9's full reconstruction of the wait/batch/
  clock protocol as one state machine: each decision restates a canonical owner or narrowly resolves an
  explicitly-flagged open item (004's "Open questions and decision points" section, K0/K1 bullet).
  Nothing here required an owner decision, so no part of this packet is BLOCKED_ARCHITECTURE.

  Before the seven Round-12 corrections recorded above, the accumulated entries comprised: one
  **code-versus-target gap** (the current matcher
  cannot select application input by label) and a second of the same kind added in revision 9 (the
  current Event vocabulary has **no timer kind at all**, `packages/core/src/interaction/events.ts:62`,
  `:68` — K1 adds one as new work); one withdrawn self-inflicted claim; **three contradictions of a
  canonical owner**, all resolved in the Kernel's favour (round 1's Activation-ID inversion, round 7's
  application-input bypass, and round 8's `K01-R8-01` re-entry of that same bypass through B-2); one
  gap against this worksheet's own §4; one over-reach into a K4-owned mechanism; one
  misplaced-normativity defect; one rule left **conditional on a future packet** (`K01-R8-03`); one
  K0-owned semantic case left **undecided** (`K01-R8-04`); one **over-claim** — a validity rule that
  implied a satisfiability guarantee two canonical pages disclaim (`K01-R9-01`); and the internal
  inconsistencies — E-7's ordering profile, the two wait records, the lost wake-before-backlog
  guarantee, the two selector grammars, `B-6`'s conflated acceptance boundaries, the timeout with no
  semantic home, the two readings of wait well-formedness, the eleven gaps revision 9's own
  reconstruction found before committing, and revision 11's stale selection/early-consumption wording.

  **The pattern, and what revision 9 did about it.** Every contradiction this worksheet has had was
  introduced by its own drafting, and most were a *consequence of a correct earlier correction that was
  not carried through to every dependent decision*. Round 7 added the sharper version — making a rule
  **exact** can turn a harmless imprecision into a live defect — and round 8 added the sharpest: a
  corrected rule can be re-introduced in its superseded form by a **neighbouring section that
  paraphrased it**. Revision 9 treats that as structural rather than accidental and changes the
  document's shape to remove the failure mode:

  - **One statement per rule, cited rather than paraphrased.** Eligibility is stated once (W-1) and
    §3 cites it. The wait-ended batch is stated once (§3) and §5 cites it. Registration order is stated
    once (W-2) and §7 cites it. Where revision 8 had the same rule in two voices, revision 9 has one
    voice and a cross-reference.
  - **Every *pair* of ways one state can be entered is specified together, in one table.** §3's
    wait-ended table has all four rows — Event-at-registration, Event-while-waiting,
    deadline-at-registration, deadline-while-waiting — plus the two contrast rows, because each of the
    last four rounds found its defect in the half that was written second.
  **What revision 10 adds to that lesson.** Round 9 consolidated the wait/batch/clock protocol to
  reduce the paraphrase failure mode, and round 9's review confirmed §3's and §5's structure. The one
  defect it left was a **different** kind: not a rule restated in two voices, but a single rule whose
  *name* claimed more than the rule delivered. "One **eligible** wake source" sounded like a structural
  count and read like an eligibility guarantee, and the paragraph that contradicted it was the one
  correctly describing the weaker, true behaviour. Revision 10's response is the same discipline applied
  to vocabulary rather than to placement: a validity rule is now named for what it checks
  (*structurally non-empty wait declaration*), and every statement about whether an Event can actually
  wake an Execution lives in the source-category table and nowhere else. Where the document declines to
  promise something — satisfiability, deadlock freedom — it now says so in the same breath as the rule
  a reader might otherwise over-read.

  - **A defect the reviewer did not name is still a defect.** Revision 9's own adversarial pass, not
    review-08, found all eleven defects listed above — `W₀`+deadline, the missing `B-8`, the W-2 step-1
    ordering, the timeout idempotency rule, the timeout's acceptance boundary, the terminal-race
    caveat, the minimum bound, the undefined truncation rule, the unargued mandatory-member
    availability, the empty-batch question and W-2's commit granularity. They are recorded above as
    implementer-discovered, and every one is fixed in this revision rather than left for a later
    round.

  A fixture author should read §3 and §5 together rather than either alone, and should check any new
  mechanism against kernel.md's Acceptance/atomicity table row by row rather than against "the accepted
  Outcome" as a catch-all.

---

## 14. Explicitly out of scope (left to K1 and later)

- Exact wire codec, database schema, or scheduler implementation (001 K0 exit: "Keep the wire codec/
  store layout replaceable"; repeated at every "Left open" note above).
- Effect admission/settlement mechanics, schema validation, consent binding (K2; §8 only fixes that
  K1 must *refuse*, not implement, Effects).
- Native Driver-specific submit/reattach mechanics (R1).
- Persistent substrate choice and real process-kill proof (K3).
- Child/message/human-response durability (K4).
- Retention windows, operating limits (K5).
- Physical isolation (D1).
- Packaging/release (S1).
- future-plan Q3 (detached/supervisory services): confirmed non-blocking for K0.1 per 010's
  assessment ("No unresolved architecture decision blocks starting K0.1"); not answered here.

---

## Revision history

- **Revision 1**: initial worksheet produced by packet K0.1 (candidate H `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`).
- **Revision 2**: corrected revision 1 per [review-01.md](review-01.md)'s CHANGES
  REQUIRED findings K01-REV-01 through K01-REV-05, disposed in
  [implementation-02.md](implementation-02.md):
  - **K01-REV-01** — §2 ID-3/ID-4 rewritten: a takeover advances the writer epoch under the *same*
    Activation ID rather than minting a new one; a new Activation ID is minted only for a genuinely
    new semantic exchange. Added §2 Decision ID-9's four counterexamples. Updated §11 row 2.
  - **K01-REV-02** — §5 rewritten: withdrew the "Kernel-visible Runtime-local-work wait" framing
    (old W-4) entirely; the target `waitingFor` record is Event-only. Corrected W-3's generation
    scope to wait-created artifacts (timers), not authenticated result Events. Added W-6's four
    counterexamples. Rewrote §12's `REF-3` and §13's second contradiction to match. Updated §3 B-2
    and §11 row 5.
  - **K01-REV-03** — §12 rebuilt: added `LEG-3` (`CREATED`), `LEG-4` (closed `kind` discriminator),
    `REF-4` (mailbox monotonic-cursor consumption), and a `PendingOperation` row (labelled `OOS-1` in
    revision 2; reclassified as `LEG-5` in revision 3);
    corrected `MIG-4` (the `revision` counter is not equivalent to the target `base_progress_revision`
    without redefinition); split `MIG-3`; strengthened `LEG-1`'s citations with the actual
    `ControllerResumption` record. Updated `contract.md`'s K0.1-C3.
  - **K01-REV-04** — §1 E-6 rewritten with concrete semantic limits (units/counting rules stated,
    wire/storage still open); §8 EF-2 corrected (K1's refusal is envelope validation, not a visit to
    a K2-introduced Effect-admission boundary); added EF-3 (naming action-lifecycle.md's four
    dimensions) and EF-4 (named negative cases). Updated `contract.md`'s K0.1-C2/C4 and source table.
    Updated §11 row 4.
  - **K01-REV-05** — this revision's validation evidence is in
    [implementation-02.md](implementation-02.md), run fresh against the corrected payload commit.
- **Revision 3**: corrects revision 2 per [review-02.md](review-02.md)'s CHANGES
  REQUIRED findings K01-R2-01 through K01-R2-06, disposed in
  [implementation-03.md](implementation-03.md):
  - **K01-R2-01** — §1 gained **E-7**, the complete canonical form: output encoding, whitespace,
    literals, code-point key ordering (with the UTF-16 pitfall made explicit), minimal string
    escaping, well-formedness, shortest-round-trip number spelling, and absent-versus-null — plus
    seven deterministic boundary examples with verified byte counts. E-3/E-6 now reference it, and
    only the transport codec and storage layout remain open. `contract.md` K0.1-C2/C4 and the
    non-goals list were reconciled to match.
  - **K01-R2-02** — `PendingOperation` reclassified from an invalid "no label applies" row to
    **`LEG-5`, legacy-only** for the universal abstraction, with the individually reusable facts
    (dispatch-versus-outcome, first-class `unknown`, result-Event correlation, honest null deadline)
    split out as input to K2's records, and the Structured-Memory/confirmation-specific values marked
    as K2's to decide.
  - **K01-R2-03** — W-1 rewritten to state the full target wait shape (a non-empty finite list of
    Event dependency alternatives, a separate declared input-subscription list, one eligibility rule,
    no predicates); added **W-7**'s five deterministic examples; `MIG-5` corrected to **partially
    migratable**; §11 row 5 updated.
  - **K01-R2-04** — revision 2's `REF-2` became **`LIM-1`**, dropping the claim that global store
    serialization prevents overlapping Runtime computation (it does not: `runController` runs after
    the claim transaction closes) and reconciling with K1's explicit in-memory-reference requirement;
    `REF-4` reworded so the cursor is refused *for the K1 reference mailbox* while the existing file
    stays legacy/compatibility material; §13 re-checked, gaining one code-versus-target contradiction
    and one withdrawn claim.
  - **K01-R2-05** — round-2 review recorded in [review-02.md](review-02.md), including the provenance
    correction to round 1's reviewer identity, access method and severities. `review-01.md` is
    preserved unedited.
  - **K01-R2-06** — validation evidence for this revision is committed alongside
    [implementation-03.md](implementation-03.md) as retrievable repository artifacts.
- **Revision 4**: corrects revision 3 per [review-03.md](review-03.md)'s CHANGES
  REQUIRED findings K01-R3-01 through K01-R3-04, disposed in
  [implementation-04.md](implementation-04.md):
  - **K01-R3-01** — §1 E-7's canonical encoding and its standards guidance are made to agree, by the
    review's preferred minimal-standard route: **rule 4 now orders object members by UTF-16 code
    units per RFC 8785 §3.2.3**, replacing revision 3's Unicode-code-point rule and its UTF-8-byte
    implementation recommendation (which, together with the "coincides with RFC 8785" claim, named two
    different byte sequences). The supplementary-plane boundary example and its byte-order explanation
    are updated — the canonical form is now `{"😀":2,"�":1}`, still 18 bytes — and the
    *Relationship to published profiles* note now states accurately that the canonical form follows
    RFC 8785/JCS for property ordering and primitive serialization, that an unmodified JCS
    canonicalizer emits these bytes, and that rules 8–9 are K0.1's own. Rule 7 is pinned to
    ECMA-262 §7.1.12.1 including its "Note 2" enhancement (the reference RFC 8785 §3.2.2.3 makes
    normative), with the Node observations demoted to a cross-check; the `1e-6` → `0.000001` case is
    stated explicitly. E-7 stays an internal-only computation with the transport wire codec
    replaceable, and E-6 gained a note distinguishing its scalar-value length counting from rule 4's
    code-unit comparison. All eight canonical byte counts were recomputed.
  - **K01-R3-02** — §12 now uses exactly K0.1-C3's three labels. Revision 3's "partially migratable"
    `MIG-5` is split into **`MIG-5` (migratable)** — the declarative Event matching primitive and the
    envelope identity fields — and **`REF-5` (refused)** — adoption of the existing single-`wake`
    `ExecutionWait.event` record as the new K1 target wait record. Revision 3's fifth label
    disappears: `LIM-1`'s reference-store analysis is preserved in substance, keeps its ID, and moves
    out of the classification table into a separate
    [reference-implementation-limitations subsection](#reference-implementation-limitations-not-a-legacy-disposition).
    §12's header note and §13's dependent entries are updated. §5's W-1/W-7 target semantics, which
    round 3 accepted, are unchanged.
  - **K01-R3-03** and **K01-R3-04** concern the packet's commit identity, round-4 evidence path and
    historical review metadata rather than this worksheet's content; they are dispositioned in
    [implementation-04.md](implementation-04.md) and [review-03.md](review-03.md).
- **Revision 5**: corrects revision 4 per [review-04.md](review-04.md)'s CHANGES
  REQUIRED findings K01-R4-01 and K01-R4-02, disposed in
  [implementation-05.md](implementation-05.md):
  - **K01-R4-01** — the wait contract is repaired **cumulatively**, so §3 and §5 describe one record.
    **W-1**: dependency alternatives are no longer required to be non-empty; the registration is valid
    iff at least one eligible wake source exists across dependency alternatives **+** declared input
    subscriptions, which makes 001's K0-trace input-only wait expressible; and **any** eligible wake
    now retires the registration and its generation, with the Runtime re-registering what it still
    needs, replacing revision 4's implied per-alternative "satisfied" state. **B-2** selects the
    `WAITING` batch by W-1's eligibility rule alone, not by singular `wake` plus `interleave`.
    **W-5** no longer defines `interleave` as a target Kernel wait field: it is reframed as current
    0.8.x legacy/compatibility semantics, with the surviving principle folded into W-1. **W-7** cases
    1 and 4 are restated under the corrected protocol (`REF-5` for the record shape; correction wake
    expressed through subscriptions and re-registration, with no `interleave`). **W-8** is new: the
    deterministic K0-trace counterexample — typed output, then a wait whose only wake source is the
    `continue` input subscription — with unrelated input queued, the subscribed input waking, and
    completion permitted. **§11 row 5** now covers subscription-only input waits explicitly. **§12**:
    `MIG-5` is narrowed to dependency-alternative matching and no longer claims `eventSatisfiesWake`
    builds both lists (it cannot read `ExternalInputBody.label`), and `REF-5` explicitly covers the
    current `ExecutionWait.event` shape **including its optional legacy `interleave` field**. **§13**
    records the two-wait-records contradiction and its resolution. No controller resumption or
    Runtime-local promise is reintroduced as a Kernel wait (W-4 unchanged).
  - **K01-R4-02** — **PC-1** no longer calls current `ControllerProgress`/`context.control` as a whole
    "fully compatible": form (a)'s example is the **nested `ControllerProgress.progress: JsonObject`
    payload**, the enclosing closed-`kind` wrapper does not migrate unchanged (`LEG-4`), and K1
    compatibility is decided by the pinned Runtime/definition/codec contract (PC-4), not the two-value
    tag. `MIG-3` and `LEG-4` were re-checked against PC-1, 001 K1 and 007 K1.1 so all four state the
    same rule.
- **Revision 6**: corrects revision 5 per [review-05.md](review-05.md)'s CHANGES
  REQUIRED findings K01-R5-01 and K01-R5-02, disposed in
  [implementation-06.md](implementation-06.md):
  - **K01-R5-01** — wake-derived `READY` now preserves the retired wait's eligibility rule through the
    next dispatch. **B-2** gains a third case: ordinary `READY` (bounded acceptance-order batch),
    `READY` from a retired wait's eligible wake (batch drawn only from Events eligible under the
    retired rule, at least one of them, no displacement by older ineligible backlog at any bound), and
    `WAITING` (unchanged). New **`B-6`** defines that wake-triggered readiness: what the accepting
    transaction records — the retired selector, committed as the **recoverable readiness** kernel.md's
    Acceptance/atomicity table and execution-protocol.md's acceptance step 4 already commit with next
    state — its one-exchange lifetime, its recovery property, and explicitly what it is *not* (not a
    revived wait, not a per-alternative satisfied flag, not a new Kernel entity), with storage left
    implementation-owned. **W-1**'s retire-on-wake paragraph and **W-2** now name `B-6`, W-2 recording
    that the `READY` outcome of the atomic check is itself wake-triggered so the result-before-wait
    race is fixed in substance rather than in name. **W-7** cases 4 and 5 and **W-8** case 3 point at
    the rule instead of asserting the batch; new **W-8 case 4** is the load-bearing counterexample at
    batch bound 1. **§11 row 5** now asserts that an older unmatched Event cannot displace the Event
    that woke the wait.
  - **K01-R5-02** — **W-1** states one exact dependency-alternative selector grammar, replacing two
    partial descriptions: three optional fields (exact Event identity, kind or finite kind set,
    correlation) from kernel.md's own dimension list, conjunction within an alternative, at least one
    field supplied so no match-everything alternative, ANY-OF between alternatives, equality-only
    comparisons, no payload selection, and application-input subscriptions kept on their own separate
    path. **`MIG-5`** is reconciled with it: migratable unchanged as the kind/correlation component,
    not the complete matcher when exact Event identity is constrained (an additional ordinary equality
    check, not a new language), with K1 required to reject the match-everything input the current type
    permits, and the existing subscription-label statement retained. **`REF-5`** additionally records
    that the current record has no Event-identity selector field.
  - **§13** gained both internal contradictions and their resolutions; §12's header note records the
    two row refinements. E-7/JCS, the Activation-ID takeover identity, W-4's no-Runtime-local-wait
    rule, the K1 Effect-refusal boundary, `MIG-4`'s revision distinction, the three-label legacy
    vocabulary and the accepted historical-evidence whitespace exception are all untouched.
- **Revision 7**: corrects revision 6 per [review-06.md](review-06.md)'s CHANGES
  REQUIRED findings K01-R6-01 and K01-R6-02, disposed in
  [implementation-07.md](implementation-07.md):
  - **K01-R6-01** — `B-6`'s two creation paths are now stated separately, each at its own
    **authoritative acceptance boundary**, replacing revision 6's "both create wake-triggered readiness
    identically … committed with the accepted Outcome". **Path A** (the eligible Event already exists
    when the Outcome registering the wait is accepted) commits the readiness in the
    Outcome-acceptance boundary. **Path B** (the Execution reached `WAITING` and an eligible Event is
    accepted later) has **no Outcome**: the boundary that accepts the Event commits the mailbox fact
    and the readiness atomically together — creation/input ingress for application input, Effect
    settlement for settlement, and the authoritative fulfillment/routing boundary for child/message
    results, each quoted from kernel.md's Acceptance/atomicity table. Two rules bind every case: never
    accept the Event durably and depend on a later unjournaled wake write, and no later Runtime Outcome
    is needed to make the `READY` state durable. *Recovery* is rewritten per path against
    recovery-and-compatibility.md's crash-window rows (*Input commit before scheduler notification*,
    *Settlement committed before wake*, *Outcome accepted before receipt*, *Dispatch intent before
    send*). *Lifetime* is sharpened: the readiness survives a crash before reservation, is consumed
    when the batch is **durably reserved**, and must **not** re-arm afterwards because the pinned
    dispatch intent already suffices for replay or takeover. The implementation-owned representations
    gain a constraint: a materialized eligible-Event set must be maintained (or the selector
    re-evaluated at reservation) so that **B-2's exact observable selection semantics** survive through
    reservation; a stale snapshot is not conforming. W-1's retire paragraph, W-2, W-7 case 4 and W-8
    cases 1 and 3 now name the applicable path and boundary.
  - **K01-R6-02** — the empty-kind-set rule is **normative in W-1**: the Kind selector is one kind or a
    **non-empty** finite set, and a supplied `[]` is invalid before matching, because the grammar
    expresses absence by not supplying the field. §12's **`MIG-5`** is restated as a pure **encoding
    mapping** carrying no validation rule of its own — legacy `eventKinds: []` means *Kind selector
    absent* ("Empty means 'any Event addressed to me'", `event-envelope.ts:75`), legacy
    `correlationId: null` means *Correlation selector absent* — with five worked cases: `[]`+`null`
    invalid, `[]`+`c1` valid correlation-only, `[child.result]`+`null` valid kind-only,
    `[child.result]`+`c1` valid conjunction, and a target-side `[]` invalid before matching. `REF-5`
    records that the record's sentinel-encoded absence does not carry over either, and §11 row 5 now
    states the non-empty constraint.
  - **§13** gained both round-6 entries and their resolutions. E-7/JCS, the Activation-ID takeover
    identity, W-4's no-Runtime-local-wait rule, the K1 Effect-refusal boundary, `MIG-4`'s revision
    distinction, PC-1/`MIG-3`/`LEG-4`, the three-label legacy vocabulary and the accepted
    historical-evidence whitespace exception are all untouched.
- **Revision 8**: corrected revision 7 per [review-07.md](review-07.md)'s CHANGES
  REQUIRED findings K01-R7-01, K01-R7-02 and K01-R7-03, disposed in
  [implementation-08.md](implementation-08.md):
  - **K01-R7-01** — W-1's eligibility rule is rewritten as an explicit **source-category** rule,
    closing a bypass the exact selector grammar had made reachable: **ordinary application input is
    eligible only through a declared input subscription**, and a dependency alternative matching its
    identity/kind/correlation does not make it eligible; every other Kernel Event is eligible only
    through a dependency alternative. The category is fixed by trusted ingress provenance, not by a
    kind's spelling. The two lists stay separate in both directions — no label becomes a fourth
    selector field. New **W-7 cases 6 and 7** are the deterministic negative and positive pair
    (`kind = external.input` alternative with no subscription → queued, no wake; the same input with a
    matching subscription → wakes), and W-7 case 3's reasoning is restated on the category rule.
    **`MIG-5`** records that `eventSatisfiesWake` is a *matching component*, **not** the target
    eligibility predicate — the caller must enforce the category rule around it, and a legacy
    `WakeCondition` matching `external.input` does not become a target subscription by migration.
    B-2, `B-6` and §11 row 5 now all say "eligible under the retired wait's rule" meaning this rule.
  - **K01-R7-02** — deadline expiry gains the same crash-safe batch semantics as an Event wake. B-2's
    middle case is generalized to "`READY` because a registered wait **ended**", with two species:
    **`B-6`** (Event-triggered, unchanged) and new **`B-7`** (deadline-triggered), whose accepting
    transaction retires the generation, records the timeout observation, sets `READY` and commits
    recoverable readiness — and whose next batch **must** contain that observation, with ineligible
    backlog unable to displace it at any bound. New **W-9** fixes the observation's **logical
    identity**, **wait-generation correlation** and **mandatory delivery**, leaves its wire spelling to
    K1.3, and preserves W-3 (a superseded-generation timer is a no-op) and CL-2 (a timeout and a later
    correlated result are both accepted facts). W-9's three deterministic cases cover bound-1
    displacement, stale-timer fencing, and timeout-then-result before reservation. §11 row 5 now covers
    both ways a wait can end.
  - **K01-R7-03** — `B-6` path B's single child/message row is split, and a new note fixes the
    invariant: **obligation creation and destination Event acceptance may be two distinct accepted
    facts**. A child's terminal boundary may commit the terminal result plus a durable
    Kernel-to-parent routing obligation without accepting any parent mailbox Event, and the parent is
    **not** `B-6`-ready until fulfilment actually accepts that Event; recovery replays or idempotently
    fulfils the obligation rather than fabricating readiness; a single-transaction profile stays
    conforming but is not required. K0.1 states only the cross-cutting invariant — never fabricate
    destination readiness before the destination Event exists — and leaves the mechanism to K4.
  - **§13** gained all three entries and their resolutions. E-7/JCS, the Activation-ID takeover
    identity, W-4, the K1 Effect-refusal boundary, `MIG-4`, PC-1/`MIG-3`/`LEG-4`, the three-label
    legacy vocabulary, `REF-5` and the accepted historical-evidence whitespace exception are untouched.
- **Revision 9**: a **consolidation revision**. It corrected revision 8 per
  [review-08.md](review-08.md)'s CHANGES REQUIRED findings K01-R8-01 through K01-R8-04, disposed in
  [implementation-09.md](implementation-09.md), and it additionally rewrites §3 and §5 so that the
  wait / batch / clock protocol is one state machine stated once. Prior wording that revisions 1–8
  superseded is no longer reproduced in the live text; every earlier round's reasoning remains
  available, unedited, in `review-01.md`–`review-08.md` and `implementation-01.md`–`implementation-08.md`.
  - **K01-R8-01** — §3 no longer states an eligibility rule. **B-2** now has two selection cases plus
    the statement that a `WAITING` Execution is not dispatched and therefore selects nothing;
    eligibility while `WAITING` is W-1's, cited rather than restated, replacing the superseded
    dependency-alternative-**or**-subscription paraphrase that had reopened the application-input
    bypass in the one section where selection actually happens. A new note records where
    execution-protocol.md's `WAITING`-side sentence lands under W-1's retire-on-wake rule. Every other
    §3 reference to eligibility is a citation of W-1, not a restatement.
  - **K01-R8-02** — **W-9** decides the timeout observation's semantic home: it **is a Kernel Event**,
    with a stable identity, a destination, a semantic timeout class, exact wait-generation correlation
    and trusted Kernel timer/deadline provenance; exactly one exists per generation and duplicate timer
    delivery is idempotent. **W-1**'s category table gains a third row placing it outside the matching
    rules entirely (never eligible through an alternative or a subscription; an alternative naming a
    timeout kind is inert). **§3**'s wait-ended batch rule states the batch as a **union** of the
    species' mandatory member and the Events eligible under the retired rule, which is what makes a
    **subscription-only wait with a deadline** answerable — the case revision 8 answered two ways
    (new **W-8 case 6**). `B-1` records that every batch member is an Event and that the bound is ≥ 1.
    W-9 also names which boundary accepts a Kernel-minted timeout, as a boundary *role*, adding no
    seventh boundary to §2 ID-6/ID-7 and issuing no external receipt. Only the wire token, TypeScript
    discriminant, encoded schema, storage layout and timer mechanism stay implementation-owned.
  - **K01-R8-03** — **W-1**'s K1.3 scope note is removed. The K0/K1 source-category rule is closed and
    unconditional, with an explicit demonstration that nothing canonical is lost (a correction is
    application input → subscription; a peer question is a `peer.message` → dependency alternative),
    and any richer K4 clarification/peer-subscription semantics is named as a **versioned extension of
    the interaction contract**, never a reinterpretation of this rule and never a second path for
    ordinary application input.
  - **K01-R8-04** — **W-2** is rewritten as one ordered registration algorithm inside one transaction:
    acknowledge this Outcome's own batch; check already-accepted unacknowledged Events; evaluate an
    already-due deadline against one accepted-time observation (due is non-strict); otherwise persist
    `WAITING`. An already-due deadline therefore **collapses inside the Outcome-acceptance boundary**
    (`B-7` **path A**) and durable `WAITING` is never persisted for that generation; the Event branch
    wins when both apply, so no timeout is minted for a wait an accepted Event had already ended. The
    refused alternative and the reason execution-protocol.md's "otherwise it is WAITING" is not
    contradicted are both stated in W-2. **CL-3** records that the wait clock is read at exactly two
    points.
  - **Implementer-discovered in the same round** (§13; not reviewer findings): new **`B-8`** (readiness
    is created only by a boundary that retires a live wait) and §3's contrast row 6; **W-2 step 1**'s
    ordering, so a wait cannot be woken by the batch the Outcome registering it just acknowledged;
    W-9's exactly-one/idempotency rules; W-9's acceptance-boundary role; the terminal-race caveat on
    mandatory delivery; `B-1`'s minimum bound; §3's truncation rule, mandatory-member-availability
    argument and empty-batch rule; W-2's "ordered evaluation, one transaction" statement; and new
    **W-9 cases 4–6** (result-then-deadline, already-due-at-registration, duplicate timer delivery).
    Eleven in total, listed individually in §13.
  - **Structure.** `B-6` and `B-7` keep their IDs and become the two *species* of one **wait-ended
    readiness**; their shared lifetime, consumption, recovery and representation rules are stated once
    for both. §11 row 5 is restructured into seven separately observable assertions (a)–(g) instead of
    one paragraph that restated §3 and §5. §12's `MIG-5` records that the matcher performs no part of
    timeout handling. E-7/JCS, the Activation-ID takeover identity, W-4, the K1 Effect-refusal
    boundary, `MIG-4`, PC-1/`MIG-3`/`LEG-4`, `REF-3`/`REF-4`/`REF-5`, `LEG-5`, `LIM-1`, the three-label
    legacy vocabulary and the accepted historical-evidence whitespace exception are unchanged.
- **Revision 10**: a **narrow correction** of revision 9 per
  [review-09.md](review-09.md)'s CHANGES REQUIRED finding K01-R9-01, disposed in
  [implementation-10.md](implementation-10.md). Revision 9's wait / batch / clock state machine is
  otherwise untouched.
  - **K01-R9-01** — **W-1**'s registration well-formedness is restated as a purely **structural** test
    and renamed accordingly: a *structurally non-empty wait declaration*, replacing "one **eligible**
    wake source across the two lists combined", which read as an eligibility guarantee and contradicted
    the selector-grammar paragraph's intentionally permitted **inert** alternatives. Three rules now
    define it (structural non-emptiness — either list may be empty, not both; every present alternative
    valid under the selector grammar; every present subscription structurally valid), and three
    consequences are explicit: an inert alternative **still counts** toward non-emptiness; a well-formed
    wait may therefore never be woken and may remain `WAITING` until a deadline or cancellation ends it;
    and **no intent or satisfiability checker is added**, matching kernel.md's and
    execution-protocol.md's refusal to promise general deadlock prevention. A deadline still does not
    rescue a record with both lists literally empty. Four deterministic cases are added to W-1. The
    **selector grammar**'s match-everything bullet now states that its rejection is structural and not a
    judgement about dischargeability, and its inert-alternative bullet states that such an alternative
    still satisfies structural non-emptiness. **W-8**'s registration sentence uses the new terminology,
    and its *What this rules out* becomes *What this makes unnecessary — and what it deliberately does
    not police*: the target removes the **necessity** of a fake dependency, not a Runtime's ability to
    submit one, and the Kernel proves structure rather than satisfiability. **§11 row 5(a)** and **§13**
    are updated to match, and §13's round-4 entry is annotated with the rename without rewriting its
    record.
  - **Unchanged and re-verified:** the timeout Event's semantic home and its exactly-one/idempotency
    rules (W-9); `B-6`/`B-7`'s two paths and the wait-ended batch rule; **W-2**'s ordered
    one-transaction registration algorithm, including the already-due-deadline collapse; timeout/result
    ordering (W-9 cases 3–4); the cancellation-before-reservation terminal disposition; **`B-8`**;
    W-1's source-category eligibility rule; the K4 versioned peer-subscription extension; ID-3/ID-4's
    Activation-ID and writer-epoch identity; E-7/JCS; the K1 Effect-refusal boundary; PC-1–PC-5 and
    `MIG-3`/`LEG-4`; the three-label legacy vocabulary; `MIG-5` and `REF-5`; and the owner-approved
    historical-evidence whitespace exception.

- **Revision 11**: corrects [review-10.md](review-10.md)'s CHANGES REQUIRED finding
  **K01-R10-01** and the separately **implementer-discovered K01-I11-01** (§13).
  - W-1 and §11 row 5(b)/(e) now cite retirement/readiness (`B-6`/`B-7`) and selection once `READY`
    (`B-2`); W-7 case 7's selection citation also points to B-2. No batch is selected while `WAITING`.
  - W-6 case 4 and its W-9 case 3 cross-reference distinguish finding an early Event at registration
    from acknowledging it through an accepted Outcome (B-3).
  - The consolidated state machine, structural well-formedness, source categories, selector grammar,
    timeout semantics, W-2 algorithm, generation fencing, cancellation and backlog guarantees remain
    unchanged, as do all other protocol decisions and the contract's acceptance criteria.

- **Revision 12** (this document): corrections to H11; the round-12 report accompanies H12.
  - **Claude K01-R11-01:** CX-1/CX-2 fix request acceptance as the cancellation ordering point;
    CX-6 defines full losing-Outcome rejection and exact recorded-rejection replay. OA-3–OA-5,
    B-3/B-5, §11 and M-1 align; MIG-1 preserves only reusable checks, REF-6 refuses losing progress.
  - **Claude K01-R11-02–04:** B-8 includes registration-transaction retirement, ID-6 points to ID-7,
    B-4 and dependent retained-input examples distinguish ordinary from wait-ended candidates.
  - **Owner supplemental K01-O12-01–03:** E-6 defines total depth including empty containers, decoded
    string limits including member names, and per-E-1-root canonical size. E-1 and contract C2 agree;
    exact depth/string/size cases and the aggregate-Outcome counterexample are explicit.
  - §13 records the separate provenance of all seven findings. No separate implementer-discovered
    defect. E-7/JCS, finite limit numbers, W-1/W-2/W-3, B-6/B-7, Runtime-local work, takeover identity,
    Effect refusal, progress compatibility, MIG-5/REF-5 and historical whitespace policy are preserved.
    No runtime behavior shipped, no lifecycle state added, no K0.2 work or acceptance claimed.
