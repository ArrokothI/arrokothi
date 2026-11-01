# Design 06 — TOOLS-02, P1-M routes for shared and covered family members

- **Author:** Claude Code desktop session (`claude-opus-5-5`), the implementer, 2026-10-31.
- **Authority:** [owner choice 13](owner-choice-13.md), answering [projection 12](projection-12.md) question 2 with
  option A. Review 05 checks this addendum; there is no separate design check.
- **Changes:** two P1-M route rules in `member_route`. Every other P1-M rule, the family census, `origin_closure`
  and design 01 §5.4's family rule stand.

## 1. A shared `mutation` route

**Problem.** A `mutation` route needs a registered mutant whose `obligation` names this family's member. Adapter,
rebound and reviewer copies run the same mutation as another family's member. One mutant has one obligation, so a
copy could never route, although its decision is registered and killed.

**Rule.** A `mutation` route may carry `via: {family, label, reading}`:
- `family` is another family, and `label` names one of its members (the source);
- when the member declares `reuses`, `via` names the same member;
- the route's `case` and `mutant` are the source member's registered mutant, whose `obligation` is
  `<family>#<source key>`;
- `reading` is non-empty and states why this member is the same input, operation and required result.

The family table counts such a route as `route:mutation_shared`, apart from `route:mutation`. A kill is still
earned once, by the registered mutant, and is never counted again for the copy.

## 2. A `covered` route

**Problem.** Some live members have no registered mutant, but an existing scheduled registry case or a maintained
oracle leaf already decides the same decision. Design 01 §5.4 accepts that for a whole family as S5. A mixed family,
which closes under P1, had no member-level route for it.

**Rule.** `{kind: 'covered', covered_by, reading}`:
- `covered_by` is one pointer or a non-empty list. Each pointer is one of:
  - `{kind: 'case', id}`, a case in the scheduled registry;
  - `{kind: 'leaf', command, file, test_path}`, a single passing leaf of that catalog command at C, as for S5
    retirement pointers.
- `reading` is non-empty and names the decision the pointer checks.
- The route is counted as `route:covered`. It is never a kill and earns no credit.

`family_table` receives the corpus target context so leaf pointers resolve against the same catalogs as S5 pointers.
Without a context, a leaf pointer refuses.

## 3. Other members

Superseded members use `no_longer_applicable`, with the superseding record as `authority`. Equivalent members use
`equivalence`. Copies of a member without a registered mutant take the source member's route kind and pointer.

## 4. Controls

| Control | Expected |
|---|---|
| A shared route to a source member's registered mutant, with a reading | accepted; `route:mutation_shared` |
| A shared route naming its own family, a missing source, or an empty reading | refused |
| A shared route whose member `reuses` another member | refused |
| A shared route to a mutant registered to a different member | refused |
| A `covered` route to a scheduled case with a reading | accepted; `route:covered` |
| A `covered` route without a reading, with an unknown pointer kind, or with an absent case | refused |
| A `covered` leaf without a context, or naming a failing or absent leaf | refused |
| A `covered` leaf that is one passing catalog leaf | accepted |

Each new `require` gets a registered refusal ablation in `refusal-guards.json`, so the refusal census stays complete.

## 5. Context reference spellings (owner choice 14)

**Problem.** `context_references` is TOOLS-01's deliberately small reference language, and it refuses every spelling of
a sealed record that it does not support. 135 of the 244 open origins name sealed records by bare sibling filenames,
relative sub-paths, a `revision:path` spelling, a non-GitHub URL, a trailing-slash directory or a path-like pattern, so
their closures could never pass `context_check`.

**Rule.** In plain text, not in Markdown links:
- a relative spelling of a file that exists at the record's revision, resolved from the referring record's folder,
  names that record. Under `docs/` it is required and must be covered by a context range, like any sealed record;
- `<revision>:<path>` names the record at that revision, required in the same way. Its revision is consumed with the
  reference, as a qualified link's is;
- a trailing-slash spelling of an existing directory that names `docs/` is a directory candidate, covered or reasoned;
- text that resolves to no entry and holds characters outside the path alphabet, such as `docs/development/$`, is a
  candidate that needs a reason. It is never ignored.

In plain text and links alike, after owner choice 14's second answer:
- a supported reference to a record absent at the revision it is read at is unresolvable text that needs a reason. A
  record present at that revision must still be covered, and a symlink still refuses;
- a reference whose normalized path leaves the repository needs a reason;
- a pinned GitHub tree view of this repository, `tree/<40-hex>[/<path>]`, is read at that revision like the `blob/`
  form: a file is required, while a directory, an absent path or the bare repository root is a candidate that needs a
  reason. A tree view at a moving ref still refuses;
- a URL of another host, or another GitHub repository, is external text unless the path after its host names a `docs/`
  entry of this repository, which still refuses as a disguise. A `github.com/ArrokothI/arrokothi` URL that is not the
  qualified form still refuses.

Markdown link syntax is not parsed in source code (`.mjs`, `.cjs`, `.js`, `.ts`, `.mts`, `.py`), where `a[i](call)`
is code.

**Controls.** Every form in `test_unsupported_record_forms_refuse_with_declared_error` still refuses, so its registered
refusal ablation stands. Two accepted controls change with owner choice 14:
`test_bare_relative_required_record_is_refused` becomes `test_bare_relative_record_is_resolved_and_required`, and
`test_missing_named_record_cannot_be_reasoned_away` becomes `test_a_record_absent_at_its_revision_needs_a_reason`.
New controls: a relative sub-path is required; a `revision:path` record must be covered at that revision; a reference
leaving the repository, a directory, a pattern and a pinned repository tree view each need a reason; external URLs add
nothing; a tree view at a moving ref still refuses. No `require` is added,
so the refusal census is unchanged.

## 6. One-hop closure context (owner choice 14, third answer)

**Problem.** Under §5, `context_check`'s transitive walk follows the file listings in validation logs, manifests and
review identity records. A single closure then reaches about the whole `docs/development/work` tree at its pin, more
than 1,200–2,400 records and still growing after a minute. Design 01 §5.4 declared the minimum context as one hop.

**Rule.** `context_check` reads only the origin's minimum context for references. Every sealed record it names must be
covered by a context range, and every other candidate in it must be covered or reasoned. Records named only by those
records are not walked. An origin whose bytes are not UTF-8 names nothing. The 31 earlier complete closures stay
valid, because their ranges are supersets.

**Controls.** Accepted controls that pinned the walk change: `test_supported_references_close_with_their_one_hop_context`,
`test_a_record_named_only_by_a_named_record_is_not_walked`, `test_a_cycle_through_a_named_record_is_not_walked`,
`test_a_named_records_own_references_are_not_walked` and `test_named_sealed_records_are_context_one_hop` replace their
transitive forms. `test_a_reason_cannot_waive_mandatory_sealed_context` keeps its directly named record. The §5
spellings are tested on one record through `context_references`. No `require` changed.
