# TOOLS-01 — step 1 stopped at Node v22.9.0 assumption A1

2026-10-03, Codex implementer (GPT-6 per owner assignment). **A1 FAILED; stop before A2.**
TOOLS-01 remains IN_PROGRESS, not review-ready. No mechanism has been adapted and no hold released.

## Completed step 0

Design 05 revision 3 at `4dea56638303162b10494e82990d9a54816ca57e` was accepted for implementation
in [the resumed review](design-05-review-02.md). The owner's verbatim answer was appended to
[owner choice 02](owner-choice-02.md), and the exact embedded option-C diff was applied.
Commit `c80a9f5d427236035cd4a74b7338af3c0bee036b` contains those changes and was pushed without
force. The live contract is revision 3. This design acceptance is not independent packet acceptance.

## Authorized runtime installation

- Download: `https://nodejs.org/dist/v22.9.0/node-v22.9.0-darwin-arm64.tar.gz`.
- Official manifest: `https://nodejs.org/dist/v22.9.0/SHASUMS256.txt`, SHA-256
  `9667e91309fb995b37be7650ca3a1819ee8a93ace0891334f6eec8fa1daa0452`.
- Archive SHA-256 matched its exact manifest entry before extraction:
  `7d62217f64491524db6bcfb059049d64fd6a9adcae52565ed54aaad365a55afd`.
- User-level installation: `/Users/linzhenglin/.local/share/arrokothi/node-v22.9.0-darwin-arm64`.
  Its binary reports **v22.9.0**. The complete official distribution, including its LICENSE and
  notices, stays there; no runtime source or dependency was added to the repository.
- Existing `/opt/homebrew/bin/node` remains **v26.8.1**. No shell configuration, symlink or
  system Node was replaced. This is the runtime installation explicitly authorized by the owner,
  not a new package dependency or third-party code reuse in TOOLS-01.

## Reproduction and observed failure

Environment: macOS 15.6.1 arm64, Python 3.13.7. The probe supplies only inherited PATH, HOME,
TMPDIR if present, plus `LANG=C.UTF-8`, and prepends the explicitly selected Node's bin directory
to its child PATH. It does not inherit NODE_OPTIONS, NODE_TEST_CONTEXT or NODE_V8_COVERAGE.

```sh
python3 -B tests/tooling/check-node-floor.py \
  --node /Users/linzhenglin/.local/share/arrokothi/node-v22.9.0-darwin-arm64/bin/node
```

**Probe exit: 1.** The fixture's child exit is also 1, intentionally: its second test asserts
`1 === 2` so A1 can examine an actual assertion-failure event. That deliberate fixture failure is
not the failed assumption. The failed assumption is the missing metadata:

| Event | Name | `details.type` |
|---|---|---|
| `test:pass` | `first pass` | absent |
| `test:fail` | `second intentional failure` | absent |
| `test:pass` | `nested pass` | absent |
| `test:pass` | `outer suite` | `suite` |

All inspected start/pass/fail events contain name, nesting, file, line and column. `test:start`
order is `first pass`, `second intentional failure`, `outer suite`, `nested pass`, matching source
definition order. Thus those parts of this fixture pass, but A1's requirement that pass and fail
events carry `details.type` does not. Absence was reproduced twice; the attached second run uses
the final probe bytes below. The reporter forwards the event fields and only serializes Error
objects into readable metadata; it does not infer or remove `details.type`.

The subject is the step-0 base `c80a9f5d427236035cd4a74b7338af3c0bee036b` plus these newly written
probe files. This is an incremental floor experiment, **not** a completed packet's clean-C run.

| Reproducible artifact | SHA-256 |
|---|---|
| [A1 raw events and result](node-floor-01/a1.json) | `1104d679ce6f5edbbd13708132a9cfd81bbbba13fe0fb039b9a20a2896361fa3` |
| [Probe](../../../../tests/tooling/check-node-floor.py) | `bf9835c5275eafd102810ac156ac4b5729b044cc844e763ad248ef64d7862a8a` |
| [Reporter](../../../../tests/tooling/node-floor/events-reporter.mjs) | `1613e001c5db146ded6a9944fd5d6ee0ed9bbfadaf629d6f00e7d5de18247214` |
| [Event fixture](../../../../tests/tooling/node-floor/events.test.mjs) | `9912c9987cce685d6ec8260896812bc50b31f42aaf2f9bdc00d22d565098f0a8` |

## Stop and exact remainder

Design 05 §6 step 1 and the owner's implementation instruction require stopping on a failed
floor assumption. The A1 prerequisite probe is maintained, reports its failure, and lists A2–A11
as remaining; it does not claim to implement the whole floor battery. No catalog reporter,
preservation mechanism, environment mechanism or other step-2 implementation was substituted.

The design author/owner must resolve A1's event-shape assumption explicitly before implementation
resumes. The observed presence of `suite` and absence on leaf events is evidence for that decision,
not permission to silently default the missing field. After resolution, validate the approved
mechanism against both passing and failing events, then execute A2–A11 with their stated stop or
refusal behavior. All steps 2–12 and P1/P2 remain outstanding.

Only the new prerequisite probe, its small fixtures/readme and this failure record/raw result are
added after step 0. No production, Layer-3, sealed-record, 007 or `fault-oracle.ts` edit; no hold
credit. Broader repository validation and the remaining floor checks were not run after the stop.
The session handover supplies the final clean pushed head; this record does not name its own SHA.
