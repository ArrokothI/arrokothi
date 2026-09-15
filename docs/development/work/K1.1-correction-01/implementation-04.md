# Implementation report — K1.1-correction-01, round 5 (C4/H4, current cumulative candidate)

## Identity

- Packet/parent; contract path and revision; governing process baseline:
  K1.1-correction-01 (parent K1), corrective packet for released K1.1.
  [Contract](contract.md) **revision 3** (this round: `KC1-DEC-7` supersedes `KC1-DEC-2` and
  re-anchors the documentation scope guard from B to D; nothing else moves). Governing process
  baseline `777b9955fb3a443f700b4f3d1f4f2aef1869345b` (K1.1's own base B).
- **Role and independence, stated plainly.** This round was implemented by the session that wrote
  [review-05](review-05.md) — Anthropic Claude Opus 5, at the owner's explicit instruction on
  2026-09-15 to stop reviewing and fix the packet. That session therefore **cannot supply
  acceptance for this candidate**, and nothing here claims any. The owner has named a fresh
  independent reviewer for H4. A reviewer fixing findings it raised itself has an obvious
  incentive to define the fix as whatever closes its own finding, so §"What a reviewer should
  attack first" below names where to push hardest rather than leaving it implicit.
- State; owner release; prerequisite ACCEPT and integration identities:
  State WAITING_FOR_REVIEW (this report, validation-04 and the 007 transcription join H4).
  No renewed owner release needed for corrections on a released packet (006). Prerequisites:
  K1.0 as integrated including corrections 01–02, unchanged from rounds 3–4.
- Branch/configured remote; full base and payload C; previous reviewed H/review:
  Branch `codex/k1.1-correction-01-review-findings`.
  Original base B `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
  **Documentation anchor D `0ee13f8138af52107d86967043bcc460faba8893`** (`finish-all-second-layer-doc`,
  owner, 2026-09-15 15:13 −0400). Verified to be an ancestor of C4.
  Prior payload C3 `90dec32040aeaf067dcaadca8f918dce6bdb86c4` / candidate H3
  `b883f291d83060b360b419e2a58b771f9abbc74b`.
  Round-4 reviews of exact H3: [review-04](review-04.md) `ACCEPT`, recorded at A4
  `484beb07fe150646631985d5e9ce7b2754da7475`; [review-05](review-05.md) `CHANGES REQUIRED`,
  introduced at D. Both preserved byte-unchanged; neither edited to agree with the other.
  **Payload C4 `56164092d128c6767f501962174ac81c6363af9e`.**
- Candidate H4: commit containing this report (full SHA in external handoff).
- Exact C4→H4 administrative file allowlist, including any raw-output attachments:
  `docs/development/work/K1.1-correction-01/implementation-04.md` (this report),
  `docs/development/work/K1.1-correction-01/validation-04/` (13 logs + MANIFEST, all describing
  clean C4), `docs/development/007-work-packets.md` (**ledger row only**: records review-04/05
  dispositions and C4/H4 identities, still WAITING_FOR_REVIEW). 007's packet **scope section** is
  payload and was changed in C4, not here. No code, test, fixture, contract, threshold,
  configuration or script change is permitted C4→H4; anything substantive starts a fresh C.
- Working-tree state; push status as observed, or pending external handoff:
  Tree clean at C4 for validation (`validation-04/01-tree-and-environment.log`). Ablation
  mutations applied transiently during evidence collection, each reverted with clean restoration
  verified (`09b`, "restored: clean" after all nine). Push/remote verification in the external
  handoff after H4. No force push.

## What this round changes, and what it deliberately does not

`review-05` found K1.1-C1…C10 passing on exact H3 under independent rerun, reproduced ablations
and reviewer-authored counterexamples, and withheld acceptance for three process findings. All
three had one root: **the owner's documentation ruling existed only inside the candidate's own
implementation report, while `contract.md` revision 2, `decision-01.md` and 007's packet scope
section all still required the opposite.** A candidate cannot authorize its own departure from
its contract.

This round fixes that where it actually lives — in the governing artifacts — and changes nothing
else. **The executable tree is byte-identical to reviewed C3** (`01` log: empty
`git diff --name-only C3 HEAD -- packages/ tests/ scripts/ examples/`), so every semantic
verdict already recorded against H3 carries to C4 unchanged.

**The `mental-model/` tree is byte-identical to D.** The owner froze it and instructed that it
not be modified; this round modified nothing in it. That is now a mechanical gate, not a promise
— see `KC1-DEC-7` below.

## Changes and coverage

- Change groups and full cumulative diff; ownership and governing sources:

  **C3 → C4 is four paths**, all documentation, no code:

  1. `docs/development/work/K1.1-correction-01/contract.md` → **revision 3**. New `KC1-DEC-7`
     records the documentation anchor D, its owner provenance and date, and supersedes
     `KC1-DEC-2`. Required-correction item 5 is rewritten: the four-path allowlist measured from
     B becomes **whole-tree byte identity measured from D**, plus an explicit obligation to
     enumerate and classify the cumulative B→D documentation change by path, layer and
     disposition. The command plan now carries the gate and its accounting command. The closure
     section names `implementation-04`/`validation-04` (revision 2 still said
     `implementation-02`/`validation-02`, stale since round 3) and records that review-04 and
     review-05 bind the same H3 and disagree. The identities table gains C3/H3, both round-4
     reviews and D. Finding coverage gains the three open round-4 findings.
  2. `docs/development/work/K1.1-correction-01/decision-01.md` → **appended** a dated superseding
     note. The body is byte-unchanged (`01` log: 0 deleted lines). It withdraws exactly two
     provisions — the four-path allowlist and the `deployment.md` restoration instruction — and
     states explicitly that `KC1-ARCH-1`, the `deliver(activation, settlement): undefined`
     signature and every acceptance-mapping row stand unchanged.
  3. `docs/development/007-work-packets.md` → the packet **scope section** now agrees with its own
     ledger row: it records the D anchor and the gate command, states that the Layer-1/2 rewrite
     the packet carries is the owner's own completed work rather than something this packet
     originated, and notes that `concepts/` and `mechanisms/` are unrewritten. The stale
     "Other mental-model files must be at B in C2", "No Layer-1/2 change" and "revert undeclared
     cumulative documentation payload to base" sentences are gone.
  4. Nothing else. No `mental-model/`, `packages/`, `tests/`, `scripts/` or `examples/` path.

  The cumulative interval B→C4 additionally contains the owner's own commits `55389aa`,
  `4c2f0a5`, `b548e17`, `462ae3f` and D, and this packet's preserved records. None is reverted.

  Governing sources: unchanged. `execution-cycle.md#delivery-reporting-boundary` still owns the
  delivery rule; `creation.md`, `core.md`, `identity.md`, `state.md`, `values.md`, `lifecycle.md`
  and `evidence.md` still own their criteria and are untouched by this round.

- Selected 012 methods; material exclusions and why:
  **Process/documentation** is the primary method this round, since the round's whole content is
  workflow artifacts: role transitions simulated against the concrete history (who authorized
  what, in which artifact, at which commit), C/H scope, actor permissions, exact identity,
  amendments and successor holds, reference and provenance verification, Git scope.
  **Deterministic execution** is retained in full — the whole command plan, the focused
  `KC1-ARCH-1` suite, the packet case inventory and all nine distinguishing ablations were rerun
  against clean C4 rather than cited from round 4, because the contract and 007 are payload and
  a payload change requires fresh validation even when no source byte moves.
  **Normative decisions** applies to `KC1-DEC-7` itself, treated as a rule to be attacked: its
  gate is run with a negative control proving it rejects a one-byte change.
  Materially excluded: `npm run test:evals` (no Agent, model or eval path is reached; the B→C4
  diff over `tests/evals/`, `packages/agents/`, `packages/models/` and `examples/` is empty);
  race-and-fault beyond what round 4 already established; durability, isolation and native-Driver
  fidelity (contract-excluded); benchmark E-gates (none claimed).

- Obligation/interaction coverage with expected facts, forbidden changes, source/test/trace and result:

| Obligation | Distinguishing input, including the negative case | Expected facts and forbidden changes | Evidence | Result |
|---|---|---|---|---|
| `KC1-DEC-7` gate holds on C4 | `git diff --name-only D HEAD -- mental-model/` | empty output; **forbidden:** any differing path, any per-path argument | `00` | PASS |
| the gate is not vacuous | append one newline to `mental-model/reference.md`, rerun | the path is reported; gate fails | `00` | REJECTED as required |
| D is real and in ancestry | `git merge-base --is-ancestor D HEAD`; D's author/date/subject | D is an ancestor; authored by the owner | `00` | PASS |
| the owner's tree is untouched | 31 blob digests at C4 | identical to the digests read from D before any edit | `00` | PASS |
| no K1.1 governing semantics moved | word-level B→D comparison of all 31 paths | every contract-cited Layer-3 owner is 0 tokens except a 2-token anchor repair; **forbidden:** a silent change to `values.md`/`identity.md`/`creation.md` | `10` | PASS |
| executable tree unchanged from reviewed C3 | `git diff C3 HEAD -- packages/ tests/ scripts/ examples/` | empty; **forbidden:** any source change smuggled in with a docs fix | `01` | PASS |
| prior records preserved | each file vs the commit that introduced it | review-01…05, blocker-01, implementation-01…03, validation-01…03 unchanged; decision-01 append-only, 0 deleted lines | `01` | PASS |
| 007 no longer self-contradicts | read the packet scope section against its own ledger row | one consistent documentation scope | C4 diff | PASS |
| suites still green on the new tree | full command plan on clean C4 | all exit 0, zero skips | `02`–`08` | PASS |
| oracles still mechanism-sensitive | nine mutations, each applied and reverted | all RED at the historical counts; clean restoration each time | `09b` | 9/9 RED |
| link/anchor validation still covers the class | `check:builder-docs` over the current tree | 57 files / 828 links+anchors / 38 imports, zero broken | `05` | PASS |

- Tests added/ported/removed and reasons; compatibility/refusal; baseline/guides/skills impact:
  **None.** No test file changed. No baseline, guide or skill behavior change. The `002` baseline
  note is already current-truth from C3 and remains accurate: the correction candidate implements
  the undefined-only boundary, with independent acceptance and integration pending.
- Semantic correction closure: changed invariant, dependent paths, counterexamples and evidence:
  No Kernel semantic invariant changed this round. The rule that changed is a **development-scope**
  rule: *which documentation state a candidate is measured against*. Its dependent paths are the
  contract (item 5, scope, command plan, closure, identities, decisions), decision-01's authorized
  payload section, 007's packet scope section and ledger row, and the validation evidence that
  runs the gate. All were walked together and are listed above; the counterexample that previously
  passed — 31 differing paths with the guard disabled and the only authorization inside a report —
  is now rejected mechanically by `00`'s negative control.
- Prior findings: open IDs → disposition/evidence; closed findings → prior disposition links:
  - `KC1-R4-PROC-01` (P2, review-05): **closed.** The contract now states the rule the owner
    decided, with provenance, and the guard is re-enabled and tightened rather than left off.
    Evidence `00` (gate + negative control), contract revision 3 `KC1-DEC-7`, decision-01's
    superseding note.
  - `KC1-R4-PROC-02` (P2, review-05): **closed.** 007's packet scope section and ledger row now
    say the same thing. Evidence: the C4 diff on 007.
  - `KC1-R4-DOC-01` (P2, review-05): **closed.** The cumulative B→D documentation change is
    enumerated and classified by path, layer and disposition, with the explicit finding that no
    K1.1 governing semantics moved and the one non-authorized governing-source edit shown in full.
    Evidence `10`.
  - `K11-R16-DISP-01`: remains CLOSED under revision 2 / `KC1-ARCH-1`. No Promise-observation path
    exists in the unchanged source; M1–M4 RED on C4.
  - `KC1-R2-PROC-01`: was reopened as `KC1-R4-PROC-02` and is closed with it.
  - `KC1-R3-DOC-01`: remains CLOSED on C3's four current-truth edits, unchanged here.
  - Seven round-1 closures (`K11-R15-ID-01`, `K11-R15-DOC-01`, `K11-R15-DOC-02`,
    `K11-R15-PROC-01`, `K11-R16-VAL-01`, `K11-R16-ID-01`, `K11-R16-DOC-01`): no change in their
    paths; suites green and retained ablations R1–R5 RED on C4.
- Additional self-found defects (separate provenance):
  One, administrative. Contract revision 2's closure section still named `implementation-02.md`
  and `validation-02/` as "next", stale since round 3 and pointing a fresh reader at the wrong
  evidence. Not raised by any reviewer; found while editing the contract and corrected in C4.
- Unresolved obligations and unblock conditions: none. Independent cumulative review of B→H4
  remains, and is owner-controlled.

## What a reviewer should attack first

Written by the session that raised the findings, so treat it as the most likely place for
motivated reasoning rather than as guidance to trust:

1. **Is `KC1-DEC-7` a real tightening or a dressed-up relaxation?** It authorizes a tree that
   revision 2 forbade. Judge it on whether the *check* is now stronger: four-path allowlist from B
   → whole-tree byte identity from D, with a negative control. If you think re-anchoring is
   illegitimate regardless, say so — that is a genuine disagreement, not a detail.
2. **Is D what it claims to be?** It must be an owner commit, in ancestry, containing the frozen
   documentation. Check its author and that the tree at C4 matches it, rather than taking `00`'s
   word.
3. **Did anything semantic ride along with the documentation fix?** The claim is an empty
   `git diff C3 HEAD -- packages/ tests/ scripts/ examples/`. Run it yourself.
4. **Is the B→D classification honest?** `10` claims every contract-cited Layer-3 owner is
   prose-identical to B. Re-derive it; a wrong answer there would mean the criteria moved.
5. **Does review-05's own C1…C10 assessment deserve weight?** It was written by this session.
   Review-04 reached ACCEPT on the same executable tree independently, but two agreeing reviews do
   not substitute for your own. The ablations and control runs in `09b` are the cheapest
   independent handle.

## Validation and interpretation

- Exact commands/cwd, C4, environment/config/tool versions, exit/counts/skips, raw paths and digests:
  CWD repository root. C4 `56164092d128c6767f501962174ac81c6363af9e` (HEAD = C4 verified clean
  before validation; D ancestry and prior-record byte identity verified). Node v25.2.1,
  npm 11.6.2, TypeScript 5.9.3. All exits 0, zero skips:
  typecheck clean; `npm test` 2322/356/0; `test:conformance` 1949/283/0; `test:kernel` 264/55/0;
  `test:sdk` 22/0; architecture TAP 362/37/0; `check:builder-docs` 57 files / **828**
  links+anchors / 38 imports, zero broken (827 at H3; the extra link is the owner's new
  `concepts/identity.md#dispatch-and-delivery` reference in `deployment.md`, which resolves).
  K1.1 case inventory (kernel TAP) 264/55/0 with zero `void | Promise<void>` oracle references.
  Focused `KC1-ARCH-1` dispatch suite 50/8/0 including the strict-subprocess case and the type
  boundary. Nine distinguishing ablations all RED at the historical counts — M1 8, M2 2, M3 2,
  M4 1, R1 3, R2 3, R3 1, R4 4, R5 6 — each with a clean-tree control and verified restoration.
  Raw logs + digests: `validation-04/MANIFEST.md` (13 logs).
- External fixture prepared / gate executed / external decision, separately; pinned owners/revisions:
  None; no E-gate claimed. The architecture authority remains decision-01 plus its superseding
  note. The documentation ruling behind `KC1-DEC-7` is the owner's instruction of 2026-09-15,
  given in the round-5 session, and is recorded as such in the contract rather than only here.
- Checks not run and resulting claim limits: `test:evals` not run (zero Agent/model/eval diff; no
  Agent-behavior claim). No process-kill, persistence, native-Driver or packaging runs — all
  contract-excluded, none claimed. Strict-mode evidence still covers the conforming Driver-internal
  rejection path only; arbitrary same-process Driver code can still crash its host, which is
  deployment containment rather than Kernel correctness, as the canonical rule states.
- Why evidence supports each criterion (implementer assessment, not acceptance):
  C1–C10 rest on an executable tree byte-identical to reviewed C3, re-validated green on C4 with
  all nine ablations RED. Review-04 and review-05 independently reached C1…C10 PASS on that tree,
  review-05 through its own counterexamples and reproduced ablations. This round adds no criterion
  and weakens none. The contract's own documentation-scope and status-discipline requirements —
  the two review-05 marked FAIL — are now satisfied by construction and checked mechanically.
  Cumulative assessment: PASS. **Acceptance requires the fresh independent review; this session
  cannot and does not supply it.**
- Design choices, owner amendments, assumptions, strongest remaining risk:
  Owner amendment this round: the documentation ruling, now carried by contract revision 3
  `KC1-DEC-7` and decision-01's superseding note rather than by a report paragraph. Design choice:
  re-anchor and tighten rather than revert the owner's completed work — the rejected alternative,
  reverting 31 paths to B and re-requesting them as a separate packet, destroys correct prose to
  satisfy an anchor written for a different situation and leaves the same collision waiting.
  Strongest remaining risk is not technical: `concepts/` and `mechanisms/` are still unrewritten,
  and rewriting them changes the pages C1…C10 are judged against. The contract now says
  explicitly that such a change moves D by fresh owner decision recorded before the payload, and
  belongs to its own packet with its own review.
- Third-party review under AGENTS.md, or none:
  **No new reuse.** No dependency added, removed or upgraded; `package.json` and
  `package-lock.json` are untouched this round. Exact unmodified `canonicalize@3.0.0` (Apache-2.0,
  LICENSE present, no NOTICE file and therefore no NOTICE obligation) remains the single approved
  third-party specifier, declared in `packages/kernel/package.json`, pinned in the lockfile, with
  `packages/kernel/src/values.ts` its only importer. Nothing was copied, adapted or vendored.

## Handoff

- Ready for independent review, or exact remaining work:
  Ready for fresh independent cumulative review of exact H4 (B→H4, plus the C3→C4 correction
  delta) against contract revision 3, decision-01 with its superseding note, and the preserved
  correction history including both conflicting round-4 reviews. No self-acceptance. K1.2 not
  begun. `next_release: none`.
- Base/C/H and verified push SHA supplied externally; offline artifact identities when applicable.
  B, D, C4 and H4 above; H4 and the verified advertised remote SHA in the external owner handoff
  after pushing.
- No self-acceptance; successor release remains owner-controlled. The implementing session is the
  author of review-05 and is disqualified from accepting this candidate.

## C4 identity

Payload C4 is `56164092d128c6767f501962174ac81c6363af9e` ("correct(K1.1-correction-01): re-anchor
documentation scope to owner freeze D (C4)"). It contains only the three documentation-artifact
changes above over D. Validation ran against this exact tree (HEAD = C4 verified in log `01`; tree
clean). Source/test diff C3→C4 is empty.

## C4→H4 administrative allowlist

Only: this report (`implementation-04.md`), `validation-04/` (13 logs + MANIFEST describing clean
C4), and the 007 **ledger row** status transcription. 007's packet scope section was changed in C4
as payload, not here. Anything else — code, tests, fixtures, contract, thresholds, configuration,
scripts, `mental-model/` — is payload and requires a fresh C with affected revalidation.
