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
