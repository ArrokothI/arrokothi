# Implementation report — K1.1-correction-03, round 1

## Identity

- **Packet:** K1.1-correction-03, metered value refusal cost.
  - Seeded by K1.2-correction-01 [amendment 01](../K1.2-correction-01/amendment-01.md) under K1.2
    [decision-05](../K1.2/decision-05.md).
  - Scope amended by [DESIGN-AUDIT-01 decision-01](../DESIGN-AUDIT-01/decision-01.md) items 2–3.
  - Governing records: [release 01](release-01.md), [brief 01](brief-01.md), [design 01](design-01.md) and the
    owner's [design check](design-01-check.md) of 2026-10-09. The brief stands as the packet contract; there is
    no separate `contract.md`.
  - Process baseline: 006, 008, 009 and 012 as at B.
- **State: IN_PROGRESS. The candidate is built, but not marked ready for review.**
  - The packet's own review found a unit whose engine work depends on caller input and cannot be metered
    (residual R4, below). That is a brief stop condition.
  - Verify on clean C is `invalid` at its adoption step: the TOOLS-01 adoption corpus conflicts with the
    owner-authorized test conversions (owner question 2, below).
  - 006 does not allow WAITING_FOR_REVIEW while a design question to the owner is open.
- **Owner release:** [release 01](release-01.md), 2026-10-08, from main `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.
  The prerequisites are met:
  - K1.2-correction-01 revision 10 is accepted and integrated (`ed509e1`).
  - TOOLS-01 is accepted and integrated (PR #46, merge `b9c1e549`).
- **Branch:** `claude/k1.1-correction-03` on `origin` (`https://github.com/ArrokothI/arrokothi`).
  - Base B: `b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b`.
  - Release commit: `0b340b6f3e73942edc39c76a79063d490d6e2992`.
  - Design commits: `2b24cdea510e17c79372f520f99945d81d9bceb1` (design 01) and
    `02e55bdcf247865b746cf415070e5f50f7fb3fd6` (design check).
  - Payload C: `ed461d20edb4bb06868302a76e1a786dfa278d29`. It wraps two earlier payload commits:
    - `fc0c477a8e4c0f4120397b22890ddd35e45bf46c`: verify was `invalid` at its adoption step, because 11 suite
      targets named their members' old lines;
    - `6c7ccd9d9cb664371e1be8918e8ed7257ea10d62`: fixes those lines. Its separate `mutations.json` run showed
      six held realm witnesses with invalid baselines.

    C records the candidate observation in those six witnesses.
  - There is no earlier reviewed H.
- **Candidate H:** the commit that contains this report. Its full SHA is in the external handoff.
- **C..H administrative allowlist** (exactly):
  - `docs/development/007-work-packets.md`
  - `docs/development/work/K1.1-correction-03/implementation-01.md`
  - `docs/development/work/K1.1-correction-03/c1-ablation-01.md`
  - `docs/development/work/K1.1-correction-03/c1-ablation-01.jsonl`
- **Session:**
  - A Claude Code cloud session, `claude-opus-5-5`, on an Anthropic-hosted Ubuntu 24.04 x86_64 VM (Ubuntu
    24.04.5 LTS, 4 vCPUs).
  - Node v26.10.0 (`/opt/node-v26.10.0-linux-x64/bin`), Python 3.13.16.
  - Network: outbound HTTPS only, through the environment's agent proxy. The build fetched no package and added
    no dependency.
  - GitHub: `git fetch` and `git push` to `origin` through the session's Git proxy, for this branch only. No
    `gh` CLI. The GitHub MCP tools, scoped to `ArrokothI/arrokothi`, were available and not used. No pull
    request was opened.
  - The session's subagents (packet review, conversion reviews, budget review) ran in the same environment.
- **Working tree:** clean at C and at H. Push status is reported in the handoff.

## Changes and coverage

### Change groups (B..C)

All the changes are Kernel changes. Capture is the Kernel's boundary-value validation; BINDING-01 later moves
it behind the SDK ([decision-02](../DESIGN-AUDIT-01/decision-02.md)).

1. **`packages/kernel/src/values.ts`**
   - **Per-root work meter.**
     - Units: visit 1; listing `1 + length`; element 1; descriptor 1 (also charged for a listed array index at
       or past `length`); read 1; string its length, at most 131,072; diagnostic 1.
     - B = 3 × `canonicalBytes` = 3,145,728.
     - Capture stops at B + 1 with `too_much_work`. The stop is root-located, uncharged, and exclusive with
       `too_many_bytes`.
   - **Metered observation.** Every caller observation goes through a metered helper:
     - `listOwnNames` and `listOwnSymbols` charge a listing's length right after it returns;
     - `observeElement`, `observeDescriptor`, `readMember` and `scanText` charge before they observe.
   - **Loop caps.** Every other loop carries a literal or `BOUNDARY_LIMITS` cap.
   - **Proxy refusal first.** `util.types.isProxy`, read at load, is the first observation of every object at
     every depth. The refusal is `unsupported_form` with a fixed message.
   - **Internal-slot refusal.** 17 native `util.types` predicates and `JSON.isRawJSON` run after the
     plain-prototype check and before any listing. Arguments objects, module namespaces and raw JSON are
     refused (design check Q4).
   - **O(1) cycle detection.** A Kernel-created `Set`, reached through load-time methods, replaces the scanned
     own-array stack.
   - **Test export.** `captureWithWork` is exported for tests; `index.ts` does not re-export it.
2. **`packages/kernel/src/envelope.ts`:** `acceptIdentityText` tests for a Proxy before `Array.isArray`.
3. **New tests and helpers**
   - `capture-metering.test.ts`: static rules SC1–SC9, with seeded bypasses.
   - `capture-work.test.ts`: exact unit pins, B and its witnesses, depth independence, the eight-root Outcome,
     the runtime operations-to-units oracle, and every byte charge.
   - `capture-refusals.test.ts`: Proxy, internal-slot and identity-text refusal, and the declared limits.
   - `capture-corpus.test.ts`: the generated corpus.
   - Helpers: `capture-instruments.ts`, `capture-corpus.ts` and `capture-metering.ts`.
4. **Changed existing tests:** 69 converted tests in 7 files, plus the changes listed under KC3-9 below.
5. **Registries**
   - New `tests/fixtures/packet-tools/value-cost.json`: 16 probe cases with 227 mutants, run through
     `tests/tooling/value-cost-probe.mjs`.
   - `mutations.json`: its 11 `capture.current.*` held witnesses record the candidate refusal. Six
     BINDING-01-owned V-ENV held witnesses (`realm.kernel-lexical-*`) also record it, because their input
     reached capture through a Proxy. They stay held for BINDING-01.
   - `adoption.json`: hold register and preserved table, recomputed at the final test tree.
   - `tests/tooling/test_adapter_inputs.py`: converted from Proxy-target acceptance.
   - `tests/tooling/test_preserved_tools.py` and `test_venv_detector.py`: the register keys they pin follow
     the converted tests.
6. **Layer 3 and BASELINE:** `mental-model/concepts/values.md`, `002-implemented-kernel-baseline.md`
   (#value-refusal-diagnostics), `mental-model/sources.md`, `rewrite-index.md` §4 and `roadmap.md`.
7. **Evidence scripts (payload):** `docs/development/work/K1.1-correction-03/c1-ablation/`. These are the C1
   matrix, isolation and table scripts, with their inputs.
8. **Verify specification:** `docs/development/work/K1.1-correction-03/verification.json`.

The cumulative diff is `git diff b9c1e549c81fa4fe4f18fa1a36986f1a5581fc9b ed461d20edb4bb06868302a76e1a786dfa278d29`.

### KC3-10 grep record (at C)

`git grep -n -i` at `fc0c477a`; these documents are unchanged at C:

- `coherent.proxy` over `mental-model/`, BASELINE, `docs/guides`, the SDK README and the root README returns no
  match.
- The remaining patterns ran over `mental-model/` and BASELINE.
- `proxy` combined with `accept`, in either order, matches only BASELINE line 121. That line describes identity
  text *refusing* a Proxy.
- `item 5` matches only supersession statements: BASELINE line 149 and `sources.md` line 62.
- `V-D1` matches only the metered statement (BASELINE line 58), the held-claim notices (BASELINE lines 148 and
  159) and `roadmap.md` lines 101 and 109, which already describe the metered bound.

### Coverage methods (012)

- **Normative decisions:** the `values.md` and BASELINE claims, the issue codes and the declared limits.
- **Deterministic execution:** capture on every root consumer, with exact unit, operation and trap counts and
  whole results.
- **Race and fault:** the eight-root Outcome before authority, with zero forbidden mutations; the poison catalog
  and fault sweeps.
- **Process and documentation:** 007, these records and the verify specification.
- **Excluded:** Native Runtime/Driver, external gates and packaging. Nothing here touches a Driver, an external
  decision or a release.

### Criteria

| ID | Mechanism and evidence | Implementer assessment |
|---|---|---|
| KC3-1 | Metered helpers, plus the static check `capture-metering.test.ts`. SC1 confines engine observations to the helpers. SC2: charge first, and charge a listing's length right after it returns. SC3: no reads in the traversal. SC4: every traversal loop is metered. SC5: visit and Proxy test first. SC6 and SC7: helper placement. SC8: the serializer window is unreachable. SC9: every other loop has its own cap. Each rule has seeded bypasses that the check reports. The runtime oracle (`capture-work.test.ts`, "KC3-1 runtime oracle") compares wrapped engine operations with charged units over the maintained corpus. `value-cost.unit-table` and `value-cost.static` register a mutant for each helper and bypass shape. | Met, within the stated scope of the static check. It is a regression guard over `values.ts`, not a soundness proof. The runtime oracle covers its gaps for the corpus shapes. |
| KC3-2 | B = 3 × `canonicalBytes`; the derivation is in BASELINE and at the `values.md` marker. The costliest acceptance found is 30 singleton arrays around 0 (`chains(30, 0, 4, 528)`): exactly 3,094,930 units and 1,048,555 bytes, accepted, 98.4% of B. The gap of 50,798 units is recorded (design check Q3). The empty-array variant costs 3,094,054. The other at-limit families, and one byte past the limit (refused by the byte stop, not the meter), are pinned. `value-cost.budget` registers the mutants. | Met: B is a proven upper bound. The costliest witness found is not proven to be the maximum. |
| KC3-3 | Per-unit constants (design §1.2, BASELINE) rest on capture never running a trap of a value that is itself a Proxy, and never invoking an accessor. Declared residuals: R1, the one object's own-key listings whose length is unknown before they return; R2, interceptor host objects (pinned with a `vm` global over a Proxy sandbox); R3, hash lookups. **R4**, own entries a listing walks but does not return, was found by this packet's review (MS-01). It cannot be metered. | **Not claimed for R4.** R1–R3 are met as the narrowed exclusion (design check Q5). R4 is the open owner question below. |
| KC3-4 | `capture-work.test.ts` "KC3-4". Wrapped engine operations per refused position are equal at depths 2, 16 and 31. Review 08's family stops at B + 1: after 786,025 positions at depth 2 and 785,967 at depth 31. The eight eager Outcome roots each do the work of one direct capture: in one wrapped child, eight times the Proxy tests and prototype observations of a capture that stops at B + 1 (BM-03). Eight such roots from a visible caller with no grant give `unauthorized_submission`; the exchange is unchanged and the whole result is asserted. | Met. |
| KC3-5 | Every byte charge is pinned by its exact byte-stop position ("KC3-5"). N15 is pinned below and above the overlong threshold. N16 is pinned for over-named objects, including names that are listed but not enumerable. Refused strings, member names and symbols are pinned. `value-cost.byte-charges` registers one weakening per charge site, and the unit-table case registers the MS-02 symbols-listing skip. | Met: every registered mutant is killed, in the dry run and in the separate `mutations` run at `6c7ccd9d`, whose `value-cost.json` and tests equal C's. |
| KC3-6 | Mapping in design §7.1. The time dimension of R4-VALUE-COST-01 is closed by KC3-1, -2 and -4. DEC-7's and SELF-R4-STRING-01's cost claims by KC3-1 and -3. The V-D1 scope of decisions 03/04 by KC3-7, plus KC3-3's residuals. VALUE-DEPTH-01 by KC3-4. EVID-01 by KC3-5. | Met, except for the part of KC3-3 that rests on R4. |
| KC3-7 | The Proxy test is capture's first observation (SC5, structural). `capture-refusals.test.ts` covers every Proxy witness (revoked, callable, over arrays, over exotic targets) in every root consumer at four depths, with zero trap calls. A Proxy at depth 33 is refused as a Proxy. 4,096 revoked Proxies give one refusal each. Identity text names a Proxy before IsArray (PXS-2). `value-cost.proxy` registers the moved-check mutants. | Met. |
| KC3-8 | Declared search in design §4, with one deviation: `isKeyObject` and `isCryptoKey` are not used (PXS-1). Every witness is refused with zero own-key listings, including the O-R8-3 shapes (`Uint8Array(2**24)` re-prototyped to null; a String wrapper over a large rope) and the reverify-exotics kinds. A `Symbol.toStringTag` spoof changes nothing. Cross-realm built-ins are refused by their slot. `value-cost.brands` registers the mutants. | Met for the detectable kinds. Undetectable kinds are a declared limit (design check Q6). |
| KC3-9 | The existing suite passes. Every changed assertion is listed below with its authority. A B-versus-C differential canonicalized 2,006 deterministic values that are neither Proxies nor built-ins at both revisions: 1,993 identical, 13 that differ only at the meter stop (C's located details are B's first details, and no new code appears), and 0 other differences. | Met, under the amended authority line (C2). |
| KC3-10 | `values.md` states the metered meaning once and replaces coherent-Proxy acceptance with refusal. The unit table and B are at the `OPEN(implementation)` marker and in BASELINE. BASELINE's held V-D1 and coherent-Proxy sentences are corrected. Current references to decisions 03/04 item 5 are marked superseded. `check:builder-docs` keeps only its failure that predates this packet. | Met. The grep record is below. |
| KC3-11 | Verify on clean C returns `invalid` at its `adoption` step: "a witness member has another status". It passes `tool-tests` and `inventory` first. Verify stops at the first invalid step, so every other check was also run on its own (below). | **Not met.** Owner question 2. |

**KC3-9 authority line (condition C2).**
- DESIGN-AUDIT-01 decision-01 items 2–3: Proxy and internal-slot refusal.
- K1.2 decision-05 item 2: the meter stop, design check Q1.
- The design check of 2026-10-09: Q4 (arguments objects, module namespaces and raw JSON refused) and Q2 (the
  `too_much_work` code).

**Changed existing assertions.**

| File | Change | Authority |
|---|---|---|
| `values.test.ts` (26), `value-diagnostic-work.test.ts` (17), `value-refusal-cost.test.ts` (10), `creation.test.ts` (8), `ingress.test.ts` (5), `dispatch.test.ts` (2), `outcome-hostile.test.ts` (1) | 69 converted tests: Proxy witnesses now assert the refusal with zero traps, and Proxy counting instruments moved to wrapped primordials or meter counts. [The C1 attachment](c1-ablation-01.md) lists each test, its title at C and what changed. Two of them came from the silent-pass search: creation `K11-R5-VAL-03` and dispatch `K11-R2-VAL-02`. | decision-01 item 2, and item 3 for the brand cases. Instrument moves: design §7.2 and condition C1. The decision-03/04 probes also cite the supersession of item 5. |
| Review 08's VALUE-DEPTH-01 family (now maintained in `capture-work.test.ts`) | It stops at the meter (B + 1) instead of being fully examined as at B. | decision-05 item 2 (Q1) |
| `aggregate-refusal.test.ts` | The code vocabulary grows from 17 to 18 (`too_much_work`). | Design check Q2 |
| `poison-catalog.test.ts` | The Proxy entry no longer reaches capture's catch path. A `vm` global over a throwing sandbox keeps that path under poison, and its result is asserted. | decision-01 item 2 |
| `zone-inventory.ts`, `zone-analysis.ts` | DEC-8/9 inventories classify the new primordial calls and the moved reads. | No semantic change |
| `tests/tooling/test_adapter_inputs.py` | A Proxy target is refused, not accepted. | decision-01 item 2 |
| `tests/tooling/test_preserved_tools.py`, `test_venv_detector.py` | The register keys they pin follow the converted tests' new declaration lines. The three D05-CHK-05 Proxy acceptances, now refusals, are held for Proxy rather than superseded. | decision-01 item 2 |
| `mutations.json` (11 held witnesses) | Records the candidate refusal. | decision-01 item 2 |
| `mutations.json` (6 `realm.kernel-lexical-*` held witnesses) | The recorded observation is now the Proxy refusal (zero traps, binding unchanged). The claim says so, and the cases stay held for BINDING-01. The 6 matching register reasons follow. | decision-01 item 2; design check Q7 |
| `adoption.json` suite targets (11) | Each declaration names its member's current line. | No semantic change |
| Arguments objects, module namespaces, `JSON.rawJSON` | Refused by internal slot. At B they were `unrepresentable_member`, member issues, or accepted as `{"rawJSON":"1"}`. | Design check Q4 |

### Condition C1

C1 asks that each converted test still kill the mutants its original killed at B. The evidence is in
[c1-ablation-01.md](c1-ablation-01.md), with raw verdicts in [c1-ablation-01.jsonl](c1-ablation-01.jsonl).

**Method.** 87 mutants were run against every leaf of the 9 affected files, at B and at C: 783 runs on each
side. Where a B site splits in two at C, the mutant ran at C as a faithful two-site edit. Each lost kill was
then checked alone.

**Per test.** Of 437 (test, mutant) kills at B:
- 383 are kept.
- 4 are restored by strengthening two ingress conversions in this round.
- 8 were vanished leaves and 5 were cascades, so they were never that test's own kills.
- 37 are no longer reached by the converted test, but other C leaves still kill the mutant.

**Per group:**

| Group | Tests | Kills at B | Still killed at C |
|---|---|---|---|
| creation | 8 | 22 | 22 |
| dispatch | 2 | 8 | 6 |
| ingress | 5 | 19 | 18 |
| outcome-hostile | 1 | 5 | 5 |
| value-diagnostic-work | 17 | 33 | 31 |
| value-refusal-cost | 10 | 33 | 33 |
| values | 26 | 55 | 54 |

The five group-level losses have one cause: on a genuine value, the mechanism they test has no observable
effect.

| Group | Mutant | Why it is lost | Where it is killed at C |
|---|---|---|---|
| dispatch | `MV1`/`VAL-object-read-from-descriptor` | A genuine own data property reads as its descriptor value. | 17 leaves that reach the disagreement through a wrapped-child descriptor hook |
| values, ingress, value-diagnostic-work | `RC-ELEMENT-READ-TWICE` | A second read of genuine own data has no observable effect. | The structural pin `helperContainerUses("observeElement")` |
| value-diagnostic-work | `MV3` | It was seen as a Proxy `ownKeys` count. | The array-symbol refusal and the exact symbol byte charge |

Unchanged leaves lost 33 kills: 17 vanished and 10 cascades at B; 2 `V-FOREIGN-PROTO` on a `Date`, which the
internal-slot check now also refuses; and 4 `E-IDTEXT-CATCH`. `E-IDTEXT-CATCH` is equivalent at C, because the
identity-text classifier can no longer throw. Its catch is kept as a defensive fallback.

**Maintained form.** The group-level kills are registered as seven `value-cost.c1.*` cases, with 162 mutants.

### Corpus

Every brief item is a maintained test with deterministic count and whole-result assertions.

| Item | Maintained test |
|---|---|
| P5 (one root and eight before authority) | `value-refusal-cost.test.ts` |
| R-P1, R-P2, R-P4 and R-P5 | `value-diagnostic-work.test.ts`: "deep prototype diagnostics", the thrown-value tests, "eight eager Outcome roots", and "creation, ingress and recovery" |
| VALUE-DEPTH-01, depths 2, 16 and 31, plus the eight-root Outcome | `capture-work.test.ts` KC3-4 |
| N15 below and above the threshold | `capture-work.test.ts` KC3-5 |
| O-R8-1 (rope flattening) | the string preflight cases and `value-cost.byte-charges` |
| O-R8-2 (a second symbols listing) | the unit-table pins |
| O-R8-3 and O-R8-4 (exotics and re-prototyped built-ins) | `capture-refusals.test.ts` KC3-8 |
| Blocker-01 and blocker-02 Proxies, refused with zero traps including IsArray forwarding | `capture-refusals.test.ts` KC3-7 and the converted decision-03/04 probes |
| PROXY-01 (a Proxy over a re-prototyped Map or `Uint8Array`) | `capture-refusals.test.ts` |
| Earlier cost probes | the KC2 read bounds in `values.test.ts`, the UTF-16 preflight tests in `value-diagnostic-work.test.ts`, and the refusal-cost tests in `value-refusal-cost.test.ts`, carried over |

**Generated corpus.** `capture-corpus.test.ts` declares three slices:
- family × depth × aliasing at width 4,096;
- family × consumer at depth 2;
- width × consumer for three families.

The dimensions and seeds are in the file. It is recorded as a bounded search.

**Added by this round:**
- SELF-K113-RAWJSON-01 (raw JSON);
- the vm-global R2 case;
- the `process.versions` getter case (PXS-1);
- the KeyObject and CryptoKey pins;
- the identity-text Proxy cases (PXS-2);
- the BM-01 and BM-05 stop pins;
- the R4 measurement, recorded as an observation in BASELINE.

### Findings and self-found defects

There were no earlier review findings against this packet. The findings below were self-found during
implementation, in the session's own reviews.

| ID | Defect | Disposition |
|---|---|---|
| SELF-K113-RAWJSON-01 | `JSON.rawJSON("1")` was accepted at B as `{"rawJSON":"1"}`. | Closed: refused by `JSON.isRawJSON` (design check Q4). |
| MS-01 | Hidden own entries (private names, leftover element storage) make a listing's engine work depend on caller input that no observation reports. | **Open: owner question R4.** |
| MS-02 | An array with an extra name skipped its symbols listing, which left the names listing's walk of symbol-keyed members uncharged. | Fixed: the listing is always taken and metered. Bytes and diagnostics are unchanged. |
| MS-03 | Loops outside the traversal had no caps of their own. | Fixed: literal caps, and static rule SC9 with three seeded bypasses. |
| PXS-1 | `isKeyObject` and `isCryptoKey` are JavaScript functions that read the configurable `process.versions`. | Fixed: not called. KeyObject and CryptoKey join the undetectable kinds (a deviation from the design's §4 list). A maintained case shows a throwing `process.versions` getter is never called. |
| PXS-2 | Identity text called `Array.isArray` before testing for a Proxy, so a Proxy's target chain was forwarded. | Fixed: Proxy first, labelled "a Proxy". |
| PXS-3 | A `vm` global over a Proxy sandbox is not a Proxy, yet runs that sandbox's traps. | Declared as residual R2 and pinned. |
| BM-01 … BM-07 | Budget review findings (commit `e47750c0`). BM-01 and BM-05: unpinned stop shapes. BM-02: an oracle assertion that could not fail. BM-03: the eight-root work was not compared with one capture. BM-04 and BM-06: derivation gaps. BM-07: a stale comment. | Fixed. For BM-05, the behaviour is documented and pinned rather than changed. |
| Silent passes | A suite-wide run with per-test refusal counting found two unconverted tests that passed only because their Proxy was refused first. The poison catalog's catch path was no longer reached. | Fixed (`3e6a51d8`). |
| V-ENV load-time references | A module-level template in `capture-instruments.ts` put an intrinsic reference into every importing file's load-time code, so the P1-H detector held all of that file's leaves. | Fixed (`4ba01872`). No converted file adds a load-time intrinsic reference. |
| C1 losses | Two ingress conversions no longer detected the snapshot mutants. | Fixed in this round: a detachment check. |
| Missed witnesses | The six `realm.kernel-lexical-*` held witnesses in `mutations.json` reached capture through a Proxy. I had updated only the 11 witnesses this packet owns. | Fixed in C (`ed461d20`). |
| Stale suite targets | The census regen recomputed the register and the preserved table but not `suite_targets`, so 11 targets kept their members' old lines. | Fixed in `6c7ccd9d`. |

**Notices that are not defects:**
- The catch in `acceptIdentityText` is now defensive only (`E-IDTEXT-CATCH` is equivalent).
- The adoption census changed. Of 1,272 preserved-table members, status moves from held 1,095, superseded 74,
  preserved 49 and refused 54 to held 1,072, refused 162, superseded 1 and preserved 37.
  - Of the 108 status changes, 96 (73 from superseded, 23 from held) are tests whose own span changed in this
    packet.
  - The 12 members that move from preserved to refused keep their own text. They are refused because leaf
    callbacks that run before them in the same file changed: 11 in `values.test.ts` and 1 in
    `dispatch.test.ts`.
  - In the hold register, 716 entries carry over and 211 move. 25 are reclassified from superseded-Proxy to
    held-Proxy, 26 are new and 23 are dropped.
  - No adoption origin is closed (design check Q7), and none is reopened (owner question 2).
- `check:builder-docs` keeps its failure that predates this packet, on the
  `014-owner-progress-summary.md` → `work/DESIGN-AUDIT-01/` link.

### Accepted design found unfit

- **V-D1 exclusion.** The narrowed exclusion (decision-04 item 4, as amended by design check Q5) assumes that a
  listing's engine work is proportional to the length it returns. R4 shows that this is not true for hidden
  own entries.
- **Adoption plan.** Design 01 §3 item 5 (approved) keeps every adoption origin state, but closed origins
  cannot stay complete once their tests change. The TOOLS-01 corpus requires a suite target for a changed
  member of a complete origin, and owner choices 04 and 09 give target building to TOOLS-02.

The options for each are in owner questions 1 and 2 below. This report does not choose either.

## Validation and interpretation

### Verification on clean C

```text
Command (detached, the only verify job running), at C ed461d20edb4bb06868302a76e1a786dfa278d29:
  python3 -B scripts/packet_tools.py verify --revision ed461d20edb4bb06868302a76e1a786dfa278d29 \
    --spec docs/development/work/K1.1-correction-03/verification.json
Node v26.10.0, Python 3.13.16, LANG=C.UTF-8, NODE_OPTIONS unset. Exit 2, about 10 minutes.

stderr:  Checking tool-tests
         Checking inventory
         Checking adoption
stdout:  {"operation": "verify", "result": "invalid",
          "error": "a witness member has another status: packages/kernel/tests/creation.test.ts:362:3@088207d1ce86"}
```

- **Result.** `tool-tests` and `inventory` passed. The `adoption` step got past its census comparison, so the
  stored preserved table and hold register equal the tool's census at C. It then stopped at the first stale
  witness (owner question 2).
- **Earlier runs.**
  - `fc0c477a` stopped earlier, at "a target sits at its member's declaration unless it is an authorized
    replacement: target.dispatch.1477.3.5a8d958ffdab".
  - `6c7ccd9d` stopped at the same witness error as C.
- **Not reported.** Verify stops at the first invalid step, so it did not reach its remaining checks. It
  therefore produced no `checks_passed` and no advisory area report.

### Each remaining verify check, run on its own

These used the same command lines and environment that `verification.json` declares, without the verify
harness.

| Check | Revision | Result |
|---|---|---|
| `registered-mutants` (`mutations` over `mutations.json`) | C | `selected_cases_passed`, 109 of 109 killed |
| `tool-tests` | C | 573 tests, OK |
| `refusal-mutants` (`mutations` over `refusal-guards.json`) | `6c7ccd9d` | `selected_cases_passed`, 314 of 314 killed |
| `value-cost-mutants` (`mutations` over `value-cost.json`) | `6c7ccd9d` | `selected_cases_passed`, 227 of 227 killed |
| `dimensions` (`coverage`) | `6c7ccd9d` | `coverage_reported` |
| `refusal-census` | `6c7ccd9d` | `{"refusal_checks": 314, "registered_mutations": 314}` |
| `oracle-census` | `6c7ccd9d` | `{"oracle_comparisons":29,"registered_mutants":29}` |
| `archive-tests` (snapshot of `9fd2faa7` extracted outside the checkout) | `6c7ccd9d` | exit 0 |
| `typecheck`, `repository-tests`, `kernel-sweeps` | the C payload tree (local runs below) | exit 0; 4,080 of 4,080 tests |

`6c7ccd9d` differs from C only in `mutations.json` (six recorded observations and claims) and the six matching
register reasons in `adoption.json`. As far as I read those checks, none of them depends on those six cases' recorded observations.

### Local runs before C

All runs used Node v26.10.0 on the final payload tree, with no `NODE_OPTIONS`.

| Command | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | exit 0; 4,080 tests, 4,080 pass, 0 fail, cancelled, skipped or todo (B: 3,774) |
| `python3 -B -m unittest discover -s tests/tooling -p "test_*.py"` | 573 tests, OK |
| `npm run test:kernel-sweeps` | exit 0 |
| `npm run check:builder-docs` | exit 1, only on the failure that predates this packet: `014-owner-progress-summary.md: missing target: work/DESIGN-AUDIT-01/` |
| `npm run test:archive-evidence` | needs `ARROKOTHI_EVIDENCE_ROOT`; run with an extracted `9fd2faa7` snapshot (see the table above) |
| `scripts/packet_tools.py mutations` over `value-cost.json` (scratch commit `fb99a69a` with the same tests and registry) | `selected_cases_passed`; 227 of 227 killed across 16 cases |
| B-versus-C differential (`canonicalize`, 2,006 cases, deterministic seed) | 1,993 identical, 13 differ only at the meter stop, 0 other differences |

The differential and the C1 matrices are one-time measurements. Their scripts are in C
(`c1-ablation/`); the differential script was a scratch file and is described here only.

### External evidence

No external fixture or gate is involved, and there was no external decision.

### Checks not run

- A complete verify run with `checks_passed` and its advisory area report. Verify stops at its `adoption` step
  (owner question 2). Its other checks were run on their own, as listed above.
- The live-provider and large-memory/timing profiles, which `verification.json` declares as not run.
- `check:builder-docs` as a gate: it is known to fail at B (`known-base-failure`). It was run, and its result is
  reported above.
- No independent review of this candidate has taken place.

### Why the evidence supports the criteria

This is the implementer's assessment, not acceptance. Each criterion closes by the mechanism and evidence in its
table row: structural mechanisms, maintained deterministic tests and registered mutants. The exceptions are
KC3-3 for R4 (owner question 1) and KC3-11 (owner question 2).

### Design choices, assumptions and remaining risk

- B is a proven bound, not the maximum (design check Q3).
- The static check is a regression guard within its stated scope. The runtime oracle covers the corpus shapes.
- Timing is never a gate.
- **The strongest remaining risk is R4.** A shared object with many private names or deleted elements costs
  engine work that is not metered and repeats with every occurrence. The measurement is in the owner question.
- **The invalidation-01 release is requested against the narrowed claim.** The claim covers only the
  detectable kinds. The undetectable kinds stay accepted as their own data under the cooperative contract
  (design check Q6).
- Envelopes stay under the envelope rule. A Proxy or accessor envelope can still run caller code in the Kernel
  between root captures. That gap is BINDING-01's (design check Q7).

### Third-party review (AGENTS.md)

None. No third-party code, dependency or service was added, copied or adapted. `typescript` and `canonicalize`
are existing dev dependencies. `value-cost.json` declares them as registry inputs with their files' digests
and license files, and does not add them as new dependencies.

## Owner question 1 (brief stop condition): residual R4, hidden own entries

**Stop condition.** The brief says to stop and ask "if … a unit's engine work depends on caller input for a
no-Proxy value and cannot be metered". This packet's own review (finding MS-01) found such a unit, and the
coding agent reproduced it.

**Mechanism.**
- `Object.getOwnPropertyNames` and `Object.getOwnPropertySymbols` walk every own entry of an object, including
  entries they never return: private names, and the element storage that deleted indices leave behind.
- Capture charges a listing `1 + returned length`. For an object carrying many such entries, the listing unit's
  engine work therefore grows with caller input.
- No JavaScript observation reports how many such entries an object has, so the meter cannot charge them.
- The listing's charge does not stop the root either, so with sharing the cost repeats on every occurrence.
  This differs from R1, where the charge itself stops the root.

**Evidence.** Node v26.10.0, this VM; timing is an observation, not a gate. A plain object (prototype
`Object.prototype`) receives private fields through the base-class return-override pattern
(`class Base { constructor(o) { return o; } }`, then `new (class extends Base { #p = 0 })(obj)`, repeated).
Results for `captureWithWork`, with the object alone and shared 1,024 times behind one refused position:

| Private fields | Alone | Shared 1,024 times |
|---|---|---|
| 0 | accepted, 3 units, 1.5 ms | refused, 5,122 units, 7 ms |
| 10,000 | accepted, 3 units, 0.5 ms | refused, 5,122 units, 270 ms |
| 100,000 | accepted, 3 units, 7.5 ms | refused, 5,122 units, 5.1 s |

- The costliest acceptance (3,094,930 units) takes about 3 s.
- The review measured about 78 s for 4 × 4,096 occurrences (2.6% of B).
- It measured 39 s for the eight-root Outcome before authority, from a visible caller with no grant.
- An object with keys 0..199,999 set and then deleted shows the same effect at a smaller scale. That case
  depends on V8's heuristics.

**What does not fix it:**
- A per-object count: none exists for private names or element-store capacity.
- A time threshold: the brief and decision-05 forbid one.
- Reusing an object's listing across its occurrences. This would reduce the work to once per distinct object,
  bounded by what the caller itself allocated. But it is "observation reuse", which decisions 03/04 prohibit and
  decision-01 item 2 did not lift.

**Options:**
1. **Declare R4 as a residual (recommended).** No code change.
   - `values.md` and BASELINE already state R4 as the fourth residual, alongside R1–R3 (design check Q5).
   - The narrowed claim then excludes hidden own entries, under the cooperative contract of DESIGN-AUDIT-01
     decision-01 item 1, just as Q6 excludes the undetectable built-in kinds.
   - The lasting fix is BINDING-01's. Under CORE the Kernel core never observes caller objects, and the wrapper
     runs on the caller's side.
2. **Authorize per-capture reuse of an object's structural observations:** its prototype, its internal-slot
   test and both listings, keyed by identity in a Kernel-created map.
   - Repeated observations of one ordinary object within one capture cannot differ, because capture runs no
     caller code once Proxies and accessors are refused.
   - Host objects with interceptors (R2) are the exception, so their semantics would change.
   - This needs an amendment of the observation-reuse prohibition, a design note and a review.
   - Units and diagnostics would stay per occurrence.
3. **Hold the V-D1 claim for objects with hidden own entries** and release the rest. This is a narrower hold
   than invalidation-02.

Until the owner answers, this report does not claim KC3-3 for R4, and the packet is not marked ready for
review.

## Owner question 2: the adoption corpus after the test conversions

**What fails.** Verify's `adoption` step (`corpus` over `tests/fixtures/packet-tools/adoption.json`) cannot
return `revalidation_complete` at C. TOOLS-01's corpus requires two things:
- every held or superseded witness's members to keep that preserved status (`witness_records`);
- every member of a complete origin to route to a linked witness or target (`origin_closure`).

The 69 owner-authorized conversions change tests that the census held or superseded. A changed member's
preserved status becomes `refused`, and a refused member in a complete origin needs a linked suite target.

**Counts at C.** These are my reading of the tool's rules; the tool stops at the first error.
- 96 members move to `refused` because their own span changed: 73 were superseded and 23 held. Each has a
  witness row (`witness.<file>.<line>.<col>.<pin>`) that no longer matches its member.
- 12 preserved members move to `refused` because earlier leaves in their file changed.
- 15 complete origins link the 96 stale witnesses. In 10 of them, 78 distinct members are now refused with no
  linked target:

| Origin | File | Members |
|---|---|---|
| `artifact-ebfa0eb3…` | `values.test.ts` | 37 |
| `artifact-22eb3398…` | `value-diagnostic-work.test.ts` | 13 |
| `artifact-6c57cc9d…` | `creation.test.ts` | 11 |
| `artifact-febb180b…` | `creation.test.ts` | 11 |
| `artifact-510be2a0…` | `ingress.test.ts` | 6 |
| `artifact-bca863b0…` | `dispatch.test.ts` | 4 |
| `artifact-f468517a…` | `value-refusal-cost.test.ts` | 3 |
| `artifact-98679309…` | `poison-catalog.test.ts` | 2 |
| `artifact-bb7722eb…` | `aggregate-refusal.test.ts` | 1 |
| `artifact-7902341b…` | `outcome-hostile.test.ts` | 1 |

**Why this is an accepted-design question.** Design 01 §3 item 5 (approved) planned that `adoption.json` keeps
every origin state and closes none, with targets left to TOOLS-02 (owner choices 04 and 09; design check Q7).
That plan cannot hold: an origin closed through witnesses on tests that this packet must change cannot stay
complete without new targets. Neither the brief nor the design check foresaw this.

**What this round did.**
- Recomputed the hold register and preserved table with the tool's own functions.
- Moved 11 suite-target declarations to their members' current lines. This was the first `invalid` at `fc0c477a`.
- Did not edit origin states, witnesses or closures. Every option below changes TOOLS-01 adoption records,
  which need the owner.

**Options:**
1. **Build the targets in this packet:** behavior counterexamples and suite targets, with anchors and readings,
   for the 78 members, and remove or re-kind the 96 stale witnesses.
   - Every origin stays complete.
   - This widens the packet into work that owner choices 04 and 09 give to TOOLS-02.
   - It is about as large as a TOOLS-01 continuation round.
2. **Reopen and transfer (recommended).**
   - The affected complete origins go to `pending_revalidation`, and the stale witness rows are removed or
     re-linked.
   - A short owner record transfers those origins to TOOLS-02, with a pinned list, through `transferred` /
     `transfer_lists`. The `adoption` step then reports `revalidation_complete`, with those origins explained.
   - This is mechanical. It says plainly that the closures no longer hold for the changed tests, and leaves
     target building with TOOLS-02.
   - It needs an owner decision record, which the implementer cannot write.
3. **Accept a non-passing `adoption` step for this packet:** amend KC3-11 so that this one check reports
   `extraction_pending`, and record the repair as TOOLS-02 work. This leaves the corpus inconsistent at C until
   TOOLS-02 runs.

Until the owner answers, KC3-11 is not met.

## Handoff

- **Ready for independent review?** No. The packet waits on owner questions 1 (R4) and 2 (adoption).
  - Under question 1, option 1, the candidate needs no code change.
  - Under question 2, option 2, it needs the reopened origin states and the witness edits in `adoption.json`,
    then a new clean C, verify and H. 007 would move to WAITING_FOR_REVIEW only then.
- **Requested on acceptance (not lifted here):**
  - release of the [invalidation-02](../K1.2/invalidation-02.md) V-D1 claim hold, under the metered meaning and
    the declared residuals;
  - release of the [DESIGN-AUDIT-01 invalidation-01](../DESIGN-AUDIT-01/invalidation-01.md) classification
    hold, against the narrowed claim (detectable kinds only, design check Q6).
- **External handoff:** B, C and H, with the verified push SHA.
- **No self-acceptance.** Successor release stays with the owner.
