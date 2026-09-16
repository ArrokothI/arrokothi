# K1.1-reference-01 independent review — round 1, second reviewer (review of exact H)

**Transcription provenance.** Transcribed verbatim by the correcting implementer session
(Anthropic Claude Opus 5) from the review text the owner supplied on 2026-09-16. Nothing below is
implementer wording, reasoning or finding. The implementer independently verified all three
findings against git before acting on them; that verification is recorded in
[implementation-02](implementation-02.md), not mixed into the reviewer's text here.

---

**Verdict: CHANGES REQUIRED.** Two P2 findings and one P3. No P0/P1. No BLOCKED state: every input
this review needed was reachable.

**Review target:** candidate **H = `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89`**
(`report(K1.1-reference-01): pin documentation C and independent review handoff`), payload
**C = `2dc3cedb02888d891ec0a6389439b7cfb3b07943`**, over acceptance/status base
**A = `519ba002378707a4deccff1ea0a243d21eb694b7`**, under
[contract revision 1](contract.md), REF-1–REF-5.

This record binds to **exact H only**. It certifies no later commit, does not merge, does not
release a successor, and does not touch the accepted implementation ACCEPT at H5.

## 1. Reviewer, session, model, date, access

- **Reviewer/session:** an independent Arena.ai Agent Mode review session, separate from the
  GPT-6 owner-delegated cleanup session that authored this supplement and from the session that
  recorded [review-01](review-01.md). **Model:** not independently stateable. Arena.ai Agent Mode
  is served by several models (Claude, ChatGPT, Gemini, Grok, Qwen, Kimi among others) and this
  sandbox exposes no per-session model identity, so I record "Arena.ai agent-mode reviewer,
  underlying model unverified" rather than a name I cannot check. I am not the author of the
  contract, the report, the payload or [cleanup-01](../K1.1-correction-01/cleanup-01.md), and I
  took no part in K1.1-correction-01.
- **Date:** 2026-09-16 (UTC).
- **Access:** full local checkout of `ArrokothI/arrokothi` with shell. The checkout arrived
  shallow (`git rev-list --count HEAD` = 1); I ran `git fetch --unshallow origin` (611 commits)
  and `git fetch origin codex/k1.1-correction-01-review-findings`, so **all** base/C/H/A/D/H5
  commits and the full cumulative diff are locally available — nothing here rests on GitHub's
  truncated diff or on a report's summary. `git ls-remote origin` works. `npm install` succeeded
  (190 packages); I reran checks on **Node v22.22.3 / npm 10.9.8**, not the implementer's
  Node v25.2.1 / npm 11.6.2.
- **Access limits, stated plainly:**
  - I could not verify the quoted owner instruction ("If required reference changes were absent
    from the reviewed candidate, prepare a scoped documentation correction with new C/H and
    independent review before claiming merge-ready"). It is an in-session owner message recorded
    by the implementer in the contract; the repository cannot evidence it. This is the same
    provenance mechanism 006 allows for owner releases, so I treat it as recorded provenance,
    **not** as something I verified.
  - I likewise cannot verify [review-01](review-01.md)'s model/self-description ("OpenAI GPT-5.6
    Sol, High reasoning"), nor that the owner selected that reviewer. I assessed it as a document.
  - The benchmark repository SHAs the records cite (`5a3f1ba5…`, E1 `8de04779…`) are outside my
    access. **Unchecked.** No REF criterion depends on them.
  - No containerized second environment and no network-dependent gate (evals, native Drivers,
    packaging). All are contract-excluded for this documentation packet.
- **Policy baseline read in full at H:** [006](../../006-development-process.md),
  [007](../../007-work-packets.md) (K1.1, K1.1-correction-01 and K1.1-reference-01 rows and packet
  sections), [008](../../008-implementation-report.md), [012](../../012-review-methods.md), plus
  [AGENTS.md](../../../../AGENTS.md), [development README](../../README.md),
  [013](../../013-structure-and-evidence-sequencing.md) and
  [015](../../015-structural-evidence-rules.md). I verified by my own `git diff --exit-code` that
  006/008/012/009/013/015/001/`AGENTS.md`/`CLAUDE.md`/`docs/development/README.md` are
  **byte-identical A→H** (exit 0), and that 006/008/012 are byte-identical **B→A** (exit 0). The
  contract's governing-baseline claim is therefore true, and nothing in this candidate relaxed the
  policy governing its own review.

## 2. A concurrent ACCEPT binds the same H; both records stand

While this review was running, the branch advanced from `8e583252…` to
**`bb4e4fdff422ee64e6146106c8d47ab9955a13e1`** (`review(K1.1-reference-01): record independent
ACCEPT`, committed `Rex <pipirex77@gmail.com>`, 2026-09-15 20:44 −0400). That single commit adds
one file — [review-01.md](review-01.md) — and nothing else
(`git diff --name-status 8e583252 bb4e4fdf` = `A review-01.md`). It records **ACCEPT** for the same
exact H, C and A that I reviewed, from a GitHub-only session with no shell and no reruns.

Facts I verified about it, stated neutrally:

- It binds correctly to exact H `d4bd49f` and explicitly declines to certify the three
  administrative commits after it. On that point it and I agree.
- It did **not** write an ACCEPTED state into the ledger: at `bb4e4fdf`, 007's
  K1.1-reference-01 row still reads `WAITING_FOR_REVIEW`. So 006's "reject implementer-authored
  ACCEPTED states without an authentic prior review" tripwire is not tripped in 007; the question
  is only whether this reviewer's verdict is the accountable one.
- It did **not** reach any of my three findings. Its REF-3 row reasons about
  `execution-cycle.md` ("replaces obsolete acceptance-pending wording with the exact accepted H5
  status") and never examines 007's own live K1.1 narrative, which still asserts the opposite —
  `REF1-R1-STATUS-01`, and I confirmed that sentence is still present at `bb4e4fdf` (line 43).
  Its REF-4 row reasons about *ownership* ("reference.md continues to point … to their existing
  owners") and never examines the concept-page status convention in the same file —
  `REF1-R1-CONV-01`. It does not mention the two-target list entry — `REF1-R1-NAV-01`.

006 governs the collision directly: "acceptance still requires **one accountable full cumulative
review, not a majority vote or several partial reviews silently combined**." This repository has
already applied that rule twice on divergent pairs, and both times preserved both records
unedited: review-04 `ACCEPT` and review-05 `CHANGES REQUIRED` on the same H3, and review-06
`CHANGES REQUIRED` against review-07 `ACCEPT` on the same H4, where 007 records the operative
principle — "**A majority does not accept: a demonstrated false identity statement is not outvoted
by an ACCEPT that did not reach it.**"

I therefore do not treat review-01 as superseded, do not edit it, and do not ask that it be
withdrawn. I record that my findings are concrete and reproducible from the tree at the exact H
both records bind, and that review-01 does not address them. Which of the two is the accountable
acceptance — or whether the owner wants a third — is the owner's decision under 006, not mine.
What is not available is averaging them.

## 3. Process-change check: the proposed scope rule cannot weaken this review

The contract carries one prospective rule of its own: *"KC1-DEC-7 and its D anchor … remain the
exact acceptance rule for the historical implementation H5. For this separate owner-requested
reference supplement, the anchor is A above, which has the same mental-model tree as D. Only the
files listed below may differ."* Per 006 I reviewed that rule as an artifact rather than accepting
it as authority.

| The rule's own claim | My independent check | Result |
|---|---|---|
| A has the same `mental-model/` tree as D | `git diff --name-only 0ee13f81… 519ba002… -- mental-model/` | **0 paths — TRUE** |
| The exception does not disturb H5's KC1-DEC-7 gate | `git diff --name-only 0ee13f81… 52b1600f… -- mental-model/` | **0 paths — gate intact at H5** |
| Only the declared files differ from A | `git diff --name-status A C` | **exactly the 10 declared paths** |
| The exception does not rewrite the correction contract/decision | `git diff --exit-code A H -- docs/development/work/K1.1-correction-01/{contract,decision-01}.md` and `-- docs/development/work/K1.1/` | **empty — TRUE** |

The anchor move is content-neutral for comparison (A's mental-model tree *is* D's), it is recorded
**before** the payload in the contract rather than justified inside a report as KC1-DEC-7 requires,
and it leaves REF-1–REF-5 as the acceptance conditions. It did **not** relax this review: I judged
every criterion against the accepted decisions and the accepted source, not against the exception.
review-08's closing warning ("any future rewrite of `concepts/` or `mechanisms/` must move D by
fresh owner decision before payload") is satisfied in form — this is its own packet with its own
review, and no K1.1 candidate is open.

## 4. Identity verification (all reviewer-run git, not taken from the records)

| Claim | My command | Result |
|---|---|---|
| Remote advertised branch head | `git ls-remote origin` | `8e583252…` at session start; `bb4e4fdf…` after the mid-review push |
| A→C is exactly the 10 declared paths | `git diff --name-status A C` | **TRUE**, 10/10 |
| C→H is exactly the declared 6-path allowlist | `git diff --name-status C d4bd49f` | **TRUE** — 007 + implementation-01 + 3 logs + MANIFEST |
| H5→A is review-08 + the correction status row only | `git diff --name-status 52b1600f 519ba002` | **TRUE** |
| Executable tree untouched A→H | `git diff --name-only A H -- packages tests scripts examples package.json package-lock.json tsconfig.json` | **0 paths — TRUE** |
| Layer-1/2 untouched A→H | `git diff --exit-code A H -- mental-model/{README,kernel,runtime,driver,deployment}.md` | **exit 0 — TRUE** |
| Sealed records untouched A→H | `git diff --name-status A H -- work/K0.1* work/K0.2 work/K1.0* work/K1.1` | **0 modifications**; only 3 *new* files under `work/K1.1-correction-01/` |
| `D→H -- mental-model/` is the 7 declared Layer-3 paths | `git diff --name-only 0ee13f81 8e583252 -- mental-model/` | identity, values, creation, execution-cycle, reference, roadmap, sources — **all declared** |
| main vs common ancestor | `git diff --stat a8ac787b 07f7502c` | **zero content bytes — TRUE** |
| Prerequisite commits exist | `git log -1` on `9baff3a0`, `05f48c20`, `4f02e6ca` | **all present** |
| `validation-01` digests | `sha256sum` on the 3 logs vs MANIFEST | **3/3 match** |
| The 12 `validation-05` digests the report reuses | `sha256sum` on all 12 vs MANIFEST | **12/12 match** |

**Post-H administrative delta (inspected, not certified).** `d4bd49f..8e583252` adds `154a765`
(007 rows, `014-owner-progress-summary.md` rewrite, `cleanup-01.md`), `1c98f61`
(`push-pending-01.md`, 007 row) and `8e58325` (`push-verification-01.md`, 007 row); `bb4e4fdf` then
adds review-01. No executable, contract, policy or Layer-1/2 byte is in any of them.
`push-verification-01` claims the remote advanced to `1c98f61`; my own `ls-remote` returned
`8e583252`, consistent with the later push its text defers to the external handoff. `cleanup-01`
correctly names H as `d4bd49f` and states that the owner-summary/cleanup changes are subsequent
administrative commits, so the report's C→H allowlist is **accurate for its own H** and I found no
scope-accounting defect there. I read the rewritten 014 in full; its claims (H5 accepted,
supplement awaiting review, integration pending, no K1 closure, no E1, Node-22 legacy observation
preserved) all match what I verified independently.

## 5. Independent coverage, derived before using the report's explanations

Derived from KC1-DEC-1/-3/-4/-6/-7, correction-contract required items 1 and 5, K1.1 contract
revision 5 C3, decision-01/KC1-ARCH-1, review-08 C1–C6, and the AGENTS.md/006/012 obligations for
accepted-work reference maintenance. Methods used: **normative decisions** and
**process/documentation** (012). Deterministic/race/native/external/packaging methods are correctly
excluded — the payload changes no executable byte, which I verified in git rather than accepted on
assertion.

| Obligation / interaction | Distinguishing input I used | Expected observable facts and forbidden changes | Where I checked, and result |
|---|---|---|---|
| Creation key ≠ Input ID domain (KC1-DEC-1) | Creating with key `report-17`, then ingressing with request key `report-17` at equal and at different content | Two separate receipts; fresh ingress, then its own replay, then a *normal ingress* conflict; **forbidden:** a creation-boundary replay, or a conflict against an Event never submitted | `identity.md` new paragraph + `creation.md` example read against `coordinator.ts:723–800` (initial Event deliberately not in `byInputId`, `event-creation-` prefix at 749, creation receipt at position 1, `byInputId` minted empty at 776) and `coordinator.ts:856–875` (`mapGet(record.byInputId,…)` → replay / `duplicate_conflict`). **Consistent** |
| Separate receipts survive the reuse | Creation retry after an ingress exists | Creation retry returns the creation decision, not the ingress receipt | `creation.md` "Retrying creation still returns the creation decision" vs the `byCreationKey` lookup at `coordinator.ts:704`. **Consistent** |
| One observation, one value (K1.1-C3) | Accept `{count:1}`, then mutate the caller's object to `{count:2}` | Accepted content and equality bytes still describe `1`; **forbidden:** a second reading selecting a different value | `values.ts:501–568` `capture`, `accept()` at 1254–1302 (`canonicalBytes` measured from `encode(snapshot)`), `canonicalize()` doc. **Consistent** |
| Own-data representation claims | object/array prototype, accessors, holes, extras, symbols, non-enumerables, cycles, present `undefined` | Each **refused**, never dropped or repaired | `captureObject:713–828`, `captureArray:572–706`, `describedValue:455–488`. Every item in the new prose's refusal list maps to a real refusal code. **Consistent** |
| Descriptor/read agreement + uninspectable structure | own data descriptor disagreeing with an ordinary read; a throwing trap | `unstable_representation` refusal; no exception escapes | `describedValue:476–484`; `capture:560–566` maps a throwing observation to a refusal. **Consistent** |
| Serializer window (KC1-DEC-3) | host state mutated across the exact JCS call | bytes unchanged by host state; environment restored; refusal where it cannot be established | `encode()` inside `withSerializerEnvironment`, restoration via `restoreDescriptor` in `finally`; `accept()` maps failure to `unstable_representation`. **Consistent** |
| No broadened containment or wire claim | reading the new section for over-claim | value-acceptance only; separate containment owner; no wire format | New text says so explicitly and links `resources.md#containment-claims`, which exists and says "Same-process interfaces cannot contain arbitrary hostile code sharing credentials and objects". **Consistent** |
| Envelope ≠ value capture (KC1-DEC-6) | inherited-only request field; own accessor | inherited-only reads as missing; own accessor still observed | `coordinator.ts:469–492` `observeOwn`/`observeField`: own-descriptor first (line 476 returns `undefined` when no own descriptor exists), then the read. **Consistent** |
| Delivery rules unchanged (KC1-ARCH-1) | byte diff of the whole delivery section | only the status paragraph changes; undefined-only return, first-report-wins, sync-throw, bounded ≤1024 diagnostics, attempt-local late reports, K1.2/K1.3/K5 ownership all retained | `sed`-extracted section diffed A vs H: **one line differs** (line 30), everything else byte-identical, including "These latter lifecycle interactions belong to K1.2/K1.3 and retention to K5". **Consistent** |
| Accepted H vs pending integration separated | every live statement of K1.1 acceptance status in the tree | one current truth everywhere | 002, execution-cycle, sources, roadmap and 014 are accurate. **007's live narrative is not — see REF1-R1-STATUS-01** |
| One owner per definition | identity↔creation, values↔canonical-form, values↔resources | rule stated once, examples agree, no redefinition | `identity.md` owns the domain rule, `creation.md` illustrates and links back, matching `identity.md`'s own "This page defines the terms; creation and the execution cycle apply them" and `reference.md`'s concepts/mechanisms split. The new `identity.md` delivery sentence is a cross-reference ("specified once in…"), not a second home. **Consistent** |
| Interacting owners: batch/wait, acceptance, authority, recovery, resources, output, evidence | newly accepted ingress vs an already pinned batch; receipt retention | no rule needed, no contradiction | `waits.md:69` "Events arriving in `READY` or `RUNNING` … do not change a reserved batch"; `evidence.md` carries no creation/ingress rule, and `creation.md`'s unchanged retention link still applies. **No contradiction** |
| Navigation | 28 added links/anchors the repository checker does not cover (`docs/development/**`) | every target and anchor resolves | reran the report's inline program over **A→tip**: 133 added local links/anchors across 19 changed paths, all resolve; and reran the repository checker (§6). **Valid** |

**Strongest counterexamples examined and rejected as defects.** (a) Whether the new `creation.md`
example misstates check ordering: `submitInput` resolves replay/conflict *before* the terminal and
capacity checks, and the example's "Capacity, authority and terminal checks continue to apply" is a
statement about fresh ingress, so it does not assert the wrong order. (b) Whether the refusal list
in `values.md` is incomplete: it omits lone surrogates, non-finite numbers and the four limits, but
those are owned by the pre-existing "Boundary value and root" and "Fixed semantic limits" sections
on the same page, so the new list is correctly scoped to representation. (c) Whether describing a
TypeScript binding in `concepts/values.md` breaches AGENTS.md's "keep provider/protocol types out
of Kernel semantics": it does not — the one-observation invariant is Kernel semantics and
`values.ts`'s own header names `values.md` as its owner; the binding-specific framing is what the
owner's instruction asked for. The *status-framing* consequence of that choice is a separate matter
and is `REF1-R1-CONV-01`.

**Unexamined obligations / residual gaps.** The quoted owner instruction (unverifiable here), the
benchmark-side SHAs (no access), and review-01's reviewer/model self-description. I did not
re-derive K1.1-C1…C10 from scratch: that acceptance belongs to review-08 at exact H5 and this
candidate changes no executable byte, which I confirmed in git; I reran `test:kernel` and
`test:conformance` anyway (§6) as a mechanical cross-check on that byte-identity claim, not as a
new gate.

## 6. Inspected logs versus my own reruns

| Check | Kind | Result |
|---|---|---|
| `npm run check:builder-docs` | **Reviewer rerun** | "Builder checks passed: 57 Markdown files, 847 local links/anchors, 38 public package imports" — reproduces the pinned `01-clean-C.log` exactly, and still passes with this review file present |
| `git diff --check A H` | **Reviewer rerun** | clean, exit 0 |
| Declared-path / executable / Layer-1-2 / sealed-record comparisons | **Reviewer rerun** | all empty, exit 0 |
| `git diff --exit-code a8ac787b origin/main` | **Reviewer rerun** | zero content difference |
| Added-link/anchor program over `docs/development/**` | **Reviewer rerun** (adapted to A→tip, a superset of the pinned A→C run) | 133/133 resolve |
| `validation-01` and `validation-05` digests | **Reviewer rerun** of `sha256sum` | 3/3 and 12/12 match |
| `npm run typecheck` | **Reviewer rerun** | clean (no executable change claimed; run as a cross-check) |
| `npm run test:kernel` | **Reviewer rerun** | 264 tests / 55 suites / 264 pass / 0 fail / 0 cancelled — matches the pinned H5 figure |
| `npm run test:conformance` | **Reviewer rerun** | 1949 / 283 / **1947 pass / 0 fail / 2 cancelled** — independently reproduces review-08 OP1's two legacy Effect-test cancellations on Node v22.22.3. The candidate correctly preserves that observation and makes no all-Node green claim |
| Full 2322/356, SDK 22/0, architecture 362/37, focused 50/8, nine RED ablations | **Inspected pinned logs only** (digests verified by me) | the implementer's Node v25.2.1 evidence; not my reruns, and this packet asserts no runtime change |

`npm install` rewrote `package-lock.json` metadata locally, exactly as review-08's OP2 predicted;
I restored it and confirmed it byte-identical to A, so this review left no payload-side change.

## 7. Per-criterion verdicts

| ID | Verdict | Rationale |
|---|---|---|
| **REF-1** | **PASS** | The domain-separation rule and the reuse example agree with each other and with the accepted implementation I read: the initial Event is not indexed in `byInputId`, carries the creation receipt at position 1, and only later ingress participates in replay/conflict. The example supplies all three required beats — fresh ingress with its own Event and ingress receipt at equal content, replay returning that ingress receipt, changed content conflicting under the *same Input ID* — and creation retry still returns the creation decision. No receipt is duplicated and no forbidden creation-boundary replay or phantom conflict is described. |
| **REF-2** | **PASS** | Every representation and refusal claim in the new section is true of `values.ts` at H5, checked statement by statement against `capture`, `captureObject`, `captureArray`, `describedValue`, `encode` and `accept`. One coherent immutable snapshot; size measured from the snapshot; serializer environment restored and refusal on failure; no broadened containment (it links the separate containment owner) and no wire claim (it says so and preserves the decoder's duplicate-key rule). The KC1-DEC-6 envelope sentence matches `observeOwn`. |
| **REF-3** | **FAIL** | The delivery **rules** are byte-for-byte unchanged apart from the status paragraph, and 002/execution-cycle/sources/roadmap now separate accepted H from pending integration correctly, with K1.2/K1.3/K5 ownership retained. But the criterion's required outcome is that accepted H and pending integration are *accurately separated*, and the authoritative status ledger still asserts the opposite in live prose — `REF1-R1-STATUS-01`. |
| **REF-4** | **FAIL** | Ownership is genuinely single-homed (identity owns the rule, creation illustrates, values owns capture, execution-cycle owns delivery, resources owns containment) and navigation is mechanically valid on my own reruns. But the packet introduced the first concept-page assertion of accepted later-gate implementation while the canonical convention that governs concept pages — carried in `reference.md`, a file this payload edits — still says the opposite, and the report's REF-4 self-check does not identify it: `REF1-R1-CONV-01`. A smaller list-convention deviation is `REF1-R1-NAV-01`. |
| **REF-5** | **PASS** | Verified by my own git, not by the report: A→C is exactly the 10 declared paths; C→H is exactly the declared 6-path report/evidence allowlist; `packages/ tests/ scripts/ examples/`, manifests, Layer-1/2 pages and every sealed record are byte-identical A→H; `D→H5 -- mental-model/` is empty, so H5's KC1-DEC-7 freeze and its ACCEPT are untouched; the four post-H commits are administrative/review records under 006's cleanup delegation and contain no executable, contract or policy byte. Review independence is preserved in the artifact: the author states twice that it cannot accept, and 007 still records `WAITING_FOR_REVIEW` at the current tip. |

DEFERRED: none. No criterion in this packet is assigned elsewhere.

## 8. Findings

### REF1-R1-STATUS-01 — the authoritative status ledger still says acceptance is outstanding (P2)

- **Provenance/severity:** this reviewer; **P2** — a contract defect and an inaccurate current-state
  claim in the single status owner, in a path this packet declares as payload. Not P1: no
  architecture invariant, gate or executable behavior is affected, and 006 makes 007's *table*
  (not its prose) the status authority.
- **Exact location:** `docs/development/007-work-packets.md`, the K1.1 narrative paragraph at
  lines 41–43, present identically at A, C, H `d4bd49f`, the earlier tip `8e583252` and the
  current tip `bb4e4fdf` (`git diff` of lines 28–46 A vs H is empty; `grep -n "remain
  outstanding"` still returns line 43 at `bb4e4fdf`):
  > "Review-01 closed seven findings; `K11-R16-DISP-01` remains open. The owner-delegated
  > [delivery decision](work/K1.1-correction-01/decision-01.md) resolves the architecture block;
  > **revision-2 implementation and independent acceptance remain outstanding.**"
- **Governing criterion/source:** REF-3 ("accepted H and pending integration accurately
  separated"); 006 ("One authoritative status lives in the table in 007"); 012's semantic
  correction closure ("Correct all in-scope dependent occurrences … then re-audit the whole
  packet"); [cleanup-01](../K1.1-correction-01/cleanup-01.md) KC1-CLEANUP-REF-01's required
  outcome "accurate accepted-H status".
- **Concrete counterexample:** in the same file at the same commit, line 481 reads
  `| K1.1 | ACCEPTED | **Current cumulative implementation acceptance:** correction H5 52b1600f3b42e3a360fdc3395178f1d147edf304 …`
  and line 482 records that review-08 "accepts exact H5 … all packet findings closed". And
  [review-08](../K1.1-correction-01/review-08.md) §10 states "No finding from the main packet is
  open", with `K11-R16-DISP-01` "dissolved into the removed Promise path". The narrative is
  therefore false twice over — the finding is closed and acceptance is recorded — and unlike 007's
  K0.2 and K1.0 hold paragraphs it carries no "stands as the record of the hold at its own date"
  marker, so it reads as live current state.
- **Impact:** the packet's declared purpose is faithful reference maintenance and accurate
  accepted-H status; it corrected exactly this wording in `002`, `execution-cycle.md` and
  `sources.md` and left the same wording in the one file that owns status. A reader or a future
  cleanup agent following 007's prose would conclude the correction is unimplemented and
  unaccepted.
- **Required outcome:** the live K1.1 narrative in 007 must state the same current truth as its own
  table rows and review-08 — implementation independently accepted at exact H5, all K1.1 and
  K1.1-correction-01 findings closed, integration and final cleanup held for this reference review,
  `next_release: none` — **or** be explicitly marked as a dated historical record of the hold in
  the form 007 already uses for K0.2 and K1.0. Sealed reviews, review-08 and the table rows must
  not be edited to match. Validation: a diff showing the paragraph agrees with rows 481/482, plus
  the existing link/anchor and scope checks still green.

### REF1-R1-CONV-01 — new canonical prose asserts accepted/shipped behavior against the convention that concept pages carry none (P2)

- **Provenance/severity:** this reviewer; **P2**.
- **Exact locations introduced by this candidate:**
  - `mental-model/concepts/values.md:25` — "**The accepted K1.1 TypeScript binding** captures
    caller-owned values into one coherent immutable snapshot." (plus "In this binding, …" at
    line 27). `git grep` at A shows **no** concept page previously asserted accepted later-gate
    implementation; the only pre-existing "accepted" mentions are conceptual (`actions.md`,
    `core.md`, `identity.md`) or refer to accepted K0.1 decisions (`values.md:3`).
  - `mental-model/mechanisms/execution-cycle.md:30` — "**Implementation evidence:**
    K1.1-correction-01 implements this boundary … independently accepted by review-08", which now
    sits directly under that page's own Status line at line 5 ("… This is target specification, not
    shipped behavior.").
- **Contradicted by:** `mental-model/reference.md`, §"How pages are named" — "Concept pages carry
  no Status line: they define vocabulary, and a term is not a commitment to build anything. **A
  concept page you reached directly still describes target specification, not shipped behavior** —
  see Target, not shipped" — and `mental-model/README.md` §"Target, not shipped" — "Only the K0
  gate is complete … so **a page naming any later gate describes protocol behavior that has not
  been built yet**. So far … K1.0 prepared a private target package that implemented none of the
  protocol."
- **Governing criterion/source:** REF-4; [AGENTS.md](../../../../AGENTS.md) ("Change Layer 1/2 only
  when the whole-system model or major abstraction changes"; "update architecture/detail docs,
  migration notes, code, and tests together"); 006's architecture precedence and its rule to
  surface rather than silently resolve a normative conflict; 012's normative method ("Trace
  normative rules into examples, mappings and compatibility claims") and its one-normative-home
  rule.
- **Concrete counterexample:** a reader who lands directly on `mental-model/concepts/values.md` is
  told by the canonical index that the page "describes target specification, not shipped behavior",
  then reads that the accepted K1.1 binding already does this. `reference.md` is in this packet's
  declared payload and was edited by it, yet its convention sentence was left stating the opposite
  of what the same payload now contains.
- **Impact:** the canonical documentation set now carries two mutually exclusive statements about
  whether Layer-3 concept pages may record accepted implementation status. That is precisely the
  "faithful maintenance" obligation this packet exists to discharge, and the report's REF-4
  self-check does not mention the convention — it reports only link/anchor counts and then
  correctly notes that "mechanically valid links do not prove semantic fidelity" without
  identifying this instance.
- **Required outcome:** one reconciled convention for how Layer-3 records that part of a page is
  accepted and implemented. Because `mental-model/README.md` is Layer 1 and this contract excludes
  a Layer-1/2 rewrite, the honest resolutions are (a) an owner scope amendment naming README's
  "Target, not shipped" and reference.md's "How pages are named" as declared payload for a
  documented status marker, or (b) reframing the new `values.md`/`execution-cycle.md` prose so it
  states the canonical rule without asserting shipped status in a page the convention says carries
  none. **This review does not prescribe which**; either is in scope, and a third owner-chosen
  resolution is acceptable if recorded before payload. Validation: the convention sentence, the new
  prose and README agree, with `check:builder-docs` and the added-link check still green.

### REF1-R1-NAV-01 — the canonical-definitions list gains its only two-target entry (P3)

- **Provenance/severity:** this reviewer; **P3** — does not block on its own.
- **Exact location:** `mental-model/reference.md:94` — the "Dispatch and delivery" entry now
  carries a second target, `; [delivery reporting mechanism](mechanisms/execution-cycle.md#delivery-reporting-boundary)`.
- **Governing source:** the same file's "Canonical definitions" preamble — "**Each entry points to
  its sole definition section.** … Linked local reminders elsewhere do not own another definition."
- **Evidence:** there are 65 bullet entries in those lists; a search for `; [` finds exactly one —
  line 94 — carrying a second target (line 158 is a table row, a different structure). Both
  targets resolve, so this is a convention deviation, not a broken link.
- **Impact/required outcome:** the cross-reference is also redundant: `reference.md` already has
  the "Find a mechanism" lookup table, and the new `identity.md` sentence already points at the
  delivery reporting boundary. Either restore the one-target form of the entry or state the
  two-target convention in that section's preamble so the list's stated rule matches its content.

## 9. Reconciliation with the report and with prior findings

- The report's cumulative payload accounting (ten paths, layers and dispositions) reproduced
  exactly in git. Its C→H allowlist is accurate **for the H it names**, and cleanup-01 correctly
  separates the later administrative commits — I found no scope-accounting defect, contrary to what
  a superficial reading of the branch tip alone would suggest.
- Its REF-1/REF-2 self-assessments are correct on the evidence; I reached them independently from
  source first and found no discrepancy. Its REF-4 row is the weaker of the five: it rests on
  mechanical link/anchor counts and a dependency matrix that never names the concept-page status
  convention (`REF1-R1-CONV-01`) or 007's live narrative (`REF1-R1-STATUS-01`).
- Prior findings: this is round 1 for K1.1-reference-01, so **there is no correction delta in the
  usual sense** — no earlier review of this packet existed when I began. The deltas I did inspect
  are C→H and the post-H administrative/review commits, in §4.
- Carried dispositions from the accepted packet, by reference: review-08 closed every K1.1 and
  K1.1-correction-01 finding including `KC1-R5-PROC-01`, and I did not reopen any of them — no
  executable byte changed. review-08's `OP1` (two legacy Effect-test cancellations on Node
  v22.22.3) I reproduced myself in §6; it remains an owner observation, correctly not claimed away
  here.
- **Defect-family note, recorded here and escalated separately to the owner:**
  `KC1-R3-DOC-01` (review-03 of K1.1-correction-01, P2, "current candidate says its completed
  migration is still pending") was the *same* family as `REF1-R1-STATUS-01` — stale current-state
  acceptance wording in live documents. It was closed at round 4 by correcting 002,
  execution-cycle, sources and roadmap, and review-08 verified it non-regressing at H5. This packet
  corrects the same three files again and again misses one live occurrence. That is the third
  appearance of the family across the K1.1 line.

## 10. Verdict text for transcription (owner-controlled)

> K1.1-reference-01: **CHANGES REQUIRED** at exact H
> `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89` (payload C
> `2dc3cedb02888d891ec0a6389439b7cfb3b07943`, base A
> `519ba002378707a4deccff1ea0a243d21eb694b7`), second independent Arena.ai agent-mode review of
> 2026-09-16, [review-02](review-02.md). REF-1, REF-2 and REF-5 PASS; REF-3 and REF-4 FAIL on
> `REF1-R1-STATUS-01` (P2) and `REF1-R1-CONV-01` (P2), with `REF1-R1-NAV-01` (P3). This record and
> [review-01](review-01.md) (`ACCEPT`, same exact H) disagree; both stand unedited and acceptance
> follows one accountable full cumulative review, not a count of verdicts. Implementation ACCEPT at
> H5 `52b1600f3b42e3a360fdc3395178f1d147edf304` is unaffected and is not re-certified here.
> Integration and final cleanup remain held; `next_release: none`.

Transcription into 007 remains the owner's. This review did not modify 007, did not edit or remove
review-01, did not merge, did not push, and released no successor.

## 11. Compact correction handoff (008)

```text
Correct the same released packet K1.1-reference-01 on codex/k1.1-correction-01-review-findings.
Base 519ba002378707a4deccff1ea0a243d21eb694b7; reviewed H d4bd49fd49fb6d70a992635cf2b6bf8317c3af89;
review record docs/development/work/K1.1-reference-01/review-02.md.
Open findings REF1-R1-STATUS-01, REF1-R1-CONV-01, REF1-R1-NAV-01; required outcomes and
counterexamples are in that record. review-01.md (ACCEPT, same H) is preserved unedited and does
not address these findings.
Owner supplemental decisions: none supplied by this reviewer. Unresolved authority: whether the
Layer-1 "Target, not shipped" text and reference.md's concept-page convention may be edited is an
owner scope decision — use 006's blocker path if it is not granted, rather than widening scope
inside a report.
Apply 006 and 012: close the affected semantic subsystem and its dependencies, then re-review the
whole cumulative packet. Fix additional in-scope defects with separate provenance.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```
