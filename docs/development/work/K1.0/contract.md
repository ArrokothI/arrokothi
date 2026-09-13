# K1.0 contract — target boundary and legacy quarantine

**Packet:** K1.0. **Parent milestone:** K1 ([001 K1](../../001-current-status-and-roadmap.md)).
**Packet seed:** [007 K1.0](../../007-work-packets.md#k10--target-boundary-and-legacy-quarantine).
**Bounded approach:** [013 structure assessment](../../013-structure-and-evidence-sequencing.md).
**Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` (integrated `main`,
including 006/008/009 as the owner revised them on 2026-09-13).
**Dependency:** K0.2, independently ACCEPTED at H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` and
integrated as `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)).
**Base commit:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Contract revision 2.**
**Revision 2 changes (same packet, no new semantics):** C1 forbids a non-literal dynamic import as a
violation rather than silence; C2 grows 13 → 15 controls with the K10-R1-01 regex-after-paren and
non-literal fail-closed cases; C3 suite 1837 → 1846; C4 requires bidirectional agreement for zones,
deferrals, export ownership and measured dependencies against the candidate tree (pre-existing rows
reproducible at the base); C7 architecture suite 79 → 137 → 146 with the `typescript` parser
allowlist and sentinel fail-closed noted; C9 scanner cases 35 → 38 with the parser and fail-closed
forms; C4↔C5 interaction widened to exports and dependencies.

## Release provenance and the E1 dependency decision

Entering this session the ledger recorded `next_release: none`, with K1.0 PLANNED and unreleased.
Per [009](../../009-universal-prompts.md), an absent release requires clarification, so the hold was
reported to the owner rather than treated as a release. The owner then replied, verbatim:

> "Release ArrokothI K1.0.
> Treat the Benchmark E1 dependency as the already-built but unaccepted fixture preparation."

That is this packet's release and its one owner amendment. It resolves K1.0's second dependency —
"the benchmark-owned E1 fixture preparation required before K1 implementation" — against 007's
general entry rule that dependencies be "independently ACCEPTED and integrated". The fixtures are
built and were inspected; they are **accepted by nobody**. Recorded, not claimed:

| E1 identity relied on | Value | Status |
|---|---|---|
| Benchmark repository | `ArrokothI/benchmark` | — |
| Candidate branch | `codex/e1-kernel-acceptance-capture` | Not merged; benchmark `main` is `5a3f1ba525f68244701b1f73a1d29c4902ffe589` |
| Payload C2 / candidate H2 | `d8f17549c31f9ee5d995e773c2f211faed2785fb` / `8de04779d279dba82cf834d419e465d2b677ef46` | `BLOCKED_EXTERNAL`, accepted by nobody |
| Prepared capture material | `fixtures/e1/`, `src/e1/` | Built |
| Capture protocol | `e1-kernel-acceptance-capture-v1` | Built |
| `e1-capture-set-v1` | `sha256:1bb8026410ae73229c42cb7f0c6f9c4286546d068f361c0f6ad4981f81bad898` | Built |
| `e1-capture-policy-v1` | `sha256:61a1615d41be1e4300c3f54e8d67b0b4ac100e760d97a63e12b52f3388c01265` | Built |
| What it pins from this repository | `ArrokothI/arrokothi@0535160e677231da41b06d9f822e62e2f0364dd1`, `tests/conformance/k0`, `arrokothi-k0-public-fixture/1`, by per-file digest | Unchanged by this packet |

**This packet claims no E1 result.** All fifteen E1 schedules are `REFUSED` at the pinned revision
and E1's inherited gate is `NO_RESULT`. The fixtures' existence is an entry prerequisite the owner
released against; K1.0's structural pass closes no E1 criterion and earns no evidence credit.
Because the pinned bytes are `tests/conformance/k0`, this packet treats that directory as frozen.

## Selected proof methods

From [012](../../012-review-methods.md):

- **Deterministic execution** — the guards are mechanically decidable over repository files. Each is
  driven through a controlled input and each includes a plausible broken behaviour the oracle
  rejects. This is the dominant method and carries C1, C2, C3, C7 and C9.
- **Process/documentation** — C4, C5, C6 and C8 are records: ownership, assignment, non-goals and
  entry provenance. They are checked by reference resolution, by policy/document agreement asserted
  in code, and by reading, not by running a Runtime suite.
- **Packaging/release** — used only negatively, for C6: the target package is asserted `private` so
  no release claim can follow from it. A full packed-artifact/clean-consumer inspection belongs to
  S1 and is **excluded** here; K1.0 publishes nothing.

Materially excluded: **race and fault** (this packet commits no state and has no ordering or
recovery claim); **native Runtime/Driver** (no Driver exists; R1 owns fidelity); **external
evidence/gate** (E1 is the prerequisite above, not a gate this packet executes).

## Acceptance criteria

| Id | Obligation and source | Input, including the negative case | Expected observable facts and forbidden changes | Evidence |
|---|---|---|---|---|
| **K1.0-C1** | Target zone depends on no legacy/native Runtime internals, through direct, type-only or barrel imports (007 acceptance). | Transitive walk from `packages/kernel/src/index.ts` over the real tree, following relative paths, package roots, package subpaths, re-exports and dynamic imports. | Zero violations. Every reached file is under `packages/kernel/src`; every external specifier is `node:`. A non-literal dynamic import is a violation, not silence. Forbidden: any reached file outside the zone, any non-`node:` external, any unresolved workspace subpath, or a non-literal dynamic import recorded as no dependency. | `kernel-landing-zone.test.ts` — "the target zone's real import graph reaches nothing outside itself" |
| **K1.0-C2** | Guards demonstrate rejection on representative forbidden edges, not only an empty graph (007; 013). | Fifteen fixture repositories. Eleven plant one forbidden edge each: direct relative into legacy, type-only subpath barrel, root barrel, re-export barrel, dynamic import, transitive-through-in-zone, host SDK, third-party package, undeclared workspace subpath, plus a forbidden import hidden after a regular expression after a control-flow paren (K10-R1-01) and a non-literal dynamic import that fails closed (K10-R1-01). Two more reject a leaf case: an unaudited sibling of an approved leaf, and a dependency of an approved leaf. One asserts attribution: a forbidden barrel import reports one violation, from a file in the zone. Two accept: a permitted graph, and an explicitly approved leaf. | Each forbidden fixture yields exactly one violation, naming that edge and attributed to the file that wrote it; the non-literal case yields the sentinel with its fail-closed reason. Each permitted fixture yields none. Non-vacuity: the real graph is exactly the two zone files and traverses at least one internal edge. Forbidden: a guard that is green on an empty or unreadable graph, red on everything, or that attributes a violation to a file outside the zone. | `kernel-landing-zone.test.ts` — "K1.0 forbidden-edge controls" (15 cases) and "that result is not vacuous" |
| **K1.0-C3** | Current SDK/examples/consumer behaviour and existing tests remain working and explicitly legacy (007). | Full suite and typecheck; the legacy export map and runtime export names; a repo-wide scan for importers of the target zone. | 1846 tests pass, 0 fail; typecheck clean; `@arrokothi/core`'s five subpaths keep their exact export map and their 227/227/44/33/21 names by sorted-name digest; the only importer of the target zone outside it is the guard that verifies it. Forbidden: any moved legacy source file, any changed public export, any consumer routed through the target zone. | `kernel-landing-zone.test.ts` — "K1.0 legacy quarantine" (3 cases); `npm test`; `npm run typecheck` |
| **K1.0-C4** | Inventory source/export ownership and cross-boundary dependencies; record concrete paths and allowed imports (007 scope). | The four zones, their roots, their measured cross-zone and third-party edges, the export ownership table and the allowed-import rule. | [`ownership-inventory.md`](ownership-inventory.md) records them against the candidate tree (pre-existing zone rows reproducible at the base; the target row exists only in the candidate), and the executable policy agrees with it in both directions: the Zones table declares exactly the policy zones and roots, the deferred table declares exactly the policy DX rows, the export table matches the manifests with no undeclared package, the dependency table's file counts and workspace/third-party reaches match a recomputation with the same analyzer, and the allowed-leaf list is empty in both with its reason stated. Forbidden: a document and a policy that disagree in either direction. | `ownership-inventory.md`; `boundary-policy.ts`; `kernel-landing-zone.test.ts` — "K1.0 policy and inventory agree" |
| **K1.0-C5** | Every deferred extraction is assigned (007 acceptance). | The twelve DX rows: four migratable leaves, seven legacy-only bridges, one refused contract. | Each row names a current path that exists, a disposition and an owning packet that exists in 007's ledger, in both the policy and the document. Forbidden: an unassigned deferral, or an assignment to a packet id that does not exist. | `boundary-policy.ts` `DEFERRED_EXTRACTIONS`; `kernel-landing-zone.test.ts` — "every deferred extraction is assigned an owner" |
| **K1.0-C6** | No new protocol implementation, no-op target API, wholesale native Runtime rewrite, E1 pass or package-release claim (007 acceptance). | The target package's entire source; its manifest; this packet's diff. | The zone exports exactly `UnsupportedKernelSurfaceError` and `refuseUnsupportedSurface`; the refusal throws and returns nothing, naming the surface and its owning packet. The manifest is `private: true`. No legacy source file is moved. No E1 criterion is claimed. Forbidden: a target API that answers a caller with a silent no-op. | `packages/kernel/tests/unsupported.test.ts` (4 cases); `kernel-landing-zone.test.ts` — "the target zone exists…cannot be published", "the zone refuses unimplemented surfaces" |
| **K1.0-C7** | Preserve useful regressions; retain existing vendor-neutrality checks with truthful legacy attribution (007; 013). | The renamed `legacy-core-boundaries.test.ts` against its predecessor. | All thirteen original assertions retained one-to-one. Exactly two `assert` lines differ, in their message strings only ("kernel" → "legacy core"); no assertion subject, expected value or comparison changed. Three test titles and four constant names are retitled; `specifiersIn` is replaced by the shared scanner; two allowlist entries, `@arrokothi/kernel` and `typescript` (the parser the K10-R1-01 fix uses), are added to the conformance-surface case with their reasons at the site, and that case additionally fails closed on a non-literal dynamic import sentinel. On pre-existing files the new scanner reports the same genuine imports with prose phantoms removed, so no pre-existing guard result can change except the intended fail-closed additions. Architecture suite 79 → 146 cases, none removed. Forbidden: a dropped, skipped or weakened assertion behind a rename. | `legacy-core-boundaries.test.ts`; retained-assertion map in the report |
| **K1.0-C8** | The entry record names the prepared E1 fixture identities it relied on, claiming no E1 result (007 acceptance). | The release provenance section above. | Seven E1 identities recorded with their exact values and their unaccepted status, plus the explicit statement that the structural pass closes no E1 criterion. Forbidden: presenting prepared fixtures as a passed gate. | This contract, *Release provenance*; the report's *Validation and interpretation* |
| **K1.0-C9** | The guard mechanism is meaningful in both directions (007 "meaningful transitive import guards"; closes K0.2-SELF-01 and K10-R1-01). | Prose in line comments, documentation blocks, search-needle strings, word lists and fixture template literals; fifteen real import forms; regex literals containing quotes (including after a control-flow paren), `import.meta`, escaped quotes, nested templates; non-literal dynamic imports that fail closed and no-substitution template literals that stay literal; four real repository files with known prose sites. | No prose yields a specifier. Every real form yields its specifier. A forbidden import after a regex after `)` is still seen, and a non-literal dynamic import yields the sentinel, not silence. The four known prose sites report their genuine imports and not their phantoms. The pinned `tests/conformance/k0` fixture still reads as `node:` and relative only. Forbidden: silence achieved by missing real imports. | `import-scanner.test.ts` (38 cases); repo-wide old-versus-new comparison in the report |

## Interacting boundaries

- **C1 ↔ C9.** C1 is only as strong as the scanner. A scanner that missed a type-only or dynamic
  import would make C1 vacuously green, so C9 asserts detection positively rather than only
  asserting quiet on prose.
- **C2 ↔ C1.** The controls and the real check share one violation predicate and one walker, so a
  control cannot pass against a reimplementation of the rule the real tree is held to.
- **C3 ↔ C6.** Preserving consumers and refusing target surfaces pull the same way here only because
  nothing is routed through the zone; the reverse-quarantine case is what makes that observable
  rather than assumed.
- **C4 ↔ C5.** The inventory is checked against the executable policy in both directions for zones,
  deferrals, export ownership and measured dependencies, so a row cannot exist in prose alone.
- **C7 ↔ K0.2.** `tests/conformance/k0` is pinned by benchmark E1 and is frozen here. Its comment
  referring to `architecture/kernel-boundaries.test.ts` is now a stale path; see *Limits*.

## Command plan

`npm run typecheck`; `npm test`; `npm run test:conformance`; `npm run check:builder-docs`;
`npm run test:kernel`; `npm run test:sdk`. `npm run test:evals` is not required: this packet changes
no Agent behaviour. Each run records exact command, exit code, counts and raw log path.

## Limits

1. **No E1 credit, no K1 acceptance.** Structural separation only. K1.4 rechecks these obligations
   against actual behaviour.
2. **`tests/conformance/k0` is frozen.** Its comment at `controls.test.ts:67` names the pre-rename
   guard path and explains a wording workaround that is no longer necessary. The bytes are pinned by
   benchmark E1 at `0535160e…`, so this packet deliberately does not edit them. The substance —
   K0.2-SELF-01 — is closed by C9. Rewording the fixture needs an owner with authority over both the
   fixture and the benchmark pin; assigned to K1.4.
3. **The allowed-leaf list is empty.** No portable leaf is approved, so the real tree does not
   exercise a non-empty allowlist; a fixture control does.
4. **Guards are static.** They constrain dependency direction in source. They establish nothing
   about durability, isolation, Driver fidelity or protocol correctness.
5. **The zone is unpublished and private.** No packed-artifact or clean-consumer evidence is offered;
   that is S1's.
