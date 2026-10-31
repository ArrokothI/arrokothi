# Extraction build 02 — new-test validation and remaining adoption construction

2026-10-31, implementing Codex GPT-6. At `5b584d8126ed1343d808f6e7b137a72d05436423`, a fresh no-local
clone followed by npm ci ran the four affected suites. All **32 tests passed**,
including all fifteen new groups and the existing nondisclosure schedules.
`npm run typecheck` exited 0. Node v26.10.0. No product defect surfaced.

Local outputs are `/private/tmp/tools02-extraction-tests-5b584d81.log` and
`/private/tmp/tools02-extraction-typecheck-5b584d81.log`. The checks are cheap to
reproduce with the four files in extraction build 01 and the package typecheck.

The remaining **85 adoption cases contain 103 mutants**. Seven more case/mutant
routes preserve round-7 R1–R6 in H15 and R6's inherited-host declaration in H21.
All current edit spans are unique. The plans retain every grouped variant and the
separate relocation readings from group reviews 13–23. The build uses only the
existing mutations registry and state-owner-controls fixture. Structural cases
reuse state-owner-probe with the complete passing file inventory and a named
assertion. Other cases use target-set controls, edit-site reach and assertion witnesses.

Coverage now declares all 152 historical-adoption groups. It also adds the three
existing range-2 target-witness/invocation/policy cases to the tool-result family,
which were missing from that finite coverage model. No mutant result is claimed
from declaration alone. Controls and kills for the new cases and variants remain due.

Distinct counts stay **15 test groups / 152 adoptions**. The previous full pass of
67 built cases remains 172.750 seconds. The next full pass must include all 152
cases and their variants. Preserve each attempt and stop if one complete pass
exceeds 600 seconds. Product and historical evidence files remain unchanged.
P3, P1 bindings, register reconciliation, supported regeneration, audit and final
verification remain pending. No new third-party material or dependency was added.
