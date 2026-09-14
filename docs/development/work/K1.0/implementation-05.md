# Implementation report — K1.0, round 5 (correction)

## Identity

- **Packet:** K1.0 — target boundary and legacy quarantine. **Parent milestone:** K1.
  **Contract:** [`contract.md`](contract.md), revision 5.
- **Governing process baseline:** this repository's integrated `docs/development/` documents at the
  base commit — [006](../../006-development-process.md), [007](../../007-work-packets.md),
  [008](../../008-implementation-report.md), [012](../../012-review-methods.md),
  [013](../../013-structure-and-evidence-sequencing.md). This candidate changes none of them.
- **State:** CHANGES_REQUESTED → IN_PROGRESS → WAITING_FOR_REVIEW. No verdict is entered here and
  none is claimed.
- **Correction handoff acted on:** [review-04.md](review-04.md), recorded by
  `a9775ab13f6a5a8b465c1f390a7cd6e81cad8a61`, which is exactly one administrative commit containing
  only that record. Open findings **K10-R4-01** (P2) and **K10-R4-02** (P2); C4 the only failing
  criterion. No owner supplemental decision; no unresolved authority.
- **Owner release and its provenance:** unchanged from round 1 — the owner's verbatim 2026-09-13
  instruction releasing K1.0 and directing that the benchmark E1 dependency be treated as the
  already-built but unaccepted fixture preparation, quoted in the contract's *Release provenance*.
- **Prerequisite ACCEPT and integration identities:** unchanged. K0.2 accepted at H16
  `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2`, integrated as
  `0535160e677231da41b06d9f822e62e2f0364dd1`. The benchmark E1 preparation remains built and
  **accepted by nobody**: `codex/e1-kernel-acceptance-capture`, payload
  `d8f17549c31f9ee5d995e773c2f211faed2785fb`, candidate `8de04779d279dba82cf834d419e465d2b677ef46`,
  `BLOCKED_EXTERNAL`, not merged.
- **Branch and configured remote:** `codex/k1.0-target-boundary-legacy-quarantine` on `origin`
  `https://github.com/ArrokothI/arrokothi.git`.
- **Base:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`, unchanged across all five rounds.
- **Previous reviewed H and its review record:** H4 `14cc1c1997573ac434b2491653ab4cb974abf633`,
  reviewed `CHANGES REQUIRED` by [review-04.md](review-04.md). Rounds 1–3 and their reviews are
  preserved.
- **Payload C:** `6fd225e0115d6b91bd5088e22d41d137088d9688`. Two correction payload commits after the
  round-4 review record: `bbc9a9df610ba58a81191177e63b235403f3d7cd` (the two findings) and
  `6fd225e0115d6b91bd5088e22d41d137088d9688` (K1.0-SELF-09, found by this round's own validation run).
  History is preserved, not rewritten.
- **Candidate H:** the commit containing this report. Its full SHA is supplied in the external
  handoff, since a commit cannot name itself.
- **Exact C..H administrative file allowlist:**
  - `docs/development/work/K1.0/implementation-05.md` (this report)
  - `docs/development/work/K1.0/validation-05/MANIFEST.md` and its nine `0*.log` attachments
  - the K1.0 status-row transcription in `docs/development/007-work-packets.md`
  - the matching live-summary sentences in `docs/development/README.md` and
    `docs/development/001-current-status-and-roadmap.md`

  Nothing else. No script, fixture, schema, test, threshold or configuration is in that interval.
  Note that `validation-04/MANIFEST.md` is **payload in C**, not an H attachment: correcting an
  evidence record is a substantive change, and 006 requires it to be carried in a new candidate.
- **Working-tree state:** clean at C when every command in `validation-05/` ran.
- **Push status:** pending at the time of writing. The verified advertised remote SHA is supplied in
  the external handoff after the push; this report certifies no future push.

## Changes and coverage

### Change groups

`H4 → C` is six files.

| Group | Paths | Finding |
|---|---|---|
| Total row accounting for all four keyed tables | `tests/conformance/architecture/inventory-oracle.ts` | K10-R4-01, K1.0-SELF-08 |
| Dependency table moved to the shared parser; new controls | `tests/conformance/architecture/kernel-landing-zone.test.ts` | K10-R4-01, K1.0-SELF-08 |
| Evidence-record guard (new) | `tests/conformance/architecture/evidence-records.test.ts` | K10-R4-02, K1.0-SELF-09 |
| Superseding correction note | `docs/development/work/K1.0/validation-04/MANIFEST.md` | K10-R4-02 |
| Contract revision 5 | `docs/development/work/K1.0/contract.md` | both |

### K10-R4-01 — parsing made total

**Governing invariant.** C4 claims the executable oracle rejects a materially wrong inventory row.
A row that carries a recognisable key and then fails to parse is exactly such a row, so it must be
accounted for rather than discarded.

**The defect, exactly.** `parseDependencyTable` parsed the file-count cell and `continue`d on `NaN`
**before** the duplicate check, and recorded the dropped row nowhere. A row like
`| `target-kernel` | not-a-count | `@arrokothi/core` | nothing |` therefore vanished in either
position: no duplicate, no unreadable row, and the correct row made recomputation green. It is the
same disappearing-row failure K10-R3-01 closed for well-formed duplicates, reached through parse
failure instead of last-write-wins.

**The rebuild.** Every candidate data row in every keyed table now ends in exactly one outcome —
recorded, reported as a duplicate key, or reported as unreadable — with the key taken and checked
for uniqueness **before** the rest of the row is parsed, and the key marked seen even when the rest
fails to parse. Failing to parse is no longer a way to be ignored. The four keyed tables share one
`readKeyedTable` in `inventory-oracle.ts` rather than three there and one inline in the test file;
that split is why the dependency table could drift from a strictness principle the other three
already had, and closing the split is what stops a fifth table from getting its own weaker loop.
Each table keeps its established duplicate wording, so round 4's six duplicate controls still assert
the same messages.

**Distinguishing evidence** ([`08`](validation-05/08-r401-demonstration.log)), round-4 helper versus
committed, against the real document:

| Case | Round 4 | Committed |
|---|---|---|
| baseline, unmutated | 0 | 0 |
| malformed keyed row **before** the correct row | **0** | 2 |
| malformed keyed row **after** the correct row | **0** | 1 |
| row with no recognisable key | **0** | 1 |
| well-formed duplicate before (retained K10-R3-01) | 1 | 1 |
| well-formed duplicate after (retained K10-R3-01) | 1 | 1 |

Three new controls drive the same parser the real C4 check uses; the six round-4 duplicate controls
and all ten round-3 relational controls are unchanged and still pass.

### K10-R4-02 — the evidence record corrected, and the class guarded

**The defect, exactly.** `validation-04/MANIFEST.md` recorded the `07-test-sdk.log` digest as a
52-character value. A hex SHA-256 has 64. The true digest is
`dd227f9ffd8ab92b4e77570cd9ea294559dbbbad00b172e3bb575a7f1cad1470`, and the recorded value is that
digest with a twelve-character run, `ad00b172e3bb`, dropped from offset 38 — prefix and suffix
otherwise identical. A transcription defect, not a different file.

**The log is intact.** `git diff 14cc1c19… <C> -- validation-04/07-test-sdk.log` is empty and the
file's digest at round-4 H equals the value above. The log records 22 SDK tests passing, 0 failing,
and `03-test-full.log` contains the same cases. No SDK behaviour claim changes, and the reviewer says
so too.

**How it is corrected.** 008 requires corrections to provenance to be new superseding notes rather
than rewrites, so the original row is left exactly as recorded and a dated correction section is
appended beneath it, giving the true digest and the nature of the defect. Because that is a
substantive evidence change, `validation-04/MANIFEST.md` is payload in C rather than an H attachment.

**Adjacent paths** ([`09`](validation-05/09-digest-audit.log)). Every digest in every K1.0 validation
manifest was audited: **36 across rounds 1 to 4, one defect — this one.** The other 35 are well-formed
SHA-256 values that match the files they name.

**The class is now guarded.** `evidence-records.test.ts` asserts three properties, each of which
would have caught this alone: every log's true digest appears in its manifest; every row's recorded
digest is either correct or explicitly superseded by a correction section naming both the file and
its true digest; and no token presented as a digest has an impossible length outside a correction
section that quotes it. A fourth case proves the guard is not vacuous by reproducing K10-R4-02's
exact 52-character shape on an in-memory copy and showing two properties fail. This is process
hygiene under 006/008 and adds **no acceptance criterion**.

### Why the previous pass missed both

- **K10-R4-01.** Round 4 read K10-R3-01 as "last-write-wins erases a duplicate" and added a duplicate
  check to each keyed loop. It added the check to the dependency helper too — but placed it after the
  existing count parse, inside a loop whose first move had always been to discard anything it could
  not read. The question asked was "is a duplicate detected?", not "can a row leave this loop without
  being accounted for?" The three ownership tables happened to answer both, because their malformed
  branch already pushed to `unreadable`; the dependency helper, living inline in the test file rather
  than beside them, had no such branch and nobody compared the four.
- **K10-R4-02.** Digests were produced by `shasum` and pasted into a generated manifest. Nothing read
  them back. Every round's manifest was reviewed for content and none for identity well-formedness,
  which is precisely why a 52-character value survived four rounds of review until an independent
  reviewer counted the characters.

Both are the same shape as earlier rounds: a check that cannot fail on the case it claims to cover.
The response is the same — the falsifying artifact first, then the design.

### Prior findings

| Id | Round | Disposition |
|---|---|---|
| **K10-R4-01** | 4 | **Closed.** Parsing made total across all four keyed tables, sharing one parser; three new controls; round-4 duplicate controls unchanged. Evidence `08`. |
| **K10-R4-02** | 4 | **Closed.** True digest recorded in a superseding note, original row preserved; all 36 digests re-audited; class guarded mechanically. Evidence `09`. |
| K10-R1-01/-02, K10-R2-01/-02, K10-R3-01 | 1–3 | Closed in their rounds and preserved in [implementation-01](implementation-01.md) … [implementation-04](implementation-04.md). All their controls still pass unchanged. |
| K1.0-SELF-01 … -07 | 1–3 | Closed in their rounds; controls unchanged. |
| K0.2-SELF-01 | K0.2 | Remains closed. |

### Additional self-found defects (separate provenance)

| Id | Defect | Disposition |
|---|---|---|
| **K1.0-SELF-08** | The Zones loop discarded a short row carrying a recognisable key — the same fail-open shape as K10-R4-01, in a table round 4 had cleared. Found by re-deriving the property across all four tables rather than only the one the review named. | **Fixed** in C by the same total-accounting rule; asserted for all three ownership tables. |
| **K1.0-SELF-09** | `evidence-records.test.ts` read every `validation-*/MANIFEST.md` on disk. During evidence capture the current round's directory exists with logs and no manifest yet, so `npm test` failed with ENOENT on the very run meant to produce that manifest — the guard's result depended on capture ordering. Found by this round's own validation run, before handoff. | **Fixed** in `6fd225e0…`. A manifest-less round records no digests and is skipped; the four reviewed rounds must each be present and checked, asserted explicitly. Verified both ways: 4/4 on the committed tree and 4/4 with a simulated mid-capture round. |
| **K1.0-SELF-10** | While drafting `validation-05/MANIFEST.md` I wrote a forty-character value for the round-4 H that was not the real commit — the same class of defect as K10-R4-02, in the very manifest correcting it. | **Fixed before commit.** The real H4 is `14cc1c1997573ac434b2491653ab4cb974abf633`. Every identity in the new manifest was then verified mechanically: all three commit SHAs resolve to real objects and all nine digests match their logs. Reported rather than quietly corrected, because a fabricated identity is exactly what round 4 caught. |

### Unresolved obligations and their unblock conditions

1. **`tests/conformance/k0` remains frozen** — its comment still names the pre-rename guard path;
   bytes pinned by benchmark E1. Assigned to K1.4.
2. **The allowed-leaf list is empty**, so the real tree never exercises a non-empty allowlist; two
   fixture controls do. Unblocked by K1.1.
3. **Three deliberate extractor exclusions** — `reference lib`, JSDoc import types, bare `require()` —
   recorded in the contract's limits.
4. **The evidence-record guard checks manifests, not reports.** A digest quoted in an
   `implementation-*.md` is not compared to anything; only manifests are. Extending it is available to
   any later packet that wants it, and is not claimed here.
5. **Static guarantees only.** These guards constrain dependency direction in source and the accuracy
   of this packet's own records. They establish nothing about durability, isolation, Driver fidelity
   or protocol correctness.

## Validation and interpretation

Exact commands, environment, exit codes, counts and digests are in
[`validation-05/MANIFEST.md`](validation-05/MANIFEST.md). All ran from
`/Users/rex-shih/Documents/ArrokothI/arrokothi` against the clean payload tree at C, on
Node v25.2.1, npm 11.6.2, TypeScript 5.9.3, Darwin 25.6.0.

| Command | Exit | Result |
|---|---|---|
| `npm run typecheck` | 0 | clean |
| `npm test` | 0 | 1899 tests, 285 suites, 0 fail, 0 skipped |
| `npm run test:conformance` | 0 | 1786 tests, 266 suites, 0 fail, 0 skipped |
| `npm run check:builder-docs` | 0 | 26 Markdown files, 284 links/anchors, 38 public package imports |
| `npm run test:kernel` | 0 | 4 tests, 0 fail |
| `npm run test:sdk` | 0 | 22 tests, 0 fail |

Suite 1892 → 1899; architecture 185 → 199. Nothing removed, skipped or weakened;
`legacy-core-boundaries.test.ts` still reports the same 13 assertions it had at base, and
`tests/conformance/k0` is byte-identical to the base.

**Checks not run.** `npm run test:evals` — this packet changes no Agent or model-facing behaviour and
nothing in the diff is reachable from an eval. The limit is that this candidate offers no evidence
about Agent behaviour and claims none.

**External fixture, gate and decision, stated separately.** Unchanged: the benchmark E1 preparation
was inspected, not executed, and is accepted by nobody. No E1 schedule ran here, no E1 criterion is
closed, and the structural pass earns no evidence credit.

**Why the evidence supports C4** (implementer assessment, not acceptance). C4 failed because a
materially wrong row could leave the parser unaccounted for. The property is now stated over every
candidate data row in every keyed table, enforced by one shared parser, and demonstrated against the
round-4 implementation on the three cases it dropped and the three it already caught. The strongest
thing that would still get past it is a wrong assertion in *prose* outside the four tables, which no
oracle here reads and which the contract does not claim to check.

**Design choices.** Moving the dependency table into `inventory-oracle.ts` was preferred over
patching the inline helper: the review noted the inconsistency with `parseInventory`, and one shared
parser makes the strictness structural instead of a convention four loops must each remember. The
evidence guard tolerates a wrong historical value only where a correction section quotes it, so
history stays visible without the record being wrong.

**Owner amendments.** None this round. The round-1 E1 dependency amendment stands.

**Strongest remaining risk.** Unchanged: these are static guarantees about source and about this
packet's own records. A future packet could satisfy every rule here and still reproduce the legacy
execution model in new files inside the zone; K1.4's behavioural recheck is where that would surface.

**Third-party review under AGENTS.md.** None. No dependency was added, no third-party source copied,
adapted or vendored; `package-lock.json` is unchanged this round.

## Handoff

- **Ready for independent review.** Both open findings are closed with distinguishing evidence that
  fails against the previous implementation. Three additional defects were self-found this round and
  are reported with separate provenance, including one fabricated identity I caught in my own draft
  manifest and corrected before commit. Five obligations are recorded unresolved with named unblock
  conditions.
- Base, previous reviewed H4, C and H, and the verified push SHA are supplied in the external owner
  handoff.
- No self-acceptance is claimed, nothing is merged, and no successor is started or released.
