# Values, codecs and canonicalization

These definitions and rules own logical value equality. They preserve accepted K0.1
E-1–E-7. Transport framing and the native checkpoint format remain separate choices.

## Codec

A **codec** encodes and decodes values. Three uses must be distinguished:

| Qualified name | Owner | What it does |
|---|---|---|
| Transport codec | Protocol adapter | Turns an envelope into wire bytes and back |
| Progress codec | Runtime/Driver | Interprets saved continuation with compatible code |
| Canonical value encoding | Kernel protocol | Produces fixed bytes for logical equality and semantic size limits |

Changing pretty-printing on the wire need not change logical equality. Changing how a
checkpoint is interpreted requires a compatible progress codec. Neither authorizes a
change to the canonical comparison rules below.

## Boundary value and root

A **boundary value** is `null`, boolean, finite IEEE-754 binary64 number, well-formed
Unicode string, or an array/object recursively containing these. A **boundary-value
root** is each individual Activation/Outcome value field governed by this contract,
each Effect proposal value, each Event payload, or another explicitly covered logical
value. The enclosing envelope is not an extra aggregate size root.

Reject non-finite numbers, unsupported values and lone Unicode surrogates; do not
repair them to null, strings or replacement characters. Duplicate JSON object keys
are rejected at decode time, before parsing could erase the duplication. A schema
may constrain values further. Small values cross directly; oversized data uses
application-owned [artifact references](state.md#artifact-reference).

## Canonical form

**Canonicalization** computes one fixed representation of an already valid logical
value. It serves equality and size measurement, not authentication or semantic repair.
Two values are equal exactly when their canonical bytes are equal. A hash can assist
comparison or storage naming but never proves permission, consent or authenticity.

The accepted encoding follows RFC 8785/JCS, with these complete byte-affecting rules:

1. UTF-8 JSON, no byte-order mark and no insignificant whitespace.
2. Literal spellings are `null`, `true`, `false`.
3. Object keys sort lexicographically as unsigned UTF-16 code-unit sequences, independent
   of locale. Array order stays unchanged and remains semantic.
4. Strings escape quote and backslash, and C0 controls U+0000–U+001F. Use `\b`, `\t`,
   `\n`, `\f`, `\r` for their respective controls and lowercase `\u00xx` otherwise.
   Emit `/` and all other Unicode scalar values directly as UTF-8.
5. Numbers use ECMA-262 §7.1.12.1 including Note 2's shortest round-trip conversion,
   now named `Number::toString`, as adopted by RFC 8785 §3.2.2.3. That referenced
   algorithm governs number spelling. `-0` becomes `0`; `1.0` becomes `1`;
   `1e21` becomes `1e+21`; `1e-6` becomes `0.000001`; `1e-7` stays `1e-7`.
6. Absent optional fields differ from explicit null unless the schema explicitly
   merges those meanings. An absent member is not emitted.

RFC 8785 governs the adopted serialization/property-ordering rules; disagreement with
that reference is a documentation defect, not an ArrokothI variant. Absent/null semantics
and the use of bytes for equality/size are ArrokothI rules, not additional claims about JCS.

Use an unmodified conforming JCS implementation rather than an almost-equivalent
serializer. Its input validation and the limits below still need enforcement. No
transport is required to emit canonical bytes.

For example, `{"b":2,"a":1}` equals `{"a":1,"b":2}`; `[1,2]` differs from `[2,1]`;
`{}` differs from `{"answer":null}`. Key ordering uses UTF-16 units, while the string
length bound below counts Unicode scalar values. Those are deliberately different units.

## Fixed semantic limits

| Limit | Exact unit | Maximum |
|---|---|---|
| Decoded string or object member name | Unicode scalar values per string/name | 65,536 |
| Array/object entries | Direct children of each container | 4,096 |
| Container depth | Recursive depth per root | 32 |
| Canonical size | Canonical UTF-8 bytes of each root independently | 1,048,576 |

A scalar has depth 0; an empty container has depth 1; a nonempty container has depth
`1 + max(child depth)`. Object names add no level. An empty array wrapped in 31 arrays
has depth 32 and passes; one more wrapper fails. All four bounds apply together.
Values exactly at a limit pass that limit; one unit above is rejected before acceptance.

Two sibling roots of 700 KiB each are not rejected solely because their envelope
exceeds 1 MiB. No sum of roots or transport-byte guarantee is implied. Deployment may
impose tighter transport limits, but cannot silently redefine these semantic limits.
Changing them requires an explicit versioned protocol amendment.

## Collection identity is a different comparison

A declared **collection-valued relation**, such as a set of package export subpaths in
the ownership inventory, compares cardinality and exact members while allowing reordering.
It is not an arbitrary boundary-value array: array order above remains meaningful.
One member `"a,b"` is different from two members `"a"` and `"b"`, even when joining them
would print the same text. Documented duplicate members are rejected, not collapsed.
See [structural evidence](../mechanisms/evidence.md#structural-evidence) for K1.0's use.
