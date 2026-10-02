# Independent review 02 — DESIGN-AUDIT-01 (correction round 2)

## Reviewer, session and access

- **Reviewer:** Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-01. I did
  not write design-02, the payload, report 02 or owner-decisions-02.
- **Independence limits.** The implementer is a Codex session (GPT-6 per its report), a different model family.
  The same model as mine, in other sessions, wrote brief-01, review-01 and its brief-02, and the six-check
  prompt the owner forwarded. owner-decisions-02 was recorded by a `claude-sonnet-5-5` session (I checked the
  model field of transcript `a7b9d370-…`). Those shared authors are a correlated-assumption risk; one finding
  below traces to review-01's own probe.
- **Access:** local clone of `ArrokothI/arrokothi` with a shell, full Git history and network fetch; the owner's
  local Claude Code transcripts on this machine. I reviewed in two detached worktrees (C and H) in my session
  scratchpad. `canonicalize@3.0.0` came from the owner's main-checkout `node_modules` through a symlink placed
  above the worktrees, so neither worktree was dirtied.
- **Environment:** macOS (Darwin 25.6.0) arm64, Node v25.2.1, Python 3.13.5, git 2.39.5. The implementer
  reports Python 3.14.6 and Node v25.2.1.
- **Limits:** no access to the owner–Codex conversation or the owner–Sonnet walkthrough; I treated
  owner-decisions-02 as the owner's instruction, as the review prompt directs, and checked only its recorder
  model and its six-check source. I did not rerun the 63-run R8 cost corpus, the N15 runner or the
  eager-Outcome probes (no derivation changed; review-01 reran N15), the full product test suite, or SES (not
  installed; no dependency was added).

## Candidate identity (verified)

| Role | Full SHA | Check |
|---|---|---|
| Base B | `66bc041175e6fc191c2e7cf88de198111e7d97c9` | commit; advertised `refs/heads/main`; ancestor of H |
| Payload C | `0ef728f0b93b7211d7c05795aa9f2cb5e7ce818e` | parent of H; child of the review-01 record `1df760718215f9c45475163a883c259d09782dc3` |
| Candidate H | `4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e` | advertised `refs/heads/codex/design-audit-01` (`git ls-remote`, 2026-10-01) |
| Previous reviewed H | `7ebf80d461c439459d0c8010c04c9fb197281a59` | review-01, CHANGES REQUIRED |

- **C..H** is exactly `implementation-02.md` (added) and `007-work-packets.md`, where only the DESIGN-AUDIT-01
  row changed. That matches the report's allowlist. No raw-output attachment.
- **B..H** touches only `docs/development/work/DESIGN-AUDIT-01/` (215 files) and 007. In 007 every row other
  than DESIGN-AUDIT-01 and the owner-authorized K1.1 sentence is byte-identical to B. Between the review-01
  record and C, 50 packet files change (12 added, 38 modified); C..H adds `implementation-02.md`. No product code, test, Layer-3 page, BASELINE,
  guide, AGENTS.md or process document changes. No historical record (review-01 and its evidence, brief-01,
  design-01, implementation-01, invalidation-01, stop-01) changes. `owner-decisions-02.md` is committed
  unchanged (SHA-256 `e3bdb7aa…5035053`, as the report states).
- **Policy baseline:** B (006, 007, 008, 012, 016 read at B).

## Coverage before verdict

I read the setup files in the order the review prompt lists them, which includes `implementation-02.md`, so
my coverage map ([review-02/coverage-map.md](review-02/coverage-map.md)) is not blind to the report. To limit
anchoring, I closed every row with my own probe, mutant or source trace rather than with the report's
assessment. The map adds two interactions the criteria do not name:
- whether each new option's closure would reject a plausible wrong implementation of that option;
- whether second-hop accesses (a binding instead of an intrinsic, a Proxy forwarding to an exotic target) are
  inside the probe corpora the closures rely on.

## Verification command, corpus and reruns

- **Packet verifier at clean C:** `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean`
  gives exit 0 and PASS: 278 labels, 16 families, 23 drafts, 733 local links, 215 changed files; renderer 22
  items, 51 options, 20 inventory entries, 7 negative controls ([verify-at-C.txt](review-02/rerun/verify-at-C.txt)).
- **At clean H with `--C 0ef728f0…`:** exit 0 and PASS, 745 links, 216 files
  ([verify-at-H.txt](review-02/rerun/verify-at-H.txt)). `git diff B H --check` exits 0.
- **Review-01's counterexamples, rerun against H's register** ([rerun/](review-02/rerun/)):
  - `template_check.py`: `all identical claims: False`, `all suffix-only closures: False`. It parsed two
    options per family with nonempty cells, so the pass is not vacuous.
  - `consistency_extract.py`: every recommended row of A, B, C, F02, F09 and F10 tags
    `CORE = bytes/text`, and C's old "If A keeps objects…" conditional is gone. The tagger reads labels only,
    so I also read the content of all six rows. They describe the same core.
  - `claims_coverage.sh`: decisions 03/04, K1.4, "cannot steer", "One reading", "Kernel-mediated",
    coherent-Proxy, ambient safety, stable-realm, frozen-intrinsics and lockdown are now named. Its values.md
    excerpt is hard-coded to the old anchor; the register itself now cites `#in-process-value-capture`.
- **Realm probes** (`round2-checks.py`, inside the verifier): the five review-01 poison attempts throw under
  `--frozen-intrinsics`; the Kernel accepts all eight ordinary values unfrozen and refuses them frozen with
  `unstable_representation`. Reproduced.
- **No maintained product corpus or mutation registry applies:** this packet changes no product code. My own
  mutants against the packet's checker are listed below.

## Results by required item

### DA01-R1-CLOSURE-01 — closed

**Mechanism.** `family-notes.json` is now schema version 2. Each of the 51 options carries its own `claims`
list, `method` and `closure`. The checked-in `probes/render-register.py` renders the whole register, the 22 item
drafts, `claim-inventory.md` and `option-claims.md`, and `--check` fails on a stale render. `validate()`
rejects duplicate claims or closure cells within an item (after whitespace and markup normalization),
closures that start with a reference word, missing inventory entries and a contradictory selected core.
`round2-checks.py` keeps review-01's `template_check.py` as a regression.

**Substance.** I read all 51 options. Every closure now tests its own option's mechanism:
- F01R checks that a relation model exists and derives the examples.
- F03R, F11R and F12R give constructor, planner and history-variant bypass checks distinct from their keeps.
- F06K and F15K no longer contain checks that only the recommended design has.
- F10 has no parser-or-traversal disjunction, and wrapper mutants are kept apart from parser evidence.
- F13R tests an authenticated transport.
- F02 and F09 carry their own text instead of deferring to C or A.

Within an item, the most similar pair of options scores 0.46 (difflib ratio).

**The guards are form-only.** The report says so. Plausible wrong drafts survive `validate()`
([guards/validator-mutants.json](review-02/guards/validator-mutants.json)); they are listed under the mutants below and recorded
as P3 DA01-R2-GUARD-01. The criterion closes by the reviewer's reading, as brief-02 specified.

### DA01-R1-ARCH-01 — closed

**CORE against owner-decisions-02 section 2.** [CORE](decision-drafts/CORE.md) matches it point by point:
- **Scoped contract.** "Native hostile callers require actual containment; shared-process bytes provide none",
  with stable-realm conditions explicit.
- **Canonical-byte core.** The core never observes caller object properties. It requires owned immutable
  bytes and strict validation of spelling, UTF-8, decoded duplicates, key order, numbers and limits before any
  state change.
- **Cooperative wrapper on the caller side.** One snapshot, an abstract-operation meter, refusal rather than
  projection.
- **Bounded non-canonical text at a separate transport adapter.** A lenient decoder, duplicate-key rejection
  before erasure, a cap, and transport refusal kept distinct from value invalidity, consistent with values.md's
  codec section.
- **Realm hardening is defense in depth only,** after positive compatibility evidence.

**Mapping and open items.**
- The matrix maps A, B, C, D, E, F02, F09, F10 and K1.1-correction-03 under all four answers: adversarial live,
  cooperative live, canonical bytes, hardened live. Structural projection is correctly treated as a domain
  policy, not a core form.
- Wrapper placement is a "Proposed preference, not owner selection", with the SDK alternative and a closure for
  each. No other file states it as decided.
- The 8 MiB transport cap is a "policy proposal, not a measured optimum", and the owner selects the value. Its
  arithmetic is sound: escaping an ASCII character costs at most 6 wire bytes per canonical byte, and the record
  says whitespace and number spellings are unbounded.
- The sequence TOOLS-01 → K1.1-correction-03 → binding → refactor → K1.3 and the split of check c match the
  owner's text.

**Remaining problem (P3 DA01-R2-DEP-01).** Eight core-independent recommended options carry one identical
appended sentence: D2, E2, F03R, F11R, F12R, F13R, F15R and F16R (`register.md:69,84,143,263,278,293,323,338`).
The sentence reads "Conditional on CORE selected canonical-bytes direction and the owner sequence; no
independent live-object-core recommendation."
- It contradicts CORE's own matrix, which maps D's refactor and E's TOOLS-01 consolidation under the
  live-object answers.
- It contradicts owner direction e, which puts TOOLS-01 first, before any core work.
- It contradicts F13R's own cost cell, "not required merely by core bytes".

The cause is a validator rule (`render-register.py:34–35`). The rule forces `core == 'canonical-bytes'` on any
recommended option of D or E. Marking E's recommendation core-independent, which is true, is rejected (mutant
M7). This is the same template mechanism that CLOSURE-01 removed: a shared string attached to many options.
Here it attaches a dependency statement rather than closure substance, so it does not block.

### DA01-R1-CLAIMS-01 — closed

**Inventory accuracy.** I checked each of the 20 inventory entries against its source at B:
- values.md's codec, boundary, fixed-limits and in-process-capture sections (snapshot, one reading,
  environment, envelope);
- decision-03 items 2–5, decision-04 (supersedes item 1 only; item 5 prohibitions) and decision-05;
- DEC-8 and DEC-9 as defined in the correction-01 contract;
- amendment 02, and amendment 03 items 1–3 and item 4's deferral;
- AGENTS.md Trusted and Isolated Execution;
- BASELINE `#value-refusal-diagnostics`;
- 007's K1.1-correction-03 row, which puts O-R8-4 out of scope, and the K1.4 row.

All are accurate except one paraphrase (in P3 CONSIST-01). All 59 link fragments resolve
([records/anchor-check.txt](review-02/records/anchor-check.txt)). The central citation is corrected. The candidate
did not propagate owner-decisions-02's repetition of the old mis-citation (owner observation below).

**Per-option maps.**
- Every option of A, B, C, F02, F09 and F10 maps all 20 entries, with SDK compatibility and moot K1.1 findings.
- The 18 maps collapse to four profile maps (adversarial, cooperative, bytes, hardened) plus three C-specific
  maps. For example, A-bytes, B-bytes, C-bytes, F02R, F09R and F10R are identical. That follows from the joint
  core decision and is not a defect.
- The bytes profile narrows decisions 03/04 item 5, decision-05, DEC-8, amendment 02, amendment-03 items 1–3,
  TRUST, BASELINE, K1.1-correction-03 and K1.4, and keeps DEC-9, ISOLATION and amendment-03 item 4. That matches owner-decisions-02's list of
  required amendments.

Inconsistencies remain in the hardened profile and the K1.1-correction-03 cells (P3 DA01-R2-CONSIST-01, and the
V-ENV cell under DA01-R2-REALM-01).

### DA01-R1-OPTION-01 — partly closed; remainder is DA01-R2-REALM-01 (P2)

**What is now present.**
- Hardening is compared in A (A-hard) and B (B-hard), with the current window's refuse-everything behavior and
  its mechanism (`values.ts:1334–1409`).
- SES is a reasoned exclusion pending exact-version licence review, and nothing was installed or copied.
- A two-sided gate: poison attempts must throw *and* positive Kernel controls must pass.

**What the evaluation misses.** It misses the hop that its own cited source and the Kernel's own audit table
document:

1. `node --frozen-intrinsics` freezes intrinsic objects but not the global object. All eight `globalThis`
   bindings that `canonicalize@3.0.0` resolves at call time (`values.ts:1130–1137`) remain writable and
   configurable, and replacing them succeeds. These are the bindings the current window pins on every call
   (`values.ts:1170–1177`). Replacing `globalThis.JSON` and `globalThis.Object` changes the serializer's
   output from `{"a":[1,"x"],"b":2}` to `{"a":[999,"x"]}`, while `Object.prototype.toJSON =` throws as
   review-01 showed ([review-02/realm/](review-02/README.md)).
2. This is the recorded mechanism of accepted K1.1 finding **K11-R5-VAL-03**. In K1.1 review 05 at
   `9fd2faa`, a Proxy `getPrototypeOf` trap replaces `globalThis.Object`. The audit lists that finding among
   the hostile family, and `values.ts:143–146` explains that the binding, unlike the frozen prototype, can be
   swapped.
3. The Node v25.2.1 CLI page that `realm-hardening.md` cites states the limitation: there is "no guarantee that
   `globalThis.Array` is indeed the default intrinsic reference".

**Why it matters for the options.**
- A-hard keeps coherent-Proxy acceptance (D03/D04 `keep`), so caller code runs inside capture.
- B-hard's closure demands "no per-call prototype/intrinsic writes", which removes today's binding pinning.
- Both narrow V-ENV only in *availability*, which implies output independence is kept.
- `realm-hardening.md:15` says the current configuration "passes the first" half of the gate, but the
  maintained poison corpus is review-01's five first-hop intrinsic mutations.

A hardened implementation could run under the Node flag with a construction-time descriptor check and no window.
It would pass the stated A-hard and B-hard closures while a coherent Proxy trap can still steer canonical bytes
mid-capture. The closure therefore does not distinguish a plausible wrong implementation, and the kept V-ENV
integrity is unsupported. The fix is narrow, because owner direction a already refuses to count hardening as a
guarantee: state the limitation, add the binding hop to the corpus, and either require pinning or narrow V-ENV.

**Where the cause lies.** The candidate inherited this from review-01. Its probe
(`review-01/a-missing-option/frozen-intrinsics-probe.mjs`) mutated five intrinsics and called them "the K1.1
hostile families". Review-01 (same model as mine) did not vary the hop (flip dimension 4). The candidate adopted
that set as its maintained corpus without reconciling it against `values.ts:1130–1137`, K11-R5-VAL-03 or the
Node page it cites.

### DA01-R1-AUTH-01 — closed

The six extra checks in owner-decisions-02 section 1 are byte-identical (2,215 characters) to the prompt at line
1409 of the original transcript `9d3c2edb-f457-407e-b79c-f2b32b5cb4fd`, timestamp `2026-10-01T03:56:50Z` (the
evening of 2026-09-30 in a US time zone). The "pre-approved" sentence is step 2 of the same prompt
([auth/six-checks-compare.txt](review-02/auth/six-checks-compare.txt); the transcript itself is not committed).
- `owner-checks-02.md` maps each of extra checks a–f to evidence that exists, and keeps them distinct from
  brief-01's items a–f.
- The pre-approval is re-sourced to the forwarded prompt and is no longer described as an owner quote. The
  historical records stay untouched and the live 007 row is corrected.
- design-02 rests continuation on the current owner instruction, which I cannot inspect. The report says so.

### P3 observations from review-01

- **SPAN-01:** closed. Four spans totalling 127 lines are now `mixed`; the exclusive test floor is 3,469, and
  `round2-checks.py` asserts it.
- **SEARCH-01:** closed. The claim pattern now covers singular and alias forms; the compatibility search is
  repository-wide; `values.ts:36–42` is listed as a dependent description under the hold.
- **FLIP-01:** closed. 016's four events are reconciled, `ad4a0e8` is added and the invalidation category is
  excluded with a reason.
- **COORD-01:** closed. Register D names K1.3 dependency, eligibility and cancellation, K2 action intents and
  K3's durable commit boundary without selecting semantics. Register and draft now share the
  after-binding condition.
- **CLASS-01:** partly addressed. The misleading prose is corrected, the process-review exclusion is declared
  and the six challenged labels get credible alternatives. Regrouping is declared open; it is optional.

### DA-1, DA-5, DA-6, DA-7 — still pass

- **DA-1:** the enumeration regenerates (278 labels, 16 qualifying families) and is unchanged.
- **DA-5:** `measure.py --check` regenerates; 3,596 − 127 = 3,469; 432 production lines and 5,696 mixed
  infrastructure lines are unchanged. Realm and transport-cap outputs are reproduced. No sealed R8 derivation
  changed.
- **DA-6:** all 23 drafts begin "Not adopted". No draft claims adoption or releases a packet. CORE's open
  items are proposals.
- **DA-7:** scope as verified above. No accepted decision, Layer-3 page, BASELINE or process document is
  amended, and both holds are stated as remaining.

### Recommendations against each other

Apart from DEP-01, no recommendation contradicts another:
- A, B, C, F02, F09 and F10 describe one core.
- D and E follow the owner's order.
- F15R discharges amendment-03 item 4 through D's refactor, and the inventory says so under AM03-4.
- C's interim step and its bytes recommendation assign O-R8-4 to K1.1-correction-03 first and to the binding
  packet later. CORE's table and owner direction b agree.

The CORE matrix and the per-option maps disagree in two hardened cells (CONSIST-01).

## New counterexamples

All are reproducible from [review-02/](review-02/README.md); commands are in its README.

1. **Global-binding hop under frozen intrinsics** (REALM-01): `realm/global-binding-probe.mjs` and
   `realm/global-bindings-all.mjs`.
   - Expected by a hardening claim that keeps V-ENV integrity: replacement throws, or does not change the output.
   - Observed: replacement succeeds for all eight bindings, and the output is steered.
2. **Proxy-forwarded exotic** (PROXY-01): `brand/proxy-exotic-probe.mts`.
   - `util.types.isMap`, `isDate` and `isTypedArray` are all false for `new Proxy(reprototypedBuiltIn, {})`.
   - The current Kernel accepts `Proxy(re-prototyped Map)` as `{}` whatever its contents, and a
     Proxy-forwarded re-prototyped `Uint8Array` as `{"0":1,"1":2}`.
   - `brand/structured-clone-control.mjs` shows the prior art the owner relied on: structured clone
     classifies a bare re-prototyped Map by its slot but throws `DataCloneError` for every Proxy. Its
     completeness rests on a refusal that decision-04 item 5 forbids for the current binding.
3. **Checker mutants** (GUARD-01, DEP-01): `guards/validator_mutants.py`, below.

## Mutants against the packet's checker (transfer to TOOLS-01)

Site: `probes/render-register.py` `validate()`, run on the candidate's own `family-notes.json`. Profile:
documentation audit. Expected result: a check that closes CLOSURE-01 or ARCH-01 without human reading would
reject each wrong draft.

| Mutant | Obligation | Observed | Disposition |
|---|---|---|---|
| M1 Recommend closure = Keep closure + review-01's exact suffix, all F-families | CLOSURE-01 | survives `validate()`; rejected only by the historical exact-suffix `template_check.py` in `round2-checks.py` | killed by the regression, for this one string only |
| M2 Same with a per-family reworded suffix | CLOSURE-01 | survives everything | closed by reading; GUARD-01 |
| M3 Reference-only closure not starting with see/use/same | CLOSURE-01 "no reference-only closure" | survives | closed by reading; GUARD-01 |
| M4 Recommend claims = Keep claims (normalized) | CLOSURE-01 claims | rejected | killed |
| M5 A-bytes marks all 20 entries `keep` | DA-3a dispositions | survives (completeness-only check) | closed by reading; GUARD-01 |
| M6 F09R tagged canonical-bytes, closure describes live core capture | ARCH-01 | survives (tag-only check) | closed by reading; GUARD-01 |
| M7 E2 tagged core-independent (true) | ARCH-01 | rejected as "contradictory selected core" | validator encodes a false rule; DEP-01 |

## Declared search (flip checklist)

| # | Dimension | Varied here | Not varied |
|---|---|---|---|
| 1 | Input dimensions and cross-products | Hop (intrinsic, global binding, Proxy-forwarded target) × all 8 bindings × frozen/unfrozen; brand (Map, Date, Uint8Array) × wrapper (none, Proxy) × contents; checker mutants M1–M7; transport-cap escape ratios (ASCII, BMP, astral, control) | Width × depth × alias × diagnostics of any implementation (none exists in this packet); eager multi-root cost beyond checking decision-05 item 5 and the CORE cap closure |
| 2 | Producers against downstream validators | Renderer → verifier, template, consistency, claims scripts; validator → data (M7); rendered drafts = register text; 59 link fragments | Identifier length and suffix growth (no identity producer in an audit) |
| 3 | Comparison structure after parsing | template_check parses 2 rows per family; `norm()` folds Unicode `\s`; consistency tagger is label-only, so content was read | Zero-width and other non-whitespace format characters in cells |
| 4 | Second-hop ambient accesses | Global bindings under frozen intrinsics (REALM-01); Proxy forwarding to an exotic target (PROXY-01) | Revoked Proxies, iterator results, species and reentrancy inside a future wrapper (no implementation); other engines |
| 5 | Complete permitted decision | CORE matrix against per-option maps and drafts for all dependents and answers; oracle mutated through M1–M7 | — |
| 6 | Hidden/visible interleaving; cross namespaces | Root consumers named in C closures (creation, authorityContext, ingress, Outcome); extra checks a–f against DA-3 items a–f | Execution interleavings (no executable change) |
| 7 | B..H, C..H, H..record; self-authorized exclusions | Both diffs; the verifier's review-01 link skip (reviewer evidence) and K1.1 sentence exception (owner-adopted) traced to their authority | — |
| 8 | Canonical owner, navigation, BASELINE, guides, ledger | Inventory covers values.md, decisions, AGENTS.md, BASELINE and the 007 rows; navigation checked separately (DEPENDENTS-01); guides describe 0.8.x and are unaffected | — |
| 9 | Transfer surviving mutants | Table above | — |
| 10 | Claim closure method | Table below | — |

## How each claim finishes

| Claim | Closes by |
|---|---|
| Identity, scope and historical immutability (DA-7) | Deterministic: verifier plus my diffs |
| Enumeration, measurements and regeneration (DA-1, DA-5) | Deterministic: `--check` regeneration |
| Per-option distinctness, renderer freshness, inventory completeness | Deterministic guard; semantic adequacy by declared reading of all 51 options (this review) |
| One core across recommendations; CORE matches owner direction | Structural: CORE matrix plus reading every recommended row; not mechanically enforced beyond the label tagger and the core tag |
| Claim inventory accuracy | Declared search: 20 entries against their B sources |
| Six checks provenance | Deterministic: byte comparison with the transcript |
| Hardening alternative's claims and closure | Declared bounded search; failed on the global-binding hop (REALM-01) |
| Interim brand refusal witness list | Declared bounded search; Proxy-forwarded witness missing (PROXY-01, owner question) |

## Root-cause note (006 stop-and-redesign fires)

This is the packet's second CHANGES REQUIRED. Its blocking finding, REALM-01, lies in the subsystem round 2
corrected for OPTION-01: the evaluation of the threat-model alternatives. The rule therefore fires. No further
patch round should start before the owner chooses below.

1. **Mechanism.** Each option's closure is written against the probe corpus that happens to exist, and the
   packet checks verify only form: options present, cells distinct, inventory complete, a core tag set. Nothing
   asks whether a closure would reject a plausible wrong implementation. When the corpus varies only the first
   hop (which intrinsic is mutated), every closure built on it shares the blind spot. The same mechanism gives:
   - REALM-01: the global-binding hop is absent from the hardening corpus;
   - PROXY-01: the Proxy-forwarding hop is absent from the brand-refusal witness list;
   - DEP-01: a form rule forces a false dependency tag and rejects the true one.
2. **Accepted design that allows it.** Under the adversarial binding (values.md "Canonical bytes that the
   environment cannot steer"; decisions 03/04 item 5, coherent-Proxy acceptance), caller code runs inside
   capture. Any mechanism replacing the serializer window must then cover every ambient read the dependency
   makes, and `values.ts:1130–1137` already enumerates them. Decision-04 item 5 also makes slot-based
   classification incomplete for Proxies (PROXY-01). The proximate seed is review-01's own probe, which named
   five first-hop mutations "the K1.1 hostile families".
3. **Why earlier passes missed it.** Review-01 varied *what* was mutated, not *how it is reached* (flip
   dimension 4). The candidate treated that probe as the corpus without reconciling it against three things:
   the Kernel's serializer audit table, the recorded K11-R5-VAL-03 counterexample, and the Node documentation it
   cites. The verifier asserts probe outcomes, not corpus coverage relative to recorded counterexamples.
4. **Options for the owner.**
   - **(a) Refined finishable claim (recommended).** Define the hardening gate's poison corpus as every recorded
     K1.1 hostile counterexample. That includes global-binding replacement for each binding in
     `values.ts:1130–1137`, tried mid-capture from a coherent Proxy trap. Either require bindings to be pinned
     or captured at load, or narrow A-hard/B-hard's V-ENV integrity. Correct `realm-hardening.md:7,15`. Add
     PROXY-01's witness with an owner-chosen expected result to C-brand/F02K. Cost: one small correction round
     in one subsystem, then a new C/H and a review of that delta plus the cumulative check.
   - **(b) Accepted, recorded limit.** The owner records that realm hardening was evaluated only against
     first-hop intrinsic mutations, with the review-02 probes as known failing cases. Owner direction a already
     counts no hardening guarantee. Cost: lowest, but the A-hard/B-hard rows keep an implied integrity claim
     unless the payload also changes. If the payload is unchanged, a reviewer can re-check H against the
     owner's recorded limit.
   - **(c) Split or remove.** Move the hardening alternatives out of the decision drafts into an
     excluded-option note carrying this evidence, since the selected direction does not depend on them. Cost:
     smallest text change; loses the comparison the owner asked for.
   - **(d) Redesign.** Not recommended: the defect is local, and every other round-1 finding is closed.

   Under any option, these become corpus items: `review-02/realm/*` (expected: any hardening claim must make
   binding replacement throw or have no effect); K11-R5-VAL-03's `getPrototypeOf`-trap witness as a hardening
   case; `review-02/brand/proxy-exotic-probe.mts` (expected: owner decision); mutants M2, M3, M5, M6 (declared
   "closed by reading") and M7 in the TOOLS-01 registry.

## Per-criterion results

| Criterion | Result | Rationale |
|---|---|---|
| DA-1 | **PASS** | Enumeration regenerates unchanged; CLASS-01 remainder is optional |
| DA-2/DA-4 (amended) | **FAIL** | 49 of 51 options have option-specific closures and claims; the template check reports False. A-hard and B-hard closures do not test the integrity their claims keep (REALM-01) |
| DA-3 (items a–f, brief-02 Q2) | **FAIL** | Items present and the joint core decision is coherent; the realm-hardening evaluation for items a/b is incomplete (REALM-01) |
| DA-3a (claim inventory) | **PASS** | Required entries present and accurate; every option maps all 20 entries with SDK compatibility and moot findings. The A-hard/B-hard V-ENV cells are corrected under REALM-01; other inconsistencies are P3 |
| DA-ARCH | **PASS** | CORE matches owner-decisions-02 §2 and maps every required dependent under every answer; open items are proposals. P3 DEP-01 |
| DA-3 (owner extras) | **PASS** | Six checks byte-identical to source; pre-approval correctly sourced |
| DA-5 | **PASS** | Quantities regenerate; span correction verified; no derivation changed |
| DA-6 | **PASS** | 23 drafts say "Not adopted"; nothing adopted or released |
| DA-7 | **PASS** | B..H and C..H scope and historical immutability verified |

## Findings

Reviewer-found in this review; no owner supplements.

| ID | Sev. | Location | Criterion / source | Counterexample and impact | Required outcome |
|---|---|---|---|---|---|
| DA01-R2-REALM-01 | P2 | `realm-hardening.md:7,15`; `register.md:22,39`; `option-claims.md` §A-hard, §B-hard (V-ENV); `family-notes.json` A-hard, B-hard; drafts A, B; `probes/round2-checks.py:27` | Brief-02 Q2 and DA01-R1-OPTION-01 (claims, finishable closure); DA-2/DA-4 (amended); 006 principle 4 | `review-02/realm/`: under `--frozen-intrinsics` all eight call-time serializer bindings stay writable, and replacing `globalThis.JSON`/`Object` steers `canonicalize@3.0.0`. This is K11-R5-VAL-03's recorded hop, and the cited Node page states the limit. A Node-flag hardening with a startup check passes the A-hard/B-hard closures while a coherent Proxy trap still steers canonical bytes; the kept V-ENV integrity is unsupported | Under the owner's choice in the root-cause note: state what the flag does not freeze; make the hardening corpus cover every recorded K1.1 hostile hop, including mid-capture binding replacement; then require pinning or capture-at-load, or narrow A-hard/B-hard V-ENV integrity; correct "passes the first" |
| DA01-R2-DEP-01 | P3 | `render-register.py:34–35`; `register.md:69,84,143,263,278,293,323,338` | DA-ARCH; prompt "no recommendation contradicts another" | One fixed dependency sentence on 8 core-independent recommendations contradicts CORE's D/E rows, owner direction e and F13R's cost cell; M7 shows the validator rejects the true tag | Tag core-independent recommendations as independent; state sequencing (after binding) separately from core dependency |
| DA01-R2-CONSIST-01 | P3 | `option-claims.md` §A-hard, §B-hard (K11C03, K14); `claim-inventory.md` ISOLATION; F02K/C-brand and F09K/A-keep methods | DA-3a; CORE matrix | (1) K11C03 is `keep` under the hardened profile, but CORE's hardened column needs the interim classification amendment, and owner direction b applies under every answer. (2) A-hard's SDK note gives K1.4 a new obligation while K14 stays `keep`. (3) Identical closure text carries "structural mechanism" in C-brand/A-keep and "declared bounded search" in F02K/F09K. (4) ISOLATION adds "bytes … are not enforcement", which AGENTS.md does not say | Align dispositions and methods with CORE and the sources |
| DA01-R2-GUARD-01 | P3 | `probes/render-register.py` `validate()` | CLOSURE-01, ARCH-01 deterministic halves | M1 (outside the one historical suffix), M2, M3, M5 and M6 survive; the report declares structure-only proof | Record the mutants in the TOOLS-01 registry with "closed by reading" status, or strengthen the guards; no change needed to close the packet |
| DA01-R2-PROXY-01 | P3 (owner question) | `register.md:54,127` closures; CORE C row | Owner direction b; decisions 03/04 item 5 | `brand/`: slot brand checks are blind through a forwarding Proxy; the current Kernel accepts `Proxy(re-prototyped Map)` as `{}`; structured clone avoids this only by refusing Proxies | Name the witness in C-brand/F02K and put the question to the owner: accept as presented under coherent-Proxy acceptance and narrow the restored O-R8-4 claim, or amend decision-04 item 5 for the interim step |
| DA01-R2-DEPENDENTS-01 | P3 | CORE amendment table; claim inventory | 006 "Maintaining the mental-model reference"; 012 finishable criteria | Not named as dependents of the binding packet: `mental-model/reference.md:134` and `rewrite-index.md`'s "in-process binding's choice" records (`:149`, `:218`, `:262–302`). Decision-05 item 3's "maintained static check fails if capture code bypasses them" is not classified as a guard for K1.1-correction-03, as amendment 03 did for DEC-8/9 | Name these dependents and propose the guard reading in the K1.1-correction-03 scope-amendment draft |

**Owner-record observation (not a candidate finding).** `owner-decisions-02.md:72` cites values.md "What these
rules do not cover" for the same-process statement. Review-01 found that the statement is not there; it is at
`values.md#in-process-value-capture` and in the fixed-limits section. The candidate correctly left the owner file
unchanged and did not repeat the citation. The owner may append a superseding note.

## Prior finding dispositions

- **Closed:**
  - P2: DA01-R1-CLOSURE-01, DA01-R1-ARCH-01, DA01-R1-CLAIMS-01, DA01-R1-AUTH-01.
  - P3: DA01-R1-SPAN-01, -SEARCH-01, -FLIP-01, -COORD-01.
- **Partly closed:** DA01-R1-OPTION-01. The remainder is DA01-R2-REALM-01.
- **Optional, declared open:** DA01-R1-CLASS-01 remainder.

## What I did not search or run

- The R8 cost corpus, N15 and eager-Outcome probes.
- The full product suite.
- SES and engines other than Node v25.2.1.
- The 278 classification summaries beyond review-01's sample.
- The full contents of `evidence-inventory.json` and `evidence-mentions.json`.
- Zero-width characters in checker normalization.
- Any future wrapper, parser or adapter, none of which exists.

## Verdict and handoff

**Recommended status transcription for 007:** **CHANGES_REQUESTED**.

> Independent review 02 (Claude Code, `claude-opus-5-5`, 2026-10-01) of H
> `4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e` over C `0ef728f0b93b7211d7c05795aa9f2cb5e7ce818e` / B
> `66bc041175e6fc191c2e7cf88de198111e7d97c9`: CHANGES REQUIRED. DA-1, DA-3a, DA-ARCH, DA-3 owner extras, DA-5,
> DA-6 and DA-7 PASS; DA-2/DA-4 (amended) and DA-3 FAIL on `DA01-R2-REALM-01` (P2). P3: `DA01-R2-DEP-01`,
> `-CONSIST-01`, `-GUARD-01`, `-PROXY-01`, `-DEPENDENTS-01`. 006 stop-and-redesign fires (second CHANGES
> REQUIRED in a corrected subsystem); the root-cause note and owner options are in the review. No correction
> round starts before the owner's choice. Both claim holds are unchanged; no successor is released.

Per the review prompt, I did not edit 007; the owner transcribes the status. No correction brief is written
because the rule fires; the root-cause note lists the corpus items any next round must carry. Evidence:
[review-02/](review-02/README.md).

CHANGES REQUIRED
