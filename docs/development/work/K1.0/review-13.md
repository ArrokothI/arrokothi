# K1.0 independent review — round 13

**Reviewer:** OpenAI GPT-5.6 Sol (High)  
**Date:** 2026-09-13  
**Role:** independent reviewer; I did not implement this candidate.

## Binding and access

Reviewed exact candidate H `d299e4215634b496e3ae8c54708b45b0c14231bf`, payload C
`8c7113578fcc475758e4fcbbaf5beb372385d082`, base
`c9a9ed7e6e538ab0542fc6a999426264abb6212a`, branch
`codex/k1.0-target-boundary-legacy-quarantine`, contract revision 13. Previous reviewed H12 is
`da7db0275049a78e069a4068ca68b1b8f296e6a3`; review-12 is recorded by
`82a79451507a239f759dbb3c22e5f3566af33a95`.

At review start the advertised branch equaled H and advertised `main` equaled the base. Review-12→C
is exactly one commit touching contract revision 13, `inventory-oracle.ts`, and
`kernel-landing-zone.test.ts`. C→H is exactly one 14-file report/evidence/status commit: three status
summaries, `implementation-13.md`, and validation-13's MANIFEST plus nine logs. No payload source/test
first appears in H.

Benchmark E1 preparation remains H2 `8de04779d279dba82cf834d419e465d2b677ef46`, parent C2
`d8f17549c31f9ee5d995e773c2f211faed2785fb`; benchmark main remains
`5a3f1ba525f68244701b1f73a1d29c4902ffe589`. It remains built but unaccepted and is not an E1 result.

I inspected pinned GitHub source/diffs, AGENTS.md, 006/007/008/012/013, review-12, contract revision 13,
the affected C4 oracle/tests, implementation-13, validation-13, and the unchanged target package.
I checked published GFM 0.29 §2.1/§4.6 at `https://github.github.com/gfm/`. I have no local repository
shell in this session, so I did not rerun commands or recompute attachment digests.

## Prior finding disposition

**K10-R12-01 CLOSED.** The candidate now has one explicit GFM whitespace class containing exactly
SPACE/TAB/LF/VT/FF/CR, and a distinct blank-line predicate for SPACE/TAB-only lines. Type-1/type-6
starts, complete-tag attribute/equals/pre-close/trailing positions, unquoted values and type-6/type-7
blank termination use the appropriate class. The VT/FF/NBSP controls drive the production parser
through `inventoryDisagreements` and distinguish H12 in both directions. The round-12 slash-vs-`/>`
and earlier container/fence/table machinery remain intact.

## Finding

### K10-R13-01 — P2 — physical-line tokenization omits GFM lone-CR line endings

**Affected source:** `tests/conformance/architecture/inventory-oracle.ts`, `scanTransitions`.  
**Criterion:** K1.0-C4.  
**Source:** published GFM 0.29 §2.1.

GFM defines a line ending as LF, lone CR, or CRLF. The primary scanner instead begins with:

```ts
const lines = markdown.split("\n");
```

This recognizes LF and leaves CRLF's CR for the existing tolerance, but it does not recognize a lone
CR as a line boundary. A correct character-class reconstruction cannot repair structure after several
GFM physical lines have already been collapsed into one scanner string.

Deterministic whole-document counterexample: take the exact governed `ownership-inventory.md` and
change only its line-ending representation from LF to lone CR. Under GFM this is the same sequence of
lines/headings/tables, so `inventoryDisagreements(parseInventory(crOnly), policy, workspace)` must
remain baseline-green. H13 instead sees the entire CR-only document as one element from
`markdown.split("\n")`; `scanTransitions` therefore produces one structural transition rather than
117 physical lines, so the governed sections/tables cannot be reconstructed equivalently.

The primitive is equally direct: source text containing `a`, lone CR, then `b` is two GFM lines but
H13 emits one transition.

**Impact:** a valid GFM representation of the ownership inventory can be rejected or structurally
misread solely because it uses the specification's lone-CR line-ending form. C4's claimed GFM
lexical/block model is therefore still incomplete.

**Required outcome:** reconstruct physical-line tokenization from GFM §2.1 before block scanning.
CRLF, lone LF and lone CR must all delimit lines; line tokenization has precedence over treating CR as
an in-line whitespace character. Preserve EOF/final-empty-line behavior needed by the scanner and all
round-13 whitespace/blank-line semantics.

Required controls:

- whole real ownership inventory converted LF→lone CR remains baseline-green;
- CRLF remains baseline-green;
- mixed LF/CRLF/lone-CR input preserves governed heading/table boundaries;
- a lone-CR-separated exact next heading terminates the same way as its LF twin;
- a lone-CR raw-HTML opener/heading/blank sequence matches the LF lifetime;
- primitive line-scan checks establish two transitions for `a<CR>b`, `a<CRLF>b`, and `a<LF>b`;
- all round-13 VT/FF/NBSP, round-12 type-6-token, and earlier container/fence/table controls remain green.

The H13→corrected-C demonstration should include the CR-only whole-inventory case through
`parseInventory`/`inventoryDisagreements`, not only a helper split.

Why the prior pass missed it: round 13 correctly reconstructed lexical classes *inside a physical
line*, but its audit generated LF/CRLF documents and never independently derived the preceding GFM
line-ending production. This is the required 006/012 reconstruction explanation.

## Criterion verdicts

| Criterion | Verdict | Rationale |
|---|---|---|
| C1 | PASS | Target dependency analyzer/policy unchanged by the C4-only correction. |
| C2 | PASS | Forbidden/permitted boundary controls and shared walker unchanged. |
| C3 | PASS | No legacy/public source changed; clean log records 2001/2001, 295 suites, zero fail/skipped; typecheck clean. |
| C4 | **FAIL** | K10-R13-01: scanner recognizes only LF as a separator, contrary to GFM lone-CR line endings. |
| C5 | PASS | Twelve deferred assignments unchanged. |
| C6 | PASS | Target package remains private and refusal-only; no protocol/no-op/release claim. |
| C7 | PASS | Legacy regressions unchanged; full/conformance evidence green; live counts reconciled. |
| C8 | PASS | E1 identities unchanged and explicitly unaccepted/no-result. |
| C9 | PASS | TypeScript dependency scanner/fail-closed machinery unchanged. |

## Evidence

Inspected validation-13 records show: typecheck exit 0; full suite 2001/2001, 295 suites, zero
fail/skipped; conformance 1888/1888, 276 suites, zero fail/skipped; builder-docs 26/284/38; Kernel
4/4; SDK 22/22; demonstration 13 cases with 7 distinguishing and 0 regressions; nine lexical audit
windows. These support closure of K10-R12-01 but do not exercise lone-CR tokenization.

Validation-13 records `tests/conformance/k0` byte-identical to base. The correction interval changes
no non-C4 production surface.

## Progress assessment and verdict

This is **not a stuck warning**. Round 13 closes the previous whitespace/blank-line defect at the
right abstraction and adds meaningful bidirectional coverage. The new issue is one layer earlier:
physical line tokenization.

Per criterion: C1 PASS; C2 PASS; C3 PASS; **C4 FAIL**; C5 PASS; C6 PASS; C7 PASS; C8 PASS; C9 PASS.

**Overall verdict: CHANGES REQUIRED**  
**Required status transcription:** `CHANGES_REQUESTED`

No architecture decision is blocked and no mandatory evidence source is unavailable.

## Compact correction handoff

Correct the same released K1.0 packet on `codex/k1.0-target-boundary-legacy-quarantine`.
Base `c9a9ed7e6e538ab0542fc6a999426264abb6212a`; reviewed H
`d299e4215634b496e3ae8c54708b45b0c14231bf`; review path
`docs/development/work/K1.0/review-13.md`.

Open finding: **K10-R13-01 P2**. Reconstruct C4 physical-line tokenization from published GFM 0.29
§2.1 before block scanning: CRLF, lone LF and lone CR are all line endings. Preserve round-13's GFM
whitespace/blank-line helpers and every previously accepted parser/boundary invariant. Apply 006/012
reconstruction and 008 for the next C/H/evidence handoff. No self-acceptance, E1 result, K1 acceptance
or successor release.

**CHANGES REQUIRED**
