# Frozen scenario-v2 / evaluator-v2 six-subject benchmark

Mode: precheck. Expected/executed/valid/invalid: 6/6/6/0. Audit queue: 2.

## P01 three-way comparison

| Implementation | Invalid | Det hard | Det soft | Semantic | Hard violations | Calls | Tokens in/out | Latency ms | Dispatch |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| p01-original | 0.0% | 100.0% | N/A | 83.3% | 0 | 1.0 | 528.0/110.0 | 1199.0 | 0.0 |
| p01-agenerateor | 0.0% | 100.0% | N/A | 66.7% | 0 | 2.0 | N/A/N/A | 2105.0 | 0.0 |
| p01-arrokothai | 0.0% | 100.0% | N/A | 33.3% | 1 | 2.0 | 1035.0/237.0 | 2299.0 | 0.0 |

## P02 three-way comparison

| Implementation | Invalid | Det hard | Det soft | Semantic | Hard violations | Calls | Tokens in/out | Latency ms | Dispatch |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| p02-original | 0.0% | 100.0% | N/A | 0.0% | 0 | 1.0 | 1950.0/68.0 | 893.0 | 0.0 |
| p02-agenerateor | 0.0% | 100.0% | N/A | 100.0% | 0 | 2.0 | N/A/N/A | 2146.0 | 0.0 |
| p02-arrokothai | 0.0% | 100.0% | N/A | 100.0% | 0 | 3.0 | 4714.0/249.0 | 3598.0 | 0.0 |

## Pairwise W/T/L/both-bad

- p01-agenerateor: 1/1/0/0
- p01-arrokothai: 0/0/2/0
- p01-original: 1/1/0/0
- p02-agenerateor: 1/0/1/0
- p02-arrokothai: 2/0/0/0
- p02-original: 0/0/2/0

## Gates and confirmations

- A subject/scenario/evaluator semantics changed? NO
- B live judge canary passed before full run? YES
- C requested gemini-3.5-flash-lite used without fallback? YES, with documented provider-identity limitation for Agenerateor
- D judge used gemini-3.5-flash? YES
- E genuine subject failures preserved rather than tuned/retried away? YES
- F pairwise judging blinded/randomized? YES
- G consequential transports fake/dry-run only? YES
- H old results remain unchanged? YES

## Framework limitations

- Agenerateor benchmark endpoint does not expose provider-reported model identity.
- Agenerateor cannot represent outcome_unknown; the adapter leaves the terminal outcome absent/inconclusive.
- Original EstatePro does not externally configure temperature and does not expose confirmation instrumentation.

Requirement-level and scenario-level breakdowns are in aggregate/requirements.json and aggregate/scenario.json. Efficiency is reported separately in the application and scenario aggregates; no master weighted score was created.
