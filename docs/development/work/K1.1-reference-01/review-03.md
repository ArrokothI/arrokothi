# K1.1-reference-01 independent review — round 2, cumulative re-review of exact H2

**Transcription provenance.** Transcribed into the branch by the correcting implementer session
(Anthropic Claude Opus 5) as the owner's delegate, from the review text supplied on 2026-09-16. The
reviewer states it authored this record in its own workspace and that transcription supplies no
acceptance. Nothing below is implementer wording, reasoning or finding. The implementer verified
`REF1-R2-DOC-01` and every supporting claim against git before acting; that verification is in
[implementation-03](implementation-03.md), not mixed into the reviewer's text here.

---

Reviewer: independent Arena.ai agent-mode reviewer. Underlying model identity unverified and not
disclosed by the platform; no model name in this record should be read as confirmed. Review-only:
no candidate edit, no merge, no successor release. This record is authored in the reviewer's own
workspace and is not part of the candidate; it is transcribed into the branch by the owner or a
delegated administrative session, which supplies no acceptance.

## 1. Access and its limits

Full shell in a clone of `ArrokothI/arrokothi`; `git fetch --unshallow` gave complete history.
Full pinned source was obtained, not a report or a truncated patch: `git archive` of exact H2 was
extracted to a clean directory with `node_modules` linked to an installed tree, and every command
in §5 was rerun there. Node v22.22.3, npm 10.9.8.

Limits, stated plainly:

- The owner instruction quoted in `contract.md` ("record the accepted K1.1 identity and value
  boundaries faithfully in the reference documentation") is an in-session message. It cannot be
  verified from the repository. Nothing in this review depends on its exact wording.
- Every other reviewer's self-declared model, tooling and access is their own claim. I inspected
  their records and their evidence files; I did not and cannot re-execute their sessions.
- The prospective documentation-anchor exception (payload allowed to precede the freeze commit in
  history) rests on a pre-payload owner scope decision recorded at `e46c772`. I verified that
  record exists and predates the payload, and that the mental-model tree at A is byte-identical to
  its state at D, so the anchor is content-neutral. I did not verify the owner's authorization
  channel.
- No external system (registry, CI, deployment target) was reachable or relevant.

## 2. Identities

| Role | SHA |
| --- | --- |
| Base A (accepted baseline) | `519ba002378707a4deccff1ea0a243d21eb694b7` |
| Payload C2 | `fc3e450027bf2723a61784eb9d48c4c76f8a0377` |
| **Exact H2 — the object of this review** | **`844bee41fd57d7ae6aa60adfd6731305394f83b9`** |
| Prior round's H1 (reviewed by review-01 ACCEPT / review-02 CHANGES REQUIRED) | `d4bd49fd49fb6d70a992635cf2b6bf8317c3af89` |
| Review-02 transcription commit | `8bb0de6d6d223850ae930eec63cab6e9d08866dc` |
| K1.1-correction-01 accepted H5 | `52b1600f3b42e3a360fdc3395178f1d147edf304` |
| Documentation freeze D | `0ee13f8138af52107d86967043bcc460faba8893` |

`git ls-remote origin codex/k1.1-correction-01-review-findings` returned
`844bee41fd57d7ae6aa60adfd6731305394f83b9` both at the start and at the end of this review, so H2
did not move under it. Three commits arrived since round 1: `8bb0de6` (records review-02),
`fc3e450` (C2 payload), `844bee4` (H2 = report + evidence + the ledger row).

**This review binds to `844bee41fd57d7ae6aa60adfd6731305394f83b9` only.** It certifies no later
administrative, transcription or merge commit, including whatever commit eventually records this
file.

## 3. Cumulative scope A→H2, derived independently

`git diff --name-status A H2` returns **28 paths**. Ten are declared payload paths —
`mental-model/concepts/identity.md`, `concepts/values.md`, `mechanisms/creation.md`,
`mechanisms/execution-cycle.md`, `reference.md`, `roadmap.md`, `sources.md`,
`docs/development/002-implemented-kernel-baseline.md`, the packet `contract.md`, and
`docs/development/007-work-packets.md`. The other eighteen are post-A administrative or 008-mandated
records: `implementation-01/02.md`, `review-01/02.md`, `validation-01/` (4 files) and
`validation-02/` (6 files) — which the contract permits as "Reports and raw outputs follow 008" —
plus `014-owner-progress-summary.md`, `cleanup-01.md`, `push-pending-01.md` and
`push-verification-01.md`, which the contract places outside C/H's payload as subsequent
administrative work.

I verified that placement rather than asserting it. `git log A..H2 -- 014-owner-progress-summary.md`
names exactly one commit, `154a765` ("cleanup(K1.1): preserve ACCEPT and hold integration for
reference review"), and `git diff A C1 -- 014…` and `git diff C2 H2 -- 014…` are both empty, so
neither payload touched it. `--diff-filter=A` shows `validation-01/` was added by H1's report
commit `d4bd49f` and `validation-02/` by H2's report commit `844bee4`. **No undeclared path is in
the cumulative diff.**

Guards, all executed against the two SHAs rather than accepted from a report:

- `git diff --exit-code A H2 -- packages tests scripts examples package.json package-lock.json
  tsconfig.json` → exit 0. **No executable, test, dependency or build byte moved.**
- Same over `mental-model/README.md kernel.md runtime.md driver.md deployment.md` (Layer 1/2) →
  exit 0. The D freeze is intact.
- Same over every sealed work directory other than this packet's new files → exit 0.
- `git diff D H5 -- mental-model/` → 0 paths, so `KC1-DEC-7` still holds and H5's ACCEPT is
  unaffected by this packet.

Correction delta, stated as git produces it:

- `8bb0de6 → C2`: **4 paths** — `docs/development/007-work-packets.md`,
  `mental-model/concepts/values.md`, `mental-model/mechanisms/execution-cycle.md`,
  `mental-model/reference.md`. All four are inside the contract's declared ten. No scope amendment
  was needed or claimed.
- `C2 → H2`: `007` row update plus `implementation-02.md` and `validation-02/` (MANIFEST + 5 logs).

`--numstat` confirms the Layer-3 corrections are minimal: `values.md` 1 insertion / 1 deletion,
`execution-cycle.md` 1 insertion / 1 deletion. `concepts/identity.md`, `mechanisms/creation.md`,
`002-implemented-kernel-baseline.md`, `sources.md` and `contract.md` are untouched H1→C2, so
round 1's REF-1/REF-2 basis and the governing contract are unchanged.

**REF-5 PASS.** Scope is exactly what the contract declares.

## 4. Evidence verification

`sha256sum` of the five extracted `validation-02/` logs matches all five digests printed in
`validation-02/MANIFEST.md` (5/5). The logs are internally consistent with the commands they
claim, and their figures agree with my independent reruns in §5 — but they are **inspected
evidence**, authored on Node v25.2.1 / npm 11.6.2. Where a claim mattered I reran it rather than
trusting the log; the distinction is drawn per-claim below.

One honest asymmetry the report itself discloses: its environment could not reproduce the two
Node v22.22.3 conformance cancellations that review-08 recorded as OP1 and review-02 reproduced,
because it has no v22 interpreter. My rerun in §5 settles that on v22.22.3.

## 5. Reruns at exact H2 (reviewer's own execution, Node v22.22.3)

| Command | Result | Matches pinned evidence |
| --- | --- | --- |
| `npm run check:builder-docs` | exit 0 — **57 Markdown files, 845 local links/anchors, 38 public package imports** | yes (845, down from 847 at H1) |
| `npm run typecheck` | exit 0, no diagnostics | yes |
| `npm run test:kernel` | **264 tests / 55 suites / 264 pass / 0 fail / 0 cancelled** | yes |
| `npm run test:conformance` | **1949 tests / 283 suites / 1947 pass / 0 fail / 2 cancelled** | reproduces review-08 OP1 |

The link count dropping by exactly 2 is explained by counting, not assumed. Over the three
`mental-model/` files in the correction delta (the only ones `check:builder-docs` reads):
`reference.md` 113 → 112 and `execution-cycle.md` 18 → 17, `values.md` 3 → 3. The two removed
links are `reference.md:94`'s second target `[delivery reporting mechanism](…)` and
`execution-cycle.md:30`'s `[review-08](…)` link; the surviving ledger link on that line was
relabelled from `ledger` to `status ledger`. So 847 → 845 is a real, fully accounted change in the
checked graph, not a different reading of the same run.

The 2 cancellations are the pre-existing legacy Effect tests, reproduced at original B by
review-08 and again by review-02. They are not attributable to this packet: nothing in
`packages/`, `tests/` or `examples/` differs between A and H2. Recorded as an owner observation
(OP2), not a finding against the candidate.

**Mechanical vs semantic.** The four commands above prove link integrity, type integrity and
behavioural non-regression. They cannot prove that a prose sentence means what it should mean.
REF-1 through REF-4 are semantic obligations, and §6–§8 are where they are decided.

## 6. Closure of review-02's findings

### REF1-R1-STATUS-01 (P2) — CLOSED

Review-02 offered two remedies — state the current truth, **or** mark the paragraph as a dated
historical record in the form 007 already uses for K0.2 and K1.0. Round 2 did both, which is the
strongest available closure. The historical paragraph is retained and dated in place — `007:43`,
"That paragraph stands as the record of the hold at its own date." — and `007:45–51` adds a
**Resolved since.** paragraph: `K11-R16-DISP-01` closed, the correction accepted at exact H5 by
review-08, the table rows authoritative, integration and final cleanup held for this documentation
review, `next_release: none`. That agrees with the ledger rows, which have shifted to `007:489`
(K1.1-correction-01) and `007:490` (this packet) as lines were added above them.

My own grep for the stale phrases (`remain outstanding`, `remains open`) over 007 returns one hit
only, at `007:489`, inside the K1.1-correction-01 ledger row's chronological narration of
review-01's state at its own date — later in the same row, review-03's closure of
`K11-R16-DISP-01` is recorded. That is a dated record inside an append-only narrative, present at
A and at H1, and review-02 raised no objection to that form; its objection was that the *narrative*
prose lacked the marker and so read as live state. That objection is now answered. No
current-state contradiction remains.

The ledger row at `007:490` is accurate on every point I checked: it names both reviews with their
opposite verdicts, states that a majority does not accept, names C2 and H2 correctly, records the
implementing session's disqualification, and requires a fresh cumulative review of A→H2 before
merge readiness.

### REF1-R1-NAV-01 (P3) — CLOSED

`grep -c '^- \[' mental-model/reference.md` → 65 entries; filtering those lines for a second
`[...](...)` target → **0**. The canonical-definitions list is back to one target per entry. The
new `[In-process value capture](concepts/values.md#in-process-value-capture)` entry at
`reference.md:141` is a single-target entry and resolves.

### REF1-R1-CONV-01 (P2) — CLOSED

Closed by resolution (b) as review-02 offered it, and the implementer explicitly asked that this
choice be judged on the merits rather than accepted as the offered option. My judgment:

- `values.md:25` now reads "**The in-process TypeScript binding** captures caller-owned values…".
  The page describes a contract and its binding, not a shipment. No acceptance claim survives.
- `execution-cycle.md:30` replaces "Implementation evidence:" with "**Introduced by:**
  K1.1-correction-01, which selected this boundary over Driver-returned Promise observation. Which
  candidate implements it, what has been independently accepted and what remains to integrate are
  recorded in the [status ledger](…007-work-packets.md), which owns that question; this page states
  the contract, not what has shipped." At H1 that line carried two links — `[review-08](…)` and
  `[ledger](…)`; at H2 it carries only the relabelled `[status ledger](…)`. The review link is gone
  from the mechanism page, which is the point of the convention.

This is the stronger of the two resolutions, not merely the permitted one. Naming the ledger as the
single owner of status removes the class of defect rather than patching one instance, and it makes
the page's own Status line and its body agree. No candidate SHA and no review link appear anywhere
under `concepts/` or `mechanisms/`; my grep for the seven relevant SHAs over both directories
returns nothing.

## 7. Cumulative re-verification of the substantive criteria

Prior PASS does not exempt dependent behaviour, so REF-1 and REF-2 were re-derived against H2
source rather than inherited.

**REF-1 — PASS.** `git diff --exit-code A H2 -- packages/kernel/src/coordinator.ts` returns 0: the
file is byte-identical to A. `executionId` derives from
`execution-${creationKeyIdKey(creationKey)}`; `eventId` from `event-creation-…`; the creation
receipt occupies position 1; `byInputId` is minted **empty** (`:776`, with the `K11-R15-ID-01`
rationale in the comment at `:775` and again at `:723`); `submitInput` reads
`mapGet(record.byInputId, …)` (`:856`), replaying on a matching `contentIdentity` and raising
`duplicate_conflict` otherwise; `observeOwn`/`observeField` (`:469–492`) match `KC1-DEC-6`, with
`:476` the own-descriptor check returning `undefined`. `identity.md`'s creation/ingress domain
separation and `creation.md`'s reuse example describe exactly this, and neither file changed in the
correction delta.

**REF-2 — PASS.** `git diff --exit-code A H2 -- packages/kernel/src/values.ts` returns 0: the file
is unmodified. `canonicalize@3.0.0` (`:75`) is
applied only to a snapshot clone inside `withSerializerEnvironment` (`:1159`) under try/finally
with `restoreDescriptor` (`:1221`, `:1230`); `captureObject:713`, `captureArray:572`,
`describedValue:455`; `accept()` at `:1254` measures
`canonicalBytes` from `encode(snapshot)`. The single changed line in `values.md` is the shipped-status
framing; every representation rule the page states still matches the implementation.

**REF-3 — PASS.** Delivery rules below `execution-cycle.md:30` are untouched (1-line delta). The
accepted-H / pending-integration separation is carried where it belongs — 007's ledger and
narrative, `sources.md:30`, and 002 — with `next_release: none` intact and no E1 or K1 closure
claimed.

**REF-4 — FAIL.** See §8.

## 8. New finding

### REF1-R2-DOC-01 — P2

**Location.** `mental-model/roadmap.md:77` (§K1.1-reference-01), which reads in part:

> "[Execution-cycle](mechanisms/execution-cycle.md#delivery-reporting-boundary) retains the
> delivery mechanism **with exact implementation evidence**."

**What is wrong.** Round 2 deleted exactly that content. `execution-cycle.md:30` now says
"this page states the contract, not what has shipped" and defers status to the ledger. The
roadmap sentence still tells a reader that the page carries exact implementation evidence. It was
true of H1 and became false at C2; the same commit that removed the evidence did not update the
sentence describing it.

**Why it is P2 and not P3.** This is not an optional polish. It is an unsupported claim about the
content of a canonical page, and `contract.md:38–39` assigns `roadmap.md` precisely the role of
"navigation, maintenance ownership and provenance for those rules" — so the page is wrong inside
its own assigned responsibility. A secondary instance of the same mismatch sits in the governing
contract itself: `contract.md:36–37` still instructs "replace obsolete acceptance-pending status
with exact accepted implementation evidence and limits", which is the opposite of what the
corrected payload deliberately does. Keeping the contract a current requirement map is a standing
obligation, so that bullet needs the same reconciliation.

**Why the sweep missed it.** The round-2 family sweep grepped `concepts/` and `mechanisms/` — the
directories being edited — and printed clean negatives, which my own re-run confirms are accurate
*for those directories*. But the stale statement lives in a page that **describes** the edited
page, one directory up. 012's closure step requires identifying dependent paths "including ones
outside the edited section … which examples, migration rows or test oracles describe it". The
packet-mapping row in `roadmap.md` is exactly such a row. The sweep's boundary was drawn around the
edited files instead of around the set of statements about them, which is the same boundary error
that produced `KC1-R3-DOC-01` and then `REF1-R1-STATUS-01`.

**Required outcome, not a prescribed patch.** Every live sentence that describes where delivery
evidence lives must agree with the page it describes and with the ledger that owns status.
`roadmap.md`'s K1.1-reference-01 mapping is in the declared payload and must be reconciled; the
contract's execution-cycle bullet must be reconciled with the approach the correction took, by
revision or by a recorded superseding note, per the owner's preference. Nothing else in this
finding requires change. I deliberately do not dictate the wording.

**Reviewer-side control.** I ran the wider sweep myself rather than repeating the implementer's
scope. Grepping `implementation evidence` across `mental-model/` and `docs/development/*.md`
returns exactly two hits: `roadmap.md:77` (this finding) and `002:309` (unrelated, about claim
shape). Grepping both anchors touched by this packet
(`execution-cycle.md#delivery-reporting-boundary`, `values.md#in-process-value-capture`) across
`mental-model/` and `docs/development/*.md` returns seven inbound references; I read all seven.
Six are accurate: `identity.md:35`, `integration.md:7`, `reference.md:141`, `roadmap.md:73`,
`sources.md:30`, `sources.md:32`. Only `roadmap.md:77` is stale. `kernel.md:53` and
`014:123–124` were also read; both remain accurate and neither is in scope.

## 9. Criterion verdicts

| Criterion | Verdict | Basis |
| --- | --- | --- |
| REF-1 identity/creation domain separation | **PASS** | Source re-derived at H2; prose files unchanged H1→C2 |
| REF-2 in-process value capture | **PASS** | `values.ts` unmodified; the one changed prose line is status framing only |
| REF-3 delivery rules and acceptance/integration separation | **PASS** | Rules byte-unchanged; status now owned solely by the ledger |
| REF-4 canonical navigation, ownership and provenance | **FAIL** | `REF1-R2-DOC-01` (P2): `roadmap.md:77` misstates the page it links to |
| REF-5 bounded scope | **PASS** | 4-path correction delta inside the declared ten; executable tree exit 0 |

All three review-02 findings are closed and non-regressing. No P0/P1. No BLOCKED condition: every
input this review required was reachable.

## 10. Compact corrective handoff (008)

- **Finding:** `REF1-R2-DOC-01`, P2, first raised in this record. Immutable location:
  `mental-model/roadmap.md:77`; secondary: `docs/development/work/K1.1-reference-01/contract.md:36–37`.
- **Required outcome:** every live statement about where delivery implementation evidence lives
  agrees with `execution-cycle.md:30` and with the status ledger; the contract's execution-cycle
  bullet is reconciled with the corrected approach by revision or recorded superseding note.
- **Family:** same family as `KC1-R3-DOC-01` (review-03, P2, closed round 4) and
  `REF1-R1-STATUS-01` (review-02, P2, closed this round). Fourth appearance. See the separate owner
  note, which is not part of this record.
- **Scope:** correction fits inside the existing declared payload; no scope amendment is required,
  and none may be self-authorized in a report.
- **Do not disturb:** the executable tree, Layer 1/2, D's freeze, H5's ACCEPT, 007's closed
  findings, or the two preserved disagreeing round-1 reviews.
- **Re-verification for round 3:** `check:builder-docs`, `typecheck`, and the three negative greps
  (two-target entries; candidate SHAs under `concepts/`+`mechanisms/`; stale status phrases in
  007) — plus a sweep bounded by *statements about the edited pages*, not by the edited files.

## 11. Coverage gaps

- The owner's in-session authorization of the packet and of the documentation-anchor exception is
  not verifiable from the repository.
- Other reviewers' environments and self-declared models are not independently verifiable.
- No external proof of registry publication, CI execution or deployment was available or in scope;
  this packet makes no such claim.
- I did not attempt to reproduce the round-2 author's Node v25.2.1 runs; my reruns are on
  v22.22.3, which is inside the declared support range and reproduces OP1/OP2.
- Verified observation, relevant to any future mechanical check: `scripts/check-builder-docs.ts`
  builds its source list from `docs/development/README.md`, the root and package READMEs, two legacy
  docs, the skill file, `docs/guides/**`, one example README and `mental-model/**`. It does **not**
  include `docs/development/work/**` or `007-work-packets.md`. I confirmed this empirically: placing
  this record in the extracted H2 tree left the count at exactly 57 files / 845 links. So the gate
  validated `roadmap.md:77`'s *link* — which resolves — and could never have caught its *prose*
  claim. The mechanical check the round-2 report proposes would have to widen that source list to
  reach ledger and report statements; widening it is out of this packet's docs-only scope and is
  left to the owner.

**Verdict: CHANGES REQUIRED.** One P2 finding, `REF1-R2-DOC-01`. All three prior findings closed;
REF-1, REF-2, REF-3 and REF-5 PASS; REF-4 FAILS on a one-clause stale cross-page description. No
P0/P1, no BLOCKED state.