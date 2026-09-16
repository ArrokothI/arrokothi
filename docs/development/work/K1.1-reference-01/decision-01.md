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

## REF1-DEC-4 — owner confirmation of REF1-DEC-1/2/3, closing `REF1-R6-AUTH-01` (2026-09-16)

Shown [review-07](review-07.md)'s standing `REF1-R6-AUTH-01` — that the three entries above exist
only as the implementing session's quotation of the owner, and that no reviewer with any tooling can
authenticate them — the owner was asked to confirm the entries directly, which
[review-06](review-06.md) and review-07 both name as the only thing that can close the finding. The
owner's instruction, verbatim:

> I confirm REF1-DEC-1/2/3 are accurate, record that and close AUTH-01, commit and push it

**`REF1-R6-AUTH-01` is closed.** The closure condition both reviews stated is met: the owner, the
authority who sets this packet's scope under 006, has confirmed that `REF1-DEC-1`, `REF1-DEC-2` and
`REF1-DEC-3` accurately record their decisions.

**What this closure rests on, stated so a reviewer does not have to discover it.** Every commit in
this repository carries the owner's git identity, including the ones the implementing session
authors on the owner's instruction — this entry among them. A reviewer therefore **cannot
cryptographically distinguish** an owner-authored confirmation from a transcribed one, and nothing
in this file changes that. What has changed is the thing the finding actually asked for: the
decisions are no longer supported only by the session that benefited from them, and the owner has
put their confirmation into the durable record rather than leaving it in a transcript. If the owner
later wants the stronger artifact, a GPG-signed commit or a confirmation authored outside this
session would supply it; neither is required to close this finding, and this entry does not claim
either was done.

**Consequence for the withdrawal.** Review-07 §8 listed four reservations about contract revision 6
and recorded the fourth as "the whole route rests on an owner approval that nothing in this
repository can authenticate (`REF1-R6-AUTH-01`, still open)". That reservation is discharged:
`REF1-DEC-3`, the decision authorizing the withdrawal of `git diff --check`, is confirmed by the
owner. Review-07's other three reservations were addressed by contract revision 7 and are recorded
in [implementation-08](implementation-08.md). `REF1-R6-CHK-01` and `REF1-R6-EXCL-01` remain **moot
by owner-directed withdrawal**, as review-07 recorded them, and no longer carry the conditional
"reopen unchanged if the owner declines `REF1-DEC-3`" — the owner has not declined it.
