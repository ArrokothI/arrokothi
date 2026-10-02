# Review 02 coverage map — DESIGN-AUDIT-01 round 2

Reviewer: Claude Code desktop session (Code tab), model `claude-opus-5-5`, 2026-10-01. Access: local clone with
shell, Git history and network; the owner's local Claude Code transcripts; no owner–Codex conversation.

Derived from brief-02's amended criteria, owner-decisions-02 section 2 and review-01's required outcomes. I read
`implementation-02.md` during setup because the review prompt lists it among the setup files, so this map is not
blind to the report. To limit anchoring, every row below is closed by my own probe, mutant or source trace, not
by the report's assessment.

| Obligation / source | Distinguishing input or plausible wrong draft | Expected facts and forbidden results | Evidence and result |
|---|---|---|---|
| CLOSURE-01 mechanism (brief-02 DA-2/DA-4) | Recommend closure = Keep closure + suffix; reworded suffix; reference-only closure not starting with "see"; identical claims | Checked-in data model and renderer; regeneration enforced; option closures differ in substance, not wording | `guards/validator-mutants.json`; my reading of all 51 options. Closed on reading; guards are form-only (P3 GUARD-01) |
| ARCH-01 (DA-ARCH) | A/B/C/F02/F09/F10 recommendations whose label says bytes but content says live; D/E dependencies | One core in every recommended row; CORE maps A–F10 and K1.1-correction-03 under every answer | `rerun/consistency-extract.txt` (label-based) plus reading row content. Closed; P3 DEP-01 |
| CORE vs owner-decisions-02 §2 | Missing scoped contract, core accepting live objects, wrapper in core contract, cap or packaging stated as decided | Scoped contract; canonical-byte core; caller-side cooperative wrapper; lenient bounded text at transport adapter; hardening not a guarantee; open items as proposals | Section-by-section read; grep for packaging wording. Matches |
| CLAIMS-01 (DA-3a) | Inventory entry misquoting its source; missing required entry; option map with a false disposition | Every required source present and accurately summarized; every option maps every entry; dispositions agree with CORE | Source reads at B (values.md, decisions 03–05, DEC-8/9, amendments 02/03, AGENTS.md, BASELINE, 007 rows); `option×entry` table. Closed; P3 CONSIST-01 |
| OPTION-01 (realm hardening) | A hardened implementation that freezes intrinsics only (Node flag) and passes the stated closure | Poison corpus covers every recorded K1.1 hostile hop the option claims to stop; claims kept under A-hard/B-hard are delivered by the mechanism | `realm/` probes; Node v25.2.1 CLI docs; `values.ts:1130–1177`; K1.1 review-05 K11-R5-VAL-03. **Not closed: REALM-01 (P2)** |
| AUTH-01 | Paraphrased or reconstructed checks; pre-approval presented as an owner quote | Six checks byte-identical to the forwarded prompt; pre-approval sourced to that prompt | `auth/six-checks-compare.txt` against the original transcript. Closed |
| O-R8-4 interim step (owner direction b) | Internal-slot brand check that passes the stated closure while a forwarding Proxy around a re-prototyped built-in still projects | Closure names this witness and its expected result, or the owner question it raises | `brand/proxy-exotic.txt`. Observation PROXY-01 (P3) |
| DA-1, DA-5, DA-6, DA-7 | Regeneration drift; scope outside packet; edited historical records; adopted wording | Verifier passes at clean C and H; C..H = report + DA row; drafts say Not adopted | `rerun/verify-at-C.txt`, `rerun/verify-at-H.txt`; diff scope; grep. PASS |
| No contradiction among recommendations; no accepted claim amended | Draft text that conditions a core-independent recommendation on the core; disposition contradicting CORE | Consistent dependency statements; B..H outside packet only the 007 row | Option table, CORE matrix, `guards/` M7. P3 DEP-01, P3 CONSIST-01; no amendment |
