# C1 ablation — K1.1-correction-03, implementation round 1

**Record type:** implementer evidence for condition C1 of the [design check](design-01-check.md): "For every
converted Proxy-instrument test (§7.2), show by ablation that the mutants it killed before are still killed
after conversion. List each group, its mutants and the results in the report." It is an administrative
attachment of [implementation 01](implementation-01.md). It is not a review or an acceptance. Written by the
implementing Claude Code cloud session (`claude-opus-5-5`), 2026-10-11.

## Method

- **Conversions.** 69 converted tests in 7 files, from the conversion records
  ([`c1-ablation/conversion-records.json`](c1-ablation/conversion-records.json)) plus one later conversion
  found by the silent-pass search. [`c1-ablation/map.json`](c1-ablation/map.json) maps each original title to
  its title at C.
- **Mutants.** 87 mutants, each with a B edit and its C analogue
  ([`c1-ablation/mutants-all.json`](c1-ablation/mutants-all.json)). 84 are the mutants the conversion records
  name. The other 3 come from the coordinator conversion review: `V-FOREIGN-PROTO`, `X1-foreign-object-instanceof`
  and `E-IDTEXT-CATCH`.
- **Matrices.** Every mutant ran against every leaf of the 9 affected test files, at B
  (`b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`) with the original tests and at the candidate with the converted
  tests: 783 runs on each side, plus controls. The files are the 7 converted files, `aggregate-refusal.test.ts`
  and `poison-catalog.test.ts`. Each file ran in its own `node --test` process
  ([`c1-ablation/matrix.py`](c1-ablation/matrix.py),
  [`c1-ablation/leaf-reporter.mjs`](c1-ablation/leaf-reporter.mjs)). A kill means a leaf fails under the mutant
  while it passes in that side's control. A leaf that is missing under the mutant also counts as a kill, but it
  is recorded as "vanished".
- **Faithful C analogues.** Three B sites split in two at C. At B, `describedValue` held one ordinary read
  shared by array positions and object members. At C there are two sites: `observeElement` and `readMember`.
  So `RC-ELEMENT-READ`, `RC-ELEMENT-READ-TWICE`, and `MV1`/`VAL-object-read-from-descriptor` (one B edit) run
  at C as two-site edits ([`c1-ablation/mutants-split.json`](c1-ablation/mutants-split.json)). `MV3`'s C anchor
  no longer existed after the MS-02 fix, so its first C run was skipped. It ran again with the faithful edit
  ([`c1-ablation/mutants-mv3.json`](c1-ablation/mutants-mv3.json)).
  [`c1-ablation/merge_c.py`](c1-ablation/merge_c.py) substitutes those rows.
- **Comparison.** [`c1-ablation/analyze.py`](c1-ablation/analyze.py) compares each original test's B kills
  with the C kills of its converted test or tests. It compares unchanged leaves the same way, to catch silent
  passes.
- **Lost kills.** Each lost kill was checked alone ([`c1-ablation/cascade.py`](c1-ablation/cascade.py)): the
  leaf runs by itself under the mutant, at B, or at C after a strengthening. The other C leaves that kill each
  lost mutant come from the C matrices, which also cover the new `capture-*.test.ts` files
  ([`c1-ablation/mutants-residual.json`](c1-ablation/mutants-residual.json)).
- **Tables.** [`c1-ablation/c1_table.py`](c1-ablation/c1_table.py) produces the tables below. The raw verdicts,
  reduced to the failed and vanished leaves of each run, are in [`c1-ablation-01.jsonl`](c1-ablation-01.jsonl).

## Result

The originals killed 437 (test, mutant) pairs at B:

- 383 are still killed by the converted test at C.
- 4 are killed again after a strengthening made in this round. The two ingress conversions now also mutate the
  object the payload getter returned, at both levels, and require that the retained payload is unchanged.
  Checked alone at C, this kills `VAL-snapshot-is-caller-object` and `VAL-snapshot-rereads-caller`.
- 8 were never kills of that test at B: the leaf vanished under the mutant.
- 5 were cascades at B: the leaf passes alone under the mutant.
- 37 are no longer reached by the converted test, but other C leaves still kill the mutant.

No converted test lost a mutant that nothing at C kills.

**By group,** the mutants a group's originals killed are still killed by that group's converted tests at C,
except for the five pairs below. The cause is the same in each: a Proxy let the B test observe a genuine
value doing something it cannot do without a trap or an accessor. Capture now refuses that Proxy before any
trap.

- **`dispatch` group: `MV1`/`VAL-object-read-from-descriptor`** (taking a member's value from its descriptor
  rather than its one ordinary read). A genuine own data property reads as its descriptor value. At C the
  disagreement is reached through a wrapped-child hook on the one descriptor observation, and 17 leaves do
  that. Among them is the dispatch test `K11-R2-VAL-02 a payload with no single reading never reaches a
  Driver`.
- **`values`, `ingress` and `value-diagnostic-work` groups: `RC-ELEMENT-READ-TWICE`** (a second read of
  each position). A read of genuine own data has no observable effect, so no runtime count can see the second
  read. At C it is killed by the structural pin in `value-refusal-cost.test.ts` (`helperContainerUses`):
  `observeElement` uses the caller value through exactly one descriptor call and one read, with no loop.
- **`value-diagnostic-work` group: `MV3`** (an array's symbols not counted). The decision-03/04 probes saw it
  as a changed Proxy `ownKeys` count. At C it is killed by the refusal of an array with a symbol member
  (`value-refusal-cost.test.ts`) and by the exact byte charge of 4,096 symbol members (`capture-work.test.ts`).

These pairs are left to those killers rather than duplicated into each group, because a genuine value gives
the group's own tests nothing to observe.

**Unchanged leaves** lost 33 kills:

- 17 vanished at B.
- 10 were cascades at B.
- 2 are `V-FOREIGN-PROTO` on a `Date` payload. A `Date` is now also refused by its internal slot, so disabling
  the prototype check no longer changes these two results. 15 other C leaves kill it.
- 4 are `E-IDTEXT-CATCH`, which nothing at C kills. `acceptIdentityText` now tests for a Proxy first, and
  none of `isProxyValue`, `Array.isArray` on a non-Proxy, or `typeof` can throw. So the catch that labels a
  throwing classification is unreachable, and the mutant is equivalent at C. The catch is kept as a defensive
  fallback. The implementation report states this.

**Maintained form.** The group-level kills are registered as seven probe cases, `value-cost.c1.<group>`, in
`tests/fixtures/packet-tools/value-cost.json`. Each case runs exactly the group's converted tests by name and
holds the C analogues of every mutant those tests kill at both B and C: 162 mutants in all.
`scripts/packet_tools.py verify` runs them as part of the `value-cost-mutants` check. Run on its own at
`6c7ccd9d`, that check killed all 227 `value-cost.json` mutants, these 162 included.

## Limits

- Kills at B are attributed per leaf from whole-file runs. Cascades were checked only for lost pairs, so a
  kept pair may still be a cascade at B. This does not change any loss.
- Leaves are matched by their last title segment within a file.
- At B, three ingress runs timed out after 900 s (`VAL-snapshot-is-caller-object`,
  `VAL-snapshot-rereads-caller` and `RC-ELEMENT-READ-TWICE`). For those runs only the leaves that failed before
  the timeout count as kills.
- The matrix measures which tests fail. It does not show that a converted test covers its original's claim.
  Each conversion's claim is in the conversion records.

## Groups

| Group | Converted tests | Mutants killed at B (own kills) | Still killed by the group at C | Not killed by the group at C |
|---|---|---|---|---|
| creation.test.ts | 8 | 22 | 22 | — |
| dispatch.test.ts | 2 | 8 | 6 | `MV1-element-read-replaced-by-descriptor-value` (killed at C by 17 other leaves); `VAL-object-read-from-descriptor` (killed at C by 17 other leaves) |
| ingress.test.ts | 5 | 19 | 18 | `RC-ELEMENT-READ-TWICE` (killed at C by 1 other leaves) |
| outcome-hostile.test.ts | 1 | 5 | 5 | — |
| value-diagnostic-work.test.ts | 17 | 33 | 31 | `MV3-array-symbols-listing-skipped` (killed at C by 2 other leaves); `RC-ELEMENT-READ-TWICE` (killed at C by 1 other leaves) |
| value-refusal-cost.test.ts | 10 | 33 | 33 | — |
| values.test.ts | 26 | 55 | 54 | `RC-ELEMENT-READ-TWICE` (killed at C by 1 other leaves) |

## Converted tests

| File | Test at C | Conversion | Killed at B | Killed at C | Lost, with reason |
|---|---|---|---|---|---|
| value-diagnostic-work.test.ts | V-D1 foreign object: deep prototype diagnostics do zero lookups before and after detail eight | instrument | 8 | 8 | — |
| value-diagnostic-work.test.ts | V-D1 foreign array: deep prototype diagnostics do zero lookups before and after detail eight | instrument | 7 | 7 | — |
| value-diagnostic-work.test.ts | V-D1 thrown object: deep prototype diagnostics do zero lookups before and after detail eight | instrument | 11 | 11 | — |
| value-diagnostic-work.test.ts | V-D1 every unsupported primitive and plain function has a type-only label; callable and revoked function Proxies are refused untouched (was: V-D1 every unsupported primitive, including a revoked function Proxy, has a type-only label) | witness + instrument | 3 | 3 | — |
| value-diagnostic-work.test.ts | V-D1 own constructor, constructor.name, and thrown-value properties are never inspected | instrument | 14 | 14 | — |
| value-diagnostic-work.test.ts | V-D1 thrown null, arrays, functions and revoked objects need no diagnostic structural observation | instrument | 16 | 16 | — |
| value-diagnostic-work.test.ts | V-D1 foreign object: eight eager Outcome roots preserve observations and whole refusal state | instrument | 13 | 12 | `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | V-D1 foreign object: creation, ingress and recovery use the same zero-lookup diagnostics | instrument | 9 | 9 | — |
| value-diagnostic-work.test.ts | V-D1 thrown object: eight eager Outcome roots preserve observations and whole refusal state | instrument | 16 | 15 | `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | V-D1 thrown object: creation, ingress and recovery use the same zero-lookup diagnostics | instrument | 12 | 12 | — |
| value-diagnostic-work.test.ts | decision-03 descriptor probe (item 5 superseded by decision-01 item 2): the probe's Proxy is refused with zero traps; plain rows keep depth-independent bounded observations and exact acceptance (was: decision-03 descriptor probe: depth does not change bounded observations or coherent Proxy acceptance) | witness + instrument | 8 | 6 | `MV3-array-symbols-listing-skipped`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | decision-03 descriptor probe (item 5 superseded by decision-01 item 2): the byte stop bounds observations before later rows (was: decision-03 descriptor probe: the byte stop bounds trap calls before later rows) | witness + instrument | 13 | 11 | `MV3-array-symbols-listing-skipped`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | decision-03 descriptor probe (item 5 superseded by decision-01 item 2): one and eight eager roots keep bounded observations before authority (was: decision-03 descriptor probe: one and eight eager roots keep bounded calls before authority) | witness + instrument | 10 | 8 | `MV3-array-symbols-listing-skipped`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | decision-03 ordinary objects and arrays retain zero diagnostic lookups without a Proxy exemption | instrument | 13 | 13 | — |
| value-diagnostic-work.test.ts | decision-04 handler probe (item 5 superseded by decision-01 item 2): a handler-chain Proxy is refused with no trap lookup; plain rows keep Kernel-selected observations and exact acceptance (was: decision-04 handler probe: Kernel-selected observations and coherent acceptance do not depend on handler depth) | witness + instrument | 8 | 6 | `MV3-array-symbols-listing-skipped`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | decision-04 handler probe (item 5 superseded by decision-01 item 2): the byte stop bounds Kernel-selected observations (was: decision-04 handler probe: the byte stop bounds Kernel-selected observations) | witness + instrument | 13 | 11 | `MV3-array-symbols-listing-skipped`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere |
| value-diagnostic-work.test.ts | decision-04 handler probe (item 5 superseded by decision-01 item 2): eager roots preserve selected counts and whole state before authority (was: decision-04 handler probe: eager roots preserve selected counts and whole state before authority) | witness + instrument | 10 | 8 | `MV3-array-symbols-listing-skipped`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere |
| values.test.ts | an array position read differently than it is owned is refused, not silently picked | witness | 4 | 4 | — |
| values.test.ts | an object member read differently than it is owned is refused the same way | witness | 4 | 4 | — |
| values.test.ts | the disagreement is refused at depth and under a valid root | witness | 7 | 7 | — |
| values.test.ts | an array position supplied only by a dynamic read, owning nothing, is refused | witness | 3 | 3 | — |
| values.test.ts | a length that does not agree with itself cannot decide which positions exist | witness | 3 | 3 | — |
| values.test.ts | a structure that cannot be observed is refused rather than thrown out of the boundary | witness | 4 | 4 | — |
| values.test.ts | an object listing an own member it does not own is refused | witness | 3 | 3 | — |
| values.test.ts | a value that answers differently on each read is bound to the one reading that was taken | witness + instrument | 6 | 3 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere |
| values.test.ts | thirty-two arrays standing for four billion are refused after reading about a megabyte | instrument | 4 | 4 | — |
| values.test.ts | one long string shared across shared arrays is refused before a second megabyte is read | instrument | 4 | 4 | — |
| values.test.ts | a shared member refused for another reason is not re-read without bound either | instrument | 4 | 4 | — |
| values.test.ts | an oversized own-names listing is classified after at most one descriptor past the entry limit | instrument | 6 | 6 | — |
| values.test.ts | an array listing more names than any accepted array owns is refused without classifying each | instrument | 2 | 2 | — |
| values.test.ts | a capture-time side effect installing Object.prototype.toJSON still binds the observed structure | witness + instrument | 5 | 3 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere |
| values.test.ts | an own-name listing reporting a canonical index outside length with no backing property is refused | witness | 3 | 3 | — |
| values.test.ts | a backed canonical index outside length is also refused rather than silently dropped | witness | 2 | 2 | — |
| values.test.ts | a throwing observation whose thrown value is itself hostile to inspection still becomes a refusal | witness | 8 | 8 | — |
| values.test.ts | a deliberately huge sparse length refuses bounded without traversing its extent | instrument | 1 | 1 | — |
| values.test.ts | K11-R2-VAL-02 round 6: a one-shot Object.keys replacement live across the call cannot change canonical bytes (was: a capture-time one-shot Object.keys replacement cannot change canonical bytes) | witness + instrument | 7 | 4 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere; `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | K11-R2-VAL-02 round 6: an Object.keys replacement that throws, live across the call, neither leaks nor diverts bytes (was: a capture-time replacement that makes Object.keys throw neither leaks nor diverts bytes) | witness + instrument | 4 | 3 | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | K11-R2-VAL-02 round 6: an Array.prototype.join replacement live across the call cannot change canonical bytes either (was: a capture-time Array.prototype.join replacement cannot change canonical bytes either) | witness + instrument | 7 | 4 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere; `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | K11-R5-VAL-03 a prototype observation that swaps the live Object binding cannot pass a foreign prototype as plain (was: K11-R5-VAL-03 a getPrototypeOf trap that swaps the live Object binding cannot pass a foreign prototype as plain) | witness + instrument | 3 | 2 | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | the retained structure and the canonical bytes are exactly the one value observed | witness + instrument | 4 | 3 | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | the index the accessor picks is not special: position zero and a nested array behave the same | witness + instrument | 6 | 5 | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | a value the rules do refuse is still refused with the accessor live, not normalized | witness + instrument | 7 | 6 | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | a capture-time observation that inserts the chain still binds the observed structure (was: a capture-time trap that inserts the chain still binds the observed structure) | witness + instrument | 6 | 5 | `VAL-snapshot-is-caller-object`: vanished at B |
| value-refusal-cost.test.ts | V-D1 every issue family: revoked structure | witness | 5 | 5 | — |
| value-refusal-cost.test.ts | V-D1 every issue family: throwing structure | witness | 6 | 6 | — |
| value-refusal-cost.test.ts | V-D1 every issue family: object ghost descriptor | witness | 4 | 4 | — |
| value-refusal-cost.test.ts | V-D1 every issue family: array ghost index | witness | 4 | 4 | — |
| value-refusal-cost.test.ts | V-D1 every issue family: array out-of-range index | witness | 4 | 4 | — |
| value-refusal-cost.test.ts | V-D1 every issue family: array unstable length | witness | 4 | 4 | — |
| value-refusal-cost.test.ts | V-D1 every issue family: descriptor/read mismatch | witness | 5 | 5 | — |
| value-refusal-cost.test.ts | V-D1 bounded paths include phantom names, long ancestors, and literal omission text | witness | 9 | 9 | — |
| value-refusal-cost.test.ts | V-D1 own-only multiplicity under ambient pollution and capture-time mutation | witness + instrument | 3 | 3 | — |
| value-refusal-cost.test.ts | V-D1 eight eager roots before authority: every position once, no forbidden mutation | witness + instrument | 8 | 8 | — |
| creation.test.ts | K11-R2-VAL-02 creation identity and replay agree under an Object.keys replacement installed in the same call (was: K11-R2-VAL-02 creation identity and replay agree under a capture-time Object.keys replacement) | witness + instrument | 3 | 3 | — |
| creation.test.ts | K11-R5-STATE-01 a Map.prototype.set no-op installed in the same call cannot drop the creation commit (was: K11-R5-STATE-01 a capture-time Map.prototype.set no-op cannot drop the creation commit) | witness + instrument | 5 | 3 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere |
| creation.test.ts | K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at creation | witness | 4 | 4 | — |
| creation.test.ts | a coherent array captured while an indexed accessor installed in the same call is live binds its own value (was: a coherent array whose prototype observation installs an indexed accessor binds its own value) | witness + instrument | 5 | 5 | — |
| creation.test.ts | an initial-input payload field whose observation installs get/set still creates the exact Execution (was: a payload observation that installs get/set still creates the exact Execution) | witness + instrument | 4 | 3 | `VAL-snapshot-is-caller-object`: cascade at B |
| creation.test.ts | a payload whose observation throws under the get/set it installed is refused, never accepted or leaked (was: an ordinary handler broken by its own pollution is refused, never accepted or leaked) | witness + instrument | 8 | 5 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere; `VAL-snapshot-is-caller-object`: cascade at B |
| creation.test.ts | an earlier-field getter cannot steer a later field through ambient state in the same tick (was: an earlier-field trap cannot steer a later field through ambient state in the same tick) | witness + instrument | 5 | 3 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere |
| ingress.test.ts | K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at ingress | witness | 8 | 8 | — |
| ingress.test.ts | K11-R2-VAL-02 ingress identity and replay agree under an Object.keys replacement installed in the same call (was: K11-R2-VAL-02 ingress identity and replay agree under a capture-time Object.keys replacement) | witness + instrument | 3 | 3 | — |
| ingress.test.ts | an inherited setter at the next mailbox index cannot make an accepted Event go unretained | witness + instrument | 9 | 6 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere; `VAL-snapshot-is-caller-object`: restored; `VAL-snapshot-rereads-caller`: restored |
| ingress.test.ts | a creation whose initial-input payload field traps the first mailbox index still binds its initial Event (was: a creation whose payload traps the first mailbox index still binds its initial Event) | witness + instrument | 8 | 5 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `RC-ELEMENT-READ-TWICE`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere; `VAL-snapshot-is-caller-object`: restored; `VAL-snapshot-rereads-caller`: restored |
| ingress.test.ts | a payload field whose observation installs get/set still retains the accepted Event (was: a payload observation that installs get/set still retains the accepted Event) | witness + instrument | 6 | 3 | `RC-ELEMENT-READ-TWICE`: cascade at B; `VAL-snapshot-is-caller-object`: cascade at B; `VAL-snapshot-rereads-caller`: cascade at B |
| dispatch.test.ts | K11-R2-VAL-02 Activation, redelivery and inspection carry exactly the value whose bytes were bound | witness + instrument | 3 | 3 | — |
| dispatch.test.ts | K11-R5-STATE-01 an Object.freeze replacement installed in the creation call cannot leave the Activation mutable (was: K11-R5-STATE-01 a capture-time Object.freeze replacement cannot leave the Activation mutable) | witness + instrument | 6 | 4 | `MV1-element-read-replaced-by-descriptor-value`: elsewhere; `VAL-object-read-from-descriptor`: elsewhere |
| outcome-hostile.test.ts | a field whose observation throws is a located refusal, not an escaping exception | witness | 5 | 5 | — |
| creation.test.ts | K11-R5-VAL-03 creation refuses a foreign-prototype payload while the live Object binding is swapped (was: K11-R5-VAL-03 creation refuses a prototype observation that swaps the live Object binding) | witness + instrument | 2 | 2 | — |

## Unchanged leaves that lost a kill

| File | Leaf | Lost, with reason |
|---|---|---|
| creation.test.ts | a revoked Proxy in any identity-text field is a located malformed_value refusal | `E-IDTEXT-CATCH`: unkilled |
| creation.test.ts | a revoked Proxy in initial-input identity fields is located under initialInput | `E-IDTEXT-CATCH`: unkilled |
| creation.test.ts | an unreadable or absent creation envelope is malformed, and scope still precedes authorization | `E-IDTEXT-CATCH`: unkilled |
| dispatch.test.ts | a bound getter that installs Object.prototype.get still reserves the exact prefix | `VAL-snapshot-is-caller-object`: cascade at B |
| dispatch.test.ts | an installed Object.prototype.set cannot shorten a larger batch, and redelivery keeps it | `VAL-snapshot-is-caller-object`: cascade at B |
| dispatch.test.ts | capability integrity: frozen, detached, and bound to its own attempt | `VAL-snapshot-is-caller-object`: cascade at B |
| dispatch.test.ts | descriptor pollution and an inherited indexed trap together still commit the exact batch | `VAL-snapshot-is-caller-object`: cascade at B |
| ingress.test.ts | a revoked Proxy in requestKey, kind or subscriptionClass is a located refusal | `E-IDTEXT-CATCH`: unkilled; `RC-ELEMENT-READ-TWICE`: cascade at B; `VAL-snapshot-is-caller-object`: cascade at B; `VAL-snapshot-rereads-caller`: cascade at B |
| ingress.test.ts | input that is not a boundary value is refused and queues nothing | `V-FOREIGN-PROTO`: elsewhere |
| ingress.test.ts | replay returns the retained disposition and changed content conflicts | `RC-ELEMENT-READ-TWICE`: cascade at B; `VAL-snapshot-is-caller-object`: cascade at B; `VAL-snapshot-rereads-caller`: cascade at B |
| value-refusal-cost.test.ts | V-D1 every issue family: foreign object prototype | `V-FOREIGN-PROTO`: elsewhere |
| values.test.ts | a caller-mutated iterator next cannot omit, substitute, duplicate or reorder the keys | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | a deleted holder next plus an Object.prototype next shadow still binds the snapshot | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an inherited accessor at the indices the serializer writes cannot choose the bytes | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an inherited data property at those indices cannot either, and equality still follows the bytes | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an inherited descriptor getter never runs inside capture, cloning or the serializer window | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an iterator result without its own done cannot be ended early through Object.prototype | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an object inserted between Array.prototype and Object.prototype cannot choose the bytes | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an object inserted on the iterator chain cannot supply next | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an own __proto__ member still installs while conversion is hostile | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | an unresettable chain degrades to a refusal, never to wrong bytes | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | every hostile data-field combination still yields the exact clean bytes | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | restoring a borrowed accessor shadow under inherited value pollution keeps the bytes and the host | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | retained content accepted under pollution re-canonicalizes to the accepting bytes | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | the byte limit is enforced on the snapshot bytes, not on bytes the pollution chose | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | the prototypes are left exactly as found, including properties the Kernel never installed | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | the refusal is located, the bytes are never wrong, and the borrowed slots are handed back | `VAL-snapshot-is-caller-object`: vanished at B |
| values.test.ts | the top of the chain is engine-pinned, so bare results have nowhere hostile to resolve | `VAL-snapshot-is-caller-object`: vanished at B |

## Where each lost mutant is killed at C

| Mutant (B id) | C leaves killing its C analogue | First six |
|---|---|---|
| `E-IDTEXT-CATCH` | 0 | — |
| `MV1-element-read-replaced-by-descriptor-value` | 17 | creation.test.ts › K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at creation; dispatch.test.ts › K11-R2-VAL-02 a payload with no single reading never reaches a Driver; ingress.test.ts › K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at ingress; value-diagnostic-work.test.ts › V-D1 foreign object: eight eager Outcome roots preserve observations and whole refusal state; value-diagnostic-work.test.ts › V-D1 thrown object: eight eager Outcome roots preserve observations and whole refusal state; value-diagnostic-work.test.ts › decision-03 descriptor probe (item 5 superseded by decision-01 item 2): one and eight eager roots keep bounded observations before authority … |
| `MV3-array-symbols-listing-skipped` | 2 | capture-work.test.ts › an array with 4,096 symbol-keyed members is charged one byte per symbol; value-refusal-cost.test.ts › V-D1 every issue family: array symbol |
| `RC-ELEMENT-READ-TWICE` | 1 | value-refusal-cost.test.ts › V-D1 eight eager roots before authority: every position once, no forbidden mutation |
| `V-FOREIGN-PROTO` | 15 | aggregate-refusal.test.ts › AGG-01 aggregate progress, two Emissions and complete: <=16,384 units, retained and answerable; aggregate-refusal.test.ts › AGG-01 aggregate progress, two Emissions and fail: <=16,384 units, retained and answerable; aggregate-refusal.test.ts › DEC-5 renderer message 1024; capture uses fixed type labels; aggregate-refusal.test.ts › DEC-5 renderer message 1025; capture uses fixed type labels; aggregate-refusal.test.ts › aggregate content stays behind currency and authority; capture retains bounded weighted diagnostics; creation.test.ts › K11-R5-VAL-03 creation refuses a foreign-prototype payload while the live Object binding is swapped … |
| `VAL-object-read-from-descriptor` | 17 | creation.test.ts › K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at creation; dispatch.test.ts › K11-R2-VAL-02 a payload with no single reading never reaches a Driver; ingress.test.ts › K11-R2-VAL-02 a payload whose own data and property reads disagree is refused at ingress; value-diagnostic-work.test.ts › V-D1 foreign object: eight eager Outcome roots preserve observations and whole refusal state; value-diagnostic-work.test.ts › V-D1 thrown object: eight eager Outcome roots preserve observations and whole refusal state; value-diagnostic-work.test.ts › decision-03 descriptor probe (item 5 superseded by decision-01 item 2): one and eight eager roots keep bounded observations before authority … |
| `VAL-snapshot-is-caller-object` | 10 | capture-metering.test.ts › SC4 reports an unmetered loop in the traversal; capture-metering.test.ts › SC8 reports the serializer window reached from the traversal; capture-metering.test.ts › the real values.ts passes every rule; capture-work.test.ts › every shape of the maintained corpus; creation.test.ts › K11-R1-VAL-01 a valid own __proto__ creation payload is retained as own data through inspection; ingress.test.ts › K11-R1-VAL-01 post-creation ingress preserves an own __proto__ through replay, mailbox and inspection … |
| `VAL-snapshot-rereads-caller` | 11 | capture-metering.test.ts › SC4 reports an unmetered loop in the traversal; capture-metering.test.ts › SC8 reports the serializer window reached from the traversal; creation.test.ts › K11-R1-VAL-01 a valid own __proto__ creation payload is retained as own data through inspection; ingress.test.ts › K11-R1-VAL-01 post-creation ingress preserves an own __proto__ through replay, mailbox and inspection; outcome-hostile.test.ts › builtins replaced mid-observation are not consulted by the checks or the commit; poison-catalog.test.ts › count: no zone frame reaches a poisoned member; every window was live … |
