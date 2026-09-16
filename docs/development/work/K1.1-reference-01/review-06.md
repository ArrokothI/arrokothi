# Independent cumulative review 06 — K1.1-reference-01 (contract revision 5)

**Verdict, bound to the exact candidate:** **CHANGES REQUIRED**, bound to exact candidate
**H6 `bbcbf300acb583b87dbf6b4bd323700bccd9e90f`** (payload **C6 `2f1a7ced4ab0a4b340132899bd61fc14ae678a6d`**,
base **A `519ba002378707a4deccff1ea0a243d21eb694b7`**). This record accepts nothing, certifies no
commit after H6, and authorizes no merge, cleanup completion or successor release.

This file is written by the reviewer in the reviewer's own session branch. It is **not** transcribed
into the candidate branch, `007`, or any sealed record by this session; §17 supplies the exact text
for the owner's or its delegate's administrative commit A. The candidate branch was not pushed to.

## 1. Session, model, date, environment, access and access limits

- **Session:** Arena.ai Agent Mode, independent review session, working branch
  `arena/01a0a84c-arrokothi` at `/home/user/arrokothi`. Fresh session; it authored no C, H or A
  anywhere in the K1.1 / K1.1-correction-01 / K1.1-reference-01 line and has no prior record in it.
- **Model:** not stated. Arena Agent Mode is served by many different underlying models and this
  sandbox does not expose which one is answering. 008 forbids fabricating a session/model, so the
  mode, date and verified tooling are recorded instead — the same form review-02…05 used.
- **Date:** 2026-09-16 (UTC).
- **Tooling:** Node **v22.22.3**, npm 10.9.8, `git 2.39.5` (repo reports 2.39.5 in review-05 too).
- **Access used:** full shell (read/write inside my own session branch), read access to
  `origin` (`git ls-remote`, `git fetch --unshallow`), `gh` authenticated as a bot (used only to
  check whether a PR container exists for this branch: **none** — permitted, not mandatory under 006).
- **Integrity of my own run:** the checkout arrived **shallow** (`.git/shallow`, `rev-list --count
  HEAD = 1`, HEAD with no recorded parent). Every pinned identity read as a bad object until
  `git fetch --unshallow origin` (627 commits, `.git/shallow` gone). This is the identical trap
  review-04 of this line disclosed and repaired. **No claim below was made before that repair**, and
  every scope/diff result in this record was measured with the full history present. `npm install`
  was needed (empty `node_modules`) — again the round-4 failure mode; it modified
  `package-lock.json`, which was restored and re-verified byte-identical to the committed file before
  any claim was recorded, and the working tree is clean against H6 at the time of writing.
- **Not accessible, and whether it was required:** the implementer's original sandbox; the owner's
  in-session messages (the 2026-09-15 cleanup instruction, the 2026-09-16 Layer-1 grant, and the
  2026-09-16 decision behind contract revision 5); the benchmark repository (E0–E6). The first two
  are not required to review this candidate except as noted in **REF1-R6-AUTH-01** (a gate amendment
  whose authorization exists only as a quotation inside the implementer's own records); the
  benchmark repository is not required because the candidate makes no external-gate claim.
  **006's external-blocker path is not triggered:** no required source, pinned log or evidence
  artifact was unavailable, so the outcome is not `BLOCKED_EXTERNAL`.

## 2. Candidate identity, packet label, and the label in the review request

- The review request names the candidate **"K1.1-correction-02"**. No such packet exists: 007 has
  `K1.0-correction-02`, `K1.1` and `K1.1-correction-01`, and `docs/development/work/` has no
  `K1.1-correction-02`. The head of the named branch is the **sixth round of K1.1-reference-01**, a
  documentation supplement, *not* a second correction packet of K1.1. This review therefore examined
  the candidate actually submitted at that branch head and reports on it; if the owner intended a
  different artifact, that artifact is not on this branch.
- Remote advertisement (the candidate's stated stop condition, implementation-06 §"Push state"):
  `git ls-remote origin` in this session returns `refs/heads/codex/k1.1-correction-01-review-findings`
  = `bbcbf300acb583b87dbf6b4bd323700bccd9e90f` = **H6**. The report's own note that the remote then
  advertised H3-ref is superseded by a later verified push, exactly as 008 anticipates; the required
  condition is met and the reviewed head is the advertised head. `refs/heads/main` = `07f7502c…`.
- Ancestry and identity, each verified from git in this session: A, D
  (`0ee13f8138af52107d86967043bcc460faba8893`), K1.1-correction-01 **H5** (`52b1600f…`), its
  authentic ACCEPT record `b1050133b2b684065251b7b4b7f508e95e771bef`, the round-5 candidate
  `7fe0bba8…` (H5-ref), review-05's record `bf4d4e4fd20c7e57001f9945c140c34adbae2eb6`, C6 and H6 all
  exist and are ancestors of H6; `A..H6` is **linear**; H6's parent is C6; C6's parent is the
  review-05 record commit. `git diff --name-only C6 H6` = **exactly** the six declared
  administrative files (report, `validation-06/` three logs + MANIFEST, `007`); the `007` change at
  C6→H6 touches **only line 497**, this packet's ledger row.
- Prerequisite and release: the supplement depends on independently accepted K1.1-correction-01 H5
  (byte-identical implementation at H6 — `git diff H5 H6 -- packages tests examples scripts` is
  empty) and releases no successor; `next_release: none` is recorded in the contract and the row ✓.
  Owner release/authority for this packet rests on the 2026-09-15 cleanup instruction quoted in the
  contract and the ledger — see §1 limits and REF1-R6-AUTH-01.

## 3. Governing baseline, and the process-change check the task requires

- Read in full at the governing baseline (the candidate's A, which 006 names):
  **006-development-process**, **007** (this packet's section, its row and the K1.1/K1.1-correction-01
  sections), **008** record fields, **012** methods, plus `docs/development/README.md` front door,
  **015**, `AGENTS.md`, `CLAUDE.md`, `mental-model/README.md`, `reference.md`, `roadmap.md`, and the
  two canonical pages whose content this candidate documents. Verified mechanically:
  `git diff A H6 -- 006 008 012 009 AGENTS.md` is **empty**, so the named policy baseline is the
  integrated one and this packet changed no policy file.
- **Contract revision 5 is a gate-changing artifact and was reviewed as one.** It was not treated as
  authority for anything: my coverage map (§4) and every obligation below come from 006/012/008, the
  canonical owners and the code. 006's requirement that a candidate changing process "name the
  integrated policy baseline governing its review" is met (contract "Authority and anchors" names the
  supplement base and the unchanged 006/008/012). Nothing in the candidate text instructs a reviewer
  to waive an obligation; the contract and report both *invite* challenge to revision 5 ("a reviewer
  should test both rather than accept them"; "If you think this is weakening, say so").
- Adjudication of that invitation is §8. The candidate also cannot bind this round: I re-derived the
  check's subject matter myself (§6) rather than adopting revision 5's scoping as the definition of
  what must be clean.

## 4. Independent coverage map, derived before reconciling with the report

Derived from 007's K1.1/K1.1-correction-01/K1.1-reference-01 scopes, the contract's REF-1…REF-5,
`KC1-DEC-*`, K1.1 contract revision 5 C1–C10 and the canonical owners — then compared with
implementation-06's own table (which it largely matches; the gaps found are §7, not missing rows).

| Obligation / source | Input or negative case | Expected observable facts and forbidden changes | Location and result |
|---|---|---|---|
| REF-1 creation-key vs Input ID domains; `identity.md` + `creation.md` example vs **accepted** behavior | same producer reuses `report-17` text for **later ingress**; equal → new ingress; replay; conflict; creation retry | separate receipts retained; initial Event never indexed in `byInputId`; no creation-replay/conflict path consulted; delivery vocabulary only *linked* | `coordinator.ts:704–725,742–749,774–776,856,925`; `creation.test.ts` C1 rows, `ingress.test.ts:209/235/253` (K11-R15-ID-01 three-case set); `npm run test:kernel` rerun **264 pass/55 suites/0 fail**. **PASS** |
| REF-2 `values.md#in-process-value-capture` = one snapshot, own-data, refusals; **no** wire/containment claim | caller mutates after capture; descriptor/read disagreement; disturbed serializer; hostile prototype | validation+bytes+retention+inspection all from the one snapshot; accessor/hole/extra/symbol/non-enumerable/cycle/present-`undefined` refused not dropped; encode failure → located refusal, never a thrown escape; containment/wire claims forbidden | `values.ts:13–14,38–40,49–50,121,231–240,574–598,693–706,712–723,857–880,` `encode`/`accept`; `values.test.ts` 358 lines; `test:conformance` rerun. No containment/wire sentence anywhere in the payload (full-diff read + grep). **PASS** |
| REF-3 delivery rules unchanged; accepted-vs-integrated separated in `execution-cycle.md` and `002` | compare the page body against A; compare its wording against git | only the status line replaced; every delivery rule byte-identical; no shipped/integrated conflation | `git diff A H6 -- mechanisms/execution-cycle.md` = 1 line pair; `002` = 5 lines, both halves verified true against git (H5 not on main). **PASS** |
| REF-4 one owner per definition; related pages (identity, batch/wait, acceptance, action/authority, recovery, resources, output, evidence) assessed; navigation valid | two-target index entries; concept-page Status lines; page-level status assertions; inbound anchors; stale statements about the edited pages | 1 target per entry; concept pages carry no Status line; no canonical page records build/acceptance status; every new/changed link resolves | 65 entries, **0** two-target; **0** concept pages with a Status line, 16/16 mechanism pages with one (all negations); SHA grep under `concepts/`+`mechanisms/` = none; my own anchor check of all 11 new/changed links (incl. `007` and `README.md#target-not-shipped`, `reference.md#how-pages-are-named`) all resolve; `check:builder-docs` rerun 57/847/38 exit 0. Wider stale-statement sweep: §9. **PASS**, one P3 residual (REF1-R6-WORD-02, §7) |
| REF-5 only declared payload differs; Layer 1/2, executable tree, sealed records unchanged; C/H/A and independence preserved | whole-tree comparison at both operands of the range; README section-by-section vs D; reviews 01–05 after their recording commits; **the contract's own proof steps** | 52 files, all documentation; README = 8 sections, 6 byte-unchanged, 2 changed (both authorized); core four pages byte-identical to D; `D..H5 -- mental-model/` empty; executable/manifests empty; 0 sealed modifications; H6 ⊂ declared allowlist; every raw log matches its digest; **every proof step the contract now requires is run and recorded, on clean C *and* on H** | All scope facts **verified true** (my own commands, §6). **FAIL** on the recorded proof steps: REF1-R6-CHK-01 (§7) |
| Interaction: a *gate* amendment made inside a payload commit after the gate failed | compare revision-4 → revision-5 text; compare the amendment against 006's "never weaken a gate solely because an implementation failed it"; test the three claims the amendment rests on | criteria table byte-identical; no acceptance condition deleted; the exemption covers only files that must not be edited; the check is genuinely run and genuinely clean at **both** operands; the negative control proves what the report says it proves | criteria table unchanged rev1→rev5 ✓; no requirement deleted ✓; but see REF1-R6-EXCL-01 and REF1-R6-CHK-01 |
| Interaction: single-status-owner rule (new Layer-1 text) vs the same page, `002`, `sources.md`, `roadmap.md` | read the rule against each page it constrains and against the same section's own sentences | the rule must not be contradicted by the page carrying it, and must not create a second owner for a question `002` already owns | sources.md reconciled in round 6 ✓; **README's own next paragraph and its orientation sentence are still in tension** → REF1-R6-WORD-02 |
| Interaction: evidence fidelity of the *round's own* record (008 fields, 006 attachment rules) | per-log env/C/exit, reuse of identical captures across rounds, digests | captures name C/environment or the MANIFEST does; digests match; deviations recorded not silent | 20/20 logs across six rounds match their MANIFEST digests ✓; env+C named in the round MANIFEST ✓; §4–§6 of `00` print results without commands and the round-1/2 `HEAD:`/`clean:`/`node:` header is gone → REF1-R6-EVID-01 (P3) |

**Material method exclusions, with reasons.** Deterministic-execution method is applied only as a
cross-check (reruns) because the candidate adds no executable byte; no new ablation is owed by the
contract and none was invented here. Race/fault, Native Runtime/Driver and Packaging/release methods
are excluded: the payload states no ordering/persistence/recovery, native-integration or
installability claim — verified by reading the whole payload diff, not by the label "documentation
only". External evidence/gate is excluded for the same reason (no E-gate claim; the benchmark
repository was not needed).

## 5. Surrounding source, tests, examples and migration claims inspected (not just the delta)

`packages/kernel/src/{coordinator,values,driver,own-array,index}.ts`, `packages/kernel/tests/`
(creation, ingress, dispatch, values, harness, and the sealed sibling suite names cited above),
`tests/conformance/` layout, `examples/execution-kernel-minimal`, `scripts/check-builder-docs.ts`
(read to learn exactly what that gate can and cannot see — it reads `docs/development/README.md`,
`README.md`, `AGENTS.md`, `docs/README.md`, the SDK README, guides, the example README and
`mental-model/**`; it **cannot** read `007` or `work/**`, which is why OP6 recurs), `package.json`
scripts, `mental-model/{README,reference,roadmap,sources}.md`, all touched concept/mechanism pages in
full, `docs/development/{001,002,006,007,008,009,012,013,014,015}`, the two K1.1 line contracts and
the sibling's `review-08`, plus every prior record in this packet's directory.

## 6. Mechanical verification performed by me (not inherited)

- Scope: `git diff --name-only A H6` = **52 files**, all documentation; non-`docs/` changes = the 8
  `mental-model/` files only; `git diff A H6 -- packages tests scripts examples *.json` **empty**;
  `kernel/runtime/driver/deployment` byte-identical to **D**; `git diff D H5 -- mental-model/`
  **empty** (the sibling's KC1-DEC-7 freeze and its ACCEPT intact); `006/008/009/012/AGENTS.md`
  unchanged A→H6; reviews 01–05 byte-identical from their recording commits to H6; `014` and the
  three sibling admin records changed only in the administrative commit `154a765`/`1c98f61`/`8e58325`,
  declared out of C/H payload.
- README confinement re-proved against D independently: 8 sections, same order, no heading renamed,
  6 byte-unchanged, exactly the 2 authorized ones changed; the inbound anchor
  `reference.md → README.md#target-not-shipped` survives.
- Evidence: **20/20** raw logs in `validation-01…06` match their MANIFEST SHA-256s (3+5+3+3+3+3). Self-correction: a first draft of this record said 21; the packet holds 20 raw logs. Corrected in place with the correction stated here, which is the same discipline this line applies to its own evidence logs.
- Whitespace, measured at **both** operands rather than at one:
  - `git diff --check A C6` → exit 2, **9** warnings (8 in sealed `validation-02…04`, 1 in
    `validation-05`) — the round's number, confirmed; the implementer's correction of review-05's
    "six/five" split to **8 sealed + 1 current** is right.
  - `git diff --check A H6` → exit 2, **12** warnings (the 3 new ones are this round's own files:
    `validation-06/01-typecheck.log:4`, `validation-06/00-findings-and-scope.log:15` and `:53`).
  - Scoped, exactly as revision 5 specifies: `A H6` → **exit 0**; `C6 H6` → **exit 0**;
    `A H6` minus *all* `*.log` → exit 0; the named authored classes (`mental-model/`, `002`, `007`,
    this contract, `implementation-06.md`, `review-05.md`, `validation-06/MANIFEST.md`) → **exit 0**.
    So every substantive claim of "authored content is clean" holds at H6, and the exclusion cannot
    hide a payload/scope violation (REF-5's content check is a separate, unaffected step).
- Reruns at exact H6, Node v22.22.3: `check:builder-docs` 57 files / 847 links / 38 imports, exit 0;
  `typecheck` exit 0; `test:kernel` **264 pass / 55 suites / 0 fail**; `test:conformance`
  **1949 tests / 283 suites / 1947 pass / 0 fail / 2 cancelled, exit 1**.
- Inspected, not rerun: the six MANIFESTs and the `00` logs of rounds 2, 4, 5, 6 in full; round 1's
  `01-clean-C.log` (which shows the packet's earlier evidence form: `Command argv: [...]` + `exit:`
  for every step, including `git diff --check A HEAD` → exit 0); the implementer's v25.2.1 suite
  numbers in implementation-05/06. My v22 reruns and review-05's v22 reruns agree exactly
  (1947 + 2 cancelled; the cancelled pair is in `tests/conformance/effects/fast-slow-equivalence
  .test.ts`, the OP1 pair, deterministic on Node 22) — **I reproduced OP1 on this machine, which the
  implementer's Node 18/25 environment says it cannot**. That is an independent confirmation of the
  carried owner observation, not of any claim this packet rests on.
- Not run and why (claim limits): full `npm test`, `test:sdk`, `test:evals`, `test:packages` — the
  candidate makes no claim at C6/H6 that rests on them (it states the full gate was run at H4-ref on
  v25.2.1 and reran nothing because no executable byte differs); no Node v25.2.1 rerun (not
  installed); no live-provider or paid run (none claimed).

## 7. Findings

Stable IDs; each names the governing criterion, the exact location, the counterexample, the required
outcome and how to validate it. None prescribes a patch.

**REF1-R6-CHK-01 — P2 — fails REF-5.**
Location: `docs/development/work/K1.1-reference-01/validation-06/00-findings-and-scope.log` §1 and
`implementation-06.md` §"Validation and limits"; governing text: `contract.md` revision 5 ("must be
run and recorded in every round's validation evidence, **on the clean C and on H** … A round that
omits it fails REF-5").
Counterexample: the round records `git diff --check A C6` (exit 0) and the unscoped A→C6 count (9).
It records **no** check on H6 — neither `A H6` nor `C6 H6`, scoped or unscoped. The candidate's own
new rule therefore makes this round fail REF-5. The omission is not cosmetic: had the H operand been
measured, the record would have shown the cumulative unscoped total rising from **9 to 12**, with
three warnings in files this round added — one of them an authored padded print inside the round's
own evidence log (`validation-06/00-findings-and-scope.log:53`, trailing space). The scoped command is
stable against that: because captures are excluded, the H-scoped result cannot be changed by the log's
own bytes, so the check *was* recordable inside H6 without any self-reference problem.
Required outcome: in the next round, run and record the scoped check at both operands actually under
review (clean C and the candidate H), report the unscoped count at the reviewed head with its reason,
and make the requirement map carry the rule where a reader looks for it — the contract's proof sentence
("… on clean C", `contract.md:112`) and the REF-5 row still describe the pre-revision-5 requirement,
so the live requirement map and the appended amendment note state the obligation differently (012:
keep the contract a current requirement map).
Validation: the round's raw log shows argv + exit for each check at C and at H; `grep 'diff --check'
validation-07/*` shows both operands; a reviewer recomputes both.

**REF1-R6-EXCL-01 — P2 — misstated claim about the amendment (governs REF-5's proof step and REF-4's
one-owner precision).**
Location: `contract.md` revision 5 (the "What stays checked … deliberately everything else, so this
cannot be used to hide sloppy authoring" and "Transcribed reviews are not excluded … they are clean
today" paragraphs); `implementation-06.md` §"REF1-R5-CHK-01" and its coverage row "PASS — negative
control"; `007` row 497's repeat of that claim.
Counterexamples, all measured in this session:
1. The exclusion is by **path shape**, not by the property that justifies it. It exempts **453**
   `.log` files under every packet's `validation-*/`, including hand-authored narrative captures
   (e.g. `work/K1.0/validation-01/09-self-01-demonstration.log`, which contains prose and quoted
   source, not command stdout) and **33** logs no MANIFEST pins by digest — so "byte-captures that
   must not be edited" is not a property of the whole excluded class, and for the 33, digest-pinning
   would not even be broken by editing them.
2. "The negative control … proves the exclusion does not hide authored whitespace" holds only for
   non-`.log` pages. The control inserted a space into `mental-model/reference.md`. Whitespace emitted
   into a round's own capture *is* hidden, and demonstrably was: `validation-06/00:53` and `:15`.
3. The property that actually justifies an exemption — "sealed, must not be edited" — cuts across the
   chosen boundary the other way too: on the branch range `main..H6`, after the revision-5 scoping,
   **31** warnings remain, all of them in the *sibling's sealed transcribed reviews*
   (`work/K1.1-correction-01/review-01…04.md`, markdown hard-break spaces). Those are exactly as
   un-editable as the logs, and revision 5's "if a future transcription ever carries
   authored-looking whitespace, that is a fresh decision" leaves the next actor (the owner's
   integration-time check against current main) with a failing check it cannot fix in scope.
4. Scope relative to the authorized remedy: review-05 offered "a recorded waiver **or** a
   contract-revision re-scoping that pins raw evidence logs as exempt from the clean-C check" for the
   eight sealed instances. Revision 5 is a permanent, whole-tree, all-packets exemption of that file
   class. It is broader than the finding it answers, and the row's "narrowest that works" states
   sufficiency ("the whole tree minus `.log` exits 0"), not narrowness.
Assessment for the record: this is **not** a relaxation of an acceptance condition in substance — the
REF-1…REF-5 criteria table is byte-identical across revisions 1–5, the executable/declared-path/
sealed-record checks that actually guard REF-5 are untouched and independently verified clean, and the
frequency of the hygiene check went from once-in-five-rounds to mandatory-every-round, which is a real
strengthening. See §8.
Required outcome: state the exemption by the property that earns it (output captures **and** sealed
records that must not be edited, with the digest-pinning basis named), or keep the path-shape rule and
say plainly what it no longer catches (authored whitespace inside capture prints, any packet's
`validation-*` logs, 33 unpinned files) plus the known consequence for sealed review transcriptions at
integration time; record the owner decision's **exact** authorized scope so no later round widens it by
precedent; and correct "proves"/"cannot be used to hide sloppy authoring" to what was actually
demonstrated. Validation: re-run the scoped check on a deliberate whitespace insertion in a round's own
log print and on the `main..H` range, and have the record report both honestly.

**REF1-R6-WORD-02 — P3 — REF-4 residual, sixth appearance of the family; inside the authorized
payload and fixable there.**
Location: `mental-model/README.md`, `## How these pages are organized` (the sentence naming the status
ledger as owning "whether that contract has been implemented, independently accepted or integrated"
"alone") and `## Target, not shipped` (the "Two documents answer that: the ledger … and the
implemented baseline lists the APIs that actually exist" sentence, and the orientation sentence
asserting the first protocol boundaries "are implemented under K1.1").
Counterexample: within the two authorized sections the page states (a) that the *implemented* question
is owned by the ledger **alone**, (b) that two documents answer it, with `002` one of them, and (c) a
present-tense build claim on a Layer-1 page. Round 6 fixed precisely this shape one sentence earlier
(REF1-R5-WORD-01: absolute headline vs the provenance carve-out) by scoping the **headline** to
"current build or acceptance status", but the absolute *ownership* clause in the following sentence and
the orientation claim were left. `002`'s own new line ("Integration … remain pending in 007") is
consistent, so nothing here is false today; it is a rule whose wording the same page contradicts, and
the orientation sentence is the kind of status prose the rule was written to stop being copied around.
Suggested outcome (not the only one): align the ownership clause with the split the next paragraph
already uses (ledger = accepted and integrated, `002` = which APIs exist), or qualify the orientation
line with the accepted-not-necessarily-integrated distinction the rule's own paragraph names.

**REF1-R6-EVID-01 — P3 — 008 record fidelity.**
Location: `validation-06/00-findings-and-scope.log` §4–§6 (results without commands) and the absence
in the round-6 logs of the header form round 1–2 used (`HEAD: <sha>  clean: yes`,
`node: vX  npm: Y  tsc: Z`).
Counterexample: a reader cannot reproduce "sealed records modified A..C6: none PASS" or "the standing
negative greps … 0 / none / none / 0" from the log, because neither the pathspecs nor the grep patterns
are in it; and `01-typecheck.log`/`02-builder-docs.log` are byte-identical to prior rounds' captures
(same digests `a2051020…84be`, `42d94006…dde5d`), so within the raw evidence a fresh run and a copy of
an earlier one are indistinguishable. Not fabrication — I re-derived all of it independently (§6) and
it agrees — and the "no runtime suites this round" decision is explicitly justified and consistent
with 006's "no duplicate full-suite runs solely to use every alias".
Required outcome: print each guard's command (or reference a script path in the log), and restore the
per-capture `HEAD:`/`node:` header or state in the MANIFEST that a named log is intentionally a
carried-forward capture.

**REF1-R6-AUTH-01 — P3 — authentication of a gate change (006 owner-decision provenance).**
Location: `contract.md` revision 5 ("On the owner's decision of 2026-09-16…" as stated in
`implementation-06.md` and repeated in `007` row 497).
Counterexample/impact: the only record of the instruction that authorizes narrowing a proof
requirement is a quotation inside the implementer's own contract and report, authored by the session
the packet itself disqualifies. Review-05 recorded the same shape as an acceptable-but-noted caveat
for the rev-3 Layer-1 **scope** grant; a **gate** change is the case where the form matters, and the
sibling line already has the heavier pattern (`work/K1.1-correction-01/decision-01.md`). I did not
treat the absence of a separate artifact as a waiver of any obligation — I verified the amendment's
substance directly — but the packet cannot be checked for fidelity to "the owner's decision", only to
the contract text.
Required outcome: transcribe the dated owner instruction (exact wording, addressee, and what it does
and does not authorize) into an immutable decision artifact under 008 and link it from the row; or
record the owner's own confirmation in the ledger. This is the only obligation in this review I cannot
verify from repository content.

## 8. Revision 5 judged as asked: gate change, and is it a weakening?

006 forbids weakening a gate *solely because an implementation failed it*. Measured against that rule:

1. **What the amendment is about.** The nine failures are whitespace in pinned output captures;
   none is authored content, and the authored tree minus `.log` is clean at both operands (verified
   by me). The alternative that would "pass" the unscoped check is editing sealed captures, which
   breaks their recorded digests and 006's seal preservation. So the candidate is not excusing a
   failed semantic obligation; it is declining a linter over files that must be byte-faithful.
2. **Did any acceptance condition move?** No. `REF-1…REF-5` rows are byte-identical revisions 1→5
   (verified by revision diff); the payload path list, the exclusions, the anchors and the
   sealed-record rule are unchanged; REF-5's substantive content checks are untouched and pass.
3. **Did the review standard applied to the candidate move?** No. This review ran the full 006/012
   duty set, re-derived the check at both operands, and reviewed the amendment as an artifact.
4. **Net strength.** Mandatory-every-round with an explicit failure condition replaces a once-in-five
   nominal requirement: stronger on frequency, narrower on file class. That asymmetry is the honest
   way to describe it; "stronger gate, not a weaker one" is defensible for REF-5's substance but not
   unqualified — hence REF1-R6-EXCL-01's required outcome to state the boundary and the residual gap
   instead of claiming proof the control did not provide.
5. **The rejected alternative.** The report names the standing waiver the owner declined and asks a
   reviewer to prefer it if the scoping is unacceptable. That is a legitimate choice to put to the
   owner: a per-round recorded waiver over exactly the sealed instances would keep the check whole and
   would not create an all-packets precedent; it costs a row line per round. Either is available; this
   review does not prescribe which, and specifically does not prescribe a patch.

**Judgment: the amendment is authorized in form (owner decision, recorded before and separately from
any content change, criteria untouched) and does not relax this packet's acceptance conditions; two of
its justifying claims are overstated and one obligation it created is unmet this round — which is why
the outcome is correction, not an architecture decision.** If the owner prefers the waiver form, the
README/row text is a one-line change and nothing in the packet depends on the exclusion.

## 9. Reconciliation with the report, and every prior finding re-verified (not inherited)

- **All three review-05 findings — closed in substance.** `REF1-R5-SCOPE-01`: the live `007` section
  now names revision 5, records the bounded Layer-1 exception, states the four core pages are
  byte-identical to D and defers the chronology to the row and contract — verified in the tree, and
  the section-vs-contract agreement (`Revision 5` / `contract revision 5`) reproduces.
  `REF1-R5-CHK-01`: the check is now run and recorded on clean C with the scoped rule, and an owner
  disposition exists — **substance closed, but the H operand is missing** (§7) — and the deliberate
  non-action on review-05's "regenerate this round's typecheck log" is *correctly* declined:
  `validation-05/01-typecheck.log` belongs to a recorded, digest-pinned earlier attempt, and editing
  it would break that round's seal, which the contract's own sealed-record rule forbids.
  `REF1-R5-WORD-01`: the headline is scoped and the carve-out names what `sources.md` actually does.
- **Prior dispositions carried by reference and re-checked here, since "prior PASS" is not
  immunity:** `REF1-R1-STATUS-01` (no stale status phrase anywhere in `007` outside the row's dated
  chronology — my own sweep, §4 row 4 and §10); `REF1-R1-CONV-01` (concepts/mechanisms pages: 0
  Status lines on concept pages, 16/16 mechanism Status lines are gate/negation statements, no
  candidate SHA — mine, not the report's grep); `REF1-R1-NAV-01` (65 entries, 0 two-target — mine);
  `REF1-R2-DOC-01` (`roadmap.md` now matches what the packet removed). None regressed at H6.
- **Report claims reconciled against my measurements:** all identity/allowlist/scope/digest claims
  true; `check:builder-docs` and `typecheck` reproduced; the "no executable byte" basis for skipping
  runtime suites confirmed, and my conformance rerun matches review-05's at H5 exactly (1947 + the
  2 OP1 cancellations); the 8-sealed + 1-current reconciliation of review-05's own arithmetic is
  correct as far as it goes — at the reviewed head the total is 12 (§7). No report claim was found
  false; two are incomplete (§7 REF1-R6-CHK-01, REF1-R6-EXCL-01) and one is imprecise about its own
  evidence form (REF1-R6-EVID-01).
- **review-05's own record:** re-verified faithful where checkable — A→H5-ref = 19 linear commits,
  46 files, round-5 C..H = 6 files, v05/00 indeed records no `--check`, and the sealed review list is
  as described. Review-04's ACCEPT binds exact H3 and says so; it covers none of C4…H6 and I did not
  extend it. Review-01's GitHub-only ACCEPT of H1 remains historical and was not used as evidence.
- **Self-declared independence respected:** the implementing session (author of review-05 of the
  sibling packet and of C2–C6 here) disqualifies itself from accepting anything in the K1.1 line, and
  007's row repeats it. I found no implementer-authored ACCEPT, no ACCEPTED state written into 007 by
  this packet, and the ledger keeps the packet at `WAITING_FOR_REVIEW`. The report's four
  "attack first" invitations were all exercised (§6, §7, §8, §10).

## 10. Sweep wider than the candidate's, as the report asked

Places that *describe* this packet or the pages it edited, checked individually: `007` (section, row,
K1.1 and K1.1-correction-01 sections), `001`, `002`, `006`, `008`, `009`, `012`, `013`, `014`, `015`,
`docs/development/README.md`, `docs/README.md`, `AGENTS.md`, `README.md`, `mental-model/{README,
reference,roadmap,sources,kernel,runtime,driver,deployment}.md`, all `concepts/` and `mechanisms/`
pages, the sibling's `contract.md`/`decision-01.md`/`review-08.md` and its three administrative
records, and `work/*/contract.md` for any cross-citation of this packet's revision.
Result: **one** new in-scope residual (REF1-R6-WORD-02) and **two** out-of-payload items the packet
cannot fix inside its declared paths —
`014-owner-progress-summary.md:138` still tells the next reviewer to check "the bounded reference
contract and exact C/H in its [report]" linked to **`implementation-01.md`**, i.e. round 1's report and
H1, six rounds and five contract revisions stale (same family, same structural blind spot as OP6:
`check:builder-docs` cannot read `014` or `007`); and `014:124`'s "updates delivery evidence" (OP4).
Both belong to the owner's rewrite of the live summary at final cleanup, not to this candidate; I
record them so the cleanup handoff cannot inherit them silently. No other live document misstates this
packet's revision, scope or status, and no canonical page asserts shipped status or names a candidate
SHA.

## 11. Branch/main relationship (owner-facing, verified here, recorded nowhere in the packet)

`origin/main` = `07f7502c4a7d75aa37ab7694c5e62522e0e8c9ec` ("merge-to-preserve-document-change") is
**not an ancestor** of H6; `merge-base` = `a8ac787b2a766d897c7bd85311c1b2aee53a1ca8`, which is what
round 1's own evidence recorded as equal to main (`git diff --exit-code a8ac787 origin/main` → exit 0).
Since then main moved once, and **main's `packages/kernel` is byte-identical to `f117e6b`**
("fix(K1.1): scope acceptance/refusal order to the owning Execution (K11-R12-ID-01)") — an
*intermediate, superseded* K1.1 round, not the accepted H5 (`git diff H5 H6 -- packages/` empty while
main differs by exactly 9 files). Consequences the owner must account for and which no record in this
packet states: integration of this line is **not** a fast-forward; main currently carries unaccepted
target-package code; and the revision-5 scoped check still fails on `main..H6` (31 warnings in sealed
sibling review transcriptions, §7 REF1-R6-EXCL-01 item 3). None of this is this packet's defect — its
base is A, recorded, and 006 does not require rebasing a documentation supplement — but 006's
"check the final branch against current remote main and account for post-review changes" step will
encounter all three, and the candidate's records predate the divergence.

## 12. Third-party / license review (AGENTS.md)

No new reuse: `package.json`, `package-lock.json` and every manifest byte-identical A→H6 (verified in
the scope battery); no code, test, script, asset or bundled dependency added or altered. The sole
approved third-party specifier remains exact unmodified `canonicalize@3.0.0`; this candidate neither
invokes new obligations on it nor re-licenses anything. "none" is the correct entry, and I confirmed
it rather than accepting it.

## 13. Per-criterion verdicts (cumulative A→H6, bound to exact H6)

| Criterion | Verdict | Basis |
|---|---|---|
| REF-1 | **PASS** | Independent semantic re-read of both edited pages against the accepted creation/ingress rules, `coordinator.ts` identity indexing, and the three K11-R15-ID-01 ingress tests plus the creation-replay set; `test:kernel` rerun 264/55/0 at exact H6 |
| REF-2 | **PASS** | `values.md` capture section traced line-by-line to `values.ts` (single pass, own-data rules, refusal codes, serializer window restore, encode-failure → located refusal) and to `values.test.ts`; no wire or containment claim in the payload; conformance rerun 1947 pass + 2 OP1 cancellations |
| REF-3 | **PASS** | `execution-cycle.md` = one status line replaced, delivery rules byte-identical; accepted-vs-integrated separation in `002`/`007` verified against git (H5 not on main; `D..H5 -- mental-model/` empty); the one residual wording tension is P3 and is about the README, not about delivery |
| REF-4 | **PASS** | 65/0 two-target index, concept-page Status-line convention holds, anchors all resolve (own check + gate rerun), wide stale-statement sweep clean except one in-scope P3 (REF1-R6-WORD-02) and two out-of-payload items (§10); roadmap/sources navigation matches what the packet actually did |
| REF-5 | **FAIL** | Scope, executability, seals, independence and C/H discipline all **independently verified true**; the criterion nonetheless fails on its own now-explicit proof obligation: the contract requires the scoped check recorded on clean C **and** on H every round, and this round recorded only C (REF1-R6-CHK-01), with the amendment's safety claim overstated and the cumulative count at the reviewed head undisclosed (REF1-R6-EXCL-01) |

No criterion is DEFERRED: everything in the contract is assigned to this packet, and none of it is
out-of-packet work. `next_release: none` respected; no successor was released or requested.

## 14. Coverage gaps and limits of this review

- Owner messages/grants: not accessible (the only item in this review that cannot be verified from the
  repository) → REF1-R6-AUTH-01.
- Node v25.2.1: not installed here, so the implementer's suite counts on that toolchain remain
  *inspected*, not rerun; my Node v22.22.3 reruns account for every numeric difference (the OP1 pair)
  and I reproduced OP1, which the implementing machine reports it cannot.
- Full `npm test` / `test:sdk` / `test:evals` not rerun at H6 (no claim in this candidate rests on
  them at this candidate; the two suites covering the documented behavior were rerun).
- `implementation-01/02/03.md` were skimmed rather than read line-by-line; their substance is
  superseded by the sealed reviews, which I verified unedited, and by my own re-derivation of the
  findings' outcomes at H6.
- `validation-01/02-inspected-evidence.log`, `03-added-links.log`, `validation-02/03,04` and
  `validation-03/01,02`, `validation-04/01,02`, `validation-05/01,02` logs are digest-verified (all 21
  match) and spot-read, not read end-to-end.
- No `git worktree`/fresh-archive clone was used for the reruns; the reruns ran in the reviewed
  checkout at exact H6 with a clean tree, restored after `npm install`.

## 15. Strongest additional counterexamples I looked for and did not find

A payload byte outside the declared paths; a Layer-2 or D-freeze violation; an edited sealed review or
prior-round log; an executable change hiding behind "documentation-only"; a broken inbound anchor; a
reference entry with two owners; a canonical page asserting shipped status or naming a SHA; a
containment or wire-format claim smuggled into `values.md`; a delivery-rule change; a report number
that disagrees with git; a self-accepted or self-certified state; a successor release; a new third-party
reuse; a digest mismatch in any pinned log; an unsanctioned remote change. All were checked
mechanically at exact H6 and all are absent.

## 16. What would make this candidate acceptable next round

Not a specific patch. The whole observable result, in any in-scope way the implementer and owner
prefer: the scoped check recorded at both operands with the count at the reviewed head; the exclusion
described by the property that earns it (or its residual gap named, including at integration time);
the requirement map in the contract agreeing with the amendment; the README ownership sentence agreeing
with the next paragraph and `002`; the round's guard commands reproducible from the log; and — owner's
option — the revision-5 instruction preserved as a decision artifact. Re-review will be cumulative
from A to the new H under the same 006/012 duties, plus the new delta.

## 17. Exact text for transcription into 007 (owner or owner-delegated cleanup only)

> **[Review-06](work/K1.1-reference-01/review-06.md)** (independent Arena.ai Agent Mode reviewer,
> fresh session, full shell, Node v22.22.3, clone unshallowed and all 21 pinned logs digest-verified;
> recorded at `<A>`): `CHANGES REQUIRED` on exact **H6 `bbcbf300acb583b87dbf6b4bd323700bccd9e90f`**
> over **C6 `2f1a7ced4ab0a4b340132899bd61fc14ae678a6d`** and base **A `519ba002…`**; remote branch
> verified to advertise H6. REF-1, REF-2, REF-3, REF-4 **PASS**; **REF-5 FAIL** on
> `REF1-R6-CHK-01` (P2: contract revision 5 requires the scoped `git diff --check` recorded every
> round **on clean C and on H**, and round 6 recorded only `A→C6`; at the reviewed head the unscoped
> total is **12**, three of them in this round's own new files, none disclosed). `REF1-R6-EXCL-01`
> (P2: the exemption is drawn by path shape, not by "un-editable capture" — 453 `validation-*/*.log`
> files repo-wide including hand-authored narrative logs, 33 of them digest-unpinned; the negative
> control proves non-`.log` pages only and the round's own log print carries hidden authored trailing
> whitespace; the same property leaves 31 warnings in the sibling's **sealed** review transcriptions
> failing on `main..H6`, which that rule cannot fix in scope; and the amendment is broader than the
> eight sealed instances review-05 offered to re-scope). `REF1-R6-WORD-02`, `REF1-R6-EVID-01`,
> `REF1-R6-AUTH-01` P3. **Judged as asked: revision 5 is authorized in form and does not relax any
> REF criterion — the table is byte-identical revisions 1→5 and the mandatory-every-round rule is a
> strengthening — but two of its justifying claims are overstated and the obligation it created is
> half-met.** Scope battery independently verified true: 52 files, documentation only; README confined
> to the two authorized sections against D; four core pages byte-identical to D; `D→H5 --
> mental-model/` empty; executable tree, packages, manifests and every sealed record unchanged; C6→H6
> exactly the declared allowlist and `007` only row 497; 20/20 log digests match; reruns at H6:
> builder-docs 57/847/38, typecheck clean, kernel 264/55/0, conformance 1947 pass + 2 OP1
> cancellations (OP1 reproduced here on Node 22, which the implementer's machine reports it cannot).
> `014:138`'s stale pointer to `implementation-01.md` as this packet's report, OP4's wording, and the
> `main..H6` relationship (main not an ancestor of H6; main's `packages/kernel` equals the superseded
> intermediate `f117e6b`, so integration is not a fast-forward and main currently carries unaccepted
> target-package code) are recorded for the owner's cleanup/integration step, outside this packet's
> payload. Implementation ACCEPT at K1.1-correction-01 H5 untouched and not re-certified; no merge, no
> successor release; `next_release: none`.

## 18. Compact correction handoff (008 form — locators only)

```text
Correct the same released packet K1.1-reference-01 on codex/k1.1-correction-01-review-findings.
Base 519ba002378707a4deccff1ea0a243d21eb694b7; reviewed H bbcbf300acb583b87dbf6b4bd323700bccd9e90f
(payload C6 2f1a7ced4ab0a4b340132899bd61fc14ae678a6d); review record
docs/development/work/K1.1-reference-01/review-06.md (this file, at the commit recording it).
Open findings REF1-R6-CHK-01, REF1-R6-EXCL-01 (P2) and REF1-R6-WORD-02, REF1-R6-EVID-01,
REF1-R6-AUTH-01 (P3); required outcomes and counterexamples are in that record. Prior findings
REF1-R1-STATUS-01/-CONV-01/-NAV-01, REF1-R2-DOC-01, REF1-R5-SCOPE-01/-CHK-01/-WORD-01 are closed in
substance and must not regress; review-05's declined typecheck-log regeneration stays declined for the
stated sealed-record reason.
Owner supplemental decisions: none recorded by this reviewer; the revision-5 owner instruction is
unverifiable from the repository (REF1-R6-AUTH-01) and the owner may instead direct the waiver form.
Unresolved authority: none blocking; no architecture decision is needed and no acceptance condition
of REF-1…REF-5 may move.
Apply 006 and 012: close the affected semantic subsystem (status/ownership statements and the
whitespace-proof rule) with its dependents, re-audit the whole cumulative packet A→new H, and sweep by
statements *about* the edited pages across live documents, not the edited files.
Fix additional in-scope defects with separate provenance. Use 008 for the next report and 006 for new
C/H plus evidence/push handoff; declare the H-operand check explicitly. No successor release.
```

CHANGES REQUIRED