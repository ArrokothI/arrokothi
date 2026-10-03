# Node v22.9.0 prerequisite probes

From the repository root:

```sh
python3 -B tests/tooling/check-node-floor.py --node /absolute/path/to/node-v22.9.0/bin/node
```

This runs the implemented checks **A1–A7 in order** and stops on the first failure. A8–A11 remain
unimplemented after the repository run in A7 cancelled two existing tests on the floor runtime.
The JSON lists the remaining checks and never marks this partial battery complete. See
[node-floor-03](../../../docs/development/work/TOOLS-01/node-floor-03.md) for the observations,
installation and exact stop; earlier records remain unchanged.

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

The A1 and parent fixtures intentionally fail assertions; expected child exits are distinct from
a probe failure. The source-registration oracle handles only these literal fixtures and is not
the general parser planned for step 5. `unref-budget.ts` is a separate minimal reproduction of
the A7 cancellation, not a subsequent floor check. All fixtures are outside the repository's
selected test globs. No floor result earns mutation, conformance, acceptance or hold-release credit.
