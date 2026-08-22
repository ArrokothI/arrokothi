# Arrokothi v0.35 live canonical failure

This compact archive preserves the first complete live canonical failure from
`triad-v035-2026-08-22T04-55-01-423Z`. It must not be overwritten by the
v0.35.1 compatibility rerun.

- Original run repository commit: `0e242dac161de3e53e56764df06d067b4eaddf2f`
- Repair-session starting HEAD: `f465543ffe01706a974cbf7d66d726a8da0c4b34`
- Subject version: `0.35.0`
- Requested and provider-observed model: `gemini-3.5-flash-lite`
- Model mismatches: `0`
- Primary runtime failures: `36/36`
- Stability runtime failures: `8/8`
- Semantic evaluation: **framework-blocked / inconclusive**
- Runtime reliability: **failed due systematic provider integration defect**

The two preserved traces demonstrate that the failure was not equivalent to a
semantic failure. Craig obtained the authoritative `9.9 m3` tool result,
retrieved knowledge, and generated a substantive answer before the rejected
provider continuation. Estate likewise completed a listing query and generated
a grounded answer before the rejected continuation.

The original primary run started at `2026-08-22T04:55:00.975Z` and ended at
`2026-08-22T05:15:34.290Z`. Its frozen AgentDefinition hashes were:

- P01: `03b90ca8c823790e12d0978b58e28236a89bc08d4427d5413ce4d00bcfe98eb0`
- P02: `bc38739de31fa841f8b66d84834a54f7ec3aae7b334b656d5286508a183f2df0`

Subsequent boundary instrumentation proved that the 400 originated in the
semantic planning preflight's structured-output request. The later Strands
function-call continuation retained its call ID and Gemini thought signature;
the original runner had classified the turn-level preflight RuntimeError as a
Strands failure even when later Strands calls and tools succeeded.
