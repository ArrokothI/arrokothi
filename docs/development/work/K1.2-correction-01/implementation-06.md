# Implementation report — K1.2-correction-01, round 6 (contract revision 7)

Claude Code desktop, model `claude-opus-5-5`, session `8913b130`, 2026-09-28. The owner directed that
a new Claude Code (Opus 5.5) session implement this round and that GPT-6 review it
([amendment 02](amendment-02.md), adoption record). This session wrote no earlier review or report
of this packet. This report records implementer work, not acceptance.

## Identity

- **Packet and contract:** K1.2-correction-01, parent K1.2. [Contract revision 7](contract.md) records
  [amendment 02](amendment-02.md); revision 6's [amendment 01](amendment-01.md) and
  [decision-05](../K1.2/decision-05.md) still govern V-D1.
- **Governing process baseline B:** `a20d278185eaffc7f8b7489345a3624231ff6e6d`, equal to fetched
  `origin/main`. 006, 008 and 012 are unchanged since B on this branch.
- **State:** WAITING_FOR_REVIEW, as an implementer assessment only.
- **Owner release and decisions:** release `6ed7d3a6e3d7190aae5bbdfcf10dd515a6b45abb`; decisions of
  2026-09-28 at `13a73ad9ad0662fe585d1453280c5ac3da4f79bb`; amendment 02 at
  `60eebc24113eb834e5d88015ca2a196c95c60493`. The invalidation-01 and invalidation-02 holds remain.
- **Prerequisites:** unchanged from implementation 05 (K1.1 and K1.1-correction-02 are integrated and
  ancestors of B).
- **Branch:** `codex/k1.2-correction-01-activation-identity`; origin
  `https://github.com/ArrokothI/arrokothi.git`. Forward commits only. The existing clean checkout
  already named this branch at the pushed start commit, so no checkout was switched; the separate
  Codex worktree at `312f258` was not touched. This continues the owner-authorized cumulative branch
  departure recorded in the contract.
- **Commits since the previous candidate:**
  - previous reviewed H: `3b0848ce408ddef9165434f7d7c36e9580ac6341` (C
    `2613f2b8dee37c934743d9b730e925705086c4c9`), [review 09](review-09.md) CHANGES REQUIRED, recorded
    at `87ce849f3db4ed9615383c5e29eb3a1522c31ead`;
  - owner record of amendment 02: `60eebc24113eb834e5d88015ca2a196c95c60493` (start of this round);
  - **payload C: `602ea3b3955f1aea935849e993ebfb66b64ebd5b`**;
  - **candidate H:** the commit containing this report. The external handoff gives its full SHA.
- **C..H:** only the allowlist at the end of this report.

## Design: the brief's three questions

**1. Which structural rule guarantees that no Kernel read after caller observation consults a
prototype, and how is it enforced?** No ordinary access, read or write, to a member its object may
not own ([correction DEC-8](contract.md)). A member a type declares optional is exactly one its
object may not own, so the rule is stated over declared optionality:

- Kernel records own every field they declare. Each is built by one object literal, and the zone
  reads only declared required members. History records are now built by positional builders, so a
  record owns exactly its fields and building it reads nothing.
- Caller envelopes are read only through `observeOwn` (values.md's inherited-field rule, unchanged).
- Trusted host objects keep ordinary reads for required members, which the host owns by contract.
  Their optional members (`controlScopes`, `mailboxCapacity`, `emissionsPerOutcome`,
  `isSafeToReplace`) resolve through the new `hostMember`, which walks own descriptors on the host
  object and its own prototype chain and stops before `Object.prototype` and `Function.prototype`.
- The only remaining optional-member accesses are fields of engine-built property descriptors that
  are owned by construction (`enumerable` always; `value` after `hasOwnValue` or on the data
  descriptor of a Kernel-built record's own data field).

Mechanical enforcement is the new maintained test `ambient-reads.test.ts`. It builds a TypeScript
program over the 13 zone sources and lists every property access whose member is declared optional
(reads, writes, `?.`, element access and destructuring), every dynamic-key read and every `in`
operator. The listing must equal a pinned inventory of 26 sites in 18 entries, each with a reason
(17 descriptor-field reads, 6 writes to a null-prototype descriptor, 3 dynamic-key reads after an
own-descriptor check; no `in`), and every
guarded descriptor read must follow its `hasOwnValue` check in the same function. A synthetic probe
file with review 09's `entry.resultingEpoch === undefined`, `?.`, destructuring, `in` and a dynamic
read proves the scan is not vacuous. On H the test lists exactly the six affected reads.

**2. How do entry, update and clear commit the hold change and its history together?** By building
the whole decision first ([correction DEC-9](contract.md)). Each control observes its request,
checks accepted state, then builds the new hold, its history record, for a takeover the receipt
(position read, not advanced), Activation, grant and clearing record, and the answer, from Kernel
data only. `applyControlCommit` then appends the prebuilt record and writes the two hold fields.

- No caller code and no caller-influenced read can occur between the first and last mutation. The
  only caller code in these paths runs during observation, before the checks, so a reentrant call is
  ordered before the decision (the matrix's reentrant arm now never runs).
- For entry, update and declaration clear, the apply step's only call is the append, and it comes
  first; the hold writes after it call nothing. So no fault, caller-raised or engine-raised, leaves a
  hold changed without its history record or a record without its hold. The answer is prebuilt, so
  nothing is built after commit.
- A takeover's apply step has two appends (receipt, then clearing record) followed by plain writes,
  and the Driver is handed the new attempt only afterwards. Like Outcome acceptance (K1.2-DEC-10) it
  claims only that no caller-reachable code or read lies between its first and last mutation; engine
  resource exhaustion inside it is outside this in-memory packet's claim.
- The same test file enforces the ordering: in the three controls nothing after the first mutation
  constructs anything, calls anything but the apply steps and the post-commit delivery, or returns a
  value built after mutation; `applyControlCommit` appends before its hold writes and calls nothing
  else; hold fields and recovery history are written only by the commit paths.

**3. Which other sites share the mechanism?** The TypeScript-checker inventory answered this over the
whole zone rather than by inspection. Three implementer-found defects share it (below). Checked and
not affected:

- **Projections** (`viewOf`, `holdsOf`, exchange/Activation/delivery/mailbox views) are built only
  from records that own every field read, into own-data lists and literals.
- **Returned answers** are literals over Kernel data; the three control answers are now prebuilt.
- **Delivery records** own their fields; failure diagnostics take only a primitive string through the
  load-time slice.
- **Refusal records** are four-field literals from `mintRefusal`.
- **Outcome acceptance** already prebuilt its `ended_by_outcome` records with every field owned
  (review 09 found it resisted the injection); it is unchanged.
- **Retained caller objects:** after the fix, every retained history field is a Kernel primitive, a
  Kernel-built string, or the trusted host's `namespace`.

Two points remain by design and are listed as observations for the reviewer:

- A projection that omits an optional member (a history record without `resultingEpoch`, an
  `ActivationEvent` without `subscriptionClass`) keeps its accepted shape. The Kernel never reads such
  a member back, but a *consumer's* ordinary read of it consults the consumer's prototypes.
- Required host members are trusted by contract; a host that omits one is outside the contract.

## Changes and coverage

**Production (C).**
- `coordinator.ts`:
  - `appendRecoveryHistory` is replaced by `holdHistoryRecord` and `takeoverHistoryRecord`
    (positional, own-by-construction) and the prebuilt `ControlCommit` / `applyControlCommit`;
  - `recoverExecution`, `reportProtocolFailure` and `requestTakeover` build before they apply;
  - `mayControlScope`, the constructor limits and the takeover safety call use `hostMember`;
  - the zone header and control docblocks state the read rule and the commit discipline.
- `envelope.ts`: `hostMember`.
- `own-array.ts`: descriptor helpers (`isDataDescriptor`, `descriptorValue`, `descriptorGetter`);
  `ownFieldValue` checks `hasOwnValue` as well.
- `driver.ts`: `isSafeToReplace` documentation states the resolution rule.
- `values.ts`: comments only (CLAIM-01, below). No executable change; accepted values, single
  observation, identities, ordering, diagnostics and all limits are unchanged.

**Tests (C).** Three new files, 63 tests; no existing test changes.
- `recovery-ambient.test.ts` (43): review 09's 22-case matrix with a whole-result oracle; the
  mutable foreign reference across all six transitions; both safe clear paths; counting accessors on
  15 record, hold, plan and answer field names, installed during observation and as residue.
- `host-members.test.ts` (12): the three self-found defects, plus compatibility cases (a class-based
  Driver method, a method or `controlScopes` inherited from a host prototype object, a limit getter on
  an options class) so the fix is not over-broad.
- `ambient-reads.test.ts` (8): the structural rules above.

On H's source the same files fail 24/43, 8/12 and 7/8: the 12 matrix rows review 09 found, the
mutable and every-field cases, all self-found defects and every structural rule. Only the control
arms, the safe clears, the compatibility cases and the scanner's vacuity check pass on both.

**Records and scripts (C).**
- Contract revision 7 (amendment 02, DEC-8, DEC-9, coverage rows, commands).
- [Coverage-06](coverage-06.md): the pre-code reconstruction, written before the production change.
- `check-records.mjs`: the declared correction-test list gains the three new files that amendment 02's
  maintained oracles require; amendment 02 and coverage-06 join the local link check. No other pin
  changes.
- `validate.mjs`: the round-6 entries 37–45.
- `ablations-06.mjs`: 22 round-6 mutants against the full Kernel suite.
- `ablations-03-rebound-06.mjs`: see below.
- `probe-host-members-06.ts`: runs the three self-found schedules against the start commit's source
  (via `git show`) and the current tree.

**Layer 3 and implementation records (C).**
- BASELINE `#outcome-acceptance-api`: the recovery-control transaction and ambient-read choices; the
  control-authority, safe-replacement and declared-limit bullets.
- `mental-model/roadmap.md`: the K1.2-correction-01 cost mapping now points at K1.1-correction-03,
  and a navigation entry for that packet names its values owner.
- `mental-model/rewrite-index.md` §4: the transaction entry notes that the recovery controls use the
  same build-then-apply discipline.
- No concept or mechanism page changes. The architecture's rules are unchanged; DEC-8/9 are binding
  choices of the in-process implementation. `execution-cycle.md#atomic-decisions-across-the-system`
  lists no recovery-decision row; DEC-9 satisfies `state.md` (recovery decisions are History) and
  `evidence.md` (recorded commands) without one. See observation O2.

**Existing runners.** The reconstruction deleted `appendRecoveryHistory` and prebuilds the three
answers, so four sealed review-04 mutants (X12, X18, X19, X20) name spans that no longer exist. The
round-3 runner `ablations-03.mjs` is unchanged and is still run; it now stops at X12's
unique-anchor assertion (disclosed). `ablations-03-rebound-06.mjs` verifies that runner's SHA-256 and
injects a rebinding step. The step asserts that each original anchor is absent, and rebinds only
those four find/replace literals to the spans that now carry the same coordinate, with the same wrong
semantics:
- X12: both history builders;
- X19: both recovery answers, since the old single return served both;
- X18, X20: the prebuilt takeover and protocol answers.
Mutation IDs, test selection, the 35-test control and the verdict rule are unchanged. This follows
round 2's `original-ablations-02.mjs` precedent. The hold literals were split into their own
statements, so X11 and X21 still apply unadapted. Every other existing anchor was checked before C:
115 anchors across the sealed K1.2 runner (with its adapter), the correction runner (and its
30/1 renderer inventory), review 04's X8–X23, review 06's Z1–Z16 and the V/T mutants. All but those
four apply exactly once.

**Selected 012 methods:** normative examination (read rule, transaction ordering, claim text);
deterministic execution; in-process race/fault injection (inherited data, throwing and reentrant
accessors during observation and as residue); process/documentation (records, allowlist, links).
**Exclusions:**
- Native fidelity (R1), process death (K3), external gates (K1.4) and packaging (S1).
- The broader in-process threat model (hostile same-process code beyond ambient pollution) is
  DESIGN-AUDIT-01's.
- V-D1 cost is K1.1-correction-03's; no meter or cost work was done.

**Obligation/interaction coverage.**

| Obligation / source | Distinguishing input | Expected facts / forbidden changes | Evidence and result |
|---|---|---|---|
| R9-HISTORY-01; C9, C10, C12, C13 | review 09's 22 cases; mutable object; every-field accessors | no inherited read, exception or nested callback; one record owning exactly its keys; takeover alone owns `resultingEpoch = 2`; answer = committed holds; causal order | `recovery-ambient.test.ts` 43/43; review-09 matrix `--expect-correct` 0 violations; H1–H11 rejected |
| Both safe clear paths | takeover clear and Outcome end under 777 and a throwing accessor | own `resultingEpoch = 2` only for takeover; none for Outcome end | same file; matrix rows |
| Same-mechanism host members; DEC-14/15, C13 | see self-found defects | refused/defaults with zero control-state change; compatibility kept | `host-members.test.ts` 12/12; probe; H15–H21 rejected |
| DEC-8/9 structure | inventory and ordering scans | new optional, dynamic or `in` access, or construction after mutation, fails | `ambient-reads.test.ts` 8/8; H3–H7, H22 rejected |
| Takeover commit sites (new mint/apply spelling) | exact receipt token, retained receipt, index advance, clearing record | exact coordinates and contiguous positions preserved | H9, H12–H14 rejected; Z1–Z16, X18 rebound |
| C1–C15 cumulative; DEC-1–7 | full suites and every existing runner | values, observation, identities, ordering, diagnostics unchanged | validation table below |
| R9-CLAIM-01; C15 | alias search over live text | no live V-D1 implementation claim; values.md normative text and sealed records unchanged | search log 44; comments; roadmap |

## Semantic correction closure

- **Invariant.** C13: after the first caller observation, and on every commit, replay, redelivery and
  projection, no prototype is consulted. Also DEC-18 (a recorded, immutable history record per
  accepted control decision) and evidence.md (retained evidence immutable). Review 09's
  counterexamples: inherited 777, a throwing inherited getter, a reentrant Outcome, and a mutable
  inherited object.
- **What was misunderstood.** Earlier passes enforced C13 for writes and built-in methods; reads of
  unowned members were never part of the rule. DEC-10's prebuild discipline was specified only for
  Outcome acceptance.
- **Producers and consumers traced.**
  - History producers: entry, update, declaration clear, protocol report, takeover clear, Outcome end.
  - History consumers: inspection (`copyOwn`), answers (via `holdsOf`), the review matrix.
  - Hold producers: the three controls and dispatch's literal. Hold consumers: redelivery, takeover
    pre/post-callback checks, `#accept`'s ended records, `holdsOf`.
  - Host-member consumers: `#requireControl`, the constructor, takeover safety.
  Aliases searched: optional (`?:`), `?.`, `??`, `=== undefined`, `in`, destructuring, dynamic keys,
  answered by the checker scan rather than by text search.
- **Additional counterexamples added.** Every-field pollution (15 names), residue as well as
  during-observation installation, function-object and class Drivers, host-prototype members.
- **Engine-fault experiment.** A stack-headroom sweep (an engine exception at every depth of
  `reportProtocolFailure`, H and fixed code, about 450 depths each) found no partial state in either,
  because the stack the call needs before its first mutation exceeds what the apply window needs.
  The behavioural sweep therefore cannot distinguish "history after mutation" once no caller code is
  in the window. That is why H3–H7 are rejected by the structural rule alone, and the sweep is not
  presented as a maintained oracle. H4 and H5 also restore post-mutation construction.
- **Whole-packet re-audit.** Done on the cumulative diff after the change. The bounds held:
  accepted values, single observation, identities and ordering unchanged; no V-D1 work; every
  existing runner still rejects (the four anchor rebindings aside).

## Prior findings

- `K12C1-R9-HISTORY-01` (P1): closed on C by DEC-8/9 and the maintained oracles above. The
  review-09 reproducers `probe-history.mjs` and `probe-history-mutable.mjs` now exit 1. They assert
  the defect (777, the foreign object), and it no longer reproduces. Their raw output is attached.
- `K12C1-R9-CLAIM-01` (P2): closed on C.
  - `values.ts` module item 4 and the `charge` comment now state byte-stop and read-bound facts, and
    that the V-D1 claim is held pending K1.1-correction-03.
  - The alias search found two more live phrasings, both corrected: the string-scan comment
    ("no more than accepting a string at the limit costs"; the bound is in fact up to two code units
    past the costliest accepted string) and the open-stack comment ("trivially cheap", the very scans
    review 08 measured).
  - The roadmap points at the split.
  - `values.md`'s normative text and all sealed records are unchanged.
- **Correction to implementation 05.** Its statement that a search of BASELINE, 007, Layer 3,
  `packages/kernel/src` and the guides found no other V-D1 claim was wrong: `values.ts` item 4, the
  `charge` comment and the two phrasings above were live implementation claims. Implementation 05 is
  sealed and unchanged; this is the superseding note.
- Earlier findings: as review 09's reconciliation table records. Transferred cost findings stay open
  in K1.1-correction-03.

## Additional self-found defects (implementer provenance)

Same mechanism as HISTORY-01 (an optional member of an object that may not own it, answered by
`Object.prototype`), found by the reconstruction's checker scan and confirmed by probe at the start
commit (`probe-host-members-06.ts`, attachment 43). None was listed by review 09.

- **SELF-R6-HOST-01 (P1-class, K1.2-DEC-15).** A Driver without `isSafeToReplace` was treated as safe
  when the takeover request's own `activationId` getter installed `Object.prototype.isSafeToReplace`
  during observation: the takeover was accepted at epoch 2. Also reachable through residue and, for a
  function-object Driver, through `Function.prototype`. Present since K1.2.
- **SELF-R6-HOST-02 (P1-class, K1.2-DEC-14).** Residue `Object.prototype.controlScopes` gave a
  visibility-only caller control power: the protocol-failure hold was accepted. Present since K1.2.
- **SELF-R6-HOST-03 (P2-class).** Residue `Object.prototype.mailboxCapacity` (K1.1) or
  `emissionsPerOutcome` (K1.2) at construction declared a limit the host never configured.

Fix: `hostMember` (DEC-8). Distinguishing evidence: `host-members.test.ts`, the probe and mutants
H15–H21. Severity labels are the implementer's assessment; the reviewer decides.

**Unresolved obligations:** none known in scope.

## Observations for the reviewer

- **O1.** `values.md`'s `OPEN(implementation)` diagnostic-storage marker still describes the choice
  as "diagnostic storage for bounded refusal cost … meeting V-D1". It is left unchanged because
  amendment 01 item 3 changes `values.md` only in K1.1-correction-03; the held claim is stated in
  BASELINE, the contract and `values.ts`.
- **O2.** `execution-cycle.md#atomic-decisions-across-the-system` has no recovery-decision row. No
  Layer-3 change was made because no semantics changed; the owner may add one.
- **O3.** Consumer-side ordinary reads of absent optional members in projections (see Design 3).
- **O4.** Engine resource exhaustion inside the takeover or Outcome apply phases, or in `#refusal`
  (which advances its index before minting), could leave a partial decision. No caller code runs
  there. This is outside this in-memory packet's claim, as for DEC-10.
- **O5.** `hostMember` treats `Object.prototype` and `Function.prototype` as ambient. A host that puts
  its Driver on another shared prototype chain accepts that chain as part of its trusted Driver.
  Whether such chains count as ambient belongs to DESIGN-AUDIT-01's threat model.

## Validation and interpretation

The validation ran sequentially on clean C:
`node docs/development/work/K1.2-correction-01/validate.mjs <scratch dir>`, from the repository
root. `46-new-oracles-on-reviewed-H` is the one manual addition, also run at clean C; its header
records the exact command. The outputs are attached under `validation-06/`.

The environment is Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin arm64
([00-environment.json](validation-06/00-environment.json)).
[13-results.json](validation-06/13-results.json) records every command, exit code and timestamp,
and the tree was clean after the run. [MANIFEST.sha256](validation-06/MANIFEST.sha256) covers the
51 other attachments; its own SHA-256 is
`8e4d83584484dce4bf5ae6269c736cdd5cec648d73a85c1e44a9d1f461d52649`.

| Command / raw output | Exit | Observation |
|---|---:|---|
| [01-typecheck](validation-06/01-typecheck.txt) | 0 | TypeScript passed |
| [02-full](validation-06/02-full.txt) | 0 | 3,385/3,385; 0 failed/cancelled/skipped/todo (3,322 + 63 new) |
| [03-kernel](validation-06/03-kernel.txt) | 0 | 1,331/1,331 |
| [04-conformance](validation-06/04-conformance.txt) | 0 | 1,945/1,945 |
| [05-sdk](validation-06/05-sdk.txt) | 0 | 22/22 |
| [06-builder-docs](validation-06/06-builder-docs.txt) | 0 | 72 files; 1,844 links/anchors; 38 imports |
| [07-original-ablations](validation-06/07-original-ablations.txt) | 1 | Control 1,331/1,331; 32/36; B6/B12/B13/B14 NOT APPLICABLE (the disclosed anchor drift, as in rounds 2–5) |
| [08-correction-ablations](validation-06/08-correction-ablations.txt) | 0 | Control 571/571; 67/67 rejected (renderer inventory 30/1 unchanged) |
| [09-r11-probe](validation-06/09-r11-probe.txt) | 0 | 8/8 `stale_exchange`; accepted state unchanged |
| [10-records-links](validation-06/10-records-links.txt) | 0 | Ancestry and sealed records; 24 files, 696 links/anchors |
| [11-evals](validation-06/11-evals.txt) | 0 | 12/12 |
| [14-original-ablations-adapted](validation-06/14-original-ablations-adapted.txt) | 0 | Control 1,331/1,331; 36/36 rejected |
| [15](validation-06/15-review-identity.txt)–[18](validation-06/18-diagnostics-maxlen.txt), [20](validation-06/20-review-aggregate.txt), [21](validation-06/21-review-equality.txt), [26](validation-06/26-review-aggregate-pre-authority.txt) review-01/02 probes | 0 | As in implementation 05 |
| [23](validation-06/23-review-cost-accept.txt)–[25](validation-06/25-review-cost-refuse-ctor.txt), [28](validation-06/28-review4-p4-p5.txt), [32](validation-06/32-review6-cost-and-blocker.txt), 34 (six handler runs), [35](validation-06/35-string-work.txt) | 0 | Cost and timing are observations only (V-D1 transferred). Count and logical assertions pass; P4 exact-coordinate oracle all `ok` |
| [27-revision4-ablations](validation-06/27-revision4-ablations.txt) | 1 | The unchanged round-3 runner: control 35/35, X8–X11 rejected, then stops at X12's unique-anchor assertion (span removed by the reconstruction) |
| [38-revision4-ablations-rebound](validation-06/38-revision4-ablations-rebound.txt) | 1 | Same runner with X12/X18/X19/X20 anchors rebound: control 35/35; X8–X23 and V1–V4 rejected (20/21); V5 is the disclosed equivalent survivor, as in round 5 |
| [30-review6-exact-ablations](validation-06/30-review6-exact-ablations.txt) | 0 | Control 1,331/1,331; Z1–Z16 all rejected |
| [31-diagnostic-work-ablations](validation-06/31-diagnostic-work-ablations.txt) | 0 | Control 20/20; T1–T4 rejected |
| [37-round6-ablations](validation-06/37-round6-ablations.txt) | 0 | Control 1,331/1,331; H1–H22 all rejected (22/22) |
| [39-review9-probe-history](validation-06/39-review9-probe-history.txt), [40-…-mutable](validation-06/40-review9-probe-history-mutable.txt) | 1 | Review 09's reproducers. They assert the defect (inherited 777; retained foreign object) and now fail at that first assertion because it no longer reproduces: the record owns no `resultingEpoch`. `probe-history.mjs` therefore stops before its throwing mode; the matrix (41/42) and the maintained tests cover that mode |
| [41-review9-matrix](validation-06/41-review9-matrix.txt) | 0 | 22 cases; control and safe-path assertions pass |
| [42-review9-matrix-expect-correct](validation-06/42-review9-matrix-expect-correct.txt) | 0 | `--expect-correct`: 22 cases, **0 violations** (review 09 recorded 12 at H) |
| [43-host-members-probe](validation-06/43-host-members-probe.txt) | 0 | Start `60eebc2` source: safety accepted at epoch 2, residue control accepted, capacity 1 undeclared; current source: `unsafe_replacement`, `unauthorized_control`, default capacity |
| [44-claim-alias-search](validation-06/44-claim-alias-search.txt) | 0 | Remaining live hits are the held-claim statements (values.ts, BASELINE, 007, roadmap split) and normative/provenance text in values.md/sources.md, plus unrelated uses of "cheap" |
| [46-new-oracles-on-reviewed-H](validation-06/46-new-oracles-on-reviewed-H.txt) | 1 | The three new test files against H's source: 63 tests, 24 pass, 39 fail, as stated above |
| [45-round6-diff-check](validation-06/45-round6-diff-check.txt) | 0 | `60eebc2..C` whitespace-clean: this round's whole payload delta |
| [33](validation-06/33-round4-diff-check.txt), [29](validation-06/29-round3-diff-check.txt), [22](validation-06/22-correction-diff-check.txt), [19](validation-06/19-round2-diff-check.txt), [12](validation-06/12-diff-check.txt) historical-range diff checks | 2 | Only whitespace quoted inside sealed earlier validation/review attachments (now including review-09's) |

The collector exits nonzero because it keeps the disclosed exits above. No command timed out, was
killed by a signal, or failed to load.

**Checks not run, and limits.**
- Node 22 was not run.
- Cost and timing probes are observations only.
- The stack-headroom sweep described under correction closure was an exploratory scratch experiment,
  not evidence for any criterion, so it is not attached.
- The five disclosed exceptions (07, 27 with its adapter 38, the historical diff checks, and the two
  reproducers) are explained above.

**Why the evidence supports each criterion (implementer assessment, not acceptance).**
- **C9, C10, C12 and C13:** the review-09 matrix oracle, the mutable-reference, every-field and
  safe-clear cases, the structural rules and H1–H14 each distinguish the defect from the fix.
- **C8, C10 and C13 for host members:** `host-members.test.ts`, the probe and H15–H21.
- **C15 and the narrowing:** the comments, the roadmap and the alias search.
- **Every other criterion:** the unchanged suites and runners pass or reject as before.

**Design choices, amendments, assumptions and strongest remaining risk.**
- Owner amendment 02 authorizes the production change.
- DEC-8's stop set (`Object.prototype`, `Function.prototype`) is the implementer's choice for "ambient
  built-in prototype" under the current C13 rule. It preserves class-based and host-prototype members.
- **Strongest risk:** a reviewer may judge that DEC-8 should be own-only for trusted hosts (stricter),
  or should also cover required host members. Both would change behavior for legitimate hosts, so
  they are left to the owner or DESIGN-AUDIT-01 (O5).
- **Second risk:** H3–H7 and H22 are rejected by the structural rule alone, because they are
  behaviourally equivalent once no caller code runs in the window.

**Third-party use:** none new. The TypeScript compiler API used by the new test is the repository's
existing development dependency, already imported by `tests/conformance/architecture/module-graph.ts`.

## Exact C..H administrative allowlist

```text
docs/development/007-work-packets.md
docs/development/work/K1.2-correction-01/implementation-06.md
docs/development/work/K1.2-correction-01/validation-06/00-environment.json
docs/development/work/K1.2-correction-01/validation-06/01-typecheck.txt
docs/development/work/K1.2-correction-01/validation-06/02-full.txt
docs/development/work/K1.2-correction-01/validation-06/03-kernel.txt
docs/development/work/K1.2-correction-01/validation-06/04-conformance.txt
docs/development/work/K1.2-correction-01/validation-06/05-sdk.txt
docs/development/work/K1.2-correction-01/validation-06/06-builder-docs.txt
docs/development/work/K1.2-correction-01/validation-06/07-original-ablations.txt
docs/development/work/K1.2-correction-01/validation-06/08-correction-ablations.txt
docs/development/work/K1.2-correction-01/validation-06/09-r11-probe.txt
docs/development/work/K1.2-correction-01/validation-06/10-records-links.txt
docs/development/work/K1.2-correction-01/validation-06/11-evals.txt
docs/development/work/K1.2-correction-01/validation-06/12-diff-check.txt
docs/development/work/K1.2-correction-01/validation-06/13-results.json
docs/development/work/K1.2-correction-01/validation-06/14-original-ablations-adapted.txt
docs/development/work/K1.2-correction-01/validation-06/15-review-identity.txt
docs/development/work/K1.2-correction-01/validation-06/16-review-maxlen.txt
docs/development/work/K1.2-correction-01/validation-06/17-review-namespace.txt
docs/development/work/K1.2-correction-01/validation-06/18-diagnostics-maxlen.txt
docs/development/work/K1.2-correction-01/validation-06/19-round2-diff-check.txt
docs/development/work/K1.2-correction-01/validation-06/20-review-aggregate.txt
docs/development/work/K1.2-correction-01/validation-06/21-review-equality.txt
docs/development/work/K1.2-correction-01/validation-06/22-correction-diff-check.txt
docs/development/work/K1.2-correction-01/validation-06/23-review-cost-accept.txt
docs/development/work/K1.2-correction-01/validation-06/24-review-cost-refuse-undefined.txt
docs/development/work/K1.2-correction-01/validation-06/25-review-cost-refuse-ctor.txt
docs/development/work/K1.2-correction-01/validation-06/26-review-aggregate-pre-authority.txt
docs/development/work/K1.2-correction-01/validation-06/27-revision4-ablations.txt
docs/development/work/K1.2-correction-01/validation-06/28-review4-p4-p5.txt
docs/development/work/K1.2-correction-01/validation-06/29-round3-diff-check.txt
docs/development/work/K1.2-correction-01/validation-06/30-review6-exact-ablations.txt
docs/development/work/K1.2-correction-01/validation-06/31-diagnostic-work-ablations.txt
docs/development/work/K1.2-correction-01/validation-06/32-review6-cost-and-blocker.txt
docs/development/work/K1.2-correction-01/validation-06/33-round4-diff-check.txt
docs/development/work/K1.2-correction-01/validation-06/34-handler-direct-0.txt
docs/development/work/K1.2-correction-01/validation-06/34-handler-direct-1000.txt
docs/development/work/K1.2-correction-01/validation-06/34-handler-direct-10000.txt
docs/development/work/K1.2-correction-01/validation-06/34-handler-outcome-0.txt
docs/development/work/K1.2-correction-01/validation-06/34-handler-outcome-1000.txt
docs/development/work/K1.2-correction-01/validation-06/34-handler-outcome-10000.txt
docs/development/work/K1.2-correction-01/validation-06/35-string-work.txt
docs/development/work/K1.2-correction-01/validation-06/37-round6-ablations.txt
docs/development/work/K1.2-correction-01/validation-06/38-revision4-ablations-rebound.txt
docs/development/work/K1.2-correction-01/validation-06/39-review9-probe-history.txt
docs/development/work/K1.2-correction-01/validation-06/40-review9-probe-history-mutable.txt
docs/development/work/K1.2-correction-01/validation-06/41-review9-matrix.txt
docs/development/work/K1.2-correction-01/validation-06/42-review9-matrix-expect-correct.txt
docs/development/work/K1.2-correction-01/validation-06/43-host-members-probe.txt
docs/development/work/K1.2-correction-01/validation-06/44-claim-alias-search.txt
docs/development/work/K1.2-correction-01/validation-06/45-round6-diff-check.txt
docs/development/work/K1.2-correction-01/validation-06/46-new-oracles-on-reviewed-H.txt
docs/development/work/K1.2-correction-01/validation-06/MANIFEST.sha256
```

## Handoff

- **Ready for independent cumulative review** of B..H under contract revision 7, by GPT-6 as the owner
  directed.
- The external handoff supplies B, C, H and the verified remote SHA.
- No self-acceptance, integration, merge or successor release. Both invalidation holds stay under
  owner control.
