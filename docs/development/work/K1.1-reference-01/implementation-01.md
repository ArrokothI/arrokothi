# K1.1-reference-01 — reference maintenance candidate

## Identity and role

- Date: 2026-09-15; GPT-6 owner-delegated final-cleanup session, also author of this documentation
  supplement. This session cannot independently accept these edits.
- [Contract](contract.md) revision 1, REF-1–REF-5. Owner authority: final-cleanup instruction
  explicitly requests missing reference material as a new reviewed C/H; no K1.2 release.
- Base A: `519ba002378707a4deccff1ea0a243d21eb694b7`.
- Scope/anchor decision committed before reference prose: `e46c77299855e8d0d163bfb2d8f7243c5821d23a`.
- Payload C: `2dc3cedb02888d891ec0a6389439b7cfb3b07943`.
- H: the commit containing this report; full SHA supplied in external handoff and subsequent
  cleanup record. Branch: `codex/k1.1-correction-01-review-findings`.
- Accepted implementation H5: `52b1600f3b42e3a360fdc3395178f1d147edf304`; payload C4
  `56164092d128c6767f501962174ac81c6363af9e`; original B
  `777b9955fb3a443f700b4f3d1f4f2aef1869345b`. [Independent ACCEPT](../K1.1-correction-01/review-08.md)
  recorded at `b1050133b2b684065251b7b4b7f508e95e771bef`, faithfully transcribed at A.
  No invalidation of that ACCEPT is asserted.
- Governing 006/008/012 at A are byte-identical to original B. Prerequisite K1.0 integration
  remains PR #21 `9baff3a03662720af6eefe1ecfabc41fde99298f`, with receipts reconciled in
  PR #26 `05f48c204d1eae021b3464c206e5c11e84bb3505`; this supplement adds no runtime prerequisite.

## Why a separate candidate

The frozen H5 reference defines the two request-key scopes but omits the accepted explicit rule
that creation must not consume a later Input ID. It also lacks a canonical account of the accepted
TypeScript representation/capture boundary. Its delivery-status paragraph still says independent
acceptance is pending. Required reference maintenance is payload under 006; it cannot be hidden
in H5..A or certified by the implementation's ACCEPT. The new bounded contract records the
owner-requested prospective scope exception before these edits. H5 still satisfies its original
D freeze; the new document candidate has its own review obligation.

## Cumulative payload accounting, A→C

| Path | Layer / disposition and source |
|---|---|
| `mental-model/concepts/identity.md` | Layer 3; KC1-DEC-1 domain separation, plus link to existing delivery mechanism |
| `mental-model/concepts/values.md` | Layer 3; accepted K1.1 C3 and KC1-DEC-3/6 in-process representation/capture, with refusal and containment limits |
| `mental-model/mechanisms/creation.md` | Layer 3; small reuse/replay/conflict example deriving from identity owner |
| `mental-model/mechanisms/execution-cycle.md` | Layer 3; evidence/status paragraph only; delivery mechanism bytes otherwise unchanged |
| `mental-model/reference.md` | Navigation to value capture and existing delivery mechanism |
| `mental-model/roadmap.md` | Reference supplement ownership and separate review dependency |
| `mental-model/sources.md` | Accepted-source provenance and independent-review dependency |
| `docs/development/002-implemented-kernel-baseline.md` | Current implementation status; accepted H5 distinct from pending integration |
| `docs/development/007-work-packets.md` | New supplement scope and IN_PROGRESS status; historical D rule kept with prospective exception locator |
| `docs/development/work/K1.1-reference-01/contract.md` | Bounded documentation contract, authority, anchors and five criteria |

Exactly ten paths, all declared. No Layer-1/2 bytes change. No packages, tests, scripts, examples,
configuration, dependency, historical implementation/review/decision or raw evidence bytes change.
C→H allowlist: this report, `validation-01/` (three raw logs plus manifest), and 007's supplement
status row only. No new validator script or test is introduced in H: the inline command program
is printed in its raw log to make the executed check inspectable.

## Coverage and semantic self-check (author assessment, not ACCEPT)

| Criterion | Result and distinguishing basis |
|---|---|
| REF-1 | PASS in self-check: same producer/key text after creation is fresh ingress; later equal-content ingress replays its own receipt, changed content conflicts. Traced coordinator creation `byInputId` initialization and ingress lookup, identity types, and existing ingress tests at lines 209–283. No Event/receipt duplication on creation retry. |
| REF-2 | PASS in self-check: capture/encode and accepted values tests support one snapshot, plain/null-prototype objects, dense arrays, explicit refusals, serializer restoration. The added prose separates envelope own-accessor observation from value-member accessors, and in-process representation from wire decoding. No stronger arbitrary-code/process-survival claim. |
| REF-3 | PASS in self-check: only execution-cycle's status paragraph changes. Undefined-only return, explicit first report, no returned-value observation, bounded diagnostics, attempt-local late reports and K1.2/K1.3/K5 ownership are retained verbatim. |
| REF-4 | PASS in self-check: dependency matrix below; 57 canonical/guide Markdown files, 847 local links/anchors, 38 imports pass repository checker; 28 added links/anchors pass the supplemental check. Mechanically valid links do not prove semantic fidelity. |
| REF-5 | PASS in self-check: clean-C scope output lists the ten declared paths; executable, Layer-1/2 and historical record comparisons empty. C/H allowlist separately checked before commit. Independent acceptance remains outstanding. |

### Incoming and outgoing dependencies checked

| Owners checked | Consequence / maintenance decision |
|---|---|
| core, identity, values, creation | Creation Event remains trusted application input; identity domain changes neither category nor destination. Receipts remain boundary-specific; equality and four limits unchanged. Canonical clarification added only to identity/values and a linked example to creation. |
| execution-cycle, waits, lifecycle | Reservation acknowledges nothing; newly accepted ingress cannot replace an already pinned batch. No empty-batch, terminal transition, wait or late-lifecycle implementation claim added. Existing delivery mechanism retained. |
| state concepts, recovery, integration | Accepted progress remains absent in K1.1; native retry permission and stale-writer exclusion still require their own proof. Integration already links delivery reporting; no further edit needed. |
| authority, resources, output | Key reuse does not grant authority, dispatch reporting does not prove action/output delivery, and value validation is not physical containment. These obligations remain unchanged; values links resource containment explicitly. |
| evidence, reference, roadmap, sources | Retained receipt scope remains separate from native success and benchmark gates. No retention-policy change or new universal term. Navigation/provenance updated; evidence mechanism needs no new rule. |

The missing prose is faithful documentation of accepted decisions, not a newly chosen wire schema,
token format, persistent profile or Runtime algorithm. No unresolved design is silently selected.
No intentional placeholder is filled for K1.2+, R1, K3, K5 or D1.

## Validation and limits

[Raw logs and SHA-256 manifest](validation-01/MANIFEST.md) pin clean C and command/environment.
All new documentation checks exit 0. Runtime suites and ablations were **not rerun**: executable
bytes match accepted H5. All 12 original validation-05 digests verified; their inspected final
results include full suite 2322/356/0, conformance 1949/283/0, kernel 264/55/0, SDK 22/0,
architecture 362/37/0, focused 50/8/0, and nine rejecting ablations. Those numbers remain the
implementer's Node 25.2.1 evidence, not this session's reruns.

The authentic reviewer reran on Node 22.22.3 and documented two cancelled legacy Effect tests,
reproduced at original B. Preserve that owner observation; no broad all-supported-Node green claim.
No E1, native Driver, persistence, isolation, Agent evaluation, package publication or K1 closure.
No third-party material was copied/adapted, no dependency added; existing exact canonicalize@3.0.0
reuse and obligations remain in the accepted implementation's records.

Remote main inspected: `07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec`; its tree equals the branch's
common ancestor `a8ac787b2a766d897c7bd85311c1b2aee53a1ca8`. Thus it introduces no conflicting or
review-invalidating content beyond that common ancestor. No merge performed. Push verification
belongs in the final handoff; this report does not claim a future push.

## Fresh independent-review handoff

Review K1.1-reference-01 on `codex/k1.1-correction-01-review-findings` from base A
`519ba002378707a4deccff1ea0a243d21eb694b7` to the commit containing this report, over C
`2dc3cedb02888d891ec0a6389439b7cfb3b07943`. Apply REF-1–REF-5 cumulatively; verify the explicit
prospective scope decision, accepted source mapping, related owners and exact C/H allowlist.
Implementation H5 remains independently accepted. Do not accept these new paragraphs merely
because H5 was accepted. This author cannot provide the required independent verdict.

Status: WAITING_FOR_REVIEW. Integration and final cleanup closure are held for this separate
reference review; `next_release: none`.
