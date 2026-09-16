# K1.1-reference-01 — faithful reference maintenance

**Revision 6**; documentation-only supplement to accepted K1.1-correction-01. This is not
an implementation invalidation or a K1.2 release.

Revision 2 reconciled one payload bullet with the approach the packet actually took, under
`REF1-R2-DOC-01` from [review-03](review-03.md). Only the `execution-cycle.md` bullet changed; the
five REF criteria, the bounded payload paths, the anchors and every exclusion stood verbatim. No
acceptance condition was relaxed — see the bullet's own note.

**Revision 3 — owner scope amendment, recorded before its payload.** On 2026-09-16 the owner
granted a bounded Layer-1 exception: *"for `mental-model/README.md`, all the part in
`## How these pages are organized` and `## Target, not shipped` can be modified"*, with the
standing rule that the five Layer-1/2 core pages are "not immutable, just need to have a clear
discussion instead of change them secretly." This is the scope amendment
[review-02](review-02.md) identified as resolution (a)'s prerequisite and declined to
self-authorize; it is recorded here, before the payload commit, rather than justified inside a
report. The exception is **exactly those two sections of `README.md` and nothing else**: no other
section of that page, and no byte of `kernel.md`, `runtime.md`, `driver.md` or `deployment.md`.
The `## Target, not shipped` heading text is fixed, because [reference.md](../../../../mental-model/reference.md)
links `README.md#target-not-shipped`. The five REF criteria are unchanged; REF-4 and REF-5 now
also govern these two sections.

**Revision 4 — the normative conflict revision 3 left unsurfaced.** A standing rule appears in
three governing documents: *"Change Layer 1/2 only when the whole-system model or major abstraction
changes"* ([AGENTS.md](../../../../AGENTS.md) §Architecture first, [006](../../006-development-process.md)
§Maintaining the mental-model reference, [009](../../009-universal-prompts.md)). On its face this
payload is outside that permission: it changes no whole-system model. 006 requires such a conflict
to be surfaced for an owner decision rather than silently resolved, and revision 3 recorded the
grant without addressing the rule at all. Revision 4 changes **no scope** — the payload is still
exactly the two named README sections — and adds only this reconciliation.

Two reasons the grant is nonetheless authorized, offered for a reviewer to judge rather than to
accept. First, that rule constrains an agent deciding on its own; the owner is the authority who
sets a packet's scope, granted it explicitly on 2026-09-16, and 006 routes scope amendments through
exactly this artifact. Second, the content is documentation organization and defect repair, not
model substance: `## How these pages are organized` is Layer 1's own subject, and README itself says
that when a Layer-1/2 summary disagrees with a Layer-3 page "the summary is the defect" — repairing
prose that became untrue is not a change to the model it summarizes.

**If a reviewer disagrees**, the remedy is to revert the two sections to their state at D and take
the change as its own packet under the standing rule; nothing else in this packet depends on it.

## Authority and anchors

The owner's 2026-09-15 final-cleanup instruction in this session explicitly requires canonical
reference maintenance and says: "If required reference changes were absent from the reviewed
candidate, prepare a scoped documentation correction with new C/H and independent review before
claiming merge-ready." It also requires preserving the accepted implementation separately.
That instruction authorizes preparation of this bounded supplement, not its acceptance.

- Original implementation base B: `777b9955fb3a443f700b4f3d1f4f2aef1869345b`.
- Accepted implementation payload C4: `56164092d128c6767f501962174ac81c6363af9e`.
- Accepted implementation H5: `52b1600f3b42e3a360fdc3395178f1d147edf304`.
- Authentic independent review: [review-08](../K1.1-correction-01/review-08.md), committed at
  `b1050133b2b684065251b7b4b7f508e95e771bef`.
- Acceptance/status A and supplement base: `519ba002378707a4deccff1ea0a243d21eb694b7`.
- Governing 006/008/012 policy: that supplement base; those files are unchanged from original B.

**Documentation scope decision, before the reference payload:** KC1-DEC-7 and its D anchor
`0ee13f8138af52107d86967043bcc460faba8893` remain the exact acceptance rule for the historical
implementation H5. For this separate owner-requested reference supplement, the anchor is A above,
which has the same mental-model tree as D. Only the files listed below may differ. This prospective
exception does not claim H5 contained these edits and does not rewrite its contract or decision.
A fresh independent reviewer must check fidelity to the accepted decisions before integration.

## Bounded payload

- `mental-model/concepts/identity.md`: make creation and later-ingress domains explicit; link
  delivery vocabulary to its existing mechanism owner.
- `mental-model/concepts/values.md`: describe the accepted in-process value-capture contract,
  distinguishing it from wire decoding and physical containment.
- `mental-model/mechanisms/creation.md`: a small creation-key reuse example linked to identity.
- `mental-model/mechanisms/execution-cycle.md`: remove the obsolete acceptance-pending status and
  defer implementation status to the status ledger, which owns it; state the page's limits; keep
  delivery rules unchanged. **Revision 2 changed this bullet.** Revision 1 asked instead for "exact
  accepted implementation evidence and limits" on the page. Round 1 implemented that literally and
  [review-02](review-02.md) found it put a shipped-status assertion on a page whose own Status line
  and the `reference.md` convention say it carries none (`REF1-R1-CONV-01`). The corrected payload
  took review-02's resolution (b), which [review-03](review-03.md) judged "the stronger of the two
  resolutions, not merely the permitted one". The bullet is reconciled with what the packet
  actually does, per `REF1-R2-DOC-01`. **REF-3's required outcome is unchanged**: accepted H and
  pending integration must still be accurately separated — only *where* that separation lives
  moves, from the canonical page to the ledger 006 already makes the single status owner. No
  acceptance condition is relaxed.
- `mental-model/reference.md`, `mental-model/roadmap.md`, `mental-model/sources.md`: navigation,
  maintenance ownership and provenance for those rules.
- `docs/development/002-implemented-kernel-baseline.md`: acceptance/integration distinction only.
- `mental-model/README.md`, **authorized from revision 3**, and **only** its `## How these pages are organized`
  and `## Target, not shipped` sections: state where implementation status is owned, so that the
  single-owner rule these four rounds kept violating is written down at Layer 1; and replace the
  gate-status prose that has drifted since K1.1 was accepted. The `## Target, not shipped` heading
  text is fixed (inbound anchor). Every other section of the page is out of scope.
- This contract, [decision-01](decision-01.md) and 007 scope/status. `decision-01.md` is added in
  revision 6 under `REF1-R6-AUTH-01`: owner scope decisions move out of contract prose into an
  append-only decision record in the same artifact form the sibling packet uses. It states its own
  authentication limit — a reviewer can check that behavior matches the quotations but cannot
  authenticate the quotations — so the finding is narrowed, not closed. Reports and raw outputs
  follow 008. Owner-summary and cleanup records are subsequent administrative work, outside C/H's
  payload.

No Layer-2 rewrite; no Layer-1 change beyond the two sections named above; no
executable/test/dependency change, new runtime guarantee, changed limit,
retention policy, wire schema, provider promise, E-gate, parent milestone closure or successor release.
Historical reports, reviews, decisions and evidence remain byte-identical.

## Acceptance criteria and proof

| ID | Required outcome | Accepted source / validation |
|---|---|---|
| REF-1 | Creation key and Input ID have distinct identity domains; reuse example has fresh ingress then normal ingress replay/conflict, preserving separate receipts | KC1-DEC-1 in accepted correction contract; review-08 C1/C2/C6; coordinator creation/ingress and committed creation/ingress tests |
| REF-2 | In-process values describe one coherent immutable snapshot, own-data representation and refusal of unsupported/unstable forms; no broadened containment or wire claim | K1.1 contract revision 5 C3; accepted values implementation and tests; KC1-DEC-3/4/6; review-08 C3 |
| REF-3 | Delivery rules unchanged; accepted H and pending integration accurately separated, later lifecycle/retention owners retained | KC1-ARCH-1; review-08 C4/C5 and acceptance map; exact diff |
| REF-4 | One owner per definition; related identity, batch/wait, acceptance, action/authority, recovery, resources, output and evidence pages assessed; navigation valid | mental-model reference/roadmap; builder-docs and link checks; report dependency matrix |
| REF-5 | Only declared documentation payload differs from A; Layer 1/2, executable tree and sealed records unchanged; C/H and review independence preserved | git scope checks, whole-tree comparison, clean-C validation, fresh independent review |

Run `npm run check:builder-docs`, declared-path/executable/sealed-record comparison and
local-link checks on clean C. Runtime evidence may be inspected from accepted H5 only after
byte-identity checks; no runtime change calls for new ablations. **`git diff --check` is not a
proof step for this packet** — withdrawn by revision 6 below, which states the measurement and the
objection a reviewer should test.

**Revision 5 — WITHDRAWN BY REVISION 6. Preserved as the record of a decision that was made
and then reversed; not in force.** Its text follows unedited so that revision 6's objection can be
read against what it objects to.

**Revision 5 — `git diff --check` is scoped to authored content, and is now actually required
every round.** [Review-05](review-05.md)'s `REF1-R5-CHK-01` found this proof step recorded in round 1
and omitted in rounds 2–5, and found the cumulative check failing: exit 2, nine warnings. **State
the failure plainly before the remedy:** it failed, and this revision changes what it covers. Two
facts decide whether that is legitimate, and a reviewer should test both rather than accept them.

First, **every one of the nine warnings is inside a `.log` file** — a byte-capture of a command's
stdout. `npm run typecheck` prints a trailing blank line; `fold` leaves a space where it wraps.
The whitespace is in the evidence because the command emitted it. Second, **the authored payload
was already clean**: `git diff --check` over `mental-model/`, `002`, `007` and this contract exits
0, as does the whole tree minus those `.log` files. Nothing the linter exists to catch was being
caught here.

Making a raw log pass would mean editing the log — which breaks its recorded SHA-256 digest, stops
it being a faithful capture, and for rounds 2–4 would modify sealed records 006 forbids touching.
The exclusion exists because those files **must not be edited**, not because editing them is
inconvenient.

The scoped command, exactly:

```bash
git diff --check <base> <head> -- . ':(exclude)docs/development/work/*/validation-*/*.log'
```

**What stays checked — deliberately everything else**, so this cannot be used to hide sloppy
authoring: every `mental-model/` page, every `docs/` page, this and every other `contract.md`,
every `implementation-*.md`, every transcribed `review-*.md`, and every `validation-*/MANIFEST.md`.
Only `*.log` byte-captures are out. Transcribed reviews are **not** excluded even though they too
must not be edited — they are clean today, and pre-emptively widening the exclusion for a problem
that does not exist is how a narrow carve-out becomes a broad one. If a future transcription ever
carries authored-looking whitespace, that is a fresh decision, not a precedent already granted.

**Net effect is a stronger gate, not a weaker one.** Before: nominally covered everything, actually
run in one round of five. Now: covers all authored content, and **must be run and recorded in every
round's validation evidence, on the clean C and on H**. A round that omits it fails REF-5.

Not done, and why: review-05 also asked that this round's own `01-typecheck.log` be regenerated
without its trailing blank line. Under this revision that line is an excluded byte-capture, and
regenerating a log to make it look tidier is precisely the edit this revision says not to make.
Leaving it is the consistent action. No external gate or
Agent behavior claim is made. The independent reviewer assesses all REF criteria cumulatively
from A to the new H; this cleanup session must not accept its own reference edits.

**Revision 6 — `git diff --check` is withdrawn as a proof step for this packet, and revision 5's
exclusion with it.** On 2026-09-16 the owner, shown the measurement below, chose removal over a
second attempt at drawing an exclusion ([decision-01](decision-01.md), `REF1-DEC-3`, superseding
`REF1-DEC-2`). **State the shape plainly before the argument: this removes
a gate that an implementation failed, which is the move [006](../../006-development-process.md)
forbids.** What follows is offered for a reviewer to test, not to accept. If it does not hold, the
remedy is to restore revision 5's scoped command and reopen `REF1-R6-EXCL-01`; nothing else in this
packet depends on the removal.

**The measurement, with its range stated.** Two ranges answer differently, and conflating them is
how `KC1-R5-PROC-01` happened, so both are given. On the **packet range** `A..C`, revision 5's
scoped command reports 0 — but it reports 0 *because* the exclusion hides two authored lines inside
`validation-06/00-findings-and-scope.log` (`:15`, the negative control's own inserted space; `:53`,
a `printf '%-52s '` pad). On the **integration range** `main..H` — the range the check would
actually run over at merge — the same scoped command still reports 31 warnings. Every one is inside
a sealed transcribed review
([review-01](../K1.1-correction-01/review-01.md) … [review-04](../K1.1-correction-01/review-04.md)),
belonging to the **sibling** packet, which this packet may not edit; and every one is **exactly two
trailing spaces** — 31 of 31, measured, not sampled. In every case the line sits in a run of
metadata lines (`··` marks the two spaces):

```text
**Verdict:** ACCEPT··
**Reviewer:** OpenAI GPT-5.6 Sol (High)··
**Date:** 2026-09-15··
```

Two trailing spaces is the markdown hard line break. It is the syntax that makes those lines render
as separate lines rather than one reflowed paragraph; deleting it changes what the page says.
`git diff --check` flags trailing whitespace because in source code it is always residue. In a
markdown tree it is sometimes the markup. **The tool is measuring a property this content type does
not have**, which is a different fault from a dirty payload and is not repaired by excluding more
paths: the next markdown file an outside reviewer writes will trip it again, and the exclusion would
have to grow each time. A carve-out that must grow on every future contribution is not narrow.

Note what the two ranges together show: revision 5 produced a step that **passes inside the packet
and cannot pass at integration**, and whose in-packet pass depended on hiding authored whitespace.
That is not a gate; it is a gate-shaped result.

**Why revision 5 was the wrong answer, recorded by its own author.** Revision 5 and its negative
control were written by this session. The control added a trailing space to `reference.md` and
showed the scoped check still caught it. That proves the exclusion does not hide whitespace in
non-`.log` pages, and says nothing about whitespace *inside* the excluded `.log` files — which it
does hide, in two lines of the very log that carried the control
(`validation-06/00-findings-and-scope.log:15` and `:53`, both authored: the control's own inserted
space, and a `printf '%-52s '` pad). The control was constructed to confirm what revision 5 claimed
rather than to break it. Recorded because the defect is in the method, not the wording.

The exclusion was also broader than revision 5 claimed. `':(exclude)docs/development/work/*/validation-*/*.log'`
exempts **453 files repo-wide**, most of them pinned by no MANIFEST digest, and at least one —
`../K1.0/validation-01/09-self-01-demonstration.log` — opens with hand-authored narrative prose
rather than command stdout. "The narrowest that works" was measured against the nine warnings then
visible, not against what the rule actually covers.

**What is not claimed.** This is not a finding that whitespace hygiene does not matter, and
revision 5's substantive point stands unchanged: a sealed byte-capture must not be edited to satisfy
a linter. No replacement gate is asserted to exist, and none is quietly assumed. A markdown-aware
whitespace check — one that distinguishes a hard line break from residue, and that reads
`docs/development/work/**` — is a `scripts/` packet, named here so the gap stays visible in the
record instead of closing silently.

**Effect on the criteria.** REF-5 is otherwise unchanged. Declared-path scope, executable
byte-identity, sealed-record byte-identity and the clean-C comparison all remain required, and none
of them depended on this step. `REF1-R5-CHK-01` is resolved **by withdrawal rather than by
compliance**, and is recorded as such rather than as a closure. `REF1-R6-CHK-01` (round 6 recorded
the check on C only, never on H, as revision 5 itself required) and `REF1-R6-EXCL-01` are resolved
with the requirement they referred to.

`next_release: none`. Implementation acceptance remains intact; integration waits for this
separate documentation review and a completed cleanup handoff.
