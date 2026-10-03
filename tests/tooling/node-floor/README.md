# Node v22.15.0 prerequisite probes

From the repository root:

```sh
python3 -B tests/tooling/check-node-floor.py --node /absolute/path/to/node-v22.15.0/bin/node
```

This runs checks **A1–A11 in order** and stops on the first failed prerequisite. `--through N`
supports focused partial runs; only a successful eleven-assumption run is `complete`. The floor is
exactly v22.15.0 under the owner's decision recorded in design 05 §6 ("raise the floor to 22.15").
The v22.9.0 results stay as history in
[node-floor-01](../../../docs/development/work/TOOLS-01/node-floor-01.md) to
[node-floor-05](../../../docs/development/work/TOOLS-01/node-floor-05.md); the v22.15.0 run is
[node-floor-06](../../../docs/development/work/TOOLS-01/node-floor-06.md).

- A1 checks start/result pairing, source kind, definition order and leaves. It includes passing
  and failing tests/suites, an empty suite and a test with a subtest. A result is a test when its
  `details.type` is `test` or absent and a suite when it is `suite`; the record states which form
  the runtime emits, and an altered copy with the field removed must give the same pairs. Eight
  altered-event fixtures check unknown kinds, mismatches, missing pairs, duplicate keys and missing
  locations.
- A2 checks original UTF-16 TypeScript offsets, including an astral character before the function.
- A3 checks block counts and the throwing-call, direct-throw, short-circuit and literal limits.
- A4 checks one full-path leaf, zero-test coverage, the synthetic file pair, multiple leaves and
  a passing child of a failing parent.
- A5 compares summaries from two reporters with separate destinations.
- A6 copies only the digest-pinned TypeScript subset into a temporary directory and uses both
  parser and scanner. It does not install anything.
- A7 checks the exact package script rendering and compares its expanded files with reported
  event files. It also requires a successful repository run with the existing count constraints.
- A8 runs every required `checks.json` step under the declared environment and an inherited
  comparison environment, both selecting the requested Node. It compares counts and structured
  facts, excluding timing. It requires each final step verdict except the exact existing
  adoption state (1,549 origins; 116 suite, 8 case, 30 non-executable, 1,395 pending). That state
  is an admissible **observation for environment comparison only**: `meets_final_spec` and
  `all_final_gates_passed` stay false. It does not pass composed verification or complete P1/P2.
  No inherited environment values or arbitrary A8 child output are serialized. The helper's
  selected facts, command status and exit remain available. Run its negative controls with
  `python3 -B tests/tooling/node-floor/check-step-controls.py`.
  The archive input uses [archive.md](../../../docs/development/archive.md)'s pinned Git fallback
  (`9fd2faa71bc4e2b7b4798c53a0360b669c5d7b49`). A8 extracts it outside the checkout, verifies
  every regular file and symlink against the pinned Git blobs, and explicitly sets
  `ARROKOTHI_EVIDENCE_ROOT` to that temporary snapshot in both profiles. The record identifies
  its revision, file counts and aggregate SHA-256; inherited root values are not used or logged.
  The snapshot is verified again before cleanup. Run corruption controls with
  `python3 -B tests/tooling/node-floor/archive-input-controls.py`.
- A9 asks whether a `t.test` subtest can be selected by its full path (`subtest.test.mjs`). Its
  stated outcome is a capability, not a stop: when the full-path run yields no valid reach, a
  subtest target is refused. Selecting the parent must run both children and earn no reach.
- A10 checks, under the catalog command's own flags, that each test file runs in its own process
  (distinct child processes, none the runner's, no shared globals); a failure stops. It then
  compares the run model of design 05 §2.3 rule 1 with three fixtures: a file without an await at
  load time (`order.test.ts`), load-time code after an await at module level and in a suite
  callback (`order-await.test.ts`), and a registration site inside a function that runs after a
  later site (`order-deferred.test.ts`). If any order differs from the model, the record reports
  the design's fallback: every leaf counts as earlier.
- A11 runs `read-trace.test.ts` three ways under the catalog flags: untraced, with the
  [`read-trace.mjs`](../read-trace.mjs) preload but no declared trace file (must fail), and traced
  through `NODE_OPTIONS=--import=<absolute path>`. The traced child must load the preload once and
  record each of eleven access forms (default, named and CommonJS `node:fs` imports, the `promises`
  property, named and namespace `node:fs/promises` imports, a callback and a stream), with the same
  summary counts as the untraced run. A failure stops.

The declared environment passes PATH, HOME and TMPDIR when present, prepends the selected Node's
bin directory and sets LANG to C.UTF-8. Coverage probes add only their named temporary paths; A10
and A11 add only their named temporary log, data and trace paths and A11's `NODE_OPTIONS`. A8 alone
also runs the inherited comparison profile. Records describe names and declared settings, not
inherited values. No keepalive is added to the runner.

The A1 and parent fixtures intentionally fail assertions; expected child exits are distinct from
a probe failure. The source-registration oracle handles only these literal fixtures and is not
the general parser planned for step 5. `unref-budget.ts` is a separate minimal reproduction of
the node-floor-03 cancellation, and `register-hooks.mjs` diagnoses node-floor-05's missing v22.9.0
export; neither is an A-check. All fixtures are outside the repository's selected test globs. No
floor result earns mutation, conformance, acceptance or hold-release credit.
