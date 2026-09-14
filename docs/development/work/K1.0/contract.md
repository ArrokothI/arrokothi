# K1.0 contract — target boundary and legacy quarantine

**Packet:** K1.0. **Parent milestone:** K1 ([001 K1](../../001-current-status-and-roadmap.md)).
**Packet seed:** [007 K1.0](../../007-work-packets.md#k10--target-boundary-and-legacy-quarantine).
**Bounded approach:** [013 structure assessment](../../013-structure-and-evidence-sequencing.md).
**Governing process baseline:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a` (integrated `main`,
including 006/008/009 as the owner revised them on 2026-09-13).
**Dependency:** K0.2, independently ACCEPTED at H16 `90a6f37eaeb61009025449a1abc7e6d31dc1dbb2` and
integrated as `0535160e677231da41b06d9f822e62e2f0364dd1` ([receipt](../K0.2/integration-01.md)).
**Base commit:** `c9a9ed7e6e538ab0542fc6a999426264abb6212a`.
**Branch:** `codex/k1.0-target-boundary-legacy-quarantine`. **Contract revision 19.**
**Revision 19 changes (same packet, no new semantics; corrective packet
[K1.0-correction-02](../K1.0-correction-02/contract.md)).** C4's collection-valued relations are now
compared as collections (K10-CORR2-01). Revisions 5–18 made row *accounting* total, the *lexical*
classes exact, the *value* decoders whole-cell and the table *schemas* self-owning. Each of those
protects a stage on the way from the governed text to a compared value; none of them says what it
means for two asserted collections to be equal, and the comparison that finally consumed them did
not implement it: both the zone-root and the export-subpath checks rendered each side with
`join(",")` and compared the two strings. A joined string is not an injective rendering of a
collection — any collection whose members are joined by the separator renders exactly like the one
collection holding that whole rendering as a single member — so the whole-cell decoder's own
distinction between `` `a`, `b` `` and `` `a,b` `` was discarded one stage later. Owner-delegated
cleanup reproduced 22 false relations against the real inventory: every nontrivial contiguous
merge of the sorted five core export subpaths and the sorted four `runtime-integrations` roots
parsed with nothing unreadable and disagreed with nothing, so a document asserting one invented
subpath or one invented root in place of several declared ones passed the guard whose advertised
value is rejecting exactly that. The loss is two-sided and was reproduced in both directions: an
enforced member that itself contains the separator could equally be split into several documented
members, which is why the correction is the equality and not a rule about a byte.

One `collectionDisagreement` now owns that equality for every collection-valued relation — the
Zones roots, the Export subpaths and both cross-boundary dependency columns, the last two of which
previously compared by hand in the test rather than through the oracle. It compares cardinality and
then element against element over a common order, so reordering stays permitted (the policy and the
document genuinely write `runtime-integrations`' roots in different orders) while a differently
sized or differently populated collection can never agree. Nothing between the governed text and
that comparison may change a relation's shape: the dependency edge decoder returns its decoded
members instead of a `Set`, whose non-collapsing behaviour depended on a duplicate rule stated in
another function. The diagnostic is corrected with the comparison, because a message rendering
`[a, b]` for both a two-member collection and the one-member collection holding `a, b` reproduces
the same ambiguity where the result is read: each member is now quoted and each size stated.
Rounds 1 and 2 of the correction missed this because both audited *upstream* of the comparison —
round 1 compared each decoded cell against a per-cell reference, round 2 reconstructed schema
authority above decoding — and a per-cell oracle cannot observe a collision that only exists
between two whole collections. Review-02 rechecked header/arity ownership and the scalar Deferred
downstream and recorded no distinguishing list-boundary comparison.

C4 evidence grows with one collection-identity matrix — the 22 reproduced merges regenerated from
the collections rather than transcribed, three non-comma separators that a byte blacklist would
miss, a same-size/different-members case and a repeated-member case, dropped and invented members
in both columns, the two-sided split against an injected comma-bearing policy root with its honest
twin, reordering twins for all four collection columns, both dependency columns against the
measured tree with their real twins and a repeated-specifier case, the four Deferred scalar
re-assertions including a separator-bearing owner, and two mutations asserted to read differently
in the diagnostic — nine tests, four of which fail against the round-2 C
`36460438e95e968beec0b354b07a616b53981256` and three more of which fail if the diagnostic alone is
left ambiguous. Every earlier reconstruction is preserved and re-asserted; all 177 previously
accepted cases in this file pass unchanged, three of them with their expected message text updated
to the unambiguous rendering. C4 evidence 161 cases plus 16 controls → 170 cases plus 16 controls.
C3 suite 2051 → 2060; C7 architecture suite 351 → 360. C9's 326 count is unchanged. Live-row
reconciliation: C3 now reads 2060, C4's evidence cell reads 170 plus 16, and C7's progression runs
through 351 to 360.
**Revision 18 changes (same packet, no new semantics; corrective packet
[K1.0-correction-01](../K1.0-correction-01/contract.md), round 2).** C4's table *schemas* now own
their arity (K10-CORR1-R1-01). Revision 17 measured a body row's excess cells against the header the
document wrote and checked only the header's first cell, so a document could widen its own header
and delimiter by one column and thereby authorize a fifth body cell that no decoder consumes: the
widened row was not excess, `valueOf` still read only cells 1–4, and the fifth claim was silently
discarded with the relation indistinguishable from baseline — the same fail-open shape SELF-29
closed, one structural level up. Each keyed table now states its exact expected header in
`RowSpec.expectedHeader` — arity and every label, including the labels of deliberately ungoverned
prose positions — and a header that adds, drops, renames or reorders any position is reported; a
body row carrying more cells than the *schema* allows is reported even when the document's header
is widened to match it, while schema-correct bodies still decode when only the header is wrong.
Short rows keep their established outcome: a missing governed cell fails its own decoder
(K1.0-SELF-08) and an absent trailing ungoverned prose cell asserts nothing — but that exception
never widens the schema. The reader withholds trailing ungoverned prose from the decoders by
passing `valueOf` only the governed prefix, so the declaration owns those cells structurally rather
than by convention. Round 1 missed this because its audit oracle was cell-local: the ignored fifth
cell never reaches a decoder, so no per-cell reference can reveal the schema/header interaction.

C4 evidence grows with one schema-ownership matrix — the exact widened-header, widened-delimiter,
extra-body-cell attack in all four tables, the same width meaning different things under each
schema, non-first-position rename/reorder/narrow controls, widened/narrowed-header twins with
schema-correct bodies, ordinary excess in the two tables round 1 did not name, and the Zones
short-form twin — seven tests, four of which fail against the round-1 C
`76ce938074ffa910fbd74374e388ba8d226af4c6`; the other three pass under both parsers as
shared-reader and preservation proofs. Every earlier reconstruction is preserved and re-asserted;
all 200 previously accepted cases in this file pass unchanged under the new parser (the established
message prefixes are kept, with the governed schema appended). C4 evidence 154 cases plus 16
controls → 161 cases plus 16 controls. C3 suite 2044 → 2051; C7 architecture suite 344 → 351. C9's
326 count is unchanged. Live-row reconciliation: C3 now reads 2051, C4's evidence cell reads 161
plus 16, and C7's progression runs through 344 to 351.
**Revision 17 changes (same packet, no new semantics; corrective packet
[K1.0-correction-01](../K1.0-correction-01/contract.md)).** C4's cell *values* are now decoded
whole (K10-CLEANUP-01). Every revision from 5 onward strengthened row **accounting** — each
candidate row ends in exactly one outcome, keyed before it is valued, with duplicates and further
tables reported — and revisions 12–16 strengthened the **lexical** classes that decide where rows
and sections begin. Neither layer says anything about whether the outcome used everything the row
asserted, and the value decoders did not: each read a *part* of a cell and discarded the rest.
`Number.parseInt("2.5", 10)` and `Number.parseInt("2oops", 10)` are both `2`, so a fractional or
junk-suffixed file count parsed deeply equal to the measured row; `cell.includes("nothing")` made a
cell reading "nothing, `@arrokothi/core`" the empty set, deleting the named edge; `startsWith("yes")`
/ `startsWith("no")` took a publishability answer from a cell's first word; and the `backticked`
helper collected the code spans occurring anywhere in a cell and ignored every other character, so
prose beside a key, an unquoted token in a list and a second path in a single-valued cell all
vanished. Owner-delegated cleanup reproduced four of these against the real inventory: each mutated
document was deeply equal to the correct parse with nothing unreadable, so the measured-tree
comparison downstream could not distinguish a false claim from the truth it accepts.

The rule that replaces all four spellings is one rule: **a governed cell is decoded whole or its row
is unreadable.** Each column now has one total decoder — a complete code-span list, exactly one code
span, a whole decimal count, an empty sentinel matched against the whole cell, or a closed
publishability vocabulary — and each is a left-to-right walk that must consume the cell from end to
end. No host normalizer is used at any of them: no `trim`, no case folding, no numeric coercion of
free text. This is revision 16's tie-breaker applied to values rather than to characters: **where two
readings are defensible C4 takes the narrower one**, because a decoder that is too strict only adds
reports while one that reads a prefix deletes the remainder of the document's claim silently. The
Deferred table's disposition and owner cells were already read whole and compared exactly; they are
re-asserted rather than changed, so the invariant is visible for every governed column of all four
tables. Two columns the header declares but no relation governs — the Zones table's owner/status
prose and the Deferred table's closing rationale — are recorded as deliberately ungoverned: they
carry no claim the executable policy could contradict.

Also corrected, with separate provenance: a body row carrying **more cells than its header declares**
is reported (K1.0-SELF-29), found while tracing the decoders through all four tables. *(Superseded
by revision 18 as K10-CORR1-R1-01: the authority is the schema's arity —
`RowSpec.expectedHeader.length` — never the header the document wrote. A widened header is itself
reported and cannot authorize extra body cells; schema-correct bodies still decode when only the
header is wrong. This sentence is kept here as the historical statement of the defect rather than
silently rewritten.)* GFM Example 204
lets a renderer ignore the excess, which is a rendering rule; for this oracle an ignored cell is
document content no column reads and no comparison can contradict — the same fail-open shape as a
prefix parse, one level up. Short rows keep their established outcome: a missing governed cell
already fails its own decoder (K1.0-SELF-08) and an absent ungoverned prose cell asserts nothing.
The evidence guard's work roots are widened to cover the corrective packet's own validation
directory, so no raw-evidence directory this packet owns sits outside the mechanical digest check.

C4 evidence grows with one whole-cell decoding matrix — the four reproduced counterexamples through
the production entry point, twelve malformed count spellings, six contradictory edge cells in both
dependency columns, the em dash outside its column, five subset-extraction cases across zones,
exports and deferred rows, six publishability prefixes, the appended-cell and trailing-VT arity
cases, and the permitted-formatting twins beside each of them — fourteen tests, eight of which fail
against the accepted H `f3aa29d7ecba2a23aa85788b7efdebdd383cab24`. Every earlier reconstruction is
preserved and re-asserted; all 186 previously accepted cases in this file pass unchanged against
both parsers. C4 evidence 140 cases plus 16 controls → 154 cases plus 16 controls. C3 suite
2030 → 2044; C7 architecture suite 330 → 344. C9's 326 count is unchanged. Live-row reconciliation:
C3 now reads 2044, C4's evidence cell reads 154 plus 16, and C7's progression runs through 330 to
344.
**Revision 16 changes (same packet, no new semantics).** C4's ATX and table structural
whitespace is re-derived from the pinned productions (K10-R15-01). Revision 15 closed review-15's
host-`trim()` defect by substituting GFM 0.29's §2.1 six-character *whitespace character*
definition at the ATX content and table cell positions — one broad project-wide class for another
— and this revision's own prose asserted that the §2.1 class governs the character before an
optional ATX closing `#` run. §4.2 says otherwise. It names **space** five times: the opening `#`
may be indented 0–3 spaces, the opening sequence must be followed by a space or end of line, the
optional closing sequence must be preceded by a space and may be followed by spaces only, and the
raw contents are stripped of leading and trailing spaces. §2.2 substitutes **tab** for space where
spaces define block structure, and nothing admits U+000B or U+000C. The §2.1 definition is cited by
§4.6 type-1/6 start boundaries and the §6.10 complete-tag grammar, which are now its only consumers
in the parser. Consequence of the reviewed class: `## What this packet does not establish<VT>##`
had its hash run removed because VT satisfied the broad predicate and its VT removed by the broad
right-strip, became the exact configured next title, terminated the governed Deferred section early
and hid a contradictory further table — the same fail-open shape review-15 had just closed, reached
through the replacement abstraction. The same substitution let a `DX-1<VT>` key cell collapse onto
the policy's `DX-1`. One `blockWs` class (SPACE, TAB) now serves every ATX position and both ends of
a table row and of every cell; `stripAtxContent` names §4.2's sentences step by step and the closing
run is dropped only when the trailing strip has already put it at the end and a SPACE or TAB (or the
opening separator) precedes it. **Where two readings are defensible C4 now takes the narrower class
deliberately**, because too narrow can only miss a boundary and over-extend a section — adding
reports — while too broad manufactures a boundary and deletes evidence silently, and total
fail-closed accounting must exclude silence first. Round 15 missed this because its audit oracle was
a hand-typed expected column written by the same author from the same reading, so it agreed with the
bug; revision 16's audit adds a third column produced by an independent sentence-by-sentence
transliteration of the published grammar that imports nothing from the parser, and prints the quoted
sentences beside it. C4 evidence grows with one class-boundary matrix (VT/FF before a hash run, VT/FF
after one, VT/FF at the end of content, six SPACE/TAB twins, VT/FF key and value cells with their
permitted-padding twins, VT row indentation, and a re-assertion that §4.6/§6.10 keep all six) — nine
tests, six of which fail against the reviewed H15 parser. Review-15's NBSP/Unicode-space controls,
round-14's CRLF/LF/lone-CR controls and every earlier reconstruction are preserved and re-asserted.
C4 evidence 131 cases plus 16 controls → 140 cases plus 16 controls. C3 suite 2021 → 2030; C7
architecture suite 321 → 330. C9's 326 count is unchanged. Live-row reconciliation: C3 now reads
2030, C4's evidence cell reads 140 plus 16, and C7's progression runs through 321 to 330.
**Revision 15 changes (same packet, no new semantics).** C4's structural-whitespace classes are
reconstructed for ATX heading identity and table row/cell normalization (K10-R14-01, K1.0-SELF-24).
Revision 13 named the GFM whitespace/Unicode-whitespace/blank-line distinction and reconstructed the
predicates it had listed, but exempted "ATX heading text and table-cell normalization" as keeping
"their own grammar rules". They did not: both used `String.prototype.trim()`, which removes every
ECMAScript whitespace character — NBSP U+00A0, U+FEFF, U+3000, U+2009, U+2028/U+2029 and the rest.
A level-2 heading whose real content is `<NBSP>What this packet does not establish` therefore
collapsed onto the configured title, falsely terminated the governed Deferred section and hid a
contradictory further table from C4's total, fail-closed accounting; a cell whose real token is
`DX-1<NBSP>` compared equal to `DX-1`, so a wrong association survived with the token set unchanged.
Two named classes now serve those paths and the invariant admits no exemption: **block-structure
whitespace** (§2.2: SPACE and TAB) fixes where content starts — the ATX separator, the offset past
it and a table row's indentation — and the **§2.1 whitespace class** governs every right-strip,
including the character an optional closing `#` run must be preceded by. *(Superseded by
revision 16: §4.2 names* space *at that position and §2.2 adds* tab*, so the §2.1 class belongs
to §4.6/§6.10 alone. This sentence is the defect review-16 recorded as K10-R15-01; it is kept
here as the historical statement of it rather than silently rewritten.)* `stripAtxContent` states
the three §4.2 steps in order; `gfmRowContent` and `gfmTrim` state the table extension's two.
Adjacent ATX cases were audited with the grammar rather than blacklisted: the required separator is
SPACE/TAB only (CR is unreachable after §2.1 tokenization), a leading VT/FF is content while a
trailing one is stripped, a VT/FF-preceded closing run is now recognized *(both VT/FF clauses
superseded by revision 16 as K10-R15-01: §4.2's class is SPACE/TAB at every position, so a
trailing VT/FF is content too and a VT/FF-preceded run is not a closing sequence)*, an all-`#` content chops
to empty, and `# foo#`, `### foo \###` and `### foo ### b` keep their content unchanged. Round 14
missed this because it reconstructed the line-ending layer beneath the classes while inheriting
revision 13's own list of which predicates had classes; the exemption sentence was never rederived
from §4.2. C4 evidence grows with one ATX identity matrix (six Unicode-whitespace RED positions,
two leading VT/FF RED cases, three non-heading opening-sequence cases, eight exact-heading GREEN
twins including the VT-preceded closing run, a non-exact current heading with its TAB twin, a
document-wide TAB re-separation, and a 27-entry `scanBlocks` content-primitive matrix) and one
table row/cell matrix (padded key, padded value, padded publishability, Unicode-indented row and
two ASCII preservation cases). Two further self-found defects are corrected with separate
provenance: the three uncalled `sectionRange`/`sectionLines`/`sectionText` wrappers are removed
(K1.0-SELF-27), and this contract's stale C4 evidence count is corrected (K1.0-SELF-28) — rounds
12, 13 and 14 each grew the matrix and described the growth but left the cell reading 100, so it
understated the reviewed candidate by 19. C4 evidence 119 cases plus 16 controls (the measured
figure at H14, not the recorded 100) → 131 cases plus 16 controls. C3 suite 2009 → 2021; C7
architecture suite 309 → 321. C9's 326 count is unchanged. Live-row reconciliation: C3 now reads
2021, C4's evidence cell reads 131 plus 16, and C7's progression runs through 309 to 321.
**Revision 14 changes (same packet, no new semantics).** C4 physical-line tokenization is
reconstructed (K10-R13-01). Revision 13 reconstructed lexical classes *inside* physical lines
but inherited JavaScript's LF-only `split("\n")` at the preceding stage, so a lone-CR document
scanned as one line. One `splitPhysicalLines` tokenizer implementing the GFM §2.1 production
(CRLF | LF | CR) now feeds the shared block scan; CR is a line boundary there, never in-line
whitespace, and tokenization precedes every per-line predicate. EOF behavior is deliberate: a
trailing ending of any kind yields one final empty line, no trailing ending yields none, the
empty document is one empty line — byte-identical to the old split for CR-free inputs. The
governing invariant is now staged end to end: source bytes/string → GFM line endings →
physical lines → per-line GFM whitespace/blankness → container/leaf state → top-level
heading/table eligibility → section/table identity → keyed relation. Round 13 missed this layer
because its audit generated LF/CRLF inputs and never derived the preceding line-ending
production. C4 evidence grows with one compact line-ending matrix (CR-only and CRLF whole-
inventory equivalence, mixed-ending boundary preservation, CR/CRLF/LF primitives, lone-CR
section termination and raw-block lifetime twins, CR-distinct table rows, final-line EOF
cases). C3 suite 2001 → 2009; C7 architecture suite 301 → 309. C9's 326 count is unchanged.
Live-row reconciliation: C3 now reads 2009 and C7's progression runs through 301 to 309.
**Revision 13 changes (same packet, no new semantics).** C4's raw-HTML lexical classes are
reconstructed (K10-R12-01). Revision 12 re-derived *which tokens* may follow a type-6 block tag
name but inherited the host-language meaning of "whitespace": type-1/6 used ECMAScript `\s`
(which admits NBSP and other Unicode whitespace GFM does not), `parseCompleteTag` hand-skipped
only space/tab (rejecting valid VT/FF attribute whitespace), and `isBlankLine` used `trim()`
(closing raw blocks on NBSP/VT/FF-only lines GFM does not call blank). One explicit GFM
whitespace class (exactly SPACE/TAB/LF/VT/FF/CR) now serves every type-1/6 start boundary, every
`parseCompleteTag` separator/`=`/pre-close/trailing position and the unquoted-value terminator
set; a distinct GFM blank-line predicate (SPACE/TAB only, tolerating one split-CRLF trailing CR)
serves type-6/7 termination and the table/section blank decisions that share it. The invariant is
explicit: every C4 Markdown lexical predicate uses the character class defined by the governing
GFM production — GFM whitespace, Unicode whitespace and blank-line whitespace are separate
concepts and cannot be substituted with host `\s` or `trim()`. List markers, indentation,
thematic breaks, heading text and table-cell normalization keep their own rules and are untouched.
Round 12 missed this layer because its audit derived the allowed boundary *tokens* without
independently deriving the specification's lexical *classes*. C4 evidence grows with one compact
whitespace/blank-line matrix (VT/FF type-7 openers, VT/FF optional/trailing positions, NBSP
type-1/6 non-boundaries with a no-swallow Zones proof, NBSP/VT/FF-only lifetime continuation,
space/tab-only termination, ASCII/CRLF/token-matrix preservation). C3 suite 1994 → 2001; C7
architecture suite 294 → 301. C9's 326 count is unchanged. Live-row reconciliation: C3 now reads
2001 and C7's progression runs through 294 to 301.
**Revision 12 changes (same packet, no new semantics).** C4's type-6 raw-HTML start boundary
is corrected (K10-R11-01). Revision 11 accepted a bare `/` and a literal `$` after a recognized
block tag name through the character class `[\s>\/$]`, so `<div/ x>`, `<div/foo>`, `<div/` and
`<div$foo>` opened HTML-6, hid the exact next governed heading until the blank line, and could
manufacture a further-table disagreement from a valid document. The predicate is now the
structural grammar whitespace OR `>` OR exact `/>` OR EOL (`(?=\s|>|/>|$)`, with `$` as the end
anchor, never a literal token), so those four malformed forms stay ordinary text while `<div/>`,
`<div>`, `<div class=x>`, bare `<div` at EOL and the same closing-tag boundaries still open type 6,
and a recognized prefix plus an ordinary name character (e.g. `divfoo`) still does not open type 6
merely from the prefix. Neighbor audit: type 1 already uses the structural `(\s|>|$)` with no `/`
or literal `$`; types 2/3/5 are fixed prefixes needing no boundary; type 4 is `<!` plus ASCII
uppercase; type 7 is a complete tag via `parseCompleteTag`, so the malformed forms fail there too.
The container-owned leaf lifetime with `ownerDepth`, same-line eligibility after container closure,
top-level leaf lifetime, required whitespace before each type-7 attribute, published GFM 0.29
rule-set pin, structural top-level section identity, structural header/body identity,
one-governed-table/further-table accounting, GFM row discovery, key-before-value uniqueness,
relational comparison, dependency recomputation and the C1/C2/C9 scanner reconstruction are
unchanged. C4 evidence grows with one compact type-6 boundary matrix (lone-slash/dollar GREEN,
valid open/closing RED, prefix guard, round-11 textarea/search/attribute/owner-depth spot-check).
C3 suite 1990 → 1994; C7 architecture suite 290 → 294. C9's 326 count is unchanged.
**Revision 11 changes (same packet, no new semantics).** C4's container/leaf ownership,
attribute grammar and raw-HTML rule set are corrected (K10-R10-01, K10-R10-02, K10-R10-03).
Revision 10 checked open leaves before container continuation, so an unclosed list-local
fence or HTML block leaked past its container and swallowed later top-level headings and
tables. Every fence/HTML leaf now records its owning container depth: a non-blank line
dedented below the owner's content indent ends those containers first, kills the leaves they
own, and is then processed normally at the surviving depth (a real heading there is eligible
again on that same line); top-level leaves keep their run-to-document-end lifetime, and only
the container-local leaf ends at container end. The complete-tag recognizer now requires
whitespace before every attribute (the GFM missing-whitespace form stays ordinary) while
keeping optional whitespace around `=` and before `>`/`/>`, quoted `<`/`>` and valueless
attributes. The raw-HTML rules are pinned to published GFM 0.29 as cited: type 1 is
script/pre/style only (a complete `<textarea>` line is type 7 and ends at a blank line),
and the type-6 list has no `search` (`<search>` with trailing prose is ordinary; complete
alone it is still type 7). Adopting a newer hybrid list would be an explicit owner/version
decision, not a silent edit. The round-10 depth reconstruction, fence single-consumption,
structural header/body identity, GFM row discovery, key-before-value ordering, uniqueness,
relational comparison, dependency recomputation and every accepted scanner/evidence invariant
are unchanged. C4 evidence grows 87 cases plus 16 controls → 100 cases plus 16 controls
(8 container-ownership controls: unclosed bullet/ordered/wide fences, list-local type-7 and
type-1/comment blocks without ends, closed-fence locality, the nested inner/outer boundary
pair, post-heading table placement and the blockquote analogue; 4 attribute controls: the
GFM missing-whitespace literal, quoted-value neighbors, valid multi-attribute/boolean/spaced
forms and malformed/valid neighbors; textarea/search replacement pair under the published
rule). C3 suite 1977 → 1990; C7 architecture suite 277 → 290. C9's 326 count is unchanged.
**Revision 10 changes (same packet, no new semantics).** C4's block layer now carries
container depth and a grammar-complete type-7 recognizer (K10-R9-01, K10-R9-02). Revision 9
tracked leaf/raw contexts but had no list state, so a valid ATX heading inside a list item
could delimit a top-level governed section and silently delete a later contradictory table;
its type-7 matcher also rejected valid complete tags with quoted `<`/`>` and accepted
attributes on closing tags. One `scanTransitions` pass now maintains list-item container
frames (bullets, 1–9-digit ordered markers, marker-width-derived content indents with tab
stops and the 5-plus gap rule, nesting, thematic-break precedence over list starts) alongside
the fence/HTML state: a marker at content indent nests, a structural line dedented below it
pops, and dedented prose after a blank line pops too (the blank ends any open item paragraph,
so no lazy continuation is possible); blank lines, lazily continuable prose and raw regions
never pop (over-extension only adds reports, never silently deletes). Only depth-0 exact
level-2 headings delimit sections and only depth-0
lines form tables; container-local headings break bodies but never delimit. The complete-tag
recognizer implements the quoted/unquoted attribute grammar (quoted `<`/`>` allowed),
bare closing tags, no attributes on closes, the uppercase-ASCII type-4 rule and the type-7
cannot-interrupt-a-paragraph rule (a tag after paragraph text stays prose; table rows are not
paragraph text, so blocks after tables still open). List markers always open (interruption
refinements could only under-extend toward silence); restricted markers (empty items,
non-1 ordered starts) honor the paragraph rule. Residual documented corners: a pipe-less
body row immediately followed by a tag/restricted marker reads as paragraph text, and
indented lines are always code. The round-9 fence/HTML annotations, exact-title L2 identity,
structural header/body split, one-governed-table rule, GFM row discovery, key-before-value
ordering, uniqueness, relational comparison, dependency recomputation and every accepted
scanner/evidence invariant are unchanged; `sectionTables`/`sectionLines` now share one
precomputed scan per call (the round-9 wording note is resolved in code, not just prose).
C4 evidence grows 64 cases plus 16 controls → 87 cases plus 16 controls (12 container
controls: bullet/ordered/wide-marker/nested/task-list/current-title shapes with a
contradictory table after the list, top-level termination locks, supported plain lists,
thematic precedence, restricted-marker and digit-limit locks, plus a Zones twin; 10
type-7/HTML controls: double/single-quoted delimiters, unquoted/ordinary attributes, closing
openers, malformed closes and near-tags, the paragraph exception with its after-table
counterpart, type-4 case rule, type-6 boundary, textarea; plus a CRLF self-found control).
C3 suite 1954 → 1977; C7 architecture suite 254 → 277. C9's 326 count is unchanged.
**Revision 9 changes (same packet, no new semantics).** C4's Markdown block context is now a
single coherent layer shared by section selection and table discovery (K10-R8-01, K10-R8-02).
Revision 8 made section selection structural but left two unsound transitions in the new scanner.
First, `sectionTables` consumed a fence encountered while reading a table body without advancing
its index, so the outer loop reprocessed the same bare marker as its own closer and literal
fenced code containing a complete header+delimiter+body table became a spurious further table;
the round-8 audit's single row-shaped line inside the fence could not expose this because it
supplied no delimiter pair. Second, `sectionLines` tracked only fenced code, so an exact
next-heading line inside a GFM raw-HTML block (for example `<script>…</script>`) truncated the
governed section and silently excluded a later contradictory table. One `scanBlocks` pass now
computes every physical line's context exactly once — ordinary Markdown, fenced literal, GFM
raw-HTML block types 1–7, blank, indented code or blockquote — and both section selection and
table discovery consume those annotations without recomputing fence/HTML transitions. A fence or
HTML marker that terminates a table body closes that body as a break and is never reprocessed as
a second transition, so literal code cannot become a relation; a heading inside a raw block is
raw content, so it cannot truncate a section and hide a later table. Heading/table recognition
runs only where the block context permits Markdown structure. Tables are top-level only:
indented-code and blockquote lines break a body and never become rows (a quoted table is not a
top-level inventory assertion); setext headings, thematic breaks, lists, link reference
definitions and nested tables have no block state of their own and reach the reader as
unreadable/duplicate rows where they appear inside a body (fail-loud, never silent). Type-7
HTML's cannot-interrupt-a-paragraph exception is over-approximated toward raw and indented lines
are always code (both err toward reporting, stated here). The round-8 ATX/fence heading grammar,
exact-title L2 section identity, structural header/body separation, one-governed-table rule,
key-before-value ordering, uniqueness, relational comparison, dependency recomputation and every
accepted scanner/evidence invariant are unchanged. C4 evidence grows 47 cases plus 16 controls
→ 64 cases plus 16 controls (10 fence single-consumption controls: bare/info-string/tilde
fences with a complete table inside stay green, the unfenced second table still fails,
mismatched and short closers stay inside, the unclosed fence stays fail-loud, plus indented-code
and blockquote challengers with a post-quote real-table control; 7 raw-HTML controls: script,
attributed mixed-case script, comment, pre and div blocks hide their heading but not the later
table, and two inline-HTML controls proving ordinary inline/prose HTML neither opens a block nor
is refused). C3 suite 1937 → 1954; C7 architecture suite 237 → 254. C9's 326 count is unchanged.
**Revision 8 changes (same packet, no new semantics).** C4's section selection is now
**structural** (K10-R7-01). Revision 7 closed the row-classification front door but still located
each governed section with `markdown.indexOf(heading)` / `rest.indexOf(nextHeading)`, so literal
heading bytes in prose, an inline code span or fenced code truncated the section before table
discovery could inspect their block context, silently deleting a later contradictory table.
Selection now scans block structure top to bottom with fence tracking: the section starts at the
first level-2 ATX heading outside fenced code carrying the exact expected title and ends at the
first later such heading carrying the expected next title. Call sites name the full expected
titles (`Current cross-boundary dependencies`, `Deferred extraction and bridge owners`,
`What this packet does not establish`) instead of loose `indexOf` prefixes
(`## Current cross-boundary`, `## Deferred extraction`, `## What this packet`). A literal
next-heading mention in prose, inline code or fenced code no longer truncates; a literal
current-heading mention before the real heading (prose or fenced) does not select the start; a
real ATX next heading still terminates; a repeated current heading stays inside the section and is
reported as a further table (K1.0-SELF-12); every row of a further table is still reported
(K1.0-SELF-13). Table discovery shares the same fence/heading recognition, so a heading inside
fenced code neither opens nor breaks a table and a mismatched fence closer does not resume
discovery. Adjacent GFM-grammar challengers are committed as K1.0-SELF-14 (escaped `\#`),
K1.0-SELF-15 (hash run with no required whitespace), K1.0-SELF-16 (over-long run and indented
code) and K1.0-SELF-17 (mismatched fence closer), plus a second-relation fenced case. C4 evidence
grows 36 cases plus 16 controls → 47 cases plus 16 controls. C3 suite 1926 → 1937; C7 architecture
suite 226 → 237. C9's stale corpus count is reconciled from 325 to 326, matching the pinned
round-3 comparison evidence; this is a documentation-count correction only.
**Revision 7 changes (same packet, no new semantics).** C4's header/body classification is now
**structural** (K10-R6-01). Revision 6 closed the GFM front door but still returned header and body
as one undifferentiated row stream and let the shared reader recognise the header by comparing the
first cell against a configured label; GFM permits arbitrary inline text in a data cell, so any
ordinary body row repeating `Zone id`, `Id`, `Package` or `Zone` took the header's silent exit
before keying, duplicate detection or the unreadable channel. Discovery now returns each table as a
structurally identified header (the line above the delimiter row) plus its body rows, so exactly one
row per table can be a header and it is chosen by position, never by text. The configured label
survives only as a *check* on that header: a header not carrying it is reported, and no body row is
ever compared against it. Because skipping "the header" is only safe while a section holds one
governed table, a missing governed table and every row of any further table in the same section -
its header included - are reported too, so a planted delimiter line cannot promote a contradictory
row out of the body into a silently skipped header (K1.0-SELF-13). Section text is taken from the
first heading to the first following next-heading rather than by splitting on the heading, which
used to truncate a section at a *second* occurrence of the same heading text and delete the rows
after it (K1.0-SELF-12). Revision 5's key-before-value and seen-before-parse rule and revision 6's
GFM row grammar are unchanged and re-asserted. C4 evidence grows 15 cases plus 16 controls → 36
cases plus 16 controls (16 header-label body rows: 4 governed tables × full/omitted-both edge pipes
× before/after through the production parser; 4 structural-header controls: real headers accepted
and not read as data, a renamed header reported, a further table's rows reported, a missing governed
table reported; plus the repeated-heading control). C3 suite 1905 → 1926; C7 architecture suite
205 → 226. C3's criterion row also corrects a stale count carried from revision 5 (`1899`), which
review-06 recorded as non-blocking documentation drift.

**Revision 6 changes (same packet, no new semantics).** C4's row discovery now follows the GFM
table forms this document uses (K10-R5-01): leading/trailing edge pipes are optional and may be
inconsistent (GFM Example 199), a `|` delimits only when it is not escaped (Example 200, including
inside other inline spans), the delimiter row uses dashes with optional alignment colons and must
match the header in cell count (Example 203) or there is no table, and every non-blank line until
the table breaks (blank line or another block: fence, ATX heading, blockquote; Example 201) is a
body candidate — including a line with no `|` at all, which still renders as a single-cell row
padded with empties (Example 202). Revision 5's key-before-value and seen-before-parse rule is
unchanged; revision 6 closes the front door before it, so every GFM body row reaches the shared
keyed accounting and ends as recorded, duplicate, or unreadable. Fenced code is skipped and only
the header's own delimiter is skipped silently; any later delimiter-shaped line is unreadable
rather than disappearing. C4 evidence grows 9 cases plus 16 controls → 15 cases plus 16 controls
(4 omitted-edge-pipe tables × trailing/leading/both × before/after through the production parser,
plus 2 adjacent-syntax cases: a pipe-less continuation row and GFM delimiter/header/escaped-pipe
variants). C3 suite 1899 → 1905; C7 architecture suite 199 → 205.
**Revision 5 changes (same packet, no new semantics).** C4's parsing is now **total**: every
candidate data row in every keyed table ends in exactly one outcome — recorded, reported as a
duplicate key, or reported as unreadable — and the key is taken and checked for uniqueness *before*
the rest of the row is parsed. Revision 4's dependency-table helper parsed the file count first and
discarded a row whose count did not parse, so a contradictory duplicate could disappear through its
own malformedness (K10-R4-01); a short row in the Zones table disappeared the same way
(K1.0-SELF-08). The four keyed tables now share one parser in `inventory-oracle.ts` rather than three
there and one inline in the test, so the rule is structural. C4 evidence grows 6 cases plus 16
controls → 9 cases plus 16 controls. Evidence-record accuracy is now checked mechanically by
`evidence-records.test.ts` after K10-R4-02 found an impossible SHA-256 identity in validation-04's
manifest; that is process hygiene under 006/008 and adds no acceptance criterion. C3 suite
1892 → 1899; C7 architecture suite 185 → 199.
**Revision 4 changes (same packet, no new semantics).** C4 uniqueness is now explicit (K10-R3-01):
a duplicate zone id, DX id, package name or cross-boundary dependency zone row is itself a
disagreement, reported regardless of row order, so a contradictory row cannot be erased by
last-write-wins overwriting; the first row for a key is kept and the duplicate is preserved as a
disagreement. Six order-paired mutated-document controls (duplicate zone/DX/package rows before and
after the correct row) plus a duplicate cross-boundary control in both orders cover it; C4 evidence
grows 5 cases plus 10 controls → 6 cases plus 16 controls. C3 suite 1885 → 1892 with zero
fail/skipped; no legacy source moved and no public export changed.
**Revision 3 changes (same packet, no new semantics).** Two subsystems were rebuilt rather than
patched, under 006's rule that a further defect in an already-corrected subsystem triggers
reconstruction. C1/C2/C9: dependency extraction is now stated over the whole category of syntax that
names a module — including the `ImportTypeNode` family, triple-slash references and ambient module
declarations that revision 2's four-node enumeration omitted (K10-R2-01) — with a second,
independently implemented extractor unioned in and its provenance asserted; C2 grows 15 → 23 controls
and C9 38 → 61 cases, including re-asserted K0.2-SELF-01 prose soundness after the rebuild. C4: the
agreement evidence is now relational per row rather than per token set (K10-R2-02), with ten
mutated-document controls; the export table is one row per package with a normalised publishability
cell. C3 suite 1846 → 1885; C7 architecture suite 146 → 185.

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
| **K1.0-C2** | Guards demonstrate rejection on representative forbidden edges, not only an empty graph (007; 013). | Twenty-three fixture repositories. Eighteen plant one forbidden edge each, one per way TypeScript can name a module: direct relative into legacy, type-only subpath barrel, root barrel, re-export barrel, dynamic import, transitive-through-in-zone, host SDK, third-party package, undeclared workspace subpath, a forbidden import hidden after a regular expression after a control-flow paren (K10-R1-01), a non-literal dynamic import (K10-R1-01), and the six forms revision 2 could not see (K10-R2-01): `import("x").T`, `typeof import("x")`, an import type in a parameter, an import type nested in a generic, a non-literal import type, a `/// <reference path>` into legacy, a `/// <reference types>` on a forbidden package, and a `declare module` of one. Two more reject a leaf case: an unaudited sibling of an approved leaf, and a dependency of an approved leaf. One asserts attribution. Three accept: a permitted graph, an explicitly approved leaf, and a reference plus import type that stay inside the zone. | Each forbidden fixture yields exactly one violation, naming that edge and attributed to the file that wrote it; the non-literal case yields the sentinel with its fail-closed reason. Each permitted fixture yields none. Non-vacuity: the real graph is exactly the two zone files and traverses at least one internal edge. Forbidden: a guard that is green on an empty or unreadable graph, red on everything, or that attributes a violation to a file outside the zone. | `kernel-landing-zone.test.ts` — "K1.0 forbidden-edge controls" (23 cases) and "that result is not vacuous" |
| **K1.0-C3** | Current SDK/examples/consumer behaviour and existing tests remain working and explicitly legacy (007). | Full suite and typecheck; the legacy export map and runtime export names; a repo-wide scan for importers of the target zone. | 2060 tests pass, 0 fail; typecheck clean; `@arrokothi/core`'s five subpaths keep their exact export map and their 227/227/44/33/21 names by sorted-name digest; the only importer of the target zone outside it is the guard that verifies it. Forbidden: any moved legacy source file, any changed public export, any consumer routed through the target zone. | `kernel-landing-zone.test.ts` — "K1.0 legacy quarantine" (3 cases); `npm test`; `npm run typecheck` |
| **K1.0-C4** | Inventory source/export ownership and cross-boundary dependencies; record concrete paths and allowed imports (007 scope). | The four zones, their roots, their measured cross-zone and third-party edges, the export ownership table and the allowed-import rule. | [`ownership-inventory.md`](ownership-inventory.md) records them against the candidate tree (pre-existing zone rows reproducible at the base; the target row exists only in the candidate). Agreement is checked **per row relation**, not per token set: the document's three ownership tables are parsed into zone id → roots, DX id → (path, disposition, owner), and package → (subpaths, publishability), and each relation is compared in both directions against the executable policy and the actual manifests. Parsing is **total**: every candidate row ends in exactly one outcome — the governed table's structural header exactly matches its fixed schema, and every body row is recorded, reported as a duplicate key, or reported as unreadable — and the key is taken and checked for uniqueness before the rest of the row is parsed, so a row cannot escape uniqueness checking by failing to parse. Value decoding is **whole-cell**: every governed column has one total decoder — a complete comma-separated code-span list, exactly one code span, a whole decimal count, an empty sentinel matched against the entire cell, a closed normalised vocabulary, or the cell's exact text — which must consume the cell from end to end, applies no host normalizer, and otherwise makes its row unreadable, so a row that parses cannot mean less than the document says. A body row carrying more cells than its schema allows is reported, because those cells are read by no column — the authority is the schema's arity, never the header the document wrote, so a widened header cannot authorize them; a short row keeps the outcome its own decoders give it, and an absent trailing ungoverned prose cell asserts nothing without widening the schema. Collection-valued relations are compared **as collections**: one shared comparison serves the zone roots, the export subpaths and both cross-boundary dependency columns, and it decides equality by cardinality and then by element against element over a common order, never through a rendering of either side. Reordering is therefore a permitted spelling and asserts nothing, while a collection of a different size or with different members can never agree — including when it renders identically, which is what a comma-joined comparison could not distinguish. The decoded members reach that comparison unchanged: no stage between the governed cell and the comparison converts a relation to a set, a string or any other shape that can drop or merge a member, and the disagreement names each member's boundaries and each side's size. Two declared columns govern no relation and are recorded as such: the Zones table's owner/status prose and the Deferred table's closing rationale. Row discovery follows the GFM table forms the document uses: edge pipes optional and possibly inconsistent, only unescaped `|` delimits, the delimiter uses dashes with optional alignment colons and must match the header cell count, and every ordinary non-blank line until the table breaks (blank, fence/HTML marker or raw content, any ATX heading, blockquote, indented code) is a body candidate including a pipe-less continuation line; fenced literal, raw-HTML content, indented code and blockquote lines are never rows. Header identity is **structural, never textual**: discovery returns each table as the line above its delimiter row plus its body rows, so exactly one row per table can be a header and it is chosen by position before any cell is read. The configured header label is a check on that header, not the rule that selects it — a header not carrying it is reported, and a body row carrying it is keyed, duplicate-checked and parsed like any other. A section holds exactly one governed table: a missing governed table, and every row of any further table in the same section including its header, are reported. Section membership is structural and top-level: the section runs from the first level-2 ATX heading on an ordinary line at document top-level depth (outside fenced code, every GFM raw-HTML block and every list-item container) carrying the exact expected title to the first later such heading carrying the expected next title, so a repeated heading cannot delete the rows after it and literal heading bytes in prose, inline code, fenced code, escaped text or malformed heading-like lines neither start nor end a section. All four keyed tables, the cross-boundary dependency table included, share one parser. Uniqueness is part of every keyed relation: a duplicate zone id, DX id, package name or cross-boundary dependency zone row is itself a disagreement regardless of row order — the first row for a key is kept and the duplicate is preserved as a disagreement, so a contradictory row cannot be erased by last-write-wins overwriting. The dependency table's file counts and workspace/third-party reaches are matched against a recomputation with the same analyzer, and the allowed-leaf list is empty in both with its reason stated. Forbidden: a wrong association that leaves the token sets unchanged — swapped zone roots, a reassigned or redisposed DX row, a wrong publishability claim, a dropped subpath, a deleted or invented row, a contradictory duplicate row for the same key in either order with full, omitted-trailing, omitted-leading, or omitted-both edge pipes, a pipe-less continuation row carrying a recognisable key, a body row whose first cell repeats the table's header label in either position and with either edge-pipe spelling, a contradictory row promoted to a further table's header by a planted delimiter line, a contradictory table under a repeated section heading, a literal next-heading mention in prose, inline code or fenced code before a contradictory further table, an escaped hash, a hash run with no required whitespace, an over-long hash run, indented code, a mismatched fence closer or a script/comment block carrying heading bytes, a complete header+delimiter+body table inside a bare, info-string or tilde fence immediately after the body, an exact next-heading line inside a script, comment, pre or div raw block followed by a contradictory table, an exact next- or current-heading line nested in a bullet, ordered, wide-marker, nested or task list followed by a contradictory table before the real top-level heading, a complete custom type-7 opener with quoted `<`/`>` (or a bare closing tag, textarea block or uppercase declaration) followed by a heading-looking line and a contradictory table, an unclosed list-local fence or HTML block followed by a dedented real heading, a complete tag with missing whitespace between attributes followed by a heading-looking line and a contradictory table, a level-2 heading that is not the exact configured title delimiting the section because a character class wider than the one its production names was applied at any ATX position — a host `trim()` erasing Unicode whitespace, or the §2.1 six-character definition erasing U+000B/U+000C or accepting either before an optional closing hash run — a cell or row whose token differs from the policy's only by such a character comparing equal to it, a row that carries a recognisable key and then fails to parse — a malformed count, an absent cell — in either position, or a cell decoded from a prefix or a subset of its own content: a count read from a parsable prefix (`2.5`, `2oops`), an empty-set sentinel found as a substring of a cell that then names an edge (`nothing, @arrokothi/core`), a publishability answer taken from a cell's first word, a code-span list whose unquoted, repeated or trailing content is ignored, an empty sentinel accepted in a column whose grammar does not name it, or a body row whose cells past its schema's arity are read by no column. Also forbidden: a collection agreeing with a collection it is not — several declared members replaced by one invented member that spells their separator-joined rendering (every contiguous merge of the sorted export subpaths and of the sorted zone roots), the same merge spelled with any other separator, one enforced member split into several documented members, a member dropped or invented, a rewritten collection of the declared size whose members differ, a member repeated inside one cell, a dependency column compared by a rule of its own rather than the shared one, and a disagreement whose text cannot distinguish `["a", "b"]` from `["a,b"]`. Also forbidden: silently accepting a structural header that is not exactly its governed schema — widened, narrowed, renamed or reordered — and reading a missing governed table as an empty relation. | `ownership-inventory.md`; `boundary-policy.ts`; `inventory-oracle.ts`; `kernel-landing-zone.test.ts` — "K1.0 policy and inventory agree" (170 cases plus 16 mutated-document controls) |
| **K1.0-C5** | Every deferred extraction is assigned (007 acceptance). | The twelve DX rows: four migratable leaves, seven legacy-only bridges, one refused contract. | Each row names a current path that exists, a disposition and an owning packet that exists in 007's ledger, in both the policy and the document. Forbidden: an unassigned deferral, or an assignment to a packet id that does not exist. | `boundary-policy.ts` `DEFERRED_EXTRACTIONS`; `kernel-landing-zone.test.ts` — "every deferred extraction is assigned an owner" |
| **K1.0-C6** | No new protocol implementation, no-op target API, wholesale native Runtime rewrite, E1 pass or package-release claim (007 acceptance). | The target package's entire source; its manifest; this packet's diff. | The zone exports exactly `UnsupportedKernelSurfaceError` and `refuseUnsupportedSurface`; the refusal throws and returns nothing, naming the surface and its owning packet. The manifest is `private: true`. No legacy source file is moved. No E1 criterion is claimed. Forbidden: a target API that answers a caller with a silent no-op. | `packages/kernel/tests/unsupported.test.ts` (4 cases); `kernel-landing-zone.test.ts` — "the target zone exists…cannot be published", "the zone refuses unimplemented surfaces" |
| **K1.0-C7** | Preserve useful regressions; retain existing vendor-neutrality checks with truthful legacy attribution (007; 013). | The renamed `legacy-core-boundaries.test.ts` against its predecessor. | All thirteen original assertions retained one-to-one. Exactly two `assert` lines differ, in their message strings only ("kernel" → "legacy core"); no assertion subject, expected value or comparison changed. Three test titles and four constant names are retitled; `specifiersIn` is replaced by the shared scanner; two allowlist entries, `@arrokothi/kernel` and `typescript` (the parser the K10-R1-01 fix uses), are added to the conformance-surface case with their reasons at the site, and that case additionally fails closed on a non-literal dynamic import sentinel. On all 326 pre-existing repository sources the rebuilt scanner extracts exactly what the round-2 scanner extracted - 326 identical, 0 changed - so no pre-existing guard result changes, and the `legacy-core-boundaries.test.ts` suite still reports its own 13 assertions. Architecture suite 79 → 146 → 185 → 199 → 226 → 237 → 254 → 277 → 290 → 294 → 301 → 309 → 321 → 330 → 344 → 351 → 360 cases, none removed. Forbidden: a dropped, skipped or weakened assertion behind a rename. | `legacy-core-boundaries.test.ts`; retained-assertion map in the report |
| **K1.0-C8** | The entry record names the prepared E1 fixture identities it relied on, claiming no E1 result (007 acceptance). | The release provenance section above. | Seven E1 identities recorded with their exact values and their unaccepted status, plus the explicit statement that the structural pass closes no E1 criterion. Forbidden: presenting prepared fixtures as a passed gate. | This contract, *Release provenance*; the report's *Validation and interpretation* |
| **K1.0-C9** | The guard mechanism is meaningful in both directions (007 "meaningful transitive import guards"; closes K0.2-SELF-01 and K10-R1-01). | Prose in line comments, documentation blocks, search-needle strings, word lists and fixture template literals — including an import statement, a reference directive and an import type carried as fixture text; every form that names a module, the nine import-type/reference/ambient forms included; regex literals containing quotes (including after a control-flow paren), `import.meta`, escaped quotes, nested templates; targets that cannot be recovered statically; four real repository files with known prose sites; and the whole repository corpus run through both extractors. | No prose yields a specifier, re-asserted after the rebuild rather than assumed to have survived it. Every form that names a module yields its target, each tagged with the syntax that carried it. Any target that cannot be recovered statically yields the fail-closed sentinel, not silence. Over the synthetic matrix and all 326 repository sources the AST pass alone already finds everything the compiler's own pre-processor finds, so the union is a safety net and not a crutch. The four known prose sites report their genuine imports and not their phantoms. The pinned `tests/conformance/k0` fixture still reads as `node:` and relative only. Forbidden: silence achieved by missing a dependency-bearing form, and a rebuild that trades prose soundness for coverage. | `import-scanner.test.ts` (61 cases); repo-wide two-extractor comparison in the report |

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
6. **Three things the extractor deliberately does not treat as dependencies**, each recorded rather
   than discovered later: a `/// <reference lib="..." />` names a TypeScript library, not a module;
   a JSDoc `import(...)` type is not analysed, because this workspace compiles `.ts` with `checkJs`
   off so a JSDoc annotation carries no dependency; and a bare `require("...")` call is out of scope,
   because `require` is not a global in this ESM workspace and flagging every identifier of that name
   would trade the scanner's prose soundness for false positives. If a later packet makes any of
   these load-bearing, it owns extending the extractor and its controls.
