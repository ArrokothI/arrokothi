Session: Codex desktop coding agent; GPT-6 per session instructions, exact serving variant unavailable. Access: local repository/history and supplied reference checkouts; sandboxed writes and restricted network with reviewed Git escalation; no original owner–Claude conversation or independent acceptance authority.

# Implementation report — DESIGN-AUDIT-01, round 2

## Identity

- Packet/parent: DESIGN-AUDIT-01, read-only design audit. Contract: [brief-01](brief-01.md), amended by [review-01/brief-02](review-01/brief-02.md), with [owner-decisions-02](owner-decisions-02.md) selected drafting directions. Governing 006/008/012/016 baseline is B.
- State: **WAITING_FOR_REVIEW**. Original release is quoted in 007. Current owner instruction, 2026-10-01 in this Codex chat, directs pulling, reading owner-decisions-02, writing design-02, building and delivering C/H. It authorizes continuation unless a named stop condition occurs. No successor release.
- Prerequisite: K1.2-correction-01 accepted H `b7191dbf630defeff7756122a6798e15d0b73dd3`, integrated `ed509e11dc39ff24e10c1ace68189776c4270919`; historical K1.1 integration `b53ccb48a8fd4b9d0b0028fc11e925d563e284fa`, correction-02 integration `954d31b00eb7f2412c22ccf7d4d079699f0c4032`. No new prerequisite acceptance is asserted.
- Branch: `codex/design-audit-01`; configured fetch/push remote: `https://github.com/ArrokothI/arrokothi.git`. Requested initial `git pull --ff-only` completed: already up to date. The supplied owner-decisions-02 was initially untracked and is preserved unchanged in C.
- **B:** `66bc041175e6fc191c2e7cf88de198111e7d97c9`.
- **Payload C:** `0ef728f0b93b7211d7c05795aa9f2cb5e7ce818e`.
- Previous reviewed H: `7ebf80d461c439459d0c8010c04c9fb197281a59`, previous payload `ce3ec854ff126498e0b807ba97626d12015572c7`; [review-01](review-01.md), Claude Code `claude-opus-5-5`, CHANGES REQUIRED, recorded at `1df760718215f9c45475163a883c259d09782dc3`.
- Candidate H: the commit containing this report; full SHA supplied externally after push.
- **Exact C..H administrative allowlist:** `docs/development/work/DESIGN-AUDIT-01/implementation-02.md`; `docs/development/007-work-packets.md` (only DESIGN-AUDIT-01 row). No raw-output attachment. All scripts/data/drafts are already in C.
- Working tree was clean before and after clean-C verification. H commit/push remain pending at report writing; external handoff will report observed remote identity.

## Changes and coverage

Round 2 changes only this packet and its ledger row. The cumulative B..C includes round-1 release, adopted classification hold and its previously authorized K1.1-row sentence, payload/report and immutable independent review evidence. The correction delta from the review-record commit changes 50 packet files at C; no product code, maintained product test, Layer-3 owner, BASELINE, guide or process document changes. The verifier separately preserves all other ledger rows and historical review/hold/attempt records.

The root correction is an option-owned schema in [family-notes.json](family-notes.json): each option requires its own claims list and concrete closure/method. [The renderer](probes/render-register.py) generates the entire register and individual drafts and rejects duplicate cells, reference-only closures, missing inventory entries and contradictory selected cores. Negative controls attack the checker. Shared narrative no longer supplies option closures.

[CORE](decision-drafts/CORE.md) is the joint draft: canonical-byte core, cooperative caller-side wrapper, bounded non-canonical text at a separate transport adapter. It maps live-adversarial, live-cooperative, canonical-byte and hardened-live alternatives across every required dependent. Interim brand refusal/meter/N15 belong to proposed K1.1-correction-03 amendments; later binding moves traversal into the wrapper; refactor follows binding. Packaging and transport cap remain explicit proposals. Accepted decisions are not amended here.

[Claim inventory](claim-inventory.md) and [option dispositions](option-claims.md) name values capture/environment/limits/wire/envelope rules, decisions 03/04/05, DEC-8/9, amendments 02/03 including item 4, trust/isolation, BASELINE and K1.1-correction-03/K1.4. Each A/B/C/F02/F09/F10 option has every inventory entry marked keep/narrow/remove, SDK compatibility and K1.1 moot-finding consequences. Conditional realm integrity and retained ordinary guarantees are explicit.

Selected 012 methods: deterministic regeneration and negative controls; normative claim/consumer/owner tracing; declared search of pinned sources and option interactions; concrete configuration probes; cumulative and correction-delta scope checks. No implementation of parser, wrapper, brand classifier, metering or coordinator refactor is claimed. Runtime, deployment, persistence and external benchmark acceptance are outside this audit.

| Obligation | Expected / forbidden result | Evidence; implementer assessment |
|---|---|---|
| DA-1 | Pinned finding IDs remain enumerated/classified; no dropped family | Enumeration regenerates 278 labels and 16 qualifying families. Scope/axis caveats corrected; P3 taxonomy refinement remains open below. PASS for declared inventory. |
| DA-2/4 | Every option has its own meaningful mechanism closure and claims; no shared-cell/suffix-only substitute | 51 option records across 22 items; renderer and seven negative controls pass. Original template check: both conditions False for every family. Concrete constructor/writer/plan/history/refactor checks distinguish keep. PASS. |
| DA-3 / ARCH | Individual recommendations describe the same core and staged correction ownership | CORE cross-reference matrix and consistency extractor agree on canonical bytes for all recommended A/B/C/F02/F09/F10 rows; D/E dependencies and order explicit. PASS. |
| DA-3 / CLAIMS | Every required option covers the declared current claims and compatibility implications | 20-entry inventory, exact map-key equality, per-option SDK/moot fields; corrected values citation. PASS. |
| DA-3 / OPTION | Hardening evaluated without falsely claiming supported Kernel availability or containment | Original poison and frozen/unfrozen Kernel probes plus expanded root corpus run; current frozen encoding refuses. [Realm record](realm-hardening.md) states compatibility gate and SES exclusion. PASS. |
| DA-3 / AUTH | Six actual owner checks, evidence and honest authority source | [Six-row map](owner-checks-02.md) points to supplied verbatim checks and each result; preapproval sourced to forwarded prompt, not invented verbatim approval. PASS. |
| DA-5 | Quantities regenerate and observations retain their limits | Measurement/catalog/flip regeneration pass. Four mixed spans remove 127 lines from exclusive test attribution: 3,469 remain; 432 production and 5,696 mixed infrastructure lines unchanged. Sealed timing derivations unchanged. PASS. |
| DA-6 | Recommendations remain drafts with alternatives and owner-controlled releases | 23 drafts including CORE; generated individual drafts say Not adopted. PASS. |
| DA-7 | No forbidden files or new external-row change | B scope and review-record delta checks pass; prior K1.1 hold sentence preserved exactly. PASS. |

These are implementation assessments for independent review, not acceptance.

## Correction closure and provenance

- **DA01-R1-CLOSURE-01:** replaced the family-level record mechanism, checked in the renderer, added duplicate/reference/coverage/core negative controls and invoked historical template regression through verify. Every family option now has an independently stated closure and claims list.
- **DA01-R1-ARCH-01:** CORE controls dependent recommendations and maps all alternatives. F10 distinguishes wrapper meter, strict core validation and lenient bounded transport. D/register/draft now share the same dependency.
- **DA01-R1-CLAIMS-01:** inventory and complete per-option maps expose each changed promise, the stable-realm narrowing, amendments, SDK bridge and moot findings. No live-object relocation is treated as automatically removing same-process risks.
- **DA01-R1-OPTION-01:** frozen-intrinsics comparison is explicit in A/B, with current refusal mechanism, costs and positive compatibility gate. No dependency added.
- **DA01-R1-AUTH-01:** owner source is supplied and mapped. SHA-256 of unchanged owner-decisions-02: `e3bdb7aaf9869eacbb7bc60c1368873fd9840bb8ade52407e6a58efef5035053`. Historical preapproval wording is superseded by the sourced explanation, not silently rewritten.
- **P3 SPAN-01:** four own-envelope/metadata spans reclassified as mixed. **SEARCH-01:** broader conceptual aliases and repository-wide consumer search; values.ts:36–42 listed as dependent held description. No explicit re-prototyped refusal assertion found in BASELINE/guides within this declared search; their general preservation statements remain dependent on the hold.
- **P3 FLIP-01:** 016's four events reconciled with broader 13-row/12-head inventory, cleanup reopenings and excluded invalidation category. **COORD-01:** D describes future wait/event/cancellation, action-intent and durable-commit consequences without selecting future semantics.
- **P3 CLASS-01 partly addressed, taxonomy refinement remains open:** corrected misleading independent-axis and unlabeled-observation claims; declared process-review exclusion; reconsidered six challenged labels and documented credible alternative assignments. Retained round-1 grouping/counts, explicitly identifying F13 as a coupled boundary grouping. This optional regrouping is not claimed closed or used as a revised process baseline.
- Additional implementer corrections: aligned evidence catalog retirement timing and R8 option consequences with supplied owner sequence; fixed a generated AGENTS link and source-site spelling found during validation. These are separate from reviewer findings. No new accepted-claim contradiction was found in the declared source/options search.

[Design-02](design-02.md) was written before payload edits and answers all five questions. Current user authorization and supplied directions permit continuation; no new design approval or semantic adoption is fabricated. The proposed amendments concern Kernel binding, caller-side conversion, deployment preconditions and later state ownership, without changing Runtime algorithms. Historical accepted design and both holds remain as recorded.

Tests added: packet-local schema negative controls, historical-script regression runner and expanded realm probe. No product test removed or changed. No dependency/code retirement; future retirement requires the stated binding/refactor acceptance and coverage mapping. Legacy SDK/guides/skills unchanged. No broader reclassification or process rewrite was hidden in this correction.

## Validation and interpretation

At clean C, command (exit 0):

```text
python3 docs/development/work/DESIGN-AUDIT-01/probes/verify.py --require-clean
```

Environment: Python 3.14.6, Node v25.2.1; existing canonicalize@3.0.0. Summary: enumerate/catalog/records/measure/render/search/round2 checks each exit 0; 278 labels, 16 qualifying families, 23 drafts, 733 local file links, 215 cumulative changed tracked files, PASS. Renderer: 22 items, 51 options, 20 inventory entries, seven negative controls, 25 rendered files. Original template conditions both False; recommended core rows agree. Poison attempts throw; original ordinary Kernel control accepts while frozen refuses; eight expanded values per realm have the same respective outcomes. Transport-cap arithmetic validates the proposal only, not an implemented parser.

Additional checks at C: `git diff B HEAD --check` exit 0; all packet probe Python sources parse; clean `git status --porcelain` before and after. Cheap output is reproducible and summarized here, so no new raw attachment is needed. The verifier's historical claims script still prints its fixed old-anchor excerpt; the new regression separately asserts the actual register's corrected in-process anchor.

Declared skips: R8 timing corpus not rerun because its derivation/source inputs are unchanged; immutable reviewer scratchpad-local Markdown links are mapped by its README rather than rewritten or treated as current local links. Existing sealed timing/N15 outputs remain accessible and their derivations/source identities are checked. Product full tests/typecheck, new N15 timing rerun, SES installation, real isolation and external gates were not run: this payload changes audit support only. No external fixture/gate or external decision is claimed.

Whole-packet self-review covered original criteria, all option records, core/claim dependencies, authority provenance, scope, source-search results and P3 consequences. The checker proves structure/regeneration and the declared negative controls, not semantic truth of arbitrary prose or future product code. Strongest remaining risks: human claim/closure judgment, preserved taxonomy choices, later wrapper packaging/cap policy and successor proof of stable-realm/validator/brand behavior. None is silently decided by a check.

Third-party review: no new third-party source, asset, dependency or service incorporated. Existing repository probes and installed Node/canonicalize are reused unchanged with provenance. Official Node/SES documentation informed the comparison and is cited in realm-hardening; SES implementation remains excluded pending exact-version terms and compatibility review. No unsupported license-clearance claim.

## Handoff

Ready for independent review of the new exact candidate, subject to external H/push verification. The follow-up H check uses `probes/verify.py --require-clean --C 0ef728f0b93b7211d7c05795aa9f2cb5e7ce818e` and the exact two-file allowlist above. Full B/C/H and verified advertised remote SHA are supplied externally. Both claim holds remain; no self-acceptance, merge or successor release.
