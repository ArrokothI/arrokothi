# TOOLS-02 extraction-group recheck — count gate

2026-10-29, implementing Codex GPT-6 session; owner choice 07's pre-build check.
Candidate checkpoint before this correction: `13cf53f0` (product/test bytes unchanged).

The first-300 reading had planned 27 origin extractions for the eleven-file inventory
count gate, including F0/F1/F2 and the earlier tautological count. That plan was too
broad: it treated a historical evidence-generation script as a current subject.
No new test has been built for it.

## Source mechanism and current subject

The source is K1.1's temporary `/tmp/k11-c15-gen.sh` and corresponding round-16/17
generators, with the exact fixed expectation of eleven direct Kernel source files.
The recorded probes change that expectation to ten or append a twelfth listed entry.
The manifests and implementation reports are historical observations, not current
commands. The generators are absent from the tracked tree at both base `335ae7e6`
and this candidate. The current Kernel layout has also replaced that eleven-file set.

Accepted TOOLS-01 [design 02](../TOOLS-01/design-02.md), Mechanism, replaces per-round
ad hoc composition with a clean-C command whose specification is loaded at C. The
current `verify` reads that specification, captures command output itself, extracts
one observed count, and compares it with the declared exact/minimum requirement.
It does not invoke these historical generators or accept their eleven-file summaries
as current evidence. Catalog and provenance checks remain separate contracts.

This design is in the accepted TOOLS-01 payload: [integration 01](../TOOLS-01/integration-01.md)
records H `a50c38867c93c63094f271d099cec71624382577` and integration
`8f82900337e38dfdb93026b04de2066df75b175c`; both are ancestors of TOOLS-02 base
`335ae7e6b6ddf7fa3c32a8605559268ed8a4e39b`. The first-use superseding-table row is
therefore `docs/development/work/TOOLS-01/design-02.md` under design 01 §5.3.

## Disposition

The specific temporary fixed-count operation is S2 `superseded`. This does not retire
the current requirement for truthful counts, declare arbitrary commands sound, or
claim that another kind of count test covers the old script. Recreating that script
solely to prove its own arithmetic would not test a live counterexample at C.

Mixed paragraphs that also name Kernel nondisclosure, retained-array or descriptor
behaviors take S5, with passing current leaf pointers for those required results.
The historical count-gate portion remains S2; chronology/counts are S1 and moved
serializer-environment behavior is bounded by L-01. Original extraction plans and
this reconsideration are retained in `triage-05.json` for review. Sealed sources and
projection 05's original stop remain unchanged.

After the final nine K1.1 origins, 309 eligible origins have been read: 302 retired
and seven extraction origins in **three distinct groups** (listing work, creation/
ingress envelope observations, pre-first-creation nondisclosure). The three new
F0/F1/F2 references also retire through this same reasoning. No extraction credit,
product defect, independent audit or acceptance is claimed. Recheck the remaining
groups before building them; the next scheduled projection remains origin 600.

No third-party implementation was incorporated. The only tooling change is the
first-use accepted-decision table row; existing mixed-decision validation exercises it.
