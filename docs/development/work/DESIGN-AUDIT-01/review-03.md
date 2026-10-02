# Independent review 03 — DESIGN-AUDIT-01 (correction round 3)

## Reviewer, session and access

- **Reviewer:** Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-02. I did not
  write design-03, the round-3 payload, report 03 or the 521b3c8b ledger edit.
- **Independence limits.** The implementer is a Codex session (GPT-6 per its report), a different model family.
  The same model as mine, in other sessions, wrote brief-01, review-01, brief-02, review-02, brief-03 and the
  owner-choice transcription. Brief-03 named the serializer's eight bindings and the assignment form as the corpus
  hop; finding DA01-R3-HOP-01 below concerns the scope of that same brief.
- **Access:** local clone of `ArrokothI/arrokothi` with a shell, full Git history and network fetch. Also the
  owner's local Claude Code transcripts on this machine, used only for the six-check comparison. I had no access to
  the owner–Codex conversation. The owner's approval to continue past design-03 is recorded in the 007 row at
  `521b3c8b`; I took it as recorded and could not verify it. Review 02 treated design-02's continuation the same
  way.
- **Workspace:** the packet verifier ran in two detached worktrees (C and H) in my session scratchpad, each with an
  ignored `node_modules/` that held one symlink to `canonicalize@3.0.0`. `git status --porcelain` was empty before
  and after every run. The new probes ran from the owner's main checkout at H.
- **Environment:** macOS (Darwin 25.6.0) arm64, Node v25.2.1, Python 3.13.5, git 2.39.5. The implementer reports
  Node v26.8.1; the verifier's expectations hold on both.
- **Not run:** the R8 cost corpus, N15 and eager-Outcome probes (no derivation changed), the full product suite,
  SES (not installed; no dependency added), and engines other than Node v25.2.1.

## Candidate identity (verified)

| Role | Full SHA | Check |
|---|---|---|
| Base B | `66bc041175e6fc191c2e7cf88de198111e7d97c9` | advertised `refs/heads/main`; ancestor of H |
| Payload C | `c3e9c521c5ddbe93cc09ae880063a13f4e563d83` | parent of H; child of `521b3c8b29d66c80ab3d4f26fe56f34919248ac4` |
| Candidate H | `ce0b5a7098a9f65cf16dc55ce6eb013946564508` | advertised `refs/heads/codex/design-audit-01` on both `ArrokothI/arrokothi.git` (my remote) and `ArrokothI/agent-kernel.git` (the report's remote), 2026-10-02 |
| Round-3 opening commit | `521b3c8b29d66c80ab3d4f26fe56f34919248ac4` | child of the owner-choice record `bd1f4464f6aff655d7c22479bfb8cd975ef7b158` |
| Previous reviewed H | `4c1b11e115ad61fbcfeebf83f50bb6a35478ea8e` | review 02, CHANGES REQUIRED, recorded at `ef32ba07` |

- **C..H** is exactly `implementation-03.md` (added) and `007-work-packets.md`, where only the DESIGN-AUDIT-01 row
  changed. This matches the report's allowlist; there are no raw-output attachments.
- **521b3c8b** changed only the DESIGN-AUDIT-01 row. Review 02's 689-character status text is in the row verbatim.
  The same edit dropped four round-2 links from the live row (P3 DA01-R3-LEDGER-01).
- **B..H** touches only `docs/development/work/DESIGN-AUDIT-01/` and 007. In 007, every row other than the audit row
  and the owner-adopted K1.1 hold sentence is byte-identical to B. The round-3 payload (`521b3c8b..C`) changes 42
  packet files. My own `git diff bd1f4464 H` over review-01/, review-02/, review-02.md, owner-decisions-02,
  owner-checks-02, design-01/02, implementation-01/02, invalidation-01, stop-01 and brief-01 is empty. `git diff B H
  --check` is clean.
- **Policy baseline:** B (006, 007, 008, 012 and 016 read at B).

## Coverage before verdict

My map is [review-03/coverage-map.md](review-03/coverage-map.md). I read the setup files in the order the prompt
lists them, so the map is not blind to the report. Each row closes with my own probe, mutant, diff or source trace.
The map adds three interactions the criteria do not name:
- the replacement *form* of a binding (assignment, `defineProperty`, a classic-script lexical declaration);
- the binding *set* the Kernel zone reads beyond the serializer's eight;
- each recorded *witness* inside a label, not only the label.

## Verification command, corpus and reruns

- **Packet verifier at clean C:** `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean`.
  Exit 0, PASS: 278 labels, 16 families, 23 drafts, 874 local links, 252 changed files. Corpus: 16 hostile labels,
  8 bindings, 51 option reconciliations, 4 omission controls. Round 3: 70 commands, 35 channel and 24 binding
  executions, 20 reviewer cases ([verify-at-C.txt](review-03/rerun/verify-at-C.txt)).
- **At clean H with `--C c3e9c521…`:** exit 0, PASS, 889 links, 253 files
  ([verify-at-H.txt](review-03/rerun/verify-at-H.txt)).
- **Review-02 counterexamples rerun at H.** The realm, brand and clone outputs equal review-02's recorded files,
  apart from the Node warning lines. Validator mutants: M1–M3, M5 and M6 survive, M4 is rejected, and M7 now survives,
  which is the DEP-01 fix. The anchor check finds 266 fragments and 0 bad. The six extra checks are still
  byte-identical to transcript `9d3c2edb-…` line 1409 ([rerun/](review-03/README.md)).
- **Review-01 scripts at H:** `template_check.py` reports False/False on 16 parsed families. `consistency_extract.py`
  tags every recommended row of A, B, C, F02, F09 and F10 as bytes/text.
- **No product corpus or mutation registry applies;** the packet changes no product code. My mutants against the
  round-3 checkers are listed below.

## Results by required item

### DA01-R2-REALM-01 — closed

**Every hostile label is mapped, and the reasons hold up.** I read each of the 16 source findings at its pinned
record (`9fd2faa` for K1.1, B for K1.2-correction-01) and compared the mechanism with
[hardening-corpus.json](hardening-corpus.json):
- K11-R2-VAL-02 (Proxy descriptor/read disagreement) is correctly "not addressed".
- K11-R5-VAL-03 is correctly a binding gap that the pins close.
- SELF-R7-UNSUPPORTED-01 correctly notes that ordinary `name` assignment also fails under freezing (the override
  mistake).
- The two READ-01 findings are correctly evidence gaps.
- The 12 "poison-blocked" channels install exactly the recorded mutation: Map.prototype.set, inherited indices,
  descriptor `get`, iterator `next`/`done`, Promise species, the host optional fields, Error.prototype.name, and
  resultingEpoch.

One recorded witness is missing. K11-R5-STATE-01 records two concrete paths, `Map.prototype.set` and `Object.freeze`;
the second is maintained as `dispatch.test.ts:567`. Only the first is probed. The direct form of the second
(`Object.freeze = …`) is blocked by the flag. With the hop varied (`globalThis.Object = {freeze}`), it succeeds
under the flag alone and is blocked by the A-hard pin of `Object`
([object-freeze-witness.jsonl](review-03/hop/object-freeze-witness.jsonl)). The label's "poison-blocked" therefore
under-reports, but the drafted mechanism covers it. This is P3 HOP-01(c).

**Flag-only is rejected.** The A-hard and B-hard closures (`register.md:22`, `:39`) require own globalThis bindings
pinned non-writable and non-configurable before caller code, a frozen and checked intrinsic graph, mid-capture
replacement of all eight bindings plus the getPrototypeOf witness, and a failing flag-only control. The maintained
binding cases show that flag-only replacement steers the Object, Array and JSON bytes and forces errors through
isNaN, isFinite and Set. The pinned cases throw and keep the bytes exact. Both checks run inside the verifier.

**The claims are truthful as stated.** V-ENV is kept only conditionally ("permanent protection … before caller
code"), and availability is narrowed. I varied the replacement form under the flag
([pin-forms.jsonl](review-03/hop/pin-forms.jsonl)):

| Form, mid-capture unless noted | Full pin (closure's mechanism) | Writable-only pin |
|---|---|---|
| `globalThis.X = fake` | TypeError, bytes exact | TypeError, bytes exact |
| `Object.defineProperty(globalThis, 'X', …)` | TypeError, bytes exact | succeeds, steered |
| classic script `let X = fake` (`vm.runInThisContext`) | SyntaxError, bytes exact | succeeds, steered |
| `let X = fake` before pinning (bootstrap) | steered; descriptor check passes | steered |

The mechanism the closures specify blocks every mid-capture form, so the in-scope claim holds. A writable-only slip
passes the candidate's assignment-only binding cases, but it contradicts the closure text, which a reader catches.
A lexical declaration before pinning sits inside the audit's declared limit: "clean bootstrap",
`realm-hardening.md:9,17`, and "Not searched: arbitrary bootstrap contamination" in the report. A startup check
that reads only globalThis cannot see that case. These are P3 HOP-01(a).

**The record corrections are made.** `realm-hardening.md:7` states the flag's limits, matching Node v25.2.1
`cli.md:1376–1383`, which I fetched. The "passes the first" sentence is replaced at `:9`. One extra observation: on
v25.2.1 the flag leaves the `Iterator` constructor unfrozen, although `Iterator.prototype` is frozen. Nothing in the
serializer reads it, and the closures' "freeze/check the relied-on graph" already demands a check rather than trust
in the flag ([frozen-graph.txt](review-03/hop/frozen-graph.txt)).

**Bindings outside the eight.** `Map`, `Reflect`, `Number`, `RangeError`, `Promise`, `String` and others stay
writable under the flag. The current zone captures them at load (`coordinator.ts:198–204`), and a static guard flags
post-load global reads (`ambient-reads.test.ts:259`). A-hard says "Retain … whole-decision … evidence; freezing is
not their proof", so the mechanism is retained. However, no hardening-corpus case would stop a later guard
retirement from citing frozen intrinsics for these bindings. This is P3 HOP-01(b).

### Root-cause mechanism ("closures written against the corpus at hand") — addressed, with its declared limit

[closure-corpus.json](closure-corpus.json) starts from the classified labels (record-first).
- **Deterministic half.** `corpus.py:14–35` makes each family's label set equal the `classifications.json` family,
  fixes each option's family scope and requires a response of at least 18 words. A new or dropped label fails.
- **Prose half.** The per-option responses are 18–39-word summaries that can span six families, so
  label-by-label reconciliation is by reading.
- **Mutants.** In my mutants ([round3-mutants.json](review-03/guards/round3-mutants.json)), RM4 (a hostile label
  dropped) is rejected. Four wrong drafts survive both `render-register.validate()` and `corpus.validate()`:
  - RM1: review-02's REALM-01 text restored to A-hard and B-hard;
  - RM2: all 51 responses identical;
  - RM3: K11-R5-VAL-03 relabelled "poison-blocked";
  - RM5: the A-hard closure cut to the flag plus a startup check.

  Brief-03 closes R3-REALM by reading, the report states that the guard "guards coverage, not semantic truth", and
  012 forbids requiring a sound prose analyzer. The surviving mutants are P3 GUARD-01 transfer items.
- **What is now deterministic.** Flag-only failure is encoded in executable expectations, not only in prose.
  Review-02's "probe outcomes, not corpus coverage" gap is closed at label granularity.
- **Reading.** I read the 18 options of A, B, C, F02, F09 and F10 against their families' labels and dimensions,
  including the F02 domain and limit labels, O-R8-3/4, the 16 F09 labels and the F10 cost labels. I found no omitted
  dimension. The successor port requirement is stated (`closure-corpus.md`, preamble).

### DA01-R2-PROXY-01 — closed (owner question drafted, unanswered)

The witness is named in C-brand (`register.md:54`), F02K, C-bytes and F02R. Register C's open question, CORE's
"Open PROXY-01 answer" table and the inventory cells state both answers with their claims:
- Answer 1 narrows the restored O-R8-4/V-DOMAIN claim and the proposed invalidation-01 release condition to
  non-Proxy values.
- Answer 2 needs a decision-04 item 5 amendment plus D03, V-READING, BASELINE and K11C03 changes and a separate
  refusal mechanism.

Neither answer is chosen, and invalidation-01 is untouched. The verifier asserts the current outcomes (6 brand,
3 clone). One wording issue is a P3: answer 2 says "these" or "forwarding" Proxies, but no standard predicate sees a
target's brand through a Proxy. That is review-02's own probe result, so answer 2 means refusing every Proxy, the
structured-clone policy (DA01-R3-PROXY-02).

### DA01-R2-DEP-01, -CONSIST-01, -GUARD-01, -DEPENDENTS-01

- **DEP-01: closed.**
  - `render-register.py:10,34–35` now requires canonical bytes only for A, B, C, F02, F09 and F10.
  - M7 is accepted.
  - The 16 core-independent recommendations are tagged `independent`, and the "Conditional on CORE…" sentence is gone.
  - Sequencing is stated separately: refactor after binding; TOOLS-01 first; remote transport separately gated.
- **CONSIST-01: closed.**
  - Hardened K11C03 and K14 are `narrow` and match CORE.
  - The near-identical closures share their method label (C-brand/F02K and A-keep/F09K are both declared bounded
    searches).
  - ISOLATION matches AGENTS.md.
- **GUARD-01: addressed (optional).** [review02-regressions.json](review02-regressions.json) records M1–M7 with
  dispositions and a transfer note, and does not edit TOOLS-01.
- **DEPENDENTS-01: closed (optional).** CORE's amendment table names `reference.md`, `rewrite-index.md` and the
  decision-05 item 3 guard reading.

### SELF-R3-SYMBOL-01 (implementer) — confirmed

`canonicalize@3.0.0`'s 49-line `lib/canonicalize.js` contains no `Symbol` identifier. Its `for…of` loop uses the
well-known iterator symbol directly. The product comment table (`values.ts:1137`) is therefore conservative. Keeping
the binding test is harmless, and the corpus records the observed outcome accurately.

### R3-KEEP and earlier closures — hold

- **DA-1** regenerates: 278 labels, 16 families.
- **DA-5** regenerates (`measure.py --check`).
- **DA-6:** all 23 drafts carry "Not adopted"; no option or PROXY-01 answer is chosen.
- **DA-7** scope is as verified above.
- **CLOSURE-01:** template check False/False; the most similar pair of option closures within one item scores 0.31.
- **ARCH-01:** one core across the six items.
- **CLAIMS-01:** 266 fragments, 0 bad; ISOLATION corrected.
- **AUTH-01:** byte-identical on rerun.
- Review-01's and review-02's scripts run inside the verifier with their expected results.

## New evidence against accepted work (for the owner; not a candidate finding)

The declarative-record hop also defeats the **current integrated Kernel**. This affects accepted K1.1/K1.2 claims,
not the audit's text. Every Kernel run below uses a fresh process.

- **Bytes.** `values.ts` `canonicalize` accepts a coherent Proxy whose trap runs
  `vm.runInThisContext("let JSON = …")` and returns `{"a":[999,"x"],"b":999}` for the snapshot
  `{"a":[1,"x"],"b":2}`. The `let Object` and `let Array` variants also steer the bytes. Later plain calls stay
  steered, and `globalThis` is unchanged throughout
  ([kernel-lexical-shadow.jsonl](review-03/hop/kernel-lexical-shadow.jsonl)). The serializer window restores
  globalThis properties, but identifier resolution in the dependency reaches the global declarative record first.
  Setup "succeeds", so V-ENV's refusal clause never fires.
- **Whole decision.** After the hop, `createExecution` with the same key and a different payload (`{b:7,a:[3,"x"]}`)
  is accepted as a **replay** of the first Execution. The control run refuses it as a key conflict
  ([kernel-lexical-creation.jsonl](review-03/hop/kernel-lexical-creation.jsonl)).
- **Affected accepted claims.** values.md "Canonical bytes that the environment cannot steer" (all three
  obligations), one snapshot (bytes versus retained content), creation replay/conflict, and BASELINE "ambient
  safety". Neither invalidation-01 nor invalidation-02 covers them. I found no earlier record of this hop in the
  repository or in the archive at `9fd2faa`.
- **Why the current design cannot close it.** The window installs temporary, configurable slots and restores them,
  so a lexical declaration stays legal. Under coherent-Proxy acceptance, only non-configurable bindings (the A-hard
  pin) refuse it. A pre-existing declaration defeats any check that reads globalThis.
- **Owner decision, under 006's invalidation rule.** Whether to append an invalidation notice and hold for these
  claims, and which packet carries the correction: K1.1-correction-03 (which keeps the current traversal), or the
  binding packet (the audit's selected direction narrows V-ENV to stable cooperative realms). In either direction,
  a realm or startup check (hardened or cooperative wrapper) must resolve the dependency's free identifiers through
  the global environment (for example `vm.runInThisContext(name)`) and refuse on mismatch. This strengthens the
  audit's existing thesis that each oracle covered a finite set of access forms (`register.md`, section A). It does
  not change any option's ranking.

## New counterexamples

All are reproducible from [review-03/](review-03/README.md), with commands in its README.
1. **Global declarative-record hop** (owner notice; HOP-01(a)): `hop/lexical-shadow-probe.mjs`,
   `hop/kernel-lexical-shadow.mts`, `hop/kernel-lexical-creation.mts`. Expected under any V-ENV integrity claim:
   the bytes describe the snapshot, and the conflicting retry is refused.
2. **Replacement form × pin style** (HOP-01(a)): `hop/pin-forms-probe.mjs`. Expected for a conforming hardened
   implementation: every mid-capture form throws or has no effect. A pre-existing declaration is refused at startup.
3. **K11-R5-STATE-01 `Object.freeze` witness, binding hop** (HOP-01(c)): `hop/object-freeze-witness.mjs`.
4. **Flag coverage census** (HOP-01(b) evidence): `hop/frozen-graph.mjs`.
5. **Checker mutants RM1–RM5** (GUARD-01): `guards/round3_mutants.py`.

## Mutants against the packet's checkers (transfer to TOOLS-01)

Site: `probes/render-register.py` `validate()` and `probes/corpus.py` `validate()`, run on H's own data in memory.
Profile: documentation audit.

| Mutant | Obligation | Observed | Disposition |
|---|---|---|---|
| RM1 A-hard/B-hard claims, closure, cost, inventory restored to round-2 H | R3-REALM | survives both | closed by reading; GUARD-01 |
| RM2 all 51 closure-corpus responses one generic sentence | Root-cause reconciliation | survives | closed by reading; GUARD-01 |
| RM3 K11-R5-VAL-03 reach set to "poison-blocked" | R3-CORPUS reach truth | survives | closed by reading; a cheap cross-check (a `binding-gap` reach ⇔ a frozen-unpinned replacement that succeeds) could kill it |
| RM4 a hostile label dropped | R3-CORPUS coverage | rejected | killed |
| RM5 A-hard closure reduced to flag plus startup identity check | R3-REALM | survives | closed by reading; GUARD-01 |
| Writable-only pin (probe model) | A-hard/B-hard binding cases | passes all 8 assignment cases | add `defineProperty` and declaration forms; HOP-01(a) |

Review-02's M1–M3, M5 and M6 keep their recorded dispositions; M7 is now accepted.

## Declared search (flip checklist)

| # | Dimension | Varied here | Not varied |
|---|---|---|---|
| 1 | Input dimensions and cross-products | Binding (JSON, Object, Array) × form (assign, define, declare, pre-existing) × pin (full, writable-only), under the flag; lexical hop × {unfrozen, flag, pinned}; Kernel `canonicalize` × {control, JSON, Object, Array}; creation × {control, hop}; `Object.freeze` × {first hop, binding hop} × {flag} × {pins}; 21-object and 13-binding freeze census | Declaration form for isNaN, isFinite, Set and Error (their effect is refusal or error text, not bytes); width, depth or alias of any implementation |
| 2 | Producers against downstream validators | Data → `render-register.validate`, `corpus.validate` (RM1–RM5); renderer freshness and links via the verifier | Identifier growth (no identity producer in an audit) |
| 3 | Comparison structure after parsing | Review-01 template check reused (2 rows parsed per family) | Zero-width characters in normalization (unchanged checker) |
| 4 | Second-hop ambient accesses | Global declarative record; `defineProperty`; pre-pin declaration; binding hop on a recorded witness; zone globals beyond the eight; Proxy-forwarded exotic (rerun) | Revoked Proxies and species inside a future wrapper; other realms and engines |
| 5 | Complete permitted decision | Creation return and replay/conflict for the hop; CORE hardened column against A-hard/B-hard cells | Inspection, dispatch and Outcome roots for the hop (creation suffices to show the identity break) |
| 6 | Hidden/visible interleaving; cross namespaces | — | Not varied: no executable change in the candidate; the hop probe uses one namespace |
| 7 | B..H, C..H, H..record; self-authorized exclusions | Both diffs; 521b3c8b row-only and verbatim; my own historical-path diff; the verifier's review-01 link skip (reviewer evidence) | — |
| 8 | Canonical owner, navigation, BASELINE, guides, ledger | ISOLATION against AGENTS.md; claim inventory unchanged otherwise; 007 row links (LEDGER-01); 266 fragments | Guides (unaffected 0.8.x surface) |
| 9 | Transfer surviving mutants | Table above | — |
| 10 | Claim closure method | Table below | — |

## How each claim finishes

| Claim | Closes by |
|---|---|
| Identity, scope, historical immutability (DA-7) | Deterministic: verifier plus my own diffs and `ls-remote` |
| Enumeration, measurements, regeneration (DA-1, DA-5) | Deterministic: `--check` regeneration |
| Hostile-label coverage and probe expectations (R3-CORPUS) | Deterministic: set equality plus asserted observations; reach truth by my reading of the 16 sources |
| A-hard/B-hard reject flag-only; V-ENV conditional (R3-REALM) | Structural: pin mechanism plus my form × pin probe; bootstrap is a declared limit |
| PROXY-01 drafted, unchosen (R3-PROXY) | Structural reading; deterministic current outcomes |
| Per-option reconciliation (root cause) | Declared bounded reading of the 18 A–C/F02/F09/F10 options; the guard catches only omissions |
| One core, dependency tags, inventory alignment | Structural reading plus M7 and the label tagger |
| Six-check provenance | Deterministic: byte comparison with the transcript |

## Per-criterion results

| Criterion | Result | Rationale |
|---|---|---|
| R3-CORPUS | **PASS** | 16 labels mapped with executable expectations and omission controls; the eight bindings are tried mid-capture. Witness-level and form-level gaps are P3 (HOP-01) |
| R3-REALM | **PASS** | Flag limits stated and cited; "passes the first" corrected; option (i) drawn; closures reject flag-only; claims conditional and true for every mid-capture form |
| R3-PROXY | **PASS** | Witness in C-brand/F02K; both answers with claims in register C and CORE; neither chosen; outcomes asserted |
| R3-KEEP | **PASS** | Verifier at clean C and H; review-01/02 scripts reproduce |
| DA-1 | **PASS** | Regenerates unchanged; CLASS-01 remainder optional |
| DA-2/DA-4 (amended) | **PASS** | 51 option-specific closures; A-hard/B-hard now distinguish flag-only |
| DA-3 (items a–f, brief-02 Q2) | **PASS** | Hardening evaluated against the full recorded hostile corpus and the in-scope binding hop |
| DA-3a | **PASS** | Inventory accurate; hardened cells aligned |
| DA-ARCH | **PASS** | One core; core-independent recommendations truthful |
| DA-3 (owner extras) | **PASS** | Byte-identical on rerun |
| DA-5 | **PASS** | Regenerates; no derivation changed |
| DA-6 | **PASS** | 23 drafts "Not adopted"; no PROXY-01 answer |
| DA-7 | **PASS** | Scope and historical immutability verified |

## Findings

Reviewer-found in this review; no owner supplements. None blocks.

| ID | Sev. | Location | Criterion / source | Counterexample and impact | Required outcome |
|---|---|---|---|---|---|
| DA01-R3-HOP-01 | P3 | `hardening-corpus.json` bindings and K11-R5-STATE-01 (`:14`); `probes/binding-capture.mjs`; `realm-hardening.md:17`; A-hard/B-hard closures; CORE "Stable realms" (`:72`); A-bytes/F09R "construction checks" | 006 principle 4; owner choice (a) "every recorded … counterexample"; flip dimension 4 | (a) The binding cases vary one replacement form: a writable-only pin passes them, and a pre-pin `let` defeats a globalThis-reading startup check. (b) Zone globals beyond the eight have no hardening case. (c) The `Object.freeze` witness is unprobed, and its flag-only binding hop succeeds | For TOOLS-01 or the successor corpus: add `defineProperty`, declaration and pre-pin-declaration cases, a zone-global replacement case and the `Object.freeze` witness. Record K11-R5-STATE-01's flag-only reach as a binding gap. State the pin argument: non-writable blocks `[[Set]]`; non-configurable blocks redefinition, deletion and global lexical declarations. Specify that hardened and cooperative realm checks resolve names through the global environment |
| DA01-R3-GUARD-01 | P3 | `probes/corpus.py:14–35`, `probes/render-register.py` `validate()` | R3-REALM, root-cause note | RM1, RM2, RM3 and RM5 survive; only omissions are caught deterministically, as the report declares | Register them with "closed by reading"; optionally add the reach ⇔ observation cross-check and a sentinel that the hardened closures name all eight bindings and "non-configurable" |
| DA01-R3-PROXY-02 | P3 | `register.md:54` (C-brand), CORE PROXY-01 table, drafts C/F02 | R3-PROXY | Answer 2 reads as refusing only "these" or "forwarding" Proxies; the target brand is not observable through a Proxy, so the policy is to refuse every Proxy | State that answer 2 refuses every Proxy at capture (structured-clone policy) and that every coherent-Proxy acceptance case changes |
| DA01-R3-LEDGER-01 | P3 | 007 DESIGN-AUDIT-01 row (`521b3c8b`, carried to H) | 006 records ("preserve prior review records") | The live row dropped links to brief-02, owner-decisions-02 (still in force), design-02 and owner-checks-02 (provenance correction) | Restore them in the next administrative ledger edit |

## Prior finding dispositions

- **Closed this round:** P2 DA01-R2-REALM-01; P3 DA01-R2-DEP-01, -CONSIST-01, -PROXY-01 (owner question drafted,
  not answered) and -DEPENDENTS-01. DA01-R2-GUARD-01 is addressed by recorded dispositions.
- **Closed earlier and still holding:** DA01-R1-CLOSURE-01, -ARCH-01, -CLAIMS-01, -AUTH-01, -SPAN-01, -SEARCH-01,
  -FLIP-01 and -COORD-01 ([review 02](review-02.md#prior-finding-dispositions)); DA01-R1-OPTION-01 through REALM-01.
- **Optional, declared open:** DA01-R1-CLASS-01 remainder.
- **Implementer self-finding:** SELF-R3-SYMBOL-01 confirmed.

## Verdict and handoff

006's stop-and-redesign rule does not fire: this is not a third CHANGES REQUIRED, and no earlier ACCEPT exists to
flip. **Recommended status transcription for 007:** **ACCEPTED**.

> Independent review 03 (Claude Code, `claude-opus-5-5`, 2026-10-02) of H
> `ce0b5a7098a9f65cf16dc55ce6eb013946564508` over C `c3e9c521c5ddbe93cc09ae880063a13f4e563d83` / B
> `66bc041175e6fc191c2e7cf88de198111e7d97c9`: ACCEPT. R3-CORPUS, R3-REALM, R3-PROXY, R3-KEEP and DA-1, DA-2/DA-4
> (amended), DA-3, DA-3a, DA-ARCH, DA-3 owner extras, DA-5, DA-6 and DA-7 PASS. Closes `DA01-R2-REALM-01` (P2) and
> P3 `DA01-R2-DEP-01`, `-CONSIST-01`, `-PROXY-01` (owner question drafted, unanswered) and `-DEPENDENTS-01`;
> `-GUARD-01` addressed. New non-blocking P3: `DA01-R3-HOP-01`, `-GUARD-01`, `-PROXY-02`, `-LEDGER-01`. The
> review records new evidence against accepted integrated work (V-ENV global declarative-record hop) for owner
> decision. Acceptance is exact-H only. It adopts no draft, answers no owner question, lifts neither hold
> (invalidation-01, invalidation-02) and releases no successor.

Per the review prompt I did not edit 007, merge, push or release anything; the owner transcribes the status. Next
owner actions: transcription, integration and discussion under 006, and a decision on the owner notice above.
Evidence: [review-03/](review-03/README.md).

ACCEPT
