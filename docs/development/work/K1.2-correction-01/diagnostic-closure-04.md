# Diagnostic construction audit, attempt 04

This is implementer-side correction work under [006](../../006-development-process.md) and
[012](../../012-review-methods.md), prepared on 2026-09-27. It does not grant acceptance or close
the full V-D1 obligation. The starting source was the owner's pushed head
`3287640f045cf2e6adeefcd32f21d897480a6a7d`; the integrated base remains
`a20d278185eaffc7f8b7489345a3624231ff6e6d`.

## Governing obligation and disposition

[Values, fixed semantic limits](../../../../mental-model/concepts/values.md#fixed-semantic-limits)
includes both constructing and retaining diagnostics in refusal cost. [Review 06](review-06.md)
found that an ordinary `constructor`/`name` read in `describe` could traverse a caller-built
prototype chain once per invalid position. Bounded retention did not bound that construction.
Contract revision 4 DEC-7 requires preserving the first eight detail locations and reasons, exact
suffix code counts and order, required observations, byte stops and accepted values.

The changed `describe` uses only `value === null ? "null" : typeof value`. It neither reads a
property nor asks whether an object is an array. The surrounding message still names the failed
form or observation. Constructor names cease to be diagnostic input; no accepted content or
identity uses this label. Legacy assertions about a class name or omitted constructor text are
updated as representation assertions, while their refusal classifications remain required.

**Partial closure only.** The deterministic evidence below closes the identified diagnostic
property-lookup mechanism. During the wider reconstruction, the implementer found an adjacent
engine prototype-chain traversal when a Proxy's descriptor trap returns an ordinary descriptor
whose absent fields are checked through a deep prototype chain. This happens during the structural
observation, before `describe`; type-only diagnostics cannot eliminate it. Its separate evidence
and authority question belong in the attempt's blocker record. It is not a new reviewer finding,
and the tests below do not establish full V-D1 compliance, whole-packet readiness or authority to
exclude engine work. No new exclusion is selected here.

## Complete message-construction inventory

The inventory follows every `pushIssue` and final refusal constructor in
[`values.ts`](../../../../packages/kernel/src/values.ts), including the work done before the
collector decides to retain a detail. Messages are still constructed eagerly at these sites;
compression is not used as the argument that their construction is bounded.

| Producer | Message input and construction after this correction | Dependency checked |
|---|---|---|
| `charge` | Fixed wording plus internal byte count and fixed limit | One stop issue; later positions remain unread |
| `describedValue`: absent own position, accessor, descriptor/read disagreement | Fixed literals | Own-descriptor/read semantics and classifications unchanged; observation cost remains subject to the adjacent blocker |
| `capture`: non-finite number | Fixed literal | No number coercion hook |
| `capture`: malformed or overlong string | Fixed literal or fixed scalar limit | Bounded string scan and original byte charge unchanged |
| `capture`: unsupported primitive/function | Fixed wording plus language-level type | Includes revoked callable Proxy without a diagnostic structural read |
| `capture`: cycle or excessive depth | Fixed literal or fixed depth limit | No object description; open-stack behavior unchanged |
| `capture` catch: any thrown value | Fixed wording plus language-level type, including null | No constructor, name, message, array classification, coercion, then or arbitrary caller property read |
| `captureArray`: foreign prototype | Fixed wording plus language-level type | Its required prototype observation remains; the diagnostic adds none |
| `captureArray`: unstable length or overlength | Fixed literal or already-validated primitive numeric length and fixed limit | No caller object interpolation |
| `captureArray`: excess own names or extra/symbol member | Fixed wording, engine list length and fixed limit, or fixed literal | Own-key enumeration remains a pre-existing qualification; no caller member name enters the message |
| `captureArray`: phantom/out-of-range own index | Fixed literals | Location uses a bounded numeric index suffix |
| `captureArray`: undefined member | Fixed literal | Later siblings and exact multiplicities unchanged |
| `captureObject`: foreign prototype | Fixed wording plus language-level type | Removes the original per-position constructor/name chain walk |
| `captureObject`: symbol, ghost own name or non-enumerable member | Fixed literals | Ghost-name paths are bounded before concatenation |
| `captureObject`: too many enumerable names | Fixed wording plus engine list lengths and fixed limit | No name interpolation; bounded descriptor-loop policy unchanged |
| `captureObject`: malformed or overlong member name | Fixed literal or fixed scalar limit | Path length checked before concatenation; bounded name scan and byte charge unchanged |
| `captureObject`: undefined member | Fixed literal | Original absent/null distinction and suffix weights unchanged |
| `accept`: defensive empty refusal or serializer failure | Fixed literals | Never describes a serializer-thrown value |
| `accept`: final canonical byte refusal | Fixed wording plus computed primitive byte count and fixed limit | Does not describe or reread caller content |
| `pushIssue`: retained detail and counted suffix | At most eight bounded paths/messages, then fixed suffix wording and exact code counts | No suffix expansion; fixed code vocabulary bounds its search |

`child` and `childElement` check lengths before concatenating paths. `issueText` checks length
before reading at most its fixed diagnostic limit. Every interpolation outside `describe` takes
fixed text or an already-known primitive numeric value. There is no `error.message` read in this
pipeline. This source trace establishes the scope of the diagnostic correction; it does not make
the structurally required engine operations constant-cost.

## Consumer and ordering closure

| Consumer | Trace and preserved boundary |
|---|---|
| `canonicalize`, `boundaryValueIssues`, `isBoundaryValue` | One capture produces the refusal; the latter two do not rerun capture inside a single call |
| `envelope.acceptIdentityText` | Non-text diagnostic uses bounded fixed type labels; accepted text uses canonical capture. Its existing array classification is an envelope observation, outside the changed `describe` helper |
| `coordinator.acceptCreationContent` | Captures authority context and initial input payload independently; malformed creation reserves no request identity or receipt |
| `coordinator.acceptInputContent` | Creation payload and post-creation ingress share the same root capture and weighted evidence |
| `outcome.acceptRoot` | Progress, every in-capacity Emission and complete/fail root are captured eagerly before Outcome authority; budgets remain per root |
| `outcome.captureRecovery` | The three availability roots use the same capture and weight-preserving projection |
| `located`, `appendIssues`, `appendRootIssues` | Each root supplies at most 19 retained issue records; relocation adds only a Kernel-owned field label and preserves multiplicities |
| `explain` | Creation/ingress render bounded locations and codes, with suffix weights written explicitly; messages are not reread from the caller |
| `explainDiagnosticIssues` | Outcome/control rendering retains at most eight details and composes exact remaining weights without expanding them |
| Outcome envelope diagnostics | Unknown field names are bounded before path/message construction; duplicate Emission keys use `diagnosticIdentity` before interpolation; count messages interpolate primitive counts and fixed labels |
| Delivery and protocol diagnostics | `boundDiagnostic` accepts a primitive string through the captured bounded slice, otherwise a fixed fallback. No `message` property, coercion or thenable assimilation occurs |

The scope gate still precedes Outcome capture. A visible caller without a submission grant causes
the eager work and receives `unauthorized_submission`; malformed-root details cannot change or
leak into that refusal. With the current grant the same roots produce `malformed_envelope`.
Every losing proposal leaves the full accepted inspection state unchanged apart from its one
retained refusal, and causes no delivery. A following valid proposal still accepts.

## Deterministic evidence and its limits

[`value-diagnostic-work.test.ts`](../../../../packages/kernel/tests/value-diagnostic-work.test.ts)
adds ten tests. The depth controls are 0, 1,000 and 10,000, and position counts are 1, 8, 9 and
4,096. A counted terminal getter proves the fixture can detect an ordinary diagnostic read through
each chain. The Kernel must make **zero** such reads while keeping one required structural
observation per refused position. This rejects a constructor/name lookup even when it occurs only
in the first retained detail; testing only a compressed suffix would miss that weaker defect.

The tests cover:

- foreign objects, foreign arrays and thrown objects; unsupported primitives and callable Proxies;
- own `constructor`, `constructor.name`, `message`, `then` and coercion getters, a million-unit
  constructor name, and thrown null/array/function/revoked values;
- first-eight locations, type-only reasons, exact suffix weights and issue order;
- eight eager roots on both complete and fail, with hidden scope, no grant and current grant;
- exact descriptor/read and structural-observation counts, whole-view refusal assertions and no
  delivery mutation;
- creation's two roots, ingress and all three recovery roots, with valid creation/input/Outcome
  follow-ups demonstrating that invalid proposals did not reserve their acceptance identities.

Command run against the corrected worktree:

```sh
node --test --experimental-strip-types packages/kernel/tests/value-diagnostic-work.test.ts
```

Result: **10 passed, 0 failed, 0 skipped**. Timing is not the test oracle. This is a targeted
diagnostic-construction result; it does not prove a bound on every structural engine operation,
discharge the adjacent blocker, or substitute for the packet's required validation and independent
review. Source and tests are independently written for this packet; no dependency or third-party
source is added.

## Owner resolution and additional evidence — 2026-09-28

The preceding sections preserve the audit's state before the owner resolved the blocker.
[Decision 03](../K1.2/decision-03.md), dated 2026-09-27 and transcribed verbatim from the owner's
message, resolves SELF-R4-DESCRIPTOR-01. It excludes the engine's processing of values returned by
caller code that the Kernel must invoke to observe a position, including conversion of a
Proxy-trap-returned descriptor. It expressly keeps Kernel-chosen lookups and all ordinary
non-Proxy object/array work within V-D1. The decision does not authorize rejecting coherent
Proxies, moving capture out of process, changing limits or weakening observations and byte stops.
The canonical boundary belongs in `values.md`; this paragraph records the decision and how this
evidence applies it, rather than introducing another rule.

Four additional maintained tests pin decision-03 condition 3 and the unexempted diagnostic path:

| Schedule | Independently expected result |
|---|---|
| Descriptor-probe shape, 8 occurrences of a 4,096-element array; prebuilt ordinary data descriptors above chains of depth 0 and 32 | Exactly 32,768 indexed descriptor traps and 32,768 indexed reads; each index observed eight times; eight prototype observations, eight length descriptors, eight length reads and sixteen own-key traps |
| The same shape with own descriptor value `undefined` | Eight original details, then 32,760 `undefined_member` occurrences; no acceptance |
| The same coherent Proxy shape with descriptor and actual value `0` | Accepted exact detached snapshot and canonical text, 65,553 bytes; the same observation counts, with no caller reread during serialization |
| Byte stop after fifteen maximum-length strings, followed by seventeen shared descriptor rows | Fifteen rows' indices read exactly once per occurrence; the sixteenth row's structure is observed before the byte stop; the seventeenth is never observed. There are 61,440 indexed descriptor/read pairs, 61,440 undefined issues and one `too_many_bytes` issue |
| One and eight eager Outcome roots of the descriptor-probe shape, without and with the current grant | Total observations equal root count multiplied by the independently expected per-root counts; `unauthorized_submission` precedes content diagnostics, while the grant reaches `malformed_envelope`; only the single refusal changes the view, no delivery occurs, and a valid follow-up accepts |
| Ordinary non-Proxy foreign objects and arrays, and a thrown ordinary object, at prototype depths 0 and 10,000 | Zero diagnostic constructor lookups, including first-eight details and counted suffixes. The throw carrier's required trap runs seventeen times; describing its thrown ordinary object adds no lookup |

The byte-stop expectation follows the input's punctuation and strings independently of the
implementation: the fifteen strings use `15 × 65,538 = 983,070` bytes and the 32-member outer
array adds 33. Each inner row charges 4,097 punctuation bytes. Exactly
`floor((1,048,576 - 983,103) / 4,097) = 15` complete rows fit. This pins the stop and its
observations without measuring elapsed time or changing accepted canonical-size accounting.

The descriptor-count tests use modest prototype depths so they remain ordinary regression tests.
The earlier depth-10,000 timing probe remains an observation of the now owner-exempted engine
conversion cost, not a performance gate. The explicit ordinary-object diagnostic tests remain
fully within V-D1 and would reject reinstating `describe`'s constructor lookup; the new exemption
does not excuse that lookup.

Validation after these additions:

- `node --test --experimental-strip-types packages/kernel/tests/value-diagnostic-work.test.ts`:
  **14 passed, 0 failed, 0 skipped**.
- `npm run typecheck`: **passed**.

These results extend the diagnostic and observation evidence. The packet's cumulative validation,
new C/H identities and independent-review handoff remain owned by the implementation report;
this note does not independently accept the packet or release a successor.
