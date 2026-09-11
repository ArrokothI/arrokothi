# Implementation report — K0.1, round 3 (correction)

## Identity and status
- Packet / parent milestone: **K0.1** / **K0**; [contract.md](contract.md) (corrected this round);
  worksheet [protocol-worksheet.md](protocol-worksheet.md) **Revision 3**.
- State: **WAITING_FOR_REVIEW**
- Correcting: [review-02.md](review-02.md)'s CHANGES REQUIRED outcome, findings **K01-R2-01 through
  K01-R2-06**, against reviewed candidate H2 `cc61e74455534abf896c46632246615185219b92`
  (payload C2 `fc84664a873d6a4cfaf1d86d57fb9bcba34a6f04`, base `6464be1`).
- Base commit (unchanged): `6464be12c11eb75f7dfbc5ece12ca8d3020a5c15`
- Round-1 reviewed H (preserved, not amended): `857fa05a8a72a4c6f4f294f9e775a0dc1f7919dc`
- Round-2 reviewed H2 (preserved, not amended): `cc61e74455534abf896c46632246615185219b92`
- Round-2 review record commit (adds [review-02.md](review-02.md); ledger → CHANGES_REQUESTED):
  `ca065990835795fffdcb1eca5601572c24791a60`
- **Correction payload C3: `2b252b05eaf7020fec1e2b4a342d5fea86bad66e`**
- Candidate H3: the commit containing this report, the round-3 evidence directory and the ledger
  edit; full SHA supplied in the handoff (per 006, H cannot name itself).
- Branch / remote: `codex/k0.1-protocol-legacy-disposition` / `origin`
  (`https://github.com/ArrokothI/Agent_SDK.git`; GitHub reports it moved to
  `https://github.com/ArrokothI/agent-kernel.git` — the configured URL is deliberately left unchanged).
- Working tree: verified clean at C3 before validation ran (`06-status-clean.txt`).
- History: every prior commit, report and review is preserved unedited. No amend, no rebase, no force.

## Findings — individual disposition

| Finding | Disposition | Exact correction | Evidence |
|---|---|---|---|
| **K01-R2-01** — complete the canonical value encoding | **Fixed** | Worksheet §1 gained **E-7**, the complete canonical form, and E-3/E-6 now reference it instead of gesturing at "the canonicalized form". E-7 fixes every byte-affecting rule: UTF-8 output with no BOM; no insignificant whitespace; lowercase literals; **object members ordered by Unicode code point** (with the UTF-16-code-unit pitfall stated explicitly, and UTF-8 byte order noted as the order-isomorphic implementation); array order preserved; minimal string escaping (`"`, `\`, C0 controls with short forms and lowercase `\u00XX`, raw UTF-8 for everything else, lone surrogates rejected); shortest-round-trip number spelling; absent-versus-null surviving as a byte difference; and an explicit equality/size definition. E-1 gained the string well-formedness precondition E-7 depends on. Scope is stated both ways: the canonical form is an **internal** computation, and **no transport is required to emit it** — a transport may pretty-print, reorder keys, `\u`-escape or use a binary codec and still conform. Eight deterministic boundary examples show equivalent transport spellings collapsing to one canonical form and one identical size. `contract.md` K0.1-C2/C4 and the non-goals list were reconciled so only transport/storage mechanics remain open, with an explicit test for what "implementation-owned" may mean ("only if changing it cannot change which logical values are equal or what a bounded value measures"). | Diff `cc61e74..2b252b0`, worksheet §1 (E-1, E-3, E-6, E-7); `contract.md` K0.1-C2, K0.1-C4, Non-goals. **Rule 7 was verified empirically, not recalled** — `node --version` v25.2.1, `String(x)` over `1`, `1.0`, `1e0`, `-0`, `1e20`, `1e21`, `1e-6`, `1e-7`, `5e-324`, `1.5e300` — which caught a real error in this round's first draft: ECMAScript emits `+` in positive exponents (`1e21` → `1e+21`), so the draft's "never a `+`" would have made two conforming implementations disagree. All eight example byte counts were machine-computed and re-verified after editing. |
| **K01-R2-02** — valid legacy disposition for `PendingOperation` | **Fixed** | The invalid fourth label is gone. §12's row is now **`LEG-5` — legacy-only** for the *universal abstraction*, grounded in four concordant sources (004's "Remove from mandatory Kernel model: … universal PendingOperation hierarchy"; kernel.md's "a separate universal `PendingOperation` abstraction is not required beyond these records"; action-lifecycle.md's "This is not a new universal PendingOperation hierarchy"; 007's K2 exclusion of a "universal pending hierarchy"), and cites the record's own "Generic on purpose" docstring as the thing being classified. The row then **splits out the individually reusable facts** that may inform K2's logical-action/attempt/responsibility records without K0.1 deciding K2 mechanics: dispatch-versus-outcome separation so "dispatched with no outcome" stays representable, first-class `unknown`, result-Event correlation, and an honest null deadline. It separately marks the values that are *not* generic Kernel material (`conflicted` is Structured-Memory-specific; `declined`/`denied`/`rejected` encode confirmation/authorization specifics) as K2's to decide. K1's refusal of Effects is retained but demoted to a scope note, explicitly *not* a substitute for classification. | Diff `cc61e74..2b252b0`, worksheet §12 row `LEG-5` and the §12 header note. Citations re-verified against `packages/core/src/effects/pending.ts` (`:4-8`, `:14-20`, `:38-71`, `:73-106`, `:96-101`). |
| **K01-R2-03** — Event-wait migration and target wait shape | **Fixed** | Worksheet §5 **W-1** now states the target shape in full: a **finite, enumerable, non-empty list of Event dependency alternatives** (each a declarative condition over kind and/or correlation, combined only by "any of"), plus a **separate finite list of declared input subscriptions**, plus the §4 deadline — and one eligibility sentence covering both, with everything else staying queued and unacknowledged. It states what is *not* in the record (no boolean expression between alternatives, no all-of, no negation, no predicates, no query language) and preserves the satisfaction-versus-eligibility distinction (a subscription wake does not satisfy a dependency). New **W-7** supplies the five required deterministic examples on one scenario. §12 **`MIG-5`** is corrected from "Migratable … exactly what W-1/W-5 need" to **partially migratable**: the declarative matching *primitive* migrates (kind/correlation equality, serializable data, the envelope identity fields), the record *shape* does not — one `wake` with one `correlationId` cannot carry differently correlated alternatives (it must either fix one correlation or set `null` and over-match), and there is no subscription concept at all, which the current file's own docstring concedes and defers. §11 row 5 updated. | Diff `cc61e74..2b252b0`, worksheet §5 (W-1, W-7), §12 `MIG-5`, §11 row 5. Source re-read: `packages/core/src/interaction/event-envelope.ts` `:34-42`, `:50-54`, `:74-80`, `:82-86` and the deferral docstring at `:66-72`. |
| **K01-R2-04** — correct the reference-store claims | **Fixed** | Revision 2's `REF-2` is now **`LIM-1`**, reclassified as an **implementation/scalability limitation, not a semantic refusal**. What the source proves is kept and sharpened (the store accepts a scope argument and ignores it — `_scope`; it clones and globally serializes the whole aggregate), with the semantic obligation stated exactly: **no K0/K1 assertion may rest on global serialization as if it were per-Execution scoping.** The overreaching claim is withdrawn with its counter-evidence: `Harness.activate` closes its claim transaction (`harness.ts:742-764`) *before* `runController` is invoked (`:779`), so controller computation runs outside any store transaction and two Executions' computations can overlap even with a globally serialized store. K0.1 therefore records **no verdict** on K1's delayed-A/B requirement absent an actual counterexample, and points K1.1 at `runOnce`'s sequential await (`:683-690`) as the structure that actually bears on it. This is reconciled with 001 K1's explicit "in an in-memory reference" requirement: being in memory is not what is refused. **`REF-4`** is reworded so one mechanism is no longer described as both refused and retained: the **cursor** is refused as the K1 reference mailbox (K1 needs per-entry disposition, eligibility selection and Outcome-time acknowledgment); the **existing file** remains legacy/compatibility material for current 0.8.x paths until migration. §13 was re-checked and gained two entries — one genuine code-versus-target contradiction (absent application-input label matching, resolved toward the canonical requirement) and one explicitly withdrawn claim (the concurrency overreach) — while the "no contradiction between canonical sources" statement is restated as still holding after §1/§5's additions. | Diff `cc61e74..2b252b0`, worksheet §12 `LIM-1`/`REF-4`, §12 header note, §13. Source re-read: `harness.ts:683-690`, `:742-764`, `:779`; `in-memory-runtime-store.ts:45-50`, `:161-167`, `:455-468`. |
| **K01-R2-05** — preserve/correct review provenance | **Fixed** | [review-02.md](review-02.md) was created **before** the correction payload, in its own administrative commit `ca06599`, and records the round-2 review faithfully: reviewer **GPT-5.6 Sol, High reasoning**; access **independent GitHub pinned-source inspection, no executable local checkout or shell rerun**; findings K01-R2-01..06; outcome CHANGES REQUIRED. It carries an explicit provenance-correction table for round 1 — the same reviewer identity and access method, and the **actual** round-1 severities (K01-REV-01 P1, K01-REV-02 P1, K01-REV-03 P1, K01-REV-04 P1, K01-REV-05 P2) — and states plainly that three of round 1's transcribed severities were understated, while confirming no finding was dismissed or deferred because of it. It states that [review-01.md](review-01.md) remains preserved historical transcription whose identity/access/severity metadata is superseded by this record. **`review-01.md` was not edited** — superseding metadata belongs in the later record, not in a rewrite of the earlier one. No reviewer session identifier was supplied and none is invented; that absence is recorded explicitly. | Commit `ca065990835795fffdcb1eca5601572c24791a60` (review record; ledger → CHANGES_REQUESTED). `git diff cc61e74 ca06599` touches only `review-02.md` and the 007 ledger row; `review-01.md` is byte-identical from `4d47638` onward. |
| **K01-R2-06** — reviewer-accessible validation evidence | **Fixed** | Validation was re-run **after** C3 was committed and with the tree verified clean, and its raw output is committed into the repository at [`evidence/round-3/`](evidence/round-3/) — retrievable by a reviewer with the same GitHub pinned-source access the round-2 review used, rather than a session-local path or a bare reproduction instruction. Each log carries its own header (exact command, cwd, commit, tree state, tool versions, OS, UTC timestamp) and a trailing exit code; the audit script itself is committed beside its output so the check is inspectable and re-runnable. Digests, retention owner and retrieval instructions are below. | [`evidence/round-3/`](evidence/round-3/) at candidate H3; digest table below; retrievability verification recorded in the handoff. |

## Validation

All commands ran at **C3 `2b252b05eaf7020fec1e2b4a342d5fea86bad66e`** with the working tree verified
clean (`06-status-clean.txt` is empty output, which is what `git status --porcelain` prints for a
clean tree). Output was captured outside the repository so the tree stayed clean while the commands
observed it, then copied unmodified into `evidence/round-3/` for publication in H3.

- **cwd:** `/Users/rex-shih/Documents/Codex/projects/agent-kernel`
- **Environment:** Node `v25.2.1`, npm `11.6.2`, Python `3.13.5`, Darwin 24.6.0 (macOS, arm64),
  package `arrokothi-agent-kernel@0.8.1`, installed workspace dependencies.

| Command | Exit | Result / counts | Log file | SHA-256 |
|---|---|---|---|---|
| `npm run check:builder-docs` | 0 | PASS — 26 Markdown files, 275 local links/anchors, 38 public package imports (unchanged from rounds 1–2 and 010's baseline; K0.1's files are outside this script's guide inventory, so an unchanged count is the expected result, not evidence it skipped) | `01-builder-docs.txt` | `e395643633acc2846c0f5eda2bd941cf059b776f0068b2227d16ca6f6a1fb3a1` |
| `npm run typecheck` | 0 | PASS — `tsc --noEmit`, no diagnostics | `02-typecheck.txt` | `4165981b35182eacdf37571b6a6340390a3ca238919fc4ddfe56653f7829793a` |
| `git diff --check 6464be1 2b252b0` | 0 | PASS — cumulative base..C3, no whitespace or conflict-marker errors | `03-diff-check-cumulative.txt` | `dc02f49183855a124bcb2d39e1fdfa1160741d0c4b87f1e50faa9dbe9e445202` |
| `git diff --stat 6464be1 2b252b0` | 0 | Cumulative scope: 7 files, all under `docs/development/` — no `packages/`, no `tests/` | `04-diff-stat-cumulative.txt` | `2af1b9afccb613ad8f172fd822b355e05e3ac49ab0bc5ea141d6d21207792e87` |
| `git diff --stat cc61e74 2b252b0` | 0 | Correction delta H2..C3: `contract.md`, `protocol-worksheet.md`, `review-02.md`, 007 ledger row | `05-diff-stat-correction.txt` | `5f252fa386a9037b2ef2117d1e18396f1467fb49c6cb303a0c016743517de26f` |
| `git status --porcelain` | 0 | Empty output — clean tree at C3 | `06-status-clean.txt` | `467a9fa650e14f4d8747a394da9b0a148bea04b96ee3f992c1ffc8debe9979d8` |
| `python3 link-anchor-audit.py` | 0 | PASS — 85 relative links checked, 68 files resolved, 12 anchors verified against GitHub's slug rule, 0 unresolved files, 0 bad anchors, 17 known forward references to `implementation-03.md` (this file, written by H3) | `07-link-anchor-audit.txt` | `e7edb5722b28cf8d4a4f050e35d24fae2d36539b2aa8168694425a12dd9fe989` |
| (the audit script itself, committed for inspection) | — | — | `link-anchor-audit.py` | `4713f621db707d80cfce3c3a9c43b11dfeffa2c4a3c973e7b4d2d7ebe107767a` |
| (evidence directory guide) | — | — | `README.md` | `5160ead03cb8de876381cd608521272601500527e053006a24bfc5e248b60158` |

**Artifact identity, retention and retrieval.** The artifact is the directory
`docs/development/work/K0.1/evidence/round-3/` as committed at candidate **H3** on branch
`codex/k0.1-protocol-legacy-disposition`. **Retention owner:** this repository — the files are
ordinary tracked content, immutable at the commit carrying them, and they travel with any branch that
integrates it. A reviewer retrieves them exactly as they retrieve the rest of the pinned source, e.g.
`git show <H3>:docs/development/work/K0.1/evidence/round-3/01-builder-docs.txt`, or by browsing the
directory at that commit on GitHub. Digests above are of the file contents as committed, so a reviewer
can verify each file with `shasum -a 256` after retrieval. Retrievability from the remote was verified
after pushing, and the result — including the verification method — is reported in the handoff.

**`npm test` was not run**, and is not required: this round changes documentation and review records
only. `04-diff-stat-cumulative.txt` shows the full cumulative diff touching nothing under `packages/`
or `tests/`, so the full-suite result recorded at this lineage's baseline remains uninvalidated. No
live model/provider call, process-kill fault injection, or E0–E6 benchmark run was performed or is
claimed.

## Interpretation and decisions
- Why this candidate satisfies the correction request: each of K01-R2-01 through K01-R2-06 has its own
  disposition row above naming the exact worksheet/contract location and the evidence behind it. Two
  findings (R2-01, R2-04) required re-reading source or re-running tools rather than re-reasoning from
  the previous draft, and both turned up concrete errors that prose alone would have preserved — the
  ECMAScript exponent `+`, and the claim that store serialization blocks concurrent computation.
- Routine decisions: (a) the round-2 review record was committed **before** the payload, matching the
  chronology the procedure asks for and keeping reviewer-facing evidence out of the agent's own payload
  commit; (b) evidence was committed into the repository rather than referenced externally, because the
  round-2 reviewer's recorded access is GitHub pinned-source inspection — an in-repo artifact is
  retrievable by exactly that access, whereas a CI artifact would add a retrieval dependency this
  packet cannot verify on the reviewer's behalf; (c) `REF-2` was relabelled `LIM-1` rather than edited
  in place, because its classification changed kind (from a refusal to a limitation) and reusing the
  `REF-` prefix would have implied a refusal that no longer applies.
- Roadmap deviations: none. No scope, gate or acceptance requirement was changed or weakened; every
  parent K0 obligation is still carried by §11's boundary map.
- Reviewer focus for this round: **E-7 first** — it is the largest new normative surface, and the rule
  most likely to hide an error is rule 7 (number spelling), where this round already found one; the
  boundary-example byte counts are machine-verified and can be re-checked in one line. Then `LIM-1`,
  where the correction is a *withdrawal* of a claim rather than a new assertion — the question worth
  testing is whether anything else in the worksheet still leans on the withdrawn premise.
- Known limitations: unchanged — this worksheet still cannot be validated against running K1 behavior,
  because K1 does not exist. E-7's determinism claim is a specification, not a passing conformance
  test; K0.2/K1.1 own the fixture that would actually exercise it.
- Third-party source/dependency/service: **none added.** E-7 notes that rules 4, 6 and 7 coincide with
  RFC 8785's profile and deliberately states them explicitly instead of incorporating that document by
  reference; adopting any library that implements it stays a K1 decision under AGENTS.md's third-party
  review. No dependency, vendored code, or copied test material was introduced.
- **Prior review findings — each ID → correction evidence:** K01-R2-01 → Fixed (§1 E-1/E-3/E-6/E-7,
  contract C2/C4/non-goals); K01-R2-02 → Fixed (§12 `LEG-5`); K01-R2-03 → Fixed (§5 W-1/W-7, §12
  `MIG-5`, §11 row 5); K01-R2-04 → Fixed (§12 `LIM-1`/`REF-4`, §13); K01-R2-05 → Fixed (commit
  `ca06599`, [review-02.md](review-02.md)); K01-R2-06 → Fixed ([`evidence/round-3/`](evidence/round-3/)
  with digests above). Round-1 findings K01-REV-01..05 remain fixed as recorded in
  [implementation-02.md](implementation-02.md); nothing in this round reopened them. No finding across
  either round remains unresolved or partially resolved.

## Handoff
- Ready for independent review at candidate H3 (SHA supplied in the handoff message; base `6464be1`,
  round-1 H `857fa05`, round-2 H2 `cc61e74`, review record `ca06599`, payload C3
  `2b252b05eaf7020fec1e2b4a342d5fea86bad66e`).
- No self-acceptance. K0.2 and every later packet remain unstarted and unreleased.
