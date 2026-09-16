# Values, codecs and canonicalization

These definitions and rules own logical value equality. They preserve accepted K0.1 E-1–E-7. Transport framing and the native checkpoint format remain separate choices.

The page moves from the general to the exact. It first separates the three jobs that all get called "encoding", then says which values the protocol governs at all, how the in-process binding captures them, how equality between two of them is decided byte for byte, what sizes are permitted, and finally what this page deliberately does not compare.

## Codec

A **codec** encodes and decodes values. Three different jobs are all casually called "serialization", and the confusion between them is the reason this section exists. Keep them distinct:

| Qualified name | Owner | What it does |
|---|---|---|
| Transport codec | Protocol adapter | Turns an envelope into wire bytes and back |
| Progress codec | Runtime/Driver | Interprets saved continuation with compatible code |
| Canonical value encoding | Kernel protocol | Produces fixed bytes for logical equality and semantic size limits |

Changing pretty-printing on the wire need not change logical equality. Changing how a checkpoint is interpreted requires a compatible progress codec. Neither authorizes a change to the canonical comparison rules below.

Each answers a different question, and conflating them breaks a different guarantee. If wire bytes were used for equality, a proxy that reformats JSON would turn a benign duplicate request into a "conflicting content" refusal. If canonical bytes were treated as the wire format, every transport would be forced to emit JCS, which no transport is required to do. And if the Kernel tried to read progress with anything but the Runtime's own codec, it would be interpreting continuation data whose meaning it does not own. The rest of this page is about the third column only.

## Boundary value and root

A **boundary value** is `null`, boolean, finite IEEE-754 binary64 number, well-formed Unicode string, or an array/object recursively containing these. A **boundary-value root** is each individual Activation/Outcome value field governed by this contract, each Effect proposal value, each Event payload, or another explicitly covered logical value. The enclosing envelope is not an extra aggregate size root.

Reject non-finite numbers, unsupported values and lone Unicode surrogates; do not repair them to null, strings or replacement characters. Duplicate JSON object keys are rejected at decode time, before parsing could erase the duplication. A schema may constrain values further. Small values cross directly; oversized data uses application-owned [artifact references](state.md#artifact-reference).

## In-process value capture

The in-process TypeScript binding captures caller-owned values into one coherent immutable snapshot. Validation, canonical bytes, size measurement, retained content, inspection and Activation input derive from that same snapshot; later reads of the caller's object cannot select a different accepted value. For example, accepting `{count: 1}` and then changing the caller's object to `{count: 2}` leaves the accepted content and its equality bytes describing `1`.

In this binding, objects have the ordinary object prototype or a null prototype and own enumerable string-keyed data members; arrays have the ordinary array prototype and dense own data positions within their observed length. Unsupported forms, accessors, missing array positions, extra array members, symbol-keyed members, non-enumerable object members, cycles and present `undefined` values are refused rather than silently dropped. A member's own data descriptor and its ordinary read must agree; inconsistent or uninspectable structure is refused rather than repaired. These representation rules do not prescribe a wire format or replace the decoder's duplicate-key rejection.

Canonicalization uses the unmodified approved JCS implementation on data derived solely from the snapshot. Host state consulted during that call must not change its bytes; if the binding cannot establish the required serialization environment it refuses the value. The TypeScript implementation's temporary serializer environment is restored after the call. These are value-acceptance guarantees, not containment of arbitrary same-process code; [physical enforcement](../mechanisms/resources.md#containment-claims) has a separate owner. Request-envelope own-field observation is distinct from boundary-value capture: in the implemented coordinator, an inherited-only request field reads as missing, while an own accessor may be observed by the envelope boundary.

## Canonical form

**Canonicalization** computes one fixed representation of an already valid logical value. It serves equality and size measurement, not authentication or semantic repair. Two values are equal exactly when their canonical bytes are equal. A hash can assist comparison or storage naming but never proves permission, consent or authenticity.

The accepted encoding follows RFC 8785/JCS, under these byte-level rules:

1. UTF-8 JSON, no byte-order mark and no insignificant whitespace.
2. Literal spellings are `null`, `true`, `false`.
3. Object keys sort lexicographically as unsigned UTF-16 code-unit sequences, independent of locale. Array order stays unchanged and remains semantic.
4. Strings escape quote and backslash, and C0 controls U+0000–U+001F. Use `\b`, `\t`, `\n`, `\f`, `\r` for their respective controls and lowercase `\u00xx` otherwise. Emit `/` and all other Unicode scalar values directly as UTF-8.
5. Numbers use ECMA-262 §7.1.12.1 including Note 2's shortest round-trip conversion, now named `Number::toString`, as adopted by RFC 8785 §3.2.2.3. That referenced algorithm governs number spelling. `-0` becomes `0`; `1.0` becomes `1`; `1e21` becomes `1e+21`; `1e-6` becomes `0.000001`; `1e-7` stays `1e-7`.
6. Absent optional fields differ from explicit null unless the schema explicitly merges those meanings. An absent member is not emitted.

RFC 8785 governs the adopted serialization/property-ordering rules; disagreement with that reference is a documentation defect, not an ArrokothI variant. Absent/null semantics and the use of bytes for equality/size are ArrokothI rules, not additional claims about JCS.

Use an unmodified conforming JCS implementation rather than an almost-equivalent serializer. Its input validation and the limits below still need enforcement. No transport is required to emit canonical bytes.

For example, `{"b":2,"a":1}` equals `{"a":1,"b":2}`; `[1,2]` differs from `[2,1]`; `{}` differs from `{"answer":null}`. Key ordering uses UTF-16 units, while the string length bound below counts Unicode scalar values. Those are deliberately different units.

## Fixed semantic limits

| Limit | Exact unit | Maximum |
|---|---|---|
| Decoded string or object member name | Unicode scalar values per string/name | 65,536 |
| Array/object entries | Direct children of each container | 4,096 |
| Container depth | Recursive depth per root | 32 |
| Canonical size | Canonical UTF-8 bytes of each root independently | 1,048,576 |

A scalar has depth 0; an empty container has depth 1; a nonempty container has depth `1 + max(child depth)`. Object names add no level. An empty array wrapped in 31 arrays has depth 32 and passes; one more wrapper fails. All four bounds apply together. Values exactly at a limit pass that limit; one unit above is rejected before acceptance.

Two sibling roots of 700 KiB each are not rejected solely because their envelope exceeds 1 MiB. No sum of roots or transport-byte guarantee is implied. Deployment may impose tighter transport limits, but cannot silently redefine these semantic limits. Changing them requires an explicit versioned protocol amendment.

## What these rules do not cover

The rules above compare **boundary values**: the protocol's arrays and objects, where `[1,2]` and `[2,1]` are different values. Other things in this repository are compared other ways. A schema may declare a field to be a set, in which case membership matters and order does not; that is a property of that schema, not a second equality rule here. Comparing such a field by its printed text rather than its members is a known defect — see [structural evidence rules](../../docs/development/015-structural-evidence-rules.md#comparing-a-set-is-not-comparing-a-string).
