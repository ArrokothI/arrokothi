# K1.1 second independent cumulative review — H17

**Reviewer/session:** Anthropic Claude Code (desktop app), **Claude Opus 5** (`claude-opus-5`),
default reasoning. Session id `1ebd5a15-5fe5-4ff1-ad8c-055933987ec4`.
**Date:** 2026-09-15, America/New_York.
**Role:** second independent reviewer, requested by the owner. I did not implement C13 or H17.
I was told a first reviewer returned ACCEPT; I derived my own coverage before reading that record.

## 1. Exact binding, access and limits

- **Governing base B:** `777b9955fb3a443f700b4f3d1f4f2aef1869345b`
- **Payload C13:** `98d6cebcd5861e42c843fab65516829c8818bff8`
- **Candidate H17:** `d93d7d2a0a59b31b3d74ceebfb036837150f729e`
- **Contract:** `work/K1.1/contract.md` revision 5. **Report:** `implementation-17.md`.
- **Evidence:** `work/K1.1/validation-17/` (raw logs committed and readable, not digest-only).
- **Prior reviews:** `review-13.md` (`45402e08…`), `review-14.md` (ACCEPT, recorded at A `4309c3bd…`).
- **Policy baseline:** 006/007/008/012/015 as they stand at H17.

**Access:** full local clone with every branch and all immutable commits; working shell.
I obtained the full pinned source at H17 in a detached worktree and the cumulative `B..C13`
diff, not only the report or a truncated patch.

**Independently rerun** (not inspected) at exact H17: `npm test` equivalent
(**2,279 tests / 346 suites / 0 fail / 0 skipped**), kernel suite (**221 / 45 / 0 fail**),
architecture conformance (**362 / 37 / 0 fail**), `tsc --noEmit` (clean),
`check:builder-docs` (26 files / 286 links / 38 imports). All match the report exactly.
I also ran my own probe programs against the pinned source (below).

**Inspected only, not rerun:** the 8-ablation battery `09b-distinguishing-ablations.log` and the
X9 shared-global-position battery; the round-14/16 sealed records; log digests. Ablation
effectiveness is therefore *inspected evidence*, not my own re-execution.

**Not examined / out of scope:** E1 or any benchmark gate (none claimed); durability,
isolation and native-Driver fidelity (contract-excluded, K1.1-OPEN-6); `test:evals`
(correctly excluded — no Agent/model/eval path changes).

## 2. Independent coverage before the report

I derived obligations from `mental-model/mechanisms/creation.md`,
`mechanisms/execution-cycle.md`, `concepts/identity.md`, `concepts/values.md` and the
contract, then checked them against the source and by execution.

| Obligation | Distinguishing input I ran | Result |
|---|---|---|
| C1 three lost-response rows, conflict, fresh key, cross-caller | retry same key/content; retry with changed content; fresh key identical content; second namespace same key text | same Execution + **same receipt object**; `duplicate_conflict`; new Execution; no collision — **as specified** |
| C2 Input ID triple separation | same key text from two producers; same producer to two Executions | different Events, both `input_ingress` — correct |
| C2 hidden vs missing indistinguishable | out-of-scope destination vs nonexistent id | byte-identical refusal `{unknown_destination, position:0, executionId:null}` — correct |
| C2 creation key vs producer ingress key | `submitInput(requestKey = creationKey text)` | **DEFECT — see K11-R15-ID-01** |
| C3 all four limits, at-limit and one-over | 65,536/65,537 scalars (BMP and astral); 4,096/4,097 entries (array and object); depth 32/33 both empty-container and scalar-leaf forms; canonical 1,048,576/1,048,577 bytes | every edge exactly right |
| C3 JCS rules 3–6 | UTF-16 key order (`b` < `Ｚ` U+FF3A vs `😀` U+1F600 — ordered by leading code unit, not code point); `-0`,`1.0`,`1e21`,`1e-6`,`1e-7`,`5e-324`; C0 escapes; absent vs explicit null | all conform to `values.md` |
| C3 one observation; retained *is* what bound identity | accessor-bearing payload; re-canonicalize the retained structure; mutate the caller's object after acceptance | accessor refused `unrepresentable_member` with the getter **never invoked**; round-trip bytes identical; retained unaffected |
| C4 reservation ≠ acknowledgment; asynchrony | never-settling Driver on A, then dispatch B; inspect A | B dispatches; A's `acknowledged: []`, all 3 Events still `queued` |
| C4 bound handling / one unresolved Activation | `bound: 0`; second dispatch while unresolved | `invalid_batch_bound`; `exchange_unresolved` |
| C5 redelivery exact, no re-selection | accept a late Event, then redeliver | same activation id, epoch, batch and **identical receipt object**; late Event stays queued and out of batch |
| C6 retained evidence immutable | edit returned receipt/refusal; mutate retained payload through the inspection view | all frozen; writes throw; retained decision unchanged; payload frozen transitively |
| C9 inspection inert | tamper with the returned view (`state`, `queued`, `mailbox`) | fresh projection each call; retained state unchanged |
| C10 structural zone | reran landing-zone suite; counted zone files | 11 tracked `.ts`, single `.` export, `canonicalize` only; forbidden-edge controls reject against broken fixture repos, not an empty graph |
| 006 reference maintenance | anchor walk over the whole `mental-model/` tree at H17; `B..C13` documentation attribution | **two DEFECTS — K11-R15-DOC-01, DOC-02** |
| 006 C/H/A identity | `H17..A` file scope; 007 status row; post-A branch commits | **DEFECT — K11-R15-PROC-01** |

Reconciliation with the report and with `review-14.md`: the Kernel semantics the report
claims are real and I reproduced them. `review-14.md`'s per-criterion basis, however, is
predominantly "C13 preserves the reviewed C11 implementation byte-for-byte … remains green."
006 states that "section presence, unchanged bytes and green tests alone are insufficient" for
a PASS, and that a prior PASS is "historical disposition, not immunity for its subsystem." My
verdicts below rest on traces and counterexamples I ran, not on that inheritance. The three
findings below are all reachable only from the **`B..C13`** window; every round-15/16/17 scope
proof is anchored at `C11..C13`, which is why none of them surfaced.

## 3. Findings

### K11-R15-ID-01 — P2 — the initial input occupies a post-creation Input ID in the producer's own key space

**Where:** `packages/kernel/src/coordinator.ts` (`createExecution`, initial `InputId`
construction and `byInputId` seeding; `submitInput` replay/conflict branch).
**Governing source:** `concepts/identity.md#request-key-and-input-id`; contract K1.1-C2, C6.

Creation derives the initial Event's Input ID as
`(caller.namespace, executionId, creationKeyText)` and stores the entry under it. The
caller-scoped creation key and the Input ID triple are two different scoping constructs in
`identity.md`; nothing reserves the creation-key text inside the producer's ingress key space
for that destination. Two observable consequences, both reproduced on H17:

1. Same producer, `requestKey = "k1"` (its creation key), content equal to the initial input:
   `submitInput` returns `ok` with `receipt = {boundary: "creation", token: "crt:…:1", position: 1}`,
   `replayed: true`. C6 says "no receipt from one boundary is returned for another."
2. Same producer, `requestKey = "k1"`, **different** content: permanently refused
   `duplicate_conflict` — *"input key \"k1\" from this producer already names Event … with
   different content; input identity is immutable"* — for an input this producer never
   submitted through ingress. Its own key name has been consumed by creation.

No contract decision records this (K1.1-DEC-1…6 do not mention it) and no test covers it: no
case in `packages/kernel/tests/` combines the creation-key text with `submitInput`'s
`requestKey`. C6's symptom disappears if the key-space overlap is closed, so I score C6 PASS
and C2 FAIL rather than counting one defect twice.

**Required outcome:** one coherent answer, then distinguishing cases for both collisions above.
Either give the initial Event an Input ID a post-creation producer key cannot construct, or
record an explicit contract decision reserving that key text for that destination and qualify
C6's receipt-boundary sentence to match. Both are in scope; neither is prescribed.

### K11-R15-DOC-01 — P1 — undeclared Layer-1/2 documentation in the cumulative candidate, contradicted by the packet's own records

**Where:** `B..C13`, `mental-model/kernel.md`, `mental-model/runtime.md`,
`mental-model/deployment.md` (and `driver.md` cumulatively).
**Governing source:** 006 "Maintaining the mental-model reference" and "Git and artifact
handoff" ("Review the cumulative base-to-candidate diff on every round"); 008 reference
maintenance ("any justified Layer-1/2 change"); AGENTS.md.

`B..C13` changes six `mental-model/` files. Two are properly declared in `implementation-01`
(`README.md` Layer-1 note, `mechanisms/evidence.md` Layer-3 structural-evidence section) — no
issue there. The other three entered the packet branch through owner commits
`613bad94ae0d09bd16c772139d0e945461df53da` (`update-doc`) and
`fa5cba36a2a0ebcde2659f8a01dc85864b06b2ff` (`improve-kernel.md`), both ancestors of C8 and C11.
`kernel.md` is a substantial Layer-2 rewrite: new "What it doesn't own" and "Recovering after a
crash" sections, new durability/recovery narrative, reworked lifecycle prose.

The records deny this. `implementation-02`: "**Layer 1:** no change. **Layer 2:** no change."
`implementation-03`: "**Layer 1/2:** no change." `implementation-08`/`-09`: "no Layer-1/2
change is claimed." `implementation-17` §Reference maintenance: "**No Layer-3 owner changed by
this packet** … The only documentation touched besides this packet's own records is the K1.1
prose/row in `007-work-packets.md`."

This is the **K11-R14-PROC-01 family** — undeclared documentation inside the candidate tree,
reported as absent — which round 17 records as CLOSED. It survives because every round-15/16/17
proof measures `C11..C13`; `validation-17/MANIFEST.md` and logs `00`/`01` contain no
base-anchored path set. A reviewer binding ACCEPT to H17 therefore accepts Layer-1/2
architecture text that no report justifies and that four reports state is absent.

**Required outcome:** enumerate every non-record documentation path in `B..C`, classify each as
packet maintenance or declared retained owner payload, justify each Layer-1/2 change under 006
or revert it, and anchor the scope guard's path proof at the declared base rather than at the
previous payload. No Kernel bytes are implicated.

### K11-R15-DOC-02 — P2 — broken canonical cross-reference introduced by the candidate

**Where:** `mental-model/concepts/core.md:15` → `../README.md#a-report-that-needs-publication`.

At B the heading is `## A report that needs publication`. At C13 (via `d1f85e55…`, `all-doc`) it
is `## Example: A report that needs publication`, so the slug is now
`example-a-report-that-needs-publication` and the link does not resolve. I walked every link and
anchor in the H17 `mental-model/` tree: this is the only broken one, and it is a regression from
base. `npm run check:builder-docs` reads `docs/guides` only (26 files) and never inspects
`mental-model/`, so no packet gate can catch it. 006 requires index/link/example validation for
accepted-work reference maintenance.

**Required outcome:** repair the reference (or the heading) and put `mental-model/` under an
actual link/anchor check so this class is mechanically caught rather than re-reviewed by eye.

### K11-R15-PROC-01 — P1 — `H..A` carries payload, and no verdict reaches the status owner

**Governing source:** 006 §"Git and artifact handoff" step 4 ("Verify H..A contains only the
exact verdict/status transcription"); 006 §"Authority and records" ("One authoritative status
lives in the table in 007"); 006 §"Maintaining the mental-model reference" ("Documentation
content remains payload … rather than being smuggled into H..A").

- `H17 d93d7d2…` **..** `A 4309c3b…` contains `9893376143395c0345b8d931e3a65ecfc3db2fe8`
  (`branch-cleanup`, owner-authored), which rewrites `mental-model/driver.md` — a canonical
  Layer-2 page, adding normative mediated-tool text and changing a cross-reference. That is
  payload inside the administrative window.
- A adds only `review-14.md`. The single authoritative K1.1 row in
  `docs/development/007-work-packets.md` still reads `WAITING_FOR_REVIEW` and does not link
  `review-14.md`. No verdict has reached the status owner.
- The branch has moved further past A: `1aa2de1ff…` (`driver-doc-complete`, `driver.md` again)
  and tip `7af27bd3b…` (`restore-doc`), which restores the `doc-improve` versions of 30
  `mental-model/` files — **−1,630 / +550 lines relative to H17**. The tip tree is not the
  accepted tree and is not any reviewed candidate.

To be fair to the first reviewer: `review-14.md` spotted `9893376`, excluded it explicitly, and
warned against describing the tip as accepted. The finding is not a mis-binding. It is that the
branch as it stands cannot be merged as "accepted K1.1", and that the accepted candidate's
administrative closure is incomplete.

**Required outcome:** keep A's H17 binding untouched. Move the post-H17 documentation into a
declared payload commit with new C/H and independent review under 006's documentation-is-payload
rule, and transcribe an authentic verdict into the 007 row.

## 4. Prior findings carried

`K11-R12-ID-01` — **remains CLOSED.** Verified independently, not inherited: receipt tokens are
`prefix:owningExecution:position`, acceptance order lives on `ExecutionRecord.nextAcceptancePosition`
(creation 1; replay/redelivery consume none), refusals use a separate per-Execution index and
carry position 0 when naming no Execution. Execution and Event identities are pure functions of
the request identity. No coordinator-wide counter exists in `coordinator.ts`.

`K11-R10-EVID-01` — **remains CLOSED.** The `01` inventory is self-consistent at H17 and the
gate fails closed.

`K11-R14-PROC-01` — **REOPENED as K11-R15-DOC-01** for the `B..C13` window. The `C11..C13`
window it was closed on is genuinely clean; the window was too narrow.

Earlier value, serializer-window, own-array, descriptor, scope, replay, dispatch and
evidence-immutability findings remain closed; I re-derived the behaviours they protect by
execution rather than by reading their dispositions.

## 5. Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.1-C1** | **PASS** | All three lost-response rows, conflict, fresh-key and cross-caller cases executed; replay returns the identical receipt object; non-text identity fields refused as located `malformed_value`; scope text validated before authorization. |
| **K1.1-C2** | **FAIL** | Triple separation, terminal-before-capacity ordering, hidden/missing identity and capacity refusal are all correct — but the creation key silently occupies the producer's ingress key space for that destination (K11-R15-ID-01), with no decision record and no test. |
| **K1.1-C3** | **PASS** | All four limits verified at and one over, in both container shapes; JCS rules 3–6 verified including UTF-16 key order and `Number::toString` spellings; accessor payloads refused without invoking the getter; retained structure re-canonicalizes to the accepting bytes; caller mutation after acceptance changes nothing. |
| **K1.1-C4** | **PASS** | Intent recorded before send; reservation acknowledges nothing (`acknowledged: []`, all Events still `queued`); one observation of `bound` drives validation, refusal and selection; `bound: 0` refused; second dispatch refused `exchange_unresolved`; a never-settling Driver on one Execution does not block another. |
| **K1.1-C5** | **PASS** | Redelivery preserves activation id, epoch, base revision, batch and the identical receipt object; an Event accepted after reservation stays queued and out of the batch. |
| **K1.1-C6** | **PASS** | Receipts and refusals frozen at their single mint; caller edits throw and change no retained decision; replay returns the original object. The `boundary: "creation"` answer from `submitInput` is scored under C2, since it is that defect's symptom, not a separate one. |
| **K1.1-C7** | **PASS** | `submitOutcome`/`requestTakeover`/`recoverExecution` name K1.2, `cancelExecution` names K1.3; all throw the K1.0 `UnsupportedKernelSurfaceError` and mutate nothing. |
| **K1.1-C8** | **PASS** | No discriminator in the zone's executable text or exported types; `boundary.test.ts` enforces it mechanically and the architecture suite passed on my rerun. |
| **K1.1-C9** | **PASS** | Inspection is a fresh projection that exposes the retained payload, disposition and receipt objects themselves; tampering with a returned view changes nothing; scoped identically to C6; `acknowledged`/`terminalDispositions` honestly empty. |
| **K1.1-C10** | **PASS** | 11 tracked zone files, single `.` export, `canonicalize@3.0.0` the only third-party specifier, package private; forbidden-edge controls reject direct, type-only and barrel imports against broken fixture repositories. |

No criterion is DEFERRED. No architecture decision is blocked: every finding is resolvable
inside the settled contract, except K11-R15-ID-01, whose *choice* between two shapes is the
implementer's to make and record under 007's routine-choice rule.

## 6. Compact correction handoff (008)

```text
Correct the same released packet K1.1 on codex/k1.1-create-reserve-async-dispatch.
Base 777b9955fb3a443f700b4f3d1f4f2aef1869345b; reviewed H d93d7d2a0a59b31b3d74ceebfb036837150f729e;
review record docs/development/work/K1.1/review-15.md.
Open findings K11-R15-ID-01 (P2), K11-R15-DOC-01 (P1), K11-R15-DOC-02 (P2), K11-R15-PROC-01 (P1);
required outcomes and counterexamples are in that record.
Owner supplemental decisions: none; unresolved authority: none.
Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the
whole cumulative packet from the declared base, not from the previous payload.
Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

## 7. Verdict

Acceptance is bound to no commit by this review. `review-14.md`'s ACCEPT of H17 stands as its
own historical record; this second review reaches a different outcome on the same candidate and
does not certify A `4309c3bd…`, `9893376…`, `1aa2de1…` or the tip `7af27bd3…`. K1.2 remains
unreleased; `next_release: none`.

CHANGES REQUIRED
