# Values, codecs and canonicalization

Every page before this one leaned on this one without stopping to say so. [Identity](identity.md#request-key-and-input-id) answers a repeated request from the recorded decision when the content is *the same*. [Activations](core.md#activation) carry *bounded* values. [Progress](state.md#progress) is pinned to the *version of its codec*. [Exact consent](actions.md#exact-consent) binds *validated arguments*. Each time, exactness was postponed. This page settles it. It says what counts as a value in the protocol, when two values are the same, how large a value may be, and which of several different things called "encoding" is meant.

The [reading path](README.md#reading-path) puts this page last on purpose. You can follow how an Execution is coordinated without it. It becomes necessary when a question turns exact: is this retry faithful, or a conflict? Why was an Outcome refused when nothing in it looked wrong? Could two conforming implementations disagree about whether two requests carried the same content? They cannot, and most of this page explains why.

## A first example

The application asks for the weekly report again, as on the [identity page](identity.md#a-first-example), with the creation key `report-17`. This time look at the content of the request rather than its key. The initial input is:

```json
{"title":"Weekly report","week":37,"sections":["hiring","budget"],"reviewer":null}
```

The response is lost, and the application retries under the same key. The retry takes a different route. It passes through the application's HTTP gateway, which parses JSON and writes it out again in its own style:

```json
{
  "reviewer": null,
  "sections": [ "hiring", "budget" ],
  "title": "Weekly report",
  "week": 37.0
}
```

Not one byte lines up with the first request. The keys are in a different order, there is whitespace everywhere, and `37` has become `37.0`. Yet the Kernel answers the retry from the decision it already made, and exactly one Execution exists. The two requests carry the same value, spelled two ways. Before comparing anything, the Kernel reduces each value to one fixed byte sequence, its **canonical form**, and the two canonical forms are identical.

Now change the story twice, and watch the same comparison say no.

- **A reordered list.** Suppose the retry were rebuilt by client code that sorts every array it touches, so `sections` arrives as `["budget","hiring"]`. That is a different value. The order of an array is part of what it says, and for this report it is the order of the sections. The same key with different content is a [conflict](identity.md#request-key-and-input-id): nothing new is created, and nothing is quietly updated.
- **A dropped null.** Suppose the retry passed through a library that omits null fields, so `"reviewer": null` vanished. That is also a different value. "No reviewer" and "reviewer not mentioned" can mean different things. Unless the request's schema says it treats them alike, the protocol keeps them apart. Again, a conflict.

Later in the week, the report's Agent proposes an [Outcome](core.md#outcome) whose progress includes the full text of the board minutes it retrieved: about three megabytes. The Kernel rejects the Outcome, and since an Outcome is accepted whole or not at all, nothing in it is accepted. Nothing is trimmed to fit, either. The Agent tries again with the minutes left in the document store and an [artifact reference](state.md#artifact-reference) in its progress, and the Outcome is accepted. Had the progress been 700 KiB and the Outcome's emissions another 700 KiB, that would have been accepted too: each value is measured on its own, and their sum is nobody's limit.

Three different encodings touched this report, and it matters which is which:

- **On the wire.** The gateway wrote JSON its own way. That is a transport codec, and it may spell values however it likes.
- **Inside the Runtime.** The Agent keeps its continuation in a format of its own choosing. That is a progress codec, and only the Agent and its Driver can read it.
- **At the Kernel.** The Kernel computed canonical bytes to decide sameness and size. That is the canonical value encoding, and it is fixed exactly, down to the byte.

The rest of the page takes those in turn. [Codec](#codec) separates the three encodings. [Boundary value and root](#boundary-value-and-root) says which values the protocol governs. [Canonical form](#canonical-form) says when two values are the same, and [fixed semantic limits](#fixed-semantic-limits) says how large one may be. [In-process value capture](#in-process-value-capture) gives the extra obligations of one particular binding, and [the last section](#what-these-rules-do-not-cover) marks where these rules stop.

## Codec

A **codec** turns values into bytes and bytes back into values. The word gets used for three different jobs, and each job has a different owner and a different reason to change. Qualify the word every time:

| Qualified name | Owner | Job | What it answers |
|---|---|---|---|
| **Transport codec** | The protocol adapter | Carries an envelope as wire bytes and reads it back | How does this travel? |
| **Progress codec** | The Runtime or its Driver | Stores saved continuation and reads it back for compatible code | Can this work be picked up again? |
| **Canonical value encoding** | The Kernel protocol | Produces one fixed byte sequence per logical value | Are these the same, and how large is this? |

These three can change independently, and that independence is the point of naming them apart.

- **Changing the transport codec** changes how values travel, and nothing else. A deployment can move from JSON text to a binary envelope, add compression, or pretty-print its logs, and every value that decodes to the same logical value stays equal to what it was. The report's gateway could re-spell every request it forwards, and no retry would ever turn into a conflict.
- **Changing the progress codec** changes whether saved continuation can be read. That is why progress is [pinned to the codec version](state.md#progress) that wrote it, and why a change needs a [compatibility check](../mechanisms/recovery.md#compatibility-and-migration) before restored progress runs. The Kernel records which version was used. It never uses that version itself, because it never needs to know what the progress means. The [Runtime contract](core.md#runtime-contract) is a further, separate pin: the codec turns stored bytes into a value, and the contract says what that value means for resuming.
- **The canonical value encoding** changes only through an explicit, versioned amendment to the protocol. Neither of the other two may alter it.

It helps to see what would break if any two were merged.

- **Wire bytes used for equality.** The report's gateway would turn a faithful retry into a conflict, simply by reformatting it.
- **Canonical bytes required on the wire.** Every transport would have to emit one exact spelling. No transport is required to.
- **The Kernel reading progress with its own encoding.** The Kernel would be interpreting continuation it does not own. Progress belongs to the Runtime, and the Kernel only holds it.

One consequence is easy to miss. An inline progress value takes part in two of these encodings at once. The Kernel canonicalizes it to measure it and to compare Outcomes, while the Runtime's progress codec is what gives it meaning. The Kernel handles the bytes and never learns the meaning. [Progress](state.md#progress) says why that split is safe.

The transport codec is deliberately left open. Wire format, framing and compression are choices for each implementation, and so are the storage layout and engine that hold accepted values. None of them affects the rules below. The rest of this page is about the third row of the table only.

## Boundary value and root

Not every piece of data in a running system is the protocol's business. A model's context window, a workflow's local variables and the bytes of a checkpoint all live inside the Runtime. What the protocol governs is the data that crosses between the Kernel and the parties it talks to. Those are the values that can be compared, recorded, retried and inspected. Each such value is a **boundary value**, and it has exactly one of these forms:

- `null`;
- a boolean;
- a finite number, as an IEEE-754 binary64 value;
- a string of well-formed Unicode;
- an array or an object whose members are, recursively, boundary values.

In other words, JSON's data model, with every ambiguous corner closed. That is enough to express configuration, arguments, progress, emissions and the payload of an Event, in a shape that ordinary transports and languages already carry.

A **boundary-value root** is one whole value that the rules are applied to as a unit. The roots are:

- each individual value field of an Activation or an Outcome governed by this contract;
- each value in an Effect proposal;
- each Event payload;
- any other logical value the protocol explicitly brings under these rules.

The envelope around them is not a root. An Outcome is not one big value to be measured as a whole. It is a container of separate roots, each measured on its own, which is why the report's two 700 KiB fields passed. The envelope's own metadata adds nothing to the size of the roots it carries.

Three things are refused at this boundary, and all three are refused rather than repaired:

- **A number that is not finite.** `NaN`, `Infinity` and `-Infinity` are refused. They are not turned into `null`, and not into a string.
- **A string that is not well-formed Unicode.** A lone surrogate has no UTF-8 encoding. It is refused, not replaced with U+FFFD.
- **Anything outside the forms above.** Dates, byte arrays, functions and anything else a language might hand over are refused. None is coerced into something that happens to fit.

The refusals come before any identity or equality is computed. The reason for refusing rather than repairing is that a repair makes a decision on the caller's behalf. If `NaN` became `null`, a request carrying `NaN` would compare equal to one carrying `null`. Two requests that meant different things would then be treated as the same request, and the caller would never find out.

**Duplicate object keys** are a special case, because they exist only on the wire. Text like `{"a":1,"a":2}` can be written down, but no decoded object can hold two members named `a`, so a parser has to pick one and quietly discard the other. The protocol does not let it choose. A decoder rejects duplicate keys while it is decoding, before parsing has a chance to erase them. Every rule that follows can then assume a decoded value with nothing hidden in it.

A schema may constrain a value further: required fields, a numeric range, a string pattern. Those constraints narrow what a particular operation or payload accepts. They never widen what counts as a boundary value.

Data that is too large to cross inline is not squeezed across. It stays in an application-owned store, and a [reference](state.md#artifact-reference) crosses instead. That is what the report's Agent did with the board minutes. The [size limit](#fixed-semantic-limits) below is the exact line between a value that may cross inline and one that must be named instead.

## Canonical form

**Canonicalization** turns a valid value into one fixed sequence of bytes. It serves exactly two purposes: deciding whether two values are equal, and measuring how large a value is. It is not a repair step. It runs only on a value that has already passed the boundary rules above, so it never has to decide what an invalid value "meant".

The central rule is short. **Two values are equal exactly when their canonical bytes are equal.** Everything the protocol calls "the same content" means this: a retried create request, a repeated input, a resubmitted Outcome, the arguments a person approved. However the values travelled, the comparison is made on canonical bytes.

A **hash** of those bytes can make a comparison cheaper or give stored content a name. A hash can also notice an accidental mismatch. It proves nothing else. A matching hash is not evidence of who sent something, of permission, or of consent. If the report's gateway logged a SHA-256 of every request, those digests would be handy for spotting a corrupted retry. They could never stand in for the editor's approval of a publication.

### The rules

The canonical form follows [RFC 8785](https://www.rfc-editor.org/rfc/rfc8785), the JSON Canonicalization Scheme (JCS). Six rules fix every byte:

1. **Encoding.** UTF-8 JSON text, with no byte-order mark and no whitespace outside strings.
2. **Literals.** Exactly `null`, `true` and `false`.
3. **Order.** Object members are sorted by key. Keys are compared as sequences of UTF-16 code units, each treated as an unsigned 16-bit number, whatever the locale. Array elements keep their order, because array order is meaningful.
4. **Strings.**
   - Escaped: `"`, `\`, and the control characters U+0000 to U+001F. Five controls use their short forms, `\b`, `\t`, `\n`, `\f` and `\r`. Every other control is written `\u00xx`, with lowercase hex digits.
   - Not escaped: everything else, including `/`. It is written directly, as UTF-8.
5. **Numbers.** Spelled by the shortest round-trip conversion of ECMA-262 §7.1.12.1 with its Note 2, the operation current editions call `Number::toString`. RFC 8785 §3.2.2.3 adopts the same algorithm. The algorithm, not any summary of it, decides the spelling.
6. **Absent and null.** A member that is absent is not written at all. A member present with the value `null` is written as `null`. So the two are different values, unless a schema explicitly declares that it treats them as one.

Rules 1 to 5 are JCS, adopted rather than reinterpreted. If this page and RFC 8785 ever seem to disagree, this page has a defect; ArrokothI has no variant of JCS. Rule 6 and the use of canonical bytes for equality and size are ArrokothI's own rules. They are not claims about what JCS says.

Use an unmodified, conforming JCS implementation, not a serializer that is almost the same. "Almost" is exactly where two implementations stop agreeing on identity. A JCS library does not do the whole job, though. The boundary checks and the size limits still have to be enforced around it.

### The rules at work

**Order.** `{"b":2,"a":1}` and `{"a":1,"b":2}` are one value, with the canonical form `{"a":1,"b":2}`. `[1,2]` and `[2,1]` are two values. Object members are sorted, and array elements are not.

The key comparison uses UTF-16 code units, and the choice shows up with characters outside the Basic Multilingual Plane. Take an object with two keys, U+FFFD `�` and U+1F600 `😀`. By code point, U+FFFD is smaller, so a sort by code point or by UTF-8 bytes puts `�` first. In UTF-16, `😀` is the pair of code units `D83D DE00`, and `D83D` is smaller than `FFFD`, so the canonical form puts `😀` first:

```json
{"😀":2,"�":1}
```

In JavaScript, the default string comparison already works on UTF-16 code units, so ordinary sorting gets this right. In a language whose strings compare by code point or by UTF-8 bytes, each key has to be converted to UTF-16 before comparison. Otherwise that implementation computes a different identity for the same value, and a faithful retry becomes a conflict.

**Strings.** A string keeps its characters and loses only optional escapes. `"A"` and `"A"` are the same one-character string, and the canonical form writes `A`. `"é"` and a raw `é` are the same string, and the canonical form writes the raw UTF-8 bytes. A tab is written `\t`, and U+001F is written `\u001f`.

**Numbers.** A number is a binary64 value, so every spelling that decodes to the same binary64 value is the same number:

| Arrives as | Canonical |
|---|---|
| `-0` | `0` |
| `1.0`, `1e0` | `1` |
| `1e20` | `100000000000000000000` |
| `1e21` | `1e+21` |
| `1e-6` | `0.000001` |
| `1e-7` | `1e-7` |

The `+` in `1e+21` is part of the canonical bytes. It is easy to tidy away, and dropping it would make two implementations disagree about both identity and size.

The same fact cuts the other way. A decimal spelling that carries more precision than binary64 can hold does not survive as written: if it decodes at all, what gets compared is the binary64 value it decodes to. An identifier that must survive digit for digit belongs in a string, not in a number.

**Absent and null.** `{}` and `{"answer":null}` are different values. Their canonical forms are `{}` and `{"answer":null}`, two bytes against fifteen. That difference is what makes the report's dropped `reviewer` a conflict rather than a retry.

Two units of Unicode appear on this page, and they are deliberately different. Key *order* compares UTF-16 code units, because that is JCS's ordering rule. String *length*, in the limits below, counts Unicode scalar values, because that is a fair measure of text. Neither follows from the other, and each is fixed.

## Fixed semantic limits

Every boundary value is bounded, and the bounds are four exact numbers:

| Limit | What is counted | Maximum |
|---|---|---|
| String length | Unicode scalar values in each decoded string, and in each object member name | 65,536 |
| Entries | Direct children of one array or one object, not a total across the value | 4,096 |
| Depth | Nesting depth of each root, as defined below | 32 |
| Size | Bytes of each root's canonical form, measured separately | 1,048,576 (1 MiB) |

Depth is counted like this:

- a scalar (`null`, a boolean, a number, a string) has depth 0;
- an empty array or empty object has depth 1;
- a non-empty array or object has depth 1 plus the greatest depth among its members.

Member names add no level, and the root container counts as one level. So `[[[]]]` has depth 3, and `{"a":{"b":1}}` has depth 2. An empty array wrapped in 31 more arrays has depth 32 and passes. One more wrapper makes 33, and it is refused. Mixing arrays and objects changes nothing about the count.

All four limits apply at once. A value exactly at a limit passes that limit, and one unit over fails. Some cases at the edge:

- An object with one member whose name is 65,536 repetitions of `a`, and whose value is `null`, passes. Its canonical form is 65,545 bytes. With 65,537 repetitions, it is refused for string length.
- An Event payload whose canonical form is exactly 1,048,576 bytes passes the size limit. At 1,048,577 bytes, it is refused before acceptance. The metadata of the Event carrying it is not added to the payload's size.
- Two sibling roots of about 700 KiB each, in one Outcome, both pass. The Outcome is not refused merely because the whole thing exceeds 1 MiB.

A value over a limit is refused in the same way as any other malformed value. It is never truncated to fit. Truncation would accept content the sender never sent.

These are *semantic* limits: they decide which values are valid. They make no promise about messages or bytes on the wire. No limit applies to the sum of a message's roots, and no transport's byte size is guaranteed. A deployment may impose tighter limits on its transport, such as a smaller maximum request body. It may not silently redefine these four. If a transport limit could change which values the protocol considers valid, two deployments of the same protocol could disagree about validity. These numbers change only through an explicit, versioned amendment to the protocol.

Why fixed numbers, rather than a setting for each deployment? The accepted K0.1 decision states the limits at the semantic level, with exact units, so that a conformance fixture can build a case exactly at each limit and one past it, without waiting for any wire codec to exist. Fixed rules, fixed limits and fixed bytes together mean that "valid", "equal" and "too large" have one answer everywhere.

## In-process value capture

The sections above assume a value that has already been decoded. What has to happen before that point depends on how a value reaches the Kernel, not on what kind of value it is. Any root can arrive either way, whether it is creation input, an Event payload, an Outcome's progress or an Effect's arguments:

- **Over a wire binding,** it arrives as bytes, and a decoder turns them into a value. The duplicate-key rule applies there.
- **Through the in-process TypeScript binding,** the caller runs in the same JavaScript process and hands the Kernel a live object. There are no bytes to decode.

A decoded value is plain data that nobody else holds. A live object differs in three ways:

- **It can still change.** The Kernel receives a reference, not a copy. After calling `create({ input })`, the caller can still set `input.count = 2`.
- **It can answer two reads differently.** A getter or a `Proxy` runs code on every read, so validation, canonicalization and storage could each see a different `count`.
- **It can hold what JSON cannot.** Plain JSON conversion drops or alters `undefined` members, symbol keys, array holes, Maps and Dates. For example, `{a: undefined}` becomes `{}`.

This section gives the binding's extra obligations. Together they turn a live object into the same kind of plain value a decoder would have produced, or refuse it. They are value-acceptance rules for this binding. They fix no wire format, and they do not replace the duplicate-key rule for decoders.

**One snapshot.** The binding reads the caller's value once, into one coherent, immutable snapshot. Everything else is derived from that snapshot:

- validation;
- canonical bytes and size;
- the content the Kernel retains;
- what inspection shows;
- what later Activations carry.

The caller's object is never consulted again. If the application submits `{count: 1}` and then changes its own object to `{count: 2}`, the accepted content still says `1`, and so do the canonical bytes that decided its identity. The structure whose canonical bytes decided identity is the same structure the Kernel keeps and later shows. Canonicalizing what was retained reproduces the bytes that accepted it.

**What a snapshot may be made of.** In this binding:

- **Objects** have the ordinary object prototype or a null prototype. They hold their content as own, enumerable data members with string keys.
- **Arrays** have the ordinary array prototype. They hold an own data element at every position up to the length observed.

Anything else is refused rather than silently dropped:

- forms outside those two, such as class instances, Maps, Dates and typed arrays;
- accessor members, meaning getters and setters;
- array holes, and own array members outside its indices;
- symbol-keyed members, and non-enumerable members;
- cycles;
- members that are present with the value `undefined`.

Each refusal answers one of the three differences above. The `undefined` case also matters for equality: quietly dropping the member would turn it into an absent one, and [rule 6](#the-rules) says absent is a different value.

**One reading or none.** An object can present two different stories about itself. A member's own data descriptor can disagree with what an ordinary property read returns. An array's length can claim a position the array does not own. Merely observing the structure can throw. The binding refuses such a value. It does not pick whichever reading happened to come first, and it does not repair the disagreement. A value that has no single reading has no single content to give an identity to.

**Canonical bytes that the environment cannot steer.** The binding produces canonical bytes with the approved JCS implementation, unmodified, run only on data taken from the snapshot. That library runs in the same JavaScript realm as the caller, and ordinary JavaScript consults shared state along the way, such as the prototypes of arrays and objects. Code in the same process could alter that state, and in doing so change the bytes. So the binding has three obligations:

- Host state the library consults during the call must not change its output.
- If the binding cannot establish the environment the call needs, it refuses the value. A refusal costs availability; wrong bytes would cost identity.
- Any temporary environment the binding installs for the call is restored afterwards.

These are guarantees about accepting a value. They do not contain code that shares the process. Anything running in that process can still do whatever the process can do, and preventing that belongs to [physical enforcement](../mechanisms/resources.md#containment-claims), which has its own owner and its own evidence.

**The request envelope is read differently.** A call into the binding, such as a create or a submit, takes an envelope whose fields hold identity text, a destination, and payload values. The payloads are boundary values and are captured by the rules above. The envelope's own fields are observed under a different rule, and the difference goes in both directions:

- **Inherited fields.** A field the envelope carries only through inheritance reads as missing, exactly as if it had been omitted. Ambient state somewhere up a prototype chain must not be able to supply a field the caller never wrote.
- **Accessors.** An own accessor on the envelope may run. The envelope boundary observes it as the caller's own answer. A boundary value would refuse an accessor; the envelope does not.

Keep the two apart. The envelope rule decides which fields the caller supplied. The capture rules decide what value a supplied payload has.

## What these rules do not cover

The rules above compare boundary values, and they do only that. Several nearby comparisons belong to someone else.

**Sets.** In a boundary value, `[1,2]` and `[2,1]` differ, because array order is meaningful. A schema may declare that a particular field is a set, where membership matters and order does not. That is a property of that schema, applied by whoever interprets it. It is not a second equality rule on this page. Comparing such a field by its printed text rather than by its members is a known defect, described in [comparing a set is not comparing a string](../../docs/development/015-structural-evidence-rules.md#comparing-a-set-is-not-comparing-a-string).

**Meaning.** Canonical equality is sameness of the value, not of what it means. `37` and `"37"` are different values, even if an application reads them identically. Two strings that render as the same accented letter are different values if one uses a precomposed character and the other a base letter plus a combining accent: canonicalization changes how a value is spelled, never which characters it contains. Whether two different values mean the same thing is for a schema or the application to decide, before the value reaches the boundary.

**Progress.** The Kernel canonicalizes an inline progress value to measure and compare it, and nothing more. What the progress means belongs to the Runtime, its [progress codec](#codec) and its [Runtime contract](core.md#runtime-contract).

**Transport and storage.** How values travel and how they are stored are implementation choices, as the [codec](#codec) section says. So is whether a deployment writes canonical bytes anywhere at all.

**Authority.** No comparison on this page grants anything. Equal canonical bytes, or a matching hash, establish that two values are the same value. They say nothing about who sent it, whether it was permitted, or whether anyone approved it. [Content is not authority](../mechanisms/authority.md#content-is-not-authority) owns that boundary.
