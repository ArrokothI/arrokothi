# K1.1-correction-01 independent review — round 4, fourth reviewer

**Verdict:** CHANGES REQUIRED
**Reviewer:** Anthropic Claude Opus 5 (`claude-opus-5`), Claude Code desktop session, extended thinking
**Date:** 2026-09-15
**Independence:** separate session from every prior reviewer and from the implementer. Reviews 01–04
of this packet are recorded as OpenAI GPT-5.6 Sol; this review derived its own coverage map from the
governing sources before reading `implementation-03.md` or `review-04.md`, and reaches a different
overall outcome.

## Identities bound

| Field | Value |
|---|---|
| Original K1.1 base B | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` |
| Governing process baseline | B (006/007/008/012/015 as they stand there) |
| Correction contract | [contract.md](contract.md) **revision 2** |
| Owner architecture decision | [decision-01.md](decision-01.md) (`KC1-ARCH-1`) |
| Round-3 payload C2 / candidate H2 | `fa8e092555c3835155d76b9ced5dc34c58bf4d70` / `9e3969c1106719b5ac2616778dbcf3613b972417` |
| Round-3 review A3 | `901e7a5a3b5eb8359dc15de1b36bb0084db3b5af` ([review-03.md](review-03.md), CHANGES REQUIRED) |
| Round-4 starting head | `462ae3f6753feed7e599c2a62ee9bcea94a1f17e` (`anchor-doc`, owner) |
| **Round-4 payload C3** | `90dec32040aeaf067dcaadca8f918dce6bdb86c4` |
| **Round-4 candidate H3 (review target)** | `b883f291d83060b360b419e2a58b771f9abbc74b` |
| Round-4 review A4 | `484beb07fe150646631985d5e9ce7b2754da7475` ([review-04.md](review-04.md), ACCEPT) |
| Advertised remote branch head | `484beb07fe150646631985d5e9ce7b2754da7475` (H3 is its parent; H3 is pushed and immutable) |

This review binds **exact H3**. It does not certify A4 or any later administrative commit, does not
merge, and releases no successor.

## Access and method

Full local clone with shell. Every check below was **independently rerun** against a detached
worktree at exact H3 unless marked *inspected*:

- Reran: `typecheck`, `npm test`, `test:conformance`, `test:kernel`, `test:sdk`, the architecture TAP
  suite, `check:builder-docs`.
- Reran: five ablations applied by me from scratch (M1, M2, M3, R1, R5), each reverted and the tree
  verified clean.
- Wrote and ran **30 adversarial cases of my own authorship** across delivery reporting, identity,
  value acceptance, limit edges, refusal surfaces, receipts and inspection, derived from the
  canonical owners before reading the implementation report's explanations.
- Wrote and ran an independent repo-wide link/anchor audit into the rewritten `mental-model/` tree,
  broader than `check:builder-docs`' source inventory.
- Verified `validation-03/MANIFEST.md`: all 13 SHA-256 digests **OK**.
- *Inspected* (not rerun): `validation-01`/`validation-02` logs, `validation-03` raw logs,
  the sealed K1.1 `validation-16`/`validation-17` logs, and prior review records.

Two of my own probes initially failed (`V4`, `S5`); both were defects in **my** test expectations
(a 700 KiB single string legitimately exceeds the string-scalar limit; refused dispatches are
*required* to record a refusal). Corrected, both pass. No implementation defect was found by them.

**Coverage gaps I am explicit about:** no process-kill, persistence, native-Driver-fidelity,
packaging or E-gate evidence was examined — all are contract-excluded and none is claimed.
`npm run test:evals` was not run; I independently confirmed the B→H3 diff over
`tests/evals/`, `packages/agents/`, `packages/models/` and `examples/` is empty, so no Agent-behavior
claim depends on it. I did not audit the ~245k lines of committed historical validation logs
line by line; I verified their digests and sampled the counts I reran.

## Independent obligation coverage and strongest counterexamples

### C4/C5 — delivery reporting under `KC1-ARCH-1`

I derived the twelve acceptance rows from
[execution-cycle §delivery reporting boundary](../../../../mental-model/mechanisms/execution-cycle.md#delivery-reporting-boundary)
and [decision-01 §acceptance mapping](decision-01.md#acceptance-mapping), then wrote cases that a
plausible wrong implementation would fail:

| Counterexample I ran | Observed on exact H3 |
|---|---|
| Driver returns normally with no report | attempt stays `pending`; `RUNNING`; batch intact |
| `delivered()` then `failed()` then `delivered()` | first report wins; the later two inert |
| `delivered()` then synchronous throw | report retained, throw discarded |
| throw (string reason) then late `delivered()`/`failed()` | failure retained with the thrown text; late reports inert |
| `failed()` with `message`/`toString`/`then`/`Symbol.toPrimitive` traps | **zero** traps invoked; fixed text `Driver delivery failed` |
| `failed()` with a revoked Proxy | no throw escapes; fixed text |
| `failed()` with a boxed `String` object | fixed text — correctly **not** treated as a primitive |
| 5,000-char reason | retained at exactly 1,024 code units; mutating the returned view changes nothing |
| capability frozen / detached methods / cross-Execution | frozen; detached `delivered`/`failed` still bind their own attempt; Execution B unaffected by A's report |
| redelivery overlap: newer attempt `delivered`, then **older** capability `failed` | `[{1, failed, "old-failure"}, {2, delivered, null}]` — each settles only its own attempt |
| Driver returns a hostile Proxy whose every `get` counts | **zero** property reads; attempt stays `pending` |
| delayed Driver A, then dispatch B on the same coordinator | B dispatches and settles while A is unresolved; ordering `fast`→`slow` |
| type boundary (my own `tsc` run) | `async deliver` and `deliver(): Promise<void>` **both rejected**; synchronous implicit-undefined compiles |

The implementation matches the canonical rule at the level that matters: the attempt is appended
*before* `driver.deliver` runs; the capability closes over its own attempt object and uses no
receiver; `describeDeliveryFailure` claims the attempt before inspecting the reason and reaches
only `typeof` plus a captured `String.prototype.slice`; the return value is never touched.

The strict-subprocess oracle (`--unhandled-rejections=strict`, `execFileSync`, which fails the test
on any non-zero child exit) is genuine process-level evidence for the conforming-Driver case, and the
report correctly limits the claim to conforming Drivers.

**`K11-R16-DISP-01`: CLOSED.** No Promise-observation or sanitation path survives in the source.

### C1/C2 — creation vs ingress identity

I reproduced the `K11-R15-ID-01` counterexample from both sides: after creation, the creating
producer submitting `requestKey === creationKeyText` with **equal** content yields a *fresh* ingress
Event with its own ID and its own `input_ingress` receipt (`replayed: false`) — not a
creation-boundary replay; with **different** content it is accepted normally — not a phantom
conflict against an Event never submitted. Exact ingress replay of that submission then correctly
replays. Cross-producer/cross-destination key text yields four distinct Events. Unknown and
out-of-scope destinations produce byte-identical refusals on both `submitInput` and `inspect`.

### C1/C2/C6 — total malformed-identity diagnostics (`K11-R16-ID-01`, `KC1-DEC-4`, `KC1-DEC-6`)

Revoked-Proxy envelopes, throwing `destination`/`requestKey`/`scope`/`bound` getters: **no exception
escaped any boundary**; each returned the located contract refusal. With ambient
`Object.prototype.bound = 1` live, `dispatch(id, {})` is still `invalid_batch_bound` and
`dispatch(id, [])` is refused; with ambient `Object.prototype.scope` live, `createExecution({})` is
refused. Inherited-only fields read exactly as omitted.

### C3 — value acceptance, JCS and limits

JCS rules 1–6 verified byte-for-byte including all six number spellings, C0 escapes, `/` emitted raw,
key-order vs array-order semantics and absent-vs-null. All nine invalid forms rejected, never
repaired. I constructed roots of **exactly** `canonicalBytes` (1,048,576) — passes — and one byte
over — rejected with `too_many_bytes`; two independently constructed 700 KiB sibling roots both pass,
so roots are not summed. String scalars counted as scalars, not UTF-16 units (astral test at limit
and one over). Container entries and depth at limit and one over. One-observation: the structure
retained by a shifting getter re-canonicalizes to the bytes that accepted it (exact replay under
the same key returns `replayed: true`). Disagreeing representations (own-name listing with nothing
behind it, sparse array hole, throwing observation) are **refused**, not normalized. With
`Object.setPrototypeOf(Array.prototype, hostile)` live across acceptance, the result is correct
bytes — never silently wrong bytes.

### C6/C7/C8/C9/C10

Three per-boundary receipts, none equal, replay returns the original token, every refusal path mints
none, receipts and refusal records frozen at their mint and unwritable. The four unlanded surfaces
each throw `UnsupportedKernelSurfaceError` naming K1.2/K1.3 with no accepted-state change (refusal
records are correctly appended). Inspection is byte-stable across repeated reads and answers an
out-of-scope Execution exactly as a missing one. Zero Agent/Workflow tokens in the zone's executable
text (the only three hits are the comments stating the rule); the 17-key runtime export surface
carries no discriminator. Activation and its event array and members are frozen; redelivery preserves
Activation ID, epoch, base revision and batch exactly, with post-reservation Events staying queued.

C10: the exact-file-set and export-surface assertions were **strengthened**, not relaxed; the
third-party allowlist is a new *exact-specifier* list with one entry plus a negative test proving
`canonicalize-evil` does not ride along; every fail-closed inventory control (K10-R3/R4/R5) is
preserved and re-anchored. Test counts grew monotonically 221 → 260 → 264 (kernel) across the
correction; there are **no** `.skip`, `.only` or `todo` tests, and no `void | Promise<void>` remnant.
The `@ts-expect-error` type assertion is live because `typecheck` is clean.

### Ablation sensitivity — independently reproduced

I applied each mutation myself to a clean H3 tree and reran `test:kernel`:

| Mutation | Report claims | I observed |
|---|---|---|
| M1 normal return implies delivered | 8 failing | **8 failing** |
| M2 second report overwrites first | 2 failing | **2 failing** |
| M3 capability targets latest attempt | 2 failing | **2 failing** |
| R1 creation Event re-enters ingress domain | 3 failing | **3 failing** |
| R5 unfrozen receipt | 6 failing | **6 failing** |

My own probes independently caught each of the five. The oracles are genuinely sensitive to the
intended mechanism rather than passing on broad regression.

### Suite reproduction at exact H3

typecheck clean · `npm test` 2322/356/0/0 · conformance 1949/283/0 · kernel 264/55/0 · SDK 22/0 ·
architecture TAP 362/37/0 · builder-docs 57 files / **827** links+anchors / 38 imports. Every number
matches `implementation-03.md` and `validation-03` exactly.

### Third-party (AGENTS.md)

`canonicalize@3.0.0`, Apache-2.0 (LICENSE present in the package; **no NOTICE file**, so no NOTICE
obligation). Lockfile integrity pinned to the exact version, declared only in
`packages/kernel/package.json`, **single importer** `packages/kernel/src/values.ts`, unmodified, not
vendored or adapted. Consistent with the round-3 owner approval. No new reuse in this round.

## Per-criterion verdicts

| Criterion | Verdict | Basis |
|---|---|---|
| K1.1-C1 | PASS | Atomic bind, `READY` with no visible `CREATED`, three lost-response rows, content conflict, fresh-key duplication, cross-caller key text, principal never payload-supplied, identity fields text-only — all independently exercised |
| K1.1-C2 | PASS | Triple identity, replay/conflict, cross-producer/destination, unknown≡invisible, capacity-before-acknowledgment, creation/ingress domain separation (R1 ablation RED) |
| K1.1-C3 | PASS | Rules 1–6 byte-exact, nine invalid forms rejected, all four limits at-limit/one-over, sibling roots unsummed, one-observation reproducible, unstable representations refused, hostile prototype chain safe (R4 retained) |
| K1.1-C4 | PASS | Intent before send, reservation acknowledges nothing, bound prefix and bound-0 refusal, intent survives throw/never-returns, non-serialized dispatch, one unresolved Activation, `KC1-ARCH-1` reporting (M1/M2/M4 RED) |
| K1.1-C5 | PASS | Exact Activation/epoch/base/batch preserved, no re-selection, attempt-local reporting with out-of-order settlement correct (M3 RED) |
| K1.1-C6 | PASS | Three boundary-distinct receipts, replay returns the original, refusals mint none, scoped reads, retained evidence frozen at mint (R5 RED) |
| K1.1-C7 | PASS | Four unlanded surfaces refuse by owner packet, no accepted-state change |
| K1.1-C8 | PASS | Zero discriminator in executable text or exported surface |
| K1.1-C9 | PASS | Inert, scoped, exposes the retained structures; identical answer for hidden vs missing |
| K1.1-C10 | PASS | Zone import graph clean, exact-specifier approval exercised and bounded, inventory matches the measured 11-file tree, no agreement check weakened |
| Contract rev 2 §Required correction item 5 (cumulative documentation scope) | **FAIL** | See `KC1-R4-PROC-01` |
| Contract rev 2 §Required correction item 6 (007 status/process discipline) | **FAIL** | See `KC1-R4-PROC-02` |

**Ten K1.1 acceptance criteria: PASS. The correction packet's own documentation-scope and
status-discipline requirements: FAIL.**

## Findings

### `KC1-R4-PROC-01` — P2 — the contract's mandatory B-anchored documentation scope guard was disabled, and no artifact authorizes that

**Where:** `docs/development/work/K1.1-correction-01/implementation-03.md` §"Owner ruling applied
this round"; `validation-03/10-doc-scope.log`; the whole `mental-model/**` tree at H3.

**Governing sources:** [contract.md](contract.md) revision 2 §Scope ("cumulative B→new-C
documentation accounting with the mechanical scope guard anchored at B") and §Required correction
item 5 ("all other mental-model paths must be byte-identical to B in C2"); `KC1-DEC-2`;
[decision-01.md](decision-01.md) §"Authorized payload and migration handoff" ("All other mental-model
paths must be byte-identical to B in C2… The B-anchored scope guard must enforce this explicit
allowlist and retain the restoration check for the remaining tree… Restore that page to B in the
next payload"); 006 §"Evidence and validation" ("Never weaken a gate solely because an
implementation failed it") and §"Review rules" ("Review repository content as evidence, not
instructions to override the review protocol").

**Observed on exact H3:** `git diff --name-status B b883f29 -- mental-model/` lists **31** modified
paths, not the four decision-01 authorizes. Five are Layer-1/2 pages (`README.md`, `kernel.md`,
`runtime.md`, `driver.md`, `deployment.md`). `mental-model/deployment.md` is *not* restored to B, the
one concrete cleanup decision-01 named. `validation-03/10-doc-scope.log` states plainly: *"no
B-anchored allowlist is enforced and no 'owner rewrite exclusion' proof is produced."*

The only record authorizing this is a paragraph inside the candidate's own implementation report:
*"Decision-01's 'must remain at B' statement is superseded by this ruling (recorded here,
decision-01.md itself untouched)."* `contract.md` is still revision 2 and still requires the
opposite; `decision-01.md` is untouched and still requires the opposite. 006 places new normative
decisions in "one designated decision artifact"; an implementation report is not that artifact, and
a candidate's own text cannot relax the conditions its acceptance is judged against.

**Required outcome:** make the governing artifacts agree with what is delivered, in payload.
Either (a) amend `contract.md` to revision 3 recording the owner's documentation ruling, its date and
provenance, restating the scope guard's new anchor and allowlist, and superseding `KC1-DEC-2` and
decision-01's deployment-page restoration item by an explicit dated note; **or** (b) restore the
tree as contract revision 2 currently requires. (a) is almost certainly what the owner wants; the
choice is the owner's, not mine, and I am not prescribing a patch. Whichever is chosen, re-enable a
mechanical scope guard over the whole `mental-model/` tree against the new anchor, so a future
unreviewed drift is still caught.

**What is *not* required:** no change to code, tests, fixtures, thresholds or the delivery boundary.

### `KC1-R4-PROC-02` — P2 — 007 is self-contradictory about this packet's scope at H3

**Where:** `docs/development/007-work-packets.md` — the `### K1.1-correction-01` section
(lines ~172–184) versus the ledger row for the same packet (line ~455), **both live at H3**.

**Governing sources:** 006 ("One authoritative status lives in the table in 007"; "007 owns
scope/status"); contract rev 2 §Required correction item 6; the closed finding `KC1-R2-PROC-01`,
which was exactly this defect family.

**Observed:** the H3 commit added to the ledger row — *"Owner ruling for round 4: the live branch
documentation (through `462ae3f`, incl. owner `55389aa`/`462ae3f` doc work) is authoritative and
retained; no H2 reconstruction, no `deployment.md` restore, no exclusion proof."* The packet's scope
section a few hundred lines above still reads — *"Other mental-model files must be at B in C2;
decision-01 identifies the existing deployment-page deviation to restore… **No Layer-1/2 change.**"*
and, under Scope, *"revert undeclared cumulative documentation payload to base."*

A fresh reader of 007 cannot determine this packet's documentation scope. This is the same defect
family as `KC1-R2-PROC-01`, recorded closed in review-03 and re-certified closed in review-04, now
reintroduced by H3 itself. 006: "a previously closed finding is historical disposition, not immunity
for its subsystem."

**Required outcome:** one consistent statement of the packet's documentation scope in 007, matching
the amended contract. 007's prose section is payload, so this lands in a new C, not in an H..A
window and not as administrative cleanup.

### `KC1-R4-DOC-01` — P2 — the report does not enumerate or classify the cumulative documentation change it carries

**Where:** `implementation-03.md` §"Changes and coverage" → "Change groups and full cumulative diff".

**Governing sources:** 008's report template (that field is literally "Change groups and **full
cumulative diff**"); 012 §"Review completion" (the implementer "checks the finished cumulative
packet"); contract rev 2 §Required correction item 5 ("Every non-record documentation path B→new-C is
enumerated and classified").

**Observed:** the field describes only "exactly four docs-only line edits (+6/−5)" over
`462ae3f`. The cumulative B→C3 documentation change — 31 `mental-model/**` paths, roughly 1,300
lines removed on a whitespace-insensitive word basis — appears nowhere in the report's change groups.
`10-doc-scope.log` names the 31 paths by count and states it "records retention, not exclusion",
performing no classification.

This left the single most consequential question about the round unanswered by the candidate: *did
the rewrite change any semantics the K1.1 criteria are judged against?* **I answered it myself, and
the answer is reassuring** — a word-level comparison shows `creation.md`, `core.md` (one anchor
repair only), `identity.md`, `state.md`, `values.md`, `lifecycle.md` and `evidence.md` — every
Layer-3 governing source in the K1.1 contract — are **word-for-word identical to B**; the substantive
edits are confined to the five Layer-1/2 pages, the four authorized paths, and terminology in
`roles.md`/`composition.md`/`authority.md`. My repo-wide audit further found **792 links into the
rewritten tree from anywhere in the repository, zero broken**, including from sealed packet records
that `check:builder-docs` does not scan as sources.

**Required outcome:** record that enumeration and classification in the report (path, layer,
authorized/retained/reverted, and whether any K1.1 governing semantics moved), and state the
Layer-1/2 justification 006 requires ("Change Layer 1/2 only for a whole-system or major-abstraction
change"). The evidence needed is small and now known to be favourable; it simply has to be in the
record rather than in a reviewer's head.

### Prior findings — disposition on exact H3

`K11-R15-ID-01` CLOSED (verified by counterexample, R1 ablation RED) · `K11-R15-DOC-01` CLOSED ·
`K11-R15-DOC-02` CLOSED (the mental-model tree is genuinely inside `check:builder-docs`' source
inventory; I confirmed the bare-`#anchor` resolution fix is real) · `K11-R15-PROC-01` CLOSED ·
`K11-R16-VAL-01` CLOSED (R4 retained RED) · `K11-R16-ID-01` CLOSED (verified by total-diagnostic
probes) · `K11-R16-DISP-01` CLOSED under revision 2 / `KC1-ARCH-1` · `K11-R16-DOC-01` CLOSED ·
`KC1-R2-PROC-01` **REOPENED as `KC1-R4-PROC-02`**, new location, same family ·
`KC1-R3-DOC-01` CLOSED — I confirmed independently that the stale wording survived the owner rewrite
verbatim and that C3's four edits are the minimal correct repair.

## Run-to-run assessment

**Substantial improvement from round 3: YES, on semantics.** The delivery boundary is not merely
passing; it is the strongest part of this packet. Everything I could think to throw at it — hostile
reasons, detached and cross-Execution capabilities, out-of-order settlement across redelivery,
inert hostile returns, ambient prototype pollution, strict-mode subprocess rejection handling, the
compile-time return-type gate — behaved exactly as the canonical rule specifies. The implementation
agent is not stuck on Kernel semantics and is not repeating a conceptual mistake there.

The blocking problems are entirely in documentation-scope governance, and they are **not new** — see
the owner note below.

## Verdict and handoff

The ten K1.1 acceptance criteria pass on the merits, independently verified. Acceptance is withheld
because the packet's own contract and 007 scope section require something the candidate deliberately
did not do, and the only authority for that departure lives inside the candidate's own report. Under
006 a P2 contract defect "must fix", and a contract/007 amendment is payload, so it needs a new C, a
fresh H and a confirming review of the delta — not an H..A repair.

The required work is one small docs-only payload commit. No code, test, fixture, threshold or
evidence rerun of the delivery boundary is implied by these findings.

### Compact correction handoff

```text
Correct the same released packet K1.1-correction-01 on codex/k1.1-correction-01-review-findings.
Base 777b9955fb3a443f700b4f3d1f4f2aef1869345b; reviewed H b883f291d83060b360b419e2a58b771f9abbc74b;
review record docs/development/work/K1.1-correction-01/review-05.md.
Open findings KC1-R4-PROC-01, KC1-R4-PROC-02, KC1-R4-DOC-01; required outcomes and counterexamples
are in that record. K1.1-C1..C10 pass on exact H3 and need no rework.
Owner supplemental decisions: the round-4 documentation ruling, currently recorded only in
implementation-03.md and the 007 ledger row — it must be given a durable authorized home.
Unresolved authority: none (no blocker).
Apply 006 and 012: close the documentation-scope subsystem and its dependencies (contract revision,
decision-01 superseding note, 007 scope section, scope guard anchor, report enumeration), then
re-review the whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

`next_release: none`. K1.2 remains held. No integration receipt, no E1 result, no K1 closure.
This record binds exact H3 and certifies no later commit.
