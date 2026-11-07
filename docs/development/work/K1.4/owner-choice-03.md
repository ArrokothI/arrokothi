# K1.4 — owner choice 03: the six limited-origin extras

**Record type:** owner decision. It answers the question that [implementation report 01](implementation-01.md)
raised under "Adoption and evidence migration": six members of limited origin `artifact-9fd619f5375d598ebb2b88aa`
received `authorized_replacement` targets and `extras` entries in the adoption manifest
(`tests/fixtures/packet-tools/adoption.json`) by precedent, with no owner decision naming them. Recorded on
2026-11-07 by the K1.4 implementer's Claude Code desktop session (`claude-opus-5-5`), at the owner's instruction.
The owner's answer, verbatim:

```text
Approve
```

The owner's message continued: "The six authorized_replacement targets and extras for the deedd7950724 members in
limited origin artifact-9fd619f5375d598ebb2b88aa are authorized as a consequence of owner choice 02 D (SDK
private); they earn no adoption credit."

## Choice

- **Authorized.** The six `authorized_replacement` suite targets and the six `extras` entries below follow from
  [owner choices 02](owner-choices-02.md) D, which made `@arrokothi/sdk` private. Each pinned test used the SDK as
  the published-package example, or the six-file `host-sdk` dependency row. K1.4 changed both, so each test now
  reads an integration package's row or the `host-sdk` row with the Kernel and `legacy-bridge` reaches. Each
  target's `relation.decision` already cites owner choices 02 D.
- **No adoption credit.** The six members stay unbound in their limited origin. Each target is refused by P1-H
  as unread under the released V-ENV claim, and C2-LIMIT admits each member as an extra only through that target.
  This decision changes no count in the preserved table.

## The six members

[owner-choice-03/limited-members.json](owner-choice-03/limited-members.json) lists them in the format R1-03's
check reads: one `{origin, member}` item per member, each with its one `target`. SHA-256
`afec178df5780ed220294dacef56542be85faa93988b61ff9551dccf411cbe25`.

| Member (`tests/conformance/architecture/kernel-landing-zone.test.ts`) | Target |
|---|---|
| `890:3@deedd7950724` | `target.kernel-landing-zone.890.3.deedd7950724` |
| `2894:5@deedd7950724` | `target.kernel-landing-zone.2894.5.deedd7950724` |
| `3099:5@deedd7950724` | `target.kernel-landing-zone.3099.5.deedd7950724` |
| `3138:5@deedd7950724` | `target.kernel-landing-zone.3138.5.deedd7950724` |
| `3205:5@deedd7950724` | `target.kernel-landing-zone.3205.5.deedd7950724` |
| `3304:5@deedd7950724` | `target.kernel-landing-zone.3304.5.deedd7950724` |

These are exactly the `extras` that the payload adds to the origin's `limited` record relative to B
`608f9ece44dbe42b78974bdac9e7ddcd33697705`: 8 extras at B, 14 at `ad6ee1335fbf5c0ef7524fe56b16794f9263096a` and at
C `0d05d32971dfeda89dc874450e38f440af2c4a1d`, whose adoption manifests are identical.

**The adoption manifest does not cite this list.** C2-LIMIT reads a later decision's list under `limited.added`,
and each member there counts as a *listed* member. An extra must not also be listed, so citing this list would
make the check refuse the six. The manifest admits them as `extras`, unchanged at C. The list records the
authorization for the reviewer.

## Effect on the process

- The implementation report's limited-origin bullet cites this record.
- On the owner's follow-up choice ("New C, rerun CI"), C adds this record and its list to the spec's C..H
  `administrative_files`; the candidate check reads that list at C. The adoption manifest and every other
  evidence fixture are unchanged.
- Not decided here: the packet's acceptance.
