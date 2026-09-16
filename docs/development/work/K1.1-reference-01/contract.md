# K1.1-reference-01 — faithful reference maintenance

**Revision 3**; documentation-only supplement to accepted K1.1-correction-01. This is not
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
- `mental-model/README.md`, **revision 3 only**, and **only** its `## How these pages are organized`
  and `## Target, not shipped` sections: state where implementation status is owned, so that the
  single-owner rule these four rounds kept violating is written down at Layer 1; and replace the
  gate-status prose that has drifted since K1.1 was accepted. The `## Target, not shipped` heading
  text is fixed (inbound anchor). Every other section of the page is out of scope.
- This contract and 007 scope/status. Reports and raw outputs follow 008. Owner-summary and
  cleanup records are subsequent administrative work, outside C/H's payload.

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

Run `npm run check:builder-docs`, `git diff --check`, declared-path/executable/sealed-record
comparison and local-link checks on clean C. Runtime evidence may be inspected from accepted H5
only after byte-identity checks; no runtime change calls for new ablations. No external gate or
Agent behavior claim is made. The independent reviewer assesses all REF criteria cumulatively
from A to the new H; this cleanup session must not accept its own reference edits.

`next_release: none`. Implementation acceptance remains intact; integration waits for this
separate documentation review and a completed cleanup handoff.
