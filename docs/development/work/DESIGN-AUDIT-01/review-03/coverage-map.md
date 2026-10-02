Reviewer: Claude Code desktop session (Code tab), model `claude-opus-5-5`, 2026-10-02. Access: local clone with
shell, full Git history and network fetch; the owner's local Claude Code transcripts (used only for the six-check
comparison); no owner–Codex conversation. Independent review 03 of DESIGN-AUDIT-01, H
`ce0b5a7098a9f65cf16dc55ce6eb013946564508`.

# Coverage map — review 03

Derived from brief-03, owner-choice, review-02's findings and the governing sources before using the report's
explanations. The review prompt lists design-03 and implementation-03 among the setup files, so the map is not blind
to the report. To limit anchoring, each row closes with my own probe, mutant, diff or source trace.

| Obligation / source | Input or schedule, including the negative case | Expected facts and forbidden changes | Evidence and result |
|---|---|---|---|
| Identity and scope (006 C/H; DA-7) | B, C, H, 521b3c8b, previous H; C..H allowlist; B..H scope; remote on both URLs | C..H = `implementation-03.md` + the audit row only; 521b3c8b = the audit row only; no product, Layer-3, BASELINE, process or historical-record change | `git rev-parse`/`diff`/`ls-remote`: hold. Both `ArrokothI/arrokothi.git` and `ArrokothI/agent-kernel.git` advertise H |
| Historical immutability (brief-03 bounds) | review-01/, review-02/, review-02.md, owner-decisions-02, owner-checks-02, design/implementation-01/02, invalidation-01, stop-01, brief-01 since `bd1f4464` | Zero bytes changed | My own `git diff bd1f4464 H` over those paths: 0 lines |
| 007 transcription (owner instruction) | Review-02's blockquote against the 521b3c8b row | Verbatim | 689 characters, verbatim. Four round-2 links dropped from the live row (P3 LEDGER-01) |
| R3-CORPUS label coverage | 16 `hostile_only` labels; drop one (RM4) | Exact set equality; omission rejected | `corpus.py` validate: holds; RM4 rejected |
| R3-CORPUS reach truth | Each of the 16 source findings read at its pinned record; K11-R5-STATE-01's second recorded witness (`Object.freeze`) with the hop varied | Reach and reason match the recorded mechanism | 15 hold as stated. K11-R5-STATE-01 omits the `Object.freeze` witness; via `globalThis.Object` it is replaceable under the flag alone and blocked by the A-hard pin (`hop/object-freeze-witness.jsonl`). P3 HOP-01(c) |
| R3-CORPUS binding hop, forms | JSON/Object/Array × {assign, defineProperty, classic-script `let`, `let` before pinning} × {full pin, writable-only pin}, under the flag | The full pin the closures specify blocks every mid-capture form | Full pin: TypeError / TypeError / SyntaxError. Writable-only pin passes assignment and is steered by the other two forms. A pre-pin `let` steers bytes despite pins and a passing globalThis-descriptor check (`hop/pin-forms.jsonl`). P3 HOP-01(a) |
| R3-CORPUS binding hop, set | Global bindings the Kernel zone reads beyond the serializer's eight | Covered by some maintained mechanism | Writable under the flag (`hop/frozen-graph.txt`). Current protection is load-time capture (`coordinator.ts:198–204`) plus a static guard (`ambient-reads.test.ts:259`); not in the hardening corpus. P3 HOP-01(b) |
| R3-REALM flag-only rejected | Flag without pins; closure text of A-hard (`register.md:22`) and B-hard (`:39`) | Closure demands durable pins, mid-capture tests and a failing flag-only control | Text holds; the maintained binding cases steer Object/Array/JSON bytes flag-only and block when pinned (verifier at C and H) |
| R3-REALM claims (V-ENV) | V-ENV cells and A-hard/B-hard claims against the probes above | No unconditional integrity claim; conditions stated | Conditional claim holds for every mid-capture form; the bootstrap case falls inside the declared limit (`realm-hardening.md:9,17`). P3 HOP-01(a) |
| R3-REALM record corrections | `realm-hardening.md:7,9` against Node v25.2.1 `cli.md:1376–1383` (fetched) | Flag limits stated; "passes the first" corrected | Hold. Extra observation: the `Iterator` constructor is not frozen by the flag on v25.2.1 (`hop/frozen-graph.txt`) |
| R3-PROXY | Register C (`:54`, `:56`), CORE open-answer table, drafts C/F02, inventory cells; review-02 brand and clone probes | Both answers drafted with their claims; neither chosen; current outcome asserted | Hold. Answer 2's scope wording is a P3 (PROXY-02) |
| Root-cause mechanism | `closure-corpus.json` check; mutants RM1–RM5 (`guards/round3-mutants.json`) | Omissions rejected deterministically; wrong prose closed by reading, and declared as such | RM4 rejected. RM1 (round-2 REALM-01 text), RM2, RM3 and RM5 survive both validators, as declared. P3 GUARD-01 |
| Finite-corpus closures (brief-03 suspect design) | 18 options of A, B, C, F02, F09, F10 against their family labels and dimensions | Every recorded family dimension named or assigned | Bounded reading: no omitted dimension found. The successor port requirement is stated in `closure-corpus.md` |
| DEP-01 | Validator rule; M7; dependency text | Truthful independent tag accepted; sequencing separate | `REQUIRED` excludes D/E; M7 survives (accepted); 16 recommendations are tagged independent with separate sequencing text |
| CONSIST-01 | Hardened K11C03/K14; method labels of near-identical closures; ISOLATION | Aligned with CORE and sources | K11C03/K14 narrow; C-brand/F02K and A-keep/F09K share methods; paraphrase matches AGENTS.md |
| GUARD-01, DEPENDENTS-01 (optional) | `review02-regressions.json`; CORE amendment table | Survivors recorded; dependents named | Hold |
| SELF-R3-SYMBOL-01 | `canonicalize@3.0.0` `lib/canonicalize.js` (49 lines) | No free `Symbol` read | Confirmed; the `for…of` loop uses the well-known iterator symbol |
| R3-KEEP and earlier closures | Verifier at C and H; review-01 template/consistency; review-02 realm/brand/clone/mutants/anchors/six-checks | Unchanged results | All reproduce (`rerun/`); maximum within-item closure similarity 0.31 |
| Beyond the corpus: current Kernel | `values.ts` `canonicalize` and `createExecution` with a coherent Proxy whose trap declares a global `let` | Bytes from the snapshot; key conflict refused | Steered bytes; a different payload is accepted as a replay (`hop/kernel-lexical-*.jsonl`). New evidence against accepted work, for the owner |
