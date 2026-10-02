# Independent review 01 — DESIGN-AUDIT-01

**Transcription provenance.** Recorded on `codex/design-audit-01` by the reviewing session itself at the owner's instruction (2026-10-01), unchanged from the delivered text except this note and one placeholder link replaced by plain text. The record names H; it does not certify its own recording commit.

## Reviewer, session and access

- **Reviewer:** Claude Code desktop session (Code tab), model `claude-opus-5-5` (Opus 5.5), 2026-10-01.
  This is the independent reviewer named in the owner's release. I did not write the brief, the
  design note, the stop record, the invalidation draft, the audit payload or the report. The
  implementer is a Codex session (GPT-6 per its report): a different model family.
- **Access:** a local clone of `ArrokothI/arrokothi` (`origin https://github.com/ArrokothI/arrokothi.git`)
  with a shell, full Git history and network fetch. I reviewed in two detached worktrees in my session
  scratchpad, one at H and one at the archive commit. The main checkout was not edited.
- **Environment:** macOS (Darwin 25.6.0) arm64, Node v25.2.1, Python 3.13.5, git 2.39.5,
  `canonicalize@3.0.0`. The implementer used Node v26.8.1 and Python 3.13.7.
- **Limits:** I have no access to the owner–implementer chat. I therefore cannot check the quoted
  owner messages against their originals; I checked them for internal consistency and against what
  the candidate did. I did not use the owner-held archive tarball; the archive commit
  `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49` is in Git history and is what the brief pins. I did not
  rerun the 63-run R8 cost corpus or the eager-Outcome probes (see DA-5).

## Candidate identity (verified)

| Role | Full SHA | Check |
|---|---|---|
| Base B | `66bc041175e6fc191c2e7cf88de198111e7d97c9` | commit; advertised `refs/heads/main`; ancestor of H |
| Payload C | `ce3ec854ff126498e0b807ba97626d12015572c7` | commit; parent of H |
| Candidate H | `7ebf80d461c439459d0c8010c04c9fb197281a59` | commit; advertised `refs/heads/codex/design-audit-01` |
| Archive | `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49` | commit; ancestor of B |

B..H has five commits: owner release recording (`01a888cf`), stop and invalidation draft (`b2e42797`),
owner adoption recording (`e69b0989`), payload C and report H. Governing policy baseline is B
(006, 007, 008, 009 Prompt B, 012, 016 read at B). The brief is unchanged since B.

## Coverage before reading the report

From brief-01 I wrote a coverage map before reading `implementation-01.md`
([review-01/coverage-map.md](review-01/coverage-map.md)). It adds two interactions the criteria
table does not name: whether options across items (a)–(f) describe one coherent architecture, and
whether each option's closure tests the mechanism that option proposes. Reconciling with the report:
the report's own DA-4 row checks options "structurally"; the verifier implements this as "every row
has a nonempty last column" (`probes/verify.py:33–40`). That check cannot distinguish a closure
written for the option from one copied from another option. This gap produced the main finding.

## Verification command, corpus and reruns

- **Verification command** at H on a clean tree:
  `python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean --C ce3ec854ff126498e0b807ba97626d12015572c7`
  → exit 0, PASS, 146 changed tracked files, 278 labels, 16 families, 22 drafts, 130 local links
  ([verify-at-H.txt](review-01/verify-at-H.txt)). This regenerates `enumerate.py`, `catalog.py`,
  `records.py` and `measure.py` outputs and checks byte equality, so DA-1/DA-5 regeneration is
  reproduced. `git diff B H --check` exits 0.
- **Reruns** (outputs in `review-01/probes-rerun/`):
  - `reverify-exotics.py`, `exotic-consumers.mts`, `source-map.py`: identical to the sealed outputs
    except the Node version line.
  - `review08.py n15`: control 1,720/1,720 and N15 mutant 1,720/1,720 (mutant survives); impact
    controls complete (112 ms, 137 ms); both impact mutants hit the 30 s timeout. Same dispositions as
    sealed. Review 08 itself measured 138,445 ms for the 4,096 mutant, consistent with a censored
    30 s run.
  - `review08.py enumeration`: same success/RangeError outcomes for all seven own-key shapes;
    timings and RSS differ by machine (16,777,216-entry typed array: 4,097 ms / +467 MiB here,
    2,177 ms / +1,283 MiB sealed).
  - `mechanism-cost.py`: same ordering (window removal dominates: 101.9 → 24.8 ms per 2,000 calls).
  - Rewritten packet outputs were restored with `git checkout`; the worktree is clean.
- **No maintained mutation registry or product corpus applies**: this packet changes no product code.

## Coverage results by requested item

### 1. DA-7 scope and owner authority

- `git diff --name-status B H` touches only `docs/development/work/DESIGN-AUDIT-01/` and
  `docs/development/007-work-packets.md`. No product code, test, Layer-3 page, BASELINE, guide or
  006/009/012 file changes.
- 007 changes are exactly two rows: the DESIGN-AUDIT-01 row and one appended sentence in the K1.1
  row ("**2026-10-01:** the re-prototyped-exotic classification claim is held by owner-adopted
  DESIGN-AUDIT-01 invalidation-01 (linked); historical acceptance and integration are retained.").
  It is one sentence and the rest of the K1.1 row is byte-identical.
- `git diff --name-status C H` touches only `implementation-01.md`, `validation-01.txt` and 007.
  `validation-01.txt` is output-only.
- Adoption record: the diff between the draft (`b2e42797:…/decision-drafts/invalidation-01.md`) and
  the operative notice changes only the banner, the owner quote, tense and relative links; the
  decision, evidence, mechanism table and alternatives are the text the owner adopted. Every
  instruction in the quote is carried out: file moved, banner replaced, one K1.1 sentence, stop-01 and
  the audit row updated, O-R8-4 treated as a full item with brand refusal, structural projection and
  bytes intake compared, packet ownership stated. No BASELINE, Layer-3, 006, 009 or 012 edit.
- Two authority references are not backed by recorded text: the quote's "my six extra checks" are
  never enumerated in the packet, yet the report says "owner extras are evaluated"
  (`implementation-01.md:35`); and "design-check continuation pre-approved by the owner" (007 row,
  `design-01.md:5`) is outside the verbatim release quote. See **DA01-R1-AUTH-01**.

### 2. DA-1 completeness and classification

Independent searches, all at the pinned revisions (scripts in `review-01/da1/`):

- File universe: `universe.py` lists every file under the DA-1 packet directories (archive K0.x,
  K1.0*, K1.1*; B K1.1-correction-02, K1.2, K1.2-correction-01). `enumerate.py` reads 145 Markdown
  records whose path components start with `review`, `cleanup`, `handoff` or `owner-note`; 1,714 other
  files are not read (220 Markdown, 663 txt, 487 log, 217 json, 84 scripts, 43 digests, archives
  and diffs), including all 8 files of K0.1-process-review.
- Grammar-independent token search (`broad_ids.py`, regex
  `(?<![\w.\-/#])([A-Z][A-Za-z0-9.]*(?:-[A-Za-z0-9]+)*-\d+[a-z]?)(?![\w\-])` over every text file in
  scope): 792 distinct tokens, 530 outside the audit's label set. I inspected every shape. They are
  criteria and worksheet IDs (W-n, B-n, E-n, OA-n, CX-n, PC-n, ID-n, LP-n, MIG-n, LEG-n, EF-n, CL-n,
  DX-n, KC2-n, DEC-n), decision IDs (KC1-ARCH-1), shorthand for classified findings (`ID-03`,
  `R10-01`, `R13-01`), implementer self-findings that appear only in implementation reports
  (K0.2-SELF-02…16, K1.0-SELF-n, K11-R2/R3-SELF-n, SELF-ID-01, SELF-R9-CATALOG-01, K01-I11-01),
  benchmark E0 labels in logs, and the K0.1-process-review `PRC-*` findings.
- The audit's own regex over all files in scope (`grammar_outside_sources.py`) finds 54 additional
  IDs, all implementer self-findings or test-name labels outside review records.
- Unprefixed findings (`severity_lines.py`: lines carrying P0–P3 without an audit-grammar ID in
  review-like records): every blocking item maps to an audit ID; the remainder are probe names
  (R-P1…), worksheet citations and **unlabeled P3 observations** (K0.2 review-11 ×2, review-12 ×1,
  review-13 supplementary items; K1.0 review-12 ×1; K1.2 review-05-merged ×5, review-12 ×1).
  Labeled observations are counted (27); unlabeled ones are not, and
  `enumeration-notes.md:13` says such items "remain observations in the register/evidence catalog",
  which they do not.
- ID reuse (`redefinitions.py`): IDs with definition-shaped headings in more than one file are
  dispositions in the next round or the disclosed filename/round offsets (K12-R13-* defined in
  `review-12.md`, K10-R14-01 in `review-15.md`, K11-R15→R16 rekeying). No undisclosed reuse.
- Blockers 01/02 (K1.2 and correction-01) carry counterexamples but no finding IDs; their exclusion is
  consistent with "finding IDs".
- `K0.1-process-review` (one review, `PRC-6-01` P2, `PRC-7-01` P1, `PRC-7-02` P2, `PRC-7a`) is
  excluded by `enumerate.py:16` without a declaration in the design note, notes or table. It is a
  process packet, so exclusion is defensible, but it must be declared.

Exact shell greps I also ran: `git grep -n -i -E "class instances?|typed arrays?|byte arrays?|\bMaps?\b.*\bDates?\b|Dates?, |non-plain|exotic|re-?prototyp" 66bc041 -- mental-model docs/development/*.md packages/kernel/src packages/sdk/README.md AGENTS.md ':!docs/development/work'`;
`git grep -n -E "@arrokothi/kernel|packages/kernel|from ['\"].*kernel/src" 66bc041 -- ':!packages/kernel' ':!docs' ':!mental-model'`;
`grep -n -E "^#+ |KC2-R" K1.1-correction-02/review-0*.md`; `grep -n "ID-03" K1.1/review-04.md`;
`grep -n "a537578" K1.1-reference-01/*.md`.

**Classification.** I sampled 47 classifications across all nine packets
([classification-sample.md](review-01/da1/classification-sample.md)): 38 agree, 3 partial, 6
challenged. Challenges: `K11-R1-VAL-01` (own `__proto__` fidelity, F09 → F02),
`K11-R1-SCOPE-01` (implementation accepted K1.3 cancellation; records/F07 → design), `K11-R16-DISP-01`
(Promise species hook; F13 → F09 mechanism), `K12-R1-DELIVERY-01` (retained attribution; F13 → F12),
`O-R8-3` (own-key enumeration cost; F02 → F10), `SELF-R8-REFUSAL-01` (fault atomicity of the refusal
record; F09 → F12/F16). Structurally, the triple (family, subsystem, category) takes exactly 16 values
across 278 labels: subsystem and category are functions of family, contrary to
`enumeration-notes.md:5`.

**Regrouping and DA-2's threshold.** The threshold (≥3 findings or ≥2 origin rounds) is low enough
that qualification is insensitive to plausible regroupings, and every non-alias label is already in a
qualifying family, so no unselected qualifying family is hiding. One family is not robust: F13's three
members have three different mechanisms. Moving `K11-R4-DISPATCH-01` and `K11-R16-DISP-01` to F09 and
`K12-R1-DELIVERY-01` to F12 dissolves F13. No other qualifying family drops below the threshold.

### 3. DA-2 and DA-4 substance (F01–F16)

`template_check.py` ([output](review-01/da2/template-check.json)) parses each family's two option rows:
**in all 16 families the Recommend closure equals the Keep closure plus the fixed suffix "; if
refactored, differential preservation of the accepted corpus and explicit ownership/bypass check",
and the "Affected claims" cell is identical for both options.** The source is the data model:
`family-notes.json` stores one claims string and one closure string per family; no checked-in script
renders it, so the register's family sections came from an uncommitted renderer that appended the
suffix. The verifier checks only that a closure cell is nonempty.

Per family, against the four tests requested (specific cause with real sites and rule links; specific
reason found one at a time; two options with distinct costs and benefits; a finishable,
option-specific closure for each option):

| Family | Cause + sites + rule links | Why one at a time | Distinct options | Option-specific finishable closures | Fails |
|---|---|---|---|---|---|
| F01 | cause yes; sites vague (worksheet records, lifecycle.ts); rule owners as code-path text, not links | yes | yes | no: the transition-model option is never checked to exist or to derive the examples | closure |
| F02 | yes (`values.ts captureObject/…`) | yes | partly: "keep" is brand refusal | no: both rows "Use C closure criteria", ambiguous between C's options | closure, claims |
| F03 | yes | yes | yes | no: centralized constructors not checked (only the suffix) | closure |
| F04 | no code site (inventory records) | yes | yes | no: generated reachability facts not checked | closure |
| F05 | sites vague (no file paths) | yes | yes | no | sites, closure |
| F06 | yes (inventory-oracle.ts, module-graph.ts, boundary-policy.ts) | yes | yes | no: the **keep** closure includes "rendered table reproduces source", which exists only in the recommended design | closure |
| F07 | process records (acceptable) | yes | yes | no: the suffix is meaningless for records tooling; "generated manifest exactly replays" (item F) is missing | closure |
| F08 | process records (acceptable) | yes | yes | no: same | closure |
| F09 | yes | yes | yes | no: both "Use A/B profile closure", ambiguous across A's and B's options | closure, claims |
| F10 | yes | yes | no: the recommendation is a disjunction of two options ("parser **or** simpler cooperative traversal") | no: meter-deletion mutants (surplus/list/stack) cannot apply to a parser | options, closure, claims |
| F11 | yes | yes | yes | partly: the suffix fits a refactor but does not state the ownership check (D's closure does) | closure |
| F12 | yes | yes | yes | partly: same as F11 | closure |
| F13 | yes | yes | yes | no: authenticated transport not checked | closure, claims, grouping |
| F14 | sites vague | yes | yes | no: a registry check (as in E) is missing | sites, closure |
| F15 | yes | yes | yes | no: the **keep** closure ("restricted boundaries reject…") belongs to the recommended design | closure |
| F16 | yes | yes | yes | no | closure |

All 16 families fail the option-specific closure test; F02, F09, F10 and F13 also fail "the accepted
claims it affects", because their recommended options change accepted claims that their keep options
do not. Items A–F do have option-specific closures, with one exception noted under item 4. See
**DA01-R1-CLOSURE-01**.

### 4. Internal consistency of A, C, F02, F09, F10 (and B)

`consistency_extract.py` ([output](review-01/da3/consistency-extract.txt)) prints the rows side by side.
They do not describe one architecture:

| Recommendation | Where live objects are captured | Where O-R8-4 refusal and decision-05's meter live |
|---|---|---|
| A (`register.md:20`): cooperative object binding as the convenience API, plus an isolated bytes boundary for hostile callers | Inside the Kernel; hostile callers use bytes from an isolated process | Kernel capture |
| B (`register.md:34`): simplify internal traversal under A's cooperative profile; B's bytes-adapter option (`:35`) is **not** recommended | Inside the Kernel | Kernel capture |
| F09 (`register.md:202`) | Inside the Kernel (same as A) | Kernel capture |
| C (`register.md:48`): bytes/text core plus a cooperative wrapper outside the Kernel contract | Only in a wrapper; the core never sees live objects. This is A's non-recommended option 3 (`:21`) and B's non-recommended option 3 | Wrapper refusal; meter targets a parser or the wrapper |
| F02 (`register.md:111`) | Same as C | Same as C |
| F10 (`register.md:215`) | Both ("parser **or** cooperative traversal") | Either |

Specific contradictions:

1. C's own brand-refusal row says "**If A keeps objects and scope remains the listed brands, amend
   K1.1-correction-03**" (`register.md:46`). A's recommendation keeps objects, so under A's
   recommendation C's rule selects brand refusal in K1.1-correction-03, while C recommends a separate
   bytes-core packet. Adopting drafts A and C together gives two different owners for O-R8-4.
2. F02 and F09 recommend the two incompatible cores.
3. A's recommended closure (`register.md:20`) checks the cooperative profile only; nothing in it
   checks the "isolated bytes boundary for hostile callers" half of the same recommendation (no parser
   bound, framing, or isolation evidence; those criteria sit in A's non-recommended option 3).
4. Register D says to refactor "only if the owner releases it after choosing A" (`register.md:61`);
   draft D proposes the refactor without that condition.

**What the owner would have to decide:** whether the Kernel's core contract accepts live objects
(cooperative capture inside the Kernel, with the meter and brand refusal there) or only inert bytes/text
(capture, brand refusal and any capture discipline in a wrapper outside the Kernel contract). That one
choice then fixes which packet owns O-R8-4 (K1.1-correction-03 by amendment, or a separate binding
packet), what decision-05's meter measures, and whether values.md's in-process binding obligations
remain Kernel obligations. The register should present this as one joint decision with the dependent
items mapped under each answer. See **DA01-R1-ARCH-01**.

### 5. Threat-model accuracy and affected claims

Correct: the register's statements of AGENTS.md's Trusted/Isolated distinction; that bytes in the same
realm are not isolation; decision-05's metered meaning, its budget, and that it stays in force until
amended; DEC-8 and DEC-9 as stated in BASELINE; the SDK statement. I verified "no supported SDK
consumer uses the target Kernel" independently: BASELINE (`002:31–32`) says so, `@arrokothi/kernel` is
`"private": true`, and a repository-wide `git grep` outside `packages/kernel`, `docs` and `mental-model`
finds only manifests and architecture-conformance tests.

Not listed, or wrongly cited ([claims-coverage.txt](review-01/da3/claims-coverage.txt)):

- **K1.2 decisions 03 and 04 are never cited.** Both item 5s are standing owner decisions: "Do not
  reject or detect-and-refuse Proxies, change coherent-Proxy acceptance, reuse observations, or move
  capture out of process." A's recommendation amends coherent-Proxy acceptance; A's option 3, B's
  option 3 and C's recommendation move capture out of the Kernel. Decision-05 item 7 repeats that such
  changes need the owner.
- **C's recommendation names no changed claim except the API**: it drops coherent-Proxy acceptance,
  single observation and values.md's in-process obligations from the Kernel core ("One snapshot", "One
  reading or none", "Canonical bytes that the environment cannot steer") without naming them.
- **The cooperative option narrows a Trusted-Execution guarantee without naming it.** AGENTS.md says
  that under Trusted Execution "Kernel guarantees apply to Kernel-mediated paths". Under a cooperative
  profile those guarantees (exact bytes, identity, replay) hold only if no code in the process modifies
  intrinsics, including a Trusted Runtime or an ordinary library polyfill. The closure asks to
  "declare stable-realm assumptions", but the claims cell says only "Trusted mode remains ambient".
  BASELINE's "coherent-Proxy acceptance, ambient safety and DEC-7 weights remain unchanged"
  (`002:64–65`) and values.md's three serializer obligations are not cited by name.
- **Amendment 03 item 4 is not named.** It defers "structural enforcement 'by construction'"
  (null-prototype Kernel records; accepted state writable only through one commit function) to this
  audit's decisions. D's owned-apply recommendation and F15's restricted interfaces are the substantive
  answer, but neither says so, and null-prototype records are not discussed, so the owner cannot see
  that the deferred decision has been prepared. Amendment 03 items 2–3 (runtime sweeps as DEC-8/9
  acceptance evidence) are what A's "simplify poison sweeps" would change; that is named only loosely.
- **Per-option SDK compatibility** is stated only for the bytes option; **K1.4**, which BASELINE names as
  owner of the SDK bridge, is not mentioned as a dependent of any binding change. **K1.1 findings that
  become moot** are given as one global list, not per option (brief (a) asks for both per option).
- **Wrong citation:** the register's central threat-model sentence (`register.md:11`) cites
  `values.md#what-these-rules-do-not-cover` for "these rules do not contain same-process code". That
  section covers sets, meaning, progress, transport and authority. The statement is at `values.md:290`
  (in-process value capture) and `values.md:202` (fixed semantic limits).

See **DA01-R1-CLAIMS-01**.

**Missing option.** No option hardens the shared realm itself, for example Node's built-in
`--frozen-intrinsics` or Hardened JavaScript (SES) `lockdown()`. Reviewer probes
([a-missing-option/](review-01/a-missing-option/)): under `node --frozen-intrinsics`, installing
`Object.prototype.toJSON`, an `Array.prototype[0]` accessor, an Array-iterator `next`, a replacement
`Object.keys` and a `Promise[Symbol.species]` getter all throw `TypeError`, which are the K1.1 hostile
families, while `new Proxy` still works. The unfrozen control crashes Node itself after the
`Array.prototype[0]` getter. And **the current Kernel refuses every value in such a realm**: `canonicalize`
of a plain object returns `unstable_representation` under `--frozen-intrinsics` and succeeds without it,
because the serializer window cannot install its shadows. That behavior is consistent with values.md
("If the binding cannot establish the environment the call needs, it refuses the value"), so it is not
a new claim contradiction and no stop condition fires. But it is an unstated property of the "keep"
option, and realm hardening is an option with distinct costs (experimental Node flag or a third-party
dependency needing license review under AGENTS.md; library compatibility; not containment, no CPU
bound, no effect on Proxies or getters) and a finishable closure (a deterministic start-up check that
the intrinsics the Kernel relies on are frozen). I am not recommending it; it is missing from the
comparison. See **DA01-R1-OPTION-01**.

### 6. DA-5 quantities

- **1.534×** = median `R-foreign-deep` 2,801 ms ÷ median of the slowest sampled acceptance
  `A-chain-W22-L8` 1,826 ms (`measure.py`, from sealed `cost-*.json`, three fresh processes per shape).
  Derivation correct; the register frames it as a corpus- and engine-specific observation.
- **N15:** survival from `n15-suite.json` stdout (1,720/1,720 both runs); impact controls exit 0;
  mutants `timed_out: true` at 30 s. Reproduced (above). Correctly reported as censored, not a kill.
- **Line census:** reproduced by `measure.py --check`. 432 production lines = `values.ts:1008–1409`
  (doc comment, `toSerializationSafe`, serializer slots and window; defensible as hostile/ambient-only)
  + `own-array.ts:169–193` + `:241–245`. 3,596 test lines = five whole hostile test files (1,258) plus 22
  manually attributed spans (2,338). 5,696 = whole-file test infrastructure only; the 1,217 mixed
  production lines are separately listed.
- **Exclusive spans sampled** (`span_audit.py`): 75 test blocks; nearly all install pollution, traps or
  species hooks. But at least four spans test **own-envelope or own-metadata reads**, which A's
  recommendation says it retains ("Retain own-envelope reads"): `dispatch.test.ts:1525–1558`
  (describe "K11-R16-ID-01 (R3) ambient prototype state cannot answer a missing bound"),
  `creation.test.ts:992–1056`, `aggregate-refusal.test.ts:185–193` and
  `value-refusal-cost.test.ts:120–138`, 127 lines in total. `K11-R16-ID-01` and `K11-R4-DISPATCH-01`
  are classified `hostile_only: false`, yet their tests are counted as exclusive hostile lines. The
  "floor" is therefore overstated by at least 127 lines (about 3.5%). See **DA01-R1-SPAN-01** (P3).
- Other numbers (2,471 coordinator lines; 11/16 hostile labels; 145/278 labels; 208/82/29/97 catalog
  rows; 1,333 locators; 13/12 flip rows) regenerate exactly through the verifier.

### 7. Verdict flips

016 counts four flips: K1.2 reviews 13→14 (`c36cbe0`), correction-01 reviews 03→04 (`312f258`), and
the drafts before reviews 06 (`d5ffd35`) and 08 (`9248e56`). All four are in `verdict-flips.md`. The
audit's 13 rows / 12 distinct H add six recorded or merged same-H reversals from earlier packets (K1.0
`0a9333f`; K1.1 `a047283`, `d93d7d2` ×2 rows; K1.1-correction-01 `b883f29`; K1.1-reference-01
`d4bd49f`) plus K1.2 `ad4a0e8` (review-08-merged: the earlier ChatGPT ACCEPT of H8 superseded by the
Arena finding), and two cleanup reopenings (K1.0 `f3aa29d`, K1.0-correction-01 `1295c68`).

My independent pairing (`flip_scan.py`, then manual reading of every ACCEPT record's candidate SHA)
finds no missed same-H reversal and no double count: `d93d7d2` appears in two rows (reviews 15 and 16)
and once in the unique count. K1.1-correction-01 H4 `d696711` (review 06 CHANGES REQUIRED, then review
07 ACCEPT) is correctly excluded as reverse chronology; K1.1-reference-01 H3 `a537578` (review 04
ACCEPT) continued under an owner scope amendment, not a defect.

The definitions differ: 016 counts K1.2-era recorded or disclosed ACCEPT→defect events; the audit
counts every DA-1 packet and adds cleanup reopenings. Two gaps: `verdict-flips.md` never reconciles
with 016's "four" (and 016 itself omits the K1.2 H8 reversal), and two reversals by **invalidation of
accepted work** are neither counted nor excluded with a reason: K1.2 invalidation-02 (V-D1 claim of
K1.1-correction-02, accepted at `719abbf`) and this packet's own invalidation-01 (classification claim of
K1.1, accepted at `52b1600`). They are not same-candidate review flips under 006, but the table already
includes cleanup reopenings, so the exclusion must be declared. See **DA01-R1-FLIP-01** (P3).

### 8. O-R8-4

- **Claim search.** `probes/searches.py` greps `re-prototyp|exotic|Maps|Dates|typed arrays|ArrayBuffer|unsupported_form`
  case-insensitively. It cannot match singular "typed array", "Map", "Date", "byte array" or "class
  instance", and "Dates" matches "validates". My broader search over BASELINE, `docs/guides`, package
  READMEs and the development front door
  (`plain[- ]object|plain data|prototype|class instance|byte array|typed array|Uint8Array|ArrayBuffer|\bMaps?\b|\bDates?\b|\bSets?\b|built-?in|exotic|re-?prototyp|coerc|unsupported[_ ]form|silently (drop|discard)|refuse…`)
  also finds **no BASELINE or guide sentence asserting refusal of re-prototyped built-ins**. The
  conclusion holds; the declared pattern was not sufficient on its own. Outside the owner's
  BASELINE/guide scope, the live source comment `values.ts:36–42` says capture refuses normalization of
  "an exotic representation… into a plain snapshot". It is contradicted by the held behavior and is the
  same kind of stale live comment as `K12C1-R9-CLAIM-01`; it should be listed. See **DA01-R1-SEARCH-01**.
- **Consumer trace.** The Kernel calls `canonicalize` at four sites: `coordinator.ts:724` (initial input
  and ingress payloads), `:793` (authority context), `outcome.ts:196` via `acceptRoot` (progress, Emission
  value, result, error, and recovery text lists at `:524`), and `envelope.ts:191` (identity text, guarded
  by `typeof === "string"`). The probe covers all seven general roots, and the notice separately traces
  recovery lists and identity text. Different hidden Map contents replay as the same value at every
  root (reproduced). `authorityContext` is retained, compared and passed to the Runtime as
  `executionView` (`coordinator.ts:1272`) but feeds no Kernel authorization decision, so **"no authority
  bypass is established" is correct**. A Runtime that bases its own decisions on that context receives
  `{}`, which is data loss on the Runtime side, not a Kernel grant bypass.
- **Compatibility search** (`searches.py`) names `packages/runtime-integrations`, which does not exist,
  and omits `packages/core`, `interoperability`, `models` and `retrieval`. My repository-wide search
  confirms the conclusion. Folded into DA01-R1-SEARCH-01.

### 9. DA-6

All 22 drafts (A–F, F01–F16) say "Not adopted", carry a recommendation and at least one alternative,
and none asserts adoption or releases a packet. Structurally DA-6 holds. Its content inherits
DA01-R1-ARCH-01 (drafts A, C, F02, F09, F10 cannot be adopted together) and DA01-R1-CLOSURE-01.

### Additional observations

- Item D answers the brief's question (does `coordinator.ts` scale to waits, Effects and persistence?)
  only generically ("every new control still repeats ordering/evidence obligations"). It does not
  consider, for example, that K3 persistence makes the one synchronous apply path asynchronous or
  durable. See **DA01-R1-COORD-01** (P3).
- The evidence catalog's declared scope is K1.1 onward. One K0.1 script
  (`K0.1/evidence/round-3/link-anchor-audit.py`) and K0.x/K1.0 inline fences therefore have no TOOLS-01
  disposition, while F05/F06 recommend corpus coverage for those families. This is noted only; brief (e)
  asked about K1.2-correction-01's infrastructure.

## Findings

Reviewer-found in this review; no owner supplements.

| ID | Sev. | Location | Criterion / source | Counterexample and impact | Required outcome |
|---|---|---|---|---|---|
| DA01-R1-CLOSURE-01 | P2 | `register.md` F01–F16 option tables; `family-notes.json`; `decision-drafts/F01–F16.md`; `probes/verify.py:33–40` | DA-4; DA-2 "each with … the accepted claims it affects"; 006 principle 3 | `da2/template_check.py`: all 16 Recommend closures = Keep closure + one fixed suffix; claims identical. F10's parser option is "closed" by meter-deletion mutants; F02 and F09 defer to ambiguous parent closures; F06 and F15 Keep closures contain recommended-only checks. A follow-up packet released from these drafts would inherit criteria that do not test its mechanism. | Each option of each qualifying family states its own finishable closure (check, mechanism or declared search) and its own affected-claims list. A deterministic check rejects identical closure or claims cells between options and a closure that merely references another item. `template_check.py` becomes a regression. |
| DA01-R1-ARCH-01 | P2 | `register.md:20,21,34,35,46,48,61,111,202,215`; drafts A, B, C, D, F02, F09, F10 | DA-3 (items a, b, c); DA-4 (A's closure); 006 principle 2 (ask early) | `da3/consistency_extract.py`: A/B/F09 recommend live-object capture in the core; C/F02 recommend a bytes/text core (A's and B's non-recommended option 3); F10 recommends both; C's conditional selects K1.1-correction-03 under A's recommendation while C recommends a separate packet; A's closure omits the isolated-bytes half. | Present the joint choice (does the Kernel core accept live objects?) as one owner decision draft, with A, B, C, D, E, F02, F09, F10 and K1.1-correction-03 scope mapped under each answer; make every individual recommendation consistent with the draft's recommended answer, or state the dependency explicitly. |
| DA01-R1-CLAIMS-01 | P2 | `register.md` A (`:11–23`), C (`:39–50`); drafts A, C | DA-2; DA-3 (a) "for each option … claims that would change; K1.1 findings moot; SDK compatibility" | `da3/claims-coverage.txt`: decisions 03/04 (item 5) and amendment 03 item 4 never cited; C's recommendation drops coherent-Proxy acceptance, single observation and values.md in-process obligations unnamed; the cooperative option narrows AGENTS.md's Trusted-Execution "Kernel-mediated paths" guarantee to stable realms unnamed; BASELINE `002:64–65` not cited; K1.4 not named; SDK compatibility and moot K1.1 findings not per option; the central values.md citation points at a section that does not contain the statement. | For every option of A, B, C and F02/F09/F10, an affected-claims list drawn from a declared inventory (values.md in-process capture and fixed-limits sections, decisions 03/04/05, DEC-8/9 and K1.2-correction-01 amendments 02/03 including item 4's deferral, AGENTS.md Trusted/Isolated, BASELINE value section, 007 K1.1-correction-03 and K1.4 rows), each marked keep / narrow / remove; per-option SDK compatibility and moot K1.1 findings; corrected citation. |
| DA01-R1-OPTION-01 | P2 | `register.md` A and B option tables | DA-2 "at least two options"; DA-3 (a), (b); prompt "a missing option is a defect" | `a-missing-option/`: under `--frozen-intrinsics` the K1.1 hostile mutations throw while Proxies remain; the current Kernel refuses every value in that realm. Realm hardening is neither compared nor ruled out, and the keep option's incompatibility with it is unstated. | Evaluate realm hardening (Node frozen intrinsics, SES lockdown, or a reasoned exclusion) as an option for A/B with cost, benefit, affected claims (including the refuse-everything behavior of the current window), third-party/licensing implications, and a finishable closure. No recommendation is required. |
| DA01-R1-AUTH-01 | P2 | `invalidation-01.md:34`; `implementation-01.md:35`; 007 DESIGN-AUDIT-01 row; `design-01.md:5` | DA-3 scope as amended by the owner; 008 ("never fabricate … say unknown"); 006 authority and records | The owner's operative instruction includes "my six extra checks"; the packet never lists them, yet the report claims "owner extras are evaluated". The design-check pre-approval is asserted outside the verbatim release quote. Neither can be verified by a reviewer. | Record the six checks verbatim with their owner provenance and map each to evidence (or say they are unavailable and ask the owner). Quote or source the design-check pre-approval, or mark it unsourced. |
| DA01-R1-CLASS-01 | P3 | `classifications.json`; `enumeration-notes.md:5,13`; `enumerate.py:16` | DA-1 | 6 challenged classifications; family/subsystem/category bijection contradicts the "independent labels" note; F13 not robust; K0.1-process-review exclusion undeclared; unlabeled P3 observations not enumerated although the notes say they are kept. | Correct the note or make subsystem and category independent; reconsider the six; declare the exclusions. Optional unless the owner wants the counts for 016's baseline. |
| DA01-R1-SPAN-01 | P3 | `hostile-test-spans.json`; `measurements.md` | DA-5 | 127 "exclusive hostile" test lines test own-envelope/metadata reads that A's recommendation retains; hostile flags inconsistent with spans. | Move these spans to mixed, or justify; align `hostile_only` with span attribution. |
| DA01-R1-SEARCH-01 | P3 | `probes/searches.py`; `claim-search.txt`; `compatibility-search.txt` | DA-5; owner instruction on BASELINE/guide sentences | Declared patterns and paths could not establish the conclusions on their own (missing forms; nonexistent path; four packages omitted); `values.ts:36–42` not listed. Conclusions confirmed by the reviewer's searches. | Widen the declared searches to match their claims; list the live source comment as a dependent description under the hold. |
| DA01-R1-FLIP-01 | P3 | `verdict-flips.md` | Brief item (f); 016 baseline | No reconciliation with 016's four (016 omits K1.2 `ad4a0e8`); invalidation-based reversals (`719abbf`, `52b1600`) neither counted nor excluded. | State the definition difference and reconcile with 016; declare the invalidation category. |
| DA01-R1-COORD-01 | P3 | `register.md:52–61`; draft D | DA-3 (d) | Scaling to K1.3/K2/K3 asserted generically; register and draft disagree on the "after choosing A" condition. | Name concretely what waits, Effects and persistence add to the plan/apply split, or state that this needs owner input; align register and draft. |

## Per-criterion results

| Criterion | Result | Rationale |
|---|---|---|
| DA-1 | **PASS** | Enumeration is deterministic and reproduces at H. My grammar-independent searches found no review-finding ID inside the declared record set that the table misses. Every label is classified by category and subsystem. P3 observations in DA01-R1-CLASS-01. |
| DA-2 | **FAIL** | Every qualifying family has an entry with cause, sites, why and two options, but the affected claims are identical across options (DA01-R1-CLOSURE-01, DA01-R1-CLAIMS-01), and A/B lack a material option (DA01-R1-OPTION-01). |
| DA-3 | **FAIL** | Items a–f are present. Item (a) lacks per-option claims, SDK compatibility and moot findings, and a realm-hardening option; items a/b/c recommend incompatible cores (DA01-R1-ARCH-01); the owner's extra checks are unverifiable (DA01-R1-AUTH-01). |
| DA-4 | **FAIL** | Family closures are not specific to their options (DA01-R1-CLOSURE-01); A's recommended closure omits half its recommendation (DA01-R1-ARCH-01). |
| DA-5 | **PASS** | All numbers regenerate or rerun; ratio and N15 derivations are correct; timing is framed as observation. P3 attribution note DA01-R1-SPAN-01 and search-scope note DA01-R1-SEARCH-01. |
| DA-6 | **PASS** | All 22 drafts carry a recommendation and alternatives and decide nothing. Content defects are tracked under DA-3/DA-4. |
| DA-7 | **PASS** | B..H and C..H scopes, the single K1.1 sentence and the adoption recording verified. |

## Stop-and-redesign

The rule does not fire. This is the packet's first review: there is no earlier CHANGES REQUIRED, no
earlier ACCEPT of this H, and no repeated subsystem. No new contradiction of an accepted claim was found
(the frozen-intrinsics refusal is consistent with values.md), so the brief's stop condition does not
fire either.

## What I searched and what I did not

Searched: the whole B..H and C..H diffs; every file in the DA-1 trees at both revisions with two
grammars plus severity-line and reuse scans; 47 classifications; all 16 family entries mechanically and
by hand; all six items and 22 drafts; values.md in-process, fixed-limits and non-coverage sections,
AGENTS.md trust modes, decisions 03–05, BASELINE value section, DEC-8/9 statements in BASELINE; every
`canonicalize` call site in Kernel source; every ACCEPT record's candidate SHA for flips; K1.2-correction-01 amendments 02 and 03 in full;
reruns of the cheap probes and N15/own-key/ablation probes.

Not searched or not run: the 63-run R8 cost corpus and eager-Outcome probes (derivations checked from
sealed raw outputs); the owner–implementer conversation; the owner-held archive tarball; correctness of
every one of the 278 classification summaries (47 sampled); the full contents of
`evidence-inventory.json` and `evidence-mentions.json` beyond scope and coverage checks; the
correction-01 contract beyond its DEC-8/DEC-9 sections; the full product test
suite (beyond the 1,720-test kernel suite that the N15 runner executes twice).

## Verdict and handoff

Recommended status transcription for 007: **CHANGES_REQUESTED**. Independent review 01 (Claude Code,
`claude-opus-5-5`, 2026-10-01) of H `7ebf80d461c439459d0c8010c04c9fb197281a59` over C
`ce3ec854ff126498e0b807ba97626d12015572c7` / B `66bc041175e6fc191c2e7cf88de198111e7d97c9`: DA-1, DA-5,
DA-6, DA-7 PASS; DA-2, DA-3, DA-4 FAIL. Open P2 findings: DA01-R1-CLOSURE-01, DA01-R1-ARCH-01,
DA01-R1-CLAIMS-01, DA01-R1-OPTION-01, DA01-R1-AUTH-01; P3 observations DA01-R1-CLASS-01, -SPAN-01,
-SEARCH-01, -FLIP-01, -COORD-01. The invalidation-01 classification hold and the invalidation-02 V-D1 hold
are unchanged. No successor is released.

The correction brief is [review-01/brief-02.md](review-01/brief-02.md). The evidence directory is
[review-01/](review-01/README.md).

CHANGES REQUIRED
