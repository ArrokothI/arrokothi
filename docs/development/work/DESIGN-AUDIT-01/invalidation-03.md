# Owner invalidation notice 03 — V-ENV claim hold for the in-process binding

## Owner decision, 2026-10-02

The owner's final-cleanup agent records this decision. That agent is a Claude Code desktop session
(Code tab), model `claude-opus-5-5`. It recorded the decision on 2026-10-02, on the owner's instruction,
while running Prompt C final cleanup for DESIGN-AUDIT-01. This is an owner decision, not an independent
review verdict. It answers the owner notice in [review 03](review-03.md#new-evidence-against-accepted-work-for-the-owner-not-a-candidate-finding).
The owner's instruction template offered three options and said to delete two before sending. Option [A]
was the only option sent. Verbatim, item 6 of that instruction:

```text
6. OWNER DECISION ON THE V-ENV OWNER NOTICE (review-03, "New evidence against accepted work"). The owner picks one;
   delete the other two before sending:
   [A] Owner instruction: append an invalidation notice (invalidation-03) holding the V-ENV claims named in
       review-03 (values.md "Canonical bytes that the environment cannot steer", one snapshot bytes vs retained
       content, creation replay/conflict under the hop, BASELINE "ambient safety") for the in-process binding.
       Preserve historical ACCEPTs. Route the correction to the binding packet. The hold stays until that packet
       is accepted. Link it from 007. Do not edit values.md or BASELINE.
```

Other items of the same instruction bear on this notice:
- Item 2: change no 007 row other than DESIGN-AUDIT-01's.
- Item 4: draft adoption is excluded, PROXY-01 stays unanswered, and both earlier holds remain.

The number 03 is the owner's. It follows the two active claim holds, [invalidation-01](invalidation-01.md)
in this directory and [K1.2 invalidation-02](../K1.2/invalidation-02.md). This directory has no
invalidation-02.

## Held claims

The hold applies to the current in-process binding: `packages/kernel/src/values.ts` capture, plus the
approved `canonicalize@3.0.0` run inside its serializer window. The following claims are held:

1. **V-ENV.** [values: in-process value capture](../../../../mental-model/concepts/values.md#in-process-value-capture),
   "Canonical bytes that the environment cannot steer", all three of its obligations: output independence,
   refusal when setup fails, and restoration.
2. **One snapshot, for bytes against retained content.** The same section says the canonical bytes that
   decided identity come from the structure the Kernel keeps. Under the hop, the bytes describe different
   content from the retained snapshot.
3. **Creation replay and conflict under the hop.** [Creation](../../../../mental-model/mechanisms/creation.md#the-lost-response-cases)
   returns the original Execution for equal content and refuses different content as a conflict. Under the
   hop, a different payload is answered as a replay.
4. **BASELINE "ambient safety".** The [value section](../../002-implemented-kernel-baseline.md#value-refusal-diagnostics)
   says that ambient safety remains unchanged.

Those pages are not edited, by owner instruction. Status lives in 007 and in this notice. The pages state the
rule; they do not state its current status.

## Evidence

The evidence is review 03's section "New evidence against accepted work". Its reproducers are
[kernel-lexical-shadow.mts](review-03/hop/kernel-lexical-shadow.mts),
[kernel-lexical-creation.mts](review-03/hop/kernel-lexical-creation.mts) and
[lexical-shadow-probe.mjs](review-03/hop/lexical-shadow-probe.mjs), with commands in the
[evidence README](review-03/README.md).

- **Bytes.** A coherent Proxy's `get` trap runs `vm.runInThisContext("let JSON = …")` during capture.
  `canonicalize` then returns `{"a":[999,"x"],"b":999}` for the snapshot `{"a":[1,"x"],"b":2}`. The
  `let Object` and `let Array` variants also steer the bytes. Later plain calls stay steered, and
  `globalThis` is unchanged throughout.
- **Whole decision.** After the hop, `createExecution` with the same key and the payload
  `{b:7,a:[3,"x"]}` is accepted as a replay of the first Execution. That Execution's retained payload is
  `{"b":2,"a":[1,"x"]}`. In the control run the same retry is refused as a key conflict.
- **Rerun by the cleanup agent.** I ran both Kernel probes in fresh processes on Node v25.2.1, from this
  checkout at review record `8447b05ab3178250d00e1d9ad12920debc4ccc31`. The Kernel source there is
  byte-identical to base `66bc041175e6fc191c2e7cf88de198111e7d97c9`. The six output lines equal the
  review's [shadow](review-03/hop/kernel-lexical-shadow.jsonl) and
  [creation](review-03/hop/kernel-lexical-creation.jsonl) records byte for byte.

## Mechanism, as review 03 traces it

The serializer window installs temporary, configurable slots on `globalThis` and restores them afterwards.
A classic-script `let` creates a binding in the global declarative record. Identifier resolution consults
that record before the global object, so the dependency's free identifiers (`JSON`, `Object`, `Array`)
reach the caller's binding. The slots are configurable, so the declaration is legal. The window's setup
therefore succeeds, and V-ENV's refusal clause never fires. Coherent-Proxy acceptance (decisions 03/04
item 5) lets caller code run during capture. Only a non-configurable global binding refuses the declaration.
A declaration made before the binding starts defeats any check that reads only `globalThis`.

The scope of the evidence:
- It reaches the serializer dependency's free identifiers.
- Review 03 did not vary the inspection, dispatch or Outcome roots.
- Ingress and Outcome replay/conflict use the same canonical bytes. While this hold stands, they cannot
  cite V-ENV either. This notice asserts nothing further about them.

## Historical acceptance retained

These are provenance anchors, not claims that the probe ran against each historical H:
- K1.1's cumulative accepted H is `52b1600f3b42e3a360fdc3395178f1d147edf304`. Its serializer window is
  KC1-DEC-3 of the K1.1-correction-01 contract. Its accepted reference H is
  `644dfffc7904176ee3a4f9943310cf926408a113`. Both were integrated at
  `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`, as recorded in [007](../../007-work-packets.md).
- K1.2-correction-01 revision 10 was accepted at `b7191dbf630defeff7756122a6798e15d0b73dd3` and
  integrated at `ed509e11dc39ff24e10c1ace68189776c4270919`. Its tree carries BASELINE's "ambient safety"
  sentence.

Those verdicts and integrations are not rewritten. This notice qualifies the current claims only. It
neither widens nor lifts invalidation-01 (re-prototyped exotic classification) or invalidation-02 (V-D1).

## Consequences

1. **Active hold.** The four claims above are held for the in-process binding. Until the hold is lifted,
   dependent descriptions, briefs and releases must not assert them.
2. **Correction route: the binding packet.** That packet is the one the owner directed in
   [owner-decisions-02](owner-decisions-02.md), sections 2 (extra check c) and 3: bytes core, caller-side
   wrapper and transport adapter. It follows TOOLS-01 and K1.1-correction-03. It has no 007 row yet and is
   not released. Creating its row and releasing it are owner actions. This notice does not choose whether V-ENV
   is kept for the current traversal or narrowed to stable cooperative realms. The audit's unadopted CORE
   draft proposes the narrowing; the binding packet's owner-approved contract settles it.
3. **Release condition.** The hold stays until the binding packet is independently accepted. Under 006,
   that packet's counterexample corpus takes review 03's hop reproducers, including the form × pin probe
   ([pin-forms-probe.mjs](review-03/hop/pin-forms-probe.mjs)). Review 03 states the outcome required in
   either direction. A realm or startup check must resolve the dependency's free identifiers through the
   global environment and refuse on mismatch. This holds for a hardened check and for a cooperative wrapper.
4. **Ledger.** This notice is linked from the DESIGN-AUDIT-01 row of 007 only, because item 2 changes
   no other row. The K1.1 and K1.2-correction-01 rows carry no pointer to it.
5. **Nothing else follows.** There is no product, Layer-3 or BASELINE change. There is no merge,
   acceptance or successor release. K1.1-correction-03 keeps its scope and its V-D1 hold.

## Recording

The owner adopted this hold on 2026-10-02. The correction semantics and the binding packet's release
remain undecided.
