# TOOLS-02 — owner choice 14: widen the context reference language

Recorded on 2026-10-31 by the implementing Claude Code desktop session (`claude-opus-5-5`), from the owner's answer in
this chat. This is owner direction, not a review or an acceptance.

**The question**, verbatim:

> 135 of the 244 open origins cannot close because their context names sealed records by spellings TOOLS-01's context
> reference language refuses (126 bare sibling filenames like `oracle-mutants-09.mjs`, 6 relative sub-paths or
> `rev:path`, 1 URL, 1 pattern, 1 trailing-slash directory). How should TOOLS-02 proceed?

**The owner's answer**, the selected option verbatim:

> Widen language (Recommended)

The option read: "Design 06 §5 addendum, checked in review 05: resolve relative spellings against the referring
record's directory, or a rev:path at its revision, and require them covered like any sealed record (never reasoned
away). A trailing-slash directory is a directory candidate; a non-GitHub URL is external text; an unresolvable token
needs a reason. Controls plus refusal guards. Then all 244 can close and adoption can reach mappings_complete."

**A second question**, after the widening, verbatim:

> After widening, 88 origins still can't close: their contexts name files absent at the revision the sealed record is
> read at (quoted mental-model links inside logs, a never-committed validation log, docs/README without extension, a
> quoted broken link, links outside the repository). TOOLS-01's accepted control
> test_missing_named_record_cannot_be_reasoned_away refuses exactly this. How should these be handled?

**The owner's answer**, the selected option verbatim:

> Reason them (Recommended)

That option read: "Design 06 §5: a reference absent at the referring record's own revision, or leaving the repository,
is unresolvable text that needs a recorded reason; any record that does exist at that revision must still be covered.
The accepted control is replaced by one that pins this rule. All 244 origins can then close."

**A third question**, after measuring the widened walk, verbatim:

> With the widened language, 87 closures' contexts become transitive walks through validation logs, manifests and
> file listings: 1,200–2,400+ records each, still growing, about the whole docs/development/work tree at the pin.
> That means hundreds of thousands of manifest ranges and hours per corpus/CI run. One hop (design 01 §5.4's declared
> minimum context) is at most 63 records, about 9 on average. TOOLS-01's accepted D04-CHK-06 check is transitive. How
> should closure context work?

**The owner's answer**, the selected option verbatim:

> One hop (Recommended)

That option read: "context_check covers the minimum context plus every record it names directly, as design 01 §5.4
declares; records named only by those records are not walked. Binary sealed records are covered as files but never
parsed for references. The accepted transitive controls are replaced; the 31 existing complete closures stay valid
(they are supersets). Design 06 §6 records it, checked in review 05."

## Effects

1. [Design 06](design-06.md) §5 widens `context_references` in plain text only. Markdown links keep their accepted
   rules, so every form in the accepted refusal control still refuses.
2. Two accepted controls are replaced. `test_bare_relative_required_record_is_refused` becomes
   `test_bare_relative_record_is_resolved_and_required`: the record is named, and a closure that omits it refuses.
   `test_missing_named_record_cannot_be_reasoned_away` becomes `test_a_record_absent_at_its_revision_needs_a_reason`.
3. [Design 06](design-06.md) §6 makes `context_check` one hop, and the accepted transitive controls are replaced as
   §6 lists.
4. Review 05 checks the addendum. There is no separate design check.

## Not changed

Every cap and stop of owner choices 07–13, the S5–S6 rules, and the requirement that a resolvable sealed record is
covered, never reasoned away. No acceptance, hold release or successor release is supplied by this record.
