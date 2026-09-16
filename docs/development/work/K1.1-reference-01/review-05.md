# Independent cumulative review 05 — K1.1-reference-01 (contract revision 4)

**Transcription provenance.** Transcribed into the branch by the implementing session (Anthropic
Claude Opus 5) as the owner's delegate, from the review text supplied on 2026-09-16; the reviewer
has read access only and cannot push. Nothing below is implementer wording. All three findings were
verified against git before any action; that verification, including one correction to the review's
own arithmetic, is recorded in [implementation-06](implementation-06.md) rather than mixed into the
reviewer's text here.

---

**Verdict, bound to the exact candidate:** **CHANGES REQUIRED**, bound to exact candidate H `7fe0bba85f630744253ce0470206fd7e78709b7d`. This review accepts no commit, certifies no commit after H, and authorizes no merge or release. It is the fresh independent review of REF-1–REF-5 over A→H that the ledger row and the contract require before merge readiness.

## 1. Reviewer, session, model, environment, access

- **Session:** Arena.ai Agent Mode, independent review session, 5th cumulative review of the K1.1-reference-01 line. New session: distinct from the implementer/cleanup session (self-declared disqualified from accepting in this line) and from the sessions that recorded reviews 01–04.
- **Model:** the underlying model identity is not exposed in this sandbox and is not disclosed here; this record follows the line's convention of stating the mode and verified tooling.
- **Date:** 2026-09-16.
- **Shell:** full bash shell available and used (git, sha256sum, python3 link checker, awk/sed).
- **Node:** **v22.22.3** (npm 10.9.8); git 2.39.5. All my reruns ran on Node v22.22.3. The implementer's v25.2.1 logs were **inspected, not rerun** (that toolchain is not available here); the numeric differences are exactly the two known legacy cancellations (§7).
- **Access:** full read access to the checkout at `/home/user/arrokothi` (working branch `arena/01a0a808-arrokothi`, HEAD = H, clean tree); the checkout started shallow and was unshallowed (`git fetch --unshallow origin`) — all referenced SHAs then resolved locally. Read access to the origin remote (`git ls-remote`).
- **Access limits (006 external-blocker path checked, not triggered):** I cannot reach the implementer's original sandbox, the owner's in-session messages, or the benchmark repository; none were required. No claim in this candidate depends on an external gate, so no `BLOCKED_EXTERNAL` applies.
- **Integrity of my own run:** read-only throughout. Two `npm` reruns touched `package.json`/`package-lock.json` metadata; both were restored and re-verified byte-identical against pre-run SHA-256s before recording any claim.

## 2. Reviewed identities (all independently verified from git in this session)

| Role | SHA | Verified subject (git log) |
|---|---|---|
| Sibling implementation base B | `777b9955fb3a443f700b4f3d1f4f2aef1869345b` | Merge PR #25 (2026-09-14) |
| Sibling accepted H5 | `52b1600f3b42e3a360fdc3395178f1d147edf304` | "report(K1.1-correction-01): round-6 record correction for KC1-R5-PROC-01 (H5)" |
| Sibling C4 (accepted payload) | `56164092d128c6767f501962174ac81c6363af9e` | "correct(K1.1-correction-01): re-anchor documentation scope to owner fr…" — exists, verified |
| PR #26 merge (K1.0 integration) | `05f48c204d1eae021b3464c206e5c11e84bb3505` | "Merge pull request #26 … k1.0-integration-receipts" — exists, verified |
| Sibling authentic ACCEPT record | `b1050133b2b684065251b7b4b7f508e95e771bef` | "review(K1.1-correction-01): fifth independent cumulative review of exact H5 (review-08, ACCEPT)"; delta = `review-08.md` added, nothing else |
| Base / acceptance A (supplement base) | `519ba002378707a4deccff1ea0a243d21eb694b7` | "review(K1.1-correction-01): transcribe independent ACCEPT of exact H5" (2026-09-15 17:17); parent = `b1050133` |
| D (Layer-1/2 doc freeze anchor) | `0ee13f8138af52107d86967043bcc460faba8893` | "finish-all-second-layer-doc" (2026-09-15 15:13) |
| H3 (review-04's accepted head) | `a53757868277f954d55180c63d09b3ebd027ae9f` | round-3 report |
| Scope-amendment commit (no payload) | `f8dd3b41f7b3e6495dda39d8c65b6036a0c896d8` | "record owner Layer-1 scope amendment before payload (contract revision 3)"; delta = `contract.md` only |
| C4 | `bd4a86748c31eb32ed3800e6deff1e18243e3e66` | "state status ownership at Layer 1; refresh gate prose (C4)" |
| H4 | `7db74aa881155a59acdd3933c118180ea68c6924` | round-4 report |
| review-04 record commit | `b76e494d6b8433650ca745f235a1f56a4211bb62` | "record round-3 ACCEPT of exact H3" |
| **Payload C (C5, contract rev 4)** | `e1eb5888af6bda071bc57e5aa417bc2496533ccd` | "surface the Layer-1/2 normative conflict (contract revision 4, C5)"; delta = `contract.md` only |
| **Candidate H (H5 of this line)** | `7fe0bba85f630744253ce0470206fd7e78709b7d` | "round-5 report and validation evidence (H5-ref)"; **parent = C** |
| main | `07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec` | does **not** contain sibling H5 (verified: `packages/` at main differs from H5; A..H5 package diff = exactly 9 files) — so 014's "not on main" statement is true |

**Topology (mechanical, this session):** A is an ancestor of H (`merge-base A H = A`); the range A..H is **linear, 19 commits**; H's parent is C. The chain, oldest→newest: e46c772 (packet baseline: contract + 007 section) → 2dc3ced (H1) → d4bd49f (C1 pin + handoff) → 154a765 / 1c98f61 / 8e58325 (sibling cleanup-01 admin records) → bb4e4fd (review-01 record) → 8bb0de6 (review-02 record) → fc3e450 (C2) → 844bee4 (H2) → aaab9e4 (review-03 record) → 934e834 (C3) → a537578 (H3) → f8dd3b4 (rev-3 grant) → bd4a867 (C4) → 7db74aa (H4) → b76e494 (review-04 record) → e1eb588 (C5/rev-4) → 7fe0bba (H). Naming note: this line's own "H5" is H `7fe0bba`; it is a different commit from the sibling line's H5 `52b1600f`, and both names are used in this record with full SHAs to remove ambiguity.

## 3. Branch advertisement and stop-condition check

`git ls-remote origin` (run twice, final run 2026-09-16): `refs/heads/codex/k1.1-correction-01-review-findings` advertises **exactly `7fe0bba85f630744253ce0470206fd7e78709b7d`**; `refs/heads/main` = `07f7502c…`. The local working branch `arena/01a0a808-arrokothi` = H = HEAD, clean tree. The stop condition ("if the reachable branch did not advertise H, say so and stop") was **not** triggered: the reachable branch advertises exactly H.

## 4. Governing baseline, method, process-change artifact check

- **Policy baseline:** 006, 008, 012 read in full at A; verified byte-identical B→A→H (`git diff B A -- 006 008 012` empty; A..H does not touch them), as the contract requires. AGENTS.md read. 007, 012 and the contract (rev 4) read in full; the development front door (`docs/development/README.md`) read.
- **Contract as requirement map:** rev 4 read in full; its bounded payload (10 canonical paths: 7 Layer-3 + README's two authorized sections + 002; plus "this contract and 007 scope/status"), its exclusions, its REF-1–REF-5 table, and its proof block ("Run `npm run check:builder-docs`, `git diff --check`, declared-path/executable/sealed-record comparison and local-link checks on clean C") are the acceptance map I derived obligations from **before** reading the report's coverage claims.
- **Process-change artifact check:** this candidate is not a 006/008/012 change candidate (those files are untouched), but the contract itself carries prospective process text (the anchor exception, the rev-3 scope amendment, the rev-4 reconciliation). I treated all of it as an artifact to be judged, never as self-authorizing: the criteria table is byte-identical rev-1→rev-4 (verified by rev diff: C3→C5 changed only the two reconciliation paragraphs; C4→C5 added only the rev-4 paragraph and the "authorized from revision 3" phrasing), so no acceptance condition was relaxed; and this review was conducted under the same standing 006/012 rules at A, i.e., under no weaker standard. The candidate's text nowhere instructs waiving review obligations.
- **Method:** 012 applied — identities from git, not reports; mechanical (digest/diff/allowlist) vs semantic (prose reading) vs external (remote, rerun) evidence distinguished throughout; inspected records vs my reruns separated (§7); prior findings re-verified rather than inherited (§9).

## 5. Scope: cumulative A→H, independently derived

`git diff --name-status A H` = **46 files, all documentation; zero executable/test/dependency bytes**:

- 8 `mental-model/` files: `README.md`, `concepts/identity.md`, `concepts/values.md`, `mechanisms/creation.md`, `mechanisms/execution-cycle.md`, `reference.md`, `roadmap.md`, `sources.md`;
- `docs/development/002-implemented-kernel-baseline.md`, `007-work-packets.md`, `014-owner-progress-summary.md`;
- 3 sibling administrative records (`cleanup-01.md`, `push-pending-01.md`, `push-verification-01.md`) — declared by the contract to be "subsequent administrative work, outside C/H's payload";
- 32 packet files: `contract.md`, `review-01..04.md` (sealed records, unmodified), `implementation-01..05.md`, 5 `MANIFEST.md` + 17 raw logs.

**Allowlist checks (all mechanical, all clean):** C..H = exactly 6 files (007 modified; `implementation-05.md` + 4 `validation-05/` files added) — the round-5 evidence set, all declared. The four Layer-2 core pages (`kernel.md`, `runtime.md`, `driver.md`, `deployment.md`) are byte-identical A..H. A's README is byte-identical to D's README; at A and H the README has the same 8 `##` sections in the same order, and the only changed bytes are inside the two authorized sections (`## How these pages are organized`, `## Target, not shipped`) — so the grant's section confinement holds and inbound anchors (`README.md#target-not-shipped` from `reference.md`) survive. `D..H5 -- mental-model/` is empty, so the KC1-DEC-7 freeze and the sibling's ACCEPT are untouched by this line. Executable tree, package files, and all sealed work directories of other packets: unchanged A..H.

## 6. Sibling K1.1-correction-01 left untouched — confirmed

- Accepted implementation (H5's `packages/`/tests): byte-identical at H (the whole A..H diff has no executable bytes, and A descends from H5).
- Sibling's `contract.md` and `decision-01.md`: byte-identical A..H.
- Sibling's sealed work records: unmodified; the only additions after H5 are `review-08.md` (at `b1050133`, before A — the authentic ACCEPT record, delta-verified to add that file only), the three dated admin records above, and 007's row-489 append-only chronology ("push verified", "cleanup-01 BLOCKED on KC1-CLEANUP-REF-01"). Those are precisely dated, declared, and separated, as 008 requires.
- The candidate's 4-line addition to the sibling's 007 section (recording the split) is inside this packet's declared 007 payload and is accurate.
- Conclusion: in every sense that REF-5 and the task require — accepted implementation, sealed records, acceptance state, D-freeze — the sibling is untouched.

## 7. Inspected records vs my reruns

**Inspected (not rerun):** all 5 MANIFESTs; raw logs v01/01, v03/00, v04/00, v05/00 read in full (v05/00 is the round-5 final check); **all 17 raw logs' SHA-256s match their MANIFESTs** (mechanical). The implementer's Node v25.2.1 suite numbers (2322/356; 1949/283; 264/55) from implementation-05 were inspected, not rerun.

**Rerun by me at exact H on Node v22.22.3 (fresh, clean tree restored afterwards):**

| Command | My result at H | Implementer's record | Reconciliation |
|---|---|---|---|
| `npm run check:builder-docs` | 57 files / **847** links / 38 imports, exit 0 | 57/847/38 at H4/H5 | identical |
| `npm run typecheck` | exit 0 | clean | identical (but see §12 REF1-R5-CHK-01: the pinned log carries a blank EOF) |
| `npm run test:kernel` | 264 pass / 55 / 0 fail | 264/55 | identical |
| `npm run test:conformance` | 1947 pass + **2 cancelled** | 1949 (v25.2.1) | the 2 cancellations are the known OP1 legacy pair (below) |
| full `npm test` | 2320 pass + **2 cancelled**, exit 1 | 2322 (v25.2.1) | same two tests: `fast-slow-equivalence.test.ts:252/:283`, `cancelledByParent`; pre-existing at B, deterministic on Node 22 — correctly carried as an owner observation, with no all-Node green claim made |

**Also rerun:** the four contract proof commands at H (builder-docs ✓; local-link check via a python3 checker over all 29 changed/new `.md`: **776 relative links, all real links resolve** — the 13 flagged are quoted-text artifacts inside the four sealed review records; declared-path/executable/sealed-record comparison = the §5 battery, clean; `git diff --check` = **not clean**, see REF1-R5-CHK-01).

## 8. Coverage by criterion (derived from the contract and canonical sources before reading the report)

**REF-1 (identity domains; reuse example).** Re-read the `identity.md` diff: creation and later-ingress domains are explicit; delivery vocabulary links to its mechanism owner. Spot-checked `packages/kernel/src/coordinator.ts` at H (`byInputId` :774–776, `event-creation-` :749, `submitInput` :856, `observeOwn`/`observeField` :469–492): the page describes accepted code byte-identical to A..H (no executable byte differs), and the kernel suite (264 pass, rerun) includes the creation/ingress receipt tests. The "fresh ingress then normal ingress replay/conflict, separate receipts" behavior is the accepted K1.1 behavior this supplement only documents. **PASS** — verified by semantic re-read + byte-identity + my test rerun.

**REF-2 (in-process values; no broadened containment or wire claim).** Re-read `values.md` at H: one coherent immutable snapshot, own-data representation, refusal of unsupported/unstable forms, explicitly distinguished from wire decoding and physical containment. Conformance suite rerun at H: 1947 pass + 2 cancelled (OP1 only). No wire/containment claim appears anywhere in the payload (negative grep + full diff read). **PASS**.

**REF-3 (delivery rules unchanged; accepted-H5 vs pending-integration separation).** Re-read `execution-cycle.md`: the obsolete acceptance-pending status is removed; implementation status defers to the ledger ("this page states the contract, not what has shipped"); delivery rules byte-unchanged; the page's limits stated. `002`'s 5-line diff records only the acceptance/integration distinction (H5 accepted; integration pending — both verified against git: H5 not on main). The README `Target, not shipped` orientation claims were checked against the actual later gates (persistence → K3, composition → K4.5/R2.2, operability → K5.4/S1 per `roadmap.md`): they say what is implemented and defer the rest to the ledger — orientation, not false status. The one P3 wording tension is recorded as REF1-R5-WORD-01, not a REF-3 failure. **PASS**.

**REF-4 (one owner per definition; related pages assessed; navigation valid).** `reference.md` gained exactly one single-target entry (now 65 entries, **0 two-target** — the round-1 defect, closed); all new inbound anchors exist (checked each: `reference.md:25`, `resources.md:28`, `identity.md:9`, `creation.md:23`, `values.md:23`, `execution-cycle.md:28`). Builder-docs rerun: 57/847/38, exit 0; 776 links resolve. **However:** the packet's own declared payload includes "007 scope/status", and 007's **live** K1.1-reference-01 section (lines 214–222) still reads:

> **Scope and acceptance:** [contract revision 1](work/K1.1-reference-01/contract.md), REF-1–REF-5; identity-domain clarification, in-process value capture, accepted delivery status and navigation only. The contract records the prospective documentation-anchor exception before reference payload. …

That sentence (a) pins the contract to **revision 1** while the contract is at **revision 4** (the link points at a rev-4 document, so the prose and its own target disagree); (b) describes only the rev-1 scope, omitting the owner's bounded Layer-1 exception and the two README sections that are now the payload's most sensitive part; and (c) contradicts the authoritative row 490 in the same file, which carries the full rev-1→rev-4 chronology. I verified the section is **byte-identical across all 19 commits A..H** (single md5 `1b999df1005d076083f00b423b3fc314` at every commit; last touched at e46c772 where it was created) — it was never updated in any of the five rounds. This is the fifth appearance of the stale-status/stale-citation family on this line, and it evaded the prior sweep because review-04's stale-citation grep was scoped to the packet directory; `check:builder-docs` cannot read 007 (structural blind spot, OP6). **FAIL** — see REF1-R5-SCOPE-01.

**REF-5 (only declared payload differs; Layer 1/2, executable tree, sealed records unchanged; C/H and review independence preserved).** The scope outcome itself is **independently verified true** by the §5 battery (declared paths only; README confined to the two authorized sections; four core pages byte-identical; executable tree empty; sealed records unmodified; reviews 01–04 byte-identical from their recording commits to H; 17/17 log digests match). The contract's own proof block nonetheless requires "`git diff --check` … on clean C", and that required validation was **run and recorded only in round 1** (v01/01; `grep 'diff --check'` across all reports and raw logs matches v01/01 only). Rounds 2–5 omitted it, and its current result is **not clean** (rerun by me, mechanical):

```
git diff --check A C2  → exit 0
git diff --check A C3  → exit 2
git diff --check A C4  → exit 2
git diff --check A C5  → exit 2
git diff --check C5 H  → exit 2
git diff --check A H   → exit 2, 9 warnings, all inside validation-N raw logs:
  validation-02/02-typecheck.log:4        new blank line at EOF
  validation-03/00-bounded-sweep.log:24   trailing whitespace
  validation-03/02-typecheck.log:4        new blank line at EOF
  validation-04/00-layer1-scope.log:27-30 trailing whitespace (4 lines)
  validation-04/02-typecheck.log:4        new blank line at EOF
  validation-05/01-typecheck.log:4        new blank line at EOF
```

The four typecheck logs are byte-identical to each other (digest `a2051020…84be`; each ends `\n\n`), so the blank EOF is a carried capture artifact, not four independent defects. Two structural consequences: (i) the v05/01 instance is in **H's own payload** — fixable in a correction round; (ii) the v02/v03/v04 instances are in **sealed historical evidence**, which the contract's own exclusion ("Historical reports, reviews, decisions and evidence remain byte-identical") forbids this packet from modifying — so a fully clean `A..C`/`A..H` `--check` outcome is unachievable in scope without an owner disposition (recorded waiver or re-scoping via contract revision). The canonical-payload-only `--check` (all payload minus the raw evidence logs) is exit 0, confirming the defects are confined to pinned evidence. **FAIL** — see REF1-R5-CHK-01. The FAIL rests on the required clean-C validation not passing and not being recorded, not on any scope violation, which I verified absent.

## 9. Disposition of prior findings (re-verified at H, not inherited)

- **REF1-R1-STATUS-01** (007 narrative asserted acceptance outstanding): **CLOSED, non-regressing.** At H the hold paragraph ends "That paragraph stands as the record of the hold at its own date." plus a `Resolved since` paragraph; my case-insensitive negative grep over 007 finds no stale status phrase anywhere (the only "remains … OPEN" is row 489's in-row dated chronology, closed later in the same row — a record of its own date, as 006's append-only rows work).
- **REF1-R1-CONV-01** (shipped-status assertions on pages carrying none): **CLOSED, non-regressing.** Grep over `concepts/` + `mechanisms/` at H: only Status-line negations ("This is target specification, not shipped behavior"), the `execution-cycle.md:30` negation ("this page states the contract, not what has shipped"), and `evidence.md:3` (pre-existing K1.0 decision reference, accepted as such in prior rounds). No candidate SHA appears on any canonical page.
- **REF1-R1-NAV-01** (only two-target reference entry): **CLOSED, non-regressing** (65 entries, 0 two-target).
- **REF1-R2-DOC-01** (`roadmap.md:77` "exact implementation evidence"): **CLOSED, non-regressing** — `roadmap.md` now says the page retains the delivery mechanism unchanged and defers status to the ledger; the contract's secondary instance was reconciled in rev 2 with the superseded wording quoted in a dated note.

I also confirmed the four sealed review records (review-01..04) are byte-identical from their recording commits to H (`git diff --exit-code` clean for each), so their mixed verdicts (ACCEPT/CR/CR/ACCEPT) remain as recorded history; per the task I used them only as a finding list to re-verify, and my verdict is derived independently. Review-04's ACCEPT binds **only exact H3** and says so in its own text; the grant (f8dd3b4) and rounds 4–5 postdate it, so H3's acceptance covers none of C4/H4/C5/H — correctly stated by the row, correctly not extended by me.

## 10. Layer-1 grant: the requested adjudication (judge, not accept)

The report and contract explicitly ask a reviewer to **judge** whether the owner's Layer-1 grant is authorized against the standing rule. The rule: "Change Layer 1/2 only when the whole-system model or major abstraction changes" (AGENTS.md:17; 006 "Maintaining the mental-model reference": "Change Layer 1/2 only for a whole-system or major-abstraction change"; 009:92: "…only if accepted work changes the whole-system model or a major abstraction; **do not churn them for every packet**"). The grant (contract rev 3, `f8dd3b4`, recorded **before** the payload commit, no payload byte in that commit — verified): the owner, 2026-09-16, "for `mental-model/README.md`, all the part in `## How these pages are organized` and `## Target, not shipped` can be modified", under the standing rule that the five Layer-1/2 core pages are "not immutable, just need to have a clear discussion instead of change them secretly."

**My judgment: the grant stands as authorized.** Reasons:

1. **The owner is the scope authority upstream of the guardrail.** The rule is phrased as a constraint on an agent deciding on its own ("do not churn them for every packet"); it is an operational guardrail, not a limit on the owner's power to set packet scope. 006's actual routing for scope changes is "Keep the contract a current requirement map" plus owner release — and the grant is exactly that: dated, quoted verbatim, section-specific, recorded in the contract before the payload, rather than justified inside a report.
2. **The content is documentation organization and defect repair, not model substance.** `## How these pages are organized` is Layer 1's own subject; the changed rule is the single-status-owner rule this packet's own four rounds kept violating (the rule's home is 006's "one authoritative status" + the ledger, which the change points to, not restates). The second section repairs prose that became **false** after K1.1 was accepted ("Only the K0 gate is complete", K1.1 in the future tense), and is written so its failure mode is *incomplete* rather than *false*.
3. **The conflict was surfaced, not silently resolved.** Rev 4 quotes the standing rule, states "On its face this payload is outside that permission", gives both authorization arguments "for a reviewer to judge rather than to accept", and names the remedy if a reviewer disagrees. I performed that judgment; nothing in the record asks a reviewer to waive any obligation.
4. **The confinement is byte-proven** (§5: two sections, nothing else; anchors intact; D-freeze intact).

Caveats (owner observations, not findings): (a) there is no separate decision artifact — the grant exists only as a quoted instruction inside the contract, which is lighter than the sibling's KC1-DEC-7/`decision-01.md` pattern and acceptable under 006 but worth noting for consistency; (b) the contract's sentence "006 routes scope amendments through exactly this artifact" is a loose citation — 006 contains **no literal "scope amendment" clause** (grep-verified empty); the actual routing is the requirement-map-plus-owner-release described above; (c) if the owner disagrees with this judgment, the named remedy — revert the two sections to their state at D and take the change as its own packet under the standing rule — is cheap, and nothing else in this packet depends on it. The grant authorizes the change; it does not exempt the two sections from review: rev 3 itself says "REF-4 and REF-5 now also govern these two sections", and I applied both to them.

## 11. Reconciliation with implementation-05 and the raw evidence

implementation-05's claims reconcile with my independent measurements on every point I checked: builder-docs 57/847/38 (rerun ✓), typecheck clean (rerun ✓), the full gate run cited at H4 on v25.2.1 (2322/356; 1949/283; 264/55) versus my v22.22.3 rerun at H (2320 + 2 cancelled; 1947 + 2; 264/55/0) — the deltas are exactly the two known legacy cancellations and nothing else; "no `mental-model/`, executable or record byte moved in round 5" (verified: C..H = the 6 evidence/ledger files). The row-490 transcription of all four prior reviews, all C/H SHAs, and all verdicts matches git and the sealed records; the SHAs in it all exist and match their roles. The round-5 final check (v05/00, read in full) found and surfaced the normative conflict (closed by rev 4) — it did **not** re-run or record `git diff --check`, and no prior reviewer raised that omission; it is raised here as REF1-R5-CHK-01. The implementer session's self-declared disqualification is respected: this review is the fresh independent review the contract and row require, and I verified the row's factual content independently rather than trusting the self-assessment in either direction.

## 12. Findings

**REF1-R5-SCOPE-01 — P2 (fails REF-4).**
Location: `docs/development/007-work-packets.md`, live K1.1-reference-01 section, lines 214–222 (citation at line 219).
Source/counterexample: the section's "Scope and acceptance: [contract revision 1]…, identity-domain clarification, in-process value capture, accepted delivery status and navigation only" is byte-frozen at revision 1 across all 19 commits (single md5 across the range) while the contract is at revision 4, the payload now includes the owner-granted Layer-1 README sections, and the same file's authoritative row 490 already carries the full rev-1→rev-4 chronology. The live section therefore misstates this packet's own current scope, hides the only Layer-1 change in the tree from the development front door's narrative, and contradicts the same file. Same family as REF1-R1-STATUS-01 / REF1-R2-DOC-01 / KC1-R4-PROC-02; fifth appearance; missed by the prior sweep only because review-04's grep was scoped to the packet directory and `check:builder-docs` cannot read 007.
Required outcome (not a patch prescription): the live section must agree with the revision-4 scope — current contract revision named, the two authorized README sections and the owner's bounded Layer-1 exception recorded (dated form acceptable, as the sibling's section does inline) — fixed inside the packet's declared 007 payload, without touching the row's append-only chronology or any sealed review.

**REF1-R5-CHK-01 — P2 (fails REF-5).**
Location: the packet's validation record as a whole; concretely `validation-02/02-typecheck.log:4`, `validation-03/00-bounded-sweep.log:24`, `validation-03/02-typecheck.log:4`, `validation-04/00-layer1-scope.log:27–30`, `validation-04/02-typecheck.log:4`, `validation-05/01-typecheck.log:4` (all `git diff --check` warnings at A→H; §8 for the full output).
Source/counterexample: the contract's proof block requires `git diff --check` on clean C; it was run and recorded only in round 1; rounds 2–5 omitted it (008 requires deviations to be recorded, not silent); and the check as currently required is not clean (exit 2 at C3, C4, C5, C5→H, A→H). The canonical payload alone is `--check`-clean, and five of the nine warnings sit in sealed historical evidence this packet may not modify — so the required cumulative outcome is unachievable in scope without an owner disposition.
Required outcome: in the next round, run and record `git diff --check` on the clean C (and on H); regenerate the round's own typecheck log without the trailing blank line (the v05/01 instance is current payload and fixable); and obtain an owner disposition for the six warnings inside sealed v02–v04 logs — a recorded waiver or a contract-revision re-scoping that pins raw evidence logs as exempt from the clean-C check — since the implementer cannot unilaterally relax its own contract's proof requirement nor modify sealed records.

**REF1-R5-WORD-01 — P3 (optional; does not fail a criterion by itself).**
Location: `mental-model/README.md`, `## How these pages are organized`, the new bold sentence: "**No page in these layers records what has been built.**"
Counterexample: the same payload's `sources.md` records acceptance provenance (including which accepted commit a rule derives from), and the very next sentence of the same section carves out that "The navigation pages may record provenance — which decision a rule came from … — but they defer that question to the ledger too." The absolute headline, read alone, overstates against that carve-out and against `sources.md`.
Suggested outcome: scope the headline to current status (e.g., "records what has been built" → "records current build/acceptance status") or otherwise reconcile it with the provenance carve-out in the same paragraph.

## 13. Owner-provided observations (not findings)

- **OP1 (carried):** two legacy Effect tests cancel on Node v22 (`fast-slow-equivalence.test.ts:252/:283`, `cancelledByParent`), pre-existing at B, deterministic on v22; correctly recorded with no all-supported-Node green claim. Owner decision: fix on the test line or accept the v22 cancellation.
- **OP4 (still present at H):** `014-owner-progress-summary.md:123–124` — "The separate reference supplement records the accepted identity/value boundaries and **updates delivery evidence**; it awaits independent review." The "updates delivery evidence" phrasing remains ambiguous (delivery rules are unchanged; what is recorded is acceptance provenance/status). Final-cleanup item; 014 is admin, outside C/H payload.
- **Grant artifact form:** the Layer-1 grant exists only as a quoted instruction inside `contract.md` (no separate decision artifact); lighter than the sibling's `decision-01.md` pattern (§10 caveat (a)).
- **OP6 (structural):** `check:builder-docs` reads neither `work/**` nor `007`, so stale ledger/contract citations in 007 are structurally invisible to the gate that otherwise passed; a persistent fix (a dedicated `scripts/` packet or a builder-docs extension) is the owner's call.

## 14. Per-criterion verdicts (cumulative A→H, bound to exact H)

| Criterion | Verdict | Basis |
|---|---|---|
| REF-1 | **PASS** | §8: semantic re-read + coordinator.ts byte-identity + kernel suite rerun (264/55/0) |
| REF-2 | **PASS** | §8: semantic re-read + conformance rerun (1947 + 2 cancelled = OP1 only); no wire/containment claim |
| REF-3 | **PASS** | §8: delivery rules byte-unchanged; acceptance/integration separation verified against git (H5 not on main); orientation claims map to real later gates |
| REF-4 | **FAIL** | REF1-R5-SCOPE-01: 007's live section frozen at revision 1, omitting the Layer-1 grant, contradicting row 490 — inside this packet's own declared 007 payload |
| REF-5 | **FAIL** | REF1-R5-CHK-01: required clean-C `git diff --check` not run/recorded in rounds 2–5 and not clean as required (9 warnings, all in raw evidence logs); the scope outcome itself independently verified true |

## 15. Coverage gaps and unverified obligations

- Raw logs v01/02–03, v02/* (5), v03/01–02, v04/01–02, v05/01–02 were digest-verified against their MANIFESTs (17/17 match) but not read line by line (v01/01, v03/00, v04/00, v05/00 were read; all `--check`-flagged lines were inspected directly).
- `implementation-03.md` was not read (implementation-04/05 read; 01/02 skimmed); its content is superseded by the sealed reviews it produced, which were verified unedited.
- No Node v25.2.1 rerun (toolchain unavailable); the implementer's v25.2.1 logs were inspected, and the v22.22.3 reruns account for every numeric difference (the OP1 pair).
- The owner's original session messages (2026-09-15 instruction, 2026-09-16 grant) are not accessible to me; their authority rests on the dated, quoted recording in the contract and the ledger row, which is the process's own routing for owner releases.
- Benchmark repository not accessed (no external-gate claim in this candidate; none required).

## 16. What this record does and does not do

It binds a verdict to exact H `7fe0bba85f630744253ce0470206fd7e78709b7d` only. It does not accept H (or H3/H4, whose coverage review-04 already bounded to H3); it certifies no administrative or merge commit after H; it does not merge or release anything, modify any sealed record, or re-open the sibling's acceptance; it makes no Agent-behavior or external-gate claim. Corrections for the two P2 findings follow the compact handoff below; acceptance of a successor candidate, if one comes, will be a fresh cumulative review bound to its own exact SHA.

## 17. Exact verdict text for transcription (007 ledger row, K1.1-reference-01)

> **[Review-05](work/K1.1-reference-01/review-05.md)** (independent Arena.ai agent-mode reviewer, fresh session, full shell, Node v22.22.3, all proof commands rerun at exact H; recorded at [record commit of this review]): `CHANGES REQUIRED` — REF-1, REF-2, REF-3 PASS; REF-4 FAIL on `REF1-R5-SCOPE-01` (P2: 007's live reference-01 section still cites contract revision 1 and omits the owner-granted Layer-1 README scope, byte-frozen across all 19 commits while the contract moved to revision 4 and the same file's row carries the full chronology); REF-5 FAIL on `REF1-R5-CHK-01` (P2: the contract-required `git diff --check` on clean C was run and recorded only in round 1 and is not clean as required — 9 warnings, all inside validation raw logs; six of them in sealed historical evidence requiring owner disposition); optional P3 `REF1-R5-WORD-01` (README headline "No page in these layers records what has been built." overstates against the same section's provenance carve-out and `sources.md`). Scope battery otherwise clean: declared paths only, two-section confinement byte-proven, executable tree and sealed records untouched, sibling's acceptance intact.

## 18. Compact correction handoff (008 form — locators only, no patch prescription)

- **REF1-R5-SCOPE-01** → `docs/development/007-work-packets.md` lines 214–222: make the live section agree with the revision-4 scope (current revision; the two authorized README sections; the owner's bounded Layer-1 exception), inside the declared 007 payload; leave the row's chronology and all sealed reviews untouched.
- **REF1-R5-CHK-01** → the validation record: run and record `git diff --check` on the clean C (and H) in the next round; the next round's own typecheck log must not carry a trailing blank line; the six warnings inside sealed `validation-02/03/04` logs need an owner disposition (recorded waiver or contract-revision re-scope) because the contract's own sealed-records exclusion forbids the implementer from fixing them.
- **REF1-R5-WORD-01 (optional)** → `mental-model/README.md` `## How these pages are organized` headline vs its provenance carve-out / `sources.md`.
- Re-run the four contract proof commands at the clean C; the independent reviewer will re-assess all five REF criteria cumulatively from A to the new H.

CHANGES REQUIRED