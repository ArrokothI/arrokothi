# Scenario V2

This directory contains the source-derived P01/P02 benchmark scenario register.

The original applications are external primary semantic sources, not vendored runtime dependencies:

- P01 Craig-Hempcrete-DemoSitee at commit `0297a5cc43e4fcbc4e8edc7b4d90254cea76a893`: `app/lib/hempcretePrompt.ts`, `app/api/chat/route.ts`, `app/components/HempcreteSite.tsx`, and the requirement `.docx` files.
- P02 EstatePro at commit `49e33528281ca28c08ac3993778493c3bfaa153c`: `constants.tsx`, `components/AIConcierge.tsx`, `api/send-email.ts`, `App.tsx`, and `types.ts`.

Historical benchmark files remain in place under `benchmarks/p01-craig`, `benchmarks/p02-estate`, `benchmarks/results`, and `benchmarks/benchmark-rebuild-v1`.

## Registers

- P01 requirements: `p01/requirements.ts`
- P02 requirements: `p02/requirements.ts`
- P01 active scenarios: `p01/scenarios.ts`
- P02 active scenarios: `p02/scenarios.ts`
- P01 historical audit: `p01/audit.ts`
- P02 historical audit: `p02/audit.ts`

## Counts

| Suite | Requirements | Active v2 scenarios | Historical scenarios audited |
| --- | ---: | ---: | ---: |
| P01 Craig Hempcrete | 19 | 20 | 20 |
| P02 EstatePro | 17 | 17 | 16 |

## Source Conflicts

| Id | Topic | V2 resolution |
| --- | --- | --- |
| P01-C01 | IRC Appendix AU vs Appendix BL | Appendix BL is authoritative because it is in the shipped prompt and fallback route; AU is recorded as stale prose. |
| P01-C02 | 300 sq ft bedroom range vs shipped formula | Exact area/thickness uses the shipped formula; the canned bedroom workflow keeps the source prose range only when no exact thickness calculation is requested. |
| P02-C01 | Neighborhood count vs exact records | Frozen `PROPERTIES` records are authoritative for concrete listings; marketing count badges are display copy. |
| P02-C02 | Historical filler listings vs no invention | Truthful no-invention behavior is authoritative; fabricated filler listings are hard failures. |
| P02-C03 | Handoff wording vs backend effect | The backend only sends an email to the team; visitor contact, scheduling, CRM, and database claims are unsupported. |

## Dispositions

P01 retained turns with replaced evaluation: CRAIG-S01, S03-S16, S19, S20, S22.

P01 split: CRAIG-S02 became P01-V2-S02 and P01-V2-S03 to separate workflow prose from exact formula behavior.

P01 retired: CRAIG-S21, because CRAIG-S12 covers the same structural safety requirement with a more realistic misinformation framing.

P02 retained turns with replaced evaluation: ESTATE-S01-S03, S07-S17, S19, S20.

P02 revised evaluation: ESTATE-S13 now evaluates exact-record truthfulness instead of accepting marketing-count filler behavior.

P02 added: P02-V2-S17 for `outcome_unknown`, because the neutral raw-run contract supports it.
