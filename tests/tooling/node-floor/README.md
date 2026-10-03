# Node v22.9.0 prerequisite probes

From the repository root:

```sh
python3 -B tests/tooling/check-node-floor.py --node /absolute/path/to/node-v22.9.0/bin/node
```

This runs the implemented checks **A1–A8 in order** and stops on the first failed prerequisite.
`--through N` supports focused partial runs; only a successful eleven-assumption run could be
`complete`. A9–A11 remain pending after A8's archive-input stop, recorded in
[node-floor-04](../../../docs/development/work/TOOLS-01/node-floor-04.md). Earlier observations,
including the original A7 cancellation, remain in
[node-floor-03](../../../docs/development/work/TOOLS-01/node-floor-03.md).

- A1 checks start/result pairing, source kind, definition order and leaves. It includes passing
  and failing tests/suites, an empty suite and a test with a subtest. Eight altered-event fixtures
  check unknown kinds, mismatches, missing pairs, duplicate keys and missing locations.
- A2 checks original UTF-16 TypeScript offsets, including an astral character before the function.
- A3 checks block counts and the throwing-call, direct-throw, short-circuit and literal limits.
- A4 checks one full-path leaf, zero-test coverage, the synthetic file pair, multiple leaves and
  a passing child of a failing parent.
- A5 compares summaries from two reporters with separate destinations.
- A6 copies only the digest-pinned TypeScript subset into a temporary directory and uses both
  parser and scanner. It does not install anything.
- A7 checks the exact package script rendering and compares its expanded files with reported
  event files. It also requires a successful repository run with the existing count constraints;
  the report distinguishes selection success from that run's cancellation.
- A8 runs every required `checks.json` step under the declared environment and an inherited
  comparison environment, both selecting the requested Node. It compares counts and structured
  facts, excluding timing. It requires each final step verdict except the exact existing
  adoption state (1,549 origins; 116 suite, 8 case, 30 non-executable, 1,395 pending). That state
  is an admissible **observation for environment comparison only**: `meets_final_spec` and
  `all_final_gates_passed` stay false. It does not pass composed verification or complete P1/P2.
  No inherited environment values or arbitrary A8 child output are serialized. The helper's
  selected facts, command status and exit remain available. Run its negative controls with
  `python3 -B tests/tooling/node-floor/check-step-controls.py`.

After A8 is resolved, implement A9's full-path subtest selection/refusal, A10's per-file process
isolation and ordering/fallback, and A11's preloaded read-wrapper checks in that order. These
capabilities have not been verified. No later-check draft is included in this stopped increment.

The declared environment passes PATH, HOME and TMPDIR when present, prepends the selected Node's
bin directory and sets LANG to C.UTF-8. Coverage probes add only their named temporary
paths. A8 alone also runs the inherited comparison profile. Records describe names and declared
settings, not inherited values. No keepalive is added to the runner.

The A1 and parent fixtures intentionally fail assertions; expected child exits are distinct from
a probe failure. The source-registration oracle handles only these literal fixtures and is not
the general parser planned for step 5. `unref-budget.ts` is a separate minimal reproduction of
the A7 cancellation, not a subsequent floor check. All fixtures are outside the repository's
selected test globs. No floor result earns mutation, conformance, acceptance or hold-release credit.
