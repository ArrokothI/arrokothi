# TOOLS-01 — owner answers for design 05 revision 2

Recorded 2026-10-03 by the TOOLS-01 implementer, Codex (GPT-6 per the owner's assignment).
Provenance: owner messages of 2026-10-02 in the Claude design-author session, delivered through
the owner's implementation prompt in this session. The following answers and qualifications are
transcribed verbatim from that prompt; this is not an independent reconstruction of the earlier
conversation.

- Q1 revision-3 diff: option C. After the check, the owner confirmed the amended C diff (design 05 §3).
- Q2 title catalog: "title catalog agree."
- Q3 revalidation scope and budget: "Approve". After the check, the owner confirmed D05-CHK-07's
  residue rule and E2 at 8.5-10 days.
- Q4 staging: "I agreed to staging C."
- Q5 area map and gate: approved. "I authorize you to modified 007 for me", addressed to the Claude
  design author, who adds the 007 entry check once the gate exists. You do not edit 007.
- Q6 sealed logs: "Yes, unless you've other recomendation." The design author kept the recommendation
  to extract the K1.1 and K1.1-correction-01 log batteries inside TOOLS-01. The owner confirmed it.
- Q7 Node 22.9: "authorize installing one." Install exactly v22.9.0 from nodejs.org at user level,
  verify it against SHASUMS256.txt, and keep the existing Node.
- The owner's confirmation of the three post-check items, verbatim: "Confirm all three".

The implementation prompt also requires a design review before code and a stop if a defect needs
a design change. [The step-0 review](design-05-review.md) found such a defect. These owner answers
remain recorded authority for their stated choices; they do not resolve the newly reported
counterexample. The option-C patch was apply-checked but not applied. The live contract remains
revision 2, no Node installation was attempted, and no implementation or hold release follows from
this record. TOOLS-01 remains IN_PROGRESS.

## Revision 3 confirmation (2026-10-03)

Provenance: the owner's resume instruction in this Codex implementer conversation identifies
design 05 revision 3 at `4dea56638303162b10494e82990d9a54816ca57e` and forwards the owner's
answer recorded in that design author's §7. Verbatim:

> Confirm 1 and 3, label for Q8

This confirms the revised option-C contract diff and the prefix/read rules with E2 at 20.5–26
days, and selects the `repository_read_changed` label for changed non-fixture repository reads.
Changed fixtures remain refused. This supersedes the earlier residue-rule/budget choice only
where revision 3 says so; the other recorded choices remain in force. The implementer's
[resumed step-0 review](design-05-review-02.md) accepts this design for implementation, not the
packet for independent acceptance. The earlier stop above remains the historical record of
revision 2. The Node floor checks must pass before dependent implementation.
