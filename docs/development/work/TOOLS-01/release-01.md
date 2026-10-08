# TOOLS-01 — owner release 01

Recorded 2026-10-02 by Codex (GPT-6 per session instructions; serving variant unavailable).
Source: the owner's message in this session, after the outside-repository preparation:

> Hmm, can we release the TOOLS-01 first? Like create the branch.
> I'll switch back to the main branch after your work. then tell the Claude to continue, but also record the result outside the repo, so we can do a nice handover. I think for some part that is not that depends on the Claude research, we can do first?

This releases TOOLS-01 and authorizes starting its research-independent evidence tooling on
`codex/tools-01`, from clean main `b759d0abc01915ea5abc94b4607c6f9101bbbcc7`. The owner will
switch back to main after the handover. Scoped local commits leave the checkout switchable;
no push or merge is performed by this release record.

The first build is the verifier/registry/runner foundation in [brief 01](brief-01.md).
[Contract](contract.md) separates its deliverables from the remaining mandatory corpus adoption.
This release does not claim that the entire outside-repository proposed brief was adopted verbatim.
It does not approve a new dependency or select any open Kernel/binding policy. Claude's research
continues separately; the handover is also saved outside the repository.

Prerequisite: DESIGN-AUDIT-01 accepted at `ce0b5a7098a9f65cf16dc55ce6eb013946564508`,
integrated at `c65894e7b907fd8ce6a4f8b4dd13b8646c84d955`, owner-closed in its
[discussion](../DESIGN-AUDIT-01/discussion-01.md). Its historical `next_release: none` is
superseded for TOOLS-01 only by this new instruction; its record stays unchanged.

TOOLS-01 remains IN_PROGRESS through this partial build. Corpus extraction and independent
review remain required before acceptance. No acceptance, hold release, CORE/Proxy decision,
process-policy amendment or successor release is authorized or inferred here.
