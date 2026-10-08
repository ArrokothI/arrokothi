# TOOLS-01 continuation repair 01 — context, witnesses and source coordinates

2026-10-05. Implementer: Codex. This is an incremental implementation checkpoint, not completed
step 8, review-ready C/H, independent acceptance or hold release. TOOLS-01 remains IN_PROGRESS.
Parent: `410ad11a3474f4e8623b635e29666d7f09b6c01c`. Existing pushed history is unchanged.

The owner said “繼續” after [continuation-stop-01](continuation-stop-01.md), authorizing the first
two repairs. During this round I reported the source-coordinate defect below and stopped its
dependent work under the supplied stop rule. The owner again said “繼續”, on 2026-10-05,
authorizing repair under the already specified byte/LF convention. No criterion was weakened.

## Repairs

- **TOOLS-CONT-01:** Required sealed context is traversed before generic candidate reasons are
  considered. A reason cannot waive a named sealed file or its transitive dependencies.
- **TOOLS-CONT-02:** A held or superseded member's closure must link a witness with the matching
  kind and this origin. The existing witness validator checks claim and register classification.
  Ordinary behavior records no longer suffice. A correctly attributed witness still closes while
  retaining the held count.
- **TOOLS-CONT-03:** Context, fence and prose-origin locators now share byte/LF line splitting.
  CR and Unicode separators remain content; trailing LF terminates its line without creating
  another, another LF adds an empty line, and empty context files retain endpoint 1. Fence bodies
  preserve non-LF bytes. No sealed catalog, source or origin ID was rewritten.

Fourteen new tests cover full-corpus closures, first-hop/transitive reason bypasses, wrong witness
kinds and origins, source coordinates, heading sections, mandatory record endpoints, and inventory
locators. The test minimum is 453. No new `require` was added: 270 guards remain registered. Three
changed refusal expressions have freshly computed mutation identities.

The first 270-case ablation run yielded 268 kills and two setup errors. Removing the missing-closure
or absent-link guard caused AttributeError/KeyError; their old `assertRaisesRegex(CheckError)` tests
reported unittest errors. Those two tests now explicitly assert the CheckError boundary, so accidental
exceptions produce named assertion failures. The runner was not changed to count crashes as kills.
A complete subsequent run before the LF repair produced 270 qualifying kills and 446 passing tests.
The final results below supersede those intermediate runs for these source bytes.

## Source-coordinate finding and reproductions

A bounded audit of each artifact origin's pinned file found two differences between LF coordinates
and Python `splitlines()`:

| Pinned path | Revision | LF lines | Previous checker |
|---|---|---:|---:|
| `tests/conformance/architecture/kernel-landing-zone.test.ts` | `9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49` | 4,489 | 4,496 |
| Same | `66bc041175e6fc191c2e7cf88de198111e7d97c9` | 4,494 | 4,501 |

The old minimum extended seven lines beyond each real file. Recording nonexistent end lines would
have been a workaround. The same mechanism could also accept incomplete context: a seven-LF-line
fixture puts Unicode separators and a fake heading inside LF line 2, the real section at line 3,
a required sealed-path reference at line 4 and a fence at lines 5–7. The old checker used the fence's
LF locator against splitlines coordinates, scanned the fake section and accepted range 3–5 with
zero candidates, omitting both mandatory sealed records. The ordinary-LF control refused it.

[probe_context_lines.py](continuation-repair-01/probe_context_lines.py) preserves that exact input,
the two real pinned-file checks and the distinguishing control. It uses real Git blobs and temporary
repositories, without mocking the checker. Its scope is `context_minimum`/`origin_closure`, not a
full-corpus run. [context-lines-before.json](continuation-repair-01/context-lines-before.json) records
the reproduced defects; [context-lines-after.json](continuation-repair-01/context-lines-after.json)
records corrected ranges and required refusal. The old reason/witness full-corpus probes now also
both refuse: [closure-probes.json](continuation-repair-01/closure-probes.json).

## Validation and limits

Validation used clean local fixture commit `266de3beb620ac6e1df004d65e637d6e13fb769d`, tree
`1930184ef258373cb30f6e673477004186cf2704`, parent `410ad11a…`. This detached temporary commit is
not a final C or pushed public history. [manifest.json](continuation-repair-01/manifest.json) records
source and attachment digests. Tested implementation, tests and registry bytes equal this checkpoint;
progress documentation was added afterwards. The refreshed preserved table is reported separately.
Node v26.10.0 was first in PATH, using the existing pinned dependencies and local workspace links.
Long jobs used `caffeinate -i`; no validation checkout was edited during a census or target run.

| Command (fixture root; floor PATH, long jobs under caffeinate) | Result | Time |
|---|---|---|
| `python3 -B -m unittest discover -s tests/tooling -p 'test_*.py'` | 453 tests, OK | 236.912 s |
| `python3 -B scripts/packet_tools.py mutations --revision 266de3beb620ac6e1df004d65e637d6e13fb769d --spec tests/fixtures/packet-tools/refusal-guards.json` | 270 qualifying kills | about 231 s |
| `python3 -B tests/tooling/check-refusal-registry.py` | 270 checks / 270 mutations | under 1 s |
| `python3 -B scripts/packet_tools.py inventory --revision 266de3beb620ac6e1df004d65e637d6e13fb769d --spec tests/fixtures/packet-tools/inventory.json` | 208 artifacts, 1,333 mentions, 8 additions; all 1,549 origin records equal the previous inventory | about 33 s |
| `python3 -B docs/development/work/TOOLS-01/continuation-stop-01/probe_closure.py .` | Both original malformed closures refused | 14.935 s |
| `python3 -B probe_context_lines.py <fixture-root>` (diagnostic above) | Both real file ranges correct; short fence refused; control passes | 0.598 s |
| Scratch `generate-repair-v3.py step6/extras.json step6/repair-v3` | Register and census recomputed | 83 s |
| Scratch `check-built-repair-v3.py nondisclosure values ambient_reads control_commits refusals unsupported ingress evidence_records dispatch dispatch_433 klz` | 398 targets; 0 refused; 398 reading relations; 302 distinct refused members | 369 s summed rounded area times |

Mutation and inventory elapsed times use output-file creation to final write; the other timings are the commands' own reports. Compressed results and the per-area target times are linked from the manifest. The diagnostic was invoked from the working report directory against the clean fixture; its code was not inside the temporary commit.

The census retains 1,272 members: 810 preserved, 62 held, 74 superseded, 326 refused, and 140 register
matches equal the 140 entries. Only the 21 reads digests differ from the parent (ambient-reads 11,
control-commits 10); no classification changes. A10 still explains 33 kept rather than 47 and 296
prefix-refused rather than 282. No new assertion binding or hold release follows from these repairs.

The target check is P1-T validation of supplied scratch only: it does not run the final register
credit filter or establish semantic coverage, origin closure, full adoption, execution completeness
or acceptance. This checkpoint imports no targets or witnesses and closes no origin. The exactly
24 unbound members stay refused and visible; no uniqueness-rule decision is inferred from “繼續”.

Not run here: composed verify, the 77 case pairs, repository-wide profiles, typecheck, final C/H
verification or independent review. Steps 8–12 remain unfinished. No production, Layer-3, sealed
record or 007 changes; no new dependency or copied third-party code. New code and fixtures were
written for this repository; existing pinned dependencies remain unchanged.

Next: import the validated step-8 records and check them through the full corpus, then continue
origin context and closure work. The 24 repeated-assertion members require the owner's choice before
their origins can close; options remain in continuation-stop-01.
