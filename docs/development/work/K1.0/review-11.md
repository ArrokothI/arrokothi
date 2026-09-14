# K1.0 independent review — round 11

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H10: `a0a4988b8f4b38709700e1fc38cd0f08de74e3fa`;
- round-10 review record: `docs/development/work/K1.0/review-10.md`, recorded by
  `74aee7aa5585fb036bc413a8591b6dbb428ffc1f`;
- clean round-11 payload C: `6880b4825ed1aa2363f8366431052f88d6955be8`;
- submitted round-11 H: `4cd711f71fcafb64ffaa7d49a715d05eaec3c2dc`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
review-10, contract revision 11, the complete correction delta, the cumulative base-to-C history,
the affected C4 oracle/tests, implementation-11 and validation-11. I also checked the published
GitHub Flavored Markdown specification at `https://github.github.com/gfm/` because the correction and
the one remaining finding turn on exact HTML-block start conditions and container/leaf lifetime.

I rechecked the benchmark E1 preparation read-only. Its preparation branch remains at H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`; benchmark `main` remains
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`. It is still preparation accepted by nobody, not an
E1 result.

I do **not** have a local executable checkout in this reviewer session, so I did not independently
rerun the commands. I inspected the immutable clean-C logs and committed source/tests. The remaining
finding follows directly from the committed regex and the published GFM type-6 start condition; it
does not depend on an unobserved run.

Identity / interval verification:

- H10 → review-10 is exactly one review-record commit adding only `review-10.md`;
- `74aee7aa…` → C is exactly one correction commit touching only contract revision 11,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit containing implementation-11,
  validation-11's manifest/nine logs and the matching 001/007/README status transcriptions;
  no source, test, fixture, evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 packet history; no unrelated packet payload was found;
- `tests/conformance/k0` is recorded byte-identical to the governing base.

## Independent cumulative coverage

I repeated cumulative coverage rather than reviewing only the three round-10 literals:

1. **C1 ↔ C2 ↔ C9:** the target Kernel dependency boundary, forbidden-edge controls and scanner
   soundness must remain transitive/non-vacuous across direct, type-only, barrel, dynamic and
   fail-closed unresolved forms.
2. **C3 ↔ C6 ↔ C7:** the target package must remain private/refusal-only while the supported legacy
   surface, public exports and retained legacy regressions remain unchanged.
3. **C4 ↔ C5:** ownership/export/dependency inventory facts must agree relationally with executable
   policy, and the Markdown reader must not hide asserted rows or manufacture rows by misclassifying
   surrounding block structure.
4. **C8:** E1 preparation stays pinned, external and explicitly unaccepted.
5. **Process/evidence:** exact C/H scope, clean-C evidence, status, no K1/E1/successor claim.

## Prior finding disposition

### K10-R10-01 — CLOSED

The container/leaf lifetime reconstruction is materially correct at the reviewed boundary. Fence and
HTML leaves now record `ownerDepth`. Before continuing an already-open leaf, `scanTransitions` checks
whether a nonblank current line is dedented below that owner's content indent; if so it pops the
container, kills the owned leaf, and then processes that same physical line through the normal path.
The transition audit shows the formerly swallowed top-level heading becoming eligible on that same
line. Top-level owner-0 leaves retain their run-to-document-end behavior.

The controls distinguish H10 from C for the review's bullet/ordered unclosed fences, list-local type-7
and type-1/comment blocks, preserve a properly closed local fence, and exercise inner-vs-outer nested
container boundaries. This closes the round-10 container-owned-leaf defect.

### K10-R10-02 — CLOSED

`parseCompleteTag` now requires actual whitespace before each new attribute, while allowing tag end
without whitespace and preserving optional spaces around `=`, quoted `<`/`>`, unquoted exclusions,
valueless attributes and attribute-free closing tags. The exact GFM malformed form
`<a href='bar'title=title>` and adjacent single/double-quoted variants are now ordinary text, while
valid multi-attribute and self-closing tags remain raw-block starts.

### K10-R10-03 — CLOSED

The implementation is now truthfully pinned to the published GFM 0.29 raw-HTML rule set used by this
packet: type 1 is `script`/`pre`/`style`; complete `<textarea>` therefore falls through to type 7 and
uses its blank-line end condition; the type-6 list no longer contains `search`, while a complete
`<search>` line may still enter type 7. The committed bidirectional controls distinguish the prior
hybrid behavior and preserve the intended neighboring cases.

These three closures are substantive progress. The finding below is a narrower remaining type-6
boundary-token error, not a failure of the new owner-depth reconstruction.

## Finding

### K10-R11-01 — P2 — type-6 HTML start accepts a bare `/` (and literal `$`) after a block tag name

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `parseHtmlBlockStart`; K1.0-C4's
published-GFM block classification and inventory-proof claim.

The committed type-6 start check is:

```ts
const type6 = new RegExp(`^<\\/?(?:${HTML_BLOCK_TAGS})(?=[\\s>\\/$]|$)`, "i");
if (type6.test(rest)) return { kind: 6 };
```

The published GFM type-6 start condition is narrower: after a recognized block tag name there must be
whitespace, end of line, `>`, or the **exact string `/>`**. A bare `/` is not enough. `$` is not a
boundary token at all. The character class above nevertheless accepts either `/` or `$` independently.

A distinguishing mutation inside `## Deferred extraction and bridge owners` is:

```markdown
| DX-12 | `packages/core/src/ports/controller.ts` | refused | K1.1 | existing row |

<div/ x>
## What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | planted row |

## What this packet does not establish
```

Under the pinned GFM rules, `<div/ x>` is neither a valid type-6 start (the slash is not `/>`) nor a
complete type-7 tag. It is ordinary text. The first exact ATX heading is therefore real and terminates
the Deferred section; the planted table lies outside that governed section, so this mutation should
remain green.

H11 instead matches the bare slash in `[\\s>\\/$]`, opens an HTML-6 raw block, treats the first
heading as raw until the blank line, and leaves the planted table before the later real heading. The
C4 parser can then manufacture a further-Deferred-table disagreement from a valid document. The same
classification error exists for a spelling such as `<div$foo>` because `$` is also admitted by the
character class.

**Impact:** C4 still does not implement the exact raw-HTML grammar it claims. This is a false-positive
proof defect: valid ordinary Markdown can be promoted to a type-6 block and change section/table
membership.

**Required outcome:** encode the type-6 post-name condition as whitespace, `>`, exact `/>`, or EOL —
not as a character class containing `/` or `$`. Drive the production parser with at least:

- `<div/ x>` ordinary, followed by the real heading and an outside planted table;
- another lone-slash form such as `<div/foo>` or `<div/` staying ordinary;
- `<div$foo>` staying ordinary;
- valid `<div/>` remaining type 6;
- valid `<div>` remaining type 6;
- a valid whitespace form such as `<div class=x>` still entering type 6.

Audit the other raw-HTML start-condition token boundaries while making this narrow repair, but preserve
the accepted owner-depth, complete-tag separator and GFM-0.29 rule-set work. Add a pinned H11→C
counterexample demonstration; do not weaken the further-table oracle to make the malformed starts green.

## Validation and evidence assessment

I inspected validation-11's manifest and raw result tails. The clean payload is
`6880b4825ed1aa2363f8366431052f88d6955be8` under Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 / Darwin 25.6.0 arm64. The immutable logs record:

- `npm run typecheck`: exit 0;
- `npm test`: 1990/1990, 293 suites, zero fail/skipped;
- `npm run test:conformance`: 1877/1877, 274 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links-or-anchors / 38 public imports;
- target-kernel: 4/4; SDK: 22/22;
- H10→C demonstration: 31 cases, 11 distinguishing and 20 agreeing as required;
- structural audit: 11 windows, one transition per physical line, owner-depth/closure and same-line
  eligibility recorded;
- `tests/conformance/k0`: byte-identical to base.

Those results credibly support the cases exercised. None challenges a type-6 recognized tag followed
by an invalid lone slash or literal dollar, so the green suite does not distinguish K10-R11-01.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and makes no eval-dependent claim.

## Cumulative non-C4 observations

The cumulative target package remains private and implements no Activation/Outcome protocol. Its root
exports only the explicit unsupported-surface refusal machinery. The executable boundary policy keeps
the target-zone allowlist empty and records all twelve deferred extraction/bridge/refusal owners; the
human inventory records the same four zones, measured dependency rows, package export ownership and
those twelve assignments. I found no round-11 change to the C1/C2/C9 scanner/graph machinery, legacy
source, public export surface, E1 material or frozen K0 fixture.

The report's SELF-21 observation — absolute indentation versus container-relative fence recognition
inside a wide-marker list item — remains non-blocking in this bounded oracle based on the evidence
inspected: the affected content remains container-local/non-governed in either classification and no
C4 observable mismatch was demonstrated. It is not treated as proof of general Markdown equivalence.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Target source/dependency policy is unchanged by round 11; target root remains isolated and no new target dependency is introduced. |
| **K1.0-C2** | **PASS** | Existing forbidden-edge controls and shared violation/walk machinery are unchanged; correction is confined to C4's evidence parser/tests/contract. |
| **K1.0-C3** | **PASS** | Clean-C typecheck/full-suite evidence is green at 1990/1990; no legacy source or public export changes occur in the correction delta. |
| **K1.0-C4** | **FAIL** | R10-01/-02/-03 are closed, but type-6 block-start classification still accepts bare `/` and `$`, allowing valid ordinary text to alter governed section/table membership. K10-R11-01. |
| **K1.0-C5** | **PASS** | All twelve deferred extraction/bridge/refusal rows remain assigned to concrete packet owners in executable policy and inventory. |
| **K1.0-C6** | **PASS** | Target package remains `private`, refusal-only, with no protocol implementation, no-op API, E1-success or release claim. |
| **K1.0-C7** | **PASS** | Legacy attribution/regressions and the accepted dependency-scanner reconstruction remain unchanged; conformance evidence is green at 1877/1877. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation identities remain pinned and unaccepted; this candidate still claims no E1 result. |
| **K1.0-C9** | **PASS** | Dependency extraction/prose-soundness machinery is unchanged by the correction; no evidence invalidating its prior reconstruction was found. |

No architecture ambiguity or unavailable mandatory evidence blocks the correction. The remaining
finding is a deterministic same-packet C4 parser defect.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 11 made substantive progress: all three round-10 findings are closed and the container/leaf
model is materially stronger. This is not a local-minimum/stuck signal. K1.0 cannot yet be accepted
because the type-6 raw-HTML boundary still has one deterministic grammar escape.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H 4cd711f71fcafb64ffaa7d49a715d05eaec3c2dc;
review record docs/development/work/K1.0/review-11.md.
Open finding K10-R11-01; required outcome and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none.
Apply 006/012 narrowly at C4's published-GFM raw-HTML start boundary: correct the exact type-6
post-tag-name token condition and audit neighboring start-condition tokens, while preserving the
accepted container-owned leaf lifetime, complete-tag attribute grammar, GFM-0.29 pin, structural
section/table accounting, relational comparisons and dependency-scanner reconstruction.
Re-review the whole cumulative packet and record any additional in-scope defect separately.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
