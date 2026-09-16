# Owner decisions — K1.1-reference-01

Append-only. Each entry records an owner decision that set or changed this packet's scope, in the
artifact form [`../K1.1-correction-01/decision-01.md`](../K1.1-correction-01/decision-01.md) uses,
so that a scope amendment is a decision record a reviewer can cite rather than a quotation inside a
report or a contract revision.

**Authentication limit, stated first.** Every quotation below is transcribed by the implementing
session from the owner's messages in the delegated cleanup session. A reviewer with repository
access can verify that the packet's behavior matches what is quoted; **a reviewer cannot
independently authenticate the quotations themselves**, because the session transcript is not in
the repository. This is `REF1-R6-AUTH-01` from [review-06](review-06.md), and creating this file
does not close it — it narrows it. Closing it needs the owner to confirm these entries directly, or
a decision artifact committed by the owner. Until then, treat each entry as attributed, not proved.

## REF1-DEC-1 — bounded Layer-1 exception (2026-09-16)

**Standing rule the owner restated first:**

> For the core documents: mental-model/README.md, mental-model/kernel.md, mental-model/runtime.md,
> mental-model/driver.md and mental-model/deployment.md, if you have good reason to modify them,
> discuss with me first. They are not immutable, just need to have a clear discussion instead of
> change them secretly.

**The grant:**

> for mental-model/README.md, all the part in ## How these pages are organized and ## Target, not
> shipped can be modified. If you want to modify to make the documents part improved, you are
> allow to do the changes.

Recorded in [contract](contract.md) revision 3, in a commit carrying no payload, before the payload
that used it. Scope is exactly those two sections of `README.md`: no other section, and no byte of
`kernel.md`, `runtime.md`, `driver.md` or `deployment.md`. Revision 4 later surfaced the normative
conflict between this grant and the standing "change Layer 1/2 only when the whole-system model
changes" rule, without changing the scope.

## REF1-DEC-2 — scope `git diff --check` rather than waive it (2026-09-16) — SUPERSEDED BY REF1-DEC-3

Offered three options: (A) scope the check and leave sealed records unedited, (B) edit the records
to satisfy the linter, (C) a standing waiver. The owner chose A:

> ok. I agree with A, since changing record is bad, and the format of record should not include
> inside git diff --check. Just make sure your modification would not weakening the future git
> diff, so someone can make use to, then that is ok. Not sure if we can just exclude record from
> git diff, since that should not be modified.

Recorded in contract revision 5. **The constraint attached to the grant — "make sure your
modification would not weakening the future git diff" — was not met.** The negative control
offered as proof tested only non-excluded pages; the exclusion did hide authored whitespace inside
excluded files, and covered 453 files rather than the handful the decision was reasoning about.
The owner's closing sentence ("Not sure if we can just exclude record from git diff") was an
expressed doubt, and it was the correct one. Superseded by REF1-DEC-3.

## REF1-DEC-3 — withdraw `git diff --check` from this packet (2026-09-16)

Presented with [review-06](review-06.md)'s `REF1-R6-EXCL-01`, the 453-file breadth, and the
measurement that all 31 remaining warnings are **exactly two trailing spaces in sealed transcribed
reviews** — the markdown hard line break, which is markup rather than residue — the owner was
offered withdrawal of the step as the alternative to redrawing the exclusion a second time, and
chose it:

> For 1. do it.

where item 1 was stated as: *"Revert revision 5 and drop `git diff --check` from this contract,
recording why: it's a source-code linter applied to a markdown tree where two trailing spaces are
syntax. That deletes the entire finding class rather than redrawing its boundary."*

Recorded in contract revision 6, which states plainly that this removes a gate an implementation
failed — the shape 006 forbids — and gives the tool/content mismatch as the argument, for a
reviewer to test rather than accept. The remedy if a reviewer rejects that argument is named in the
revision: restore revision 5's scoped command and reopen `REF1-R6-EXCL-01`. **REF1-DEC-2's
constraint is not transferred to REF1-DEC-3**: no claim is made that some other check now covers
what was withdrawn, and the missing markdown-aware check is recorded as an open `scripts/` packet.
