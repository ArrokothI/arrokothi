# K1.0 independent review — round 10

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** accountable independent reviewer; I did not implement this candidate.

## Candidate binding and access

This review binds only to submitted candidate H:

- governing process / review base: `c9a9ed7e6e538ab0542fc6a999426264abb6212a`;
- previous reviewed H9: `4d7ebb9590c4a0a8da8fff4f5fa79c753eff2120`;
- round-9 review record: `docs/development/work/K1.0/review-09.md`, recorded by
  `784ab871d868693a1984c021b1f23392065cb79e`;
- clean round-10 payload C: `549e215abba1b9e8737d29c6800af07c8406b8ff`;
- submitted round-10 H: `a0a4988b8f4b38709700e1fc38cd0f08de74e3fa`;
- branch: `codex/k1.0-target-boundary-legacy-quarantine`.

At review start the advertised branch SHA was exactly H and advertised `main` remained exactly the
recorded base. I inspected the pinned repository through the authorized GitHub connector, including
review-09, contract revision 10, the complete round-10 correction delta, the cumulative base-to-C
file set, the affected C4 oracle/tests, implementation-10 and validation-10. I also checked the
published GitHub Flavored Markdown specification at `https://github.github.com/gfm/` because all
three findings below turn on exact block/container or raw-HTML grammar.

I rechecked the benchmark E1 preparation branch read-only. It remains at H2
`8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`, while benchmark `main` remains
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`. The preparation is still not an accepted E1 result.

I do **not** have a local executable checkout in this review session, so I did not independently
rerun the full commands. I inspected the immutable clean-C logs and committed source/tests. The
counterexamples below follow directly from the committed state machine plus the published GFM block
rules and do not depend on an unobserved command.

Identity / interval verification:

- H9 → the round-9 review record is exactly one commit adding only `review-09.md`;
- `784ab871…` → C is exactly one correction commit touching only contract revision 10,
  `inventory-oracle.ts`, and `kernel-landing-zone.test.ts`;
- H's parent is exactly C;
- C → H is exactly one report/evidence/status commit: implementation-10, validation-10's manifest
  and nine logs, plus matching 001/007/README status transcriptions; no source, test, fixture,
  evaluator, threshold, package or configuration payload first appears in H;
- base → C remains the cumulative K1.0 packet history; no unrelated packet payload appears in the
  changed-file set;
- `tests/conformance/k0` is recorded byte-identical to base.

## Independent coverage and prior-finding disposition

I derived the same cumulative obligation map from 007/013 and the contract before relying on the
implementation report:

1. **C1 ↔ C2 ↔ C9:** target Kernel quarantine, transitive/type-only/barrel/dynamic import
   enforcement, forbidden-edge controls and source/prose agreement must remain intact.
2. **C3 ↔ C6 ↔ C7:** public/legacy behavior, refusal-only target scaffolding and useful regressions
   must remain unchanged while C4's oracle is corrected.
3. **C4 ↔ C5:** the human inventory and executable ownership/dependency facts must agree, and the
   Markdown evidence parser must neither silently delete an asserted relation nor manufacture one
   from content that GFM places in another block/container.
4. **C8:** E1 preparation remains external, pinned and explicitly unaccepted.
5. **Process/evidence:** exact C/H scope, immutable clean-C evidence and no successor/E1/K1 claim.

### K10-R9-01 disposition — CLOSED at the reviewed list-heading boundary

The direct round-9 counterexample is genuinely fixed. `scanTransitions` now tracks list-item frames,
uses marker-derived continuation indents, and prevents list-contained exact L2 headings from becoming
governed section delimiters. The committed controls cover bullets, ordered/wide markers, nesting,
task-list forms, current-title repetition, real top-level termination and a second governed relation.

The new finding K10-R10-01 is a deeper **interaction** between that container stack and already-open
raw leaf blocks. It does not reopen the direct “nested heading is treated as top-level” defect.

### K10-R9-02 disposition — CLOSED at the reviewed quoted-delimiter boundary

The direct quoted-`<`/`>` counterexamples are genuinely fixed. The explicit complete-tag recognizer
accepts quoted delimiters, rejects attributes on closing tags, and the type-7 paragraph-interruption
case is now exercised. CRLF handling also closes a real adjacent escape (SELF-20).

The HTML findings below are different: one is a remaining attribute-separator grammar bug; the other
is a version/rule-set mismatch between the scanner's claimed GFM behavior and the published GFM
0.29 grammar.

## Findings

### K10-R10-01 — P2 — an open raw leaf block outlives the list container that owns it

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `scanTransitions`; K1.0-C4's
container-depth / raw-block claim.

The new container stack and the existing raw states are not ordered as one Markdown block tree.
`scanTransitions` handles these branches first:

```ts
if (fence !== null) {
  fence = updateFence(fence, line);
  ...
  continue;
}
if (html !== null) {
  ...
  continue;
}
```

Only after those branches does it examine indentation, list markers or call `popTo(...)`. Thus once a
fence or HTML block is open inside a list item, a later physical line is treated as raw **before the
scanner checks whether that line still belongs to the list container**.

That ordering disagrees with GFM's container semantics. GFM §4.5 says an unclosed fenced code block
ends when the end of its containing block is reached; it explicitly notes that unclosed fences are
closed by the enclosing list item or block quote. GFM §4.6 likewise says an HTML block ends at the
last line of its containing container block if its ordinary end condition is not reached.

A distinguishing valid-GFM mutation in the Zones section is:

```markdown
| `host-sdk` | `packages/sdk/src` | Application bootstrap and host composition. |

- note

  ```
  literal list-local code
## Current cross-boundary dependencies

| Zone | `.ts` files | Reaches `legacy-core` via | Reaches third-party |
|---|---|---|---|
...
```

The fence is inside the list item. When the dedented top-level `## Current cross-boundary
dependencies` line arrives, the list item ends; therefore the unclosed fence ends with that container,
and the heading is the real top-level Zones terminator. The existing dependency table remains in its
own next section and the inventory stays green.

H10 instead enters the `fence !== null` branch before checking the list continuation. The real heading,
the dependency table and later section headings remain `fence-raw` until an explicit matching closer
(which this valid unclosed-list fence need not have). The later governed sections can consequently be
reported missing or otherwise misread even though the Markdown structure is valid.

The same structural defect exists for list-local HTML. For example, after a blank-ended list
paragraph:

```markdown
- note

  <Warning>
## Current cross-boundary dependencies
```

A type-7 block with no blank-line terminator inside the item ends when the list container ends. H10
instead processes the dedented heading through the still-open `html` branch, so it remains raw until a
later blank line. The top-level heading can therefore disappear and the following dependency table can
be misclassified as additional Zones material.

**Impact:** the new “one coherent structural identity including container depth” claim is not true at
the leaf/container lifetime boundary. A valid list-local raw block can leak across a container dedent
and cause C4 to reject or misattribute a correct inventory.

**Required outcome:** container continuation/closure must be resolved before an already-open leaf/raw
block is continued. Record which container depth owns each fence/HTML leaf (or an equivalent coherent
model) and end that leaf when its containing list/quote ends, as GFM requires. Add production-parser
controls for at least an unclosed list-local fence and a list-local HTML block whose ordinary end
condition is absent before a dedented real governed heading. Preserve the existing top-level
unclosed-fence behavior: only the **container-local** leaf ends at container end.

### K10-R10-02 — P2 — `parseCompleteTag` still accepts missing whitespace between attributes

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `parseCompleteTag`;
K1.0-C4 / contract revision 10's “grammar-complete type-7 recognizer” claim.

GFM §6.10 defines an attribute as **whitespace + attribute name + optional value specification**.
Its explicit missing-whitespace example `<a href='bar'title=title>` is not raw HTML.

The implementation consumes whitespace at the top of the loop, but it never records that whitespace
was actually present before a subsequent attribute. After a quoted value it returns to the loop and,
with zero intervening whitespace, immediately accepts another attribute name:

```ts
for (;;) {
  while (rest[i] === " " || rest[i] === "\t") i++;
  ...
  const attr = rest.slice(i).match(/^[A-Za-z_:][A-Za-z0-9_.:-]*/)?.[0];
  ...
  if (quote === '"' || quote === "'") {
    const end = rest.indexOf(quote, i + 1);
    ...
    i = end + 1;
  }
}
```

So a line such as:

```markdown
<Warning a='x'b=title>
```

is accepted as a complete type-7 opener even though GFM parses it as ordinary Markdown text.

A distinguishing section mutation is:

```markdown
<Warning a='x'b=title>
## What this packet does not establish

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | outside the Deferred section |

## What this packet does not establish
```

Under GFM the malformed tag does not open an HTML block, so the first exact heading is the real
section terminator and the planted table is outside Deferred. H10 instead opens html7, treats that
heading as raw, ends the HTML block at the blank line and then sees the planted table before the
second heading as a further Deferred table. It manufactures a C4 disagreement from a document whose
GFM section boundary is valid.

The committed “malformed near-tags” controls do not include the spec's missing-whitespace-between-
attributes form, despite implementation-10 claiming “no space may be missing.”

**Required outcome:** require whitespace before every attribute after the tag name/previous attribute,
while still allowing the grammar's optional whitespace around `=` and before `/>`/`>`. Add the GFM
missing-whitespace example and at least one quoted-value neighbor as green ordinary-Markdown controls,
alongside valid multi-attribute tags that remain raw blocks.

### K10-R10-03 — P2 — the raw-HTML rule set is a hybrid newer-CommonMark grammar but is reported as published GFM

**Affected:** `tests/conformance/architecture/inventory-oracle.ts`, `parseHtmlBlockStart`,
`HTML_BLOCK_TAGS`; `kernel-landing-zone.test.ts` textarea control; contract/implementation-10 C4 claims.

The authoritative published GFM document at `https://github.github.com/gfm/` identifies itself as
**Version 0.29-gfm (2019-04-06)**. Its §4.6 type-1 start condition lists only `script`, `pre` and
`style`; `textarea` is not a type-1 form. Its type-7 rule excludes only `script`, `style` and `pre`,
so a complete `<textarea>` line is a type-7 opener and therefore ends at a following blank line.

H10 instead treats `textarea` as type 1 and excludes it from type 7:

```ts
if (/^<(script|pre|style|textarea)(\s|>|$)/i.test(rest)) return { kind: 1 };
...
if (name !== "script" && name !== "style" && name !== "pre" && name !== "textarea") return { kind: 7 };
```

The committed test explicitly states “a textarea opener is a type-1 block” and implementation-10 says
“textarea follows type 1.” That is not the published GFM rule being cited elsewhere in this packet.

This changes observable section parsing, not just nomenclature. For example:

```markdown
<textarea>

## What this packet does not establish
</textarea>

| Id | Current path | Disposition | Owner | Why it is assigned there |
|---|---|---|---|---|
| DX-1 | `packages/core/src/util/json.ts` | migratable | K1.1 | outside under GFM |

## What this packet does not establish
```

Under published GFM, `<textarea>` is type 7 and its block ends at the blank line immediately after
the opener. The first exact heading therefore terminates Deferred and the planted table is outside.
H10's type-1 state ignores that blank, suppresses the heading until `</textarea>`, and then can report
the planted table as further Deferred material before the second heading.

There is a second sign of the same hybrid rule set: `HTML_BLOCK_TAGS` includes `search`, while the
published GFM 0.29 type-6 tag list does not. A line such as `<search> trailing prose` therefore opens a
type-6 raw block in H10 although it is neither a GFM type-6 start nor a complete type-7 tag. That can
again suppress a following real heading until a blank line.

**Impact:** the C4 oracle can reject valid published-GFM inventory text, while the contract/report call
the behavior GFM-complete. This is an unsupported evidence claim and a deterministic parser defect.

**Required outcome:** pin and implement one truthful grammar. For the existing “GFM” contract, align
raw-HTML classification with the published GFM 0.29 rules used by the cited spec (including type-1
and type-6 lists), or obtain an explicit contract/version decision before claiming a different hybrid
CommonMark grammar. Add distinguishing controls for `<textarea>` across a blank line and for a
`search`-prefixed line with trailing prose. Do not merely rename the test while preserving a different
end condition.

## Validation and evidence assessment

I inspected validation-10's manifest, full-suite/conformance tails and the targeted demonstration /
structural-transition audit. They bind to clean payload C
`549e215abba1b9e8737d29c6800af07c8406b8ff`, environment Node v25.2.1 / npm 11.6.2 /
TypeScript 5.9.3 / Darwin 25.6.0 arm64, and record:

- `npm run typecheck`: exit 0;
- `npm test`: 1977/1977, 291 suites, zero fail/skipped;
- `npm run test:conformance`: 1864/1864, 272 suites, zero fail/skipped;
- builder-docs: 26 Markdown files / 284 links or anchors / 38 public package imports;
- target-kernel: 4/4; SDK: 22/22;
- K10-R9-01/R9-02 demonstration: 17 cases, eleven newly distinguishing, zero reported regressions;
- structural-transition audit: fourteen windows with one transition per physical line;
- `tests/conformance/k0`: recorded byte-identical to base.

The raw full/conformance logs independently show the stated 1977/1977 and 1864/1864 summaries. The
new tests are useful for the direct round-9 counterexamples. They do not cover (1) termination of a
raw leaf at its containing-list boundary, (2) missing whitespace between otherwise valid attributes,
or (3) the behavioral difference between published GFM's type-7 `<textarea>` / non-type-6 `search`
and the hybrid rules implemented here.

`npm run test:evals` was not run; that remains an appropriate exclusion because K1.0 changes no
Agent/model-facing behavior and makes no eval-dependent claim.

## Per-criterion verdicts

| Criterion | Verdict | Independent basis |
|---|---|---|
| **K1.0-C1** | **PASS** | Target landing-zone source and dependency guard remain intact; round 10 changes only C4 evidence parsing/tests/contract. |
| **K1.0-C2** | **PASS** | Transitive/type-only/barrel/dynamic scanner reconstruction and forbidden-edge controls are unchanged. |
| **K1.0-C3** | **PASS** | Clean-C full suite is green at 1977/1977; no legacy/public source or export moves in the correction interval. |
| **K1.0-C4** | **FAIL** | The direct list-heading and quoted-attribute findings are closed, but the new block model still violates container-owned raw-leaf lifetime and the claimed raw-HTML grammar in three deterministic ways. See K10-R10-01/-02/-03. |
| **K1.0-C5** | **PASS** | All twelve deferred extractions remain assigned to concrete later packet owners. |
| **K1.0-C6** | **PASS** | Target package remains private/refusal-only; no protocol implementation, no-op support API, E1 success or release claim. |
| **K1.0-C7** | **PASS** | Legacy regressions and the accepted import/evidence controls remain intact; conformance is green at 1864/1864. |
| **K1.0-C8** | **PASS** | Benchmark E1 preparation remains pinned at C2/H2 and unaccepted; no E1 result is claimed. |
| **K1.0-C9** | **PASS** | Source/export ownership and dependency recomputation/scanner evidence remain unchanged; the 326-source count remains reconciled. |

No criterion is left unexamined. No architecture decision or missing mandatory evidence blocks a
same-packet correction. K10-R10-03 becomes an owner-decision issue only if the packet intentionally
wants to replace its published-GFM reading with a different version/hybrid grammar; simply aligning
with the cited GFM rules needs no owner decision.

## Verdict and correction handoff

**Required packet status for transcription:** `CHANGES_REQUESTED`.

Round 10 makes substantive progress: the direct R9-01 list-heading escape is closed, the quoted
attribute/value and paragraph-interruption boundary is materially stronger, CRLF is handled, and the
one-scan-per-consumer wording issue is resolved. The remaining findings are deeper interactions and
grammar boundaries exposed by that reconstruction, not repetition of the same failed patch.

```text
Correct the same released packet K1.0 on codex/k1.0-target-boundary-legacy-quarantine.
Base c9a9ed7e6e538ab0542fc6a999426264abb6212a; reviewed H a0a4988b8f4b38709700e1fc38cd0f08de74e3fa;
review record docs/development/work/K1.0/review-10.md.
Open findings K10-R10-01, K10-R10-02 and K10-R10-03; required outcomes and counterexamples are in that record.
Owner supplemental decisions none; unresolved authority none unless a non-published-GFM grammar is intentionally desired.
Apply 006/012 at C4's structural block parser: make leaf-block lifetime subordinate to container lifetime,
complete the attribute-separator grammar, and use one truthful pinned GFM/raw-HTML rule set. Preserve the
accepted list-depth reconstruction, fence single-consumption, structural header/body identity, GFM table-row
discovery, key-before-value semantics, relational comparisons, dependency scanner reconstruction and evidence guards.
Re-review the whole cumulative packet and record additional in-scope defects separately.
Use 008 for the next report and 006 for new C/H plus evidence/push handoff. No successor release.
```

CHANGES REQUIRED
